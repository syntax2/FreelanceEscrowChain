"use client";

import { useAccount, useReadContract } from "wagmi";
import { CONTRACT_ADDRESSES, formatUSDT } from "@/config/contracts";
import { ReputationNFTABI, MockUSDTABI } from "@/config/abis";
import { FaucetButton } from "@/components/FaucetButton";
import { Award, Briefcase, DollarSign, Copy, ExternalLink, Wallet } from "lucide-react";
import { useState } from "react";

const TIER_THRESHOLDS = [
  { min: 50, tier: "Diamond SRE", color: "#b9f2ff" },
  { min: 30, tier: "Platinum SRE", color: "#e5e4e2" },
  { min: 20, tier: "Gold SRE", color: "#ffd700" },
  { min: 10, tier: "Silver SRE", color: "#c0c0c0" },
  { min: 0, tier: "Bronze SRE", color: "#cd7f32" },
];

function getTier(jobs: number) {
  return TIER_THRESHOLDS.find((t) => jobs >= t.min) || TIER_THRESHOLDS[4];
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [copied, setCopied] = useState(false);

  const { data: usdtBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.MockUSDT,
    abi: MockUSDTABI,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: stats } = useReadContract({
    address: CONTRACT_ADDRESSES.ReputationNFT,
    abi: ReputationNFTABI,
    functionName: "getFreelancerStats",
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: jobTitles } = useReadContract({
    address: CONTRACT_ADDRESSES.ReputationNFT,
    abi: ReputationNFTABI,
    functionName: "getFreelancerJobTitles",
    args: [address!],
    query: { enabled: !!address },
  });

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <Wallet className="w-12 h-12 mx-auto mb-4 text-surface-200" />
        <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
        <p className="text-surface-200">Connect to view your profile.</p>
      </div>
    );
  }

  const completedJobs = Number(stats?.completedJobs || 0);
  const totalEarned = stats?.totalEarned || BigInt(0);
  const tokenIds = stats?.tokenIds || [];
  const tier = getTier(completedJobs);
  const nextTierJobs = TIER_THRESHOLDS.findLast((t) => t.min > completedJobs)?.min || completedJobs;
  const progress = completedJobs % 5;

  const copyAddress = () => {
    navigator.clipboard.writeText(address || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">
          <span className="gradient-text">Profile</span>
        </h1>
        <FaucetButton />
      </div>

      {/* Address Card */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full border-2 flex items-center justify-center"
            style={{ borderColor: tier.color }}
          >
            <Award style={{ color: tier.color }} className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <button onClick={copyAddress} className="text-surface-200 hover:text-white">
                <Copy className="w-4 h-4" />
              </button>
              <a
                href={`https://sepolia.etherscan.io/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-surface-200 hover:text-brand-400"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              {copied && <span className="text-xs text-green-400">Copied!</span>}
            </div>
            <span
              className="badge mt-1"
              style={{ color: tier.color, backgroundColor: `${tier.color}20` }}
            >
              {tier.tier}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 text-center">
          <Briefcase className="w-6 h-6 mx-auto mb-2 text-brand-400" />
          <p className="text-2xl font-bold">{completedJobs}</p>
          <p className="text-xs text-surface-200">Completed Jobs</p>
        </div>
        <div className="card p-4 text-center">
          <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-400" />
          <p className="text-2xl font-bold">{formatUSDT(totalEarned)}</p>
          <p className="text-xs text-surface-200">Total Earned</p>
        </div>
        <div className="card p-4 text-center">
          <Award className="w-6 h-6 mx-auto mb-2 text-purple-400" />
          <p className="text-2xl font-bold">{tokenIds.length}</p>
          <p className="text-xs text-surface-200">NFT Badges</p>
        </div>
      </div>

      {/* USDT Balance */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-green-400" />
            <div>
              <p className="font-semibold">{usdtBalance ? formatUSDT(usdtBalance) : "0"} mUSDT</p>
              <p className="text-xs text-surface-200">Test USDT Balance</p>
            </div>
          </div>
        </div>
      </div>

      {/* NFT Progress */}
      <div className="card p-6 mb-6">
        <h3 className="font-semibold mb-3">NFT Progress</h3>
        <div className="flex items-center gap-4 mb-2">
          <div className="flex-1 bg-surface-700 rounded-full h-3">
            <div
              className="gradient-brand h-3 rounded-full transition-all"
              style={{ width: `${(progress / 5) * 100}%` }}
            />
          </div>
          <span className="text-sm text-surface-200">{progress}/5 jobs</span>
        </div>
        <p className="text-xs text-surface-200">
          {5 - progress} more jobs until next NFT badge.
          {completedJobs < nextTierJobs &&
            ` ${nextTierJobs - completedJobs} jobs until next tier.`}
        </p>
      </div>

      {/* NFT Badges */}
      {tokenIds.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Reputation NFTs</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {tokenIds.map((tokenId: bigint) => (
              <NFTCard key={tokenId.toString()} tokenId={Number(tokenId)} />
            ))}
          </div>
        </div>
      )}

      {/* Job History */}
      {jobTitles && jobTitles.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Job History</h3>
          <div className="card divide-y divide-surface-700">
            {jobTitles.map((title: string, i: number) => (
              <div key={i} className="p-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-sm">{title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NFTCard({ tokenId }: { tokenId: number }) {
  const { data: tokenURI } = useReadContract({
    address: CONTRACT_ADDRESSES.ReputationNFT,
    abi: ReputationNFTABI,
    functionName: "tokenURI",
    args: [BigInt(tokenId)],
  });

  let metadata: { name?: string; image?: string } = {};
  if (tokenURI) {
    try {
      const json = atob(tokenURI.split("base64,")[1]);
      metadata = JSON.parse(json);
    } catch {
      // fallback
    }
  }

  return (
    <div className="card-hover p-4 text-center">
      {metadata.image ? (
        <img
          src={metadata.image}
          alt={metadata.name || `NFT #${tokenId}`}
          className="w-full rounded-lg mb-2"
        />
      ) : (
        <div className="w-full aspect-square bg-surface-700 rounded-lg mb-2 animate-pulse" />
      )}
      <p className="text-sm font-medium truncate">{metadata.name || `Token #${tokenId}`}</p>
    </div>
  );
}
