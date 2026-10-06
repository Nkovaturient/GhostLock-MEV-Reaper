/**
 * Post-submit lock behavior: advance when GhostLock reports isReady,
 * and reveal via tlock decrypt + revealTlockPlaintext after unlock round.
 */
import { useEffect, useRef } from 'react'
import {
  useAccount,
  useChainId,
  usePublicClient,
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

const REVEAL_RETRY_MS = [15_000, 30_000, 60_000]

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

  const unlockRound = useSwapStore((s) => s.unlockRound)
  const addrs = getAddresses(chainId)
  const liveness = addrs.GhostLockLiveness
  const locked =
    lastRequestId != null &&
    intentStatus === 'locked' &&
    Boolean(liveness)

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
    if (
      !locked ||
      !walletClient ||
      !publicClient ||
      !address ||
      lastRequestId == null ||
      !liveness ||
      unlockRound == null ||
      unlockRound <= 0
    ) {
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let attempts = 0

    const schedule = (delayMs: number) => {
      if (cancelled) return
      timer = setTimeout(() => { void run() }, delayMs)
    }

    const run = async () => {
      if (cancelled || tlockRevealDoneRef.current || tlockRevealInFlight.current) return
      const waitMs = unlockTimeForRound(unlockRound) * 1000 - Date.now()
      if (waitMs > 250) {
        schedule(waitMs)
        return
      }

      attempts += 1
      tlockRevealInFlight.current = true
      try {
        const row = await publicClient.readContract({
          address: liveness,
          abi: GhostLockLivenessABI,
          functionName: 'intents',
          args: [requestIdToBigInt(lastRequestId)],
        })
        const meta = intentRowMeta(row)
        if (!meta?.isTlock || !meta.tlockCiphertext) {
          throw new Error('Intent has no tlock ciphertext yet')
        }

        const plain = await decryptTlockCiphertextRaw(meta.tlockCiphertext)
        const plaintextHex = toHex(plain)
        const gasFees = await getEip1559GasForWallet(publicClient)

        await publicClient.simulateContract({
          address: liveness,
          abi: GhostLockLivenessABI,
          functionName: 'revealTlockPlaintext',
          args: [requestIdToBigInt(lastRequestId), plaintextHex],
          account: address,
        })

        const hash = await writeContractAsync({
          address: liveness,
          abi: GhostLockLivenessABI,
          functionName: 'revealTlockPlaintext',
          args: [requestIdToBigInt(lastRequestId), plaintextHex],
          ...gasFees,
        })

        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 90_000,
          pollingInterval: 4_000,
        })
        if (receipt.status !== 'success') {
          throw new Error('Reveal transaction reverted')
        }

        tlockRevealDoneRef.current = true
        setRevealTxHash(hash)
        setIntentStatus('ordering')
        setStep(3)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        console.warn('[useIntentLivenessFollowup] revealTlockPlaintext', msg)
        const delay = REVEAL_RETRY_MS[attempts - 1]
        if (delay != null) schedule(delay)
      } finally {
        tlockRevealInFlight.current = false
      }
    }

    void run()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [
    locked,
    walletClient,
    publicClient,
    address,
    lastRequestId,
    liveness,
    unlockRound,
    writeContractAsync,
    setRevealTxHash,
    setIntentStatus,
    setStep,
  ])
}
