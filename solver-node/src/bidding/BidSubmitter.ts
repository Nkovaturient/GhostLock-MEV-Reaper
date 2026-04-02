import { ethers } from 'ethers'
import { SolverBoardAbi } from '../abis/SolverBoard'
import { logger } from '../logger'
import type { Route } from '../types'

const GAS_BUFFER_BPS = 1200
const MAX_RETRIES = 3
const RETRY_BACKOFF_BASE_MS = 2_000
const MAX_GAS_PRICE_GWEI = 150

function hashRoutes(routes: Route[]): string {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    [
      'tuple(uint256 intentId, string dex, address[] path, uint256 amountIn, uint256 amountOut)[]',
    ],
    [
      routes.map((r) => [
        BigInt(r.intentId),
        r.dex,
        r.path,
        r.amountIn,
        r.amountOut,
      ]),
    ]
  )
  return ethers.keccak256(encoded)
}

export interface BidSubmitterConfig {
  signer: ethers.Wallet
  solverBoardAddress: string
  rpcUrls: string[]
}

export class BidSubmitter {
  private config: BidSubmitterConfig
  private solverBoard: ethers.Contract
  private rpcIndex = 0

  constructor(config: BidSubmitterConfig) {
    this.config = config
    this.solverBoard = new ethers.Contract(
      config.solverBoardAddress,
      SolverBoardAbi as unknown as ethers.InterfaceAbi,
      config.signer
    )
  }

  async submitBid(
    batchId: number,
    totalSurplus: bigint,
    routes: Route[]
  ): Promise<string> {
    const routeHash = hashRoutes(routes)
    const isOpen = await (this.solverBoard as ethers.Contract).isBiddingOpen(batchId)
    if (!isOpen) {
      throw new Error(`Bidding closed for batch ${batchId}`)
    }

    let lastErr: Error | null = null
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const tx = await this.buildAndSendBid(batchId, totalSurplus, routeHash)
        const receipt = await this.waitForConfirmation(tx.hash)
        if (receipt && receipt.status === 1) {
          logger.info('Bid confirmed', { txHash: tx.hash, batchId })
          return tx.hash
        }
        lastErr = new Error('Transaction reverted')
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err))
        logger.warn('Bid submission attempt failed', {
          attempt: attempt + 1,
          batchId,
          error: lastErr.message,
        })
        if (attempt < MAX_RETRIES - 1) {
          const backoff = RETRY_BACKOFF_BASE_MS * Math.pow(2, attempt)
          await new Promise((r) => setTimeout(r, backoff))
          await this.rotateProviderIfNeeded(lastErr)
        }
      }
    }
    throw lastErr ?? new Error('Bid submission failed')
  }

  private async buildAndSendBid(
    batchId: number,
    totalSurplus: bigint,
    routeHash: string
  ): Promise<ethers.TransactionResponse> {
    const gasLimit = await this.estimateGas(batchId, totalSurplus, routeHash)
    const feeData = await this.config.signer.provider!.getFeeData()
    let gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? 0n
    const maxGwei = BigInt(MAX_GAS_PRICE_GWEI) * BigInt(1e9)
    if (gasPrice > maxGwei) gasPrice = maxGwei

    const tx = await (this.solverBoard as ethers.Contract).submitBid(batchId, totalSurplus, routeHash, {
      gasLimit,
      gasPrice,
    })
    return tx
  }

  async estimateGas(
    batchId: number,
    totalSurplus: bigint,
    routeHash: string
  ): Promise<bigint> {
    const raw = await (this.solverBoard as ethers.Contract).submitBid.estimateGas(
      batchId,
      totalSurplus,
      routeHash
    )
    return (raw * BigInt(GAS_BUFFER_BPS)) / 1000n
  }

  async waitForConfirmation(
    txHash: string
  ): Promise<ethers.TransactionReceipt | null> {
    const provider = this.config.signer.provider
    if (!provider) return null
    try {
      const receipt = await provider.waitForTransaction(txHash, 1, 60_000)
      return receipt
    } catch (err) {
      logger.warn('Wait for confirmation failed', { txHash, error: String(err) })
      return null
    }
  }

  private async rotateProviderIfNeeded(err: Error): Promise<void> {
    const msg = err.message.toLowerCase()
    if (msg.includes('timeout') || msg.includes('network') || msg.includes('econnrefused')) {
      this.rpcIndex = (this.rpcIndex + 1) % this.config.rpcUrls.length
      const url = this.config.rpcUrls[this.rpcIndex]
      const provider = new ethers.JsonRpcProvider(url)
      this.config.signer = this.config.signer.connect(provider) as ethers.Wallet
      this.solverBoard = this.solverBoard.connect(this.config.signer) as ethers.Contract
      logger.info('Switched to fallback RPC', { index: this.rpcIndex })
    }
  }
}
