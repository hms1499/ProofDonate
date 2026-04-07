/**
 * Swap Page — CELO ↔ cUSD bidirectional swap via Uniswap V3
 *
 * Features:
 * - Toggle swap direction with one click
 * - Real-time quote from Uniswap V3 QuoterV2
 * - Slippage protection (1%)
 * - Auto approve for cUSD → CELO direction
 * - Matches dark theme of the rest of the app
 */

"use client";

import { useState, useEffect } from "react";
import { parseEther, formatEther } from "viem";
import { useAccount } from "wagmi";
import { useSwap, useSwapQuote, type SwapDirection } from "@/hooks/useSwap";
import { applySlippage } from "@/lib/swap";
import {
  ArrowDownUp,
  Loader2,
  Check,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function SwapPage() {
  const { isConnected } = useAccount();
  const [direction, setDirection] = useState<SwapDirection>("CELO_TO_CUSD");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "swapping" | "done">(
    "idle"
  );

  const parsedAmount = amount ? parseEther(amount) : 0n;

  // Determine token labels
  const fromToken = direction === "CELO_TO_CUSD" ? "CELO" : "cUSD";
  const toToken = direction === "CELO_TO_CUSD" ? "cUSD" : "CELO";

  // Quote
  const { quote, isLoading: isQuoting } = useSwapQuote(direction, parsedAmount);
  const minOut = applySlippage(quote);

  // Swap hook
  const {
    celoBalance,
    cusdBalance,
    needsApproval,
    approveCUSD,
    approveCELO,
    swapCELOtoCUSD,
    swapCUSDtoCELO,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
    txHash,
  } = useSwap();

  const isProcessing = isPending || isConfirming;

  // Format balances
  const fromBalance =
    direction === "CELO_TO_CUSD"
      ? celoBalance
        ? Number(celoBalance.formatted).toFixed(4)
        : "..."
      : cusdBalance !== undefined
        ? Number(formatEther(cusdBalance)).toFixed(2)
        : "...";

  const toBalance =
    direction === "CELO_TO_CUSD"
      ? cusdBalance !== undefined
        ? Number(formatEther(cusdBalance)).toFixed(2)
        : "..."
      : celoBalance
        ? Number(celoBalance.formatted).toFixed(4)
        : "...";

  // Check insufficient balance
  const insufficientBalance =
    direction === "CELO_TO_CUSD"
      ? celoBalance && parsedAmount > celoBalance.value
      : cusdBalance !== undefined && parsedAmount > cusdBalance;

  // Handle success: reset form
  useEffect(() => {
    if (isSuccess) {
      setStep("done");
      // Auto-reset after 3 seconds
      const timer = setTimeout(() => {
        setAmount("");
        setStep("idle");
        reset();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, reset]);

  // Toggle direction
  const flipDirection = () => {
    setDirection((d) =>
      d === "CELO_TO_CUSD" ? "CUSD_TO_CELO" : "CELO_TO_CUSD"
    );
    setAmount("");
    setStep("idle");
    reset();
  };

  // Track which direction the approval was for
  const [approvalDirection, setApprovalDirection] = useState<SwapDirection | null>(null);

  // Execute swap — both directions need ERC-20 approval on Celo L2
  const handleSwap = () => {
    if (!parsedAmount || parsedAmount === 0n) return;

    if (needsApproval(direction, parsedAmount)) {
      setStep("approving");
      setApprovalDirection(direction);
      if (direction === "CUSD_TO_CELO") {
        approveCUSD(parsedAmount);
      } else {
        approveCELO(parsedAmount);
      }
    } else {
      setStep("swapping");
      if (direction === "CUSD_TO_CELO") {
        swapCUSDtoCELO(parsedAmount, minOut);
      } else {
        swapCELOtoCUSD(parsedAmount, minOut);
      }
    }
  };

  // After approval succeeds, auto-execute swap
  useEffect(() => {
    if (isSuccess && step === "approving" && approvalDirection) {
      setStep("swapping");
      reset();
      const dir = approvalDirection;
      setApprovalDirection(null);
      setTimeout(() => {
        if (dir === "CUSD_TO_CELO") {
          swapCUSDtoCELO(parsedAmount, minOut);
        } else {
          swapCELOtoCUSD(parsedAmount, minOut);
        }
      }, 500);
    }
  }, [isSuccess, step]);

  // Quick percentage presets
  const percentPresets = [
    { label: "25%", pct: 25 },
    { label: "50%", pct: 50 },
    { label: "75%", pct: 75 },
    { label: "MAX", pct: 100 },
  ];

  const fromBalanceRaw =
    direction === "CELO_TO_CUSD"
      ? celoBalance?.value ?? 0n
      : cusdBalance ?? 0n;

  const getAmountFromPercent = (pct: number): string => {
    if (fromBalanceRaw === 0n) return "0";
    const amt = (fromBalanceRaw * BigInt(pct)) / 100n;
    return formatEther(amt);
  };

  // Rate display
  const rate =
    parsedAmount > 0n && quote > 0n
      ? (Number(formatEther(quote)) / Number(formatEther(parsedAmount))).toFixed(
          4
        )
      : null;

  return (
    <div className="flex-1 bg-[#0a0a0a] text-white min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#35D07F]/3 rounded-full blur-[160px] animate-glow" />
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.02]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="swap-grid"
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
          <rect width="100%" height="100%" fill="url(#swap-grid)" />
        </svg>
      </div>

      <div className="relative container max-w-lg mx-auto px-6 pt-8 pb-20">
        {/* Header */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/40 hover:text-white text-xs font-mono uppercase tracking-widest transition-colors mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>

        <div className="text-center mb-10">
          <span className="font-mono text-xs text-[#35D07F] uppercase tracking-widest mb-3 block">
            Swap
          </span>
          <h1 className="font-['DM_Serif_Display'] text-4xl mb-2">
            CELO <span className="text-white/20">↔</span> cUSD
          </h1>
          <p className="text-white/35 text-sm">
            Swap via Uniswap V3 on Celo mainnet
          </p>
        </div>

        {/* Swap card */}
        <div className="border border-white/8 rounded-2xl overflow-hidden bg-[#0d0d0d]">
          {/* Accent line */}
          <div
            className="h-1"
            style={{
              background: "linear-gradient(90deg, #35D07F, #FCFF52)",
            }}
          />

          <div className="p-6 space-y-5">
            {!isConnected ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <ArrowDownUp className="h-6 w-6 text-white/20" />
                </div>
                <p className="text-white/40 text-sm">
                  Connect your wallet to swap.
                </p>
              </div>
            ) : (
              <>
                {/* From token */}
                <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-white/30 uppercase tracking-widest">
                      From
                    </span>
                    <span className="text-[10px] font-mono text-white/20">
                      Balance: {fromBalance}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setStep("idle");
                        reset();
                      }}
                      disabled={isProcessing}
                      className="flex-1 bg-transparent text-2xl font-['DM_Serif_Display'] text-white placeholder:text-white/15 focus:outline-none disabled:opacity-50"
                    />
                    <div className="shrink-0 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm font-mono text-white/70">
                      {fromToken}
                    </div>
                  </div>
                  {/* Quick percentage presets */}
                  <div className="grid grid-cols-4 gap-1.5 mt-3">
                    {percentPresets.map(({ label, pct }) => {
                      const pctAmount = getAmountFromPercent(pct);
                      const isActive = amount !== "" && amount === pctAmount;
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            setAmount(pctAmount);
                            setStep("idle");
                            reset();
                          }}
                          disabled={isProcessing || fromBalanceRaw === 0n}
                          className={`py-1.5 rounded-md text-[10px] font-mono transition-all ${
                            isActive
                              ? "bg-[#35D07F]/15 border border-[#35D07F]/30 text-[#35D07F]"
                              : "bg-white/[0.03] border border-white/5 text-white/30 hover:text-white/50"
                          } disabled:opacity-40`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Flip button */}
                <div className="flex justify-center -my-1">
                  <button
                    onClick={flipDirection}
                    disabled={isProcessing}
                    className="w-10 h-10 rounded-full bg-[#0d0d0d] border border-white/10 flex items-center justify-center text-white/40 hover:text-[#35D07F] hover:border-[#35D07F]/30 transition-all disabled:opacity-40 group"
                  >
                    <ArrowDownUp className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300" />
                  </button>
                </div>

                {/* To token */}
                <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-white/30 uppercase tracking-widest">
                      To
                    </span>
                    <span className="text-[10px] font-mono text-white/20">
                      Balance: {toBalance}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-2xl font-['DM_Serif_Display']">
                      {isQuoting ? (
                        <span className="text-white/20">calculating...</span>
                      ) : quote > 0n ? (
                        <span className="text-white">
                          {Number(formatEther(quote)).toFixed(4)}
                        </span>
                      ) : parsedAmount > 0n ? (
                        <span className="text-white/20">no liquidity</span>
                      ) : (
                        <span className="text-white/15">0.00</span>
                      )}
                    </div>
                    <div className="shrink-0 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm font-mono text-white/70">
                      {toToken}
                    </div>
                  </div>
                </div>

                {/* Rate & details */}
                {rate && (
                  <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-white/25">Rate</span>
                      <span className="text-white/50">
                        1 {fromToken} ≈ {rate} {toToken}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-white/25">Slippage</span>
                      <span className="text-white/50">1%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-white/25">Min. received</span>
                      <span className="text-white/50">
                        {Number(formatEther(minOut)).toFixed(4)} {toToken}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-white/25">Route</span>
                      <span className="text-white/50">
                        {fromToken} → Uniswap V3 → {toToken}
                      </span>
                    </div>
                  </div>
                )}

                {/* Insufficient balance warning */}
                {insufficientBalance && parsedAmount > 0n && (
                  <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                    <AlertCircle className="h-4 w-4 text-yellow-400 shrink-0" />
                    <p className="text-xs text-yellow-400 font-mono">
                      Insufficient {fromToken} balance. You have {fromBalance} {fromToken}.
                    </p>
                  </div>
                )}

                {/* Error message */}
                {error && step !== "done" && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                    <p className="text-xs text-red-400 font-mono">
                      {error.message.includes("user rejected")
                        ? "Transaction rejected"
                        : "Swap failed. Try again."}
                    </p>
                  </div>
                )}

                {/* Success message */}
                {step === "done" && (
                  <div className="flex items-center gap-2 rounded-lg bg-[#35D07F]/10 border border-[#35D07F]/20 p-3">
                    <Check className="h-4 w-4 text-[#35D07F] shrink-0" />
                    <p className="text-xs text-[#35D07F] font-mono">
                      Swap successful!
                    </p>
                  </div>
                )}

                {/* Swap button */}
                <button
                  onClick={handleSwap}
                  disabled={
                    isProcessing ||
                    !amount ||
                    parsedAmount === 0n ||
                    !!insufficientBalance ||
                    quote === 0n ||
                    step === "done"
                  }
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#35D07F] text-black font-semibold px-6 py-4 rounded-full hover:bg-[#2bb86e] transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {step === "approving"
                        ? `Approving ${fromToken}...`
                        : "Swapping..."}
                    </>
                  ) : insufficientBalance ? (
                    `Insufficient ${fromToken}`
                  ) : step === "done" ? (
                    <>
                      <Check className="h-4 w-4" />
                      Done
                    </>
                  ) : parsedAmount > 0n &&
                    needsApproval(direction, parsedAmount) ? (
                    "Approve & Swap"
                  ) : (
                    `Swap ${fromToken} → ${toToken}`
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info section */}
        <div className="mt-8 border border-white/5 rounded-xl p-5 bg-white/[0.01]">
          <h3 className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">
            How it works
          </h3>
          <div className="space-y-2 text-xs text-white/25 leading-relaxed">
            <p>
              <span className="text-white/50">CELO → cUSD:</span> Approve CELO
              ERC-20 then swap directly via Uniswap V3.
            </p>
            <p>
              <span className="text-white/50">cUSD → CELO:</span> Approve cUSD
              then swap directly. CELO received as native token.
            </p>
            <p>
              <span className="text-white/50">Powered by</span> Uniswap V3 on
              Celo with 0.01% pool fee and 1% slippage protection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
