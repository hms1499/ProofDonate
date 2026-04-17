"use client";

import { RainbowKitProvider, connectorsForWallets } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { WagmiProvider, createConfig, createStorage, http, useAccount } from "wagmi";
import { celo } from "wagmi/chains";
import { ConnectButton } from "./connect-button";
import { useMiniPay } from "@/hooks/useMiniPay";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [injectedWallet],
    },
  ],
  {
    appName: "my-celo-app",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  }
);

const wagmiConfig = createConfig({
  chains: [celo],
  connectors,
  transports: {
    [celo.id]: http(),
  },
  storage: createStorage({
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    key: "wagmi",
  }),
  ssr: true,
});

const queryClient = new QueryClient();

function WalletProviderInner({ children }: { children: React.ReactNode }) {
  const { isConnected, chainId } = useAccount();
  const { isMiniPay: inMiniPay } = useMiniPay();

  // Auto add & switch to Celo Mainnet (skip in MiniPay — always on Celo)
  useEffect(() => {
    if (inMiniPay) return;
    if (!isConnected || chainId === celo.id || !window.ethereum) return;

    const switchToCelo = async () => {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${celo.id.toString(16)}` }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${celo.id.toString(16)}`,
                chainName: "Celo",
                nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
                rpcUrls: ["https://forno.celo.org"],
                blockExplorerUrls: ["https://celo.blockscout.com/"],
              },
            ],
          });
        }
      }
    };

    switchToCelo();
  }, [isConnected, chainId, inMiniPay]);

  return <>{children}</>;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={celo}>
          {mounted ? (
            <WalletProviderInner>{children}</WalletProviderInner>
          ) : (
            children
          )}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
