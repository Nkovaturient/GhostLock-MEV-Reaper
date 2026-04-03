/**
 * useTokenBalance.ts
 *
 * Fetches token balance for the connected wallet
 * Supports both native ETH and ERC-20 tokens
 */
import { useMemo } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { useChainId } from 'wagmi'
import { getTokenAddress, isNativeToken } from '../contracts/tokens'

interface TokenBalance {
  rawBalance: bigint | null
  formattedBalance: string | null
  isLoading: boolean
  isExceeded: boolean
}

export function useTokenBalance(symbol: string, decimals: number): TokenBalance {
  const { address: userAddr, isConnected } = useAccount()
  const chainId = useChainId()
  const tokenAddr = isNativeToken(symbol) ? undefined : getTokenAddress(symbol, chainId)

  const { data, isLoading } = useBalance({
    address: isConnected ? userAddr : undefined,
    token: tokenAddr,
    query: { enabled: isConnected && !!userAddr, refetchInterval: 10_000 },
  })

  return useMemo(() => {
    if (!isConnected) {
      return { rawBalance: null, formattedBalance: null, isLoading: false, isExceeded: false }
    }
    if (isLoading) {
      return { rawBalance: null, formattedBalance: null, isLoading: true, isExceeded: false }
    }
    if (!data) {
      return { rawBalance: null, formattedBalance: '—', isLoading: false, isExceeded: false }
    }

    const rawBalance = data.value
    const decimalsForDisplay = decimals <= 6 ? 4 : decimals <= 8 ? 6 : 4
    const formattedBalance = parseFloat(data.formatted).toFixed(decimalsForDisplay)

    return {
      rawBalance,
      formattedBalance,
      isLoading: false,
      isExceeded: false, // Will be checked by caller
    }
  }, [data, decimals, isConnected, isLoading])
}
