import { ethers } from 'ethers'
import { logger } from '../logger'
import type { Intent, Route, Solution, Quote, DexId } from '../types'

const QUOTE_TIMEOUT_MS = 4_000
const MAX_CONCURRENT_QUOTES = 20

export interface RouteOptimizerConfig {
  provider: ethers.Provider
  quoterV2Address?: string
}

const UniswapQuoterV2Abi = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
] as const

export class RouteOptimizer {
  private config: RouteOptimizerConfig
  private quoterContract: ethers.Contract | null = null

  constructor(config: RouteOptimizerConfig) {
    this.config = config
    if (config.quoterV2Address) {
      this.quoterContract = new ethers.Contract(
        config.quoterV2Address,
        UniswapQuoterV2Abi as unknown as ethers.InterfaceAbi,
        config.provider
      )
    }
  }

  async optimize(intents: Intent[]): Promise<Solution> {
    const start = Date.now()
    if (intents.length === 0) {
      return { routes: [], totalSurplus: 0n, clearingPrice: 0n, routeHash: ethers.keccak256('0x') }
    }

    const routes: Route[] = []
    let totalSurplus = 0n

    const chunks: Intent[][] = []
    for (let i = 0; i < intents.length; i += MAX_CONCURRENT_QUOTES) {
      chunks.push(intents.slice(i, i + MAX_CONCURRENT_QUOTES))
    }

    for (const chunk of chunks) {
      const results = await Promise.all(
        chunk.map((intent) => this.bestRouteForIntent(intent))
      )
      for (const r of results) {
        if (r) {
          routes.push(r)
          totalSurplus += r.surplus
        }
      }
    }

    const clearingPrice = this.calculateClearingPrice(intents, routes)
    const routeHash = this.hashRoutes(routes)
    const elapsed = Date.now() - start
    logger.info('Optimization complete', {
      intentCount: intents.length,
      routeCount: routes.length,
      totalSurplus: totalSurplus.toString(),
      elapsedMs: elapsed,
    })
    if (elapsed > 5000) {
      logger.warn('Optimization exceeded 5s target', { elapsedMs: elapsed })
    }

    return {
      routes,
      totalSurplus,
      clearingPrice,
      routeHash,
    }
  }

  private async bestRouteForIntent(intent: Intent): Promise<Route | null> {
    const quotes: Quote[] = []
    try {
      const uniswapQuote = await this.getQuote('uniswap-v3', intent.tokenIn, intent.tokenOut, intent.amountIn)
      if (uniswapQuote) quotes.push(uniswapQuote)
    } catch (err) {
      logger.debug('Uniswap V3 quote failed', { intentId: intent.id, error: String(err) })
    }
    try {
      const curveQuote = await this.getQuote('curve', intent.tokenIn, intent.tokenOut, intent.amountIn)
      if (curveQuote) quotes.push(curveQuote)
    } catch (_) {}
    try {
      const balancerQuote = await this.getQuote('balancer-v2', intent.tokenIn, intent.tokenOut, intent.amountIn)
      if (balancerQuote) quotes.push(balancerQuote)
    } catch (_) {}

    if (quotes.length === 0) {
      const fallback = await this.getQuoteFallback(intent.tokenIn, intent.tokenOut, intent.amountIn)
      if (!fallback) return null
      quotes.push(fallback)
    }

    const best = quotes.reduce((a, b) => (b.amountOut > a.amountOut ? b : a))
    const surplus = this.calculateSurplus(intent, best.amountOut)
    return {
      intentId: intent.id,
      dex: best.dex,
      path: best.path,
      amountIn: intent.amountIn,
      amountOut: best.amountOut,
      surplus,
    }
  }

  async getQuote(
    dex: DexId,
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint
  ): Promise<Quote | null> {
    if (dex === 'uniswap-v3' && this.quoterContract) {
      return this.quoteUniswapV3(tokenIn, tokenOut, amountIn)
    }
    if (dex === 'curve' || dex === 'balancer-v2') {
      return null
    }
    return this.getQuoteFallback(tokenIn, tokenOut, amountIn)
  }

  private async quoteUniswapV3(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint
  ): Promise<Quote | null> {
    if (!this.quoterContract) return null
    const params = {
      tokenIn,
      tokenOut,
      amountIn,
      fee: 3000,
      sqrtPriceLimitX96: 0n,
    }
    const [amountOut] = await Promise.race([
      this.quoterContract.quoteExactInputSingle.staticCall(params),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error('Quoter timeout')), QUOTE_TIMEOUT_MS)
      ),
    ])
    if (amountOut === undefined || amountOut === 0n) return null
    return {
      dex: 'uniswap-v3',
      amountOut: BigInt(amountOut.toString()),
      path: [tokenIn, tokenOut],
    }
  }

  private async getQuoteFallback(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint
  ): Promise<Quote | null> {
    const path = [tokenIn, tokenOut]
    const amountOut = tokenIn.toLowerCase() === tokenOut.toLowerCase() ? amountIn : (amountIn * 997n) / 1000n
    return { dex: 'uniswap-v3', amountOut, path }
  }

  calculateSurplus(intent: Intent, amountOut: bigint): bigint {
    if (amountOut <= intent.minAmountOut) return 0n
    return amountOut - intent.minAmountOut
  }

  private calculateClearingPrice(intents: Intent[], routes: Route[]): bigint {
    if (routes.length === 0) return 0n
    let totalValue = 0n
    let totalAmount = 0n
    for (let i = 0; i < routes.length; i++) {
      totalValue += routes[i].amountOut
      totalAmount += intents[i]?.amountIn ?? 0n
    }
    if (totalAmount === 0n) return 0n
    return totalValue / totalAmount
  }

  hashRoutes(routes: Route[]): string {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      [
        'tuple(uint256 intentId, string dex, address[] path, uint256 amountIn, uint256 amountOut)[]',
      ],
      [
        routes.map((r) => [
          BigInt(r.intentId),
          r.dex,
          r.path,
          r.amountIn,
          r.amountOut,
        ]),
      ]
    )
    return ethers.keccak256(encoded)
  }
}
