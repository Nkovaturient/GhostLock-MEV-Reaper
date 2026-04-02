// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/// @dev Mirrors IGhostLockLiveness in BatchSettlement for tests.
contract MockLiveness {
    struct IntentView {
        address requestedBy;
        uint32 encryptedAt;
        uint32 unlockBlock;
        bool ready;
        bool forced;
        bytes32 decryptedHash;
        uint256 bond;
        uint256 revealDeadline;
        uint256 slashDeadline;
    }

    mapping(uint256 => IntentView) internal _intents;

    function setIntent(uint256 requestId, bool ready, bytes32 decryptedHash) external {
        _intents[requestId].ready = ready;
        _intents[requestId].decryptedHash = decryptedHash;
    }

    function isReady(uint256 requestId) external view returns (bool) {
        return _intents[requestId].ready;
    }

    function verifyPlaintext(uint256 requestId, bytes calldata plaintext) external view returns (bool) {
        return _intents[requestId].decryptedHash == keccak256(plaintext);
    }

    function intents(uint256 requestId)
        external
        view
        returns (
            address requestedBy,
            uint32 encryptedAt,
            uint32 unlockBlock,
            bool ready,
            bool forced,
            bytes32 decryptedHash,
            uint256 bond,
            uint256 revealDeadline,
            uint256 slashDeadline
        )
    {
        IntentView storage it = _intents[requestId];
        return (
            it.requestedBy,
            it.encryptedAt,
            it.unlockBlock,
            it.ready,
            it.forced,
            it.decryptedHash,
            it.bond,
            it.revealDeadline,
            it.slashDeadline
        );
    }
}
