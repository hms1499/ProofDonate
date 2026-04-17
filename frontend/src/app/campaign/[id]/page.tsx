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
  Zap,
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
        {/* Skeleton hero */}
        <div className="h-[52vh] min-h-[380px] bg-white/4 animate-pulse" />
        <div className="container max-w-6xl mx-auto px-6 -mt-10">
          <div className="grid grid-cols-4 gap-px h-24 bg-white/4 rounded-2xl animate-pulse mb-10" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-8 w-2/3 bg-white/5 rounded animate-pulse" />
              <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
            </div>
            <div className="h-72 bg-white/5 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex-1 bg-[#0A1628] text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="font-['DM_Serif_Display'] text-3xl text-white/40 mb-6">
            Campaign not found.
          </p>
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

  const heroImage = metadata?.image ? ipfsToHttp(metadata.image) : null;

  return (
    <div className="flex-1 bg-[#0A1628] text-white min-h-screen overflow-x-hidden">

      {/* ── AMBIENT BACKGROUND ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[700px] h-[500px] bg-[#34D399]/3 rounded-full blur-[160px]" />
        <div className="absolute bottom-1/3 right-0 w-[500px] h-[400px] bg-[#FBBF24]/2 rounded-full blur-[140px]" />
        {/* Subtle grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.015]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="detail-dots" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#detail-dots)" />
        </svg>
      </div>

      {/* ── HERO ── */}
      <section className="relative h-[58vh] min-h-[420px] max-h-[640px] overflow-hidden">

        {/* Image or fallback gradient */}
        {heroImage ? (
          <img
            src={heroImage}
            alt={c.title}
            className="absolute inset-0 w-full h-full object-cover scale-[1.02] animate-hero-zoom"
            style={{ objectPosition: `center ${metadata?.imagePosition ?? 50}%` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F2A1A] via-[#0A1628] to-[#0D1B3E]" />
        )}

        {/* Gradient overlays — bottom heavy so title is legible */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-[#0A1628]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628]/70 via-transparent to-transparent" />
        {/* Top fade for nav clarity */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#0A1628]/50 to-transparent" />

        {/* Hero UI layer */}
        <div className="absolute inset-0 flex flex-col justify-between p-6 lg:p-10">

          {/* Top row: back + status */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 bg-black/30 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 text-xs font-mono text-white/60 hover:text-white hover:border-white/20 transition-all uppercase tracking-widest"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </Link>

            <div className="flex items-center gap-2">
              {c.creatorVerified && (
                <span className="inline-flex items-center gap-1.5 bg-[#34D399]/15 backdrop-blur-md border border-[#34D399]/30 rounded-full px-3 py-1.5 text-[10px] font-mono text-[#34D399] uppercase tracking-widest">
                  <CheckCircle className="h-3 w-3" />
                  Verified Creator
                </span>
              )}
              {c.isActive && !isExpired ? (
                <span className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-[#34D399]/25 rounded-full px-3 py-1.5 text-[10px] font-mono text-[#34D399] uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 bg-[#34D399] rounded-full animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 text-[10px] font-mono text-white/40 uppercase tracking-widest">
                  Ended
                </span>
              )}
            </div>
          </div>

          {/* Bottom: title + creator */}
          <div className="max-w-4xl">
            {/* Category tag */}
            {metadata?.category && (
              <span className="inline-block font-mono text-[10px] text-[#34D399]/70 uppercase tracking-[0.2em] mb-4">
                {metadata.category}
              </span>
            )}

            <h1
              className="font-['DM_Serif_Display'] leading-[1.05] tracking-tight mb-5 text-shadow-hero"
              style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)" }}
            >
              {c.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                {/* Creator avatar */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 border border-white/10"
                  style={{
                    background: `hsl(${parseInt(c.creator.slice(2, 6), 16) % 360}, 35%, 20%)`,
                    color: `hsl(${parseInt(c.creator.slice(2, 6), 16) % 360}, 60%, 70%)`,
                  }}
                >
                  {c.creator.slice(2, 4).toUpperCase()}
                </div>
                <span className="text-sm text-white/60 font-mono">
                  {truncateAddress(c.creator)}
                </span>
                {isCreator && (
                  <span className="inline-flex items-center bg-[#34D399]/15 text-[#34D399] text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full">
                    You
                  </span>
                )}
              </div>

              {/* Social links inline */}
              {metadata?.website && (
                <a
                  href={metadata.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs font-mono transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Website
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </a>
              )}
              {metadata?.socials?.twitter && (
                <a href={metadata.socials.twitter} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs font-mono transition-colors">
                  <Twitter className="h-3.5 w-3.5" />
                </a>
              )}
              {metadata?.socials?.github && (
                <a href={metadata.socials.github} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs font-mono transition-colors">
                  <Github className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Decorative bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#34D399]/20 to-transparent" />
      </section>

      {/* ── FLOATING STATS STRIP ── */}
      <div className="relative z-10 container max-w-6xl mx-auto px-6 -mt-8 mb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 border border-white/10 bg-[#0E1D30]/90 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
          {[
            {
              icon: <TrendingUp className="h-4 w-4" />,
              value: raised.toFixed(2),
              unit: "cUSD",
              label: "Raised",
              highlight: true,
            },
            {
              icon: <Target className="h-4 w-4" />,
              value: target.toFixed(0),
              unit: "cUSD",
              label: "Goal",
              highlight: false,
            },
            {
              icon: <Users className="h-4 w-4" />,
              value: String(ds.length),
              unit: "",
              label: "Donors",
              highlight: false,
            },
            {
              icon: <Clock className="h-4 w-4" />,
              value: isExpired ? "0" : String(daysLeft),
              unit: isExpired ? "" : "days",
              label: isExpired ? "Ended" : "Remaining",
              highlight: false,
            },
          ].map(({ icon, value, unit, label, highlight }, i) => (
            <div
              key={label}
              className={`relative px-5 py-5 flex flex-col gap-1 ${i < 3 ? "border-r border-white/8" : ""} ${highlight ? "bg-[#34D399]/5" : ""}`}
            >
              {highlight && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#34D399]/60 to-[#FBBF24]/40" />
              )}
              <div className={`${highlight ? "text-[#34D399]" : "text-white/30"} mb-1`}>
                {icon}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-['DM_Serif_Display'] text-2xl lg:text-3xl text-white leading-none">
                  {value}
                </span>
                {unit && (
                  <span className="text-xs font-mono text-white/30 leading-none">{unit}</span>
                )}
              </div>
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="relative z-10 container max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Description */}
            <div className="border border-white/8 rounded-2xl bg-[#0F1D32]/60 backdrop-blur-sm p-7 lg:p-9">
              <h2 className="font-['DM_Serif_Display'] text-2xl mb-5 flex items-center gap-3">
                <span className="text-[#34D399]/60 font-mono text-xs uppercase tracking-widest">About</span>
              </h2>
              <p className="text-white/60 leading-[1.85] text-base max-w-2xl whitespace-pre-line">
                {c.description}
              </p>
            </div>

            {/* Progress section */}
            <div className="border border-white/8 rounded-2xl bg-[#0F1D32]/60 backdrop-blur-sm p-7 lg:p-9">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest block mb-1">
                    Funding Progress
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-['DM_Serif_Display'] text-4xl text-white">{raised.toFixed(2)}</span>
                    <span className="text-sm font-mono text-white/30">cUSD raised</span>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className="font-['DM_Serif_Display'] text-5xl leading-none"
                    style={{
                      background: "linear-gradient(135deg, #34D399, #FBBF24)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {progress.toFixed(0)}%
                  </span>
                  <span className="text-[10px] font-mono text-white/25 block mt-1">of {target.toFixed(0)} cUSD</span>
                </div>
              </div>

              {/* Progress bar — layered for depth */}
              <div className="relative h-3 bg-white/5 rounded-full overflow-hidden mb-2">
                {/* Track fill */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out animate-progress-fill"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #34D399 0%, #10B981 60%, #FBBF24 100%)",
                  }}
                />
                {/* Gloss */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full opacity-40"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)",
                  }}
                />
                {/* Glow tip */}
                {progress > 1 && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full blur-md bg-[#34D399]"
                    style={{ left: `calc(${Math.min(progress, 97)}% - 8px)`, opacity: 0.7 }}
                  />
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-white/25">
                <span>0 cUSD</span>
                <span>{target.toFixed(0)} cUSD</span>
              </div>
            </div>

            {/* ── Milestones ── */}
            <div className="border border-white/8 rounded-2xl bg-[#0F1D32]/60 backdrop-blur-sm overflow-hidden">
              <div className="px-7 lg:px-9 py-6 border-b border-white/8 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-[#34D399]/70 uppercase tracking-widest block mb-1">
                    On-chain Roadmap
                  </span>
                  <h2 className="font-['DM_Serif_Display'] text-2xl">Milestones</h2>
                </div>
                <div className="text-right">
                  <span className="font-['DM_Serif_Display'] text-2xl text-white">
                    {ms.filter((m) => m.isReleased).length}
                    <span className="text-white/20">/{ms.length}</span>
                  </span>
                  <span className="text-[10px] font-mono text-white/25 block mt-1">completed</span>
                </div>
              </div>
              <div className="p-7 lg:p-9">
                <MilestoneTracker
                  milestones={ms}
                  campaignId={campaignId}
                  isCreator={isCreator}
                  currentAmount={c.currentAmount}
                  onChange={handleDonateSuccess}
                />
              </div>
            </div>

            {/* ── Donation History ── */}
            {ds.length > 0 && (
              <div className="border border-white/8 rounded-2xl bg-[#0F1D32]/60 backdrop-blur-sm overflow-hidden">
                <div className="px-7 lg:px-9 py-6 border-b border-white/8 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest block mb-1">
                      Transaction Log
                    </span>
                    <h2 className="font-['DM_Serif_Display'] text-2xl">Donations</h2>
                  </div>
                  <span className="font-mono text-xs text-white/25">{ds.length} total</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {ds
                    .slice()
                    .reverse()
                    .slice(0, 20)
                    .map((d, i) => (
                      <div
                        key={i}
                        className="group flex items-center justify-between px-7 lg:px-9 py-4 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 border border-white/5"
                            style={{
                              background: `hsl(${parseInt(d.donor.slice(2, 6), 16) % 360}, 35%, 18%)`,
                              color: `hsl(${parseInt(d.donor.slice(2, 6), 16) % 360}, 60%, 65%)`,
                            }}
                          >
                            {d.donor.slice(2, 4).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm text-white/55 font-mono block">
                              {truncateAddress(d.donor)}
                            </span>
                            <span className="text-[10px] text-white/20 font-mono">
                              {new Date(Number(d.timestamp) * 1000).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-white block">
                            {Number(formatEther(d.amount)).toFixed(2)}
                          </span>
                          <span className="text-[10px] font-mono text-white/25">cUSD</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div className="lg:sticky lg:top-20 space-y-5">

            {/* Donate card */}
            {c.isActive && !isExpired ? (
              <div className="relative rounded-2xl overflow-hidden">
                {/* Gradient border effect */}
                <div
                  className="absolute inset-0 rounded-2xl p-px"
                  style={{
                    background: "linear-gradient(135deg, rgba(52,211,153,0.4), rgba(251,191,36,0.2), rgba(52,211,153,0.1))",
                  }}
                />
                <div className="relative bg-[#0F1D32] rounded-2xl overflow-hidden">
                  {/* Top accent */}
                  <div
                    className="h-[3px]"
                    style={{
                      background: "linear-gradient(90deg, #34D399, #10B981 50%, #FBBF24)",
                    }}
                  />

                  {/* Urgency bar if < 7 days */}
                  {!isExpired && daysLeft <= 7 && daysLeft > 0 && (
                    <div className="flex items-center gap-2 px-6 py-3 bg-[#FBBF24]/8 border-b border-[#FBBF24]/15">
                      <Zap className="h-3.5 w-3.5 text-[#FBBF24] shrink-0" />
                      <span className="text-xs text-[#FBBF24]/80 font-mono">
                        {daysLeft === 1 ? "Last day!" : `${daysLeft} days left`}
                      </span>
                    </div>
                  )}

                  <div className="p-6">
                    <h3 className="font-['DM_Serif_Display'] text-xl mb-1 text-white">
                      Support this mission
                    </h3>
                    <p className="text-xs text-white/30 font-mono uppercase tracking-widest mb-6">
                      Funds released by milestone only
                    </p>
                    <DonateForm
                      campaignId={campaignId}
                      onSuccess={handleDonateSuccess}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-white/8 rounded-2xl p-8 bg-[#0F1D32]/60 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-5 w-5 text-white/25" />
                </div>
                <p className="text-white/40 text-sm font-mono">
                  This campaign has ended.
                </p>
              </div>
            )}

            {/* Campaign meta card */}
            <div className="border border-white/8 rounded-2xl bg-[#0F1D32]/60 backdrop-blur-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-white/6">
                <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                  Campaign Details
                </span>
              </div>
              <div className="p-5 space-y-3.5">
                {[
                  { label: "Category", value: metadata?.category || "General" },
                  {
                    label: "Deadline",
                    value: deadline.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }),
                  },
                  { label: "Milestones", value: String(ms.length) },
                  { label: "Creator", value: truncateAddress(c.creator) },
                  { label: "Contract", value: "Celo Mainnet" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-white/30">{label}</span>
                    <span className="text-xs text-white/60 font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust badge */}
            <div className="border border-[#34D399]/12 rounded-2xl bg-[#34D399]/4 p-5 space-y-3">
              <div className="flex items-center gap-2 text-[#34D399]">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-mono uppercase tracking-widest">
                  Transparent by design
                </span>
              </div>
              <p className="text-xs text-white/35 leading-relaxed">
                Funds are held on-chain and only released when verified milestones are completed. Your donation is fully auditable on Celo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
