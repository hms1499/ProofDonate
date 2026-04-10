"use client";

import { useParams } from "next/navigation";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { DonateForm } from "@/components/donate-form";
import { MilestoneTracker } from "@/components/milestone-tracker";
import {
  useCampaign,
  useMilestones,
  useDonations,
} from "@/hooks/useProofDonate";
import { truncateAddress } from "@/lib/app-utils";
import { useCampaignMetadata } from "@/hooks/useCampaignMetadata";
import { ipfsToHttp } from "@/lib/pinata";
import {
  CheckCircle,
  Clock,
  ArrowLeft,
  Globe,
  Twitter,
  Github,
  Users,
  Target,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import type { Campaign, Milestone, Donation } from "@/types";

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = BigInt(params.id as string);
  const { address } = useAccount();

  const {
    data: campaign,
    isLoading,
    refetch: refetchCampaign,
  } = useCampaign(campaignId);
  const { data: milestones, refetch: refetchMilestones } =
    useMilestones(campaignId);
  const { data: donations, refetch: refetchDonations } =
    useDonations(campaignId);
  const { metadata } = useCampaignMetadata(
    (campaign as Campaign)?.metadataURI
  );

  if (isLoading) {
    return (
      <div className="flex-1 bg-[#0A1628] text-white min-h-screen">
        <div className="container max-w-6xl mx-auto px-6 py-16">
          {/* Skeleton hero image */}
          <div className="h-[360px] rounded-2xl bg-white/5 animate-pulse mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-10 w-2/3 bg-white/5 rounded-lg animate-pulse" />
              <div className="h-5 w-1/3 bg-white/5 rounded-lg animate-pulse" />
              <div className="h-24 bg-white/5 rounded-lg animate-pulse" />
            </div>
            <div className="h-64 bg-white/5 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex-1 bg-[#0A1628] text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 text-lg mb-4">Campaign not found.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#34D399] hover:text-[#10B981] text-sm font-mono uppercase tracking-widest transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to campaigns
          </Link>
        </div>
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
  const isCreator = address?.toLowerCase() === c.creator.toLowerCase();
  const daysLeft = Math.max(
    0,
    Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  const handleDonateSuccess = () => {
    refetchCampaign();
    refetchMilestones();
    refetchDonations();
  };

  return (
    <div className="flex-1 bg-[#0A1628] text-white min-h-screen">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#34D399]/4 rounded-full blur-[140px] animate-glow" />
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.02]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="detail-grid"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 60 0 L 0 0 0 60"
                fill="none"
                stroke="white"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#detail-grid)" />
        </svg>
      </div>

      <div className="relative container max-w-6xl mx-auto px-6 pt-8 pb-20">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/40 hover:text-white text-xs font-mono uppercase tracking-widest transition-colors mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to campaigns
        </Link>

        {/* Hero image */}
        {metadata?.image && (
          <div className="relative rounded-2xl overflow-hidden mb-10 group">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-transparent to-transparent z-10" />
            <img
              src={ipfsToHttp(metadata.image)}
              alt={c.title}
              className="w-full h-[320px] lg:h-[400px] object-cover group-hover:scale-[1.02] transition-transform duration-700"
              style={{ objectPosition: `center ${metadata.imagePosition ?? 50}%` }}
            />
            {/* Status badge on image */}
            <div className="absolute top-5 right-5 z-20">
              {c.isActive && !isExpired ? (
                <span className="inline-flex items-center gap-2 bg-[#0A1628]/80 backdrop-blur-md border border-[#34D399]/30 rounded-full px-4 py-1.5 text-xs font-mono text-[#34D399] tracking-widest uppercase">
                  <span className="w-1.5 h-1.5 bg-[#34D399] rounded-full animate-pulse" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 bg-[#0A1628]/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 text-xs font-mono text-white/50 tracking-widest uppercase">
                  Ended
                </span>
              )}
            </div>
          </div>
        )}

        {/* If no image, show status badge inline */}
        {!metadata?.image && (
          <div className="mb-6">
            {c.isActive && !isExpired ? (
              <span className="inline-flex items-center gap-2 border border-[#34D399]/30 bg-[#34D399]/5 rounded-full px-4 py-1.5 text-xs font-mono text-[#34D399] tracking-widest uppercase">
                <span className="w-1.5 h-1.5 bg-[#34D399] rounded-full animate-pulse" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 border border-white/10 rounded-full px-4 py-1.5 text-xs font-mono text-white/50 tracking-widest uppercase">
                Ended
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* ── Main content ── */}
          <div className="lg:col-span-2 space-y-10">
            {/* Title & creator */}
            <div>
              <div className="flex items-start gap-3 mb-3">
                <h1 className="font-['DM_Serif_Display'] text-4xl lg:text-5xl leading-[1.1] tracking-tight">
                  {c.title}
                </h1>
                {c.creatorVerified && (
                  <span className="mt-2 inline-flex items-center gap-1.5 bg-[#34D399]/10 border border-[#34D399]/20 rounded-full px-2.5 py-1 text-[10px] font-mono text-[#34D399] uppercase tracking-widest shrink-0">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>
              <p className="text-white/40 text-sm font-mono">
                by{" "}
                <span className="text-white/60">
                  {truncateAddress(c.creator)}
                </span>
                {isCreator && (
                  <span className="ml-2 inline-flex items-center bg-[#34D399]/10 text-[#34D399] text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full">
                    You
                  </span>
                )}
              </p>
            </div>

            {/* Description */}
            <p className="text-white/55 leading-relaxed text-base max-w-2xl">
              {c.description}
            </p>

            {/* Social links */}
            {metadata && (metadata.website || metadata.socials) && (
              <div className="flex flex-wrap items-center gap-3">
                {metadata.website && (
                  <a
                    href={metadata.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-white/8 rounded-full text-white/40 hover:text-white hover:border-white/20 transition-all text-xs font-mono uppercase tracking-widest"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Website
                    <ExternalLink className="h-3 w-3 opacity-40" />
                  </a>
                )}
                {metadata.socials?.twitter && (
                  <a
                    href={metadata.socials.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-white/8 rounded-full text-white/40 hover:text-white hover:border-white/20 transition-all text-xs font-mono uppercase tracking-widest"
                  >
                    <Twitter className="h-3.5 w-3.5" />
                    Twitter
                  </a>
                )}
                {metadata.socials?.github && (
                  <a
                    href={metadata.socials.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-white/8 rounded-full text-white/40 hover:text-white hover:border-white/20 transition-all text-xs font-mono uppercase tracking-widest"
                  >
                    <Github className="h-3.5 w-3.5" />
                    GitHub
                  </a>
                )}
              </div>
            )}

            {/* ── Stats bar ── */}
            <div className="grid grid-cols-3 gap-px bg-white/8 rounded-xl overflow-hidden">
              {[
                {
                  icon: <TrendingUp className="h-4 w-4" />,
                  value: `${raised.toFixed(2)}`,
                  unit: "CELO",
                  label: "Raised",
                },
                {
                  icon: <Target className="h-4 w-4" />,
                  value: `${target.toFixed(0)}`,
                  unit: "CELO",
                  label: "Goal",
                },
                {
                  icon: <Users className="h-4 w-4" />,
                  value: `${ds.length}`,
                  unit: "",
                  label: "Donors",
                },
              ].map(({ icon, value, unit, label }) => (
                <div
                  key={label}
                  className="bg-[#0F1D32] p-5 flex flex-col items-center text-center"
                >
                  <div className="text-[#34D399]/60 mb-2">{icon}</div>
                  <div className="font-['DM_Serif_Display'] text-2xl text-white">
                    {value}{" "}
                    {unit && (
                      <span className="text-sm text-white/40 font-mono">
                        {unit}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mt-1">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Progress ── */}
            <div className="border border-white/8 rounded-xl p-6 bg-[#0F1D32]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-white/30 uppercase tracking-widest">
                  Funding Progress
                </span>
                <span className="font-['DM_Serif_Display'] text-2xl text-[#34D399]">
                  {progress.toFixed(1)}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="relative h-2 bg-white/5 rounded-full overflow-hidden mb-4">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${progress}%`,
                    background:
                      "linear-gradient(90deg, #34D399, #10B981, #FBBF24)",
                  }}
                />
                {/* Glow on progress tip */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#34D399] rounded-full blur-[6px]"
                  style={{ left: `calc(${Math.min(progress, 98)}% - 6px)` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">
                  <span className="text-white font-medium">
                    {raised.toFixed(2)}
                  </span>{" "}
                  <span className="text-white/30">of {target.toFixed(0)} CELO</span>
                </span>
                <div className="flex items-center gap-1.5 text-white/40">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs font-mono">
                    {isExpired
                      ? "Campaign ended"
                      : `${daysLeft} days left`}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Milestones ── */}
            <div className="border border-white/8 rounded-xl overflow-hidden bg-[#0F1D32]">
              <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
                <h2 className="font-['DM_Serif_Display'] text-xl">
                  Milestones
                </h2>
                <span className="text-xs font-mono text-white/30 uppercase tracking-widest">
                  {ms.filter((m) => m.isReleased).length}/{ms.length} completed
                </span>
              </div>
              <div className="p-6">
                <MilestoneTracker
                  milestones={ms}
                  campaignId={campaignId}
                  isCreator={isCreator}
                  currentAmount={c.currentAmount}
                />
              </div>
            </div>

            {/* ── Donation History ── */}
            {ds.length > 0 && (
              <div className="border border-white/8 rounded-xl overflow-hidden bg-[#0F1D32]">
                <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
                  <h2 className="font-['DM_Serif_Display'] text-xl">
                    Recent Donations
                  </h2>
                  <span className="text-xs font-mono text-white/30 uppercase tracking-widest">
                    {ds.length} total
                  </span>
                </div>
                <div className="divide-y divide-white/5">
                  {ds
                    .slice()
                    .reverse()
                    .slice(0, 20)
                    .map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-6 py-3.5 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar dot */}
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono"
                            style={{
                              background: `hsl(${parseInt(d.donor.slice(2, 6), 16) % 360}, 50%, 25%)`,
                              color: `hsl(${parseInt(d.donor.slice(2, 6), 16) % 360}, 70%, 70%)`,
                            }}
                          >
                            {d.donor.slice(2, 4)}
                          </div>
                          <span className="text-sm text-white/50 font-mono">
                            {truncateAddress(d.donor)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-white">
                          {Number(formatEther(d.amount)).toFixed(2)}{" "}
                          <span className="text-white/40 text-xs">CELO</span>
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-6">
            {/* Sticky donate card */}
            <div className="lg:sticky lg:top-20">
              {c.isActive && !isExpired ? (
                <div className="border border-white/8 rounded-xl overflow-hidden bg-[#0F1D32]">
                  {/* Accent top line */}
                  <div
                    className="h-1"
                    style={{
                      background:
                        "linear-gradient(90deg, #34D399, #FBBF24)",
                    }}
                  />
                  <div className="p-6">
                    <h3 className="font-['DM_Serif_Display'] text-xl mb-1">
                      Support this campaign
                    </h3>
                    <p className="text-xs text-white/30 font-mono uppercase tracking-widest mb-6">
                      Every CELO counts
                    </p>
                    <DonateForm
                      campaignId={campaignId}
                      onSuccess={handleDonateSuccess}
                    />
                  </div>
                </div>
              ) : (
                <div className="border border-white/8 rounded-xl p-6 bg-[#0F1D32] text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                    <Clock className="h-5 w-5 text-white/30" />
                  </div>
                  <p className="text-white/40 text-sm">
                    This campaign is no longer active.
                  </p>
                </div>
              )}

              {/* Campaign info card */}
              <div className="border border-white/8 rounded-xl p-6 bg-[#0F1D32] mt-6 space-y-4">
                <h3 className="text-xs font-mono text-white/30 uppercase tracking-widest">
                  Campaign Info
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/30">Category</span>
                    <span className="text-xs text-white/60 font-mono">
                      {metadata?.category || "General"}
                    </span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/30">Deadline</span>
                    <span className="text-xs text-white/60 font-mono">
                      {deadline.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/30">Milestones</span>
                    <span className="text-xs text-white/60 font-mono">
                      {ms.length}
                    </span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/30">Creator</span>
                    <span className="text-xs text-white/60 font-mono">
                      {truncateAddress(c.creator)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
