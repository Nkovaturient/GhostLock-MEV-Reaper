/**
 * MEVProtectionPanel.tsx
 *
 * Displays GhostLock MEV protection status:
 * - Encryption status with visual indicator
 * - Block countdown to reveal
 * - Estimated MEV savings
 * - Settlement progress
 * - Fair ordering status (VRF)
 * - Intent verification proof rows
 */
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Lock, Unlock, Clock, CheckCircle, Zap, Shuffle } from 'lucide-react'
import { useSwapStore } from '../stores/swapStore'
import { cn } from '../../lib/utils'
import IntentProofRow from './IntentProofRow'
import { useIntentReady } from '../hooks/useIntentReady'
import { useBlocklockSender } from '../hooks/useBlocklockSender'
import { getExplorerTxUrl, getExplorerAddressUrl } from '../lib/blockExplorer'
import { getAddresses } from '../contracts/config'
import { useChainId } from 'wagmi'

interface ProtectionStep {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  status: 'pending' | 'active' | 'completed'
}

export default function MEVProtectionPanel() {
  const chainId = useChainId()
  const intentStatus = useSwapStore(s => s.intentStatus)
  const targetBlock = useSwapStore(s => s.targetBlock)
  const encryptionStatus = useSwapStore(s => s.encryptionStatus)
  const mevSavings = useSwapStore(s => s.mevSavings)
  const estimatedMevSavings = useSwapStore(s => s.estimatedMevSavings)
  const ciphertextPreview = useSwapStore(s => s.ciphertextPreview)
  const step = useSwapStore(s => s.step)
  const secondsLeft = useSwapStore(s => s.countdown)
  const lastRequestId = useSwapStore(s => s.lastRequestId)
  const txHash = useSwapStore(s => s.txHash)
  const revealTxHash = useSwapStore(s => s.revealTxHash)

  const { isReady, isLoading: isReadyLoading } = useIntentReady()
  const { blocklockSender, isLoading: blocklockLoading } = useBlocklockSender()
  const addrs = getAddresses(chainId)

  const steps: ProtectionStep[] = React.useMemo(() => {
    const locking = intentStatus === 'locked' && secondsLeft > 0
    const pastUnlock = intentStatus === 'locked' && secondsLeft === 0
    const revealed = intentStatus === 'ordering' || intentStatus === 'competing' || intentStatus === 'settled'

    return [
      {
        id: 'encrypt',
        label: 'Intent Encrypted',
        description: 'Your swap is encrypted with threshold cryptography',
        icon: <Lock className="w-4 h-4" />,
        status:
          intentStatus === 'encrypting' ? 'active' :
            intentStatus === 'idle' && step === 0 ? 'pending' :
              'completed',
      },
      {
        id: 'submit',
        label: 'Submitted to Chain',
        description: 'Encrypted intent is on-chain, hidden from MEV bots',
        icon: <Shield className="w-4 h-4" />,
        status:
          intentStatus === 'submitting' ? 'active' :
            ['locked', 'ordering', 'competing', 'settled'].includes(intentStatus) ||
            (intentStatus === 'error' && step >= 2) ? 'completed' :
              'pending',
      },
      {
        id: 'lock',
        label: 'Time-Locked',
        description: locking
          ? `Reveals in ~${secondsLeft}s (unlock block ${targetBlock || '—'})`
          : pastUnlock
            ? 'Unlock block reached on-chain'
            : revealed
              ? 'Unlock window complete'
              : 'Waiting for submission…',
        icon: <Clock className="w-4 h-4" />,
        status:
          locking ? 'active' :
            pastUnlock || revealed ? 'completed' : 'pending',
      },
      {
        id: 'reveal',
        label: 'Intent Revealed',
        description: revealed
          ? 'Decrypted on-chain; ready for batch settlement'
          : pastUnlock
            ? 'Waiting for blocklock oracle to deliver the decryption key…'
            : 'Ciphertext hidden until unlock block',
        icon: <Unlock className="w-4 h-4" />,
        status:
          revealed ? 'completed' :
            pastUnlock ? 'active' : 'pending',
      },
      {
        id: 'order',
        label: 'Fair Ordering',
        description: 'VRF randomness ensures fair intent sequencing',
        icon: <Shuffle className="w-4 h-4" />,
        status:
          intentStatus === 'competing' || intentStatus === 'settled' ? 'completed' :
            intentStatus === 'ordering' ? 'active' : 'pending',
      },
      {
        id: 'settle',
        label: 'Batch Settlement',
        description: 'Solvers compete to give you the best price',
        icon: <Zap className="w-4 h-4" />,
        status:
          intentStatus === 'settled' ? 'completed' :
            intentStatus === 'competing' ? 'active' : 'pending',
      },
    ]
  }, [intentStatus, secondsLeft, targetBlock, step])

  const activeStep = steps.find(s => s.status === 'active')
  const completedSteps = steps.filter(s => s.status === 'completed').length
  const progressPercent = (completedSteps / steps.length) * 100

  const getStatusColor = (status: ProtectionStep['status']) => {
    switch (status) {
      case 'completed':
        return 'border-holme-green-success/35 bg-holme-green-success/10'
      case 'active':
        return 'border-holme-warning/35 bg-holme-warning/10'
      case 'pending':
        return 'border-border/40 bg-muted/35'
    }
  }

  const getIconColor = (status: ProtectionStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-holme-green-success'
      case 'active':
        return 'text-holme-warning animate-pulse'
      case 'pending':
        return 'text-muted-foreground'
    }
  }

  // Show panel only when intent is active
  if (intentStatus === 'idle' && step === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-3 sm:p-4 border border-border/50 bg-card/80 backdrop-blur-md shadow-holme-soft"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-holme-green-success/15 border border-holme-green-success/30 shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-holme-green-success" aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-sm sm:text-base font-semibold text-foreground">
              MEV Protection Ready
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
              Your swap will be encrypted and protected from frontrunning
            </p>
          </div>
        </div>
        <div
          className="mt-3 pt-3 border-t border-border/40 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] sm:text-xs text-muted-foreground"
          role="list"
        >
          <span className="inline-flex items-center gap-1.5" role="listitem">
            <CheckCircle className="w-3.5 h-3.5 text-holme-green-success shrink-0" aria-hidden />
            Blocklock encryption
          </span>
          <span className="inline-flex items-center gap-1.5" role="listitem">
            <Shuffle className="w-3.5 h-3.5 text-primary/80 shrink-0" aria-hidden />
            Fair ordering
          </span>
          <span className="inline-flex items-center gap-1.5" role="listitem">
            <Zap className="w-3.5 h-3.5 text-holme-warning shrink-0" aria-hidden />
            Batch auction
          </span>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-3 sm:p-4 border border-border/50 bg-card/80 backdrop-blur-md shadow-holme-soft overflow-hidden"
    >
      {/* Header with progress */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 min-w-0">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              'p-2 rounded-xl border transition-colors duration-300 shrink-0',
              intentStatus === 'settled'
                ? 'bg-holme-green-success/15 border-holme-green-success/30'
                : intentStatus === 'error'
                  ? 'bg-destructive/10 border-destructive/30'
                  : 'bg-holme-warning/15 border-holme-warning/30'
            )}
          >
            {intentStatus === 'settled' ? (
              <CheckCircle className="w-5 h-5 text-holme-green-success" />
            ) : intentStatus === 'error' ? (
              <Shield className="w-5 h-5 text-destructive" />
            ) : (
              <Shield className="w-5 h-5 text-holme-warning" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-foreground">
              {intentStatus === 'settled' ? 'Swap Complete' :
               intentStatus === 'error' ? 'Protection Failed' :
               'MEV Protection Active'}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
              {intentStatus === 'settled' ? `Saved ~$${mevSavings} in MEV protection` :
               intentStatus === 'error' ? 'An error occurred during processing' :
               activeStep?.description}
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {completedSteps}/{steps.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full bg-muted rounded-full mb-4 overflow-hidden border border-border/30">
        <motion.div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            intentStatus === 'settled' ? 'bg-holme-green-success' :
            intentStatus === 'error' ? 'bg-destructive' :
            'bg-holme-warning'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((s, idx) => (
          <AnimatePresence key={s.id}>
            {(s.status === 'active' || s.status === 'completed' || idx === steps.findIndex(st => st.status === 'active') + 1) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  'flex flex-col gap-2 p-2.5 sm:p-3 rounded-xl border transition-all duration-300',
                  getStatusColor(s.status)
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('transition-colors duration-300 shrink-0 mt-0.5', getIconColor(s.status))}>
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'text-sm font-semibold transition-colors duration-300',
                          s.status === 'completed' ? 'text-foreground' :
                          s.status === 'active' ? 'text-foreground' :
                          'text-muted-foreground'
                        )}
                      >
                        {s.label}
                      </span>
                      {s.status === 'completed' && (
                        <CheckCircle className="w-3.5 h-3.5 text-holme-green-success shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm mt-0.5 text-muted-foreground transition-colors duration-300 leading-relaxed">
                      {s.description}
                    </p>
                  </div>
                </div>

                {/* Proof rows for each step */}
                <div className="ml-9 space-y-1.5 pt-1">
                  {/* Encrypt step: ciphertext preview + target block */}
                  {s.id === 'encrypt' && (s.status === 'active' || s.status === 'completed') && ciphertextPreview && (
                    <IntentProofRow
                      label="Ciphertext"
                      value={ciphertextPreview}
                      className="opacity-90"
                    />
                  )}
                  {s.id === 'encrypt' && (s.status === 'active' || s.status === 'completed') && targetBlock > 0 && (
                    <IntentProofRow
                      label="Unlock block"
                      value={String(targetBlock)}
                      className="opacity-90"
                    />
                  )}

                  {/* Submit step: requestId + txHash */}
                  {s.id === 'submit' && (s.status === 'active' || s.status === 'completed') && lastRequestId != null && (
                    <IntentProofRow
                      label="Request ID"
                      value={lastRequestId}
                      className="opacity-90"
                    />
                  )}
                  {s.id === 'submit' && (s.status === 'active' || s.status === 'completed') && txHash && (
                    <IntentProofRow
                      label="Transaction"
                      value={txHash}
                      href={getExplorerTxUrl(chainId, txHash)}
                      className="opacity-90"
                    />
                  )}

                  {/* Reveal step: isReady status + revealTxHash when available */}
                  {s.id === 'reveal' && intentStatus === 'locked' && lastRequestId != null && (
                    <>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">On-chain ready status:</span>
                        {isReadyLoading ? (
                          <span className="inline-block w-12 h-3 bg-muted rounded animate-pulse" />
                        ) : (
                          <span className={cn(
                            'font-medium',
                            isReady ? 'text-holme-green-success' : 'text-holme-warning'
                          )}>
                            {isReady ? 'Yes' : 'No — waiting for oracle'}
                          </span>
                        )}
                      </div>
                      <IntentProofRow
                        label="Liveness contract"
                        value={addrs.GhostLockLiveness}
                        href={getExplorerAddressUrl(chainId, addrs.GhostLockLiveness)}
                        className="opacity-75"
                      />
                      {(blocklockLoading || blocklockSender) && (
                        <IntentProofRow
                          label="Blocklock sender"
                          value={blocklockSender ?? '—'}
                          href={blocklockSender ? getExplorerAddressUrl(chainId, blocklockSender) : null}
                          isLoading={blocklockLoading}
                          className="opacity-75"
                        />
                      )}
                    </>
                  )}
                  {s.id === 'reveal' && revealTxHash && (
                    <IntentProofRow
                      label="Reveal tx"
                      value={revealTxHash}
                      href={getExplorerTxUrl(chainId, revealTxHash)}
                      className="opacity-90"
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {/* MEV Savings estimate */}
      {(estimatedMevSavings || mevSavings !== '0') && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 rounded-xl bg-holme-green-success/10 border border-holme-green-success/25"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground">MEV Protection Savings</span>
            <span className="text-sm font-bold text-holme-green-success tabular-nums">
              ${mevSavings !== '0' ? mevSavings : estimatedMevSavings?.toFixed(2)}
            </span>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            Estimated savings vs. public mempool submission
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
