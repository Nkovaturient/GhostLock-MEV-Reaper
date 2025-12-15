import { useReadContract } from 'wagmi'
import { useEpochRNG } from './useEpochRNG'
import { useNetworkConfig } from './useNetworkConfig'
import { EPOCH_RNG_ABI } from '../lib/abis'
import { useAccount } from 'wagmi'

/**
 * Monitors epoch seed availability without automatically requesting transactions
 * Epoch seeds should be requested by backend solvers, not frontend users
 * 
 * This hook only reads epoch seed status - no write transactions are triggered
 * 
 * Usage: Add this hook to your main App component or a layout component
 */
export function useAutoEpochSeedRequest() {
  const { isConnected } = useAccount()
  const { currentEpoch, lastEpoch } = useEpochRNG()
  const { EPOCH_RNG_ADDRESS, isSupported, chainId } = useNetworkConfig()

  const { data: currentEpochSeed } = useReadContract({
    chainId: chainId ? Number(chainId) : undefined,
    abi: EPOCH_RNG_ABI,
    address: EPOCH_RNG_ADDRESS as `0x${string}` | undefined,
    functionName: 'epochSeed',
    args: currentEpoch !== null ? [BigInt(currentEpoch)] : undefined,
    query: {
      enabled: isSupported && isConnected && currentEpoch !== null && !!EPOCH_RNG_ADDRESS,
      refetchInterval: 60000, // Check every 60s, but don't auto-request
      staleTime: 30000, // Consider data stale after 30s to prevent excessive refetches
    },
  })

  // Removed automatic transaction requests - this should be handled by backend solvers
  // Auto-requesting transactions from frontend is a security risk and poor UX

  return {
    currentEpoch,
    lastEpoch,
    hasSeed: currentEpochSeed && 
      currentEpochSeed !== '0x0000000000000000000000000000000000000000000000000000000000000000',
    needsSeed: currentEpoch !== null && (
      !currentEpochSeed || 
      currentEpochSeed === '0x0000000000000000000000000000000000000000000000000000000000000000'
    ),
  }
}

