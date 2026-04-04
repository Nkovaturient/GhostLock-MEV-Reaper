/**
 * useGasEstimate.ts
 *
 * On-chain min ETH for submitIntentWithBond: blocklock fee + BOND_MINIMUM
 * (matches GhostLockLiveness — not a flat 0.01 ETH).
 */
import { useEffect, useMemo, useState } from 'react'
import { formatEther } from 'viem'
import { usePublicClient, useChainId } from 'wagmi'
import { useSwapStore } from '../stores/swapStore'
import { AUCTION, getAddresses, getMarketFromTokenPair } from '../contracts/config'
import { useOraclePrice } from './useOraclePrice'
import { getSubmitIntentMinValueWei, getEffectiveCallbackGasLimit } from '../lib/submitIntentMinValue'

interface GasEstimate {
  blocklockFee: string
  bondAmount: string
  totalCost: string
  blocklockFeeEth: number
  bondAmountEth: number
  totalCostEth: number
  isLoading: boolean
}

export function useGasEstimate(): GasEstimate {
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const [feeWei, setFeeWei] = useState<bigint | null>(null)
  const [bondWei, setBondWei] = useState<bigint | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!publicClient) {
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    const addrs = getAddresses(chainId)
    getEffectiveCallbackGasLimit(
      publicClient,
      addrs.GhostLockLiveness,
      AUCTION.CALLBACK_GAS_LIMIT,
    )
      .then((cb) => getSubmitIntentMinValueWei(publicClient, addrs.GhostLockLiveness, cb))
      .then(({ requestPrice, bondMinimum }) => {
        if (cancelled) return
        setFeeWei(requestPrice)
        setBondWei(bondMinimum)
      })
      .catch(() => {
        if (cancelled) return
        setFeeWei(null)
        setBondWei(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [publicClient, chainId])

  return useMemo(() => {
    if (feeWei == null || bondWei == null) {
      return {
        blocklockFee: '—',
        bondAmount: '—',
        totalCost: '—',
        blocklockFeeEth: 0,
        bondAmountEth: 0,
        totalCostEth: 0,
        isLoading,
      }
    }

    const blocklockFeeEth = Number(formatEther(feeWei))
    const bondAmountEth = Number(formatEther(bondWei))
    const totalCostEth = blocklockFeeEth + bondAmountEth

    return {
      blocklockFee: `${blocklockFeeEth.toFixed(6)} ETH`,
      bondAmount: `${bondAmountEth.toFixed(4)} ETH`,
      totalCost: `${totalCostEth.toFixed(6)} ETH`,
      blocklockFeeEth,
      bondAmountEth,
      totalCostEth,
      isLoading,
    }
  }, [feeWei, bondWei, isLoading])
}

// Calculate MEV savings estimate based on trade size
export function useMevSavingsEstimate(): { estimatedSavings: number; confidence: 'low' | 'medium' | 'high' } {
  const amountIn = useSwapStore(s => s.amountIn)
  const tokenIn = useSwapStore(s => s.tokenIn)
  const tokenOut = useSwapStore(s => s.tokenOut)
  const { prices } = useOraclePrice()

  return useMemo(() => {
    const amount = parseFloat(amountIn) || 0
    if (amount <= 0) return { estimatedSavings: 0, confidence: 'low' }

    const resolved = getMarketFromTokenPair(tokenIn.symbol, tokenOut.symbol)
    const mevRate = resolved?.market.base.toUpperCase() === 'ETH' ? 0.003 : 0.0015

    let tradeValueUsd = 0
    if (resolved && prices.isValid) {
      if (resolved.intentSide === 'sell' && prices.base?.usdValue != null) {
        tradeValueUsd = amount * prices.base.usdValue
      } else if (resolved.intentSide === 'buy' && prices.quote?.usdValue != null) {
        tradeValueUsd = amount * prices.quote.usdValue
      }
    }

    const estimatedSavings = tradeValueUsd * mevRate

    let confidence: 'low' | 'medium' | 'high' = 'medium'
    if (tradeValueUsd < 100) confidence = 'low'
    else if (tradeValueUsd > 10000) confidence = 'high'

    return { estimatedSavings, confidence }
  }, [amountIn, tokenIn.symbol, tokenOut.symbol, prices])
}

// Format cost for display
export function formatCost(etherAmount: number): string {
  if (etherAmount < 0.001) return `${(etherAmount * 1000000).toFixed(2)} Gwei`
  if (etherAmount < 1) return `${(etherAmount * 1000).toFixed(2)} mETH`
  return `${etherAmount.toFixed(4)} ETH`
}

export function formatUsd(etherAmount: number, ethPriceUsd: number): string {
  const usd = etherAmount * ethPriceUsd
  return `$${usd.toFixed(2)}`
}
