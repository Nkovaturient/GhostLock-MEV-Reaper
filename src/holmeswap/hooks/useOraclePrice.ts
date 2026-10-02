/**
 * useOraclePrice.ts — Oracle price feed for HolmeSwap UI
 *
 * Priority: on-chain Pyth getPriceUnsafe → CoinGecko USD fallback → optional Hermes (API key).
 * Avoids PriceOracle.getLatestPrice (reverts when feeds stale) and unauthenticated Hermes (401).
 */
import { useEffect, useMemo, useRef, useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useChainId, usePublicClient } from 'wagmi'

import { useSwapStore } from '../stores/swapStore'
import { getMarketFromTokenPair, getMarketId } from '../contracts/config'
import { HERMES_BASE } from '../../lib/pyth-ids'
import {
  PYTH_ABI,
  PYTH_CONTRACT_BY_CHAIN,
  getCoingeckoId,
  getPythPriceIdForSymbol,
} from '../lib/oracleFeeds'
import type { PublicClient } from 'viem'
import { isDocumentVisible } from '../lib/wagmiQueryDefaults'

const REFRESH_INTERVAL_MS = 60_000
const LEG_CACHE_TTL_MS = 60_000
const STALENESS_THRESHOLD_SECONDS = 3600
const STABLE_STALENESS_THRESHOLD_SECONDS = 7 * 24 * 3600
const MAX_CONFIDENCE_BPS = 500
const MAX_DEVIATION_BPS = 500

interface PythPriceResponse {
  parsed?: Array<{
    id?: string
    price?: { price?: string; expo?: number; conf?: string }
    metadata?: { publish_time?: number }
  }>
}

export interface OraclePriceData {
  price: number
  rawPrice: bigint
  confidence: number
  publishTime: number
  source: 'pyth' | 'chainlink' | 'both' | 'coingecko' | 'none'
  isStale: boolean
  confidenceBps: number
  usdValue: number
}

export interface TokenPairPrices {
  base: OraclePriceData | null
  quote: OraclePriceData | null
  exchangeRate: number | null
  rate8Dec: bigint | null
  isValid: boolean
  error: string | null
}

function normalizePythPrice(priceNum: bigint, expo: number, conf: bigint): OraclePriceData {
  const shift = expo + 8
  let normalizedPrice: bigint
  if (shift >= 0) {
    normalizedPrice = priceNum * BigInt(10 ** Number(shift))
  } else {
    normalizedPrice = priceNum / BigInt(10 ** Number(-shift))
  }

  let normalizedConf: bigint
  if (shift >= 0) {
    normalizedConf = conf * BigInt(10 ** Number(shift))
  } else {
    normalizedConf = conf / BigInt(10 ** Number(-shift))
  }

  const price8Dec = Number(normalizedPrice) / 1e8
  const confidence8Dec = Number(normalizedConf) / 1e8
  const confidenceBps = price8Dec > 0 ? (confidence8Dec * 10000) / price8Dec : 0

  return {
    price: price8Dec,
    rawPrice: normalizedPrice,
    confidence: confidence8Dec,
    publishTime: Math.floor(Date.now() / 1000),
    source: 'pyth',
    isStale: false,
    confidenceBps,
    usdValue: price8Dec,
  }
}

function withPublishMeta(
  data: OraclePriceData,
  publishTime: number,
  stalenessSec: number,
): OraclePriceData {
  const isStale = (Date.now() / 1000 - publishTime) > stalenessSec
  return { ...data, publishTime, isStale }
}

const legCache = new Map<string, { leg: OraclePriceData; ts: number }>()

function legCacheKey(chainId: number, symbol: string) {
  return `${chainId}:${symbol.toUpperCase()}`
}

function getCachedLeg(chainId: number, symbol: string): OraclePriceData | null {
  const hit = legCache.get(legCacheKey(chainId, symbol))
  if (!hit || Date.now() - hit.ts > LEG_CACHE_TTL_MS) return null
  return hit.leg
}

function setCachedLeg(chainId: number, symbol: string, leg: OraclePriceData) {
  legCache.set(legCacheKey(chainId, symbol), { leg, ts: Date.now() })
}

