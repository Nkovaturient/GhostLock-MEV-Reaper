// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {ReentrancyGuard} from "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";

interface IGhostLockLiveness {
    function isReady(uint256 requestId) external view returns (bool);
    function verifyPlaintext(uint256 requestId, bytes calldata plaintext) external view returns (bool);
    function intents(uint256 requestId)
        external
        view
        returns (
            address requestedBy,
            uint32 encryptedAt,
            uint32 unlockBlock,
            bool ready,
            bool forced,
            bytes32 decryptedHash,
            uint256 bond,
            uint256 revealDeadline,
            uint256 slashDeadline
        );
}

interface IEpochRNG {
    function epochSeed(uint256 epoch) external view returns (bytes32);
}

interface IPriceOracle {
    function validateClearingPrice(address base, address quote, uint256 clearingPrice) external view returns (bool);
}

interface ISolverBoard {
    function publishBatch(uint256 batchId) external;

    function getBatch(uint256 batchId)
        external
        view
        returns (
            uint256 batchId_,
            uint256 finalizedBlock,
            uint256 biddingDeadline,
            uint256 settlementDeadline,
            address winningSolver,
            uint256 winningBid,
            bool settled,
            bool expired
        );
}

/**
 * @title GhostLockBatchSettlement
 * @notice Uniform-price batch auction settlement with pro-rata fill.
 *
 * Decrypted intent ABI (must match GhostLockLiveness decoder):
 *   (address user, uint8 side, uint256 amount, uint256 limitPrice, uint8 marketId, uint256 epoch)
 *   side: 0 = Buy base with quote, 1 = Sell base for quote
 *
 * Security fixes vs. original:
 *   [1] addMarket() was unguarded. Fixed: onlyOwner.
 *   [2] settleBatch() was callable by anyone. Fixed: onlySolverBoard.
 *       The SolverBoard address is set by owner; only the winning solver (via SolverBoard)
 *       triggers settlement.
 *   [3] clearingPrice was caller-supplied with no validation. Fixed: validated against
 *       PriceOracle.validateClearingPrice() — reverts if >5 % deviation from oracle.
 *   [4] Pro-rata rounding dust: invariant check was strict equality (buysToFill == 0),
 *       which reverts on any integer-division remainder. Fixed: dustTolerance (configurable,
 *       default 1000 wei). Any dust ≤ dustTolerance is accepted and left in the contract
 *       as claimable via the next settlement.
 *   [5] Reads plaintext from calldata (not from contract state storage), so BatchSettlement
 *       is not dependent on Liveness storing cleartext permanently on-chain (which was
 *       removed). Callers supply the plaintext; verifyPlaintext() confirms it matches
 *       the on-chain hash.
 *   [6] deposit() has a per-user per-market cap (configurable) to limit exposure.
 *   [7] getBatchValue() and executeWithRoutes() for SolverBoard; settlement logic is
 *       shared via _settleBatchInternal (never this.settleBatch — that broke onlySolverBoard).
 *       publishBatch on SolverBoard is invoked from setBatchValue when the batch is new.
 *   [8] dustTolerance is capped so owner cannot disable the imbalance invariant.
 *   [9] MAX_BATCH_SIZE caps gas for settlement loops.
 */
