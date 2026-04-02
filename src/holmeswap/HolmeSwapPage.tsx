// /**
//  * HolmeSwapPage.tsx
//  *
//  * Changes from stub:
//  *   - handleSubmit now delegates to useIntentSubmission (real blockchain flow)
//  *   - Countdown driven by useCountdown(targetBlock) — block-accurate, not setTimeout
//  *   - intentStatus transitions come from on-chain polling, not simulated timeouts
//  *   - Error state handled + displayed
//  *   - express_relays.tsx dependency removed (server-only concern)
//  *   - isSubmitting derived from intentStatus, not local useState
//  */

// import React from 'react'
// import { motion } from 'framer-motion'
// import { useAccount } from 'wagmi'

// import Header           from './Layout/Header'
// import MainContainer    from './Layout/MainContainer'
// import Footer           from './Layout/Footer'
// import SwapCard         from './Swap/SwapCard'
// import ProcessTimeline  from './Timeline/ProcessTimeline'
// import EncryptedIntentCard from './StatusCards/EncryptedIntentCard'
// import MempoolLockCard  from './StatusCards/MempoolLockCard'

// import { holmeswapBg }        from './assets/index'
// import { useSwapStore }        from './stores/swapStore'
// import { useEthUsdcRate }      from '../hooks/usePythPrices'
// import { useIntentSubmission } from './hooks/useIntentSubmission'
// import { useCountdown }        from './hooks/useCountdown'

// const containerVariants = {
//   hidden:  { opacity: 0 },
//   visible: {
//     opacity: 1,
//     transition: { staggerChildren: 0.08, delayChildren: 0.15 },
//   },
// }

// export default function HolmeSwapPage() {
//   const { isConnected }  = useAccount()
//   const { submit }       = useIntentSubmission()

//   const intentStatus  = useSwapStore((s) => s.intentStatus)
//   const targetBlock   = useSwapStore((s) => s.targetBlock)
//   const error         = useSwapStore((s) => s.error)
//   const tokenIn       = useSwapStore((s) => s.tokenIn)
//   const tokenOut      = useSwapStore((s) => s.tokenOut)
//   const setCountdown  = useSwapStore((s) => s.setCountdown)

//   // Block-accurate countdown — replaces the fake setInterval
//   const secondsLeft = useCountdown(targetBlock || null)
//   React.useEffect(() => {
//     setCountdown(secondsLeft)
//   }, [secondsLeft, setCountdown])

//   // Submitting = any in-flight state before settled/error
//   const isSubmitting = ['encrypting', 'submitting', 'locked', 'ordering', 'competing'].includes(intentStatus)

//   // ─── Price display ─────────────────────────────────────────────────────────

//   const { rate: ethUsdcRate, ethPrice, isLoading: pricesLoading } = useEthUsdcRate()

//   const fmtRate = (n: number | null | undefined) =>
//     n != null
//       ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
//       : '—'

//   const estimatedRate = ethUsdcRate != null
//     ? `1 ${tokenIn.symbol || 'ETH'} ≈ ${fmtRate(ethUsdcRate)} ${tokenOut.symbol || 'USDC'}`
//     : pricesLoading ? 'Loading price...' : `1 ${tokenIn.symbol} ≈ — ${tokenOut.symbol}`

//   const actualPriceUsd = ethPrice != null ? `$${fmtRate(ethPrice)}` : '$—'
//   const expectedMin    = ethPrice != null ? `> $${fmtRate(ethPrice * 1.01)}` : '> $—'

//   // ─── Submit handler ────────────────────────────────────────────────────────

//   const handleSubmit = React.useCallback(async () => {
//     if (!isConnected) return   // SwapCard shows "Connect Wallet" button in this case
//     await submit()
//   }, [isConnected, submit])

//   return (
//     <div
//       className="min-h-screen relative overflow-hidden font-sans"
//       style={{
//         backgroundImage:    `url(${holmeswapBg})`,
//         backgroundSize:     'cover',
//         backgroundPosition: 'center',
//         backgroundAttachment: 'fixed',
//       }}
//     >
//       {/* Background decorations */}
//       <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
//         <div className="holme-blob holme-blob-1" />
//         <div className="holme-blob holme-blob-2" />
//         <div className="holme-blob holme-blob-3" />
//         <div className="holme-cloud holme-cloud-1" />
//         <div className="holme-cloud holme-cloud-2" />
//         <div className="holme-cloud holme-cloud-3" />
//         <div className="holme-cube holme-cube-1" />
//         <div className="holme-cube holme-cube-2" />
//         <div className="holme-ghost-silhouette holme-ghost-1" />
//         <div className="holme-ghost-silhouette holme-ghost-2" />
//       </div>

