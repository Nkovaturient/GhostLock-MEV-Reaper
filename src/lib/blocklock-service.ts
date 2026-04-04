import { ethers } from 'ethers'
import { Blocklock } from 'blocklock-js'
import { GHOSTLOCK_MARKETS } from './ghostlockMarkets'

const BLOCKLOCK_CHAIN_ID_MAP: Record<number, number> = {
  421614: 421614, // Arbitrum Sepolia
  42161:  421614, // Arbitrum One → fall back to Arb Sepolia blocklock (same dcipher network)
  84532:  84532,  // Base Sepolia
  8453:   84532,  // Base Mainnet → fall back to Base Sepolia blocklock
  1:      84532,  // Ethereum → fall back to Base Sepolia blocklock
}

function getBlocklockChainId(chainId: number): number {
  return BLOCKLOCK_CHAIN_ID_MAP[chainId] ?? 84532
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

export interface BlocklockCiphertext {
  u: {
    x: readonly [bigint, bigint]
    y: readonly [bigint, bigint]
  }
  v: `0x${string}`
  w: `0x${string}`
}

export interface PrivacyConfig {
  enablePadding: boolean
  enableDummyIntents: boolean
  paddingSize: number
  dummyIntentCount: number
  dummyIntentRatio: number
}

export class BlocklockService {
  private signer: ethers.Signer
  private chainId: number

  constructor(signer: ethers.Signer, chainId: number) {
    this.signer = signer
    this.chainId = chainId
  }

  /**
   * Encrypts a trading intent using dcipher blocklock threshold encryption.
   * Payload encoding matches GhostLockLiveness._decodeIntent():
   *   (address user, uint8 side, uint256 amount, uint256 limitPrice, uint8 marketId, uint256 epoch)
   *   side: 0 = Buy base with quote, 1 = Sell base for quote
   */
  async encryptIntent(
    payload: IntentPayload,
    unlockBlock: number,
    privacyConfig?: PrivacyConfig,
  ): Promise<BlocklockCiphertext> {
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
      ],
    )

    if (privacyConfig?.enablePadding) {
      encodedPayload = this.addPadding(encodedPayload, privacyConfig.paddingSize)
    }

    const ciphertext = blocklock.encrypt(ethers.getBytes(encodedPayload), BigInt(unlockBlock))

    const toPair = (p: unknown): readonly [bigint, bigint] => {
      if (Array.isArray(p) && p.length === 2) {
        return [BigInt(p[0]), BigInt(p[1])] as const
      }
      if (p && typeof p === 'object') {
        const values = Object.values(p as Record<string, unknown>)
        if (values.length >= 2) {
          return [BigInt(values[0] as string | number | bigint), BigInt(values[1] as string | number | bigint)] as const
        }
      }
      throw new Error('Invalid U coordinate shape')
    }

    const U = (ciphertext as any).U ?? (ciphertext as any).u
    if (!U?.x || !U?.y) throw new Error('Invalid U in ciphertext')

    const vRaw = (ciphertext as any).V ?? (ciphertext as any).v
    const vHex = vRaw instanceof Uint8Array
      ? ethers.hexlify(vRaw) as `0x${string}`
      : typeof vRaw === 'string' && vRaw.startsWith('0x')
        ? vRaw as `0x${string}`
        : ethers.hexlify(Buffer.from(vRaw as string, 'utf8')) as `0x${string}`

    const wRaw = (ciphertext as any).W ?? (ciphertext as any).w
    const wHex = wRaw instanceof Uint8Array
      ? ethers.hexlify(wRaw) as `0x${string}`
      : typeof wRaw === 'string' && wRaw.startsWith('0x')
        ? wRaw as `0x${string}`
        : ethers.hexlify(Buffer.from(wRaw as string, 'utf8')) as `0x${string}`

    return {
      u: { x: toPair(U.x), y: toPair(U.y) },
      v: vHex,
      w: wHex,
    }
  }

  /**
   * Fetches blocklock fulfillment status; returns the decryption key bytes when available.
   */
  async fetchDecryptionKeyBytes(requestId: bigint): Promise<Uint8Array | null> {
    const blocklockChainId = getBlocklockChainId(this.chainId)
    const blocklock = Blocklock.createFromChainId(this.signer, blocklockChainId)
    const status = await blocklock.fetchBlocklockStatus(requestId)
    const key = status?.decryptionKey
    if (key == null || key.length === 0) return null
    return key instanceof Uint8Array ? key : new Uint8Array(key)
  }

  /**
   * Attempt decryption after unlock block is reached.
   */
  async tryDecryptIntent(ciphertext: string, decryptionKey: string): Promise<IntentPayload | null> {
    try {
      const blocklockChainId = getBlocklockChainId(this.chainId)
      const blocklock = Blocklock.createFromChainId(this.signer, blocklockChainId)

      const formattedCiphertext = typeof ciphertext === 'string' && ciphertext.startsWith('0x')
        ? ethers.getBytes(ciphertext)
        : ciphertext

      const keyBytes = ethers.getBytes(decryptionKey)
      const result = blocklock.decrypt(formattedCiphertext as any, keyBytes)
      if (!result) return null

      const abiCoder = ethers.AbiCoder.defaultAbiCoder()
      const decoded = abiCoder.decode(
        ['address', 'uint8', 'uint256', 'uint256', 'uint8', 'uint256'],
        result,
      )

      const marketId = Number(decoded[4])
      const market = GHOSTLOCK_MARKETS.find(m => m.id === marketId)

      return {
        user:      decoded[0],
        side:      Number(decoded[1]) === 0 ? 'buy' : 'sell',
        amount:    ethers.formatUnits(decoded[2], this.getTokenDecimals(marketId, 'base')),
        limitPrice: ethers.formatUnits(decoded[3], this.getTokenDecimals(marketId, 'quote')),
        slippageBps: 0,
        marketId,
        epoch: Number(decoded[5]),
        market: market?.name || 'Unknown',
      }
    } catch {
      return null
    }
  }

  /**
   * Creates a block-based condition for blocklock encryption.
   * Encodes the unlock block number as bytes for the condition parameter.
   */
  static createCondition(unlockBlock: number): string {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder()
    return abiCoder.encode(['uint256'], [unlockBlock])
  }

  private getTokenDecimals(marketId: number, tokenType: 'base' | 'quote'): number {
    const market = GHOSTLOCK_MARKETS.find(m => m.id === marketId)
    if (!market) return 18
    return tokenType === 'base' ? market.baseDecimals : market.quoteDecimals
  }

  private addPadding(encodedPayload: string, paddingSize: number): string {
    const payloadBytes = ethers.getBytes(encodedPayload)
    const paddingBytes = new Uint8Array(paddingSize)
    crypto.getRandomValues(paddingBytes)
    const padded = new Uint8Array(payloadBytes.length + paddingBytes.length)
    padded.set(payloadBytes, 0)
    padded.set(paddingBytes, payloadBytes.length)
    return ethers.hexlify(padded)
  }
}

export type IntentStatus = 'Pending' | 'Ready' | 'Settled'

export function statusFromUint(status: number): IntentStatus {
  switch (status) {
    case 1: return 'Ready'
    case 2: return 'Settled'
    default: return 'Pending'
  }
}

export function formatIntentId(id: string | number): string {
  return `#${String(id).padStart(6, '0')}`
}

export function getIntentStatusColor(status: IntentStatus): string {
  switch (status) {
    case 'Pending': return 'warning'
    case 'Ready':   return 'info'
    case 'Settled': return 'success'
    default:        return 'default'
  }
}
