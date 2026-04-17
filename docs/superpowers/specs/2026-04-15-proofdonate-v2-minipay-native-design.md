# ProofDonate V2 - MiniPay Native Stablecoin Donation Design

**Date:** 2026-04-15

## Summary

Upgrade ProofDonate from partial MiniPay support to a MiniPay-native donation flow.

The current product is CELO-first:

- campaigns are funded with native CELO
- the `cUSD` path swaps into CELO and then donates CELO
- contract writes use the generic wagmi path

ProofDonate V2 changes the architecture so MiniPay users donate with a supported stablecoin directly, without the main donation path depending on a CELO swap first.

## Goals

- Make donation flow stablecoin-first for MiniPay users
- Support direct ERC-20 stablecoin donations on-chain
- Add a MiniPay-specific transaction path that can attach `feeCurrency`
- Keep the UI lightweight enough for MiniPay mobile webview
- Preserve existing ProofDonate milestone, refund, and verification behavior

## Non-Goals

- Multi-token support in V2 launch
- Aggregator-based token routing inside the primary donation path
- Backward migration of existing on-chain campaign data from the current contract
- Removing all CELO support from the product forever

## Decisions

- **New contract version:** deploy a new `ProofDonateV2` contract instead of mutating the current deployment
- **Primary donation asset:** one supported stablecoin at launch
- **Architecture:** contract-level immutable donation token, not per-campaign token selection
- **MiniPay strategy:** stablecoin-first UI + MiniPay-specific write path + optional CELO fallback outside MiniPay
- **Campaign accounting:** all target, raised, released, and refund values are denominated in the donation token

## Why Single-Token V2

Using a single donation token keeps milestone release, refunds, targets, and UI much simpler:

- all campaigns share one accounting unit
- no mixed-token refund edge cases
- no per-campaign token metadata complexity
- easier MiniPay UX and clearer product positioning

If multi-token support is needed later, it can be added in V3 with a more explicit token abstraction.

## Target Architecture

```text
MiniPay user
  -> injected MiniPay wallet
  -> approve stablecoin
  -> donate stablecoin directly to ProofDonateV2
  -> contract records token-denominated contribution
  -> creator milestone releases are paid in the same stablecoin
  -> refunds are paid back in the same stablecoin
```

Outside MiniPay:

- the same stablecoin donation path remains available
- optional CELO swap flow may remain as a secondary helper UX, not the core donation architecture

## Contract Design

### New Contract

Create a new contract:

`contracts/src/ProofDonateV2.sol`

V2 keeps the existing campaign and milestone model, but changes fundraising and payout logic from native CELO transfers to ERC-20 token transfers.

### Constructor

```solidity
constructor(address _donationToken, uint256 _feeBps) Ownable(msg.sender)
```

Rules:

- `_donationToken` must not be zero address
- `_feeBps` must be `<= MAX_FEE_BPS`

### New Immutable State

```solidity
IERC20 public immutable donationToken;
uint8 public immutable donationTokenDecimals;
```

Notes:

- `donationToken` is the only accepted donation token in V2
- `donationTokenDecimals` is stored to help frontend and contract tests reason about minimums and formatting

### Minimum Donation

Replace the CELO-specific minimum:

```solidity
uint256 public constant MIN_DONATION = 0.02 ether;
```

with a token-denominated minimum:

```solidity
uint256 public minDonation;
```

Set in constructor or via owner-controlled initialization policy.

Recommendation:

- use a fixed token amount aligned with the chosen stablecoin decimals
- keep it readable on frontend, e.g. `0.5` or `1.0` units

### Campaign Struct

The `Campaign` struct can remain mostly unchanged, but its monetary fields now represent token amounts:

```solidity
struct Campaign {
    address creator;
    string title;
    string description;
    uint256 targetAmount;     // donation token units
    uint256 currentAmount;    // donation token units
    uint256 deadline;
    bool isActive;
    uint256 milestoneCount;
    bool creatorVerified;
    string metadataURI;
}
```

### Donation Function

Replace the native donation entrypoint:

```solidity
function donate(uint256 _campaignId) external payable
```

with:

```solidity
function donate(uint256 _campaignId, uint256 _amount) external nonReentrant whenNotPaused
```

Behavior:

- require campaign active
- require deadline not passed
- require `_amount >= minDonation`
- require `currentAmount + _amount <= targetAmount`
- call `donationToken.transferFrom(msg.sender, address(this), _amount)`
- increment campaign amount and donor contribution accounting
- append donation record
- emit `DonationMade`

### Donation Event

Option A:

Keep event shape unchanged because token is contract-wide:

```solidity
event DonationMade(uint256 indexed campaignId, address indexed donor, uint256 amount);
```

Option B:

Include token address explicitly for easier indexer compatibility:

