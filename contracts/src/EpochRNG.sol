// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {RandomnessReceiverBase} from "../lib/randomness-solidity/src/RandomnessReceiverBase.sol";

/**
 * @title GhostLockEpochRNG
 * @notice Per-epoch randomness from randamu's dcipher network.
 *         Seed used for deterministic, fair intent ordering within a batch epoch.
 *
 * @dev Epoch 0 is reserved as a sentinel and cannot be seeded (`requestEpochSeed` reverts).
 *
 * Security fix:
 *   [1] Original used a single (lastRequestId, lastEpoch) pair. Any second concurrent
 *       epoch request would silently overwrite lastEpoch, causing onRandomnessReceived
 *       to store the seed under the *wrong* epoch and reject the first callback with
 *       "Request ID mismatch". This is a silent data-loss bug.
 *
 *       Fix: replace globals with mapping(requestId => epoch) so any number of
 *       in-flight requests resolve correctly and independently.
 *
 *   [2] Added onlyOwner guard on requestEpochSeed so a random actor cannot burn
 *       contract balance requesting seeds for arbitrary epochs.
 *
 *   [3] Added getEpochSeed() view with explicit revert when seed not yet available,
 *       so callers get a clear error rather than silently receiving bytes32(0).
 */
contract GhostLockEpochRNG is RandomnessReceiverBase {
    // epoch  => randomness seed (bytes32(0) means not yet received)
    mapping(uint256 => bytes32) public epochSeed;

    // FIX [1]: bidirectional mappings — one per in-flight request
    mapping(uint256 => uint256) public requestIdToEpoch; // requestId => epoch
    mapping(uint256 => uint256) public epochToRequestId; // epoch => requestId (for de-dup)

    event EpochRequested(uint256 indexed epoch, uint256 indexed requestId);
    event EpochSeedReceived(uint256 indexed epoch, bytes32 seed);

    error SeedAlreadyExists(uint256 epoch);
    error RequestAlreadyPending(uint256 epoch);
    error SeedNotAvailable(uint256 epoch);

    constructor(address randomnessSender, address owner_) RandomnessReceiverBase(randomnessSender, owner_) {}

    /**
     * @notice Request randomness for a given epoch.
     * @dev    Callable only by owner (FIX [2]) to prevent balance drain.
     *         Idempotent w.r.t. already-seeded epochs; reverts if a request is
     *         in-flight for this epoch (avoids double-spend on fees).
     */
    function requestEpochSeed(uint256 epoch, uint32 callbackGasLimit)
        external
        payable
        onlyOwner
        returns (uint256 requestId, uint256 requestPrice)
    {
        require(epoch != 0, "epoch 0 reserved");
        if (epochSeed[epoch] != bytes32(0)) revert SeedAlreadyExists(epoch);
        if (epochToRequestId[epoch] != 0) revert RequestAlreadyPending(epoch);

        (requestId, requestPrice) = _requestRandomnessPayInNative(callbackGasLimit);

        // FIX [1]: store mapping both ways so callback can look up epoch by requestId
        requestIdToEpoch[requestId] = epoch;
        epochToRequestId[epoch] = requestId;

        emit EpochRequested(epoch, requestId);
    }

    /**
     * @notice Callback from randamu network.
     * @dev    FIX [1]: resolves epoch from requestId mapping — safe for concurrent requests.
     */
    function onRandomnessReceived(uint256 requestId, bytes32 randomness) internal override {
        uint256 epoch = requestIdToEpoch[requestId];
        require(epoch != 0, "unknown requestId"); // epoch 0 reserved as sentinel
        require(epochSeed[epoch] == bytes32(0), "seed already set");

        epochSeed[epoch] = randomness;
        emit EpochSeedReceived(epoch, randomness);
    }

    /**
     * @notice Get seed with explicit revert when not yet available. FIX [3].
     */
    function getEpochSeed(uint256 epoch) external view returns (bytes32 seed) {
        seed = epochSeed[epoch];
        if (seed == bytes32(0)) revert SeedNotAvailable(epoch);
    }
}
