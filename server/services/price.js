//simlple -uniform price -- continue modify 
import { DecodedIntent } from "../domain/types";

export function computeUniformClearingPrice(intents) {
  // Dumb but serviceable: search discrete candidate prices from intents’ limit prices
  const prices = Array.from(new Set(intents.map(i => i.limitPrice.toString()))).map(x => BigInt(x));
  prices.sort((a,b) => (a < b ? -1 : a > b ? 1 : 0));

  let best = prices[0] ?? 1n;
  let bestDiff = 2n**255n;

  for (const p of prices) {
    let buy = 0n, sell = 0n;
    for (const it of intents) {
      if (it.side === 0) { // buy base
        if (p <= it.limitPrice) {
          // assume deposits already cap amounts on-chain; use requested amount here
          buy += it.amount;
        }
      } else { // sell base
        if (p >= it.limitPrice) {
          sell += it.amount;
        }
      }
    }
    const diff = buy > sell ? buy - sell : sell - buy;
    if (diff < bestDiff) { bestDiff = diff; best = p; }
  }

  // Totals at chosen price (for UI preview)
  let buy = 0n, sell = 0n;
  for (const it of intents) {
    if (it.side === 0 && best <= it.limitPrice) buy += it.amount;
    if (it.side === 1 && best >= it.limitPrice) sell += it.amount;
  }
  return { clearingPrice: best, totals: { buyBase: buy, sellBase: sell } };
}
