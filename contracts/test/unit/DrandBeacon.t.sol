// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {DrandBeacon} from "../../src/DrandBeacon.sol";

/**
 * @notice Vectors are live drand `evmnet` rounds fetched from
 *         https://api.drand.sh/v2/chains/04f1e9062b8a81f848fded9c12306733282b2727ecced50032187751166ec8c3
 *         Signatures are G1 points serialised as x || y.
 */
contract DrandBeaconTest is Test {
    DrandBeacon internal beacon;

    uint64 internal constant ROUND_1 = 1;
    uint256 internal constant SIG_1_X = 0x11f812d738a36b2210dc88c2d635ad8039588205f42445d6de09e6530165c346;
    uint256 internal constant SIG_1_Y = 0x2a23aca348c84badcf8df5321ac24577b7963d5b0d780bc4626baedb45cde373;

    uint64 internal constant ROUND_MID = 12345678;
    uint256 internal constant SIG_MID_X = 0x1f82751a21ca166dcc2c804ddd5846cb5f0f8f4ded7e93a8ec9b34cdc885d99a;
    uint256 internal constant SIG_MID_Y = 0x26353f2dbf384155cc898695316de8ce942f167a0faf3906ca066ebc7200aa86;

    uint64 internal constant ROUND_HI = 20000000;
    uint256 internal constant SIG_HI_X = 0x1ad7a10ece71f082a5c931983eca674ecb297b22f9396cde3a5015b9d9179541;
    uint256 internal constant SIG_HI_Y = 0x1f11d5de506f74f17645ac04a2fe6b53458a123f66e2fcb1e2ab86cb8c2d5409;

    function setUp() public {
        beacon = new DrandBeacon();
        vm.warp(beacon.timeOfRound(ROUND_HI) + 1);
    }

    function test_verifiesGenesisRound() public view {
        assertTrue(beacon.isValidSignature(ROUND_1, SIG_1_X, SIG_1_Y));
    }

    function test_verifiesMidRound() public view {
        assertTrue(beacon.isValidSignature(ROUND_MID, SIG_MID_X, SIG_MID_Y));
    }

    function test_verifiesHighRound() public view {
        assertTrue(beacon.isValidSignature(ROUND_HI, SIG_HI_X, SIG_HI_Y));
    }

    function test_rejectsSignatureFromAnotherRound() public view {
        assertFalse(beacon.isValidSignature(ROUND_MID, SIG_HI_X, SIG_HI_Y));
    }

    function test_relayStoresRandomness() public {
        bytes32 expected = keccak256(abi.encodePacked(SIG_HI_X, SIG_HI_Y));

        vm.expectEmit(true, false, false, true);
        emit DrandBeacon.BeaconRelayed(ROUND_HI, expected, address(this));
        bytes32 randomness = beacon.relay(ROUND_HI, SIG_HI_X, SIG_HI_Y);

        assertEq(randomness, expected);
        assertEq(beacon.randomnessOf(ROUND_HI), expected);
        assertEq(beacon.getRandomness(ROUND_HI), expected);
    }

    function test_relayIsIdempotent() public {
        bytes32 first = beacon.relay(ROUND_HI, SIG_HI_X, SIG_HI_Y);
        bytes32 second = beacon.relay(ROUND_HI, 0, 0);
        assertEq(first, second);
    }

    function test_relayRejectsForgedSignature() public {
        vm.expectRevert(abi.encodeWithSelector(DrandBeacon.InvalidSignature.selector, ROUND_MID));
        beacon.relay(ROUND_MID, SIG_HI_X, SIG_HI_Y);
    }

    function test_relayRejectsRoundBeforeItIsDue() public {
        uint64 future = beacon.roundAt(uint64(block.timestamp)) + 1000;
        vm.expectRevert(
            abi.encodeWithSelector(DrandBeacon.RoundNotYetDue.selector, future, beacon.timeOfRound(future))
        );
        beacon.relay(future, SIG_HI_X, SIG_HI_Y);
    }

    function test_roundAtIsInverseOfTimeOfRound() public view {
        assertEq(beacon.roundAt(beacon.timeOfRound(ROUND_MID)), ROUND_MID);
        assertEq(beacon.roundAt(beacon.timeOfRound(ROUND_MID) + 2), ROUND_MID);
        assertEq(beacon.roundAt(beacon.timeOfRound(ROUND_MID) + 3), ROUND_MID + 1);
    }

    function testFuzz_rejectsArbitrarySignatures(uint256 x, uint256 y) public view {
        vm.assume(x != SIG_HI_X || y != SIG_HI_Y);
        assertFalse(beacon.isValidSignature(ROUND_HI, x, y));
    }
}
