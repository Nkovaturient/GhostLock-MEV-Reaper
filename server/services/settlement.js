/**
 * settlement.js — GhostLock/HolmeSwap batch settlement
 *
 * SolverBoard flow (EQUALIZE layer):
 *   1. registerBatchValue(batchId, value)   → SolverBoard
 *   2. submitBid(batchId, surplus, routeHash) → SolverBoard
 *   3. [wait BIDDING_WINDOW_BLOCKS + WINNER_SELECTION_BUFFER_BLOCKS]
 *   4. selectWinner(batchId)                  → SolverBoard (owner-only)
 *   5. executeSettlement(batchId, routes)    → SolverBoard → BatchSettlement.settleBatch
 *
 * For step 5, the server must provide plaintext payloads for each intent.
 */

const { ethers } = require('ethers')
const { CONFIG, ABIS } = require('../config.js')

const ZERO_SEED = '0x' + '00'.repeat(32)

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── IntentPayload builder ──────────────────────────────────────────────────

/**
 * Build IntentPayload[] from intents with stored plaintext.
 * Each intent must have { requestId, user, side, amount, limitPrice, marketId, epoch }.
 * The plaintext is ABI-encoded from the decoded fields.
 */
function buildIntentPayloads(intents) {
  return intents.map(intent => {
    const plaintext = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint8', 'uint256', 'uint256', 'uint8', 'uint256', 'bool'],
      [
        intent.user,
        intent.side,
        intent.amount,
        intent.limitPrice,
        intent.marketId,
        intent.epoch,
        intent.isDummy ?? false,
      ]
    )
    return {
      requestId: BigInt(intent.requestId),
      plaintext,
    }
  })
}

// ─── SolverBoard: registerBatchValue ───────────────────────────────────────

