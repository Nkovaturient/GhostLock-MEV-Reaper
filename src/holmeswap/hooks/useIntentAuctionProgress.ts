import { useEffect } from 'react'
import { useReadContract } from 'wagmi'
import { useSwapStore } from '../stores/swapStore'
import { useNetworkConfig } from '../../hooks/useNetworkConfig'
import { EPOCH_RNG_ABI } from '../../lib/abis'

const EMPTY_SEED =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const

export type SolverLastBatch = {
  batchId: string
  method: string
  clearingPrice: string
  ref: string | null
  intentCount: number
  buyBase: string
  sellBase: string
  surplus: string
  timestamp: number
}

export type SolverStatusResponse = {
  unfilledEpochs?: number[]
  lastBatch?: SolverLastBatch | null
  watcherCursor?: number
}

/**
 * After reveal, leave ordering once EpochRNG has a seed.
 * The server solver writes that seed. The page only reads it.
 */
export function useIntentAuctionProgress() {
  const intentStatus = useSwapStore((s) => s.intentStatus)
  const effectiveEpoch = useSwapStore((s) => s.intentEpoch)
  const setIntentStatus = useSwapStore((s) => s.setIntentStatus)
  const setStep = useSwapStore((s) => s.setStep)
  const { EPOCH_RNG_ADDRESS, isSupported, chainId } = useNetworkConfig()

  const watching = intentStatus === 'ordering' && effectiveEpoch != null

  const { data: epochSeed } = useReadContract({
    chainId: isSupported && chainId ? Number(chainId) : undefined,
    abi: EPOCH_RNG_ABI,
    address: isSupported && EPOCH_RNG_ADDRESS ? (EPOCH_RNG_ADDRESS as `0x${string}`) : undefined,
    functionName: 'epochSeed',
    args: intentStatus === 'ordering' && effectiveEpoch != null ? [BigInt(effectiveEpoch)] : undefined,
    query: {
      enabled: watching && !!EPOCH_RNG_ADDRESS,
      refetchInterval: watching ? 15_000 : false,
      staleTime: 10_000,
      retry: 0,
      refetchIntervalInBackground: false,
    },
  })

  useEffect(() => {
    if (!watching) return
    if (!epochSeed || epochSeed === EMPTY_SEED) return
    setIntentStatus('competing')
    setStep(4)
  }, [watching, epochSeed, setIntentStatus, setStep])

  useEffect(() => {
    if (intentStatus !== 'competing' || effectiveEpoch == null) return
    const base = (import.meta.env.VITE_SOLVER_API_URL as string | undefined)?.replace(/\/$/, '')
      || 'http://localhost:4800/api/auctions'
    let cancelled = false

    const tick = async () => {
      try {
        const res = await fetch(`${base}/solver/status`)
        if (!res.ok) return
        const body = await res.json() as SolverStatusResponse
        if (cancelled) return
        if (body.unfilledEpochs?.some((epoch) => Number(epoch) === effectiveEpoch)) {
          setIntentStatus('unfilled')
          setStep(4)
        }
      } catch {
        // Solver status is optional. Settlement still follows the chain read.
      }
    }

    void tick()
    const id = setInterval(() => { void tick() }, 15_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [intentStatus, effectiveEpoch, setIntentStatus, setStep])
}
