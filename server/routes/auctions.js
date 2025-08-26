const express = require('express')
const router = express.Router()

// Mock auction data - replace with actual blockchain data fetching
const mockAuctions = [
  {
    id: 'A-1001',
    market: 'ETH/USDC',
    clearingPrice: '3120.52',
    aiPrice: '3118.90',
    intents: 42,
    settlementBlock: 12345678,
    status: 'Settled',
    volume: 1250000,
    timestamp: Date.now() - 3600000,
    epoch: 2468,
    buyFill: '125.5',
    sellFill: '125.5'
  },
  {
    id: 'A-1000',
    market: 'WBTC/USDC',
    clearingPrice: '64123.00',
    aiPrice: '64100.12',
    intents: 11,
    settlementBlock: 12345500,
    status: 'Settling',
    volume: 890000,
    timestamp: Date.now() - 7200000,
    epoch: 2467,
    buyFill: '8.2',
    sellFill: '8.2'
  },
  {
    id: 'A-999',
    market: 'ETH/USDC',
    clearingPrice: '3115.20',
    aiPrice: '3116.45',
    intents: 28,
    settlementBlock: 12345200,
    status: 'Settled',
    volume: 750000,
    timestamp: Date.now() - 10800000,
    epoch: 2466,
    buyFill: '89.3',
    sellFill: '89.3'
  }
]

// GET /api/auctions - Get all auctions
router.get('/', (req, res) => {
  try {
    const { status, market, limit = 50 } = req.query
    
    let filteredAuctions = [...mockAuctions]
    
    // Filter by status
    if (status && status !== 'all') {
      filteredAuctions = filteredAuctions.filter(
        auction => auction.status.toLowerCase() === status.toLowerCase()
      )
    }
    
    // Filter by market
    if (market && market !== 'all') {
      filteredAuctions = filteredAuctions.filter(
        auction => auction.market === market
      )
    }
    
    // Limit results
    filteredAuctions = filteredAuctions.slice(0, parseInt(limit))
    
    res.json(filteredAuctions)
  } catch (error) {
    console.error('Error fetching auctions:', error)
    res.status(500).json({ error: 'Failed to fetch auction data' })
  }
})

// GET /api/auctions/stats - Get auction statistics
router.get('/stats', (req, res) => {
  try {
    const totalVolume = mockAuctions.reduce((sum, auction) => sum + auction.volume, 0)
    const avgIntents = Math.round(mockAuctions.reduce((sum, a) => sum + a.intents, 0) / mockAuctions.length)
    const settledCount = mockAuctions.filter(a => a.status === 'Settled').length
    
    const stats = {
      totalVolume,
      totalAuctions: mockAuctions.length,
      settledAuctions: settledCount,
      avgIntents,
      avgSettlementTime: 42, // seconds
      successRate: 99.2
    }
    
    res.json(stats)
  } catch (error) {
    console.error('Error calculating stats:', error)
    res.status(500).json({ error: 'Failed to calculate statistics' })
  }
})

// GET /api/auctions/:id - Get specific auction
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params
    const auction = mockAuctions.find(a => a.id === id)
    
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' })
    }
    
    res.json(auction)
  } catch (error) {
    console.error('Error fetching auction:', error)
    res.status(500).json({ error: 'Failed to fetch auction data' })
  }
})

module.exports = router