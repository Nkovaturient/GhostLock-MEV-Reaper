/**
 * solver.js — GhostLock/HolmeSwap SolverBoard orchestrator
 *
 * Flow per batch (EQUALIZE layer via SolverBoard):
 *   1. Scan for published batches (BatchPublished events)
 *   2. For each batch with sufficient intents:
 *      a. Ensure VRF epoch seed (RANDOMIZE layer)
 *      b. Compute clearing price (ENCRYPT layer output)
 *      c. registerBatchValue(batchId, value)
 *      d. submitBid(batchId, totalSurplus, routeHash)
 *      e. Wait: BIDDING_WINDOW_BLOCKS + WINNER_SELECTION_BUFFER_BLOCKS
 *      f. selectWinner(batchId)          ← owner of SolverBoard
 *      g. executeSettlement(batchId, routes, payloads, epoch, marketId, clearingPrice)
 *   3. Express Relay: if enabled and supported, try relay first; else SolverBoard path.
 */

const { ethers } = require('ethers')
const { CONFIG, ABIS, MARKETS } = require('../config.js')
const { fetchDecryptedIntents, groupIntentsByMarketEpoch, filterRealIntents } = require('./intents.js')
const { computeUniformClearingPrice } = require('./price.js')
const {
  buildIntentPayloads,
  registerBatchValueTx,
  submitBidTx,
  selectWinnerTx,
  executeSettlementTx,
  expireBatchTx,
  isBatchReadyForSettlement,
  validateBatchConsistency,
  createSolverSigner,
} = require('./settlement.js')
const { submitOpportunity, encodeSettlementCalldata } = require('../express-relay.js')
const db = require('../utils/db.js')

const ZERO_SEED = '0x' + '00'.repeat(32)

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

class SolverService {
  constructor() {
    this.provider  = new ethers.JsonRpcProvider(CONFIG.NETWORK.RPC_URL)
    this.signer   = null
    this.isRunning = false
    this.epochRNGContract = null
    this.requestedEpochs  = new Set()

    this.stats = {
      totalSettlements:         0,
      solverBoardSettlements:   0,
      expressRelaySettlements:   0,
      lastError:                null,
      lastSettledAt:            null,
    }
  }

  async initialize() {
    if (CONFIG.SOLVER.PRIVATE_KEY) {
      this.signer = createSolverSigner()
      console.log(`[solver] Signer: ${await this.signer.getAddress()}`)
    } else {
      console.warn('[solver] No SOLVER_PRIVATE_KEY — read-only mode')
    }
    await this._verifyContracts()
    console.log('[solver] Service initialized')
  }

  async start() {
    if (this.isRunning) return
    this.isRunning = true
    console.log('[solver] Starting...')
    this._settlementLoop()
    this._healthLoop()
  }

  stop() {
    this.isRunning = false
    console.log('[solver] Stopped')
  }

  async _settlementLoop() {
    while (this.isRunning) {
      try {
        await this.processSettlements()
      } catch (err) {
        this.stats.lastError = err.message
        console.error('[solver] settlement loop error:', err.message)
      }
      await sleep(CONFIG.SCHEDULER.SETTLEMENT_CHECK_INTERVAL_MS)
    }
  }

  async processSettlements() {
    const batches = await this._findActiveBatches()
    if (!batches.length) {
      console.log('[solver] No active batches found')
      return
    }

    for (const batch of batches) {
      try {
        await this._processBatch(batch)
      } catch (err) {
        console.error(`[solver] Error processing batch ${batch.batchId}:`, err.message)
      }
    }
  }

  async _findActiveBatches() {
    try {
      const board = new ethers.Contract(
        CONFIG.CONTRACTS.SOLVER_BOARD,
        ABIS.SOLVER_BOARD_ABI,
        this.provider
      )

      const currentBlock = await this.provider.getBlockNumber()
      const fromBlock = Math.max(0, currentBlock - 500)

      const filter = board.filters.BatchPublished()
      const events = await board.queryFilter(filter, fromBlock, currentBlock)

      const batches = []
      for (const ev of events) {
        const batchId    = Number(ev.args?.batchId)
        const finalizedBlock = Number(ev.args?.finalizedBlock)
        const biddingDeadline = Number(ev.args?.biddingDeadline)

        const settled = await board.getBatch(batchId).then(b => b[6]).catch(() => true)
        if (settled) continue

        const marketId = this._inferMarketIdFromBatch(batchId)
        const epoch    = finalizedBlock > 0
          ? Math.floor(finalizedBlock / CONFIG.AUCTION.EPOCH_DURATION_BLOCKS)
          : Math.floor(currentBlock / CONFIG.AUCTION.EPOCH_DURATION_BLOCKS)

        batches.push({ batchId, marketId, epoch, finalizedBlock, biddingDeadline, currentBlock })
      }

      return batches
    } catch (err) {
      console.error('[solver] _findActiveBatches error:', err.message)
      return []
    }
  }

