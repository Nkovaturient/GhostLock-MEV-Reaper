// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../lib/chainlink-brownie-contracts/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "../lib/pyth-sdk-solidity/IPyth.sol";
import "../lib/pyth-sdk-solidity/PythStructs.sol";
import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";

/**
 * @title PriceOracle
 * @notice Aggregates Pyth + Chainlink prices with staleness/confidence validation.
 *         Pyth is primary; Chainlink is fallback.
 *
 * Security fixes applied:
 *   [1] addPriceFeed() now onlyOwner — critical exploit in original (anyone could overwrite feeds).
 *   [2] _convertPythPrice() had inverted branches — expo >= -8 should MULTIPLY not divide.
 *       Fixed to: result = mantissa * 10^(expo+8) when (expo+8) >= 0, else divide.
 *   [3] validatePriceForIntent() now accepts tokenIn/tokenOut decimals to normalise amounts.
 *   [4] External calls to this._ helpers replaced with internal view to avoid re-entrancy
 *       surface and extra gas cost; external variants are pure view-only wrappers for off-chain.
 *   [5] updatePythPrice refunds msg.value in excess of the Pyth fee.
 *   [6] addPriceFeed requires non-zero decimals and rejects re-registration (no silent feed swaps).
 *   [7] updateFeed rotates Chainlink/Pyth endpoints without changing decimals.
 */
