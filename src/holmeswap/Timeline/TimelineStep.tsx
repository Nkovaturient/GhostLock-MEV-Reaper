import React from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface TimelineStepProps {
  step: number
  title: string
  subtitle: string
  status: 'pending' | 'active' | 'completed'
  badge?: string
  borderColor?: string
  icon: React.ReactNode
}

export default function TimelineStep({
  step,
  title,
  subtitle,
  status,
  badge,
  borderColor = '#4A90E2',
  icon,
}: TimelineStepProps) {
  return (
    <motion.div
      layout
      initial={false}
      animate={{
        opacity: status === 'pending' ? 0.72 : 1,
        scale: status === 'active' ? 1.02 : 1,
        boxShadow:
          status === 'active'
            ? `0 0 0 2px ${borderColor}40, 0 8px 24px rgba(0,0,0,0.1)`
            : '0 4px 16px rgba(74, 144, 226, 0.12)',
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'relative flex items-start gap-4 p-4 rounded-[20px] pl-14 holme-glass-card',
        'border-l-4'
      )}
      style={{ borderLeftColor: status === 'pending' ? 'rgba(0,0,0,0.06)' : borderColor }}
      role="listitem"
      aria-current={status === 'active' ? 'step' : undefined}
      aria-label={`Step ${step}: ${title}`}
    >
      <div
        className="absolute left-6 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full flex-shrink-0"
        style={{
          backgroundColor: status === 'completed' ? '#6BCF7F' : status === 'active' ? '#FFD93D' : `${borderColor}80`,
          boxShadow: status === 'active' ? '0 0 0 4px rgba(255, 217, 61, 0.35)' : undefined,
        }}
        aria-hidden
      />
      <div
        className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)]"
        style={{ backgroundColor: `${borderColor}20` }}
      >
        {status === 'completed' ? (
          <Check className="w-6 h-6 text-holme-green-success" aria-hidden />
        ) : (
          icon
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-holme-text-primary">{title}</h3>
          {badge && (
            <span
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium',
                status === 'active'
                  ? 'bg-holme-yellow/50 text-holme-text-primary'
                  : 'bg-white/60 text-holme-text-secondary'
              )}
            >
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-holme-text-secondary mt-0.5">{subtitle}</p>
      </div>
    </motion.div>
  )
}
