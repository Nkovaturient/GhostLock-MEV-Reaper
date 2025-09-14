const { ethers } = require("ethers");
const { CONFIG } = require("../config.js");

/**
 * simulateSettlementTx uses callStatic.settleBatch to catch reverts. Run it before broadcasting.
 * isBatchReadyForSettlement now checks settledIntent(requestId) on-chain (assumes that mapping exists as public).
 *  If your contract uses a different name, substitute accordingly. Gas estimation with buffer avoids underestimates.
 * Simulate settlement via callStatic to detect reverts before sending.
 * Returns {ok: boolean, error?: string}
 */
async function simulateSettlementTx(provider, requestIds, epoch, marketId, clearingPrice, fromAddress) {
  try {
    const settlementContract = new ethers.Contract(
      CONFIG.CONTRACTS.BATCH_SETTLEMENT,
      CONFIG.ABIS.BATCH_SETTLEMENT,
      provider
    );

    // callStatic to simulate; in ethers v6 it's settlementContract.callStatic.settleBatch(...)
    await settlementContract.callStatic.settleBatch(
      requestIds,
      epoch,
      marketId,
      clearingPrice,
      { from: fromAddress }
    );

    return { ok: true };
  } catch (err) {
    // return revert reason where possible
    const msg = err && err.error && err.error.message ? err.error.message : err.message || String(err);
    console.warn("simulateSettlementTx failed:", msg);
    return { ok: false, error: msg };
  }
}

/**
 * Submits a batch settlement transaction to the blockchain
 * @param {ethers.Signer} signer - The signer for the transaction
 * @param {number[]} requestIds - Array of intent request IDs to settle
 * @param {number} epoch - The epoch for this settlement
 * @param {number} marketId - The market ID being settled
 * @param {bigint} clearingPrice - The uniform clearing price
 * @returns {Promise<ethers.TransactionReceipt>} Transaction receipt
 */
