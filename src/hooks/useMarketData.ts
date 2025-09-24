import { useQuery } from '@tanstack/react-query'
import { CONFIG } from '../lib/config'

export interface MarketData {
  id: number
  name: string
  baseToken: string
  quoteToken: string
  baseSymbol: string
  quoteSymbol: string
  baseDecimals: number
  quoteDecimals: number
  currentPrice: number
  volume24h: number
  change24h: number
  high24h: number
  low24h: number
  activeIntents: number
  settledIntents: number
}

export interface MarketStats {
  totalValueProtected: number
  mevSavings: number
  successRate: number
  avgSettlementTime: number
  activeTraders: number
  totalVolume24h: number
  marketsCount: number
}

const API_BASE_URL = CONFIG.API.INDEXER_URL

// Fetch all markets data
export function useMarkets() {
  return useQuery<MarketData[]>({
    queryKey: ['markets'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/markets`)
      if (!response.ok) {
        throw new Error(`Failed to fetch markets: ${response.statusText}`)
      }
      return response.json()
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  })
}

// Fetch market statistics
export function useMarketStats() {
  return useQuery<MarketStats>({
    queryKey: ['market-stats'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/markets/stats`)
      if (!response.ok) {
        throw new Error(`Failed to fetch market stats: ${response.statusText}`)
      }
      return response.json()
    },
    refetchInterval: 360000, // Refresh every 1hr
  })
}

// Fetch specific market by ID
export function useMarket(marketId: number) {
  return useQuery<MarketData>({
    queryKey: ['market', marketId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/markets/${marketId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch market ${marketId}: ${response.statusText}`)
      }
      return response.json()
    },
    enabled: marketId >= 0,
    refetchInterval: 360000, // Refresh every 1hr
  })
}

// Force refresh market data
export async function refreshMarketData(): Promise<{ success: boolean; message: string; timestamp: string }> {
  const response = await fetch(`${API_BASE_URL}/markets/refresh`)
  if (!response.ok) {
    throw new Error(`Failed to refresh markets: ${response.statusText}`)
  }
  return response.json()
}
