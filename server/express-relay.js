/**
 * express-relay.js — Pyth Express Relay integration (EVM)
 *
 * Docs: https://docs.pyth.network/express-relay/integrate-as-protocol
 *
 * Architecture:
 *   This server is the GhostLock "protocol". When a batch is ready for settlement,
 *   we submit an EVM opportunity to Express Relay. Registered searchers (solvers)
 *   discover it, bid off-chain, and the winning searcher executes settleBatch on-chain.
 *   If no searcher settles within FALLBACK_DELAY_BLOCKS, solver.js falls back to
 *   direct settlement.
 *
 * EVM opportunity fields (per Express Relay EVM spec):
 *   chainId        — numeric chain ID as string ("84532" for Base Sepolia)
 *   targetContract — the contract searchers will call (BatchSettlement)
 *   targetCalldata — ABI-encoded function call (settleBatch)
 *   targetCallValue— ETH value to send with call (0 for our settlement)
 *   permissionKey  — identifies the opportunity type; we use ABI-encoded batchKey
 *   sellTokens     — tokens the searcher must supply (empty: searcher provides execution)
 *   buyTokens      — tokens the searcher receives as profit (empty: surplus goes to users)
 *
 * SDK: npm install @pythnetwork/express-relay-js
 */

const { ethers } = require('ethers')
const { CONFIG, ABIS } = require('./config.js')

let _client = null

// ─── Client singleton ─────────────────────────────────────────────────────────

async function getClient() {
  if (_client) return _client
  try {
    // Dynamic import — SDK is ESM; keep server as CJS
    const { Client } = await import('@pythnetwork/express-relay-js')
    _client = new Client(
      { baseUrl: CONFIG.EXPRESS_RELAY.BASE_URL },
      undefined // default WebSocket options
    )
    return _client
  } catch (err) {
    console.warn('[express-relay] SDK unavailable:', err.message)
    return null
  }
}

// ─── ABI encoding ─────────────────────────────────────────────────────────────

/**
 * ABI-encode a settleBatch call for use as targetCalldata in the opportunity.
 *
 * settleBatch(uint256[] requestIds, uint256 epoch, uint8 marketId, uint256 clearingPrice)
 *
 * @param {number[]} requestIds
 * @param {number}   epoch
 * @param {number}   marketId
 * @param {bigint}   clearingPrice
 * @returns {string} hex-encoded calldata
 */
function encodeSettlementCalldata(requestIds, epoch, marketId, clearingPrice) {
  const iface = new ethers.Interface(ABIS.BATCH_SETTLEMENT)
  return iface.encodeFunctionData('settleBatch', [
    requestIds.map(BigInt),
    BigInt(epoch),
    marketId,
    clearingPrice,
  ])
}

/**
 * ABI-encode a permissionKey identifying this batch opportunity.
 * Searchers use this to scope their bids to a specific batch.
 *
 * @param {string} batchKey — e.g. "0-1234" (marketId-epoch)
 * @returns {string} hex-encoded permission key
 */
function encodeBatchPermissionKey(batchKey) {
  return ethers.AbiCoder.defaultAbiCoder().encode(['string'], [batchKey])
}

// ─── Opportunity submission ───────────────────────────────────────────────────

/**
 * Submit a settlement batch as an EVM opportunity to Pyth Express Relay.
 *
 * Searchers listening to Express Relay will:
 *  1. Receive the opportunity via WebSocket
 *  2. Simulate the settlement for profitability
 *  3. Submit a bid (ETH amount they're willing to pay for execution rights)
 *  4. Winning searcher executes settleBatch on-chain
 *
 * @param {Object} params
 * @param {string}   params.batchKey       — "marketId-epoch" identifier
 * @param {string}   params.targetContract — BatchSettlement address
 * @param {string}   params.calldata       — encoded settleBatch calldata
 * @param {string}   params.chainId        — chain ID as string
 * @returns {Promise<Object|null>}
 */
async function submitOpportunity({ batchKey, targetContract, calldata, chainId }) {
  const client = await getClient()
  if (!client) return null

  try {
    const opportunity = {
      chainId,
      targetContract,
      targetCalldata:  calldata,
      targetCallValue: '0',            // no ETH sent with settlement call
      permissionKey:   encodeBatchPermissionKey(batchKey),
      sellTokens:      [],             // searcher doesn't need to provide tokens
      buyTokens:       [],             // searcher profit comes from execution priority
    }

    console.log(`[express-relay] Submitting opportunity for batch ${batchKey} on chain ${chainId}`)

    const result = await Promise.race([
      client.submitOpportunity(opportunity),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Express Relay timeout')), CONFIG.EXPRESS_RELAY.TIMEOUT_MS)
      ),
    ])

    console.log(`[express-relay] Opportunity accepted for batch ${batchKey}`)
    return result
  } catch (err) {
    // Non-fatal — solver.js will fall back to direct settlement
    console.warn(`[express-relay] submitOpportunity failed for batch ${batchKey}:`, err.message)
    return null
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getClient,
  submitOpportunity,
  encodeSettlementCalldata,
  encodeBatchPermissionKey,
}