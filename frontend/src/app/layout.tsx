import type { Metadata } from "next";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "FreelanceEscrowChain | Hire SREs with Crypto Escrow",
  description:
    "Decentralized freelance marketplace for SRE/DevOps services. Pay with USDT via smart contract escrow. Earn soulbound reputation NFTs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-950 text-surface-50 antialiased">
        <Providers>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-surface-800 mt-20">
            <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
              <p>FreelanceEscrowChain &mdash; Decentralized SRE/DevOps Marketplace</p>
              <p className="mt-1">Built on Ethereum | USDT Escrow | Soulbound Reputation NFTs</p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
