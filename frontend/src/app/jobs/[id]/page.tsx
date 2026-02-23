"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { CONTRACT_ADDRESSES, formatUSDT, parseUSDT } from "@/config/contracts";
import { FreelanceMarketABI, MockUSDTABI } from "@/config/abis";
import { JobStatusBadge } from "@/components/StatusBadge";
import {
  ArrowLeft,
  DollarSign,
  Users,
  Clock,
  Send,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";

export default function JobDetailPage() {
  const params = useParams();
  const jobId = Number(params.id);
  const { address, isConnected } = useAccount();

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

  const { data: bidIds } = useReadContract({
    address: CONTRACT_ADDRESSES.FreelanceMarket,
    abi: FreelanceMarketABI,
    functionName: "getJobBidIds",
    args: [BigInt(jobId)],
  });

  if (!job) {
    return (
      <div className="text-center py-20">
        <div className="animate-pulse text-surface-200">Loading job...</div>
      </div>
    );
  }

  const [client, title, description, budget, status, escrowId, freelancer, bidCount, createdAt] = job;
  const isClient = address?.toLowerCase() === client.toLowerCase();
  const isOpen = Number(status) === 0;

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/jobs" className="flex items-center gap-2 text-surface-200 hover:text-white mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Jobs
      </Link>

      {/* Job Header */}
      <div className="card p-8 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold">{title}</h1>
          <JobStatusBadge status={Number(status)} />
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {skills?.map((skill: string) => (
            <span key={skill} className="badge bg-brand-500/10 text-brand-400">
              {skill}
            </span>
          ))}
        </div>

        <p className="text-surface-200 whitespace-pre-wrap mb-6">{description}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="card p-3 text-center">
            <DollarSign className="w-4 h-4 mx-auto mb-1 text-brand-400" />
            <p className="font-semibold">{formatUSDT(budget)} USDT</p>
            <p className="text-xs text-surface-200">Budget</p>
          </div>
          <div className="card p-3 text-center">
            <Users className="w-4 h-4 mx-auto mb-1 text-brand-400" />
            <p className="font-semibold">{Number(bidCount)}</p>
            <p className="text-xs text-surface-200">Bids</p>
          </div>
          <div className="card p-3 text-center">
            <Clock className="w-4 h-4 mx-auto mb-1 text-brand-400" />
            <p className="font-semibold">{new Date(Number(createdAt) * 1000).toLocaleDateString()}</p>
            <p className="text-xs text-surface-200">Posted</p>
          </div>
          <div className="card p-3 text-center">
            <p className="font-mono text-xs truncate">{client.slice(0, 6)}...{client.slice(-4)}</p>
            <p className="text-xs text-surface-200 mt-1">Client</p>
          </div>
        </div>
      </div>

      {/* Bid Form (for freelancers) */}
      {isConnected && !isClient && isOpen && (
        <BidForm jobId={jobId} budget={budget} />
      )}

      {/* Bids List */}
      {bidIds && bidIds.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">
            Bids ({bidIds.length})
          </h2>
          {bidIds.map((bidId: bigint) => (
            <BidCard key={bidId.toString()} bidId={Number(bidId)} isClient={isClient} isOpen={isOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

function BidForm({ jobId, budget }: { jobId: number; budget: bigint }) {
  const [amount, setAmount] = useState("");
  const [proposal, setProposal] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [milestones, setMilestones] = useState([{ desc: "", amount: "" }]);

  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const addMilestone = () => {
    if (milestones.length < 10) setMilestones([...milestones, { desc: "", amount: "" }]);
  };

  const removeMilestone = (i: number) => {
    if (milestones.length > 1) setMilestones(milestones.filter((_, idx) => idx !== i));
  };

  const submit = () => {
    const bidAmount = parseUSDT(amount);
    const descs = milestones.map((m) => m.desc);
    const amounts = milestones.map((m) => parseUSDT(m.amount));

    writeContract({
      address: CONTRACT_ADDRESSES.FreelanceMarket,
      abi: FreelanceMarketABI,
      functionName: "placeBid",
      args: [BigInt(jobId), bidAmount, proposal, BigInt(deliveryDays), descs, amounts],
    });
  };

  if (isSuccess) {
    return (
      <div className="card p-6 mb-6 text-center">
        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
        <p className="font-semibold">Bid Submitted!</p>
      </div>
    );
  }

  return (
    <div className="card p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">Place a Bid</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Bid Amount (USDT)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={formatUSDT(budget)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Delivery (days)</label>
            <input
              type="number"
              value={deliveryDays}
              onChange={(e) => setDeliveryDays(e.target.value)}
              placeholder="14"
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Proposal</label>
          <textarea
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
            placeholder="Describe your approach, experience, and deliverables..."
            className="input-field min-h-[100px] resize-y"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Milestones</label>
            <button onClick={addMilestone} className="text-brand-400 text-sm flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          {milestones.map((m, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                type="text"
                value={m.desc}
                onChange={(e) => {
                  const u = [...milestones]; u[i].desc = e.target.value; setMilestones(u);
                }}
                placeholder={`Milestone ${i + 1}`}
                className="input-field flex-1"
              />
              <input
                type="number"
                value={m.amount}
                onChange={(e) => {
                  const u = [...milestones]; u[i].amount = e.target.value; setMilestones(u);
                }}
                placeholder="USDT"
                className="input-field w-24"
              />
              {milestones.length > 1 && (
                <button onClick={() => removeMilestone(i)} className="text-red-400 p-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-sm">
            {error.message.includes("User rejected") ? "Transaction rejected." : error.message.slice(0, 150)}
          </p>
        )}

        <button
          onClick={submit}
          disabled={isPending || isConfirming || !amount || !proposal || !deliveryDays}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          {isPending ? "Confirm..." : isConfirming ? "Submitting..." : "Submit Bid"}
        </button>
      </div>
    </div>
  );
}

function BidCard({ bidId, isClient, isOpen }: { bidId: number; isClient: boolean; isOpen: boolean }) {
  const { data: bid } = useReadContract({
    address: CONTRACT_ADDRESSES.FreelanceMarket,
    abi: FreelanceMarketABI,
    functionName: "getBid",
    args: [BigInt(bidId)],
  });

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  // For accepting bids, client needs to approve USDT first
  const { writeContract: approveUSDT } = useWriteContract();

  if (!bid) return <div className="card p-4 animate-pulse h-20" />;

  const [, freelancer, amount, proposal, deliveryDays, status] = bid;
  const statusLabels = ["Pending", "Accepted", "Rejected", "Withdrawn"];
  const statusColors = [
    "text-yellow-400", "text-green-400", "text-red-400", "text-gray-400",
  ];

  const handleAccept = async () => {
    // First approve USDT, then accept bid
    approveUSDT({
      address: CONTRACT_ADDRESSES.MockUSDT,
      abi: MockUSDTABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESSES.FreelanceMarket, amount],
    });
    // Note: In production, you'd wait for approval tx then call acceptBid
    // For demo, user calls acceptBid after approval confirms
    setTimeout(() => {
      writeContract({
        address: CONTRACT_ADDRESSES.FreelanceMarket,
        abi: FreelanceMarketABI,
        functionName: "acceptBid",
        args: [BigInt(bidId)],
      });
    }, 2000);
  };

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-sm">
              {freelancer.slice(0, 6)}...{freelancer.slice(-4)}
            </span>
            <span className={`text-xs font-medium ${statusColors[Number(status)]}`}>
              {statusLabels[Number(status)]}
            </span>
          </div>
          <p className="text-sm text-surface-200 line-clamp-2 mb-2">{proposal}</p>
          <div className="flex items-center gap-4 text-xs text-surface-200">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> {formatUSDT(amount)} USDT
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {Number(deliveryDays)} days
            </span>
          </div>
        </div>
        {isClient && isOpen && Number(status) === 0 && (
          <button
            onClick={handleAccept}
            disabled={isPending || isConfirming}
            className="btn-primary text-sm flex items-center gap-1"
          >
            <CheckCircle className="w-4 h-4" />
            {isPending || isConfirming ? "..." : "Accept"}
          </button>
        )}
      </div>
    </div>
  );
}
