"use client";

import { formatEther } from "viem";
import { useReleaseMilestone } from "@/hooks/useProofDonate";
import { CheckCircle, Circle, Lock, Loader2 } from "lucide-react";
import type { Milestone } from "@/types";

interface MilestoneTrackerProps {
  milestones: Milestone[];
  campaignId: bigint;
  isCreator: boolean;
  currentAmount: bigint;
}

export function MilestoneTracker({
  milestones,
  campaignId,
  isCreator,
  currentAmount,
}: MilestoneTrackerProps) {
  const { releaseMilestone, isPending, isConfirming } = useReleaseMilestone();

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
        const isReleasable =
          isCreator &&
          index === nextIndex &&
          currentAmount >= milestone.amount;
        const isLocked = index > nextIndex && nextIndex !== -1;
        const isLast = index === milestones.length - 1;

        return (
          <div key={index} className="relative flex gap-4">
            {/* Vertical line connector */}
            {!isLast && (
              <div className="absolute left-[13px] top-8 bottom-0 w-px bg-white/8" />
            )}

            {/* Icon */}
            <div className="relative z-10 shrink-0 mt-0.5">
              {milestone.isReleased ? (
                <div className="w-[26px] h-[26px] rounded-full bg-[#35D07F]/15 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-[#35D07F]" />
                </div>
              ) : isReleasable ? (
                <div className="w-[26px] h-[26px] rounded-full bg-[#FCFF52]/10 border border-[#FCFF52]/30 flex items-center justify-center">
                  <Circle className="h-3.5 w-3.5 text-[#FCFF52]" />
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

            {/* Content */}
            <div
              className={`flex-1 min-w-0 pb-5 ${
                milestone.isReleased ? "" : isReleasable ? "" : "opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white/90">
                    {milestone.description}
                  </p>
                  {milestone.isReleased && (
                    <span className="inline-block mt-1 text-[10px] font-mono text-[#35D07F] uppercase tracking-widest">
                      Released
                    </span>
                  )}
                  {isReleasable && (
                    <span className="inline-block mt-1 text-[10px] font-mono text-[#FCFF52] uppercase tracking-widest">
                      Ready to release
                    </span>
                  )}
                </div>
                <span className="text-xs text-white/30 font-mono whitespace-nowrap mt-0.5">
                  {Number(formatEther(milestone.amount)).toFixed(2)} CELO
                </span>
              </div>

              {isReleasable && (
                <button
                  className="mt-3 inline-flex items-center gap-2 bg-[#35D07F] text-black font-semibold px-5 py-2 rounded-full hover:bg-[#2bb86e] transition-colors text-xs disabled:opacity-40"
                  onClick={() =>
                    releaseMilestone(campaignId, BigInt(index))
                  }
                  disabled={isPending || isConfirming}
                >
                  {isPending || isConfirming ? (
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
      })}
    </div>
  );
}
