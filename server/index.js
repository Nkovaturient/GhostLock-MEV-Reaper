const express = require('express')
const cors = require('cors')
const { solverService } = require('./services/solver.js')
const { startIntentWatcher } = require('./services/intents-watcher.js')
const { schedulerService } = require('./services/scheduler.js')
require('dotenv').config();

const app = express()
const PORT = process.env.PORT || 4800

// Middleware
app.use(cors({
  origin: ['https://ghost-lock-mev-reaper.vercel.app', 'https://ghostlock.vercel.app', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
const auctionsRouter = require('./routes/auctions')
const intentsRouter = require('./routes/intents')
const marketsRouter = require('./routes/markets')
const mevRouter = require('./routes/mev')
const aiRouter = require('./routes/ai')
const externalRouter = require('./routes/external');
const { metricsHandler } = require('./utils/metrics.js');
const networkStats = require("./routes/network-stats");


app.use('/api/auctions', auctionsRouter)
app.use('/api/intents', intentsRouter)
app.use('/api/markets', marketsRouter)
app.use('/api/mev', mevRouter)
app.use('/api/ai', aiRouter)
app.use('/api/external', externalRouter)
app.get('/metrics', metricsHandler);
app.get('/netstats', networkStats)

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


app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})


async function startServer() {
  try {
    await solverService.initialize()

    app.listen(PORT, () => {
      console.log(`🚀 GhostLock MEV Reaper server running on http://localhost:${PORT}`)
      console.log(`Health check: http://localhost:${PORT}/health`)
      console.log(`Solver status: http://localhost:${PORT}/api/auctions/solver/status`)
    })

    // Start watchers and scheduler
    try {
      startIntentWatcher()
      schedulerService.start()
    } catch (e) {
      console.error('Failed to start watcher/scheduler:', e)
    }

    if (process.env.SOLVER_PRIVATE_KEY) {
      console.log('🤖 Auto-starting solver service...')
      await solverService.start()
    } else {
      console.log('No SOLVER_PRIVATE_KEY provided - solver will run in read-only mode')
    }
  } catch (error) {
    console.error(' Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

module.exports = app