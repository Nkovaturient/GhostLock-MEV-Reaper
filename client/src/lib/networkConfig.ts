// Network configuration for Base Sepolia and app-wide environment variables
import { http } from "wagmi";
import { baseSepolia } from "wagmi/chains";

export const CHAIN = baseSepolia;

export const RPC_URL =
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

export const INDEXER_URL =
  process.env.NEXT_PUBLIC_INDEXER_URL || "";

export const SOLVER_API_URL =
  process.env.NEXT_PUBLIC_SOLVER_API_URL || "/api/mock/auctions";

export const wagmiTransports = {
  [CHAIN.id]: http(RPC_URL),
} as const;
