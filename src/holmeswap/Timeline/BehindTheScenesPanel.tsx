import React from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Eye, X, Check } from 'lucide-react'
import { useTimelineSteps, type TimelineStep } from '../hooks/useTimelineSteps'
import { cn } from '../../lib/utils'

const stepVariants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0 },
}

function ChecklistStep({ step, index }: { step: TimelineStep; index: number }) {
  const isActive = step.status === 'active'
  const isComplete = step.status === 'complete'

  return (
    <motion.div
      variants={stepVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.06 }}
      className={cn(
        'holme-step-card pl-6 transition-all relative',
        isActive && 'ring-2 ring-primary/25',
        isComplete && 'opacity-95',
      )}
      style={{ '--step-color': step.color } as React.CSSProperties}
    >
      <div className="absolute left-3 top-5 z-10">
        <motion.div
          className={cn(
            'w-5 h-5 rounded-full border-2 flex items-center justify-center',
            isComplete && 'border-holme-green-success bg-holme-green-success/15',
            isActive && 'border-primary bg-primary/10',
            !isComplete && !isActive && 'border-border/60 bg-muted/40',
          )}
          initial={false}
          animate={isComplete ? { scale: [1, 1.15, 1] } : isActive ? { scale: [1, 1.08, 1] } : {}}
          transition={{ repeat: isActive ? Infinity : 0, duration: 1.8 }}
        >
          {isComplete && (
            <motion.span
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            >
              <Check className="w-3 h-3 text-holme-green-success" strokeWidth={3} />
            </motion.span>
          )}
        </motion.div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <motion.div
            className="w-12 h-12 flex-shrink-0 flex items-center justify-center"
            animate={isActive ? { scale: [1, 1.06, 1], rotateY: [0, 8, 0] } : {}}
            transition={{ repeat: isActive ? Infinity : 0, duration: 2.2 }}
          >
            {step.icon}
          </motion.div>
          <div className="pt-1 min-w-0">
            <h3 className="font-semibold text-foreground text-base">{step.title}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{step.subtitle}</p>
          </div>
        </div>

        <div className="flex-shrink-0">
          {step.badge && (
            <motion.span
              className={cn(
                'inline-block px-3 py-1.5 rounded-lg text-xs font-semibold',
                isActive ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground',
              )}
              animate={isActive ? { opacity: [1, 0.7, 1] } : {}}
              transition={{ repeat: isActive ? Infinity : 0, duration: 1.5 }}
            >
              {step.badge}
            </motion.span>
          )}
          {step.timer !== undefined && (
            <motion.span
              className={cn(
                'inline-block px-3 py-2 rounded-xl text-sm font-mono font-bold tabular-nums',
                step.timer <= 10 ? 'bg-holme-warning/20 text-holme-warning' : 'bg-muted text-foreground',
              )}
              key={step.timer}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
            >
              {step.timer}s
            </motion.span>
          )}
        </div>
      </div>

      {step.extra && <div className="mt-3 ml-15">{step.extra}</div>}
    </motion.div>
  )
}

export default function BehindTheScenesPanel() {
  const [open, setOpen] = React.useState(false)
  const steps = useTimelineSteps()
  const completedCount = steps.filter(s => s.status === 'complete').length

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'fixed bottom-[3.25rem] right-4 sm:right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl',
          'bg-card/95 backdrop-blur-md border border-border/50 shadow-holme-card',
          'text-sm font-semibold text-foreground hover:border-primary/30 transition-colors',
        )}
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.97 }}
        aria-expanded={open}
        aria-label="See behind the scenes"
      >
        <Eye className="w-4 h-4 text-primary" />
        <span className="hidden sm:inline">See behind the scenes</span>
        <span className="sm:hidden">Behind the scenes</span>
        {completedCount > 0 && (
          <span className="ml-1 px-2 py-0.5 rounded-full bg-holme-green-success/15 text-holme-green-success text-xs tabular-nums">
            {completedCount}/{steps.length}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-background/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              role="dialog"
              aria-modal
              aria-label="GhostLock process timeline"
              className={cn(
                'fixed z-[70] overflow-hidden',
                'inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl',
                'sm:inset-x-auto sm:bottom-[3.25rem] sm:right-6 sm:left-auto sm:w-[min(100vw-2rem,420px)] sm:max-h-[min(85vh,640px)] sm:rounded-3xl',
                'bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl',
              )}
              initial={{ opacity: 0, y: 48, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 32, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                <div>
                  <h2 className="text-base font-bold text-foreground">Behind the scenes</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    GhostLock MEV protection pipeline
                  </p>
                </div>
                <motion.button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-xl hover:bg-muted/80 border border-transparent hover:border-border/40"
                  whileTap={{ scale: 0.92 }}
                  aria-label="Close panel"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </motion.button>
              </div>

              <div className="p-4 overflow-y-auto max-h-[calc(85vh-4.5rem)] sm:max-h-[calc(min(85vh,640px)-4.5rem)]">
                <LayoutGroup>
                  <motion.div layout className="space-y-3">
                    {steps.map((s, i) => (
                      <ChecklistStep key={s.id} step={s} index={i} />
                    ))}
                  </motion.div>
                </LayoutGroup>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
