const ethers = require("ethers");
const { CONFIG, ABIS } = require("../config.js");
const { setTimeout: delay } = require("timers/promises");
const db = require("../utils/db.js");
const { requestIdFromEventArg } = require("../utils/requestId.js");

const PROVIDER = process.env.PRICE_FEED_PROVIDER || "pyth";
const BASE = process.env.PRICE_FEED_BASE_URL || "";

async function getJSON(url, init = {}, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, {
        ...init,
        headers: { ...(init.headers || {}), accept: "application/json" },
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

function decodePlaintext(plaintext) {
  try {
    const d = ethers.AbiCoder.defaultAbiCoder().decode(
      ['address', 'uint8', 'uint256', 'uint256', 'uint8', 'uint256', 'bool'],
      plaintext
    );
    return {
      user: d[0], side: Number(d[1]), amount: d[2],
      limitPrice: d[3], marketId: Number(d[4]),
      intentEpoch: Number(d[5]), isDummy: Boolean(d[6]),
    };
  } catch {
    try {
      const d = ethers.AbiCoder.defaultAbiCoder().decode(
        ['address', 'uint8', 'uint256', 'uint256', 'uint8', 'uint256'],
        plaintext
      );
      return {
        user: d[0], side: Number(d[1]), amount: d[2],
        limitPrice: d[3], marketId: Number(d[4]),
        intentEpoch: Number(d[5]), isDummy: false,
      };
    } catch {
      return null;
    }
  }
}

async function fetchDecryptedIntents(provider, fromBlock, toBlock, epochFilter = null) {
  const contract = new ethers.Contract(
    CONFIG.CONTRACTS.GHOSTLOCK_LIVENESS,
    ABIS.GHOSTLOCK_LIVENESS_ABI,
    provider
  );

  const filter = contract.filters.IntentDecrypted();
  const events = await contract.queryFilter(filter, fromBlock, toBlock);

  const intents = [];
  for (const ev of events) {
    try {
      const requestId  = requestIdFromEventArg(ev.args?.requestId);
      if (!requestId) continue;
      const marketId   = Number(ev.args?.marketId);
      const epoch      = Number(ev.args?.epoch);
      const forced     = Boolean(ev.args?.forced);
      const revealer   = ev.args?.revealer;
      const plaintext  = ev.args?.plaintext;

      if (epochFilter !== null && epoch !== epochFilter) continue;
      if (!plaintext) continue;

      const decoded = decodePlaintext(plaintext);
      if (!decoded) continue;

      intents.push({
        requestId,
        user:        decoded.user,
        side:        decoded.side,
        amount:      decoded.amount,
        limitPrice:  decoded.limitPrice,
        marketId,
        epoch,
        forced,
        revealer,
        txHash:      ev.transactionHash,
        blockNumber: Number(ev.blockNumber),
        isDummy:     decoded.isDummy,
      });
    } catch (err) {
      console.warn("[intents] Error parsing IntentDecrypted event:", err.message);
    }
  }

  return intents;
}

async function fetchReadyIntents(provider, epoch = null) {
  try {
    const lastBlock = Number(db.getKv("ghostlock:lastEventBlock") || 0);
    if (!lastBlock) {
      return [];
    }
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, lastBlock - 1000);
    const toBlock   = currentBlock;
    return await fetchDecryptedIntents(provider, fromBlock, toBlock, epoch);
  } catch (error) {
    console.error("[intents] fetchReadyIntents error:", error.message);
    return [];
  }
}

async function fetchIntentsFromDb(limit = 50) {
  const rows = db.getDb().prepare(`
    SELECT request_id, epoch, market_id, user, side, amount, limit_price, is_dummy
    FROM pending_intents
    WHERE processed = 0 AND user IS NOT NULL
    ORDER BY detected_at ASC
    LIMIT ?
  `).all(limit);

  return rows.map(r => ({
    requestId:  r.request_id,
    user:       r.user,
    side:       r.side,
    amount:     BigInt(r.amount || 0),
    limitPrice: BigInt(r.limit_price || 0),
    marketId:   r.market_id,
    epoch:      r.epoch,
    isDummy:    Boolean(r.is_dummy),
  }));
}

function groupIntentsByMarketEpoch(intents) {
  const groups = {};
  for (const intent of intents) {
    const key = `${intent.marketId}-${intent.epoch}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(intent);
  }
  return groups;
}

function filterRealIntents(intents) {
  return intents.filter(intent => !intent.isDummy);
}

function analyzePrivacyMetrics(intents) {
  const totalIntents = intents.length;
  const dummyIntents = intents.filter(intent => intent.isDummy).length;
  const realIntents  = totalIntents - dummyIntents;
  return {
    totalIntents,
    realIntents,
    dummyIntents,
    dummyRatio:  totalIntents > 0 ? dummyIntents / totalIntents : 0,
    privacyScore: totalIntents > 0 ? (dummyIntents / totalIntents) * 100 : 0,
  };
}

async function fetchPyth(symbol) {
  const SYM = symbol.toUpperCase();
  const base = BASE || "https://hermes.pyth.network";
  const url = `${base}/v2/updates/price/latest?ids[]=${encodeURIComponent(pythIdFor(SYM))}`;
  const j = await getJSON(url);
  const item = j?.prices?.[0];
  if (!item) throw new Error(`No Pyth price for ${SYM}`);
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

async function fetchCoinbase(symbol) {
  const [baseSym, quoteSym] = symbol.toUpperCase().split("-");
  const productId = `${baseSym}-${quoteSym}`;
  const base = BASE || "https://api.exchange.coinbase.com";
  const url = `${base}/products/${encodeURIComponent(productId)}/ticker`;
  const j = await getJSON(url);
  if (!j?.price) throw new Error(`No Coinbase price for ${productId}`);
  return { symbol, price: Number(j.price), source: "coinbase", ts: Date.now() };
}

async function fetchCoinGecko(symbol) {
  const [baseSym, quoteSym] = symbol.toLowerCase().split("-");
  const base = BASE || "https://pro-api.coingecko.com/api/v3";
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
    case "pyth":      return fetchPyth(symbol);
    case "coinbase":  return fetchCoinbase(symbol);
    case "coingecko": return fetchCoinGecko(symbol);
    default: throw new Error(`Unknown provider: ${PROVIDER}`);
  }
}

module.exports = {
  fetchReadyIntents,
  fetchIntentsFromDb,
  groupIntentsByMarketEpoch,
  filterRealIntents,
  analyzePrivacyMetrics,
  fetchReferencePrice,
};
