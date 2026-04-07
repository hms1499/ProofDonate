"use client";

import Link from "next/link";
import { formatEther } from "viem";
import { truncateAddress } from "@/lib/app-utils";
import { useCampaignMetadata } from "@/hooks/useCampaignMetadata";
import { ipfsToHttp } from "@/lib/pinata";
import { CheckCircle, Clock, Target, ArrowUpRight } from "lucide-react";
import type { Campaign } from "@/types";

interface CampaignCardProps {
  campaign: Campaign;
  campaignId: number;
  index?: number;
}

export function CampaignCard({ campaign, campaignId, index = 0 }: CampaignCardProps) {
  const raised = Number(formatEther(campaign.currentAmount));
  const target = Number(formatEther(campaign.targetAmount));
  const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
  const deadline = new Date(Number(campaign.deadline) * 1000);
  const isExpired = deadline < new Date();
  const daysLeft = Math.max(
    0,
    Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );
  const { metadata } = useCampaignMetadata(campaign.metadataURI);

  return (
    <Link
      href={`/campaign/${campaignId}`}
      className="group relative block animate-fade-up"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Hover glow effect */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#35D07F]/0 to-[#35D07F]/0 group-hover:from-[#35D07F]/20 group-hover:to-transparent transition-all duration-500 opacity-0 group-hover:opacity-100 blur-xl pointer-events-none" />

      <div className="relative border border-white/8 rounded-2xl overflow-hidden bg-[#0d0d0d] hover:border-white/15 transition-all duration-500 h-full flex flex-col">
        {/* Image */}
        {metadata?.image && (
          <div className="h-44 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent z-10 opacity-60" />
            <img
              src={ipfsToHttp(metadata.image)}
              alt={campaign.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            />
            {/* Arrow indicator on hover */}
            <div className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-[#0a0a0a]/60 backdrop-blur-md border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
              <ArrowUpRight className="h-3.5 w-3.5 text-white/70" />
            </div>
          </div>
        )}

        <div className="p-5 flex flex-col flex-1">
          {/* Title & verified */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-['DM_Serif_Display'] text-lg leading-snug line-clamp-2 group-hover:text-[#35D07F] transition-colors duration-300">
              {campaign.title}
            </h3>
            {campaign.creatorVerified && (
              <CheckCircle className="h-4 w-4 text-[#35D07F] flex-shrink-0 mt-1" />
            )}
          </div>

          <p className="text-xs text-white/30 font-mono mb-3">
            by {truncateAddress(campaign.creator)}
          </p>

          <p className="text-sm text-white/40 line-clamp-2 leading-relaxed mb-5">
            {campaign.description}
          </p>

          {/* Push footer to bottom */}
          <div className="mt-auto space-y-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #35D07F, #2bb86e, #FCFF52)",
                    animationDelay: `${index * 0.1 + 0.5}s`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/70 font-medium">
                  {raised.toFixed(2)}{" "}
                  <span className="text-white/30 font-mono">CELO</span>
                </span>
                <span className="text-white/30 font-mono">
                  of {target.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Footer info */}
            <div className="flex items-center justify-between text-[10px] font-mono text-white/25 uppercase tracking-widest pt-3 border-t border-white/5">
              <div className="flex items-center gap-1.5">
                <Target className="h-3 w-3" />
                <span>{Number(campaign.milestoneCount)} milestones</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span>{isExpired ? "Ended" : `${daysLeft}d left`}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
