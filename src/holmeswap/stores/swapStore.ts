import { create } from 'zustand'
import type { SwapErrorField } from '../Swap/SwapInlineError'

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
  | 'unfilled'
  | 'settled'
  | 'error'


export type TradeTab = 'swap' | 'limit' | 'buy' | 'sell'

interface SwapState {
  tradeTab: TradeTab
  tokenIn:   TokenInfo
  tokenOut:  TokenInfo
  amountIn:  string
  amountOut: string
  step:          number
  countdown:     number
  intentStatus:  IntentStatus
  targetBlock:   number
  unlockRound:   number | null
  /** Intent epoch encoded in ciphertext (unlockBlock / EPOCH_DURATION_BLOCKS). */
  intentEpoch:   number | null
  lastRequestId: string | null
  txHash:            `0x${string}` | null
  revealTxHash:      `0x${string}` | null
  ciphertextPreview: string | null
  error:             string | null
  errorField:        SwapErrorField | null
  slippageBps: number
  submissionOraclePrice: number | null
  clearingPrice: bigint | null
  mevSavings:    string
  winningBid:    string

  // Price oracle fields
  oraclePrice: number | null
  priceConfidence: number | null
  isPriceStale: boolean
  lastPriceUpdate: number | null
  priceSource: 'pyth' | 'chainlink' | 'none'

  // Gas estimation
  estimatedGasFee: string | null
  bondAmount: string | null
  totalCost: string | null

  // MEV protection
  encryptionStatus: 'idle' | 'encrypting' | 'encrypted' | 'revealed' | 'settled'
  mevProtectionEnabled: boolean
  estimatedMevSavings: number | null

  setTradeTab:             (tab: TradeTab)                 => void
  setTokenIn:              (token: TokenInfo)            => void
  setTokenOut:             (token: TokenInfo)            => void
  setAmountIn:             (amount: string)              => void
  setAmountOut:            (amount: string)              => void
  flipTokens:              ()                            => void
  setStep:                 (step: number)                => void
  setCountdown:            (countdown: number)           => void
  setIntentStatus:         (status: IntentStatus)        => void
  setTargetBlock:          (block: number)               => void
  setUnlockRound:          (round: number | null)        => void
  setIntentEpoch:          (epoch: number | null)        => void
  setLastRequestId:        (id: string | null)           => void
  setTxHash:               (hash: `0x${string}` | null) => void
  setRevealTxHash:         (hash: `0x${string}` | null) => void
  setCiphertextPreview:    (preview: string | null)      => void
  setError:                (error: string | null)        => void
  setSwapError:            (error: string | null, field?: SwapErrorField | null) => void
  setSlippageBps:          (slippageBps: number)           => void
  setSubmissionOraclePrice:(submissionOraclePrice: number | null)  => void
  setClearingPrice:        (clearingPrice: bigint | null)        => void
  setMevSavings:           (mevSavings: string)             => void
  setWinningBid:           (winningBid: string)             => void

  // Price oracle setters
  setOraclePrice:          (price: number | null)        => void
  setPriceConfidence:      (confidence: number | null)    => void
  setIsPriceStale:         (stale: boolean)             => void
  setLastPriceUpdate:      (timestamp: number | null)   => void
  setPriceSource:          (source: 'pyth' | 'chainlink' | 'none') => void

  // Gas estimation setters
  setEstimatedGasFee:      (fee: string | null)         => void
  setBondAmount:           (amount: string | null)      => void
  setTotalCost:            (cost: string | null)        => void

  // MEV protection setters
  setEncryptionStatus:     (status: 'idle' | 'encrypting' | 'encrypted' | 'revealed' | 'settled') => void
  setMevProtectionEnabled: (enabled: boolean)             => void
  setEstimatedMevSavings:  (savings: number | null)       => void

  reset:                   ()                            => void
  clearIntentProgress:     ()                            => void
}

const ETH:  TokenInfo = { symbol: 'ETH',  address: '', decimals: 18 }
const USDC: TokenInfo = { symbol: 'USDC', address: '', decimals: 6  }

