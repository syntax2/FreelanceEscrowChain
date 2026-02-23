"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useState } from "react";
import { Menu, X, Shield, Briefcase, LayoutDashboard, User } from "lucide-react";

export function Navbar() {
  const { isConnected } = useAccount();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/jobs", label: "Browse Jobs", icon: Briefcase },
    { href: "/post-job", label: "Post Job", icon: Shield },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 gradient-brand rounded-lg flex items-center justify-center text-white font-bold text-sm">
              FE
            </div>
            <span className="text-lg font-bold hidden sm:block">
              <span className="gradient-text">Freelance</span>
              <span className="text-surface-200">Escrow</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {isConnected &&
              navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-surface-200 hover:text-brand-400 rounded-lg hover:bg-surface-800/50 transition-colors"
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
          </div>

          {/* Wallet + Mobile Toggle */}
          <div className="flex items-center gap-3">
            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus={{ smallScreen: "avatar", largeScreen: "address" }}
            />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-surface-200 hover:text-white"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && isConnected && (
          <div className="md:hidden pb-4 border-t border-surface-800 mt-2 pt-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-surface-200 hover:text-brand-400 hover:bg-surface-800/50 rounded-lg transition-colors"
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
