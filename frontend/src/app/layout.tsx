import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { Navbar } from '@/components/navbar';
import { WalletProvider } from "@/components/wallet-provider"
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ProofDonate - Transparent Donations on Celo',
  description: 'On-chain donation platform with milestone-based fund release and verified creators.',
  other: {
    'talentapp:project_verification': 'eade27fb74702eb5bfac702fc99c096daa89e39c1035a5f0fd83939eeb7a4b6fb82f94589d1d7d463a67acd3be821aea497ae581d5e0d107390963549eb656e4',
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
        <Toaster position="bottom-right" theme="dark" richColors />
      </body>
    </html>
  );
}
