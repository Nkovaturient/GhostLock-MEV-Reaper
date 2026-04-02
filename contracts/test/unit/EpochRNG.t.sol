// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {GhostLockEpochRNG} from "../../src/EpochRNG.sol";
import {MockRandomnessSender} from "../mocks/MockRandomnessSender.sol";

contract EpochRNGTest is Test {
    MockRandomnessSender sender;
    GhostLockEpochRNG rng;

    function setUp() public {
        sender = new MockRandomnessSender();
        rng = new GhostLockEpochRNG(address(sender), address(this));
        vm.deal(address(this), 10 ether);
    }

    function test_requestEpochSeed_epoch0_reverts() public {
        vm.expectRevert(bytes("epoch 0 reserved"));
        rng.requestEpochSeed{value: 0.1 ether}(0, 500_000);
    }

    function test_doubleSeed_reverts() public {
        (uint256 rid,) = rng.requestEpochSeed{value: 0.1 ether}(1, 500_000);
        bytes32 s = keccak256("seed");
        sender.fulfill(address(rng), rid, s);
        vm.expectRevert(abi.encodeWithSelector(GhostLockEpochRNG.SeedAlreadyExists.selector, uint256(1)));
        rng.requestEpochSeed{value: 0.1 ether}(1, 500_000);
    }

    function test_concurrent_epochs() public {
        (uint256 r1,) = rng.requestEpochSeed{value: 0.1 ether}(3, 500_000);
        (uint256 r2,) = rng.requestEpochSeed{value: 0.1 ether}(4, 500_000);
        sender.fulfill(address(rng), r1, keccak256("a"));
        sender.fulfill(address(rng), r2, keccak256("b"));
        assertEq(rng.epochSeed(3), keccak256("a"));
        assertEq(rng.epochSeed(4), keccak256("b"));
    }

    function test_getEpochSeed_revertsIfUnset() public {
        vm.expectRevert(abi.encodeWithSelector(GhostLockEpochRNG.SeedNotAvailable.selector, uint256(99)));
        rng.getEpochSeed(99);
    }
}
