// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SolverRegistry
 * @notice Solver registration, bonding (1 ETH min), reputation tracking, slashing,
 *         7-day unbond cooldown.
 *
 * Security fixes:
 *   [1] slashSolver / recordSettlement were onlyOwner. Fixed: now onlyAuthorized
 *       (the SolverBoard contract). Owner configures the authorized address after
 *       SolverBoard is deployed; the owner EOA should NOT be the operational caller.
 *   [2] Added MIN_REPUTATION_THRESHOLD: solvers with < 10 attempts are exempt (they
 *       need history first); once ≥ 10 attempts have been made, reputation must be
 *       ≥ 5000 bps (50 %) to remain isEligible. Low-quality solvers are auto-excluded.
 *   [3] withdrawBond: underflow guard — was possible if bond already 0 (edge case
 *       after slash brings bond to 0 but unbondRequest was already pending).
 *   [4] slashSolver: can now slash deactivated (unbonding) solvers so bad actors
 *       cannot escape slash by front-running with requestUnbond.
 *   [5] withdrawBond: delete solver storage so registerSolver works again after full exit.
 *   [6] Subsequent authorizedCaller updates use a 2-day timelock; first set is immediate.
 *   [7] Slash history is capped; use events for full audit; paginated getter for on-chain reads.
 */
