const express = require('express')
const router = express.Router()

// Mock market data
const mockMarkets = [
  {
    id: 0,
    name: 'ETH/USDC',
    baseToken: 'CONTRACT_ADDRESS_PLACEHOLDER',
    quoteToken: 'CONTRACT_ADDRESS_PLACEHOLDER',
    baseSymbol: 'ETH',
    quoteSymbol: 'USDC',
    currentPrice: 3120.50,
    volume24h: 2400000,
    change24h: 2.5,
    high24h: 3145.20,
    low24h: 3098.30
  },
  {
    id: 1,
    name: 'WBTC/USDC',
    baseToken: 'CONTRACT_ADDRESS_PLACEHOLDER',
    quoteToken: 'CONTRACT_ADDRESS_PLACEHOLDER',
    baseSymbol: 'WBTC',
    quoteSymbol: 'USDC',
    currentPrice: 64100.00,
    volume24h: 1800000,
    change24h: -1.2,
    high24h: 64850.00,
    low24h: 63920.00
  }
]

// GET /api/markets - Get all markets
router.get('/', (req, res) => {
  try {
    res.json(mockMarkets)
  } catch (error) {
    console.error('Error fetching markets:', error)
    res.status(500).json({ error: 'Failed to fetch market data' })
  }
})

// GET /api/markets/:id - Get specific market
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params
    const market = mockMarkets.find(m => m.id === parseInt(id))
    
    if (!market) {
      return res.status(404).json({ error: 'Market not found' })
    }
    
    res.json(market)
  } catch (error) {
    console.error('Error fetching market:', error)
    res.status(500).json({ error: 'Failed to fetch market data' })
  }
})

// GET /api/markets/stats - Get market statistics
router.get('/stats', (req, res) => {
  try {
    const totalVolume = mockMarkets.reduce((sum, market) => sum + market.volume24h, 0)
    const avgPrice = mockMarkets.reduce((sum, market) => sum + market.currentPrice, 0) / mockMarkets.length
    
    const stats = {
      totalValueProtected: 12400000,
      mevSavings: 847000,
      successRate: 99.8,
      avgSettlementTime: 42,
      activeTraders: 1247,
      totalVolume24h: totalVolume,
      avgPrice,
      marketsCount: mockMarkets.length
    }
    
    res.json(stats)
  } catch (error) {
    console.error('Error calculating market stats:', error)
    res.status(500).json({ error: 'Failed to calculate market statistics' })
  }
})

module.exports = router