/**
 * MiniPay-aware transaction helpers.
 * Wraps wagmi writeContract to attach feeCurrency when inside MiniPay.
 */

import { isMiniPay, CUSD_FEE_CURRENCY } from "./minipay";

/**
 * Adds feeCurrency to a writeContract config when inside MiniPay.
 * Outside MiniPay, returns the config unchanged.
 */
/**
 * Returns a feeCurrency config object to spread into writeContract calls.
 * Inside MiniPay: { feeCurrency: CUSD_ADDRESS }
 * Outside MiniPay: {}
 */
export function feeCurrencyConfig(): { feeCurrency?: `0x${string}` } {
  if (!isMiniPay()) return {};
  return { feeCurrency: CUSD_FEE_CURRENCY };
}
