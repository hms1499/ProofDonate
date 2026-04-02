"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import {
  useCreateCampaign,
  useIsVerified,
  useCampaignCount,
} from "@/hooks/useProofDonate";
import { Plus, Trash2, Loader2, ShieldAlert, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface MilestoneInput {
  description: string;
  amount: string;
}

const inputCls =
  "w-full bg-[#111] border border-white/10 text-white placeholder:text-white/25 text-sm px-4 py-3 rounded-lg focus:outline-none focus:border-[#35D07F]/60 focus:ring-1 focus:ring-[#35D07F]/30 transition-all";

export default function CreateCampaignPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: isVerified, isLoading: isCheckingVerification } = useIsVerified(address);
  const { data: campaignCount } = useCampaignCount();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("30");
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { description: "", amount: "" },
  ]);

  const { createCampaign, isPending, isConfirming, isSuccess, error } = useCreateCampaign();

  useEffect(() => {
    if (isSuccess && campaignCount !== undefined) {
      router.push(`/campaign/${Number(campaignCount) - 1}`);
    }
  }, [isSuccess, campaignCount, router]);

  const addMilestone = () => {
    if (milestones.length < 10) setMilestones([...milestones, { description: "", amount: "" }]);
  };
  const removeMilestone = (i: number) => {
    if (milestones.length > 1) setMilestones(milestones.filter((_, idx) => idx !== i));
  };
  const updateMilestone = (i: number, field: keyof MilestoneInput, val: string) => {
    const updated = [...milestones];
    updated[i][field] = val;
    setMilestones(updated);
  };

  const milestoneSum = milestones.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0);
  const targetNum = parseFloat(targetAmount) || 0;
  const milestoneMismatch = targetNum > 0 && milestoneSum > 0 && Math.abs(milestoneSum - targetNum) > 0.001;
  const isFormValid =
    title.trim() &&
    description.trim() &&
    targetNum > 0 &&
    milestones.every((m) => m.description.trim() && parseFloat(m.amount) > 0) &&
    !milestoneMismatch;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + parseInt(deadlineDays) * 86400);
    createCampaign(
      title, description, parseEther(targetAmount),
      milestones.map((m) => m.description),
      milestones.map((m) => parseEther(m.amount)),
      deadline
    );
  };

  // ── Gate: not connected ──
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-6 h-6 text-white/40" />
          </div>
          <h1 className="font-['DM_Serif_Display'] text-3xl text-white mb-3">Connect your wallet</h1>
          <p className="text-white/40 text-sm">You need a connected wallet to create a campaign.</p>
        </div>
      </div>
    );
  }

  // ── Gate: checking verification ──
  if (isCheckingVerification) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#35D07F] animate-spin" />
      </div>
    );
  }

  // ── Gate: not verified ──
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full border border-yellow-500/20 bg-yellow-500/5 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-6 h-6 text-yellow-400" />
          </div>
          <h1 className="font-['DM_Serif_Display'] text-3xl text-white mb-3">Verification required</h1>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            Proof of Humanity verification is required before launching a campaign.
          </p>
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 bg-[#35D07F] text-black font-semibold px-6 py-3 rounded-full text-sm hover:bg-[#2bb86e] transition-colors"
          >
            Verify Now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:py-16">

        {/* Header */}
        <div className="mb-10">
          <span className="font-mono text-xs text-[#35D07F] uppercase tracking-widest mb-3 block">New Campaign</span>
          <h1 className="font-['DM_Serif_Display'] text-4xl lg:text-5xl">Launch your campaign</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

            {/* ── Left: Main form ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Campaign Details */}
              <div className="border border-white/8 rounded-xl bg-[#0d0d0d] p-6 lg:p-8 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-xs text-white/30 uppercase tracking-widest">01</span>
                  <h2 className="text-sm font-medium text-white/70 uppercase tracking-wider">Campaign Details</h2>
                </div>

                <div>
                  <label className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2 block">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give your campaign a clear name"
                    maxLength={100}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2 block">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your campaign and how funds will be used…"
                    rows={5}
                    className={`${inputCls} resize-none`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2 block">Target (cUSD)</label>
                    <input
                      type="number" min="1" step="0.01"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder="1000"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2 block">Duration (days)</label>
                    <input
                      type="number" min="1" max="365"
                      value={deadlineDays}
                      onChange={(e) => setDeadlineDays(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* Milestones */}
              <div className="border border-white/8 rounded-xl bg-[#0d0d0d] p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-white/30 uppercase tracking-widest">02</span>
                    <h2 className="text-sm font-medium text-white/70 uppercase tracking-wider">Milestones</h2>
                  </div>
                  <button
                    type="button"
                    onClick={addMilestone}
                    disabled={milestones.length >= 10}
                    className="inline-flex items-center gap-1.5 border border-white/10 text-white/60 text-xs font-mono px-3 py-1.5 rounded-full hover:border-[#35D07F]/40 hover:text-[#35D07F] disabled:opacity-30 transition-all"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>

                <p className="text-xs text-white/30 mb-5 font-mono">
                  Milestone amounts must sum to target · {milestones.length}/10 used
                </p>

                <div className="space-y-3">
                  {milestones.map((m, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="mt-3 font-mono text-xs text-white/20 w-5 shrink-0 text-right">{String(i + 1).padStart(2, '0')}</span>
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={m.description}
                          onChange={(e) => updateMilestone(i, "description", e.target.value)}
                          placeholder={`Milestone ${i + 1} description`}
                          className={`col-span-2 ${inputCls}`}
                        />
                        <div className="relative">
                          <input
                            type="number" min="0" step="0.01"
                            value={m.amount}
                            onChange={(e) => updateMilestone(i, "amount", e.target.value)}
                            placeholder="0.00"
                            className={inputCls}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/20 pointer-events-none">cUSD</span>
                        </div>
                      </div>
                      {milestones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMilestone(i)}
                          className="mt-2.5 p-1.5 text-white/20 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {milestoneMismatch && (
                  <div className="mt-4 border border-red-500/20 bg-red-500/5 rounded-lg px-4 py-3">
                    <p className="text-xs text-red-400 font-mono">
                      Total {milestoneSum.toFixed(2)} ≠ target {targetNum.toFixed(2)} cUSD
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="border border-red-500/20 bg-red-500/5 rounded-lg px-4 py-3">
                  <p className="text-xs text-red-400">{error.message.slice(0, 120)}</p>
                </div>
              )}
            </div>

            {/* ── Right: Summary sidebar ── */}
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="border border-white/8 rounded-xl bg-[#0d0d0d] p-6">
                <h3 className="text-xs font-mono text-white/30 uppercase tracking-widest mb-5">Summary</h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-white/30 mb-1">Title</p>
                    <p className="text-sm text-white truncate">{title || <span className="text-white/20 italic">Untitled</span>}</p>
                  </div>
                  <div className="h-px bg-white/6" />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-white/30 mb-1">Target</p>
                      <p className="font-['DM_Serif_Display'] text-xl text-white">{targetAmount || '—'}</p>
                      <p className="text-xs text-white/25">cUSD</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/30 mb-1">Duration</p>
                      <p className="font-['DM_Serif_Display'] text-xl text-white">{deadlineDays}</p>
                      <p className="text-xs text-white/25">days</p>
                    </div>
                  </div>
                  <div className="h-px bg-white/6" />
                  <div>
                    <p className="text-xs text-white/30 mb-3">Milestones ({milestones.length})</p>
                    <div className="space-y-2">
                      {milestones.map((m, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.description && m.amount ? 'bg-[#35D07F]' : 'bg-white/15'}`} />
                            <span className="text-xs text-white/50 truncate">{m.description || `Milestone ${i + 1}`}</span>
                          </div>
                          <span className="text-xs font-mono text-white/40 shrink-0">{m.amount || '0'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {targetNum > 0 && milestoneSum > 0 && (
                    <>
                      <div className="h-px bg-white/6" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/30">Milestone total</span>
                        <span className={`text-xs font-mono ${milestoneMismatch ? 'text-red-400' : 'text-[#35D07F]'}`}>
                          {milestoneSum.toFixed(2)} / {targetNum.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!isFormValid || isPending || isConfirming}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#35D07F] text-black font-semibold px-6 py-4 rounded-xl text-sm hover:bg-[#2bb86e] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isPending || isConfirming ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating on-chain…</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Launch Campaign</>
                )}
              </button>

              <p className="text-center text-xs text-white/20 font-mono">
                Transaction will be signed via your wallet
              </p>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
