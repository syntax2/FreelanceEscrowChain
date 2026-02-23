"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESSES, formatUSDT } from "@/config/contracts";
import { FreelanceMarketABI, EscrowUSDTABI, MockUSDTABI } from "@/config/abis";
import { JobStatusBadge, EscrowStatusBadge, MilestoneStatusBadge } from "@/components/StatusBadge";
import { FaucetButton } from "@/components/FaucetButton";
import Link from "next/link";
import {
  Briefcase,
  FileText,
  DollarSign,
  Shield,
  Play,
  Upload,
  CheckCircle,
  AlertTriangle,
  Wallet,
} from "lucide-react";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  const { data: usdtBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.MockUSDT,
    abi: MockUSDTABI,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: clientJobIds } = useReadContract({
    address: CONTRACT_ADDRESSES.FreelanceMarket,
    abi: FreelanceMarketABI,
    functionName: "getClientJobIds",
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: freelancerJobIds } = useReadContract({
    address: CONTRACT_ADDRESSES.FreelanceMarket,
    abi: FreelanceMarketABI,
    functionName: "getFreelancerJobIds",
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: freelancerBidIds } = useReadContract({
    address: CONTRACT_ADDRESSES.FreelanceMarket,
    abi: FreelanceMarketABI,
    functionName: "getFreelancerBidIds",
    args: [address!],
    query: { enabled: !!address },
  });

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <Wallet className="w-12 h-12 mx-auto mb-4 text-surface-200" />
        <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
        <p className="text-surface-200">Connect to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">
          <span className="gradient-text">Dashboard</span>
        </h1>
        <FaucetButton />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold">{usdtBalance ? formatUSDT(usdtBalance) : "0"}</p>
              <p className="text-xs text-surface-200">mUSDT Balance</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-brand-400" />
            <div>
              <p className="text-2xl font-bold">{clientJobIds?.length || 0}</p>
              <p className="text-xs text-surface-200">Jobs Posted</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold">{freelancerBidIds?.length || 0}</p>
              <p className="text-xs text-surface-200">Bids Placed</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold">{freelancerJobIds?.length || 0}</p>
              <p className="text-xs text-surface-200">Jobs as Freelancer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Client Jobs */}
      {clientJobIds && clientJobIds.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Your Posted Jobs</h2>
          <div className="space-y-3">
            {clientJobIds.map((id: bigint) => (
              <ClientJobRow key={id.toString()} jobId={Number(id)} />
            ))}
          </div>
        </section>
      )}

      {/* Freelancer Jobs - Escrow Tracking */}
      {freelancerJobIds && freelancerJobIds.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Active Freelance Jobs</h2>
          <div className="space-y-3">
            {freelancerJobIds.map((id: bigint) => (
              <FreelancerJobRow key={id.toString()} jobId={Number(id)} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {(!clientJobIds || clientJobIds.length === 0) &&
        (!freelancerJobIds || freelancerJobIds.length === 0) && (
          <div className="card p-12 text-center">
            <Briefcase className="w-12 h-12 mx-auto mb-4 text-surface-200" />
            <h3 className="text-xl font-semibold mb-2">No Activity Yet</h3>
            <p className="text-surface-200 mb-6">
              Post a job as a client or browse jobs to bid as a freelancer.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/post-job" className="btn-primary">Post a Job</Link>
              <Link href="/jobs" className="btn-secondary">Browse Jobs</Link>
            </div>
          </div>
        )}
    </div>
  );
}

function ClientJobRow({ jobId }: { jobId: number }) {
  const { data: job } = useReadContract({
    address: CONTRACT_ADDRESSES.FreelanceMarket,
    abi: FreelanceMarketABI,
    functionName: "getJob",
    args: [BigInt(jobId)],
  });

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  if (!job) return <div className="card p-4 animate-pulse h-16" />;

  const [, title, , budget, status, escrowId, freelancer, bidCount] = job;
  const jobStatus = Number(status);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Link href={`/jobs/${jobId}`} className="font-semibold hover:text-brand-400 transition-colors">
              {title}
            </Link>
            <JobStatusBadge status={jobStatus} />
          </div>
          <div className="flex items-center gap-4 text-xs text-surface-200 mt-1">
            <span>{formatUSDT(budget)} USDT</span>
            <span>{Number(bidCount)} bids</span>
            {freelancer !== "0x0000000000000000000000000000000000000000" && (
              <span>Freelancer: {freelancer.slice(0, 6)}...{freelancer.slice(-4)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {jobStatus === 1 && (
            <>
              <EscrowPanel escrowId={Number(escrowId)} role="client" />
              <button
                onClick={() =>
                  writeContract({
                    address: CONTRACT_ADDRESSES.FreelanceMarket,
                    abi: FreelanceMarketABI,
                    functionName: "completeJob",
                    args: [BigInt(jobId)],
                  })
                }
                disabled={isPending || isConfirming}
                className="btn-primary text-xs py-1.5 px-3"
              >
                Complete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FreelancerJobRow({ jobId }: { jobId: number }) {
  const { data: job } = useReadContract({
    address: CONTRACT_ADDRESSES.FreelanceMarket,
    abi: FreelanceMarketABI,
    functionName: "getJob",
    args: [BigInt(jobId)],
  });

  if (!job) return <div className="card p-4 animate-pulse h-16" />;

  const [, title, , budget, status, escrowId] = job;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href={`/jobs/${jobId}`} className="font-semibold hover:text-brand-400">
              {title}
            </Link>
            <JobStatusBadge status={Number(status)} />
          </div>
          <p className="text-xs text-surface-200 mt-1">{formatUSDT(budget)} USDT</p>
        </div>
        {Number(status) === 1 && (
          <EscrowPanel escrowId={Number(escrowId)} role="freelancer" />
        )}
      </div>
    </div>
  );
}

function EscrowPanel({ escrowId, role }: { escrowId: number; role: "client" | "freelancer" }) {
  const { data: escrow } = useReadContract({
    address: CONTRACT_ADDRESSES.EscrowUSDT,
    abi: EscrowUSDTABI,
    functionName: "getEscrow",
    args: [BigInt(escrowId)],
  });

  const { data: milestoneCount } = useReadContract({
    address: CONTRACT_ADDRESSES.EscrowUSDT,
    abi: EscrowUSDTABI,
    functionName: "getMilestoneCount",
    args: [BigInt(escrowId)],
  });

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  if (!escrow) return null;

  const [, , , totalAmount, releasedAmount, status] = escrow;
  const count = Number(milestoneCount || 0);

  return (
    <div className="text-right text-xs">
      <EscrowStatusBadge status={Number(status)} />
      <p className="text-surface-200 mt-1">
        {formatUSDT(releasedAmount)} / {formatUSDT(totalAmount)} released
      </p>
      <div className="flex gap-1 mt-2">
        {Array.from({ length: Math.min(count, 5) }, (_, i) => (
          <MilestoneAction
            key={i}
            escrowId={escrowId}
            milestoneIndex={i}
            role={role}
          />
        ))}
      </div>
    </div>
  );
}

function MilestoneAction({
  escrowId,
  milestoneIndex,
  role,
}: {
  escrowId: number;
  milestoneIndex: number;
  role: "client" | "freelancer";
}) {
  const { data: milestone } = useReadContract({
    address: CONTRACT_ADDRESSES.EscrowUSDT,
    abi: EscrowUSDTABI,
    functionName: "getMilestone",
    args: [BigInt(escrowId), BigInt(milestoneIndex)],
  });

  const { writeContract, isPending } = useWriteContract();

  if (!milestone) return <div className="w-6 h-6 rounded bg-surface-700 animate-pulse" />;

  const [, , status] = milestone;
  const s = Number(status);

  const action = () => {
    if (role === "freelancer" && s === 0) {
      // Start milestone
      writeContract({
        address: CONTRACT_ADDRESSES.EscrowUSDT,
        abi: EscrowUSDTABI,
        functionName: "startMilestone",
        args: [BigInt(escrowId), BigInt(milestoneIndex)],
      });
    } else if (role === "freelancer" && s === 1) {
      // Submit milestone
      writeContract({
        address: CONTRACT_ADDRESSES.EscrowUSDT,
        abi: EscrowUSDTABI,
        functionName: "submitMilestone",
        args: [BigInt(escrowId), BigInt(milestoneIndex)],
      });
    } else if (role === "client" && s === 2) {
      // Approve milestone
      writeContract({
        address: CONTRACT_ADDRESSES.EscrowUSDT,
        abi: EscrowUSDTABI,
        functionName: "approveMilestone",
        args: [BigInt(escrowId), BigInt(milestoneIndex)],
      });
    }
  };

  const canAct =
    (role === "freelancer" && (s === 0 || s === 1)) ||
    (role === "client" && s === 2);

  const icons: Record<number, React.ReactNode> = {
    0: <Play className="w-3 h-3" />,
    1: <Upload className="w-3 h-3" />,
    2: <CheckCircle className="w-3 h-3" />,
    3: <CheckCircle className="w-3 h-3 text-green-400" />,
    4: <AlertTriangle className="w-3 h-3 text-red-400" />,
  };

  return (
    <button
      onClick={canAct ? action : undefined}
      disabled={isPending || !canAct}
      className={`w-7 h-7 rounded flex items-center justify-center text-xs transition-colors ${
        canAct
          ? "bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 cursor-pointer"
          : "bg-surface-700 text-surface-200 cursor-default"
      }`}
      title={`M${milestoneIndex + 1}: ${["Pending", "In Progress", "Submitted", "Approved", "Disputed"][s]}`}
    >
      {icons[s] || milestoneIndex + 1}
    </button>
  );
}
