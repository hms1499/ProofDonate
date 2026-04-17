"use client";

import { useState, useEffect } from "react";
import { parseEther, formatEther } from "viem";
import { useDonate } from "@/hooks/useProofDonate";
import { useDonationTokenApproval } from "@/hooks/useDonationTokenApproval";
import { useAccount } from "wagmi";
import { Loader2, Wallet, Check } from "lucide-react";

interface DonateFormProps {
  campaignId: bigint;
  onSuccess?: () => void;
}

const QUICK_AMOUNTS = ["0.5", "1", "5", "10"];

export function DonateForm({ campaignId, onSuccess }: DonateFormProps) {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const { address, isConnected } = useAccount();

  const parsedAmount = amount ? parseEther(amount) : 0n;

  // Donate hook
  const {
    donate,
    isPending: isDonating,
    isConfirming: isDonateConfirming,
    isSuccess: isDonateSuccess,
  } = useDonate();

  // Approval hook
  const {
    needsApproval,
    balance: cusdBalance,
    approve,
    isApproving,
    isApproved,
    refetchAllowance,
  } = useDonationTokenApproval(parsedAmount);

  // Auto-advance from step 1 to step 2 after approval
  useEffect(() => {
    if (isApproved && step === 1) {
      refetchAllowance();
      setStep(2);
    }
  }, [isApproved, step, refetchAllowance]);

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

  const handleStep = () => {
    if (step === 1) {
      if (needsApproval) {
        approve();
      } else {
        setStep(2);
      }
    } else if (step === 2) {
      if (parsedAmount > 0n) donate(campaignId, parsedAmount);
    }
  };

  const isProcessing = isDonating || isDonateConfirming || isApproving;
  const hasValidAmount = amount && parsedAmount > 0n;
  const insufficientBalance =
    cusdBalance !== undefined && parsedAmount > cusdBalance;

  return (
    <div className="space-y-5">
      {/* Balance display */}
      <div className="text-[10px] font-mono text-white/25 text-right">
        Balance:{" "}
        {cusdBalance !== undefined
          ? `${Number(formatEther(cusdBalance)).toFixed(2)} cUSD`
          : "..."}
      </div>

      {/* Quick amount buttons */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map((qa) => (
          <button
            key={qa}
            type="button"
            onClick={() => {
              setAmount(qa);
              setStep(1);
            }}
            disabled={isProcessing}
            className={`py-2 rounded-lg text-xs font-mono transition-all ${
              amount === qa
                ? "bg-[#34D399]/15 border border-[#34D399]/40 text-[#34D399]"
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
          Amount (cUSD)
        </label>
        <input
          type="number"
          min="0.2"
          step="0.1"
          placeholder="0.20"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setStep(1);
          }}
          disabled={isProcessing}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#34D399]/50 focus:ring-1 focus:ring-[#34D399]/20 disabled:opacity-50 font-mono transition-colors"
        />
        <p className="text-[10px] text-white/20 mt-1.5 font-mono">
          Minimum: 0.2 cUSD
        </p>
      </div>

      {/* Step indicator */}
      {hasValidAmount && (
        <div className="flex items-center gap-1">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono ${
                  step > s
                    ? "bg-[#34D399]/20 text-[#34D399]"
                    : step === s
                      ? "bg-[#34D399] text-black"
                      : "bg-white/5 text-white/25"
                }`}
              >
                {step > s ? <Check className="h-3 w-3" /> : s}
              </div>
              {s < 2 && (
                <div
                  className={`flex-1 h-px mx-1 ${
                    step > s ? "bg-[#34D399]/30" : "bg-white/8"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {hasValidAmount && (
        <div className="flex justify-between text-[10px] font-mono text-white/20 -mt-3 px-1">
          <span>Approve</span>
          <span>Donate</span>
        </div>
      )}

      {/* Action button */}
      <button
        onClick={handleStep}
        disabled={isProcessing || !hasValidAmount || !!insufficientBalance}
        className="w-full group inline-flex items-center justify-center gap-2 bg-[#34D399] text-black font-semibold px-6 py-3.5 rounded-full hover:bg-[#10B981] transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {isApproving ? "Approving..." : "Confirming..."}
          </>
        ) : insufficientBalance ? (
          "Insufficient cUSD"
        ) : step === 1 ? (
          needsApproval ? "Step 1: Approve cUSD" : "Step 1: Continue →"
        ) : (
          "Step 2: Donate cUSD"
        )}
      </button>

      {/* Success message */}
      {isDonateSuccess && (
        <div className="text-center py-2 px-3 rounded-lg bg-[#34D399]/10 border border-[#34D399]/20">
          <p className="text-sm text-[#34D399] font-medium">
            Donation successful! Thank you.
          </p>
        </div>
      )}
    </div>
  );
}
