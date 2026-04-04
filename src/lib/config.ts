import { GHOSTLOCK_MARKETS } from './ghostlockMarkets'

export const CONFIG = {
  CHAIN_ID: 84532, // Base Sepolia
  RPC_URL: import.meta.env.VITE_RPC_URL || 'https://sepolia.base.org',
  CONTRACTS: {
    BATCH_SETTLEMENT: import.meta.env.VITE_BATCH_SETTLEMENT_ADDRESS as string,
    EPOCH_RNG: import.meta.env.VITE_EPOCH_RNG_ADDRESS as string,
    PRICE_ORACLE: import.meta.env.VITE_PRICE_ORACLE_ADDRESS as string,
    SOLVER_BOARD: import.meta.env.VITE_SOLVER_BOARD_ADDRESS as string,
    SOLVER_REGISTRY: import.meta.env.VITE_SOLVER_REGISTRY_ADDRESS as string,
    GHOST_LOCK_LIVENESS: import.meta.env.VITE_GHOST_LOCK_LIVENESS_ADDRESS as string,
  },
  BASE_MAINNET: {
    chainId: 8453,
    name: 'Base Mainnet',
    rpcUrl: import.meta.env.VITE_BASE_MAINNET_RPC_URL || 'https://mainnet.base.org',
    GHOSTLOCK_INTENTS: import.meta.env.VITE_BASE_MAINNET_GHOSTLOCK_INTENTS_ADDRESS as string,
    EPOCH_RNG: import.meta.env.VITE_BASE_MAINNET_EPOCH_RNG_ADDRESS as string,
  },
  ARBITRUM: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: import.meta.env.VITE_ARBITRUM_ONE_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    GHOSTLOCK_INTENTS: import.meta.env.VITE_ARBITRUM_GHOSTLOCK_INTENTS_ADDRESS as string,
    EPOCH_RNG: import.meta.env.VITE_ARBITRUM_EPOCH_RNG_ADDRESS as string,
  },
  ARBITRUM_SEPOLIA: {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    GHOSTLOCK_LIVENESS: import.meta.env.VITE_ARBITRUM_SEPOLIA_GHOSTLOCK_LIVENESS_ADDRESS as string,
    EPOCH_RNG: import.meta.env.VITE_ARBITRUM_SEPOLIA_EPOCH_RNG_ADDRESS as string,
    PRICE_ORACLE: import.meta.env.VITE_ARBITRUM_SEPOLIA_PRICE_ORACLE_ADDRESS as string,
    SOLVER_BOARD: import.meta.env.VITE_ARBITRUM_SEPOLIA_SOLVER_BOARD_ADDRESS as string,
    SOLVER_REGISTRY: import.meta.env.VITE_ARBITRUM_SEPOLIA_SOLVER_REGISTRY_ADDRESS as string,
  },
  API: {
    SOLVER_URL: import.meta.env.VITE_SOLVER_API_URL as string,
    INDEXER_URL: import.meta.env.VITE_INDEXER_URL as string,
  },
  APP: {
    NAME: 'GhostLock: MEV Reaper',
    DESCRIPTION: 'A stealth shield against MEV, encrypting trades and settling them fair',
    VERSION: '1.0.0',
  },
  
  // Trading Configuration
  TRADING: {
    DEFAULT_SLIPPAGE_BPS: 50, // 0.5%
    MAX_SLIPPAGE_BPS: 1000, // 10%
    DEFAULT_TARGET_OFFSET: 20, // blocks
    MIN_TARGET_OFFSET: 5,
    MAX_TARGET_OFFSET: 100,
  },
  
  // Auction Configuration (align with holmeswap/contracts/config + server/config.js)
  AUCTION: {
    EPOCH_DURATION_BLOCKS: 100,
    SETTLEMENT_DELAY_BLOCKS: 5,
    MAX_INTENTS_PER_BATCH: 100,
  }
} as const

export type Market = {
  id: number
  name: string
  baseToken: string
  quoteToken: string
  baseSymbol: string
  quoteSymbol: string
  baseDecimals: number
  quoteDecimals: number
}

export const MARKETS: Market[] = GHOSTLOCK_MARKETS.map(m => ({
  id: m.id,
  name: m.name,
  baseToken: CONFIG.CONTRACTS.PRICE_ORACLE as string,
  quoteToken: CONFIG.CONTRACTS.PRICE_ORACLE as string,
  baseSymbol: m.base,
  quoteSymbol: m.quote,
  baseDecimals: m.baseDecimals,
  quoteDecimals: m.quoteDecimals,
}))