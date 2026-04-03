import React from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Info, FuelIcon } from 'lucide-react'
import TokenInput from './TokenInput'
import SwapButton from './SwapButton'
import { SwapArrowButton } from './TokenInput'
import LivePriceDisplay from './LivePriceDisplay'
import MEVProtectionPanel from './MEVProtectionPanel'
/* cn utility imported but not needed currently */
import { useOraclePrice, useSwapCalculation } from '../hooks/useOraclePrice'
import { useGasEstimate, useMevSavingsEstimate } from '../hooks/useGasEstimate'
import { useSwapStore } from '../stores/swapStore'

interface SwapCardProps {
  onSubmit?:          () => void
  isSubmitting?:      boolean
  isConnected?:       boolean
  balanceExceeded?:   boolean
  balance?:           string | null
}

const cardItem = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0  },
}

export default function SwapCard({
  onSubmit,
  isSubmitting     = false,
  isConnected      = false,
  balanceExceeded  = false,
  balance          = null,
}: SwapCardProps) {
  const { prices, isLoading: priceLoading } = useOraclePrice()
  const { amountOut } = useSwapCalculation()
  const { estimatedSavings } = useMevSavingsEstimate()
  const { totalCost } = useGasEstimate()

  const intentStatus = useSwapStore(s => s.intentStatus)
  const amountIn = useSwapStore(s => s.amountIn)

  // Update amountOut in store when calculated
  const setAmountOut = useSwapStore(s => s.setAmountOut)
  const setEstimatedMevSavings = useSwapStore(s => s.setEstimatedMevSavings)

  React.useEffect(() => {
    setAmountOut(amountOut)
    setEstimatedMevSavings(estimatedSavings)
  }, [amountOut, estimatedSavings, setAmountOut, setEstimatedMevSavings])

  // Check if swap is ready
  const canSwap = isConnected &&
    amountIn &&
    parseFloat(amountIn) > 0 &&
    !balanceExceeded &&
    prices.isValid &&
    intentStatus === 'idle'

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
      className="rounded-3xl p-6 holme-glass-card overflow-visible"
    >
      <motion.div variants={cardItem} className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Swap</h2>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Info className="w-3.5 h-3.5" />
          <span>MEV Protected</span>
        </div>
      </motion.div>

      {/* Token Input */}
      <motion.div variants={cardItem} className="overflow-visible">
        <TokenInput type="in" />
      </motion.div>

      {/* Swap Arrow */}
      <motion.div variants={cardItem} className="py-3 flex justify-center">
        <SwapArrowButton />
      </motion.div>

      {/* Token Output */}
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

      {/* Live Price Display */}
      <motion.div variants={cardItem} className="mt-4">
        <LivePriceDisplay />
      </motion.div>

      {/* Gas Estimate */}
      {canSwap && (
        <motion.div
          variants={cardItem}
          className="mt-3 p-3 rounded-xl bg-slate-900/50 border border-slate-700/30"
        >
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <FuelIcon className="w-4 h-4" />
              <span>Total Cost</span>
            </div>
            <div className="text-right">
              <span className="text-slate-200 font-medium">{totalCost}</span>
              <span className="text-xs text-slate-500 ml-2">(includes bond)</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Submit Button */}
      <motion.div variants={cardItem} className="mt-5">
        <SwapButton
          disabled={!canSwap || priceLoading}
          loading={isSubmitting}
          onSubmit={onSubmit}
          isConnected={isConnected}
        />
      </motion.div>

      {/* MEV Protection Panel */}
      <motion.div variants={cardItem} className="mt-4">
        <MEVProtectionPanel />
      </motion.div>
    </motion.div>
  )
}