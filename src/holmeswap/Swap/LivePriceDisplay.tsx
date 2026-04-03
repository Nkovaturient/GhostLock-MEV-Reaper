/**
 * LivePriceDisplay.tsx
 *
 * Real-time price display with:
 * - 7-second refresh countdown
 * - Confidence indicator (green/yellow/red)
 * - Staleness warnings
 * - Exchange rate with token symbols
 */
import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, AlertTriangle, RefreshCw, Activity } from 'lucide-react'
import { useSwapStore } from '../stores/swapStore'
import { useOraclePrice, useSwapCalculation } from '../hooks/useOraclePrice'
import { cn } from '../../lib/utils'

interface LivePriceDisplayProps {
  className?: string
}

export default function LivePriceDisplay({ className }: LivePriceDisplayProps) {
  const tokenIn = useSwapStore(s => s.tokenIn)
  const tokenOut = useSwapStore(s => s.tokenOut)
  const slippageBps = useSwapStore(s => s.slippageBps)

  const { prices, isLoading, nextRefreshIn, refresh } = useOraclePrice()
  const { amountOut, amountOutMin, usdValueIn, usdValueOut } = useSwapCalculation()

  const amountIn = useSwapStore(s => s.amountIn)

  // Format the exchange rate
  const rateText = React.useMemo(() => {
    if (!prices.exchangeRate) return '—'
    return `1 ${tokenIn.symbol} ≈ ${prices.exchangeRate.toFixed(6)} ${tokenOut.symbol}`
  }, [prices.exchangeRate, tokenIn.symbol, tokenOut.symbol])

  // Get confidence color
  const confidenceColor = React.useMemo(() => {
    if (!prices.base?.confidenceBps) return 'neutral'
    if (prices.base.confidenceBps <= 100) return 'high'    // ≤1%
    if (prices.base.confidenceBps <= 500) return 'medium'  // ≤5%
    return 'low'                                           // >5%
  }, [prices.base?.confidenceBps])

  const confidenceConfig = {
    high: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'High' },
    medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Medium' },
    low: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'Low' },
    neutral: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', label: '—' },
  }

  const config = confidenceConfig[confidenceColor]

  // Don't show if same token
  if (tokenIn.symbol === tokenOut.symbol) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl p-4 border backdrop-blur-sm",
        prices.isValid ? "bg-slate-900/50 border-slate-700/30" : "bg-rose-500/5 border-rose-500/20",
        className
      )}
    >
      {/* Header with refresh countdown */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className={cn(
            "w-4 h-4",
            isLoading ? "text-amber-400 animate-pulse" : "text-slate-400"
          )} />
          <span className="text-xs font-medium text-slate-400">Live Oracle Price</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={refresh}
            className="p-1 rounded-lg hover:bg-slate-800 transition-colors"
            disabled={isLoading}
          >
            <RefreshCw className={cn(
              "w-3.5 h-3.5 text-slate-500",
              isLoading && "animate-spin"
            )} />
          </motion.button>
          <span className="text-[10px] font-mono text-slate-500 tabular-nums w-6 text-center">
            {nextRefreshIn}s
          </span>
        </div>
      </div>

      {/* Price error */}
      {prices.error && (
        <div className="flex items-center gap-2 p-2 mb-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span className="text-xs text-rose-300">{prices.error}</span>
        </div>
      )}

      {/* Exchange rate */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          <span className={cn(
            "text-sm font-medium",
            prices.isValid ? "text-slate-200" : "text-slate-500"
          )}>
            {rateText}
          </span>
        </div>
        <div className={cn(
          "px-2 py-1 rounded-lg text-[10px] font-medium border",
          config.bg, config.border, config.color
        )}>
          {config.label} Confidence
        </div>
      </div>

      {/* Price details grid */}
      {prices.isValid && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          {/* Input value */}
          <div className="p-2.5 rounded-lg bg-slate-950/50">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Input Value</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-sm font-semibold text-slate-200">
                {amountIn || '0'}
              </span>
              <span className="text-xs text-slate-500">{tokenIn.symbol}</span>
            </div>
            {usdValueIn && (
              <span className="text-[10px] text-slate-500">≈ ${usdValueIn.toFixed(2)}</span>
            )}
          </div>

          {/* Expected output */}
          <div className="p-2.5 rounded-lg bg-slate-950/50">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Expected Output</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-sm font-semibold text-slate-200">
                {amountOut || '—'}
              </span>
              <span className="text-xs text-slate-500">{tokenOut.symbol}</span>
            </div>
            {amountOutMin && (
              <span className="text-[10px] text-emerald-400">
                ≥ {parseFloat(amountOutMin).toFixed(4)} min
              </span>
            )}
          </div>
        </div>
      )}

      {/* Price source info */}
      {prices.base?.source && prices.quote?.source && (
        <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-500">
          <span>Source: Pyth + Chainlink</span>
          <span className="text-slate-700">•</span>
          <span>Refreshed: {new Date().toLocaleTimeString()}</span>
        </div>
      )}

      {/* Slippage info */}
      <div className="mt-3 pt-3 border-t border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Slippage Tolerance</span>
          <span className="text-slate-300">{(slippageBps / 100).toFixed(1)}%</span>
        </div>
      </div>
    </motion.div>
  )
}
