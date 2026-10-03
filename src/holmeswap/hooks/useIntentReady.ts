/**
 * useIntentReady.ts
 *
 * Reads isReady(requestId) from GhostLockLiveness contract.
 * Only enabled when intentStatus is 'locked' and lastRequestId exists.
 * Uses slow refetch interval (10s) to avoid RPC spam.
 */
import { useChainId, useReadContract } from 'wagmi'
import { useSwapStore } from '../stores/swapStore'
import { GhostLockLivenessABI } from '../ABI/GhostLockLiveness'
import { getAddresses } from '../contracts/config'
import { requestIdToBigInt } from '../lib/requestId'

export function useIntentReady() {
  const chainId = useChainId()
  const lastRequestId = useSwapStore((s) => s.lastRequestId)
  const intentStatus = useSwapStore((s) => s.intentStatus)

  const addrs = getAddresses(chainId)

  const enabled =
    lastRequestId != null &&
    intentStatus === 'locked' &&
    Boolean(addrs.GhostLockLiveness)

  const { data: isReady, isLoading, error, refetch } = useReadContract({
    address: addrs.GhostLockLiveness,
    abi: GhostLockLivenessABI,
    functionName: 'isReady',
    args: enabled && lastRequestId != null ? [requestIdToBigInt(lastRequestId)] : undefined,
    query: {
      enabled,
      refetchInterval: false,
      staleTime: 30_000,
    },
  })

  return {
    isReady: isReady ?? false,
    isLoading,
    error,
    refetch,
    enabled,
  }
}

export default useIntentReady
