/**
 * useTokenBalance.ts — single pay-token balance read (shared query key across UI).
 */
import { useEffect, useMemo, useRef } from 'react'
import { useAccount, useBalance, useChainId } from 'wagmi'
import { getTokenAddress, isNativeToken } from '../contracts/tokens'
import { BALANCE_QUERY_OPTS } from '../lib/wagmiQueryDefaults'
import { useToast } from '../../stores/toastStore'

interface TokenBalance {
  rawBalance: bigint | null
  formattedBalance: string | null
  isLoading: boolean
  isExceeded: boolean
}

const CHAIN_LABEL: Record<number, string> = {
  421614: 'Arbitrum Sepolia',
  42161: 'Arbitrum One',
}

export function useTokenBalance(
  symbol: string,
  decimals: number,
  enabled = true,
  amountIn = '',
): TokenBalance {
  const { address: userAddr, isConnected } = useAccount()
  const chainId = useChainId()
  const toast = useToast()
  const notifiedRef = useRef<string | null>(null)

  const needsToken = !isNativeToken(symbol)
  const tokenAddr = needsToken ? getTokenAddress(symbol, chainId) : undefined

  const queryEnabled =
    enabled && isConnected && !!userAddr && (!needsToken || !!tokenAddr)

  const { data, isLoading, isFetching, isError, error } = useBalance({
    address: isConnected ? userAddr : undefined,
    token: tokenAddr,
    query: {
      enabled: queryEnabled,
      ...BALANCE_QUERY_OPTS,
      retry: 2,
    },
  })

  useEffect(() => {
    notifiedRef.current = null
  }, [chainId, symbol])

  useEffect(() => {
    if (!enabled || !isConnected) return

    const chainLabel = CHAIN_LABEL[chainId] ?? `chain ${chainId}`

    if (needsToken && !tokenAddr) {
      const key = `missing-${chainId}-${symbol}`
      if (notifiedRef.current === key) return
      notifiedRef.current = key
      toast.warning(
        'Token address missing',
        `${symbol} is not mapped on ${chainLabel}. Set VITE_ARBITRUM_SEPOLIA_USDC_ADDRESS or fund the Circle test USDC contract.`,
        12_000,
      )
      return
    }

    if (isError) {
      const key = `err-${chainId}-${symbol}-${error?.message?.slice(0, 48) ?? 'rpc'}`
      if (notifiedRef.current === key) return
      notifiedRef.current = key
      toast.error(
        'Balance unavailable',
        `${symbol} on ${chainLabel}: ${error?.message ?? 'RPC read failed'}.`,
        12_000,
      )
    }
  }, [
    chainId,
    enabled,
    error,
    isConnected,
    isError,
    needsToken,
    symbol,
    tokenAddr,
    toast,
  ])

  return useMemo(() => {
    if (!enabled || !isConnected) {
      return { rawBalance: null, formattedBalance: null, isLoading: false, isExceeded: false }
    }
    if (needsToken && !tokenAddr) {
      return { rawBalance: null, formattedBalance: '—', isLoading: false, isExceeded: false }
    }
    if (isError) {
      return { rawBalance: null, formattedBalance: '—', isLoading: false, isExceeded: false }
    }
    if (isLoading || (isFetching && !data)) {
      return { rawBalance: null, formattedBalance: null, isLoading: true, isExceeded: false }
    }
    if (!data) {
      return { rawBalance: null, formattedBalance: '—', isLoading: false, isExceeded: false }
    }

    const rawBalance = data.value
    const decimalsForDisplay = decimals <= 6 ? 4 : decimals <= 8 ? 6 : 4
    const formattedBalance = parseFloat(data.formatted).toFixed(decimalsForDisplay)

    const inNum = parseFloat(amountIn)
    const isExceeded =
      inNum > 0
        ? inNum > Number(rawBalance) / 10 ** decimals
        : false

    return {
      rawBalance,
      formattedBalance,
      isLoading: false,
      isExceeded,
    }
  }, [amountIn, data, decimals, enabled, isConnected, isError, isFetching, isLoading, needsToken, tokenAddr])
}
