import { useQuery } from '@tanstack/react-query'
import { CONFIG } from '../lib/config'
import { BlocklockService } from '../lib/blocklock-service'
import { useNetworkConfig } from './useNetworkConfig'
import { useSharedBlockNumber } from './useSharedBlockNumber'

export interface AuctionData {
  id: string
  market: string
  clearingPrice: string
  aiPrice?: string
  intents: number
  settlementBlock: number
  status: 'Pending' | 'Settling' | 'Settled'
  volume: number
  timestamp: number
  epoch: number
  buyFill: string
  sellFill: string
}

export function useAuctionData() {
  return useQuery<AuctionData[]>({
    queryKey: ['auctions'],
    queryFn: async () => {
      const url = `${CONFIG.API.SOLVER_URL}/ai/health`;
      const response = await fetch(url, { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      return (await response.json()) as AuctionData[]
    },
    refetchInterval: 30000, // Reduced from 15s to 30s - auctions don't need frequent updates
    staleTime: 20000, // Consider stale after 20s
  })
}


export function useEpochInfo() {
  const { blockNumber, chainId } = useSharedBlockNumber()
  
  return useQuery({
    queryKey: ['epoch-info', chainId, blockNumber],
    queryFn: () => {
      if (!blockNumber) return null
      
      const currentBlock = blockNumber
      const currentEpoch = BlocklockService.getCurrentEpoch(currentBlock)
      const epochStartBlock = currentEpoch * CONFIG.AUCTION.EPOCH_DURATION_BLOCKS
      const epochEndBlock = epochStartBlock + CONFIG.AUCTION.EPOCH_DURATION_BLOCKS
      const blocksUntilNextEpoch = epochEndBlock - currentBlock
      
      return {
        currentEpoch,
        currentBlock,
        epochStartBlock,
        epochEndBlock,
        blocksUntilNextEpoch,
        progressPercent: ((currentBlock - epochStartBlock) / CONFIG.AUCTION.EPOCH_DURATION_BLOCKS) * 100
      }
    },
    enabled: !!blockNumber && !!chainId,
    refetchInterval: false, // Don't refetch - rely on shared block number updates
    staleTime: 10000, // Consider stale after 10s
  })
}