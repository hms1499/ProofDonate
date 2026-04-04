"use client";

import { formatEther } from "viem";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-3">
      {milestones.map((milestone, index) => {
        const isReleasable =
          isCreator &&
          index === nextIndex &&
          currentAmount >= milestone.amount;
        const isLocked = index > nextIndex && nextIndex !== -1;

        return (
          <div
            key={index}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              milestone.isReleased
                ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                : isReleasable
                ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800"
                : "bg-secondary/30"
            }`}
          >
            <div className="mt-0.5">
              {milestone.isReleased ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : isLocked ? (
                <Lock className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Circle className="h-5 w-5 text-yellow-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm">{milestone.description}</p>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {Number(formatEther(milestone.amount)).toFixed(2)} CELO
                </span>
              </div>
              {milestone.isReleased && (
                <p className="text-xs text-green-600 mt-1">Released</p>
              )}
              {isReleasable && (
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() =>
                    releaseMilestone(campaignId, BigInt(index))
                  }
                  disabled={isPending || isConfirming}
                >
                  {isPending || isConfirming ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Releasing...
                    </>
                  ) : (
                    "Release Funds"
                  )}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
