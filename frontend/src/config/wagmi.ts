import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, polygonMumbai, hardhat } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "FreelanceEscrowChain",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id",
  chains: [sepolia, polygonMumbai, hardhat],
  ssr: true,
});
