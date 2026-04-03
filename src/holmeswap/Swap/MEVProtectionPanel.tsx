/**
 * MEVProtectionPanel.tsx
 *
 * Displays GhostLock MEV protection status:
 * - Encryption status with visual indicator
 * - Block countdown to reveal
 * - Estimated MEV savings
 * - Settlement progress
 * - Fair ordering status (VRF)
 */
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Lock, Unlock, Clock, CheckCircle, Zap, Eye, Shuffle } from 'lucide-react'
import { useSwapStore, IntentStatus } from '../stores/swapStore'
import { cn } from '../../lib/utils'
import { useCountdown } from '../hooks/useCountdown'

interface ProtectionStep {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  status: 'pending' | 'active' | 'completed'
}

export default function MEVProtectionPanel() {
  const intentStatus = useSwapStore(s => s.intentStatus)
  const targetBlock = useSwapStore(s => s.targetBlock)
  const encryptionStatus = useSwapStore(s => s.encryptionStatus)
  const mevSavings = useSwapStore(s => s.mevSavings)
  const estimatedMevSavings = useSwapStore(s => s.estimatedMevSavings)
  const ciphertextPreview = useSwapStore(s => s.ciphertextPreview)
  const step = useSwapStore(s => s.step)

  const secondsLeft = useCountdown(targetBlock || null)

  const steps: ProtectionStep[] = React.useMemo(() => [
    {
      id: 'encrypt',
      label: 'Intent Encrypted',
      description: 'Your swap is encrypted with threshold cryptography',
      icon: <Lock className="w-4 h-4" />,
      status: step >= 1 ? 'completed' : 'pending',
    },
    {
      id: 'submit',
      label: 'Submitted to Chain',
      description: 'Encrypted intent is on-chain, hidden from MEV bots',
      icon: <Shield className="w-4 h-4" />,
      status: step >= 2 ? 'completed' : step === 1 ? 'active' : 'pending',
    },
    {
      id: 'lock',
      label: 'Time-Locked',
      description: `Reveals in ${secondsLeft}s (~${Math.ceil(secondsLeft / 12)} blocks)`,
      icon: <Clock className="w-4 h-4" />,
      status: step >= 3 ? 'completed' : step === 2 ? 'active' : 'pending',
    },
    {
      id: 'reveal',
      label: 'Intent Revealed',
      description: 'Decrypted and ready for batch settlement',
      icon: <Unlock className="w-4 h-4" />,
      status: step >= 4 ? 'completed' : step === 3 ? 'active' : 'pending',
    },
    {
      id: 'order',
      label: 'Fair Ordering',
      description: 'VRF randomness ensures fair intent sequencing',
      icon: <Shuffle className="w-4 h-4" />,
      status: step >= 5 ? 'completed' : step === 4 ? 'active' : 'pending',
    },
    {
      id: 'settle',
      label: 'Batch Settlement',
      description: 'Solvers compete to give you the best price',
      icon: <Zap className="w-4 h-4" />,
      status: step >= 6 ? 'completed' : step === 5 ? 'active' : 'pending',
    },
  ], [step, secondsLeft])

  const activeStep = steps.find(s => s.status === 'active')
  const completedSteps = steps.filter(s => s.status === 'completed').length
  const progressPercent = (completedSteps / steps.length) * 100

  const getStatusColor = (status: ProtectionStep['status']) => {
    switch (status) {
      case 'completed': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
      case 'active': return 'text-amber-400 border-amber-500/30 bg-amber-500/10'
      case 'pending': return 'text-slate-400 border-slate-500/20 bg-slate-500/5'
    }
  }

  const getIconColor = (status: ProtectionStep['status']) => {
    switch (status) {
      case 'completed': return 'text-emerald-400'
      case 'active': return 'text-amber-400 animate-pulse'
      case 'pending': return 'text-slate-400'
    }
  }

  // Show panel only when intent is active
  if (intentStatus === 'idle' && step === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 border border-slate-700/30 bg-slate-900/50 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">MEV Protection Ready</h3>
            <p className="text-xs text-slate-400">Your swap will be encrypted and protected from frontrunning</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle className="w-3 h-3" />
          <span>Blocklock encryption</span>
          <span className="mx-1">•</span>
          <Shuffle className="w-3 h-3" />
          <span>Fair ordering</span>
          <span className="mx-1">•</span>
          <Zap className="w-3 h-3" />
          <span>Batch auction</span>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 border border-slate-700/30 bg-slate-900/50 backdrop-blur-sm overflow-hidden"
    >
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl border transition-colors duration-300",
            intentStatus === 'settled' ? 'bg-emerald-500/10 border-emerald-500/30' :
            intentStatus === 'error' ? 'bg-rose-500/10 border-rose-500/30' :
            'bg-amber-500/10 border-amber-500/30'
          )}>
            {intentStatus === 'settled' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : intentStatus === 'error' ? (
              <Shield className="w-5 h-5 text-rose-400" />
            ) : (
              <Shield className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              {intentStatus === 'settled' ? 'Swap Complete' :
               intentStatus === 'error' ? 'Protection Failed' :
               'MEV Protection Active'}
            </h3>
            <p className="text-xs text-slate-400">
              {intentStatus === 'settled' ? `Saved ~$${mevSavings} in MEV protection` :
               intentStatus === 'error' ? 'An error occurred during processing' :
               activeStep?.description}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-medium text-slate-500">{completedSteps}/{steps.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-slate-800 rounded-full mb-4 overflow-hidden">
        <motion.div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            intentStatus === 'settled' ? 'bg-emerald-500' :
            intentStatus === 'error' ? 'bg-rose-500' :
            'bg-amber-500'
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
                  "flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300",
                  getStatusColor(s.status)
                )}
              >
                <div className={cn("transition-colors duration-300", getIconColor(s.status))}>
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-sm font-medium transition-colors duration-300",
                      s.status === 'completed' ? 'text-emerald-300' :
                      s.status === 'active' ? 'text-amber-300' :
                      'text-slate-400'
                    )}>
                      {s.label}
                    </span>
                    {s.status === 'completed' && (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <p className={cn(
                    "text-xs mt-0.5 transition-colors duration-300",
                    s.status === 'pending' ? 'text-slate-500' : 'text-slate-400'
                  )}>
                    {s.description}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {/* Ciphertext preview (when available) */}
      {ciphertextPreview && intentStatus !== 'idle' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 p-2.5 rounded-lg bg-slate-950/50 border border-slate-800"
        >
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Eye className="w-3 h-3" />
            <span className="font-mono">Ciphertext: {ciphertextPreview}...</span>
          </div>
        </motion.div>
      )}

      {/* MEV Savings estimate */}
      {(estimatedMevSavings || mevSavings !== '0') && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">MEV Protection Savings</span>
            <span className="text-sm font-semibold text-emerald-400">
              ${mevSavings !== '0' ? mevSavings : estimatedMevSavings?.toFixed(2)}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Estimated savings vs. public mempool submission
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
