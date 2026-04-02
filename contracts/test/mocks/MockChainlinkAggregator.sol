// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {
    AggregatorV3Interface
} from "../../lib/chainlink-brownie-contracts/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract MockChainlinkAggregator is AggregatorV3Interface {
    int256 public answer;
    uint256 public updatedAt;
    uint80 public roundId = 1;
    uint80 public answeredInRound = 1;

    function setAnswer(int256 a, uint256 ts) external {
        answer = a;
        updatedAt = ts;
    }

    function decimals() external pure override returns (uint8) {
        return 8;
    }

    function description() external pure override returns (string memory) {
        return "mock";
    }

    function version() external pure override returns (uint256) {
        return 1;
    }

    function getRoundData(uint80)
        external
        view
        override
        returns (uint80 roundId_, int256 answer_, uint256 startedAt, uint256 updatedAt_, uint80 answeredInRound_)
    {
        return (roundId, answer, updatedAt, updatedAt, answeredInRound);
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80 roundId_, int256 answer_, uint256 startedAt, uint256 updatedAt_, uint80 answeredInRound_)
    {
        return (roundId, answer, updatedAt, updatedAt, answeredInRound);
    }
}
