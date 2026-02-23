"use client";

import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { CONTRACT_ADDRESSES, formatUSDT } from "@/config/contracts";
import { FreelanceMarketABI } from "@/config/abis";
import { JobStatusBadge } from "@/components/StatusBadge";
import Link from "next/link";
import { Search, Filter, Briefcase, Clock, DollarSign, Users } from "lucide-react";

const SKILL_FILTERS = [
  "All", "Terraform", "AWS", "GCP", "Kubernetes", "Docker",
  "CI/CD", "Monitoring", "SRE", "Security", "Linux",
];

export default function BrowseJobsPage() {
  const { isConnected } = useAccount();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const { data: jobCount } = useReadContract({
    address: CONTRACT_ADDRESSES.FreelanceMarket,
    abi: FreelanceMarketABI,
    functionName: "jobCount",
  });

  const count = Number(jobCount || 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            Browse <span className="gradient-text">Jobs</span>
          </h1>
          <p className="text-surface-200 mt-1">{count} jobs on the marketplace</p>
        </div>
        {isConnected && (
          <Link href="/post-job" className="btn-primary text-sm">
            Post a Job
          </Link>
        )}
      </div>

      {/* Search & Filter */}
      <div className="space-y-4 mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jobs by title or description..."
            className="input-field pl-11"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Filter className="w-4 h-4 text-surface-200 mt-1.5" />
          {SKILL_FILTERS.map((skill) => (
            <button
              key={skill}
              onClick={() => setActiveFilter(skill)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                activeFilter === skill
                  ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                  : "bg-surface-800 text-surface-200 border border-surface-700 hover:border-surface-200"
              }`}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>

      {/* Job List */}
      {count === 0 ? (
        <div className="card p-12 text-center">
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-surface-200" />
          <h3 className="text-xl font-semibold mb-2">No Jobs Yet</h3>
          <p className="text-surface-200 mb-6">Be the first to post a job on the marketplace.</p>
          {isConnected && (
            <Link href="/post-job" className="btn-primary">
              Post a Job
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from({ length: Math.min(count, 20) }, (_, i) => (
            <JobCard key={i} jobId={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function JobCard({ jobId }: { jobId: number }) {
  const { data: job } = useReadContract({
    address: CONTRACT_ADDRESSES.FreelanceMarket,
    abi: FreelanceMarketABI,
    functionName: "getJob",
    args: [BigInt(jobId)],
  });

  const { data: skills } = useReadContract({
    address: CONTRACT_ADDRESSES.FreelanceMarket,
    abi: FreelanceMarketABI,
    functionName: "getJobSkills",
    args: [BigInt(jobId)],
  });

  if (!job) return <div className="card p-6 animate-pulse h-32" />;

  const [client, title, description, budget, status, , , bidCount, createdAt] = job;
  const timeAgo = getTimeAgo(Number(createdAt));

  return (
    <Link href={`/jobs/${jobId}`}>
      <div className="card-hover p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold truncate">{title}</h3>
              <JobStatusBadge status={Number(status)} />
            </div>
            <p className="text-sm text-surface-200 line-clamp-2 mb-3">
              {description}
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {skills?.map((skill: string) => (
                <span key={skill} className="badge bg-surface-700 text-surface-200">
                  {skill}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-4 text-sm text-surface-200">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                {formatUSDT(budget)} USDT
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {Number(bidCount)} bids
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {timeAgo}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function getTimeAgo(timestamp: number): string {
  if (timestamp === 0) return "just now";
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
