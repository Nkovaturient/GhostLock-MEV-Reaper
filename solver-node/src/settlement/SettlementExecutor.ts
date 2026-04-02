import { ethers } from 'ethers'
import { SolverBoardAbi } from '../abis/SolverBoard'
import { BatchSettlementAbi } from '../abis/BatchSettlement'
import { logger } from '../logger'
import type { Route } from '../types'

const SETTLEMENT_GAS_LIMIT = 500_000
const VERIFY_TIMEOUT_MS = 30_000

function encodeRoutes(routes: Route[]): string {
  return ethers.AbiCoder.defaultAbiCoder().encode(
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
}

export interface SettlementExecutorConfig {
  signer: ethers.Wallet
  solverBoardAddress: string
  batchSettlementAddress: string
  rpcUrls: string[]
}

export class SettlementExecutor {
  private config: SettlementExecutorConfig
  private solverBoard: ethers.Contract
  private batchSettlement: ethers.Contract
  private rpcIndex = 0

  constructor(config: SettlementExecutorConfig) {
    this.config = config
    this.solverBoard = new ethers.Contract(
      config.solverBoardAddress,
      SolverBoardAbi as unknown as ethers.InterfaceAbi,
      config.signer
    )
    this.batchSettlement = new ethers.Contract(
      config.batchSettlementAddress,
      BatchSettlementAbi as unknown as ethers.InterfaceAbi,
      config.signer
    )
  }

  async executeSettlement(batchId: number, routes: Route[]): Promise<string> {
    const encoded = encodeRoutes(routes)
    const routeHash = ethers.keccak256(encoded)
    const batch = await this.solverBoard.getBatch(batchId)
    if (batch.winningSolver !== this.config.signer.address) {
      throw new Error('Not the winning solver')
    }
    if (batch.settled) {
      throw new Error('Batch already settled')
    }

    try {
      const tx = await this.solverBoard.executeSettlement(batchId, encoded, {
        gasLimit: SETTLEMENT_GAS_LIMIT,
      })
      const receipt = await tx.wait(1)
      if (!receipt || receipt.status !== 1) {
        throw new Error('Settlement transaction reverted')
      }
      logger.info('Settlement executed', { txHash: tx.hash, batchId })

      const verified = await this.verifySettlement(batchId)
      if (!verified) {
        logger.warn('Settlement verification failed', { batchId })
      } else {
        logger.info('Settlement verified successfully', { batchId })
      }
      return tx.hash
    } catch (err) {
      logger.error('Settlement execution failed', {
        batchId,
        error: String(err),
      })
      throw err
    }
  }

  encodeRoutes(routes: Route[]): string {
    return encodeRoutes(routes)
  }

  async verifySettlement(batchId: number): Promise<boolean> {
    try {
      const batch = await Promise.race([
        this.solverBoard.getBatch(batchId),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error('Verify timeout')), VERIFY_TIMEOUT_MS)
        ),
      ])
      return batch?.settled === true
    } catch (err) {
      logger.debug('verifySettlement error', { batchId, error: String(err) })
      return false
    }
  }
}
