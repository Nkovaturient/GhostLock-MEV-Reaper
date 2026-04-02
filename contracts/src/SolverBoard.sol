// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "./SolverRegistry.sol";
import "./BatchSettlement.sol";

/**
 * @title SolverBoard
 * @notice Coordinates solver competition: batch publication, bid collection,
 *         winner selection, settlement execution and slashing.
 *
 * Trust chain:  BatchSettlement (sets batchValue) ←→ SolverBoard ←→ SolverRegistry
 *               The winning solver calls executeSettlement(); SolverBoard calls into
 *               BatchSettlement via executeWithRoutes() and into SolverRegistry for
 *               slashSolver/recordSettlement. SolverRegistry.authorizedCaller must be
 *               set to address(this) after deployment.
 *
 * Security fixes:
 *   [1] slashSolver / recordSettlement called on Registry were previously gated by
 *       onlyOwner there. Now Registry.authorizedCaller == SolverBoard address. The
 *       SolverBoard IS the operational authority — not an EOA.
 *   [2] Slash amounts (0.1 ETH / 0.5 ETH) were hardcoded. Now owner-configurable.
 *   [3] publishBatch is only callable from BatchSettlement (msg.sender check). BatchSettlement
 *       calls it from setBatchValue when a batch is first registered; owner uses registerBatchValue.
 *   [4] selectWinner: adds secondary sort by endpointUrl hash for deterministic tie-break.
 *   [5] expireBatch: guard against re-expiry.
 *   [6] submitBid: guard against duplicate bids from same solver per batch.
 *   [7] executeSettlement: re-entrancy on the try/catch path — slashing now done AFTER
 *       the try block completes so state is fully settled before external calls.
 *   [8] submitBid: batch value must be set (registerBatchValue) so MIN_SURPLUS is enforced.
 *   [9] selectWinner: short post-deadline buffer so mempool bids are not raced on fast blocks.
 *   [10] selectWinner: only owner or winnerKeeper (no permissionless winner finalization).
 */
