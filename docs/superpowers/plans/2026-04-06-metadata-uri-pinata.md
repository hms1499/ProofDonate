# MetadataURI + Pinata IPFS Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `metadataURI` to Campaign struct (on-chain) and integrate Pinata IPFS for campaign image/metadata uploads (frontend).

**Architecture:** The smart contract stores a single `metadataURI` string per campaign pointing to a JSON file on IPFS. The frontend uploads images and metadata JSON to Pinata (free tier), then passes the resulting IPFS CID to the contract when creating a campaign. Campaign cards and detail pages fetch metadata from IPFS gateway to display images and rich content.

**Tech Stack:** Solidity 0.8.28, Foundry (forge), Next.js 14, wagmi v2, viem, Pinata SDK (`pinata`), TypeScript

---

## File Map

| File | Role |
|------|------|
| `contracts/src/ProofDonate.sol` | Add `metadataURI` to struct, `createCampaign` param, `updateMetadataURI()`, event |
| `contracts/test/ProofDonate.t.sol` | Tests for metadataURI in creation, update, and edge cases |
| `frontend/src/lib/pinata.ts` | **NEW** — Pinata upload utilities (image + JSON) |
| `frontend/src/lib/contracts.ts` | Update ABI with new field, function, event |
| `frontend/src/types/index.ts` | Add `metadataURI` to Campaign, add `CampaignMetadata` type |
| `frontend/src/hooks/useProofDonate.ts` | Update `useCreateCampaign`, add `useUpdateMetadataURI` |
| `frontend/src/hooks/useCampaignMetadata.ts` | **NEW** — Hook to fetch + cache metadata JSON from IPFS |
| `frontend/src/app/campaign/create/page.tsx` | Add image upload, optional metadata fields, Pinata upload flow |
| `frontend/src/components/campaign-card.tsx` | Display campaign image from IPFS |
| `frontend/src/app/campaign/[id]/page.tsx` | Display image, website, socials from metadata |

---

### Task 1: Smart Contract — Add metadataURI to Campaign struct and createCampaign

**Files:**
- Modify: `contracts/src/ProofDonate.sol`
- Modify: `contracts/test/ProofDonate.t.sol`

- [ ] **Step 1: Write failing tests for createCampaign with metadataURI**

Add these tests to `contracts/test/ProofDonate.t.sol`. First, update the `_createSampleCampaign` helper and all existing test calls to include the new `_metadataURI` parameter:

```solidity
// Replace the existing _createSampleCampaign helper
function _createSampleCampaign() internal returns (uint256) {
    string[] memory descs = new string[](3);
    descs[0] = "Foundation";
    descs[1] = "Walls";
    descs[2] = "Roof";

    uint256[] memory amounts = new uint256[](3);
    amounts[0] = 400 ether;
    amounts[1] = 300 ether;
    amounts[2] = 300 ether;

    vm.prank(creator);
    return proofDonate.createCampaign(
        "Help Build a School",
        "Building a school in rural area",
        "ipfs://QmTestMetadata123",
        1000 ether,
        descs,
        amounts,
        block.timestamp + 30 days
    );
}
```

Update **every** existing test that calls `createCampaign` directly (not via `_createSampleCampaign`) to include the `_metadataURI` parameter. These tests are:
- `test_RevertUnverifiedCreator`: change call to `proofDonate.createCampaign("Test", "Desc", "ipfs://QmTest", 100 ether, descs, amounts, block.timestamp + 1 days);`
- `test_RevertMismatchedMilestoneSums`: change call to `proofDonate.createCampaign("Test", "Desc", "ipfs://QmTest", 1000 ether, descs, amounts, block.timestamp + 1 days);`
- `test_RevertPastDeadline`: change call to `proofDonate.createCampaign("Test", "Desc", "ipfs://QmTest", 100 ether, descs, amounts, 1);`
- `test_RevertZeroMilestones`: change call to `proofDonate.createCampaign("Test", "Desc", "ipfs://QmTest", 100 ether, descs, amounts, block.timestamp + 1 days);`
- `test_RevertCreateCampaignWhenPaused`: change call to `proofDonate.createCampaign("Test", "Desc", "ipfs://QmTest", 100 ether, descs, amounts, block.timestamp + 1 days);`

Then add new tests at the end of the Campaign Creation section:

