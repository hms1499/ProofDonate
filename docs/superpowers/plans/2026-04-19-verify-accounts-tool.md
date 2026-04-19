# Verify Accounts Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone TypeScript CLI tool that derives N accounts from a mnemonic, has each call `requestVerification()` in parallel, then the owner batch-calls `verifyHuman()` sequentially on the ProofDonateV2 contract on Celo mainnet.

**Architecture:** Single entry-point file `tools/verify-accounts.ts` with no sub-modules. Parse CLI args → check on-chain state → send parallel requestVerification txs → owner sequentially verifyHuman each account. Uses viem for all blockchain interactions.

**Tech Stack:** TypeScript, viem, @viem/accounts, dotenv, ts-node

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `tools/package.json` | Create | Dependencies and ts-node run script |
| `tools/tsconfig.json` | Create | TypeScript compiler config |
| `tools/.env` | Create | PRIVATE_KEY and CELO_RPC_URL |
| `tools/verify-accounts.ts` | Create | Full CLI tool logic |

---

### Task 1: Scaffold the `tools/` project

**Files:**
- Create: `tools/package.json`
- Create: `tools/tsconfig.json`
- Create: `tools/.env`

- [ ] **Step 1: Create `tools/package.json`**

```json
{
  "name": "proof-donate-tools",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "verify": "ts-node verify-accounts.ts"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "viem": "^2.21.19"
  },
  "devDependencies": {
    "ts-node": "^10.9.2",
    "typescript": "^5.4.5",
    "@types/node": "^20.12.7"
  }
}
```

- [ ] **Step 2: Create `tools/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "outDir": "dist"
  },
  "include": ["*.ts"]
}
```

- [ ] **Step 3: Create `tools/.env`**

```env
PRIVATE_KEY=0x<owner_private_key>
CELO_RPC_URL=https://forno.celo.org
```

(Copy PRIVATE_KEY from `contracts/.env`)

- [ ] **Step 4: Install dependencies**

```bash
cd tools && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 5: Commit scaffold**

```bash
git add tools/package.json tools/tsconfig.json tools/.gitignore
git commit -m "feat(tools): scaffold verify-accounts project"
```

Note: Do NOT commit `.env`.

---

### Task 2: Create `tools/.gitignore`

**Files:**
- Create: `tools/.gitignore`

- [ ] **Step 1: Create `.gitignore`**

```
node_modules/
dist/
.env
```

- [ ] **Step 2: Commit**

```bash
git add tools/.gitignore
git commit -m "chore(tools): add gitignore"
```

---

### Task 3: Implement CLI arg parsing and env loading

**Files:**
- Create: `tools/verify-accounts.ts`

- [ ] **Step 1: Create `tools/verify-accounts.ts` with arg parsing and env validation**

```typescript
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '.env') });

function parseArgs(): { mnemonic: string; count: number } {
  const args = process.argv.slice(2);
  const mnemonicIdx = args.indexOf('--mnemonic');
  const countIdx = args.indexOf('--count');

  if (mnemonicIdx === -1 || !args[mnemonicIdx + 1]) {
    console.error('[ERROR] --mnemonic is required');
    process.exit(1);
  }
  if (countIdx === -1 || !args[countIdx + 1]) {
    console.error('[ERROR] --count is required');
    process.exit(1);
  }

  const mnemonic = args[mnemonicIdx + 1];
  const count = parseInt(args[countIdx + 1], 10);

  if (isNaN(count) || count < 1) {
    console.error('[ERROR] --count must be a positive integer');
    process.exit(1);
  }

  return { mnemonic, count };
}

function loadEnv(): { privateKey: `0x${string}`; rpcUrl: string } {
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.CELO_RPC_URL;

  if (!privateKey) {
    console.error('[ERROR] PRIVATE_KEY not set in .env');
    process.exit(1);
  }
  if (!rpcUrl) {
    console.error('[ERROR] CELO_RPC_URL not set in .env');
    process.exit(1);
  }

  return { privateKey: privateKey as `0x${string}`, rpcUrl };
}

async function main() {
  const { mnemonic, count } = parseArgs();
  const { privateKey, rpcUrl } = loadEnv();
  console.log(`[INFO] Args OK — count=${count}, rpcUrl=${rpcUrl}`);
}

main().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});
```

- [ ] **Step 2: Run to verify arg parsing works**

```bash
cd tools && npx ts-node verify-accounts.ts --mnemonic "test test test test test test test test test test test junk" --count 3
```

Expected output:
```
[INFO] Args OK — count=3, rpcUrl=https://forno.celo.org
```

- [ ] **Step 3: Commit**

```bash
git add tools/verify-accounts.ts
git commit -m "feat(tools): add CLI arg parsing and env loading"
```

---

### Task 4: Add viem client and HD account derivation

**Files:**
- Modify: `tools/verify-accounts.ts`

- [ ] **Step 1: Add viem imports and derive accounts**

Replace the contents of `tools/verify-accounts.ts` with:

```typescript
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createPublicClient, createWalletClient, http } from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';

