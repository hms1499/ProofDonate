/**
 * DonateForm — Supports both CELO (direct) and cUSD (swap + donate) donations
 *
 * CELO flow: 1 transaction (donate directly)
 * cUSD flow: 3 transactions (approve → swap → donate)
 *   Step 1: Approve cUSD for Uniswap SwapRouter
 *   Step 2: Swap cUSD → CELO via Uniswap V3 multicall
 *   Step 3: Donate received CELO to ProofDonate contract
 */

"use client";

import { useState, useEffect } from "react";
import { parseEther, formatEther } from "viem";
import { useDonate } from "@/hooks/useProofDonate";
import { useSwapQuote, useCUSDApproval, useSwapExecution } from "@/hooks/useSwapToCelo";
import { applySlippage } from "@/lib/swap";
import { useAccount, useBalance } from "wagmi";
import { Loader2, Wallet, Check, ArrowRight, ArrowDownUp } from "lucide-react";

type TokenType = "CELO" | "cUSD";

interface DonateFormProps {
  campaignId: bigint;
  onSuccess?: () => void;
}

const QUICK_AMOUNTS: Record<TokenType, string[]> = {
  CELO: ["0.1", "0.5", "1", "5"],
  cUSD: ["0.5", "1", "5", "10"],
};

export function DonateForm({ campaignId, onSuccess }: DonateFormProps) {
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<TokenType>("CELO");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { address, isConnected } = useAccount();

  // Parse amount
  const parsedAmount = amount ? parseEther(amount) : 0n;

  // --- CELO direct donate ---
  const {
    donate,
    isPending: isDonating,
    isConfirming: isDonateConfirming,
    isSuccess: isDonateSuccess,
  } = useDonate();

  // --- cUSD swap flow ---
  // Step 1: Get quote — how much CELO will we get?
  const { quote: celoQuote, isLoading: isQuoting } = useSwapQuote(
    token === "cUSD" ? parsedAmount : 0n
  );
  const minCeloOut = applySlippage(celoQuote);

  // Step 2: Approve cUSD for SwapRouter
  const {
    needsApproval,
    balance: cusdBalance,
    requestApproval,
    isApproving,
    isApproved,
  } = useCUSDApproval(parsedAmount);

  // Step 3: Execute swap
  const {
    executeSwap,
    isSwapping,
    isSwapSuccess,
  } = useSwapExecution();

  // CELO balance
  const { data: celoBalance } = useBalance({ address });

  // Auto-advance steps for cUSD flow
  useEffect(() => {
    if (token !== "cUSD") return;
    if (isApproved && step === 1) setStep(2);
  }, [isApproved, step, token]);

  useEffect(() => {
    if (token !== "cUSD") return;
    if (isSwapSuccess && step === 2) setStep(3);
  }, [isSwapSuccess, step, token]);

  // Reset on success
  useEffect(() => {
    if (isDonateSuccess) {
      setAmount("");
      setStep(1);
      onSuccess?.();
    }
  }, [isDonateSuccess, onSuccess]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
          <Wallet className="h-4 w-4 text-white/30" />
        </div>
        <p className="text-sm text-white/40 text-center">
          Connect your wallet to donate.
        </p>
      </div>
    );
  }

  // --- Handlers ---
  const handleCeloDonate = () => {
    if (parsedAmount > 0n) donate(campaignId, parsedAmount);
  };

  const handleCUSDStep = () => {
    if (step === 1) {
      // Approve cUSD
      if (needsApproval) {
        requestApproval();
      } else {
        setStep(2);
      }
    } else if (step === 2) {
      // Swap cUSD → CELO
      executeSwap(parsedAmount, minCeloOut);
    } else if (step === 3) {
      // Donate CELO (use the swap output amount)
      if (minCeloOut > 0n) donate(campaignId, minCeloOut);
    }
  };

  const isProcessing = isDonating || isDonateConfirming || isApproving || isSwapping;
  const hasValidAmount = amount && parsedAmount > 0n;

  // Check insufficient balance
  const insufficientBalance =
    token === "CELO"
      ? celoBalance && parsedAmount > celoBalance.value
      : cusdBalance !== undefined && parsedAmount > cusdBalance;

  return (
    <div className="space-y-5">
      {/* Token selector */}
      <div className="grid grid-cols-2 gap-2">
        {(["CELO", "cUSD"] as TokenType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setToken(t);
              setAmount("");
              setStep(1);
            }}
            disabled={isProcessing}
            className={`py-2.5 rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-2 ${
              token === t
                ? "bg-[#35D07F]/15 border border-[#35D07F]/40 text-[#35D07F]"
                : "bg-white/5 border border-white/8 text-white/50 hover:border-white/15"
            } disabled:opacity-40`}
          >
            {t === "cUSD" && <ArrowDownUp className="h-3 w-3" />}
            {t}
          </button>
        ))}
      </div>

      {/* Balance display */}
      <div className="text-[10px] font-mono text-white/25 text-right">
        Balance:{" "}
        {token === "CELO"
          ? celoBalance
            ? `${Number(celoBalance.formatted).toFixed(4)} CELO`
            : "..."
          : cusdBalance !== undefined
            ? `${Number(formatEther(cusdBalance)).toFixed(2)} cUSD`
            : "..."}
      </div>

      {/* Quick amount buttons */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS[token].map((qa) => (
          <button
            key={qa}
            type="button"
            onClick={() => setAmount(qa)}
            disabled={isProcessing}
            className={`py-2 rounded-lg text-xs font-mono transition-all ${
              amount === qa
                ? "bg-[#35D07F]/15 border border-[#35D07F]/40 text-[#35D07F]"
                : "bg-white/5 border border-white/8 text-white/50 hover:border-white/15 hover:text-white/70"
            } disabled:opacity-40`}
          >
            {qa}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div>
        <label className="text-xs font-mono text-white/30 uppercase tracking-widest mb-2 block">
          Amount ({token})
        </label>
        <input
          type="number"
          min="0.02"
          step="0.01"
          placeholder={token === "CELO" ? "0.02" : "0.50"}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            if (token === "cUSD") setStep(1);
          }}
          disabled={isProcessing}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#35D07F]/50 focus:ring-1 focus:ring-[#35D07F]/20 disabled:opacity-50 font-mono transition-colors"
        />
        {token === "CELO" && (
          <p className="text-[10px] text-white/20 mt-1.5 font-mono">
            Minimum: 0.02 CELO
          </p>
        )}
      </div>

      {/* cUSD: Show swap quote */}
      {token === "cUSD" && hasValidAmount && (
        <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/30 font-mono">You swap</span>
            <span className="text-white/60 font-mono">
              {amount} cUSD
            </span>
          </div>
          <div className="flex items-center justify-center">
            <ArrowRight className="h-3 w-3 text-[#35D07F]/50" />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/30 font-mono">You donate</span>
            <span className="text-white/60 font-mono">
              {isQuoting
                ? "..."
                : celoQuote > 0n
                  ? `≈ ${Number(formatEther(celoQuote)).toFixed(4)} CELO`
                  : "No liquidity"}
            </span>
          </div>
          <p className="text-[10px] text-white/15 font-mono text-center">
            1% slippage protection via Uniswap V3
          </p>
        </div>
      )}

      {/* cUSD: Step indicator */}
      {token === "cUSD" && hasValidAmount && (
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono ${
                  step > s
                    ? "bg-[#35D07F]/20 text-[#35D07F]"
                    : step === s
                      ? "bg-[#35D07F] text-black"
                      : "bg-white/5 text-white/25"
                }`}
              >
                {step > s ? <Check className="h-3 w-3" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-px mx-1 ${
                    step > s ? "bg-[#35D07F]/30" : "bg-white/8"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {token === "cUSD" && hasValidAmount && (
        <div className="flex justify-between text-[10px] font-mono text-white/20 -mt-3">
          <span>Approve</span>
          <span>Swap</span>
          <span>Donate</span>
        </div>
      )}

      {/* Action button */}
      {token === "CELO" ? (
        // Direct CELO donate
        <button
          onClick={handleCeloDonate}
          disabled={
            isProcessing || !hasValidAmount || !!insufficientBalance
          }
          className="w-full group inline-flex items-center justify-center gap-2 bg-[#35D07F] text-black font-semibold px-6 py-3.5 rounded-full hover:bg-[#2bb86e] transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isDonating || isDonateConfirming ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Confirming...
            </>
          ) : insufficientBalance ? (
            "Insufficient CELO"
          ) : (
            "Donate CELO"
          )}
        </button>
      ) : (
        // cUSD multi-step flow
        <button
          onClick={handleCUSDStep}
          disabled={
            isProcessing ||
            !hasValidAmount ||
            !!insufficientBalance ||
            (step === 2 && celoQuote === 0n)
          }
          className="w-full group inline-flex items-center justify-center gap-2 bg-[#35D07F] text-black font-semibold px-6 py-3.5 rounded-full hover:bg-[#2bb86e] transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isApproving
                ? "Approving..."
                : isSwapping
                  ? "Swapping..."
                  : "Confirming..."}
            </>
          ) : insufficientBalance ? (
            "Insufficient cUSD"
          ) : step === 1 ? (
            needsApproval ? (
              "Step 1: Approve cUSD"
            ) : (
              "Step 1: Continue →"
            )
          ) : step === 2 ? (
            "Step 2: Swap to CELO"
          ) : (
            "Step 3: Donate CELO"
          )}
        </button>
      )}

      {/* Success message */}
      {isDonateSuccess && (
        <div className="text-center py-2 px-3 rounded-lg bg-[#35D07F]/10 border border-[#35D07F]/20">
          <p className="text-sm text-[#35D07F] font-medium">
            Donation successful! Thank you.
          </p>
        </div>
      )}
    </div>
  );
}