contract SolverRegistry is Ownable, ReentrancyGuard {
    // ─── constants ────────────────────────────────────────────────────────────
    uint256 public constant MIN_BOND = 1 ether;
    uint256 public constant UNBOND_COOLDOWN = 7 days;
    uint256 public constant MIN_REPUTATION_THRESHOLD = 5_000; // bps — 50 %
    uint256 public constant MIN_ATTEMPTS_FOR_GATE = 10; // exempt until first 10 settled
    uint256 public constant AUTHORIZED_CALLER_DELAY = 2 days;
    uint256 public constant MAX_SLASH_HISTORY_ENTRIES = 1024;

    // ─── state ────────────────────────────────────────────────────────────────

    /// @notice The only address permitted to call slashSolver / recordSettlement.
    ///         Set by owner after SolverBoard deployment.
    address public authorizedCaller;

    address public pendingAuthorizedCaller;
    uint256 public pendingAuthorizedCallerEffectiveTime;

    struct Solver {
        address solverAddress;
        uint256 bondAmount;
        uint256 reputation; // 0–10 000 bps
        uint256 totalSettled;
        uint256 failureCount;
        uint256 unbondRequestTime; // 0 = no pending unbond
        bool isActive;
        string endpointUrl;
    }

    struct SlashEvent {
        address solver;
        uint256 amount;
        string reason;
        uint256 timestamp;
    }

    mapping(address => Solver) public solvers;
    mapping(address => uint256) private _solverIndex;
    address[] public activeSolvers;
    SlashEvent[] public slashHistory;

    // ─── events ───────────────────────────────────────────────────────────────
    event SolverRegistered(address indexed solver, uint256 bond, string endpointUrl);
    event SolverDeregistered(address indexed solver);
    event BondIncreased(address indexed solver, uint256 amount);
    event UnbondRequested(address indexed solver, uint256 releaseTime);
    event BondWithdrawn(address indexed solver, uint256 amount);
    event SolverSlashed(address indexed solver, uint256 amount, string reason);
    event ReputationUpdated(address indexed solver, uint256 newReputation);
    event SettlementRecorded(address indexed solver, bool success);
    event AuthorizedCallerSet(address indexed caller);
    event AuthorizedCallerChangeScheduled(address indexed caller, uint256 effectiveTime);

    // ─── errors ───────────────────────────────────────────────────────────────
    error InsufficientBond(uint256 provided, uint256 required);
    error SolverAlreadyRegistered(address solver);
    error SolverNotRegistered(address solver);
    error UnbondCooldownNotMet(uint256 timeRemaining);
    error NoUnbondRequest();
    error Unauthorized();

    // ─── modifiers ────────────────────────────────────────────────────────────

    /// FIX [1]: operational calls go through the SolverBoard contract, not the owner EOA.
    modifier onlyAuthorized() {
        if (msg.sender != authorizedCaller) revert Unauthorized();
        _;
    }

    // ─── constructor ─────────────────────────────────────────────────────────
    constructor(address _owner) Ownable(_owner) {}

    // ─── admin ────────────────────────────────────────────────────────────────

    /**
     * @notice Set or schedule the address (SolverBoard) that may call slashSolver / recordSettlement.
     * @dev First assignment takes effect immediately; later changes require executeAuthorizedCallerChange
     *      after AUTHORIZED_CALLER_DELAY.
     */
    function setAuthorizedCaller(address caller) external onlyOwner {
        require(caller != address(0), "zero address");
        if (authorizedCaller == address(0)) {
            authorizedCaller = caller;
            pendingAuthorizedCaller = address(0);
            pendingAuthorizedCallerEffectiveTime = 0;
            emit AuthorizedCallerSet(caller);
            return;
        }
        pendingAuthorizedCaller = caller;
        pendingAuthorizedCallerEffectiveTime = block.timestamp + AUTHORIZED_CALLER_DELAY;
        emit AuthorizedCallerChangeScheduled(caller, pendingAuthorizedCallerEffectiveTime);
    }

    function executeAuthorizedCallerChange() external onlyOwner {
        require(pendingAuthorizedCaller != address(0), "no pending caller");
        require(block.timestamp >= pendingAuthorizedCallerEffectiveTime, "timelock active");
        authorizedCaller = pendingAuthorizedCaller;
        pendingAuthorizedCaller = address(0);
        pendingAuthorizedCallerEffectiveTime = 0;
        emit AuthorizedCallerSet(authorizedCaller);
    }

    // ─── registration ─────────────────────────────────────────────────────────

    function registerSolver(string calldata endpointUrl) external payable nonReentrant {
        if (msg.value < MIN_BOND) revert InsufficientBond(msg.value, MIN_BOND);
        if (solvers[msg.sender].isActive) {
            revert SolverAlreadyRegistered(msg.sender);
        }

        solvers[msg.sender] = Solver({
            solverAddress: msg.sender,
            bondAmount: msg.value,
            reputation: 10_000, // start perfect; gate kicks in after MIN_ATTEMPTS
            totalSettled: 0,
            failureCount: 0,
            unbondRequestTime: 0,
            isActive: true,
            endpointUrl: endpointUrl
        });

        activeSolvers.push(msg.sender);
        _solverIndex[msg.sender] = activeSolvers.length - 1;
        emit SolverRegistered(msg.sender, msg.value, endpointUrl);
    }

    function increaseBond() external payable nonReentrant {
        Solver storage s = solvers[msg.sender];
        if (!s.isActive) revert SolverNotRegistered(msg.sender);
        s.bondAmount += msg.value;
        emit BondIncreased(msg.sender, msg.value);
    }

    function requestUnbond() external {
        Solver storage s = solvers[msg.sender];
        if (!s.isActive) revert SolverNotRegistered(msg.sender);
        s.unbondRequestTime = block.timestamp;
        s.isActive = false;
        _removeFromActiveSolvers(msg.sender);
        emit UnbondRequested(msg.sender, block.timestamp + UNBOND_COOLDOWN);
    }

    function withdrawBond() external nonReentrant {
        Solver storage s = solvers[msg.sender];
        if (s.unbondRequestTime == 0) revert NoUnbondRequest();

        uint256 elapsed = block.timestamp - s.unbondRequestTime;
        if (elapsed < UNBOND_COOLDOWN) {
            revert UnbondCooldownNotMet(UNBOND_COOLDOWN - elapsed);
        }

        uint256 amount = s.bondAmount;
        require(amount > 0, "nothing to withdraw");
        delete solvers[msg.sender];

        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");

        emit BondWithdrawn(msg.sender, amount);
        emit SolverDeregistered(msg.sender);
    }

    // ─── authorizedCaller operations ──────────────────────────────────────────

    /**
     * @notice Slash a solver's bond.
     * @dev    FIX [1]: was onlyOwner — now onlyAuthorized (SolverBoard).
     *         FIX [4]: slashes even deactivating solvers (unbondRequestTime set but not yet withdrawn).
     */
    function slashSolver(address solver, uint256 amount, string calldata reason) external onlyAuthorized {
        Solver storage s = solvers[solver];
        // Allow slash of deactivating solvers too (FIX [4])
        require(s.solverAddress != address(0), "unknown solver");

        uint256 slashAmt = amount > s.bondAmount ? s.bondAmount : amount;
        s.bondAmount -= slashAmt;

        if (s.bondAmount < MIN_BOND && s.isActive) {
            s.isActive = false;
            _removeFromActiveSolvers(solver);
        }

        if (slashHistory.length < MAX_SLASH_HISTORY_ENTRIES) {
            slashHistory.push(
                SlashEvent({solver: solver, amount: slashAmt, reason: reason, timestamp: block.timestamp})
            );
        }

        // Slashed ETH goes to treasury (owner)
        (bool ok,) = owner().call{value: slashAmt}("");
        require(ok, "slash transfer failed");

        emit SolverSlashed(solver, slashAmt, reason);
    }

    /**
     * @notice Record a settlement attempt outcome.
     * @dev    FIX [1]: was onlyOwner — now onlyAuthorized (SolverBoard).
     *         FIX [2]: after MIN_ATTEMPTS, auto-deactivate below-threshold solvers.
     */
    function recordSettlement(address solver, bool success) external onlyAuthorized {
        Solver storage s = solvers[solver];
        require(s.solverAddress != address(0), "unknown solver");

        if (success) {
            s.totalSettled += 1;
        } else {
            s.failureCount += 1;
        }

        uint256 total = s.totalSettled + s.failureCount;
        if (total > 0) {
            s.reputation = (s.totalSettled * 10_000) / total;
        }

        // FIX [2]: enforce reputation gate once solver has enough history
        if (total >= MIN_ATTEMPTS_FOR_GATE && s.reputation < MIN_REPUTATION_THRESHOLD && s.isActive) {
            s.isActive = false;
            _removeFromActiveSolvers(solver);
        }

        emit SettlementRecorded(solver, success);
        emit ReputationUpdated(solver, s.reputation);
    }

    // ─── views ────────────────────────────────────────────────────────────────

    function isEligibleSolver(address solver) external view returns (bool) {
        Solver memory s = solvers[solver];
        if (!s.isActive) return false;
        if (s.bondAmount < MIN_BOND) return false;

        // FIX [2]: apply reputation gate after sufficient history
        uint256 total = s.totalSettled + s.failureCount;
        if (total >= MIN_ATTEMPTS_FOR_GATE && s.reputation < MIN_REPUTATION_THRESHOLD) {
            return false;
        }
        return true;
    }

    function getActiveSolvers() external view returns (address[] memory) {
        return activeSolvers;
    }

    function getSolver(address solver) external view returns (Solver memory) {
        return solvers[solver];
    }

    function getSlashHistory(uint256 offset, uint256 limit) external view returns (SlashEvent[] memory page) {
        uint256 len = slashHistory.length;
        if (offset >= len || limit == 0) {
            return new SlashEvent[](0);
        }
        uint256 end = offset + limit;
        if (end > len) end = len;
        uint256 n = end - offset;
        page = new SlashEvent[](n);
        for (uint256 i = 0; i < n;) {
            page[i] = slashHistory[offset + i];
            unchecked {
                ++i;
            }
        }
    }

    // ─── internal ─────────────────────────────────────────────────────────────

    function _removeFromActiveSolvers(address solver) internal {
        uint256 idx = _solverIndex[solver];
        uint256 last = activeSolvers.length - 1;
        if (idx != last) {
            address moved = activeSolvers[last];
            activeSolvers[idx] = moved;
            _solverIndex[moved] = idx;
        }
        activeSolvers.pop();
        delete _solverIndex[solver];
    }

    receive() external payable {}
}
