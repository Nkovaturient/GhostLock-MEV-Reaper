import React from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import TokenInput from './TokenInput'
import SwapButton from './SwapButton'
import { SwapArrowButton } from './TokenInput'
import PriceDisplay from './PriceDisplay'
import { cn } from '../../lib/utils'

interface SwapCardProps {
  estimatedRate?:      string
  expectedMin?:        string
  actualPrice?:       string
  onSubmit?:          () => void
  isSubmitting?:      boolean
  isConnected?:       boolean
  balanceExceeded?:   boolean
  balance?:           string | null
  isLoading?:         boolean
  usdValueIn?:        number | null
  usdValueOut?:       number | null
}

const cardItem = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0  },
}

export default function SwapCard({
  estimatedRate    = '1 ETH ≈ — USDC',
  expectedMin      = '≥ —',
  actualPrice      = '$—',
  onSubmit,
  isSubmitting     = false,
  isConnected      = false,
  balanceExceeded  = false,
  balance          = null,
  isLoading        = false,
  usdValueIn       = null,
  usdValueOut      = null,
}: SwapCardProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
      className="rounded-3xl p-6 holme-glass-card overflow-visible"
    >
      <motion.h2 variants={cardItem} className="text-2xl font-semibold text-foreground mb-6">
        Swap
      </motion.h2>

      <motion.div variants={cardItem} className="overflow-visible">
        <TokenInput type="in" />
      </motion.div>

      <motion.div variants={cardItem} className="py-3 flex justify-center">
        <SwapArrowButton />
      </motion.div>

      <motion.div variants={cardItem} className="overflow-visible">
        <TokenInput type="out" readOnly />
      </motion.div>

      {/* Balance exceeded warning */}
      {balanceExceeded && (
        <motion.div
          variants={cardItem}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Insufficient balance. You have {balance ?? '—'} available.</span>
        </motion.div>
      )}

      <motion.div variants={cardItem} className="mt-5">
        <SwapButton
          disabled={!onSubmit || balanceExceeded || isLoading}
          loading={isSubmitting}
          onSubmit={onSubmit}
          isConnected={isConnected}
        />
      </motion.div>

      <motion.div variants={cardItem} className="mt-5">
        <PriceDisplay
          estimatedRate={estimatedRate}
          expectedMin={expectedMin}
          actual={actualPrice}
          usdValueIn={usdValueIn}
          usdValueOut={usdValueOut}
          isLoading={isLoading}
        />
      </motion.div>
    </motion.div>
  )
}