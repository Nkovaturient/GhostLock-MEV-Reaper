// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {BLS} from "../lib/blocklock-solidity/src/libraries/BLS.sol";

/**
 * @title DrandBeacon
 * @notice Permissionless randomness beacon backed by the drand `evmnet` network
 *         (scheme `bls-bn254-unchained-on-g1`, chain hash
 *         0x04f1e9062b8a81f848fded9c12306733282b2727ecced50032187751166ec8c3).
 *
 * @dev    Replaces the dcipher RandomnessSender callback model. Rather than waiting for a
 *         privileged agent to push randomness, any account may relay a drand round; the
 *         contract verifies the threshold BLS signature itself through the BN254 pairing
 *         precompile. There is therefore no operator whose downtime can stall the protocol.
 *
 *         Verification, matching drand's unchained-on-G1 scheme:
 *           message  = keccak256(abi.encodePacked(uint64(round)))
 *           H(m)     = hashToG1(DST, message)
 *           accepted <=> e(sig, G2) == e(H(m), publicKey)
 *
 *         Signatures live in G1 (64 bytes, x || y); the group public key lives in G2.
 *         drand serialises G2 as x.c1 || x.c0 || y.c1 || y.c0, which is the reverse limb
 *         order of BLS.g2Unmarshal, so the key is laid out explicitly below.
 */
contract DrandBeacon {
    /// @notice Domain separation tag of the drand `evmnet` scheme.
    bytes public constant DST = "BLS_SIG_BN254G1_XMD:KECCAK-256_SVDW_RO_NUL_";

    /// @notice Unix timestamp of drand `evmnet` round 1.
    uint64 public constant GENESIS_TIME = 1727521075;

    /// @notice Seconds between drand `evmnet` rounds.
    uint64 public constant PERIOD = 3;

    // Group public key of drand `evmnet`, in ecPairing limb order.
    uint256 private constant PK_X_C1 = 0x07e1d1d335df83fa98462005690372c643340060d205306a9aa8106b6bd0b382;
    uint256 private constant PK_X_C0 = 0x0557ec32c2ad488e4d4f6008f89a346f18492092ccc0d594610de2732c8b808f;
    uint256 private constant PK_Y_C1 = 0x0095685ae3a85ba243747b1b2f426049010f6b73a0cf1d389351d5aaaa1047f6;
    uint256 private constant PK_Y_C0 = 0x297d3a4f9749b33eb2d904c9d9ebf17224150ddd7abd7567a9bec6c74480ee0b;

    /// @notice Randomness of a verified round, or bytes32(0) if not yet relayed.
    mapping(uint64 => bytes32) public randomnessOf;

    event BeaconRelayed(uint64 indexed round, bytes32 randomness, address relayer);

    error RoundZero();
    error RoundNotYetDue(uint64 round, uint64 dueAt);
    error InvalidSignature(uint64 round);
    error PairingCallFailed();

    /**
     * @notice Relay a drand round. Idempotent: re-relaying a stored round is a no-op.
     * @param  round Drand round number.
     * @param  sigX  X coordinate of the G1 signature.
     * @param  sigY  Y coordinate of the G1 signature.
     */
    function relay(uint64 round, uint256 sigX, uint256 sigY) external returns (bytes32 randomness) {
        randomness = randomnessOf[round];
        if (randomness != bytes32(0)) return randomness;

        if (round == 0) revert RoundZero();

        uint64 dueAt = timeOfRound(round);
        if (block.timestamp < dueAt) revert RoundNotYetDue(round, dueAt);

        (bool valid, bool called) = _verify(round, sigX, sigY);
        if (!called) revert PairingCallFailed();
        if (!valid) revert InvalidSignature(round);

        randomness = keccak256(abi.encodePacked(sigX, sigY));
        randomnessOf[round] = randomness;

        emit BeaconRelayed(round, randomness, msg.sender);
    }

    /// @notice Check a drand signature without storing it.
    function isValidSignature(uint64 round, uint256 sigX, uint256 sigY) external view returns (bool) {
        (bool valid, bool called) = _verify(round, sigX, sigY);
        return valid && called;
    }

    /// @notice Randomness of a relayed round, reverting when it has not been relayed yet.
    function getRandomness(uint64 round) external view returns (bytes32 randomness) {
        randomness = randomnessOf[round];
        if (randomness == bytes32(0)) revert RoundNotYetDue(round, timeOfRound(round));
    }

    /// @notice Timestamp at which `round` is emitted by the drand network.
    function timeOfRound(uint64 round) public pure returns (uint64) {
        if (round == 0) revert RoundZero();
        return GENESIS_TIME + (round - 1) * PERIOD;
    }

    /// @notice Latest round emitted at or before `timestamp`.
    function roundAt(uint64 timestamp) public pure returns (uint64) {
        if (timestamp < GENESIS_TIME) return 1;
        return (timestamp - GENESIS_TIME) / PERIOD + 1;
    }

    /// @notice The message drand signs for `round`.
    function messageOf(uint64 round) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(round));
    }

    function _verify(uint64 round, uint256 sigX, uint256 sigY)
        private
        view
        returns (bool pairingSuccess, bool callSuccess)
    {
        BLS.PointG1 memory message = BLS.hashToPoint(DST, abi.encodePacked(messageOf(round)));
        BLS.PointG1 memory signature = BLS.PointG1({x: sigX, y: sigY});
        BLS.PointG2 memory publicKey = BLS.PointG2({x: [PK_X_C0, PK_X_C1], y: [PK_Y_C0, PK_Y_C1]});
        return BLS.verifySingle(signature, publicKey, message);
    }
}
