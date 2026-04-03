"use client";

import { RainbowKitProvider, connectorsForWallets } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { WagmiProvider, createConfig, createStorage, http, useAccount, useConnect } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { ConnectButton } from "./connect-button";

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
  chains: [celo, celoSepolia],
  connectors,
  transports: {
    [celo.id]: http(),
    [celoSepolia.id]: http(),
  },
  storage: createStorage({
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    key: "wagmi",
  }),
  ssr: true,
});

const queryClient = new QueryClient();

function WalletProviderInner({ children }: { children: React.ReactNode }) {
  const { connect, connectors } = useConnect();
  const { isConnected, chainId } = useAccount();

  useEffect(() => {
    // Check if the app is running inside MiniPay
    if (window.ethereum && window.ethereum.isMiniPay) {
      const injectedConnector = connectors.find((c) => c.id === "injected");
      if (injectedConnector) {
        connect({ connector: injectedConnector });
      }
    }
  }, [connect, connectors]);

  // Auto add & switch to Celo Sepolia via wallet provider directly
  useEffect(() => {
    if (!isConnected || chainId === celoSepolia.id || !window.ethereum) return;

    const switchToCeloSepolia = async () => {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${celoSepolia.id.toString(16)}` }],
        });
      } catch (switchError: any) {
        // Error code 4902 = chain not added yet
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${celoSepolia.id.toString(16)}`,
                chainName: "Celo Sepolia Testnet",
                nativeCurrency: { name: "CELO", symbol: "S-CELO", decimals: 18 },
                rpcUrls: ["https://forno.celo-sepolia.celo-testnet.org"],
                blockExplorerUrls: ["https://celo-sepolia.blockscout.com/"],
              },
            ],
          });
        }
      }
    };

    switchToCeloSepolia();
  }, [isConnected, chainId]);

  return <>{children}</>;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={celoSepolia}>
          <WalletProviderInner>{children}</WalletProviderInner>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
