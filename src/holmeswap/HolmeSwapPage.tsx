import React from 'react'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import Header              from './Layout/Header'
import MainContainer       from './Layout/MainContainer'
import Footer              from './Layout/Footer'
import SwapArena           from './Swap/SwapArena'
import BehindTheScenesPanel from './Timeline/BehindTheScenesPanel'
import { OraclePriceProvider } from './context/OraclePriceContext'
import { holmeswapBg }        from './assets/index'
import { useSwapStore }        from './stores/swapStore'
import { useIntentSubmission } from './hooks/useIntentSubmission'
import { useIntentDecryptedWatch } from './hooks/useIntentDecryptedWatch'
import { useIntentLivenessFollowup } from './hooks/useIntentLivenessFollowup'
import { useRevealCountdown } from './hooks/useRevealCountdown'
import { useTokenBalance }     from './hooks/useTokenBalance'

const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
}

const ACTIVE_INTENT_STATUSES = new Set(['locked', 'ordering', 'competing'])

function HolmeSwapContent() {
  const { isConnected } = useAccount()
  const { submit }      = useIntentSubmission()
  useIntentDecryptedWatch()
  useIntentLivenessFollowup()
  const intentStatus    = useSwapStore(s => s.intentStatus)
  const targetBlock     = useSwapStore(s => s.targetBlock)
  const unlockRound     = useSwapStore(s => s.unlockRound)
  const tokenIn         = useSwapStore(s => s.tokenIn)
  const amountIn        = useSwapStore(s => s.amountIn)
  const setCountdown    = useSwapStore(s => s.setCountdown)

  const { formattedBalance, isExceeded } = useTokenBalance(
    tokenIn.symbol,
    tokenIn.decimals,
    true,
    amountIn,
  )

  const countdownActive =
    ACTIVE_INTENT_STATUSES.has(intentStatus) &&
    (unlockRound != null && unlockRound > 0)
  const secondsLeft = useRevealCountdown(unlockRound, countdownActive)
  React.useEffect(() => { setCountdown(secondsLeft) }, [secondsLeft, setCountdown])

  const isSubmitting = ['encrypting','submitting','locked','ordering','competing'].includes(intentStatus)

  const handleSubmit = React.useCallback(async () => {
    if (!isConnected) return
    await submit()
  }, [isConnected, submit])

  return (
    <>
      <Header />
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden holmeswap-scroll pb-[3.1rem]">
        <MainContainer>
          <SwapArena
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isConnected={isConnected}
            balanceExceeded={isExceeded}
            balance={formattedBalance}
          />
        </MainContainer>
      </div>
      <Footer />
      <BehindTheScenesPanel />
    </>
  )
}

export default function HolmeSwapPage() {
  React.useEffect(() => {
    const cls = 'holmeswap-active'
    document.documentElement.classList.add(cls)
    document.body.classList.add(cls)
    return () => {
      document.documentElement.classList.remove(cls)
      document.body.classList.remove(cls)
    }
  }, [])

  return (
    <div
      className="holmeswap-page relative flex h-dvh max-h-dvh flex-col overflow-hidden font-sans"
      style={{ backgroundImage: `url(${holmeswapBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="holme-blob holme-blob-1" /><div className="holme-blob holme-blob-2" /><div className="holme-blob holme-blob-3" />
        <div className="holme-cloud holme-cloud-1" /><div className="holme-cloud holme-cloud-2" /><div className="holme-cloud holme-cloud-3" />
        <div className="holme-cube holme-cube-1" /><div className="holme-cube holme-cube-2" />
        <div className="holme-ghost-silhouette holme-ghost-1" /><div className="holme-ghost-silhouette holme-ghost-2" />
      </div>
      <OraclePriceProvider>
        <motion.div
          className="relative z-10 flex h-full min-h-0 flex-col"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <HolmeSwapContent />
        </motion.div>
      </OraclePriceProvider>
    </div>
  )
}
