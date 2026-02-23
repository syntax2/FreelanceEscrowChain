"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { MockUSDTABI } from "@/config/abis";
import { Droplets } from "lucide-react";

export function FaucetButton() {
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const claim = () => {
    writeContract({
      address: CONTRACT_ADDRESSES.MockUSDT,
      abi: MockUSDTABI,
      functionName: "faucet",
    });
  };

  return (
    <button
      onClick={claim}
      disabled={isPending || isConfirming}
      className="btn-secondary flex items-center gap-2 text-sm"
    >
      <Droplets className="w-4 h-4" />
      {isPending
        ? "Confirming..."
        : isConfirming
          ? "Claiming..."
          : "Claim 10k mUSDT"}
    </button>
  );
}
