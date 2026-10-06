const { fetchReferencePrice } = require("./intents.js");
const { ethers } = require("ethers");

async function computeUniformClearingPrice(intents, symbol = "ETH-USD", epochSeed = null) {
  if (!intents?.length) {
    return {
      clearingPrice: 0n,
      totals: { buyBase: 0n, sellBase: 0n },
      ref: null,
      method: 'none',
    };
  }

  // 1) candidate grid = unique limit prices
  const prices = Array.from(new Set(intents.map(i => i.limitPrice.toString()))).map(x => BigInt(x));
  prices.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  let ref = null;
  let method = 'limit-grid';
  try {
    const q = await fetchReferencePrice(symbol);
    const SCALE = 10n ** 8n;
    ref = BigInt(Math.round(q.price * Number(SCALE)));
    method = q.source || 'limit-grid';
  } catch {
    method = 'limit-grid';
  }

  let best = prices[0] ?? 1n;
  let bestDiff = (1n << 255n);
  let bestTieBias = (1n << 255n);
  let bestSeedHash = null;

  for (const p of prices) {
    let buy = 0n, sell = 0n;
    for (const it of intents) {
      if (it.side === 0) {
        if (p <= it.limitPrice) buy += it.amount;
      } else {
        if (p >= it.limitPrice) sell += it.amount;
      }
    }
    const diff = buy > sell ? buy - sell : sell - buy;

    let bias = ref === null ? 0n : (p > ref ? p - ref : ref - p);

    let seedHash = null;
    if (epochSeed) {
      const priceHex = ethers.zeroPadValue(ethers.toBeHex(p), 32)
      seedHash = ethers.keccak256(ethers.concat([epochSeed, priceHex]))
    }

    const isBetter = (
      diff < bestDiff ||
      (diff === bestDiff && bias < bestTieBias) ||
      (diff === bestDiff && bias === bestTieBias && epochSeed && seedHash && (!bestSeedHash || seedHash < bestSeedHash))
    )

    if (isBetter) {
      bestDiff = diff;
      bestTieBias = bias;
      best = p;
      bestSeedHash = seedHash;
    }
  }

  let buy = 0n, sell = 0n;
  for (const it of intents) {
    if (it.side === 0 && best <= it.limitPrice) buy += it.amount;
    if (it.side === 1 && best >= it.limitPrice) sell += it.amount;
  }

  return {
    clearingPrice: best,
    totals: { buyBase: buy, sellBase: sell },
    ref,
    method,
  };
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

module.exports = { computeUniformClearingPrice, computeHeuristicClearingPrice, computeMarketDepth };