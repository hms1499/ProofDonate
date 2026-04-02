"use client";

import { useParams } from "next/navigation";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DonateForm } from "@/components/donate-form";
import { MilestoneTracker } from "@/components/milestone-tracker";
import {
  useCampaign,
  useMilestones,
  useDonations,
} from "@/hooks/useProofDonate";
import { truncateAddress } from "@/lib/app-utils";
import { CheckCircle, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Campaign, Milestone, Donation } from "@/types";

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = BigInt(params.id as string);
  const { address } = useAccount();

  const { data: campaign, isLoading, refetch: refetchCampaign } = useCampaign(campaignId);
  const { data: milestones, refetch: refetchMilestones } = useMilestones(campaignId);
  const { data: donations, refetch: refetchDonations } = useDonations(campaignId);

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="h-96 rounded-lg bg-secondary/50 animate-pulse" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Campaign not found.</p>
      </div>
    );
  }

  const c = campaign as Campaign;
  const ms = (milestones as Milestone[]) || [];
  const ds = (donations as Donation[]) || [];
  const raised = Number(formatEther(c.currentAmount));
  const target = Number(formatEther(c.targetAmount));
  const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
  const deadline = new Date(Number(c.deadline) * 1000);
  const isExpired = deadline < new Date();
  const isCreator =
    address?.toLowerCase() === c.creator.toLowerCase();

  const handleDonateSuccess = () => {
    refetchCampaign();
    refetchMilestones();
    refetchDonations();
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to campaigns
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-start gap-3 mb-2">
              <h1 className="text-3xl font-bold">{c.title}</h1>
              {c.creatorVerified && (
                <CheckCircle className="h-6 w-6 text-green-500 mt-1" />
              )}
            </div>
            <p className="text-muted-foreground">
              by {truncateAddress(c.creator)}
              {isCreator && (
                <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  You
                </span>
              )}
            </p>
          </div>

          <p className="text-foreground/80 leading-relaxed">
            {c.description}
          </p>

          {/* Progress */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-lg">
                    {raised.toFixed(2)} cUSD raised
                  </span>
                  <span className="text-muted-foreground">
                    of {target.toFixed(0)} cUSD
                  </span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {isExpired
                      ? "Campaign ended"
                      : `Ends ${deadline.toLocaleDateString()}`}
                  </div>
                  <span>{ds.length} donations</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Milestones */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              <MilestoneTracker
                milestones={ms}
                campaignId={campaignId}
                isCreator={isCreator}
                currentAmount={c.currentAmount}
              />
            </CardContent>
          </Card>

          {/* Donation History */}
          {ds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Donations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ds
                    .slice()
                    .reverse()
                    .slice(0, 20)
                    .map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <span className="text-sm text-muted-foreground">
                          {truncateAddress(d.donor)}
                        </span>
                        <span className="text-sm font-medium">
                          {Number(formatEther(d.amount)).toFixed(2)} cUSD
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {c.isActive && !isExpired && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Donate</CardTitle>
              </CardHeader>
              <CardContent>
                <DonateForm
                  campaignId={campaignId}
                  onSuccess={handleDonateSuccess}
                />
              </CardContent>
            </Card>
          )}

          {!c.isActive && (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">
                  This campaign is no longer active.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
