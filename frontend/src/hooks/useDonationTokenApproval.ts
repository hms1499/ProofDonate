"use client";

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { USDM_ADDRESS } from "@/lib/minipay";
import { ERC20_ABI } from "@/lib/constants";
import { PROOF_DONATE_ADDRESS } from "@/lib/contracts";
import { feeCurrencyConfig } from "@/lib/minipay-transactions";

export function useDonationTokenApproval(amount: bigint) {
  const { address } = useAccount();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDM_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, PROOF_DONATE_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  const { data: balance } = useReadContract({
    address: USDM_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const {
    writeContract,
    data: hash,
    isPending: isApproving,
    error,
  } = useWriteContract();

  const { isLoading: isWaitingApproval, isSuccess: isApproved } =
    useWaitForTransactionReceipt({
      hash,
      query: { enabled: !!hash },
    });

  const needsApproval = allowance !== undefined ? (allowance as bigint) < amount : true;

  const approve = () => {
    writeContract({
      address: USDM_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [PROOF_DONATE_ADDRESS, amount],
      ...feeCurrencyConfig(),
    });
  };

  return {
    needsApproval,
    allowance,
    balance: balance as bigint | undefined,
    approve,
    isApproving: isApproving || isWaitingApproval,
    isApproved,
    refetchAllowance,
    error,
  };
}
