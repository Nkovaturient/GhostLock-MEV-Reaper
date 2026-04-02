// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/// @dev IPriceOracle.validateClearingPrice for GhostLockBatchSettlement tests.
contract MockSettlementOracle {
    bool public shouldPass = true;

    function setShouldPass(bool p) external {
        shouldPass = p;
    }

    function validateClearingPrice(address, address, uint256) external view returns (bool) {
        require(shouldPass, "oracle reject");
        return true;
    }
}
