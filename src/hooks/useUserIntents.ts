import { useAccount, useReadContracts, useReadContract, useWatchContractEvent } from 'wagmi'
import { useSharedBlockNumber } from './useSharedBlockNumber'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { GHOSTLOCK_INTENTS_ABI, EPOCH_RNG_ABI } from '../lib/abis'
import { CONFIG, MARKETS } from '../lib/config'
import { ethers } from 'ethers'
import { markDecrypted, getRequestIds } from '../stores/requestIdStore'
import { useState, useMemo, useEffect } from 'react'
import { BlocklockService } from '../lib/blocklock-service'
import { orderIntentsBySeed } from '../lib/epoch-ordering'
import { useNetworkConfig } from './useNetworkConfig'

export interface UserIntent {
  id: string
  user: string
  targetBlock: string
  encrypted: string
  status: 'Pending' | 'Ready' | 'Settled'
  inclusionBlock: string
  settlementPrice: string
  decrypted?: IntentPayload | null
  isDecrypted: boolean
  transactionHash?: string // Add transaction hash for verification
}

export interface IntentPayload {
  market: string
  side: 'buy' | 'sell'
  amount: string
  limitPrice: string
  slippageBps: number
  marketId: number
  epoch: number
  user: string
}

interface ContractIntent {
  requestedBy: `0x${string}`
  encryptedAt: number
  unlockBlock: number
  ct: {
    u: {
      x: readonly [bigint, bigint]
      y: readonly [bigint, bigint]
    }
    v: `0x${string}`
    w: `0x${string}`
  }
  ready: boolean
  decrypted: `0x${string}`
}

