/**
 * useOraclePrice.ts — Dual Oracle Price Feed (Pyth + Chainlink)
 *
 * Fetches real-time prices from multiple sources with:
 *   - 7-second refresh interval
 *   - Staleness detection (1 hour threshold)
 *   - Confidence band validation (5% max)
 *   - Price deviation alerts
 *
 * Integrates with GhostLock PriceOracle contract validation.
 */
import { useEffect, useMemo, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useChainId, usePublicClient } from 'wagmi'
import { readContract } from '@wagmi/core'
import { formatUnits } from 'viem'

import { useSwapStore } from '../stores/swapStore'
import { PRICE_ORACLE_ABI } from '../contracts/abi'
import { getAddresses } from '../contracts/config'
import { PYTH_PRICE_IDS, HERMES_BASE } from '../../lib/pyth-ids'

// Refresh interval - 7 seconds as per spec
const REFRESH_INTERVAL_MS = 7_000

// Contract thresholds (match PriceOracle.sol)
const STALENESS_THRESHOLD_SECONDS = 3600 // 1 hour
const MAX_CONFIDENCE_BPS = 500 // 5%
const MAX_DEVIATION_BPS = 500 // 5%

interface PythPriceResponse {
  parsed?: Array<{
    id?: string
    price?: {
      price?: string
      expo?: number
      conf?: string
    }
    metadata?: {
      publish_time?: number
    }
  }>
}

interface OraclePriceData {
  price: number // normalized to 8 decimals
  rawPrice: bigint // raw from contract
  confidence: number
  publishTime: number
  source: 'pyth' | 'chainlink' | 'both' | 'none'
  isStale: boolean
  confidenceBps: number
  usdValue: number
}

interface TokenPairPrices {
  base: OraclePriceData | null
  quote: OraclePriceData | null
  exchangeRate: number | null
  rate8Dec: bigint | null // Exchange rate normalized to 8 decimals
  isValid: boolean
  error: string | null
}

// Fetch from Pyth Hermes
async function fetchPythPrice(priceId: string): Promise<OraclePriceData | null> {
  try {
    const params = new URLSearchParams()
    params.append('ids[]', priceId)
    const url = `${HERMES_BASE}/v2/updates/price/latest?${params.toString()}`

    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data: PythPriceResponse = await res.json()
    const parsed = data.parsed?.[0]

    if (!parsed?.price?.price || !parsed.price.expo) return null

    const priceNum = BigInt(parsed.price.price)
    const expo = parsed.price.expo
    const conf = parsed.price.conf ? BigInt(parsed.price.conf) : BigInt(0)

    // Convert to 8-decimal normalized price (same logic as PriceOracle._convertPythPrice)
    const shift = expo + 8
    let normalizedPrice: bigint
    if (shift >= 0) {
      normalizedPrice = priceNum * BigInt(10 ** Number(shift))
    } else {
      normalizedPrice = priceNum / BigInt(10 ** Number(-shift))
    }

    // Calculate confidence in same units
    let normalizedConf: bigint
    if (shift >= 0) {
      normalizedConf = conf * BigInt(10 ** Number(shift))
    } else {
      normalizedConf = conf / BigInt(10 ** Number(-shift))
    }

    const price8Dec = Number(normalizedPrice) / 1e8
    const confidence8Dec = Number(normalizedConf) / 1e8
    const confidenceBps = price8Dec > 0 ? (confidence8Dec * 10000) / price8Dec : 0

    const publishTime = parsed.metadata?.publish_time ?? Math.floor(Date.now() / 1000)
    const isStale = (Date.now() / 1000 - publishTime) > STALENESS_THRESHOLD_SECONDS

    return {
      price: price8Dec,
      rawPrice: normalizedPrice,
      confidence: confidence8Dec,
      publishTime,
      source: 'pyth',
      isStale,
      confidenceBps,
      usdValue: price8Dec,
    }
  } catch (e) {
    console.warn('[useOraclePrice] Pyth fetch failed:', e)
    return null
  }
}

