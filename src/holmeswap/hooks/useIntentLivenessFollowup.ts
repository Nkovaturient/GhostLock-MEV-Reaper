/**
 * Post-submit lock behavior: advance when GhostLock reports isReady,
 * and reveal via tlock decrypt + revealTlockPlaintext after unlock round.
 */
import { useEffect, useRef } from 'react'
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useWalletClient,
  useWriteContract,
} from 'wagmi'
import { hexToString, toHex } from 'viem'

import { useSwapStore } from '../stores/swapStore'
import { GhostLockLivenessABI } from '../ABI/GhostLockLiveness'
import { getAddresses } from '../contracts/config'
import {
  decryptTlockCiphertextRaw,
  unlockTimeForRound,
} from '../../lib/tlock-service'
import { getEip1559GasForWallet } from '../lib/eip1559SubmitGas'
import { requestIdToBigInt } from '../lib/requestId'

const IS_READY_REFETCH_MS = 15_000
const RECOVERY_POLL_MS = 30_000

type IntentRowMeta = {
  isTlock: boolean
  unlockRound: number
  tlockCiphertext: string | null
}

function intentRowMeta(data: unknown): IntentRowMeta | null {
  if (data == null || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  if ('revealDeadline' in o && 'slashDeadline' in o) {
    const tlockHex = o.tlockCiphertext as `0x${string}` | undefined
    return {
      isTlock: Boolean(o.isTlock),
      unlockRound: Number(o.unlockRound ?? 0),
      tlockCiphertext: tlockHex && tlockHex !== '0x' ? hexToString(tlockHex) : null,
    }
  }
  if (Array.isArray(data) && data.length > 12) {
    const tlockHex = data[4] as `0x${string}` | undefined
    return {
      isTlock: Boolean(data[5]),
      unlockRound: Number(data[6] ?? 0),
      tlockCiphertext: tlockHex && tlockHex !== '0x' ? hexToString(tlockHex) : null,
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
        ? [requestIdToBigInt(lastRequestId)]
        : undefined,
    query: {
      enabled: lockedFollowupEnabled,
      refetchInterval: IS_READY_REFETCH_MS,
      refetchIntervalInBackground: false,
      staleTime: IS_READY_REFETCH_MS,
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
        ? [requestIdToBigInt(lastRequestId)]
        : undefined,
    query: {
      enabled: recoveryReadsEnabled,
      refetchInterval: RECOVERY_POLL_MS,
      refetchIntervalInBackground: false,
      staleTime: RECOVERY_POLL_MS,
    },
  })

  const tlockRevealInFlight = useRef(false)
  const tlockRevealDoneRef = useRef(false)
  const prevRequestIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (lastRequestId !== prevRequestIdRef.current) {
      prevRequestIdRef.current = lastRequestId
      tlockRevealInFlight.current = false
      tlockRevealDoneRef.current = false
    }
  }, [lastRequestId])

  useEffect(() => {
    if (!lockedFollowupEnabled || !isReady || intentStatus !== 'locked') return
    setIntentStatus('ordering')
    setStep(3)
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

    const meta = intentRowMeta(intentRow)
    if (!meta?.isTlock) return

    let cancelled = false

    const tickTlock = async () => {
      if (cancelled || tlockRevealDoneRef.current || tlockRevealInFlight.current) return
      const unlockTs = unlockTimeForRound(meta.unlockRound)
      if (Math.floor(Date.now() / 1000) < unlockTs) return
      if (!meta.tlockCiphertext) return

      try {
        tlockRevealInFlight.current = true
        const plain = await decryptTlockCiphertextRaw(meta.tlockCiphertext)
        const plaintextHex = toHex(plain)
        const gasFees = await getEip1559GasForWallet(publicClient)

        await publicClient.simulateContract({
          address: addrs.GhostLockLiveness,
          abi: GhostLockLivenessABI,
          functionName: 'revealTlockPlaintext',
          args: [requestIdToBigInt(lastRequestId), plaintextHex],
          account: address,
        })

        const hash = await writeContractAsync({
          address: addrs.GhostLockLiveness,
          abi: GhostLockLivenessABI,
          functionName: 'revealTlockPlaintext',
          args: [requestIdToBigInt(lastRequestId), plaintextHex],
          ...gasFees,
        })
        tlockRevealDoneRef.current = true
        setRevealTxHash(hash)
        // #region agent log
        fetch('http://127.0.0.1:7863/ingest/1c9654de-6579-4cb1-ad7e-6ea69c8510bd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6912e8'},body:JSON.stringify({sessionId:'6912e8',hypothesisId:'H2',location:'useIntentLivenessFollowup.ts:reveal',message:'revealTlockPlaintext sent',data:{requestId:lastRequestId,hash},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        console.warn('[useIntentLivenessFollowup] revealTlockPlaintext', msg)
      } finally {
        tlockRevealInFlight.current = false
      }
    }

    const id = setInterval(() => { void tickTlock() }, RECOVERY_POLL_MS)
    void tickTlock()
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
    intentRow,
    addrs.GhostLockLiveness,
    writeContractAsync,
    setRevealTxHash,
  ])
}