//       <motion.div
//         className="relative z-10 flex flex-col min-h-screen"
//         variants={containerVariants}
//         initial="hidden"
//         animate="visible"
//       >
//         <Header />

//         <div className="flex-1">
//           <MainContainer
//             left={
//               <>
//                 <SwapCard
//                   balanceIn="1.234"
//                   estimatedRate={estimatedRate}
//                   expectedMin={expectedMin}
//                   actualPrice={actualPriceUsd}
//                   onSubmit={handleSubmit}
//                   isSubmitting={isSubmitting}
//                   isConnected={isConnected}
//                 />
//                 {/* Inline error toast */}
//                 {error && (
//                   <motion.div
//                     initial={{ opacity: 0, y: 8 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     className="mt-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm"
//                     role="alert"
//                   >
//                     {error}
//                   </motion.div>
//                 )}
//               </>
//             }
//             right={<ProcessTimeline />}
//             bottom={
//               <>
//                 <EncryptedIntentCard />
//                 <MempoolLockCard />
//               </>
//             }
//           />
//         </div>

//         <Footer />
//       </motion.div>
//     </div>
//   )
// }


import React from 'react'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import Header              from './Layout/Header'
import MainContainer       from './Layout/MainContainer'
import Footer              from './Layout/Footer'
import SwapCard            from './Swap/SwapCard'
import ProcessTimeline     from './Timeline/ProcessTimeline'
import EncryptedIntentCard from './StatusCards/EncryptedIntentCard'
import MempoolLockCard     from './StatusCards/MempoolLockCard'
import { holmeswapBg }        from './assets/index'
import { useSwapStore }        from './stores/swapStore'
import { useIntentSubmission } from './hooks/useIntentSubmission'
import { useCountdown }        from './hooks/useCountdown'
import { useSwapPrices }       from '../hooks/useSwapPrices'

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
  const slippageBps     = useSwapStore(s => s.slippageBps)
  const setCountdown    = useSwapStore(s => s.setCountdown)
  const setAmountOut    = useSwapStore(s => s.setAmountOut)

  const secondsLeft = useCountdown(targetBlock || null)
  React.useEffect(() => { setCountdown(secondsLeft) }, [secondsLeft, setCountdown])

  const isSubmitting = ['encrypting','submitting','locked','ordering','competing'].includes(intentStatus)

  const {
    amountOut,
    amountOutMin,
    rate,
    usdValueIn,
    usdValueOut,
    isLoading: pricesLoading,
    priceError,
    balanceExceeded,
    balance,
    isSameToken,
    baseSymbol,
    quoteSymbol,
  } = useSwapPrices()

  React.useEffect(() => {
    if (!isSameToken) setAmountOut(amountOut)
  }, [amountOut, isSameToken, setAmountOut])

  const fmt2 = (n: number | null | undefined) =>
    n != null ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—'

  const estimatedRate = priceError
    ? priceError
    : isSameToken
    ? `1 ${baseSymbol} = 1 ${quoteSymbol}`
    : rate > 0
    ? `1 ${baseSymbol} ≈ ${fmt2(rate)} ${quoteSymbol}`
    : pricesLoading ? 'Fetching live price…' : `1 ${baseSymbol} ≈ — ${quoteSymbol}`

  const expectedMin = amountOutMin
    ? `≥ ${parseFloat(amountOutMin).toFixed(4)} ${quoteSymbol}`
    : '—'

  const actualPriceUsd = usdValueIn != null ? `≈ $${fmt2(usdValueIn)}` : '$—'

  const handleSubmit = React.useCallback(async () => {
    if (!isConnected) return
    await submit()
  }, [isConnected, submit])

  return (
    <div className="min-h-screen relative overflow-hidden font-sans"
      style={{ backgroundImage: `url(${holmeswapBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
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
                estimatedRate={estimatedRate}
                expectedMin={expectedMin}
                actualPrice={actualPriceUsd}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                isConnected={isConnected}
                balanceExceeded={balanceExceeded}
                balance={balance}
                isLoading={pricesLoading}
                usdValueIn={usdValueIn}
                usdValueOut={usdValueOut}
              />
              {error && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm" role="alert">
                  {error}
                </motion.div>
              )}
            </>}
            right={<ProcessTimeline />}
            bottom={<><EncryptedIntentCard /><MempoolLockCard /></>}
          />
        </div>
        <Footer />
      </motion.div>
    </div>
  )
}