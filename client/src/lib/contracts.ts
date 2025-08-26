// Contracts: ABIs and deployed addresses on Base Sepolia
// Shall Replace placeholders with actual values when available.
import type { Address } from "viem";

// Minimal example ABI with a submitIntent(bytes) function and a getter for user intents
export const GhostLockAbi = [
  {
    type: "function",
    name: "submitIntent",
    stateMutability: "nonpayable",
    inputs: [{ name: "encrypted", type: "bytes" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getUserIntents",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      {
        components: [
          { name: "id", type: "uint256" },
          { name: "user", type: "address" },
          { name: "targetBlock", type: "uint256" },
          { name: "encrypted", type: "bytes" },
          { name: "status", type: "uint8" },
          { name: "inclusionBlock", type: "uint256" },
          { name: "settlementPrice", type: "uint256" },
        ],
        name: "",
        type: "tuple[]",
      },
    ],
  },
] as const;

export const GhostLockAddress: Address =
  (process.env.NEXT_PUBLIC_GHOSTLOCK_ADDRESS as Address) ||
  "0x0000000000000000000000000000000000000000";

export type IntentStatus = "Pending" | "Ready" | "Settled";

export function statusFromUint(u: number): IntentStatus {
  if (u === 1) return "Ready";
  if (u === 2) return "Settled";
  return "Pending";
}
