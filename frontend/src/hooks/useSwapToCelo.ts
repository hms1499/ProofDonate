/**
 * useSwapToCelo — Swap cUSD → CELO via Uniswap V3 on Celo mainnet
 *
 * This hook handles the full swap flow:
 * 1. Get a quote (how much CELO will I get for X cUSD?)
 * 2. Approve cUSD spending by SwapRouter
 * 3. Execute swap: cUSD → CELO (delivered to user's wallet)
 *
 * On Celo L2, CELO has "token duality" — native and ERC-20 balance are the same.
 * No wrapping/unwrapping needed. Simple exactInputSingle sends CELO ERC-20
 * directly to the user, which IS their native CELO balance.
 */

"use client";

import { useState, useEffect } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
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

// --- Step 1: Quote Hook ---
// Gets expected CELO output for a given cUSD input amount

export function useSwapQuote(amountIn: bigint) {
  const [quote, setQuote] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const publicClient = usePublicClient();

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
            tokenIn: CUSD_TOKEN_ADDRESS,
            tokenOut: CELO_TOKEN_ADDRESS,
            amountIn,
            fee: POOL_FEE,
            sqrtPriceLimitX96: 0n,
          },
        ],
      })
      .then((result) => {
        if (!cancelled) {
          setQuote(result.result[0]);
        }
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
  }, [amountIn, publicClient]);

  return { quote, isLoading };
}

// --- Step 2: Approval Hook ---
// Check and approve cUSD allowance for SwapRouter

export function useCUSDApproval(amount: bigint) {
  const { address } = useAccount();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CUSD_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, SWAP_ROUTER_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  const { data: balance } = useReadContract({
    address: CUSD_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const {
    writeContract: approve,
    data: approveHash,
    isPending: isApproving,
  } = useWriteContract();

  const { isLoading: isWaitingApproval, isSuccess: isApproved } =
    useWaitForTransactionReceipt({
      hash: approveHash,
      query: { enabled: !!approveHash },
    });

  useEffect(() => {
    if (isApproved) refetchAllowance();
  }, [isApproved, refetchAllowance]);

  const needsApproval =
    allowance !== undefined ? (allowance as bigint) < amount : true;

  const requestApproval = () => {
    approve({
      address: CUSD_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [SWAP_ROUTER_ADDRESS, amount],
    });
  };

  return {
    needsApproval,
    balance: balance as bigint | undefined,
    requestApproval,
    isApproving: isApproving || isWaitingApproval,
    isApproved,
  };
}

// --- Step 3: Swap Execution Hook ---
// Execute the actual swap: cUSD → CELO via simple exactInputSingle

export function useSwapExecution() {
  const { address } = useAccount();

  const {
    writeContract,
    data: swapHash,
    isPending: isSwapping,
    error: swapError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isSwapSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash: swapHash,
    query: { enabled: !!swapHash },
  });

  /**
   * Execute swap: cUSD → CELO via exactInputSingle.
   *
   * On Celo L2, CELO has token duality — the ERC-20 transfer IS a native
   * balance transfer. No multicall/unwrapWETH9 needed.
   */
  const executeSwap = (amountIn: bigint, minAmountOut: bigint) => {
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
  };

  return {
    executeSwap,
    isSwapping: isSwapping || isConfirming,
    isSwapSuccess,
    swapError,
    receipt,
  };
}
