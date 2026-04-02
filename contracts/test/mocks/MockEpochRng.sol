// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

contract MockEpochRng {
    mapping(uint256 => bytes32) public epochSeed;

    function setSeed(uint256 epoch, bytes32 seed) external {
        epochSeed[epoch] = seed;
    }
}
