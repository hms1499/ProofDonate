"use client";

import Link from "next/link";
import { CampaignList } from "@/components/campaign-list";
import { useAccount } from "wagmi";
import { ArrowRight, Eye, Shield, Layers } from "lucide-react";

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="flex-1 bg-[#0a0a0a] text-white min-h-screen">

      {/* ── TICKER TAPE ── */}
      <div className="border-y border-white/8 overflow-hidden py-2.5 bg-[#0f0f0f]">
        <div className="flex animate-ticker whitespace-nowrap">
          {Array(2).fill(null).map((_, i) => (
            <span key={i} className="flex items-center gap-8 px-4 font-mono text-xs text-white/30 tracking-widest uppercase">
              <span>Proof of Donation</span><span className="text-[#35D07F]">●</span>
              <span>Milestone Release</span><span className="text-[#35D07F]">●</span>
              <span>Verified Creators</span><span className="text-[#35D07F]">●</span>
              <span>On-Chain Transparency</span><span className="text-[#35D07F]">●</span>
              <span>Celo Network</span><span className="text-[#35D07F]">●</span>
              <span>Zero Trust Required</span><span className="text-[#35D07F]">●</span>
              <span>Community Governed</span><span className="text-[#35D07F]">●</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#35D07F]/5 rounded-full blur-[120px] animate-glow" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#FCFF52]/3 rounded-full blur-[100px] animate-glow delay-300" />
          {/* grid lines */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative container mx-auto max-w-7xl px-6 pt-20 pb-24 lg:pt-28 lg:pb-32">

          {/* Label */}
          <div className="animate-fade-up flex items-center gap-3 mb-8">
            <span className="inline-flex items-center gap-2 border border-[#35D07F]/30 bg-[#35D07F]/5 rounded-full px-4 py-1.5 text-xs font-mono text-[#35D07F] tracking-widest uppercase">
              <span className="w-1.5 h-1.5 bg-[#35D07F] rounded-full animate-pulse" />
              Live on Celo Network
            </span>
          </div>

          {/* Headline */}
          <div className="max-w-5xl mb-8">
            <h1
              className="animate-fade-up delay-100 font-['DM_Serif_Display'] leading-[1.05] tracking-tight"
              style={{ fontSize: 'clamp(3rem, 8vw, 7rem)' }}
            >
              Donations that{" "}
              <span className="italic text-[#35D07F]">prove</span>
              <br />
              every promise kept.
            </h1>
          </div>

          {/* Subline + CTA — side by side on large screens */}
          <div className="animate-fade-up delay-200 flex flex-col lg:flex-row lg:items-end gap-8 lg:gap-16">
            <p className="max-w-md text-white/50 text-lg leading-relaxed font-light">
              Milestone-based fund release on Celo. Verified creators.
              Every transaction immutably recorded — no trust required.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link
                href="#campaigns"
                className="group inline-flex items-center gap-2 bg-[#35D07F] text-black font-semibold px-7 py-3.5 rounded-full hover:bg-[#2bb86e] transition-colors text-sm"
              >
                Browse Campaigns
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              {isConnected && (
                <Link
                  href="/campaign/create"
                  className="inline-flex items-center gap-2 border border-white/15 text-white font-medium px-7 py-3.5 rounded-full hover:border-white/30 hover:bg-white/5 transition-all text-sm"
                >
                  Create Campaign
                </Link>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="animate-fade-up delay-400 mt-16 pt-8 border-t border-white/8 grid grid-cols-3 gap-8 max-w-2xl">
            {[
              { n: "$0", label: "Lost to fraud" },
              { n: "100%", label: "On-chain proof" },
              { n: "∞", label: "Auditable history" },
            ].map(({ n, label }) => (
              <div key={label}>
                <div className="font-['DM_Serif_Display'] text-3xl lg:text-4xl text-white mb-1">{n}</div>
                <div className="text-xs font-mono text-white/35 uppercase tracking-widest">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-t border-white/8 bg-[#0d0d0d]">
        <div className="container mx-auto max-w-7xl px-6 py-20 lg:py-28">

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
            <h2 className="font-['DM_Serif_Display'] text-4xl lg:text-5xl leading-tight max-w-sm">
              Trust through<br /><span className="italic text-[#35D07F]">transparency.</span>
            </h2>
            <p className="text-white/40 max-w-xs text-sm leading-relaxed">
              Three pillars that make every donation accountable from start to finish.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/8">
            {[
              {
                icon: <Eye className="w-5 h-5" />,
                num: "01",
                title: "100% Transparent",
                desc: "Every transaction is permanently recorded on the Celo blockchain. Anyone can audit fund flows in real time.",
              },
              {
                icon: <Shield className="w-5 h-5" />,
                num: "02",
                title: "Verified Creators",
                desc: "Proof of Humanity verification ensures campaigns are run by real, accountable individuals.",
              },
              {
                icon: <Layers className="w-5 h-5" />,
                num: "03",
                title: "Milestone Release",
                desc: "Funds unlock in stages as creators hit verified milestones — donors stay protected throughout.",
              },
            ].map(({ icon, num, title, desc }) => (
              <div
                key={num}
                className="group bg-[#0d0d0d] p-8 lg:p-10 hover:bg-[#131313] transition-colors relative overflow-hidden"
              >
                {/* Hover accent line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-[#35D07F] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />

                <div className="flex items-start justify-between mb-8">
                  <div className="p-2.5 border border-white/10 rounded-lg text-[#35D07F] bg-[#35D07F]/5">
                    {icon}
                  </div>
                  <span className="font-mono text-xs text-white/20 tracking-widest">{num}</span>
                </div>

                <h3 className="font-semibold text-lg mb-3 text-white">{title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CAMPAIGNS ── */}
      <section id="campaigns" className="border-t border-white/8">
        <div className="container mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="font-mono text-xs text-[#35D07F] uppercase tracking-widest mb-3 block">Live Now</span>
              <h2 className="font-['DM_Serif_Display'] text-4xl lg:text-5xl">Active Campaigns</h2>
            </div>
            {isConnected && (
              <Link
                href="/campaign/create"
                className="hidden sm:inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors font-mono"
              >
                + Start yours
              </Link>
            )}
          </div>
          <CampaignList />
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="border-t border-white/8 bg-[#0d0d0d]">
        <div className="container mx-auto max-w-7xl px-6 py-20 lg:py-24 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="font-['DM_Serif_Display'] text-3xl lg:text-4xl mb-2">
              Ready to make impact?
            </h2>
            <p className="text-white/40 text-sm">No middlemen. No fees hidden. Just proof.</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="#campaigns"
              className="group inline-flex items-center gap-2 bg-[#35D07F] text-black font-semibold px-7 py-3.5 rounded-full hover:bg-[#2bb86e] transition-colors text-sm"
            >
              Donate Now
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
