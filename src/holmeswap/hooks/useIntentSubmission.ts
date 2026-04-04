/**
 * useIntentSubmission.ts
 *
 * Full 5-step intent lifecycle using GhostLockLiveness on Arbitrum Sepolia:
 *   1. Encrypt  — dcipher blocklock threshold encryption (Layer 1)
 *   2. Submit   — Liveness.submitIntentWithBond via wagmi writeContract
 *   3. Lock     — countdown to unlockBlock via useCountdown
 *   4. Order   — useIntentDecryptedWatch / useIntentLivenessFollowup (isReady + optional forceReveal)
 *   5. Settle   — poll BatchSettlement.settledIntent (Layer 3 — SolverBoard flow)
 *
 * No server calls needed for the core intent flow.
 * The server detects IntentDecrypted events independently and drives SolverBoard settlement.
 */

import { useCallback, useEffect, useRef } from 'react'
import { useAccount, usePublicClient, useWalletClient, useChainId, useWriteContract } from 'wagmi'
import {
  decodeEventLog,
  getAddress,
  parseEventLogs,
  type TransactionReceipt,
} from 'viem'
import { BrowserProvider } from 'ethers'

import { useSwapStore } from '../stores/swapStore'
import { BlocklockService } from '../../lib/blocklock-service'
import { GhostLockLivenessABI } from '../ABI/GhostLockLiveness'
import { BatchSettlementABI } from '../ABI/BatchSettlement'
import {
  getAddresses,
  AUCTION,
} from '../contracts/config'
import { useOraclePrice } from './useOraclePrice'
import { computeIntentParamsFromOracle } from '../lib/intentEncoding'
import { getSubmitIntentMinValueWei, getEffectiveCallbackGasLimit } from '../lib/submitIntentMinValue'
import { getEip1559GasForWallet } from '../lib/eip1559SubmitGas'

async function walletClientToSigner(wc: any) {
  const provider = new BrowserProvider(wc.transport as any, {
    chainId: wc.chain?.id ?? 421614,
    name: wc.chain?.name ?? 'Arbitrum Sepolia',
  })
  return provider.getSigner(wc.account?.address)
}

