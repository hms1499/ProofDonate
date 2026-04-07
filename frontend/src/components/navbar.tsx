"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { useState } from "react";
import { X, Menu } from "lucide-react";

import { ConnectButton } from "@/components/connect-button";
import { useContractOwner } from "@/hooks/useProofDonate";

const baseNavLinks = [
  { name: "Home", href: "/" },
  { name: "Create", href: "/campaign/create" },
  { name: "Swap", href: "/swap" },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Verify", href: "/verify" },
];

export function Navbar() {
  const pathname = usePathname();
  const { address } = useAccount();
  const { data: ownerAddress } = useContractOwner();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isOwner =
    address && ownerAddress
      ? address.toLowerCase() === (ownerAddress as string).toLowerCase()
      : false;

  const navLinks = isOwner
    ? [...baseNavLinks, { name: "Admin", href: "/admin" }]
    : baseNavLinks;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/8 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 flex h-14 items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-px group">
            <span
              className="font-['DM_Serif_Display'] italic text-[#35D07F] text-lg leading-none"
              style={{ fontStyle: 'italic' }}
            >
              Proof
            </span>
            <span className="font-['DM_Serif_Display'] text-white text-lg leading-none">
              Donate
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative text-xs font-mono uppercase tracking-widest transition-colors pb-0.5 ${
                    active ? "text-white" : "text-white/40 hover:text-white/75"
                  }`}
                >
                  {link.name}
                  {active && (
                    <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-[#35D07F]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <ConnectButton />

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 text-white/50 hover:text-white transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-[#0d0d0d] border-l border-white/8 flex flex-col">
            <div className="flex items-center justify-between px-6 h-14 border-b border-white/8">
              <span className="font-['DM_Serif_Display'] text-white text-base">
                <span className="italic text-[#35D07F]">Proof</span>Donate
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex flex-col px-6 py-8 gap-1">
              {navLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 py-3 text-sm font-mono uppercase tracking-widest transition-colors ${
                      active ? "text-white" : "text-white/40 hover:text-white/75"
                    }`}
                  >
                    {active && <span className="w-1 h-1 rounded-full bg-[#35D07F]" />}
                    {!active && <span className="w-1 h-1" />}
                    {link.name}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto px-6 pb-8">
              <ConnectButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
