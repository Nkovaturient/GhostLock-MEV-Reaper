/**
 * isReady is not polled. The reveal receipt and the timeline step
 * already mark the intent decrypted. A standing eth_call during the
 * tlock wait was one of the public-RPC reads.
 */
export function useIntentReady() {
  return {
    isReady: false as const,
    isLoading: false,
    error: null,
    refetch: async () => ({ data: false as const }),
    enabled: false,
  }
}

export default useIntentReady
