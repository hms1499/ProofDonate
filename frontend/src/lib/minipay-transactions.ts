import { CUSD_FEE_CURRENCY, isMiniPay } from "./minipay";

export function feeCurrencyConfig(): { feeCurrency?: `0x${string}` } {
  return isMiniPay() ? { feeCurrency: CUSD_FEE_CURRENCY } : {};
}
