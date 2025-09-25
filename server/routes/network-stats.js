// server/routes/network-stats.js
const express = require("express");
const router = express.Router();
const NodeCache = require("node-cache");
const { ethers } = require("ethers");

const cache = new NodeCache({ stdTTL: 5 }); // cache for 5s

// configure your provider via env or config
const RPC_URL = process.env.NETWORK_RPC_URL || "https://sepolia.public-node.example";
const provider = new ethers.JsonRpcProvider(RPC_URL);

async function computeStats() {
  const cached = cache.get("network_stats");
  if (cached) return cached;
  try {
    const latest = await provider.getBlockNumber();
    const lookback = 16;
    const start = Math.max(1, latest - lookback + 1);
    const blocks = [];
    for (let i = start; i <= latest; i++) {
      const b = await provider.getBlock(i);
      blocks.push(b.timestamp);
    }
    let avgBlockTime = 12;
    if (blocks.length >= 2) {
      let tot = 0;
      for (let i = 1; i < blocks.length; i++) tot += (blocks[i] - blocks[i - 1]);
      avgBlockTime = Math.max(1, Math.round(tot / (blocks.length - 1)));
    }

    // feeData for rough priority fee
    const feeData = await provider.getFeeData();
    const tipGwei = feeData.maxPriorityFeePerGas ? Number(ethers.utils.formatUnits(feeData.maxPriorityFeePerGas.toString(), "gwei")) : null;

    const stats = { latestBlock: latest, avgBlockTime, tipGwei };
    cache.set("network_stats", stats);
    return stats;
  } catch (e) {
    console.error("computeStats error", e);
    return { latestBlock: null, avgBlockTime: 12, tipGwei: null };
  }
}

router.get("/netstats", async (req, res) => {
  const stats = await computeStats();
  res.json(stats);
});

module.exports = router;
