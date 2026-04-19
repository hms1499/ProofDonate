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
