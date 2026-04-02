/**
 * PriceDisplay.tsx — live price panel for HolmeSwap
 *
 * Pre-swap:     shows live rate, USD values, min output (slippage-adjusted)
 * In-flight:    shows GhostLock protecting badge
 * Post-settle:  shows MEV savings from BatchSettlement Settled event
 */
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Info, List, Check, Sparkles, Loader2 } from 'lucide-react'
import { useSwapStore } from '../stores/swapStore'
import { cn } from '../../lib/utils'

interface PriceDisplayProps {
  estimatedRate?: string
  expectedMin?:  string
  actual?:        string
  usdValueIn?:   number | null
  usdValueOut?:  number | null
  isLoading?:    boolean
}

export default function PriceDisplay({
  estimatedRate = '1 ETH ≈ — USDC',
  expectedMin   = '≥ —',
  actual        = '$—',
  usdValueIn,
  usdValueOut,
  isLoading     = false,
}: PriceDisplayProps) {
  const [spin, setSpin] = useState(false)

  const intentStatus  = useSwapStore(s => s.intentStatus)
  const mevSavings    = useSwapStore(s => s.mevSavings)
  const clearingPrice = useSwapStore(s => s.clearingPrice)
  const slippageBps  = useSwapStore(s => s.slippageBps)

  const isSettled  = intentStatus === 'settled'
  const isInFlight = ['encrypting', 'submitting', 'locked', 'ordering', 'competing'].includes(intentStatus)

  const savingsDisplay = (() => {
    if (!isSettled) return null
    const n = parseFloat(mevSavings)
    if (isNaN(n) || n <= 0) return null
    return n.toFixed(4)
  })()

  const slippagePct = (slippageBps / 100).toFixed(2)

  const handleRefresh = () => {
    setSpin(true)
    setTimeout(() => setSpin(false), 600)
  }

  const fmtUsd = (n: number | null | undefined) =>
    n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : '—'

  return (
    <div className={cn(
      'rounded-xl p-4 border border-border/40 bg-card/70 backdrop-blur text-sm',
      'transition-all duration-300',
      isSettled && 'border-holme-green-success/40 bg-holme-green-success/5'
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isLoading && !isInFlight && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          )}
          <p className={cn(
            'font-medium text-foreground truncate pr-2',
            isLoading && !isInFlight && 'text-muted-foreground animate-pulse'
          )}>
            {estimatedRate}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <motion.button
            type="button"
            className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
            onClick={handleRefresh}
            animate={{ rotate: spin ? 360 : 0 }}
            transition={{ duration: 0.5 }}
            aria-label="Refresh price"
          >
            <RefreshCw className="w-4 h-4" />
          </motion.button>
          <button type="button" className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground" aria-label="Info">
            <Info className="w-4 h-4" />
          </button>
          <button type="button" className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground" aria-label="History">
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-holme-mint/50 flex items-center justify-center text-[10px] font-bold">$</span>
          <span className="text-muted-foreground">USD in:</span>
          <span className="font-medium text-foreground tabular-nums">{fmtUsd(usdValueIn)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground">USD out:</span>
          <span className="font-semibold text-foreground tabular-nums">{fmtUsd(usdValueOut)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Oracle:</span>
          <span className="font-medium text-foreground tabular-nums">{actual}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Min out:</span>
          <span className="font-medium text-foreground tabular-nums">{expectedMin}</span>
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span>Slippage:</span>
          <span className="font-medium text-foreground">{slippagePct}%</span>
        </span>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <AnimatePresence mode="wait">
          {isSettled && savingsDisplay ? (
            <motion.span
              key="savings"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-holme-green-success/20 text-holme-green-success font-bold text-sm"
            >
              <Sparkles className="w-4 h-4" />
              ${savingsDisplay} MEV saved
            </motion.span>
          ) : isInFlight ? (
            <motion.span
              key="inflight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              GhostLock protecting your trade…
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium"
            >
              <Check className="w-3.5 h-3.5" />
              MEV-protected via 3-layer defense
            </motion.span>
          )}
        </AnimatePresence>

        <span className="text-[11px] text-muted-foreground/70 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-holme-green-success inline-block animate-pulse" />
          Pyth live
        </span>
      </div>
    </div>
  )
}