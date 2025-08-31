import { useQuery } from '@tanstack/react-query'
import { useEthersProvider } from './useEthers'
import { ethers } from 'ethers'

export interface BlockchainData {
  currentBlock: number
  gasPrice: string
  baseFee: string
  networkUtilization: number
  avgBlockTime: number
  lastUpdated: string
}

export interface GasData {
  slow: string
  standard: string
  fast: string
  rapid: string
}

// Session storage keys for caching
const BLOCKCHAIN_DATA_KEY = 'blockchain_data_cache'
const GAS_PRICES_KEY = 'gas_prices_cache'
const NETWORK_STATS_KEY = 'network_stats_cache'
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds

// Helper function to get cached data
function getCachedData<T>(key: string): T | null {
  try {
    const cached = sessionStorage.getItem(key)
    if (!cached) return null
    
    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()
    
    // Check if cache is still valid (within 1 hour)
    if (now - timestamp < CACHE_DURATION) {
      return data
    }
    
    // Cache expired, remove it
    sessionStorage.removeItem(key)
    return null
  } catch {
    return null
  }
}

// Helper function to set cached data
function setCachedData<T>(key: string, data: T): void {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    }
    sessionStorage.setItem(key, JSON.stringify(cacheData))
  } catch {
    // Ignore storage errors
  }
}

// Fetch real-time blockchain data - ONCE PER SESSION
export function useBlockchainData() {
  const provider = useEthersProvider()

  return useQuery<BlockchainData>({
    queryKey: ['blockchain-data'],
    queryFn: async () => {
      if (!provider) {
        throw new Error('Provider not available')
      }

      // Check cache first
      const cached = getCachedData<BlockchainData>(BLOCKCHAIN_DATA_KEY)
      if (cached) {
        console.log('Using cached blockchain data')
        return cached
      }

      try {
        console.log('Fetching fresh blockchain data...')
        // Fetch data in parallel
        const [currentBlock, gasPrice, blockData] = await Promise.all([
          provider.getBlockNumber(),
          provider.getFeeData(),
          provider.getBlock('latest')
        ])

        // Calculate network utilization based on gas used vs gas limit
        const gasUsed = blockData?.gasUsed || 0n
        const gasLimit = blockData?.gasLimit || 30000000n
        const networkUtilization = Number((gasUsed * 100n) / gasLimit)

        // Calculate average block time (simplified)
        const avgBlockTime = 12 // Base Sepolia target block time

        const result = {
          currentBlock: Number(currentBlock),
          gasPrice: ethers.formatUnits(gasPrice.gasPrice || 0n, 'gwei'),
          baseFee: ethers.formatUnits(blockData?.baseFeePerGas || 0n, 'gwei'),
          networkUtilization,
          avgBlockTime,
          lastUpdated: new Date().toISOString()
        }

        // Cache the result
        setCachedData(BLOCKCHAIN_DATA_KEY, result)
        return result
      } catch (error) {
        console.error('Error fetching blockchain data:', error)
        throw error
      }
    },
    refetchInterval: false, // NO automatic refetching
    staleTime: Infinity, // Data never goes stale
    enabled: !!provider,
    retry: 1, // Only retry once on failure
    retryDelay: 10000, // Wait 10 seconds between retries
  })
}

// Fetch gas price recommendations - ONCE PER SESSION
export function useGasPrices() {
  const provider = useEthersProvider()

  return useQuery<GasData>({
    queryKey: ['gas-prices'],
    queryFn: async () => {
      if (!provider) {
        throw new Error('Provider not available')
      }

      // Check cache first
      const cached = getCachedData<GasData>(GAS_PRICES_KEY)
      if (cached) {
        console.log('Using cached gas prices')
        return cached
      }

      try {
        console.log('Fetching fresh gas prices...')
        const feeData = await provider.getFeeData()
        const baseFee = feeData.maxFeePerGas || 0n
        const maxPriorityFee = feeData.maxPriorityFeePerGas || 0n

        // Calculate different gas price tiers
        const slow = baseFee + (maxPriorityFee * 1n)
        const standard = baseFee + (maxPriorityFee * 2n)
        const fast = baseFee + (maxPriorityFee * 3n)
        const rapid = baseFee + (maxPriorityFee * 4n)

        const result = {
          slow: ethers.formatUnits(slow, 'gwei'),
          standard: ethers.formatUnits(standard, 'gwei'),
          fast: ethers.formatUnits(fast, 'gwei'),
          rapid: ethers.formatUnits(rapid, 'gwei')
        }

        // Cache the result
        setCachedData(GAS_PRICES_KEY, result)
        return result
      } catch (error) {
        console.error('Error fetching gas prices:', error)
        throw error
      }
    },
    refetchInterval: false, // NO automatic refetching
    staleTime: Infinity, // Data never goes stale
    enabled: !!provider,
    retry: 1,
    retryDelay: 10000,
  })
}

// Fetch network statistics - ONCE PER SESSION
export function useNetworkStats() {
  const provider = useEthersProvider()

  return useQuery({
    queryKey: ['network-stats'],
    queryFn: async () => {
      if (!provider) {
        throw new Error('Provider not available')
      }

      // Check cache first
      const cached = getCachedData<any>(NETWORK_STATS_KEY)
      if (cached) {
        console.log('Using cached network stats')
        return cached
      }

      try {
        console.log('Fetching fresh network stats...')
        const [currentBlock, feeData] = await Promise.all([
          provider.getBlockNumber(),
          provider.getFeeData()
        ])

        // Calculate network congestion level
        const baseFee = feeData.maxFeePerGas || 0n
        const congestionLevel = baseFee > ethers.parseUnits('50', 'gwei') ? 'High' :
                               baseFee > ethers.parseUnits('20', 'gwei') ? 'Medium' : 'Low'

        const result = {
          currentBlock: Number(currentBlock),
          congestionLevel,
          baseFee: ethers.formatUnits(baseFee, 'gwei'),
          timestamp: new Date().toISOString()
        }

        // Cache the result
        setCachedData(NETWORK_STATS_KEY, result)
        return result
      } catch (error) {
        console.error('Error fetching network stats:', error)
        throw error
      }
    },
    refetchInterval: false, // NO automatic refetching
    staleTime: Infinity, // Data never goes stale
    enabled: !!provider,
    retry: 1,
    retryDelay: 10000,
  })
}

// Manual refresh function for when user explicitly wants fresh data
export function refreshBlockchainData() {
  sessionStorage.removeItem(BLOCKCHAIN_DATA_KEY)
  sessionStorage.removeItem(GAS_PRICES_KEY)
  sessionStorage.removeItem(NETWORK_STATS_KEY)
}
