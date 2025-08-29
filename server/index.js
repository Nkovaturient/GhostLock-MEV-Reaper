const express = require('express')
const cors = require('cors')
require('dotenv').config();

const app = express()
const PORT = process.env.PORT || 4800

// Middleware
app.use(cors({}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
const auctionsRouter = require('./routes/auctions')
const intentsRouter = require('./routes/intents')
const marketsRouter = require('./routes/markets')
const mevRouter = require('./routes/mev')

app.use('/api/auctions', auctionsRouter)
app.use('/api/intents', intentsRouter)
app.use('/api/markets', marketsRouter)
app.use('/api/mev', mevRouter)

// Health check endpoint
app.get('/', (req, res) => {
  res.send(`GhostLocking MEV! Lets play it fair & square.`)
})

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
  console.log(`server running on http://localhost:${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
})

module.exports = app