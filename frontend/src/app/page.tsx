"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import {
  Shield,
  Lock,
  Award,
  ArrowRight,
  Zap,
  Server,
  Cloud,
  Code,
} from "lucide-react";

const FEATURES = [
  {
    icon: Lock,
    title: "USDT Escrow",
    desc: "Funds locked in smart contract until milestones are approved. No rug pulls.",
  },
  {
    icon: Award,
    title: "Soulbound NFTs",
    desc: "Earn non-transferable reputation badges for every 5 completed jobs.",
  },
  {
    icon: Shield,
    title: "Dispute Resolution",
    desc: "Multi-sig 2/3 arbiter voting with 7-day resolution window.",
  },
  {
    icon: Zap,
    title: "Gas Optimized",
    desc: "Solidity 0.8.27 with viaIR optimizer. Minimal on-chain storage.",
  },
];

const SERVICES = [
  { icon: Cloud, title: "Cloud Audits", desc: "AWS, GCP, Azure security & cost reviews" },
  { icon: Server, title: "Infrastructure", desc: "Terraform, Pulumi, CloudFormation setups" },
  { icon: Code, title: "Script Reviews", desc: "CI/CD, Ansible, Bash automation audits" },
  { icon: Shield, title: "SRE Consulting", desc: "Incident response, SLO, monitoring design" },
];

const FEATURED_FREELANCERS = [
  { name: "0xInfra.eth", tier: "Gold SRE", jobs: 22, color: "#ffd700" },
  { name: "CloudAuditPro", tier: "Silver SRE", jobs: 14, color: "#c0c0c0" },
  { name: "TerraformWiz", tier: "Bronze SRE", jobs: 8, color: "#cd7f32" },
];

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="space-y-24">
      {/* Hero */}
      <section className="relative pt-16 pb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 to-transparent pointer-events-none" />
        <div className="relative text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm mb-6">
            <Shield className="w-4 h-4" />
            Decentralized SRE Marketplace
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold leading-tight">
            Hire <span className="gradient-text">SREs</span> with
            <br />
            <span className="gradient-text">Crypto Escrow</span>
          </h1>
          <p className="mt-6 text-lg text-surface-200 max-w-2xl mx-auto">
            Post DevOps jobs, pay in USDT via smart contract escrow. Freelancers
            earn soulbound reputation NFTs. No middlemen. No disputes.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {isConnected ? (
              <>
                <Link href="/post-job" className="btn-primary flex items-center gap-2">
                  Post a Job <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/jobs" className="btn-secondary flex items-center gap-2">
                  Browse Jobs
                </Link>
              </>
            ) : (
              <ConnectButton />
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-2xl font-bold text-center mb-12">
          Why <span className="gradient-text">FreelanceEscrowChain</span>?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-hover p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg gradient-brand flex items-center justify-center">
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-surface-200">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section>
        <h2 className="text-2xl font-bold text-center mb-12">
          SRE/DevOps <span className="gradient-text">Services</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {SERVICES.map((s) => (
            <div key={s.title} className="card p-6">
              <s.icon className="w-8 h-8 text-brand-400 mb-3" />
              <h3 className="font-semibold mb-1">{s.title}</h3>
              <p className="text-sm text-surface-200">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Freelancers */}
      <section>
        <h2 className="text-2xl font-bold text-center mb-12">
          Top <span className="gradient-text">Freelancers</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {FEATURED_FREELANCERS.map((f) => (
            <div key={f.name} className="card-hover p-6 text-center">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-full border-2 flex items-center justify-center text-2xl"
                style={{ borderColor: f.color }}
              >
                <Award style={{ color: f.color }} className="w-8 h-8" />
              </div>
              <h3 className="font-semibold">{f.name}</h3>
              <span className="badge mt-2" style={{ color: f.color, backgroundColor: `${f.color}20` }}>
                {f.tier}
              </span>
              <p className="text-sm text-surface-200 mt-2">{f.jobs} jobs completed</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="card p-12 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Ready to <span className="gradient-text">build</span>?
        </h2>
        <p className="text-surface-200 mb-8 max-w-lg mx-auto">
          Connect your wallet, post a job or browse open opportunities.
          All payments secured by Ethereum smart contracts.
        </p>
        {isConnected ? (
          <Link href="/jobs" className="btn-primary inline-flex items-center gap-2">
            Explore Jobs <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <ConnectButton />
        )}
      </section>
    </div>
  );
}
