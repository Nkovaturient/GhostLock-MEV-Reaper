import React, { createContext, useContext } from 'react'
import { useOraclePrice as useOraclePriceInternal, type TokenPairPrices } from '../hooks/useOraclePrice'

type OraclePriceContextValue = ReturnType<typeof useOraclePriceInternal>

const OraclePriceContext = createContext<OraclePriceContextValue | null>(null)

/** Single shared oracle subscription for HolmeSwap (prevents duplicate fetches). */
export function OraclePriceProvider({ children }: { children: React.ReactNode }) {
  const value = useOraclePriceInternal()
  return (
    <OraclePriceContext.Provider value={value}>
      {children}
    </OraclePriceContext.Provider>
  )
}

export function useOraclePriceContext(): OraclePriceContextValue {
  const ctx = useContext(OraclePriceContext)
  if (!ctx) {
    throw new Error('useOraclePriceContext must be used within OraclePriceProvider')
  }
  return ctx
}

export type { TokenPairPrices }
