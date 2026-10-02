/**
 * drand quicknet timelock encryption (tlock-js) — replaces dcipher blocklock for ENCRYPT.
 *
 * Intents are encrypted to a future drand quicknet round. Decryption is off-chain:
 * fetch the round signature from the public beacon, then timelockDecrypt. No privileged
 * agent can withhold the key.
 */
import { ethers } from 'ethers'
import {
  timelockEncrypt,
  timelockDecrypt,
  mainnetClient,
  roundAt,
  roundTime,
  defaultChainInfo,
  type ChainClient,
} from 'tlock-js'
import { Buffer } from 'buffer'
import { CONFIG } from './config'
import { GHOSTLOCK_MARKETS } from './ghostlockMarkets'
import type { IntentPayload } from './intent-payload'

let cachedClient: ChainClient | null = null

function getQuicknetClient(): ChainClient {
  if (!cachedClient) cachedClient = mainnetClient()
  return cachedClient
}

/** drand quicknet round that unlocks at or after `targetTimestampSec` (unix seconds). */
export function unlockRoundForTimestamp(targetTimestampSec: number): number {
  const round = roundAt(targetTimestampSec * 1000, defaultChainInfo)
  if (!Number.isFinite(round) || round < 1) {
    throw new Error('Could not compute drand unlock round for the target unlock time')
  }
  return round
}

/** Unix timestamp (seconds) when `round` is emitted on quicknet. */
export function unlockTimeForRound(round: number): number {
  return Math.floor(roundTime(defaultChainInfo, round) / 1000)
}

/** Map an EVM unlock block to a quicknet round (~2s blocks on Arbitrum). */
export function unlockRoundForBlock(unlockBlock: number, currentBlock: number): number {
  const blocksAhead = Math.max(1, unlockBlock - currentBlock)
  const targetTs = Math.floor(Date.now() / 1000) + blocksAhead * 2
  return unlockRoundForTimestamp(targetTs)
}

export function encodeIntentPlaintext(payload: IntentPayload): Uint8Array {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder()
  const market = GHOSTLOCK_MARKETS.find((m) => m.id === payload.marketId)
  const baseDecimals = market?.baseDecimals ?? 18
  const quoteDecimals = market?.quoteDecimals ?? 6

  return ethers.getBytes(
    abiCoder.encode(
      ['address', 'uint8', 'uint256', 'uint256', 'uint8', 'uint256'],
      [
        payload.user,
        payload.side === 'buy' ? 0 : 1,
        ethers.parseUnits(payload.amount, baseDecimals),
        ethers.parseUnits(payload.limitPrice, quoteDecimals),
        payload.marketId,
        payload.epoch,
      ],
    ),
  )
}

/** Armored tlock ciphertext string (includes embedded round number). */
export async function encryptIntentTlock(
  payload: IntentPayload,
  unlockRound: number,
): Promise<{ unlockRound: number; ciphertext: string }> {
  const client = getQuicknetClient()
  const plaintext = encodeIntentPlaintext(payload)
  const ciphertext = await timelockEncrypt(unlockRound, Buffer.from(plaintext), client)
  return { unlockRound, ciphertext }
}

export async function decryptTlockCiphertextRaw(ciphertext: string): Promise<Uint8Array> {
  const client = getQuicknetClient()
  return await timelockDecrypt(ciphertext, client)
}

export async function decryptIntentTlock(ciphertext: string): Promise<IntentPayload | null> {
  try {
    const client = getQuicknetClient()
    const plain = await timelockDecrypt(ciphertext, client)
    const abiCoder = ethers.AbiCoder.defaultAbiCoder()
    const decoded = abiCoder.decode(
      ['address', 'uint8', 'uint256', 'uint256', 'uint8', 'uint256'],
      plain,
    )

    const marketId = Number(decoded[4])
    const market = GHOSTLOCK_MARKETS.find((m) => m.id === marketId)

    return {
      user: decoded[0],
      side: Number(decoded[1]) === 0 ? 'buy' : 'sell',
      amount: ethers.formatUnits(decoded[2], market?.baseDecimals ?? 18),
      limitPrice: ethers.formatUnits(decoded[3], market?.quoteDecimals ?? 6),
      slippageBps: 0,
      marketId,
      epoch: Number(decoded[5]),
      market: market?.name ?? 'Unknown',
    }
  } catch {
    return null
  }
}

export function getCurrentEpoch(blockNumber: number): number {
  return Math.floor(blockNumber / CONFIG.AUCTION.EPOCH_DURATION_BLOCKS)
}

export function getTargetEpoch(targetBlock: number): number {
  return Math.floor(targetBlock / CONFIG.AUCTION.EPOCH_DURATION_BLOCKS)
}