```solidity
event DonationMade(
    uint256 indexed campaignId,
    address indexed donor,
    address indexed token,
    uint256 amount
);
```

Recommendation:

Use Option B in V2 for better explicitness.

### Milestone Release

Current CELO logic releases value by transferring native funds.

V2 must release stablecoin balances:

- compute platform fee from milestone amount
- transfer fee to owner in `donationToken`
- transfer creator amount in `donationToken`
- update `totalReleased`
- mark milestone released

### Refunds

Refund logic remains conceptually the same, but all calculations and payouts use `donationToken`.

Requirements:

- `claimRefund()` transfers `donationToken`
- refund snapshot logic stays intact
- donor contribution mapping remains denominated in token units

### Receive / Fallback

V2 should not accept native CELO as the main funding path.

Recommendation:

- remove `receive()` if not needed
- do not expose a payable donation function in V2

This makes the contract semantics cleaner and prevents accidental CELO donations.

## Contract API

### Public / External Functions

V2 contract should expose:

```solidity
function donationToken() external view returns (address);
function donationTokenDecimals() external view returns (uint8);
function minDonation() external view returns (uint256);

function requestVerification() external;
function verifyHuman(address _user) external;

function createCampaign(
    string calldata _title,
    string calldata _description,
    string calldata _metadataURI,
    uint256 _targetAmount,
    string[] calldata _milestoneDescriptions,
    uint256[] calldata _milestoneAmounts,
    uint256 _deadline
) external returns (uint256);

function donate(uint256 _campaignId, uint256 _amount) external;
function requestMilestoneRelease(uint256 _campaignId, uint256 _milestoneIndex) external;
function releaseMilestone(uint256 _campaignId, uint256 _milestoneIndex) external;
function cancelCampaign(uint256 _campaignId) external;
function claimRefund(uint256 _campaignId) external;
```

### Optional Admin Functions

Only add if needed:

```solidity
function updateMinDonation(uint256 _newMinDonation) external onlyOwner;
```

Do not make `donationToken` mutable in V2.

## Frontend Design

### New Runtime Helper

Create a MiniPay runtime helper:

`frontend/src/lib/minipay.ts`

Responsibilities:

- detect MiniPay from injected provider
- expose normalized booleans:
  - `isMiniPay`
  - `hasInjectedProvider`
  - `supportsFeeCurrency`
  - `isCeloChain`
- expose preferred donation token metadata for MiniPay UI

### New Transaction Abstraction

Create a MiniPay-aware transaction layer:

`frontend/src/lib/minipay-transactions.ts`

Responsibilities:

- build `eth_sendTransaction` payloads for MiniPay
- attach `feeCurrency` when supported
- avoid relying only on default wagmi write path for MiniPay
- provide shared helpers for:
  - ERC-20 approve
  - contract writes

### Hooks Changes

Update:

`frontend/src/hooks/useProofDonate.ts`

Changes:

- replace native CELO donate helper with token donate helper
- all writes must route through a shared abstraction:
  - MiniPay path for MiniPay
  - wagmi fallback elsewhere

New hook shapes:

```ts
useDonateToken()
useCreateCampaign()
useRequestVerification()
useRequestMilestoneRelease()
useReleaseMilestone()
useCancelCampaign()
useClaimRefund()
```

Update:

`frontend/src/hooks/useCUSDApproval.ts`

or replace with:

`frontend/src/hooks/useDonationTokenApproval.ts`

Responsibilities:

- read allowance for the chosen donation token
- submit approval through MiniPay-aware write path

### Donate Form

Update:

`frontend/src/components/donate-form.tsx`

New behavior:

- default to donation token when `isMiniPay === true`
- primary flow becomes:
  1. approve stablecoin
  2. donate stablecoin
- remove swap-to-CELO from the primary CTA path
- show stablecoin balances and token symbol everywhere
- reflect `minDonation` from contract instead of a hard-coded CELO minimum

Optional fallback:

- keep a secondary CELO swap helper behind an advanced toggle
- do not present it as the default MiniPay flow

### Wallet Provider

Update:

`frontend/src/components/wallet-provider.tsx`

Changes:

- centralize MiniPay detection
- keep auto-connect behavior for injected wallet
- reduce provider assumptions scattered across components
- avoid redundant network switching behavior if MiniPay already exposes the correct Celo chain

### Connect Button

Update:

`frontend/src/components/connect-button.tsx`

Changes:

- consume centralized MiniPay runtime state
- remove duplicated local `window.ethereum?.isMiniPay` checks
- keep connect button hidden inside MiniPay

## UX Changes

### Homepage

Update:

`frontend/src/app/page.tsx`

Changes:

- if MiniPay is detected, prioritize donation-token messaging over CELO language
- move “stablecoin donation” language into visible hero or donation-related UI
- simplify hero rendering inside MiniPay

