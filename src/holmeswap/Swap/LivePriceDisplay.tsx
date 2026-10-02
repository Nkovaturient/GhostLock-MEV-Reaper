/**
 * LivePriceDisplay.tsx — compact side panel; wide, natural height, no internal scroll.
 */
import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, AlertTriangle, RefreshCw, Activity, ArrowLeftRight, ShieldCheck } from 'lucide-react'
import { useSwapStore } from '../stores/swapStore'
import { useSwapCalculation, getDisplayExchangeRate } from '../hooks/useOraclePrice'
import { useOraclePriceContext } from '../context/OraclePriceContext'
import { cn } from '../../lib/utils'

interface LivePriceDisplayProps {
  className?: string
}

function formatRate(value: number, decimals = 6): string {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  if (value >= 1) return value.toFixed(4)
  return value.toFixed(decimals)
}

export default function LivePriceDisplay({ className }: LivePriceDisplayProps) {
  const tokenIn = useSwapStore(s => s.tokenIn)
  const tokenOut = useSwapStore(s => s.tokenOut)
  const slippageBps = useSwapStore(s => s.slippageBps)

  const { prices, isLoading, nextRefreshIn, refresh } = useOraclePriceContext()
  const { amountOut, amountOutMin, usdValueIn, usdValueOut } = useSwapCalculation(prices)

  const amountIn = useSwapStore(s => s.amountIn)
  const [rateInverted, setRateInverted] = React.useState(false)

  React.useEffect(() => {
    setRateInverted(false)
  }, [tokenIn.symbol, tokenOut.symbol])

  const tradeRate = React.useMemo(() => {
    if (!prices.exchangeRate) return null
    return getDisplayExchangeRate(tokenIn.symbol, tokenOut.symbol, prices.exchangeRate)
  }, [prices.exchangeRate, tokenIn.symbol, tokenOut.symbol])

  const rateText = React.useMemo(() => {
    if (!tradeRate) return '—'
    if (rateInverted) {
      const inv = 1 / tradeRate
      return `1 ${tokenOut.symbol} ≈ ${formatRate(inv)} ${tokenIn.symbol}`
    }
    return `1 ${tokenIn.symbol} ≈ ${formatRate(tradeRate)} ${tokenOut.symbol}`
  }, [tradeRate, rateInverted, tokenIn.symbol, tokenOut.symbol])

  const confidenceColor = React.useMemo(() => {
    const bps = prices.base?.confidenceBps ?? prices.quote?.confidenceBps
    if (bps == null) return 'neutral'
    if (bps <= 100) return 'high'
    if (bps <= 500) return 'medium'
    return 'low'
  }, [prices.base?.confidenceBps, prices.quote?.confidenceBps])

  const confidenceConfig = {
    high: {
      label: 'High Confidence',
      dot: 'bg-holme-green-success',
      badge:
        'bg-holme-green-success/18 text-emerald-950 border-holme-green-success/45 shadow-sm',
      accent: 'border-l-holme-green-success',
      icon: 'text-holme-green-success',
    },
    medium: {
      label: 'Medium Confidence',
      dot: 'bg-holme-warning',
      badge: 'bg-holme-warning/20 text-amber-950 border-holme-warning/45 shadow-sm',
      accent: 'border-l-holme-warning',
      icon: 'text-holme-warning',
    },
    low: {
      label: 'Low Confidence',
      dot: 'bg-destructive',
      badge: 'bg-destructive/15 text-red-950 border-destructive/40 shadow-sm',
      accent: 'border-l-destructive',
      icon: 'text-destructive',
    },
    neutral: {
      label: 'Confidence Unknown',
      dot: 'bg-muted-foreground/50',
      badge: 'bg-muted/50 text-muted-foreground border-border/50',
      accent: 'border-l-border',
      icon: 'text-muted-foreground',
    },
  }

  const config = confidenceConfig[confidenceColor]

  if (tokenIn.symbol === tokenOut.symbol) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-3xl border backdrop-blur-md shadow-holme-soft overflow-hidden',
        'p-4 sm:p-5',
        prices.isValid
          ? 'bg-card/75 border-border/45'
          : 'bg-destructive/5 border-destructive/25',
        className,
      )}
    >
      {/* Transparent header — blends with card glass */}
      <div className="flex items-center justify-between gap-3 mb-4 bg-transparent">
        <div className="flex items-center gap-2 min-w-0">
          <Activity
            className={cn(
              'w-4 h-4 shrink-0 drop-shadow-sm',
              isLoading ? 'text-holme-warning animate-pulse' : 'text-primary',
            )}
            aria-hidden
          />
          <span className="text-sm font-semibold text-foreground truncate drop-shadow-sm">
            Live Oracle Price
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={refresh}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/10 transition-colors"
            disabled={isLoading}
            type="button"
            aria-label="Refresh oracle price"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          </motion.button>
          <span className="text-[11px] font-mono text-muted-foreground tabular-nums min-w-[2rem] text-center">
            {nextRefreshIn}s
          </span>
        </div>
      </div>

      {prices.error && (
        <div className="flex items-center gap-2 p-2.5 mb-3 rounded-xl bg-destructive/10 border border-destructive/25">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <span className="text-xs text-destructive">{prices.error}</span>
        </div>
      )}

      {/* Rate row */}
      <div className="flex items-center gap-2 mb-2 min-w-0">
        <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
        <button
          type="button"
          onClick={() => tradeRate && setRateInverted(v => !v)}
          disabled={!tradeRate}
          className={cn(
            'text-left text-sm sm:text-[15px] font-semibold leading-snug min-w-0 flex-1',
            'hover:text-primary transition-colors disabled:cursor-default',
            prices.isValid ? 'text-foreground' : 'text-muted-foreground',
          )}
          title="Flip rate direction"
        >
          {rateText}
        </button>
        {tradeRate && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => setRateInverted(v => !v)}
            className="p-1.5 rounded-lg shrink-0 text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/10 transition-colors"
            aria-label="Flip exchange rate"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {/* Confidence tab badge */}
      <div className="flex justify-end mb-3">
        <div
          role="status"
          aria-label={`Oracle confidence: ${config.label}`}
          className={cn(
            'inline-flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg border border-l-[3px]',
            'text-[11px] font-semibold tracking-wide backdrop-blur-sm',
            config.badge,
            config.accent,
          )}
        >
          <span className={cn('inline-flex h-2 w-2 shrink-0 rounded-full', config.dot)} aria-hidden />
          <ShieldCheck className={cn('w-3.5 h-3.5 shrink-0', config.icon)} aria-hidden />
          <span className="whitespace-nowrap">{config.label}</span>
        </div>
      </div>

      {prices.isValid && (
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <div className="p-3 rounded-xl bg-muted/35 border border-border/30 min-w-0">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium block">
              Input Value
            </span>
            <div className="flex items-baseline flex-wrap gap-x-1 mt-1.5 min-w-0">
              <span className="text-base font-semibold text-foreground tabular-nums truncate">
                {amountIn || '0'}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">{tokenIn.symbol}</span>
            </div>
            {usdValueIn != null && (
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                ≈ ${usdValueIn.toFixed(2)}
              </span>
            )}
          </div>

          <div className="p-3 rounded-xl bg-muted/35 border border-border/30 min-w-0">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium block">
              Expected Output
            </span>
            <div className="flex items-baseline flex-wrap gap-x-1 mt-1.5 min-w-0">
              <motion.span
                key={amountOut}
                initial={{ opacity: 0.6, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-base font-semibold text-foreground tabular-nums truncate"
              >
                {amountOut || '—'}
              </motion.span>
              <span className="text-xs text-muted-foreground shrink-0">{tokenOut.symbol}</span>
            </div>
            {amountOutMin && (
              <span className="text-[11px] text-holme-green-success font-medium block mt-0.5 truncate">
                ≥ {parseFloat(amountOutMin).toFixed(4)} min
              </span>
            )}
            {usdValueOut != null && (
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                ≈ ${usdValueOut.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      )}

      {prices.base?.source && prices.quote?.source && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground mb-2.5">
          <span className="truncate">
            Source: {prices.base.source === prices.quote.source ? prices.base.source : `${prices.base.source} + ${prices.quote.source}`}
          </span>
          <span className="text-border hidden sm:inline" aria-hidden>•</span>
          <span className="shrink-0">Refreshed: {new Date().toLocaleTimeString()}</span>
        </div>
      )}

      <div className="pt-2.5 border-t border-border/35 flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">Slippage Tolerance</span>
        <span className="font-semibold text-foreground tabular-nums">
          {(slippageBps / 100).toFixed(1)}%
        </span>
      </div>
    </motion.div>
  )
}
