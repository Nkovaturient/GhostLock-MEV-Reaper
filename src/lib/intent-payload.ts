/** Plaintext intent shape encoded before tlock encryption. */
export type IntentPayload = {
  user: string
  side: 'buy' | 'sell'
  amount: string
  limitPrice: string
  slippageBps?: number
  marketId: number
  epoch: number
  market?: string
}
