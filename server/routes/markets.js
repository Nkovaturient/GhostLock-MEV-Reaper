const express = require('express')
const router = express.Router()
const { ethers } = require('ethers')
const axios = require('axios')
const { CONFIG, ABIS } = require('../config.js')

const COINGECKO_API = 'https://api.coingecko.com/api/v3'

const MARKETS = [
  {
    id: 0,
    name: 'ETH/USDC',
    baseSymbol: 'ETH',
    quoteSymbol: 'USDC',
    coingeckoId: 'ethereum',
  },
  {
    id: 1,
    name: 'WBTC/USDC',
    baseSymbol: 'WBTC',
    quoteSymbol: 'USDC',
    coingeckoId: 'wrapped-bitcoin',
  },
]

let marketDataCache = {}
let lastCacheUpdate = 0
const CACHE_DURATION = 30_000

const provider = new ethers.JsonRpcProvider(CONFIG.NETWORK.RPC_URL)

async function fetchPriceData() {
  try {
    const coinIds = MARKETS.map((m) => m.coingeckoId).join(',')
    const response = await axios.get(
      `${COINGECKO_API}/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_24hr_high=true&include_24hr_low=true`,
    )

    const priceData = {}
    MARKETS.forEach((market) => {
      const data = response.data[market.coingeckoId]
      if (data) {
        priceData[market.id] = {
          currentPrice: data.usd,
          change24h: data.usd_24h_change || 0,
          volume24h: data.usd_24h_vol || 0,
          high24h: data.usd_24h_high || data.usd,
          low24h: data.usd_24h_low || data.usd,
        }
      }
    })
    return priceData
  } catch (error) {
    console.error('Error fetching price data:', error.message)
    return {
      0: { currentPrice: 3120.5, change24h: 0, volume24h: 0, high24h: 3120.5, low24h: 3120.5 },
      1: { currentPrice: 64100, change24h: 0, volume24h: 0, high24h: 64100, low24h: 64100 },
    }
  }
}

async function fetchLivenessIntentStats() {
  const liveness = CONFIG.CONTRACTS.GHOSTLOCK_LIVENESS
  if (!liveness) return { activeIntents: 0, settledIntents: 0, traders: new Set() }

  const contract = new ethers.Contract(
    liveness,
    ABIS.GHOSTLOCK_LIVENESS_ABI,
    provider,
  )

  let activeIntents = 0
  let settledIntents = 0
  const traders = new Set()

  try {
    const filter = contract.filters.IntentSubmitted()
    const logs = await contract.queryFilter(filter, -50_000)
    for (const log of logs.slice(-100)) {
      const requestId = log.args?.requestId
      if (requestId == null) continue
      const intent = await contract.intents(requestId)
      if (!intent?.requestedBy || intent.requestedBy === ethers.ZeroAddress) continue
      traders.add(intent.requestedBy.toLowerCase())
      if (intent.ready) settledIntents += 1
      else activeIntents += 1
    }
  } catch (error) {
    console.warn('[markets] Liveness intent stats unavailable:', error.message)
  }

  return { activeIntents, settledIntents, traders }
}

async function fetchMarketData() {
  const [priceData, intentStats] = await Promise.all([
    fetchPriceData(),
    fetchLivenessIntentStats(),
  ])

  const markets = MARKETS.map((market) => ({
    ...market,
    ...(priceData[market.id] || {}),
    activeIntents: intentStats.activeIntents,
    settledIntents: intentStats.settledIntents,
  }))

  const stats = {
    totalValueProtected: intentStats.activeIntents * 50_000,
    mevSavings: 0,
    successRate:
      intentStats.activeIntents + intentStats.settledIntents > 0
        ? (intentStats.settledIntents /
            (intentStats.activeIntents + intentStats.settledIntents)) *
          100
        : 0,
    avgSettlementTime: 0,
    activeTraders: intentStats.traders.size,
    totalVolume24h: Object.values(priceData).reduce(
      (sum, data) => sum + (data.volume24h || 0),
      0,
    ),
    marketsCount: MARKETS.length,
  }

  return { markets, stats }
}

router.get('/', async (_req, res) => {
  try {
    if (Date.now() - lastCacheUpdate < CACHE_DURATION && marketDataCache.markets) {
      return res.json(marketDataCache.markets)
    }
    const marketData = await fetchMarketData()
    marketDataCache = marketData
    lastCacheUpdate = Date.now()
    res.json(marketData.markets)
  } catch (error) {
    console.error('Error fetching markets:', error)
    res.status(500).json({ error: 'Failed to fetch market data' })
  }
})

router.get('/stats', async (_req, res) => {
  try {
    if (Date.now() - lastCacheUpdate < CACHE_DURATION && marketDataCache.stats) {
      return res.json(marketDataCache.stats)
    }
    const marketData = await fetchMarketData()
    marketDataCache = marketData
    lastCacheUpdate = Date.now()
    res.json(marketData.stats)
  } catch (error) {
    console.error('Error calculating market stats:', error)
    res.status(500).json({ error: 'Failed to calculate market statistics' })
  }
})

router.get('/refresh', async (_req, res) => {
  try {
    lastCacheUpdate = 0
    const marketData = await fetchMarketData()
    marketDataCache = marketData
    lastCacheUpdate = Date.now()
    res.json({
      success: true,
      message: 'Market data refreshed',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error refreshing markets:', error)
    res.status(500).json({ error: 'Failed to refresh market data' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const marketId = parseInt(req.params.id, 10)
    if (marketId < 0 || marketId >= MARKETS.length) {
      return res.status(404).json({ error: 'Market not found' })
    }
    if (Date.now() - lastCacheUpdate < CACHE_DURATION && marketDataCache.markets) {
      const market = marketDataCache.markets.find((m) => m.id === marketId)
      if (market) return res.json(market)
    }
    const marketData = await fetchMarketData()
    marketDataCache = marketData
    lastCacheUpdate = Date.now()
    const market = marketData.markets.find((m) => m.id === marketId)
    if (!market) return res.status(404).json({ error: 'Market not found' })
    res.json(market)
  } catch (error) {
    console.error('Error fetching market:', error)
    res.status(500).json({ error: 'Failed to fetch market data' })
  }
})

module.exports = router
