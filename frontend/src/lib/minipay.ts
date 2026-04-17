/**
 * MiniPay runtime detection and constants.
 * All components should import from here instead of checking window.ethereum directly.
 */

export const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as `0x${string}`;

// cUSD is 18 decimals — can be used directly as feeCurrency (no adapter needed)
export const CUSD_FEE_CURRENCY = CUSD_ADDRESS;

export const CELO_CHAIN_ID = 42220;

export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).ethereum?.isMiniPay;
}

export function isCeloChain(chainId: number | undefined): boolean {
  return chainId === CELO_CHAIN_ID;
}
