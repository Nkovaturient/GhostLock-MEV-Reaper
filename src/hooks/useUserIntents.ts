import { useAccount, useReadContract, useBlockNumber, useReadContracts } from 'wagmi'
import { useQuery} from '@tanstack/react-query'
import { type IntentPayload } from '@/lib/blocklock-service'
import { GHOSTLOCK_INTENTS_ABI } from '@/lib/abis'
import { CONFIG, MARKETS } from '@/lib/config'
import { ethers } from 'ethers'
import { Blocklock } from 'blocklock-js'
const { markDecrypted } = await import('@/stores/requestIdStore')

export interface UserIntent {
  id: string
  user: string
  targetBlock: string
  encrypted: string
  status: 'Pending' | 'Ready' | 'Settled'
  inclusionBlock: string
  settlementPrice: string
  decrypted?: IntentPayload | null
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
  
  // Get the last request ID to know how many intents exist
  const { data: lastRequestId, isLoading: isLoadingLastId, error: errorLastId } = useReadContract({
    chainId: CONFIG.CHAIN_ID,
    abi: GHOSTLOCK_INTENTS_ABI,
    address: CONFIG.CONTRACTS.GHOSTLOCK_INTENTS as `0x${string}`,
    functionName: 'lastRequestId',
    query: {
      enabled: !!CONFIG.CONTRACTS.GHOSTLOCK_INTENTS,
      refetchInterval: 60000, // Refresh every 1min
    },
  })

  // Create contracts array for all intents (we'll limit to recent ones for performance)
  const maxIntentsToFetch = 50 // Limit to prevent too many contract calls
  const startId = lastRequestId ? Math.max(0, Number(lastRequestId) - maxIntentsToFetch + 1) : 0
  const endId = lastRequestId ? Number(lastRequestId) : 0
  
  const contracts = Array.from({ length: endId - startId + 1 }, (_, i) => ({
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
      refetchInterval: 60000, // Refresh every 1min
    },
  })

  // Transform the raw intent data to match our UserIntent interface
  const transformedIntents = useQuery({
    queryKey: ['intents-transformed', lastRequestId, address],
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

          // Only include intents for the current user
          if (contractIntent.requestedBy.toLowerCase() === address.toLowerCase()) {
            const encrypted = contractIntent.ct.v
            
            // Determine status based on ready flag and decrypted data
            let status: 'Pending' | 'Ready' | 'Settled' = 'Pending'
            if (contractIntent.ready) {
              status = contractIntent.decrypted && contractIntent.decrypted !== '0x' ? 'Settled' : 'Ready'
            }
            
            // If contract has decrypted bytes, decode into structured payload
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
              } catch (e) {
                console.error(`Failed to decode decrypted payload for intent ${requestId}:`, e)
              }
            }

            intents.push({
              id: requestId.toString(),
              user: contractIntent.requestedBy,
              targetBlock: contractIntent.unlockBlock.toString(),
              encrypted,
              status,
              inclusionBlock: contractIntent.encryptedAt.toString(),
              settlementPrice: '0',
              decrypted: decodedPayload
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
    isLoading: isLoadingLastId || isLoadingIntents || transformedIntents.isLoading,
    error: errorLastId || errorIntents || transformedIntents.error,
    data: transformedIntents.data ?? [],
    lastRequestId: lastRequestId ? Number(lastRequestId) : null,
  }
}

/**
 * Hook for decrypting a specific intent when user requests it
 */
export function useDecryptIntent() {
  const { data: currentBlock } = useBlockNumber({ watch: true })
  const { address } = useAccount()

  const decryptIntent = async (
    targetBlock: number,
    signer: ethers.Signer,
    requestId: number | string
  ): Promise<IntentPayload | null> => {
    if (!currentBlock || Number(currentBlock) < targetBlock) {
      throw new Error('Intent not yet decryptable')
    }

    try {
     const chainId = CONFIG.CHAIN_ID
      const blocklock = Blocklock.createFromChainId(signer, chainId)
      const status = await blocklock.fetchBlocklockStatus(BigInt(requestId))

      if (!status) {
        throw new Error('Blocklock request still pending')
      }

      const decryptedBytes = await blocklock.decrypt(
        status.ciphertext,
        status.decryptionKey
      )

      // Decode using the same ABI layout as encryption
      const abiCoder = ethers.AbiCoder.defaultAbiCoder()
      const decoded = abiCoder.decode(
        ['address', 'uint8', 'uint256', 'uint256', 'uint8', 'uint256'],
        decryptedBytes
      )

      const marketId = Number(decoded[4])
      const market = MARKETS.find(m => m.id === marketId)

      const payload: IntentPayload = {
        user: decoded[0],
        side: Number(decoded[1]) === 0 ? 'buy' : 'sell',
        amount: ethers.formatUnits(decoded[2], market?.baseDecimals ?? 18),
        limitPrice: ethers.formatUnits(decoded[3], market?.quoteDecimals ?? 18),
        slippageBps: 0,
        marketId,
        epoch: Number(decoded[5]),
        market: market?.name || 'Unknown'
      }
      try {
        if (address) {
          markDecrypted(CONFIG.CHAIN_ID, address, Number(requestId))
        }
      } catch {}
      return payload
    } catch (error) {
      console.error('Decryption failed:', error)
      return null
    }
  }

  return { decryptIntent }
}