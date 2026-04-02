"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useCreateCampaign,
  useIsVerified,
  useCampaignCount,
} from "@/hooks/useProofDonate";
import { Plus, Trash2, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";

interface MilestoneInput {
  description: string;
  amount: string;
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: isVerified, isLoading: isCheckingVerification } =
    useIsVerified(address);
  const { data: campaignCount } = useCampaignCount();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("30");
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { description: "", amount: "" },
  ]);

  const { createCampaign, isPending, isConfirming, isSuccess, error } =
    useCreateCampaign();

  useEffect(() => {
    if (isSuccess && campaignCount !== undefined) {
      router.push(`/campaign/${Number(campaignCount) - 1}`);
    }
  }, [isSuccess, campaignCount, router]);

  const addMilestone = () => {
    if (milestones.length < 10) {
      setMilestones([...milestones, { description: "", amount: "" }]);
    }
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const updateMilestone = (
    index: number,
    field: keyof MilestoneInput,
    value: string
  ) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const milestoneSum = milestones.reduce(
    (sum, m) => sum + (parseFloat(m.amount) || 0),
    0
  );
  const targetNum = parseFloat(targetAmount) || 0;
  const milestoneMismatch =
    targetNum > 0 && milestoneSum > 0 && Math.abs(milestoneSum - targetNum) > 0.001;

  const isFormValid =
    title.trim() &&
    description.trim() &&
    targetNum > 0 &&
    milestones.every((m) => m.description.trim() && parseFloat(m.amount) > 0) &&
    !milestoneMismatch;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const deadline = BigInt(
      Math.floor(Date.now() / 1000) + parseInt(deadlineDays) * 86400
    );

    createCampaign(
      title,
      description,
      parseEther(targetAmount),
      milestones.map((m) => m.description),
      milestones.map((m) => parseEther(m.amount)),
      deadline
    );
  };

  if (!isConnected) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Create Campaign</h1>
        <p className="text-muted-foreground">
          Please connect your wallet to create a campaign.
        </p>
      </div>
    );
  }

  if (isCheckingVerification) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <ShieldAlert className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Verification Required</h1>
        <p className="text-muted-foreground mb-6">
          You must verify your humanity before creating a campaign.
        </p>
        <Button asChild>
          <Link href="/verify">Verify Now</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Create Campaign</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Campaign title"
                maxLength={100}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your campaign and how the funds will be used"
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Target Amount (cUSD)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="1000"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Duration (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Milestones</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMilestone}
                disabled={milestones.length >= 10}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Milestone amounts must equal the target amount.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={milestone.description}
                    onChange={(e) =>
                      updateMilestone(index, "description", e.target.value)
                    }
                    placeholder={`Milestone ${index + 1}`}
                    className="col-span-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={milestone.amount}
                    onChange={(e) =>
                      updateMilestone(index, "amount", e.target.value)
                    }
                    placeholder="Amount"
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                {milestones.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMilestone(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}

            {milestoneMismatch && (
              <p className="text-sm text-destructive">
                Milestone total ({milestoneSum.toFixed(2)}) must equal target (
                {targetNum.toFixed(2)})
              </p>
            )}
          </CardContent>
        </Card>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!isFormValid || isPending || isConfirming}
        >
          {isPending || isConfirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Campaign"
          )}
        </Button>

        {error && (
          <p className="text-sm text-destructive text-center">
            Error: {error.message.slice(0, 100)}
          </p>
        )}
      </form>
    </div>
  );
}
