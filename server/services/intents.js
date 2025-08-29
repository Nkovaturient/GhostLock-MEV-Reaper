import { setTimeout as delay } from "timers/promises";

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

export async function fetchReferencePrice(symbol) {
  switch (PROVIDER) {
    case "pyth": return fetchPyth(symbol);
    case "coinbase": return fetchCoinbase(symbol);
    case "coingecko": return fetchCoinGecko(symbol);
    default: throw new Error(`Unknown provider: ${PROVIDER}`);
  }
}
