import { motion } from 'framer-motion'
import { Wallet } from 'lucide-react'
import { useSwapStore, type TradeTab } from '../stores/swapStore'
import { cn } from '../../lib/utils'

interface SwapButtonProps {
  disabled?:    boolean
  loading?:     boolean
  onSubmit?:    () => void
  isConnected?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  encrypting: 'Encrypting…',
  submitting: 'Awaiting signature…',
  locked:     'Intent locked in mempool',
  ordering:   'VRF ordering…',
  competing:  'Solvers competing…',
  unfilled:   'Not filled',
  settled:    'Settled ✓',
  error:      'Retry',
}

const TAB_ACTION_LABELS: Record<TradeTab, string> = {
  swap:  'Swap',
  buy:   'Buy',
  sell:  'Sell',
  limit: 'Limit Swap',
}

export default function SwapButton({ disabled = false, loading = false, onSubmit, isConnected = false }: SwapButtonProps) {
  const amountIn     = useSwapStore(s => s.amountIn)
  const intentStatus = useSwapStore(s => s.intentStatus)
  const tradeTab     = useSwapStore(s => s.tradeTab)

  const hasAmount = amountIn && parseFloat(amountIn) > 0
  const isActive  = hasAmount && onSubmit && !disabled && isConnected

  const label = !isConnected
    ? 'Connect Wallet'
    : STATUS_LABELS[intentStatus] ?? TAB_ACTION_LABELS[tradeTab]

  const isSettled = intentStatus === 'settled'

  return (
    <motion.button
      type="button"
      onClick={isActive && !loading ? onSubmit : undefined}
      disabled={!isActive || loading || isSettled}
      className={cn(
        'w-full py-4 rounded-2xl font-bold text-lg transition-all border-2',
        !isConnected && 'border-border/30 bg-muted text-muted-foreground cursor-not-allowed opacity-80',
        isConnected && !hasAmount && 'opacity-60 cursor-not-allowed border-transparent',
        isConnected && hasAmount && !loading && !isSettled && 'holme-btn-yellow border-primary-foreground/30',
        loading && 'cursor-wait opacity-80',
        isSettled && 'bg-holme-green-success/20 border-holme-green-success/30 text-holme-green-success cursor-default',
        disabled && hasAmount && isConnected && !loading && !isSettled && 'opacity-60 cursor-not-allowed',
      )}
      style={isConnected && hasAmount && !loading && !isSettled && !disabled ? {
        background: 'linear-gradient(135deg, hsl(47, 100%, 62%) 0%, hsl(38, 100%, 60%) 100%)',
        color: 'hsl(var(--holme-text-primary))',
      } : undefined}
      whileHover={isActive && !loading && !isSettled ? { scale: 1.02 } : {}}
      whileTap={isActive && !loading && !isSettled ? { scale: 0.98 } : {}}
      aria-busy={loading}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2 justify-center">
          <span className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
          {label}
        </span>
      ) : !isConnected ? (
        <span className="inline-flex items-center gap-2 justify-center">
          <Wallet className="w-5 h-5" />
          Connect Wallet
        </span>
      ) : (
        label
      )}
    </motion.button>
  )
}
