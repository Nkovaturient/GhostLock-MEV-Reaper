// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {GhostLockFixture} from "../base/GhostLockFixture.sol";
import {SolverBoard} from "../../src/SolverBoard.sol";

contract SolverBoardTest is GhostLockFixture {
    address solver1 = makeAddr("solver1");
    address solver2 = makeAddr("solver2");
    uint256 constant BATCH = 100;

    function setUp() public override {
        super.setUp();
        vm.deal(solver1, 50 ether);
        vm.deal(solver2, 50 ether);
        vm.prank(solver1);
        registry.registerSolver{value: 1 ether}("u1");
        vm.prank(solver2);
        registry.registerSolver{value: 1 ether}("u2");
    }

    function test_selectWinner_notOwnerNorKeeper_reverts() public {
        board.registerBatchValue(BATCH, 1_000_000e18);
        vm.roll(block.number + 20);
        vm.expectRevert(SolverBoard.NotWinnerSelector.selector);
        vm.prank(alice);
        board.selectWinner(BATCH);
    }

    function test_selectWinner_tooEarly_reverts() public {
        board.registerBatchValue(BATCH, 1_000_000e18);
        vm.roll(block.number + 10);
        vm.expectRevert(abi.encodeWithSelector(SolverBoard.WinnerSelectionTooEarly.selector, BATCH));
        board.selectWinner(BATCH);
    }

    function test_selectWinner_success() public {
        board.registerBatchValue(BATCH, 1_000_000e18);
        uint256 minSurplus = (1_000_000e18 * 50) / 10_000;
        vm.prank(solver1);
        board.submitBid(BATCH, minSurplus + 1, keccak256("r1"));
        vm.roll(block.number + 20);
        board.selectWinner(BATCH);
        SolverBoard.Batch memory bch = board.getBatch(BATCH);
        assertEq(bch.winningSolver, solver1);
        assertEq(bch.winningBid, minSurplus + 1);
    }

    function test_duplicateBid_reverts() public {
        board.registerBatchValue(BATCH, 1_000_000e18);
        uint256 minSurplus = (1_000_000e18 * 50) / 10_000;
        vm.startPrank(solver1);
        board.submitBid(BATCH, minSurplus + 1, keccak256("a"));
        vm.expectRevert(abi.encodeWithSelector(SolverBoard.DuplicateBid.selector, BATCH, solver1));
        board.submitBid(BATCH, minSurplus + 2, keccak256("b"));
        vm.stopPrank();
    }

    function test_submitBid_batchValueNotSet_reverts() public {
        uint256 bid = 999;
        board.registerBatchValue(bid, 0);
        vm.prank(solver1);
        vm.expectRevert(abi.encodeWithSelector(SolverBoard.BatchValueNotSet.selector, bid));
        board.submitBid(bid, 1 ether, keccak256("x"));
    }

    function test_winnerKeeper_canSelect() public {
        address keeper = makeAddr("keeper");
        board.setWinnerKeeper(keeper);
        board.registerBatchValue(BATCH, 1_000_000e18);
        uint256 minSurplus = (1_000_000e18 * 50) / 10_000;
        vm.prank(solver1);
        board.submitBid(BATCH, minSurplus + 1, keccak256("r"));
        vm.roll(block.number + 20);
        vm.prank(keeper);
        board.selectWinner(BATCH);
    }
}
