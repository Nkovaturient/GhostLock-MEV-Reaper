/**
 * On-chain min ETH for submitTlockIntentWithBond: BOND_MINIMUM + small buffer.
 */
import { useMemo } from 'react'
import { formatEther } from 'viem'
import { usePublicClient, useChainId } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { useSwapStore } from '../stores/swapStore'
import { getAddresses, getMarketFromTokenPair } from '../contracts/config'
import { useOraclePriceContext } from '../context/OraclePriceContext'
import { getTlockSubmitValueWei } from '../lib/submitIntentMinValue'
import { BOND_QUERY_OPTS } from '../lib/wagmiQueryDefaults'

interface GasEstimate {
  bondAmount: string
  totalCost: string
  bondAmountEth: number
  totalCostEth: number
  isLoading: boolean
}

export function useGasEstimate(): GasEstimate {
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const addrs = getAddresses(chainId)

  const { data: totalWei, isLoading } = useQuery({
    queryKey: ['tlock-bond-min', chainId, addrs.GhostLockLiveness],
    queryFn: () => {
      if (!publicClient) throw new Error('no client')
      return getTlockSubmitValueWei(publicClient, addrs.GhostLockLiveness)
    },
    enabled: Boolean(publicClient && addrs.GhostLockLiveness),
    ...BOND_QUERY_OPTS,
  })

  return useMemo(() => {
    if (totalWei == null) {
      return {
        bondAmount: '—',
        totalCost: '—',
        bondAmountEth: 0,
        totalCostEth: 0,
        isLoading,
      }
    }

    const bondAmountEth = Number(formatEther(totalWei))

    return {
      bondAmount: `${bondAmountEth.toFixed(4)} ETH`,
      totalCost: `${bondAmountEth.toFixed(4)} ETH`,
      bondAmountEth,
      totalCostEth: bondAmountEth,
      isLoading,
    }
  }, [totalWei, isLoading])
}

export function useMevSavingsEstimate(): { estimatedSavings: number; confidence: 'low' | 'medium' | 'high' } {
  const amountIn = useSwapStore(s => s.amountIn)
  const tokenIn = useSwapStore(s => s.tokenIn)
  const tokenOut = useSwapStore(s => s.tokenOut)
  const { prices } = useOraclePriceContext()

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

export function formatCost(etherAmount: number): string {
  if (etherAmount < 0.001) return `${(etherAmount * 1000000).toFixed(2)} Gwei`
  if (etherAmount < 1) return `${(etherAmount * 1000).toFixed(2)} mETH`
  return `${etherAmount.toFixed(4)} ETH`
}

export function formatUsd(etherAmount: number, ethPriceUsd: number): string {
  const usd = etherAmount * ethPriceUsd
  return `$${usd.toFixed(2)}`
}
