"use client";

import { useState } from "react";
import { useCampaignCount, useAllCampaigns } from "@/hooks/useProofDonate";
import { CampaignCard } from "./campaign-card";
import type { Campaign } from "@/types";

const PAGE_SIZE = 6;

export function CampaignList() {
  const [page, setPage] = useState(1);
  const { data: count, isLoading: isLoadingCount } = useCampaignCount();
  const { data: campaignsData, isLoading: isLoadingCampaigns } =
    useAllCampaigns(count);

  if (isLoadingCount || isLoadingCampaigns) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-80 rounded-2xl bg-white/5 border border-white/8 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!count || count === 0n) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">
          No campaigns yet. Be the first to create one!
        </p>
      </div>
    );
  }

  const campaigns = campaignsData
    ?.map((result, index) => ({
      campaign: result.status === "success" ? (result.result as Campaign) : null,
      id: index,
    }))
    .filter((item) => item.campaign?.isActive)
    .reverse(); // newest first

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">
          No active campaigns at the moment.
        </p>
      </div>
    );
  }

  const visible = campaigns.slice(0, page * PAGE_SIZE);

  return (
    <div className="space-y-0">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visible.map(
          (item, i) =>
            item.campaign && (
              <CampaignCard
                key={item.id}
                campaign={item.campaign}
                campaignId={item.id}
                index={i}
              />
            )
        )}
      </div>
      {visible.length < campaigns.length && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center gap-2 border border-white/15 text-white font-medium px-7 py-3 rounded-full hover:border-white/30 hover:bg-white/5 transition-all text-sm font-mono"
          >
            Load more
            <span className="text-white/40 text-xs">
              ({campaigns.length - visible.length} remaining)
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
