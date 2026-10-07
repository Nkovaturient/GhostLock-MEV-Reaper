const express = require('express')
const { CONFIG } = require('../config.js')
const { fetchHermesLatest, isAllowedPythId } = require('../services/hermes.js')

const router = express.Router()
const MAX_IDS = 5

router.get('/hermes/latest', async (req, res) => {
  try {
    if (!CONFIG.PRICE_FEED.PYTH_API_KEY) {
      return res.status(503).json({ error: 'PYTH_API_KEY is not configured on the server' })
    }

    const raw = req.query['ids[]'] ?? req.query.ids
    const ids = Array.isArray(raw) ? raw : raw ? [raw] : []
    if (!ids.length) {
      return res.status(400).json({ error: 'Missing ids[] query parameter' })
    }
    if (ids.length > MAX_IDS) {
      return res.status(400).json({ error: `At most ${MAX_IDS} price ids per request` })
    }

    for (const id of ids) {
      if (!isAllowedPythId(id)) {
        return res.status(400).json({ error: 'Price id not allowed' })
      }
    }

    const items = await fetchHermesLatest(ids)
    res.json({
      parsed: items.map((item) => ({
        id: item.id,
        price: {
          price: item.price,
          expo: item.expo,
          conf: item.conf,
        },
        metadata: { publish_time: item.publishTime },
      })),
    })
  } catch (err) {
    console.error('[oracle] Hermes proxy error:', err?.message || err)
    res.status(502).json({ error: 'Failed to fetch Hermes prices' })
  }
})

module.exports = router