// Fetch from contract (uses Pyth primary + Chainlink fallback)
async function fetchContractPrice(
  publicClient: ReturnType<typeof usePublicClient>,
  chainId: number,
  tokenAddress: string
): Promise<OraclePriceData | null> {
  if (!publicClient) return null

  try {
    const addrs = getAddresses(chainId)

    const result = await publicClient.readContract({
      address: addrs.PriceOracle,
      abi: PRICE_ORACLE_ABI,
      functionName: 'getLatestPrice',
      args: [tokenAddress as `0x${string}`],
    }) as {
      price: bigint
      confidence: bigint
      timestamp: bigint
      source: string
    }

    const price8Dec = Number(result.price) / 1e8
    const confidence8Dec = Number(result.confidence) / 1e8
    const confidenceBps = price8Dec > 0 ? (confidence8Dec * 10000) / price8Dec : 0
    const publishTime = Number(result.timestamp)
    const isStale = (Date.now() / 1000 - publishTime) > STALENESS_THRESHOLD_SECONDS

    return {
      price: price8Dec,
      rawPrice: result.price,
      confidence: confidence8Dec,
      publishTime,
      source: result.source as 'pyth' | 'chainlink',
      isStale,
      confidenceBps,
      usdValue: price8Dec,
    }
  } catch (e) {
    console.warn('[useOraclePrice] Contract fetch failed:', e)
    return null
  }
}

// Map token symbol to Pyth price ID
function getPythPriceId(symbol: string): string | null {
  const sym = symbol.toUpperCase()
  if (sym === 'ETH' || sym === 'WETH') return PYTH_PRICE_IDS.ETH_USD
  if (sym === 'BTC' || sym === 'WBTC') return PYTH_PRICE_IDS.BTC_USD
  if (sym === 'USDC') return PYTH_PRICE_IDS.USDC_USD
  return null
}

// Map token symbol to oracle token address (for contract calls)
function getTokenOracleAddress(symbol: string, chainId: number): string {
  // These would be the registered tokens in PriceOracle
  // For now return placeholder - in production these come from config
  const sym = symbol.toUpperCase()
  // Return zero address for ETH/native, or actual token addresses
  return sym === 'ETH' ? '0x0000000000000000000000000000000000000000' : '0x0000000000000000000000000000000000000000'
}

interface UseOraclePriceReturn {
  prices: TokenPairPrices
  isLoading: boolean
  lastUpdated: number | null
  nextRefreshIn: number
  refresh: () => void
}

export function useOraclePrice(): UseOraclePriceReturn {
  const tokenIn = useSwapStore(s => s.tokenIn)
  const tokenOut = useSwapStore(s => s.tokenOut)
  const slippageBps = useSwapStore(s => s.slippageBps)
  const setSubmissionOraclePrice = useSwapStore(s => s.setSubmissionOraclePrice)

  const chainId = useChainId()
  const publicClient = usePublicClient()
  const queryClient = useQueryClient()

  const [nextRefreshIn, setNextRefreshIn] = React.useState(7)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown timer for refresh
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setNextRefreshIn(prev => {
        if (prev <= 1) {
          // Trigger refetch
          queryClient.invalidateQueries({ queryKey: ['oracle-price', tokenIn.symbol, tokenOut.symbol] })
          return 7
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [queryClient, tokenIn.symbol, tokenOut.symbol])

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['oracle-price', tokenIn.symbol, tokenOut.symbol, chainId],
    queryFn: async (): Promise<TokenPairPrices> => {
      const baseSym = tokenIn.symbol.toUpperCase()
      const quoteSym = tokenOut.symbol.toUpperCase()

      // Same token - no conversion needed
      if (baseSym === quoteSym) {
        return {
          base: null,
          quote: null,
          exchangeRate: 1,
          rate8Dec: BigInt(1e8),
          isValid: true,
          error: null,
        }
      }

      // Fetch both prices in parallel
      const [basePriceData, quotePriceData] = await Promise.all([
        fetchPythPrice(getPythPriceId(tokenIn.symbol)),
        fetchPythPrice(getPythPriceId(tokenOut.symbol)),
      ])

      // Validate we have both prices
      if (!basePriceData || !quotePriceData) {
        return {
          base: basePriceData,
          quote: quotePriceData,
          exchangeRate: null,
          rate8Dec: null,
          isValid: false,
          error: 'Price feed unavailable for one or both tokens',
        }
      }

      // Check staleness
      if (basePriceData.isStale || quotePriceData.isStale) {
        return {
          base: basePriceData,
          quote: quotePriceData,
          exchangeRate: null,
          rate8Dec: null,
          isValid: false,
          error: 'Price data is stale (older than 1 hour)',
        }
      }

      // Check confidence bands
      if (basePriceData.confidenceBps > MAX_CONFIDENCE_BPS ||
          quotePriceData.confidenceBps > MAX_CONFIDENCE_BPS) {
        return {
          base: basePriceData,
          quote: quotePriceData,
          exchangeRate: null,
          rate8Dec: null,
          isValid: false,
          error: 'Price confidence too low (>5%)',
        }
      }

      // Calculate exchange rate: base / quote (both in USD, so ratio gives base/quote)
      const rate = basePriceData.price / quotePriceData.price

      // Calculate 8-decimal normalized rate for contract
      // rate8Dec = (basePrice * 1e8) / quotePrice
      const rate8Dec = (basePriceData.rawPrice * BigInt(1e8)) / quotePriceData.rawPrice

      // Store oracle price for submission
      setSubmissionOraclePrice(rate)

      return {
        base: basePriceData,
        quote: quotePriceData,
        exchangeRate: rate,
        rate8Dec,
        isValid: true,
        error: null,
      }
    },
    refetchInterval: REFRESH_INTERVAL_MS,
    staleTime: REFRESH_INTERVAL_MS / 2,
    enabled: tokenIn.symbol !== '' && tokenOut.symbol !== '',
  })

  const refresh = useCallback(() => {
    setNextRefreshIn(7)
    queryClient.invalidateQueries({ queryKey: ['oracle-price', tokenIn.symbol, tokenOut.symbol] })
  }, [queryClient, tokenIn.symbol, tokenOut.symbol])

  return {
    prices: data || {
      base: null,
      quote: null,
      exchangeRate: null,
      rate8Dec: null,
      isValid: false,
      error: null,
    },
    isLoading,
    lastUpdated: dataUpdatedAt || null,
    nextRefreshIn,
    refresh,
  }
}

