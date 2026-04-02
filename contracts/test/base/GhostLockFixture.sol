// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {GhostLockBatchSettlement} from "../../src/BatchSettlement.sol";
import {SolverRegistry} from "../../src/SolverRegistry.sol";
import {SolverBoard} from "../../src/SolverBoard.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {MockLiveness} from "../mocks/MockLiveness.sol";
import {MockEpochRng} from "../mocks/MockEpochRng.sol";
import {MockSettlementOracle} from "../mocks/MockSettlementOracle.sol";

abstract contract GhostLockFixture is Test {
    uint8 internal constant MARKET_ID = 1;
    uint256 internal constant EPOCH = 7;

    address internal owner = address(this);
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    MockLiveness internal liveness;
    MockEpochRng internal rng;
    MockSettlementOracle internal settlementOracle;
    MockERC20 internal base;
    MockERC20 internal quote;

    SolverRegistry internal registry;
    GhostLockBatchSettlement internal settlement;
    SolverBoard internal board;

    function setUp() public virtual {
        liveness = new MockLiveness();
        rng = new MockEpochRng();
        settlementOracle = new MockSettlementOracle();
        base = new MockERC20("Base", "B");
        quote = new MockERC20("Quote", "Q");

        registry = new SolverRegistry(owner);
        settlement = new GhostLockBatchSettlement(address(liveness), address(rng), address(settlementOracle), owner);
        board = new SolverBoard(address(registry), address(settlement), owner);

        registry.setAuthorizedCaller(address(board));
        settlement.setSolverBoard(address(board));

        settlement.addMarket(MARKET_ID, base, quote);
        rng.setSeed(EPOCH, keccak256("epoch-seed"));

        base.mint(alice, 1_000_000 ether);
        base.mint(bob, 1_000_000 ether);
        quote.mint(alice, 1_000_000 ether);
        quote.mint(bob, 1_000_000 ether);

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    function encodeIntent(address user, uint8 side, uint256 amount, uint256 limitPrice, uint8 marketId, uint256 epoch)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encode(user, side, amount, limitPrice, marketId, epoch);
    }

    function buildPayload(uint256 requestId, bytes memory plaintext)
        internal
        pure
        returns (GhostLockBatchSettlement.IntentPayload memory)
    {
        return GhostLockBatchSettlement.IntentPayload({requestId: requestId, plaintext: plaintext});
    }

    /// @dev `executeWithRoutes` path (onlySolverBoard) with ABI-encoded routes.
    function settleViaBoard(
        GhostLockBatchSettlement.IntentPayload[] memory payloads,
        uint256 epoch,
        uint8 marketId,
        uint256 clearingPrice
    ) internal {
        vm.prank(address(board));
        settlement.executeWithRoutes(0, abi.encode(payloads, epoch, marketId, clearingPrice));
    }
}
