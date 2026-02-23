import { type Address } from "viem";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111);

export const CONTRACT_ADDRESSES: Record<string, Address> = {
  MockUSDT: (process.env.NEXT_PUBLIC_MOCK_USDT_ADDRESS || "0x0000000000000000000000000000000000000000") as Address,
  EscrowUSDT: (process.env.NEXT_PUBLIC_ESCROW_ADDRESS || "0x0000000000000000000000000000000000000000") as Address,
  ReputationNFT: (process.env.NEXT_PUBLIC_REPUTATION_NFT_ADDRESS || "0x0000000000000000000000000000000000000000") as Address,
  FreelanceMarket: (process.env.NEXT_PUBLIC_FREELANCE_MARKET_ADDRESS || "0x0000000000000000000000000000000000000000") as Address,
};

export const USDT_DECIMALS = 6;

export function formatUSDT(amount: bigint): string {
  return (Number(amount) / 10 ** USDT_DECIMALS).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseUSDT(amount: string): bigint {
  return BigInt(Math.round(parseFloat(amount) * 10 ** USDT_DECIMALS));
}
