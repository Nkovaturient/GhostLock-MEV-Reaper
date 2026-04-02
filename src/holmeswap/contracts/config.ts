/**
 * contracts/config.ts
 * Frontend-facing contract addresses and per-chain config.
 * Mirror of server/config.js — kept separate so the frontend
 * never imports the server bundle.
 */

export const SUPPORTED_CHAINS = {
    BASE_SEPOLIA: 84532,
    ARB_SEPOLIA:  421614,
  } as const
  
  export type SupportedChainId = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS]
  
  // ─── Contract addresses ───────────────────────────────────────────────────────
  // Phase 1: Base Sepolia only.  Arbitrum Sepolia mirrors added when deployed.
  
  export const ADDRESSES: Record<SupportedChainId, {
    GhostLockEpochRNG:        `0x${string}`
    PriceOracle:      `0x${string}`
    SolverRegistry:   `0x${string}`
    GhostLockLiveness: `0x${string}`
    BatchSettlement:   `0x${string}`
    SolverBoard:       `0x${string}`
  }> = {
      [SUPPORTED_CHAINS.BASE_SEPOLIA]: {
        // Liveness replaces GhostLockIntents — deploy and update
        GhostLockEpochRNG: (import.meta.env.VITE_GHOSTLOCK_EPOCH_RNG_ADDRESS ?? '0x6a0e6F76Db61985bCB4e31C71226Ba1B35dBbF1A') as `0x${string}`,
        PriceOracle: (import.meta.env.VITE_PRICE_ORACLE_ADDRESS ?? '0xB049f2a5E2aeEa5950675EA89d0DA79E5749fB5C') as `0x${string}`,
        SolverRegistry: (import.meta.env.VITE_SOLVER_REGISTRY_ADDRESS ?? '0xE8901D9f2f262f4F09E30344aA8470eCEbc64CBD') as `0x${string}`,
        GhostLockLiveness: (import.meta.env.VITE_GHOSTLOCK_LIVENESS_ADDRESS ?? '0x056B39F4fd80C86E44D2Fc6153A3e9F3d20a2C6C') as `0x${string}`,
        BatchSettlement: (import.meta.env.VITE_BATCH_SETTLEMENT_ADDRESS ?? '0x8aF0Ec5b9a22d02acdC0fb3ad75831fef3208706') as `0x${string}`,
        SolverBoard: (import.meta.env.VITE_SOLVER_BOARD_ADDRESS ?? '0x1e457f34Bdccf28258Cd30956bb6F2df614ddBEF') as `0x${string}`,
      },
    [SUPPORTED_CHAINS.ARB_SEPOLIA]: {
      PriceOracle:      '0xB049f2a5E2aeEa5950675EA89d0DA79E5749fB5C',
      SolverRegistry:   '0xE8901D9f2f262f4F09E30344aA8470eCEbc64CBD',
      GhostLockEpochRNG: '0x6a0e6F76Db61985bCB4e31C71226Ba1B35dBbF1A',
      GhostLockLiveness: '0x056B39F4fd80C86E44D2Fc6153A3e9F3d20a2C6C',
      BatchSettlement:   '0x64593911b86889F45d1CbEaF40397c4807505EB8',
      SolverBoard:       '0x1e457f34Bdccf28258Cd30956bb6F2df614ddBEF',
    },
  }
  
  // ─── Auction constants (must match server/config.js + contracts) ──────────────
  
  export const AUCTION = {
    EPOCH_DURATION_BLOCKS: 100,
    CALLBACK_GAS_LIMIT:    700_000,
    /** ETH sent as blocklock fee + liveness bond */
    SUBMISSION_VALUE_ETH:  '0.01',
  } as const
  
  // ─── Supported markets ────────────────────────────────────────────────────────
  
  export const MARKETS = [
    { id: 0, name: 'ETH/USDC',  base: 'ETH',  quote: 'USDC', baseDecimals: 18, quoteDecimals: 6 },
    { id: 1, name: 'WBTC/USDC', base: 'WBTC', quote: 'USDC', baseDecimals: 8,  quoteDecimals: 6 },
  ] as const
  
  function marketBaseKey(symbol: string) {
    const u = symbol.toUpperCase()
    return u === 'BTC' ? 'WBTC' : u
  }

  export function getMarketId(baseSymbol: string, quoteSymbol: string): number {
    const b = marketBaseKey(baseSymbol)
    const q = quoteSymbol.toUpperCase()
    const m = MARKETS.find(m => m.base.toUpperCase() === b && m.quote.toUpperCase() === q)
    return m?.id ?? 0
  }
  
  export function getAddresses(chainId: number) {
    return ADDRESSES[chainId as SupportedChainId] ?? ADDRESSES[SUPPORTED_CHAINS.BASE_SEPOLIA]
  }