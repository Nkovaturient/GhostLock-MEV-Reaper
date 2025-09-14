const { CONFIG } = require("../config.js");
const { solverService } = require("./solver.js");

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
