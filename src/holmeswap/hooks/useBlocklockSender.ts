/**
 * Reads GhostLockLiveness.blocklock() — Randamu / dcipher sender used for callbacks.
 */
import { useChainId, useReadContract } from 'wagmi'
import { GhostLockLivenessABI } from '../ABI/GhostLockLiveness'
import { getAddresses } from '../contracts/config'

export function useBlocklockSender() {
  const chainId = useChainId()
  const addrs = getAddresses(chainId)
  const enabled = Boolean(addrs.GhostLockLiveness)

  const { data, isLoading, error } = useReadContract({
    address: addrs.GhostLockLiveness,
    abi: GhostLockLivenessABI,
    functionName: 'blocklock',
    query: {
      enabled,
      staleTime: 60_000,
    },
  })

  return {
    blocklockSender: (data as `0x${string}` | undefined) ?? undefined,
    isLoading,
    error,
    enabled,
  }
}
