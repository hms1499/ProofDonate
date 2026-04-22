import { USDM_FEE_CURRENCY, isMiniPay } from "./minipay";

export function feeCurrencyConfig(): { feeCurrency?: `0x${string}` } {
  return isMiniPay() ? { feeCurrency: USDM_FEE_CURRENCY } : {};
}
