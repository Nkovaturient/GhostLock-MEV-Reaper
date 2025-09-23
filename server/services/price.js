const { fetchReferencePrice } = require("./intents.js");
const { CONFIG } = require("../config.js");

/**
 * Computes uniform clearing price by minimizing | totalBuy - totalSell |
 * across candidate prices from intent limit prices.
 * If a reference price is available, break ties by closeness to reference.
 * Enhanced with AI-assisted optimization when available.
 */
async function computeUniformClearingPrice(intents, symbol = "ETH-USD") {
  if (!intents?.length) return { clearingPrice: 0n, totals: { buyBase: 0n, sellBase: 0n }, ref: null, aiPrice: null };

  // 1) candidate grid = unique limit prices
  const prices = Array.from(new Set(intents.map(i => i.limitPrice.toString()))).map(x => BigInt(x));
  prices.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  // 2) optional reference mid from provider (for tiebreak)
  let ref = null;
  try {
    const q = await fetchReferencePrice(symbol);
    // assume your intents are quoted in 1e8 or 1e6; if not, scale appropriately
    // here we assume 1e8 for safety; replace SCALE with your actual price decimals
    const SCALE = 10n ** 8n;
    ref = BigInt(Math.round(q.price * Number(SCALE)));
  } catch { }

  // 3) AI-assisted price optimization (if enabled)
  let aiPrice = null;
  if (CONFIG.AI.ENABLED) {
    try {
      aiPrice = await computeAIClearingPrice(intents, ref, symbol);
    } catch (error) {
      console.warn('AI price computation failed, falling back to heuristic:', error);
    }
  }

  let best = prices[0] ?? 1n;
  let bestDiff = (1n << 255n);
  let bestTieBias = (1n << 255n);

  // 4) search with AI guidance
  for (const p of prices) {
    let buy = 0n, sell = 0n;
    for (const it of intents) {
      if (it.side === 0) { // buy base
        if (p <= it.limitPrice) buy += it.amount;
      } else { // sell base
        if (p >= it.limitPrice) sell += it.amount;
      }
    }
    const diff = buy > sell ? buy - sell : sell - buy;

    // tie-breaker: prefer price closest to ref mid if available
    let bias = ref === null ? 0n : (p > ref ? p - ref : ref - p);
    
    // AI guidance: if AI price is available and close to this price, reduce bias
    if (aiPrice && CONFIG.AI.ENABLED) {
      const aiBias = p > aiPrice ? p - aiPrice : aiPrice - p;
      bias = bias < aiBias ? bias : aiBias; // Prefer the smaller bias
    }

    if (diff < bestDiff || (diff === bestDiff && bias < bestTieBias)) {
      bestDiff = diff;
      bestTieBias = bias;
      best = p;
    }
  }

  // 5) totals at chosen price (for UI)
  let buy = 0n, sell = 0n;
  for (const it of intents) {
    if (it.side === 0 && best <= it.limitPrice) buy += it.amount;
    if (it.side === 1 && best >= it.limitPrice) sell += it.amount;
  }
  
  return { 
    clearingPrice: best, 
    totals: { buyBase: buy, sellBase: sell }, 
    ref, 
    aiPrice,
    method: aiPrice ? 'ai-assisted' : 'heuristic'
  };
}

/**
 * AI-assisted clearing price computation
 * @param {Array} intents - Array of intent objects
 * @param {bigint} referencePrice - Reference price for context
 * @param {string} symbol - Trading pair symbol
 * @returns {Promise<bigint>} AI-suggested clearing price
 */
async function computeAIClearingPrice(intents, referencePrice, symbol) {
  if (!CONFIG.AI.MODEL_URL) {
    throw new Error('AI model URL not configured');
  }

  try {
    // Prepare features for AI model
    const features = {
      intents: intents.map(intent => ({
        side: intent.side,
        amount: intent.amount.toString(),
        limitPrice: intent.limitPrice.toString(),
        marketId: intent.marketId
      })),
      referencePrice: referencePrice?.toString() || null,
      symbol,
      timestamp: Date.now()
    };

    const response = await fetch(CONFIG.AI.MODEL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(features),
      signal: AbortSignal.timeout(CONFIG.PRICE_FEED.TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new Error(`AI model request failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.confidence < CONFIG.AI.CONFIDENCE_THRESHOLD) {
      throw new Error(`AI confidence too low: ${result.confidence}`);
    }

    return BigInt(result.clearingPrice);
  } catch (error) {
    console.error('AI price computation error:', error);
    throw error;
  }
}

/**
 * Heuristic-based clearing price computation (fallback)
 * Uses volume-weighted average of limit prices
 * @param {Array} intents - Array of intent objects
 * @returns {bigint} Heuristic clearing price
 */
function computeHeuristicClearingPrice(intents) {
  if (!intents?.length) return 0n;

  let totalVolume = 0n;
  let weightedPrice = 0n;

  for (const intent of intents) {
    const volume = intent.amount;
    totalVolume += volume;
    weightedPrice += intent.limitPrice * volume;
  }

  if (totalVolume === 0n) return 0n;
  
  return weightedPrice / totalVolume;
}

/**
 * Computes market depth at different price levels
 * @param {Array} intents - Array of intent objects
 * @param {Array} priceLevels - Array of price levels to analyze
 * @returns {Object} Market depth data
 */
function computeMarketDepth(intents, priceLevels) {
  const depth = {
    bids: [], // buy orders
    asks: []  // sell orders
  };

  for (const price of priceLevels) {
    let bidVolume = 0n;
    let askVolume = 0n;

    for (const intent of intents) {
      if (intent.side === 0 && intent.limitPrice >= price) { // buy
        bidVolume += intent.amount;
      } else if (intent.side === 1 && intent.limitPrice <= price) { // sell
        askVolume += intent.amount;
      }
    }

    depth.bids.push({ price, volume: bidVolume });
    depth.asks.push({ price, volume: askVolume });
  }

  return depth;
}

module.exports = { computeUniformClearingPrice, computeAIClearingPrice, computeHeuristicClearingPrice, computeMarketDepth };