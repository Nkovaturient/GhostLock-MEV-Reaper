import React from 'react'
import { useChainId } from 'wagmi'
import { useSwapStore } from '../stores/swapStore'
import { LockIcon3D, CageLockIcon, DiceIcon3D, SolverIcon, CoinStackIcon } from '../assets/IllustrationIcons.tsx'
import IntentProofRow from '../Swap/IntentProofRow'
import { useIntentReady } from './useIntentReady'
import { getExplorerTxUrl, getExplorerAddressUrl } from '../lib/blockExplorer'
import { getAddresses } from '../contracts/config'
import { cn } from '../../lib/utils'

export interface TimelineStep {
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

function TimelineMicroCheck({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={cn(
          'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
          done
            ? 'border-holme-green-success bg-holme-green-success/15 text-holme-green-success'
            : 'border-border/50 bg-muted/30 text-muted-foreground',
        )}
        aria-hidden
      >
        {done ? '✓' : '·'}
      </span>
      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  )
}

export function useTimelineSteps(): TimelineStep[] {
  const chainId = useChainId()
  const step = useSwapStore(s => s.step)
  const targetBlock = useSwapStore(s => s.targetBlock)
  const unlockRound = useSwapStore(s => s.unlockRound)
  const countdown = useSwapStore(s => s.countdown)
  const winningBid = useSwapStore(s => s.winningBid)
  const clearingPrice = useSwapStore(s => s.clearingPrice)
  const lastRequestId = useSwapStore(s => s.lastRequestId)
  const txHash = useSwapStore(s => s.txHash)
  const revealTxHash = useSwapStore(s => s.revealTxHash)
  const ciphertextPreview = useSwapStore(s => s.ciphertextPreview)
  const intentStatus = useSwapStore(s => s.intentStatus)

  const { isReady, isLoading: isReadyLoading } = useIntentReady()
  const addrs = getAddresses(chainId)

  const getStatus = (stepNum: number): 'pending' | 'active' | 'complete' => {
    if (stepNum < step) return 'complete'
    if (stepNum === step) return 'active'
    return 'pending'
  }

  const lockSubtitle =
    unlockRound != null && unlockRound > 0
      ? countdown > 0
        ? `Encrypted — reveal opens in ~${countdown}s (drand tlock)`
        : 'Reveal window open — decrypting intent'
      : 'Intent submitted — awaiting reveal window'

  const submitDone = Boolean(txHash)
  const revealWindowOpen = unlockRound != null && countdown <= 0 && step >= 2
  const revealedDone = Boolean(revealTxHash) || isReady || step >= 3

  const settlementSubtitle =
    step >= 5 && clearingPrice != null && clearingPrice > BigInt(0)
      ? `Uniform price paid: ${(Number(clearingPrice) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`
      : step >= 5 && winningBid !== '0'
        ? `Settlement: ${winningBid} USDC`
        : step >= 3
          ? 'Awaiting solver batch (run server solver for testnet fills)'
          : 'Awaiting batch settlement'

  const solverSubtitle =
    winningBid !== '0'
      ? `Winning bid: ${winningBid} USDC`
      : step >= 4
        ? 'Solvers competing for best fill'
        : 'Solver auction pending'

  return [
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
          {unlockRound != null && unlockRound > 0 && (
            <IntentProofRow label="Unlock round" value={String(unlockRound)} />
          )}
        </div>
      ) : undefined,
    },
    {
      id: 2,
      title: 'Mempool Lockdown',
      subtitle: lockSubtitle,
      color: 'hsl(var(--holme-purple))',
      icon: <CageLockIcon className="w-full h-full" />,
      status: getStatus(2),
      timer: step >= 2 && countdown > 0 ? countdown : undefined,
      extra: step >= 2 && (lastRequestId || txHash) ? (
        <div className="space-y-2">
          <div className="space-y-1.5 pl-0.5">
            <TimelineMicroCheck done={submitDone} label="Intent submitted on-chain" />
            <TimelineMicroCheck
              done={revealWindowOpen || revealedDone}
              label={countdown > 0 ? `Reveal opens in ~${countdown}s` : 'Reveal window open'}
            />
            <TimelineMicroCheck done={revealedDone} label="Intent revealed (decrypted)" />
          </div>
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
          {revealTxHash && (
            <IntentProofRow
              label="Reveal tx"
              value={revealTxHash}
              href={getExplorerTxUrl(chainId, revealTxHash)}
            />
          )}
          {intentStatus === 'locked' && lastRequestId != null && !revealedDone && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Decrypt status:</span>
              {isReadyLoading ? (
                <span className="inline-block w-12 h-3 bg-muted rounded animate-pulse" />
              ) : (
                <span className={cn(
                  'font-medium',
                  isReady ? 'text-holme-green-success' : 'text-holme-warning'
                )}>
                  {isReady ? 'Ready for batch' : 'Waiting for reveal tx'}
                </span>
              )}
            </div>
          )}
          <IntentProofRow
            label="Liveness"
            value={addrs.GhostLockLiveness}
            href={getExplorerAddressUrl(chainId, addrs.GhostLockLiveness)}
          />
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
      subtitle: solverSubtitle,
      color: 'hsl(38, 100%, 60%)',
      icon: (
        <div className="flex items-center -space-x-2">
          <SolverIcon number={2} className="w-6 h-8" />
          <SolverIcon number={1} winner={step >= 4} className="w-8 h-10 relative z-10" />
          <SolverIcon number={3} className="w-6 h-8" />
        </div>
      ),
      status: getStatus(4),
    },
    {
      id: 5,
      title: 'Batch Settlement',
      subtitle: settlementSubtitle,
      color: 'hsl(var(--holme-green-success))',
      icon: <CoinStackIcon className="w-full h-full" />,
      status: getStatus(5),
    },
  ]
}
