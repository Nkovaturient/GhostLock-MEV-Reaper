/**
 * Single place for post-submit lock behavior: advance when GhostLock reports isReady,
 * and recover via Blocklock key + forceReveal inside [revealDeadline, slashDeadline).
 */
import { useEffect, useRef } from 'react'
import {
  useAccount,
  useBlockNumber,
  useChainId,
  usePublicClient,
  useReadContract,
  useWalletClient,
  useWriteContract,
} from 'wagmi'
import { BrowserProvider } from 'ethers'
import { toHex } from 'viem'

import { useSwapStore } from '../stores/swapStore'
import { GhostLockLivenessABI } from '../ABI/GhostLockLiveness'
import { getAddresses } from '../contracts/config'
import { BlocklockService } from '../../lib/blocklock-service'
import { getEip1559GasForWallet } from '../lib/eip1559SubmitGas'

const IS_READY_REFETCH_MS = 10_000
const RECOVERY_POLL_MS = 20_000

async function walletClientToSigner(wc: {
  transport: unknown
  chain?: { id?: number; name?: string }
  account?: { address: `0x${string}` }
}) {
  const provider = new BrowserProvider(wc.transport as any, {
    chainId: wc.chain?.id ?? 421614,
    name: wc.chain?.name ?? 'Arbitrum Sepolia',
  })
  return provider.getSigner(wc.account?.address)
}

function intentDeadlines(data: unknown): { reveal: bigint; slash: bigint } | null {
  if (data == null || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  if ('revealDeadline' in o && 'slashDeadline' in o) {
    return {
      reveal: BigInt(o.revealDeadline as bigint),
      slash: BigInt(o.slashDeadline as bigint),
    }
  }
  if (Array.isArray(data) && data.length > 9) {
    return {
      reveal: BigInt(data[8] as bigint),
      slash: BigInt(data[9] as bigint),
    }
  }
  return null
}

export function useIntentLivenessFollowup() {
  const chainId = useChainId()
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { writeContractAsync } = useWriteContract()

  const lastRequestId = useSwapStore((s) => s.lastRequestId)
  const intentStatus = useSwapStore((s) => s.intentStatus)
  const setIntentStatus = useSwapStore((s) => s.setIntentStatus)
  const setStep = useSwapStore((s) => s.setStep)
  const setRevealTxHash = useSwapStore((s) => s.setRevealTxHash)

  const addrs = getAddresses(chainId)
  const lockedFollowupEnabled =
    lastRequestId != null &&
    intentStatus === 'locked' &&
    Boolean(addrs.GhostLockLiveness)

  const { data: isReady } = useReadContract({
    address: addrs.GhostLockLiveness,
    abi: GhostLockLivenessABI,
    functionName: 'isReady',
    args:
      lockedFollowupEnabled && lastRequestId != null
        ? [BigInt(lastRequestId)]
        : undefined,
    query: {
      enabled: lockedFollowupEnabled,
      refetchInterval: IS_READY_REFETCH_MS,
      staleTime: IS_READY_REFETCH_MS / 2,
    },
  })

  const recoveryReadsEnabled =
    lockedFollowupEnabled && !(isReady ?? false)

  const { data: intentRow } = useReadContract({
    address: addrs.GhostLockLiveness,
    abi: GhostLockLivenessABI,
    functionName: 'intents',
    args:
      recoveryReadsEnabled && lastRequestId != null
        ? [BigInt(lastRequestId)]
        : undefined,
    query: {
      enabled: recoveryReadsEnabled,
      refetchInterval: RECOVERY_POLL_MS,
      staleTime: RECOVERY_POLL_MS / 2,
    },
  })

  const { data: blockNumber } = useBlockNumber({
    chainId,
    watch: true,
  })

  const forceRevealInFlight = useRef(false)
  const forceRevealDoneRef = useRef(false)
  const prevRequestIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (lastRequestId !== prevRequestIdRef.current) {
      prevRequestIdRef.current = lastRequestId
      forceRevealInFlight.current = false
      forceRevealDoneRef.current = false
    }
  }, [lastRequestId])

  useEffect(() => {
    if (!lockedFollowupEnabled || !isReady || intentStatus !== 'locked') return
    setIntentStatus('ordering')
    setStep(4)
    const t = setTimeout(() => setIntentStatus('competing'), 2_000)
    return () => clearTimeout(t)
  }, [
    lockedFollowupEnabled,
    isReady,
    intentStatus,
    setIntentStatus,
    setStep,
  ])

  useEffect(() => {
    if (
      !recoveryReadsEnabled ||
      !walletClient ||
      !publicClient ||
      !address ||
      lastRequestId == null
    ) {
      return
    }

    const deadlines = intentDeadlines(intentRow)
    const bn = blockNumber
    if (!deadlines || bn == null) return
    if (bn < deadlines.reveal || bn >= deadlines.slash) return

    let cancelled = false

    const tick = async () => {
      if (cancelled || forceRevealDoneRef.current || forceRevealInFlight.current) return
      try {
        const signer = await walletClientToSigner(walletClient as any)
        const service = new BlocklockService(signer, chainId)
        const key = await service.fetchDecryptionKeyBytes(BigInt(lastRequestId))
        if (cancelled || !key?.length) return

        forceRevealInFlight.current = true
        const keyHex = toHex(key)
        const gasFees = await getEip1559GasForWallet(publicClient)

        await publicClient.simulateContract({
          address: addrs.GhostLockLiveness,
          abi: GhostLockLivenessABI,
          functionName: 'forceReveal',
          args: [BigInt(lastRequestId), keyHex],
          account: address,
        })

        const hash = await writeContractAsync({
          address: addrs.GhostLockLiveness,
          abi: GhostLockLivenessABI,
          functionName: 'forceReveal',
          args: [BigInt(lastRequestId), keyHex],
          ...gasFees,
        })
        forceRevealDoneRef.current = true
        setRevealTxHash(hash)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        console.warn('[useIntentLivenessFollowup] forceReveal', msg)
      } finally {
        forceRevealInFlight.current = false
      }
    }

    const id = setInterval(tick, RECOVERY_POLL_MS)
    void tick()
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [
    recoveryReadsEnabled,
    walletClient,
    publicClient,
    address,
    lastRequestId,
    chainId,
    intentRow,
    blockNumber,
    addrs.GhostLockLiveness,
    writeContractAsync,
    setRevealTxHash,
  ])
}
