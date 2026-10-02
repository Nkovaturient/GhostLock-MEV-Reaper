import React from 'react'
import { motion } from 'framer-motion'
import SwapCard from './SwapCard'
import LivePriceDisplay from './LivePriceDisplay'
import SwapInlineError from './SwapInlineError'
import { useSwapStore } from '../stores/swapStore'

interface SwapArenaProps {
  onSubmit?: () => void
  isSubmitting?: boolean
  isConnected?: boolean
  balanceExceeded?: boolean
  balance?: string | null
}

export default function SwapArena({
  onSubmit,
  isSubmitting = false,
  isConnected = false,
  balanceExceeded = false,
  balance = null,
}: SwapArenaProps) {
  const error = useSwapStore(s => s.error)
  const errorField = useSwapStore(s => s.errorField)

  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-center gap-5 lg:gap-6 w-full max-w-[1040px] mx-auto">
      <div className="w-full max-w-lg mx-auto lg:mx-0 lg:flex-1 lg:max-w-[500px]">
        <SwapCard
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          isConnected={isConnected}
          balanceExceeded={balanceExceeded}
          balance={balance}
        />
      </div>

      <aside className="w-full max-w-[390px] mx-auto lg:mx-0 lg:w-[390px] lg:flex-shrink-0 lg:sticky lg:top-24 flex flex-col gap-3 overflow-visible">
        {error && errorField === 'oracle' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <SwapInlineError message={error} field="oracle" />
          </motion.div>
        )}
        <LivePriceDisplay />
      </aside>
    </div>
  )
}