dotenv.config({ path: resolve(__dirname, '.env') });

const CONTRACT_ADDRESS = '0x01d425f2d51178ff79c917bf5a4bc697798bc044' as const;

const CONTRACT_ABI = [
  {
    name: 'requestVerification',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'verifyHuman',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [],
  },
  {
    name: 'verifiedHumans',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'verificationRequested',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
] as const;

function parseArgs(): { mnemonic: string; count: number } {
  const args = process.argv.slice(2);
  const mnemonicIdx = args.indexOf('--mnemonic');
  const countIdx = args.indexOf('--count');

  if (mnemonicIdx === -1 || !args[mnemonicIdx + 1]) {
    console.error('[ERROR] --mnemonic is required');
    process.exit(1);
  }
  if (countIdx === -1 || !args[countIdx + 1]) {
    console.error('[ERROR] --count is required');
    process.exit(1);
  }

  const mnemonic = args[mnemonicIdx + 1];
  const count = parseInt(args[countIdx + 1], 10);

  if (isNaN(count) || count < 1) {
    console.error('[ERROR] --count must be a positive integer');
    process.exit(1);
  }

  return { mnemonic, count };
}

function loadEnv(): { privateKey: `0x${string}`; rpcUrl: string } {
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.CELO_RPC_URL;

  if (!privateKey) {
    console.error('[ERROR] PRIVATE_KEY not set in .env');
    process.exit(1);
  }
  if (!rpcUrl) {
    console.error('[ERROR] CELO_RPC_URL not set in .env');
    process.exit(1);
  }

  return { privateKey: privateKey as `0x${string}`, rpcUrl };
}

async function main() {
  const { mnemonic, count } = parseArgs();
  const { privateKey, rpcUrl } = loadEnv();

  const publicClient = createPublicClient({
    chain: celo,
    transport: http(rpcUrl),
  });

  const ownerAccount = privateKeyToAccount(privateKey);

  console.log(`[INFO] Deriving ${count} accounts from mnemonic...`);
  const accounts = Array.from({ length: count }, (_, i) =>
    mnemonicToAccount(mnemonic, { addressIndex: i })
  );

  accounts.forEach((acc, i) => {
    console.log(`[INFO] Account ${i}: ${acc.address}`);
  });

  console.log(`[INFO] Owner: ${ownerAccount.address}`);
}

main().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});
```

- [ ] **Step 2: Run to verify derivation works**

```bash
cd tools && npx ts-node verify-accounts.ts --mnemonic "test test test test test test test test test test test junk" --count 3
```

Expected output (addresses will be deterministic for this mnemonic):
```
[INFO] Deriving 3 accounts from mnemonic...
[INFO] Account 0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
[INFO] Account 1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
[INFO] Account 2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
[INFO] Owner: 0x<your-owner-address>
```

- [ ] **Step 3: Commit**

```bash
git add tools/verify-accounts.ts
git commit -m "feat(tools): add viem client and HD account derivation"
```

---

### Task 5: Check on-chain state for each account

**Files:**
- Modify: `tools/verify-accounts.ts`

- [ ] **Step 1: Add state-checking logic after account derivation in `main()`**

Replace the `accounts.forEach(...)` and `console.log owner` block with:

```typescript
  type AccountStatus = {
    address: `0x${string}`;
    index: number;
    account: ReturnType<typeof mnemonicToAccount>;
    isVerified: boolean;
    hasRequested: boolean;
  };

  console.log(`[INFO] Checking on-chain state for ${count} accounts...`);

  const statuses: AccountStatus[] = await Promise.all(
    accounts.map(async (account, i) => {
      const [isVerified, hasRequested] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'verifiedHumans',
          args: [account.address],
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'verificationRequested',
          args: [account.address],
        }),
      ]);

      return {
        address: account.address,
        index: i,
        account,
        isVerified: isVerified as boolean,
        hasRequested: hasRequested as boolean,
      };
    })
  );

  statuses.forEach(({ index, address, isVerified, hasRequested }) => {
    if (isVerified) {
      console.log(`[SKIP] Account ${index}: ${address} → already verified`);
    } else if (hasRequested) {
      console.log(`[INFO] Account ${index}: ${address} → already requested, will verify`);
    } else {
      console.log(`[INFO] Account ${index}: ${address} → needs requestVerification`);
    }
  });
