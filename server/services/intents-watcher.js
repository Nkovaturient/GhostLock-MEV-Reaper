const db = require("../utils/db.js");
const { ethers } = require("ethers");
const { CONFIG, ABIS } = require("../config.js");
const { setTimeout: delay } = require("timers/promises");

const SAFETY_REORG_BLOCKS = CONFIG.WATCHER?.REORG_TOLERANCE_BLOCKS || 6;
const MAX_BLOCK_BATCH = CONFIG.WATCHER?.MAX_BLOCK_BATCH || 50;
const MAX_CATCHUP_BLOCKS = CONFIG.WATCHER?.MAX_CATCHUP_BLOCKS || 10000;
const RATE_LIMIT_RETRY_DELAY = CONFIG.WATCHER?.RATE_LIMIT_RETRY_DELAY_MS || 5000;
const MAX_RETRIES = CONFIG.WATCHER?.MAX_RETRIES || 3;
const DELAY_BETWEEN_BATCHES = CONFIG.WATCHER?.DELAY_BETWEEN_BATCHES_MS || 1000;

class RateLimiter {
  constructor(maxRequests = 1, timeWindow = 2000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }

  async waitForSlot() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest);
      if (waitTime > 0) {
        await delay(waitTime);
        return this.waitForSlot();
      }
    }

    this.requests.push(now);
  }
}

const rateLimiter = new RateLimiter(CONFIG.RPC.MAX_REQUESTS_PER_SECOND, CONFIG.RPC.RATE_LIMIT_WINDOW_MS);

function decodePlaintext(plaintext) {
  try {
    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
      ['address', 'uint8', 'uint256', 'uint256', 'uint8', 'uint256', 'bool'],
      plaintext
    );
    return {
      user:         decoded[0],
      side:         Number(decoded[1]),
      amount:       decoded[2],
      limitPrice:   decoded[3],
      marketId:     Number(decoded[4]),
      intentEpoch:  Number(decoded[5]),
      isDummy:      Boolean(decoded[6]),
    };
  } catch {
    try {
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
        ['address', 'uint8', 'uint256', 'uint256', 'uint8', 'uint256'],
        plaintext
      );
      return {
        user:        decoded[0],
        side:        Number(decoded[1]),
        amount:      decoded[2],
        limitPrice:  decoded[3],
        marketId:    Number(decoded[4]),
        intentEpoch: Number(decoded[5]),
        isDummy:     false,
      };
    } catch {
      return null;
    }
  }
}

