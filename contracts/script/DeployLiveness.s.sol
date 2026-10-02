// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/console.sol";
import "../src/GhostLockLiveness.sol";

/// @notice Redeploy GhostLockLiveness only (tlock + blocklock paths).
contract DeployLiveness is Script {
    function run() external {
        uint256 deployerPk = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(deployerPk);
        address blocklockSender = vm.envAddress("BLOCKLOCK_SENDER_ARB_SEPOLIA");
        address treasury = vm.envAddress("TREASURY");

        require(blocklockSender != address(0), "BLOCKLOCK_SENDER not set");
        require(treasury != address(0), "TREASURY not set");

        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerPk);
        GhostLockLiveness liveness = new GhostLockLiveness(blocklockSender, treasury);
        vm.stopBroadcast();

        console.log("GhostLockLiveness:", address(liveness));
    }
}
