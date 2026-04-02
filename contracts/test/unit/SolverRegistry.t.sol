// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {SolverRegistry} from "../../src/SolverRegistry.sol";

contract SolverRegistryTest is Test {
    receive() external payable {}

    address owner = address(this);
    address board = makeAddr("board");
    address solver = makeAddr("solver");

    SolverRegistry registry;

    function setUp() public {
        registry = new SolverRegistry(owner);
        registry.setAuthorizedCaller(board);
        vm.deal(solver, 100 ether);
    }

    function test_register_belowMinBond_reverts() public {
        vm.startPrank(solver);
        vm.expectRevert(abi.encodeWithSelector(SolverRegistry.InsufficientBond.selector, 0.5 ether, 1 ether));
        registry.registerSolver{value: 0.5 ether}("url");
        vm.stopPrank();
    }

    function test_slashSolver_nonAuthorized_reverts() public {
        vm.prank(solver);
        registry.registerSolver{value: 1 ether}("url");
        vm.expectRevert(SolverRegistry.Unauthorized.selector);
        registry.slashSolver(solver, 0.1 ether, "x");
    }

    function test_slashSolver_authorized() public {
        vm.prank(solver);
        registry.registerSolver{value: 2 ether}("url");
        uint256 ownerBalBefore = owner.balance;
        vm.prank(board);
        registry.slashSolver(solver, 0.5 ether, "bad");
        assertEq(registry.getSolver(solver).bondAmount, 1.5 ether);
        assertEq(owner.balance, ownerBalBefore + 0.5 ether);
    }

    function test_timelock_secondCallerChange() public {
        registry.setAuthorizedCaller(board);
        address board2 = makeAddr("board2");
        registry.setAuthorizedCaller(board2);
        assertEq(registry.authorizedCaller(), board);
        vm.expectRevert(bytes("timelock active"));
        registry.executeAuthorizedCallerChange();
        vm.warp(block.timestamp + 2 days);
        registry.executeAuthorizedCallerChange();
        assertEq(registry.authorizedCaller(), board2);
    }

    function test_getSlashHistory_pagination() public {
        vm.prank(solver);
        registry.registerSolver{value: 5 ether}("url");
        vm.startPrank(board);
        registry.slashSolver(solver, 1, "a");
        registry.slashSolver(solver, 1, "b");
        registry.slashSolver(solver, 1, "c");
        vm.stopPrank();
        SolverRegistry.SlashEvent[] memory p0 = registry.getSlashHistory(0, 2);
        assertEq(p0.length, 2);
        assertEq(p0[0].reason, "a");
        SolverRegistry.SlashEvent[] memory p1 = registry.getSlashHistory(2, 10);
        assertEq(p1.length, 1);
        assertEq(p1[0].reason, "c");
    }

    function test_reputationGate_deactivates() public {
        vm.prank(solver);
        registry.registerSolver{value: 5 ether}("url");
        vm.startPrank(board);
        for (uint256 i = 0; i < 10; i++) {
            registry.recordSettlement(solver, false);
        }
        vm.stopPrank();
        assertFalse(registry.isEligibleSolver(solver));
    }
}
