# MetadataURI + Pinata IPFS Integration

## Overview

Add a `metadataURI` field to the Campaign struct that points to a JSON metadata file on IPFS (via Pinata Free). This enables rich campaign content (image, website, socials, documents, category) without storing large data on-chain.

## Decisions

- **Option B**: Single `metadataURI` field pointing to JSON on IPFS (not separate image field)
- **Required**: `metadataURI` is mandatory when creating a campaign
- **Update rule**: Creator can only update `metadataURI` when `currentAmount == 0` (no donations yet)
- **Schema**: `image` required on frontend; `website`, `socials`, `documents`, `category` optional
- **Approach A**: No backend — frontend uploads directly to Pinata with scoped API key
- **Image only**: No banner field, just a single `image`

## Metadata JSON Schema

Stored on IPFS, referenced by `metadataURI` on-chain:

```json
{
  "image": "ipfs://QmAbc...",
  "website": "https://example.com",
  "socials": {
    "twitter": "https://twitter.com/...",
    "github": "https://github.com/..."
  },
  "documents": ["ipfs://QmDef..."],
  "category": "education"
}
```

- `image` (string, required): IPFS URI for campaign image
- `website` (string, optional): Project website URL
- `socials` (object, optional): Social media links
- `documents` (string[], optional): IPFS URIs for supporting documents
- `category` (string, optional): Campaign category (e.g. "education", "charity", "environment")

## Smart Contract Changes

### Campaign Struct

Add `metadataURI` field:

```solidity
struct Campaign {
    address creator;
    string title;
    string description;
    uint256 targetAmount;
    uint256 currentAmount;
    uint256 deadline;
    bool isActive;
    uint256 milestoneCount;
    bool creatorVerified;
    string metadataURI;  // NEW
}
```

### createCampaign()

Add `_metadataURI` parameter (after `_description`), require non-empty:

```solidity
function createCampaign(
    string calldata _title,
    string calldata _description,
    string calldata _metadataURI,
    uint256 _targetAmount,
    string[] calldata _milestoneDescriptions,
    uint256[] calldata _milestoneAmounts,
    uint256 _deadline
) external whenNotPaused returns (uint256) {
    require(bytes(_metadataURI).length > 0, "Metadata URI required");
    ...
    c.metadataURI = _metadataURI;
}
```

### updateMetadataURI() — New Function

```solidity
function updateMetadataURI(uint256 _campaignId, string calldata _metadataURI)
    external onlyCampaignCreator(_campaignId)
{
    Campaign storage c = campaigns[_campaignId];
    require(c.isActive, "Campaign not active");
    require(c.currentAmount == 0, "Cannot update after donations");
    require(bytes(_metadataURI).length > 0, "Metadata URI required");
    c.metadataURI = _metadataURI;
    emit MetadataUpdated(_campaignId, _metadataURI);
}
```

### New Event

```solidity
event MetadataUpdated(uint256 indexed campaignId, string metadataURI);
```

### getCampaign() Return Value

Automatically includes `metadataURI` since it's part of the Campaign struct.

## Frontend Changes

### New: `lib/pinata.ts`

Pinata upload utilities using Pinata SDK:

- `uploadImage(file: File): Promise<string>` — uploads image, returns `ipfs://CID`
- `uploadMetadata(metadata: CampaignMetadata): Promise<string>` — uploads JSON, returns `ipfs://CID`
- Uses scoped Pinata API key (upload-only permissions)
- Environment variable: `NEXT_PUBLIC_PINATA_JWT` and `NEXT_PUBLIC_PINATA_GATEWAY`

### Updated: `types/index.ts`

```typescript
export interface Campaign {
    ...existing fields...
    metadataURI: string;  // NEW
}

export interface CampaignMetadata {
    image: string;
    website?: string;
    socials?: { twitter?: string; github?: string };
    documents?: string[];
    category?: string;
}
```

### Updated: `lib/contracts.ts`

Update ABI to include:
- `metadataURI` in Campaign struct / getCampaign return
- `_metadataURI` param in createCampaign
- `updateMetadataURI` function
- `MetadataUpdated` event

### Updated: `hooks/useProofDonate.ts`

- `useCreateCampaign`: Add `metadataURI` parameter
- New hook: `useUpdateMetadataURI`

### Updated: `app/campaign/create/page.tsx`

Add to form:
- Image upload area (click or drag & drop), with preview
- Optional fields: website, twitter, github, category
- Upload flow: image → Pinata → build JSON → Pinata → get metadataURI → pass to contract

### Updated: `components/campaign-card.tsx`

- Fetch metadata JSON from IPFS gateway
- Display campaign image as card thumbnail

### Updated: `app/campaign/[id]/page.tsx`

- Fetch metadata JSON from IPFS gateway
- Display image, website link, social links

## Upload Flow

```
1. User selects image file
2. Frontend uploads image to Pinata → receives image CID
3. User fills optional fields (website, socials, category)
4. Frontend builds JSON: { image: "ipfs://imageCID", website: "...", ... }
5. Frontend uploads JSON to Pinata → receives metadata CID
6. Frontend calls createCampaign(..., "ipfs://metadataCID", ...)
7. Contract stores "ipfs://metadataCID" on-chain
```

## Files to Change

| File | Change |
|------|--------|
| `contracts/src/ProofDonate.sol` | Add metadataURI to struct, createCampaign param, updateMetadataURI function, event |
| `contracts/test/ProofDonate.t.sol` | Add tests for metadataURI |
| `contracts/script/Deploy.s.sol` | No change needed |
| `frontend/src/lib/pinata.ts` | NEW — Pinata upload utilities |
| `frontend/src/lib/contracts.ts` | Update ABI |
| `frontend/src/types/index.ts` | Add metadataURI to Campaign, add CampaignMetadata type |
| `frontend/src/hooks/useProofDonate.ts` | Update useCreateCampaign, add useUpdateMetadataURI |
| `frontend/src/app/campaign/create/page.tsx` | Add image upload + metadata fields to form |
| `frontend/src/components/campaign-card.tsx` | Display campaign image |
| `frontend/src/app/campaign/[id]/page.tsx` | Display image + metadata |

## Cost

- On-chain: ~50 bytes extra per campaign (IPFS URI string) — minimal gas on Celo
- Off-chain: Pinata Free tier — 1GB storage, 500 files, 10GB bandwidth
- Estimated capacity: ~10,000 campaigns with images
