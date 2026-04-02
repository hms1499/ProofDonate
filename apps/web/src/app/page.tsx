"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CampaignList } from "@/components/campaign-list";
import { Heart, Shield, Eye } from "lucide-react";
import { useAccount } from "wagmi";

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="flex-1">
      {/* Hero Section */}
      <section className="relative py-16 lg:py-24">
        <div className="container px-4 mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              Transparent Donations on{" "}
              <span className="text-primary">Celo</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Every donation tracked on-chain. Milestone-based fund release
              ensures your contribution reaches its goal. Verified creators
              only.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
              {isConnected && (
                <Button size="lg" asChild>
                  <Link href="/campaign/create">Create Campaign</Link>
                </Button>
              )}
              <Button size="lg" variant="outline" asChild>
                <Link href="#campaigns">Browse Campaigns</Link>
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
              <div className="flex flex-col items-center gap-2 p-4">
                <Eye className="h-8 w-8 text-primary" />
                <h3 className="font-semibold">100% Transparent</h3>
                <p className="text-sm text-muted-foreground">
                  All transactions visible on-chain
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 p-4">
                <Shield className="h-8 w-8 text-primary" />
                <h3 className="font-semibold">Verified Creators</h3>
                <p className="text-sm text-muted-foreground">
                  Proof of Humanity required
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 p-4">
                <Heart className="h-8 w-8 text-primary" />
                <h3 className="font-semibold">Milestone Release</h3>
                <p className="text-sm text-muted-foreground">
                  Funds released in stages
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Campaigns Section */}
      <section id="campaigns" className="py-12 bg-secondary/20">
        <div className="container px-4 mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Active Campaigns</h2>
          </div>
          <CampaignList />
        </div>
      </section>
    </div>
  );
}
