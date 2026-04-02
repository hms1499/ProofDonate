"use client";

import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useContractOwner,
  useVerifyHuman,
  useIsVerified,
} from "@/hooks/useProofDonate";
import { PROOF_DONATE_ABI, PROOF_DONATE_ADDRESS } from "@/lib/contracts";
import { truncateAddress } from "@/lib/app-utils";
import { ShieldAlert, Loader2, CheckCircle, UserCheck } from "lucide-react";
import { usePublicClient } from "wagmi";
import { parseAbiItem } from "viem";

function PendingRequestRow({ address: userAddress }: { address: `0x${string}` }) {
  const { data: isVerified, isLoading } = useIsVerified(userAddress);
  const { verifyHuman, isPending, isConfirming, isSuccess } = useVerifyHuman();

  if (isLoading) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (isVerified || isSuccess) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border bg-green-50 dark:bg-green-950/20">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <code className="text-sm">{truncateAddress(userAddress)}</code>
        </div>
        <span className="text-sm text-green-600 font-medium">Approved</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <code className="text-sm">{truncateAddress(userAddress)}</code>
      <Button
        size="sm"
        onClick={() => verifyHuman(userAddress)}
        disabled={isPending || isConfirming}
      >
        {isPending || isConfirming ? (
          <>
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Approving...
          </>
        ) : (
          <>
            <UserCheck className="mr-1 h-3 w-3" />
            Approve
          </>
        )}
      </Button>
    </div>
  );
}

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { data: ownerAddress, isLoading: isLoadingOwner } = useContractOwner();
  const publicClient = usePublicClient();
  const [pendingAddresses, setPendingAddresses] = useState<`0x${string}`[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  const isOwner =
    address && ownerAddress
      ? address.toLowerCase() === (ownerAddress as string).toLowerCase()
      : false;

  useEffect(() => {
    async function fetchRequests() {
      if (!publicClient || !isOwner) return;

      try {
        const logs = await publicClient.getLogs({
          address: PROOF_DONATE_ADDRESS,
          event: parseAbiItem("event VerificationRequested(address indexed user)"),
          fromBlock: 0n,
        });

        const addresses = logs.map(
          (log) => log.args.user as `0x${string}`
        );

        const unique = [...new Set(addresses.map((a) => a.toLowerCase()))].map(
          (a) => a as `0x${string}`
        );

        setPendingAddresses(unique);
      } catch (error) {
        console.error("Failed to fetch verification requests:", error);
      } finally {
        setIsLoadingEvents(false);
      }
    }

    fetchRequests();
  }, [publicClient, isOwner]);

  if (!isConnected) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
        <p className="text-muted-foreground">
          Connect your wallet to access the admin panel.
        </p>
      </div>
    );
  }

  if (isLoadingOwner) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">
          Only the contract owner can access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Verification Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingEvents ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Loading requests...
              </p>
            </div>
          ) : pendingAddresses.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No verification requests yet.
            </p>
          ) : (
            <div className="space-y-2">
              {pendingAddresses.map((addr) => (
                <PendingRequestRow key={addr} address={addr} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
