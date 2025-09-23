// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


import {AbstractBlocklockReceiver} from "blocklock-solidity/src/AbstractBlocklockReceiver.sol";
import {TypesLib} from "blocklock-solidity/src/libraries/TypesLib.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract GhostLockLiveness is AbstractBlocklockReceiver, ReentrancyGuard {
    using Address for address payable;

    struct Intent {
        address requestedBy;
        uint32 encryptedAt;
        uint32 unlockBlock;
        TypesLib.Ciphertext ct;
        bool ready;
        bool forced; // was force-revealed by fallback revealer
        bytes decrypted; // plaintext (ABI encoded intent)
        uint256 bond; // amount of native currency bonded at submission
        uint256 revealDeadline; // block number after which forceReveal allowed
        uint256 slashDeadline; // block number after which bond can be slashed
    }

    // configurable parameters
    uint256 public constant BOND_MINIMUM = 0.001 ether; // sensible default; can be parameterized
    uint256 public bountyPercent = 20; // bounty to forced revealer (percentage of bond)
    uint256 public revealGraceBlocks = 20; // blocks wait after unlockBlock for oracle to do callback
    uint256 public slashBlocks = 200; // blocks after which bond is slashed if still not revealed

    // tracking
    mapping(uint256 => Intent) public intents;
    uint256 public lastRequestId;

    // governance / treasury
    address public admin;
    address public treasury;

    event IntentSubmitted(
        uint256 indexed requestId,
        address indexed user,
        uint32 unlockBlock,
        uint256 bond
    );
    event IntentRevealed(
        uint256 indexed requestId,
        bool forced,
        address indexed revealer
    );
    event IntentBondSlashed(
        uint256 indexed requestId,
        uint256 amount,
        address indexed to
    );
    event ConfigUpdated(
        address indexed admin,
        uint256 bountyPercent,
        uint256 revealGraceBlocks,
        uint256 slashBlocks
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin");
        _;
    }

    constructor(
        address _blocklockSender,
        address _treasury
    ) AbstractBlocklockReceiver(_blocklockSender) {
        admin = msg.sender;
        treasury = _treasury == address(0) ? msg.sender : _treasury;
    }

    // Submission: user must send bond in native currency (msg.value)
    // callbackGasLimit, condition, encryptedData follow blocklock interface
    function submitIntentWithBond(
        uint32 callbackGasLimit,
        uint32 unlockBlock,
        bytes calldata condition,
        TypesLib.Ciphertext calldata encryptedData
    ) external payable returns (uint256 requestId, uint256 requestPrice) {
        require(msg.value >= BOND_MINIMUM, "bond too small");

        // create timelock request on blocklock, charging native for callback (as before)
        (requestId, requestPrice) = _requestBlocklockPayInNative(
            callbackGasLimit,
            condition,
            encryptedData
        );

        Intent storage it = intents[requestId];
        it.requestedBy = msg.sender;
        it.encryptedAt = uint32(block.timestamp);
        it.unlockBlock = unlockBlock;
        it.ct = encryptedData;
        it.ready = false;
        it.forced = false;
        it.decrypted = "";
        it.bond = msg.value;
        it.revealDeadline = uint256(unlockBlock) + revealGraceBlocks;
        it.slashDeadline = uint256(unlockBlock) + slashBlocks;

        lastRequestId = requestId;

        emit IntentSubmitted(requestId, msg.sender, unlockBlock, msg.value);
    }

    // blocklock callback when oracle releases decryption key
    function _onBlocklockReceived(
        uint256 _requestId,
        bytes calldata decryptionKey
    ) internal override {
        Intent storage it = intents[_requestId];
        require(it.requestedBy != address(0), "unknown request");
        require(block.number >= it.unlockBlock, "too early");

        bytes memory plaintext = _decrypt(it.ct, decryptionKey);
        it.decrypted = plaintext;
        it.ready = true;

        // return bond to requester (full bond)
        uint256 bond = it.bond;
        it.bond = 0;
        if (bond > 0) {
            payable(it.requestedBy).sendValue(bond);
        }

        emit IntentRevealed(_requestId, false, msg.sender);
    }

    // Fallback: anyone who has the decryption key (private) can submit it to get bounty.
    // This is permissionless: ensures that if oracle never calls back, a revealer who holds key can unlock.
    function forceReveal(
        uint256 requestId,
        bytes calldata decryptionKey
    ) external nonReentrant {
        Intent storage it = intents[requestId];
        require(it.requestedBy != address(0), "unknown request");
        require(!it.ready, "already ready");
        require(block.number >= it.revealDeadline, "reveal window not opened");
        require(block.number < it.slashDeadline, "reveal window expired");

        // attempt decryption; _decrypt must revert if key is invalid
        bytes memory plaintext = _decrypt(it.ct, decryptionKey);
        it.decrypted = plaintext;
        it.ready = true;
        it.forced = true;

        // pay bounty to msg.sender from the bond
        uint256 bond = it.bond;
        if (bond > 0) {
            uint256 bounty = (bond * bountyPercent) / 100;
            uint256 refund = bond - bounty;
            it.bond = 0;

            if (bounty > 0) {
                payable(msg.sender).sendValue(bounty);
            }
            if (refund > 0) {
                payable(it.requestedBy).sendValue(refund);
            }
        }

        emit IntentRevealed(requestId, true, msg.sender);
    }

    // Slash bond: after slashDeadline, anyone can call to collect the bond to treasury.
    function slashBond(uint256 requestId) external nonReentrant {
        Intent storage it = intents[requestId];
        require(it.requestedBy != address(0), "unknown request");
        require(!it.ready, "already ready");
        require(block.number >= it.slashDeadline, "slash not allowed yet");

        uint256 bond = it.bond;
        require(bond > 0, "no bond");

        it.bond = 0;
        payable(treasury).sendValue(bond);

        emit IntentBondSlashed(requestId, bond, treasury);
    }

    // Admin controls
    function updateConfig(
        uint256 _bountyPercent,
        uint256 _revealGraceBlocks,
        uint256 _slashBlocks,
        address _treasury
    ) external onlyAdmin {
        require(_bountyPercent <= 50, "bounty too large");
        bountyPercent = _bountyPercent;
        revealGraceBlocks = _revealGraceBlocks;
        slashBlocks = _slashBlocks;
        if (_treasury != address(0)) treasury = _treasury;

        emit ConfigUpdated(
            msg.sender,
            bountyPercent,
            revealGraceBlocks,
            slashBlocks
        );
    }

    // Allow contract to receive native funds in fallback
    receive() external payable {}
    fallback() external payable {}
}
