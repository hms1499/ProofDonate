/**
 * Uniswap V3 Swap utilities for Celo mainnet
 *
 * Flow: cUSD → CELO via Uniswap V3 SwapRouter02
 *
 * Why Uniswap V3?
 * - Most liquid DEX on Celo for cUSD/CELO pair
 * - Standard interface, well-documented
 * - SwapRouter02 with simple exactInputSingle (no wrap/unwrap on Celo L2)
 *
 * Addresses from: https://docs.uniswap.org/contracts/v3/reference/deployments/celo-deployments
 */

// --- Contract addresses on Celo mainnet (chain 42220) ---

// Uniswap V3 SwapRouter02 — handles token swaps
export const SWAP_ROUTER_ADDRESS =
  "0x5615CDAb10dc425a742d643d949a7F474C01abc4" as `0x${string}`;

// Uniswap V3 QuoterV2 — get swap quotes without executing
export const QUOTER_V2_ADDRESS =
  "0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8" as `0x${string}`;

// CELO token — on Celo L2, native CELO has "token duality" (same balance as ERC-20)
// No wrapping/unwrapping needed — approve + transferFrom works on native balance
export const CELO_TOKEN_ADDRESS =
  "0x471EcE3750Da237f93B8E339c536989b8978a438" as `0x${string}`;

// cUSD stablecoin on Celo
export const CUSD_TOKEN_ADDRESS =
  "0x765DE816845861e75A25fCA122bb6898B8B1282a" as `0x${string}`;

// Pool fee tier: 0.01% = 100 basis points (most liquid CELO/cUSD pool on Celo)
export const POOL_FEE = 100;

// Slippage tolerance: 1% — protects against price movement during tx
export const SLIPPAGE_BPS = 100;

// --- ABIs (only the functions we need) ---

/**
 * SwapRouter02 ABI
 * - exactInputSingle: swap exact amount of tokenIn for tokenOut
 *
 * On Celo L2, CELO has "token duality" — no wrapETH/unwrapWETH9 needed.
 * Both directions use simple exactInputSingle with ERC-20 approve.
 */
export const SWAP_ROUTER_ABI = [
  {
    name: "exactInputSingle",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
] as const;

/**
 * QuoterV2 ABI
 * - quoteExactInputSingle: simulate a swap to get expected output amount
 *   Note: This is NOT a view function internally, but can be called via eth_call
 */
export const QUOTER_V2_ABI = [
  {
    name: "quoteExactInputSingle",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

/**
 * ERC20 ABI — for approve + allowance checks
 */
export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/**
 * Calculate minimum output amount with slippage protection
 * e.g. quoted 100 CELO with 1% slippage → minimum 99 CELO
 */
export function applySlippage(amount: bigint, slippageBps: number = SLIPPAGE_BPS): bigint {
  return (amount * BigInt(10000 - slippageBps)) / 10000n;
}
