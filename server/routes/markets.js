const express = require('express')
const router = express.Router()
const { ethers } = require('ethers')
require('dotenv').config()

const GHOSTLOCK_INTENTS_ABI = require('../contracts/GhostLockIntents.json')
const CONFIG = {
  CHAIN_ID: 84532, // Base Sepolia
  RPC_URL: process.env.RPC_URL || 'https://sepolia.base.org',
  CONTRACTS: {
    GHOSTLOCK_INTENTS: process.env.GHOSTLOCK_INTENTS_ADDRESS,
    MOCK_ETH: process.env.MOCK_ETH_ADDRESS,
  }
}

// Initialize provider
const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL)

// Market configuration
const MARKETS = [
  {
    id: 0,
    name: 'ETH/USDC',
    baseToken: CONFIG.CONTRACTS.MOCK_ETH,
    quoteToken: CONFIG.CONTRACTS.MOCK_USDC,
    baseSymbol: 'ETH',
    quoteSymbol: 'USDC',
    baseDecimals: 18,
    quoteDecimals: 6
  },
  {
    id: 1,
    name: 'WBTC/USDC',
    baseToken: '0x0000000000000000000000000000000000000001',
    quoteToken: CONFIG.CONTRACTS.MOCK_USDC,
    baseSymbol: 'WBTC',
    quoteSymbol: 'USDC',
    baseDecimals: 8,
    quoteDecimals: 6
  }
]

// Cache for market data
let marketDataCache = {}
let lastCacheUpdate = 0
const CACHE_DURATION = 30000 // 30 seconds

// Fetch real-time market data from contract
async function fetchMarketData() {
  try {
    if (!CONFIG.CONTRACTS.GHOSTLOCK_INTENTS) {
      throw new Error('GhostLock Intents contract address not configured')
    }

    const contract = new ethers.Contract(
      CONFIG.CONTRACTS.GHOSTLOCK_INTENTS,
      GHOSTLOCK_INTENTS_ABI,
      provider
    )

    // Get last request ID to know how many intents exist
    const lastRequestId = await contract.lastRequestId()
    
    // Fetch recent intents for market analysis
    const recentIntents = []
    const maxIntentsToFetch = Math.min(100, Number(lastRequestId))
    
    for (let i = Math.max(0, maxIntentsToFetch - 50); i < maxIntentsToFetch; i++) {
      try {
        const intent = await contract.intents(i)
        if (intent && intent.requestedBy !== ethers.ZeroAddress) {
          recentIntents.push({
            id: i,
            user: intent.requestedBy,
            targetBlock: Number(intent.unlockBlock),
            encryptedAt: Number(intent.encryptedAt),
            ready: intent.ready,
            decrypted: intent.decrypted
          })
        }
      } catch (e) {
        console.log(`Failed to fetch Intents`, e.message)
        continue
      }
    }

    // Calculate market statistics from real data
    const marketStats = calculateMarketStats(recentIntents)
    
    return {
      markets: MARKETS.map(market => ({
        ...market,
        ...marketStats[market.id]
      })),
      stats: marketStats.global
    }
  } catch (error) {
    console.error('Error fetching market data:', error)
    throw error
  }
}

// Calculate market statistics from intent data
function calculateMarketStats(intents) {
  const marketStats = {
    0: { // ETH/USDC
      currentPrice: 3120.50, // Base price - in real implementation, fetch from DEX
      volume24h: 0,
      change24h: 0,
      high24h: 3120.50,
      low24h: 3120.50,
      activeIntents: 0,
      settledIntents: 0
    },
    1: { // WBTC/USDC
      currentPrice: 64100.00,
      volume24h: 0,
      change24h: 0,
      high24h: 64100.00,
      low24h: 64100.00,
      activeIntents: 0,
      settledIntents: 0
    },
    global: {
      totalValueProtected: 0,
      mevSavings: 0,
      successRate: 0,
      avgSettlementTime: 0,
      activeTraders: new Set(),
      totalVolume24h: 0,
      marketsCount: MARKETS.length
    }
  }

  // Process intents to calculate statistics
  intents.forEach(intent => {
    // Count active intents per market
    if (intent.ready) {
      marketStats.global.settledIntents++
    } else {
      marketStats.global.activeIntents++
    }
    
    // Count unique traders
    marketStats.global.activeTraders.add(intent.user)
    
    // Calculate settlement times for ready intents
    if (intent.ready && intent.encryptedAt > 0) {
      const settlementTime = Date.now() - (intent.encryptedAt * 1000)
      marketStats.global.avgSettlementTime = 
        (marketStats.global.avgSettlementTime + settlementTime) / 2
    }
  })

  // Calculate global statistics
  marketStats.global.activeTraders = marketStats.global.activeTraders.size
  marketStats.global.successRate = intents.length > 0 ? 
    (marketStats.global.settledIntents / intents.length) * 100 : 0
  
  // Estimate MEV savings based on intent volume and protection
  marketStats.global.mevSavings = Math.floor(intents.length * 150) // $150 per intent protected
  
  // Total value protected (estimated based on active intents)
  marketStats.global.totalValueProtected = intents.length * 50000 // $50k average per intent

  return marketStats
}

// GET /api/markets - Get all markets with real-time data
router.get('/', async (req, res) => {
  try {
    // Check cache first
    if (Date.now() - lastCacheUpdate < CACHE_DURATION && Object.keys(marketDataCache).length > 0) {
      return res.json(marketDataCache.markets || [])
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

// GET /api/markets/stats - Get real-time market statistics
router.get('/stats', async (req, res) => {
  try {
    // Check cache first
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

// GET /api/markets/:id - Get specific market with real-time data
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const marketId = parseInt(id)
    
    if (marketId < 0 || marketId >= MARKETS.length) {
      return res.status(404).json({ error: 'Market not found' })
    }

    // Check cache first
    if (Date.now() - lastCacheUpdate < CACHE_DURATION && marketDataCache.markets) {
      const market = marketDataCache.markets.find(m => m.id === marketId)
      if (market) return res.json(market)
    }

    const marketData = await fetchMarketData()
    marketDataCache = marketData
    lastCacheUpdate = Date.now()
    
    const market = marketData.markets.find(m => m.id === marketId)
    if (!market) {
      return res.status(404).json({ error: 'Market not found' })
    }
    
    res.json(market)
  } catch (error) {
    console.error('Error fetching market:', error)
    res.status(500).json({ error: 'Failed to fetch market data' })
  }
})

// GET /api/markets/refresh - Force refresh market data
router.get('/refresh', async (req, res) => {
  try {
    lastCacheUpdate = 0 // Force cache refresh
    const marketData = await fetchMarketData()
    marketDataCache = marketData
    lastCacheUpdate = Date.now()
    
    res.json({ 
      success: true, 
      message: 'Market data refreshed',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error refreshing markets:', error)
    res.status(500).json({ error: 'Failed to refresh market data' })
  }
})

module.exports = router