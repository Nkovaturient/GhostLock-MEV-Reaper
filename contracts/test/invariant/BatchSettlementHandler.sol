// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {GhostLockBatchSettlement} from "../../src/BatchSettlement.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

/// @notice Randomized user + owner actions against GhostLockBatchSettlement for invariant runs.
contract BatchSettlementHandler is Test {
    GhostLockBatchSettlement public settlement;
    MockERC20 public base;
    MockERC20 public quote;
    address public ownerAddr;
    uint8 public marketId;

    address[] internal _actors;

    constructor(
        GhostLockBatchSettlement _settlement,
        MockERC20 _base,
        MockERC20 _quote,
        address _owner,
        uint8 _marketId,
        address[] memory initialActors
    ) {
        settlement = _settlement;
        base = _base;
        quote = _quote;
        ownerAddr = _owner;
        marketId = _marketId;
        for (uint256 i = 0; i < initialActors.length; i++) {
            _actors.push(initialActors[i]);
        }
    }

    function actorCount() external view returns (uint256) {
        return _actors.length;
    }

    function actorAt(uint256 i) external view returns (address) {
        return _actors[i];
    }

    function deposit(uint256 actorSeed, uint256 baseAmt, uint256 quoteAmt) external {
        address a = _actors[actorSeed % _actors.length];
        baseAmt = bound(baseAmt, 0, 500e18);
        quoteAmt = bound(quoteAmt, 0, 500e18);
        if (baseAmt == 0 && quoteAmt == 0) return;

        vm.startPrank(a);
        if (baseAmt > 0) base.approve(address(settlement), type(uint256).max);
        if (quoteAmt > 0) quote.approve(address(settlement), type(uint256).max);
        settlement.deposit(marketId, baseAmt, quoteAmt);
        vm.stopPrank();
    }

    function withdraw(uint256 actorSeed, uint256 baseAmt, uint256 quoteAmt) external {
        address a = _actors[actorSeed % _actors.length];
        (uint256 db, uint256 dq) = settlement.deposits(a, marketId);
        baseAmt = bound(baseAmt, 0, db);
        quoteAmt = bound(quoteAmt, 0, dq);
        if (baseAmt == 0 && quoteAmt == 0) return;

        vm.prank(a);
        settlement.withdraw(marketId, baseAmt, quoteAmt);
    }

    function ownerTuneDustAndCaps(uint256 dust, uint256 capB, uint256 capQ) external {
        dust = bound(dust, 0, settlement.MAX_DUST_TOLERANCE());
        capB = bound(capB, 0, uint256(type(uint128).max));
        capQ = bound(capQ, 0, uint256(type(uint128).max));

        vm.startPrank(ownerAddr);
        settlement.setDustTolerance(dust);
        settlement.setDepositCaps(marketId, capB, capQ);
        vm.stopPrank();
    }
}
