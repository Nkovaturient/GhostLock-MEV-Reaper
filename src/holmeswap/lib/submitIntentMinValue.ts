import type { PublicClient } from 'viem'
import { GhostLockLivenessABI } from '../ABI/GhostLockLiveness'

const BOND_CACHE_TTL_MS = 5 * 60_000
const bondCache = new Map<string, { value: bigint; ts: number }>()

function bondCacheKey(chainId: number, livenessAddress: string) {
  return `${chainId}:${livenessAddress.toLowerCase()}`
}

/** tlock submit path: bond only (no blocklock requestPrice). Cached 5 min per chain + contract. */
export async function getTlockSubmitValueWei(
  publicClient: PublicClient,
  livenessAddress: `0x${string}`,
): Promise<bigint> {
  const chainId = publicClient.chain?.id ?? 0
  const key = bondCacheKey(chainId, livenessAddress)
  const hit = bondCache.get(key)
  if (hit && Date.now() - hit.ts < BOND_CACHE_TTL_MS) {
    return hit.value
  }

  const bondMinimum = await publicClient.readContract({
    address: livenessAddress,
    abi: GhostLockLivenessABI,
    functionName: 'BOND_MINIMUM',
  })
  const value = bondMinimum + (bondMinimum * 5n) / 100n
  bondCache.set(key, { value, ts: Date.now() })
  return value
}