  _inferMarketIdFromBatch(batchId) {
    return 0
  }

  async _processBatch(batch) {
    const { batchId, marketId, epoch, biddingDeadline, currentBlock } = batch

    const intents = await this._fetchIntentsForBatch(marketId, epoch)
    if (!intents.length) return

    const realIntents = filterRealIntents(intents)
    if (realIntents.length < CONFIG.AUCTION.MIN_INTENTS_FOR_SETTLEMENT) {
      console.log(`[solver] Batch ${batchId}: not enough real intents (${realIntents.length})`)
      return
    }

    const validation = validateBatchConsistency(realIntents)
    if (!validation.isValid) {
      console.warn(`[solver] Batch ${batchId} invalid: ${validation.reason}`)
      return
    }

    const ready = await isBatchReadyForSettlement(this.provider, realIntents)
    if (!ready) {
      console.log(`[solver] Batch ${batchId}: not ready for settlement`)
      return
    }

    const seed = await this.ensureEpochSeed(epoch)
    if (!seed || seed === ZERO_SEED) {
      console.warn(`[solver] Batch ${batchId}: epoch seed unavailable, skipping`)
      return
    }

    realIntents.sort((a, b) => this._compareBySeed(seed, a, b))

    const market = MARKETS[marketId]
    if (!market) {
      console.warn(`[solver] Unknown marketId: ${marketId}`)
      return
    }

    const symbol       = `${market.base}-${market.quote}`
    const priceResult  = await computeUniformClearingPrice(realIntents, symbol, seed)
    if (!priceResult.clearingPrice || priceResult.clearingPrice === 0n) {
      console.warn(`[solver] Batch ${batchId}: no valid clearing price`)
      return
    }

    console.log(`[solver] Batch ${batchId} | price=${priceResult.clearingPrice} method=${priceResult.method} intents=${realIntents.length}`)

    const batchValue    = this._computeBatchValue(realIntents, priceResult.clearingPrice)
    const totalSurplus  = this._computeTotalSurplus(realIntents, priceResult.clearingPrice)
    const batchKey      = `${marketId}-${epoch}`

    if (CONFIG.EXPRESS_RELAY.ENABLED) {
      const settled = await this._tryExpressRelay(batchKey, realIntents, epoch, marketId, priceResult.clearingPrice)
      if (settled) {
        this.stats.expressRelaySettlements++
        this.stats.totalSettlements++
        this.stats.lastSettledAt = new Date().toISOString()
        db.markIntentsProcessed(realIntents.map(i => i.requestId))
        db.markSettlementDone(batchKey)
        return
      }
    }

    await this._solveViaSolverBoard(batchId, realIntents, epoch, marketId, priceResult.clearingPrice, batchValue, totalSurplus, batchKey)
  }

  async _solveViaSolverBoard(batchId, intents, epoch, marketId, clearingPrice, batchValue, totalSurplus, batchKey) {
    if (!this.signer) {
      console.warn(`[solver] Batch ${batchId}: no signer`)
      return
    }

    try {
      db.upsertSettlement(batchKey, epoch, marketId, intents.map(i => i.requestId), 'solving')

      await registerBatchValueTx(this.signer, BigInt(batchId), batchValue)

      const routeHash = ethers.keccak256(ethers.toUtf8Bytes(''))
      await submitBidTx(this.signer, BigInt(batchId), totalSurplus, routeHash)

      const BIDDING_WINDOW = Number(await this._getSolverBoardConstant('BIDDING_WINDOW_BLOCKS', 10))
      const BUFFER         = Number(await this._getSolverBoardConstant('WINNER_SELECTION_BUFFER_BLOCKS', 3))
      const waitBlocks    = BIDDING_WINDOW + BUFFER

      console.log(`[solver] Batch ${batchId}: waiting ${waitBlocks} blocks for bidding window + buffer...`)
      const blockTime = CONFIG.NETWORK.BLOCK_TIME_SECONDS * 1000
      await sleep(waitBlocks * blockTime)

      await selectWinnerTx(this.signer, BigInt(batchId))

      const receipt = await executeSettlementTx(
        this.signer, BigInt(batchId), intents, epoch, marketId, clearingPrice
      )

      this.stats.solverBoardSettlements++
      this.stats.totalSettlements++
      this.stats.lastSettledAt = new Date().toISOString()
      db.markIntentsProcessed(intents.map(i => i.requestId))
      db.markSettlementDone(batchKey)
      console.log(`[solver] Batch ${batchId} settled via SolverBoard in block ${receipt.blockNumber} ✓`)

    } catch (err) {
      db.upsertSettlement(batchKey, epoch, marketId, intents.map(i => i.requestId), 'failed')
      console.error(`[solver] Batch ${batchId} SolverBoard settlement failed:`, err.message)
      this.stats.lastError = err.message
    }
  }

