const { BATCH_SETTLEMENT_ABI, EPOCH_RNG_ABI, GHOSTLOCK_INTENTS_ABI } = require("./contracts/ABI");
require('dotenv').config();

// Backend configuration for GhostLock MEV Reaper
const CONFIG = {
  CONTRACTS: {
    GHOSTLOCK_INTENTS: process.env.GHOSTLOCK_INTENTS_ADDRESS || "0xB049f2a5E2aeEa5950675EA89d0DA79E5749fB5C",
    BATCH_SETTLEMENT: process.env.BATCH_SETTLEMENT_ADDRESS || "0x8aF0Ec5b9a22d02acdC0fb3ad75831fef3208706",
    EPOCH_RNG: process.env.EPOCH_RNG_ADDRESS || "0xA785F4B588013C9761b6B2Dff025e058C42cb798",
    MOCK_ETH: process.env.MOCK_ETH_ADDRESS || "0xE8901D9f2f262f4F09E30344aA8470eCEbc64CBD"
  },

  NETWORK: {
    WALLET_ADDR: process.env.WALLET_ADDR,
    CHAIN_ID: 84532,
    RPC_URL: process.env.RPC_URL || "https://sepolia.base.org",
    BLOCK_TIME_SECONDS: 2
  },

  AUCTION: {
    EPOCH_DURATION_BLOCKS: 100,
    SETTLEMENT_DELAY_BLOCKS: 5,
    MAX_INTENTS_PER_BATCH: 50,
    MIN_INTENTS_FOR_SETTLEMENT: 2
  },

  SOLVER: {
    PRIVATE_KEY: process.env.SOLVER_PRIVATE_KEY,
    GAS_LIMIT: 100_000,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 5000
  },

  PRICE_FEED: {
    PROVIDER: process.env.PRICE_FEED_PROVIDER || "pyth",
    BASE_URL: process.env.PRICE_FEED_BASE_URL || "",
    UPDATE_INTERVAL_MS: 30000, // 30 seconds
    TIMEOUT_MS: 10000
  },

  OPENSERV : {
    WORKSPACE_ID:process.env.OPENSERVE_WORKSPACE,
    API_KEY: process.env.OPENSERV_API_KEY,
    AGENT_ID: process.env.AGENT_ID,
  }, 

  //AI/ML Config
  AI: {
    ENABLED: process.env.AI_ENABLED === "true",
    MODEL_URL: process.env.AI_MODEL_URL,
    CONFIDENCE_THRESHOLD: 0.8,
    FALLBACK_TO_HEURISTIC: true
  },

  // Scheduler config
  SCHEDULER: {
    SETTLEMENT_CHECK_INTERVAL_MS: 30000, // 30 seconds
    PRICE_UPDATE_INTERVAL_MS: 60000,     // 1 minute
    HEALTH_CHECK_INTERVAL_MS: 300000     // 5 minutes
  },

  // RPC Rate limiting config
  RPC: {
    MAX_REQUESTS_PER_SECOND: 1, // 
    RATE_LIMIT_WINDOW_MS: 2000, // 1 req per 2000
    RETRY_DELAY_MS: 2000,
    BATCH_SIZE: 10
  },

  REDIS : {
    URL: process.env.REDIS_URL,
  }
};

const ABIS = {
  GHOSTLOCK_INTENTS: GHOSTLOCK_INTENTS_ABI,
  BATCH_SETTLEMENT: BATCH_SETTLEMENT_ABI,
  EPOCH_RNG: EPOCH_RNG_ABI
};

// Market config
const MARKETS = {
  0: { name: "ETH/USDC", base: "ETH", quote: "USDC", baseDecimals: 18, quoteDecimals: 6 },
  1: { name: "WBTC/USDC", base: "WBTC", quote: "USDC", baseDecimals: 8, quoteDecimals: 6 }
};

module.exports = { CONFIG, ABIS, MARKETS };