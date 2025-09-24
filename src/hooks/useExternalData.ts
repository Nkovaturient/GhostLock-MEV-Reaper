import { useQuery } from '@tanstack/react-query'
import { CONFIG } from '../lib/config'

export interface CryptoData {
  ethereum: {
    price: number
    change24h: number
    volume24h: number
    marketCap: number
  }
  wbtc: {
    price: number
    change24h: number
    volume24h: number
    marketCap: number
  }
  usdc: {
    price: number
    change24h: number
    volume24h: number
    marketCap: number
  }
}

export interface DefiProtocol {
  name: string
  tvl: number
  change1d: number
  change7d: number
  category: string
}

export interface GasData {
  slow: string
  standard: string
  fast: string
  rapid: string
}

export interface ExternalMEVData {
  totalMEV: number
  mevTypes: {
    arbitrage: number
    sandwich: number
    frontrunning: number
  }
  recentBlocks: any[]
  timestamp: string
}

export interface AllExternalData {
  crypto: CryptoData
  defi: DefiProtocol[]
  gas: GasData
  mev: ExternalMEVData
  timestamp: string
}

const API_BASE_URL = CONFIG.API.INDEXER_URL

// Fetch cryptocurrency market data from CoinGecko
export function useCryptoData() {
  return useQuery<CryptoData>({
    queryKey: ['crypto-data'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/external/crypto`)
      if (!response.ok) {
        throw new Error(`Failed to fetch crypto data: ${response.statusText}`)
      }
      return response.json()
    },
    refetchInterval: 60000, // Refresh every 1 minute
    staleTime: 30000, // Consider data stale after 30 seconds
  })
}

// Fetch DeFi protocol data from DeFi Llama
export function useDefiData() {
  return useQuery<DefiProtocol[]>({
    queryKey: ['defi-data'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/external/defi`)
      if (!response.ok) {
        throw new Error(`Failed to fetch DeFi data: ${response.statusText}`)
      }
      return response.json()
    },
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 120000, // Consider data stale after 2 minutes
  })
}

// Fetch gas price data
export function useGasData() {
  return useQuery<GasData>({
    queryKey: ['gas-data'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/external/gas`)
      if (!response.ok) {
        throw new Error(`Failed to fetch gas data: ${response.statusText}`)
      }
      return response.json()
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  })
}

// Fetch MEV data from external sources
export function useExternalMEVData() {
  return useQuery<ExternalMEVData>({
    queryKey: ['external-mev-data'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/external/mev`)
      if (!response.ok) {
        throw new Error(`Failed to fetch external MEV data: ${response.statusText}`)
      }
      return response.json()
    },
    refetchInterval: 120000, // Refresh every 2 minutes
    staleTime: 60000, // Consider data stale after 1 minute
  })
}

// Fetch all external data at once
export function useAllExternalData() {
  return useQuery<AllExternalData>({
    queryKey: ['all-external-data'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/external/all`)
      if (!response.ok) {
        throw new Error(`Failed to fetch external data: ${response.statusText}`)
      }
      return response.json()
    },
    refetchInterval: 60000, // Refresh every 1 minute
    staleTime: 30000, // Consider data stale after 30 seconds
  })
}

// Force refresh all external data
export async function refreshExternalData(): Promise<{ success: boolean; message: string; timestamp: string; data: AllExternalData }> {
  const response = await fetch(`${API_BASE_URL}/external/refresh`)
  if (!response.ok) {
    throw new Error(`Failed to refresh external data: ${response.statusText}`)
  }
  return response.json()
}
