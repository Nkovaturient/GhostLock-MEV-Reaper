import React from 'react'
import { motion } from 'framer-motion'
import { useSwapStore } from '../stores/swapStore'
import { LockIcon3D, CageLockIcon, DiceIcon3D, SolverIcon, CoinStackIcon } from '../assets/IllustrationIcons.tsx'
import { cn } from '../../lib/utils'
import IntentProofRow from '../Swap/IntentProofRow'
import { useIntentReady } from '../hooks/useIntentReady'
import { useBlocklockSender } from '../hooks/useBlocklockSender'
import { getExplorerTxUrl, getExplorerAddressUrl } from '../lib/blockExplorer'
import { getAddresses } from '../contracts/config'
import { useChainId } from 'wagmi'

interface TimelineStep {
  id: number
  title: string
  subtitle: string
  color: string
  icon: React.ReactNode
  status: 'pending' | 'active' | 'complete'
  badge?: string
  timer?: number
  extra?: React.ReactNode
}

const stepVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
}

function StepCard({ step, index }: { step: TimelineStep; index: number }) {
  const isActive = step.status === 'active'
  const isComplete = step.status === 'complete'

  return (
    <motion.div
      variants={stepVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.08 }}
      className={cn(
        'holme-step-card pl-6 transition-all',
        isActive && 'ring-2 ring-primary/20',
        isComplete && 'opacity-90'
      )}
      style={{ '--step-color': step.color } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Icon + Content */}
        <div className="flex items-start gap-3">
          <motion.div
            className="w-12 h-12 flex-shrink-0 flex items-center justify-center"
            animate={isActive ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: isActive ? Infinity : 0, duration: 2 }}
          >
            {step.icon}
          </motion.div>
          <div className="pt-1">
            <h3 className="font-semibold text-foreground text-base">{step.title}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{step.subtitle}</p>
          </div>
        </div>

        {/* Badge or Timer */}
        <div className="flex-shrink-0">
          {step.badge && (
            <motion.span
              className={cn(
                'inline-block px-3 py-1.5 rounded-lg text-xs font-semibold',
                isActive ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
              )}
              animate={isActive ? { opacity: [1, 0.7, 1] } : {}}
              transition={{ repeat: isActive ? Infinity : 0, duration: 1.5 }}
            >
              {step.badge}
            </motion.span>
          )}
          {step.timer !== undefined && (
            <motion.span
              className={cn(
                'inline-block px-3 py-2 rounded-xl text-sm font-mono font-bold tabular-nums',
                step.timer <= 10 ? 'bg-holme-warning/20 text-holme-warning' : 'bg-muted text-foreground'
              )}
              key={step.timer}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
            >
              {step.timer}s
            </motion.span>
          )}
        </div>
      </div>

      {/* Extra content */}
      {step.extra && <div className="mt-3 ml-15">{step.extra}</div>}
    </motion.div>
  )
}

