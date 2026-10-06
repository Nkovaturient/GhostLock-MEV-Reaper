/**
 * useIntentSubmission.ts
 *
 * Full intent lifecycle on Arbitrum Sepolia (tlock ENCRYPT):
 *   1. Encrypt  — drand quicknet tlock (tlock-js)
 *   2. Submit   — Liveness.submitTlockIntentWithBond
 *   3. Lock     — countdown to unlock round
 *   4. Reveal   — revealTlockPlaintext → IntentDecrypted
 *   5. Settle   — SolverBoard / BatchSettlement
 *
 * No server calls needed for the core intent flow.
 * The server detects IntentDecrypted events independently and drives SolverBoard settlement.
 */

import { useCallback, useEffect, useRef } from 'react'
import { useAccount, usePublicClient, useChainId, useWriteContract } from 'wagmi'
import {
  decodeEventLog,
  getAddress,
  parseEventLogs,
  stringToHex,
  type TransactionReceipt,
} from 'viem'

import { useSwapStore } from '../stores/swapStore'
import {
  encryptIntentTlock,
  unlockRoundForTimestamp,
} from '../../lib/tlock-service'
import { GhostLockLivenessABI } from '../ABI/GhostLockLiveness'
import { BatchSettlementABI } from '../ABI/BatchSettlement'
import {
  getAddresses,
  AUCTION,
} from '../contracts/config'
import { useOraclePriceContext } from '../context/OraclePriceContext'
import { computeIntentParamsFromOracle } from '../lib/intentEncoding'
import {
  getTlockSubmitValueWei,
} from '../lib/submitIntentMinValue'
import { getEip1559GasForWallet } from '../lib/eip1559SubmitGas'
import { formatSwapError } from '../lib/swapErrors'
import { requestIdToString, requestIdToBigInt } from '../lib/requestId'
import { intentEpochForUnlockBlocks, readDrandEpochAnchor, UNLOCK_BLOCK_TIME_SEC } from '../lib/intentEpoch'

