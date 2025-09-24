import { useAccount, useBlockNumber, useReadContracts, useReadContract, useWatchContractEvent } from 'wagmi'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { GHOSTLOCK_INTENTS_ABI } from '../lib/abis'
import { CONFIG, MARKETS } from '../lib/config'
import { ethers } from 'ethers'
import { markDecrypted } from '../stores/requestIdStore'
import { useState } from 'react'

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
  const { address } = useAccount()
  const queryClient = useQueryClient()
  
  // Track the highest request ID we've seen from events
  const [highestRequestId, setHighestRequestId] = useState<number>(0)

  // Seed highestRequestId by reading the contract's lastRequestId (handles reloads/missed events)
  const { data: lastRequestIdOnChain } = useReadContract({
    chainId: CONFIG.CHAIN_ID,
    abi: GHOSTLOCK_INTENTS_ABI,
    address: CONFIG.CONTRACTS.GHOSTLOCK_INTENTS as `0x${string}`,
    functionName: 'lastRequestId',
    args: [],
    query: { enabled: !!CONFIG.CONTRACTS.GHOSTLOCK_INTENTS as any, refetchInterval: 30000 }
  })

  if (lastRequestIdOnChain) {
    const onChain = Number(lastRequestIdOnChain as any)
    if (onChain > highestRequestId) {
      setHighestRequestId(onChain)
    }
  }
  
  // Listen for IntentSubmitted events to track new intents
  useWatchContractEvent({
    chainId: CONFIG.CHAIN_ID,
    abi: GHOSTLOCK_INTENTS_ABI,
    address: CONFIG.CONTRACTS.GHOSTLOCK_INTENTS as `0x${string}`,
    eventName: 'IntentSubmitted',
    onLogs: (logs) => {
      // Update the highest request ID when new intents are submitted
      logs.forEach(log => {
        const requestId = Number((log as any).args?.requestId ?? (log as any).args?.[0])
        if (requestId > highestRequestId) {
          setHighestRequestId(requestId)
        }
      })
      // Refresh the intents data
      queryClient.invalidateQueries({ queryKey: ['intents-transformed'] })
      console.log('IntentSubmitted event received:', logs)
    },
  })

  // Listen for IntentReady events to know when decryption is complete
  useWatchContractEvent({
    chainId: CONFIG.CHAIN_ID,
    abi: GHOSTLOCK_INTENTS_ABI,
    address: CONFIG.CONTRACTS.GHOSTLOCK_INTENTS as `0x${string}`,
    eventName: 'IntentReady',
    onLogs: (logs) => {
      // Refresh the intents data when an intent is ready
      queryClient.invalidateQueries({ queryKey: ['intents-transformed'] })
      console.log('IntentReady event received:', logs)
    },
  })

  // Create contracts array for all intents (we'll limit to recent ones for performance)
  const maxIntentsToFetch = 50 // Limit to prevent too many contract calls
  const startId = Math.max(1, highestRequestId - maxIntentsToFetch + 1)
  const endId = highestRequestId
  
  const count = endId >= startId ? (endId - startId + 1) : 0
  const contracts = Array.from({ length: count }, (_, i) => ({
    chainId: CONFIG.CHAIN_ID,
    abi: GHOSTLOCK_INTENTS_ABI,
    address: CONFIG.CONTRACTS.GHOSTLOCK_INTENTS as `0x${string}`,
    functionName: 'intents' as const,
    args: [BigInt(startId + i)] as const,
  }))

  // Fetch all intents data
  const { data: intentsData, isLoading: isLoadingIntents, error: errorIntents } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0 && !!CONFIG.CONTRACTS.GHOSTLOCK_INTENTS,
      refetchInterval: 30000, // Refresh more frequently
    },
  })

  // Transform the raw intent data to match our UserIntent interface
  const transformedIntents = useQuery({
    queryKey: ['intents-transformed', highestRequestId, address],
    enabled: !!intentsData && intentsData.length > 0,
    queryFn: () => {
      if (!intentsData || !address) return []
      
      const intents: UserIntent[] = []
      
      for (let i = 0; i < intentsData.length; i++) {
        try {
          const intentData = intentsData[i]
          const requestId = startId + i
          
          if (!intentData?.result) continue
          
          // Safely extract the contract intent data
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

          // Only include intents for the current user; guard nulls
          if (contractIntent.requestedBy && address && contractIntent.requestedBy.toLowerCase() === address.toLowerCase()) {
            const encrypted = contractIntent.ct.v
            
            // Check if contract has decrypted bytes and decode into structured payload
            let isDecrypted = false
            let decodedPayload: IntentPayload | null = null
            
            if (contractIntent.decrypted && contractIntent.decrypted !== '0x') {
              try {
                const abiCoder = ethers.AbiCoder.defaultAbiCoder()
                const decoded = abiCoder.decode(
                  ['address', 'uint8', 'uint256', 'uint256', 'uint8', 'uint256'],
                  contractIntent.decrypted
                )
                const marketId = Number(decoded[4])
                const market = MARKETS.find(m => m.id === marketId)
                decodedPayload = {
                  user: decoded[0],
                  side: Number(decoded[1]) === 0 ? 'buy' : 'sell',
                  amount: ethers.formatUnits(decoded[2], market?.baseDecimals ?? 18),
                  limitPrice: ethers.formatUnits(decoded[3], market?.quoteDecimals ?? 18),
                  slippageBps: 0,
                  marketId,
                  epoch: Number(decoded[5]),
                  market: market?.name || 'Unknown'
                }
                isDecrypted = true
              } catch (e) {
                console.error(`Failed to decode decrypted payload for intent ${requestId}:`, e)
              }
            }

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
              transactionHash: undefined // TODO: Extract from contract events or logs
            })
          }
        } catch (error) {
          console.error(`Error processing intent ${i}:`, error)
        }
      }
      
      // Sort by ID (newest first)
      return intents.sort((a, b) => Number(b.id) - Number(a.id))
    },
    refetchInterval: 60000, // Refresh every 1min
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
  const { data: currentBlock } = useBlockNumber({ watch: true })
  const { address } = useAccount()

  const decryptIntent = async (
    targetBlock: number,
    _signer: ethers.Signer,
    requestId: number | string
  ): Promise<IntentPayload | null> => {
    if (!currentBlock || Number(currentBlock) < targetBlock) {
      throw new Error('Intent not yet decryptable')
    }

    try {
      const chainId = CONFIG.CHAIN_ID
      // Mark as decrypted locally for UI purposes
      if (address) {
        markDecrypted(chainId, address, Number(requestId))
      }
      return null
    } catch (error) {
      console.error('Mark as Decrypted:', error)
      return null
    }
  }

  return { decryptIntent }
}