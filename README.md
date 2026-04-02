# ProofDonate

Transparent donation platform on Celo blockchain with milestone-based fund release and verified creators.

## Project Structure

```
contracts/   - Smart contracts (Foundry)
frontend/    - Web application (Next.js)
```

## Quick Start

### Contracts

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

## Deploy Contract

```bash
cd contracts
cp .env.example .env
# Edit .env with your private key

# Deploy to Celo Sepolia testnet
forge script script/Deploy.s.sol --rpc-url $CELO_SEPOLIA_RPC_URL --broadcast

# After deploy, update frontend/src/lib/contracts.ts with the contract address
```

## Tech Stack

- **Contracts**: Solidity, Foundry, OpenZeppelin
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Wallet**: RainbowKit, wagmi, viem
- **Blockchain**: Celo (cUSD stablecoin)