async function fetchCoingeckoBatch(symbols: string[]): Promise<Map<string, OraclePriceData>> {
  const out = new Map<string, OraclePriceData>()
  const ids = [...new Set(symbols.map(getCoingeckoId).filter(Boolean) as string[])]
  if (ids.length === 0) return out

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(','))}&vs_currencies=usd`,
    )
    if (!res.ok) return out
    const data = await res.json() as Record<string, { usd?: number }>
    const now = Math.floor(Date.now() / 1000)

    for (const sym of symbols) {
      const id = getCoingeckoId(sym)
      const px = id ? data[id]?.usd : undefined
      if (px == null || px <= 0) continue
      out.set(sym.toUpperCase(), {
        price: px,
        rawPrice: BigInt(Math.round(px * 1e8)),
        confidence: px * 0.001,
        publishTime: now,
        source: 'coingecko',
        isStale: false,
        confidenceBps: 10,
        usdValue: px,
      })
    }
  } catch {
    /* ignore */
  }
  return out
}

async function fetchPythBatchOnChain(
  publicClient: PublicClient | undefined,
  chainId: number,
  symbols: string[],
): Promise<Map<string, OraclePriceData>> {
  const out = new Map<string, OraclePriceData>()
  if (!publicClient) return out

  const pythAddr = PYTH_CONTRACT_BY_CHAIN[chainId]
  if (!pythAddr) return out

  const contracts = symbols
    .map(sym => ({ sym, id: getPythPriceIdForSymbol(sym) }))
    .filter((x): x is { sym: string; id: `0x${string}` } => Boolean(x.id))
    .map(({ sym, id }) => ({
      sym,
      address: pythAddr,
      abi: PYTH_ABI,
      functionName: 'getPriceUnsafe' as const,
      args: [id] as const,
    }))

  if (contracts.length === 0) return out

  try {
    const results = await publicClient.multicall({
      contracts: contracts.map(({ address, abi, functionName, args }) => ({
        address, abi, functionName, args,
      })),
    })

    results.forEach((result, i) => {
      if (result.status !== 'success') return
      const sym = contracts[i].sym
      const p = result.result as { price: bigint; conf: bigint; expo: number; publishTime: bigint }
      const staleness =
        sym.toUpperCase() === 'USDC' ? STABLE_STALENESS_THRESHOLD_SECONDS : STALENESS_THRESHOLD_SECONDS
      const base = normalizePythPrice(BigInt(p.price), p.expo, BigInt(p.conf))
      out.set(sym.toUpperCase(), withPublishMeta(base, Number(p.publishTime), staleness))
    })
  } catch {
    /* ignore */
  }
  return out
}

async function resolveLeg(
  symbol: string,
  chainId: number,
  publicClient: PublicClient | undefined,
  pythBatch: Map<string, OraclePriceData>,
  cgBatch: Map<string, OraclePriceData>,
): Promise<{ leg: OraclePriceData | null; path: string }> {
  const symU = symbol.toUpperCase()
  const cached = getCachedLeg(chainId, symU)
  if (cached) return { leg: cached, path: 'cache' }

  const onChain = pythBatch.get(symU)
  if (onChain && !onChain.isStale) {
    setCachedLeg(chainId, symU, onChain)
    return { leg: onChain, path: 'pyth-onchain' }
  }

  const cg = cgBatch.get(symU)
  if (cg) {
    setCachedLeg(chainId, symU, cg)
    return { leg: cg, path: onChain ? 'coingecko-stale-fallback' : 'coingecko' }
  }

  if (onChain) {
    setCachedLeg(chainId, symU, onChain)
    return { leg: onChain, path: 'pyth-onchain-stale' }
  }

  const pythId = getPythPriceIdForSymbol(symbol)
  if (pythId) {
    const hermes = await fetchPythHermes(pythId)
    if (hermes && !hermes.isStale) {
      setCachedLeg(chainId, symU, hermes)
      return { leg: hermes, path: 'hermes' }
    }
  }

  return { leg: null, path: 'none' }
}

async function fetchMarketLegs(
  baseSymbol: string,
  quoteSymbol: string,
  publicClient: PublicClient | undefined,
  chainId: number,
): Promise<{ base: OraclePriceData | null; quote: OraclePriceData | null; paths: string[] }> {
  const baseU = baseSymbol.toUpperCase()
  const quoteU = quoteSymbol.toUpperCase()

  const baseCached = getCachedLeg(chainId, baseU)
  const quoteCached = getCachedLeg(chainId, quoteU)
  if (baseCached && quoteCached) {
    return { base: baseCached, quote: quoteCached, paths: ['cache', 'cache'] }
  }

  const cgBatch = await fetchCoingeckoBatch([baseSymbol, quoteSymbol])
  const baseCg = cgBatch.get(baseU)
  const quoteCg = cgBatch.get(quoteU)

  if (baseCg && quoteCg) {
    setCachedLeg(chainId, baseU, baseCg)
    setCachedLeg(chainId, quoteU, quoteCg)
    return { base: baseCg, quote: quoteCg, paths: ['coingecko', 'coingecko'] }
  }

  const missingForPyth = [baseSymbol, quoteSymbol].filter(
    sym => !cgBatch.get(sym.toUpperCase()) && !getCachedLeg(chainId, sym.toUpperCase()),
  )
  const pythBatch =
    missingForPyth.length > 0
      ? await fetchPythBatchOnChain(publicClient, chainId, missingForPyth)
      : new Map<string, OraclePriceData>()

  const [baseResult, quoteResult] = await Promise.all([
    resolveLeg(baseSymbol, chainId, publicClient, pythBatch, cgBatch),
    resolveLeg(quoteSymbol, chainId, publicClient, pythBatch, cgBatch),
  ])

  return {
    base: baseResult.leg,
    quote: quoteResult.leg,
    paths: [baseResult.path, quoteResult.path],
  }
}

async function fetchPythHermes(priceId: string): Promise<OraclePriceData | null> {
  const apiKey = import.meta.env.VITE_PYTH_API_KEY
  if (!apiKey) return null

  const base = import.meta.env.VITE_PYTH_HERMES_BASE || 'https://pyth.dourolabs.app/hermes'
  try {
    const params = new URLSearchParams()
    params.append('ids[]', priceId)
    const url = `${base}/v2/updates/price/latest?${params.toString()}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) return null

    const data: PythPriceResponse = await res.json()
    const parsed = data.parsed?.[0]
    if (!parsed?.price?.price || parsed.price.expo == null) return null

    const publishTime = parsed.metadata?.publish_time ?? Math.floor(Date.now() / 1000)
    const normalized = normalizePythPrice(
      BigInt(parsed.price.price),
      parsed.price.expo,
      parsed.price.conf ? BigInt(parsed.price.conf) : BigInt(0),
    )
    return withPublishMeta(normalized, publishTime, STALENESS_THRESHOLD_SECONDS)
  } catch {
    return null
  }
}

