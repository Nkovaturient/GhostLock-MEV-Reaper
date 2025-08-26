import { useAccount, useReadContract, useBlockNumber } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { BlocklockService, statusFromUint, type IntentPayload } from '@/lib/blocklock-service'
import { GHOSTLOCK_INTENTS_ABI } from '@/lib/abis'
import { CONFIG } from '@/lib/config'

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

interface RawIntent {
  id: bigint
  user: string
  targetBlock: bigint
  encrypted: string
  status: number
  inclusionBlock: bigint
  settlementPrice: bigint
}

function bigIntToString<T>(obj: T): T {
  if (typeof obj === 'bigint') return obj.toString() as T
  if (Array.isArray(obj)) return obj.map(bigIntToString) as T
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {}
    for (const k in obj as Record<string, unknown>) {
      out[k] = bigIntToString((obj as Record<string, unknown>)[k])
    }
    return out as T
  }
  return obj
}

export function useUserIntents() {
  const { address } = useAccount()
  const { data: currentBlock } = useBlockNumber({ watch: true })

  // Fetch raw intents from contract
  const { data: rawIntents, isLoading: isLoadingRead, error: errorRead } = useReadContract({
    abi: GHOSTLOCK_INTENTS_ABI,
    address: CONFIG.CONTRACTS.GHOSTLOCK_INTENTS as `0x${string}`,
    functionName: 'getUserIntents',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5000,
      select(data) {
        const arr = Array.from(data as unknown as ReadonlyArray<RawIntent>)
        return arr.map((intent) => bigIntToString({
          id: intent.id.toString(),
          user: intent.user,
          targetBlock: intent.targetBlock.toString(),
          encrypted: intent.encrypted,
          status: statusFromUint(Number(intent.status)),
          inclusionBlock: intent.inclusionBlock.toString(),
          settlementPrice: intent.settlementPrice.toString(),
        })) as UserIntent[]
      },
    },
  })

  // Attempt to decrypt intents that are ready
  const decryptQuery = useQuery({
    queryKey: ['intents-decrypted', address, rawIntents, currentBlock],
    enabled: !!rawIntents && typeof currentBlock === 'bigint',
    queryFn: async () => {
      if (!rawIntents || typeof currentBlock !== 'bigint') return []
      
      // We can't decrypt without a signer, so we'll just return the raw intents
      // In a real implementation, decryption would happen server-side or when the user
      // specifically requests it with their connected wallet
      return rawIntents.map(intent => ({
        ...intent,
        decrypted: null // Placeholder - actual decryption requires signer
      }))
    },
    refetchInterval: 5000,
  })

  return {
    isLoading: isLoadingRead || decryptQuery.isLoading,
    error: errorRead || decryptQuery.error,
    data: decryptQuery.data ?? rawIntents ?? [],
  }
}

/**
 * Hook for decrypting a specific intent when user requests it
 */
export function useDecryptIntent() {
  const { address } = useAccount()
  const { data: currentBlock } = useBlockNumber({ watch: true })

  const decryptIntent = async (
    encrypted: string, 
    targetBlock: number,
    signer: ethers.Signer
  ): Promise<IntentPayload | null> => {
    if (!currentBlock || Number(currentBlock) < targetBlock) {
      throw new Error('Intent not yet decryptable')
    }

    const blocklockService = new BlocklockService(signer)
    return await blocklockService.tryDecryptIntent(encrypted, Number(currentBlock))
  }

  return { decryptIntent }
}