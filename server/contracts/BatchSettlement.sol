// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IGhostLockIntents {
    function intents(uint256) external view returns (
        address requestedBy,
        uint32 encryptedAt,
        uint32 unlockBlock,
        /* TypesLib.Ciphertext ct - omitted in external ABI */
        bool ready,
        bytes memory decrypted
    );
}

interface IEpochRNG {
    function epochSeed(uint256) external view returns (bytes32);
}


// Minimal uniform-price batch auction settlement for one market.
// Data model for decrypted payload Keep your off-chain encoder aligned: 
// Solidity tuple for abi.encode(...) off-chain or after decryption
// (address user, uint8 side, uint256 amount, uint256 limitPrice, uint8 marketId, uint256 epoch)
// side: 0 = Buy base with quote, 1 = Sell base for quote
// limitPrice: quote per base, integer scaled by token decimals agreement in the dApp
// amount: amount of base
// epoch: ties to RNG seed and the batch window
// marketId: maps to the Market in settlement
/// DecryptedIntent ABI: (address user, uint8 side, uint256 amount, uint256 limitPrice, uint8 marketId, uint256 epoch)
contract GhostLockBatchSettlement is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Side { Buy, Sell }

    struct DecodedIntent {
    address user;
    uint8 side;        // 0 buy, 1 sell
    uint256 amount;    // base amount
    uint256 limitPrice;// quote per base
    uint8 marketId;
    uint256 epoch;
    }

    struct Entry {
    address user;
    uint8 side;
    uint256 amount; // possibly capped by deposits; scaled later for pro-rata
    }

    struct Market {
        IERC20 base;  // e.g., TokenA
        IERC20 quote; // e.g., TokenB
        bool exists;
    }

    struct Deposit {
        uint256 base;
        uint256 quote;
    }

    IGhostLockIntents public intents;
    IEpochRNG public rng;

    mapping(uint8 => Market) public markets;     // marketId => Market
    mapping(address => mapping(uint8 => Deposit)) public deposits; // user => marketId => balances
    mapping(uint256 => bool) public settledIntent; // requestId => consumed

    event MarketAdded(uint8 marketId, address base, address quote);
    event Deposited(address indexed user, uint8 marketId, uint256 baseAmt, uint256 quoteAmt);
    event Settled(uint256 epoch, uint8 marketId, uint256 clearingPrice, uint256 buyFill, uint256 sellFill);

    constructor(address intents_, address rng_) {
        intents = IGhostLockIntents(intents_);
        rng = IEpochRNG(rng_);
    }

    function addMarket(uint8 marketId, IERC20 base, IERC20 quote) external {
        require(!markets[marketId].exists, "exists");
        markets[marketId] = Market({base: base, quote: quote, exists: true});
        emit MarketAdded(marketId, address(base), address(quote));
    }

    /// @notice Deposit tokens used later by intents. Keeps amounts off-chain-private until reveal.
    function deposit(uint8 marketId, uint256 baseAmt, uint256 quoteAmt) external nonReentrant {
        Market memory m = markets[marketId];
        require(m.exists, "market");
        if (baseAmt > 0) {
            m.base.safeTransferFrom(msg.sender, address(this), baseAmt);
            deposits[msg.sender][marketId].base += baseAmt;
        }
        if (quoteAmt > 0) {
            m.quote.safeTransferFrom(msg.sender, address(this), quoteAmt);
            deposits[msg.sender][marketId].quote += quoteAmt;
        }
        emit Deposited(msg.sender, marketId, baseAmt, quoteAmt);
    }

    /// @notice Uniform-price settlement for a batch of requestIds that are ready and belong to the same epoch+market.
    /// @param requestIds list of decrypted, ready intent ids
    /// @param epoch epoch used for fairness scoring
    /// @param marketId market id
    /// @param clearingPrice price denominated as quote per base
    function settleBatch(
        uint256[] calldata requestIds,
        uint256 epoch,
        uint8 marketId,
        uint256 clearingPrice
    ) external nonReentrant {
        Market memory m = markets[marketId];
        require(m.exists, "market");
        require(rng.epochSeed(epoch) != bytes32(0), "seed");

        // 1) Read and filter intents
        // Decode, check ready, check epoch+market match, and cap by deposits.
        uint256 totalBuysBase;  // in base tokens to purchase
        uint256 totalSellsBase; // in base tokens to sell

        // Temp arrays in memory for pro-rata later
        address[] memory users = new address[](requestIds.length);
        uint8[] memory sides = new uint8[](requestIds.length);
        uint256[] memory amounts = new uint256[](requestIds.length);

        for (uint256 i = 0; i < requestIds.length; i++) {
            uint256 id = requestIds[i];
            require(!settledIntent[id], "dup");

            (address user,,, bool ready, bytes memory dec) = intents.intents(id);
            require(ready, "not ready");

            (address u, uint8 side, uint256 amount, uint256 limitPrice, uint8 mkt, uint256 ep) =
                abi.decode(dec, (address, uint8, uint256, uint256, uint8, uint256));
            require(u == user, "spoof");
            require(mkt == marketId, "market mismatch");
            require(ep == epoch, "epoch mismatch");

            // Respect limit prices relative to clearingPrice
            if (side == uint8(Side.Buy)) {
                require(clearingPrice <= limitPrice, "buy limit");
                // Cap by user's quote deposit
                uint256 maxBuyBase = deposits[user][marketId].quote / clearingPrice;
                if (amount > maxBuyBase) amount = maxBuyBase;
                totalBuysBase += amount;
            } else {
                require(clearingPrice >= limitPrice, "sell limit");
                // Cap by user's base deposit
                if (amount > deposits[user][marketId].base) amount = deposits[user][marketId].base;
                totalSellsBase += amount;
            }

            users[i] = user;
            sides[i] = side;
            amounts[i] = amount;
        }

        require(totalBuysBase > 0 || totalSellsBase > 0, "empty");

        // 2) Pro-rata if imbalance
        uint256 filledBuysBase = totalBuysBase;
        uint256 filledSellsBase = totalSellsBase;

        if (totalBuysBase > totalSellsBase) {
            // buyers get pro-rata down to totalSellsBase
            filledBuysBase = totalSellsBase;
        } else if (totalSellsBase > totalBuysBase) {
            // sellers get pro-rata down to totalBuysBase
            filledSellsBase = totalBuysBase;
        }

        // 3) Execute transfers at uniform clearing price
        // Buyers pay quote = filledBase * clearingPrice
        // Sellers receive quote and give base

        // Aggregate per-user fills for a single transfer pass
        uint256 len = requestIds.length;
        uint256 buysToFill = filledBuysBase;
        uint256 sellsToFill = filledSellsBase;

        for (uint256 i = 0; i < len; i++) {
            if (amounts[i] == 0) { settledIntent[requestIds[i]] = true; continue; }

            address user = users[i];
            uint8 side = sides[i];
            uint256 amt = amounts[i];

            if (side == uint8(Side.Buy)) {
                if (totalBuysBase > filledBuysBase) {
                    // scale down
                    amt = (amt * filledBuysBase) / totalBuysBase;
                }
                if (amt > 0) {
                    uint256 quoteCost = amt * clearingPrice;
                    deposits[user][marketId].quote -= quoteCost;
                    deposits[user][marketId].base += amt;
                    buysToFill -= amt;
                }
            } else {
                if (totalSellsBase > filledSellsBase) {
                    // scale down
                    amt = (amt * filledSellsBase) / totalSellsBase;
                }
                if (amt > 0) {
                    uint256 quotePayout = amt * clearingPrice;
                    deposits[user][marketId].base -= amt;
                    deposits[user][marketId].quote += quotePayout;
                    sellsToFill -= amt;
                }
            }

            settledIntent[requestIds[i]] = true;
        }

        // Invariant sanity: both sides consumed equally
        require(buysToFill == 0 && sellsToFill == 0, "imbalance");

        emit Settled(epoch, marketId, clearingPrice, filledBuysBase, filledSellsBase);
    }
   
    // Optional: user withdrawals after settlement
    function withdraw(uint8 marketId, uint256 baseAmt, uint256 quoteAmt) external nonReentrant {
        Deposit storage d = deposits[msg.sender][marketId];
        if (baseAmt > 0) {
            require(d.base >= baseAmt, "base");
            d.base -= baseAmt;
            markets[marketId].base.safeTransfer(msg.sender, baseAmt);
        }
        if (quoteAmt > 0) {
            require(d.quote >= quoteAmt, "quote");
            d.quote -= quoteAmt;
            markets[marketId].quote.safeTransfer(msg.sender, quoteAmt);
        }
    }
}