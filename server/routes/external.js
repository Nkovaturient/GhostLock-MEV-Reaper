const express = require('express')
const router = express.Router()
const axios = require('axios')
require('dotenv').config()

// External API configurations
const COINGECKO_API = 'https://api.coingecko.com/api/v3'
const ETHERSCAN_API = process.env.ETHERSCAN_API_KEY ? `https://api.etherscan.io/api?apikey=${process.env.ETHERSCAN_API_KEY}` : null
const DEFILLAMA_API = 'https://api.llama.fi'
const ZEROMEV_API = process.env.ZEROMEV_API

// Cache for external data
let externalDataCache = {}
let lastCacheUpdate = 0
const CACHE_DURATION = 60000 // 1 minute cache

// Rate limiting helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Fetch cryptocurrency market data from CoinGecko
async function fetchCryptoData() {
  try {
    const response = await axios.get(`${COINGECKO_API}/simple/price?ids=ethereum,wrapped-bitcoin,usd-coin&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`)
    
    return {
      ethereum: {
        price: response.data.ethereum?.usd || 0,
        change24h: response.data.ethereum?.usd_24h_change || 0,
        volume24h: response.data.ethereum?.usd_24h_vol || 0,
        marketCap: response.data.ethereum?.usd_market_cap || 0
      },
      wbtc: {
        price: response.data['wrapped-bitcoin']?.usd || 0,
        change24h: response.data['wrapped-bitcoin']?.usd_24h_change || 0,
        volume24h: response.data['wrapped-bitcoin']?.usd_24h_vol || 0,
        marketCap: response.data['wrapped-bitcoin']?.usd_market_cap || 0
      },
      usdc: {
        price: response.data['usd-coin']?.usd || 1,
        change24h: response.data['usd-coin']?.usd_24h_change || 0,
        volume24h: response.data['usd-coin']?.usd_24h_vol || 0,
        marketCap: response.data['usd-coin']?.usd_market_cap || 0
      }
    }
  } catch (error) {
    console.error('Error fetching crypto data:', error.message)
    return null
  }
}

// Fetch DeFi protocol data from DeFi Llama
async function fetchDefiData() {
  try {
    const response = await axios.get(`${DEFILLAMA_API}/protocols`)
    
    // Filter for relevant protocols (Uniswap, SushiSwap, etc.)
    const relevantProtocols = response.data.filter(protocol => 
      ['Uniswap', 'SushiSwap', 'Balancer', 'Curve'].includes(protocol.name)
    )
    
    return relevantProtocols.map(protocol => ({
      name: protocol.name,
      tvl: protocol.tvl || 0,
      change1d: protocol.change_1d || 0,
      change7d: protocol.change_7d || 0,
      category: protocol.category
    }))
  } catch (error) {
    console.error('Error fetching DeFi data:', error.message)
    return []
  }
}

// Fetch gas price data from Etherscan (if available)
async function fetchGasData() {
  try {
    if (!ETHERSCAN_API) {
      // Fallback to estimated gas prices
      return {
        slow: '20',
        standard: '25',
        fast: '30',
        rapid: '35'
      }
    }

    const response = await axios.get(`${ETHERSCAN_API}&module=gastracker&action=gasoracle`)
    
    if (response.data.status === '1') {
      const result = response.data.result
      return {
        slow: result.SafeLow || '20',
        standard: result.ProposeGasPrice || '25',
        fast: result.FastGasPrice || '30',
        rapid: result.FastGasPrice ? (parseInt(result.FastGasPrice) * 1.2).toString() : '35'
      }
    }
    
    throw new Error('Invalid response from Etherscan')
  } catch (error) {
    console.error('Error fetching gas data:', error.message)
    // Return estimated values
    return {
      slow: '20',
      standard: '25',
      fast: '30',
      rapid: '35'
    }
  }
}

