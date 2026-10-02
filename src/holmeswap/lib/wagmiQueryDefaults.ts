/** Shared wagmi / TanStack Query defaults for HolmeSwap read paths. */
export const BALANCE_QUERY_OPTS = {
  refetchInterval: 60_000,
  refetchIntervalInBackground: false,
  staleTime: 55_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const

export const BOND_QUERY_OPTS = {
  staleTime: 5 * 60_000,
  gcTime: 10 * 60_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: false,
} as const

export function isDocumentVisible(): boolean {
  return typeof document === 'undefined' || !document.hidden
}
