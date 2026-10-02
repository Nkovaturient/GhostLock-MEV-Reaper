/**
 * MEVProtectionPanel.tsx — compact status badge (full pipeline lives in BehindTheScenesPanel).
 */
import React from 'react'
import { motion } from 'framer-motion'
import { Shield, CheckCircle, Shuffle, Zap } from 'lucide-react'
import { useSwapStore } from '../stores/swapStore'
import { cn } from '../../lib/utils'

export default function MEVProtectionPanel() {
  const intentStatus = useSwapStore(s => s.intentStatus)
  const step = useSwapStore(s => s.step)
  const mevSavings = useSwapStore(s => s.mevSavings)

  const isIdle = intentStatus === 'idle' && step === 0
  const isSettled = intentStatus === 'settled'
  const isError = intentStatus === 'error'
  const isActive = !isIdle && !isSettled && !isError

  const headline = isSettled
    ? 'Swap complete'
    : isError
      ? 'Protection failed'
      : isActive
        ? 'MEV protection active'
        : 'MEV Protection Ready'

  const subline = isSettled
    ? mevSavings !== '0'
      ? `Saved ~$${mevSavings} vs public mempool`
      : 'Batch settlement complete'
    : isError
      ? 'Check the error above and try again'
      : isActive
        ? 'Open “See behind the scenes” for live progress'
        : 'Your swap will be encrypted and protected from frontrunning'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl p-3 sm:p-4 border backdrop-blur-md shadow-holme-soft',
        isSettled && 'border-holme-green-success/30 bg-holme-green-success/5',
        isError && 'border-destructive/30 bg-destructive/5',
        isActive && 'border-holme-warning/30 bg-holme-warning/5',
        isIdle && 'border-border/50 bg-card/80',
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={cn(
            'p-2.5 rounded-xl border shrink-0',
            isSettled && 'bg-holme-green-success/15 border-holme-green-success/30',
            isError && 'bg-destructive/10 border-destructive/30',
            isActive && 'bg-holme-warning/15 border-holme-warning/30',
            isIdle && 'bg-holme-green-success/15 border-holme-green-success/30',
          )}
        >
          <Shield
            className={cn(
              'w-5 h-5 sm:w-6 sm:h-6',
              isSettled && 'text-holme-green-success',
              isError && 'text-destructive',
              isActive && 'text-holme-warning',
              isIdle && 'text-holme-green-success',
            )}
            aria-hidden
          />
        </div>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">{headline}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">{subline}</p>
        </div>
      </div>

      {isIdle && (
        <div
          className="mt-3 pt-3 border-t border-border/40 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] sm:text-xs text-muted-foreground"
          role="list"
        >
          <span className="inline-flex items-center gap-1.5" role="listitem">
            <CheckCircle className="w-3.5 h-3.5 text-holme-green-success shrink-0" aria-hidden />
            tlock encryption
          </span>
          <span className="inline-flex items-center gap-1.5" role="listitem">
            <Shuffle className="w-3.5 h-3.5 text-primary/80 shrink-0" aria-hidden />
            Fair ordering
          </span>
          <span className="inline-flex items-center gap-1.5" role="listitem">
            <Zap className="w-3.5 h-3.5 text-holme-warning shrink-0" aria-hidden />
            Batch auction
          </span>
        </div>
      )}
    </motion.div>
  )
}
