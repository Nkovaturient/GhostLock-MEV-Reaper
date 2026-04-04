import { getMarketFromTokenPair } from '../contracts/config'

/** 0 = Buy base with quote, 1 = Sell base for quote (matches BatchSettlement + BlocklockService) */
export type IntentSideNum = 0 | 1

export interface IntentEncodeInput {
  tokenInSymbol: string
  tokenOutSymbol: string
  amountIn: string
  /** Always USDC (quote) per 1 unit of base, from oracle (e.g. ~3000 for ETH/USDC) */
  quotePerBase: number
  slippageBps: number
}

export interface ComputedIntentParams {
  side: IntentSideNum
  baseAmount: string
  limitPrice: string
  marketId: number
}

function formatLimitForParseUnits(n: number, quoteDecimals: number): string {
  const s = n.toFixed(quoteDecimals)
  if (!/^\d*\.?\d+$/.test(s)) return n.toPrecision(quoteDecimals + 2)
  return s
}

/** Base token human amount string safe for ethers.parseUnits (no scientific notation). */
function formatBaseAmountForParseUnits(n: number, baseDecimals: number): string {
  const maxDec = Math.min(baseDecimals, 18)
  let s = n.toFixed(maxDec).replace(/\.?0+$/, '')
  if (s === '' || s === '.') s = '0'
  return s
}

/**
 * BatchSettlement limits (same units as on-chain clearingPrice / limitPrice after abi decode):
 * - Buy (0): clearingPrice <= limitPrice → limit = oracleQuotePerBase * (1 + slippage)
 * - Sell (1): clearingPrice >= limitPrice → limit = oracleQuotePerBase * (1 - slippage)
 */
export function computeIntentParamsFromOracle(input: IntentEncodeInput): ComputedIntentParams | null {
  const resolved = getMarketFromTokenPair(input.tokenInSymbol, input.tokenOutSymbol)
  if (!resolved || !input.quotePerBase || input.quotePerBase <= 0) return null

  const { market, intentSide } = resolved
  const slip = input.slippageBps / 10_000

  if (intentSide === 'sell') {
    const limitPriceNum = input.quotePerBase * (1 - slip)
    return {
      side: 1,
      baseAmount: input.amountIn,
      limitPrice: formatLimitForParseUnits(limitPriceNum, market.quoteDecimals),
      marketId: market.id,
    }
  }

  const quoteAmount = parseFloat(input.amountIn)
  if (!Number.isFinite(quoteAmount) || quoteAmount <= 0) return null
  const baseAmountNum = quoteAmount / input.quotePerBase
  const limitPriceNum = input.quotePerBase * (1 + slip)
  return {
    side: 0,
    baseAmount: formatBaseAmountForParseUnits(baseAmountNum, market.baseDecimals),
    limitPrice: formatLimitForParseUnits(limitPriceNum, market.quoteDecimals),
    marketId: market.id,
  }
}
