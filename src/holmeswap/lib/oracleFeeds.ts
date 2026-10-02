import { PYTH_PRICE_IDS } from '../../lib/pyth-ids'
import { SUPPORTED_CHAINS } from '../contracts/config'

/** On-chain Pyth contract per chain (matches contracts/.env.example). */
export const PYTH_CONTRACT_BY_CHAIN: Partial<Record<number, `0x${string}`>> = {
  [SUPPORTED_CHAINS.ARB_SEPOLIA]: '0x4374e5a8b9C22271E9EB878A2AA31DE97DF15DAF',
  [SUPPORTED_CHAINS.ARBITRUM_ONE]: '0xff1a0f4744e8582DF1aE09D5611b887B6a12925C',
}

const PYTH_ABI = [
  {
    inputs: [{ name: 'id', type: 'bytes32' }],
    name: 'getPriceUnsafe',
    outputs: [
      {
        components: [
          { name: 'price', type: 'int64' },
          { name: 'conf', type: 'uint64' },
          { name: 'expo', type: 'int32' },
          { name: 'publishTime', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export { PYTH_ABI }

/** Map market symbol → Pyth price feed id (bytes32 hex). */
export function getPythPriceIdForSymbol(symbol: string): `0x${string}` | null {
  const sym = symbol.toUpperCase()
  if (sym === 'ETH' || sym === 'WETH') return PYTH_PRICE_IDS.ETH_USD as `0x${string}`
  if (sym === 'BTC' || sym === 'WBTC') return PYTH_PRICE_IDS.BTC_USD as `0x${string}`
  if (sym === 'USDC') return PYTH_PRICE_IDS.USDC_USD as `0x${string}`
  return null
}

/** CoinGecko id for USD fallback when on-chain quote leg is stale. */
export function getCoingeckoId(symbol: string): string | null {
  const sym = symbol.toUpperCase()
  if (sym === 'ETH' || sym === 'WETH') return 'ethereum'
  if (sym === 'BTC' || sym === 'WBTC') return 'wrapped-bitcoin'
  if (sym === 'USDC') return 'usd-coin'
  return null
}
