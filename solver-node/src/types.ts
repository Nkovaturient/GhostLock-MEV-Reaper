export interface ContractIntent {
  user: string
  side: number
  amount: bigint
  limitPrice: bigint
  marketId: number
  epoch: bigint
}

export interface Intent {
  id: string
  user: string
  side: 'buy' | 'sell'
  amount: bigint
  limitPrice: bigint
  marketId: number
  epoch: number
  tokenIn: string
  tokenOut: string
  amountIn: bigint
  minAmountOut: bigint
}

export type DexId = 'uniswap-v3' | 'curve' | 'balancer-v2'

export interface Route {
  intentId: string
  dex: DexId
  path: string[]
  amountIn: bigint
  amountOut: bigint
  surplus: bigint
}

export interface Solution {
  routes: Route[]
  totalSurplus: bigint
  clearingPrice: bigint
  routeHash: string
}

export interface Quote {
  dex: DexId
  amountOut: bigint
  path: string[]
}
