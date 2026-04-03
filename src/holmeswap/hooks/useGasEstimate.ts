/**
 * useGasEstimate.ts
 *
 * Estimates gas costs for GhostLock intent submission including:
 * - Blocklock encryption fee
 * - Bond amount (0.01 ETH)
 * - Total cost breakdown
 */
import { useMemo } from 'react'
import { useChainId } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import { useSwapStore } from '../stores/swapStore'
import { AUCTION } from '../contracts/config'
import { useOraclePrice } from './useOraclePrice'

interface GasEstimate {
  blocklockFee: string
  bondAmount: string
  totalCost: string
  blocklockFeeEth: number
  bondAmountEth: number
  totalCostEth: number
  isLoading: boolean
}

// Current ETH price in USD (fetched from Pyth in production)
const ETH_PRICE_USD = 3500 // Placeholder - should come from oracle

export function useGasEstimate(): GasEstimate {
  const chainId = useChainId()
  const amountIn = useSwapStore(s => s.amountIn)
  const tokenIn = useSwapStore(s => s.tokenIn)

  return useMemo(() => {
    // Blocklock fee + bond from config
    const submissionValue = parseEther(AUCTION.SUBMISSION_VALUE_ETH)
    const blocklockFee = submissionValue * BigInt(20) / BigInt(100) // ~20% is fee
    const bond = submissionValue - blocklockFee

    const blocklockFeeEth = Number(formatEther(blocklockFee))
    const bondAmountEth = Number(formatEther(bond))
    const totalCostEth = blocklockFeeEth + bondAmountEth

    return {
      blocklockFee: `${blocklockFeeEth.toFixed(4)} ETH`,
      bondAmount: `${bondAmountEth.toFixed(4)} ETH`,
      totalCost: `${totalCostEth.toFixed(4)} ETH`,
      blocklockFeeEth,
      bondAmountEth,
      totalCostEth,
      isLoading: false,
    }
  }, [chainId])
}

// Calculate MEV savings estimate based on trade size
export function useMevSavingsEstimate(): { estimatedSavings: number; confidence: 'low' | 'medium' | 'high' } {
  const amountIn = useSwapStore(s => s.amountIn)
  const tokenIn = useSwapStore(s => s.tokenIn)
  const { prices } = useOraclePrice();

  return useMemo(() => {
    const amount = parseFloat(amountIn) || 0
    if (amount <= 0) return { estimatedSavings: 0, confidence: 'low' }

    // Estimate MEV extraction on public DEXs
    // Typical sandwich attack: 0.1-0.5% of trade value
    const mevRate = tokenIn.symbol === 'ETH' ? 0.003 : 0.0015 // 0.3% for ETH, 0.15% for others

    let tradeValueUsd = 0
    if (prices?.base?.usdValue) {
      tradeValueUsd = amount * prices.base.usdValue
    } else {
      // Fallback using hardcoded ETH price
      tradeValueUsd = amount * (tokenIn.symbol === 'ETH' ? 3500 : 1)
    }

    const estimatedSavings = tradeValueUsd * mevRate

    // Confidence based on trade size
    let confidence: 'low' | 'medium' | 'high' = 'medium'
    if (tradeValueUsd < 100) confidence = 'low'
    else if (tradeValueUsd > 10000) confidence = 'high'

    return { estimatedSavings, confidence }
  }, [amountIn, tokenIn.symbol, prices])
}

// Format cost for display
export function formatCost(etherAmount: number): string {
  if (etherAmount < 0.001) return `${(etherAmount * 1000000).toFixed(2)} Gwei`
  if (etherAmount < 1) return `${(etherAmount * 1000).toFixed(2)} mETH`
  return `${etherAmount.toFixed(4)} ETH`
}

// Format USD value
export function formatUsd(etherAmount: number, ethPrice: number = ETH_PRICE_USD): string {
  const usd = etherAmount * ethPrice
  return `$${usd.toFixed(2)}`
}
