import { EventEmitter } from 'events'
import { ethers } from 'ethers'
import { SolverBoardAbi } from '../abis/SolverBoard'
import { BatchSettlementAbi } from '../abis/BatchSettlement'
import type { Intent, ContractIntent } from '../types'
import { logger } from '../logger'

const MAX_BACKOFF_MS = 60_000
const INITIAL_BACKOFF_MS = 1_000

function toContractIntent(raw: unknown): ContractIntent {
  if (Array.isArray(raw)) {
    return {
      user: String(raw[0] ?? ''),
      side: Number(raw[1] ?? 0),
      amount: BigInt(Number(raw[2]) || 0),
      limitPrice: BigInt(Number(raw[3]) || 0),
      marketId: Number(raw[4] ?? 0),
      epoch: BigInt(Number(raw[5]) || 0),
    }
  }
  const o = raw as Record<string, unknown>
  return {
    user: String(o.user ?? ''),
    side: Number(o.side ?? 0),
    amount: BigInt(Number(o.amount) || 0),
    limitPrice: BigInt(Number(o.limitPrice) || 0),
    marketId: Number(o.marketId ?? 0),
    epoch: BigInt(Number(o.epoch) || 0),
  }
}

function parseContractIntent(id: string, raw: ContractIntent, markets: Map<number, { baseToken: string; quoteToken: string }>): Intent {
  const market = markets.get(raw.marketId)
  const baseToken = market?.baseToken ?? ethers.ZeroAddress
  const quoteToken = market?.quoteToken ?? ethers.ZeroAddress
  const side: 'buy' | 'sell' = raw.side === 0 ? 'buy' : 'sell'
  const amountIn = raw.amount
  const limitPrice = raw.limitPrice
  const minAmountOut = side === 'buy' ? (amountIn * limitPrice) / BigInt(1e18) : amountIn
  return {
    id,
    user: raw.user,
    side,
    amount: raw.amount,
    limitPrice,
    marketId: raw.marketId,
    epoch: Number(raw.epoch),
    tokenIn: side === 'buy' ? quoteToken : baseToken,
    tokenOut: side === 'buy' ? baseToken : quoteToken,
    amountIn,
    minAmountOut,
  }
}

export interface BatchMonitorConfig {
  rpcUrls: string[]
  solverBoardAddress: string
  batchSettlementAddress: string
  markets: Map<number, { baseToken: string; quoteToken: string }>
}

export class BatchMonitor extends EventEmitter {
  private config: BatchMonitorConfig
  private provider: ethers.WebSocketProvider | null = null
  private solverBoard: ethers.Contract | null = null
  private batchSettlement: ethers.Contract | null = null
  private rpcIndex = 0
  private backoffMs = INITIAL_BACKOFF_MS
  private stopped = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(config: BatchMonitorConfig) {
    super()
    this.config = config
  }

  async start(): Promise<void> {
    this.stopped = false
    await this.connect()
  }

  private async connect(): Promise<void> {
    const url = this.config.rpcUrls[this.rpcIndex]
    try {
      this.provider = new ethers.WebSocketProvider(url)
      this.solverBoard = new ethers.Contract(
        this.config.solverBoardAddress,
        SolverBoardAbi as unknown as ethers.InterfaceAbi,
        this.provider
      )
      this.batchSettlement = new ethers.Contract(
        this.config.batchSettlementAddress,
        BatchSettlementAbi as unknown as ethers.InterfaceAbi,
        this.provider
      )

      this.provider.on('error', (err) => {
        logger.error('WebSocket error', { error: String(err) })
      })

      const ws = (this.provider as unknown as { websocket?: { onclose?: () => void; addEventListener?(ev: string, fn: () => void): void } }).websocket
      if (ws) {
        if ('onclose' in ws) (ws as { onclose: () => void }).onclose = () => {
          if (this.stopped) return
          logger.warn('WebSocket closed, reconnecting', { backoffMs: this.backoffMs })
          this.scheduleReconnect()
        }
        else if (ws.addEventListener) ws.addEventListener('close', () => {
          if (this.stopped) return
          logger.warn('WebSocket closed, reconnecting', { backoffMs: this.backoffMs })
          this.scheduleReconnect()
        })
      }

      this.solverBoard.on('BatchPublished', (batchId: bigint, finalizedBlock: bigint, biddingDeadline: bigint) => {
        this.emit('BatchPublished', {
          batchId: Number(batchId),
          finalizedBlock: Number(finalizedBlock),
          biddingDeadline: Number(biddingDeadline),
        })
        logger.info('New batch published', {
          event: 'batch_published',
          batchId: Number(batchId),
          finalizedBlock: Number(finalizedBlock),
          biddingDeadline: Number(biddingDeadline),
        })
      })

      this.solverBoard.on('WinnerSelected', (batchId: bigint, solver: string, surplus: bigint) => {
        this.emit('WinnerSelected', {
          batchId: Number(batchId),
          solver,
          surplus,
        })
        logger.info('Winner selected', {
          event: 'winner_selected',
          batchId: Number(batchId),
          winner: solver,
          surplus: surplus.toString(),
        })
      })

      this.backoffMs = INITIAL_BACKOFF_MS
      logger.info('Connected to WebSocket')
      logger.info('Listening for BatchPublished events')
    } catch (err) {
      logger.error('WebSocket connection failed', { error: String(err), url })
      if (this.stopped) return
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.stopped) return
      this.cleanupProvider()
      this.rpcIndex = (this.rpcIndex + 1) % this.config.rpcUrls.length
      this.connect()
      this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS)
    }, this.backoffMs)
  }

  private cleanupProvider(): void {
    if (this.provider) {
      try {
        this.provider.destroy()
      } catch (_) {}
      this.provider = null
    }
    this.solverBoard = null
    this.batchSettlement = null
  }

  async fetchBatchIntents(batchId: number): Promise<Intent[]> {
    const settlement = this.batchSettlement
    const provider = this.provider
    if (!settlement || !provider) {
      throw new Error('Monitor not connected')
    }
    let intentIds: bigint[]
    try {
      intentIds = await settlement.getBatchIntents(batchId)
    } catch (err) {
      logger.error('getBatchIntents failed', { batchId, error: String(err) })
      throw err
    }
    if (!intentIds || intentIds.length === 0) {
      return []
    }
    const intents: Intent[] = []
    for (const id of intentIds) {
      try {
        const raw = await settlement.getIntent(id)
        if (raw === undefined || raw === null) continue
        intents.push(parseContractIntent(String(id), toContractIntent(raw), this.config.markets))
      } catch (err) {
        logger.warn('getIntent failed for intent', { intentId: String(id), error: String(err) })
      }
    }
    return intents
  }

  getProvider(): ethers.WebSocketProvider | null {
    return this.provider
  }

  async stop(): Promise<void> {
    this.stopped = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.cleanupProvider()
    logger.info('BatchMonitor stopped')
  }
}