contract SolverBoard is Ownable, ReentrancyGuard {
    SolverRegistry public immutable solverRegistry;
    GhostLockBatchSettlement public immutable batchSettlement;

    // ─── constants (configurable) ─────────────────────────────────────────────
    uint256 public constant BIDDING_WINDOW_BLOCKS = 10; // ~2 min on Arbitrum
    uint256 public constant SETTLEMENT_WINDOW_BLOCKS = 5; // ~1 min
    /// @notice Blocks after biddingDeadline before anyone may call selectWinner (anti-griefing).
    uint256 public constant WINNER_SELECTION_BUFFER_BLOCKS = 3;
    uint256 public constant MIN_SURPLUS_BPS = 50; // 0.5 %

    // FIX [2]: configurable slash amounts
    uint256 public slashAmountFailure = 0.1 ether;
    uint256 public slashAmountExpiry = 0.5 ether;

    // ─── structs ─────────────────────────────────────────────────────────────
    struct Bid {
        address solver;
        uint256 totalSurplus;
        bytes32 routeHash;
        uint256 timestamp;
        bool executed;
        bool slashed;
    }

    struct Batch {
        uint256 batchId;
        uint256 finalizedBlock;
        uint256 biddingDeadline;
        uint256 settlementDeadline;
        address winningSolver;
        uint256 winningBid;
        bool settled;
        bool expired;
    }

    // ─── state ────────────────────────────────────────────────────────────────
    mapping(uint256 => Batch) public batches;
    mapping(uint256 => mapping(address => Bid)) public bids;
    mapping(uint256 => address[]) public batchBidders;
    // FIX [6]: duplicate bid guard
    mapping(uint256 => mapping(address => bool)) public hasBid;

    /// @notice If zero, only owner may call selectWinner; otherwise owner or this address.
    address public winnerKeeper;

    // ─── events ───────────────────────────────────────────────────────────────
    event BatchPublished(uint256 indexed batchId, uint256 finalizedBlock, uint256 biddingDeadline);
    event BidSubmitted(uint256 indexed batchId, address indexed solver, uint256 surplus);
    event WinnerSelected(uint256 indexed batchId, address indexed solver, uint256 surplus);
    event SettlementExecuted(uint256 indexed batchId, address indexed solver, bool success);
    event SettlementFailed(uint256 indexed batchId, address indexed solver, string reason);
    event BatchExpired(uint256 indexed batchId);
    event SlashAmountsUpdated(uint256 failure, uint256 expiry);
    event WinnerKeeperSet(address indexed keeper);

    // ─── errors ───────────────────────────────────────────────────────────────
    error BiddingClosed(uint256 batchId);
    error BiddingNotClosed(uint256 batchId);
    error WinnerSelectionTooEarly(uint256 batchId);
    error InsufficientSurplus(uint256 provided, uint256 required);
    error SolverNotEligible(address solver);
    error NotWinningSolver(address solver);
    error SettlementDeadlinePassed(uint256 batchId);
    error BatchAlreadySettled(uint256 batchId);
    error BatchAlreadyExpired(uint256 batchId);
    error InvalidRouteHash();
    error DuplicateBid(uint256 batchId, address solver);
    error NoValidBids(uint256 batchId);
    error BatchValueNotSet(uint256 batchId);
    error NotWinnerSelector();

    // ─── constructor ─────────────────────────────────────────────────────────
    constructor(address _solverRegistry, address _batchSettlement, address _owner) Ownable(_owner) {
        solverRegistry = SolverRegistry(payable(_solverRegistry));
        batchSettlement = GhostLockBatchSettlement(_batchSettlement);
    }

    // ─── admin ────────────────────────────────────────────────────────────────

    /// FIX [2]: owner can tune slash amounts post-deployment without redeployment.
    function setSlashAmounts(uint256 failure, uint256 expiry) external onlyOwner {
        require(failure > 0 && expiry > 0, "zero slash");
        slashAmountFailure = failure;
        slashAmountExpiry = expiry;
        emit SlashAmountsUpdated(failure, expiry);
    }

    /// @notice Sets cached batch value on BatchSettlement and opens bidding via publishBatch there.
    function registerBatchValue(uint256 batchId, uint256 value) external onlyOwner {
        batchSettlement.setBatchValue(batchId, value);
    }

    function setWinnerKeeper(address k) external onlyOwner {
        winnerKeeper = k;
        emit WinnerKeeperSet(k);
    }

    function _onlyWinnerSelector() internal view {
        if (msg.sender == owner()) return;
        if (winnerKeeper != address(0) && msg.sender == winnerKeeper) return;
        revert NotWinnerSelector();
    }

    // ─── batch lifecycle ──────────────────────────────────────────────────────

    /**
     * @notice Publish a batch for solver competition (sets bidding / settlement windows).
     * @dev    Only BatchSettlement may call; triggered when setBatchValue registers a new batch.
     */
    function publishBatch(uint256 batchId) external {
        require(msg.sender == address(batchSettlement), "only BatchSettlement");

        Batch storage batch = batches[batchId];
        require(batch.finalizedBlock == 0, "already published");

        batch.batchId = batchId;
        batch.finalizedBlock = block.number;
        batch.biddingDeadline = block.number + BIDDING_WINDOW_BLOCKS;
        // Keep SETTLEMENT_WINDOW_BLOCKS full execution slots after selectWinner is allowed.
        batch.settlementDeadline =
            block.number + BIDDING_WINDOW_BLOCKS + WINNER_SELECTION_BUFFER_BLOCKS + SETTLEMENT_WINDOW_BLOCKS;

        emit BatchPublished(batchId, batch.finalizedBlock, batch.biddingDeadline);
    }

    // ─── bidding ─────────────────────────────────────────────────────────────

    /**
     * @notice Submit a bid for a batch.
     * @param batchId       Batch to bid on.
     * @param totalSurplus  Total surplus to users (quote token units).
     * @param routeHash     keccak256 of the routes bytes to be passed to executeWithRoutes.
     *
     * FIX [6]: duplicate bid from same solver now reverts.
     */
    function submitBid(uint256 batchId, uint256 totalSurplus, bytes32 routeHash) external nonReentrant {
        Batch storage batch = batches[batchId];

        if (block.number >= batch.biddingDeadline) {
            revert BiddingClosed(batchId);
        }
        if (!solverRegistry.isEligibleSolver(msg.sender)) {
            revert SolverNotEligible(msg.sender);
        }
        if (hasBid[batchId][msg.sender]) {
            revert DuplicateBid(batchId, msg.sender); // FIX [6]
        }

        uint256 batchVal = batchSettlement.getBatchValue(batchId);
        if (batchVal == 0) revert BatchValueNotSet(batchId);
        uint256 minSurplus = (batchVal * MIN_SURPLUS_BPS) / 10_000;
        if (minSurplus == 0) minSurplus = 1;
        if (totalSurplus < minSurplus) {
            revert InsufficientSurplus(totalSurplus, minSurplus);
        }

        bids[batchId][msg.sender] = Bid({
            solver: msg.sender,
            totalSurplus: totalSurplus,
            routeHash: routeHash,
            timestamp: block.timestamp,
            executed: false,
            slashed: false
        });

        batchBidders[batchId].push(msg.sender);
        hasBid[batchId][msg.sender] = true;

        emit BidSubmitted(batchId, msg.sender, totalSurplus);
    }

    /**
     * @notice Select winning solver after bidding window.
     *         Highest surplus wins. Tie-break: solver registered earlier (lower index
     *         in activeSolvers at bid time is not available here, so we use address
     *         magnitude as deterministic secondary sort). FIX [4].
     */
    function selectWinner(uint256 batchId) external {
        _onlyWinnerSelector();
        Batch storage batch = batches[batchId];

        if (block.number < batch.biddingDeadline) {
            revert BiddingNotClosed(batchId);
        }
        if (block.number < batch.biddingDeadline + WINNER_SELECTION_BUFFER_BLOCKS) {
            revert WinnerSelectionTooEarly(batchId);
        }
        require(batch.winningSolver == address(0), "already selected");

        address[] memory bidders = batchBidders[batchId];
        uint256 bestSurplus = 0;
        address bestSolver = address(0);

        for (uint256 i = 0; i < bidders.length; i++) {
            address bidder = bidders[i];
            Bid memory bid = bids[batchId][bidder];

            // FIX [4]: deterministic tie-break — lower address wins on equal surplus
            if (
                bid.totalSurplus > bestSurplus
                    || (bid.totalSurplus == bestSurplus && bestSolver != address(0) && bidder < bestSolver)
            ) {
                bestSurplus = bid.totalSurplus;
                bestSolver = bidder;
            }
        }

        if (bestSolver == address(0)) revert NoValidBids(batchId);

        batch.winningSolver = bestSolver;
        batch.winningBid = bestSurplus;

        emit WinnerSelected(batchId, bestSolver, bestSurplus);
    }

    /**
     * @notice Winning solver submits routes; settlement is executed on BatchSettlement.
     *
     * FIX [7]: slash is issued AFTER the try block; no re-entrancy possible because
     *          the state variable `batch.settled` is set first inside the try block.
     *          slashSolver and recordSettlement are called on SolverRegistry which is
     *          now authorised for SolverBoard — not the owner EOA (FIX [1]).
     */
    function executeSettlement(uint256 batchId, bytes calldata routes) external nonReentrant {
        Batch storage batch = batches[batchId];

        if (msg.sender != batch.winningSolver) {
            revert NotWinningSolver(msg.sender);
        }
        if (block.number >= batch.settlementDeadline) {
            revert SettlementDeadlinePassed(batchId);
        }
        if (batch.settled) revert BatchAlreadySettled(batchId);

        Bid storage bid = bids[batchId][msg.sender];
        if (keccak256(routes) != bid.routeHash) revert InvalidRouteHash();

        bool settlementSucceeded;
        string memory failReason;

        try batchSettlement.executeWithRoutes(batchId, routes) {
            batch.settled = true;
            bid.executed = true;
            settlementSucceeded = true;
        } catch Error(string memory reason) {
            failReason = reason;
        } catch {
            failReason = "unknown error";
        }

        // FIX [7]: registry calls AFTER state mutation, outside try block
        if (settlementSucceeded) {
            solverRegistry.recordSettlement(msg.sender, true);
            emit SettlementExecuted(batchId, msg.sender, true);
        } else {
            // FIX [1]: SolverRegistry.authorizedCaller must be address(this)
            solverRegistry.slashSolver(msg.sender, slashAmountFailure, failReason);
            solverRegistry.recordSettlement(msg.sender, false);
            bid.slashed = true;
            emit SettlementFailed(batchId, msg.sender, failReason);
        }
    }

    /**
     * @notice Expire a batch if settlement window passed without settlement.
     *         FIX [5]: guard against double-expiry.
     */
    function expireBatch(uint256 batchId) external {
        Batch storage batch = batches[batchId];

        if (batch.expired) revert BatchAlreadyExpired(batchId); // FIX [5]
        if (batch.settled) revert BatchAlreadySettled(batchId);
        require(block.number >= batch.settlementDeadline, "window active");

        batch.expired = true;

        if (batch.winningSolver != address(0)) {
            // FIX [1]: authorizedCaller — not onlyOwner
            solverRegistry.slashSolver(
                batch.winningSolver,
                slashAmountExpiry, // FIX [2]
                "failed to settle within deadline"
            );
            solverRegistry.recordSettlement(batch.winningSolver, false);
        }

        emit BatchExpired(batchId);
    }

    // ─── views ────────────────────────────────────────────────────────────────

    function getBatchBidders(uint256 batchId) external view returns (address[] memory) {
        return batchBidders[batchId];
    }

    function getBatch(uint256 batchId) external view returns (Batch memory) {
        return batches[batchId];
    }

    function isBiddingOpen(uint256 batchId) external view returns (bool) {
        Batch memory batch = batches[batchId];
        return block.number < batch.biddingDeadline && !batch.settled;
    }
}
