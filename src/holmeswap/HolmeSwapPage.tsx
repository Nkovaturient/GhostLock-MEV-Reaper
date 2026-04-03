import React from 'react'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import Header              from './Layout/Header'
import MainContainer       from './Layout/MainContainer'
import Footer              from './Layout/Footer'
import SwapCard            from './Swap/SwapCard'
import ProcessTimeline     from './Timeline/ProcessTimeline'
import { holmeswapBg }        from './assets/index'
import { useSwapStore }        from './stores/swapStore'
import { useIntentSubmission } from './hooks/useIntentSubmission'
import { useCountdown }        from './hooks/useCountdown'
import { useTokenBalance }     from './hooks/useTokenBalance'

const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
}

export default function HolmeSwapPage() {
  const { isConnected } = useAccount()
  const { submit }      = useIntentSubmission()
  const intentStatus    = useSwapStore(s => s.intentStatus)
  const targetBlock     = useSwapStore(s => s.targetBlock)
  const error           = useSwapStore(s => s.error)
  const tokenIn         = useSwapStore(s => s.tokenIn)
  const setCountdown    = useSwapStore(s => s.setCountdown)

  const { formattedBalance, isExceeded } = useTokenBalance(tokenIn.symbol, tokenIn.decimals)

  const secondsLeft = useCountdown(targetBlock || null)
  React.useEffect(() => { setCountdown(secondsLeft) }, [secondsLeft, setCountdown])

  const isSubmitting = ['encrypting','submitting','locked','ordering','competing'].includes(intentStatus)

  const handleSubmit = React.useCallback(async () => {
    if (!isConnected) return
    await submit()
  }, [isConnected, submit])

  return (
    <div className="min-h-screen relative overflow-hidden font-sans"
      style={{ backgroundImage: `url(${holmeswapBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="holme-blob holme-blob-1" /><div className="holme-blob holme-blob-2" /><div className="holme-blob holme-blob-3" />
        <div className="holme-cloud holme-cloud-1" /><div className="holme-cloud holme-cloud-2" /><div className="holme-cloud holme-cloud-3" />
        <div className="holme-cube holme-cube-1" /><div className="holme-cube holme-cube-2" />
        <div className="holme-ghost-silhouette holme-ghost-1" /><div className="holme-ghost-silhouette holme-ghost-2" />
      </div>
      <motion.div className="relative z-10 flex flex-col min-h-screen" variants={containerVariants} initial="hidden" animate="visible">
        <Header />
        <div className="flex-1">
          <MainContainer
            left={<>
              <SwapCard
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                isConnected={isConnected}
                balanceExceeded={isExceeded}
                balance={formattedBalance}
              />
              {error && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm" role="alert"
                >
                  {error}
                </motion.div>
              )}
            </>}
            right={<ProcessTimeline />}
            bottom={null}
          />
        </div>
        <Footer />
      </motion.div>
    </div>
  )
}