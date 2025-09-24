import { useQuery } from '@tanstack/react-query'
import { CONFIG } from '../lib/config'

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
  params?: {
    address: string
    count: number
    block_number: number
    page: number
  }
}

const API_BASE_URL = CONFIG.API.INDEXER_URL

// Fetch comprehensive MEV data with dynamic parameters
export function useMEVData(params?: {
  address?: string
  count?: number
  block_number?: number
  page?: number
}) {
  const queryParams = new URLSearchParams()
  if (params?.address) queryParams.append('address', params.address)
  if (params?.count) queryParams.append('count', params.count.toString())
  if (params?.block_number) queryParams.append('block_number', params.block_number.toString())
  if (params?.page) queryParams.append('page', params.page.toString())

  const queryString = queryParams.toString()
  const url = queryString ? `${API_BASE_URL}/mev?${queryString}` : `${API_BASE_URL}/mev`

  return useQuery<MEVData>({
    queryKey: ['mev-data', params],
    queryFn: async () => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch MEV data: ${response.statusText}`)
      }
      return response.json()
    },
    refetchInterval: 60000,
    enabled: true,
  })
}

// Fetch MEV type breakdown with dynamic parameters
export function useMEVTypes(params?: {
  address?: string
  count?: number
  block_number?: number
  page?: number
}) {
  const queryParams = new URLSearchParams()
  if (params?.address) queryParams.append('address', params.address)
  if (params?.count) queryParams.append('count', params.count.toString())
  if (params?.block_number) queryParams.append('block_number', params.block_number.toString())
  if (params?.page) queryParams.append('page', params.page.toString())

  const queryString = queryParams.toString()
  const url = queryString ? `${API_BASE_URL}/mev/types?${queryString}` : `${API_BASE_URL}/mev/types`

  return useQuery<MEVData['mevTypes']>({
    queryKey: ['mev-types', params],
    queryFn: async () => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch MEV types: ${response.statusText}`)
      }
      return response.json()
    },
    refetchInterval: 60000,
    staleTime: 30000,
    enabled: true,
  })
}

// Fetch global MEV statistics with dynamic parameters
export function useMEVGlobal(params?: {
  address?: string
  count?: number
  block_number?: number
  page?: number
}) {
  const queryParams = new URLSearchParams()
  if (params?.address) queryParams.append('address', params.address)
  if (params?.count) queryParams.append('count', params.count.toString())
  if (params?.block_number) queryParams.append('block_number', params.block_number.toString())
  if (params?.page) queryParams.append('page', params.page.toString())

  const queryString = queryParams.toString()
  const url = queryString ? `${API_BASE_URL}/mev/global?${queryString}` : `${API_BASE_URL}/mev/global`

  return useQuery<MEVGlobal>({
    queryKey: ['mev-global', params],
    queryFn: async () => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch MEV global stats: ${response.statusText}`)
      }
      return response.json()
      },
    refetchInterval: 60000,
    staleTime: 30000,
    enabled: true,
  })
}

// Fetch recent MEV transactions with dynamic parameters
export function useMEVTransactions(params?: {
  address?: string
  count?: number
  block_number?: number
  page?: number
}) {
  const queryParams = new URLSearchParams()
  if (params?.address) queryParams.append('address', params.address)
  if (params?.count) queryParams.append('count', params.count.toString())
  if (params?.block_number) queryParams.append('block_number', params.block_number.toString())
  if (params?.page) queryParams.append('page', params.page.toString())

  const queryString = queryParams.toString()
  const url = queryString ? `${API_BASE_URL}/mev/transactions?${queryString}` : `${API_BASE_URL}/mev/transactions`

  return useQuery<MEVTransaction[]>({
    queryKey: ['mev-transactions', params],
    queryFn: async () => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch MEV transactions: ${response.statusText}`)
      }
      return response.json()
    },
    refetchInterval: 60000,
    staleTime: 30000,
    enabled: true,
  })
}

// Force refresh MEV data with dynamic parameters
export async function refreshMEVData(params?: {
  address?: string
  count?: number
  block_number?: number
  page?: number
}): Promise<{ success: boolean; message: string; timestamp: string; data: MEVData }> {
  const queryParams = new URLSearchParams()
  if (params?.address) queryParams.append('address', params.address)
  if (params?.count) queryParams.append('count', params.count.toString())
  if (params?.block_number) queryParams.append('block_number', params.block_number.toString())
  if (params?.page) queryParams.append('page', params.page.toString())

  const queryString = queryParams.toString()
  const url = queryString ? `${API_BASE_URL}/mev/refresh?${queryString}` : `${API_BASE_URL}/mev/refresh`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to refresh MEV data: ${response.statusText}`)
  }
  return response.json()
}