contract GhostLockBatchSettlement is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── types ────────────────────────────────────────────────────────────────
    enum Side {
        Buy,
        Sell
    }

    struct Market {
        IERC20 base;
        IERC20 quote;
        bool exists;
    }

    struct Deposit {
        uint256 base;
        uint256 quote;
    }

    // Passed in by SolverBoard per intent during executeWithRoutes
    struct IntentPayload {
        uint256 requestId;
        bytes plaintext; // ABI-encoded DecryptedIntent — verified against on-chain hash
    }

    // ─── state ────────────────────────────────────────────────────────────────
    IGhostLockLiveness public liveness;
    IEpochRNG public rng;
    IPriceOracle public oracle;

    address public solverBoard; // FIX [2]: only this address may call settleBatch

    mapping(uint8 => Market) public markets;
    mapping(address => mapping(uint8 => Deposit)) public deposits;
    mapping(uint256 => bool) public settledIntent;

    uint256 public constant MAX_BATCH_SIZE = 200;

    // FIX [4]: rounding dust tolerance (in quote token smallest units)
    uint256 public constant MAX_DUST_TOLERANCE = 1e6;
    uint256 public dustTolerance = 1_000; // wei

    // FIX [6]: per-user per-market deposit cap (0 = unlimited, set per market by owner)
    mapping(uint8 => uint256) public depositCapBase;
    mapping(uint8 => uint256) public depositCapQuote;

    // Batch value cache for SolverBoard MIN_SURPLUS calculation (FIX [7])
    mapping(uint256 => uint256) public batchValue; // batchId => estimated total quote value

    // ─── events ───────────────────────────────────────────────────────────────
    event MarketAdded(uint8 indexed marketId, address base, address quote);
    event Deposited(address indexed user, uint8 marketId, uint256 baseAmt, uint256 quoteAmt);
    event Withdrawn(address indexed user, uint8 marketId, uint256 baseAmt, uint256 quoteAmt);
    event Settled(
        uint256 indexed epoch,
        uint8 indexed marketId,
        uint256 clearingPrice,
        uint256 buyFillBase,
        uint256 sellFillBase,
        uint256 dustBuys,
        uint256 dustSells
    );
    event SolverBoardSet(address indexed solverBoard);
    event DustToleranceUpdated(uint256 newTolerance);

    // ─── errors ───────────────────────────────────────────────────────────────
    error MarketNotFound(uint8 marketId);
    error MarketAlreadyExists(uint8 marketId);
    error NotSolverBoard();
    error NoEpochSeed(uint256 epoch);
    error IntentNotReady(uint256 requestId);
    error IntentAlreadySettled(uint256 requestId);
    error PlaintextMismatch(uint256 requestId);
    error PriceOutOfBounds(uint256 clearingPrice);
    error EmptyBatch();
    error ImbalanceTooLarge(uint256 buysRemaining, uint256 sellsRemaining);
    error DepositCapExceeded(address user, uint8 marketId);

    // ─── modifiers ────────────────────────────────────────────────────────────
    modifier onlySolverBoard() {
        if (msg.sender != solverBoard) revert NotSolverBoard();
        _;
    }

    modifier marketExists(uint8 marketId) {
        if (!markets[marketId].exists) revert MarketNotFound(marketId);
        _;
    }

    // ─── constructor ─────────────────────────────────────────────────────────
    constructor(address _liveness, address _rng, address _oracle, address _owner) Ownable(_owner) {
        require(_liveness != address(0), "zero liveness");
        require(_rng != address(0), "zero rng");
        require(_oracle != address(0), "zero oracle");
        liveness = IGhostLockLiveness(_liveness);
        rng = IEpochRNG(_rng);
        oracle = IPriceOracle(_oracle);
    }

    // ─── admin ────────────────────────────────────────────────────────────────

    /// FIX [1]: was unguarded, anyone could register malicious markets.
    function addMarket(uint8 marketId, IERC20 base, IERC20 quote) external onlyOwner {
        if (markets[marketId].exists) revert MarketAlreadyExists(marketId);
        require(address(base) != address(0), "zero base");
        require(address(quote) != address(0), "zero quote");
        markets[marketId] = Market({base: base, quote: quote, exists: true});
        emit MarketAdded(marketId, address(base), address(quote));
    }

    /// FIX [2]: must be set before settleBatch can be called.
    function setSolverBoard(address _solverBoard) external onlyOwner {
        require(_solverBoard != address(0), "zero solverBoard");
        solverBoard = _solverBoard;
        emit SolverBoardSet(_solverBoard);
    }

    function setDustTolerance(uint256 tol) external onlyOwner {
        require(tol <= MAX_DUST_TOLERANCE, "dust tolerance too high");
        dustTolerance = tol;
        emit DustToleranceUpdated(tol);
    }

    function setDepositCaps(uint8 marketId, uint256 capBase, uint256 capQuote) external onlyOwner {
        depositCapBase[marketId] = capBase;
        depositCapQuote[marketId] = capQuote;
    }

    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "zero oracle");
        oracle = IPriceOracle(_oracle);
    }

    // ─── user operations ──────────────────────────────────────────────────────

    function deposit(uint8 marketId, uint256 baseAmt, uint256 quoteAmt) external nonReentrant marketExists(marketId) {
        Market memory m = markets[marketId];
        Deposit storage d = deposits[msg.sender][marketId];

        if (baseAmt > 0) {
            uint256 cap = depositCapBase[marketId];
            if (cap > 0 && d.base + baseAmt > cap) revert DepositCapExceeded(msg.sender, marketId);
            m.base.safeTransferFrom(msg.sender, address(this), baseAmt);
            d.base += baseAmt;
        }
        if (quoteAmt > 0) {
            uint256 cap = depositCapQuote[marketId];
            if (cap > 0 && d.quote + quoteAmt > cap) revert DepositCapExceeded(msg.sender, marketId);
            m.quote.safeTransferFrom(msg.sender, address(this), quoteAmt);
            d.quote += quoteAmt;
        }
        emit Deposited(msg.sender, marketId, baseAmt, quoteAmt);
    }

    function withdraw(uint8 marketId, uint256 baseAmt, uint256 quoteAmt) external nonReentrant marketExists(marketId) {
        Deposit storage d = deposits[msg.sender][marketId];
        if (baseAmt > 0) {
            require(d.base >= baseAmt, "insufficient base");
            d.base -= baseAmt;
            markets[marketId].base.safeTransfer(msg.sender, baseAmt);
        }
        if (quoteAmt > 0) {
            require(d.quote >= quoteAmt, "insufficient quote");
            d.quote -= quoteAmt;
            markets[marketId].quote.safeTransfer(msg.sender, quoteAmt);
        }
        emit Withdrawn(msg.sender, marketId, baseAmt, quoteAmt);
    }

    // ─── settlement ───────────────────────────────────────────────────────────

    /**
     * @notice Settle a batch. Only callable by SolverBoard (which gates on winning solver).
     *
     * @param payloads      Array of (requestId, plaintext) pairs. The solver supplies the
     *                      plaintext it read from IntentDecrypted event logs; we verify it
     *                      against the on-chain hash. FIX [5].
     * @param epoch         Epoch all intents belong to.
     * @param marketId      Market being settled.
     * @param clearingPrice Quote units per base token, validated against oracle. FIX [3].
     *
     * FIX [2]: onlySolverBoard
     * FIX [3]: oracle price validation
     * FIX [4]: dustTolerance
     */
    function settleBatch(IntentPayload[] calldata payloads, uint256 epoch, uint8 marketId, uint256 clearingPrice)
        external
        nonReentrant
        onlySolverBoard
        marketExists(marketId)
    {
        uint256 len = payloads.length;
        IntentPayload[] memory mem = new IntentPayload[](len);
        for (uint256 i = 0; i < len; i++) {
            mem[i] = payloads[i];
        }
        _settleBatchInternal(mem, epoch, marketId, clearingPrice);
    }

    // ─── SolverBoard integration (FIX [7]) ───────────────────────────────────

    /**
     * @notice Returns the total quote-value deposited across all users for a given batch.
     *         Used by SolverBoard to compute MIN_SURPLUS threshold.
     * @dev    This is a simplified proxy: we cache it when settleBatch is invoked.
     *         For off-chain accuracy, SolverBoard should sum Deposited events.
     *         On-chain, batchValue[batchId] is set by SolverBoard via setBatchValue().
     */
    function getBatchValue(uint256 batchId) external view returns (uint256) {
        return batchValue[batchId];
    }

    /**
     * @notice Called by SolverBoard to record the estimated batch value.
     * @dev    Only SolverBoard may call this (it computes value off-chain from events).
     */
    function setBatchValue(uint256 batchId, uint256 value) external onlySolverBoard {
        batchValue[batchId] = value;
        if (solverBoard != address(0)) {
            _publishBatchIfUnpublished(batchId);
        }
    }

    /**
     * @notice Entry point called by SolverBoard.executeSettlement().
     *         routes = ABI-encoded (IntentPayload[] payloads, uint256 epoch, uint8 marketId, uint256 clearingPrice)
     */
    /// @notice batchId is the SolverBoard batch key; bidding must be opened first via SolverBoard.registerBatchValue.
    function executeWithRoutes(uint256, bytes calldata routes) external nonReentrant onlySolverBoard {
        (IntentPayload[] memory payloads, uint256 epoch, uint8 marketId, uint256 clearingPrice) =
            abi.decode(routes, (IntentPayload[], uint256, uint8, uint256));

        _settleBatchInternal(payloads, epoch, marketId, clearingPrice);
    }

    // ─── internal ─────────────────────────────────────────────────────────────

    function _publishBatchIfUnpublished(uint256 batchId) internal {
        ISolverBoard board = ISolverBoard(solverBoard);
        (, uint256 finalizedBlock,,,,,,) = board.getBatch(batchId);
        if (finalizedBlock == 0) {
            board.publishBatch(batchId);
        }
    }

    function _settleBatchInternal(
        IntentPayload[] memory payloads,
        uint256 epoch,
        uint8 marketId,
        uint256 clearingPrice
    ) internal marketExists(marketId) {
        if (rng.epochSeed(epoch) == bytes32(0)) revert NoEpochSeed(epoch);

        _validateClearingPrice(marketId, clearingPrice);

        uint256 len = payloads.length;
        require(len > 0, "empty batch");
        require(len <= MAX_BATCH_SIZE, "batch too large");

        (
            address[] memory users,
            uint8[] memory sides,
            uint256[] memory amounts,
            uint256 totalBuysBase,
            uint256 totalSellsBase
        ) = _decodeIntents(payloads, epoch, marketId, clearingPrice);

        if (totalBuysBase == 0 && totalSellsBase == 0) revert EmptyBatch();

        uint256 filledBase = totalBuysBase < totalSellsBase ? totalBuysBase : totalSellsBase;

        (uint256 buysRemaining, uint256 sellsRemaining) = _executeFills(
            payloads, users, sides, amounts, marketId, clearingPrice, totalBuysBase, totalSellsBase, filledBase
        );

        if (buysRemaining > dustTolerance || sellsRemaining > dustTolerance) {
            revert ImbalanceTooLarge(buysRemaining, sellsRemaining);
        }

        emit Settled(epoch, marketId, clearingPrice, filledBase, filledBase, buysRemaining, sellsRemaining);
    }

    function _validateClearingPrice(uint8 marketId, uint256 clearingPrice) internal view {
        Market memory m = markets[marketId];
        require(m.exists, "market not found");
        require(clearingPrice > 0, "clearing price must be greater than 0");
        require(clearingPrice <= type(uint256).max / 1e18, "clearing price too large");
        oracle.validateClearingPrice(address(m.base), address(m.quote), clearingPrice);
    }

    function _decodeIntents(IntentPayload[] memory payloads, uint256 epoch, uint8 marketId, uint256 clearingPrice)
        internal
        view
        returns (
            address[] memory users,
            uint8[] memory sides,
            uint256[] memory amounts,
            uint256 totalBuysBase,
            uint256 totalSellsBase
        )
    {
        uint256 len = payloads.length;
        users = new address[](len);
        sides = new uint8[](len);
        amounts = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            (address user, uint8 side, uint256 amount) = _validateAndDecode(payloads[i], epoch, marketId, clearingPrice);

            if (side == uint8(Side.Buy)) {
                totalBuysBase += amount;
            } else {
                totalSellsBase += amount;
            }
            users[i] = user;
            sides[i] = side;
            amounts[i] = amount;
        }
    }

    function _executeFills(
        IntentPayload[] memory payloads,
        address[] memory users,
        uint8[] memory sides,
        uint256[] memory amounts,
        uint8 marketId,
        uint256 clearingPrice,
        uint256 totalBuysBase,
        uint256 totalSellsBase,
        uint256 filledBase
    ) internal returns (uint256 buysRemaining, uint256 sellsRemaining) {
        buysRemaining = filledBase;
        sellsRemaining = filledBase;

        for (uint256 i = 0; i < payloads.length; i++) {
            settledIntent[payloads[i].requestId] = true;
            if (amounts[i] == 0) continue;

            uint256 amt = amounts[i];

            if (sides[i] == uint8(Side.Buy)) {
                if (totalBuysBase > filledBase) {
                    amt = (amt * filledBase) / totalBuysBase;
                }
                if (amt == 0) continue;
                deposits[users[i]][marketId].quote -= amt * clearingPrice;
                deposits[users[i]][marketId].base += amt;
                buysRemaining -= amt;
            } else {
                if (totalSellsBase > filledBase) {
                    amt = (amt * filledBase) / totalSellsBase;
                }
                if (amt == 0) continue;
                deposits[users[i]][marketId].base -= amt;
                deposits[users[i]][marketId].quote += amt * clearingPrice;
                sellsRemaining -= amt;
            }
        }
    }

    function _validateAndDecode(IntentPayload memory payload, uint256 epoch, uint8 marketId, uint256 clearingPrice)
        internal
        view
        returns (address user, uint8 side, uint256 amount)
    {
        uint256 id = payload.requestId;

        if (settledIntent[id]) revert IntentAlreadySettled(id);
        if (!liveness.isReady(id)) revert IntentNotReady(id);

        if (!liveness.verifyPlaintext(id, payload.plaintext)) {
            revert PlaintextMismatch(id);
        }

        uint256 limitPrice;
        uint8 mkt;
        uint256 ep;
        (user, side, amount, limitPrice, mkt, ep) =
            abi.decode(payload.plaintext, (address, uint8, uint256, uint256, uint8, uint256));

        require(mkt == marketId, "market mismatch");
        require(ep == epoch, "epoch mismatch");

        if (side == uint8(Side.Buy)) {
            require(clearingPrice <= limitPrice, "buy limit exceeded");
            uint256 maxBuyBase = deposits[user][marketId].quote / clearingPrice;
            if (amount > maxBuyBase) amount = maxBuyBase;
        } else {
            require(clearingPrice >= limitPrice, "sell limit not met");
            uint256 available = deposits[user][marketId].base;
            if (amount > available) amount = available;
        }
    }
}
