"use client";

import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useIsVerified,
  useVerificationRequested,
  useRequestVerification,
} from "@/hooks/useProofDonate";
import { CheckCircle, ShieldCheck, Loader2, Clock } from "lucide-react";

export default function VerifyPage() {
  const { address, isConnected } = useAccount();
  const { data: isVerified, isLoading: isLoadingVerified } = useIsVerified(address);
  const { data: hasRequested, isLoading: isLoadingRequested } =
    useVerificationRequested(address);
  const {
    requestVerification,
    isPending,
    isConfirming,
    isSuccess: requestSuccess,
  } = useRequestVerification();

  if (!isConnected) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-4">Proof of Humanity</h1>
        <p className="text-muted-foreground">
          Connect your wallet to verify your identity.
        </p>
      </div>
    );
  }

  if (isLoadingVerified || isLoadingRequested) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">You are Verified!</h1>
        <p className="text-muted-foreground">
          Your humanity has been verified. You can now create campaigns.
        </p>
      </div>
    );
  }

  if (hasRequested || requestSuccess) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Verification Pending</h1>
        <p className="text-muted-foreground mb-4">
          Your request has been submitted. Please wait for the admin to approve.
        </p>
        <p className="text-sm text-muted-foreground">
          Your address: <code className="text-xs">{address}</code>
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Proof of Humanity
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Verify Your Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            To create campaigns on ProofDonate, you need to verify your
            identity. This prevents scam campaigns and builds trust with
            donors.
          </p>

          <div className="p-4 rounded-lg border bg-secondary/30">
            <h3 className="font-medium mb-1">How it works</h3>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Click the button below to submit your verification request</li>
              <li>The admin will review and approve your request</li>
              <li>Once approved, you can create campaigns</li>
            </ol>
          </div>

          <Button
            onClick={requestVerification}
            disabled={isPending || isConfirming}
            className="w-full"
            size="lg"
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Request Verification"
            )}
          </Button>

          <div className="text-sm text-muted-foreground border-t pt-4">
            <p>
              <strong>Your address:</strong>{" "}
              <code className="text-xs">{address}</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
