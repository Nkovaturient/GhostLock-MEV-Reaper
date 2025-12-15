const { ethers } = require("ethers");
const { CONFIG, MARKETS } = require("../config.js");
const { fetchReadyIntents, groupIntentsByMarketEpoch, filterRealIntents, analyzePrivacyMetrics } = require("./intents.js");
const { computeUniformClearingPrice } = require("./price.js");
const { 
  settleBatchTx, 
  isBatchReadyForSettlement, 
  validateBatchConsistency, 
  createSolverSigner 
} = require("./settlement.js");
const IORedis = require("ioredis");
const { dequeueRequestId } = require("../utils/queue.js");
const { EPOCH_RNG_ABI } = require("../contracts/ABI.js");
const redis = new IORedis(CONFIG.REDIS.URL);
/**
 * Main solver service that orchestrates the settlement process
 */
class SolverService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.NETWORK.RPC_URL);
    this.signer = new ethers.JsonRpcSigner(this.provider, CONFIG.NETWORK.WALLET_ADDR);
    this.isRunning = false;
    this.lastSettlementTime = new Date();
    this.settlementStats = {
      totalSettlements: 0,
      totalVolume: 0n,
      averageSettlementTime: 0,
      lastError: null
    };
    this.requestedEpochs = new Set(); // Track epochs we've requested seeds for
    this.epochRNGContract = null; // Will be initialized in verifyContracts
  }

  /**
   * Initialize the solver service
   */
  async initialize() {
    try {
      if (CONFIG.SOLVER.PRIVATE_KEY) {
        this.signer = createSolverSigner();
        console.log(`Solver initialized with address: ${await this.signer.getAddress()}`);
      } else {
        console.warn('No solver private key provided - running in read-only mode');
      }
      
      // Verify contract connections
      await this.verifyContracts();
      console.log('Solver service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize solver service:', error);
      throw error;
    }
  }

  /**
   * Verify that all required contracts are accessible
   */
  async verifyContracts() {
    const contracts = [
      { name: 'GhostLockIntents', address: CONFIG.CONTRACTS.GHOSTLOCK_INTENTS },
      { name: 'BatchSettlement', address: CONFIG.CONTRACTS.BATCH_SETTLEMENT },
      { name: 'EpochRNG', address: CONFIG.CONTRACTS.EPOCH_RNG }
    ];

    for (const contract of contracts) {
      try {
        const code = await this.provider.getCode(contract.address);
        if (code === '0x') {
          throw new Error(`Contract ${contract.name} not found at ${contract.address}`);
        }
        console.log(`✓ ${contract.name} contract verified`);
      } catch (error) {
        console.error(`✗ Failed to verify ${contract.name} contract:`, error);
        throw error;
      }
    }

    // Initialize EpochRNG contract instance
    this.epochRNGContract = new ethers.Contract(
      CONFIG.CONTRACTS.EPOCH_RNG,
      EPOCH_RNG_ABI,
      this.provider
    );
  }

  /**
   * Start the solver service
   */
  async start() {
    if (this.isRunning) {
      console.warn('Solver service is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting solver service...');

    // Start the main settlement loop
    this.settlementLoop();
    
    // Start health monitoring
    this.healthCheckLoop();
  }

  /**
   * Stop the solver service
   */
  stop() {
    this.isRunning = false;
    console.log('Solver service stopped');
  }

  /**
   * Main settlement loop - checks for ready intents and settles them
   */
  async settlementLoop() {
    while (this.isRunning) {
      try {
        await this.processSettlements();
        await this.sleep(CONFIG.SCHEDULER.SETTLEMENT_CHECK_INTERVAL_MS);
      } catch (error) {
        console.error('Error in settlement loop:', error);
        this.settlementStats.lastError = error.message;
        
        // Handle rate limiting with exponential backoff
        if (error.code === 'CALL_EXCEPTION' && error.info?.error?.code === -32016) {
          console.warn('Rate limited, backing off...');
          await this.sleep(CONFIG.SCHEDULER.SETTLEMENT_CHECK_INTERVAL_MS * 2);
        } else {
          await this.sleep(CONFIG.SCHEDULER.SETTLEMENT_CHECK_INTERVAL_MS);
        }
      }
    }
  }

  /**
   * Process all pending settlements
   */
  async processSettlements() {
    try {
      // drain up to N items for batch building
      const batchIds = [];
      for (let i = 0; i < CONFIG.SOLVER.MAX_BATCH_PULL; i++) {
        const id = await dequeueRequestId(redis);
        if (!id) break;
        batchIds.push(Number(id));
      }
  
      if (batchIds.length === 0) {
        console.log('No queued intents to process');
        return;
      }

      // Fetch all ready intents
      const readyIntents = await fetchReadyIntents(this.provider);
      
      if (readyIntents.length === 0) {
        console.log('No ready intents found');
        return;
      }

      // Filter out dummy intents for settlement
      const realIntents = filterRealIntents(readyIntents);
      
      // Analyze privacy metrics
      const privacyMetrics = analyzePrivacyMetrics(readyIntents);
      console.log(`Found ${readyIntents.length} total intents (${realIntents.length} real, ${privacyMetrics.dummyIntents} dummy)`);
      console.log(`Privacy score: ${privacyMetrics.privacyScore.toFixed(1)}%`);
      
      if (realIntents.length === 0) {
        console.log('No real intents found for settlement');
        return;
      }

      // Group real intents by market and epoch
      const groupedIntents = groupIntentsByMarketEpoch(realIntents);
      
      // Process each group
      for (const [key, intents] of Object.entries(groupedIntents)) {
        await this.processBatch(key, intents);
      }
    } catch (error) {
      console.error('Error processing settlements:', error);
      throw error;
    }
  }

  /**
   * Process a single batch of intents
   * @param {string} key - Market-epoch key (e.g., "0-1234")
   * @param {Array} intents - Array of intents for this batch
   */
  async processBatch(key, intents) {
    try {
      console.log(`Processing batch ${key} with ${intents.length} intents`);

      // Validate batch consistency
      const validation = validateBatchConsistency(intents);
      if (!validation.isValid) {
        console.warn(`Batch ${key} validation failed: ${validation.reason}`);
        return;
      }

      // Check if batch is ready for settlement
      const isReady = await isBatchReadyForSettlement(this.provider, intents);
      if (!isReady) {
        console.log(`Batch ${key} not ready for settlement yet`);
        return;
      }

      // Ensure epoch seed exists for fair ordering (RANDOMIZE layer)
      // This prevents sandwich attacks by randomizing intent execution order
      const epochSeed = await this.ensureEpochSeed(validation.epoch)
      
      if (!epochSeed || epochSeed === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        console.warn(`Batch ${key}: Epoch seed not available, skipping settlement`);
        return;
      }

      // Deterministic seed-based ordering (RANDOMIZE layer)
      intents.sort((a, b) => this.compareBySeed(epochSeed, a, b))

      // Compute clearing price (pass symbol; internals can use seed if needed)
      const market = MARKETS[validation.marketId];
      if (!market) {
        console.warn(`Unknown market ID: ${validation.marketId}`);
        return;
      }

      const symbol = `${market.base}-${market.quote}`;
      const priceResult = await computeUniformClearingPrice(intents, symbol, epochSeed);
      
      if (priceResult.clearingPrice === 0n) {
        console.warn(`No valid clearing price found for batch ${key}`);
        return;
      }

      console.log(`Computed clearing price for batch ${key}: ${priceResult.clearingPrice} (${priceResult.method})`);

      // Settle the batch if we have a signer
      if (this.signer) {
        const requestIds = intents.map(intent => intent.requestId);
        const receipt = await settleBatchTx(
          this.signer,
          requestIds,
          validation.epoch,
          validation.marketId,
          priceResult.clearingPrice
        );

        // Update statistics
        this.updateSettlementStats(receipt, intents, priceResult);
        
        console.log(`✓ Batch ${key} settled successfully in block ${receipt.blockNumber}`);
      } else {
        console.log(`Would settle batch ${key} with price ${priceResult.clearingPrice} (read-only mode)`);
      }
    } catch (error) {
      console.error(`Error processing batch ${key}:`, error);
      throw error;
    }
  }

  /**
   * Ensures epoch seed exists for fair ordering (RANDOMIZE layer)
   * If seed doesn't exist, requests it and waits for VRF callback
   * @param {number} epoch - The epoch number
   * @returns {Promise<string>} The epoch seed (bytes32 hex string)
   */
  async ensureEpochSeed(epoch) {
    try {
      // First, check if seed already exists
      let seed = await this.fetchEpochSeed(epoch);
      const isEmpty = !seed || seed === '0x0000000000000000000000000000000000000000000000000000000000000000';
      
      if (!isEmpty) {
        return seed;
      }

      // Seed doesn't exist - request it if we haven't already
      if (!this.requestedEpochs.has(epoch)) {
        console.log(`[EpochRNG] Requesting seed for epoch ${epoch} (RANDOMIZE layer)`);
        await this.requestEpochSeed(epoch);
        this.requestedEpochs.add(epoch);
      }

      // Wait for seed to be available (VRF callback)
      console.log(`[EpochRNG] Waiting for epoch ${epoch} seed from VRF...`);
      seed = await this.waitForEpochSeed(epoch);
      
      return seed;
    } catch (error) {
      console.error(`[EpochRNG] Error ensuring epoch seed for epoch ${epoch}:`, error);
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    }
  }

  /**
   * Fetches epoch seed from EpochRNG contract (read-only)
   * @param {number} epoch - The epoch number
   * @returns {Promise<string>} The epoch seed or zero bytes if not available
   */
  async fetchEpochSeed(epoch) {
    try {
      if (!this.epochRNGContract) {
        this.epochRNGContract = new ethers.Contract(
          CONFIG.CONTRACTS.EPOCH_RNG,
          EPOCH_RNG_ABI,
          this.provider
        );
      }
      const seed = await this.epochRNGContract.epochSeed(epoch);
      return seed;
    } catch (e) {
      console.warn(`[EpochRNG] Failed to fetch epoch seed for epoch ${epoch}:`, e.message);
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    }
  }

  /**
   * Requests epoch seed from EpochRNG contract (write transaction)
   * This triggers VRF randomness request from Drand network
   * @param {number} epoch - The epoch number
   * @returns {Promise<string>} Transaction hash
   */
  async requestEpochSeed(epoch) {
    if (!this.signer) {
      throw new Error('Solver signer not available - cannot request epoch seed');
    }

    try {
      const rngContract = new ethers.Contract(
        CONFIG.CONTRACTS.EPOCH_RNG,
        EPOCH_RNG_ABI,
        this.signer
      );

      // Check if seed already exists before requesting
      const existingSeed = await rngContract.epochSeed(epoch);
      if (existingSeed !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        console.log(`[EpochRNG] Seed for epoch ${epoch} already exists`);
        return null;
      }

      // Request seed with sufficient callback gas limit
      const callbackGasLimit = 500000; // Sufficient for VRF callback
      const tx = await rngContract.requestEpochSeed(epoch, callbackGasLimit, {
        value: ethers.parseEther('0.001'), // Funding for VRF callback
        maxFeePerGas: ethers.parseUnits("0.2", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("0.2", "gwei"),
      });

      console.log(`[EpochRNG] Epoch seed request submitted for epoch ${epoch}: ${tx.hash}`);
      await tx.wait();
      console.log(`[EpochRNG] Epoch seed request confirmed for epoch ${epoch}`);

      return tx.hash;
    } catch (error) {
      // Handle "Seed exists" error gracefully
      if (error.message && error.message.includes('Seed exists')) {
        console.log(`[EpochRNG] Seed for epoch ${epoch} already exists (requested by another solver)`);
        return null;
      }
      console.error(`[EpochRNG] Failed to request epoch seed for epoch ${epoch}:`, error);
      throw error;
    }
  }

  /**
   * Waits for epoch seed to become available after VRF request
   * Polls the contract until seed is available or timeout
   * @param {number} epoch - The epoch number
   * @param {number} maxWaitTime - Maximum time to wait in milliseconds (default: 5 minutes)
   * @param {number} pollInterval - Polling interval in milliseconds (default: 10 seconds)
   * @returns {Promise<string>} The epoch seed when available
   */
  async waitForEpochSeed(epoch, maxWaitTime = 300000, pollInterval = 10000) {
    const startTime = Date.now();
    const zeroSeed = '0x0000000000000000000000000000000000000000000000000000000000000000';

    while (Date.now() - startTime < maxWaitTime) {
      const seed = await this.fetchEpochSeed(epoch);
      
      if (seed && seed !== zeroSeed) {
        console.log(`[EpochRNG] Epoch ${epoch} seed available: ${seed.slice(0, 10)}...`);
        return seed;
      }

      // Wait before next poll
      await this.sleep(pollInterval);
    }

    console.warn(`[EpochRNG] Timeout waiting for epoch ${epoch} seed after ${maxWaitTime}ms`);
    return zeroSeed;
  }

  // Deterministic compare via keccak256(seed || requestId || user)
  compareBySeed(seed, a, b) {
    const ha = ethers.keccak256(ethers.concat([
      seed,
      ethers.zeroPadValue(ethers.toBeHex(a.requestId), 32),
      ethers.getBytes(ethers.zeroPadValue(a.user, 32))
    ]))
    const hb = ethers.keccak256(ethers.concat([
      seed,
      ethers.zeroPadValue(ethers.toBeHex(b.requestId), 32),
      ethers.getBytes(ethers.zeroPadValue(b.user, 32))
    ]))
    return ha < hb ? -1 : ha > hb ? 1 : 0
  }

  /**
   * Update settlement statistics
   * @param {ethers.TransactionReceipt} receipt - Settlement transaction receipt
   * @param {Array} intents - Settled intents
   * @param {Object} priceResult - Price computation result
   */
  updateSettlementStats(receipt, intents, priceResult) {
    this.settlementStats.totalSettlements++;
    
    // Calculate volume (simplified)
    const volume = intents.reduce((sum, intent) => sum + intent.amount, 0n);
    this.settlementStats.totalVolume += volume;
    
    // Update average settlement time
    const now = new Date();
    const settlementTime = now.getTime() - this.lastSettlementTime.getTime();
    this.settlementStats.averageSettlementTime = 
      (this.settlementStats.averageSettlementTime * (this.settlementStats.totalSettlements - 1) + settlementTime) / 
      this.settlementStats.totalSettlements;
    
    this.lastSettlementTime = now;
  }

  /**
   * Health check loop
   */
  async healthCheckLoop() {
    while (this.isRunning) {
      try {
        await this.performHealthCheck();
        await this.sleep(CONFIG.SCHEDULER.HEALTH_CHECK_INTERVAL_MS);
      } catch (error) {
        console.error('Health check failed:', error);
        await this.sleep(CONFIG.SCHEDULER.HEALTH_CHECK_INTERVAL_MS);
      }
    }
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      const balance = this.signer ? await this.signer.provider.getBalance(await this.signer.getAddress()) : 0n;
      console.log(`Health check - Block: ${blockNumber}, Balance: ${ethers.formatEther(balance)} ETH`);
      
      // Check if we have enough balance for transactions
      if (this.signer && balance < ethers.parseEther("0.001")) {
        console.warn('Solver balance is low - consider adding funds');
      }
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }

  /**
   * Get current solver status
   * @returns {Object} Solver status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasSigner: !!this.signer,
      lastSettlementTime: this.lastSettlementTime,
      stats: this.settlementStats,
      config: {
        network: CONFIG.NETWORK.CHAIN_ID,
        settlementInterval: CONFIG.SCHEDULER.SETTLEMENT_CHECK_INTERVAL_MS,
        aiEnabled: CONFIG.AI.ENABLED
      }
    };
  }

  /**
   * Utility function for sleeping
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
const solverService = new SolverService();
module.exports = { solverService };
