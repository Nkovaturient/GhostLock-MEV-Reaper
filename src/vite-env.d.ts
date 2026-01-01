/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RPC_URL?: string
  readonly VITE_GHOSTLOCK_INTENTS_ADDRESS?: string
  readonly VITE_BATCH_SETTLEMENT_ADDRESS?: string
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string
  readonly VITE_EPOCH_RNG_ADDRESS?: string
  readonly VITE_MOCK_ETH_ADDRESS?: string
  readonly VITE_MOCK_USDC_ADDRESS?: string
  readonly VITE_MOCK_TOKEN_A_ADDRESS?: string
  readonly VITE_MOCK_TOKEN_B_ADDRESS?: string
  readonly VITE_SOLVER_API_URL?: string
  readonly VITE_INDEXER_URL?: string
  readonly VITE_ARBITRUM_GHOSTLOCK_INTENTS_ADDRESS?: string
  readonly VITE_ARBITRUM_EPOCH_RNG_ADDRESS?: string
  readonly VITE_ARBITRUM_ONE_RPC_URL?: string
  readonly VITE_ARBITRUM_SEPOLIA_RPC_URL?: string
  readonly VITE_BASE_MAINNET_RPC_URL?: string
  readonly VITE_BASE_MAINNET_GHOSTLOCK_INTENTS_ADDRESS?: string
  readonly VITE_BASE_MAINNET_EPOCH_RNG_ADDRESS?: string
  readonly VITE_ARBITRUM_SEPOLIA_GHOSTLOCK_INTENTS_ADDRESS?: string
  readonly VITE_ARBITRUM_SEPOLIA_EPOCH_RNG_ADDRESS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

