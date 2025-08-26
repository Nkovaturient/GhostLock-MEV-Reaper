import { ethers } from 'ethers'

// Blocklock integration types and utilities
export interface BlocklockCiphertext {
  data: string
  commitment: string
}

export interface IntentPayload {
  market: string
  side: 'buy' | 'sell'
  amount: string
  limitPrice: string
  marketId: number
  epoch: number
}

export class BlocklockService {
  private signer: ethers.Signer
  private chainId: number

  constructor(signer: ethers.Signer, chainId: number) {
    this.signer = signer
    this.chainId = chainId
  }

  async encryptIntent(payload: IntentPayload, unlockBlock: number): Promise<BlocklockCiphertext> {
    try {
      // Import blocklock-js dynamically
      const { Blocklock } = await import('blocklock-js')
      
      // Create blocklock instance
      const blocklock = Blocklock.createFromChainId(this.signer, this.chainId)
      
      // Encode the payload
      const abiCoder = ethers.AbiCoder.defaultAbiCoder()
      const encodedPayload = abiCoder.encode(
        ['string', 'string', 'string', 'string', 'uint8', 'uint256'],
        [payload.market, payload.side, payload.amount, payload.limitPrice, payload.marketId, payload.epoch]
      )
      
      // Encrypt the payload
      const ciphertext = await blocklock.encrypt(
        ethers.getBytes(encodedPayload),
        BigInt(unlockBlock)
      )
      
      // Return in expected format
      if (typeof ciphertext === 'string') {
        return {
          data: ciphertext,
          commitment: ethers.keccak256(ciphertext)
        }
      } else if (ciphertext instanceof Uint8Array) {
        const hexData = ethers.hexlify(ciphertext)
        return {
          data: hexData,
          commitment: ethers.keccak256(hexData)
        }
      } else {
        throw new Error('Invalid ciphertext format from blocklock-js')
      }
    } catch (error) {
      console.error('Blocklock encryption error:', error)
      throw new Error('Failed to encrypt intent with blocklock')
    }
  }

  async tryDecryptIntent(ciphertext: string, currentBlock: number): Promise<IntentPayload | null> {
    try {
      // Import blocklock-js dynamically
      const { decrypt } = await import('blocklock-js')
      
      // Attempt decryption
      const result = await decrypt({
        ciphertext: ciphertext as `0x${string}`,
        currentBlock: BigInt(currentBlock)
      })
      
      let plaintext: Uint8Array | null = null
      
      if (result instanceof Uint8Array) {
        plaintext = result
      } else if (typeof result === 'object' && result.plaintext) {
        plaintext = result.plaintext as Uint8Array
      }
      
      if (!plaintext) return null
      
      // Decode the payload
      const abiCoder = ethers.AbiCoder.defaultAbiCoder()
      const decoded = abiCoder.decode(
        ['string', 'string', 'string', 'string', 'uint8', 'uint256'],
        plaintext
      )
      
      return {
        market: decoded[0],
        side: decoded[1] as 'buy' | 'sell',
        amount: decoded[2],
        limitPrice: decoded[3],
        marketId: Number(decoded[4]),
        epoch: Number(decoded[5])
      }
    } catch (error) {
      console.error('Blocklock decryption error:', error)
      return null
    }
  }

  static createCondition(unlockBlock: number): string {
    // Create block-based condition for blocklock
    const abiCoder = ethers.AbiCoder.defaultAbiCoder()
    return abiCoder.encode(['uint256'], [unlockBlock])
  }
}

export function formatIntentId(id: string | number): string {
  return `#${String(id).padStart(6, '0')}`
}

export function getIntentStatusColor(status: string): string {
  switch (status) {
    case 'Pending':
      return 'text-yellow-400'
    case 'Ready':
      return 'text-blue-400'
    case 'Settled':
      return 'text-green-400'
    default:
      return 'text-gray-400'
  }
}