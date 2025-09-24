const express = require('express')
const { ethers } = require('ethers')
const { CONFIG, MARKETS } = require('../config.js')
const { fetchReadyIntents, groupIntentsByMarketEpoch } = require('../services/intents.js')
const { computeUniformClearingPrice } = require('../services/price.js')
const { solverService } = require('../services/solver.js')

const router = express.Router()

// Cache for auction data
let auctionCache = {
  data: [],
  lastUpdate: 0,
  ttl: 30000 // 30 seconds
}

/**
 * Fetch auction data from blockchain and cache it
 */
async function fetchAuctionData() {
  const now = Date.now()
  if (now - auctionCache.lastUpdate < auctionCache.ttl) {
    return auctionCache.data
  }

  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.NETWORK.RPC_URL)
    const readyIntents = await fetchReadyIntents(provider)
    const groupedIntents = groupIntentsByMarketEpoch(readyIntents)
    
    const auctions = []
    
    for (const [key, intents] of Object.entries(groupedIntents)) {
      const [marketId, epoch] = key.split('-').map(Number)
      const market = MARKETS[marketId]
      
      if (!market) continue
      
      const symbol = `${market.base}-${market.quote}`
      const priceResult = await computeUniformClearingPrice(intents, symbol)
      
      // Calculate volume and fills
      const buyIntents = intents.filter(i => i.side === 0)
      const sellIntents = intents.filter(i => i.side === 1)
      const buyVolume = buyIntents.reduce((sum, i) => sum + i.amount, 0n)
      const sellVolume = sellIntents.reduce((sum, i) => sum + i.amount, 0n)
      
      auctions.push({
        id: `A-${epoch}-${marketId}`,
        market: market.name,
        clearingPrice: priceResult.clearingPrice.toString(),
        aiPrice: priceResult.aiPrice?.toString() || null,
        intents: intents.length,
        settlementBlock: null, // Would need to track from events
        status: 'Ready', // All intents are ready
        volume: Number(buyVolume + sellVolume),
        timestamp: Date.now() - (epoch * CONFIG.AUCTION.EPOCH_DURATION_BLOCKS * CONFIG.NETWORK.BLOCK_TIME_SECONDS * 1000),
        epoch: epoch,
        buyFill: buyVolume.toString(),
        sellFill: sellVolume.toString(),
        method: priceResult.method
      })
    }
    
    // Sort by epoch (newest first)
    auctions.sort((a, b) => b.epoch - a.epoch)
    
    auctionCache.data = auctions
    auctionCache.lastUpdate = now
    
    return auctions
  } catch (error) {
    console.error('Error fetching auction data:', error)
    return auctionCache.data // Return cached data on error
  }
}

// GET /api/auctions - Get all auctions
router.get('/', async (req, res) => {
  try {
    const { status, market, limit = 50 } = req.query
    
    const auctions = await fetchAuctionData()
    let filteredAuctions = [...auctions]
    
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
router.get('/stats', async (req, res) => {
  try {
    const auctions = await fetchAuctionData()
    const solverStatus = solverService.getStatus()
    
    const totalVolume = auctions.reduce((sum, auction) => sum + auction.volume, 0)
    const avgIntents = auctions.length > 0 ? 
      Math.round(auctions.reduce((sum, a) => sum + a.intents, 0) / auctions.length) : 0
    const settledCount = auctions.filter(a => a.status === 'Settled').length
    
    const stats = {
      totalVolume,
      totalAuctions: auctions.length,
      settledAuctions: settledCount,
      avgIntents,
      avgSettlementTime: solverStatus.stats.averageSettlementTime,
      successRate: solverStatus.stats.totalSettlements > 0 ? 
        ((solverStatus.stats.totalSettlements - (solverStatus.stats.lastError ? 1 : 0)) / solverStatus.stats.totalSettlements) * 100 : 100,
      solverStatus: {
        isRunning: solverStatus.isRunning,
        hasSigner: solverStatus.hasSigner,
        totalSettlements: solverStatus.stats.totalSettlements,
        lastError: solverStatus.stats.lastError
      }
    }
    
    res.json(stats)
  } catch (error) {
    console.error('Error calculating stats:', error)
    res.status(500).json({ error: 'Failed to calculate statistics' })
  }
})

// GET /api/auctions/ai/health - AI connectivity and latency
router.get('/ai/health', async (req, res) => {
  try {
    const start = Date.now()
    const body = { intents: [{ side: 0, amount: '1', limitPrice: '1', marketId: 0 }], symbol: 'PING' }
    const r = await fetch(`${req.protocol}://${req.get('host')}/api/ai/compute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const latencyMs = Date.now() - start
    res.json({ ok: r.ok, status: r.status, latencyMs })
  } catch (e) {
    res.status(200).json({ ok: false, error: e.message || 'failed' })
  }
})

// GET /api/auctions/:id - Get specific auction
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const auctions = await fetchAuctionData()
    const auction = auctions.find(a => a.id === id)
    
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' })
    }
    
    res.json(auction)
  } catch (error) {
    console.error('Error fetching auction:', error)
    res.status(500).json({ error: 'Failed to fetch auction data' })
  }
})

// GET /api/auctions/solver/status - Get solver service status
router.get('/solver/status', (req, res) => {
  try {
    const status = solverService.getStatus()
    res.json(status)
  } catch (error) {
    console.error('Error fetching solver status:', error)
    res.status(500).json({ error: 'Failed to fetch solver status' })
  }
})

// POST /api/auctions/solver/start - Start solver service
router.post('/solver/start', async (req, res) => {
  try {
    await solverService.start()
    res.json({ message: 'Solver service started successfully' })
  } catch (error) {
    console.error('Error starting solver:', error)
    res.status(500).json({ error: 'Failed to start solver service' })
  }
})

// POST /api/auctions/solver/stop - Stop solver service
router.post('/solver/stop', (req, res) => {
  try {
    solverService.stop()
    res.json({ message: 'Solver service stopped successfully' })
  } catch (error) {
    console.error('Error stopping solver:', error)
    res.status(500).json({ error: 'Failed to stop solver service' })
  }
})

module.exports = router