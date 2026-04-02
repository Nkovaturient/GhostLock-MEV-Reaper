/**
 * MempoolLockCard.tsx
 *
 * Countdown is now block-accurate (from useCountdown → targetBlock).
 * Solver count animates based on real intentStatus phase.
 * Settlement confirmation shown when settled.
 */

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSwapStore }        from '../stores/swapStore'
import { CageLockIcon, SolverIcon } from '../assets/IllustrationIcons'
import { cn }                  from '../../lib/utils'

const SOLVER_COUNT = 3

export default function MempoolLockCard() {
  const countdown    = useSwapStore((s) => s.countdown)
  const intentStatus = useSwapStore((s) => s.intentStatus)
  const lastRequestId = useSwapStore((s) => s.lastRequestId)

  const showTimer = ['locked', 'ordering'].includes(intentStatus) && countdown > 0
  const isCompeting = intentStatus === 'competing'
  const isSettled   = intentStatus === 'settled'

  // Pulse animation on countdown tick
  const [pulse, setPulse] = useState(false)
  const prevCountRef = React.useRef(countdown)
  useEffect(() => {
    if (countdown !== prevCountRef.current && showTimer) {
      prevCountRef.current = countdown
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 300)
      return () => clearTimeout(t)
    }
  }, [countdown, showTimer])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className={cn(
        'rounded-2xl p-5 holme-glass-card min-h-[120px]',
        isSettled && 'ring-1 ring-green-500/40'
      )}
      role="region"
      aria-label="Mempool lock status"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground text-base">
          {isSettled ? '✓ Settled!' : 'Locked in Mempool'}
        </h3>

        <AnimatePresence mode="wait">
          {showTimer && (
            <motion.span
              key={countdown}
              initial={{ scale: pulse ? 1.15 : 1 }}
              animate={{ scale: 1 }}
              className={cn(
                'px-3 py-2 rounded-xl text-sm font-mono font-bold tabular-nums',
                countdown <= 10
                  ? 'bg-holme-warning/20 text-holme-warning'
                  : 'bg-muted text-foreground'
              )}
              aria-live="polite"
            >
              {countdown}s
            </motion.span>
          )}
          {isCompeting && (
            <motion.span
              key="competing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-holme-primary/20 text-holme-primary"
            >
              Solvers bidding…
            </motion.span>
          )}
          {isSettled && lastRequestId != null && (
            <motion.span
              key="settled"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs font-mono text-muted-foreground"
            >
              #{String(lastRequestId).padStart(6, '0')}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Illustration */}
      <div className="flex items-center justify-between gap-4">
        <div className="w-16 h-12 flex-shrink-0">
          <CageLockIcon className={cn('w-full h-full', isSettled && 'opacity-40')} />
        </div>

        <div className="flex items-end gap-1">
          {Array.from({ length: SOLVER_COUNT }, (_, i) => (
            <div key={i} className="text-center">
              <motion.div
                animate={isCompeting ? {
                  y: [0, -3 - i * 1.5, 0],
                  transition: { repeat: Infinity, duration: 0.8 + i * 0.2, delay: i * 0.15 }
                } : {}}
              >
                <SolverIcon
                  number={i + 1}
                  className={cn(
                    'mx-auto',
                    i === 0 ? 'w-10 h-12' : i === 1 ? 'w-9 h-11' : 'w-8 h-10',
                    isSettled && i === 0 && 'opacity-100',
                    isSettled && i > 0 && 'opacity-30',
                  )}
                />
              </motion.div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                {isSettled && i === 0 ? '🏆' : `S${i + 1}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}