# ProofDonate V2 — MiniPay Native Integration

**Date:** 2026-04-16
**Deadline:** 24h
**Approach:** Single-token V2 contract (cUSD), MiniPay-native frontend

## Decisions

- Deploy new ProofDonateV2 contract accepting cUSD (ERC-20) instead of native CELO
- Single immutable donation token: cUSD (`0x765DE816845861e75A25fCA122bb6898B8B1282a`)
- Drop V1 entirely from frontend — no dual-read, no legacy campaign display
- Deploy directly to Celo mainnet
- Minimum donation: 0.2 cUSD

## 1. Smart Contract — ProofDonateV2

### Constructor

```solidity
constructor(address _donationToken, uint256 _feeBps) Ownable(msg.sender)
```

- `_donationToken` must not be zero address
- Stores `immutable donationToken` (IERC20) and `immutable donationTokenDecimals` (uint8)
- `_feeBps <= MAX_FEE_BPS`

### State Changes from V1

- `MIN_DONATION` constant replaced by `minDonation` variable, initialized to `0.2 cUSD` (200000000000000000 = 0.2 * 1e18)
- `receive() external payable` removed — no native CELO accepted
- New `updateMinDonation(uint256)` owner function

### Donate Function

```solidity
function donate(uint256 _campaignId, uint256 _amount) external nonReentrant whenNotPaused
```

- Not `payable` — no `msg.value`
- Requires `_amount >= minDonation`
- Requires `currentAmount + _amount <= targetAmount`
- Calls `donationToken.transferFrom(msg.sender, address(this), _amount)`
- Increments `currentAmount`, `donorContributions`, appends to donations array
- Emits `DonationMade(campaignId, donor, amount)`

### Milestone Release

Same logic as V1 but replaces native transfers:

```solidity
// V1: payable(owner()).call{value: fee}
// V2: donationToken.transfer(owner(), fee)
// V2: donationToken.transfer(c.creator, creatorAmount)
```

### Refund

Same snapshot logic as V1. `claimRefund` calls `donationToken.transfer(msg.sender, refundAmount)` instead of native transfer.

### SafeERC20

All ERC-20 interactions use OpenZeppelin `SafeERC20` (`safeTransferFrom`, `safeTransfer`) to handle non-standard return values safely.

### Everything Else Unchanged

- Campaign struct (monetary fields now represent cUSD amounts)
- Milestone struct
- Verification system (requestVerification, verifyHuman, pendingUsers)
- Timelock (3 days)
- Pausable, Ownable2Step, ReentrancyGuard
- Refund snapshot mechanism

### Deployment

- Script: `contracts/script/DeployV2.s.sol`
- Args: `donationToken = 0x765DE816845861e75A25fCA122bb6898B8B1282a`, `feeBps = same as V1`
- Network: Celo mainnet (42220)

## 2. Frontend — MiniPay Runtime & Transaction Layer

### New: `frontend/src/lib/minipay.ts`

MiniPay runtime helper:

- `isMiniPay()`: returns `window.ethereum?.isMiniPay === true`
- `CUSD_ADDRESS`: cUSD token address
- `CUSD_FEE_CURRENCY`: same as CUSD_ADDRESS (18 decimals, no adapter needed)
- `isCeloChain()`: check chain ID === 42220

All components import from here instead of checking `window.ethereum?.isMiniPay` directly.

### New: `frontend/src/lib/minipay-transactions.ts`

MiniPay-aware write abstraction:

- Wraps wagmi `writeContract` to automatically attach `feeCurrency: CUSD_ADDRESS` when inside MiniPay
- Helpers: `miniPayApprove(token, spender, amount)`, `miniPayWriteContract(config)`
- Outside MiniPay: standard wagmi write, no `feeCurrency`

### Updated: `frontend/src/components/wallet-provider.tsx`

- Import `isMiniPay` from `minipay.ts`
- Skip network switching when inside MiniPay (always Celo)

### Updated: `frontend/src/components/connect-button.tsx`

- Import `isMiniPay` from `minipay.ts` instead of local check

