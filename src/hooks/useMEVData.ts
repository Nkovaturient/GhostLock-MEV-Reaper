import { useQuery } from '@tanstack/react-query'
import { CONFIG } from '@/lib/config'

export interface MEVType {
  count: number
  volume: number
  profit: number
}

export interface MEVGlobal {
  totalMEV: number
  totalVolume: number
  totalTransactions: number
  avgMEVPerTx: number
  mevToVolumeRatio: number
  lastUpdated: string
}

export interface MEVTransaction {
  tx_hash: string
  block_number: number
  mev_type: string
  mev_usd: number
  user_swap_volume_usd: number
  protocol: string
  timestamp: string
}

export interface MEVData {
  mevTypes: {
    arb: MEVType
    frontrun: MEVType
    sandwich: MEVType
    backrun: MEVType
    liquid: MEVType
    swap: MEVType
  }
  global: MEVGlobal
  recentBlocks: any[]
  recentTransactions: MEVTransaction[]
}

const API_BASE_URL = CONFIG.API.INDEXER_URL

// Fetch comprehensive MEV data
export function useMEVData() {
  return useQuery<MEVData>({
    queryKey: ['mev-data'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/mev`)
      if (!response.ok) {
        throw new Error(`Failed to fetch MEV data: ${response.statusText}`)
      }
      return response.json()
    },
    refetchInterval: 60000,
  })
}

// Fetch MEV type breakdown
export function useMEVTypes() {
  return useQuery<MEVData['mevTypes']>({
    queryKey: ['mev-types'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/mev/types`)
      if (!response.ok) {
        throw new Error(`Failed to fetch MEV types: ${response.statusText}`)
      }
      return response.json()
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

// Fetch global MEV statistics
export function useMEVGlobal() {
  return useQuery<MEVGlobal>({
    queryKey: ['mev-global'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/mev/global`)
      if (!response.ok) {
        throw new Error(`Failed to fetch MEV global stats: ${response.statusText}`)
      }
      return response.json()
      },
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

// Fetch recent MEV transactions
export function useMEVTransactions() {
  return useQuery<MEVTransaction[]>({
    queryKey: ['mev-transactions'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/mev/transactions`)
      if (!response.ok) {
        throw new Error(`Failed to fetch MEV transactions: ${response.statusText}`)
      }
      return response.json()
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

// Force refresh MEV data
export async function refreshMEVData(): Promise<{ success: boolean; message: string; timestamp: string; data: MEVData }> {
  const response = await fetch(`${API_BASE_URL}/mev/refresh`)
  if (!response.ok) {
    throw new Error(`Failed to refresh MEV data: ${response.statusText}`)
  }
  return response.json()
}