export function useIntentSubmission() {
  const { address } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { writeContractAsync } = useWriteContract()

  const { prices, isLoading: oracleLoading } = useOraclePrice()

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const {
    amountIn, tokenIn, tokenOut, slippageBps,
    setIntentStatus, setStep, setTargetBlock, setLastRequestId,
    setTxHash, setCiphertextPreview, setError,
    setSubmissionOraclePrice, setClearingPrice,
    setMevSavings, setWinningBid, reset,
  } = useSwapStore()

  const submit = useCallback(async () => {
    if (!address || !amountIn || parseFloat(amountIn) <= 0) return
    if (!publicClient || !walletClient) { setError('Wallet not connected'); return }

    if (oracleLoading || !prices.isValid || prices.exchangeRate == null) {
      setError(prices.error ?? 'Wait for a valid oracle price before submitting.')
      return
    }

    reset()

    try {
      const addrs = getAddresses(chainId)

      const intentParams = computeIntentParamsFromOracle({
        tokenInSymbol: tokenIn.symbol,
        tokenOutSymbol: tokenOut.symbol,
        amountIn,
        quotePerBase: prices.exchangeRate,
        slippageBps,
      })

      if (!intentParams) {
        setError('Unsupported pair or invalid amount for intent encoding.')
        return
      }

      const { side, baseAmount, limitPrice, marketId } = intentParams

      setIntentStatus('encrypting')
      setStep(1)

      const oracleAtSubmit = prices.exchangeRate
      setSubmissionOraclePrice(oracleAtSubmit)

      const currentBlock = await publicClient.getBlockNumber()
      const unlockBlock = Number(currentBlock) + AUCTION.EPOCH_DURATION_BLOCKS
      const epoch = Math.floor(unlockBlock / AUCTION.EPOCH_DURATION_BLOCKS)

      const signer = await walletClientToSigner(walletClient)
      const service = new BlocklockService(signer, chainId)

      const sideStr: 'buy' | 'sell' = side === 0 ? 'buy' : 'sell'

      const ciphertext = await service.encryptIntent({
        user: address,
        side: sideStr,
        amount: baseAmount,
        limitPrice,
        slippageBps,
        marketId,
        epoch,
        market: `${tokenIn.symbol}/${tokenOut.symbol}`,
      }, unlockBlock)

      const condition = BlocklockService.createCondition(unlockBlock)
      const ctHex = typeof ciphertext.v === 'string' ? ciphertext.v : ''
      setCiphertextPreview(ctHex.slice(0, 18) || '0xciphertext…')

      setIntentStatus('submitting')
      setStep(2)

      const callbackGasLimit = await getEffectiveCallbackGasLimit(
        publicClient,
        addrs.GhostLockLiveness,
        AUCTION.CALLBACK_GAS_LIMIT,
      )

      const { minValue } = await getSubmitIntentMinValueWei(
        publicClient,
        addrs.GhostLockLiveness,
        callbackGasLimit,
      )
      const value = minValue + (minValue * 5n) / 100n + 100_000n

      const gasFees = await getEip1559GasForWallet(publicClient)

      const ciphertextArg = {
        u: {
          x: ciphertext.u.x as [bigint, bigint],
          y: ciphertext.u.y as [bigint, bigint],
        },
        v: ciphertext.v,
        w: ciphertext.w,
      }

      await publicClient.simulateContract({
        address: addrs.GhostLockLiveness,
        abi: GhostLockLivenessABI,
        functionName: 'submitIntentWithBond',
        args: [callbackGasLimit, unlockBlock, condition as `0x${string}`, ciphertextArg],
        value,
        account: address,
      })

      const txHash = await writeContractAsync({
        address: addrs.GhostLockLiveness,
        abi: GhostLockLivenessABI,
        functionName: 'submitIntentWithBond',
        args: [callbackGasLimit, unlockBlock, condition as `0x${string}`, ciphertextArg],
        value,
        ...gasFees,
      })

      setTxHash(txHash)
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

      const requestId = await resolveSubmitRequestId(
        receipt,
        addrs.GhostLockLiveness,
        address,
        publicClient,
      )

      setLastRequestId(requestId)
      setTargetBlock(unlockBlock)
      setIntentStatus('locked')
      setStep(2)

      _startPolling(requestId, addrs, publicClient, oracleAtSubmit, baseAmount)

    } catch (err: any) {
      const msg = err?.shortMessage ?? err?.message ?? 'Unknown error'
      console.error('[useIntentSubmission]', msg)
      setError(msg)
      setIntentStatus('error')
    }
  }, [
    address, amountIn, chainId, tokenIn, tokenOut, slippageBps,
    prices, oracleLoading, publicClient, walletClient, writeContractAsync,
    setIntentStatus, setStep, setTargetBlock, setLastRequestId,
    setTxHash, setCiphertextPreview, setError,
    setSubmissionOraclePrice, setClearingPrice, setMevSavings, setWinningBid, reset,
  ])

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current) }, [])

  return { submit }

  async function resolveSubmitRequestId(
    receipt: TransactionReceipt,
    liveness: `0x${string}`,
    user: `0x${string}`,
    client: NonNullable<typeof publicClient>,
  ): Promise<number> {
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
      return typeof rid === 'bigint' ? Number(rid) : Number(rid)
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

    return Number(lastId)
  }

  function _startPolling(
    requestId: number,
    addrs: ReturnType<typeof getAddresses>,
    client: NonNullable<typeof publicClient>,
    oracleQuotePerBase: number | null,
    baseAmount: string,
  ) {
    if (pollingRef.current) clearInterval(pollingRef.current)
    // let phase: 'ready' | 'settled' = 'ready'

    pollingRef.current = setInterval(async () => {
      try {
        const isSettled = await client.readContract({
          address: addrs.BatchSettlement,
          abi: BatchSettlementABI,
          functionName: 'settledIntent',
          args: [BigInt(requestId)],
        }) as boolean

        if (isSettled) {
          const cp = await _fetchClearingPrice(addrs, client)
          setClearingPrice(cp)
          _computeSavings(cp, oracleQuotePerBase, baseAmount)
          setIntentStatus('settled')
          setStep(5)
          clearInterval(pollingRef.current!)
          pollingRef.current = null
        }
      } catch (e: any) {
        console.warn('[intent poll]', e?.message)
      }
    }, 2_500)
  }

  async function _fetchClearingPrice(
    addrs: ReturnType<typeof getAddresses>,
    client: NonNullable<typeof publicClient>,
  ): Promise<bigint> {
    try {
      const settledEvent = BatchSettlementABI.find(
        (e: any) => e.type === 'event' && e.name === 'Settled',
      ) as any

      const logs = await client.getLogs({
        address: addrs.BatchSettlement,
        event: settledEvent,
        fromBlock: 'earliest',
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