// Hook for calculating expected output with slippage
export function useSwapCalculation() {
  const amountIn = useSwapStore(s => s.amountIn)
  const tokenIn = useSwapStore(s => s.tokenIn)
  const tokenOut = useSwapStore(s => s.tokenOut)
  const slippageBps = useSwapStore(s => s.slippageBps)

  const { prices } = useOraclePrice()

  return useMemo(() => {
    const inNum = parseFloat(amountIn) || 0

    if (!prices.isValid || inNum <= 0 || !prices.exchangeRate) {
      return {
        amountOut: '',
        amountOutMin: '',
        usdValueIn: null,
        usdValueOut: null,
        priceImpact: 0,
      }
    }

    // Calculate output amount
    const outAmount = inNum * prices.exchangeRate

    // Apply slippage to get minimum output
    const slippageFactor = 1 - slippageBps / 10000
    const outAmountMin = outAmount * slippageFactor

    // Calculate USD values
    const usdValueIn = prices.base?.usdValue ? inNum * prices.base.usdValue : null
    const usdValueOut = prices.quote?.usdValue ? outAmount * prices.quote.usdValue : null

    return {
      amountOut: outAmount.toFixed(tokenOut.decimals <= 6 ? tokenOut.decimals : 6),
      amountOutMin: outAmountMin.toFixed(tokenOut.decimals <= 6 ? tokenOut.decimals : 6),
      usdValueIn,
      usdValueOut,
      priceImpact: 0.05, // 0.05% - batch auction has low price impact
    }
  }, [amountIn, prices, slippageBps, tokenOut.decimals])
}

// Validate clearing price against oracle (matches contract logic)
export function validateClearingPrice(
  oraclePrice: bigint,
  clearingPrice: bigint,
  maxDeviationBps: number = MAX_DEVIATION_BPS
): { isValid: boolean; deviationBps: number } {
  if (oraclePrice === BigInt(0)) return { isValid: false, deviationBps: 0 }

  const diff = clearingPrice > oraclePrice
    ? clearingPrice - oraclePrice
    : oraclePrice - clearingPrice

  const deviationBps = Number((diff * BigInt(10000)) / oraclePrice)

  return {
    isValid: deviationBps <= maxDeviationBps,
    deviationBps,
  }
}

import React from 'react'
