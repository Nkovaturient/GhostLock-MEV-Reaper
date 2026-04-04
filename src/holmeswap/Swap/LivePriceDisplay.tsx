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
    high: {
      color: 'text-holme-green-success',
      bg: 'bg-holme-green-success/15',
      border: 'border-holme-green-success/30',
      label: 'High',
    },
    medium: {
      color: 'text-holme-warning',
      bg: 'bg-holme-warning/15',
      border: 'border-holme-warning/30',
      label: 'Medium',
    },
    low: {
      color: 'text-destructive',
      bg: 'bg-destructive/10',
      border: 'border-destructive/25',
      label: 'Low',
    },
    neutral: {
      color: 'text-muted-foreground',
      bg: 'bg-muted/60',
      border: 'border-border/50',
      label: '—',
    },
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
        'rounded-2xl p-3 sm:p-4 border backdrop-blur-md shadow-holme-soft',
        prices.isValid
          ? 'bg-card/80 border-border/50'
          : 'bg-destructive/5 border-destructive/25',
        className
      )}
    >
      {/* Header with refresh countdown */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Activity
            className={cn(
              'w-4 h-4 shrink-0',
              isLoading ? 'text-holme-warning animate-pulse' : 'text-primary/70'
            )}
          />
          <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
            Live Oracle Price
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={refresh}
            className="p-1.5 rounded-xl hover:bg-muted/80 border border-transparent hover:border-border/40 transition-colors"
            disabled={isLoading}
            type="button"
            aria-label="Refresh oracle price"
          >
            <RefreshCw
              className={cn(
                'w-3.5 h-3.5 text-muted-foreground',
                isLoading && 'animate-spin'
              )}
            />
          </motion.button>
          <span className="text-[10px] sm:text-xs font-mono text-muted-foreground tabular-nums min-w-[1.75rem] text-center">
            {nextRefreshIn}s
          </span>
        </div>
      </div>

      {/* Price error */}
      {prices.error && (
        <div className="flex items-center gap-2 p-2.5 mb-3 rounded-xl bg-destructive/10 border border-destructive/25">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <span className="text-xs text-destructive">{prices.error}</span>
        </div>
      )}

      {/* Exchange rate */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1 sm:mb-3 min-w-0">
        <div className="flex items-start sm:items-center gap-2 min-w-0">
          <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 sm:mt-0" />
          <span
            className={cn(
              'text-sm sm:text-base font-semibold break-words',
              prices.isValid ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {rateText}
          </span>
        </div>
        <div
          className={cn(
            'px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-semibold border shrink-0 self-start sm:self-center',
            config.bg,
            config.border,
            config.color
          )}
        >
          {config.label} Confidence
        </div>
      </div>

      {/* Price details grid */}
      {prices.isValid && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-3">
          <div className="p-3 rounded-xl bg-muted/45 border border-border/35 min-w-0">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Input Value
            </span>
            <div className="flex items-baseline flex-wrap gap-x-1 gap-y-0 mt-1">
              <span className="text-sm sm:text-base font-semibold text-foreground tabular-nums">
                {amountIn || '0'}
              </span>
              <span className="text-xs text-muted-foreground">{tokenIn.symbol}</span>
            </div>
            {usdValueIn != null && (
              <span className="text-[10px] sm:text-xs text-muted-foreground block mt-0.5">
                ≈ ${usdValueIn.toFixed(2)}
              </span>
            )}
          </div>

          <div className="p-3 rounded-xl bg-muted/45 border border-border/35 min-w-0">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Expected Output
            </span>
            <div className="flex items-baseline flex-wrap gap-x-1 gap-y-0 mt-1">
              <span className="text-sm sm:text-base font-semibold text-foreground tabular-nums break-all">
                {amountOut || '—'}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">{tokenOut.symbol}</span>
            </div>
            {amountOutMin && (
              <span className="text-[10px] sm:text-xs text-holme-green-success font-medium block mt-0.5">
                ≥ {parseFloat(amountOutMin).toFixed(4)} min
              </span>
            )}
          </div>
        </div>
      )}

      {/* Price source info */}
      {prices.base?.source && prices.quote?.source && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] sm:text-xs text-muted-foreground">
          <span>Source: Pyth + Chainlink</span>
          <span className="text-border" aria-hidden>
            •
          </span>
          <span>Refreshed: {new Date().toLocaleTimeString()}</span>
        </div>
      )}

      {/* Slippage info */}
      <div className="mt-3 pt-3 border-t border-border/40">
        <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
          <span className="text-muted-foreground">Slippage Tolerance</span>
          <span className="font-semibold text-foreground tabular-nums">
            {(slippageBps / 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </motion.div>
  )
}
