import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { Navbar } from '@/components/navbar';
import { WalletProvider } from "@/components/wallet-provider"

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ProofDonate - Transparent Donations on Celo',
  description: 'On-chain donation platform with milestone-based fund release and verified creators.',
  other: {
    'talentapp:project_verification': '2803799da4ac004cb15a15c5485c3ef4579db69ac8a1ce709f5951bfbae97abd09fbe4a53de989bc9af3aa95ad69d2cda7f6234dbe4c3b58959c3c65308cd086',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Navbar is included on all pages */}
        <div className="relative flex min-h-screen flex-col">
          <WalletProvider>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
          </WalletProvider>
        </div>
      </body>
    </html>
  );
}
