const express = require('express')
const router = express.Router()

// Mock intent data - replace with actual blockchain data fetching
const mockIntents = new Map()

// POST /api/intents/submit - Submit new intent (webhook from contract)
router.post('/submit', (req, res) => {
  try {
    const { requestId, user, targetBlock, encrypted } = req.body
    
    if (!requestId || !user || !targetBlock || !encrypted) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    
    const intent = {
      id: requestId,
      user,
      targetBlock,
      encrypted,
      status: 'Pending',
      timestamp: Date.now(),
      inclusionBlock: null,
      settlementPrice: null
    }
    
    mockIntents.set(requestId, intent)
    
    res.json({ success: true, intentId: requestId })
  } catch (error) {
    console.error('Error submitting intent:', error)
    res.status(500).json({ error: 'Failed to submit intent' })
  }
})

// GET /api/intents/user/:address - Get user intents
router.get('/user/:address', (req, res) => {
  try {
    const { address } = req.params
    
    // Filter intents by user address
    const userIntents = Array.from(mockIntents.values())
      .filter(intent => intent.user.toLowerCase() === address.toLowerCase())
      .sort((a, b) => b.timestamp - a.timestamp)
    
    res.json(userIntents)
  } catch (error) {
    console.error('Error fetching user intents:', error)
    res.status(500).json({ error: 'Failed to fetch user intents' })
  }
})

// GET /api/intents/:id - Get specific intent
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params
    const intent = mockIntents.get(id)
    
    if (!intent) {
      return res.status(404).json({ error: 'Intent not found' })
    }
    
    res.json(intent)
  } catch (error) {
    console.error('Error fetching intent:', error)
    res.status(500).json({ error: 'Failed to fetch intent' })
  }
})

// POST /api/intents/:id/decrypt - Decrypt intent (when ready)
router.post('/:id/decrypt', (req, res) => {
  try {
    const { id } = req.params
    const { currentBlock } = req.body
    
    const intent = mockIntents.get(id)
    if (!intent) {
      return res.status(404).json({ error: 'Intent not found' })
    }
    
    if (currentBlock < intent.targetBlock) {
      return res.status(400).json({ error: 'Intent not yet decryptable' })
    }
    
    // Mock decryption - in real implementation, use blocklock-js
    const mockDecrypted = {
      market: 'ETH/USDC',
      side: 'buy',
      amount: '1.0',
      limitPrice: '3120.50',
      slippageBps: 50,
      marketId: 0,
      epoch: Math.floor(intent.targetBlock / 50)
    }
    
    intent.status = 'Ready'
    intent.decrypted = mockDecrypted
    mockIntents.set(id, intent)
    
    res.json({ success: true, decrypted: mockDecrypted })
  } catch (error) {
    console.error('Error decrypting intent:', error)
    res.status(500).json({ error: 'Failed to decrypt intent' })
  }
})

module.exports = router