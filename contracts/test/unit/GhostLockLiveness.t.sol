// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {BLS} from "../../lib/blocklock-solidity/src/libraries/BLS.sol";
import {TypesLib} from "../../lib/blocklock-solidity/src/libraries/TypesLib.sol";
import {GhostLockLiveness} from "../../src/GhostLockLiveness.sol";
import {MockBlocklockSender} from "../mocks/MockBlocklockSender.sol";

contract GhostLockLivenessTest is Test {
    MockBlocklockSender internal blocklock;
    GhostLockLiveness internal liveness;
    address internal treasury = makeAddr("treasury");
    address internal alice = makeAddr("alice");

    TypesLib.Ciphertext internal ct;

    function setUp() public {
        blocklock = new MockBlocklockSender();
        liveness = new GhostLockLiveness(address(blocklock), treasury);
        ct.u = BLS.PointG2({x: [uint256(0), uint256(0)], y: [uint256(0), uint256(0)]});
        ct.v = "";
        ct.w = "";
        vm.deal(alice, 20 ether);
    }

    function test_bondEqualsMsgValueMinusFee() public {
        uint256 fee = blocklock.nativeFee();
        uint256 sent = fee + 0.01 ether;
        vm.startPrank(alice);
        (uint256 rid, uint256 requestPrice) =
            liveness.submitIntentWithBond{value: sent}(200_000, uint32(block.number + 100), hex"", ct);
        vm.stopPrank();
        assertEq(requestPrice, fee);
        (, , , TypesLib.Ciphertext memory cit0, , , , , , , uint256 bond, , ) = liveness.intents(rid);
        assertEq(cit0.v.length, 0);
        assertEq(bond, sent - fee);
        assertEq(bond, 0.01 ether);
    }

    function test_bondTooSmall_reverts() public {
        uint256 fee = blocklock.nativeFee();
        vm.startPrank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(GhostLockLiveness.BondTooSmall.selector, fee + 0.005 ether, fee + 0.01 ether)
        );
        liveness.submitIntentWithBond{value: fee + 0.005 ether}(200_000, uint32(block.number + 100), hex"", ct);
        vm.stopPrank();
    }

    function test_updateConfig_bounds() public {
        vm.expectRevert(bytes("bounty too small"));
        liveness.updateConfig(4, 20, 200, address(0));

        vm.expectRevert(bytes("reveal window too short"));
        liveness.updateConfig(10, 9, 200, address(0));

        vm.expectRevert(bytes("slash window too tight"));
        liveness.updateConfig(10, 10, 59, address(0));
    }

    function test_adminTwoStep() public {
        address newAdm = makeAddr("newAdm");
        liveness.transferAdmin(newAdm);
        vm.prank(newAdm);
        liveness.acceptAdmin();
        assertEq(liveness.admin(), newAdm);
    }

    function test_sweepEth() public {
        vm.deal(address(liveness), 1 ether);
        address recv = makeAddr("recv");
        vm.deal(recv, 0);
        liveness.sweepEth(payable(recv), 0.5 ether);
        assertEq(recv.balance, 0.5 ether);
    }

    function test_receiveBlocklock_refundsBond() public {
        uint256 fee = blocklock.nativeFee();
        uint256 sent = fee + 0.01 ether;
        vm.startPrank(alice);
        (uint256 rid,) = liveness.submitIntentWithBond{value: sent}(200_000, uint32(block.number + 10), hex"", ct);
        vm.stopPrank();

        bytes memory plaintext = abi.encode(alice, uint8(0), uint256(1e18), uint256(1e18), uint8(1), uint256(1));
        vm.roll(block.number + 20);
        vm.prank(address(blocklock));
        liveness.receiveBlocklock(rid, plaintext);

        (, , , TypesLib.Ciphertext memory cit1, , , , bool ready, , , uint256 bond, , ) = liveness.intents(rid);
        assertEq(cit1.v.length, 0);
        assertTrue(ready);
        assertEq(bond, 0);
        assertEq(alice.balance, 20 ether - fee);
    }

    // ─── tlock path ─────────────────────────────────────────────────────────

    function test_tlockSubmit_bondOnly() public {
        uint32 round = 1_000_000;
        bytes memory blob = hex"deadbeef";
        vm.startPrank(alice);
        uint256 rid = liveness.submitTlockIntentWithBond{value: 0.01 ether}(round, blob);
        vm.stopPrank();

        assertGe(rid, liveness.TLOCK_REQUEST_ID_BASE());
        (
            address user,
            ,
            ,
            ,
            bytes memory tlockBlob,
            bool isTlock,
            uint32 unlockRound,
            ,
            ,
            ,
            uint256 bond,
            ,
        ) = liveness.intents(rid);
        assertEq(user, alice);
        assertTrue(isTlock);
        assertEq(unlockRound, round);
        assertEq(tlockBlob, blob);
        assertEq(bond, 0.01 ether);
    }

    function test_tlockBondTooSmall_reverts() public {
        vm.startPrank(alice);
        vm.expectRevert(abi.encodeWithSelector(GhostLockLiveness.BondTooSmall.selector, 0.005 ether, 0.01 ether));
        liveness.submitTlockIntentWithBond{value: 0.005 ether}(1_000_000, hex"aa");
        vm.stopPrank();
    }

    function test_tlockReveal_afterUnlockRound() public {
        uint32 round = 1_000_000;
        vm.startPrank(alice);
        uint256 rid = liveness.submitTlockIntentWithBond{value: 0.01 ether}(round, bytes("ciphertext"));
        vm.stopPrank();

        bytes memory plaintext = abi.encode(alice, uint8(0), uint256(1e18), uint256(1e18), uint8(1), uint256(1));
        uint256 unlockTime = liveness.unlockRoundTime(round);
        vm.warp(unlockTime);

        address revealer = makeAddr("revealer");
        vm.prank(revealer);
        liveness.revealTlockPlaintext(rid, plaintext);

        assertTrue(liveness.isReady(rid));
        assertTrue(liveness.verifyPlaintext(rid, plaintext));
        assertFalse(
            liveness.verifyPlaintext(
                rid, abi.encode(alice, uint8(1), uint256(1e18), uint256(1e18), uint8(1), uint256(1))
            )
        );
        assertEq(alice.balance, 20 ether);
    }

    function test_tlockReveal_tooEarly_reverts() public {
        uint32 round = 1_000_000;
        vm.startPrank(alice);
        uint256 rid = liveness.submitTlockIntentWithBond{value: 0.01 ether}(round, bytes("ciphertext"));
        vm.stopPrank();

        bytes memory plaintext = abi.encode(alice, uint8(0), uint256(1e18), uint256(1e18), uint8(1), uint256(1));
        uint256 unlockTime = liveness.unlockRoundTime(round);
        vm.warp(unlockTime - 1);

        vm.expectRevert(
            abi.encodeWithSelector(
                GhostLockLiveness.RevealTooEarly.selector, rid, unlockTime - 1, unlockTime
            )
        );
        liveness.revealTlockPlaintext(rid, plaintext);
    }

    function test_tlockDoubleReveal_reverts() public {
        uint32 round = 1_000_000;
        vm.startPrank(alice);
        uint256 rid = liveness.submitTlockIntentWithBond{value: 0.01 ether}(round, bytes("ciphertext"));
        vm.stopPrank();

        bytes memory plaintext = abi.encode(alice, uint8(0), uint256(1e18), uint256(1e18), uint8(1), uint256(1));
        vm.warp(liveness.unlockRoundTime(round));
        liveness.revealTlockPlaintext(rid, plaintext);

        vm.expectRevert(abi.encodeWithSelector(GhostLockLiveness.AlreadyReady.selector, rid));
        liveness.revealTlockPlaintext(rid, plaintext);
    }

    function test_tlockForceReveal_reverts() public {
        uint32 round = 1_000_000;
        vm.startPrank(alice);
        uint256 rid = liveness.submitTlockIntentWithBond{value: 0.01 ether}(round, bytes("ciphertext"));
        vm.stopPrank();

        vm.expectRevert(abi.encodeWithSelector(GhostLockLiveness.NotBlocklockIntent.selector, rid));
        liveness.forceReveal(rid, bytes("key"));
    }

    function test_unlockRoundTime() public view {
        assertEq(liveness.unlockRoundTime(1), 1692803367);
        assertEq(liveness.unlockRoundTime(2), 1692803367 + 3);
    }

    function testFuzz_tlockBondMinimum(uint256 sent) public {
        sent = bound(sent, 1, 0.009 ether);
        vm.startPrank(alice);
        vm.expectRevert(abi.encodeWithSelector(GhostLockLiveness.BondTooSmall.selector, sent, 0.01 ether));
        liveness.submitTlockIntentWithBond{value: sent}(1_000_000, hex"aa");
        vm.stopPrank();
    }
}
