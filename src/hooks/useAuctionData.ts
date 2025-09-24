import { useQuery } from '@tanstack/react-query'
import { CONFIG } from '../lib/config'
import { BlocklockService } from '../lib/blocklock-service'
import { useBlockNumber } from 'wagmi'

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
    refetchInterval: 15000,
  })
}


export function useEpochInfo() {
  const { data: blockNumber } = useBlockNumber({ watch: true })
  
  return useQuery({
    queryKey: ['epoch-info', blockNumber ? blockNumber.toString() : null],
    queryFn: () => {
      if (!blockNumber) return null
      
      const currentBlock = Number(blockNumber)
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
    enabled: !!blockNumber,
    refetchInterval: 60000, 
  })
}