// intents-watcher.js-- listen to IntentReady events and push to a local queue (Redis recommended; fallback to in-memory with persistence).
const IORedis = require("ioredis");
const { ethers }= require("ethers");
const { CONFIG }= require("../config.js");
const { enqueueRequestId }= require("../utils/queue.js"); // small helper to push IDs into the processing queue
const { GHOSTLOCK_INTENTS_ABI } = require("../contracts/ABI.js");

const redis = new IORedis(CONFIG.REDIS.URL);

const SAFETY_REORG_BLOCKS = CONFIG.WATCHER?.REORG_TOLERANCE_BLOCKS || 6;
const MAX_BLOCK_BATCH = CONFIG.WATCHER?.MAX_BLOCK_BATCH || 100; // don't query huge ranges

async function startIntentWatcher() {
  const provider = new ethers.JsonRpcProvider(CONFIG.NETWORK.RPC_URL);
  const contract = new ethers.Contract(CONFIG.CONTRACTS.GHOSTLOCK_INTENTS, GHOSTLOCK_INTENTS_ABI, provider);

  // Initialize last processed block (persisted in Redis)
  let lastProcessedBlock = Number(await redis.get("ghostlock:lastEventBlock") || 0);
  if (!lastProcessedBlock || lastProcessedBlock <= 0) {
    const current = await provider.getBlockNumber();
    // start from a safe point a few blocks behind current to avoid missing recent events due to reorg
    lastProcessedBlock = Math.max(0, current - SAFETY_REORG_BLOCKS - 1);
    await redis.set("ghostlock:lastEventBlock", String(lastProcessedBlock));
    console.log("IntentWatcher initialized lastEventBlock:", lastProcessedBlock);
  } else {
    console.log("IntentWatcher resuming from lastEventBlock:", lastProcessedBlock);
  }

  const filter = contract.filters.IntentReady(); // event filter

  // Helper: process events in a range
  async function processRange(fromBlock, toBlock) {
    if (fromBlock > toBlock) return;
    // split big ranges to avoid provider issues
    let start = fromBlock;
    while (start <= toBlock) {
      const end = Math.min(start + MAX_BLOCK_BATCH - 1, toBlock);
      try {
        const events = await contract.queryFilter(filter, start, end);
        if (events && events.length) {
          for (const ev of events) {
            try {
              // event.args may be array-like; first arg is requestId per ABI
              const requestIdRaw = ev.args?.requestId ?? ev.args?.[0];
              const requestId = requestIdRaw?.toString?.() ?? String(requestIdRaw);
              console.log(`IntentReady detected requestId=${requestId} block=${ev.blockNumber} tx=${ev.transactionHash}`);
              await enqueueRequestId(redis, requestId);
            } catch (inner) {
              console.error("Failed to handle event:", inner?.message || inner);
            }
          }
        }
        // update lastProcessedBlock up to end (we processed this range)
        await redis.set("ghostlock:lastEventBlock", String(end));
        lastProcessedBlock = end;
      } catch (err) {
        // If provider errors, log and break to avoid tight loop; we'll try again on next block signal
        console.error("Error querying logs in range", start, end, ":", err?.message || err);
        break;
      }
      start = end + 1;
    }
  }

  // React to new blocks and query the missing range
  provider.on("block", async (blockNumber) => {
    try {
      // Ensure numeric
      const bn = Number(blockNumber);
      if (isNaN(bn)) return;

      // Query from lastProcessedBlock + 1 minus a small tail for reorg tolerance
      const from = Math.max(0, lastProcessedBlock + 1 - SAFETY_REORG_BLOCKS);
      const to = bn;
      if (from > to) return;

      // Process events in that range
      await processRange(from, to);
    } catch (e) {
      console.error("IntentWatcher block handler error:", e?.message || e);
    }
  });

  // Provider error handling
  provider.on("error", (err) => {
    console.error("Provider error in intent watcher:", err?.message || err);
  });

  // In case provider doesn't emit blocks reliably, set a backup polling interval
  const backupInterval = (CONFIG.WATCHER?.BACKUP_POLL_MS) || 15000;
  setInterval(async () => {
    try {
      const current = await provider.getBlockNumber();
      const from = Math.max(0, lastProcessedBlock + 1 - SAFETY_REORG_BLOCKS);
      if (from <= current) {
        await processRange(from, current);
      }
    } catch (e) {
      console.error("IntentWatcher backup poll error:", e?.message || e);
    }
  }, backupInterval);

  console.log("Intent watcher started (block-based log polling).");
}

module.exports = { startIntentWatcher };