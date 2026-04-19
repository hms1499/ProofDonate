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

  // --- Task 5: Check on-chain state ---
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

  // --- Task 6: Send requestVerification() in parallel ---
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
      failed.forEach((r) => {
        console.error(`[ERROR] requestVerification failed:`, (r as PromiseRejectedResult).reason);
      });
    }

    const confirmed = requestResults.filter((r) => r.status === 'fulfilled').length;
    console.log(`[SUCCESS] ${confirmed}/${needsRequest.length} requestVerification txs confirmed`);
  }

  // --- Task 7: Owner verifyHuman() sequentially ---
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
}

main().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});
