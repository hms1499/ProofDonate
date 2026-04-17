/**
 * Celo fee currency helpers.
 * Enables gas payment in cUSD for all wallets on Celo (not just MiniPay).
 */

import { CUSD_FEE_CURRENCY } from "./minipay";

/**
 * Returns a feeCurrency config object to spread into writeContract calls.
 * Always sets cUSD as fee currency so users don't need CELO for gas.
 *
 * Wallet compatibility:
 * - MiniPay, Valora, Coinbase Wallet: supported (CIP-64 tx type)
 * - MetaMask: may not support — user will see an error and need CELO
 */
export function feeCurrencyConfig(): { feeCurrency?: `0x${string}` } {
  return { feeCurrency: CUSD_FEE_CURRENCY };
}
