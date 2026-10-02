// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/console.sol";

import "../src/PriceOracle.sol";
import "../src/SolverRegistry.sol";
import "../src/DrandBeacon.sol";
import "../src/EpochRNG.sol";
import "../src/GhostLockLiveness.sol";
import "../src/BatchSettlement.sol";
import "../src/SolverBoard.sol";

/**
 * @title Deploy
 * @notice Full deployment and wiring of the GhostLock intent-based batch auction system.
 *
 * ─── DEPLOYMENT ORDER ────────────────────────────────────────────────────────
 *  1. PriceOracle          — needed by BatchSettlement for clearing price validation
 *  2. SolverRegistry       — needed by SolverBoard
 *  3. GhostLockEpochRNG    — needed by BatchSettlement for epoch seed checks
 *  4. GhostLockLiveness    — consolidated intent store (replaces GhostLockIntents)
 *  5. GhostLockBatchSettlement — needs all of the above
 *  6. SolverBoard          — needs SolverRegistry + BatchSettlement
 *
 * ─── WIRING AFTER DEPLOYMENT ─────────────────────────────────────────────────
 *  A. solverRegistry.setAuthorizedCaller(address(solverBoard)) — immediate on first set.
 *     Further caller changes are delayed 2 days; use executeAuthorizedCallerChange().
 *  B. batchSettlement.setSolverBoard(address(solverBoard))
 *     So only SolverBoard can call settleBatch / executeWithRoutes.
 *  C. oracle.addPriceFeed(...) for each token pair you intend to trade.
 *  D. batchSettlement.addMarket(...) for each market.
 *
 * ─── USAGE ───────────────────────────────────────────────────────────────────
 *  Dry-run (no broadcast):
 *    forge script script/Deploy.s.sol --fork-url $RPC_URL -vvvv
 *
 *  Live broadcast:
 *    forge script script/Deploy.s.sol \
 *      --fork-url $RPC_URL \
 *      --broadcast \
 *      --verify \
 *      --etherscan-api-key $ETHERSCAN_KEY \
 *      -vvvv
 *
 *  Resume on failure (nonce already incremented):
 *    forge script script/Deploy.s.sol --fork-url $RPC_URL --broadcast --resume -vvvv
 */
