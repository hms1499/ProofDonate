"use client";

import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsVerified } from "@/hooks/useProofDonate";
import { CheckCircle, ShieldCheck, Loader2 } from "lucide-react";

export default function VerifyPage() {
  const { address, isConnected } = useAccount();
  const { data: isVerified, isLoading } = useIsVerified(address);

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

  if (isLoading) {
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

          <div className="space-y-4">
            <div className="p-4 rounded-lg border bg-secondary/30">
              <h3 className="font-medium mb-1">Self Protocol</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Verify using your passport or government ID via the Self app.
              </p>
              <div className="bg-background rounded-lg p-8 border-2 border-dashed border-muted-foreground/30 text-center">
                <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Self Protocol QR Code will appear here.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Scan with the Self app on your phone to verify.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-secondary/30">
              <h3 className="font-medium mb-1">Other Options</h3>
              <p className="text-sm text-muted-foreground">
                Worldcoin and Coinbase verification coming soon.
              </p>
            </div>
          </div>

          <div className="text-sm text-muted-foreground border-t pt-4">
            <p>
              <strong>Your address:</strong>{" "}
              <code className="text-xs">{address}</code>
            </p>
            <p className="mt-1">
              Verification status is stored on-chain and linked to your
              wallet address.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