### Updated: `frontend/src/hooks/useProofDonate.ts`

- All write hooks route through minipay-transactions layer
- `useDonate`: signature changes to `donate(campaignId, amount)` — amount is cUSD, no `value` field
- All other write hooks (`useCreateCampaign`, `useReleaseMilestone`, `useCancelCampaign`, `useClaimRefund`, etc.) attach `feeCurrency` via the abstraction layer

## 3. Frontend — Donate Form & UX

### Rewrite: `frontend/src/components/donate-form.tsx`

2-step flow:
1. Approve cUSD for ProofDonateV2 contract
2. Donate cUSD directly

Removed:
- Token selector (CELO / cUSD)
- Uniswap swap quote logic
- 3-step flow

UI:
- Quick amounts: `["0.5", "1", "5", "10"]` cUSD
- Balance: show cUSD balance
- Minimum: 0.2 cUSD
- Buttons: "Approve cUSD" -> "Donate cUSD"
- 2-step indicator instead of 3

### New: `frontend/src/hooks/useDonationTokenApproval.ts`

- Read allowance for cUSD against ProofDonateV2 address
- Submit approve through MiniPay-aware write path

### Updated: `frontend/src/app/campaign/[id]/page.tsx`

- Display target/raised in cUSD instead of CELO

### Updated: `frontend/src/app/dashboard/page.tsx`

- Same denomination change to cUSD

## 4. MiniPay Performance & Cleanup

### Updated: `frontend/src/components/network-canvas.tsx`

- When `isMiniPay() === true`: return null (don't render particles)
- Outside MiniPay: unchanged

### Updated: `frontend/src/app/page.tsx`

- Change messaging from "CELO donations" to "cUSD donations"
- In MiniPay: no hero particles

### Updated: `frontend/src/lib/contracts.ts`

- Replace V1 ABI with V2 ABI
- Replace V1 address with V2 address after deployment

### Updated: `frontend/src/lib/constants.ts`

- Keep `CUSD_ADDRESS`
- Move ERC20_ABI into `contracts.ts`

### Deleted Files

- `frontend/src/hooks/useSwapToCelo.ts`
- `frontend/src/hooks/useSwap.ts`
- `frontend/src/hooks/useCUSDApproval.ts`
- `frontend/src/lib/swap.ts`
- `frontend/src/app/swap/page.tsx`

## Files Summary

| File | Action |
|---|---|
| `contracts/src/ProofDonateV2.sol` | NEW |
| `contracts/test/ProofDonateV2.t.sol` | NEW |
| `contracts/script/DeployV2.s.sol` | NEW |
| `frontend/src/lib/minipay.ts` | NEW |
| `frontend/src/lib/minipay-transactions.ts` | NEW |
| `frontend/src/hooks/useDonationTokenApproval.ts` | NEW |
| `frontend/src/lib/contracts.ts` | UPDATE — V2 ABI + address |
| `frontend/src/lib/constants.ts` | UPDATE — cleanup |
| `frontend/src/hooks/useProofDonate.ts` | UPDATE — V2 writes + feeCurrency |
| `frontend/src/components/donate-form.tsx` | REWRITE — 2-step cUSD flow |
| `frontend/src/components/wallet-provider.tsx` | UPDATE — centralized MiniPay detection |
| `frontend/src/components/connect-button.tsx` | UPDATE — use shared isMiniPay |
| `frontend/src/components/network-canvas.tsx` | UPDATE — disable in MiniPay |
| `frontend/src/app/page.tsx` | UPDATE — cUSD messaging |
| `frontend/src/app/campaign/[id]/page.tsx` | UPDATE — cUSD denomination |
| `frontend/src/app/dashboard/page.tsx` | UPDATE — cUSD denomination |
| `frontend/src/hooks/useSwapToCelo.ts` | DELETE |
| `frontend/src/hooks/useSwap.ts` | DELETE |
| `frontend/src/hooks/useCUSDApproval.ts` | DELETE |
| `frontend/src/lib/swap.ts` | DELETE |
| `frontend/src/app/swap/page.tsx` | DELETE |
