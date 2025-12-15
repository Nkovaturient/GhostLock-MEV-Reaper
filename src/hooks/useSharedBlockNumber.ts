import { useBlockNumber, useAccount } from 'wagmi'
import { useNetworkConfig } from './useNetworkConfig'
import { useEffect, useState } from 'react'
import { useEthersProvider } from './useEthers'

// Cache key for localStorage
const getCacheKey = (chainId: number) => `blockNumber_${chainId}`

/**
 * Centralized block number hook to prevent duplicate RPC calls
 * All components should use this instead of calling useBlockNumber directly
 * 
 * Optimizations:
 * - Immediate fetch on mount (no waiting for refetch interval)
 * - Fallback to direct provider call if wagmi query is slow
 * - localStorage cache for instant display on page load
 * - Network-aware (only fetches when on supported chain)
 * - Reduced refetch interval for faster updates
 */
export function useSharedBlockNumber() {
  const { chainId, isConnected } = useAccount()
  const { isSupported } = useNetworkConfig()
  const chainIdNum = chainId ? Number(chainId) : undefined
  const provider = useEthersProvider({ chainId: chainIdNum })
  
  // Load cached block number from localStorage for instant display
  const [cachedBlockNumber, setCachedBlockNumber] = useState<number | undefined>(() => {
    if (chainIdNum) {
      try {
        const cached = localStorage.getItem(getCacheKey(chainIdNum))
        if (cached) {
          const { blockNumber, timestamp } = JSON.parse(cached)
          // Use cache if less than 30 seconds old
          if (Date.now() - timestamp < 30000) {
            return Number(blockNumber)
          }
        }
      } catch {}
    }
    return undefined
  })
  
  // Fallback block number from direct provider call (faster initial load)
  const [fallbackBlockNumber, setFallbackBlockNumber] = useState<number | undefined>(undefined)
  const [isFetchingFallback, setIsFetchingFallback] = useState(false)
  
  // Fetch immediately from provider as fallback while wagmi query initializes
  useEffect(() => {
    if (chainIdNum && isSupported && isConnected && provider && !fallbackBlockNumber && !isFetchingFallback) {
      setIsFetchingFallback(true)
      // Add timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        setIsFetchingFallback(false)
      }, 5000) // 5 second timeout
      
      provider.getBlockNumber()
        .then(block => {
          clearTimeout(timeoutId)
          const blockNum = Number(block)
          setFallbackBlockNumber(blockNum)
          setIsFetchingFallback(false)
          // Cache the block number
          if (chainIdNum) {
            try {
              localStorage.setItem(getCacheKey(chainIdNum), JSON.stringify({
                blockNumber: blockNum,
                timestamp: Date.now()
              }))
            } catch {}
          }
        })
        .catch(() => {
          clearTimeout(timeoutId)
          setIsFetchingFallback(false)
        })
    }
  }, [chainIdNum, isSupported, isConnected, provider, fallbackBlockNumber, isFetchingFallback])
  
  // Single shared block number query with optimized settings
  const { data: blockNumber, isLoading, error } = useBlockNumber({ 
    chainId: chainIdNum,
    watch: false, // Disable WebSocket watch - use polling instead for better reliability
    query: {
      enabled: !!chainIdNum && isSupported && isConnected, // Only fetch when connected and on supported chain
      refetchInterval: 8000, // Reduced from 12s to 8s for faster updates
      refetchOnMount: true, // Always refetch on mount for immediate data
      refetchOnWindowFocus: true, // Refetch when window regains focus
      staleTime: 5000, // Reduced from 10s to 5s - data considered stale faster
      gcTime: 30000, // Reduced from 60s to 30s - cache for shorter time
      retry: 2, // Retry failed requests
      retryDelay: 1000, // Retry after 1 second
    }
  })
  
  // Update cache when blockNumber changes
  useEffect(() => {
    if (blockNumber && chainIdNum) {
      const blockNum = Number(blockNumber)
      setCachedBlockNumber(blockNum)
      try {
        localStorage.setItem(getCacheKey(chainIdNum), JSON.stringify({
          blockNumber: blockNum,
          timestamp: Date.now()
        }))
      } catch {}
    }
  }, [blockNumber, chainIdNum])
  
  // Priority: wagmi blockNumber > fallback > cached
  const finalBlockNumber = blockNumber 
    ? Number(blockNumber) 
    : (fallbackBlockNumber || cachedBlockNumber)
  
  // Only show loading if we don't have any block number (not even cached)
  const finalIsLoading = isLoading && !finalBlockNumber && !isFetchingFallback
  
  return {
    blockNumber: finalBlockNumber,
    isLoading: finalIsLoading,
    error,
    isSupported,
    chainId: chainIdNum,
  }
}

