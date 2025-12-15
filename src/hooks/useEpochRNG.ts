import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from 'wagmi'
import { useSharedBlockNumber } from './useSharedBlockNumber'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { EPOCH_RNG_ABI } from '../lib/abis'
import { BlocklockService } from '../lib/blocklock-service'
import { useNetworkConfig } from './useNetworkConfig'
import { ethers } from 'ethers'
import { useState } from 'react'

export interface EpochSeedData {
  epoch: number
  seed: `0x${string}` | null
  isRequested: boolean
  requestId: number | null
  lastEpoch: number
  lastRequestId: number
}

export function useEpochRNG() {
  const { address, chainId } = useAccount()
  const { blockNumber } = useSharedBlockNumber() // Use shared block number
  const queryClient = useQueryClient()
  const { writeContractAsync } = useWriteContract()
  const { EPOCH_RNG_ADDRESS, isSupported } = useNetworkConfig()
  
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null)
  
  const { data: receipt } = useWaitForTransactionReceipt({
    hash: lastTxHash || undefined,
  })

  const currentEpoch = blockNumber 
    ? BlocklockService.getCurrentEpoch(blockNumber)
    : null

  // Reduced frequency - lastEpoch doesn't change frequently
  const lastEpochQuery = useReadContract({
    chainId: chainId ? Number(chainId) : undefined,
    abi: EPOCH_RNG_ABI,
    address: EPOCH_RNG_ADDRESS as `0x${string}` | undefined,
    functionName: 'lastEpoch',
    query: {
      enabled: isSupported && !!EPOCH_RNG_ADDRESS,
      refetchInterval: 60000, // Reduced from 30s to 60s
      staleTime: 30000,
    },
  })

  // Reduced frequency - lastRequestId doesn't change frequently
  const lastRequestIdQuery = useReadContract({
    chainId: chainId ? Number(chainId) : undefined,
    abi: EPOCH_RNG_ABI,
    address: EPOCH_RNG_ADDRESS as `0x${string}` | undefined,
    functionName: 'lastRequestId',
    query: {
      enabled: isSupported && !!EPOCH_RNG_ADDRESS,
      refetchInterval: 60000, // Reduced from 30s to 60s
      staleTime: 30000,
    },
  })

  const getEpochSeed = (epoch: number) => {
    return useReadContract({
      chainId: chainId ? Number(chainId) : undefined,
      abi: EPOCH_RNG_ABI,
      address: EPOCH_RNG_ADDRESS as `0x${string}` | undefined,
      functionName: 'epochSeed',
      args: [BigInt(epoch)],
      query: {
        enabled: isSupported && !!EPOCH_RNG_ADDRESS && epoch >= 0,
        refetchInterval: 60000, // Reduced from 30s to 60s - epoch seeds are relatively static
        staleTime: 30000,
      },
    })
  }

  useWatchContractEvent({
    chainId: chainId || undefined,
    abi: EPOCH_RNG_ABI,
    address: EPOCH_RNG_ADDRESS as `0x${string}` | undefined,
    eventName: 'EpochSeed',
    onLogs: (logs) => {
      logs.forEach(log => {
        const epoch = Number((log as any).args?.epoch ?? (log as any).args?.[0])
        queryClient.invalidateQueries({ queryKey: ['epoch-seed', epoch] })
        queryClient.invalidateQueries({ queryKey: ['epoch-seeds'] })
      })
    },
  })

  useWatchContractEvent({
    chainId: chainId || undefined,
    abi: EPOCH_RNG_ABI,
    address: EPOCH_RNG_ADDRESS as `0x${string}` | undefined,
    eventName: 'EpochRequested',
    onLogs: (logs) => {
      logs.forEach(log => {
        const epoch = Number((log as any).args?.epoch ?? (log as any).args?.[0])
        queryClient.invalidateQueries({ queryKey: ['epoch-seed', epoch] })
        queryClient.invalidateQueries({ queryKey: ['epoch-seeds'] })
      })
    },
  })

  const requestEpochSeed = async (epoch: number, callbackGasLimit: number = 500000) => {
    if (!EPOCH_RNG_ADDRESS || !chainId) {
      throw new Error('EpochRNG contract address not configured or chain not connected')
    }

    try {
      const hash = await writeContractAsync({
        chainId,
        abi: EPOCH_RNG_ABI,
        address: EPOCH_RNG_ADDRESS as `0x${string}`,
        functionName: 'requestEpochSeed',
        args: [BigInt(epoch), callbackGasLimit],
        value: ethers.parseEther('0.001'),
      })

      setLastTxHash(hash)
      queryClient.invalidateQueries({ queryKey: ['epoch-seed', epoch] })
      return hash
    } catch (error) {
      console.error('Error requesting epoch seed:', error)
      throw error
    }
  }

  return {
    currentEpoch,
    lastEpoch: lastEpochQuery.data ? Number(lastEpochQuery.data) : null,
    lastRequestId: lastRequestIdQuery.data ? Number(lastRequestIdQuery.data) : null,
    getEpochSeed,
    requestEpochSeed,
    isLoading: lastEpochQuery.isLoading || lastRequestIdQuery.isLoading,
    error: lastEpochQuery.error || lastRequestIdQuery.error,
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
          isRequested: false,
          requestId: null,
          lastEpoch: 0,
          lastRequestId: 0,
        }
      }

      const seed = seedQuery.data as `0x${string}` | undefined
      const isEmpty = !seed || seed === '0x0000000000000000000000000000000000000000000000000000000000000000'

      return {
        epoch,
        seed: isEmpty ? null : seed,
        isRequested: !isEmpty,
        requestId: null,
        lastEpoch: 0,
        lastRequestId: 0,
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

