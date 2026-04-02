"use client";

import Link from "next/link";
import { formatEther } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { truncateAddress } from "@/lib/app-utils";
import { CheckCircle, Clock, Target } from "lucide-react";
import type { Campaign } from "@/types";

interface CampaignCardProps {
  campaign: Campaign;
  campaignId: number;
}

export function CampaignCard({ campaign, campaignId }: CampaignCardProps) {
  const raised = Number(formatEther(campaign.currentAmount));
  const target = Number(formatEther(campaign.targetAmount));
  const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
  const deadline = new Date(Number(campaign.deadline) * 1000);
  const isExpired = deadline < new Date();
  const daysLeft = Math.max(
    0,
    Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <Link href={`/campaign/${campaignId}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2">
              {campaign.title}
            </CardTitle>
            {campaign.creatorVerified && (
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            by {truncateAddress(campaign.creator)}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {campaign.description}
          </p>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                {raised.toFixed(2)} cUSD
              </span>
              <span className="text-muted-foreground">
                of {target.toFixed(0)} cUSD
              </span>
            </div>
          </div>

          {/* Footer info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              <span>{Number(campaign.milestoneCount)} milestones</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {isExpired ? "Ended" : `${daysLeft} days left`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
