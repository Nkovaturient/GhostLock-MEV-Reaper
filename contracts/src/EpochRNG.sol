// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {DrandBeacon} from "./DrandBeacon.sol";

/**
 * @title GhostLockEpochRNG
 * @notice Per-epoch randomness used for deterministic, fair intent ordering within a batch.
 *         Seeds are derived from the drand `evmnet` beacon and verified on-chain by
 *         {DrandBeacon}, so there is no privileged fulfiller and no request fee.
 *
 * @dev Epoch 0 is reserved as a sentinel and cannot be seeded.
 *
 * Properties carried over from the dcipher-backed version:
 *   [1] Concurrent epochs resolve independently — each epoch maps to its own drand round,
 *       so there is no shared in-flight request state to corrupt.
 *   [2] Seeding is permissionless. The previous onlyOwner guard existed to stop an attacker
 *       draining the contract's fee balance; drand relaying costs the caller nothing but gas,
 *       so anyone may seed and no balance can be drained.
 *   [3] getEpochSeed() still reverts explicitly when a seed is unavailable rather than
 *       silently returning bytes32(0).
 *
 * Epoch/round binding:
 *   Epochs are block-denominated (`epoch = block / EPOCH_DURATION_BLOCKS`) while drand is
 *   time-denominated. The two are bound by an immutable linear anchor fixed at deployment:
 *
 *       roundForEpoch(epoch) = roundAnchor + (epoch - epochAnchor) * roundsPerEpoch
 *
 *   The mapping is immutable and public so clients, solvers and the contract agree on
 *   exactly one admissible round per epoch. An attacker cannot shop for a favourable round,
 *   and {DrandBeacon} will not accept a round before the network has emitted it, so an
 *   epoch's seed cannot exist ahead of its scheduled wall-clock time.
 */
contract GhostLockEpochRNG {
    /// @notice Beacon that verifies drand signatures on-chain.
    DrandBeacon public immutable beacon;

    /// @notice First epoch covered by the anchor.
    uint256 public immutable epochAnchor;

    /// @notice Drand round that seeds `epochAnchor`.
    uint64 public immutable roundAnchor;

    /// @notice Drand rounds elapsed per GhostLock epoch.
    uint64 public immutable roundsPerEpoch;

    // epoch => randomness seed (bytes32(0) means not yet seeded)
    mapping(uint256 => bytes32) public epochSeed;

    event EpochSeedReceived(uint256 indexed epoch, bytes32 seed);

    error SeedAlreadyExists(uint256 epoch);
    error SeedNotAvailable(uint256 epoch);
    error EpochReserved();
    error EpochBeforeAnchor(uint256 epoch, uint256 anchor);
    error InvalidAnchor();

    constructor(DrandBeacon beacon_, uint256 epochAnchor_, uint64 roundAnchor_, uint64 roundsPerEpoch_) {
        if (address(beacon_) == address(0) || epochAnchor_ == 0 || roundAnchor_ == 0 || roundsPerEpoch_ == 0) {
            revert InvalidAnchor();
        }
        beacon = beacon_;
        epochAnchor = epochAnchor_;
        roundAnchor = roundAnchor_;
        roundsPerEpoch = roundsPerEpoch_;
    }

    /**
     * @notice The single drand round admissible as the seed source for `epoch`.
     */
    function roundForEpoch(uint256 epoch) public view returns (uint64) {
        if (epoch == 0) revert EpochReserved();
        if (epoch < epochAnchor) revert EpochBeforeAnchor(epoch, epochAnchor);
        return roundAnchor + uint64(epoch - epochAnchor) * roundsPerEpoch;
    }

    /**
     * @notice Seed an epoch from an already-relayed drand round.
     * @dev    Use when the round is present in the beacon; otherwise call {seedEpochWithSignature}.
     */
    function seedEpoch(uint256 epoch) public returns (bytes32 seed) {
        if (epochSeed[epoch] != bytes32(0)) revert SeedAlreadyExists(epoch);

        uint64 round = roundForEpoch(epoch);
        bytes32 randomness = beacon.getRandomness(round);

        seed = keccak256(abi.encodePacked(randomness, epoch));
        epochSeed[epoch] = seed;

        emit EpochSeedReceived(epoch, seed);
    }

    /**
     * @notice Relay the epoch's drand round and seed the epoch in one call.
     * @param  sigX X coordinate of the G1 drand signature for {roundForEpoch}(epoch).
     * @param  sigY Y coordinate of the G1 drand signature.
     */
    function seedEpochWithSignature(uint256 epoch, uint256 sigX, uint256 sigY) external returns (bytes32 seed) {
        if (epochSeed[epoch] != bytes32(0)) revert SeedAlreadyExists(epoch);

        beacon.relay(roundForEpoch(epoch), sigX, sigY);
        return seedEpoch(epoch);
    }

    /**
     * @notice Get seed with explicit revert when not yet available.
     */
    function getEpochSeed(uint256 epoch) external view returns (bytes32 seed) {
        seed = epochSeed[epoch];
        if (seed == bytes32(0)) revert SeedNotAvailable(epoch);
    }
}
