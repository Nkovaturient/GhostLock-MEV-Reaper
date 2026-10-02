import React from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Info, FuelIcon } from 'lucide-react'
import TokenInput from './TokenInput'
import SwapButton from './SwapButton'
import { SwapArrowButton } from './TokenInput'
import SwapTradeTabs from './SwapTradeTabs'
import MEVProtectionPanel from './MEVProtectionPanel'
import SwapInlineError from './SwapInlineError'
import { useSwapCalculation } from '../hooks/useOraclePrice'
import { useOraclePriceContext } from '../context/OraclePriceContext'
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
  const { prices, isLoading: priceLoading } = useOraclePriceContext()
  const { amountOut } = useSwapCalculation(prices)
  const { estimatedSavings } = useMevSavingsEstimate()
  const { totalCost } = useGasEstimate()

  const intentStatus = useSwapStore(s => s.intentStatus)
  const amountIn = useSwapStore(s => s.amountIn)
  const error = useSwapStore(s => s.error)
  const errorField = useSwapStore(s => s.errorField)
  const tradeTab = useSwapStore(s => s.tradeTab)
  const setTokenIn = useSwapStore(s => s.setTokenIn)
  const setTokenOut = useSwapStore(s => s.setTokenOut)
  const setAmountIn = useSwapStore(s => s.setAmountIn)
  const setSwapError = useSwapStore(s => s.setSwapError)
  const clearIntentProgress = useSwapStore(s => s.clearIntentProgress)

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

  React.useEffect(() => {
    const n = parseFloat(amountIn)
    const amountOk = Number.isFinite(n) && n > 0
    if (!error) return
    if (errorField === 'amount' && amountOk) {
      setSwapError(null, null)
      if (intentStatus === 'error') clearIntentProgress()
      return
    }
    setSwapError(null, null)
    if (intentStatus === 'error') clearIntentProgress()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- clear stale errors when user edits inputs
  }, [amountIn, tradeTab])

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
      </motion.div>

      {/* Token Input */}
      <motion.div variants={cardItem} className="overflow-visible">
        <TokenInput type="in" />
      </motion.div>

      {error && errorField === 'amount' && (
        <motion.div variants={cardItem} className="mt-3">
          <SwapInlineError message={error} field="amount" />
        </motion.div>
      )}

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

      {/* Submit Button */}
      {error && errorField && errorField !== 'amount' && errorField !== 'oracle' && (
        <motion.div variants={cardItem} className="mt-4">
          <SwapInlineError message={error} field={errorField} />
        </motion.div>
      )}

      <motion.div variants={cardItem} className="mt-5 space-y-3">
        {isConnected && amountIn && parseFloat(amountIn) > 0 && (
          <div
            className="flex items-center justify-between gap-3 px-1 text-sm"
            role="status"
            aria-label={`Total cost: ${totalCost}, bond plus estimated network fee`}
          >
            <span className="inline-flex items-center gap-1.5 text-muted-foreground min-w-0">
              <FuelIcon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="truncate">Intent bond (refundable)</span>
            </span>
            <span className="font-semibold tabular-nums text-foreground shrink-0">
              {totalCost}
            </span>
          </div>
        )}
        {isConnected && amountIn && parseFloat(amountIn) > 0 && (
          <p className="px-1 text-[10px] text-muted-foreground leading-snug">
            Wallet network fee is separate (usually well under 0.0001 ETH). Bond stays on GhostLock until fill or slash rules apply — not a Uniswap-style instant swap.
          </p>
        )}
        {tradeTab === 'limit' && (
          <p className="flex items-start gap-1.5 px-1 text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60" aria-hidden />
            <span>
              Same encrypted flow as Swap — your limit only fills within the live oracle ± slippage,
              so you get a fair price without front-running attacks.
            </span>
          </p>
        )}
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