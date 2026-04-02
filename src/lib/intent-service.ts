/**
 * GhostLock intent encryption layer.
 * Uses blocklock-js for Layer-1 encryption (GhostLockIntents contract).
 * OnlySwaps (onlyswaps-js) is used for routing/settlement on solver side; encryption stays here for contract compatibility.
 */
import { ethers } from 'ethers'
import { CONFIG, MARKETS } from './config'
import { Blocklock } from 'blocklock-js'

const BLOCKLOCK_CHAIN_ID_MAP: Record<number, number> = {
  84532: 84532,
  8453: 84532,
  42161: 84532,
  421614: 84532,
}

function getBlocklockChainId(chainId: number): number {
  return BLOCKLOCK_CHAIN_ID_MAP[chainId] || 84532
}

export interface IntentPayload {
  market: string
  side: 'buy' | 'sell'
  amount: string
  limitPrice: string
  slippageBps: number
  marketId: number
  epoch: number
  user: string
}

export interface DummyIntentPayload {
  market: string
  side: 'buy' | 'sell'
  amount: string
  limitPrice: string
  marketId: number
  slippageBps: number
  epoch: number
  user: string
  isDummy: true
}

export interface PrivacyConfig {
  enablePadding: boolean
  enableDummyIntents: boolean
  paddingSize: number
  dummyIntentCount: number
  dummyIntentRatio: number
}

export interface BlocklockCiphertext {
  u: { x: readonly [bigint, bigint]; y: readonly [bigint, bigint] }
  v: `0x${string}`
  w: `0x${string}`
}

export class IntentService {
  private signer: ethers.Signer
  private chainId: number

  constructor(signer: ethers.Signer, chainId: number = CONFIG.CHAIN_ID) {
    this.signer = signer
    this.chainId = chainId
  }

