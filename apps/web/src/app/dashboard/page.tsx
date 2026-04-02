"use client";

import { useAccount } from "wagmi";
import { formatEther } from "viem";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useCreatorCampaigns,
  useCampaign,
  useMilestones,
} from "@/hooks/useProofDonate";
import { MilestoneTracker } from "@/components/milestone-tracker";
import { Plus, ArrowRight } from "lucide-react";
import type { Campaign, Milestone } from "@/types";
import { useReadContracts } from "wagmi";
import { PROOF_DONATE_ABI, PROOF_DONATE_ADDRESS } from "@/lib/contracts";

function CampaignDashboardCard({
  campaignId,
  address,
}: {
  campaignId: bigint;
  address: `0x${string}`;
}) {
  const { data: campaign } = useCampaign(campaignId);
  const { data: milestones } = useMilestones(campaignId);

  if (!campaign) return null;

  const c = campaign as Campaign;
  const ms = (milestones as Milestone[]) || [];
  const raised = Number(formatEther(c.currentAmount));
  const target = Number(formatEther(c.targetAmount));
  const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{c.title}</CardTitle>
          <Link href={`/campaign/${campaignId}`}>
            <Button variant="ghost" size="sm">
              View <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{raised.toFixed(2)} cUSD raised</span>
            <span className="text-muted-foreground">
              of {target.toFixed(0)} cUSD
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium mb-3">Milestones</p>
        <MilestoneTracker
          milestones={ms}
          campaignId={campaignId}
          isCreator={true}
          currentAmount={c.currentAmount}
        />
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { data: campaignIds, isLoading } = useCreatorCampaigns(address);

  if (!isConnected) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="text-muted-foreground">
          Connect your wallet to view your campaigns.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Campaigns</h1>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-48 rounded-lg bg-secondary/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const ids = (campaignIds as bigint[]) || [];

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Campaigns</h1>
        <Button asChild>
          <Link href="/campaign/create">
            <Plus className="mr-2 h-4 w-4" />
            Create
          </Link>
        </Button>
      </div>

      {ids.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">
            You haven&apos;t created any campaigns yet.
          </p>
          <Button asChild>
            <Link href="/campaign/create">Create Your First Campaign</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {ids
            .slice()
            .reverse()
            .map((id) => (
              <CampaignDashboardCard
                key={id.toString()}
                campaignId={id}
                address={address!}
              />
            ))}
        </div>
      )}
    </div>
  );
}
