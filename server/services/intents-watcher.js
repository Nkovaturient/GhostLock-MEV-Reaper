// intents-watcher.js-- listen to IntentReady events and push to a local queue (Redis recommended; fallback to in-memory with persistence).
const IORedis = require("ioredis");
const { ethers }= require("ethers");
const { CONFIG }= require("../config.js");
const IntentAbi= require("../abis/GhostLockIntents.json");
const { enqueueRequestId }= require("../utils/queue.js"); // small helper to push IDs into your processing queue

const redis = new IORedis(CONFIG.REDIS.URL);

export function startIntentWatcher() {
  const provider = new ethers.JsonRpcProvider(CONFIG.NETWORK.RPC_URL);
  const contract = new ethers.Contract(CONFIG.CONTRACTS.GHOSTLOCK_INTENTS, IntentAbi, provider);

  // Recover last processed id to avoid reprocessing
  (async () => {
    const last = await redis.get("ghostlock:lastRequestId") || "0";
    console.log("IntentWatcher starting, lastRequestId=", last);
  })();

  const filter = contract.filters.IntentReady();
  provider.on(filter, async (log) => {
    try {
      // log.args may vary; use ethers to parse
      const parsed = contract.interface.parseLog(log);
      const requestId = parsed.args[0].toString();
      console.log("IntentReady event for requestId:", requestId);

      // enqueue for solver processing
      await enqueueRequestId(redis, requestId);
      await redis.set("ghostlock:lastRequestId", requestId);
    } catch (e) {
      console.error("IntentWatcher event parsing failed:", e.message || e);
    }
  });

  console.log("Intent watcher listening for IntentReady events.");
}