export function useUserIntents() {
  const { address, chainId } = useAccount()
  const queryClient = useQueryClient()
  const { CONTRACT_ADDRESS: GHOSTLOCK_INTENTS_ADDRESS, EPOCH_RNG_ADDRESS, isSupported } = useNetworkConfig()
  
  // Track the highest request ID we've seen from events
  const [highestRequestId, setHighestRequestId] = useState<number>(0)
  // Track user's known request IDs from localStorage
  const [userRequestIds, setUserRequestIds] = useState<Set<number>>(new Set())

  // Load user's request IDs from localStorage on mount and when address/chain changes
  useEffect(() => {
    if (address && chainId) {
      const storedIds = getRequestIds(Number(chainId), address)
      setUserRequestIds(new Set(storedIds))
      // Update highestRequestId if we have stored IDs
      if (storedIds.length > 0) {
        const maxStored = Math.max(...storedIds)
        setHighestRequestId(prev => Math.max(prev, maxStored))
      }
    }
  }, [address, chainId])

  // Seed highestRequestId by reading the contract's lastRequestId (handles reloads/missed events)
  // Reduced frequency - only check every 60s since this is just for initialization
  const { data: lastRequestIdOnChain } = useReadContract({
    chainId: chainId ? Number(chainId) : undefined,
    abi: GHOSTLOCK_INTENTS_ABI,
    address: GHOSTLOCK_INTENTS_ADDRESS as `0x${string}` | undefined,
    functionName: 'lastRequestId',
    args: [],
    query: { 
      enabled: isSupported && !!GHOSTLOCK_INTENTS_ADDRESS, 
      refetchInterval: 60000, // Reduced from 30s to 60s
      staleTime: 30000, // Consider stale after 30s
    }
  })

  // Update highestRequestId when on-chain value changes
  useEffect(() => {
    if (lastRequestIdOnChain) {
      const onChain = Number(lastRequestIdOnChain as any)
      setHighestRequestId(prev => Math.max(prev, onChain))
    }
  }, [lastRequestIdOnChain])
  
  // Listen for IntentSubmitted events to track new intents
  useWatchContractEvent({
    chainId: chainId ? Number(chainId) : undefined,
    abi: GHOSTLOCK_INTENTS_ABI,
    address: GHOSTLOCK_INTENTS_ADDRESS as `0x${string}` | undefined,
    eventName: 'IntentSubmitted',
    onLogs: (logs) => {
      // Update the highest request ID when new intents are submitted
      logs.forEach(log => {
        const requestId = Number((log as any).args?.requestId ?? (log as any).args?.[0])
        const requestedBy = (log as any).args?.user ?? (log as any).args?.[1]
        setHighestRequestId(prev => Math.max(prev, requestId))
        // Add to user's request IDs if it's from this user
        if (address && requestedBy?.toLowerCase() === address.toLowerCase()) {
          setUserRequestIds(prev => new Set([...prev, requestId]))
        }
      })
      // Refresh the intents data
      queryClient.invalidateQueries({ queryKey: ['intents-transformed'] })
      console.log('IntentSubmitted event received:', logs)
    },
  })

  // Listen for IntentReady events to know when decryption is complete
  useWatchContractEvent({
    chainId: chainId ? Number(chainId) : undefined,
    abi: GHOSTLOCK_INTENTS_ABI,
    address: GHOSTLOCK_INTENTS_ADDRESS as `0x${string}` | undefined,
    eventName: 'IntentReady',
    onLogs: (logs) => {
      // Refresh the intents data when an intent is ready
      queryClient.invalidateQueries({ queryKey: ['intents-transformed'] })
      console.log('IntentReady event received:', logs)
    },
  })

  // Create contracts array for intents
  // Strategy: Fetch user's known request IDs + recent range to catch any missed ones
  const maxIntentsToFetch = 50 // Limit to prevent too many contract calls
  const recentStartId = Math.max(1, highestRequestId - maxIntentsToFetch + 1)
  const recentEndId = highestRequestId
  
  // Combine user's known IDs with recent range
  const requestIdsToFetch = useMemo(() => {
    const ids = new Set<number>()
    
    // Add user's known request IDs from localStorage
    userRequestIds.forEach(id => ids.add(id))
    
    // Add recent range to catch any intents we might have missed
    for (let i = recentStartId; i <= recentEndId; i++) {
      ids.add(i)
    }
    
    return Array.from(ids).sort((a, b) => a - b)
  }, [userRequestIds, recentStartId, recentEndId])
  
  const contracts = useMemo(() => {
    if (!isSupported || !GHOSTLOCK_INTENTS_ADDRESS || requestIdsToFetch.length === 0) return []
    
    return requestIdsToFetch.map(requestId => ({
      chainId: chainId ? Number(chainId) : undefined,
      abi: GHOSTLOCK_INTENTS_ABI,
      address: GHOSTLOCK_INTENTS_ADDRESS as `0x${string}`,
      functionName: 'intents' as const,
      args: [BigInt(requestId)] as const,
    }))
  }, [requestIdsToFetch, chainId, GHOSTLOCK_INTENTS_ADDRESS, isSupported])

  // Fetch all intents data - reduced frequency to avoid excessive RPC calls
  const { data: intentsData, isLoading: isLoadingIntents, error: errorIntents } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0 && isSupported && !!GHOSTLOCK_INTENTS_ADDRESS,
      refetchInterval: 60000, // Reduced from 30s to 60s - intents don't change that frequently
      staleTime: 30000, // Consider stale after 30s
    },
  })

  // First pass: Transform intents and extract unique epochs
  const { data: intentsWithEpochs, dataUpdatedAt: intentsUpdatedAt } = useQuery({
    queryKey: ['intents-raw', highestRequestId, address, intentsData?.length, requestIdsToFetch.length],
    enabled: !!intentsData && intentsData.length > 0 && !!address,
    queryFn: () => {
      if (!intentsData || !address || requestIdsToFetch.length === 0) return { intents: [], epochs: new Set<number>() }
      
      const intents: UserIntent[] = []
      const epochs = new Set<number>()
      
      for (let i = 0; i < intentsData.length; i++) {
        try {
          const intentData = intentsData[i]
          // Get the corresponding request ID - contracts array matches intentsData array
          const requestId = i < requestIdsToFetch.length ? requestIdsToFetch[i] : recentStartId + i
          
          if (!intentData?.result) continue
          
          const result = intentData.result as any
          if (!result?.requestedBy || !result?.ct?.v) continue
          
          const contractIntent: ContractIntent = {
            requestedBy: result.requestedBy,
            encryptedAt: result.encryptedAt || 0,
            unlockBlock: result.unlockBlock || 0,
            ct: {
              u: result.ct.u || { x: [BigInt(0), BigInt(0)], y: [BigInt(0), BigInt(0)] },
              v: result.ct.v,
              w: result.ct.w || '0x'
            },
            ready: result.ready || false,
            decrypted: result.decrypted || '0x'
          }

          if (contractIntent.requestedBy && contractIntent.requestedBy.toLowerCase() === address.toLowerCase()) {
            const encrypted = contractIntent.ct.v
            let isDecrypted = false
            let decodedPayload: IntentPayload | null = null
            let intentEpoch = 0
            
            if (contractIntent.decrypted && contractIntent.decrypted !== '0x') {
              try {
                const abiCoder = ethers.AbiCoder.defaultAbiCoder()
                const decoded = abiCoder.decode(
                  ['address', 'uint8', 'uint256', 'uint256', 'uint8', 'uint256'],
                  contractIntent.decrypted
                )
                const marketId = Number(decoded[4])
                intentEpoch = Number(decoded[5])
                const market = MARKETS.find(m => m.id === marketId)
                decodedPayload = {
                  user: decoded[0],
                  side: Number(decoded[1]) === 0 ? 'buy' : 'sell',
                  amount: ethers.formatUnits(decoded[2], market?.baseDecimals ?? 18),
                  limitPrice: ethers.formatUnits(decoded[3], market?.quoteDecimals ?? 18),
                  slippageBps: 0,
                  marketId,
                  epoch: intentEpoch,
                  market: market?.name || 'Unknown'
                }
                isDecrypted = true
              } catch (e) {
                console.error(`Failed to decode decrypted payload for intent ${requestId}:`, e)
              }
            } else {
              intentEpoch = BlocklockService.getTargetEpoch(contractIntent.unlockBlock)
            }

            epochs.add(intentEpoch)

            intents.push({
              id: requestId.toString(),
              user: contractIntent.requestedBy,
              targetBlock: contractIntent.unlockBlock.toString(),
              encrypted,
              status: contractIntent.ready ? 'Ready' : 'Pending',
              inclusionBlock: contractIntent.encryptedAt.toString(),
              settlementPrice: '0',
              decrypted: decodedPayload,
              isDecrypted,
              transactionHash: undefined
            })
          }
        } catch (error) {
          console.error(`Error processing intent ${i}:`, error)
        }
      }
      
      return { intents, epochs }
    },
    refetchInterval: 60000,
  })

  // Fetch epoch seeds for all unique epochs in parallel
  const epochArray = useMemo(() => {
    if (!intentsWithEpochs?.epochs) return []
    return Array.from(intentsWithEpochs.epochs)
  }, [intentsWithEpochs?.epochs])

  const epochSeedContracts = useMemo(() => {
    if (!EPOCH_RNG_ADDRESS || epochArray.length === 0 || !chainId) return []
    return epochArray.map(epoch => ({
      chainId: Number(chainId),
      abi: EPOCH_RNG_ABI,
      address: EPOCH_RNG_ADDRESS as `0x${string}`,
      functionName: 'epochSeed' as const,
      args: [BigInt(epoch)] as const,
    }))
  }, [epochArray, EPOCH_RNG_ADDRESS, chainId])

  // Fetch epoch seeds - reduced frequency since seeds don't change frequently
  const { data: epochSeedsData } = useReadContracts({
    contracts: epochSeedContracts,
    query: {
      enabled: epochSeedContracts.length > 0 && isSupported && !!EPOCH_RNG_ADDRESS,
      refetchInterval: 60000, // Reduced from 30s to 60s - epoch seeds are relatively static
      staleTime: 30000, // Consider stale after 30s
    },
  })

  // Build epoch seed map
  const epochSeedMap = useMemo(() => {
    const map = new Map<number, `0x${string}` | null>()
    if (!epochSeedsData || !epochArray) return map
    
    epochSeedsData.forEach((seedData, index) => {
      const epoch = epochArray[index]
      if (epoch !== undefined) {
        const seed = seedData?.result as `0x${string}` | undefined
        const isEmpty = !seed || seed === '0x0000000000000000000000000000000000000000000000000000000000000000'
        map.set(epoch, isEmpty ? null : seed)
      }
    })
    return map
  }, [epochSeedsData, epochArray])

  // Final transformation: Order intents by epoch seed (RANDOMIZE layer)
  const transformedIntents = useQuery({
    queryKey: ['intents-transformed', highestRequestId, address, intentsUpdatedAt, epochSeedMap.size],
    enabled: !!intentsWithEpochs && intentsWithEpochs.intents.length > 0,
    queryFn: () => {
      if (!intentsWithEpochs?.intents) return []
      
      const epochIntentsMap = new Map<number, UserIntent[]>()
      
      for (const intent of intentsWithEpochs.intents) {
        const epoch = intent.decrypted?.epoch ?? BlocklockService.getTargetEpoch(Number(intent.targetBlock))
        if (!epochIntentsMap.has(epoch)) {
          epochIntentsMap.set(epoch, [])
        }
        epochIntentsMap.get(epoch)!.push(intent)
      }
      
      const orderedIntents: UserIntent[] = []
      for (const [epoch, epochIntents] of epochIntentsMap.entries()) {
        const seed = epochSeedMap.get(epoch) || null
        
        if (seed) {
          const ordered = orderIntentsBySeed(
            epochIntents.map(intent => ({ ...intent, requestId: Number(intent.id) })),
            seed
          ) as UserIntent[]
          orderedIntents.push(...ordered)
        } else {
          orderedIntents.push(...epochIntents)
        }
      }
      
      return orderedIntents.sort((a, b) => Number(b.id) - Number(a.id))
    },
    refetchInterval: 60000,
  })

  return {
    isLoading: isLoadingIntents || transformedIntents.isLoading,
    error: errorIntents || transformedIntents.error,
    data: transformedIntents.data ?? [],
    lastRequestId: highestRequestId,
  }
}

/**
 *  only for UI display
 */
export function useDecryptIntent() {
  const { blockNumber: currentBlock } = useSharedBlockNumber() // Use shared block number
  const { address, chainId } = useAccount()

  const decryptIntent = async (
    targetBlock: number,
    _signer: ethers.Signer,
    requestId: number | string
  ): Promise<IntentPayload | null> => {
    if (!currentBlock || currentBlock < targetBlock) {
      throw new Error('Intent not yet decryptable')
    }

    try {
      // Use current chain ID from account, fallback to Base Sepolia
      const chainIdNum = chainId ? Number(chainId) : 84532
      // Mark as decrypted locally for UI purposes
      if (address) {
        markDecrypted(chainIdNum, address, Number(requestId))
      }
      return null
    } catch (error) {
      console.error('Mark as Decrypted:', error)
      return null
    }
  }

  return { decryptIntent }
}