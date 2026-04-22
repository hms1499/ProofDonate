/**
 * MiniPay runtime detection and constants.
 * All components should import from here instead of checking window.ethereum directly.
 */

// USDm (Mento's rebrand of cUSD inside MiniPay) — the only feeCurrency MiniPay supports.
// Address is unchanged from the legacy cUSD token.
export const USDM_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as `0x${string}`;

// 18 decimals — usable directly as feeCurrency without an adapter
export const USDM_FEE_CURRENCY = USDM_ADDRESS;

export const CELO_CHAIN_ID = 42220;

export const MINIPAY_ADD_CASH_URL = "https://link.minipay.xyz/add_cash?tokens=USDM,USDT,USDC";

type MaybeMiniPayProvider = {
  isMiniPay?: boolean;
  providers?: Array<{ isMiniPay?: boolean }>;
};

export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  const provider = (window as Window & { ethereum?: MaybeMiniPayProvider }).ethereum;
  if (!provider) return false;
  if (provider.isMiniPay) return true;
  if (Array.isArray(provider.providers)) {
    return provider.providers.some((p: { isMiniPay?: boolean }) => Boolean(p?.isMiniPay));
  }
  return false;
}

export function isCeloChain(chainId: number | undefined): boolean {
  return chainId === CELO_CHAIN_ID;
}
