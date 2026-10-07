/**
 * server/config.js — GhostLock/HolmeSwap server configuration
 *
 * All 7 contracts deployed on Arbitrum Sepolia (chain 421614):
 *   GhostLockLiveness  = 0x9c3772c9B2E8ae8A074aa9Fc8Aaa4943e0ffC983
 *   BatchSettlement    = 0x926349E53527f690E25CF9C5d60e8791985aD14E
 *   GhostLockEpochRNG  = 0x73A35514Ab9405381A323c513220e20ACb9d7c30
 *   DrandBeacon        = 0x74FBA5163505e43634F366c52C92824C23027076
 *   SolverBoard        = 0xB1A20FFFf4E4e15c0735fc0a79ad8BB8F3909916
 *   SolverRegistry     = 0x3302E3d04d166C6D23E5B09a29a8eE3d2C7Baf98
 *   PriceOracle        = 0x86c4023741467c3179683ed152471921DC2D48BC
 *
 * Market: ETH/USDC (id=0), WBTC/USDC (id=1)
 * Tokens: WETH=0x82aF49447D8a07e3bd95BD0d56f35241523fBab1, USDC=0xaf88d065e77c8cC2239327C5EDb3A432268e5831
 */

require('dotenv').config()

const CONFIG = {
  NETWORK: {
    CHAIN_ID:           Number(process.env.CHAIN_ID) || 421614,  // Arbitrum Sepolia
    RPC_URL:            process.env.RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    LOG_RPC_URL:        process.env.LOG_RPC_URL || process.env.RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    BLOCK_TIME_SECONDS: 2,
  },

  CONTRACTS: {
    GHOSTLOCK_LIVENESS:  process.env.GHOSTLOCK_LIVENESS_ADDRESS   || '0x9c3772c9B2E8ae8A074aa9Fc8Aaa4943e0ffC983',
    BATCH_SETTLEMENT:    process.env.BATCH_SETTLEMENT_ADDRESS   || '0x926349E53527f690E25CF9C5d60e8791985aD14E',
    EPOCH_RNG:           process.env.EPOCH_RNG_ADDRESS           || '0x73A35514Ab9405381A323c513220e20ACb9d7c30',
    DRAND_BEACON:        process.env.DRAND_BEACON_ADDRESS        || '0x74FBA5163505e43634F366c52C92824C23027076',
    SOLVER_BOARD:        process.env.SOLVER_BOARD_ADDRESS         || '0xB1A20FFFf4E4e15c0735fc0a79ad8BB8F3909916',
    SOLVER_REGISTRY:     process.env.SOLVER_REGISTRY_ADDRESS    || '0x3302E3d04d166C6D23E5B09a29a8eE3d2C7Baf98',
    PRICE_ORACLE:        process.env.PRICE_ORACLE_ADDRESS        || '0x86c4023741467c3179683ed152471921DC2D48BC',
    // ERC-20 tokens for markets
    WETH:               process.env.WETH_ADDRESS               || '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC:               process.env.USDC_ADDRESS                || '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    WBTC:               process.env.WBTC_ADDRESS               || '0x0000000000000000000000000000000000000000',
  },

  // Solver: wallet used for settlement + SolverBoard operations
  // This wallet MUST:
  //   1. Own SolverBoard (to call selectWinner / setWinnerKeeper)
  // Solver wallet must be registered in SolverRegistry (with bond).
  // Epoch seeding is permissionless — any account may relay drand and call seedEpochWithSignature.
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
    PROVIDER:            process.env.PRICE_FEED_PROVIDER || 'coinbase',
    PYTH_BASE_URL:       process.env.PYTH_BASE_URL || process.env.PRICE_FEED_BASE_URL || 'https://hermes.pyth.network',
    PYTH_API_KEY:        process.env.PYTH_API_KEY || process.env.PRICE_FEED_API_KEY || '',
    COINBASE_BASE_URL:   process.env.COINBASE_API_URL || 'https://api.exchange.coinbase.com',
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