```solidity
// ========================
// MetadataURI
// ========================

function test_CreateCampaignStoresMetadataURI() public {
    _createSampleCampaign();
    ProofDonate.Campaign memory c = proofDonate.getCampaign(0);
    assertEq(c.metadataURI, "ipfs://QmTestMetadata123");
}

function test_RevertCreateCampaignEmptyMetadataURI() public {
    string[] memory descs = new string[](1);
    descs[0] = "M1";
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = 100 ether;

    vm.prank(creator);
    vm.expectRevert("Metadata URI required");
    proofDonate.createCampaign("Test", "Desc", "", 100 ether, descs, amounts, block.timestamp + 1 days);
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/vanhuy/Desktop/proof-donate/contracts && forge test --match-test "test_CreateCampaignStoresMetadataURI|test_RevertCreateCampaignEmptyMetadataURI" -v`
Expected: Compilation error because `createCampaign` doesn't accept the new parameter yet.

- [ ] **Step 3: Implement metadataURI in contract**

Modify `contracts/src/ProofDonate.sol`:

1. Add `metadataURI` to Campaign struct (after `creatorVerified`):

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
    string metadataURI;
}
```

2. Update `createCampaign` function signature — add `_metadataURI` after `_description`:

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
```

3. Add validation after the existing `require(verifiedHumans[msg.sender], ...)`:

```solidity
require(bytes(_metadataURI).length > 0, "Metadata URI required");
```

4. Set the field after `c.creatorVerified = true;`:

```solidity
c.metadataURI = _metadataURI;
```

- [ ] **Step 4: Run all tests to verify they pass**

Run: `cd /Users/vanhuy/Desktop/proof-donate/contracts && forge test -v`
Expected: ALL tests pass (including the 2 new ones and all existing ones with updated signatures).

- [ ] **Step 5: Commit**

```bash
git add contracts/src/ProofDonate.sol contracts/test/ProofDonate.t.sol
git commit -m "feat(contract): add metadataURI to Campaign struct and createCampaign"
```

---

### Task 2: Smart Contract — Add updateMetadataURI function

**Files:**
- Modify: `contracts/src/ProofDonate.sol`
- Modify: `contracts/test/ProofDonate.t.sol`

- [ ] **Step 1: Write failing tests for updateMetadataURI**

Add to `contracts/test/ProofDonate.t.sol` under the MetadataURI section:

```solidity
function test_UpdateMetadataURI() public {
    _createSampleCampaign();

    vm.prank(creator);
    proofDonate.updateMetadataURI(0, "ipfs://QmUpdatedMetadata456");

    ProofDonate.Campaign memory c = proofDonate.getCampaign(0);
    assertEq(c.metadataURI, "ipfs://QmUpdatedMetadata456");
}

function test_RevertUpdateMetadataURIAfterDonation() public {
    _createSampleCampaign();

    vm.prank(donor1);
    proofDonate.donate{value: 1 ether}(0);

    vm.prank(creator);
    vm.expectRevert("Cannot update after donations");
    proofDonate.updateMetadataURI(0, "ipfs://QmUpdatedMetadata456");
}

function test_RevertUpdateMetadataURIByNonCreator() public {
    _createSampleCampaign();

    vm.prank(donor1);
    vm.expectRevert("Not campaign creator");
    proofDonate.updateMetadataURI(0, "ipfs://QmUpdatedMetadata456");
}

function test_RevertUpdateMetadataURIEmptyString() public {
    _createSampleCampaign();

    vm.prank(creator);
    vm.expectRevert("Metadata URI required");
    proofDonate.updateMetadataURI(0, "");
}

function test_RevertUpdateMetadataURICancelledCampaign() public {
    _createSampleCampaign();

    vm.prank(creator);
    proofDonate.cancelCampaign(0);

    vm.prank(creator);
    vm.expectRevert("Campaign not active");
    proofDonate.updateMetadataURI(0, "ipfs://QmUpdatedMetadata456");
}

function test_UpdateMetadataURIEmitsEvent() public {
    _createSampleCampaign();

    vm.expectEmit(true, false, false, true);
    emit ProofDonate.MetadataUpdated(0, "ipfs://QmUpdatedMetadata456");

    vm.prank(creator);
    proofDonate.updateMetadataURI(0, "ipfs://QmUpdatedMetadata456");
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/vanhuy/Desktop/proof-donate/contracts && forge test --match-test "test_UpdateMetadataURI|test_RevertUpdateMetadataURI" -v`
Expected: Compilation error — `updateMetadataURI` and `MetadataUpdated` don't exist yet.