async function registerBatchValueTx(signer, batchId, value) {
  const board = new ethers.Contract(CONFIG.CONTRACTS.SOLVER_BOARD, ABIS.SOLVER_BOARD_ABI, signer)
  let attemptsLeft = CONFIG.SOLVER.MAX_RETRIES
  while (attemptsLeft > 0) {
    try {
      const gasLimit = BigInt(CONFIG.SOLVER.GAS_LIMIT)
      const tx = await board.registerBatchValue(batchId, value, {
        gasLimit,
        maxFeePerGas:         ethers.parseUnits('0.2', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('0.05', 'gwei'),
      })
      console.log(`[settlement] registerBatchValue batchId=${batchId} value=${value} tx=${tx.hash}`)
      return await tx.wait()
    } catch (err) {
      attemptsLeft--
      const waitMs = CONFIG.SOLVER.RETRY_DELAY_MS
      if (attemptsLeft === 0) throw err
      console.warn(`[settlement] registerBatchValue failed (${attemptsLeft} left):`, err.message)
      await sleep(waitMs)
    }
  }
}

// ─── SolverBoard: submitBid ───────────────────────────────────────────────────

async function submitBidTx(signer, batchId, totalSurplus, routeHash = ethers.keccak256(ethers.toUtf8Bytes(''))) {
  const board = new ethers.Contract(CONFIG.CONTRACTS.SOLVER_BOARD, ABIS.SOLVER_BOARD_ABI, signer)
  let attemptsLeft = CONFIG.SOLVER.MAX_RETRIES
  while (attemptsLeft > 0) {
    try {
      const gasLimit = BigInt(CONFIG.SOLVER.GAS_LIMIT)
      const tx = await board.submitBid(batchId, totalSurplus, routeHash, {
        gasLimit,
        maxFeePerGas:         ethers.parseUnits('0.2', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('0.05', 'gwei'),
      })
      console.log(`[settlement] submitBid batchId=${batchId} surplus=${totalSurplus} tx=${tx.hash}`)
      return await tx.wait()
    } catch (err) {
      attemptsLeft--
      const waitMs = CONFIG.SOLVER.RETRY_DELAY_MS
      if (attemptsLeft === 0) throw err
      console.warn(`[settlement] submitBid failed (${attemptsLeft} left):`, err.message)
      await sleep(waitMs)
    }
  }
}

// ─── SolverBoard: selectWinner ───────────────────────────────────────────────

async function selectWinnerTx(signer, batchId) {
  const board = new ethers.Contract(CONFIG.CONTRACTS.SOLVER_BOARD, ABIS.SOLVER_BOARD_ABI, signer)
  let attemptsLeft = CONFIG.SOLVER.MAX_RETRIES
  while (attemptsLeft > 0) {
    try {
      const gasLimit = BigInt(CONFIG.SOLVER.GAS_LIMIT)
      const tx = await board.selectWinner(batchId, {
        gasLimit,
        maxFeePerGas:         ethers.parseUnits('0.2', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('0.05', 'gwei'),
      })
      console.log(`[settlement] selectWinner batchId=${batchId} tx=${tx.hash}`)
      return await tx.wait()
    } catch (err) {
      attemptsLeft--
      const waitMs = CONFIG.SOLVER.RETRY_DELAY_MS
      if (attemptsLeft === 0) throw err
      console.warn(`[settlement] selectWinner failed (${attemptsLeft} left):`, err.message)
      await sleep(waitMs)
    }
  }
}

// ─── SolverBoard: executeSettlement ─────────────────────────────────────────

/**
 * Execute batch settlement via SolverBoard.
 * This internally calls BatchSettlement.settleBatch(payloads, epoch, marketId, clearingPrice).
 *
 * @param {ethers.Signer} signer
 * @param {bigint} batchId
 * @param {Array} intents - decoded intents with plaintext data
 * @param {number} epoch
 * @param {number} marketId
 * @param {bigint} clearingPrice
 */
async function executeSettlementTx(signer, batchId, intents, epoch, marketId, clearingPrice) {
  const board = new ethers.Contract(CONFIG.CONTRACTS.SOLVER_BOARD, ABIS.SOLVER_BOARD_ABI, signer)

  const payloads = buildIntentPayloads(intents)
  const routes = ethers.AbiCoder.defaultAbiCoder().encode(
    ['tuple(uint256,bytes)[]', 'uint256', 'uint8', 'uint256'],
    [payloads.map(p => [p.requestId, p.plaintext]), epoch, marketId, clearingPrice]
  )

  let attemptsLeft = CONFIG.SOLVER.MAX_RETRIES
  while (attemptsLeft > 0) {
    try {
      let gasLimit
      try {
        const estimated = await board.executeSettlement.estimateGas(batchId, routes)
        gasLimit = (estimated * 110n) / 100n
      } catch {
        gasLimit = BigInt(CONFIG.SOLVER.GAS_LIMIT)
      }

      const tx = await board.executeSettlement(batchId, routes, {
        gasLimit,
        maxFeePerGas:         ethers.parseUnits('0.2', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('0.05', 'gwei'),
      })
      console.log(`[settlement] executeSettlement batchId=${batchId} intents=${payloads.length} tx=${tx.hash}`)
      return await tx.wait()
    } catch (err) {
      attemptsLeft--
      const waitMs = CONFIG.SOLVER.RETRY_DELAY_MS
      if (attemptsLeft === 0) throw err
      console.warn(`[settlement] executeSettlement failed (${attemptsLeft} left):`, err.message)
      await sleep(waitMs)
    }
  }
}

// ─── SolverBoard: expireBatch ───────────────────────────────────────────────

async function expireBatchTx(signer, batchId) {
  const board = new ethers.Contract(CONFIG.CONTRACTS.SOLVER_BOARD, ABIS.SOLVER_BOARD_ABI, signer)
  try {
    const tx = await board.expireBatch(batchId, {
      gasLimit: BigInt(CONFIG.SOLVER.GAS_LIMIT),
      maxFeePerGas:         ethers.parseUnits('0.2', 'gwei'),
      maxPriorityFeePerGas: ethers.parseUnits('0.05', 'gwei'),
    })
    console.log(`[settlement] expireBatch batchId=${batchId} tx=${tx.hash}`)
    return await tx.wait()
  } catch (err) {
    console.warn(`[settlement] expireBatch failed:`, err.message)
    throw err
  }
}

// ─── Simulation ─────────────────────────────────────────────────────────────

async function simulateSettlementTx(provider, intents, epoch, marketId, clearingPrice, fromAddress) {
  try {
    const batch = new ethers.Contract(
      CONFIG.CONTRACTS.BATCH_SETTLEMENT,
      ABIS.BATCH_SETTLEMENT_ABI,
      provider
    )
    const payloads = buildIntentPayloads(intents)
    const routes = ethers.AbiCoder.defaultAbiCoder().encode(
      ['tuple(uint256,bytes)[]', 'uint256', 'uint8', 'uint256'],
      [payloads.map(p => [p.requestId, p.plaintext]), epoch, marketId, clearingPrice]
    )
    await batch.executeWithRoutes.staticCall(0, routes, { from: fromAddress })
    return { ok: true }
  } catch (err) {
    const msg = err?.error?.message ?? err?.message ?? String(err)
    console.warn('[settlement] simulateSettlementTx reverted:', msg)
    return { ok: false, error: msg }
  }
}

// ─── Readiness check ─────────────────────────────────────────────────────────

async function isBatchReadyForSettlement(provider, intents) {
  if (intents.length < CONFIG.AUCTION.MIN_INTENTS_FOR_SETTLEMENT) return false

  try {
    const contract = new ethers.Contract(
      CONFIG.CONTRACTS.BATCH_SETTLEMENT,
      ABIS.BATCH_SETTLEMENT_ABI,
      provider
    )

    const unsettled = []
    for (const intent of intents) {
      try {
        const isSettled = await contract.settledIntent(intent.requestId)
        if (!isSettled) unsettled.push(intent)
      } catch (e) {
        console.warn(`[settlement] Could not check settled status for ${intent.requestId}:`, e.message)
      }
    }

    if (unsettled.length < CONFIG.AUCTION.MIN_INTENTS_FOR_SETTLEMENT) return false

    // HolmeSwap encodes intent epoch from unlock block (not wall-clock epoch). On testnet with
    // MIN_INTENTS=1, settle once decrypted intents exist — do not gate on unrelated block windows.
    if (CONFIG.AUCTION.MIN_INTENTS_FOR_SETTLEMENT <= 1) {
      return true
    }

    const intentEpoch = Number(unsettled[0].epoch)
    const currentBlock = await provider.getBlockNumber()
    const epochStart = intentEpoch * CONFIG.AUCTION.EPOCH_DURATION_BLOCKS
    const epochEnd = epochStart + CONFIG.AUCTION.EPOCH_DURATION_BLOCKS
    if (currentBlock < epochStart) return false
    const blocksLeft = epochEnd - currentBlock
    return blocksLeft >= CONFIG.AUCTION.SETTLEMENT_DELAY_BLOCKS
  } catch (err) {
    console.error('[settlement] isBatchReadyForSettlement error:', err.message)
    return false
  }
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateBatchConsistency(intents) {
  if (!intents.length) return { isValid: false, reason: 'Empty batch' }

  const { marketId, epoch } = intents[0]
  for (const intent of intents) {
    if (intent.marketId !== marketId) {
      return { isValid: false, reason: `Market mismatch: expected ${marketId}, got ${intent.marketId}` }
    }
    if (intent.epoch !== epoch) {
      return { isValid: false, reason: `Epoch mismatch: expected ${epoch}, got ${intent.epoch}` }
    }
  }
  return { isValid: true, marketId, epoch, intentCount: intents.length }
}

// ─── Signer factory ──────────────────────────────────────────────────────────

function createSolverSigner() {
  if (!CONFIG.SOLVER.PRIVATE_KEY) {
    throw new Error('SOLVER_PRIVATE_KEY env var is required')
  }
  const provider = new ethers.JsonRpcProvider(CONFIG.NETWORK.RPC_URL)
  return new ethers.Wallet(CONFIG.SOLVER.PRIVATE_KEY, provider)
}

module.exports = {
  buildIntentPayloads,
  registerBatchValueTx,
  submitBidTx,
  selectWinnerTx,
  executeSettlementTx,
  expireBatchTx,
  simulateSettlementTx,
  isBatchReadyForSettlement,
  validateBatchConsistency,
  createSolverSigner,
}
