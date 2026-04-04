// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {GhostLockFixture} from "../base/GhostLockFixture.sol";
import {GhostLockBatchSettlement} from "../../src/BatchSettlement.sol";
import {SolverBoard} from "../../src/SolverBoard.sol";

/// @notice Full SolverBoard flow: registerBatchValue → bid → selectWinner → executeSettlement.
contract EndToEndTest is GhostLockFixture {
    address internal solver1 = makeAddr("solver1");
    uint256 internal constant BATCH = 4242;

    receive() external payable {}

    function setUp() public override {
        super.setUp();
        vm.deal(solver1, 50 ether);
        vm.prank(solver1);
        registry.registerSolver{value: 1 ether}("e2e-solver");
    }

    function test_e2e_registerBidSelectExecute_success() public {
        _prepMatchedIntents();

        GhostLockBatchSettlement.IntentPayload[] memory payloads = _payloads();
        bytes memory routes = abi.encode(payloads, EPOCH, MARKET_ID, uint256(2e18));
        bytes32 routeHash = keccak256(routes);

        board.registerBatchValue(BATCH, 1_000_000e18);
        uint256 publishedAt = board.getBatch(BATCH).finalizedBlock;

        uint256 minSurplus = (1_000_000e18 * 50) / 10_000;
        if (minSurplus == 0) minSurplus = 1;

        vm.prank(solver1);
        board.submitBid(BATCH, minSurplus + 1, routeHash);

        vm.roll(publishedAt + 13);
        board.selectWinner(BATCH);

        SolverBoard.Batch memory bch = board.getBatch(BATCH);
        assertEq(bch.winningSolver, solver1);
        assertFalse(bch.settled);

        vm.roll(publishedAt + 14);
        uint256 bondBefore = registry.getSolver(solver1).bondAmount;

        vm.prank(solver1);
        board.executeSettlement(BATCH, routes);

        bch = board.getBatch(BATCH);
        assertTrue(bch.settled);

        assertEq(registry.getSolver(solver1).totalSettled, 1);
        assertEq(registry.getSolver(solver1).bondAmount, bondBefore);

        assertTrue(settlement.settledIntent(1));
        assertTrue(settlement.settledIntent(2));
    }

    function test_e2e_executeSettlement_failure_slash() public {
        _prepMatchedIntents();

        GhostLockBatchSettlement.IntentPayload[] memory payloads = _payloads();
        bytes memory routes = abi.encode(payloads, EPOCH, MARKET_ID, uint256(2e18));
        bytes32 routeHash = keccak256(routes);

        board.registerBatchValue(BATCH, 1_000_000e18);
        uint256 publishedAt = board.getBatch(BATCH).finalizedBlock;

        uint256 minSurplus = (1_000_000e18 * 50) / 10_000;
        if (minSurplus == 0) minSurplus = 1;

        vm.prank(solver1);
        board.submitBid(BATCH, minSurplus + 1, routeHash);

        vm.roll(publishedAt + 13);
        board.selectWinner(BATCH);

        settlementOracle.setShouldPass(false);

        uint256 bondBefore = registry.getSolver(solver1).bondAmount;

        vm.roll(publishedAt + 14);
        vm.prank(solver1);
        board.executeSettlement(BATCH, routes);

        assertFalse(board.getBatch(BATCH).settled);

        (,,,, bool executed, bool slashed) = board.bids(BATCH, solver1);
        assertTrue(slashed);
        assertFalse(executed);

        uint256 expectedBond = bondBefore > board.slashAmountFailure() ? bondBefore - board.slashAmountFailure() : 0;
        assertEq(registry.getSolver(solver1).bondAmount, expectedBond);
        assertEq(registry.getSolver(solver1).failureCount, 1);
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
