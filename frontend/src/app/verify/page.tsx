"use client";

import { useAccount } from "wagmi";
import {
  useIsVerified,
  useVerificationRequested,
  useRequestVerification,
} from "@/hooks/useProofDonate";
import {
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Clock,
  ArrowRight,
  Shield,
} from "lucide-react";
import Link from "next/link";

const steps = [
  {
    num: "01",
    title: "Submit Request",
    desc: "Sign a transaction from your wallet to submit a verification request on-chain.",
  },
  {
    num: "02",
    title: "Admin Review",
    desc: "A human admin reviews your request and verifies your identity manually.",
  },
  {
    num: "03",
    title: "Start Creating",
    desc: "Once approved, you can launch milestone-based campaigns immediately.",
  },
];

export default function VerifyPage() {
  const { address, isConnected } = useAccount();
  const { data: isVerified, isLoading: isLoadingVerified } = useIsVerified(address);
  const { data: hasRequested, isLoading: isLoadingRequested } = useVerificationRequested(address);
  const { requestVerification, isPending, isConfirming, isSuccess: requestSuccess } =
    useRequestVerification();

  const isLoading = isLoadingVerified || isLoadingRequested;

  // ── Gate: not connected ──
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-6 h-6 text-white/30" />
          </div>
          <h1 className="font-['DM_Serif_Display'] text-3xl text-white mb-3">Proof of Humanity</h1>
          <p className="text-white/40 text-sm">Connect your wallet to verify your identity.</p>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#34D399] animate-spin" />
      </div>
    );
  }

  // ── Already verified ──
  if (isVerified) {
    return (
      <div className="min-h-screen bg-[#0A1628] text-white">
        <div className="mx-auto max-w-2xl px-6 py-20 lg:py-28 text-center">
          <div className="relative inline-flex mb-8">
            <div className="w-20 h-20 rounded-full border border-[#34D399]/30 bg-[#34D399]/8 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[#34D399]" />
            </div>
            <div className="absolute inset-0 rounded-full bg-[#34D399]/10 blur-xl animate-pulse" />
          </div>

          <span className="font-mono text-xs text-[#34D399] uppercase tracking-widest mb-4 block">
            Verified
          </span>
          <h1 className="font-['DM_Serif_Display'] text-4xl lg:text-5xl text-white mb-4">
            Identity confirmed.
          </h1>
          <p className="text-white/40 mb-10 max-w-sm mx-auto leading-relaxed">
            Your Proof of Humanity is on-chain. You can now create and manage milestone-based campaigns.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/campaign/create"
              className="inline-flex items-center gap-2 bg-[#34D399] text-black font-semibold px-7 py-3.5 rounded-full text-sm hover:bg-[#10B981] transition-colors"
            >
              Create Campaign <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 border border-white/15 text-white/70 px-7 py-3.5 rounded-full text-sm hover:border-white/30 hover:text-white transition-all"
            >
              Go to Dashboard
            </Link>
          </div>

          {/* Address */}
          <div className="mt-12 border border-white/6 rounded-xl bg-[#0F1D32] px-5 py-4 inline-block">
            <p className="text-xs text-white/30 font-mono mb-1 uppercase tracking-widest">Verified Address</p>
            <p className="text-xs font-mono text-[#34D399] break-all">{address}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Pending ──
  if (hasRequested || requestSuccess) {
    return (
      <div className="min-h-screen bg-[#0A1628] text-white">
        <div className="mx-auto max-w-2xl px-6 py-20 lg:py-28 text-center">
          <div className="relative inline-flex mb-8">
            <div className="w-20 h-20 rounded-full border border-yellow-500/30 bg-yellow-500/6 flex items-center justify-center">
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
            <div className="absolute inset-0 rounded-full bg-yellow-500/8 blur-xl animate-pulse" />
          </div>

          <span className="font-mono text-xs text-yellow-400 uppercase tracking-widest mb-4 block">
            Under Review
          </span>
          <h1 className="font-['DM_Serif_Display'] text-4xl lg:text-5xl text-white mb-4">
            Request submitted.
          </h1>
          <p className="text-white/40 mb-10 max-w-sm mx-auto leading-relaxed">
            Your verification request is on-chain. An admin will review and approve it shortly.
          </p>

          {/* Timeline */}
          <div className="border border-white/6 rounded-xl bg-[#0F1D32] p-6 text-left max-w-sm mx-auto mb-8">
            <div className="space-y-4">
              {[
                { label: "Request submitted", done: true },
                { label: "Admin review", done: false },
                { label: "Verification approved", done: false },
              ].map(({ label, done }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${done ? 'border-[#34D399] bg-[#34D399]/15' : 'border-white/15'}`}>
                    {done && <CheckCircle2 className="w-3 h-3 text-[#34D399]" />}
                  </div>
                  <span className={`text-sm ${done ? 'text-white/70' : 'text-white/25'}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-white/6 rounded-xl bg-[#0F1D32] px-5 py-4 inline-block">
            <p className="text-xs text-white/30 font-mono mb-1 uppercase tracking-widest">Your Address</p>
            <p className="text-xs font-mono text-white/50 break-all">{address}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Default: request verification ──
  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:py-16">

        {/* Header */}
        <div className="mb-12">
          <span className="font-mono text-xs text-[#34D399] uppercase tracking-widest mb-3 block">
            Identity
          </span>
          <h1 className="font-['DM_Serif_Display'] text-4xl lg:text-5xl mb-4">
            Proof of Humanity
          </h1>
          <p className="text-white/40 max-w-md leading-relaxed">
            Required to launch campaigns. Prevents scams, builds donor trust,
            and ensures accountability on-chain.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

          {/* ── Left: Steps ── */}
          <div className="lg:col-span-3 space-y-4">
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-5">How it works</p>
            {steps.map(({ num, title, desc }, i) => (
              <div
                key={num}
                className="border border-white/8 rounded-xl bg-[#0F1D32] p-6 flex gap-5 group hover:border-white/14 transition-colors"
              >
                <span className="font-mono text-xs text-white/20 pt-0.5 shrink-0 w-6">{num}</span>
                <div>
                  <h3 className="font-semibold text-white mb-1.5">{title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
                </div>
                {i === 0 && (
                  <div className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full bg-[#34D399] mt-1.5 animate-pulse" />
                )}
              </div>
            ))}
          </div>

          {/* ── Right: Action card ── */}
          <div className="lg:col-span-2 lg:sticky lg:top-24">
            <div className="border border-white/8 rounded-xl bg-[#0F1D32] p-6 lg:p-7">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full border border-[#34D399]/25 bg-[#34D399]/6 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[#34D399]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Verify Identity</p>
                  <p className="text-xs text-white/30">One-time on-chain request</p>
                </div>
              </div>

              <div className="border border-white/6 rounded-lg bg-white/3 px-4 py-3 mb-6">
                <p className="text-xs text-white/30 font-mono mb-1 uppercase tracking-widest">Your Wallet</p>
                <p className="text-xs font-mono text-white/60 break-all">{address}</p>
              </div>

              <div className="space-y-3 mb-6">
                {["Free to submit", "Admin-reviewed", "Permanent on-chain"].map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
                    <span className="text-sm text-white/50">{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={requestVerification}
                disabled={isPending || isConfirming}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#34D399] text-black font-semibold px-6 py-3.5 rounded-xl text-sm hover:bg-[#10B981] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isPending || isConfirming ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                ) : (
                  <><Shield className="w-4 h-4" /> Request Verification</>
                )}
              </button>

              <p className="text-center text-xs text-white/20 font-mono mt-3">
                Transaction signed via your wallet
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