  async encryptIntent(
    payload: IntentPayload,
    unlockBlock: number,
    privacyConfig?: PrivacyConfig
  ): Promise<BlocklockCiphertext> {
    try {
      if (!Blocklock) throw new Error('Blocklock not available in blocklock-js module')
      const blocklockChainId = getBlocklockChainId(this.chainId)
      const blocklock = Blocklock.createFromChainId(this.signer, blocklockChainId)
      const abiCoder = ethers.AbiCoder.defaultAbiCoder()
      let encodedPayload = abiCoder.encode(
        ['address', 'uint8', 'uint256', 'uint256', 'uint8', 'uint256'],
        [
          payload.user,
          payload.side === 'buy' ? 0 : 1,
          ethers.parseUnits(payload.amount, this.getTokenDecimals(payload.marketId, 'base')),
          ethers.parseUnits(payload.limitPrice, this.getTokenDecimals(payload.marketId, 'quote')),
          payload.marketId,
          payload.epoch,
        ]
      )
      if (privacyConfig?.enablePadding) {
        encodedPayload = this.addPadding(encodedPayload, privacyConfig.paddingSize)
      }
      const ciphertext = blocklock.encrypt(ethers.getBytes(encodedPayload), BigInt(unlockBlock))
      const normalizeBigint = (v: unknown): bigint =>
        typeof v === 'bigint' ? v : typeof v === 'number' ? BigInt(v) : BigInt(String(v))
      const vHex = (() => {
        const v = (ciphertext as { V?: Uint8Array; v?: string }).V ?? (ciphertext as { v?: Uint8Array | string }).v
        if (v instanceof Uint8Array) return ethers.hexlify(v) as `0x${string}`
        if (typeof v === 'string' && v.startsWith('0x')) return v as `0x${string}`
        throw new Error('Invalid V in ciphertext')
      })()
      const wHex = (() => {
        const w = (ciphertext as { W?: Uint8Array; w?: string }).W ?? (ciphertext as { w?: Uint8Array | string }).w
        if (w instanceof Uint8Array) return ethers.hexlify(w) as `0x${string}`
        if (typeof w === 'string' && w.startsWith('0x')) return w as `0x${string}`
        throw new Error('Invalid W in ciphertext')
      })()
      const U = (ciphertext as { U?: { x: unknown; y: unknown }; u?: { x: unknown; y: unknown } }).U ?? (ciphertext as { u?: { x: unknown; y: unknown } }).u
      const toPair = (p: unknown): readonly [bigint, bigint] => {
        if (Array.isArray(p) && p.length === 2) return [normalizeBigint(p[0]), normalizeBigint(p[1])] as const
        if (p && typeof p === 'object') {
          const values = Object.values(p as Record<string, unknown>)
          if (values.length >= 2) return [normalizeBigint(values[0]), normalizeBigint(values[1])] as const
        }
        throw new Error('Invalid U coordinate shape in ciphertext')
      }
      if (!U?.x || !U?.y) throw new Error('Invalid U in ciphertext')
      return {
        u: { x: toPair(U.x), y: toPair(U.y) },
        v: vHex,
        w: wHex,
      }
    } catch (error) {
      console.error('Intent encryption error:', error)
      throw new Error(`Failed to encrypt intent: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async tryDecryptIntent(ciphertext: string, decryptionKey: string): Promise<IntentPayload | null> {
    try {
      const blocklockChainId = getBlocklockChainId(this.chainId)
      const blocklock = Blocklock.createFromChainId(this.signer, blocklockChainId)
      if (!blocklock) return null
      let formattedCiphertext: Uint8Array | string = ciphertext
      if (typeof ciphertext === 'string' && ciphertext.startsWith('0x')) {
        try {
          formattedCiphertext = ethers.getBytes(ciphertext)
        } catch {
          /* noop */
        }
      }
      const keyToBuffer = ethers.getBytes(decryptionKey)
      const result = blocklock.decrypt(formattedCiphertext, keyToBuffer)
      if (!result) return null
      const abiCoder = ethers.AbiCoder.defaultAbiCoder()
      const decoded = abiCoder.decode(['address', 'uint8', 'uint256', 'uint256', 'uint8', 'uint256'], result)
      const marketId = Number(decoded[4])
      const market = MARKETS.find((m) => m.id === marketId)
      return {
        user: decoded[0],
        side: Number(decoded[1]) === 0 ? 'buy' : 'sell',
        amount: ethers.formatUnits(decoded[2], this.getTokenDecimals(marketId, 'base')),
        limitPrice: ethers.formatUnits(decoded[3], this.getTokenDecimals(marketId, 'quote')),
        slippageBps: 0,
        marketId,
        epoch: Number(decoded[5]),
        market: market?.name ?? 'Unknown',
      }
    } catch {
      return null
    }
  }

  private getTokenDecimals(marketId: number, tokenType: 'base' | 'quote'): number {
    const market = MARKETS.find((m) => m.id === marketId)
    if (!market) return 18
    return tokenType === 'base' ? market.baseDecimals : market.quoteDecimals
  }

  private addPadding(encodedPayload: string, paddingSize: number): string {
    const payloadBytes = ethers.getBytes(encodedPayload)
    const paddingBytes = new Uint8Array(paddingSize)
    crypto.getRandomValues(paddingBytes)
    const paddedBytes = new Uint8Array(payloadBytes.length + paddingBytes.length)
    paddedBytes.set(payloadBytes, 0)
    paddedBytes.set(paddingBytes, payloadBytes.length)
    return ethers.hexlify(paddedBytes)
  }

  generateDummyIntents(realIntent: IntentPayload, count: number): DummyIntentPayload[] {
    const dummies: DummyIntentPayload[] = []
    for (let i = 0; i < count; i++) {
      const dummySide = Math.random() > 0.5 ? 'buy' : 'sell'
      const base = parseFloat(realIntent.amount)
      const dummyAmount = (base * (0.5 + Math.random() * 1.5)).toFixed(6)
      const basePrice = parseFloat(realIntent.limitPrice)
      const variation = 0.95 + Math.random() * 0.1
      const priceMultiplier = dummySide === 'buy' ? 1 + variation * 0.1 : 1 - variation * 0.1
      const dummyPrice = (basePrice * priceMultiplier).toFixed(2)
      dummies.push({
        market: realIntent.market,
        side: dummySide,
        amount: dummyAmount,
        limitPrice: dummyPrice,
        marketId: realIntent.marketId,
        slippageBps: realIntent.slippageBps,
        epoch: realIntent.epoch,
        user: realIntent.user,
        isDummy: true,
      })
    }
    return dummies
  }

  async encryptIntentBatch(
    realIntent: IntentPayload,
    unlockBlock: number,
    privacyConfig: PrivacyConfig
  ): Promise<BlocklockCiphertext[]> {
    const ciphertexts: BlocklockCiphertext[] = []
    ciphertexts.push(await this.encryptIntent(realIntent, unlockBlock, privacyConfig))
    if (privacyConfig.enableDummyIntents) {
      for (const dummyIntent of this.generateDummyIntents(realIntent, privacyConfig.dummyIntentCount)) {
        const complete: IntentPayload = { ...dummyIntent, slippageBps: realIntent.slippageBps }
        ciphertexts.push(await this.encryptIntent(complete, unlockBlock, privacyConfig))
      }
    }
    return ciphertexts
  }

  static createCondition(unlockBlock: number): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [unlockBlock])
  }

  static getCurrentEpoch(blockNumber: number): number {
    return Math.floor(blockNumber / CONFIG.AUCTION.EPOCH_DURATION_BLOCKS)
  }

  static getTargetEpoch(targetBlock: number): number {
    return Math.floor(targetBlock / CONFIG.AUCTION.EPOCH_DURATION_BLOCKS)
  }

  static filterRealIntents(decryptedPayloads: unknown[]): IntentPayload[] {
    return decryptedPayloads.filter((p): p is IntentPayload => typeof p === 'object' && p !== null && !(p as { isDummy?: boolean }).isDummy) as IntentPayload[]
  }

  static getDefaultPrivacyConfig(): PrivacyConfig {
    return {
      enablePadding: true,
      enableDummyIntents: true,
      paddingSize: 256,
      dummyIntentCount: 3,
      dummyIntentRatio: 0.25,
    }
  }
}

export type IntentStatus = 'Pending' | 'Ready' | 'Settled'

export function statusFromUint(status: number): IntentStatus {
  switch (status) {
    case 1:
      return 'Ready'
    case 2:
      return 'Settled'
    default:
      return 'Pending'
  }
}

export function formatIntentId(id: string | number): string {
  return `#${String(id).padStart(6, '0')}`
}

export function getIntentStatusColor(status: IntentStatus): string {
  switch (status) {
    case 'Pending':
      return 'warning'
    case 'Ready':
      return 'info'
    case 'Settled':
      return 'success'
    default:
      return 'default'
  }
}
