// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {RandomnessReceiverBase} from "randomness-solidity/src/RandomnessReceiverBase.sol";

// Requests randomness per epoch; stores seed used to fairly order intents.
contract GhostLockEpochRNG is RandomnessReceiverBase {
    // epoch => randomness seed
    mapping(uint256 => bytes32) public epochSeed;
    uint256 public lastEpoch;
    uint256 public lastRequestId;

    event EpochRequested(uint256 indexed epoch, uint256 requestId);
    event EpochSeed(uint256 indexed epoch, bytes32 seed);

    constructor(address randomnessSender, address owner) RandomnessReceiverBase(randomnessSender, owner) {}

    // Request randomness for a given epoch using native funding.
    function requestEpochSeed(uint256 epoch, uint32 callbackGasLimit)
        external
        payable
        returns (uint256, uint256)
    {
        require(epochSeed[epoch] == bytes32(0), "Seed exists");
        (uint256 requestID, uint256 requestPrice) = _requestRandomnessPayInNative(callbackGasLimit);
        lastRequestId = requestID;
        lastEpoch = epoch;
        emit EpochRequested(epoch, requestID);
        return (requestID, requestPrice);
    }

    // function calculateRequestPriceNative(uint32 _callbackGasLimit) public view
    // override (FeeCollector, IRandomnessSender)
    // returns (uint256){
    // return _calculateRequestPriceNative(_callbackGasLimit, tx.gasprice);
    // }

    function onRandomnessReceived(uint256 requestID, bytes32 _randomness) internal override {
        require(requestID == lastRequestId, "Request ID mismatch");
        epochSeed[lastEpoch] = _randomness;
        emit EpochSeed(lastEpoch, _randomness);
    }
}