async function startIntentWatcher() {
  const provider = new ethers.JsonRpcProvider(CONFIG.NETWORK.RPC_URL);
  const contract = new ethers.Contract(
    CONFIG.CONTRACTS.GHOSTLOCK_LIVENESS,
    ABIS.GHOSTLOCK_LIVENESS_ABI,
    provider
  );

  let lastProcessedBlock = Number(db.getKv("ghostlock:lastEventBlock") || 0);
  let isProcessing = false;
  let consecutiveErrors = 0;

  if (!lastProcessedBlock || lastProcessedBlock <= 0) {
    const current = await provider.getBlockNumber();
    lastProcessedBlock = Math.max(0, current - SAFETY_REORG_BLOCKS - 1);
    db.setKv("ghostlock:lastEventBlock", lastProcessedBlock);
    console.log("[IntentWatcher] Initialized lastEventBlock:", lastProcessedBlock);
  } else {
    const current = await provider.getBlockNumber();
    const gap = current - lastProcessedBlock;
    console.log(`[IntentWatcher] Resuming from lastEventBlock: ${lastProcessedBlock} (gap: ${gap} blocks)`);

    if (gap > MAX_CATCHUP_BLOCKS) {
      console.warn(`[IntentWatcher] Large catch-up gap (${gap} blocks). Resetting to safe block.`);
      lastProcessedBlock = Math.max(0, current - MAX_CATCHUP_BLOCKS);
      db.setKv("ghostlock:lastEventBlock", lastProcessedBlock);
    }
  }

  const filter = contract.filters.IntentDecrypted();

  async function processRange(fromBlock, toBlock, retryCount = 0) {
    if (fromBlock > toBlock) return true;
    if (isProcessing) return false;

    isProcessing = true;
    let start = fromBlock;
    let success = true;

    try {
      while (start <= toBlock) {
        const end = Math.min(start + MAX_BLOCK_BATCH - 1, toBlock);

        try {
          await rateLimiter.waitForSlot();
          const events = await contract.queryFilter(filter, start, end);

          if (events && events.length) {
            for (const ev of events) {
              try {
                const requestId  = Number(ev.args?.requestId ?? ev.args?.[0]);
                const marketId   = Number(ev.args?.marketId ?? ev.args?.[1]);
                const epoch      = Number(ev.args?.epoch ?? ev.args?.[2]);
                const forced     = Boolean(ev.args?.forced ?? ev.args?.[3]);
                const revealer   = ev.args?.revealer ?? ev.args?.[4];
                const plaintext  = ev.args?.plaintext ?? ev.args?.[5];
                const eventBlock = Number(ev.blockNumber);

                if (requestId == null || !plaintext) {
                  console.warn("[IntentWatcher] Malformed IntentDecrypted event, skipping");
                  continue;
                }

                const decoded = decodePlaintext(plaintext);
                if (!decoded) {
                  console.warn(`[IntentWatcher] Could not decode plaintext for requestId=${requestId}`);
                  continue;
                }

                console.log(
                  `[IntentWatcher] IntentDecrypted requestId=${requestId} user=${decoded.user} ` +
                  `marketId=${marketId} epoch=${epoch} side=${decoded.side} ` +
                  `forced=${forced} tx=${ev.transactionHash}`
                );

                db.insertIntent(requestId, epoch, marketId, eventBlock);

                db.getDb().prepare(`
                  INSERT OR REPLACE INTO pending_intents
                    (request_id, epoch, market_id, detected_block, user, side, amount, limit_price, is_dummy, processed)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
                `).run(
                  requestId, epoch, marketId, eventBlock,
                  decoded.user, decoded.side,
                  decoded.amount.toString(), decoded.limitPrice.toString(),
                  decoded.isDummy ? 1 : 0
                );

              } catch (inner) {
                console.error("[IntentWatcher] Failed to handle event:", inner?.message || inner);
              }
            }
          }

          db.setKv("ghostlock:lastEventBlock", end);
          lastProcessedBlock = end;
          consecutiveErrors = 0;

          if (end < toBlock) {
            await delay(DELAY_BETWEEN_BATCHES);
          }
        } catch (err) {
          const isRateLimit =
            err?.code === -32016 ||
            err?.message?.includes("rate limit") ||
            err?.error?.code === -32016;

          if (isRateLimit && retryCount < MAX_RETRIES) {
            const backoffDelay = RATE_LIMIT_RETRY_DELAY * Math.pow(2, retryCount);
            console.warn(`[IntentWatcher] Rate limited on range ${start}-${end}. Retrying in ${backoffDelay}ms`);
            await delay(backoffDelay);
            return await processRange(fromBlock, toBlock, retryCount + 1);
          } else {
            console.error(`[IntentWatcher] Error querying logs in range ${start}-${end}:`, err?.message || err);
            consecutiveErrors++;
            success = false;

            if (consecutiveErrors >= 3) {
              console.error("[IntentWatcher] Too many consecutive errors. Pausing watcher temporarily.");
              await delay(RATE_LIMIT_RETRY_DELAY * 2);
              consecutiveErrors = 0;
            }
            break;
          }
        }

        start = end + 1;
      }
    } finally {
      isProcessing = false;
    }

    return success;
  }

  provider.on("block", async (blockNumber) => {
    try {
      if (isProcessing) return;

      const bn = Number(blockNumber);
      if (isNaN(bn)) return;

      const from = Math.max(0, lastProcessedBlock + 1 - SAFETY_REORG_BLOCKS);
      const to = bn;

      if (from > to) return;

      const gap = to - from;
      if (gap > MAX_CATCHUP_BLOCKS) {
        const resetBlock = Math.max(0, to - MAX_CATCHUP_BLOCKS);
        if (lastProcessedBlock < resetBlock) {
          console.warn(`[IntentWatcher] Block gap too large (${gap}). Resetting to block ${resetBlock}.`);
          lastProcessedBlock = resetBlock;
          db.setKv("ghostlock:lastEventBlock", lastProcessedBlock);
        }
        const newFrom = Math.max(0, lastProcessedBlock + 1 - SAFETY_REORG_BLOCKS);
        const newTo = Math.min(newFrom + MAX_BLOCK_BATCH, to);
        if (newFrom <= newTo) await processRange(newFrom, newTo);
        return;
      }

      await processRange(from, to);
    } catch (e) {
      console.error("[IntentWatcher] Block handler error:", e?.message || e);
    }
  });

  provider.on("error", (err) => {
    console.error("[IntentWatcher] Provider error:", err?.message || err);
  });

  const backupInterval = CONFIG.WATCHER?.BACKUP_POLL_MS || 15000;
  setInterval(async () => {
    try {
      if (isProcessing) return;

      const current = await provider.getBlockNumber();
      const from = Math.max(0, lastProcessedBlock + 1 - SAFETY_REORG_BLOCKS);

      if (from <= current) {
        const gap = current - from;
        if (gap > MAX_CATCHUP_BLOCKS) {
          const resetBlock = Math.max(0, current - MAX_CATCHUP_BLOCKS);
          if (lastProcessedBlock < resetBlock) {
            lastProcessedBlock = resetBlock;
            db.setKv("ghostlock:lastEventBlock", lastProcessedBlock);
          }
          const newFrom = Math.max(0, lastProcessedBlock + 1 - SAFETY_REORG_BLOCKS);
          const newTo = Math.min(newFrom + MAX_BLOCK_BATCH, current);
          if (newFrom <= newTo) await processRange(newFrom, newTo);
          return;
        }
        await processRange(from, current);
      }
    } catch (e) {
      console.error("[IntentWatcher] Backup poll error:", e?.message || e);
    }
  }, backupInterval);

  console.log("[IntentWatcher] Started — listening for IntentDecrypted events on GhostLockLiveness.");
}

module.exports = { startIntentWatcher };
