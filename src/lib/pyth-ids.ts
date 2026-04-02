/**
 * Pyth price feed IDs (hex, no 0x prefix in API).
 * https://docs.pyth.network/price-feeds/core/price-feeds/price-feed-ids
 */
export const PYTH_PRICE_IDS = {
  ETH_USD: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  USDC_USD: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  BTC_USD: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
} as const

export const HERMES_BASE = 'https://hermes.pyth.network'
