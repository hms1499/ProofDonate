"use client";

import { useAccount } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  useContractOwner,
  useVerifyHuman,
  useIsVerified,
} from "@/hooks/useProofDonate";
import { PROOF_DONATE_ADDRESS, PROOF_DONATE_ABI } from "@/lib/contracts";
import { truncateAddress } from "@/lib/app-utils";
import {
  ShieldAlert,
  Loader2,
  CheckCircle,
  UserCheck,
  Shield,
  Clock,
  Users,
  Activity,
  Search,
  ChevronDown,
  Terminal,
} from "lucide-react";
import { usePublicClient } from "wagmi";

/* ── Row component ─────────────────────────────────────────────── */

function PendingRequestRow({
  address: userAddress,
  index,
  onVerified,
}: {
  address: `0x${string}`;
  index: number;
  onVerified: () => void;
}) {
  const { data: isVerified, isLoading } = useIsVerified(userAddress);
  const { verifyHuman, isPending, isConfirming, isSuccess } = useVerifyHuman();

  useEffect(() => {
    if (isSuccess) onVerified();
  }, [isSuccess, onVerified]);

  const status = isVerified || isSuccess ? "approved" : "pending";

  if (isLoading) {
    return (
      <tr
        className="animate-fade-up border-b border-white/[0.04]"
        style={{ animationDelay: `${index * 0.06}s` }}
      >
        <td colSpan={4} className="px-5 py-4">
          <div className="flex items-center gap-2 text-white/30">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs font-mono">RESOLVING…</span>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr
      className="animate-fade-up border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      {/* Index */}
      <td className="px-5 py-4">
        <span className="text-[10px] font-mono text-white/20 tabular-nums">
          {String(index + 1).padStart(3, "0")}
        </span>
      </td>

      {/* Address */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${generateColor(userAddress, 0)}, ${generateColor(userAddress, 1)})`,
            }}
          />
          <div>
            <code className="text-sm font-mono text-white/80 group-hover:text-white transition-colors">
              {truncateAddress(userAddress)}
            </code>
            <p className="text-[10px] font-mono text-white/20 mt-0.5 hidden sm:block">
              {userAddress.slice(0, 22)}…
            </p>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-5 py-4">
        {status === "approved" ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#34D399]/10 border border-[#34D399]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#34D399]">
              Verified
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
              Pending
            </span>
          </span>
        )}
      </td>

      {/* Action */}
      <td className="px-5 py-4 text-right">
        {status === "approved" ? (
          <span className="text-[10px] font-mono text-white/20 uppercase tracking-wider">
            Complete
          </span>
        ) : (
          <button
            onClick={() => verifyHuman(userAddress)}
            disabled={isPending || isConfirming}
            className="relative inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono uppercase tracking-wider
              bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/30
              hover:bg-[#34D399]/20 hover:border-[#34D399]/50 hover:shadow-[0_0_20px_rgba(53,208,127,0.15)]
              disabled:opacity-40 disabled:cursor-not-allowed
              rounded-md transition-all duration-300"
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Approving</span>
              </>
            ) : (
              <>
                <UserCheck className="h-3 w-3" />
                <span>Approve</span>
              </>
            )}
          </button>
        )}
      </td>
    </tr>
  );
}

/* ── Helpers ────────────────────────────────────────────────────── */

function generateColor(address: string, seed: number): string {
  const hash = parseInt(address.slice(2 + seed * 6, 8 + seed * 6), 16);
  const h = hash % 360;
  return `hsl(${h}, 60%, 50%)`;
}

/* ── Stat Card ──────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  delay,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  delay: string;
}) {
  return (
    <div
      className="animate-fade-up relative group overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.1] transition-all duration-500"
      style={{ animationDelay: delay }}
    >
      {/* Glow effect */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl"
        style={{ background: accent }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
            {label}
          </span>
          <Icon className="h-4 w-4 text-white/15" />
        </div>
        <p
          className="text-3xl font-serif tabular-nums"
          style={{ color: accent }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

/* ── Main Admin Page ────────────────────────────────────────────── */

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { data: ownerAddress, isLoading: isLoadingOwner } = useContractOwner();
  const publicClient = usePublicClient();
  const [pendingAddresses, setPendingAddresses] = useState<`0x${string}`[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved">("all");
  const [fetchVersion, setFetchVersion] = useState(0);

  const isOwner =
    address && ownerAddress
      ? address.toLowerCase() === (ownerAddress as string).toLowerCase()
      : false;

  const refetchPending = useCallback(() => {
    setFetchVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    async function fetchRequests() {
      if (!publicClient || !isOwner) return;

      try {
        const pending = await publicClient.readContract({
          address: PROOF_DONATE_ADDRESS,
          abi: PROOF_DONATE_ABI,
          functionName: "getPendingUsers",
        });

        setPendingAddresses(pending as `0x${string}`[]);
      } catch (error) {
        console.error("Failed to fetch pending users:", error);
      } finally {
        setIsLoadingEvents(false);
      }
    }

    fetchRequests();
  }, [publicClient, isOwner, fetchVersion]);

  const filteredAddresses = pendingAddresses.filter((addr) =>
    addr.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ── Gate: Not connected ───────────────────────────────────── */

  if (!isConnected) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-[#0A1628]">
        <div className="animate-fade-up text-center max-w-md px-6">
          <div className="relative mx-auto w-20 h-20 mb-8">
            <div className="absolute inset-0 rounded-2xl bg-white/[0.04] border border-white/[0.08]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="h-8 w-8 text-white/20" />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-[#34D399]/5 blur-xl" />
          </div>
          <h1 className="font-serif text-2xl text-white mb-3">
            Admin Access Required
          </h1>
          <p className="text-sm font-mono text-white/30 leading-relaxed">
            Connect your wallet to authenticate and access the command center.
          </p>
        </div>
      </div>
    );
  }

  /* ── Gate: Loading owner ───────────────────────────────────── */

  if (isLoadingOwner) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-[#0A1628]">
        <div className="animate-fade-up text-center">
          <div className="relative w-12 h-12 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border border-[#34D399]/20 animate-ping" />
            <div className="absolute inset-0 rounded-full border border-[#34D399]/40 flex items-center justify-center">
              <Loader2 className="h-5 w-5 text-[#34D399] animate-spin" />
            </div>
          </div>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-white/30">
            Authenticating
          </p>
        </div>
      </div>
    );
  }

  /* ── Gate: Not owner ───────────────────────────────────────── */

  if (!isOwner) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-[#0A1628]">
        <div className="animate-fade-up text-center max-w-md px-6">
          <div className="relative mx-auto w-20 h-20 mb-8">
            <div className="absolute inset-0 rounded-2xl bg-red-500/[0.06] border border-red-500/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-red-400/60" />
            </div>
          </div>
          <h1 className="font-serif text-2xl text-white mb-3">
            Access Denied
          </h1>
          <p className="text-sm text-white/30 leading-relaxed">
            Only the contract owner can access this panel.
          </p>
          <code className="inline-block mt-4 px-3 py-1.5 text-[10px] font-mono text-white/20 bg-white/[0.03] rounded border border-white/[0.06]">
            Connected: {address ? truncateAddress(address) : "—"}
          </code>
        </div>
      </div>
    );
  }

  /* ── Main Panel ────────────────────────────────────────────── */

  const approvedCount = 0; // Will be calculated from row states
  const pendingCount = pendingAddresses.length;

  return (
    <div className="min-h-screen bg-[#0A1628] relative">
      {/* Background grid texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 0.5px, transparent 0.5px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#34D399]/30 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6 py-10">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="animate-fade-up mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="h-3.5 w-3.5 text-[#34D399]/60" />
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#34D399]/60">
              Command Center
            </span>
          </div>
          <h1 className="font-serif text-4xl text-white mb-2">
            Admin Panel
          </h1>
          <p className="text-sm text-white/30 max-w-lg">
            Manage human verification requests. Approve identities to enable
            on-chain donations through ProofDonate.
          </p>
        </div>

        {/* ── Stats Grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <StatCard
            label="Total Requests"
            value={pendingCount}
            icon={Users}
            accent="#34D399"
            delay="0.1s"
          />
          <StatCard
            label="Pending Review"
            value={pendingCount}
            icon={Clock}
            accent="#f59e0b"
            delay="0.2s"
          />
          <StatCard
            label="System Status"
            value="Live"
            icon={Activity}
            accent="#34D399"
            delay="0.3s"
          />
        </div>

        {/* ── Table Section ────────────────────────────────────── */}
        <div
          className="animate-fade-up rounded-xl border border-white/[0.06] bg-white/[0.015] overflow-hidden"
          style={{ animationDelay: "0.35s" }}
        >
          {/* Table Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
              <h2 className="text-sm font-mono uppercase tracking-wider text-white/60">
                Verification Queue
              </h2>
              <span className="text-[10px] font-mono text-white/20 bg-white/[0.04] px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
              <input
                type="text"
                placeholder="Search address…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2 text-xs font-mono
                  bg-white/[0.03] border border-white/[0.08] rounded-lg
                  text-white/70 placeholder:text-white/20
                  focus:outline-none focus:border-[#34D399]/30 focus:ring-1 focus:ring-[#34D399]/10
                  transition-all duration-300"
              />
            </div>
          </div>

          {/* Table */}
          {isLoadingEvents ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative w-10 h-10 mb-4">
                <div className="absolute inset-0 rounded-full border border-[#34D399]/20 animate-ping" />
                <div className="absolute inset-0 rounded-full border border-[#34D399]/40 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-[#34D399] animate-spin" />
                </div>
              </div>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-white/20">
                Scanning blockchain events…
              </p>
            </div>
          ) : filteredAddresses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mb-5">
                <Shield className="h-6 w-6 text-white/10" />
              </div>
              <p className="text-sm text-white/30 mb-1">
                {searchQuery ? "No matching addresses" : "Queue is empty"}
              </p>
              <p className="text-xs font-mono text-white/15">
                {searchQuery
                  ? "Try a different search term"
                  : "No verification requests have been submitted yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="px-5 py-3 text-left text-[10px] font-mono uppercase tracking-[0.2em] text-white/20 w-16">
                      #
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-mono uppercase tracking-[0.2em] text-white/20">
                      Address
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-mono uppercase tracking-[0.2em] text-white/20">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-mono uppercase tracking-[0.2em] text-white/20">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAddresses.map((addr, i) => (
                    <PendingRequestRow key={addr} address={addr} index={i} onVerified={refetchPending} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer */}
          {filteredAddresses.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.04]">
              <span className="text-[10px] font-mono text-white/15">
                Showing {filteredAddresses.length} of {pendingCount} requests
              </span>
              <span className="text-[10px] font-mono text-white/15">
                On-chain data
              </span>
            </div>
          )}
        </div>

        {/* ── Footer info ──────────────────────────────────────── */}
        <div
          className="animate-fade-up mt-8 flex flex-wrap items-center gap-x-6 gap-y-2"
          style={{ animationDelay: "0.5s" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-[#34D399]" />
            <span className="text-[10px] font-mono text-white/20">
              Contract:{" "}
              {PROOF_DONATE_ADDRESS ? (
                <a
                  href={`https://celoscan.io/address/${PROOF_DONATE_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/30 hover:text-[#34D399] transition-colors underline underline-offset-2"
                >
                  {truncateAddress(PROOF_DONATE_ADDRESS as `0x${string}`)}
                </a>
              ) : "—"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-[#34D399]" />
            <span className="text-[10px] font-mono text-white/20">
              Owner:{" "}
              {address ? (
                <a
                  href={`https://celoscan.io/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/30 hover:text-[#34D399] transition-colors underline underline-offset-2"
                >
                  {truncateAddress(address)}
                </a>
              ) : "—"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-[#34D399]" />
            <span className="text-[10px] font-mono text-white/20">
              Network:{" "}
              <span className="text-white/30">Celo</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
