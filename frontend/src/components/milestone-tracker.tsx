"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import {
  useMilestoneReleaseTime,
  useReleaseMilestone,
  useRequestMilestoneRelease,
} from "@/hooks/useProofDonate";
import { CheckCircle, Circle, Lock, Loader2 } from "lucide-react";
import type { Milestone } from "@/types";

interface MilestoneTrackerProps {
  milestones: Milestone[];
  campaignId: bigint;
  isCreator: boolean;
  currentAmount: bigint;
  onChange?: () => void;
}

function formatTimeRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

interface MilestoneRowProps {
  milestone: Milestone;
  index: number;
  isCurrentMilestone: boolean;
  campaignId: bigint;
  isCreator: boolean;
  currentAmount: bigint;
  onChange?: () => void;
  isLast: boolean;
}

function MilestoneRow({
  milestone,
  index,
  isCurrentMilestone,
  campaignId,
  isCreator,
  currentAmount,
  onChange,
  isLast,
}: MilestoneRowProps) {
  const { releaseMilestone, isPending, isConfirming, isSuccess } =
    useReleaseMilestone();
  const {
    requestMilestoneRelease,
    isPending: isRequestPending,
    isConfirming: isRequestConfirming,
    isSuccess: isRequestSuccess,
  } = useRequestMilestoneRelease();
  const { data: releaseTime, refetch: refetchReleaseTime } =
    useMilestoneReleaseTime(campaignId, BigInt(index));
  const [now, setNow] = useState(() => Date.now());

  const releaseTimestamp =
    typeof releaseTime === "bigint" && releaseTime > 0n
      ? Number(releaseTime) * 1000
      : 0;
  const hasRequestedRelease = releaseTimestamp > 0;
  const isTimelockReady = hasRequestedRelease && now >= releaseTimestamp;
  const isFunded = currentAmount >= milestone.amount;
  const isReleasable =
    isCreator &&
    isCurrentMilestone &&
    isFunded &&
    hasRequestedRelease &&
    isTimelockReady;
  const isRequestable =
    isCreator && isCurrentMilestone && isFunded && !hasRequestedRelease;
  const isLocked = !milestone.isReleased && !isCurrentMilestone;
  const isBusy =
    isPending || isConfirming || isRequestPending || isRequestConfirming;

  useEffect(() => {
    if (!hasRequestedRelease || milestone.isReleased) return;

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [hasRequestedRelease, milestone.isReleased]);

  useEffect(() => {
    if (!isRequestSuccess && !isSuccess) return;

    refetchReleaseTime();
    onChange?.();
  }, [isRequestSuccess, isSuccess, onChange, refetchReleaseTime]);

  const countdownLabel =
    hasRequestedRelease && !isTimelockReady
      ? formatTimeRemaining(releaseTimestamp - now)
      : null;

  return (
    <div className="relative flex gap-4">
      {!isLast && (
        <div className="absolute left-[13px] top-8 bottom-0 w-px bg-white/8" />
      )}

      <div className="relative z-10 shrink-0 mt-0.5">
        {milestone.isReleased ? (
          <div className="w-[26px] h-[26px] rounded-full bg-[#34D399]/15 flex items-center justify-center">
            <CheckCircle className="h-4 w-4 text-[#34D399]" />
          </div>
        ) : isReleasable ? (
          <div className="w-[26px] h-[26px] rounded-full bg-[#34D399]/12 border border-[#34D399]/30 flex items-center justify-center">
            <CheckCircle className="h-3.5 w-3.5 text-[#34D399]" />
          </div>
        ) : isRequestable ? (
          <div className="w-[26px] h-[26px] rounded-full bg-[#FBBF24]/10 border border-[#FBBF24]/30 flex items-center justify-center">
            <Circle className="h-3.5 w-3.5 text-[#FBBF24]" />
          </div>
        ) : (
          <div className="w-[26px] h-[26px] rounded-full bg-white/5 flex items-center justify-center">
            {isLocked ? (
              <Lock className="h-3 w-3 text-white/20" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-white/20" />
            )}
          </div>
        )}
      </div>

      <div
        className={`flex-1 min-w-0 pb-5 ${
          milestone.isReleased ? "" : isCurrentMilestone ? "" : "opacity-60"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white/90">
              {milestone.description}
            </p>
            {milestone.isReleased && (
              <span className="inline-block mt-1 text-[10px] font-mono text-[#34D399] uppercase tracking-widest">
                Released
              </span>
            )}
            {!milestone.isReleased && isRequestable && (
              <span className="inline-block mt-1 text-[10px] font-mono text-[#FBBF24] uppercase tracking-widest">
                Ready to request release
              </span>
            )}
            {!milestone.isReleased && hasRequestedRelease && !isTimelockReady && (
              <span className="inline-block mt-1 text-[10px] font-mono text-[#FBBF24] uppercase tracking-widest">
                Timelock live
              </span>
            )}
            {!milestone.isReleased && isReleasable && (
              <span className="inline-block mt-1 text-[10px] font-mono text-[#34D399] uppercase tracking-widest">
                Ready to release
              </span>
            )}
          </div>
          <span className="text-xs text-white/30 font-mono whitespace-nowrap mt-0.5">
            {Number(formatEther(milestone.amount)).toFixed(2)} cUSD
          </span>
        </div>

        {!milestone.isReleased && hasRequestedRelease && !isTimelockReady && (
          <p className="mt-2 text-xs text-white/35 font-mono">
            Unlocks in {countdownLabel} at{" "}
            {new Date(releaseTimestamp).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}

        {!milestone.isReleased && isCurrentMilestone && !isFunded && (
          <p className="mt-2 text-xs text-white/30 font-mono">
            Waiting for enough funds before the release request can start.
          </p>
        )}

        {isRequestable && (
          <button
            className="mt-3 inline-flex items-center gap-2 bg-[#FBBF24] text-black font-semibold px-5 py-2 rounded-full hover:bg-[#F59E0B] transition-colors text-xs disabled:opacity-40"
            onClick={() => requestMilestoneRelease(campaignId, BigInt(index))}
            disabled={isBusy}
          >
            {isBusy ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Starting...
              </>
            ) : (
              "Start Release Timelock"
            )}
          </button>
        )}

        {isReleasable && (
          <button
            className="mt-3 inline-flex items-center gap-2 bg-[#34D399] text-black font-semibold px-5 py-2 rounded-full hover:bg-[#10B981] transition-colors text-xs disabled:opacity-40"
            onClick={() => releaseMilestone(campaignId, BigInt(index))}
            disabled={isBusy}
          >
            {isBusy ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Releasing...
              </>
            ) : (
              "Release Funds"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function MilestoneTracker({
  milestones,
  campaignId,
  isCreator,
  currentAmount,
  onChange,
}: MilestoneTrackerProps) {
  const getNextReleasableIndex = () => {
    for (let i = 0; i < milestones.length; i++) {
      if (!milestones[i].isReleased) return i;
    }
    return -1;
  };

  const nextIndex = getNextReleasableIndex();

  return (
    <div className="space-y-1">
      {milestones.map((milestone, index) => {
        const isLast = index === milestones.length - 1;

        return (
          <MilestoneRow
            key={index}
            milestone={milestone}
            index={index}
            isCurrentMilestone={index === nextIndex}
            campaignId={campaignId}
            isCreator={isCreator}
            currentAmount={currentAmount}
            onChange={onChange}
            isLast={isLast}
          />
        );
      })}
    </div>
  );
}