```

- [ ] **Step 2: Run and confirm state reads work (no crash)**

```bash
cd tools && npx ts-node verify-accounts.ts --mnemonic "test test test test test test test test test test test junk" --count 3
```

Expected: reads from Celo mainnet, logs status for each account. No RPC errors.

- [ ] **Step 3: Commit**

```bash
git add tools/verify-accounts.ts
git commit -m "feat(tools): check on-chain verification state per account"
```

---

### Task 6: Send `requestVerification()` in parallel

**Files:**
- Modify: `tools/verify-accounts.ts`

- [ ] **Step 1: Add parallel requestVerification after state check in `main()`**

```typescript
  const needsRequest = statuses.filter((s) => !s.isVerified && !s.hasRequested);

  if (needsRequest.length === 0) {
    console.log('[INFO] No accounts need requestVerification');
  } else {
    console.log(`[INFO] Sending requestVerification() for ${needsRequest.length} accounts in parallel...`);

    const requestResults = await Promise.allSettled(
      needsRequest.map(async ({ account, address, index }) => {
        const walletClient = createWalletClient({
          account,
          chain: celo,
          transport: http(rpcUrl),
        });

        const hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'requestVerification',
          args: [],
        });

        console.log(`[INFO] Account ${index}: ${address} → requestVerification tx: ${hash}`);

        await publicClient.waitForTransactionReceipt({ hash });
        console.log(`[SUCCESS] Account ${index}: ${address} → requestVerification confirmed`);

        return address;
      })
    );

    const failed = requestResults.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      failed.forEach((r, i) => {
        console.error(`[ERROR] requestVerification failed for account ${i}:`, (r as PromiseRejectedResult).reason);
      });
    }

    const confirmed = requestResults.filter((r) => r.status === 'fulfilled').length;
    console.log(`[SUCCESS] ${confirmed}/${needsRequest.length} requestVerification txs confirmed`);
  }
```

- [ ] **Step 2: Commit**

```bash
git add tools/verify-accounts.ts
git commit -m "feat(tools): send parallel requestVerification txs"
```

---

### Task 7: Owner calls `verifyHuman()` sequentially

**Files:**
- Modify: `tools/verify-accounts.ts`

- [ ] **Step 1: Add sequential verifyHuman after requestVerification block in `main()`**

```typescript
  const toVerify = statuses.filter((s) => !s.isVerified);

  if (toVerify.length === 0) {
    console.log('[INFO] No accounts to verify');
  } else {
    console.log(`[INFO] Owner verifying ${toVerify.length} accounts sequentially...`);

    const ownerWalletClient = createWalletClient({
      account: ownerAccount,
      chain: celo,
      transport: http(rpcUrl),
    });

    let verifiedCount = 0;
    let errorCount = 0;

    for (const { address, index } of toVerify) {
      try {
        const hash = await ownerWalletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'verifyHuman',
          args: [address],
        });

        await publicClient.waitForTransactionReceipt({ hash });
        console.log(`[INFO] verifyHuman(${address}) → tx: ${hash} ✓`);
        verifiedCount++;
      } catch (err) {
        console.error(`[ERROR] verifyHuman failed for Account ${index} (${address}):`, err);
        errorCount++;
      }
    }

    const skipped = statuses.filter((s) => s.isVerified).length;
    console.log(`[DONE] ${verifiedCount}/${count} accounts verified (${skipped} skipped, ${errorCount} errors)`);
  }
```

- [ ] **Step 2: Commit**

```bash
git add tools/verify-accounts.ts
git commit -m "feat(tools): owner verifyHuman sequentially for all accounts"
```

---

### Task 8: End-to-end smoke test

**Files:**
- No file changes — manual verification only

- [ ] **Step 1: Run full flow with a real mnemonic and count=1**

```bash
cd tools && npx ts-node verify-accounts.ts \
  --mnemonic "<your 12-word mnemonic>" \
  --count 1
```

Expected full output:
```
[INFO] Deriving 1 accounts from mnemonic...
[INFO] Checking on-chain state for 1 accounts...
[INFO] Account 0: 0x... → needs requestVerification
[INFO] Sending requestVerification() for 1 accounts in parallel...
[INFO] Account 0: 0x... → requestVerification tx: 0x...
[SUCCESS] Account 0: 0x... → requestVerification confirmed
[SUCCESS] 1/1 requestVerification txs confirmed
[INFO] Owner verifying 1 accounts sequentially...
[INFO] verifyHuman(0x...) → tx: 0x... ✓
[DONE] 1/1 accounts verified (0 skipped, 0 errors)
```

- [ ] **Step 2: Run again with same args to verify idempotency**

```bash
cd tools && npx ts-node verify-accounts.ts \
  --mnemonic "<your 12-word mnemonic>" \
  --count 1
```

Expected:
```
[INFO] Deriving 1 accounts from mnemonic...
[INFO] Checking on-chain state for 1 accounts...
[SKIP] Account 0: 0x... → already verified
[INFO] No accounts need requestVerification
[INFO] No accounts to verify
[DONE] 0/1 accounts verified (1 skipped, 0 errors)
```

- [ ] **Step 3: Final commit**

```bash
git add tools/
git commit -m "feat(tools): complete verify-accounts CLI tool"
```
