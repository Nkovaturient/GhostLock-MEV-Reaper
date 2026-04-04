// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {GhostLockFixture} from "../base/GhostLockFixture.sol";
import {BatchSettlementHandler} from "./BatchSettlementHandler.sol";

contract BatchSettlementInvariant is GhostLockFixture {
    BatchSettlementHandler internal handler;
    address internal carol = makeAddr("carol");

    function setUp() public override {
        super.setUp();
        base.mint(carol, 1_000_000 ether);
        quote.mint(carol, 1_000_000 ether);
        vm.deal(carol, 100 ether);

        address[] memory actors = new address[](3);
        actors[0] = alice;
        actors[1] = bob;
        actors[2] = carol;

        handler = new BatchSettlementHandler(settlement, base, quote, owner, MARKET_ID, actors);
        targetContract(address(handler));
    }

    function invariant_depositsNeverExceedTokenBalances() public view {
        uint256 sumBase;
        uint256 sumQuote;
        uint256 n = handler.actorCount();
        for (uint256 i = 0; i < n; i++) {
            address a = handler.actorAt(i);
            (uint256 db, uint256 dq) = settlement.deposits(a, MARKET_ID);
            sumBase += db;
            sumQuote += dq;
        }
        assertLe(sumBase, base.balanceOf(address(settlement)));
        assertLe(sumQuote, quote.balanceOf(address(settlement)));
    }

    function invariant_dustToleranceWithinMax() public view {
        assertLe(settlement.dustTolerance(), settlement.MAX_DUST_TOLERANCE());
    }
}
