import React from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Info, FuelIcon } from 'lucide-react'
import TokenInput from './TokenInput'
import SwapButton from './SwapButton'
import { SwapArrowButton } from './TokenInput'
import SwapTradeTabs from './SwapTradeTabs'
import LivePriceDisplay from './LivePriceDisplay'
import MEVProtectionPanel from './MEVProtectionPanel'
import { useOraclePrice, useSwapCalculation } from '../hooks/useOraclePrice'
import { useGasEstimate, useMevSavingsEstimate } from '../hooks/useGasEstimate'
import { useSwapStore, type TokenInfo } from '../stores/swapStore'

const PRESET_ETH: TokenInfo = { symbol: 'ETH', address: '', decimals: 18 }
const PRESET_USDC: TokenInfo = { symbol: 'USDC', address: '', decimals: 6 }

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
  const tradeTab = useSwapStore(s => s.tradeTab)
  const setTokenIn = useSwapStore(s => s.setTokenIn)
  const setTokenOut = useSwapStore(s => s.setTokenOut)
  const setAmountIn = useSwapStore(s => s.setAmountIn)

  // Update amountOut in store when calculated
  const setAmountOut = useSwapStore(s => s.setAmountOut)
  const setEstimatedMevSavings = useSwapStore(s => s.setEstimatedMevSavings)

  React.useEffect(() => {
    setAmountOut(amountOut)
    setEstimatedMevSavings(estimatedSavings)
  }, [amountOut, estimatedSavings, setAmountOut, setEstimatedMevSavings])

  /** Buy = USDC→ETH, Sell = ETH→USDC presets (primary market); Swap/Limit leave pair user-defined. */
  React.useEffect(() => {
    if (tradeTab === 'buy') {
      setTokenIn(PRESET_USDC)
      setTokenOut(PRESET_ETH)
      setAmountIn('')
    } else if (tradeTab === 'sell') {
      setTokenIn(PRESET_ETH)
      setTokenOut(PRESET_USDC)
      setAmountIn('')
    }
  }, [tradeTab, setTokenIn, setTokenOut, setAmountIn])

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
      <motion.div variants={cardItem} className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <SwapTradeTabs />
          <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
            <Info className="w-3.5 h-3.5" />
            <span>MEV Protected</span>
          </div>
        </div>
        {tradeTab === 'limit' && (
          <p className="text-xs text-muted-foreground leading-relaxed rounded-xl bg-muted/25 px-3 py-2.5 border border-border/25">
            Limit orders use the same GhostLock intent: execution bounds come from the live oracle ± your slippage setting. Custom limit prices can be added later.
          </p>
        )}
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

      {/* Gas + bond estimate */}
      {canSwap && (
        <motion.div
          variants={cardItem}
          className="mt-3 rounded-2xl border border-border/50 bg-card/80 p-3 sm:p-4 backdrop-blur-md shadow-holme-soft"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                <FuelIcon className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-foreground">Total Cost</span>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">
                  Bond + estimated network fee
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 sm:text-right sm:justify-end pl-11 sm:pl-0">
              <span className="text-sm sm:text-base font-bold tabular-nums text-foreground break-all">
                {totalCost}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">
                (includes bond)
              </span>
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