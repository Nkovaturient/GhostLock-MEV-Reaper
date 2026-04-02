/**
 * useIntentSubmission.ts
 *
 * Full 5-step intent lifecycle using GhostLockLiveness on Arbitrum Sepolia:
 *   1. Encrypt  — dcipher blocklock threshold encryption (Layer 1)
 *   2. Submit   — Liveness.submitIntentWithBond via wagmi writeContract
 *   3. Lock     — countdown to unlockBlock via useCountdown
 *   4. Order   — poll for IntentDecrypted → VRF seed available (Layer 2)
 *   5. Settle   — poll BatchSettlement.settledIntent (Layer 3 — SolverBoard flow)
 *
 * No server calls needed for the core intent flow.
 * The server detects IntentDecrypted events independently and drives SolverBoard settlement.
 */

import { useCallback, useEffect, useRef } from 'react'
import { useAccount, usePublicClient, useWalletClient, useChainId, useWriteContract } from 'wagmi'
import { parseEther, decodeEventLog, type Log } from 'viem'
import { BrowserProvider } from 'ethers'

import { useSwapStore }      from '../stores/swapStore'
import { BlocklockService }  from '../../lib/blocklock-service'
import {
  LIVENESS_ABI,
  BATCH_SETTLEMENT_ABI,
} from '../contracts/abi'
import {
  getAddresses,
  getMarketId,
  AUCTION,
} from '../contracts/config'
import { useEthUsdcRate } from '../../hooks/usePythPrices'

async function walletClientToSigner(
  wc: NonNullable<ReturnType<typeof useWalletClient>['data']>
) {
  const provider = new BrowserProvider(wc.transport as any, {
    chainId: wc.chain.id,
    name:    wc.chain.name,
  })
  return provider.getSigner(wc.account.address)
}

