/**
 * useSwapPrices.ts — live token price quote for HolmeSwap
 *
 * Fetches real-time Pyth oracle prices for the current token pair and computes:
 *   - Live exchange rate
 *   - amountOut from amountIn
 *   - Minimum expected output (after slippage)
 *   - Wallet balance validation (amountIn <= balance)
 *   - Same-token guard
 *
 * Uses Pyth Hermes REST API (https://hermes.pyth.network) refreshed every 1s.
 * Also fetches USD reference prices for the UI display.
 */
import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAccount, useBalance } from 'wagmi'
import { useChainId } from 'wagmi'
import { useSwapStore, type TokenInfo } from '../holmeswap/stores/swapStore'
import { getTokenAddress, isNativeToken } from '../holmeswap/contracts/tokens'
import { PYTH_PRICE_IDS, HERMES_BASE } from '../lib/pyth-ids'

const REFETCH_MS = 1_000

const PYTH_ID_MAP: Record<string, string> = {
  ETH: PYTH_PRICE_IDS.ETH_USD,
  BTC: PYTH_PRICE_IDS.BTC_USD,
  USDC: PYTH_PRICE_IDS.USDC_USD,
}

async function fetchPythPrices(symbols: string[]): Promise<Record<string, number>> {
  const ids = symbols
    .map(s => PYTH_ID_MAP[s.toUpperCase()])
    .filter(Boolean)

  if (ids.length === 0) return {}

  const params = new URLSearchParams()
  ids.forEach(id => params.append('ids[]', id))
  const url = `${HERMES_BASE}/v2/updates/price/latest?${params.toString()}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Hermes: ${res.status}`)
  const data = await res.json() as {
    parsed?: Array<{
      id?: string
      price?: { price?: string; expo?: number; conf?: string | number }
      metadata?: { publish_time?: number }
    }>
  }

  const result: Record<string, number> = {}
  for (const item of data.parsed ?? []) {
    const id = item?.id
    const p = item?.price
    if (!id || !p || p.price == null || p.expo == null) continue

    const sym = Object.entries(PYTH_ID_MAP).find(([, v]) => v === id)?.[0]
    if (sym) {
      result[sym] = Number(p.price) * Math.pow(10, Number(p.expo))
    }
  }
  return result
}

function useTokenPythPrices(symbols: string[]) {
  return useQuery({
    queryKey: ['pyth-swap-prices', symbols.join('-')],
    queryFn: () => fetchPythPrices(symbols),
    refetchInterval: REFETCH_MS,
    staleTime: REFETCH_MS,
    enabled: symbols.length > 0,
    retry: 2,
  })
}

function useTokenBalance(symbol: string, decimals: number) {
  const { address: userAddr, isConnected } = useAccount()
  const chainId = useChainId()
  const tokenAddr = isNativeToken(symbol) ? undefined : getTokenAddress(symbol, chainId)

  const { data, isLoading } = useBalance({
    address: isConnected ? userAddr : undefined,
    token: tokenAddr,
    query: { enabled: isConnected && !!userAddr, refetchInterval: 10_000 },
  })

  if (!isConnected) return { rawBalance: null, formattedBalance: null, isLoading: false }
  if (isLoading)    return { rawBalance: null, formattedBalance: null, isLoading: true }
  if (!data)         return { rawBalance: null, formattedBalance: '—', isLoading: false }

  const raw = data.value
  const decimalsForDisplay = decimals <= 6 ? 4 : decimals <= 8 ? 6 : 4
  const formatted = parseFloat(data.formatted).toFixed(decimalsForDisplay)
  return { rawBalance: raw, formattedBalance: formatted, isLoading: false }
}

export interface SwapQuote {
  amountIn:         string
  amountOut:        string
  amountOutMin:     string
  rate:             number
  inverseRate:      number
  priceInBase:      number
  priceOutBase:     number
  usdValueIn:       number | null
  usdValueOut:      number | null
  isLoading:        boolean
  priceError:       string | null
  balanceExceeded:  boolean
  balance:          string | null
  balanceRaw:       bigint | null
  isSameToken:      boolean
  baseSymbol:       string
  quoteSymbol:      string
}