export const useSwapStore = create<SwapState>((set) => ({
  tradeTab: 'swap',
  tokenIn: ETH, tokenOut: USDC,
  amountIn: '', amountOut: '',
  step: 0, countdown: 0,
  intentStatus: 'idle', targetBlock: 0, unlockRound: null, intentEpoch: null,
  lastRequestId: null, txHash: null, revealTxHash: null,
  ciphertextPreview: null, error: null, errorField: null,
  slippageBps: 50,
  submissionOraclePrice: null, clearingPrice: null,
  mevSavings: '0', winningBid: '0',

  // Price oracle initial
  oraclePrice: null,
  priceConfidence: null,
  isPriceStale: false,
  lastPriceUpdate: null,
  priceSource: 'none',

  // Gas estimation initial
  estimatedGasFee: null,
  bondAmount: null,
  totalCost: null,

  // MEV protection initial
  encryptionStatus: 'idle',
  mevProtectionEnabled: true,
  estimatedMevSavings: null,

  setTradeTab:             (tradeTab)              => set({ tradeTab }),
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
  setUnlockRound:          (unlockRound)           => set({ unlockRound }),
  setIntentEpoch:          (intentEpoch)           => set({ intentEpoch }),
  setLastRequestId:        (lastRequestId)         => set({ lastRequestId }),
  setTxHash:               (txHash)                => set({ txHash }),
  setRevealTxHash:         (revealTxHash)          => set({ revealTxHash }),
  setCiphertextPreview:    (ciphertextPreview)      => set({ ciphertextPreview }),
  setError:                (error)                 => set({ error, errorField: error ? 'general' : null }),
  setSwapError:            (error, field = null)   => set({ error, errorField: error ? (field ?? 'general') : null }),
  setSlippageBps:          (slippageBps)           => set({ slippageBps }),
  setSubmissionOraclePrice:(submissionOraclePrice)  => set({ submissionOraclePrice }),
  setClearingPrice:        (clearingPrice)          => set({ clearingPrice }),
  setMevSavings:           (mevSavings)             => set({ mevSavings }),
  setWinningBid:           (winningBid)             => set({ winningBid }),

  // Price oracle setters
  setOraclePrice:          (oraclePrice)            => set({ oraclePrice }),
  setPriceConfidence:      (priceConfidence)        => set({ priceConfidence }),
  setIsPriceStale:         (isPriceStale)           => set({ isPriceStale }),
  setLastPriceUpdate:      (lastPriceUpdate)        => set({ lastPriceUpdate }),
  setPriceSource:          (priceSource)            => set({ priceSource }),

  // Gas estimation setters
  setEstimatedGasFee:      (estimatedGasFee)        => set({ estimatedGasFee }),
  setBondAmount:           (bondAmount)             => set({ bondAmount }),
  setTotalCost:            (totalCost)              => set({ totalCost }),

  // MEV protection setters
  setEncryptionStatus:     (encryptionStatus)       => set({ encryptionStatus }),
  setMevProtectionEnabled: (mevProtectionEnabled) => set({ mevProtectionEnabled }),
  setEstimatedMevSavings:  (estimatedMevSavings)  => set({ estimatedMevSavings }),

  clearIntentProgress: () => set({
    step: 0, countdown: 0,
    intentStatus: 'idle', targetBlock: 0, unlockRound: null, intentEpoch: null,
    lastRequestId: null, txHash: null, revealTxHash: null,
    ciphertextPreview: null, error: null, errorField: null,
    submissionOraclePrice: null, clearingPrice: null,
    mevSavings: '0', winningBid: '0',
    encryptionStatus: 'idle',
  }),

  reset: () => set({
    amountIn: '', amountOut: '',
    step: 0, countdown: 0,
    intentStatus: 'idle', targetBlock: 0, unlockRound: null, intentEpoch: null,
    lastRequestId: null, txHash: null, revealTxHash: null,
    ciphertextPreview: null, error: null, errorField: null,
    submissionOraclePrice: null, clearingPrice: null,
    mevSavings: '0', winningBid: '0',

    // Reset price oracle
    oraclePrice: null,
    priceConfidence: null,
    isPriceStale: false,
    lastPriceUpdate: null,
    priceSource: 'none',

    // Reset gas estimation
    estimatedGasFee: null,
    bondAmount: null,
    totalCost: null,

    // Reset MEV protection
    encryptionStatus: 'idle',
    mevProtectionEnabled: true,
    estimatedMevSavings: null,
  }),
}))