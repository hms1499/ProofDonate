# ProofDonate - Restructure + Owner Approve Verification

**Date:** 2026-04-02

## Summary

Restructure project from Hardhat monorepo to flat Foundry + Next.js structure. Replace Self Protocol verification with a simple owner-approve flow where users request verification on-chain and the contract owner approves via an admin page.

## Project Structure

```
talent-project/
├── contracts/                 # Foundry project
│   ├── src/
│   │   └── ProofDonate.sol
│   ├── test/
│   │   └── ProofDonate.t.sol
│   ├── script/
│   │   └── Deploy.s.sol
│   ├── lib/                   # dependencies (openzeppelin)
│   └── foundry.toml
│
├── frontend/                  # Next.js project
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Home - browse campaigns
│   │   │   ├── layout.tsx
│   │   │   ├── globals.css
│   │   │   ├── campaign/
│   │   │   │   ├── [id]/page.tsx     # Campaign detail + donate
│   │   │   │   └── create/page.tsx   # Create campaign
│   │   │   ├── dashboard/page.tsx    # My campaigns
│   │   │   ├── verify/page.tsx       # Request verification
│   │   │   └── admin/page.tsx        # Owner approve requests
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn components
│   │   │   ├── navbar.tsx
│   │   │   ├── campaign-card.tsx
│   │   │   ├── campaign-list.tsx
│   │   │   ├── donate-form.tsx
│   │   │   ├── milestone-tracker.tsx
│   │   │   ├── connect-button.tsx
│   │   │   ├── wallet-provider.tsx
│   │   │   └── user-balance.tsx
│   │   ├── hooks/
│   │   │   ├── useProofDonate.ts
│   │   │   └── useCUSDApproval.ts
│   │   ├── lib/
│   │   │   ├── contracts.ts          # ABI + address
│   │   │   ├── constants.ts
│   │   │   └── utils.ts
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   └── next.config.js
│
└── README.md
```

## Smart Contract Changes

Rewrite ProofDonate.sol with Foundry. Keep all existing logic (campaigns, donations, milestones, cancel) and add:

```solidity
mapping(address => bool) public verificationRequested;
event VerificationRequested(address indexed user);

function requestVerification() external {
    require(!verifiedHumans[msg.sender], "Already verified");
    require(!verificationRequested[msg.sender], "Already requested");
    verificationRequested[msg.sender] = true;
    emit VerificationRequested(msg.sender);
}
```

- Owner = address that deployed the contract (existing `owner` variable)
- `verifyHuman()` remains owner-only for approving requests
- Tests rewritten in Solidity using forge-std
- Deploy script using forge script

## Frontend Changes

### `/verify` page (updated)

Three states based on wallet:
1. Not requested -> show "Request Verification" button -> calls `requestVerification()`
2. Requested, not verified -> show "Pending approval" message
3. Verified -> show "You are verified" (existing behavior)

### `/admin` page (new)

- Gate: check connected wallet == contract `owner()`. If not, show "Access denied"
- Read `VerificationRequested` events from contract
- Filter out addresses where `verifiedHumans[address] == true`
- Display list of pending addresses with "Approve" button for each
- "Approve" calls `verifyHuman(address)`

### Navbar (updated)

- Add "Admin" link, only visible when connected wallet == owner

## What Gets Removed

- `apps/` folder structure
- `turbo.json`, `pnpm-workspace.yaml` (monorepo tooling)
- Hardhat config, ignition modules, TypeScript tests
- `MockERC20.sol` (Foundry has its own mocking via forge-std)

## Data Flow

```
User -> /verify -> requestVerification() -> on-chain event
Owner -> /admin -> sees pending list -> approve -> verifyHuman() -> on-chain
User -> /verify -> sees "Verified!" -> can create campaigns
```
