const { CONFIG } = require('../config.js')
const { setTimeout: delay } = require('timers/promises')

const PYTH_PRICE_IDS = {
  'ETH-USD': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'BTC-USD': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
}

const ALLOWED_PYTH_IDS = new Set(Object.values(PYTH_PRICE_IDS))

function pythIdFor(sym) {
  const key = sym.toUpperCase().replace('-USDC', '-USD')
  const id = PYTH_PRICE_IDS[key]
  if (!id) throw new Error(`Missing Pyth price_id for ${key}`)
  return id
}

function isAllowedPythId(id) {
  const normalized = String(id).toLowerCase()
  for (const allowed of ALLOWED_PYTH_IDS) {
    if (allowed.toLowerCase() === normalized) return true
  }
  return false
}

async function getJSON(url, init = {}, tries = 3) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, {
        ...init,
        headers: { ...(init.headers || {}), accept: 'application/json' },
      })
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
      return await r.json()
    } catch (e) {
      lastErr = e
      await delay(150 * (i + 1))
    }
  }
  throw lastErr
}

/**
 * @param {string[]} priceIds
 * @returns {Promise<Array<{ id: string, price: string, expo: number, conf: string | null, publishTime: number }>>}
 */
async function fetchHermesLatest(priceIds) {
  if (!priceIds?.length) {
    throw new Error('No Pyth price ids requested')
  }

  const key = CONFIG.PRICE_FEED.PYTH_API_KEY
  if (!key) {
    throw new Error('PYTH_API_KEY is not configured')
  }

  const base = CONFIG.PRICE_FEED.PYTH_BASE_URL
  const query = priceIds.map((id) => `ids[]=${encodeURIComponent(id)}`).join('&')
  const url = `${base}/v2/updates/price/latest?${query}`

  const j = await getJSON(url, {
    headers: { Authorization: `Bearer ${key}` },
  })

  const parsed = j?.parsed
  if (Array.isArray(parsed) && parsed.length) {
    return parsed.map((row) => {
      const priceField = row?.price
      if (!priceField?.price || priceField.expo == null) {
        throw new Error('Invalid Hermes parsed price row')
      }
      return {
        id: row.id ?? priceIds[parsed.indexOf(row)],
        price: String(priceField.price),
        expo: Number(priceField.expo),
        conf: priceField.conf != null ? String(priceField.conf) : null,
        publishTime: row.metadata?.publish_time ?? Math.floor(Date.now() / 1000),
      }
    })
  }

  const legacy = j?.prices?.[0]
  if (legacy) {
    return [{
      id: priceIds[0],
      price: String(legacy.price),
      expo: Number(legacy.expo ?? -8),
      conf: legacy.conf != null ? String(legacy.conf) : null,
      publishTime: legacy.publish_time ?? Math.floor(Date.now() / 1000),
    }]
  }

  throw new Error('No Pyth prices in Hermes response')
}

module.exports = {
  fetchHermesLatest,
  pythIdFor,
  isAllowedPythId,
  PYTH_PRICE_IDS,
}