/** Quote token per 1 unit of tokenIn (trade-direction rate for UI). */
export function getDisplayExchangeRate(
  tokenIn: string,
  tokenOut: string,
  quotePerBase: number,
): number {
  const resolved = getMarketFromTokenPair(tokenIn, tokenOut)
  if (!resolved || quotePerBase <= 0) return quotePerBase
  return resolved.intentSide === 'sell' ? quotePerBase : 1 / quotePerBase
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
  const setSubmissionOraclePrice = useSwapStore(s => s.setSubmissionOraclePrice)

  const chainId = useChainId()
  const publicClient = usePublicClient()
  const queryClient = useQueryClient()

  const [nextRefreshIn, setNextRefreshIn] = useState(Math.floor(REFRESH_INTERVAL_MS / 1000))
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const queryKey = useMemo(() => {
    const resolved = getMarketFromTokenPair(tokenIn.symbol, tokenOut.symbol)
    const marketId = resolved
      ? getMarketId(resolved.market.base, resolved.market.quote)
      : `${tokenIn.symbol}-${tokenOut.symbol}`
    return ['oracle-price', marketId, chainId] as const
  }, [tokenIn.symbol, tokenOut.symbol, chainId])

  useEffect(() => {
    setNextRefreshIn(Math.floor(REFRESH_INTERVAL_MS / 1000))
    intervalRef.current = setInterval(() => {
      setNextRefreshIn(prev => (prev <= 1 ? Math.floor(REFRESH_INTERVAL_MS / 1000) : prev - 1))
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [tokenIn.symbol, tokenOut.symbol, chainId])

  const { data, isLoading, dataUpdatedAt, isFetching } = useQuery({
    queryKey,
    queryFn: async (): Promise<TokenPairPrices> => {
      const inU = tokenIn.symbol.toUpperCase()
      const outU = tokenOut.symbol.toUpperCase()

      if (inU === outU) {
        return {
          base: null,
          quote: null,
          exchangeRate: 1,
          rate8Dec: BigInt(1e8),
          isValid: true,
          error: null,
        }
      }

      const resolved = getMarketFromTokenPair(tokenIn.symbol, tokenOut.symbol)
      if (!resolved) {
        return {
          base: null,
          quote: null,
          exchangeRate: null,
          rate8Dec: null,
          isValid: false,
          error: 'Unsupported token pair for this market',
        }
      }

      const { market } = resolved
      const { base: baseLeg, quote: quoteLeg } = await fetchMarketLegs(
        market.base,
        market.quote,
        publicClient ?? undefined,
        chainId,
      )

      if (!baseLeg || !quoteLeg) {
        return {
          base: baseLeg,
          quote: quoteLeg,
          exchangeRate: null,
          rate8Dec: null,
          isValid: false,
          error: 'Price feed unavailable for one or both tokens',
        }
      }

      if (baseLeg.isStale || quoteLeg.isStale) {
        return {
          base: baseLeg,
          quote: quoteLeg,
          exchangeRate: null,
          rate8Dec: null,
          isValid: false,
          error: 'Price data is stale (older than 1 hour)',
        }
      }

      if (baseLeg.confidenceBps > MAX_CONFIDENCE_BPS ||
          quoteLeg.confidenceBps > MAX_CONFIDENCE_BPS) {
        return {
          base: baseLeg,
          quote: quoteLeg,
          exchangeRate: null,
          rate8Dec: null,
          isValid: false,
          error: 'Price confidence too low (>5%)',
        }
      }

      const quotePerBase = baseLeg.price / quoteLeg.price
      const rate8Dec = (baseLeg.rawPrice * BigInt(1e8)) / quoteLeg.rawPrice

      setSubmissionOraclePrice(quotePerBase)

      return {
        base: baseLeg,
        quote: quoteLeg,
        exchangeRate: quotePerBase,
        rate8Dec,
        isValid: true,
        error: null,
      }
    },
    refetchInterval: () => (isDocumentVisible() ? REFRESH_INTERVAL_MS : false),
    refetchIntervalInBackground: false,
    staleTime: REFRESH_INTERVAL_MS - 5000,
    retry: 1,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    enabled: tokenIn.symbol !== '' && tokenOut.symbol !== '',
  })

  const refresh = useCallback(() => {
    setNextRefreshIn(Math.floor(REFRESH_INTERVAL_MS / 1000))
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  return {
    prices: data || {
      base: null,
      quote: null,
      exchangeRate: null,
      rate8Dec: null,
      isValid: false,
      error: null,
    },
    isLoading: isLoading || isFetching,
    lastUpdated: dataUpdatedAt || null,
    nextRefreshIn,
    refresh,
  }
}

export function useSwapCalculation(pricesOverride: TokenPairPrices) {
  const amountIn = useSwapStore(s => s.amountIn)
  const tokenIn = useSwapStore(s => s.tokenIn)
  const tokenOut = useSwapStore(s => s.tokenOut)
  const slippageBps = useSwapStore(s => s.slippageBps)

  const prices = pricesOverride

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

    const resolved = getMarketFromTokenPair(tokenIn.symbol, tokenOut.symbol)
    if (!resolved) {
      return {
        amountOut: '',
        amountOutMin: '',
        usdValueIn: null,
        usdValueOut: null,
        priceImpact: 0,
      }
    }

    const quotePerBase = prices.exchangeRate
    const outDecimals = tokenOut.decimals <= 6 ? tokenOut.decimals : 6
    const slip = slippageBps / 10_000

    let outAmount: number
    if (resolved.intentSide === 'sell') {
      outAmount = inNum * quotePerBase
    } else {
      outAmount = inNum / quotePerBase
    }

    const outAmountMin = outAmount * (1 - slip)

    const inIsMarketBase = resolved.intentSide === 'sell'
    const usdValueIn = inIsMarketBase
      ? (prices.base?.usdValue != null ? inNum * prices.base.usdValue : null)
      : (prices.quote?.usdValue != null ? inNum * prices.quote.usdValue : null)
    const usdValueOut = inIsMarketBase
      ? (prices.quote?.usdValue != null ? outAmount * prices.quote.usdValue : null)
      : (prices.base?.usdValue != null ? outAmount * prices.base.usdValue : null)

    return {
      amountOut: outAmount.toFixed(outDecimals),
      amountOutMin: outAmountMin.toFixed(outDecimals),
      usdValueIn,
      usdValueOut,
      priceImpact: 0.05,
    }
  }, [amountIn, prices, slippageBps, tokenIn.symbol, tokenOut.symbol, tokenOut.decimals])
}

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
