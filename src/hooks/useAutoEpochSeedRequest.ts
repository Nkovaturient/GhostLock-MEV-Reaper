import { useReadContract } from 'wagmi'
import { useEpochRNG } from './useEpochRNG'
import { useNetworkConfig } from './useNetworkConfig'
import { EPOCH_RNG_ABI } from '../lib/abis'
import { useAccount } from 'wagmi'

/**
 * Monitors epoch seed availability. Seeding is permissionless via drand evmnet;
 * backend solvers typically call seedEpochWithSignature, but any account may relay.
 */
export function useAutoEpochSeedRequest() {
  const { isConnected } = useAccount()
  const { currentEpoch } = useEpochRNG()
  const { EPOCH_RNG_ADDRESS, isSupported, chainId } = useNetworkConfig()

  const { data: currentEpochSeed } = useReadContract({
    chainId: isSupported && chainId ? Number(chainId) : undefined,
    abi: EPOCH_RNG_ABI,
    address: isSupported && EPOCH_RNG_ADDRESS ? (EPOCH_RNG_ADDRESS as `0x${string}`) : undefined,
    functionName: 'epochSeed',
    args: currentEpoch !== null ? [BigInt(currentEpoch)] : undefined,
    query: {
      enabled: isSupported && isConnected && currentEpoch !== null && !!EPOCH_RNG_ADDRESS,
      refetchInterval: 60000,
      staleTime: 30000,
    },
  })

  const emptySeed = '0x0000000000000000000000000000000000000000000000000000000000000000'

  return {
    currentEpoch,
    hasSeed: currentEpochSeed && currentEpochSeed !== emptySeed,
    needsSeed: currentEpoch !== null && (
      !currentEpochSeed || currentEpochSeed === emptySeed
    ),
  }
}
