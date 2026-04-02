"use client";

import { ConnectButton as RainbowKitConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

export function ConnectButton() {
  const [isMinipay, setIsMinipay] = useState(false);

  useEffect(() => {
    // @ts-ignore
    if (window.ethereum?.isMiniPay) setIsMinipay(true);
  }, []);

  if (isMinipay) return null;

  return (
    <RainbowKitConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!ready) return null;

        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              className="group inline-flex items-center gap-2 border border-white/15 text-white text-sm font-medium px-5 py-2 rounded-full hover:border-[#35D07F]/60 hover:bg-[#35D07F]/5 hover:text-[#35D07F] transition-all duration-200"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white/30 group-hover:bg-[#35D07F] transition-colors" />
              Connect Wallet
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button
              onClick={openChainModal}
              className="inline-flex items-center gap-2 border border-red-500/40 bg-red-500/10 text-red-400 text-sm font-medium px-5 py-2 rounded-full hover:bg-red-500/20 transition-all"
            >
              Wrong Network
            </button>
          );
        }

        return (
          <div className="flex items-center gap-2">
            {/* Chain pill */}
            <button
              onClick={openChainModal}
              className="hidden sm:inline-flex items-center gap-1.5 border border-white/10 bg-white/5 text-white/60 text-xs font-mono px-3 py-2 rounded-full hover:border-white/20 hover:text-white/80 transition-all"
            >
              {chain.hasIcon && chain.iconUrl && (
                <img src={chain.iconUrl} alt={chain.name} className="w-3.5 h-3.5 rounded-full" />
              )}
              {chain.name}
            </button>

            {/* Account pill */}
            <button
              onClick={openAccountModal}
              className="inline-flex items-center gap-2 border border-[#35D07F]/30 bg-[#35D07F]/8 text-white text-sm font-mono px-4 py-2 rounded-full hover:border-[#35D07F]/60 hover:bg-[#35D07F]/12 transition-all"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#35D07F] animate-pulse" />
              {account.displayName}
              <ChevronDown className="w-3 h-3 text-white/40" />
            </button>
          </div>
        );
      }}
    </RainbowKitConnectButton.Custom>
  );
}