### Performance Mode

Update:

`frontend/src/components/network-canvas.tsx`

Changes:

- disable or heavily reduce particles in MiniPay
- reduce interactivity and animation density

Goal:

- make the app feel stable in MiniPay mobile webview

### Campaign Page

Update:

`frontend/src/app/campaign/[id]/page.tsx`

Changes:

- make token denomination visible near raised / target / milestones
- keep donate card focused on the stablecoin path
- reduce non-essential motion in MiniPay mode

## Files To Change

| File | Change |
|------|--------|
| `contracts/src/ProofDonateV2.sol` | NEW — token-native V2 contract |
| `contracts/test/ProofDonateV2.t.sol` | NEW — tests for token donation, release, refund |
| `contracts/script/DeployV2.s.sol` | NEW — deploy V2 with token address and fee config |
| `frontend/src/lib/contracts.ts` | Add V2 ABI and address wiring |
| `frontend/src/lib/constants.ts` | Replace CELO-first donation constants with token config |
| `frontend/src/lib/minipay.ts` | NEW — MiniPay runtime detection |
| `frontend/src/lib/minipay-transactions.ts` | NEW — MiniPay transaction sender |
| `frontend/src/hooks/useProofDonate.ts` | Rewrite writes for V2 token donation path |
| `frontend/src/hooks/useDonationTokenApproval.ts` | NEW or rename existing approval hook |
| `frontend/src/components/donate-form.tsx` | Stablecoin-first donate UX |
| `frontend/src/components/wallet-provider.tsx` | Centralized MiniPay bootstrap |
| `frontend/src/components/connect-button.tsx` | Use shared MiniPay state |
| `frontend/src/components/network-canvas.tsx` | MiniPay performance mode |
| `frontend/src/app/page.tsx` | MiniPay-specific lightweight homepage behavior |
| `frontend/src/app/campaign/[id]/page.tsx` | Stablecoin denomination and MiniPay UX polish |
| `README.md` | Update product claims and setup instructions |
| `docs/minipay-compatibility-review.md` | Update status after implementation |

## Testing Plan

### Contract Tests

Add tests for:

- deployment with invalid token address reverts
- create campaign still requires verified human
- donate transfers stablecoin from donor to contract
- donate fails below `minDonation`
- donate fails above target
- milestone release transfers fee + creator payout in token
- cancel + refund path transfers token correctly
- refund snapshot logic remains fair across multiple donors

### Frontend Verification

Verify:

- MiniPay auto-connect still works
- connect button is hidden in MiniPay
- approval transaction succeeds through MiniPay-aware path
- donate transaction succeeds through MiniPay-aware path
- raised / target / milestones render the correct token denomination
- homepage remains responsive on mobile

### Real Device Testing

Required before claiming compatibility:

- test inside MiniPay on a real Android or iOS device
- test with a public URL, not only localhost browser
- verify transaction UX for both approval and donation

## Migration Strategy

V2 should be deployed alongside the current contract.

Recommendation:

- leave the current contract as legacy CELO-based deployment
- use V2 for all new campaigns
- optionally keep read-only display for legacy campaigns

Frontend rollout options:

### Option A — V2-only new app mode

- frontend points only to V2
- legacy campaigns are excluded from primary UI

### Option B — dual-read mode

- frontend reads both V1 and V2
- new campaign creation only targets V2

Recommendation:

Start with Option A if shipping speed matters more than preserving old campaign discoverability.

## Risks

- token choice may not perfectly match MiniPay’s current preferred stablecoin set
- `feeCurrency` support may vary across provider versions and must be validated on device
- switching from native CELO to token accounting changes multiple assumptions in frontend formatting and contract tests
- dual-supporting V1 and V2 in one UI can add significant complexity

## Acceptance Criteria

ProofDonate V2 can be described as meaningfully closer to MiniPay compatibility when all of the following are true:

- users donate directly with the supported stablecoin
- contract no longer depends on native CELO for the main donation flow
- approval and donate transactions work from MiniPay on a real device
- MiniPay-specific write path can attach `feeCurrency` where supported
- connect button remains hidden and wallet bootstrap is automatic inside MiniPay
- MiniPay mobile UX is lighter and more stable than the current particle-heavy homepage

## Recommended Implementation Order

1. Build `ProofDonateV2.sol`
2. Add full Foundry test coverage for token-native donation logic
3. Add V2 ABI and frontend contract wiring
4. Implement MiniPay runtime helper and MiniPay transaction abstraction
5. Replace donate form with stablecoin-first flow
6. Add MiniPay mobile performance mode
7. Deploy V2 to test environment and test inside MiniPay on device
8. Update docs and product wording after real-device validation