// Fetch MEV-related data from ZeroMEV (if available)
async function fetchMEVData() {
  try {
    if (!ZEROMEV_API) {
      return {
        totalMEV: 0,
        mevTypes: {},
        recentBlocks: [],
        timestamp: new Date().toISOString()
      }
    }

    const response = await axios.get(`${ZEROMEV_API}/mevBlock?block_number=latest&count=10`)
    
    if (response.data && response.data.length > 0) {
      const totalMEV = response.data.reduce((sum, block) => sum + (block.mev || 0), 0)
      
      return {
        totalMEV,
        mevTypes: {
          arbitrage: response.data.filter(b => b.mev_type === 'arbitrage').length,
          sandwich: response.data.filter(b => b.mev_type === 'sandwich').length,
          frontrunning: response.data.filter(b => b.mev_type === 'frontrunning').length
        },
        recentBlocks: response.data.slice(0, 5),
        timestamp: new Date().toISOString()
      }
    }
    
    return {
      totalMEV: 0,
      mevTypes: {},
      recentBlocks: [],
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error fetching MEV data:', error.message)
    return {
      totalMEV: 0,
      mevTypes: {},
      recentBlocks: [],
      timestamp: new Date().toISOString()
    }
  }
}

// GET /api/external/crypto - Get cryptocurrency market data
router.get('/crypto', async (req, res) => {
  try {
    // Check cache first
    if (Date.now() - lastCacheUpdate < CACHE_DURATION && externalDataCache.crypto) {
      return res.json(externalDataCache.crypto)
    }

    const cryptoData = await fetchCryptoData()
    if (cryptoData) {
      externalDataCache.crypto = cryptoData
      lastCacheUpdate = Date.now()
      res.json(cryptoData)
    } else {
      res.status(500).json({ error: 'Failed to fetch crypto data' })
    }
  } catch (error) {
    console.error('Error fetching crypto data:', error)
    res.status(500).json({ error: 'Failed to fetch crypto data' })
  }
})

// GET /api/external/defi - Get DeFi protocol data
router.get('/defi', async (req, res) => {
  try {
    // Check cache first
    if (Date.now() - lastCacheUpdate < CACHE_DURATION && externalDataCache.defi) {
      return res.json(externalDataCache.defi)
    }

    const defiData = await fetchDefiData()
    externalDataCache.defi = defiData
    lastCacheUpdate = Date.now()
    
    res.json(defiData)
  } catch (error) {
    console.error('Error fetching DeFi data:', error)
    res.status(500).json({ error: 'Failed to fetch DeFi data' })
  }
})

// GET /api/external/gas - Get gas price data
router.get('/gas', async (req, res) => {
  try {
    // Check cache first
    if (Date.now() - lastCacheUpdate < CACHE_DURATION && externalDataCache.gas) {
      return res.json(externalDataCache.gas)
    }

    const gasData = await fetchGasData()
    externalDataCache.gas = gasData
    lastCacheUpdate = Date.now()
    
    res.json(gasData)
  } catch (error) {
    console.error('Error fetching gas data:', error)
    res.status(500).json({ error: 'Failed to fetch gas data' })
  }
})

// GET /api/external/mev - Get MEV data
router.get('/mev', async (req, res) => {
  try {
    // Check cache first
    if (Date.now() - lastCacheUpdate < CACHE_DURATION && externalDataCache.mev) {
      return res.json(externalDataCache.mev)
    }

    const mevData = await fetchMEVData()
    externalDataCache.mev = mevData
    lastCacheUpdate = Date.now()
    
    res.json(mevData)
  } catch (error) {
    console.error('Error fetching MEV data:', error)
    res.status(500).json({ error: 'Failed to fetch MEV data' })
  }
})

// GET /api/external/all - Get all external data
router.get('/all', async (req, res) => {
  try {
    // Check cache first
    if (Date.now() - lastCacheUpdate < CACHE_DURATION && Object.keys(externalDataCache).length > 0) {
      return res.json(externalDataCache)
    }

    // Fetch all data in parallel
    const [cryptoData, defiData, gasData, mevData] = await Promise.all([
      fetchCryptoData(),
      fetchDefiData(),
      fetchGasData(),
      fetchMEVData()
    ])

    const allData = {
      crypto: cryptoData,
      defi: defiData,
      gas: gasData,
      mev: mevData,
      timestamp: new Date().toISOString()
    }

    externalDataCache = allData
    lastCacheUpdate = Date.now()
    
    res.json(allData)
  } catch (error) {
    console.error('Error fetching external data:', error)
    res.status(500).json({ error: 'Failed to fetch external data' })
  }
})

// GET /api/external/refresh - Force refresh all external data
router.get('/refresh', async (req, res) => {
  try {
    lastCacheUpdate = 0 // Force cache refresh
    
    const [cryptoData, defiData, gasData, mevData] = await Promise.all([
      fetchCryptoData(),
      fetchDefiData(),
      fetchGasData(),
      fetchMEVData()
    ])

    const allData = {
      crypto: cryptoData,
      defi: defiData,
      gas: gasData,
      mev: mevData,
      timestamp: new Date().toISOString()
    }

    externalDataCache = allData
    lastCacheUpdate = Date.now()
    
    res.json({ 
      success: true, 
      message: 'External data refreshed',
      timestamp: new Date().toISOString(),
      data: allData
    })
  } catch (error) {
    console.error('Error refreshing external data:', error)
    res.status(500).json({ error: 'Failed to refresh external data' })
  }
})

module.exports = router
