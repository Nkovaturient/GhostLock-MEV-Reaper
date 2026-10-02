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
  ARB_SEPOLIA: 421614,
  ARBITRUM_ONE: 42161,
} as const

export type SupportedChainId =
  | typeof SUPPORTED_CHAINS.ARB_SEPOLIA
  | typeof SUPPORTED_CHAINS.ARBITRUM_ONE

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
  [SUPPORTED_CHAINS.ARB_SEPOLIA]: {
    PriceOracle: '0x86c4023741467c3179683ed152471921DC2D48BC',
    SolverRegistry: '0x3302E3d04d166C6D23E5B09a29a8eE3d2C7Baf98',
    GhostLockEpochRNG: '0x73A35514Ab9405381A323c513220e20ACb9d7c30',
    GhostLockLiveness: (import.meta.env.VITE_ARBITRUM_SEPOLIA_GHOSTLOCK_LIVENESS_ADDRESS ?? '0x9c3772c9B2E8ae8A074aa9Fc8Aaa4943e0ffC983') as `0x${string}`,
    BatchSettlement: (import.meta.env.VITE_ARBITRUM_SEPOLIA_BATCH_SETTLEMENT_ADDRESS ?? '0x926349E53527f690E25CF9C5d60e8791985aD14E') as `0x${string}`,
    SolverBoard: (import.meta.env.VITE_ARBITRUM_SEPOLIA_SOLVER_BOARD_ADDRESS ?? '0xB1A20FFFf4E4e15c0735fc0a79ad8BB8F3909916') as `0x${string}`,
  },
  [SUPPORTED_CHAINS.ARBITRUM_ONE]: {
    GhostLockEpochRNG: (import.meta.env.VITE_ARBITRUM_ONE_GHOSTLOCK_EPOCH_RNG_ADDRESS ?? PLACEHOLDER_ZERO) as `0x${string}`,
    PriceOracle: (import.meta.env.VITE_ARBITRUM_ONE_PRICE_ORACLE_ADDRESS ?? PLACEHOLDER_ZERO) as `0x${string}`,
    SolverRegistry: (import.meta.env.VITE_ARBITRUM_ONE_SOLVER_REGISTRY_ADDRESS ?? PLACEHOLDER_ZERO) as `0x${string}`,
    GhostLockLiveness: (import.meta.env.VITE_ARBITRUM_ONE_GHOSTLOCK_LIVENESS_ADDRESS ?? PLACEHOLDER_ZERO) as `0x${string}`,
    BatchSettlement: (import.meta.env.VITE_ARBITRUM_ONE_BATCH_SETTLEMENT_ADDRESS ?? PLACEHOLDER_ZERO) as `0x${string}`,
    SolverBoard: (import.meta.env.VITE_ARBITRUM_ONE_SOLVER_BOARD_ADDRESS ?? PLACEHOLDER_ZERO) as `0x${string}`,
  },
}

const SUPPORTED_CHAIN_IDS: readonly number[] = [
  SUPPORTED_CHAINS.ARB_SEPOLIA,
  SUPPORTED_CHAINS.ARBITRUM_ONE,
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
  return ADDRESSES[SUPPORTED_CHAINS.ARB_SEPOLIA]
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
