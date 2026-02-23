"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESSES, parseUSDT } from "@/config/contracts";
import { FreelanceMarketABI } from "@/config/abis";
import { FaucetButton } from "@/components/FaucetButton";
import { Plus, Trash2, Send } from "lucide-react";

const SKILL_OPTIONS = [
  "Terraform", "AWS", "GCP", "Azure", "Kubernetes", "Docker",
  "Ansible", "CI/CD", "Monitoring", "SRE", "Linux", "Networking",
  "Security", "Python", "Go", "Bash", "CloudFormation", "Pulumi",
];

export default function PostJobPage() {
  const { isConnected } = useAccount();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [milestones, setMilestones] = useState([{ desc: "", amount: "" }]);

  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const addMilestone = () => {
    if (milestones.length < 10) {
      setMilestones([...milestones, { desc: "", amount: "" }]);
    }
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill].slice(0, 10)
    );
  };

  const totalMilestoneAmount = milestones.reduce(
    (sum, m) => sum + (parseFloat(m.amount) || 0), 0
  );

  const handleSubmit = () => {
    if (!title || !description || skills.length === 0 || !budget) return;

    const budgetUSDT = parseUSDT(budget);

    writeContract({
      address: CONTRACT_ADDRESSES.FreelanceMarket,
      abi: FreelanceMarketABI,
      functionName: "postJob",
      args: [title, description, skills, budgetUSDT],
    });
  };

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
        <p className="text-surface-200">Connect your wallet to post a job.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Post a <span className="gradient-text">Job</span></h1>
          <p className="text-surface-200 mt-1">Find SRE/DevOps talent. Pay with USDT escrow.</p>
        </div>
        <FaucetButton />
      </div>

      {isSuccess ? (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <Send className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Job Posted!</h2>
          <p className="text-surface-200 mb-4">
            Your job is now live on the marketplace. Freelancers can start bidding.
          </p>
          <a
            href={`https://sepolia.etherscan.io/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 hover:underline text-sm"
          >
            View transaction on Etherscan
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Job Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Terraform AWS Infrastructure Setup"
              className="input-field"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the job requirements, deliverables, and timeline..."
              className="input-field min-h-[120px] resize-y"
              maxLength={2000}
            />
            <p className="text-xs text-surface-200 mt-1">
              Tip: For large descriptions, upload to IPFS and paste the hash here.
            </p>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium mb-2">Required Skills</label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((skill) => (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    skills.includes(skill)
                      ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                      : "bg-surface-800 text-surface-200 border border-surface-700 hover:border-surface-200"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium mb-2">Budget (USDT)</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="5000"
              className="input-field"
              min="1"
            />
          </div>

          {/* Milestones Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                Milestones (freelancers will propose their own)
              </label>
              <button
                onClick={addMilestone}
                className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            <div className="space-y-3">
              {milestones.map((m, i) => (
                <div key={i} className="flex gap-3">
                  <input
                    type="text"
                    value={m.desc}
                    onChange={(e) => {
                      const updated = [...milestones];
                      updated[i].desc = e.target.value;
                      setMilestones(updated);
                    }}
                    placeholder={`Milestone ${i + 1} description`}
                    className="input-field flex-1"
                  />
                  <input
                    type="number"
                    value={m.amount}
                    onChange={(e) => {
                      const updated = [...milestones];
                      updated[i].amount = e.target.value;
                      setMilestones(updated);
                    }}
                    placeholder="USDT"
                    className="input-field w-28"
                  />
                  {milestones.length > 1 && (
                    <button
                      onClick={() => removeMilestone(i)}
                      className="text-red-400 hover:text-red-300 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {totalMilestoneAmount > 0 && (
              <p className="text-sm text-surface-200 mt-2">
                Total milestones: {totalMilestoneAmount.toLocaleString()} USDT
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error.message.includes("User rejected")
                ? "Transaction rejected by user."
                : `Error: ${error.message.slice(0, 200)}`}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={
              isPending ||
              isConfirming ||
              !title ||
              !description ||
              skills.length === 0 ||
              !budget
            }
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {isPending ? "Confirm in Wallet..." : isConfirming ? "Posting..." : "Post Job"}
          </button>
        </div>
      )}
    </div>
  );
}