- [ ] **Step 3: Implement updateMetadataURI and event**

Add to `contracts/src/ProofDonate.sol`:

1. Add event after the existing events:

```solidity
event MetadataUpdated(uint256 indexed campaignId, string metadataURI);
```

2. Add function after `cancelCampaign`:

```solidity
// --- Update Metadata ---
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

- [ ] **Step 4: Run all tests**

Run: `cd /Users/vanhuy/Desktop/proof-donate/contracts && forge test -v`
Expected: ALL tests pass.

- [ ] **Step 5: Commit**

```bash
git add contracts/src/ProofDonate.sol contracts/test/ProofDonate.t.sol
git commit -m "feat(contract): add updateMetadataURI with pre-donation guard"
```

---

### Task 3: Frontend — Update types, ABI, and hooks

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/contracts.ts`
- Modify: `frontend/src/hooks/useProofDonate.ts`

- [ ] **Step 1: Update TypeScript types**

In `frontend/src/types/index.ts`, add `metadataURI` to Campaign and add the new `CampaignMetadata` interface:

```typescript
export interface Campaign {
  creator: `0x${string}`;
  title: string;
  description: string;
  targetAmount: bigint;
  currentAmount: bigint;
  deadline: bigint;
  isActive: boolean;
  milestoneCount: bigint;
  creatorVerified: boolean;
  metadataURI: string;
}

export interface Milestone {
  description: string;
  amount: bigint;
  isReleased: boolean;
}

export interface Donation {
  donor: `0x${string}`;
  amount: bigint;
  timestamp: bigint;
}

export interface CampaignMetadata {
  image: string;
  website?: string;
  socials?: { twitter?: string; github?: string };
  documents?: string[];
  category?: string;
}
```

- [ ] **Step 2: Update ABI in contracts.ts**

In `frontend/src/lib/contracts.ts`, make these changes:

1. In the `createCampaign` function ABI entry, add `_metadataURI` param after `_description`:

```typescript
{
    type: "function",
    name: "createCampaign",
    inputs: [
      { name: "_title", type: "string", internalType: "string" },
      { name: "_description", type: "string", internalType: "string" },
      { name: "_metadataURI", type: "string", internalType: "string" },
      { name: "_targetAmount", type: "uint256", internalType: "uint256" },
      { name: "_milestoneDescriptions", type: "string[]", internalType: "string[]" },
      { name: "_milestoneAmounts", type: "uint256[]", internalType: "uint256[]" },
      { name: "_deadline", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
},
```

2. In the `getCampaign` return components, add `metadataURI` after `creatorVerified`:

```typescript
{ name: "metadataURI", type: "string", internalType: "string" },
```

3. Add `updateMetadataURI` function entry:

```typescript
{
    type: "function",
    name: "updateMetadataURI",
    inputs: [
      { name: "_campaignId", type: "uint256", internalType: "uint256" },
      { name: "_metadataURI", type: "string", internalType: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
},
```

4. Add `MetadataUpdated` event entry:

```typescript
{
    type: "event",
    name: "MetadataUpdated",
    anonymous: false,
    inputs: [
      { name: "campaignId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "metadataURI", type: "string", indexed: false, internalType: "string" },
    ],
},
```

- [ ] **Step 3: Update hooks**

In `frontend/src/hooks/useProofDonate.ts`:

1. Update `useCreateCampaign` to include `metadataURI` parameter:

```typescript
export function useCreateCampaign() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const createCampaign = (
    title: string,
    description: string,
    metadataURI: string,
    targetAmount: bigint,
    milestoneDescriptions: string[],
    milestoneAmounts: bigint[],
    deadline: bigint
  ) => {
    writeContract({
      ...contractConfig,
      functionName: "createCampaign",
      args: [
        title,
        description,
        metadataURI,
        targetAmount,
        milestoneDescriptions,
        milestoneAmounts,
        deadline,
      ],
    });
  };

  return { createCampaign, isPending, isConfirming, isSuccess, hash, error };
}
```

2. Add `useUpdateMetadataURI` hook at the end of the file:

```typescript
export function useUpdateMetadataURI() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const updateMetadataURI = (campaignId: bigint, metadataURI: string) => {
    writeContract({
      ...contractConfig,
      functionName: "updateMetadataURI",
      args: [campaignId, metadataURI],
    });
  };

  return { updateMetadataURI, isPending, isConfirming, isSuccess, hash, error };
}
```

