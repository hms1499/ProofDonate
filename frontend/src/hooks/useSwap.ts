/**
 * useSwap — Bidirectional swap between CELO ↔ cUSD via Uniswap V3
 *
 * On Celo L2, CELO has "token duality" — native CELO and ERC-20 CELO share
 * the same balance. No wrapping/unwrapping needed. Both directions use simple
 * ERC-20 approve + exactInputSingle.
 *
 * CELO → cUSD: approve CELO ERC-20 → exactInputSingle
 * cUSD → CELO: approve cUSD ERC-20 → exactInputSingle
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import {
  SWAP_ROUTER_ADDRESS,
  QUOTER_V2_ADDRESS,
  CELO_TOKEN_ADDRESS,
  CUSD_TOKEN_ADDRESS,
  POOL_FEE,
  SWAP_ROUTER_ABI,
  QUOTER_V2_ABI,
  ERC20_ABI,
} from "@/lib/swap";

export type SwapDirection = "CELO_TO_CUSD" | "CUSD_TO_CELO";

// --- Quote Hook ---

export function useSwapQuote(direction: SwapDirection, amountIn: bigint) {
  const [quote, setQuote] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const publicClient = usePublicClient();

  const tokenIn =
    direction === "CUSD_TO_CELO" ? CUSD_TOKEN_ADDRESS : CELO_TOKEN_ADDRESS;
  const tokenOut =
    direction === "CUSD_TO_CELO" ? CELO_TOKEN_ADDRESS : CUSD_TOKEN_ADDRESS;

  useEffect(() => {
    if (amountIn <= 0n || !publicClient) {
      setQuote(0n);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    publicClient
      .simulateContract({
        address: QUOTER_V2_ADDRESS,
        abi: QUOTER_V2_ABI,
        functionName: "quoteExactInputSingle",
        args: [
          {
            tokenIn,
            tokenOut,
            amountIn,
            fee: POOL_FEE,
            sqrtPriceLimitX96: 0n,
          },
        ],
      })
      .then((result) => {
        if (!cancelled) setQuote(result.result[0]);
      })
      .catch(() => {
        if (!cancelled) setQuote(0n);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [amountIn, tokenIn, tokenOut, publicClient]);

  return { quote, isLoading };
}

// --- Main Swap Hook ---

export function useSwap() {
  const { address } = useAccount();

  // Balances
  const { data: celoBalance, refetch: refetchCelo } = useBalance({ address });
  const { data: cusdBalanceRaw, refetch: refetchCusd } = useReadContract({
    address: CUSD_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const cusdBalance = cusdBalanceRaw as bigint | undefined;

  // cUSD allowance for SwapRouter
  const { data: cusdAllowanceRaw, refetch: refetchCusdAllowance } =
    useReadContract({
      address: CUSD_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: address ? [address, SWAP_ROUTER_ADDRESS] : undefined,
      query: { enabled: !!address },
    });
  const cusdAllowance = cusdAllowanceRaw as bigint | undefined;

  // CELO ERC-20 allowance for SwapRouter (needed for CELO → cUSD on Celo L2)
  const { data: celoAllowanceRaw, refetch: refetchCeloAllowance } =
    useReadContract({
      address: CELO_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: address ? [address, SWAP_ROUTER_ADDRESS] : undefined,
      query: { enabled: !!address },
    });
  const celoAllowance = celoAllowanceRaw as bigint | undefined;

  // Write contract (shared for approve + swap)
  const {
    writeContract,
    data: txHash,
    isPending,
    error,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  // Refetch balances after successful tx
  useEffect(() => {
    if (isSuccess) {
      refetchCelo();
      refetchCusd();
      refetchCusdAllowance();
      refetchCeloAllowance();
    }
  }, [isSuccess, refetchCelo, refetchCusd, refetchCusdAllowance, refetchCeloAllowance]);

  // --- Approve cUSD ---
  const approveCUSD = useCallback(
    (amount: bigint) => {
      writeContract({
        address: CUSD_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [SWAP_ROUTER_ADDRESS, amount],
      });
    },
    [writeContract]
  );

  // --- Approve CELO ERC-20 ---
  const approveCELO = useCallback(
    (amount: bigint) => {
      writeContract({
        address: CELO_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [SWAP_ROUTER_ADDRESS, amount],
      });
    },
    [writeContract]
  );

  // --- Swap cUSD → CELO ---
  // Simple exactInputSingle — CELO ERC-20 goes directly to user (token duality)
  const swapCUSDtoCELO = useCallback(
    (amountIn: bigint, minAmountOut: bigint) => {
      if (!address) return;

      writeContract({
        address: SWAP_ROUTER_ADDRESS,
        abi: SWAP_ROUTER_ABI,
        functionName: "exactInputSingle",
        args: [
          {
            tokenIn: CUSD_TOKEN_ADDRESS,
            tokenOut: CELO_TOKEN_ADDRESS,
            fee: POOL_FEE,
            recipient: address,
            amountIn,
            amountOutMinimum: minAmountOut,
            sqrtPriceLimitX96: 0n,
          },
        ],
      });
    },
    [address, writeContract]
  );

  // --- Swap CELO → cUSD ---
  // Simple exactInputSingle — CELO ERC-20 approve handles native balance (token duality)
  const swapCELOtoCUSD = useCallback(
    (amountIn: bigint, minAmountOut: bigint) => {
      if (!address) return;

      writeContract({
        address: SWAP_ROUTER_ADDRESS,
        abi: SWAP_ROUTER_ABI,
        functionName: "exactInputSingle",
        args: [
          {
            tokenIn: CELO_TOKEN_ADDRESS,
            tokenOut: CUSD_TOKEN_ADDRESS,
            fee: POOL_FEE,
            recipient: address,
            amountIn,
            amountOutMinimum: minAmountOut,
            sqrtPriceLimitX96: 0n,
          },
        ],
      });
    },
    [address, writeContract]
  );

  // Check if approval is needed for a given direction and amount
  const needsApproval = (direction: SwapDirection, amount: bigint) => {
    if (direction === "CUSD_TO_CELO") {
      return cusdAllowance !== undefined ? cusdAllowance < amount : true;
    }
    // CELO → cUSD: need CELO ERC-20 approval
    return celoAllowance !== undefined ? celoAllowance < amount : true;
  };

  return {
    // Balances
    celoBalance: celoBalance
      ? { value: celoBalance.value, formatted: celoBalance.formatted }
      : undefined,
    cusdBalance,

    // Allowance & approve
    needsApproval,
    approveCUSD,
    approveCELO,

    // Swap functions
    swapCUSDtoCELO,
    swapCELOtoCUSD,

    // Transaction state
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
    txHash,
  };
}