contract Deploy is Script {
    // ── deployed addresses (populated during run) ────────────────────────────
    PriceOracle oracle;
    SolverRegistry registry;
    GhostLockEpochRNG epochRng;
    GhostLockLiveness liveness;
    GhostLockBatchSettlement settlement;
    SolverBoard board;
    DrandBeacon beacon;

    function run() external {
        // ── load config ─────────────────────────────────────────────────────
        uint256 deployerPk = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(deployerPk);

        address pyth = vm.envAddress("PYTH_ADDRESS");
        address blocklockSender = vm.envAddress("BLOCKLOCK_SENDER_ARB_SEPOLIA");
        address treasury = vm.envAddress("TREASURY");

        // Epoch/round anchor for the drand-backed EpochRNG.
        uint256 epochAnchor = vm.envUint("DRAND_EPOCH_ANCHOR");
        uint64 roundAnchor = uint64(vm.envUint("DRAND_ROUND_ANCHOR"));
        uint64 roundsPerEpoch = uint64(vm.envUint("DRAND_ROUNDS_PER_EPOCH"));

        address tokenBase = vm.envAddress("TOKEN_BASE");
        address tokenQuote = vm.envAddress("TOKEN_QUOTE");
        uint8 marketId = uint8(vm.envUint("MARKET_ID"));

        address baseChainlink = vm.envAddress("BASE_CHAINLINK");
        bytes32 basePythId = vm.envBytes32("BASE_PYTH_ID");
        address quoteChainlink = vm.envAddress("QUOTE_CHAINLINK");
        bytes32 quotePythId = vm.envBytes32("QUOTE_PYTH_ID");
        uint8 baseDecimals = uint8(vm.envUint("BASE_DECIMALS"));
        uint8 quoteDecimals = uint8(vm.envUint("QUOTE_DECIMALS"));

        // ── pre-flight assertions ────────────────────────────────────────────
        require(deployer.balance >= 0.1 ether, "DEPLOYER: insufficient ETH for gas");
        require(pyth != address(0), "PYTH_ADDRESS not set");
        require(blocklockSender != address(0), "BLOCKLOCK_SENDER not set");
        require(epochAnchor != 0, "DRAND_EPOCH_ANCHOR not set");
        require(roundAnchor != 0, "DRAND_ROUND_ANCHOR not set");
        require(roundsPerEpoch != 0, "DRAND_ROUNDS_PER_EPOCH not set");
        require(tokenBase != address(0), "TOKEN_BASE not set");
        require(tokenQuote != address(0), "TOKEN_QUOTE not set");
        require(tokenBase != tokenQuote, "TOKEN_BASE == TOKEN_QUOTE");

        console.log("=== GhostLock Deploy ===");
        console.log("Deployer:          ", deployer);
        console.log("Treasury:          ", treasury);
        console.log("Chain ID:          ", block.chainid);
        console.log("Block:             ", block.number);

        // ═══════════════════════════════════════════════════════════════════
        vm.startBroadcast(deployerPk);
        // ═══════════════════════════════════════════════════════════════════

        // ── 1. PriceOracle ──────────────────────────────────────────────────
        oracle = new PriceOracle(pyth, deployer);
        console.log("[1] PriceOracle:        ", address(oracle));

        // Register price feeds for both tokens (must be onlyOwner — deployer is owner)
        oracle.addPriceFeed(tokenBase, baseChainlink, basePythId, baseDecimals);
        oracle.addPriceFeed(tokenQuote, quoteChainlink, quotePythId, quoteDecimals);
        console.log("    Feeds registered:   base + quote");

        // ── 2. SolverRegistry ────────────────────────────────────────────────
        registry = new SolverRegistry(deployer);
        console.log("[2] SolverRegistry:     ", address(registry));

        // ── 3. DrandBeacon + EpochRNG ────────────────────────────────────────
        beacon = new DrandBeacon();
        console.log("[3] DrandBeacon:        ", address(beacon));

        epochRng = new GhostLockEpochRNG(beacon, epochAnchor, roundAnchor, roundsPerEpoch);
        console.log("    GhostLockEpochRNG:  ", address(epochRng));
        console.log("    Epoch anchor:       ", epochAnchor);
        console.log("    Round anchor:       ", roundAnchor);

        // ── 4. GhostLockLiveness ─────────────────────────────────────────────
        liveness = new GhostLockLiveness(blocklockSender, treasury);
        console.log("[4] GhostLockLiveness:  ", address(liveness));

        // ── 5. GhostLockBatchSettlement ───────────────────────────────────────
        settlement = new GhostLockBatchSettlement(address(liveness), address(epochRng), address(oracle), deployer);
        console.log("[5] BatchSettlement:    ", address(settlement));

        // Register first market
        settlement.addMarket(marketId, IERC20(tokenBase), IERC20(tokenQuote));
        console.log("    Market registered:  id=", marketId);

        // ── 6. SolverBoard ────────────────────────────────────────────────────
        board = new SolverBoard(address(registry), address(settlement), deployer);
        console.log("[6] SolverBoard:        ", address(board));

        // ─── WIRING ──────────────────────────────────────────────────────────

        // A: registry.authorizedCaller = SolverBoard
        //    Critical: without this, board.executeSettlement() / expireBatch() revert
        //    when they call registry.slashSolver / recordSettlement.
        registry.setAuthorizedCaller(address(board));
        console.log("[W-A] Registry.authorizedCaller => SolverBoard");

        // B: settlement.solverBoard = SolverBoard
        //    Critical: without this, no one can call settleBatch.
        settlement.setSolverBoard(address(board));
        console.log("[W-B] Settlement.solverBoard    => SolverBoard");

        // ═══════════════════════════════════════════════════════════════════
        vm.stopBroadcast();
        // ═══════════════════════════════════════════════════════════════════

        // ── print deployment summary ─────────────────────────────────────────
        _printSummary();

        // ── run post-deploy assertions ───────────────────────────────────────
        _assertWiring(tokenBase, tokenQuote, marketId);
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    function _printSummary() internal view {
        console.log("\n======= DEPLOYMENT SUMMARY =======");
        console.log("PriceOracle:         ", address(oracle));
        console.log("SolverRegistry:      ", address(registry));
        console.log("GhostLockEpochRNG:   ", address(epochRng));
        console.log("GhostLockLiveness:   ", address(liveness));
        console.log("BatchSettlement:     ", address(settlement));
        console.log("SolverBoard:         ", address(board));
        console.log("==================================\n");
        console.log("Next steps:");
        console.log("  1. Transfer PriceOracle ownership to multisig if desired");
        console.log("     oracle.transferOwnership(MULTISIG)");
        console.log("  2. Transfer SolverRegistry ownership to multisig");
        console.log("     registry.transferOwnership(MULTISIG)");
        console.log("  3. Transfer BatchSettlement ownership to multisig");
        console.log("     settlement.transferOwnership(MULTISIG)");
        console.log("  4. Transfer SolverBoard ownership to multisig");
        console.log("     board.transferOwnership(MULTISIG)");
        console.log("  5. Fund GhostLockLiveness with ETH for blocklock subscriptions");
        console.log("  6. Fund GhostLockEpochRNG with ETH for randomness subscriptions");
        console.log("  7. Verify contracts on Etherscan / Arbiscan");
    }

    function _assertWiring(address tokenBase, address tokenQuote, uint8 marketId) internal view {
        // Registry wiring
        require(registry.authorizedCaller() == address(board), "ASSERT FAIL: registry.authorizedCaller != board");

        // Settlement wiring
        require(settlement.solverBoard() == address(board), "ASSERT FAIL: settlement.solverBoard != board");

        // Market registered
        (IERC20 base, IERC20 quote, bool exists) = settlement.markets(marketId);
        require(exists, "ASSERT FAIL: market not registered");
        require(address(base) == tokenBase, "ASSERT FAIL: base token mismatch");
        require(address(quote) == tokenQuote, "ASSERT FAIL: quote token mismatch");

        // Oracle feeds registered (non-zero pythPriceId)
        // (We can't easily check Chainlink feed without calling latestRoundData on a live node)
        require(oracle.pythPriceIds(tokenBase) != bytes32(0), "ASSERT FAIL: base pyth feed not set");
        require(oracle.pythPriceIds(tokenQuote) != bytes32(0), "ASSERT FAIL: quote pyth feed not set");

        console.log("[OK] All post-deploy assertions passed.");
    }
}
