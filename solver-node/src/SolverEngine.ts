import { ethers } from 'ethers'
import { BatchMonitor } from './monitoring/BatchMonitor'
import { RouteOptimizer } from './routing/RouteOptimizer'
import { BidSubmitter } from './bidding/BidSubmitter'
import { SettlementExecutor } from './settlement/SettlementExecutor'
import { logger } from './logger'
import type { Solution } from './types'

export interface SolverEngineConfig {
  rpcUrls: string[]
  solverPrivateKey: string
  solverBoardAddress: string
  batchSettlementAddress: string
  solverRegistryAddress: string
  markets: Map<number, { baseToken: string; quoteToken: string }>
  quoterV2Address?: string
}

export class SolverEngine {
  private config: SolverEngineConfig
  private monitor: BatchMonitor
  private optimizer: RouteOptimizer
  private bidSubmitter: BidSubmitter
  private settlementExecutor: SettlementExecutor
  private wallet: ethers.Wallet
  private httpProvider: ethers.JsonRpcProvider
  private solutions = new Map<number, Solution>()
  private processedBatches = new Set<number>()
  private stopped = false

  constructor(config: SolverEngineConfig) {
    this.config = config
    this.httpProvider = new ethers.JsonRpcProvider(config.rpcUrls[0])
    this.wallet = new ethers.Wallet(config.solverPrivateKey, this.httpProvider)

    this.monitor = new BatchMonitor({
      rpcUrls: config.rpcUrls,
      solverBoardAddress: config.solverBoardAddress,
      batchSettlementAddress: config.batchSettlementAddress,
      markets: config.markets,
    })

    this.optimizer = new RouteOptimizer({
      provider: this.httpProvider,
      quoterV2Address: config.quoterV2Address,
    })

    this.bidSubmitter = new BidSubmitter({
      signer: this.wallet,
      solverBoardAddress: config.solverBoardAddress,
      rpcUrls: config.rpcUrls,
    })

    this.settlementExecutor = new SettlementExecutor({
      signer: this.wallet,
      solverBoardAddress: config.solverBoardAddress,
      batchSettlementAddress: config.batchSettlementAddress,
      rpcUrls: config.rpcUrls,
    })
  }

  async start(): Promise<void> {
    this.stopped = false
    logger.info('Solver node starting')

    this.monitor.on('BatchPublished', (payload: { batchId: number }) => {
      this.handleBatchPublished(payload).catch((err) => {
        logger.error('handleBatchPublished failed', {
          batchId: payload.batchId,
          error: String(err),
        })
      })
    })

    this.monitor.on('WinnerSelected', (payload: { batchId: number; solver: string }) => {
      this.handleWinnerSelected(payload).catch((err) => {
        logger.error('handleWinnerSelected failed', {
          batchId: payload.batchId,
          error: String(err),
        })
      })
    })

    await this.monitor.start()
    logger.info('Solver node running')
  }

  private async handleBatchPublished(payload: {
    batchId: number
    finalizedBlock?: number
    biddingDeadline?: number
  }): Promise<void> {
    const { batchId } = payload
    if (this.processedBatches.has(batchId)) {
      logger.warn('Batch already processed', { batchId })
      return
    }

    try {
      const intents = await this.monitor.fetchBatchIntents(batchId)
      logger.info('Optimizing intents', {
        event: 'batch_published',
        batchId,
        intentCount: intents.length,
      })

      if (intents.length === 0) {
        logger.info('No intents in batch, skipping', { batchId })
        this.processedBatches.add(batchId)
        return
      }

      const solution = await this.optimizer.optimize(intents)
      logger.info('Solution found', {
        batchId,
        totalSurplus: solution.totalSurplus.toString(),
        routeCount: solution.routes.length,
      })

      const isOpen = await this.checkBiddingOpen(batchId)
      if (!isOpen) {
        logger.warn('Bidding window closed', { batchId })
        this.processedBatches.add(batchId)
        return
      }

      if (solution.totalSurplus <= 0n) {
        logger.info('Insufficient surplus, skipping bid', { batchId })
        this.processedBatches.add(batchId)
        return
      }

      this.solutions.set(batchId, solution)
      logger.info('Submitting bid', { batchId })

      const txHash = await this.bidSubmitter.submitBid(
        batchId,
        solution.totalSurplus,
        solution.routes
      )
      logger.info('Bid confirmed', { batchId, txHash })
      this.processedBatches.add(batchId)
    } catch (err) {
      logger.error('Batch processing failed', { batchId, error: String(err) })
      if (
        String(err).includes('Bidding closed') ||
        String(err).includes('bidding window')
      ) {
        this.processedBatches.add(batchId)
      }
    }
  }

  private async handleWinnerSelected(payload: {
    batchId: number
    solver: string
    surplus?: bigint
  }): Promise<void> {
    const { batchId, solver } = payload
    const myAddress = this.wallet.address
    if (solver.toLowerCase() !== myAddress.toLowerCase()) {
      logger.info('Lost auction', { batchId, winner: solver })
      this.solutions.delete(batchId)
      return
    }

    logger.info('We won! Executing settlement', { event: 'winner_selected', batchId })

    const solution = this.solutions.get(batchId)
    if (!solution) {
      logger.error('No solution stored for batch', { batchId })
      return
    }

    const expectedHash = solution.routeHash
    const encoded = this.settlementExecutor.encodeRoutes(solution.routes)
    const actualHash = ethers.keccak256(encoded)
    if (actualHash !== expectedHash) {
      logger.error('Route hash mismatch, aborting execution', { batchId })
      return
    }

    try {
      const txHash = await this.settlementExecutor.executeSettlement(
        batchId,
        solution.routes
      )
      logger.info('Settlement executed', { batchId, txHash })
      this.solutions.delete(batchId)
    } catch (err) {
      logger.error('Settlement execution failed', {
        batchId,
        error: String(err),
      })
    }
  }

  private async checkBiddingOpen(batchId: number): Promise<boolean> {
    const provider = this.monitor.getProvider()
    if (!provider) return false
    const board = new ethers.Contract(
      this.config.solverBoardAddress,
      ['function isBiddingOpen(uint256 batchId) view returns (bool)'],
      provider
    )
    return board.isBiddingOpen(batchId)
  }

  async stop(): Promise<void> {
    this.stopped = true
    await this.monitor.stop()
    logger.info('Solver node stopped')
  }
}