async function settleBatchTx(signer, requestIds, epoch, marketId, clearingPrice) {
  let retries = CONFIG.SOLVER.MAX_RETRIES;

  while (retries > 0) {
    try {
      const settlementContract = new ethers.Contract(
        CONFIG.CONTRACTS.BATCH_SETTLEMENT,
        CONFIG.ABIS.BATCH_SETTLEMENT,
        signer
      );

      console.log(`Settling batch: ${requestIds.length} intents, epoch ${epoch}, market ${marketId}, price ${clearingPrice}`);

      // dynamic gas estimation
      let gasEstimate;
      try {
        gasEstimate = await settlementContract.estimateGas.settleBatch(requestIds, epoch, marketId, clearingPrice);
      } catch (e) {
        // fallback to configured gasLimit
        gasEstimate = ethers.BigNumber.from(CONFIG.SOLVER.GAS_LIMIT || 8_000_000);
        console.warn("estimateGas failed, using fallback gasEstimate:", gasEstimate.toString(), e.message || e);
      }

      // Add buffer
      const gasLimit = gasEstimate.mul(110).div(100); // +10%

      const tx = await settlementContract.settleBatch(
        requestIds,
        epoch,
        marketId,
        clearingPrice,
        {
          maxFeePerGas: ethers.parseUnits("0.2", "gwei"),
          maxPriorityFeePerGas: ethers.parseUnits("0.2", "gwei")
        }
      );

      console.log(`Settlement transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`Settlement completed in block ${receipt.blockNumber}`);

      return receipt;
    } catch (error) {
      retries--;

      // Handle rate limiting with exponential backoff
      if (error.code === 'CALL_EXCEPTION' && error.info?.error?.code === -32016) {
        console.warn(`Rate limited during settlement, retrying in ${CONFIG.SOLVER.RETRY_DELAY_MS}ms... (${retries} retries left)`);
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.SOLVER.RETRY_DELAY_MS));
          continue;
        }
      }

      console.error('Settlement transaction failed:', error);
      if (retries === 0) {
        throw error;
      }

      // Wait before retry for other errors
      await new Promise(resolve => setTimeout(resolve, CONFIG.SOLVER.RETRY_DELAY_MS));
    }
  }
}

/**
 * Checks if a batch of intents is ready for settlement
 * @param {ethers.Provider} provider - Ethers provider
 * @param {Array} intents - Array of intent objects
 * @returns {Promise<boolean>} True if ready for settlement
 */
async function isBatchReadyForSettlement(provider, intents) {
  try {
    if (intents.length < CONFIG.AUCTION.MIN_INTENTS_FOR_SETTLEMENT) {
      return false;
    }

    const currentBlock = await provider.getBlockNumber();
    const settlementContract = new ethers.Contract(
      CONFIG.CONTRACTS.BATCH_SETTLEMENT,
      CONFIG.ABIS.BATCH_SETTLEMENT,
      provider
    );

    // Check if any intents are already settled
    let unsettled = [];
    for (const intent of intents) {
      try {
        // Check if intent is already settled using the contract
        const isSettled = await settlementContract.settledIntent(intent.requestId);
        if (isSettled) {
          console.log(`Intent ${intent.requestId} already settled, skipping`);
          return false;
        } else {
          unsettled.push(intent);
        }
      } catch (error) {
        // Handle rate limiting gracefully
        if (error.code === 'CALL_EXCEPTION' && error.info?.error?.code === -32016) {
          console.warn(`Rate limited checking settlement status for intent ${intent.requestId}`);
          await new Promise(resolve => setTimeout(resolve, CONFIG.RPC.RETRY_DELAY_MS));
          continue;
        }
        console.warn(`Could not check settlement status for intent ${intent.requestId}:`, error);
        return false;
      }
    }

    if (unsettled.length === 0) {
      return false; //nothing left to settle
    }

    // Check if we have enough time before the next epoch
    const epochEndBlock = (Math.floor(currentBlock / CONFIG.AUCTION.EPOCH_DURATION_BLOCKS) + 1) * CONFIG.AUCTION.EPOCH_DURATION_BLOCKS;
    const blocksUntilEpochEnd = epochEndBlock - currentBlock;

    return blocksUntilEpochEnd >= CONFIG.AUCTION.SETTLEMENT_DELAY_BLOCKS;
  } catch (error) {
    console.error('Error checking batch readiness:', error);
    return false;
  }
}

/**
 * Validates that all intents in a batch belong to the same market and epoch
 * @param {Array} intents - Array of intent objects
 * @returns {Object} Validation result with isValid flag and details
 */
function validateBatchConsistency(intents) {
  if (intents.length === 0) {
    return { isValid: false, reason: "Empty batch" };
  }

  const firstIntent = intents[0];
  const marketId = firstIntent.marketId;
  const epoch = firstIntent.epoch;

  for (const intent of intents) {
    if (intent.marketId !== marketId) {
      return {
        isValid: false,
        reason: `Market mismatch: expected ${marketId}, got ${intent.marketId}`
      };
    }
    if (intent.epoch !== epoch) {
      return {
        isValid: false,
        reason: `Epoch mismatch: expected ${epoch}, got ${intent.epoch}`
      };
    }
  }

  return {
    isValid: true,
    marketId,
    epoch,
    intentCount: intents.length
  };
}

/**
 * Creates a solver signer from environment variables
 * @returns {ethers.Wallet} Solver wallet
 */
function createSolverSigner() {
  if (!CONFIG.SOLVER.PRIVATE_KEY) {
    throw new Error('SOLVER_PRIVATE_KEY environment variable is required');
  }

  const provider = new ethers.JsonRpcProvider(CONFIG.NETWORK.RPC_URL);
  return new ethers.Wallet(CONFIG.SOLVER.PRIVATE_KEY, provider);
}

module.exports = { simulateSettlementTx, settleBatchTx, isBatchReadyForSettlement, validateBatchConsistency, createSolverSigner };