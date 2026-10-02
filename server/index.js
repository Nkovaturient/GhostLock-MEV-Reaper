require('dotenv').config()
const express = require('express')
const cors = require('cors')

const { solverService } = require('./services/solver.js')
const { startIntentWatcher } = require('./services/intents-watcher.js')
const { schedulerService } = require('./services/scheduler.js')
const db = require('./utils/db.js')

const app = express()
const PORT = process.env.PORT || 4800

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: [
    'https://ghost-lock-mev-reaper.vercel.app',
    'https://ghostlock.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ─── Routes ───────────────────────────────────────────────────────────────────

const auctionsRouter = require('./routes/auctions')
const marketsRouter = require('./routes/markets')
const mevRouter = require('./routes/mev')
const externalRouter = require('./routes/external')
const networkStats = require('./routes/network-stats')
const { metricsHandler } = require('./utils/metrics.js')

app.use('/api/auctions', auctionsRouter)
app.use('/api/markets', marketsRouter)
app.use('/api/mev', mevRouter)
app.use('/api/external', externalRouter)
app.get('/metrics', metricsHandler)
app.get('/netstats', networkStats)

app.get('/', (_req, res) => res.send('GhostLocking MEV! Fair & square.'))

app.get('/health', (_req, res) => res.json({
  status: 'healthy',
  timestamp: new Date().toISOString(),
  service: 'GhostLock MEV Reaper API',
}))


app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  })
})

app.use('*', (_req, res) => res.status(404).json({ error: 'Endpoint not found' }))


async function startServer() {
  try {
    // Init SQLite (creates tables if not exists)
    db.getDb()
    console.log('[db] SQLite initialized')

    await solverService.initialize()

    app.listen(PORT, () => {
      console.log(`🚀 GhostLock server: http://localhost:${PORT}`)
      console.log(`   Health:  http://localhost:${PORT}/health`)
      console.log(`   Solver:  http://localhost:${PORT}/api/auctions/solver/status`)
    })

    try {
      startIntentWatcher()
      schedulerService.start()
    } catch (e) {
      console.error('[server] Watcher/scheduler failed to start:', e)
    }

    if (process.env.SOLVER_PRIVATE_KEY) {
      console.log('[solver] Auto-starting settlement service...')
      await solverService.start()
    } else {
      console.log('[solver] No SOLVER_PRIVATE_KEY — read-only mode')
    }

    const shutdown = () => {
      console.log('\n[server] Shutting down...')
      solverService.stop()
      db.close()
      process.exit(0)
    }
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

  } catch (err) {
    console.error('[server] Failed to start:', err)
    process.exit(1)
  }
}

startServer()
module.exports = app