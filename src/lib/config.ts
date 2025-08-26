// Configuration constants for GhostLock: MEV Reaper
export const CONFIG = {
  // Network Configuration
  CHAIN_ID: 84532, // Base Sepolia
  RPC_URL: import.meta.env.VITE_RPC_URL || 'https://sepolia.base.org',
  
  // Contract Addresses (Placeholders - Replace with actual deployed addresses)
  CONTRACTS: {
    GHOSTLOCK_INTENTS: import.meta.env.VITE_GHOSTLOCK_INTENTS_ADDRESS,
    BATCH_SETTLEMENT: import.meta.env.VITE_BATCH_SETTLEMENT_ADDRESS,
    EPOCH_RNG: import.meta.env.VITE_EPOCH_RNG_ADDRESS,
    MOCK_ETH: import.meta.env.VITE_MOCK_ETH_ADDRESS,
    MOCK_USDC: import.meta.env.VITE_MOCK_USDC_ADDRESS,
  },
  
  // API Configuration
  API: {
    SOLVER_URL: import.meta.env.VITE_SOLVER_API_URL || 'http://localhost:4800/api',
    INDEXER_URL: import.meta.env.VITE_INDEXER_URL || 'http://localhost:4800/indexer',
  },
  
  // Application Settings
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
  
  // Auction Configuration
  AUCTION: {
    EPOCH_DURATION_BLOCKS: 50,
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

export const MARKETS: Market[] = [
  {
    id: 0,
    name: 'ETH/USDC',
    baseToken: CONFIG.CONTRACTS.MOCK_ETH as string,
    quoteToken: CONFIG.CONTRACTS.MOCK_USDC as string,
    baseSymbol: 'ETH',
    quoteSymbol: 'USDC',
    baseDecimals: 18,
    quoteDecimals: 6,
  },
  {
    id: 1,
    name: 'WBTC/USDC',
    baseToken: '0x0000000000000000000000000000000000000001',
    quoteToken: CONFIG.CONTRACTS.MOCK_USDC as string,
    baseSymbol: 'WBTC',
    quoteSymbol: 'USDC',
    baseDecimals: 8,
    quoteDecimals: 6,
  }
]