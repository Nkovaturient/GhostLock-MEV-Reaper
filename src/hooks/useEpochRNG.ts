import { useAccount, usePublicClient, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useSharedBlockNumber } from './useSharedBlockNumber'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { EPOCH_RNG_ABI } from '../lib/abis'
import { getCurrentEpoch } from '../lib/epoch'
import { useNetworkConfig } from './useNetworkConfig'
import { fetchBeacon, DRAND_EVMNET, signatureToG1 } from '../lib/drand'
import { useState } from 'react'

export interface EpochSeedData {
  epoch: number
  seed: `0x${string}` | null
  isSeeded: boolean
  drandRound: number | null
}

export function useEpochRNG() {
  const { chainId } = useAccount()
  const { blockNumber } = useSharedBlockNumber()
  const queryClient = useQueryClient()
  const { writeContractAsync } = useWriteContract()
  const { EPOCH_RNG_ADDRESS, isSupported } = useNetworkConfig()

  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null)
  const publicClient = usePublicClient({
    chainId: chainId ? Number(chainId) : undefined,
  })

  const { data: receipt } = useWaitForTransactionReceipt({
    hash: lastTxHash || undefined,
  })

  const currentEpoch = blockNumber ? getCurrentEpoch(blockNumber) : null

  const getEpochSeed = (epoch: number) => {
    return useReadContract({
      chainId: chainId ? Number(chainId) : undefined,
      abi: EPOCH_RNG_ABI,
      address: EPOCH_RNG_ADDRESS as `0x${string}` | undefined,
      functionName: 'epochSeed',
      args: [BigInt(epoch)],
      query: {
        enabled: isSupported && !!EPOCH_RNG_ADDRESS && epoch >= 0,
        refetchInterval: 60000,
        staleTime: 30000,
      },
    })
  }

  /** Relay a drand evmnet round and seed the epoch on-chain. Permissionless — no dcipher fee. */
  const seedEpochFromDrand = async (epoch: number) => {
    if (!EPOCH_RNG_ADDRESS || !chainId || !publicClient) {
      throw new Error('EpochRNG contract address not configured or chain not connected')
    }

    const round = await publicClient.readContract({
      address: EPOCH_RNG_ADDRESS as `0x${string}`,
      abi: EPOCH_RNG_ABI,
      functionName: 'roundForEpoch',
      args: [BigInt(epoch)],
    })

    const beacon = await fetchBeacon(Number(round), DRAND_EVMNET)
    const { x, y } = signatureToG1(beacon.signature)

    const hash = await writeContractAsync({
      chainId,
      abi: EPOCH_RNG_ABI,
      address: EPOCH_RNG_ADDRESS as `0x${string}`,
      functionName: 'seedEpochWithSignature',
      args: [BigInt(epoch), x, y],
    })

    setLastTxHash(hash)
    queryClient.invalidateQueries({ queryKey: ['epoch-seed', epoch] })
    return hash
  }

  return {
    currentEpoch,
    getEpochSeed,
    seedEpochFromDrand,
    receipt,
    lastTxHash,
  }
}

export function useEpochSeed(epoch: number | null) {
  const { getEpochSeed } = useEpochRNG()

  const seedQuery = epoch !== null ? getEpochSeed(epoch) : null

  return useQuery<EpochSeedData>({
    queryKey: ['epoch-seed', epoch],
    queryFn: async () => {
      if (epoch === null || !seedQuery) {
        return {
          epoch: epoch || 0,
          seed: null,
          isSeeded: false,
          drandRound: null,
        }
      }

      const seed = seedQuery.data as `0x${string}` | undefined
      const isEmpty = !seed || seed === '0x0000000000000000000000000000000000000000000000000000000000000000'

      return {
        epoch,
        seed: isEmpty ? null : seed,
        isSeeded: !isEmpty,
        drandRound: null,
      }
    },
    enabled: epoch !== null && !!seedQuery,
    refetchInterval: 30000,
  })
}

export function useCurrentEpochSeed() {
  const { currentEpoch } = useEpochRNG()
  return useEpochSeed(currentEpoch)
}
