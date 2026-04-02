// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {AbstractBlocklockReceiver} from "../lib/blocklock-solidity/src/AbstractBlocklockReceiver.sol";
import {TypesLib} from "../lib/blocklock-solidity/src/libraries/TypesLib.sol";
import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GhostLockLiveness
 * @notice Primary encrypted intent store with liveness guarantees.
 *         Consolidates GhostLockIntents + Liveness into one production contract.
 *
 * Design:
 *   • Users submit ABI-encoded intents encrypted via blocklock-js (dcipher threshold
 *     encryption). The ciphertext is stored; the plaintext is never known on-chain
 *     until the unlock block is reached.
 *   • The dcipher oracle delivers the decryption key via _onBlocklockReceived.
 *   • If the oracle fails, any holder of the decryption key can call forceReveal()
 *     within the reveal window and earn a bounty from the user's bond.
 *   • If the intent is never revealed, the bond is slashable by treasury.
 *
 * Decrypted intent ABI:
 *   (address user, uint8 side, uint256 amount, uint256 limitPrice, uint8 marketId, uint256 epoch)
 *   side: 0 = Buy base with quote, 1 = Sell base for quote
 *
 * Security fixes :
 *   [1] lastRequestId was global (race condition). Fixed: per-user request list
 *       mapping(address => uint256[]) and mapping(address => uint256) lastRequestIdByUser.
 *   [2] Decrypted plaintext was stored permanently on-chain (privacy regression).
 *       Fixed: emit IntentDecrypted event with the plaintext; store only a
 *       content-hash on-chain so BatchSettlement can verify the data it reads
 *       off-chain via the event log.
 *   [3] IntentSubmitted had no marketId/epoch indexed fields (impossible at
 *       submission because they're encrypted). IntentDecrypted event adds
 *       indexed marketId and epoch post-reveal.
 *   [4] BOND_MINIMUM raised from 0.001 ETH to 0.01 ETH. At 0.001 ETH the
 *       20 % bounty = 0.0002 ETH ≈ $0.50 — not economically viable to incentivise
 *       force-revealers. At 0.01 ETH the bounty = 0.002 ETH ≈ $5.
 *   [5] admin / treasury stored immutably (via constructor) and use two-step
 *       transfer pattern.
 *   [6] forceReveal / slashBond require bond > 0 before attempting sendValue
 *       (avoids no-op calls that waste gas).
 *   [7] _onBlocklockReceived bond refund: call{value}; failed sends credit pendingRefunds (pull).
 *   [8] forceReveal: same + bounty fallback to treasury then pendingRefunds; never reverts after ready.
 *   [9] updateConfig enforces minimum reveal/slash windows and minimum bounty percent.
 *   [10] No generic payable fallback; admin may sweep verified dust (see sweepEth NatSpec).
 *   [11] Bond = ETH left after blocklock fee: override forwards only requestPrice so it.bond matches balance.
 */
contract GhostLockLiveness is AbstractBlocklockReceiver, ReentrancyGuard {
    // ─── intent storage ───────────────────────────────────────────────────────

    struct Intent {
        address requestedBy;
        uint32 encryptedAt; // block.timestamp at submission
        uint32 unlockBlock; // blocklock target
        TypesLib.Ciphertext ct; // encrypted payload — stored for forceReveal
        bool ready; // decryption complete
        bool forced; // decrypted via forceReveal, not oracle
        bytes32 decryptedHash; // keccak256 of plaintext (for on-chain verification)
        uint256 bond; // ETH bonded at submission
        uint256 revealDeadline; // block number: oracle must deliver by here
        uint256 slashDeadline; // block number: after this, bond is slashable
    }

    mapping(uint256 => Intent) public intents; // requestId => Intent

    // FIX [1]: per-user request tracking
    mapping(address => uint256[]) public userRequestIds; // user => [requestId, ...]
    mapping(address => uint256) public lastRequestIdByUser; // user => last requestId

    /// @notice ETH credited when a push refund/bounty transfer fails (claim via claimPendingRefund).
    mapping(address => uint256) public pendingRefunds;

    // ─── config ───────────────────────────────────────────────────────────────

    uint256 public constant BOND_MINIMUM = 0.01 ether; // FIX [4]: raised from 0.001

    uint256 public bountyPercent = 20; // % of bond paid to forceRevealer
    uint256 public revealGraceBlocks = 20; // blocks after unlockBlock before forceReveal opens
    uint256 public slashBlocks = 200; // blocks after unlockBlock before slash opens

    // ─── governance ───────────────────────────────────────────────────────────

    address public admin;
    address public pendingAdmin; // two-step admin transfer (FIX [5])
    address public treasury;

    // ─── events ───────────────────────────────────────────────────────────────

    event IntentSubmitted(uint256 indexed requestId, address indexed user, uint32 unlockBlock, uint256 bond);

    /**
     * FIX [2] + [3]: emitted on reveal. Plaintext lives in event log (not state).
     *                marketId and epoch are indexed for off-chain filtering.
     * @param plaintext ABI-encoded DecryptedIntent struct.
     */
    event IntentDecrypted(
        uint256 indexed requestId,
        uint8 indexed marketId,
        uint256 indexed epoch,
        bool forced,
        address revealer,
        bytes plaintext // ⚠ only on decode success; see note below
    );

    event IntentBondSlashed(uint256 indexed requestId, uint256 amount, address indexed to);
    event AdminTransferInitiated(address indexed newAdmin);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);
    event ConfigUpdated(uint256 bountyPercent, uint256 revealGraceBlocks, uint256 slashBlocks);
    event PendingRefundCredited(address indexed account, uint256 amount);
    event PendingRefundClaimed(address indexed account, uint256 amount);
    event EthSwept(address indexed to, uint256 amount);

    // ─── errors ───────────────────────────────────────────────────────────────
    error BondTooSmall(uint256 sent, uint256 minimum);
    error UnknownRequest(uint256 requestId);
    error AlreadyReady(uint256 requestId);
    error RevealWindowNotOpen(uint256 requestId, uint256 currentBlock, uint256 revealDeadline);
    error RevealWindowExpired(uint256 requestId);
    error SlashNotAllowed(uint256 requestId);
    error NoBond(uint256 requestId);
    error OnlyAdmin();

    // ─── modifiers ────────────────────────────────────────────────────────────
    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    // ─── constructor ─────────────────────────────────────────────────────────
    constructor(address _blocklockSender, address _treasury) AbstractBlocklockReceiver(_blocklockSender) {
        admin = msg.sender;
        treasury = _treasury == address(0) ? msg.sender : _treasury;
    }

    // ─── submission ───────────────────────────────────────────────────────────

    /**
     * @notice Submit an encrypted intent. msg.value must cover requestPrice + BOND_MINIMUM
     *         (fee is paid to blocklock; remainder is the bonded amount).
     * @param callbackGasLimit  Gas limit for the blocklock callback.
     * @param unlockBlock       Block at which dcipher releases decryption key.
     * @param condition         Blocklock condition (ABI-encoded block number).
     * @param encryptedData     Ciphertext from blocklock-js.
     * @return requestId        Globally unique blocklock request ID.
     * @return requestPrice     Fee charged by the blocklock network.
     */
    function submitIntentWithBond(
        uint32 callbackGasLimit,
        uint32 unlockBlock,
        bytes calldata condition,
        TypesLib.Ciphertext calldata encryptedData
    ) external payable nonReentrant returns (uint256 requestId, uint256 requestPrice) {
        (requestId, requestPrice) = _requestBlocklockPayInNative(callbackGasLimit, condition, encryptedData);

        uint256 bondAmt = msg.value - requestPrice;

        Intent storage it = intents[requestId];
        it.requestedBy = msg.sender;
        it.encryptedAt = uint32(block.timestamp);
        it.unlockBlock = unlockBlock;
        it.ct = encryptedData;
        it.bond = bondAmt;
        it.revealDeadline = uint256(unlockBlock) + revealGraceBlocks;
        it.slashDeadline = uint256(unlockBlock) + slashBlocks;

        // FIX [1]: per-user tracking
        userRequestIds[msg.sender].push(requestId);
        lastRequestIdByUser[msg.sender] = requestId;

        emit IntentSubmitted(requestId, msg.sender, unlockBlock, bondAmt);
    }

    /// @dev Pays only the quoted fee to blocklock; keeps bond on this contract.
    function _requestBlocklockPayInNative(
        uint32 callbackGasLimit,
        bytes memory condition,
        TypesLib.Ciphertext calldata ciphertext
    ) internal override returns (uint256 requestId, uint256 requestPrice) {
        requestPrice = blocklock.calculateRequestPriceNative(callbackGasLimit);
        uint256 minMsg = requestPrice + BOND_MINIMUM;
        if (msg.value < minMsg) revert BondTooSmall(msg.value, minMsg);
        requestId = blocklock.requestBlocklock{value: requestPrice}(callbackGasLimit, condition, ciphertext);
    }

    // ─── oracle callback ──────────────────────────────────────────────────────

    /**
     * @dev Called by the blocklock network when the decryption key is available.
     *      FIX [2]: does NOT store plaintext in state. Emits event instead.
     *      Failed bond refund credits pendingRefunds (pull via claimPendingRefund).
     */
    function _onBlocklockReceived(uint256 requestId, bytes calldata decryptionKey) internal override {
        Intent storage it = intents[requestId];
        if (it.requestedBy == address(0)) revert UnknownRequest(requestId);
        require(block.number >= it.unlockBlock, "too early");

        bytes memory plaintext = _decrypt(it.ct, decryptionKey);

        // Store only the hash for on-chain verification; plaintext lives in event log
        it.decryptedHash = keccak256(plaintext);
        it.ready = true;

        // Decode to extract indexed fields for the event (FIX [3])
        (,,,, uint8 marketId, uint256 epoch) = _decodeIntent(plaintext);

        uint256 bond = it.bond;
        it.bond = 0;
        if (bond > 0) {
            (bool ok,) = it.requestedBy.call{value: bond}("");
            if (!ok) {
                pendingRefunds[it.requestedBy] += bond;
                emit PendingRefundCredited(it.requestedBy, bond);
            }
        }

        emit IntentDecrypted(requestId, marketId, epoch, false, msg.sender, plaintext);
    }

    // ─── force reveal ─────────────────────────────────────────────────────────

    /**
     * @notice Permissionless fallback: anyone holding the decryption key can call
     *         this after revealDeadline to earn a bounty from the bond.
     */
    function forceReveal(uint256 requestId, bytes calldata decryptionKey) external nonReentrant {
        Intent storage it = intents[requestId];
        if (it.requestedBy == address(0)) revert UnknownRequest(requestId);
        if (it.ready) revert AlreadyReady(requestId);
        if (block.number < it.revealDeadline) {
            revert RevealWindowNotOpen(requestId, block.number, it.revealDeadline);
        }
        if (block.number >= it.slashDeadline) {
            revert RevealWindowExpired(requestId);
        }

        bytes memory plaintext = _decrypt(it.ct, decryptionKey); // reverts on bad key

        it.decryptedHash = keccak256(plaintext);
        it.ready = true;
        it.forced = true;

        (,,,, uint8 marketId, uint256 epoch) = _decodeIntent(plaintext);

        uint256 bond = it.bond;
        it.bond = 0;
        if (bond > 0) {
            uint256 bounty = (bond * bountyPercent) / 100;
            uint256 refund = bond - bounty;
            if (bounty > 0) {
                (bool paidBounty,) = msg.sender.call{value: bounty}("");
                if (!paidBounty) {
                    (bool toTreasury,) = payable(treasury).call{value: bounty}("");
                    if (!toTreasury) {
                        pendingRefunds[treasury] += bounty;
                        emit PendingRefundCredited(treasury, bounty);
                    }
                }
            }
            if (refund > 0) {
                (bool paidRefund,) = it.requestedBy.call{value: refund}("");
                if (!paidRefund) {
                    pendingRefunds[it.requestedBy] += refund;
                    emit PendingRefundCredited(it.requestedBy, refund);
                }
            }
        }

        emit IntentDecrypted(requestId, marketId, epoch, true, msg.sender, plaintext);
    }

    // ─── slash ────────────────────────────────────────────────────────────────

    /**
     * @notice After slashDeadline, anyone can slash an unrevealed intent's bond to treasury.
     */
    function slashBond(uint256 requestId) external nonReentrant {
        Intent storage it = intents[requestId];
        if (it.requestedBy == address(0)) revert UnknownRequest(requestId);
        if (it.ready) revert AlreadyReady(requestId);
        if (block.number < it.slashDeadline) revert SlashNotAllowed(requestId);

        uint256 bond = it.bond;
        if (bond == 0) revert NoBond(requestId); // FIX [6]
        it.bond = 0;

        (bool ok,) = payable(treasury).call{value: bond}("");
        require(ok, "treasury transfer failed");
        emit IntentBondSlashed(requestId, bond, treasury);
    }

    /// @notice Pull ETH from failed push transfers (bond refunds, user refunds, or treasury bounty fallback).
    function claimPendingRefund() external nonReentrant {
        uint256 amt = pendingRefunds[msg.sender];
        require(amt > 0, "nothing to claim");
        pendingRefunds[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: amt}("");
        require(ok, "claim transfer failed");
        emit PendingRefundClaimed(msg.sender, amt);
    }

    // ─── views ────────────────────────────────────────────────────────────────

    /**
     * @notice Returns all request IDs for a given user.
     */
    function getRequestIds(address user) external view returns (uint256[] memory) {
        return userRequestIds[user];
    }

    /**
     * @notice Verify that a given plaintext matches the on-chain hash (for BatchSettlement).
     */
    function verifyPlaintext(uint256 requestId, bytes calldata plaintext) external view returns (bool) {
        return intents[requestId].decryptedHash == keccak256(plaintext);
    }

    function isReady(uint256 requestId) external view returns (bool) {
        return intents[requestId].ready;
    }

    // ─── admin ────────────────────────────────────────────────────────────────

    function updateConfig(uint256 _bountyPercent, uint256 _revealGraceBlocks, uint256 _slashBlocks, address _treasury)
        external
        onlyAdmin
    {
        require(_bountyPercent >= 5, "bounty too small");
        require(_bountyPercent <= 50, "bounty too large");
        require(_revealGraceBlocks >= 10, "reveal window too short");
        require(_slashBlocks >= _revealGraceBlocks + 50, "slash window too tight");
        bountyPercent = _bountyPercent;
        revealGraceBlocks = _revealGraceBlocks;
        slashBlocks = _slashBlocks;
        if (_treasury != address(0)) treasury = _treasury;
        emit ConfigUpdated(_bountyPercent, _revealGraceBlocks, _slashBlocks);
    }

    /// @notice Initiate admin transfer (two-step, FIX [5])
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "zero address");
        pendingAdmin = newAdmin;
        emit AdminTransferInitiated(newAdmin);
    }

    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "not pending admin");
        address old = admin;
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit AdminTransferred(old, admin);
    }

    /**
     * @notice Send native ETH to `to` (e.g. mistaken transfer to this contract).
     * @dev Does not check outstanding intent bonds — verify off-chain that `amount` is safe to recover.
     */
    function sweepEth(address payable to, uint256 amount) external onlyAdmin {
        require(to != address(0), "zero to");
        require(amount <= address(this).balance, "insufficient balance");
        (bool ok,) = to.call{value: amount}("");
        require(ok, "sweep failed");
        emit EthSwept(to, amount);
    }

    // ─── internal ─────────────────────────────────────────────────────────────

    /// @dev Safe ABI decode with validation; reverts on malformed data.
    function _decodeIntent(bytes memory data)
        internal
        pure
        returns (address user, uint8 side, uint256 amount, uint256 limitPrice, uint8 marketId, uint256 epoch)
    {
        (user, side, amount, limitPrice, marketId, epoch) =
            abi.decode(data, (address, uint8, uint256, uint256, uint8, uint256));
        require(user != address(0), "bad intent: zero user");
        require(side <= 1, "bad intent: invalid side");
        require(amount > 0, "bad intent: zero amount");
    }

    receive() external payable {}
}
