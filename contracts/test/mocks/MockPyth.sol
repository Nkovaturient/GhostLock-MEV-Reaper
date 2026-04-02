// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {PythStructs} from "../../lib/pyth-sdk-solidity/PythStructs.sol";

/// @dev Subset of IPyth used by PriceOracle in tests.
contract MockPyth {
    mapping(bytes32 => PythStructs.Price) private _prices;
    uint256 public updateFeeWei;

    function setPrice(bytes32 id, int64 price, uint64 conf, int32 expo, uint256 publishTime) external {
        _prices[id] = PythStructs.Price({price: price, conf: conf, expo: expo, publishTime: publishTime});
    }

    function setUpdateFee(uint256 wei_) external {
        updateFeeWei = wei_;
    }

    function getPriceUnsafe(bytes32 id) external view returns (PythStructs.Price memory) {
        return _prices[id];
    }

    function getUpdateFee(bytes[] calldata) external view returns (uint256 feeAmount) {
        return updateFeeWei;
    }

    function updatePriceFeeds(bytes[] calldata) external payable {}
}
