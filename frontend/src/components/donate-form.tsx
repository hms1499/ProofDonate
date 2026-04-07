"use client";

import { useState, useEffect } from "react";
import { parseEther } from "viem";
import { useDonate } from "@/hooks/useProofDonate";
import { useAccount } from "wagmi";
import { Loader2, Wallet } from "lucide-react";

interface DonateFormProps {
  campaignId: bigint;
  onSuccess?: () => void;
}

const QUICK_AMOUNTS = ["0.1", "0.5", "1", "5"];

export function DonateForm({ campaignId, onSuccess }: DonateFormProps) {
  const [amount, setAmount] = useState("");
  const { isConnected } = useAccount();
  const parsedAmount = amount ? parseEther(amount) : 0n;

  const {
    donate,
    isPending: isDonating,
    isConfirming: isDonateConfirming,
    isSuccess: isDonateSuccess,
  } = useDonate();

  useEffect(() => {
    if (isDonateSuccess) {
      setAmount("");
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

  const handleDonate = () => {
    if (parsedAmount > 0n) {
      donate(campaignId, parsedAmount);
    }
  };

  const isProcessing = isDonating || isDonateConfirming;

  return (
    <div className="space-y-5">
      {/* Quick amount buttons */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map((qa) => (
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

      {/* Custom amount input */}
      <div>
        <label className="text-xs font-mono text-white/30 uppercase tracking-widest mb-2 block">
          Amount (CELO)
        </label>
        <input
          type="number"
          min="0.02"
          step="0.01"
          placeholder="0.02"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isProcessing}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#35D07F]/50 focus:ring-1 focus:ring-[#35D07F]/20 disabled:opacity-50 font-mono transition-colors"
        />
        <p className="text-[10px] text-white/20 mt-1.5 font-mono">
          Minimum: 0.02 CELO
        </p>
      </div>

      {/* Donate button */}
      <button
        onClick={handleDonate}
        disabled={isProcessing || !amount || parsedAmount === 0n}
        className="w-full group inline-flex items-center justify-center gap-2 bg-[#35D07F] text-black font-semibold px-6 py-3.5 rounded-full hover:bg-[#2bb86e] transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isDonating || isDonateConfirming ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Confirming...
          </>
        ) : (
          "Donate Now"
        )}
      </button>

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