export function useIntentSubmission() {
  const { address } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const { prices, isLoading: oracleLoading } = useOraclePriceContext()

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const intentStatus = useSwapStore((s) => s.intentStatus)
  const lastRequestId = useSwapStore((s) => s.lastRequestId)
  const submissionOraclePrice = useSwapStore((s) => s.submissionOraclePrice)

  const {
    amountIn, tokenIn, tokenOut, slippageBps,
    setIntentStatus, setStep, setTargetBlock, setUnlockRound, setIntentEpoch, setLastRequestId,
    setTxHash, setCiphertextPreview, setSwapError,
    setSubmissionOraclePrice, setClearingPrice,
    setMevSavings, setWinningBid, clearIntentProgress,
  } = useSwapStore()

  const submit = useCallback(async () => {
    const capturedAmountIn = amountIn
    const capturedTokenIn = tokenIn
    const capturedTokenOut = tokenOut
    const capturedSlippageBps = slippageBps

    if (!address || !capturedAmountIn || parseFloat(capturedAmountIn) <= 0) return
    if (!publicClient) {
      const { message, field } = formatSwapError('Wallet not connected')
      setSwapError(message, field)
      return
    }

    if (oracleLoading || !prices.isValid || prices.exchangeRate == null) {
      const { message, field } = formatSwapError(
        prices.error ?? 'Wait for a valid oracle price before submitting.',
      )
      setSwapError(message, field)
      return
    }

    clearIntentProgress()

    try {
      const addrs = getAddresses(chainId)

      const intentParams = computeIntentParamsFromOracle({
        tokenInSymbol: capturedTokenIn.symbol,
        tokenOutSymbol: capturedTokenOut.symbol,
        amountIn: capturedAmountIn,
        quotePerBase: prices.exchangeRate,
        slippageBps: capturedSlippageBps,
      })

      if (!intentParams) {
        const { message, field } = formatSwapError('Unsupported pair or invalid amount for intent encoding.')
        setSwapError(message, field)
        return
      }

      const { side, baseAmount, limitPrice, marketId } = intentParams

      setIntentStatus('encrypting')
      setStep(1)

      const oracleAtSubmit = prices.exchangeRate
      setSubmissionOraclePrice(oracleAtSubmit)

      const currentBlock = await publicClient.getBlockNumber()
      const delayBlocks = Math.max(1, Math.ceil(AUCTION.REVEAL_DELAY_SEC / UNLOCK_BLOCK_TIME_SEC))
      const unlockBlock = Number(currentBlock) + delayBlocks
      const drandAnchor = await readDrandEpochAnchor(
        publicClient,
        addrs.GhostLockEpochRNG,
      )
      const epoch = intentEpochForUnlockBlocks(delayBlocks, drandAnchor)

      const sideStr: 'buy' | 'sell' = side === 0 ? 'buy' : 'sell'
      const intentPayload = {
        user: address,
        side: sideStr,
        amount: baseAmount,
        limitPrice,
        slippageBps,
        marketId,
        epoch,
        market: `${capturedTokenIn.symbol}/${capturedTokenOut.symbol}`,
      }

      const gasFees = await getEip1559GasForWallet(publicClient)
      const unlockRound = unlockRoundForTimestamp(
        Math.floor(Date.now() / 1000) + AUCTION.REVEAL_DELAY_SEC,
      )
      if (!Number.isFinite(unlockRound) || unlockRound < 1) {
        throw new Error('Could not compute drand unlock round for this intent')
      }
      setUnlockRound(unlockRound)
      setIntentEpoch(epoch)
      const { ciphertext: tlockCiphertext } = await encryptIntentTlock(intentPayload, unlockRound)
      setCiphertextPreview(tlockCiphertext.slice(0, 18) || 'tlock…')

      setIntentStatus('submitting')
      setStep(2)

      const value = await getTlockSubmitValueWei(publicClient, addrs.GhostLockLiveness)
      const tlockBytes = stringToHex(tlockCiphertext)

      await publicClient.simulateContract({
        address: addrs.GhostLockLiveness,
        abi: GhostLockLivenessABI,
        functionName: 'submitTlockIntentWithBond',
        args: [unlockRound, tlockBytes],
        value,
        account: address,
      })

      const txHash = await writeContractAsync({
        address: addrs.GhostLockLiveness,
        abi: GhostLockLivenessABI,
        functionName: 'submitTlockIntentWithBond',
        args: [unlockRound, tlockBytes],
        value,
        ...gasFees,
      })

      setTargetBlock(unlockBlock)

      setTxHash(txHash)
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

      const requestId = await resolveSubmitRequestId(
        receipt,
        addrs.GhostLockLiveness,
        address,
        publicClient,
      )

      setLastRequestId(requestId)
      setIntentStatus('locked')
      setStep(2)

    } catch (err: unknown) {
      const { message, field } = formatSwapError(err)
      console.error('[useIntentSubmission]', message)
      setSwapError(message, field)
      setIntentStatus('error')
    }
  }, [
    address, amountIn, chainId, tokenIn, tokenOut, slippageBps,
    prices, oracleLoading, publicClient, writeContractAsync,
    setIntentStatus, setStep, setTargetBlock, setUnlockRound, setIntentEpoch, setLastRequestId,
    setTxHash, setCiphertextPreview, setSwapError,
    setSubmissionOraclePrice, setClearingPrice, setMevSavings, setWinningBid, clearIntentProgress,
  ])

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current) }, [])

  useEffect(() => {
    if (intentStatus !== 'competing' || lastRequestId == null || !publicClient) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    const addrs = getAddresses(chainId)
    const requestId = lastRequestId
    const oracleQuote = submissionOraclePrice
    const baseAmount = amountIn

    const tick = async () => {
      try {
        const isSettled = await publicClient.readContract({
          address: addrs.BatchSettlement,
          abi: BatchSettlementABI,
          functionName: 'settledIntent',
          args: [requestIdToBigInt(requestId)],
        }) as boolean

        if (!isSettled) return
        const cp = await _fetchClearingPrice(addrs, publicClient)
        setClearingPrice(cp)
        _computeSavings(cp, oracleQuote, baseAmount)
        setIntentStatus('settled')
        setStep(5)
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        console.warn('[intent poll]', msg)
      }
    }

    void tick()
    pollingRef.current = setInterval(() => { void tick() }, 20_000)
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [
    intentStatus,
    lastRequestId,
    publicClient,
    chainId,
    submissionOraclePrice,
    amountIn,
    setClearingPrice,
    setIntentStatus,
    setStep,
    setWinningBid,
    setMevSavings,
  ])

  return { submit }

  async function resolveSubmitRequestId(
    receipt: TransactionReceipt,
    liveness: `0x${string}`,
    user: `0x${string}`,
    client: NonNullable<typeof publicClient>,
  ): Promise<string> {
    if (receipt.status !== 'success') {
      throw new Error(
        'Submit transaction reverted on-chain (receipt status not success). No IntentSubmitted event.',
      )
    }

    const livenessAddr = getAddress(liveness)
    const logsHere = receipt.logs.filter((l) => getAddress(l.address) === livenessAddr)

    const fromEvents = parseEventLogs({
      abi: GhostLockLivenessABI,
      eventName: 'IntentSubmitted',
      logs: logsHere,
    })

    if (fromEvents.length > 0) {
      const rid = fromEvents[fromEvents.length - 1].args.requestId
      const idStr = requestIdToString(rid as bigint)
      // #region agent log
      fetch('http://127.0.0.1:7863/ingest/1c9654de-6579-4cb1-ad7e-6ea69c8510bd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6912e8'},body:JSON.stringify({sessionId:'6912e8',hypothesisId:'H1',location:'useIntentSubmission.ts:resolveSubmitRequestId',message:'requestId from event',data:{idStr,numberLoss:typeof rid==='bigint'?Number(rid):null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return idStr
    }

    const lastId = await client.readContract({
      address: liveness,
      abi: GhostLockLivenessABI,
      functionName: 'lastRequestIdByUser',
      args: [user],
    }) as bigint

    if (lastId === 0n) {
      throw new Error(
        'Could not read requestId: no IntentSubmitted log from GhostLockLiveness and lastRequestIdByUser is zero.',
      )
    }

    return requestIdToString(lastId)
  }

  async function _fetchClearingPrice(
    addrs: ReturnType<typeof getAddresses>,
    client: NonNullable<typeof publicClient>,
  ): Promise<bigint> {
    try {
      const settledEvent = BatchSettlementABI.find(
        (item): item is Extract<(typeof BatchSettlementABI)[number], { type: 'event'; name: 'Settled' }> =>
          item.type === 'event' && item.name === 'Settled',
      )
      if (!settledEvent) return 0n

      const head = await client.getBlockNumber()
      const fromBlock = head > 50_000n ? head - 50_000n : 0n

      const logs = await client.getLogs({
        address: addrs.BatchSettlement,
        event: settledEvent,
        fromBlock,
        toBlock: 'latest',
      })

      if (logs.length) {
        const last = logs[logs.length - 1]
        const d = decodeEventLog({
          abi: BatchSettlementABI,
          eventName: 'Settled',
          data: last.data,
          topics: last.topics as [`0x${string}`, ...`0x${string}`[]],
        })
        return BigInt((d.args as any).clearingPrice ?? 0n)
      }
    } catch (e) {
      console.warn('[fetchClearingPrice]', e)
    }
    return 0n
  }

  function _computeSavings(clearingPriceRaw: bigint, oracleQuotePerBase: number | null, baseAmount: string) {
    const clearingHuman = Number(clearingPriceRaw) / 1e6
    const qty = parseFloat(baseAmount) || 0
    setWinningBid((clearingHuman * qty).toFixed(2))
    if (!oracleQuotePerBase || oracleQuotePerBase <= 0) { setMevSavings('0'); return }
    setMevSavings(Math.max(0, (clearingHuman - oracleQuotePerBase) * qty).toFixed(2))
  }
}
