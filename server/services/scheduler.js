const { CONFIG } = require("../config.js");
const { solverService } = require("./solver.js");
const { ethers } = require("ethers");

/**
 * Scheduler service for managing periodic tasks
 */
class SchedulerService {
  constructor() {
    this.tasks = new Map();
    this.isRunning = false;
  }

  /**
   * Start the scheduler service
   */
  start() {
    if (this.isRunning) {
      console.warn('Scheduler service is already running');
      return;
    }

    this.isRunning = true;
    console.log('🕐 Scheduler service started');

    // Start periodic tasks
    this.startSettlementCheck();
    this.startHealthCheck();
    this.startPriceUpdate();
    // Epoch seed monitoring removed - seeds are now requested on-demand when intents are detected
  }

  /**
   * Stop the scheduler service
   */
  stop() {
    this.isRunning = false;
    
    // Clear all intervals
    for (const [name, intervalId] of this.tasks) {
      clearInterval(intervalId);
      console.log(`🛑 Stopped task: ${name}`);
    }
    
    this.tasks.clear();
    console.log('🕐 Scheduler service stopped');
  }

  /**
   * Start settlement check task
   */
  startSettlementCheck() {
    const intervalId = setInterval(async () => {
      try {
        if (solverService.isRunning) {
          await solverService.processSettlements();
        }
      } catch (error) {
        console.error('Settlement check task failed:', error);
      }
    }, CONFIG.SCHEDULER.SETTLEMENT_CHECK_INTERVAL_MS);

    this.tasks.set('settlementCheck', intervalId);
    console.log(`✅ Settlement check task started (${CONFIG.SCHEDULER.SETTLEMENT_CHECK_INTERVAL_MS}ms)`);
  }

  /**
   * Start health check task
   */
  startHealthCheck() {
    const intervalId = setInterval(async () => {
      try {
        await solverService.performHealthCheck();
      } catch (error) {
        console.error('Health check task failed:', error);
      }
    }, CONFIG.SCHEDULER.HEALTH_CHECK_INTERVAL_MS);

    this.tasks.set('healthCheck', intervalId);
    console.log(`✅ Health check task started (${CONFIG.SCHEDULER.HEALTH_CHECK_INTERVAL_MS}ms)`);
  }

  /**
   * Start price update task
   */
  startPriceUpdate() {
    const intervalId = setInterval(async () => {
      try {
        // This would update price feeds and clear caches
        console.log('📊 Price update task executed');
      } catch (error) {
        console.error('Price update task failed:', error);
      }
    }, CONFIG.SCHEDULER.PRICE_UPDATE_INTERVAL_MS);

    this.tasks.set('priceUpdate', intervalId);
    console.log(`✅ Price update task started (${CONFIG.SCHEDULER.PRICE_UPDATE_INTERVAL_MS}ms)`);
  }

  /**
   * Start epoch seed monitoring task
   * Proactively requests epoch seeds for upcoming epochs to ensure they're ready
   * when intents are decrypted (Layer 2: RANDOMIZE)
   */
  // startEpochSeedMonitoring() {
  //   const intervalId = setInterval(async () => {
  //     try {
  //       await this.checkAndRequestEpochSeeds();
  //     } catch (error) {
  //       console.error('Epoch seed monitoring task failed:', error);
  //     }
  //   }, CONFIG.SCHEDULER.SETTLEMENT_CHECK_INTERVAL_MS * 2); // Check every 60s

  //   this.tasks.set('epochSeedMonitoring', intervalId);
  //   console.log(`✅ Epoch seed monitoring task started`);
  // }

  /**
   * Checks current and upcoming epochs and requests seeds if needed
   */
  async checkAndRequestEpochSeeds() {
    try {
      if (!solverService.signer) {
        return; // Can't request seeds without signer
      }

      const provider = solverService.provider;
      const currentBlock = await provider.getBlockNumber();
      const currentEpoch = Math.floor(currentBlock / CONFIG.AUCTION.EPOCH_DURATION_BLOCKS);
      
      // Check current epoch and next 2 epochs
      const epochsToCheck = [currentEpoch, currentEpoch + 1, currentEpoch + 2];
      
      for (const epoch of epochsToCheck) {
        try {
          const seed = await solverService.fetchEpochSeed(epoch);
          const isEmpty = !seed || seed === '0x0000000000000000000000000000000000000000000000000000000000000000';
          
          if (isEmpty && !solverService.requestedEpochs.has(epoch)) {
            console.log(`[EpochSeedMonitor] Proactively requesting seed for epoch ${epoch}`);
            await solverService.requestEpochSeed(epoch);
            solverService.requestedEpochs.add(epoch);
          }
        } catch (error) {
          console.warn(`[EpochSeedMonitor] Error checking epoch ${epoch}:`, error.message);
        }
      }
    } catch (error) {
      console.error('[EpochSeedMonitor] Error in epoch seed monitoring:', error);
    }
  }

  /**
   * Add a custom scheduled task
   * @param {string} name - Task name
   * @param {Function} task - Task function
   * @param {number} intervalMs - Interval in milliseconds
   */
  addTask(name, task, intervalMs) {
    if (this.tasks.has(name)) {
      console.warn(`Task ${name} already exists`);
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        await task();
      } catch (error) {
        console.error(`Task ${name} failed:`, error);
      }
    }, intervalMs);

    this.tasks.set(name, intervalId);
    console.log(`✅ Custom task ${name} started (${intervalMs}ms)`);
  }

  /**
   * Remove a scheduled task
   * @param {string} name - Task name
   */
  removeTask(name) {
    const intervalId = this.tasks.get(name);
    if (intervalId) {
      clearInterval(intervalId);
      this.tasks.delete(name);
      console.log(`🛑 Task ${name} removed`);
    } else {
      console.warn(`Task ${name} not found`);
    }
  }

  /**
   * Get scheduler status
   * @returns {Object} Scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeTasks: Array.from(this.tasks.keys()),
      taskCount: this.tasks.size
    };
  }
}

// Export singleton instance
const schedulerService = new SchedulerService();
module.exports = { schedulerService };
