// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {TypesLib} from "../../lib/randomness-solidity/src/libraries/TypesLib.sol";
import {IRandomnessSender} from "../../lib/randomness-solidity/src/interfaces/IRandomnessSender.sol";
import {IRandomnessReceiver} from "../../lib/randomness-solidity/src/interfaces/IRandomnessReceiver.sol";

/// @dev Stubs IRandomnessSender; `requestRandomness` charges `nativeFee` and returns incrementing id.
contract MockRandomnessSender is IRandomnessSender {
    uint256 public nativeFee = 0.001 ether;
    uint256 private _nextId = 1;

    function setNativeFee(uint256 f) external {
        nativeFee = f;
    }

    function calculateRequestPriceNative(uint32) external view override returns (uint256) {
        return nativeFee;
    }

    function estimateRequestPriceNative(uint32, uint256) external view override returns (uint256) {
        return nativeFee;
    }

    function requestRandomness(uint32) external payable override returns (uint256 requestID) {
        require(msg.value >= nativeFee, "low fee");
        requestID = _nextId++;
    }

    function requestRandomnessWithSubscription(uint32, uint256) external payable override returns (uint256) {
        revert("not used");
    }

    function getRequest(uint256) external pure override returns (TypesLib.RandomnessRequest memory) {
        revert("not used");
    }

    function setSignatureSender(address) external override {}

    function getAllRequests() external pure override returns (TypesLib.RandomnessRequest[] memory) {
        return new TypesLib.RandomnessRequest[](0);
    }

    function messageFrom(TypesLib.RandomnessRequestCreationParams memory)
        external
        pure
        override
        returns (bytes memory)
    {
        return hex"00";
    }

    function isInFlight(uint256) external pure override returns (bool) {
        return false;
    }

    function getConfig()
        external
        pure
        override
        returns (
            uint32 maxGasLimit,
            uint32 gasAfterPaymentCalculation,
            uint32 fulfillmentFlatFeeNativePPM,
            uint32 weiPerUnitGas,
            uint32 blsPairingCheckOverhead,
            uint8 nativePremiumPercentage,
            uint32 gasForCallExactCheck
        )
    {
        return (0, 0, 0, 0, 0, 0, 0);
    }

    function addConsumer(uint256, address) external override {}

    function removeConsumer(uint256, address) external override {}

    function cancelSubscription(uint256, address) external override {}

    function acceptSubscriptionOwnerTransfer(uint256) external override {}

    function requestSubscriptionOwnerTransfer(uint256, address) external override {}

    function createSubscription() external pure override returns (uint256) {
        return 1;
    }

    function getSubscription(uint256) external pure override returns (uint96, uint64, address, address[] memory) {
        return (0, 0, address(0), new address[](0));
    }

    function pendingRequestExists(uint256) external pure override returns (bool) {
        return false;
    }

    function getActiveSubscriptionIds(uint256, uint256) external pure override returns (uint256[] memory) {
        return new uint256[](0);
    }

    function fundSubscriptionWithNative(uint256) external payable override {}

    function fulfill(address rng, uint256 requestId, bytes32 seed) external {
        IRandomnessReceiver(rng).receiveRandomness(requestId, seed);
    }
}
