// import { JsonRpcProvider } from "ethers";
// import { ethers } from "ethers";
// import { useMemo } from 'react'
// import { type Config, useConnectorClient } from 'wagmi'
// import { BrowserProvider } from 'ethers'
// import type { Account, Chain, Client, Transport } from 'viem'

// /**
//  * Chain utilities: estimate block time, estimate inclusion time heuristics,
//  * compute safety margin (in blocks), and align to epoch boundaries.
//  *
//  * These are client-safe, lightweight helpers. For production reliability,
//  * the frontend calls the server endpoint /api/network-stats which uses the same logic.
//  */

// export const clientToProvider = (client: Client<Transport, Chain, Account>) => {
//   const { chain, transport } = client
//   if (!chain) return null
  
//   const network = {
//     chainId: chain.id,
//     name: chain.name,
//     ensAddress: chain.contracts?.ensRegistry?.address,
//   }
  
//   const provider = new BrowserProvider(transport, network)
//   return provider
// }

// export const useEthersProvider = ({ chainId }: { chainId?: number } = {}) => {
//   const { data: client } = useConnectorClient<Config>({ chainId })
//   return useMemo(
//     () => (client ? clientToProvider(client) : undefined),
//     [client]
//   )
// }

// const provider = useEthersProvider({chainId: 84532}) as unknown as JsonRpcProvider;

// export async function estimateBlockTime(lookback = 16): Promise<number> {
//   try {
//     const latest = await provider?.getBlockNumber();
//     const start = Math.max(1, latest - lookback + 1);
//     const blocks = await Promise.all(
//       Array.from({ length: latest - start + 1 }, (_, i) => provider.getBlock(start + i))
//     );
//     const timestamps = blocks.map(b => b?.timestamp || 0).filter(Boolean);
//     if (timestamps.length < 2) return 12; // safe fallback
//     let total = 0;
//     for (let i = 1; i < timestamps.length; i++) total += (timestamps[i] - timestamps[i - 1]);
//     return total / (timestamps.length - 1);
//   } catch (e) {
//     console.warn("estimateBlockTime fallback", e);
//     return 12;
//   }
// }

// /**
//  * Heuristic inclusion time based on priorityTipGwei.
//  * Replace with Blocknative or other oracle if available.
//  */
// export async function estimateInclusionTime(priorityTipGwei?: number): Promise<number> {
//   try {
//     const feeData = await provider.getFeeData();
//     const tipGwei = priorityTipGwei !== undefined
//       ? priorityTipGwei
//       : (feeData.maxPriorityFeePerGas
//           ? Number(ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei"))
//           : 0);

//     const effectiveTip = tipGwei || 2;
//     if (effectiveTip >= 3) return 6;    // likely next 1-2 blocks
//     if (effectiveTip >= 1.5) return 18; // ~3-5 blocks
//     return 60;                          // slow path / uncertain
//   } catch (e) {
//     console.warn("estimateInclusionTime fallback", e);
//     return 30;
//   }
// }

export function computeSafetyMarginBlocks(inclusionSec: number, avgBlockTimeSec: number, extraBlocks = 2): number {
  const blocks = Math.ceil(inclusionSec / Math.max(1, avgBlockTimeSec));
  return Math.max(1, blocks + extraBlocks);
}

export function alignToEpoch(unlockBlock: number, epochSize = 12): number {
  if (epochSize <= 1) return unlockBlock;
  return Math.ceil(unlockBlock / epochSize) * epochSize;
}
