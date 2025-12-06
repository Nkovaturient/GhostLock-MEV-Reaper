export const NETWORKS = {
  BASE_SEPOLIA: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: import.meta.env.VITE_RPC_URL || 'https://sepolia.base.org',
    contracts: {
      GHOSTLOCK_INTENTS: import.meta.env.VITE_GHOSTLOCK_INTENTS_ADDRESS as string,
      BATCH_SETTLEMENT: import.meta.env.VITE_BATCH_SETTLEMENT_ADDRESS as string,
      EPOCH_RNG: import.meta.env.VITE_EPOCH_RNG_ADDRESS as string,
      MOCK_ETH: import.meta.env.VITE_MOCK_ETH_ADDRESS as string,
      MOCK_USDC: import.meta.env.VITE_MOCK_USDC_ADDRESS as string,
    }
  },
  BASE_MAINNET: {
    chainId: 8453,
    name: 'Base Mainnet',
    rpcUrl: import.meta.env.VITE_MAINNET_RPC_URL || 'https://mainnet.base.org',
    contracts: {
      GHOSTLOCK_INTENTS: import.meta.env.VITE_MAINNET_GHOSTLOCK_INTENTS_ADDRESS as string,
      BATCH_SETTLEMENT: import.meta.env.VITE_MAINNET_BATCH_SETTLEMENT_ADDRESS as string,
      EPOCH_RNG: import.meta.env.VITE_MAINNET_EPOCH_RNG_ADDRESS as string,
      MOCK_ETH: import.meta.env.VITE_MAINNET_MOCK_ETH_ADDRESS as string,
      MOCK_USDC: import.meta.env.VITE_MAINNET_MOCK_USDC_ADDRESS as string,
    }
  },
  ARBITRUM_ONE: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: import.meta.env.VITE_ARBITRUM_ONE_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    contracts: {
      GHOSTLOCK_INTENTS: import.meta.env.VITE_ARBITRUM_GHOSTLOCK_INTENTS_ADDRESS as string,
      BATCH_SETTLEMENT: import.meta.env.VITE_ARBITRUM_BATCH_SETTLEMENT_ADDRESS as string,
      EPOCH_RNG: import.meta.env.VITE_ARBITRUM_EPOCH_RNG_ADDRESS as string,
      MOCK_ETH: import.meta.env.VITE_ARBITRUM_MOCK_ETH_ADDRESS as string,
    }
  },
} as const

// Default to Base Sepolia for prototype
export const CONFIG = {
  ...NETWORKS.BASE_SEPOLIA,
  API: {
    SOLVER_URL: import.meta.env.VITE_SOLVER_API_URL as string,
    INDEXER_URL: import.meta.env.VITE_INDEXER_URL as string,
  },
  APP: {
    NAME: 'GhostLock Prototype: MEV Reaper',
    DESCRIPTION: 'Encrypt.Randomize.Equalize - Comprehensive MEV protection demo',
    VERSION: '1.0.0-prototype',
  },

  // Enhanced Trading Configuration
  TRADING: {
    DEFAULT_SLIPPAGE_BPS: 50,
    MAX_SLIPPAGE_BPS: 1000,
    DEFAULT_TARGET_OFFSET: 20,
    MIN_TARGET_OFFSET: 5,
    MAX_TARGET_OFFSET: 100,
  },

  // Privacy Configuration
  PRIVACY: {
    DEFAULT_PADDING_SIZE: parseInt(import.meta.env.VITE_DEFAULT_PADDING_SIZE) || 256,
    DEFAULT_DUMMY_COUNT: parseInt(import.meta.env.VITE_DEFAULT_DUMMY_COUNT) || 3,
    DEFAULT_DUMMY_RATIO: parseFloat(import.meta.env.VITE_DEFAULT_DUMMY_RATIO) || 0.25,
    ENABLE_PADDING: true,
    ENABLE_DUMMY_INTENTS: true,
  },

  // Auction Configuration
  AUCTION: {
    EPOCH_DURATION_BLOCKS: 50,
    SETTLEMENT_DELAY_BLOCKS: 5,
    MAX_INTENTS_PER_BATCH: 100,
  },

  // Feature Flags
  FEATURES: {
    ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    ENABLE_3D_ANIMATIONS: import.meta.env.VITE_ENABLE_3D_ANIMATIONS === 'true',
    ENABLE_MOCK_DATA: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
    ENABLE_ATTACKER_LAB: import.meta.env.VITE_ENABLE_ATTACKER_LAB === 'true',
    ENABLE_NETWORK_SWITCHING: import.meta.env.VITE_ENABLE_NETWORK_SWITCHING === 'true',
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
    baseToken: CONFIG.contracts.MOCK_ETH,
    quoteToken: CONFIG.contracts.MOCK_USDC,
    baseSymbol: 'ETH',
    quoteSymbol: 'USDC',
    baseDecimals: 18,
    quoteDecimals: 6,
  },
  {
    id: 1,
    name: 'WBTC/USDC',
    baseToken: '0x0000000000000000000000000000000000000001',
    quoteToken: CONFIG.contracts.MOCK_USDC,
    baseSymbol: 'WBTC',
    quoteSymbol: 'USDC',
    baseDecimals: 8,
    quoteDecimals: 6,
  }
]

// Network switching utilities
export function getNetworkConfig(chainId: number) {
  switch (chainId) {
    case 84532:
      return NETWORKS.BASE_SEPOLIA
    case 8453:
      return NETWORKS.BASE_MAINNET
    case 42161:
      return NETWORKS.ARBITRUM_ONE
    default:
      return NETWORKS.BASE_SEPOLIA
  }
}

export function isMainnet(chainId: number): boolean {
  return chainId === 8453
}

export function isSepolia(chainId: number): boolean {
  return chainId === 84532
}