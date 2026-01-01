// intents-watcher.js-- listen to IntentReady events and push to a local queue (Redis recommended; fallback to in-memory with persistence).
const IORedis = require("ioredis");
const { ethers }= require("ethers");
const { CONFIG }= require("../config.js");
const { enqueueRequestId }= require("../utils/queue.js");
const { GHOSTLOCK_INTENTS_ABI } = require("../contracts/ABI.js");
const { setTimeout: delay } = require("timers/promises");
const { solverService } = require("./solver.js");

const redis = new IORedis(CONFIG.REDIS.URL);

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

async function ensureEpochSeedForIntent(epoch) {
  if (!solverService || !solverService.signer || !solverService.provider) {
    return;
  }
  
  try {
    const seed = await solverService.fetchEpochSeed(epoch);
    const isEmpty = !seed || seed === '0x0000000000000000000000000000000000000000000000000000000000000000';
    
    if (isEmpty && solverService.requestedEpochs && !solverService.requestedEpochs.has(epoch)) {
      console.log(`[IntentWatcher] Requesting epoch seed for epoch ${epoch} (intent detected)`);
      try {
        await solverService.requestEpochSeed(epoch);
        if (solverService.requestedEpochs) {
          solverService.requestedEpochs.add(epoch);
        }
      } catch (error) {
        if (error.message && error.message.includes('Seed exists')) {
          console.log(`[IntentWatcher] Seed for epoch ${epoch} already exists`);
        } else if (error.receipt && error.receipt.status === 0) {
          console.warn(`[IntentWatcher] Epoch seed request reverted for epoch ${epoch} - may be too early or insufficient funds`);
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    console.warn(`[IntentWatcher] Error checking epoch seed for epoch ${epoch}:`, error.message);
  }
}

async function startIntentWatcher() {
  const provider = new ethers.JsonRpcProvider(CONFIG.NETWORK.RPC_URL);
  const contract = new ethers.Contract(CONFIG.CONTRACTS.GHOSTLOCK_INTENTS, GHOSTLOCK_INTENTS_ABI, provider);

  let lastProcessedBlock = Number(await redis.get("ghostlock:lastEventBlock") || 0);
  let isProcessing = false;
  let consecutiveErrors = 0;

  if (!lastProcessedBlock || lastProcessedBlock <= 0) {
    const current = await provider.getBlockNumber();
    lastProcessedBlock = Math.max(0, current - SAFETY_REORG_BLOCKS - 1);
    await redis.set("ghostlock:lastEventBlock", String(lastProcessedBlock));
    console.log("IntentWatcher initialized lastEventBlock:", lastProcessedBlock);
  } else {
    const current = await provider.getBlockNumber();
    const gap = current - lastProcessedBlock;
    console.log(`IntentWatcher resuming from lastEventBlock: ${lastProcessedBlock} (gap: ${gap} blocks)`);
    
    if (gap > MAX_CATCHUP_BLOCKS) {
      console.warn(`Large catch-up gap detected (${gap} blocks). Skipping to recent blocks to avoid rate limits.`);
      lastProcessedBlock = Math.max(0, current - MAX_CATCHUP_BLOCKS);
      await redis.set("ghostlock:lastEventBlock", String(lastProcessedBlock));
      console.log(`Reset lastEventBlock to ${lastProcessedBlock} for safe catch-up`);
    }
  }

  const filter = contract.filters.IntentReady();

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
            const epochsToRequest = new Set();
            
            for (const ev of events) {
              try {
                const requestIdRaw = ev.args?.requestId ?? ev.args?.[0];
                const requestId = requestIdRaw?.toString?.() ?? String(requestIdRaw);
                console.log(`IntentReady detected requestId=${requestId} block=${ev.blockNumber} tx=${ev.transactionHash}`);
                
                await enqueueRequestId(redis, requestId);
                
                const eventBlock = Number(ev.blockNumber);
                const eventEpoch = Math.floor(eventBlock / CONFIG.AUCTION.EPOCH_DURATION_BLOCKS);
                epochsToRequest.add(eventEpoch);
              } catch (inner) {
                console.error("Failed to handle event:", inner?.message || inner);
              }
            }
            
            for (const epoch of epochsToRequest) {
              try {
                await ensureEpochSeedForIntent(epoch);
              } catch (seedError) {
                console.warn(`[IntentWatcher] Failed to ensure epoch seed for epoch ${epoch}:`, seedError.message);
              }
            }
          }

          await redis.set("ghostlock:lastEventBlock", String(end));
          lastProcessedBlock = end;
          consecutiveErrors = 0;

          if (end < toBlock) {
            await delay(DELAY_BETWEEN_BATCHES);
          }
        } catch (err) {
          const isRateLimit = err?.code === -32016 || 
                            err?.message?.includes('rate limit') ||
                            err?.error?.code === -32016;
          
          if (isRateLimit && retryCount < MAX_RETRIES) {
            const backoffDelay = RATE_LIMIT_RETRY_DELAY * Math.pow(2, retryCount);
            console.warn(`Rate limited on range ${start}-${end}. Retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
            await delay(backoffDelay);
            return await processRange(fromBlock, toBlock, retryCount + 1);
          } else {
            console.error(`Error querying logs in range ${start}-${end}:`, err?.message || err);
            consecutiveErrors++;
            success = false;
            
            if (consecutiveErrors >= 3) {
              console.error("Too many consecutive errors. Pausing watcher temporarily.");
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
          console.warn(`Block gap too large (${gap}). Resetting to block ${resetBlock} (will process incrementally).`);
          lastProcessedBlock = resetBlock;
          await redis.set("ghostlock:lastEventBlock", String(lastProcessedBlock));
        }
        const newFrom = Math.max(0, lastProcessedBlock + 1 - SAFETY_REORG_BLOCKS);
        const newTo = Math.min(newFrom + MAX_BLOCK_BATCH, to);
        if (newFrom <= newTo) {
          await processRange(newFrom, newTo);
        }
        return;
      }

      await processRange(from, to);
    } catch (e) {
      console.error("IntentWatcher block handler error:", e?.message || e);
    }
  });

  provider.on("error", (err) => {
    console.error("Provider error in intent watcher:", err?.message || err);
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
            console.warn(`Backup poll: gap too large (${gap}). Resetting to block ${resetBlock} (will process incrementally).`);
            lastProcessedBlock = resetBlock;
            await redis.set("ghostlock:lastEventBlock", String(lastProcessedBlock));
          }
          const newFrom = Math.max(0, lastProcessedBlock + 1 - SAFETY_REORG_BLOCKS);
          const newTo = Math.min(newFrom + MAX_BLOCK_BATCH, current);
          if (newFrom <= newTo) {
            await processRange(newFrom, newTo);
          }
          return;
        }
        await processRange(from, current);
      }
    } catch (e) {
      console.error("IntentWatcher backup poll error:", e?.message || e);
    }
  }, backupInterval);

  console.log("Intent watcher started (block-based log polling).");
}

module.exports = { startIntentWatcher };