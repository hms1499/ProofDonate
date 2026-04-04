"use client";

import { useState, useEffect } from "react";
import { parseEther } from "viem";
import { Button } from "@/components/ui/button";
import { useDonate } from "@/hooks/useProofDonate";
import { useAccount } from "wagmi";
import { Loader2 } from "lucide-react";

interface DonateFormProps {
  campaignId: bigint;
  onSuccess?: () => void;
}

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
      <p className="text-sm text-muted-foreground">
        Connect your wallet to donate.
      </p>
    );
  }

  const handleDonate = () => {
    if (parsedAmount > 0n) {
      donate(campaignId, parsedAmount);
    }
  };

  const isProcessing = isDonating || isDonateConfirming;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">
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
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground mt-1">Minimum: 0.02 CELO</p>
      </div>

      <Button
        onClick={handleDonate}
        disabled={isProcessing || !amount || parsedAmount === 0n}
        className="w-full"
      >
        {isDonating || isDonateConfirming ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Donating...
          </>
        ) : (
          "Donate"
        )}
      </Button>

      {isDonateSuccess && (
        <p className="text-sm text-green-600 font-medium">
          Donation successful! Thank you.
        </p>
      )}
    </div>
  );
}