  async _getSolverBoardConstant(name, fallback) {
    try {
      const board = new ethers.Contract(CONFIG.CONTRACTS.SOLVER_BOARD, ABIS.SOLVER_BOARD_ABI, this.provider)
      return await board[name]()
    } catch {
      return fallback
    }
  }

  async _fetchIntentsForBatch(marketId, epoch) {
    try {
      const lastBlock    = Number(db.getKv("ghostlock:lastEventBlock") || 0)
      if (!lastBlock) return []

      const currentBlock = await this.provider.getBlockNumber()
      const fromBlock     = Math.max(0, lastBlock - 2000)
      const intents       = await fetchDecryptedIntents(this.provider, fromBlock, currentBlock, epoch)

      return intents.filter(i => i.marketId === marketId)
    } catch (err) {
      console.error('[solver] _fetchIntentsForBatch error:', err.message)
      return []
    }
  }

  _computeBatchValue(intents, clearingPrice) {
    let totalBuyValue = 0n
    let totalSellValue = 0n
    for (const intent of intents) {
      const notional = intent.amount * clearingPrice
      if (intent.side === 0) totalBuyValue  += notional
      else                    totalSellValue += notional
    }
    return totalBuyValue < totalSellValue ? totalBuyValue : totalSellValue
  }

  _computeTotalSurplus(intents, clearingPrice) {
    let surplus = 0n
    for (const intent of intents) {
      if (intent.side === 0 && clearingPrice <= intent.limitPrice) {
        surplus += (intent.limitPrice - clearingPrice) * intent.amount
      } else if (intent.side === 1 && clearingPrice >= intent.limitPrice) {
        surplus += (clearingPrice - intent.limitPrice) * intent.amount
      }
    }
    return surplus
  }

  async _tryExpressRelay(batchKey, intents, epoch, marketId, clearingPrice) {
    try {
      const payloads = buildIntentPayloads(intents)
      const calldata = ethers.AbiCoder.defaultAbiCoder().encode(
        ['tuple(uint256,bytes)[]', 'uint256', 'uint8', 'uint256'],
        [payloads.map(p => [p.requestId, p.plaintext]), epoch, marketId, clearingPrice]
      )

      const submitted = await submitOpportunity({
        batchKey,
        targetContract: CONFIG.CONTRACTS.BATCH_SETTLEMENT,
        calldata,
        chainId: String(CONFIG.NETWORK.CHAIN_ID),
      })

      if (!submitted) return false

      console.log(`[solver] Express Relay submitted for batch ${batchKey}, waiting...`)
      const blockTime   = CONFIG.NETWORK.BLOCK_TIME_SECONDS * 1000
      const startBlock  = await this.provider.getBlockNumber()
      const deadline    = startBlock + CONFIG.EXPRESS_RELAY.FALLBACK_DELAY_BLOCKS

      while (true) {
        await sleep(blockTime)
        const currentBlock = await this.provider.getBlockNumber()
        if (currentBlock >= deadline) break
        if (await this._isBatchSettled(intents.map(i => i.requestId))) return true
      }

      return await this._isBatchSettled(intents.map(i => i.requestId))
    } catch (err) {
      console.warn('[solver] Express Relay error:', err.message)
      return false
    }
  }

  async _isBatchSettled(requestIds) {
    try {
      const contract = new ethers.Contract(
        CONFIG.CONTRACTS.BATCH_SETTLEMENT,
        ABIS.BATCH_SETTLEMENT_ABI,
        this.provider
      )
      const checks = await Promise.all(
        requestIds.map(id => contract.settledIntent(id).catch(() => false))
      )
      return checks.every(Boolean)
    } catch {
      return false
    }
  }

  async ensureEpochSeed(epoch) {
    try {
      let seed = await this._fetchEpochSeed(epoch)
      if (seed && seed !== ZERO_SEED) return seed

      if (!this.requestedEpochs.has(epoch)) {
        await this._requestEpochSeed(epoch)
        this.requestedEpochs.add(epoch)
      }

      return await this._waitForEpochSeed(epoch)
    } catch (err) {
      console.error(`[solver] ensureEpochSeed(${epoch}) error:`, err.message)
      return ZERO_SEED
    }
  }

