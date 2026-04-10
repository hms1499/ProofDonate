<p align="center">
  <img src="https://img.shields.io/badge/Celo-Mainnet-34D399?style=for-the-badge&logo=celo&logoColor=white" />
  <img src="https://img.shields.io/badge/Solidity-0.8.28-363636?style=for-the-badge&logo=solidity&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-FBBF24?style=for-the-badge" />
</p>

# ProofDonate

> Transparent, milestone-based donation platform on the Celo blockchain. Every promise kept, every transaction proven.

ProofDonate ensures donor trust by releasing funds only when campaign creators hit verified milestones. No middlemen, no hidden fees — just on-chain proof of impact.

---

## Features

**For Donors**
- Browse verified campaigns with on-chain transparency
- Donate with CELO or cUSD (auto-swap via Uniswap V3)
- Track milestone progress in real time
- Claim refunds if campaigns are cancelled or expire

**For Creators**
- Proof of Humanity verification to prevent fraud
- Milestone-based fund release with 3-day timelock
- Upload campaign images and metadata to IPFS
- Dashboard to manage campaigns and request milestone releases

**For Admins**
- On-chain pending verification queue (no event scanning needed)
- One-click approve/reject with automatic list refresh
- Contract and owner links to Celoscan explorer

**Platform**
- Deep navy UI with emerald/amber accents
- Interactive tsParticles hero animation
- Draggable image positioning for campaign covers
- CELO ↔ cUSD swap powered by Uniswap V3
- Mobile-responsive with wallet auto-detection (MiniPay support)

---

## Architecture

```
proof-donate/
├── contracts/               # Foundry — Solidity smart contracts
│   ├── src/
│   │   └── ProofDonate.sol  # Main contract (campaigns, milestones, verification)
│   ├── test/
│   │   └── ProofDonate.t.sol
│   └── script/
│       └── Deploy.s.sol
│
├── frontend/                # Next.js 14 — Web application
│   ├── src/
│   │   ├── app/             # Pages (home, campaign, admin, verify, swap, dashboard)
│   │   ├── components/      # UI components (cards, forms, navbar, particles)
│   │   ├── hooks/           # Contract interaction hooks (wagmi)
│   │   ├── lib/             # Utilities (contracts ABI, pinata, swap logic)
│   │   └── types/           # TypeScript interfaces
│   └── public/
│
└── docs/                    # Documentation
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Smart Contracts** | Solidity 0.8.28, Foundry, OpenZeppelin (ReentrancyGuard, Ownable2Step, Pausable) |
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| **Wallet** | RainbowKit, wagmi, viem |
| **Blockchain** | Celo Mainnet |
| **DEX** | Uniswap V3 (CELO ↔ cUSD swap) |
| **Storage** | Pinata (IPFS) for images & metadata |
| **Animation** | tsParticles (hero), CSS keyframes |

---

## Smart Contract

**Deployed on Celo Mainnet:** [`0x9c161Ec01be48E21904f4877e53b7F789fd23848`](https://celoscan.io/address/0x9c161Ec01be48E21904f4877e53b7F789fd23848)

### Key Functions

| Function | Access | Description |
|----------|--------|-------------|
| `requestVerification()` | Public | Submit identity verification request |
| `verifyHuman(address)` | Owner | Approve a user's verification |
| `getPendingUsers()` | View | Get all pending verification addresses |
| `createCampaign(...)` | Verified | Launch a milestone-based campaign |
| `donate(campaignId)` | Public | Donate CELO to a campaign |
| `requestMilestoneRelease(...)` | Creator | Request milestone fund release (starts 3-day timelock) |
| `releaseMilestone(...)` | Creator | Release funds after timelock expires |
| `cancelCampaign(campaignId)` | Creator | Cancel campaign (blocked if milestone release pending) |
| `claimRefund(campaignId)` | Donor | Claim proportional refund from cancelled/expired campaigns |

### Security

- **ReentrancyGuard** on all fund transfers
- **Ownable2Step** for safe ownership transfer
- **Pausable** for emergency stops
- **CEI pattern** (Checks-Effects-Interactions)
- **3-day timelock** on milestone releases
- **Snapshot-based refunds** for fair proportional distribution
- **Cancel protection** when milestone release is pending

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/)
- [Foundry](https://getfoundry.sh/)

### Smart Contracts

```bash
cd contracts
forge build        # Compile
forge test         # Run tests
```

### Frontend

```bash
cd frontend
pnpm install       # Install dependencies
pnpm dev           # Start dev server at http://localhost:3000
```

### Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_PROOF_DONATE_ADDRESS=0x9c161Ec01be48E21904f4877e53b7F789fd23848
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt
NEXT_PUBLIC_PINATA_GATEWAY=your_gateway.mypinata.cloud
```

---

## Deploy Contract

```bash
cd contracts
cp .env.example .env
# Edit .env with your PRIVATE_KEY and RPC URLs

# Deploy to Celo Mainnet
source .env
forge script script/Deploy.s.sol:DeployProofDonate \
  --rpc-url $CELO_RPC_URL \
  --broadcast --verify

# Update frontend/.env.local with the new contract address
```

---

## How It Works

```
1. Creator → requestVerification()     → Admin approves on-chain
2. Creator → createCampaign(...)       → Campaign live with milestones
3. Donor   → donate(campaignId)        → CELO sent to contract
4. Creator → requestMilestoneRelease() → 3-day timelock starts
5. Creator → releaseMilestone()        → Funds released (minus platform fee)
6. Repeat steps 4-5 for each milestone
```

If a campaign is cancelled or expires before completion, donors can call `claimRefund()` to receive a proportional refund based on remaining funds.

---

## License

MIT