- [ ] **Step 4: Type-check**

Run: `cd /Users/vanhuy/Desktop/proof-donate/frontend && npx tsc --noEmit`
Expected: No type errors. (There may be errors in create/page.tsx because it doesn't pass metadataURI yet — that's expected and will be fixed in Task 5.)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/contracts.ts frontend/src/hooks/useProofDonate.ts
git commit -m "feat(frontend): update types, ABI, and hooks for metadataURI"
```

---

### Task 4: Frontend — Pinata upload utilities and metadata hook

**Files:**
- Create: `frontend/src/lib/pinata.ts`
- Create: `frontend/src/hooks/useCampaignMetadata.ts`

- [ ] **Step 1: Install Pinata SDK**

Run: `cd /Users/vanhuy/Desktop/proof-donate/frontend && pnpm add pinata`

- [ ] **Step 2: Create Pinata upload utilities**

Create `frontend/src/lib/pinata.ts`:

```typescript
import { PinataSDK } from "pinata";

const pinata = new PinataSDK({
  pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT!,
  pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY!,
});

export async function uploadImage(file: File): Promise<string> {
  const result = await pinata.upload.file(file);
  return `ipfs://${result.IpfsCid}`;
}

export async function uploadMetadata(metadata: {
  image: string;
  website?: string;
  socials?: { twitter?: string; github?: string };
  documents?: string[];
  category?: string;
}): Promise<string> {
  const result = await pinata.upload.json(metadata);
  return `ipfs://${result.IpfsCid}`;
}

export function ipfsToHttp(ipfsUri: string): string {
  if (!ipfsUri || !ipfsUri.startsWith("ipfs://")) return ipfsUri;
  const cid = ipfsUri.replace("ipfs://", "");
  const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud";
  return `https://${gateway}/ipfs/${cid}`;
}
```

- [ ] **Step 3: Create metadata fetching hook**

Create `frontend/src/hooks/useCampaignMetadata.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { ipfsToHttp } from "@/lib/pinata";
import type { CampaignMetadata } from "@/types";

export function useCampaignMetadata(metadataURI: string | undefined) {
  const [metadata, setMetadata] = useState<CampaignMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!metadataURI) return;

    let cancelled = false;
    setIsLoading(true);

    fetch(ipfsToHttp(metadataURI))
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setMetadata(data);
      })
      .catch(() => {
        if (!cancelled) setMetadata(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [metadataURI]);

  return { metadata, isLoading };
}
```

- [ ] **Step 4: Add environment variables template**

Create or update `frontend/.env.example` (if it doesn't exist, create it; if it exists, append):

```
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_here
NEXT_PUBLIC_PINATA_GATEWAY=your_gateway.mypinata.cloud
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/pinata.ts frontend/src/hooks/useCampaignMetadata.ts frontend/.env.example frontend/package.json frontend/pnpm-lock.yaml
git commit -m "feat(frontend): add Pinata upload utilities and metadata hook"
```

---

### Task 5: Frontend — Update Create Campaign page with image upload

**Files:**
- Modify: `frontend/src/app/campaign/create/page.tsx`

- [ ] **Step 1: Add image upload state and metadata fields**

In `frontend/src/app/campaign/create/page.tsx`, add imports and state:

1. Add imports at the top:

```typescript
import { uploadImage, uploadMetadata } from "@/lib/pinata";
import { ImagePlus } from "lucide-react";
```

Add `ImagePlus` to the existing lucide-react import (alongside `Plus`, `Trash2`, `Loader2`, `ShieldAlert`, `ArrowRight`, `CheckCircle2`).

2. Add state variables after the existing state declarations (after `const [milestones, setMilestones] = ...`):

```typescript
const [imageFile, setImageFile] = useState<File | null>(null);
const [imagePreview, setImagePreview] = useState<string | null>(null);
const [isUploading, setIsUploading] = useState(false);
const [website, setWebsite] = useState("");
const [twitter, setTwitter] = useState("");
const [github, setGithub] = useState("");
const [category, setCategory] = useState("");
```

3. Add image handler function after the `updateMilestone` function:

```typescript
const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setImageFile(file);
  setImagePreview(URL.createObjectURL(file));
};
```

4. Update `isFormValid` to require an image:

```typescript
const isFormValid =
  title.trim() &&
  description.trim() &&
  targetNum > 0 &&
  imageFile &&
  milestones.every((m) => m.description.trim() && parseFloat(m.amount) > 0) &&
  !milestoneMismatch;
