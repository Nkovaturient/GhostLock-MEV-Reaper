const ethers = require("ethers");
const { CONFIG, ABIS } = require("../config.js");
const { setTimeout: delay } = require("timers/promises");

const PROVIDER = (process.env.PRICE_FEED_PROVIDER || "pyth");
const BASE = process.env.PRICE_FEED_BASE_URL || "";

// ---retry wrapper ---
async function getJSON(url, init = {}, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, {
        ...init,
        headers: {
          ...(init.headers || {}),
          "accept": "application/json",
        },
      });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return await r.json();
    } catch (e) {
      lastErr = e;
      await delay(150 * (i + 1));
    }
  }
  throw lastErr;
}

/**
 * Rate limiting utility for RPC calls
 */
class RateLimiter {
  constructor(maxRequests = 10, timeWindow = 1000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }

  async waitForSlot() {
    const now = Date.now();
    
    // Remove old requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    // If we're at the limit, wait
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest);
      if (waitTime > 0) {
        await delay(waitTime);
        return this.waitForSlot(); // Recursive call after waiting
      }
    }
    
    // Record this request
    this.requests.push(now);
  }
}

// Global rate limiter for RPC calls
const rpcRateLimiter = new RateLimiter(CONFIG.RPC.MAX_REQUESTS_PER_SECOND, CONFIG.RPC.RATE_LIMIT_WINDOW_MS);

/**
 * Fetches ready intents from the GhostLockIntents contract with rate limiting
 * @param provider Ethers provider instance
 * @param epoch Optional epoch filter
 * @returns Array of ready intents with decoded data
 */
async function fetchReadyIntents(provider, epoch = null) {
  try {
    const intentsContract = new ethers.Contract(
      CONFIG.CONTRACTS.GHOSTLOCK_INTENTS,
      ABIS.GHOSTLOCK_INTENTS,
      provider
    );

    // Get the last request ID to know how many intents exist
    await rpcRateLimiter.waitForSlot();
    const lastRequestId = await intentsContract.lastRequestId();
    const intents = [];

    // Fetch intents in smaller batches with rate limiting
    const batchSize = CONFIG.RPC.BATCH_SIZE;
    for (let i = 0; i <= lastRequestId; i += batchSize) {
      const endId = Math.min(i + batchSize - 1, Number(lastRequestId));
      
      // Process each intent individually with rate limiting
      for (let j = i; j <= endId; j++) {
        try {
          await rpcRateLimiter.waitForSlot();
          const [requestedBy, encryptedAt, unlockBlock, ready, decrypted] = await intentsContract.intents(j);
          
          if (ready && decrypted && decrypted.length > 0) {
            try {
              // Decode the decrypted intent data
              const [user, side, amount, limitPrice, marketId, intentEpoch, isDummyFlag] = 
                ethers.AbiCoder.defaultAbiCoder().decode(
                  // If contract includes a boolean flag for dummy, decode it; else fallback in catch
                  ['address', 'uint8', 'uint256', 'uint256', 'uint8', 'uint256', 'bool'],
                  decrypted
                );

              // Filter by epoch if specified
              if (epoch !== null && Number(intentEpoch) !== epoch) {
                continue;
              }

              // Dummy flag from payload if present
              const isDummy = Boolean(isDummyFlag);

              intents.push({
                requestId: j,
                user: user,
                side: Number(side),
                amount: amount,
                limitPrice: limitPrice,
                marketId: Number(marketId),
                epoch: Number(intentEpoch),
                encryptedAt: Number(encryptedAt),
                unlockBlock: Number(unlockBlock),
                isDummy: isDummy
              });
            } catch (decodeError) {
              // Fallback: decode without dummy flag for backwards compatibility
              try {
                const [user, side, amount, limitPrice, marketId, intentEpoch] = 
                  ethers.AbiCoder.defaultAbiCoder().decode(
                    ['address', 'uint8', 'uint256', 'uint256', 'uint8', 'uint256'],
                    decrypted
                  );
                if (epoch !== null && Number(intentEpoch) !== epoch) continue;
                intents.push({
                  requestId: j,
                  user: user,
                  side: Number(side),
                  amount: amount,
                  limitPrice: limitPrice,
                  marketId: Number(marketId),
                  epoch: Number(intentEpoch),
                  encryptedAt: Number(encryptedAt),
                  unlockBlock: Number(unlockBlock),
                  isDummy: false
                });
              } catch (e2) {
                console.warn(`Failed to decode intent ${j}:`, decodeError);
              }
            }
          }
        } catch (rpcError) {
          // Handle rate limiting and other RPC errors
          if (rpcError.code === 'CALL_EXCEPTION' && rpcError.info?.error?.code === -32016) {
            console.warn(`Rate limited on intent ${j}, waiting longer...`);
            await delay(CONFIG.RPC.RETRY_DELAY_MS); // Wait on rate limit
            j--; // Retry this intent
            continue;
          }
          console.warn(`RPC error for intent ${j}:`, rpcError.message);
        }
      }
    }

    return intents;
  } catch (error) {
    console.error('Error fetching ready intents:', error);
    throw error;
  }
}

