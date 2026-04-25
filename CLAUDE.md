# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Smart Contracts (Foundry)
```bash
cd contracts
forge build          # Compile contracts
forge test           # Run all tests
forge test -vvv      # Run tests with verbose output
forge fmt            # Format Solidity code
forge script script/Deploy.s.sol:DeployProofDonate --rpc-url $CELO_RPC_URL --broadcast --verify
```

### Frontend (Next.js)
```bash
cd frontend
pnpm install         # Install dependencies
pnpm dev             # Dev server at http://localhost:3000
pnpm build           # Production build
pnpm lint            # ESLint
pnpm type-check      # TypeScript check (tsc --noEmit)
```

### Tools (Admin CLI)
```bash
cd tools
npm run verify       # Run verify-accounts.ts
# Usage: npx ts-node verify-accounts.ts --mnemonic "word1 ... word12" --count 10
# Requires: tools/.env with PRIVATE_KEY (owner) and CELO_RPC_URL
```

## Architecture

### Smart Contract (`contracts/src/ProofDonate.sol`)
Deployed on Celo Mainnet at `0x9c161Ec01be48E21904f4877e53b7F789fd23848`.

Key flows:
- **Verification**: users call `requestVerification()` → owner calls `verifyHuman(address)` to approve
- **Campaigns**: only verified humans can `createCampaign()` with milestones
- **Donations**: `donate(campaignId)` sends CELO; cUSD path requires ERC20 approval first (Uniswap V3 swap handled on frontend)
- **Milestone release**: `requestMilestoneRelease()` starts a 3-day timelock, then `releaseMilestone()` transfers funds
- **Refunds**: `claimRefund()` uses snapshot-based proportional distribution for cancelled/expired campaigns

Security: ReentrancyGuard + Ownable2Step + Pausable + CEI pattern throughout.

### Frontend (`frontend/src/`)

**`lib/contracts.ts`** — exports `PROOF_DONATE_ABI` and `PROOF_DONATE_ADDRESS` (sourced from `NEXT_PUBLIC_PROOF_DONATE_ADDRESS` env var). This is the single source of truth for contract interaction config.

**`hooks/useProofDonate.ts`** — all wagmi read/write hooks for the contract. Each contract function has a corresponding hook. Write hooks return `{ writeContract, isPending, isSuccess, hash }` pattern with `useWaitForTransactionReceipt` for confirmation.

**`lib/minipay.ts` + `lib/minipay-transactions.ts`** — MiniPay wallet detection and `feeCurrencyConfig` for Celo fee currency abstraction (allows paying gas in cUSD).

**`lib/pinata.ts`** — IPFS upload helpers for campaign images and metadata JSON. Campaign images are stored on IPFS; metadata URI is passed to `createCampaign()`.

**`lib/utils.ts`** — shadcn/ui `cn()` helper. **`lib/app-utils.ts`** — domain-specific utilities (formatting amounts, campaign state helpers).

**`hooks/useCampaignMetadata.ts`** — fetches IPFS metadata for campaigns by resolving the stored URI.

**`hooks/useMiniPay.ts`** — detects MiniPay environment and exposes wallet capabilities.

### Tools (`tools/verify-accounts.ts`)
Admin CLI for batch-verifying accounts: derives HD wallet accounts from a mnemonic, calls `requestVerification()` in parallel, then owner calls `verifyHuman()` sequentially. Requires a separate `tools/.env` with `PRIVATE_KEY` and `CELO_RPC_URL`.

## Environment Variables

`frontend/.env.local`:
```
NEXT_PUBLIC_PROOF_DONATE_ADDRESS=0x9c161Ec01be48E21904f4877e53b7F789fd23848
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_PINATA_JWT=...
NEXT_PUBLIC_PINATA_GATEWAY=...gateway.mypinata.cloud
```

`tools/.env`:
```
PRIVATE_KEY=0x...   # Contract owner private key
CELO_RPC_URL=...
```

`contracts/.env` (for deployment):
```
PRIVATE_KEY=0x...
CELO_RPC_URL=...
CELO_SEPOLIA_RPC_URL=...
```

## Key Details

- **Chain**: Celo Mainnet (chainId 42220). Use `viem/chains` `celo` object everywhere.
- **Tokens**: Native CELO for donations; cUSD (`CUSD_ADDRESS` from `lib/minipay.ts`) for ERC20 path.
- **Swap**: cUSD → CELO swap via Uniswap V3 is handled client-side before calling `donate()`.
- **Compiler**: `solc 0.8.28` with `via_ir = true` and `optimizer_runs = 200`.
- **shadcn/ui**: components use Radix UI primitives + `class-variance-authority`; add new components to `frontend/src/components/ui/`.
