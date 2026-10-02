// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {DrandBeacon} from "../../src/DrandBeacon.sol";
import {GhostLockEpochRNG} from "../../src/EpochRNG.sol";

/**
 * @notice Signatures are live drand `evmnet` rounds; the anchor below maps
 *         epoch 1000 -> round 12345678 with 8 drand rounds per epoch.
 */
contract EpochRNGTest is Test {
    DrandBeacon internal beacon;
    GhostLockEpochRNG internal rng;

    uint256 internal constant EPOCH_ANCHOR = 1000;
    uint64 internal constant ROUND_ANCHOR = 12345678;
    uint64 internal constant ROUNDS_PER_EPOCH = 8;

    uint256 internal constant SIG_E1000_X = 0x1f82751a21ca166dcc2c804ddd5846cb5f0f8f4ded7e93a8ec9b34cdc885d99a;
    uint256 internal constant SIG_E1000_Y = 0x26353f2dbf384155cc898695316de8ce942f167a0faf3906ca066ebc7200aa86;

    uint256 internal constant SIG_E1001_X = 0x0b6b890bc60d1f977d05e7e6e45cf57ba038cbfa8cc21aed4b926a9e614d329e;
    uint256 internal constant SIG_E1001_Y = 0x0eb7ee3c14f59171897cd2243f063ec806ddf68e691f4a14a148a5f15d77a3b5;

    uint256 internal constant SIG_E1002_X = 0x0abdec4091e52b111b4961660c76ea93d583f2a184f5302484cfaac2f3bf07de;
    uint256 internal constant SIG_E1002_Y = 0x159faeff5143e07d1e02e0a5e7d2b2e721d615479028e3e13baa15faf770dc56;

    function setUp() public {
        beacon = new DrandBeacon();
        rng = new GhostLockEpochRNG(beacon, EPOCH_ANCHOR, ROUND_ANCHOR, ROUNDS_PER_EPOCH);
        vm.warp(beacon.timeOfRound(ROUND_ANCHOR + 100 * ROUNDS_PER_EPOCH));
    }

    function test_roundForEpoch_followsAnchor() public view {
        assertEq(rng.roundForEpoch(EPOCH_ANCHOR), ROUND_ANCHOR);
        assertEq(rng.roundForEpoch(EPOCH_ANCHOR + 1), ROUND_ANCHOR + ROUNDS_PER_EPOCH);
        assertEq(rng.roundForEpoch(EPOCH_ANCHOR + 2), ROUND_ANCHOR + 2 * ROUNDS_PER_EPOCH);
    }

    function test_roundForEpoch_epoch0_reverts() public {
        vm.expectRevert(GhostLockEpochRNG.EpochReserved.selector);
        rng.roundForEpoch(0);
    }

    function test_roundForEpoch_beforeAnchor_reverts() public {
        vm.expectRevert(
            abi.encodeWithSelector(GhostLockEpochRNG.EpochBeforeAnchor.selector, EPOCH_ANCHOR - 1, EPOCH_ANCHOR)
        );
        rng.roundForEpoch(EPOCH_ANCHOR - 1);
    }

    function test_seedEpochWithSignature_derivesSeedFromBeacon() public {
        bytes32 seed = rng.seedEpochWithSignature(EPOCH_ANCHOR, SIG_E1000_X, SIG_E1000_Y);

        bytes32 randomness = beacon.randomnessOf(ROUND_ANCHOR);
        assertEq(randomness, keccak256(abi.encodePacked(SIG_E1000_X, SIG_E1000_Y)));
        assertEq(seed, keccak256(abi.encodePacked(randomness, EPOCH_ANCHOR)));
        assertEq(rng.epochSeed(EPOCH_ANCHOR), seed);
        assertEq(rng.getEpochSeed(EPOCH_ANCHOR), seed);
    }

    function test_seedEpoch_reusesAlreadyRelayedRound() public {
        beacon.relay(ROUND_ANCHOR, SIG_E1000_X, SIG_E1000_Y);

        bytes32 seed = rng.seedEpoch(EPOCH_ANCHOR);
        assertEq(seed, rng.epochSeed(EPOCH_ANCHOR));
    }

    function test_seedEpoch_revertsWhenRoundNotRelayed() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                DrandBeacon.RoundNotYetDue.selector, ROUND_ANCHOR, beacon.timeOfRound(ROUND_ANCHOR)
            )
        );
        rng.seedEpoch(EPOCH_ANCHOR);
    }

    function test_seedEpoch_rejectsSignatureForAnotherEpoch() public {
        vm.expectRevert(abi.encodeWithSelector(DrandBeacon.InvalidSignature.selector, ROUND_ANCHOR));
        rng.seedEpochWithSignature(EPOCH_ANCHOR, SIG_E1001_X, SIG_E1001_Y);
    }

    function test_doubleSeed_reverts() public {
        rng.seedEpochWithSignature(EPOCH_ANCHOR, SIG_E1000_X, SIG_E1000_Y);

        vm.expectRevert(abi.encodeWithSelector(GhostLockEpochRNG.SeedAlreadyExists.selector, EPOCH_ANCHOR));
        rng.seedEpochWithSignature(EPOCH_ANCHOR, SIG_E1000_X, SIG_E1000_Y);
    }

    function test_concurrent_epochs() public {
        rng.seedEpochWithSignature(EPOCH_ANCHOR + 1, SIG_E1001_X, SIG_E1001_Y);
        rng.seedEpochWithSignature(EPOCH_ANCHOR, SIG_E1000_X, SIG_E1000_Y);
        rng.seedEpochWithSignature(EPOCH_ANCHOR + 2, SIG_E1002_X, SIG_E1002_Y);

        assertTrue(rng.epochSeed(EPOCH_ANCHOR) != bytes32(0));
        assertTrue(rng.epochSeed(EPOCH_ANCHOR + 1) != bytes32(0));
        assertTrue(rng.epochSeed(EPOCH_ANCHOR + 2) != bytes32(0));

        assertTrue(rng.epochSeed(EPOCH_ANCHOR) != rng.epochSeed(EPOCH_ANCHOR + 1));
        assertTrue(rng.epochSeed(EPOCH_ANCHOR + 1) != rng.epochSeed(EPOCH_ANCHOR + 2));
    }

    function test_getEpochSeed_revertsIfUnset() public {
        vm.expectRevert(abi.encodeWithSelector(GhostLockEpochRNG.SeedNotAvailable.selector, uint256(99)));
        rng.getEpochSeed(99);
    }

    function test_seedEpoch_revertsForFutureRound() public {
        uint256 futureEpoch = EPOCH_ANCHOR + 10_000;
        uint64 futureRound = rng.roundForEpoch(futureEpoch);
        vm.expectRevert(
            abi.encodeWithSelector(DrandBeacon.RoundNotYetDue.selector, futureRound, beacon.timeOfRound(futureRound))
        );
        rng.seedEpochWithSignature(futureEpoch, SIG_E1000_X, SIG_E1000_Y);
    }
}
