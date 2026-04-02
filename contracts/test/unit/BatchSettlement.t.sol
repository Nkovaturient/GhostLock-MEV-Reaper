// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {GhostLockFixture} from "../base/GhostLockFixture.sol";
import {GhostLockBatchSettlement} from "../../src/BatchSettlement.sol";

contract BatchSettlementTest is GhostLockFixture {
    function test_setDustToleranceAboveMaxReverts() public {
        vm.expectRevert(bytes("dust tolerance too high"));
        settlement.setDustTolerance(1e6 + 1);
    }

    function test_setDustToleranceAtMaxOk() public {
        settlement.setDustTolerance(1e6);
        assertEq(settlement.dustTolerance(), 1e6);
    }

    function test_settle_notSolverBoard_reverts() public {
        GhostLockBatchSettlement.IntentPayload[] memory p = new GhostLockBatchSettlement.IntentPayload[](1);
        vm.expectRevert(GhostLockBatchSettlement.NotSolverBoard.selector);
        settlement.settleBatch(p, EPOCH, MARKET_ID, 1e18);
    }

    function test_MAX_BATCH_SIZE_reverts() public {
        GhostLockBatchSettlement.IntentPayload[] memory p = new GhostLockBatchSettlement.IntentPayload[](201);
        vm.prank(address(board));
        vm.expectRevert(bytes("batch too large"));
        settlement.settleBatch(p, EPOCH, MARKET_ID, 1e18);
    }

    function test_NoEpochSeed_reverts() public {
        rng.setSeed(EPOCH, bytes32(0));
        GhostLockBatchSettlement.IntentPayload[] memory p = new GhostLockBatchSettlement.IntentPayload[](1);
        p[0] = buildPayload(1, encodeIntent(alice, 0, 1e18, 5e18, MARKET_ID, EPOCH));
        vm.prank(address(board));
        vm.expectRevert(abi.encodeWithSelector(GhostLockBatchSettlement.NoEpochSeed.selector, EPOCH));
        settlement.executeWithRoutes(0, abi.encode(p, EPOCH, MARKET_ID, uint256(1e18)));
    }

    function test_oracleReject_reverts() public {
        settlementOracle.setShouldPass(false);
        _prepMatchedIntents();
        GhostLockBatchSettlement.IntentPayload[] memory p = _payloads();
        vm.expectRevert(bytes("oracle reject"));
        settleViaBoard(p, EPOCH, MARKET_ID, 2e18);
    }

    function test_matchedSettle_succeeds() public {
        _prepMatchedIntents();
        GhostLockBatchSettlement.IntentPayload[] memory p = _payloads();

        (uint256 aliceBaseBefore, uint256 aliceQuoteBefore) = settlement.deposits(alice, MARKET_ID);
        (uint256 bobBaseBefore, uint256 bobQuoteBefore) = settlement.deposits(bob, MARKET_ID);

        settleViaBoard(p, EPOCH, MARKET_ID, 2e18);

        assertTrue(settlement.settledIntent(1));
        assertTrue(settlement.settledIntent(2));
        (uint256 ab, uint256 aq) = settlement.deposits(alice, MARKET_ID);
        (uint256 bb, uint256 bq) = settlement.deposits(bob, MARKET_ID);
        assertGt(ab, aliceBaseBefore);
        assertLt(aq, aliceQuoteBefore);
        assertLt(bb, bobBaseBefore);
        assertGt(bq, bobQuoteBefore);
    }

    function test_depositCap_reverts() public {
        settlement.setDepositCaps(MARKET_ID, 1 ether, 1 ether);
        vm.startPrank(alice);
        base.approve(address(settlement), type(uint256).max);
        quote.approve(address(settlement), type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(GhostLockBatchSettlement.DepositCapExceeded.selector, alice, MARKET_ID));
        settlement.deposit(MARKET_ID, 2 ether, 0);
        vm.stopPrank();
    }

    function test_fuzz_dustToleranceBound(uint256 tol) public {
        tol = bound(tol, 0, settlement.MAX_DUST_TOLERANCE());
        settlement.setDustTolerance(tol);
        assertEq(settlement.dustTolerance(), tol);
    }

    function _prepMatchedIntents() internal {
        vm.startPrank(alice);
        quote.approve(address(settlement), type(uint256).max);
        settlement.deposit(MARKET_ID, 0, 500e18);
        vm.stopPrank();
        vm.startPrank(bob);
        base.approve(address(settlement), type(uint256).max);
        settlement.deposit(MARKET_ID, 200e18, 0);
        vm.stopPrank();

        bytes memory pa = encodeIntent(alice, 0, 100e18, 3e18, MARKET_ID, EPOCH);
        bytes memory pb = encodeIntent(bob, 1, 100e18, 1e18, MARKET_ID, EPOCH);
        liveness.setIntent(1, true, keccak256(pa));
        liveness.setIntent(2, true, keccak256(pb));
    }

    function _payloads() internal view returns (GhostLockBatchSettlement.IntentPayload[] memory p) {
        p = new GhostLockBatchSettlement.IntentPayload[](2);
        p[0] = buildPayload(1, encodeIntent(alice, 0, 100e18, 3e18, MARKET_ID, EPOCH));
        p[1] = buildPayload(2, encodeIntent(bob, 1, 100e18, 1e18, MARKET_ID, EPOCH));
    }
}