export default function ProcessTimeline() {
  const chainId = useChainId()
  const step = useSwapStore((s) => s.step)
  const countdown = useSwapStore((s) => s.countdown)
  const winningBid = useSwapStore((s) => s.winningBid)
  const lastRequestId = useSwapStore((s) => s.lastRequestId)
  const txHash = useSwapStore((s) => s.txHash)
  const revealTxHash = useSwapStore((s) => s.revealTxHash)
  const targetBlock = useSwapStore((s) => s.targetBlock)
  const ciphertextPreview = useSwapStore((s) => s.ciphertextPreview)
  const intentStatus = useSwapStore((s) => s.intentStatus)

  const { isReady, isLoading: isReadyLoading } = useIntentReady()
  const { blocklockSender, isLoading: blocklockLoading } = useBlocklockSender()
  const addrs = getAddresses(chainId)

  const getStatus = (stepNum: number): 'pending' | 'active' | 'complete' => {
    if (stepNum < step) return 'complete'
    if (stepNum === step) return 'active'
    return 'pending'
  }

  const steps: TimelineStep[] = [
    {
      id: 1,
      title: 'Encrypting Intent',
      subtitle: 'Intents encrypted',
      color: 'hsl(var(--holme-blue))',
      icon: <LockIcon3D className="w-full h-full" animate={step === 1} />,
      status: getStatus(1),
      badge: step === 1 ? 'Submit...' : step > 1 ? '✓' : undefined,
      extra: step >= 1 && (lastRequestId || ciphertextPreview || targetBlock) ? (
        <div className="space-y-1.5">
          {ciphertextPreview && (
            <IntentProofRow label="Ciphertext" value={ciphertextPreview} />
          )}
          {targetBlock > 0 && (
            <IntentProofRow label="Unlock block" value={String(targetBlock)} />
          )}
        </div>
      ) : undefined,
    },
    {
      id: 2,
      title: 'Mempool Lockdown',
      subtitle: 'Intent stored 100 blocks',
      color: 'hsl(var(--holme-purple))',
      icon: <CageLockIcon className="w-full h-full" />,
      status: getStatus(2),
      timer: step >= 2 ? countdown : undefined,
      extra: step >= 2 && (lastRequestId || txHash) ? (
        <div className="space-y-1.5">
          {lastRequestId != null && (
            <IntentProofRow label="Request ID" value={lastRequestId} />
          )}
          {txHash && (
            <IntentProofRow
              label="Submit tx"
              value={txHash}
              href={getExplorerTxUrl(chainId, txHash)}
            />
          )}
          {intentStatus === 'locked' && lastRequestId != null && (
            <>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">On-chain ready:</span>
                {isReadyLoading ? (
                  <span className="inline-block w-12 h-3 bg-muted rounded animate-pulse" />
                ) : (
                  <span className={cn(
                    'font-medium',
                    isReady ? 'text-holme-green-success' : 'text-holme-warning'
                  )}>
                    {isReady ? 'Yes' : 'Pending oracle'}
                  </span>
                )}
              </div>
              <IntentProofRow
                label="Liveness"
                value={addrs.GhostLockLiveness}
                href={getExplorerAddressUrl(chainId, addrs.GhostLockLiveness)}
              />
              {(blocklockLoading || blocklockSender) && (
                <IntentProofRow
                  label="Blocklock sender"
                  value={blocklockSender ?? '—'}
                  href={blocklockSender ? getExplorerAddressUrl(chainId, blocklockSender) : null}
                  isLoading={blocklockLoading}
                />
              )}
            </>
          )}
        </div>
      ) : undefined,
    },
    {
      id: 3,
      title: 'Randomized Ordering',
      subtitle: 'Ordering via VRF',
      color: 'hsl(var(--holme-mint))',
      icon: <DiceIcon3D className="w-full h-full" animate={step === 3} />,
      status: getStatus(3),
      extra: step >= 3 && revealTxHash ? (
        <IntentProofRow
          label="Reveal tx"
          value={revealTxHash}
          href={getExplorerTxUrl(chainId, revealTxHash)}
        />
      ) : undefined,
    },
    {
      id: 4,
      title: 'Solver Competition',
      subtitle: `Solver 1, ${winningBid} USDC`,
      color: 'hsl(38, 100%, 60%)',
      icon: (
        <div className="flex items-center -space-x-2">
          <SolverIcon number={2} className="w-6 h-8" />
          <SolverIcon number={1} winner={step >= 4} className="w-8 h-10 relative z-10" />
          <SolverIcon number={3} className="w-6 h-8" />
        </div>
      ),
      status: getStatus(4),
      extra: step >= 4 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-muted text-muted-foreground">Ranked</span>
          <span className="px-2 py-1 rounded bg-holme-green-success/20 text-holme-green-success font-semibold">Solver 2</span>
        </div>
      ),
    },
    {
      id: 5,
      title: 'Batch Settlement',
      subtitle: 'Uniform price paid: 2,500.50 USDC',
      color: 'hsl(var(--holme-green-success))',
      icon: <CoinStackIcon className="w-full h-full" />,
      status: getStatus(5),
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {steps.map((s, i) => (
        <StepCard key={s.id} step={s} index={i} />
      ))}
    </motion.div>
  )
}