```

- [ ] **Step 2: Update handleSubmit to upload to Pinata first**

Replace the existing `handleSubmit` function:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!isFormValid || !imageFile) return;

  setIsUploading(true);
  try {
    const imageCid = await uploadImage(imageFile);

    const metadata: Record<string, unknown> = { image: imageCid };
    if (website.trim()) metadata.website = website.trim();
    if (twitter.trim() || github.trim()) {
      metadata.socials = {
        ...(twitter.trim() && { twitter: twitter.trim() }),
        ...(github.trim() && { github: github.trim() }),
      };
    }
    if (category.trim()) metadata.category = category.trim();

    const metadataURI = await uploadMetadata(metadata as Parameters<typeof uploadMetadata>[0]);

    const deadline = BigInt(Math.floor(Date.now() / 1000) + parseInt(deadlineDays) * 86400);
    createCampaign(
      title,
      description,
      metadataURI,
      parseEther(targetAmount),
      milestones.map((m) => m.description),
      milestones.map((m) => parseEther(m.amount)),
      deadline
    );
  } catch (err) {
    console.error("Upload failed:", err);
  } finally {
    setIsUploading(false);
  }
};
```

- [ ] **Step 3: Add image upload UI and metadata fields to the form**

In the JSX, add a new section **before** the Campaign Details section (inside the `lg:col-span-2 space-y-6` div). Insert this as the first child:

```tsx
{/* Campaign Image */}
<div className="border border-white/8 rounded-xl bg-[#0d0d0d] p-6 lg:p-8 space-y-5">
  <div className="flex items-center gap-3 mb-2">
    <span className="font-mono text-xs text-white/30 uppercase tracking-widest">00</span>
    <h2 className="text-sm font-medium text-white/70 uppercase tracking-wider">Campaign Image</h2>
  </div>

  <label className="block cursor-pointer">
    {imagePreview ? (
      <div className="relative rounded-lg overflow-hidden">
        <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <p className="text-white text-sm">Click to change</p>
        </div>
      </div>
    ) : (
      <div className="border-2 border-dashed border-white/10 rounded-lg h-48 flex flex-col items-center justify-center hover:border-[#35D07F]/40 transition-colors">
        <ImagePlus className="w-8 h-8 text-white/20 mb-2" />
        <p className="text-sm text-white/30">Click to upload campaign image</p>
        <p className="text-xs text-white/15 mt-1">PNG, JPG, WebP (max 5MB)</p>
      </div>
    )}
    <input
      type="file"
      accept="image/png,image/jpeg,image/webp"
      onChange={handleImageSelect}
      className="hidden"
    />
  </label>
</div>
```

Update the Campaign Details section number from `01` to `01` (no change needed there), and the Milestones section number from `02` to `02` (no change needed).

Actually, renumber: Campaign Image = `01`, Campaign Details = `02`, Milestones = `03`. Change the existing `01` span to `02` and `02` span to `03`.

Add an optional metadata section **after** the Milestones section:

```tsx
{/* Optional Info */}
<div className="border border-white/8 rounded-xl bg-[#0d0d0d] p-6 lg:p-8 space-y-5">
  <div className="flex items-center gap-3 mb-2">
    <span className="font-mono text-xs text-white/30 uppercase tracking-widest">04</span>
    <h2 className="text-sm font-medium text-white/70 uppercase tracking-wider">Additional Info</h2>
    <span className="text-xs text-white/15">(optional)</span>
  </div>

  <div>
    <label className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2 block">Website</label>
    <input
      type="url"
      value={website}
      onChange={(e) => setWebsite(e.target.value)}
      placeholder="https://your-project.com"
      className={inputCls}
    />
  </div>

  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2 block">Twitter</label>
      <input
        type="url"
        value={twitter}
        onChange={(e) => setTwitter(e.target.value)}
        placeholder="https://twitter.com/..."
        className={inputCls}
      />
    </div>
    <div>
      <label className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2 block">GitHub</label>
      <input
        type="url"
        value={github}
        onChange={(e) => setGithub(e.target.value)}
        placeholder="https://github.com/..."
        className={inputCls}
      />
    </div>
  </div>

  <div>
    <label className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2 block">Category</label>
    <select
      value={category}
      onChange={(e) => setCategory(e.target.value)}
      className={inputCls}
    >
      <option value="">Select category</option>
      <option value="education">Education</option>
      <option value="charity">Charity</option>
      <option value="environment">Environment</option>
      <option value="health">Health</option>
      <option value="technology">Technology</option>
      <option value="community">Community</option>
      <option value="other">Other</option>
    </select>
  </div>
</div>
```