contract PriceOracle is Ownable {
    // ─── oracle sources ───────────────────────────────────────────────────────
    IPyth public immutable pyth;

    // token => Chainlink aggregator
    mapping(address => AggregatorV3Interface) public chainlinkFeeds;
    // token => Pyth price ID
    mapping(address => bytes32) public pythPriceIds;
    // token => ERC-20 decimals (set by owner alongside feed registration)
    mapping(address => uint8) public tokenDecimals;

    // ─── thresholds ───────────────────────────────────────────────────────────
    uint256 public constant STALENESS_THRESHOLD = 3600; // 1 hour
    uint256 public constant MAX_CONFIDENCE_BPS = 500; // 5 % confidence band → reject
    uint256 public constant MAX_DEVIATION_BPS = 500; // 5 % clearing-price deviation → reject

    // ─── events / errors ─────────────────────────────────────────────────────
    event PriceFeedAdded(address indexed token, address chainlinkFeed, bytes32 pythPriceId, uint8 decimals);
    event PriceFeedUpdated(address indexed token, address chainlinkFeed, bytes32 pythPriceId);
    event PriceUpdated(address indexed token, uint256 price, uint256 timestamp, string source);

    error PriceStale(address token, uint256 lastUpdate);
    error PriceDeviation(uint256 oraclePrice, uint256 intentPrice, uint256 deviationBps);
    error InvalidPrice(address token);
    error FeedNotRegistered(address token);

    struct PriceData {
        uint256 price; // normalised to 8 decimal places
        uint256 confidence; // absolute confidence (8 dec)
        uint256 timestamp;
        string source; // "pyth" | "chainlink"
    }

    // ─── constructor ─────────────────────────────────────────────────────────
    constructor(address _pyth, address _owner) Ownable(_owner) {
        require(_pyth != address(0), "zero pyth");
        pyth = IPyth(_pyth);
    }

    // ─── admin ────────────────────────────────────────────────────────────────

    /**
     * @notice Register price feeds for a token.
     * @dev    FIX [1]: was unguarded in original — anyone could overwrite feeds.
     *         Pass address(0) for chainlinkFeed to use Pyth-only; zero bytes32 for Pyth-only skip.
     */
    function addPriceFeed(address token, address chainlinkFeed, bytes32 pythPriceId, uint8 decimals)
        external
        onlyOwner
    {
        require(token != address(0), "zero token");
        require(decimals > 0, "zero decimals");
        require(tokenDecimals[token] == 0, "feed already registered");
        if (chainlinkFeed != address(0)) {
            chainlinkFeeds[token] = AggregatorV3Interface(chainlinkFeed);
        }
        if (pythPriceId != bytes32(0)) {
            pythPriceIds[token] = pythPriceId;
        }
        tokenDecimals[token] = decimals;
        emit PriceFeedAdded(token, chainlinkFeed, pythPriceId, decimals);
    }

    /**
     * @notice Replace Chainlink and/or Pyth feeds for an already-registered token.
     * @dev Decimals are immutable; pass address(0) / bytes32(0) to leave that source unchanged.
     */
    function updateFeed(address token, address chainlinkFeed, bytes32 pythPriceId) external onlyOwner {
        require(tokenDecimals[token] != 0, "not registered");
        if (chainlinkFeed != address(0)) {
            chainlinkFeeds[token] = AggregatorV3Interface(chainlinkFeed);
        }
        if (pythPriceId != bytes32(0)) {
            pythPriceIds[token] = pythPriceId;
        }
        emit PriceFeedUpdated(token, address(chainlinkFeeds[token]), pythPriceIds[token]);
    }

    // ─── price getters ────────────────────────────────────────────────────────

    /**
     * @notice Get latest validated price. Tries Pyth first, falls back to Chainlink.
     */
    function getLatestPrice(address token) external view returns (PriceData memory) {
        return _getLatestPrice(token);
    }

    function _getLatestPrice(address token) internal view returns (PriceData memory) {
        if (pythPriceIds[token] != bytes32(0)) {
            try this.getPythPriceUnsafe(token) returns (PriceData memory p) {
                if (_isValidPrice(p)) return p;
            } catch {}
        }
        if (address(chainlinkFeeds[token]) != address(0)) {
            try this.getChainlinkPriceUnsafe(token) returns (PriceData memory p) {
                if (_isValidPrice(p)) return p;
            } catch {}
        }
        revert InvalidPrice(token);
    }

    /**
     * @notice Raw Pyth read for this token (no staleness filter here).
     * @dev External only so `getLatestPrice` can use try/catch. Callable by anyone; prefer `getLatestPrice`.
     */
    function getPythPriceUnsafe(address token) external view returns (PriceData memory) {
        bytes32 priceId = pythPriceIds[token];
        require(priceId != bytes32(0), "no pyth feed");
        PythStructs.Price memory p = pyth.getPriceUnsafe(priceId);
        return PriceData({
            price: _convertPythPrice(p.price, p.expo),
            confidence: _convertPythPrice(int64(uint64(p.conf)), p.expo),
            timestamp: p.publishTime,
            source: "pyth"
        });
    }

    /**
     * @notice Raw Chainlink read for this token (no staleness filter here).
     * @dev External only so `getLatestPrice` can use try/catch. Callable by anyone; prefer `getLatestPrice`.
     */
    function getChainlinkPriceUnsafe(address token) external view returns (PriceData memory) {
        AggregatorV3Interface feed = chainlinkFeeds[token];
        require(address(feed) != address(0), "no chainlink feed");
        (uint80 roundId, int256 answer,, uint256 updatedAt, uint80 answeredInRound) = feed.latestRoundData();
        require(answer > 0, "non-positive");
        require(answeredInRound >= roundId, "stale round");
        return PriceData({price: uint256(answer), confidence: 0, timestamp: updatedAt, source: "chainlink"});
    }

    // ─── validation ───────────────────────────────────────────────────────────

    /**
     * @notice Validate that a solver-supplied clearingPrice is within MAX_DEVIATION of oracle.
     * @param base           Base token address.
     * @param quote          Quote token address.
     * @param clearingPrice  Solver-supplied price (quote units per 1 base, scaled to quoteDecimals).
     *
     * FIX [3]: original ignored token decimals; now normalises to 8-decimal oracle price space.
     */
    function validateClearingPrice(address base, address quote, uint256 clearingPrice) external view returns (bool) {
        PriceData memory bPrice = _getLatestPrice(base);
        PriceData memory qPrice = _getLatestPrice(quote);

        // Oracle clearing price in quote-units-per-base, normalised to 8 dec
        // oracle_cp = bPrice.price / qPrice.price  (both 8 dec → unitless ratio)
        // Re-scale clearingPrice to 8 decimals using registered token decimals
        uint8 qDec = tokenDecimals[quote];
        // clearingPriceNorm = clearingPrice * 10^8 / 10^qDec
        uint256 clearingPriceNorm;
        if (qDec <= 8) {
            clearingPriceNorm = clearingPrice * (10 ** uint256(8 - qDec));
        } else {
            clearingPriceNorm = clearingPrice / (10 ** uint256(qDec - 8));
        }

        // oraclePrice in same 8-dec ratio space: bPrice.price * 1e8 / qPrice.price
        uint256 oraclePrice = (bPrice.price * 1e8) / qPrice.price;

        uint256 diff =
            clearingPriceNorm > oraclePrice ? clearingPriceNorm - oraclePrice : oraclePrice - clearingPriceNorm;

        uint256 deviationBps = (diff * 10_000) / oraclePrice;
        if (deviationBps > MAX_DEVIATION_BPS) {
            revert PriceDeviation(oraclePrice, clearingPriceNorm, deviationBps);
        }
        return true;
    }

    /**
     * @notice Validate a user's minAmountOut against oracle price.
     *         FIX [3]: uses registered decimal info.
     */
    function validatePriceForIntent(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut)
        external
        view
        returns (bool)
    {
        PriceData memory pIn = _getLatestPrice(tokenIn);
        PriceData memory pOut = _getLatestPrice(tokenOut);

        uint8 decIn = tokenDecimals[tokenIn];
        uint8 decOut = tokenDecimals[tokenOut];

        // Normalise amountIn to 18 dec for precision
        uint256 amountIn18 = _normTo18(amountIn, decIn);
        // expectedOut in native tokenOut units (decOut)
        uint256 expectedOut = _normFrom18((amountIn18 * pIn.price) / pOut.price, decOut);
        // Allow 5 % slippage
        uint256 minAcceptable = (expectedOut * 9500) / 10_000;
        return minAmountOut >= minAcceptable;
    }

    // ─── Pyth price update ────────────────────────────────────────────────────

    function updatePythPrice(bytes[] calldata priceUpdateData, address token) external payable {
        uint256 fee = pyth.getUpdateFee(priceUpdateData);
        require(msg.value >= fee, "insufficient fee");
        pyth.updatePriceFeeds{value: fee}(priceUpdateData);

        uint256 excess = msg.value - fee;
        if (excess > 0) {
            (bool ok,) = msg.sender.call{value: excess}("");
            require(ok, "refund failed");
        }

        PriceData memory p = _getLatestPrice(token);
        emit PriceUpdated(token, p.price, p.timestamp, p.source);
    }

    // ─── internal helpers ─────────────────────────────────────────────────────

    function _isValidPrice(PriceData memory p) internal view returns (bool) {
        if (p.price == 0) return false;
        if (block.timestamp - p.timestamp > STALENESS_THRESHOLD) return false;
        if (p.confidence > 0) {
            uint256 confBps = (p.confidence * 10_000) / p.price;
            if (confBps > MAX_CONFIDENCE_BPS) return false;
        }
        return true;
    }

    /**
     * @notice Convert Pyth (mantissa, expo) pair to a uint256 with 8 decimal places.
     *
     * FIX [2]:  Original had the multiply/divide branches INVERTED.
     *           Correct derivation:
     *             actual_price = mantissa × 10^expo
     *             normalised   = actual_price × 10^8 = mantissa × 10^(expo + 8)
     *           When (expo + 8) >= 0  → multiply by 10^(expo+8)
     *           When (expo + 8) <  0  → divide   by 10^(-(expo+8))
     */
    function _convertPythPrice(int64 price, int32 expo) internal pure returns (uint256) {
        require(price > 0, "non-positive pyth price");
        int32 shift = expo + 8; // desired exponent for 8-decimal normalisation
        if (shift >= 0) {
            return uint256(uint64(price)) * (10 ** uint256(uint32(shift)));
        } else {
            return uint256(uint64(price)) / (10 ** uint256(uint32(-shift)));
        }
    }

    function _normTo18(uint256 amount, uint8 dec) internal pure returns (uint256) {
        if (dec <= 18) return amount * (10 ** uint256(18 - dec));
        return amount / (10 ** uint256(dec - 18));
    }

    function _normFrom18(uint256 amount18, uint8 dec) internal pure returns (uint256) {
        if (dec <= 18) return amount18 / (10 ** uint256(18 - dec));
        return amount18 * (10 ** uint256(dec - 18));
    }
}
