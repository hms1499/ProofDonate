"use client";

import { useAccount } from "wagmi";
import { formatEther } from "viem";
import Link from "next/link";
import {
  useCreatorCampaigns,
  useCampaign,
  useMilestones,
} from "@/hooks/useProofDonate";
import { MilestoneTracker } from "@/components/milestone-tracker";
import { Plus, ArrowRight, LayoutDashboard } from "lucide-react";
import type { Campaign, Milestone } from "@/types";

function CampaignDashboardCard({
  campaignId,
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
  const completedMilestones = ms.filter((m) => m.isReleased).length;

  return (
    <div className="border border-white/8 rounded-xl bg-[#0d0d0d] overflow-hidden group hover:border-white/14 transition-colors">
      {/* Card header */}
      <div className="px-6 pt-6 pb-5 border-b border-white/6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h3 className="font-['DM_Serif_Display'] text-xl text-white truncate mb-1">{c.title}</h3>
            <p className="text-xs font-mono text-white/30">
              Campaign #{campaignId.toString()}
            </p>
          </div>
          <Link
            href={`/campaign/${campaignId}`}
            className="shrink-0 inline-flex items-center gap-1.5 border border-white/10 text-white/50 text-xs font-mono px-3 py-1.5 rounded-full hover:border-[#35D07F]/40 hover:text-[#35D07F] transition-all"
          >
            View <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-['DM_Serif_Display'] text-lg text-white">{raised.toFixed(2)}</span>
            <span className="text-white/30 font-mono">of {target.toFixed(0)} CELO</span>
          </div>
          <div className="h-1 bg-white/6 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#35D07F] rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-white/30 font-mono">
            <span>{progress.toFixed(0)}% funded</span>
            <span>{completedMilestones}/{ms.length} milestones</span>
          </div>
        </div>
      </div>

      {/* Milestone tracker */}
      <div className="px-6 py-5">
        <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-4">Milestones</p>
        <MilestoneTracker
          milestones={ms}
          campaignId={campaignId}
          isCreator={true}
          currentAmount={c.currentAmount}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { data: campaignIds, isLoading } = useCreatorCampaigns(address);

  // ── Gate: not connected ──
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-6">
            <LayoutDashboard className="w-6 h-6 text-white/30" />
          </div>
          <h1 className="font-['DM_Serif_Display'] text-3xl text-white mb-3">Your Dashboard</h1>
          <p className="text-white/40 text-sm">Connect your wallet to view your campaigns.</p>
        </div>
      </div>
    );
  }

  const ids = (campaignIds as bigint[]) || [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-4xl px-6 py-12 lg:py-16">

        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="font-mono text-xs text-[#35D07F] uppercase tracking-widest mb-3 block">Creator Hub</span>
            <h1 className="font-['DM_Serif_Display'] text-4xl lg:text-5xl">My Campaigns</h1>
          </div>
          <Link
            href="/campaign/create"
            className="inline-flex items-center gap-2 bg-[#35D07F] text-black font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-[#2bb86e] transition-colors"
          >
            <Plus className="w-4 h-4" /> New
          </Link>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-52 rounded-xl bg-white/4 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && ids.length === 0 && (
          <div className="border border-white/6 rounded-xl bg-[#0d0d0d] py-20 text-center">
            <div className="w-12 h-12 rounded-full border border-white/8 flex items-center justify-center mx-auto mb-5">
              <Plus className="w-5 h-5 text-white/25" />
            </div>
            <p className="text-white/40 text-sm mb-6">You haven&apos;t created any campaigns yet.</p>
            <Link
              href="/campaign/create"
              className="inline-flex items-center gap-2 bg-[#35D07F] text-black font-semibold px-6 py-3 rounded-full text-sm hover:bg-[#2bb86e] transition-colors"
            >
              Create Your First Campaign <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Campaign list */}
        {!isLoading && ids.length > 0 && (
          <>
            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "Campaigns", value: ids.length },
                { label: "Network", value: "Celo" },
                { label: "Status", value: "Active" },
              ].map(({ label, value }) => (
                <div key={label} className="border border-white/6 rounded-xl bg-[#0d0d0d] px-5 py-4">
                  <p className="font-['DM_Serif_Display'] text-2xl text-white mb-0.5">{value}</p>
                  <p className="text-xs font-mono text-white/30 uppercase tracking-widest">{label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-5">
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
          </>
        )}
      </div>
    </div>
  );
}