- [ ] **Step 4: Update submit button to show upload state**

Replace the submit button text logic:

```tsx
{isPending || isConfirming ? (
  <><Loader2 className="w-4 h-4 animate-spin" /> Creating on-chain…</>
) : isUploading ? (
  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading to IPFS…</>
) : (
  <><CheckCircle2 className="w-4 h-4" /> Launch Campaign</>
)}
```

Update the disabled condition:

```tsx
disabled={!isFormValid || isPending || isConfirming || isUploading}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/campaign/create/page.tsx
git commit -m "feat(frontend): add image upload and metadata fields to create campaign form"
```

---

### Task 6: Frontend — Display campaign image on card and detail page

**Files:**
- Modify: `frontend/src/components/campaign-card.tsx`
- Modify: `frontend/src/app/campaign/[id]/page.tsx`

- [ ] **Step 1: Update campaign card to show image**

In `frontend/src/components/campaign-card.tsx`:

1. Add imports:

```typescript
import { useCampaignMetadata } from "@/hooks/useCampaignMetadata";
import { ipfsToHttp } from "@/lib/pinata";
```

2. Inside the `CampaignCard` component, add the metadata hook after the existing variable declarations:

```typescript
const { metadata } = useCampaignMetadata(campaign.metadataURI);
```

3. Add an image element at the beginning of the `<Card>` component, before `<CardHeader>`:

```tsx
{metadata?.image && (
  <div className="h-40 overflow-hidden">
    <img
      src={ipfsToHttp(metadata.image)}
      alt={campaign.title}
      className="w-full h-full object-cover"
    />
  </div>
)}
```

- [ ] **Step 2: Update campaign detail page to show image and metadata**

In `frontend/src/app/campaign/[id]/page.tsx`:

1. Add imports:

```typescript
import { useCampaignMetadata } from "@/hooks/useCampaignMetadata";
import { ipfsToHttp } from "@/lib/pinata";
import { Globe, Twitter, Github } from "lucide-react";
```

Add `Globe`, `Twitter`, `Github` to the lucide-react import line.

2. Add the metadata hook after `const { data: donations, refetch: refetchDonations } = useDonations(campaignId);`:

```typescript
const { metadata } = useCampaignMetadata((campaign as Campaign)?.metadataURI);
```

3. Add campaign image before the title section (after the back link, before the `grid` div). Insert this inside the `lg:col-span-2 space-y-6` div as the first child:

```tsx
{metadata?.image && (
  <div className="rounded-lg overflow-hidden">
    <img
      src={ipfsToHttp(metadata.image)}
      alt={c.title}
      className="w-full h-64 object-cover"
    />
  </div>
)}
```

4. Add metadata links section after the description `<p>` tag (after `{c.description}`):

```tsx
{metadata && (metadata.website || metadata.socials) && (
  <div className="flex flex-wrap items-center gap-3">
    {metadata.website && (
      <a
        href={metadata.website}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Globe className="h-4 w-4" />
        Website
      </a>
    )}
    {metadata.socials?.twitter && (
      <a
        href={metadata.socials.twitter}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Twitter className="h-4 w-4" />
        Twitter
      </a>
    )}
    {metadata.socials?.github && (
      <a
        href={metadata.socials.github}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Github className="h-4 w-4" />
        GitHub
      </a>
    )}
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/campaign-card.tsx frontend/src/app/campaign/\\[id\\]/page.tsx
git commit -m "feat(frontend): display campaign image and metadata on card and detail page"
```

---

### Task 7: Verify full integration

**Files:** None (verification only)

- [ ] **Step 1: Run contract tests**

Run: `cd /Users/vanhuy/Desktop/proof-donate/contracts && forge test -v`
Expected: ALL tests pass.

- [ ] **Step 2: Run frontend type check**

Run: `cd /Users/vanhuy/Desktop/proof-donate/frontend && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Run frontend build**

Run: `cd /Users/vanhuy/Desktop/proof-donate/frontend && pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Final commit (if any fixes were needed)**

Only if fixes were required during verification:

```bash
git add -A
git commit -m "fix: resolve integration issues from metadataURI feature"
```
