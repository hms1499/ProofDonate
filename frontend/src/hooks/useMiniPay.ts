"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { isMiniPay } from "@/lib/minipay";

export function useMiniPay() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [inMiniPay, setInMiniPay] = useState(false);
  const attemptedAutoConnect = useRef(false);

  useEffect(() => {
    const detect = () => setInMiniPay(isMiniPay());
    detect();
    const intervalId = window.setInterval(detect, 250);
    const timeoutId = window.setTimeout(() => window.clearInterval(intervalId), 5000);
    window.addEventListener("ethereum#initialized", detect as EventListener);
    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
      window.removeEventListener("ethereum#initialized", detect as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!inMiniPay || isConnected || attemptedAutoConnect.current) return;
    const injectedConnector = connectors.find((c) => c.id === "injected");
    if (!injectedConnector) return;
    attemptedAutoConnect.current = true;
    connect({ connector: injectedConnector });
  }, [connect, connectors, inMiniPay, isConnected]);

  return {
    isMiniPay: inMiniPay,
    hideConnectWalletButton: inMiniPay,
  };
}
