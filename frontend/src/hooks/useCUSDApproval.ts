"use client";

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { CUSD_ADDRESS, ERC20_ABI } from "@/lib/constants";

export function useCUSDApproval(
  spender: `0x${string}`,
  amount: bigint
) {
  const { address } = useAccount();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, spender] : undefined,
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
      query: {
        enabled: !!hash,
      },
    });

  const needsApproval = allowance !== undefined ? allowance < amount : true;

  const approve = () => {
    writeContract({
      address: CUSD_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, amount],
    });
  };

  return {
    needsApproval,
    allowance,
    approve,
    isApproving,
    isWaitingApproval,
    isApproved,
    refetchAllowance,
    error,
  };
}
