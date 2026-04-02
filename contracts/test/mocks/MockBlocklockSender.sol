// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {TypesLib} from "../../lib/blocklock-solidity/src/libraries/TypesLib.sol";
import {IBlocklockSender} from "../../lib/blocklock-solidity/src/interfaces/IBlocklockSender.sol";

/// @dev Minimal blocklock stand-in: fee = `nativeFee`, `decrypt` returns `decryptionKey` bytes as plaintext.
///      Use `vm.prank(address(thisMock))` before `GhostLockLiveness.receiveBlocklock`.
contract MockBlocklockSender is IBlocklockSender {
    uint256 public nativeFee = 0.002 ether;
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

    function requestBlocklock(uint32, bytes calldata, TypesLib.Ciphertext calldata)
        external
        payable
        override
        returns (uint256 requestId)
    {
        require(msg.value == nativeFee, "fee mismatch");
        requestId = _nextId++;
    }

    function requestBlocklockWithSubscription(uint32, uint256, bytes calldata, TypesLib.Ciphertext calldata)
        external
        payable
        override
        returns (uint256)
    {
        revert("not used");
    }

    function decrypt(TypesLib.Ciphertext calldata, bytes calldata decryptionKey)
        external
        pure
        override
        returns (bytes memory)
    {
        return decryptionKey;
    }

    function getRequest(uint256) external pure override returns (TypesLib.BlocklockRequest memory) {
        revert("not used");
    }

    function isInFlight(uint256) external pure override returns (bool) {
        return false;
    }

    function version() external pure override returns (string memory) {
        return "mock";
    }

    function getChainId() external view override returns (uint256) {
        return block.chainid;
    }

    function setDecryptionSender(address) external override {}

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
}