/**
 * Groups intents by market and epoch for batch settlement
 * @param intents Array of ready intents
 * @returns Object with market-epoch keys and intent arrays as values
 */
function groupIntentsByMarketEpoch(intents) {
  const groups = {};
  
  for (const intent of intents) {
    const key = `${intent.marketId}-${intent.epoch}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(intent);
  }
  
  return groups;
}

/**
 * Filters out dummy intents from a list of intents
 * @param intents Array of intents
 * @returns Array of real intents only
 */
function filterRealIntents(intents) {
  return intents.filter(intent => !intent.isDummy);
}

/**
 * Analyzes intent patterns for privacy metrics
 * @param intents Array of intents
 * @returns Privacy analysis metrics
 */
function analyzePrivacyMetrics(intents) {
  const totalIntents = intents.length;
  const dummyIntents = intents.filter(intent => intent.isDummy).length;
  const realIntents = totalIntents - dummyIntents;
  
  return {
    totalIntents,
    realIntents,
    dummyIntents,
    dummyRatio: totalIntents > 0 ? dummyIntents / totalIntents : 0,
    privacyScore: totalIntents > 0 ? (dummyIntents / totalIntents) * 100 : 0
  };
}

// 1) PYTH price service: map "ETH-USD" to a price_id or use the universal endpoint.
// Docs: https://docs.pyth.network/price-feeds/fetch-price-updates and pyth.network site. :contentReference[oaicite:5]{index=5}
async function fetchPyth(symbol) {
  // naive mapping for majors; in production maintain a map of product→price_id
  const SYM = symbol.toUpperCase();
  // If you host a price proxy, override with PRICE_FEED_BASE_URL
  const base = BASE || "https://hermes.pyth.network";
  // Universal endpoint returns current price by product symbol if supported by your proxy.
  // Alternative: use price_ids: /v2/price/latest?ids[]=<price_id>
  const url = `${base}/v2/updates/price/latest?ids[]=${encodeURIComponent(pythIdFor(SYM))}`;
  const j = await getJSON(url);
  const item = j?.prices?.[0];
  if (!item) throw new Error(`No Pyth price for ${SYM}`);
  // Pyth returns price + expo; convert to decimal
  const price = Number(item.price) * Math.pow(10, Number(item.expo || -8));
  return { symbol: SYM, price, source: "pyth", ts: Date.now() };
}

function pythIdFor(sym) {
  const m = {
    "ETH-USD": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    "BTC-USD": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  };
  if (!m[sym]) throw new Error(`Missing Pyth price_id for ${sym}`);
  return m[sym];
}

// Coinbase Advanced Trade public market data
// Docs: Advanced Trade public endpoints. :contentReference[oaicite:7]{index=7}
async function fetchCoinbase(symbol) {
  const [baseSym, quoteSym] = symbol.toUpperCase().split("-");
  const productId = `${baseSym}-${quoteSym}`;
  const base = BASE || "https://api.exchange.coinbase.com";
  const url = `${base}/products/${encodeURIComponent(productId)}/ticker`;
  const j = await getJSON(url);
  if (!j?.price) throw new Error(`No Coinbase price for ${productId}`);
  return { symbol, price: Number(j.price), source: "coinbase", ts: Date.now() };
}

// CoinGecko Pro simple price
// Docs: /simple/price. :contentReference[oaicite:8]{index=8}
async function fetchCoinGecko(symbol) {
  const [baseSym, quoteSym] = symbol.toLowerCase().split("-");
  const base = BASE || "https://pro-api.coingecko.com/api/v3";
  // You must translate baseSym to a coingecko id (e.g., "ethereum"). Maintain a map.
  const id = coingeckoIdFor(baseSym);
  const url = `${base}/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=${encodeURIComponent(quoteSym)}`;
  const j = await getJSON(url);
  const px = j?.[id]?.[quoteSym];
  if (!px) throw new Error(`No CoinGecko price for ${symbol}`);
  return { symbol: symbol.toUpperCase(), price: Number(px), source: "coingecko", ts: Date.now() };
}

function coingeckoIdFor(sym) {
  const m = { eth: "ethereum", btc: "bitcoin", sol: "solana" };
  if (!m[sym]) throw new Error(`Map ${sym} to a CoinGecko ID`);
  return m[sym];
}

async function fetchReferencePrice(symbol) {
  switch (PROVIDER) {
    case "pyth": return fetchPyth(symbol);
    case "coinbase": return fetchCoinbase(symbol);
    case "coingecko": return fetchCoinGecko(symbol);
    default: throw new Error(`Unknown provider: ${PROVIDER}`);
  }
}

module.exports = { fetchReadyIntents, groupIntentsByMarketEpoch, filterRealIntents, analyzePrivacyMetrics, fetchReferencePrice };