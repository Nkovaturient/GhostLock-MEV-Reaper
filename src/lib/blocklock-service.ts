import { ethers } from 'ethers'
import { CONFIG, MARKETS } from './config'
import { Blocklock } from 'blocklock-js'

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

export class BlocklockService {
  private signer: ethers.Signer
  private chainId: number

  constructor(signer: ethers.Signer, chainId: number = CONFIG.CHAIN_ID) {
    this.signer = signer
    this.chainId = chainId
  }

  /**
   * Encrypts a trading intent using blocklock-js
   * @param payload The intent payload to encrypt
   * @param unlockBlock The block number when decryption becomes available
   * @returns Encrypted ciphertext structure ready for contract submission
   */
  async encryptIntent(payload: IntentPayload, unlockBlock: number): Promise<BlocklockCiphertext> {
    try {
      if (!Blocklock) {
        throw new Error('Blocklock not available in blocklock-js module')
      }

      const blocklock = Blocklock.createFromChainId(this.signer, this.chainId)

      // Encode the payload according to the contract's expected format
      const abiCoder = ethers.AbiCoder.defaultAbiCoder()
      const encodedPayload = abiCoder.encode(
        ['address', 'uint8', 'uint256', 'uint256', 'uint8', 'uint256'],
        [
          payload.user,
          payload.side === 'buy' ? 0 : 1,
          ethers.parseUnits(payload.amount, this.getTokenDecimals(payload.marketId, 'base')),
          ethers.parseUnits(payload.limitPrice, this.getTokenDecimals(payload.marketId, 'quote')),
          payload.marketId,
          payload.epoch
        ]
      )

      // Encrypt the payload with block-based condition
      const ciphertext = blocklock.encrypt(
        ethers.getBytes(encodedPayload),
        BigInt(unlockBlock)
      )
      console.log(`ciphertext=`, ciphertext)

      const normalizeBigint = (v: unknown): bigint => {
        if (typeof v === 'bigint') return v
        if (typeof v === 'number') return BigInt(v)
        if (typeof v === 'string') return BigInt(v)
        throw new Error('Invalid bigint-like value in ciphertext U')
      }

      const vHex = (() => {
        const v = (ciphertext as any).V ?? (ciphertext as any).v
        if (v instanceof Uint8Array) return ethers.hexlify(v) as `0x${string}`
        if (typeof v === 'string' && v.startsWith('0x')) return v as `0x${string}`
        throw new Error('Invalid V in ciphertext')
      })()

      const wHex = (() => {
        const w = (ciphertext as any).W ?? (ciphertext as any).w
        if (w instanceof Uint8Array) return ethers.hexlify(w) as `0x${string}`
        if (typeof w === 'string' && w.startsWith('0x')) return w as `0x${string}`
        throw new Error('Invalid W in ciphertext')
      })()

      const U = (ciphertext as any).U ?? (ciphertext as any).u
      const toPair = (p: unknown): readonly [bigint, bigint] => {
        if (Array.isArray(p) && p.length === 2) {
          return [normalizeBigint(p[0]), normalizeBigint(p[1])] as const
        }
        if (p && typeof p === 'object') {
          const values = Object.values(p as Record<string, unknown>)
          if (values.length >= 2) {
            return [normalizeBigint(values[0]), normalizeBigint(values[1])] as const
          }
        }
        throw new Error('Invalid U coordinate shape in ciphertext')
      }

      if (!U?.x || !U?.y) {
        throw new Error('Invalid U in ciphertext')
      }

      const ciphertextStruct: BlocklockCiphertext = {
        u: {
          x: toPair(U.x),
          y: toPair(U.y),
        },
        v: vHex,
        w: wHex,
      }

      return ciphertextStruct
    } catch (error) {
      console.error('Blocklock encryption error:', error)
      throw new Error(`Failed to encrypt intent: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Attempts to decrypt an intent if the current block allows it
   * @param ciphertext The encrypted intent data
   * @param decryptionKey To decrypt the content after attaining intended block height
   * @returns Decrypted payload or null if not yet decryptable
   */
  async tryDecryptIntent(ciphertext: string, decryptionKey: string): Promise<IntentPayload | null> {
    try {
      const blocklock = Blocklock.createFromChainId(this.signer, this.chainId);

      if (!blocklock) {
        console.warn('Decrypt function not available in blocklock-js')
        return null
      }

      // Ensure ciphertext is in the correct format for blocklock-js
      let formattedCiphertext: any = ciphertext;
      if (typeof ciphertext === 'string' && ciphertext.startsWith('0x')) {
        // Convert hex string to Uint8Array if required by blocklock-js
        try {
          formattedCiphertext = ethers.getBytes(ciphertext);
        } catch {
          console.log(`CipherText conversion failed!`);
        }
      }

      const keyToBuffer = ethers.getBytes(decryptionKey)
      const result = blocklock.decrypt(formattedCiphertext, keyToBuffer);

      if (!result) return null

      // Decode the payload
      const abiCoder = ethers.AbiCoder.defaultAbiCoder()
      const decoded = abiCoder.decode(
        ['address', 'uint8', 'uint256', 'uint256', 'uint8', 'uint256'],
        result
      )

      const marketId = Number(decoded[4])
      const market = MARKETS.find(m => m.id === marketId)

      return {
        user: decoded[0],
        side: Number(decoded[1]) === 0 ? 'buy' : 'sell',
        amount: ethers.formatUnits(decoded[2], this.getTokenDecimals(marketId, 'base')),
        limitPrice: ethers.formatUnits(decoded[3], this.getTokenDecimals(marketId, 'quote')),
        slippageBps: 0, // Not stored in encrypted payload
        marketId,
        epoch: Number(decoded[5]),
        market: market?.name || 'Unknown'
      }
    } catch (error) {
      console.error('Blocklock decryption error:', error)
      return null
    }
  }

  /**
   * Creates a block-based condition for blocklock encryption
   * @param unlockBlock The block number when decryption becomes available
   * @returns Encoded condition bytes
   */
  static createCondition(unlockBlock: number): string {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder()
    return abiCoder.encode(['uint256'], [unlockBlock])
  }

  /**
   * Gets the decimal places for a token in a specific market
   * @param marketId The market identifier
   * @param tokenType Whether to get base or quote token decimals
   * @returns Number of decimal places
   */
  private getTokenDecimals(marketId: number, tokenType: 'base' | 'quote'): number {
    const market = MARKETS.find(m => m.id === marketId)
    if (!market) return 18 // Default to 18 decimals

    return tokenType === 'base' ? market.baseDecimals : market.quoteDecimals
  }

  /**
   * Calculates the current epoch based on block number
   * @param blockNumber Current block number
   * @returns Current epoch number
   */
  static getCurrentEpoch(blockNumber: number): number {
    return Math.floor(blockNumber / CONFIG.AUCTION.EPOCH_DURATION_BLOCKS)
  }

  /**
   * Calculates the target epoch for a given target block
   * @param targetBlock Target block for intent execution
   * @returns Target epoch number
   */
  static getTargetEpoch(targetBlock: number): number {
    return Math.floor(targetBlock / CONFIG.AUCTION.EPOCH_DURATION_BLOCKS)
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
    case 'Ready': return 'info'
    case 'Settled': return 'success'
    default: return 'default'
  }
}