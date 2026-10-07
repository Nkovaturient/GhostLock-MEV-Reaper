/**
 * solver.js — GhostLock/HolmeSwap SolverBoard orchestrator (canonical solver)
 *
 * This module replaces the standalone solver-node prototype. It runs inside the
 * Express server, owns the SolverBoard keeper flow (register value → bid → select
 * winner → execute), and handles drand epoch seeding plus optional Express Relay.
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
const {
  fetchDecryptedIntents,
  fetchIntentsFromDb,
  groupIntentsByMarketEpoch,
  filterRealIntents,
} = require('./intents.js')
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
const { getPublicProvider, getLogsProvider } = require('../utils/rpc.js')

const ZERO_SEED = '0x' + '00'.repeat(32)

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

class SolverService {
  constructor() {
    this.provider = getPublicProvider()
    this.logsProvider = getLogsProvider()
    this.signer   = null
    this.isRunning = false
    this.epochRNGContract = null
    this.requestedEpochs  = new Set()
    this.warnedDrandEpochs = new Set()
    this.surplusRetryAt = new Map()
    this.unfilledEpochs = new Set()
    this.lastBatchResult = null

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
    await this._ensureSolverRegistered()
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
    await this._processPendingIntentGroups()

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

  /** Deterministic batch id for (marketId, intent epoch) groups from IntentWatcher DB. */
  _batchIdFromMarketEpoch(marketId, epoch) {
    return marketId * 10_000_000_000 + epoch
  }

  /** True when epoch maps to a drand evmnet round that is not emitted yet (legacy block/100 intents). */
  async _isDrandRoundUnavailable(epoch) {
    try {
      if (!this.epochRNGContract) {
        this.epochRNGContract = new ethers.Contract(
          CONFIG.CONTRACTS.EPOCH_RNG, ABIS.EPOCH_RNG_ABI, this.provider
        )
      }
      const drandRound = await this.epochRNGContract.roundForEpoch(BigInt(epoch))
      const drand = await import('../../shared/drand.js')
      const dueSec = drand.timeOfRound(Number(drandRound), drand.DRAND_EVMNET)
      const nowSec = Math.floor(Date.now() / 1000)
      if (dueSec <= nowSec + 15) return false

      if (!this.warnedDrandEpochs.has(epoch)) {
        this.warnedDrandEpochs.add(epoch)
        console.warn(
          `[solver] Epoch ${epoch} → drand round ${drandRound} not due until ${new Date(dueSec * 1000).toISOString()} ` +
          `(HTTP 425 from relays). Intents with block/100 epochs cannot settle — submit a new swap with drand-aligned epoch.`
        )
        // #region agent log
        fetch('http://127.0.0.1:7863/ingest/1c9654de-6579-4cb1-ad7e-6ea69c8510bd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'983fd8'},body:JSON.stringify({sessionId:'983fd8',hypothesisId:'H3',location:'solver.js:_isDrandRoundUnavailable',message:'drand round in future',data:{epoch,drandRound:String(drandRound),dueSec,nowSec},timestamp:Date.now(),runId:'post-fix'})}).catch(()=>{});
        // #endregion
      }
      return true
    } catch (err) {
      console.warn(`[solver] _isDrandRoundUnavailable(${epoch}):`, err.message)
      return false
    }
  }

  /**
   * Drive settlement from SQLite pending_intents — HolmeSwap does not pre-publish SolverBoard batches.
   */
  async _processPendingIntentGroups() {
    const intents = await fetchIntentsFromDb(CONFIG.SOLVER.MAX_BATCH_PULL)
    if (!intents.length) return

    const groups = groupIntentsByMarketEpoch(intents)
    const groupKeys = Object.keys(groups)
    // #region agent log
    fetch('http://127.0.0.1:7863/ingest/1c9654de-6579-4cb1-ad7e-6ea69c8510bd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'983fd8'},body:JSON.stringify({sessionId:'983fd8',hypothesisId:'H1',location:'solver.js:_processPendingIntentGroups',message:'pending intent groups',data:{groupCount:groupKeys.length,requestIds:intents.map(i=>String(i.requestId)).slice(0,5)},timestamp:Date.now(),runId:'pre-fix'})}).catch(()=>{});
    // #endregion

    const currentBlock = await this.provider.getBlockNumber()
    for (const batchKey of groupKeys) {
      const realIntents = filterRealIntents(groups[batchKey])
      if (realIntents.length < CONFIG.AUCTION.MIN_INTENTS_FOR_SETTLEMENT) continue

      const { marketId, epoch } = realIntents[0]
      const batchId = this._batchIdFromMarketEpoch(marketId, epoch)

      if (await this._isDrandRoundUnavailable(epoch)) {
        continue
      }

      if (await this._isBatchSettled(realIntents.map(i => i.requestId))) {
        db.markIntentsProcessed(realIntents.map(i => i.requestId))
        db.markSettlementDone(batchKey)
        continue
      }

      const solvingRow = db.getSettlementsByStatus('solving').find(s => s.batch_key === batchKey)
      if (solvingRow) {
        const lastAttempt = Number(solvingRow.last_attempt || 0)
        const ageSec = Math.floor(Date.now() / 1000) - lastAttempt
        // Bidding window wait is ~26 blocks; allow retry if a prior run stalled mid-flight.
        if (ageSec < 120) continue
      }

      try {
        console.log(
          `[solver] Pending group ${batchKey} → batchId=${batchId} intents=${realIntents.length}`
        )
        await this._processBatch(
          { batchId, marketId, epoch, biddingDeadline: 0, currentBlock },
          realIntents,
        )
      } catch (err) {
        console.error(`[solver] Pending group ${batchKey} error:`, err.message)
      }
    }
  }

  async _findActiveBatches() {
    try {
      const board = new ethers.Contract(
        CONFIG.CONTRACTS.SOLVER_BOARD,
        ABIS.SOLVER_BOARD_ABI,
        this.logsProvider
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

  async _processBatch(batch, intentsOverride = null) {
    const { batchId, marketId, epoch, biddingDeadline, currentBlock } = batch
    if (Date.now() < (this.surplusRetryAt.get(`${marketId}-${epoch}`) || 0)) return

    const intents = intentsOverride ?? await this._fetchIntentsForBatch(marketId, epoch)
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
    // #region agent log
    fetch('http://127.0.0.1:7863/ingest/1c9654de-6579-4cb1-ad7e-6ea69c8510bd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'983fd8'},body:JSON.stringify({sessionId:'983fd8',hypothesisId:'H2',location:'solver.js:_processBatch',message:'epoch seed after ensure',data:{batchId,epoch,hasSeed:Boolean(seed&&seed!==ZERO_SEED)},timestamp:Date.now(),runId:'pre-fix'})}).catch(()=>{});
    // #endregion
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

    this._setLastBatchResult(batchId, priceResult, realIntents, totalSurplus)

    if (totalSurplus <= 0n) {
      const buyCount = realIntents.filter((i) => i.side === 0).length
      const sellCount = realIntents.filter((i) => i.side === 1).length

      this.unfilledEpochs.add(Number(epoch))
      if (buyCount === 0 || sellCount === 0) {
        console.log(`[solver] Batch ${batchId}: no opposite side (buy=${buyCount}, sell=${sellCount}), skipping`)
      } else {
        this.surplusRetryAt.set(`${marketId}-${epoch}`, Date.now() + 120_000)
        console.log(`[solver] Batch ${batchId}: insufficient surplus after CoW match, retry in 120s`)
      }
      return
    }

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

      const board = new ethers.Contract(
        CONFIG.CONTRACTS.SOLVER_BOARD,
        ABIS.SOLVER_BOARD_ABI,
        this.provider
      )
      const batchOnChain = await board.getBatch(BigInt(batchId))
      const finalizedBlock = Number(batchOnChain.finalizedBlock)
      const alreadySettled = Boolean(batchOnChain.settled)

      if (alreadySettled) {
        db.markIntentsProcessed(intents.map(i => i.requestId))
        db.markSettlementDone(batchKey)
        return
      }

      if (finalizedBlock === 0) {
        await registerBatchValueTx(this.signer, BigInt(batchId), batchValue)
      }

      const signerAddr = await this.signer.getAddress()
      const alreadyBid = await board.hasBid(BigInt(batchId), signerAddr)

      const biddingOpen = await this._isBiddingOpen(batchId)
      if (!biddingOpen && !alreadyBid) {
        console.warn(`[solver] Batch ${batchId}: bidding window closed, skipping bid`)
        return
      }

      const routeHash = ethers.keccak256(ethers.toUtf8Bytes(''))
      if (!alreadyBid && biddingOpen) {
        await submitBidTx(this.signer, BigInt(batchId), totalSurplus, routeHash)
      }

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

  async _isBiddingOpen(batchId) {
    try {
      const board = new ethers.Contract(CONFIG.CONTRACTS.SOLVER_BOARD, ABIS.SOLVER_BOARD_ABI, this.provider)
      return await board.isBiddingOpen(BigInt(batchId))
    } catch {
      return false
    }
  }

  async _ensureSolverRegistered() {
    if (!this.signer) return

    const registry = new ethers.Contract(
      CONFIG.CONTRACTS.SOLVER_REGISTRY,
      ABIS.SOLVER_REGISTRY_ABI,
      this.signer
    )
    const address = await this.signer.getAddress()
    const solver = await registry.solvers(address)
    if (solver.isActive) {
      console.log(`[solver] Registered in SolverRegistry (bond=${ethers.formatEther(solver.bondAmount)} ETH)`)
      return
    }

    const minBond = await registry.MIN_BOND()
    const balance = await this.provider.getBalance(address)
    if (balance < minBond) {
      console.warn(
        `[solver] Not registered — need ${ethers.formatEther(minBond)} ETH bond; wallet has ${ethers.formatEther(balance)} ETH. Run: node scripts/register-solver.js`
      )
      return
    }

    const endpoint = process.env.SOLVER_ENDPOINT_URL || 'http://localhost:4800/api/auctions/solver/status'
    const tx = await registry.registerSolver(endpoint, { value: minBond })
    console.log(`[solver] registerSolver tx=${tx.hash}`)
    await tx.wait()
    console.log('[solver] Registered in SolverRegistry')
  }

  async _fetchIntentsForBatch(marketId, epoch) {
    try {
      const lastBlock    = Number(db.getKv("ghostlock:lastEventBlock") || 0)
      if (!lastBlock) return []

      const currentBlock = await this.provider.getBlockNumber()
      const fromBlock     = Math.max(0, lastBlock - 2000)
      const intents       = await fetchDecryptedIntents(this.logsProvider, fromBlock, currentBlock, epoch)

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

  _setLastBatchResult(batchId, priceResult, realIntents, totalSurplus) {
    this.lastBatchResult = {
      batchId: String(batchId),
      method: priceResult.method || 'limit-grid',
      clearingPrice: priceResult.clearingPrice.toString(),
      ref: priceResult.ref != null ? priceResult.ref.toString() : null,
      intentCount: realIntents.length,
      buyBase: priceResult.totals.buyBase.toString(),
      sellBase: priceResult.totals.sellBase.toString(),
      surplus: totalSurplus.toString(),
      timestamp: Date.now(),
    }
  }

  _computeTotalSurplus(intents, clearingPrice) {
    let buyVol = 0n
    let sellVol = 0n

    for (const intent of intents) {
      if (intent.side === 0 && clearingPrice <= intent.limitPrice) {
        buyVol += intent.amount
      } else if (intent.side === 1 && clearingPrice >= intent.limitPrice) {
        sellVol += intent.amount
      }
    }

    const matchedVol = buyVol < sellVol ? buyVol : sellVol
    if (matchedVol === 0n) {
      return 0n
    }

    let surplus = 0n
    let buyFilled = 0n
    let sellFilled = 0n

    for (const intent of intents) {
      if (intent.side === 0 && clearingPrice <= intent.limitPrice) {
        const fill =
          buyFilled + intent.amount <= matchedVol
            ? intent.amount
            : matchedVol - buyFilled
        if (fill > 0n) {
          surplus += (intent.limitPrice - clearingPrice) * fill
          buyFilled += fill
        }
      } else if (intent.side === 1 && clearingPrice >= intent.limitPrice) {
        const fill =
          sellFilled + intent.amount <= matchedVol
            ? intent.amount
            : matchedVol - sellFilled
        if (fill > 0n) {
          surplus += (clearingPrice - intent.limitPrice) * fill
          sellFilled += fill
        }
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
        await this._seedEpochFromDrand(epoch)
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

  async _seedEpochFromDrand(epoch) {
    if (!this.signer) throw new Error('No signer — cannot seed epoch')

    const rng = new ethers.Contract(CONFIG.CONTRACTS.EPOCH_RNG, ABIS.EPOCH_RNG_ABI, this.signer)

    try {
      const existing = await rng.epochSeed(epoch)
      if (existing !== ZERO_SEED) {
        console.log(`[solver] Seed for epoch ${epoch} already exists`)
        return
      }
    } catch {}

    const round = await rng.roundForEpoch(epoch)
    const drand = await import('../../shared/drand.js')
    const dueSec = drand.timeOfRound(Number(round), drand.DRAND_EVMNET)
    const nowSec = Math.floor(Date.now() / 1000)
    if (dueSec > nowSec + 15) {
      throw new Error(
        `drand round ${round} not due until ${new Date(dueSec * 1000).toISOString()} (epoch ${epoch})`
      )
    }

    const beacon = await drand.fetchBeacon(Number(round), drand.DRAND_EVMNET)
    const { x, y } = drand.signatureToG1(beacon.signature)

    const tx = await rng.seedEpochWithSignature(epoch, x, y, {
      maxFeePerGas:         ethers.parseUnits('0.2', 'gwei'),
      maxPriorityFeePerGas: ethers.parseUnits('0.05', 'gwei'),
    })
    console.log(`[solver] seedEpochWithSignature(${epoch}, drand round ${round}): ${tx.hash}`)
    const receipt = await tx.wait()
    if (receipt.status === 0) throw new Error(`EpochRNG seed tx reverted for epoch ${epoch}`)
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
      ethers.zeroPadValue(ethers.toBeHex(BigInt(intent.requestId)), 32),
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

  async performHealthCheck() {
    const block = await this.provider.getBlockNumber()
    const balance = this.signer
      ? await this.provider.getBalance(await this.signer.getAddress())
      : 0n
    const balEth = ethers.formatEther(balance)
    console.log(`[health] block=${block} balance=${balEth} ETH`)
    if (this.signer && balance < ethers.parseEther('0.01')) {
      console.warn('[health] Solver balance low — replenish soon')
    }
  }

  getStatus() {
    const watcherCursor = Number(db.getKv('ghostlock:lastEventBlock') || 0)
    return {
      isRunning: this.isRunning,
      hasSigner: !!this.signer,
      stats: this.stats,
      unfilledEpochs: [...this.unfilledEpochs],
      lastBatch: this.lastBatchResult,
      watcherCursor,
      logsRpcDedicated: CONFIG.NETWORK.LOG_RPC_URL !== CONFIG.NETWORK.RPC_URL,
      pythKeyConfigured: Boolean(CONFIG.PRICE_FEED.PYTH_API_KEY),
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
