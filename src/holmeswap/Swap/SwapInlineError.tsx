import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'

export type SwapErrorField = 'amount' | 'oracle' | 'wallet' | 'network' | 'general'

interface SwapInlineErrorProps {
  message: string
  field?: SwapErrorField
  className?: string
}

export default function SwapInlineError({ message, field = 'general', className }: SwapInlineErrorProps) {
  const hint =
    field === 'amount'
      ? 'Check the amount you entered.'
      : field === 'oracle'
        ? 'Price quote issue — see Live Oracle Price below.'
        : field === 'wallet'
          ? 'Wallet action required.'
          : field === 'network'
            ? 'Connection issue.'
            : undefined

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        role="alert"
        className={cn(
          'flex items-start gap-2.5 px-3 py-2.5 rounded-xl',
          'bg-destructive/10 border border-destructive/30 text-destructive text-sm',
          className,
        )}
      >
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0">
          <p className="font-medium leading-snug">{message}</p>
          {hint && (
            <p className="text-xs text-destructive/80 mt-1 leading-relaxed">{hint}</p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
