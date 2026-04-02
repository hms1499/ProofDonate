"use client";

import {
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { PROOF_DONATE_ABI, PROOF_DONATE_ADDRESS } from "@/lib/contracts";
import type { Campaign, Milestone, Donation } from "@/types";

const contractConfig = {
  address: PROOF_DONATE_ADDRESS,
  abi: PROOF_DONATE_ABI,
} as const;

export function useCampaignCount() {
  return useReadContract({
    ...contractConfig,
    functionName: "campaignCount",
  });
}

export function useCampaign(campaignId: bigint) {
  return useReadContract({
    ...contractConfig,
    functionName: "getCampaign",
    args: [campaignId],
  });
}

export function useMilestones(campaignId: bigint) {
  return useReadContract({
    ...contractConfig,
    functionName: "getMilestones",
    args: [campaignId],
  });
}

export function useDonations(campaignId: bigint) {
  return useReadContract({
    ...contractConfig,
    functionName: "getDonations",
    args: [campaignId],
  });
}

export function useDonationCount(campaignId: bigint) {
  return useReadContract({
    ...contractConfig,
    functionName: "getDonationCount",
    args: [campaignId],
  });
}

export function useCreatorCampaigns(creator: `0x${string}` | undefined) {
  return useReadContract({
    ...contractConfig,
    functionName: "getCreatorCampaigns",
    args: creator ? [creator] : undefined,
    query: { enabled: !!creator },
  });
}

export function useIsVerified(address: `0x${string}` | undefined) {
  return useReadContract({
    ...contractConfig,
    functionName: "verifiedHumans",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useAllCampaigns(count: bigint | undefined) {
  const contracts =
    count && count > 0n
      ? Array.from({ length: Number(count) }, (_, i) => ({
          ...contractConfig,
          functionName: "getCampaign" as const,
          args: [BigInt(i)] as const,
        }))
      : [];

  return useReadContracts({
    contracts,
    query: { enabled: !!count && count > 0n },
  });
}

export function useDonate() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const donate = (campaignId: bigint, amount: bigint) => {
    writeContract({
      ...contractConfig,
      functionName: "donate",
      args: [campaignId, amount],
    });
  };

  return { donate, isPending, isConfirming, isSuccess, hash, error };
}

export function useCreateCampaign() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const createCampaign = (
    title: string,
    description: string,
    targetAmount: bigint,
    milestoneDescriptions: string[],
    milestoneAmounts: bigint[],
    deadline: bigint
  ) => {
    writeContract({
      ...contractConfig,
      functionName: "createCampaign",
      args: [
        title,
        description,
        targetAmount,
        milestoneDescriptions,
        milestoneAmounts,
        deadline,
      ],
    });
  };

  return { createCampaign, isPending, isConfirming, isSuccess, hash, error };
}

export function useReleaseMilestone() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const releaseMilestone = (campaignId: bigint, milestoneIndex: bigint) => {
    writeContract({
      ...contractConfig,
      functionName: "releaseMilestone",
      args: [campaignId, milestoneIndex],
    });
  };

  return { releaseMilestone, isPending, isConfirming, isSuccess, hash, error };
}

export function useCancelCampaign() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const cancelCampaign = (campaignId: bigint) => {
    writeContract({
      ...contractConfig,
      functionName: "cancelCampaign",
      args: [campaignId],
    });
  };

  return { cancelCampaign, isPending, isConfirming, isSuccess, hash, error };
}

export function useRequestVerification() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const requestVerification = () => {
    writeContract({
      ...contractConfig,
      functionName: "requestVerification",
    });
  };

  return { requestVerification, isPending, isConfirming, isSuccess, hash, error };
}

export function useVerificationRequested(address: `0x${string}` | undefined) {
  return useReadContract({
    ...contractConfig,
    functionName: "verificationRequested",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useContractOwner() {
  const isValidAddress = PROOF_DONATE_ADDRESS !== "0x0000000000000000000000000000000000000000";
  return useReadContract({
    ...contractConfig,
    functionName: "owner",
    query: { enabled: isValidAddress },
  });
}

export function useVerifyHuman() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const verifyHuman = (userAddress: `0x${string}`) => {
    writeContract({
      ...contractConfig,
      functionName: "verifyHuman",
      args: [userAddress],
    });
  };

  return { verifyHuman, isPending, isConfirming, isSuccess, hash, error };
}
