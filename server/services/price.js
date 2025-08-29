import { fetchReferencePrice } from "./intents";

/**
 * Computes uniform clearing price by minimizing | totalBuy - totalSell |
 * across candidate prices from intent limit prices.
 * If a reference price is available, break ties by closeness to reference.
 */
export async function computeUniformClearingPrice(intents, symbol = "ETH-USD") {
  if (!intents?.length) return { clearingPrice: 0n, totals: { buyBase: 0n, sellBase: 0n }, ref: null };

  // 1) candidate grid = unique limit prices
  const prices = Array.from(new Set(intents.map(i => i.limitPrice.toString()))).map(x => BigInt(x));
  prices.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  // 2) optional reference mid from provider (for tiebreak)
  let ref= null;
  try {
    const q = await fetchReferencePrice(symbol);
    // assume your intents are quoted in 1e8 or 1e6; if not, scale appropriately
    // here we assume 1e8 for safety; replace SCALE with your actual price decimals
    const SCALE = 10n ** 8n;
    ref = BigInt(Math.round(q.price * Number(SCALE)));
  } catch { /* survive without it */ }

  let best = prices[0] ?? 1n;
  let bestDiff = (1n << 255n);
  let bestTieBias = (1n << 255n);

  // 3) search
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
    const bias = ref === null ? 0n : (p > ref ? p - ref : ref - p);

    if (diff < bestDiff || (diff === bestDiff && bias < bestTieBias)) {
      bestDiff = diff;
      bestTieBias = bias;
      best = p;
    }
  }

  // 4) totals at chosen price (for UI)
  let buy = 0n, sell = 0n;
  for (const it of intents) {
    if (it.side === 0 && best <= it.limitPrice) buy += it.amount;
    if (it.side === 1 && best >= it.limitPrice) sell += it.amount;
  }
  return { clearingPrice: best, totals: { buyBase: buy, sellBase: sell }, ref };
}
