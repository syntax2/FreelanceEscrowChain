"use client";

const JOB_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: "Open", color: "bg-green-500/20 text-green-400" },
  1: { label: "In Progress", color: "bg-blue-500/20 text-blue-400" },
  2: { label: "Completed", color: "bg-purple-500/20 text-purple-400" },
  3: { label: "Cancelled", color: "bg-red-500/20 text-red-400" },
};

const ESCROW_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: "Created", color: "bg-gray-500/20 text-gray-400" },
  1: { label: "Funded", color: "bg-yellow-500/20 text-yellow-400" },
  2: { label: "In Progress", color: "bg-blue-500/20 text-blue-400" },
  3: { label: "Completed", color: "bg-green-500/20 text-green-400" },
  4: { label: "Disputed", color: "bg-red-500/20 text-red-400" },
  5: { label: "Resolved", color: "bg-purple-500/20 text-purple-400" },
  6: { label: "Cancelled", color: "bg-gray-500/20 text-gray-400" },
};

const MILESTONE_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: "Pending", color: "bg-gray-500/20 text-gray-400" },
  1: { label: "In Progress", color: "bg-blue-500/20 text-blue-400" },
  2: { label: "Submitted", color: "bg-yellow-500/20 text-yellow-400" },
  3: { label: "Approved", color: "bg-green-500/20 text-green-400" },
  4: { label: "Disputed", color: "bg-red-500/20 text-red-400" },
};

export function JobStatusBadge({ status }: { status: number }) {
  const s = JOB_STATUS_MAP[status] || { label: "Unknown", color: "bg-gray-500/20 text-gray-400" };
  return <span className={`badge ${s.color}`}>{s.label}</span>;
}

export function EscrowStatusBadge({ status }: { status: number }) {
  const s = ESCROW_STATUS_MAP[status] || { label: "Unknown", color: "bg-gray-500/20 text-gray-400" };
  return <span className={`badge ${s.color}`}>{s.label}</span>;
}

export function MilestoneStatusBadge({ status }: { status: number }) {
  const s = MILESTONE_STATUS_MAP[status] || { label: "Unknown", color: "bg-gray-500/20 text-gray-400" };
  return <span className={`badge ${s.color}`}>{s.label}</span>;
}
