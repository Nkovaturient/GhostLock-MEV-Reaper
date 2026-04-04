/**
 * contracts/config.ts
 * Frontend-facing contract addresses and per-chain config.
 * Mirror of server/config.js — kept separate so the frontend
 * never imports the server bundle.
 */

import { GHOSTLOCK_MARKETS, type GhostlockMarket } from '../../lib/ghostlockMarkets'

/** Placeholder when a chain is listed in wagmi but contracts are not deployed / env not set. */
export const PLACEHOLDER_ZERO = '0x0000000000000000000000000000000000000000' as const

export const SUPPORTED_CHAINS = {
  BASE_SEPOLIA: 84532,
  ARB_SEPOLIA: 421614,
  ARBITRUM_ONE: 42161,
  BASE_MAINNET: 8453,
} as const

export type SupportedChainId =
  | typeof SUPPORTED_CHAINS.BASE_SEPOLIA
  | typeof SUPPORTED_CHAINS.ARB_SEPOLIA
  | typeof SUPPORTED_CHAINS.ARBITRUM_ONE
  | typeof SUPPORTED_CHAINS.BASE_MAINNET

export type HolmeswapCluster = {
  GhostLockEpochRNG: `0x${string}`
  PriceOracle: `0x${string}`
  SolverRegistry: `0x${string}`
  GhostLockLiveness: `0x${string}`
  BatchSettlement: `0x${string}`
  SolverBoard: `0x${string}`
}

// ─── Contract addresses ───────────────────────────────────────────────────────

export const ADDRESSES: Record<SupportedChainId, HolmeswapCluster> = {
  [SUPPORTED_CHAINS.BASE_SEPOLIA]: {
    GhostLockEpochRNG: (import.meta.env.VITE_GHOSTLOCK_EPOCH_RNG_ADDRESS ?? '0x6a0e6F76Db61985bCB4e31C71226Ba1B35dBbF1A') as `0x${string}`,
    PriceOracle: (import.meta.env.VITE_PRICE_ORACLE_ADDRESS ?? '0xB049f2a5E2aeEa5950675EA89d0DA79E5749fB5C') as `0x${string}`,
    SolverRegistry: (import.meta.env.VITE_SOLVER_REGISTRY_ADDRESS ?? '0xE8901D9f2f262f4F09E30344aA8470eCEbc64CBD') as `0x${string}`,
    GhostLockLiveness: (import.meta.env.VITE_GHOSTLOCK_LIVENESS_ADDRESS ?? '0x056B39F4fd80C86E44D2Fc6153A3e9F3d20a2C6C') as `0x${string}`,
    BatchSettlement: (import.meta.env.VITE_BATCH_SETTLEMENT_ADDRESS ?? '0x8aF0Ec5b9a22d02acdC0fb3ad75831fef3208706') as `0x${string}`,
    SolverBoard: (import.meta.env.VITE_SOLVER_BOARD_ADDRESS ?? '0x1e457f34Bdccf28258Cd30956bb6F2df614ddBEF') as `0x${string}`,
  },
  [SUPPORTED_CHAINS.ARB_SEPOLIA]: {
    PriceOracle: '0xB049f2a5E2aeEa5950675EA89d0DA79E5749fB5C',
    SolverRegistry: '0xE8901D9f2f262f4F09E30344aA8470eCEbc64CBD',
    GhostLockEpochRNG: '0x6a0e6F76Db61985bCB4e31C71226Ba1B35dBbF1A',
    GhostLockLiveness: (import.meta.env.VITE_ARBITRUM_SEPOLIA_GHOSTLOCK_LIVENESS_ADDRESS ?? '0x056B39F4fd80C86E44D2Fc6153A3e9F3d20a2C6C') as `0x${string}`,
    BatchSettlement: (import.meta.env.VITE_ARBITRUM_SEPOLIA_BATCH_SETTLEMENT_ADDRESS ?? '0x64593911b86889F45d1CbEaF40397c4807505EB8') as `0x${string}`,
    SolverBoard: (import.meta.env.VITE_ARBITRUM_SEPOLIA_SOLVER_BOARD_ADDRESS ?? '0x1e457f34Bdccf28258Cd30956bb6F2df614ddBEF') as `0x${string}`,
  },
  [SUPPORTED_CHAINS.ARBITRUM_ONE]: {
    GhostLockEpochRNG: (import.meta.env.VITE_ARBITRUM_ONE_GHOSTLOCK_EPOCH_RNG_ADDRESS ?? PLACEHOLDER_ZERO) as `0x${string}`,
    PriceOracle: (import.meta.env.VITE_ARBITRUM_ONE_PRICE_ORACLE_ADDRESS ?? PLACEHOLDER_ZERO) as `0x${string}`,
    SolverRegistry: (import.meta.env.VITE_ARBITRUM_ONE_SOLVER_REGISTRY_ADDRESS ?? PLACEHOLDER_ZERO) as `0x${string}`,
    GhostLockLiveness: (import.meta.env.VITE_ARBITRUM_ONE_GHOSTLOCK_LIVENESS_ADDRESS ?? PLACEHOLDER_ZERO) as `0x${string}`,
    BatchSettlement: (import.meta.env.VITE_ARBITRUM_ONE_BATCH_SETTLEMENT_ADDRESS ?? PLACEHOLDER_ZERO) as `0x${string}`,
    SolverBoard: (import.meta.env.VITE_ARBITRUM_ONE_SOLVER_BOARD_ADDRESS ?? PLACEHOLDER_ZERO) as `0x${string}`,
  },
  [SUPPORTED_CHAINS.BASE_MAINNET]: {
    GhostLockEpochRNG: (import.meta.env.VITE_BASE_MAINNET_GHOSTLOCK_EPOCH_RNG_ADDRESS ?? PLACEHOLDER_ZERO) as `0x${string}`,
    PriceOracle: (import.meta.env.VITE_BASE_MAINNET_PRICE_ORACLE_ADDRESS ?? PLACEHOLDER_ZERO) as `0x${string}`,
    SolverRegistry: (import.meta.env.VITE_BASE_MAINNET_SOLVER_REGISTRY_ADDRESS ?? PLACEHOLDER_ZERO) as `0x${string}`,
    GhostLockLiveness: (import.meta.env.VITE_BASE_MAINNET_GHOSTLOCK_LIVENESS_ADDRESS ?? PLACEHOLDER_ZERO) as `0x${string}`,
    BatchSettlement: (import.meta.env.VITE_BASE_MAINNET_BATCH_SETTLEMENT_ADDRESS ?? PLACEHOLDER_ZERO) as `0x${string}`,
    SolverBoard: (import.meta.env.VITE_BASE_MAINNET_SOLVER_BOARD_ADDRESS ?? PLACEHOLDER_ZERO) as `0x${string}`,
  },
}

