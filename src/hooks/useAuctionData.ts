import { useQuery } from '@tanstack/react-query'
import { CONFIG } from '@/lib/config'
import { BlocklockService } from '@/lib/blocklock-service'
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
    queryKey: [''],
    queryFn: async () => {
      try {
        const response = await fetch(`${CONFIG.API.SOLVER_URL}/auctions`, {
          cache: 'no-store'
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        return data as AuctionData[]
      } catch (error) {
        console.error('Failed to fetch auction data:', error)
        // Return mock data for development
        return [
          {
            id: 'A-1001',
            market: 'ETH/USDC',
            clearingPrice: '3120.52',
            aiPrice: '3118.90',
            intents: 42,
            settlementBlock: 12345678,
            status: 'Settled' as const,
            volume: 1250000,
            timestamp: Date.now() - 3600000,
            epoch: 2468,
            buyFill: '125.5',
            sellFill: '125.5'
          },
          {
            id: 'A-1000',
            market: 'WBTC/USDC',
            clearingPrice: '64123.00',
            aiPrice: '64100.12',
            intents: 11,
            settlementBlock: 12345500,
            status: 'Settling' as const,
            volume: 890000,
            timestamp: Date.now() - 7200000,
            epoch: 2467,
            buyFill: '8.2',
            sellFill: '8.2'
          }
        ]
      }
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
  })
}

export function useMarketStats() {
  return useQuery({
    queryKey: ['market-stats'],
    queryFn: async () => {
      try {
        const response = await fetch(`${CONFIG.API.SOLVER_URL}/stats`)
        if (!response.ok) throw new Error('Failed to fetch stats')
        return await response.json()
      } catch (error) {
        console.error('Failed to fetch market stats:', error)
        // Return mock stats for development
        return {
          totalValueProtected: 12400000,
          mevSavings: 847000,
          successRate: 99.8,
          avgSettlementTime: 42,
          activeTraders: 1247,
          totalVolume24h: 2890000
        }
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

export function useEpochInfo() {
  const { data: blockNumber } = useBlockNumber({ watch: true })
  
  return useQuery({
    queryKey: ['epoch-info', blockNumber],
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
    refetchInterval: 1000, // Update every second for real-time progress
  })
}