export function useIntentSubmission() {
  const { address }            = useAccount()
  const chainId                = useChainId()
  const publicClient           = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { writeContractAsync } = useWriteContract()
  const { rate: ethUsdcRate }  = useEthUsdcRate()

  const oraclePriceRef = useRef<number | null>(null)
  useEffect(() => { oraclePriceRef.current = ethUsdcRate ?? null }, [ethUsdcRate])

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

    reset()

    try {
      const addrs    = getAddresses(chainId)
      const marketId = getMarketId(tokenIn.symbol, tokenOut.symbol)

      // Step 1: Encrypt (Layer 1 — dcipher blocklock threshold encryption)
      setIntentStatus('encrypting')
      setStep(1)

      const oracleAtSubmit = oraclePriceRef.current
      setSubmissionOraclePrice(oracleAtSubmit)

      const currentBlock = await publicClient.getBlockNumber()
      const unlockBlock  = Number(currentBlock) + AUCTION.EPOCH_DURATION_BLOCKS
      const epoch        = Math.floor(unlockBlock / AUCTION.EPOCH_DURATION_BLOCKS)

      const signer  = await walletClientToSigner(walletClient)
      const service = new BlocklockService(signer, chainId)

      const ciphertext = await service.encryptIntent({
        user: address, side: 'buy', amount: amountIn,
        limitPrice: '0', slippageBps, marketId, epoch,
        market: `${tokenIn.symbol}/${tokenOut.symbol}`,
      }, unlockBlock)

      const condition = BlocklockService.createCondition(unlockBlock)
      const ctHex = typeof ciphertext.v === 'string' ? ciphertext.v : ''
      setCiphertextPreview(ctHex.slice(0, 18) || '0xciphertext…')

      // Step 2: Submit to chain
      setIntentStatus('submitting')
      setStep(2)

      // Note: ERC-20 deposit via BatchSettlement.deposit() is a separate flow
      // for when tokenIn is USDC/WBTC. For native ETH, no deposit is needed.

      const txHash = await writeContractAsync({
        address:      addrs.GhostLockLiveness,
        abi:          LIVENESS_ABI,
        functionName: 'submitIntentWithBond',
        args: [
          AUCTION.CALLBACK_GAS_LIMIT,
          unlockBlock,
          condition as `0x${string}`,
          {
            u: {
              x: ciphertext.u.x as [bigint, bigint],
              y: ciphertext.u.y as [bigint, bigint],
            },
            v: ciphertext.v,
            w: ciphertext.w,
          },
        ],
        value: parseEther(AUCTION.SUBMISSION_VALUE_ETH),
      })

      setTxHash(txHash)
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

      const requestId = _parseRequestId(receipt.logs)
      if (requestId == null) throw new Error('IntentSubmitted event not found in tx receipt')

      setLastRequestId(requestId)
      setTargetBlock(unlockBlock)
      setIntentStatus('locked')
      setStep(3)

      _startPolling(requestId, addrs, publicClient, oracleAtSubmit)

    } catch (err: any) {
      const msg = err?.shortMessage ?? err?.message ?? 'Unknown error'
      console.error('[useIntentSubmission]', msg)
      setError(msg)
      setIntentStatus('error')
    }
  }, [
    address, amountIn, chainId, tokenIn, tokenOut, slippageBps,
    publicClient, walletClient, writeContractAsync,
    setIntentStatus, setStep, setTargetBlock, setLastRequestId,
    setTxHash, setCiphertextPreview, setError,
    setSubmissionOraclePrice, setClearingPrice, setMevSavings, setWinningBid, reset,
  ])

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current) }, [])

  return { submit }

  function _parseRequestId(logs: readonly Log[]): number | null {
    for (const log of logs) {
      try {
        const d = decodeEventLog({
          abi:       LIVENESS_ABI,
          eventName: 'IntentSubmitted',
          data:      log.data,
          topics:    log.topics as [string, ...string[]],
        })
        return Number((d.args as any).requestId)
      } catch { /* not this log */ }
    }
    return null
  }

  function _startPolling(
    requestId: number,
    addrs: ReturnType<typeof getAddresses>,
    client: NonNullable<typeof publicClient>,
    oracleAtSubmit: number | null,
  ) {
    if (pollingRef.current) clearInterval(pollingRef.current)
    let phase: 'ready' | 'settled' = 'ready'

    pollingRef.current = setInterval(async () => {
      try {
        if (phase === 'ready') {
          // Check if blocklock decryption callback fired → IntentDecrypted emitted
          // We detect this by checking isReady on the liveness contract
          const isReady = await client.readContract({
            address:      addrs.GhostLockLiveness,
            abi:          LIVENESS_ABI,
            functionName: 'isReady',
            args:         [BigInt(requestId)],
          }) as boolean

          if (isReady) {
            setIntentStatus('ordering')
            setStep(4)
            setTimeout(() => { setIntentStatus('competing') }, 2_000)
            phase = 'settled'
          }
        } else {
          // Check if BatchSettlement has settled this intent
          const isSettled = await client.readContract({
            address:      addrs.BatchSettlement,
            abi:          BATCH_SETTLEMENT_ABI,
            functionName: 'settledIntent',
            args:         [BigInt(requestId)],
          }) as boolean

          if (isSettled) {
            const cp = await _fetchClearingPrice(addrs, client)
            setClearingPrice(cp)
            _computeSavings(cp, oracleAtSubmit, amountIn)
            setIntentStatus('settled')
            setStep(5)
            clearInterval(pollingRef.current!)
            pollingRef.current = null
          }
        }
      } catch (e: any) {
        console.warn('[intent poll]', e?.message)
      }
    }, 4_000) // poll every 4s (~1 Arb Sepolia block)
  }

  async function _fetchClearingPrice(
    addrs: ReturnType<typeof getAddresses>,
    client: NonNullable<typeof publicClient>,
  ): Promise<bigint> {
    try {
      const settledEvent = BATCH_SETTLEMENT_ABI.find(
        (e: any) => e.type === 'event' && e.name === 'Settled',
      ) as any

      const logs = await client.getLogs({
        address:  addrs.BatchSettlement,
        event:    settledEvent,
        fromBlock: 'earliest',
        toBlock:  'latest',
      })

      if (logs.length) {
        const last = logs[logs.length - 1]
        const d = decodeEventLog({
          abi:       BATCH_SETTLEMENT_ABI,
          eventName: 'Settled',
          data:      last.data,
          topics:    last.topics as [string, ...string[]],
        })
        return BigInt((d.args as any).clearingPrice ?? 0n)
      }
    } catch (e) {
      console.warn('[fetchClearingPrice]', e)
    }
    return 0n
  }

  function _computeSavings(clearingPriceRaw: bigint, oracleUsd: number | null, amount: string) {
    // clearingPrice is in quote units per base (e.g. USDC per ETH), already 6 dec (USDC)
    const clearingUsd = Number(clearingPriceRaw) / 1e6
    const qty = parseFloat(amount) || 0
    setWinningBid((clearingUsd * qty).toFixed(2))
    if (!oracleUsd || oracleUsd <= 0) { setMevSavings('0'); return }
    setMevSavings(Math.max(0, (clearingUsd - oracleUsd) * qty).toFixed(2))
  }
}
