import React from 'react'
import { motion } from 'framer-motion'
import { useTimelineSteps, type TimelineStep } from '../hooks/useTimelineSteps'
import { cn } from '../../lib/utils'

const stepVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
}

function StepCard({ step, index }: { step: TimelineStep; index: number }) {
  const isActive = step.status === 'active'
  const isComplete = step.status === 'complete'

  return (
    <motion.div
      variants={stepVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.08 }}
      className={cn(
        'holme-step-card pl-6 transition-all',
        isActive && 'ring-2 ring-primary/20',
        isComplete && 'opacity-90',
      )}
      style={{ '--step-color': step.color } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <motion.div
            className="w-12 h-12 flex-shrink-0 flex items-center justify-center"
            animate={isActive ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: isActive ? Infinity : 0, duration: 2 }}
          >
            {step.icon}
          </motion.div>
          <div className="pt-1">
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

/** Inline timeline (legacy); prefer BehindTheScenesPanel for main UI. */
export default function ProcessTimeline() {
  const steps = useTimelineSteps()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {steps.map((s, i) => (
        <StepCard key={s.id} step={s} index={i} />
      ))}
    </motion.div>
  )
}
