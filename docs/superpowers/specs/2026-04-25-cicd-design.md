# CI/CD Design — ProofDonate

**Date:** 2026-04-25  
**Status:** Approved

## Overview

Set up GitHub Actions CI/CD for ProofDonate. CI runs on every PR and push to `main`. CD deploys to Vercel production only after CI passes on `main`.

## Approach

GitHub Actions + Vercel CLI. CI and CD are separate workflows; deploy only triggers when both CI jobs pass. This guarantees no broken build ever reaches production.

## Workflow Structure

```
.github/
  workflows/
    ci.yml      # Runs on: push to main, pull_request to main
    deploy.yml  # Runs on: push to main (after ci.yml passes)
```

## ci.yml

Two jobs running in parallel:

**`frontend-ci`**
- Runner: `ubuntu-latest`
- Node: 20, pnpm via `pnpm/action-setup`
- Cache: pnpm store
- Steps: `pnpm install` → `pnpm lint` → `pnpm type-check` → `pnpm build`
- Env vars injected from GitHub Secrets: `NEXT_PUBLIC_PROOF_DONATE_ADDRESS`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_PINATA_JWT`, `NEXT_PUBLIC_PINATA_GATEWAY`

**`contracts-ci`**
- Runner: `ubuntu-latest`
- Foundry via `foundry-rs/foundry-toolchain@v1`
- Steps: `forge build` → `forge test -vvv`
- No secrets needed (tests run against local fork or unit tests only)

## deploy.yml

Single job `deploy`:
- Trigger: `push` to `main` only
- `needs`: references both `frontend-ci` and `contracts-ci` from `ci.yml` via `workflow_run` with `conclusion == success`
- Runner: `ubuntu-latest`
- Steps:
  1. Checkout code
  2. Setup Node 20
  3. `npm install -g vercel`
  4. `vercel pull --yes --environment=production --token=$VERCEL_TOKEN`
  5. `vercel build --prod --token=$VERCEL_TOKEN`
  6. `vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN`

## GitHub Secrets Required

| Secret | Description |
|---|---|
| `VERCEL_TOKEN` | Vercel personal access token |
| `VERCEL_ORG_ID` | `team_kWEyWwbChJhTjtMmk54nYlt8` |
| `VERCEL_PROJECT_ID` | `prj_qEMm6k9t3aJuGPZXocABgttmXFxl` |
| `NEXT_PUBLIC_PROOF_DONATE_ADDRESS` | Deployed contract address on Celo Mainnet |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project ID |
| `NEXT_PUBLIC_PINATA_JWT` | Pinata API JWT for IPFS uploads |
| `NEXT_PUBLIC_PINATA_GATEWAY` | Pinata IPFS gateway URL |

## Files to Create

1. `.github/workflows/ci.yml`
2. `.github/workflows/deploy.yml`

No existing files are modified. The `.vercel/` directory is already gitignored by Vercel CLI.

## Success Criteria

- PRs show CI status checks (frontend-ci, contracts-ci) before merge
- Merging to `main` triggers automatic Vercel production deploy
- A failing lint/test/build blocks the deploy
