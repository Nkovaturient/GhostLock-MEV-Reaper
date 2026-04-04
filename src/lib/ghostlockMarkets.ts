/**
 * Single source for GhostLock / HolmeSwap market metadata (decimals, ids).
 * Used by blocklock encoding, holmeswap config, and legacy lib/config mapping.
 */
export const GHOSTLOCK_MARKETS = [
  { id: 0, name: 'ETH/USDC', base: 'ETH', quote: 'USDC', baseDecimals: 18, quoteDecimals: 6 },
  { id: 1, name: 'WBTC/USDC', base: 'WBTC', quote: 'USDC', baseDecimals: 8, quoteDecimals: 6 },
] as const

export type GhostlockMarket = (typeof GHOSTLOCK_MARKETS)[number]
