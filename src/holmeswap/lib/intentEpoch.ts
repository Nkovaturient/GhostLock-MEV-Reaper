import type { PublicClient } from 'viem'
import { EPOCH_RNG_ABI } from '../../lib/abis'
import { epochForTimestamp, type DrandAnchor } from '../../lib/drand'

/** ~2s per block on Arbitrum (matches tlock unlockRoundForBlock). */
export const UNLOCK_BLOCK_TIME_SEC = 2

export async function readDrandEpochAnchor(
  publicClient: PublicClient,
  epochRngAddress: `0x${string}`,
): Promise<DrandAnchor> {
  const [epochAnchor, roundAnchor, roundsPerEpoch] = await Promise.all([
    publicClient.readContract({
      address: epochRngAddress,
      abi: EPOCH_RNG_ABI,
      functionName: 'epochAnchor',
    }),
    publicClient.readContract({
      address: epochRngAddress,
      abi: EPOCH_RNG_ABI,
      functionName: 'roundAnchor',
    }),
    publicClient.readContract({
      address: epochRngAddress,
      abi: EPOCH_RNG_ABI,
      functionName: 'roundsPerEpoch',
    }),
  ])
  return { epochAnchor, roundAnchor, roundsPerEpoch }
}

/**
 * Intent epoch for GhostLockEpochRNG: drand-time-aligned, not L2 block number / 100.
 * L2 block heights are huge; block/100 epochs map to drand rounds years in the future (HTTP 425).
 */
export function intentEpochForUnlockBlocks(
  blocksUntilUnlock: number,
  anchor: DrandAnchor,
): number {
  const unlockTs = Math.floor(Date.now() / 1000) + blocksUntilUnlock * UNLOCK_BLOCK_TIME_SEC
  return epochForTimestamp(unlockTs, anchor)
}
