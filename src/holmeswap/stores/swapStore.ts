import { create } from 'zustand'

export interface TokenInfo {
  symbol:   string
  address:  string
  decimals: number
}

export type IntentStatus =
  | 'idle'
  | 'encrypting'
  | 'submitting'
  | 'locked'
  | 'ordering'
  | 'competing'
  | 'settled'
  | 'error'

interface SwapState {
  tokenIn:   TokenInfo
  tokenOut:  TokenInfo
  amountIn:  string
  amountOut: string
  step:          number
  countdown:     number
  intentStatus:  IntentStatus
  targetBlock:   number
  lastRequestId: number | null
  txHash:            `0x${string}` | null
  ciphertextPreview: string | null
  error:             string | null
  slippageBps: number
  submissionOraclePrice: number | null
  clearingPrice: bigint | null
  mevSavings:    string
  winningBid:    string

  setTokenIn:              (token: TokenInfo)            => void
  setTokenOut:             (token: TokenInfo)            => void
  setAmountIn:             (amount: string)              => void
  setAmountOut:            (amount: string)              => void
  flipTokens:              ()                            => void
  setStep:                 (step: number)                => void
  setCountdown:            (countdown: number)           => void
  setIntentStatus:         (status: IntentStatus)        => void
  setTargetBlock:          (block: number)               => void
  setLastRequestId:        (id: number | null)           => void
  setTxHash:               (hash: `0x${string}` | null) => void
  setCiphertextPreview:    (preview: string | null)      => void
  setError:                (error: string | null)        => void
  setSlippageBps:          (bps: number)                 => void
  setSubmissionOraclePrice:(price: number | null)        => void
  setClearingPrice:        (price: bigint | null)        => void
  setMevSavings:           (savings: string)             => void
  setWinningBid:           (bid: string)                 => void
  reset:                   ()                            => void
}

const ETH:  TokenInfo = { symbol: 'ETH',  address: '', decimals: 18 }
const USDC: TokenInfo = { symbol: 'USDC', address: '', decimals: 6  }

export const useSwapStore = create<SwapState>((set) => ({
  tokenIn: ETH, tokenOut: USDC,
  amountIn: '', amountOut: '',
  step: 0, countdown: 0,
  intentStatus: 'idle', targetBlock: 0,
  lastRequestId: null, txHash: null,
  ciphertextPreview: null, error: null,
  slippageBps: 50,
  submissionOraclePrice: null, clearingPrice: null,
  mevSavings: '0', winningBid: '0',

  setTokenIn:              (tokenIn)               => set({ tokenIn }),
  setTokenOut:             (tokenOut)              => set({ tokenOut }),
  setAmountIn:             (amountIn)              => set({ amountIn }),
  setAmountOut:            (amountOut)             => set({ amountOut }),
  flipTokens:              ()                      => set(s => ({
    tokenIn: s.tokenOut, tokenOut: s.tokenIn,
    amountIn: s.amountOut, amountOut: s.amountIn,
  })),
  setStep:                 (step)                  => set({ step }),
  setCountdown:            (countdown)             => set({ countdown }),
  setIntentStatus:         (intentStatus)          => set({ intentStatus }),
  setTargetBlock:          (targetBlock)           => set({ targetBlock }),
  setLastRequestId:        (lastRequestId)         => set({ lastRequestId }),
  setTxHash:               (txHash)                => set({ txHash }),
  setCiphertextPreview:    (ciphertextPreview)      => set({ ciphertextPreview }),
  setError:                (error)                 => set({ error }),
  setSlippageBps:          (slippageBps)           => set({ slippageBps }),
  setSubmissionOraclePrice:(submissionOraclePrice)  => set({ submissionOraclePrice }),
  setClearingPrice:        (clearingPrice)          => set({ clearingPrice }),
  setMevSavings:           (mevSavings)             => set({ mevSavings }),
  setWinningBid:           (winningBid)             => set({ winningBid }),

  reset: () => set({
    amountIn: '', amountOut: '',
    step: 0, countdown: 0,
    intentStatus: 'idle', targetBlock: 0,
    lastRequestId: null, txHash: null,
    ciphertextPreview: null, error: null,
    submissionOraclePrice: null, clearingPrice: null,
    mevSavings: '0', winningBid: '0',
  }),
}))