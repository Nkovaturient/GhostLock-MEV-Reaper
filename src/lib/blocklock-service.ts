import { ethers } from 'ethers'
import { CONFIG, MARKETS } from './config'

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
  data: string
  commitment: string
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
   * @returns Encrypted ciphertext ready for contract submission
   */
  async encryptIntent(payload: IntentPayload, unlockBlock: number): Promise<string> {
    try {
      // Import blocklock-js dynamically to handle potential loading issues
      const blocklockModule = await import('blocklock-js')
      const Blocklock = blocklockModule.Blocklock || blocklockModule.default?.Blocklock
      
      if (!Blocklock) {
        throw new Error('Blocklock not available in blocklock-js module')
      }

      // Create blocklock instance for the specific chain
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
      const ciphertext = await blocklock.encrypt(
        ethers.getBytes(encodedPayload),
        BigInt(unlockBlock)
      )
      
      // Handle different return formats from blocklock-js
      if (typeof ciphertext === 'string') {
        return ciphertext
      } else if (ciphertext instanceof Uint8Array) {
        return ethers.hexlify(ciphertext)
      } else if (ciphertext && typeof ciphertext === 'object' && 'ciphertext' in ciphertext) {
        return (ciphertext as any).ciphertext
      } else {
        throw new Error('Invalid ciphertext format from blocklock-js')
      }
    } catch (error) {
      console.error('Blocklock encryption error:', error)
      throw new Error(`Failed to encrypt intent: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Attempts to decrypt an intent if the current block allows it
   * @param ciphertext The encrypted intent data
   * @param currentBlock The current block number
   * @returns Decrypted payload or null if not yet decryptable
   */
  async tryDecryptIntent(ciphertext: string, currentBlock: number): Promise<IntentPayload | null> {
    try {
      // Import blocklock-js dynamically
      const blocklockModule = await import('blocklock-js')
      const decrypt = blocklockModule.decrypt || blocklockModule.default?.decrypt
      
      if (!decrypt) {
        console.warn('Decrypt function not available in blocklock-js')
        return null
      }

      // Attempt decryption
      const result = await decrypt({
        ciphertext: ciphertext as `0x${string}`,
        currentBlock: BigInt(currentBlock)
      })
      
      let plaintext: Uint8Array | null = null
      
      // Handle different return formats
      if (result instanceof Uint8Array) {
        plaintext = result
      } else if (typeof result === 'object' && result && 'plaintext' in result) {
        plaintext = result.plaintext as Uint8Array
      }
      
      if (!plaintext) return null
      
      // Decode the payload
      const abiCoder = ethers.AbiCoder.defaultAbiCoder()
      const decoded = abiCoder.decode(
        ['address', 'uint8', 'uint256', 'uint256', 'uint8', 'uint256'],
        plaintext
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