export function useSwapPrices(): SwapQuote {
  const tokenIn     = useSwapStore(s => s.tokenIn)
  const tokenOut    = useSwapStore(s => s.tokenOut)
  const amountIn    = useSwapStore(s => s.amountIn)
  const slippageBps = useSwapStore(s => s.slippageBps)

  const inSym  = tokenIn.symbol.toUpperCase()
  const outSym = tokenOut.symbol.toUpperCase()

  const isSameToken = inSym === outSym

  const symbols = useMemo(
    () => [...new Set([inSym, outSym, 'USDC'].filter(Boolean))],
    [inSym, outSym]
  )

  const { data: prices, isLoading: pricesLoading } = useTokenPythPrices(symbols)

  const { rawBalance, formattedBalance, isLoading: balanceLoading } =
    useTokenBalance(tokenIn.symbol, tokenIn.decimals)

  const priceIn  = prices?.[inSym]  ?? null
  const priceOut = prices?.[outSym] ?? prices?.[outSym.replace('WBTC', 'BTC')] ?? null
  const priceUsd = prices?.['USDC'] ?? null

  const rate = useMemo(() => {
    if (!priceIn || !priceOut || priceOut === 0) return null
    return priceIn / priceOut
  }, [priceIn, priceOut])

  const inverseRate = useMemo(() => {
    if (!rate || rate === 0) return null
    return 1 / rate
  }, [rate])

  const inNum = parseFloat(amountIn) || 0

  const amountOut = useMemo(() => {
    if (!rate || inNum <= 0 || isSameToken) return ''
    const out = inNum * rate
    const decimals = tokenOut.decimals <= 6 ? tokenOut.decimals : tokenOut.decimals - 4
    return out.toFixed(Math.min(decimals, 8))
  }, [rate, inNum, isSameToken, tokenOut.decimals])

  const amountOutMin = useMemo(() => {
    if (!amountOut) return ''
    const outNum = parseFloat(amountOut)
    if (!outNum) return ''
    const slippageMult = 1 - slippageBps / 10_000
    return (outNum * slippageMult).toFixed(tokenOut.decimals <= 6 ? tokenOut.decimals : 6)
  }, [amountOut, slippageBps, tokenOut.decimals])

  const balanceExceeded = useMemo(() => {
    if (!rawBalance || !inNum) return false
    const inDecimals = tokenIn.decimals
    const balanceNum = Number(rawBalance) / Math.pow(10, inDecimals)
    return inNum > balanceNum
  }, [rawBalance, inNum, tokenIn.decimals])

  const usdValueIn = useMemo(() => {
    if (priceUsd == null || !inNum) return null
    return inNum * priceUsd
  }, [priceUsd, inNum])

  const usdValueOut = useMemo(() => {
    if (priceUsd == null || !amountOut) return null
    const outNum = parseFloat(amountOut)
    if (!outNum) return null
    return outNum * priceUsd
  }, [priceUsd, amountOut])

  const priceError = useMemo(() => {
    if (pricesLoading) return null
    if (!isSameToken && rate == null) return 'Price unavailable'
    if (!isSameToken && rate !== null && rate === 0) return 'Invalid price'
    return null
  }, [pricesLoading, isSameToken, rate])

  return {
    amountIn,
    amountOut,
    amountOutMin,
    rate:           rate      ?? 0,
    inverseRate:    inverseRate ?? 0,
    priceInBase:    priceIn   ?? 0,
    priceOutBase:   priceOut  ?? 0,
    usdValueIn,
    usdValueOut,
    isLoading:      pricesLoading || balanceLoading,
    priceError,
    balanceExceeded,
    balance:        formattedBalance,
    balanceRaw:     rawBalance,
    isSameToken,
    baseSymbol:     tokenIn.symbol,
    quoteSymbol:    tokenOut.symbol,
  }
}