const SUPPORTED_CHAIN_IDS: readonly number[] = [
  SUPPORTED_CHAINS.BASE_SEPOLIA,
  SUPPORTED_CHAINS.ARB_SEPOLIA,
  SUPPORTED_CHAINS.ARBITRUM_ONE,
  SUPPORTED_CHAINS.BASE_MAINNET,
]

export function isHolmeswapChainId(chainId: number): chainId is SupportedChainId {
  return SUPPORTED_CHAIN_IDS.includes(chainId)
}

export function isGhostLockLivenessConfigured(chainId: number): boolean {
  if (!isHolmeswapChainId(chainId)) return false
  const a = ADDRESSES[chainId].GhostLockLiveness
  return Boolean(a && a !== PLACEHOLDER_ZERO)
}

export function getAddresses(chainId: number): HolmeswapCluster {
  if (isHolmeswapChainId(chainId)) return ADDRESSES[chainId]
  return ADDRESSES[SUPPORTED_CHAINS.BASE_SEPOLIA]
}

// ─── Auction constants (must match server/config.js + contracts) ──────────────

export const AUCTION = {
  EPOCH_DURATION_BLOCKS: 100,
  /** Requested callback gas; clamped on-chain to blocklock getConfig().maxGasLimit (often 500k). */
  CALLBACK_GAS_LIMIT: 700_000,
} as const

// ─── Supported markets (single source: lib/ghostlockMarkets.ts) ──────────────

export const MARKETS = GHOSTLOCK_MARKETS

function marketBaseKey(symbol: string) {
  const u = symbol.toUpperCase()
  return u === 'BTC' ? 'WBTC' : u
}

/**
 * Canonical market id when caller already knows base then quote (e.g. ETH, USDC).
 */
export function getMarketId(baseSymbol: string, quoteSymbol: string): number {
  const b = marketBaseKey(baseSymbol)
  const q = quoteSymbol.toUpperCase()
  const m = MARKETS.find(m => m.base.toUpperCase() === b && m.quote.toUpperCase() === q)
  return m?.id ?? 0
}

/**
 * Resolve swap direction: sell base→quote (intent side 1) or buy base with quote (intent side 0).
 */
export function getMarketFromTokenPair(
  tokenIn: string,
  tokenOut: string,
): { market: GhostlockMarket; intentSide: 'buy' | 'sell' } | null {
  const a = marketBaseKey(tokenIn).toUpperCase()
  const b = tokenOut.toUpperCase()
  for (const m of MARKETS) {
    const mb = m.base.toUpperCase()
    const mq = m.quote.toUpperCase()
    if (a === mb && b === mq) return { market: m, intentSide: 'sell' }
    if (a === mq && b === mb) return { market: m, intentSide: 'buy' }
  }
  return null
}