  async _fetchEpochSeed(epoch) {
    if (!this.epochRNGContract) {
      this.epochRNGContract = new ethers.Contract(
        CONFIG.CONTRACTS.EPOCH_RNG, ABIS.EPOCH_RNG_ABI, this.provider
      )
    }
    try {
      return await this.epochRNGContract.epochSeed(epoch)
    } catch (e) {
      return ZERO_SEED
    }
  }

  async _requestEpochSeed(epoch) {
    if (!this.signer) throw new Error('No signer — cannot request epoch seed')

    const rng = new ethers.Contract(CONFIG.CONTRACTS.EPOCH_RNG, ABIS.EPOCH_RNG_ABI, this.signer)

    try {
      const existing = await rng.epochSeed(epoch)
      if (existing !== ZERO_SEED) {
        console.log(`[solver] Seed for epoch ${epoch} already exists`)
        return
      }
    } catch {}

    const currentBlock = await this.provider.getBlockNumber()
    const currentEpoch = Math.floor(currentBlock / CONFIG.AUCTION.EPOCH_DURATION_BLOCKS)
    if (epoch > currentEpoch + 1) {
      console.warn(`[solver] Cannot request seed for future epoch ${epoch}`)
      return
    }

    const tx = await rng.requestEpochSeed(epoch, CONFIG.SOLVER.EPOCH_SEED_GAS_LIMIT, {
      value:                ethers.parseEther('0.001'),
      maxFeePerGas:         ethers.parseUnits('0.2', 'gwei'),
      maxPriorityFeePerGas: ethers.parseUnits('0.05', 'gwei'),
    })
    console.log(`[solver] requestEpochSeed(${epoch}): ${tx.hash}`)
    const receipt = await tx.wait()
    if (receipt.status === 0) throw new Error(`EpochRNG tx reverted for epoch ${epoch}`)
  }

  async _waitForEpochSeed(epoch, maxWaitMs = 300_000, pollMs = 10_000) {
    const deadline = Date.now() + maxWaitMs
    while (Date.now() < deadline) {
      const seed = await this._fetchEpochSeed(epoch)
      if (seed && seed !== ZERO_SEED) return seed
      await sleep(pollMs)
    }
    console.warn(`[solver] Timeout waiting for epoch ${epoch} seed`)
    return ZERO_SEED
  }

  _compareBySeed(seed, a, b) {
    const hash = (intent) => ethers.keccak256(ethers.concat([
      ethers.getBytes(seed),
      ethers.zeroPadValue(ethers.toBeHex(intent.requestId), 32),
      ethers.zeroPadValue(ethers.getBytes(intent.user), 32),
    ]))
    const ha = hash(a), hb = hash(b)
    return ha < hb ? -1 : ha > hb ? 1 : 0
  }

  async _healthLoop() {
    while (this.isRunning) {
      try {
        const block    = await this.provider.getBlockNumber()
        const balance  = this.signer
          ? await this.provider.getBalance(await this.signer.getAddress())
          : 0n
        const balEth   = ethers.formatEther(balance)
        console.log(`[health] block=${block} balance=${balEth} ETH`)
        if (this.signer && balance < ethers.parseEther('0.01')) {
          console.warn('[health] Solver balance low — replenish soon')
        }
      } catch (err) {
        console.error('[health] check failed:', err.message)
      }
      await sleep(CONFIG.SCHEDULER.HEALTH_CHECK_INTERVAL_MS)
    }
  }

  async _verifyContracts() {
    const toCheck = [
      ['GhostLockLiveness',  CONFIG.CONTRACTS.GHOSTLOCK_LIVENESS],
      ['BatchSettlement',    CONFIG.CONTRACTS.BATCH_SETTLEMENT],
      ['EpochRNG',           CONFIG.CONTRACTS.EPOCH_RNG],
      ['SolverBoard',        CONFIG.CONTRACTS.SOLVER_BOARD],
      ['SolverRegistry',     CONFIG.CONTRACTS.SOLVER_REGISTRY],
    ]
    for (const [name, addr] of toCheck) {
      const code = await this.provider.getCode(addr)
      if (code === '0x') throw new Error(`Contract ${name} not found at ${addr}`)
      console.log(`[solver] ✓ ${name}`)
    }
    this.epochRNGContract = new ethers.Contract(
      CONFIG.CONTRACTS.EPOCH_RNG, ABIS.EPOCH_RNG_ABI, this.provider
    )
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      hasSigner: !!this.signer,
      stats: this.stats,
      config: {
        chainId:            CONFIG.NETWORK.CHAIN_ID,
        settlementInterval: CONFIG.SCHEDULER.SETTLEMENT_CHECK_INTERVAL_MS,
        expressRelayEnabled: CONFIG.EXPRESS_RELAY.ENABLED,
        solverBoardEnabled: true,
      },
    }
  }
}

const solverService = new SolverService()
module.exports = { solverService }
