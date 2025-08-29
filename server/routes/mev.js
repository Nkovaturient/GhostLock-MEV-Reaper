const express = require('express')
const router = express.Router()
const axios = require('axios')

// ZeroMEV API configuration
const ZEROMEV_API_BASE = process.env.ZEROMEV_API
const RATE_LIMIT_DELAY = 10000 // 5 calls per second = 10s between calls

// Cache for MEV data
let mevDataCache = {}
let lastCacheUpdate = 0
const CACHE_DURATION = 60000 // 1 minute cache

// Rate limiting helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Fetch MEV data from ZeroMEV API
async function fetchMEVData() {
  try {
    // Fetch recent MEV blocks (last 100 blocks)
    const mevBlocksResponse = await axios.get(`${ZEROMEV_API_BASE}/mevBlock?block_number=16824821&count=10`)
    await delay(RATE_LIMIT_DELAY)
    
    // Fetch MEV transactions summary-- 0x00356ce6250f8489d23ff32742256ab5be9dd8d7
    const mevSummaryResponse = await axios.get(`${ZEROMEV_API_BASE}/mevTransactionsSummary?address_from=0x00356ce6250f8489d23ff32742256ab5be9dd8d7`)
    await delay(RATE_LIMIT_DELAY)
    
    // Fetch recent MEV transactions-- 0x039dc7c4a5769ca80c9e5c0cee5c8b287faeb3af
    const mevTransactionsResponse = await axios.get(`${ZEROMEV_API_BASE}/mevTransactions?address_from=0x039dc7c4a5769ca80c9e5c0cee5c8b287faeb3af&page=1`)
    
    return {
      blocks: mevBlocksResponse.data,
      summary: mevSummaryResponse.data,
      transactions: mevTransactionsResponse.data
    }
  } catch (error) {
    console.error('Error fetching MEV data:', error.message)
    throw new Error(`Failed to fetch MEV data: ${error.message}`)
  }
}

// Calculate MEV statistics from raw data
function calculateMEVStats(mevData) {
  const { blocks, summary, transactions } = mevData
  
  // Aggregate MEV types
  const mevTypes = {
    arb: { count: 0, volume: 0, profit: 0 },
    frontrun: { count: 0, volume: 0, profit: 0 },
    sandwich: { count: 0, volume: 0, profit: 0 },
    backrun: { count: 0, volume: 0, profit: 0 },
    liquid: { count: 0, volume: 0, profit: 0 },
    swap: { count: 0, volume: 0, profit: 0 }
  }
  
  // Process transactions
  transactions.forEach(tx => {
    if (mevTypes[tx.mev_type]) {
      mevTypes[tx.mev_type].count++
      mevTypes[tx.mev_type].volume += parseFloat(tx.user_swap_volume_usd || 0)
      mevTypes[tx.mev_type].profit += parseFloat(tx.mev_usd || 0)
    }
  })
  
  // Calculate global statistics
  const totalMEV = Object.values(mevTypes).reduce((sum, type) => sum + type.profit, 0)
  const totalVolume = Object.values(mevTypes).reduce((sum, type) => sum + type.volume, 0)
  const totalTransactions = Object.values(mevTypes).reduce((sum, type) => sum + type.count, 0)
  
  // Calculate protection metrics
  const avgMEVPerTx = totalTransactions > 0 ? totalMEV / totalTransactions : 0
  const mevToVolumeRatio = totalVolume > 0 ? (totalMEV / totalVolume) * 100 : 0
  
  return {
    mevTypes,
    global: {
      totalMEV: Math.round(totalMEV * 100) / 100,
      totalVolume: Math.round(totalVolume * 100) / 100,
      totalTransactions,
      avgMEVPerTx: Math.round(avgMEVPerTx * 100) / 100,
      mevToVolumeRatio: Math.round(mevToVolumeRatio * 100) / 100,
      lastUpdated: new Date().toISOString()
    },
    recentBlocks: blocks.slice(0, 10), // Last 10 blocks
    recentTransactions: transactions.slice(0, 20) // Last 20 transactions
  }
}

// GET /api/mev - Get comprehensive MEV data
router.get('/', async (req, res) => {
  try {
    // Check cache first
    if (Date.now() - lastCacheUpdate < CACHE_DURATION && Object.keys(mevDataCache).length > 0) {
      return res.json(mevDataCache)
    }

    const mevData = await fetchMEVData()
    const mevStats = calculateMEVStats(mevData)
    
    mevDataCache = mevStats
    lastCacheUpdate = Date.now()
    
    res.json(mevStats)
  } catch (error) {
    console.error('Error fetching MEV data:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/mev/types - Get MEV type breakdown
router.get('/types', async (req, res) => {
  try {
    if (Date.now() - lastCacheUpdate < CACHE_DURATION && mevDataCache.mevTypes) {
      return res.json(mevDataCache.mevTypes)
    }

    const mevData = await fetchMEVData()
    const mevStats = calculateMEVStats(mevData)
    
    mevDataCache = mevStats
    lastCacheUpdate = Date.now()
    
    res.json(mevStats.mevTypes)
  } catch (error) {
    console.error('Error fetching MEV types:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/mev/global - Get global MEV statistics
router.get('/global', async (req, res) => {
  try {
    if (Date.now() - lastCacheUpdate < CACHE_DURATION && mevDataCache.global) {
      return res.json(mevDataCache.global)
    }

    const mevData = await fetchMEVData()
    const mevStats = calculateMEVStats(mevData)
    
    mevDataCache = mevStats
    lastCacheUpdate = Date.now()
    
    res.json(mevStats.global)
  } catch (error) {
    console.error('Error fetching global MEV stats:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/mev/transactions - Get recent MEV transactions
router.get('/transactions', async (req, res) => {
  try {
    if (Date.now() - lastCacheUpdate < CACHE_DURATION && mevDataCache.recentTransactions) {
      return res.json(mevDataCache.recentTransactions)
    }

    const mevData = await fetchMEVData()
    const mevStats = calculateMEVStats(mevData)
    
    mevDataCache = mevStats
    lastCacheUpdate = Date.now()
    
    res.json(mevStats.recentTransactions)
  } catch (error) {
    console.error('Error fetching MEV transactions:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/mev/refresh - Force refresh MEV data
router.get('/refresh', async (req, res) => {
  try {
    lastCacheUpdate = 0 // Force cache refresh
    const mevData = await fetchMEVData()
    const mevStats = calculateMEVStats(mevData)
    
    mevDataCache = mevStats
    lastCacheUpdate = Date.now()
    
    res.json({ 
      success: true, 
      message: 'MEV data refreshed',
      timestamp: new Date().toISOString(),
      data: mevStats
    })
  } catch (error) {
    console.error('Error refreshing MEV data:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
