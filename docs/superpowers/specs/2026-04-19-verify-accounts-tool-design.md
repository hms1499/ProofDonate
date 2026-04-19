# Verify Accounts Tool — Design Spec

**Date:** 2026-04-19  
**Status:** Approved

## Overview

A standalone TypeScript CLI tool that automates the full human verification flow on the `ProofDonateV2` contract on Celo mainnet: derive accounts from a mnemonic, have each request verification, then the owner batch-verifies all of them.

## Goals

- Derive N accounts from a mnemonic via HD wallet path
- Each account calls `requestVerification()` in parallel
- Owner calls `verifyHuman(address)` for each account sequentially
- Handle re-runs gracefully (skip already-verified or already-requested accounts)

## Location

```
tools/
  verify-accounts.ts    # standalone entry point
  package.json
  tsconfig.json
  .env                  # contains PRIVATE_KEY (owner) and CELO_RPC_URL
```

## CLI Usage

```bash
npx ts-node verify-accounts.ts --mnemonic "word1 word2 ..." --count 10
```

| Argument     | Required | Description                          |
|--------------|----------|--------------------------------------|
| `--mnemonic` | yes      | BIP-39 seed phrase for HD derivation |
| `--count`    | yes      | Number of accounts to derive         |

## Dependencies

- `viem` — contract calls, tx signing
- `@viem/accounts` — HD wallet derivation (`mnemonicToAccount`)
- `dotenv` — load PRIVATE_KEY and CELO_RPC_URL from `.env`
- `ts-node`, `typescript` — run TypeScript directly

## HD Derivation Path

`m/44'/60'/0'/0/{i}` for i = 0 to count-1 (standard Ethereum/Celo path)

## Flow

```
1. Parse --mnemonic and --count from CLI args
2. Load PRIVATE_KEY (owner) and CELO_RPC_URL from .env
3. Derive N accounts from mnemonic
4. For each account, read contract state:
   - verifiedHumans(address) == true  → mark as "already verified", skip entirely
   - verificationRequested(address) == true → mark as "already requested", skip step 5
5. Send requestVerification() in parallel (Promise.all) for eligible accounts
6. Wait for all txs to confirm
7. Owner calls verifyHuman(address) sequentially for all accounts not already verified
   (sequential to avoid nonce conflicts on owner wallet)
8. Log summary
```

## Contract Interface (ProofDonateV2)

- Address: `0x01d425f2d51178ff79c917bf5a4bc697798bc044`
- Chain: Celo mainnet (chainId 42220)
- `requestVerification()` — called by each derived account
- `verifyHuman(address)` — called by owner, `onlyOwner`
- `verifiedHumans(address) returns (bool)` — read state
- `verificationRequested(address) returns (bool)` — read state

## Error Handling

| Scenario | Behavior |
|---|---|
| Account already verified | Skip entirely, log `[SKIP]` |
| Account already requested | Skip requestVerification, still call verifyHuman |
| requestVerification tx fails | Log `[ERROR]`, continue with other accounts |
| verifyHuman tx fails | Log `[ERROR]`, continue with remaining accounts |
| Invalid mnemonic | Exit immediately with error message |
| Missing .env vars | Exit immediately with error message |

## Output Format

```
[INFO] Deriving 10 accounts from mnemonic...
[INFO] Account 0: 0xAbc... → already verified, skipping
[INFO] Account 1: 0xDef... → sending requestVerification...
[INFO] Account 2: 0x123... → sending requestVerification...
...
[SUCCESS] 8 requestVerification txs confirmed
[INFO] Owner verifying accounts...
[INFO] verifyHuman(0xDef...) → tx: 0x111... ✓
[INFO] verifyHuman(0x123...) → tx: 0x222... ✓
...
[DONE] 8/10 accounts verified (2 skipped)
```

## Out of Scope

- Funding derived accounts with CELO for gas (assumed pre-funded)
- Multi-chain support
- Database/persistence of results
