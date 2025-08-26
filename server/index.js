const express = require('express')
const cors = require('cors')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 4000

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
const auctionsRouter = require('./routes/auctions')
const intentsRouter = require('./routes/intents')
const marketsRouter = require('./routes/markets')

app.use('/api/auctions', auctionsRouter)
app.use('/api/intents', intentsRouter)
app.use('/api/markets', marketsRouter)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'GhostLock MEV Reaper API'
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

app.listen(PORT, () => {
  console.log(`🚀 GhostLock MEV Reaper API server running on http://localhost:${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(`🔗 API endpoints:`)
  console.log(`   - GET  /api/auctions`)
  console.log(`   - GET  /api/intents/user/:address`)
  console.log(`   - GET  /api/markets`)
  console.log(`   - POST /api/intents/submit`)
})

module.exports = app