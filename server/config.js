/**
 * server/config.js — GhostLock/HolmeSwap server configuration
 *
 * All 6 contracts deployed on Arbitrum Sepolia (chain 421614):
 *   GhostLockLiveness  = 0x056B39F4fd80C86E44D2Fc6153A3e9F3d20a2C6C
 *   BatchSettlement    = 0x64593911b86889F45d1CbEaF40397c4807505EB8
 *   GhostLockEpochRNG  = 0x6a0e6F76Db61985bCB4e31C71226Ba1B35dBbF1A
 *   SolverBoard        = 0x1e457f34Bdccf28258Cd30956bb6F2df614ddBEF
 *   SolverRegistry     = 0xE8901D9f2f262f4F09E30344aA8470eCEbc64CBD
 *   PriceOracle        = 0xB049f2a5E2aeEa5950675EA89d0DA79E5749fB5C
 *
 * Market: ETH/USDC (id=0), WBTC/USDC (id=1)
 * Tokens: WETH=0x82aF49447D8a07e3bd95BD0d56f35241523fBab1, USDC=0xaf88d065e77c8cC2239327C5EDb3A432268e5831
 */

require('dotenv').config()

const CONFIG = {
  NETWORK: {
    CHAIN_ID:           Number(process.env.CHAIN_ID) || 421614,  // Arbitrum Sepolia
    RPC_URL:            process.env.RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    BLOCK_TIME_SECONDS: 2,
  },

  CONTRACTS: {
    GHOSTLOCK_LIVENESS:  process.env.GHOSTLOCK_LIVENESS_ADDRESS   || '0x056B39F4fd80C86E44D2Fc6153A3e9F3d20a2C6C',
    BATCH_SETTLEMENT:    process.env.BATCH_SETTLEMENT_ADDRESS   || '0x64593911b86889F45d1CbEaF40397c4807505EB8',
    EPOCH_RNG:           process.env.EPOCH_RNG_ADDRESS           || '0x6a0e6F76Db61985bCB4e31C71226Ba1B35dBbF1A',
    SOLVER_BOARD:        process.env.SOLVER_BOARD_ADDRESS         || '0x1e457f34Bdccf28258Cd30956bb6F2df614ddBEF',
    SOLVER_REGISTRY:     process.env.SOLVER_REGISTRY_ADDRESS    || '0xE8901D9f2f262f4F09E30344aA8470eCEbc64CBD',
    PRICE_ORACLE:        process.env.PRICE_ORACLE_ADDRESS        || '0xB049f2a5E2aeEa5950675EA89d0DA79E5749fB5C',
    // ERC-20 tokens for markets
    WETH:               process.env.WETH_ADDRESS               || '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC:               process.env.USDC_ADDRESS                || '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    WBTC:               process.env.WBTC_ADDRESS               || '0x0000000000000000000000000000000000000000',
  },

  // Solver: wallet used for settlement + SolverBoard operations
  // This wallet MUST:
  //   1. Own SolverBoard (to call selectWinner / setWinnerKeeper)
  //   2. Own EpochRNG (to call requestEpochSeed)
  //   3. Be registered as a solver in SolverRegistry (with 1 ETH bond)
  SOLVER: {
    PRIVATE_KEY:             process.env.SOLVER_PRIVATE_KEY,
    GAS_LIMIT:               1_500_000,
    MAX_RETRIES:             3,
    RETRY_DELAY_MS:          5_000,
    MAX_BATCH_PULL:          50,
    EPOCH_SEED_GAS_LIMIT:    500_000,
  },

  AUCTION: {
    EPOCH_DURATION_BLOCKS:     100,
    SETTLEMENT_DELAY_BLOCKS:     5,
    MIN_INTENTS_FOR_SETTLEMENT:  1,    // 1 for testnet (no external solvers)
    MAX_INTENTS_PER_BATCH:      200,
  },

  // SolverBoard constants (match contract)
  SOLVER_BOARD: {
    BIDDING_WINDOW_BLOCKS:          10,   // ~20s on Arbitrum
    WINNER_SELECTION_BUFFER_BLOCKS: 3,    // anti-griefing buffer
    SETTLEMENT_WINDOW_BLOCKS:        5,    // ~10s to execute
    MIN_SURPLUS_BPS:                50,   // 0.5% minimum surplus to users
  },

  PRICE_FEED: {
    PYTH_BASE_URL:       'https://hermes.pyth.network',
    UPDATE_INTERVAL_MS:  30_000,
    TIMEOUT_MS:          10_000,
  },

  // Pyth Express Relay — only active on chains that support it (e.g. Arbitrum One)
  // Arb Sepolia: Express Relay not supported; SolverBoard path used instead
  EXPRESS_RELAY: {
    BASE_URL:               process.env.EXPRESS_RELAY_BASE_URL || 'https://per-staging.dourolabs.app',
    FALLBACK_DELAY_BLOCKS:  Number(process.env.EXPRESS_RELAY_FALLBACK_BLOCKS) || 2,
    TIMEOUT_MS:             8_000,
    ENABLED:                process.env.EXPRESS_RELAY_ENABLED === 'true',
  },

  SCHEDULER: {
    SETTLEMENT_CHECK_INTERVAL_MS: 30_000,
    PRICE_UPDATE_INTERVAL_MS:     60_000,
    HEALTH_CHECK_INTERVAL_MS:     300_000,
  },

  WATCHER: {
    REORG_TOLERANCE_BLOCKS:   6,
    MAX_BLOCK_BATCH:          50,
    BACKUP_POLL_MS:           15_000,
    MAX_CATCHUP_BLOCKS:       10_000,
    RATE_LIMIT_RETRY_DELAY_MS: 5_000,
    MAX_RETRIES:              3,
    DELAY_BETWEEN_BATCHES_MS: 1_000,
  },

  RPC: {
    MAX_REQUESTS_PER_SECOND: 2,
    RATE_LIMIT_WINDOW_MS:    2_000,
    RETRY_DELAY_MS:          2_000,
    BATCH_SIZE:              10,
  },

  DB: {
    PATH: process.env.DB_PATH || './ghostlock.db',
  },

  AI: {
    ENABLED: process.env.AI_ENABLED === 'true',
  },
}

// Supported markets — matches frontend src/holmeswap/contracts/config.ts MARKETS
const MARKETS = {
  0: { id: 0, name: 'ETH/USDC',  base: 'ETH',  quote: 'USDC', baseDecimals: 18, quoteDecimals: 6 },
  1: { id: 1, name: 'WBTC/USDC', base: 'WBTC', quote: 'USDC', baseDecimals: 8,  quoteDecimals: 6 },
}

const ABIS = require('./contracts/abis.js')

module.exports = { CONFIG, MARKETS, ABIS }
