// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AbstractBlocklockReceiver} from "blocklock-solidity/src/AbstractBlocklockReceiver.sol";
import {TypesLib} from "blocklock-solidity/src/libraries/TypesLib.sol";

// Stores encrypted trade intents and marks them ready after blocklock decryption.
// Decrypted payload ABI (kept private until callback):
// struct DecryptedIntent { address user; uint8 side; uint256 amount; uint256 limitPrice; uint8 marketId; uint256 epoch; }
contract GhostLockIntents is AbstractBlocklockReceiver {
    struct CipherIntent {
        address requestedBy;
        uint32 encryptedAt;     // timestamp (seconds)
        uint32 unlockBlock;     // block height when decryption is allowed
        TypesLib.Ciphertext ct; // encrypted payload
        bool ready;
        bytes decrypted;        // decrypted ABI-encoded DecryptedIntent (optional store for PoC)
    }

    uint256 public lastRequestId;
    mapping(uint256 => CipherIntent) public intents; // requestId => intent

    event IntentSubmitted(uint256 indexed requestId, address indexed user, uint32 unlockBlock);
    event IntentReady(uint256 indexed requestId);

    constructor(address blocklockSender) AbstractBlocklockReceiver(blocklockSender) {}

    // User funds the decryption callback in native and submits ciphertext gated by block height.
    // encryptedData ciphertext produced by blocklock-js
    function submitEncryptedIntentWithDirectFunding(
        uint32 callbackGasLimit,
        uint32 unlockBlock,
        bytes calldata condition,
        TypesLib.Ciphertext calldata encryptedData
    ) external payable returns (uint256 requestId, uint256 price) {
        (requestId, price) = _requestBlocklockPayInNative(callbackGasLimit, condition, encryptedData);

        intents[requestId] = CipherIntent({
            requestedBy: msg.sender,
            encryptedAt: uint32(block.timestamp),
            unlockBlock: unlockBlock,
            ct: encryptedData,
            ready: false,
            decrypted: ""
        });

        lastRequestId = requestId;
        emit IntentSubmitted(requestId, msg.sender, unlockBlock);
    }

    // blocklock calls this when decryption is available. We verify unlock block and mark ready.
    function _onBlocklockReceived(uint256 requestId, bytes calldata decryptionKey) internal override {
        CipherIntent storage it = intents[requestId];
        require(it.requestedBy != address(0), "Unknown request");
        require(block.number >= it.unlockBlock, "Too early");

        // For PoC we actually decrypt on-chain to persist the cleartext intent.
        // In production, consider emitting the key and letting off-chain services handle sensitive parsing.
        bytes memory plaintext = _decrypt(it.ct, decryptionKey);
        it.decrypted = plaintext;
        it.ready = true;

        emit IntentReady(requestId);
    }
}
