# GhostLock MEV Reaper — Reinovation Document

> Comprehensive audit, integration roadmap, and strategic blueprint for building a decentralized MEV-protected swapping platform on Arbitrum & Base Sepolia.

---

## Table of Contents

1. [Codebase Status Audit](#1-codebase-status-audit)
2. [Smart Contracts Audit](#2-smart-contracts-audit)
3. [Backend / Server Audit](#3-backend--server-audit)
4. [Solver Node Audit](#4-solver-node-audit)
5. [Frontend / HolmeSwap Audit](#5-frontend--holmeswap-audit)
6. [Packages & SDK Audit](#6-packages--sdk-audit)
7. [Git Working Tree — What Changed](#7-git-working-tree--what-changed)
8. [Critical Issues & What Needs Fixing](#8-critical-issues--what-needs-fixing)
9. [What Should Be Removed](#9-what-should-be-removed)
10. [External Solutions Research](#10-external-solutions-research)
11. [Integration Architecture](#11-integration-architecture)
12. [Implementation Phases](#12-implementation-phases)
13. [Open Questions](#13-open-questions)

---

## 1. Codebase Status Audit

### File Structure Overview (~143 source files)

| Directory | Files | Purpose | Status |
|-----------|-------|---------|--------|
| `/src/` | 80 | React/TS frontend + HolmeSwap UI | **Partially Working** |
| `/src/holmeswap/` | 26 | New swap interface | **Half-Setup** (UI only, no real blockchain calls) |
| `/solver-node/src/` | 12 | TS solver engine | **Implemented** (not tested against deployed contracts) |
| `/server/` | 36 | Express.js backend API | **Working** (deployed, settlement loop active) |
| `/lib/contracts/` | 10 | Solidity smart contracts | **Implemented** (deployed on Base Sepolia, partial Arbitrum) |
| `/packages/` | 5 | Shared packages (core, blocklock, sdk) | **Stub/Skeleton** |
| `/prototype/` | ~20 | Earlier prototype | **Superseded** — candidate for removal |
| `/dist/` | 100+ | Production build artifacts | **Stale** — needs rebuild |

### Component-by-Component Status

| Component | Status | Details |
|-----------|--------|---------|
| **GhostLockIntents.sol** | ✅ Deployed | Extends `AbstractBlocklockReceiver`, encrypts/decrypts intents via dcipher. 65 lines. Deployed on Base Sepolia at `0xB049f2a5E2aeEa5950675EA89d0DA79E5fB5C` |
| **BatchSettlement.sol** | ✅ Deployed | Uniform-price batch auction. 235 lines. Deployed at `0x8aF0Ec5b9a22d02acdC0fb3ad75831fef3208706` |
| **EpochRNG.sol** | ✅ Deployed | VRF randomness via `RandomnessReceiverBase` (dcipher/randamu). 43 lines. Deployed at `0xA785F4B588013C9761b6B2Dff025e058C42cb798` |
| **SolverBoard.sol** | ❌ Not Deployed | Solver competition coordinator. 285 lines. Written but `SOLVER_BOARD` address is empty string in constants |
| **SolverRegistry.sol** | ❌ Not Deployed | Bonding, slashing, reputation. 260 lines. Written but not deployed |
| **PriceOracle.sol** | ❌ Not Deployed | Pyth + Chainlink aggregator. 202 lines. Has Foundry deploy script but unexecuted |
| **Liveness.sol** | ❌ Not Deployed | Bond-based liveness with force-reveal. 209 lines. Written, not integrated |
| **MockToken.sol** | ⚠️ Minimal | 9 lines, bare ERC20 mock |
| **Server solver service** | ⚠️ Half-Working | Settlement loop runs, but relies on centralized solver (no competition). EpochRNG seed request works |
| **Server intents service** | ✅ Working | Fetches/decodes on-chain intents with rate limiting |
| **Server price service** | ✅ Working | Pyth + Coinbase + CoinGecko price feeds |
| **Server oracleAggregator** | ❌ Broken | TypeScript file in a JS project, imports non-existent modules (`./chainlink`, `./pyth`, `./uniswap`), uses `this` in object literal |
| **Solver Node (TS)** | ⚠️ Implemented, Untested | Full engine (BatchMonitor, RouteOptimizer, BidSubmitter, SettlementExecutor) but needs deployed SolverBoard |
| **IntentService (frontend)** | ✅ Working | Blocklock encryption/decryption, privacy padding, dummy intents |
| **usePythPrices hook** | ✅ Working | Live Pyth Hermes REST prices (ETH/USD, USDC/USD, BTC/USD) |
| **HolmeSwap UI** | ⚠️ UI Only | Beautiful UI but `handleSubmit` is a setTimeout simulation, no real contract calls |
| **Express Relay integration** | ❌ Placeholder | `express_relays.tsx` is a Solana code sample copy-paste, not integrated |
| **packages/blocklock** | ❌ Stub | `BlocklockService.ts` has empty method bodies |
| **packages/sdk** | ❌ Stub | `GhostLockSDK.ts` references non-existent `@ghostlock/*` packages |
| **packages/core** | ⚠️ Types Only | Types and constants defined, but not published or importable |

---

## 2. Smart Contracts Audit

### GhostLockIntents.sol — ✅ DEPLOYED, FUNCTIONAL

**What it does:** Stores encrypted trade intents using blocklock (dcipher threshold encryption). When block height is reached, dcipher delivers decryption key via `_onBlocklockReceived` callback.

**Strengths:**
- Clean integration with `AbstractBlocklockReceiver`
- On-chain decryption stores plaintext for settlement contract to read
- Native funding model (`_requestBlocklockPayInNative`)

**Issues:**
- On-chain decryption stores cleartext permanently — any observer can read decrypted intents after reveal (acceptable for PoC, not production)
- No event indexing of intent data fields (hard to filter off-chain)
- `lastRequestId` is global, not per-user — potential race condition with concurrent submissions

### BatchSettlement.sol — ✅ DEPLOYED, FUNCTIONAL with FLAWS

**What it does:** Uniform-price batch auction with pro-rata fill when buy/sell imbalanced.

**Strengths:**
- Correct uniform clearing price logic
- Pro-rata fill for supply/demand imbalance
- Deposit-based model prevents overspending
- Epoch seed validation (requires VRF randomness)

**Critical Issues:**
1. **`addMarket()` has NO access control** — anyone can add malicious markets
2. **Pro-rata rounding errors** — integer division at lines 192-203 can lose dust amounts
3. **`clearingPrice` is caller-supplied** — the contract trusts the caller's price. No on-chain price validation against oracles. A malicious solver can submit any price
4. **`settleBatch()` has no access control** — any address can call it, not just authorized solvers
5. **Invariant check `buysToFill == 0 && sellsToFill == 0`** will revert if rounding errors accumulate
6. **No withdrawal deadline** — deposits can be front-run if timing is known

### EpochRNG.sol — ✅ DEPLOYED, FUNCTIONAL

**What it does:** Requests per-epoch randomness from randamu's dcipher network. Seed used for deterministic intent ordering.

**Issues:**
- `lastRequestId` / `lastEpoch` pattern only tracks one pending request. Concurrent epoch requests will overwrite
- `onRandomnessReceived` checks `requestID == lastRequestId` — if two requests pending, second one will fail

### SolverBoard.sol — ❌ NOT DEPLOYED

**What it does:** Coordinates solver competition — batch publication, bid collection, winner selection, settlement execution with slashing.

**Assessment:** Well-designed contract. Proper bidding window, surplus-based winner selection, route hash verification, slashing for failed settlements. **Ready for deployment once SolverRegistry is deployed.**

**Issues:**
- `selectWinner` iterates all bidders — gas scales linearly with bidder count (fine for <50 bidders)
- No tie-breaking mechanism (first bidder with max surplus wins arbitrarily)
- `0.1 ether` and `0.5 ether` slash amounts are hardcoded — should be configurable

### SolverRegistry.sol — ❌ NOT DEPLOYED

**What it does:** Solver registration with ETH bonding (1 ETH minimum), reputation tracking, slashing, cooldown-based unbonding.

**Assessment:** Good design. 7-day unbond cooldown, reputation = `(totalSettled * 10000) / totalAttempts`. **Ready for deployment.**

**Issues:**
- `slashSolver` is `onlyOwner` — should be callable by SolverBoard, not owner
- `recordSettlement` is `onlyOwner` — same issue, should be SolverBoard
- `_removeFromActiveSolvers` has O(n) linear scan — fine for <100 solvers
- No minimum reputation threshold for eligibility

### PriceOracle.sol — ❌ NOT DEPLOYED

**What it does:** Aggregates Pyth + Chainlink prices with staleness checks and confidence validation.

**Assessment:** Solid implementation. Fallback chain (Pyth → Chainlink), price validation with 5% deviation check, Pyth price update with fee handling.

**Issues:**
- `addPriceFeed` has no access control — anyone can overwrite feed addresses
- `_convertPythPrice` has edge case: if `expo >= -8`, the adjustment calculation `expo + 8` could be 0, leading to division by 1 (harmless but confusing)
- `validatePriceForIntent` doesn't account for different token decimals

### Liveness.sol — ❌ NOT DEPLOYED

**What it does:** Bond-based liveness guarantees. Users post bonds with intents. If blocklock oracle fails to deliver, permissionless `forceReveal` pays bounty to revealer. Unrevealed intents get bonds slashed after deadline.

**Assessment:** Excellent design — solves the "oracle liveness" problem. Incentivizes decentralized fallback reveals.

**Issues:**
- Bond minimum is 0.001 ETH — might be too low to incentivize force-revealers
- No integration with BatchSettlement — needs wiring

---

## 3. Backend / Server Audit

### server/services/solver.js — ⚠️ HALF-WORKING

**What works:**
- Settlement loop polling for ready intents
- EpochRNG seed request/wait with retry
- Deterministic seed-based ordering (`compareBySeed`)
- Uniform clearing price computation
- Stats tracking and health monitoring

**What's broken/missing:**
- **Centralized solver** — no competition, single solver decides clearing price
- Uses `ethers.BigNumber.from()` (ethers v5 API) in `settlement.js` line 66, but project uses ethers v6
- `callStatic` usage in `simulateSettlementTx` is ethers v5 syntax
- Redis dependency (`ioredis`) for queue — requires Redis server running
- No integration with SolverBoard contract (because it's not deployed)

### server/services/oracleAggregator.js — ❌ BROKEN

- File is TypeScript (`import` statements) but server is CommonJS (`require`)
- Imports `./chainlink`, `./pyth`, `./uniswap` — these files don't exist
- Uses `this` inside an object literal (arrow functions) — `this` is undefined
- WebSocket URL `wss://price-feed.ghostlock.xyz` doesn't exist

**Verdict:** Delete or rewrite entirely.

### server/services/price.js — ✅ WORKING

- Pyth Hermes REST price fetching works
- Coinbase and CoinGecko fallbacks
- AI-assisted clearing price computation (calls local `/api/ai/compute`)
- Epoch-seed-based tie-breaking for deterministic price selection

### server/services/settlement.js — ⚠️ MIXED ETHERS VERSIONS

- `ethers.BigNumber.from()` on line 66 is ethers v5 API — will crash on ethers v6
- `estimateGas.settleBatch()` is ethers v5 syntax — v6 uses `settleBatch.estimateGas()`
- `gasEstimate.mul(110).div(100)` is ethers v5 BigNumber — v6 uses native BigInt

### server/express-relay.js — ❌ NOT AUDITED (untracked, new file)

### server/routes/price.js — ❌ NOT AUDITED (untracked, new file)

---

## 4. Solver Node Audit

### Overall Status: ⚠️ IMPLEMENTED, CANNOT RUN (needs SolverBoard deployed)

**Architecture:** Clean separation of concerns:
- `BatchMonitor` — WebSocket event listener for `BatchPublished`/`WinnerSelected`
- `RouteOptimizer` — Multi-DEX quoting (Uniswap V3 QuoterV2, Curve, Balancer stubs)
- `BidSubmitter` — Bid construction with gas estimation, retries, RPC rotation
- `SettlementExecutor` — Route verification, settlement execution, confirmation

**Strengths:**
- WebSocket reconnection with exponential backoff
- RPC fallback rotation
- Bid retry with exponential backoff (3 attempts)
- Gas price cap (150 gwei)
- Route hash verification before settlement

**Issues:**
1. **Curve and Balancer quotes return `null`** — `getQuote('curve', ...)` and `getQuote('balancer-v2', ...)` immediately return `null`. Only Uniswap V3 works
2. **Fallback quote is fake** — `getQuoteFallback` returns `amountIn * 997 / 1000` (0.3% fee assumption), not a real quote
3. **`intentId` is a string but encoded as `BigInt`** in route hashing — type mismatch will cause encoding errors
4. **No Uniswap V4 support** — only V3 QuoterV2
5. **Single fee tier hardcoded** — `fee: 3000` (0.3%) only. Doesn't try 100, 500, 10000 fee tiers
6. **WebSocket provider** for BatchMonitor but most Arbitrum RPCs are HTTP-only — needs HTTP polling fallback

---

## 5. Frontend / HolmeSwap Audit

### HolmeSwap — ⚠️ UI-ONLY, NO REAL BLOCKCHAIN CALLS

**What's built (UI):**
- Beautiful swap card with token inputs, swap arrow, price display
- Process timeline (5 steps: Encrypt → Lock → Order → Compete → Settle)
- Encrypted intent status card
- Mempool lock visualization
- 3D scene components (Ghost character, Lock icon)
- Zustand state management (`swapStore`)
- Pyth price integration (live ETH/USDC rate via Hermes)
- Framer Motion animations
- Custom CSS variables, keyframes, glassmorphism

**What's missing (functionality):**
1. **`handleSubmit` is a `setTimeout` simulation** — no wallet connection, no contract calls
2. **No `submitEncryptedIntentWithDirectFunding` call** to GhostLockIntents contract
3. **No blocklock encryption** — should call `IntentService.encryptIntent()`
4. **No deposit flow** — users need to deposit tokens to BatchSettlement before trading
5. **No Wagmi hooks connected** — no `useWriteContract`, no `useWaitForTransactionReceipt`
6. **Token selector doesn't query real balances**
7. **No transaction confirmation or error handling**
8. **Express Relay file is a Solana copy-paste** — not applicable to EVM

### Main App (non-HolmeSwap pages) — ⚠️ MIXED

- HomePage, TradePage, AuctionPage, AnalyticsPage, DocsPage exist
- IntentSubmissionForm component exists with some Wagmi integration
- UserIntentsTable tracks on-chain intent status
- Network switcher between Arbitrum/Base Sepolia
- Wagmi config exists in `src/lib/wagmi.ts`

---

## 6. Packages & SDK Audit

### packages/core — ⚠️ TYPES ONLY

- Well-defined TypeScript interfaces (`Intent`, `Batch`, `Bid`, `Route`, `Solution`)
- Chain constants for Base Sepolia + Arbitrum One
- Contract addresses partially filled (GhostLockIntents, BatchSettlement, EpochRNG deployed; SolverRegistry and SolverBoard empty)
- **Not published as npm package** — cannot be imported via `@ghostlock/core`

### packages/blocklock — ❌ STUB

- `BlocklockService.ts` has empty method bodies (`// Implementation from existing code`)
- The real implementation lives in `src/lib/intent-service.ts`
- **Redundant** — delete and use `IntentService` directly

### packages/sdk — ❌ STUB

- `GhostLockSDK.ts` imports `@ghostlock/blocklock`, `@ghostlock/vrf-ordering`, `@ghostlock/solver-board` — none exist
- Method bodies are pseudo-code
- **Not functional** — rewrite when packages are real

---

## 7. Git Working Tree — What Changed

**Branch:** `main` (up to date with `origin/main`)  
**Staged:** Nothing  
**Summary of unstaged changes:**

### Modified Files (17)
| File | What Changed |
|------|-------------|
| `.gitignore` | Added `dist/`, `.DS_Store`, `.vscode/` |
| `README.md` | Added ASCII art trading flow diagrams |
| `package.json` | Added `@pythnetwork/express-relay-js`, `@pythnetwork/pyth-evm-js`, `onlyswaps-js`, `tailwindcss-animate`; updated `viem` and `wagmi` |
| `server/index.js` | Added price routes |
| `server/package.json` | Added Pyth dependencies |
| `src/App.tsx` | Added HolmeSwap route (`/holmeswap`) |
| `src/components/dashboard/UserIntentsTable.tsx` | `BlocklockService` → `IntentService` rename |
| `src/components/layout/Navbar.tsx` | Added HolmeSwap nav link |
| `src/hooks/useAuctionData.ts` | `BlocklockService` → `IntentService` rename |
| `src/hooks/useEpochRNG.ts` | `BlocklockService` → `IntentService` rename |
| `src/hooks/useIntentSubmission.ts` | `BlocklockService` → `IntentService` rename + cleanup |
| `src/hooks/useUserIntents.ts` | `BlocklockService` → `IntentService` rename |
| `src/index.css` | Added HolmeSwap CSS variables, animations, keyframes |
| `src/pages/DocsPage.tsx` | Fixed indentation, `BlocklockService` → `IntentService` |
| `tailwind.config.js` | Major expansion: shadcn/ui colors, HolmeSwap themes, animations |

### Deleted (16 files)
- Entire `agent-starter/` directory (OpenServ pricing agent with 553-line `PricingAgent.ts`)

### Untracked / New (18+ entries)
| Path | What It Is |
|------|-----------|
| `SECURITY_AUDIT_AND_ROADMAP.md` | Previous audit document |
| `lib/` | Smart contracts + Pyth SDK + Chainlink libs |
| `packages/` | Core types, blocklock stub, SDK stub |
| `solver-node/` | Full TypeScript solver engine |
| `src/holmeswap/` | New swap interface (26 files) |
| `src/hooks/usePythPrices.ts` | Live Pyth price hook |
| `src/hooks/usePriceFeeds.ts` | Price feed hook |
| `src/lib/intent-service.ts` | Blocklock encryption service (replaces blocklock-service.ts) |
| `src/lib/pyth-ids.ts` | Pyth price feed IDs |
| `server/ARCHITECTURE.md` | Server architecture docs |
| `server/contracts/PriceOracle.sol` | Oracle contract |
| `server/contracts/SolverBoard.sol` | Solver board contract |
| `server/contracts/SolverRegistry.sol` | Solver registry contract |
| `server/express-relay.js` | Express relay setup |
| `server/routes/price.js` | Price API route |
| `server/services/oracleAggregator.js` | Broken oracle aggregator |

---

## 8. Critical Issues & What Needs Fixing

### 🔴 P0 — Must Fix (Blockers)

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 1 | **BatchSettlement.addMarket() has no access control** | `BatchSettlement.sol:81` | Add `onlyOwner` or role-based access |
| 2 | **BatchSettlement.settleBatch() trusts caller-supplied clearing price** | `BatchSettlement.sol:107` | Integrate PriceOracle for on-chain validation |
| 3 | **BatchSettlement.settleBatch() has no caller restriction** | `BatchSettlement.sol:107` | Restrict to SolverBoard or whitelisted solvers |
| 4 | **SolverBoard + SolverRegistry not deployed** | `constants.ts:29-30` | Deploy contracts, update addresses |
| 5 | **HolmeSwap submit is fake (setTimeout)** | `HolmeSwapPage.tsx:56-70` | Wire to IntentService + GhostLockIntents contract |
| 6 | **Ethers v5/v6 mix in server** | `settlement.js:62-70` | Migrate all server code to ethers v6 syntax |
| 7 | **EpochRNG concurrent request bug** | `EpochRNG.sol:38-39` | Use mapping from `requestId → epoch` instead of single `lastRequestId` |

### 🟡 P1 — High Priority

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 8 | **OracleAggregator is broken** | `server/services/oracleAggregator.js` | Delete and rewrite as CJS |
| 9 | **Pro-rata rounding can revert** | `BatchSettlement.sol:192-217` | Add dust tolerance to invariant check |
| 10 | **Solver node Curve/Balancer quotes are stubs** | `RouteOptimizer.ts:123-126` | Implement real DEX routing or remove |
| 11 | **Express relay file is Solana code** | `src/holmeswap/lib/express_relays.tsx` | Rewrite for EVM or remove |
| 12 | **SolverRegistry slash/record is onlyOwner** | `SolverRegistry.sol:162,199` | Add SolverBoard as authorized caller |
| 13 | **Packages are stubs** | `packages/` | Either implement or remove |

### 🟢 P2 — Improvements

| # | Issue | Fix |
|---|-------|-----|
| 14 | Duplicate contracts (lib/contracts/ = server/contracts/) | Single source of truth |
| 15 | No test suite for smart contracts | Add Foundry tests |
| 16 | No CI/CD pipeline | Add GitHub Actions |
| 17 | Prototype directory is stale | Remove or archive |
| 18 | No Hardhat/Foundry config at root | Add foundry.toml |

---

## 9. What Should Be Removed

| Path | Reason |
|------|--------|
| `agent-starter/` | Already deleted in working tree. Was an OpenServ agent — not part of platform |
| `server/services/oracleAggregator.js` | Broken beyond repair (TS in JS project, non-existent imports, wrong `this` context). Rewrite from scratch |
| `src/holmeswap/lib/express_relays.tsx` | Solana code copy-paste. Not applicable to EVM |
| `packages/blocklock/BlocklockService.ts` | Empty stub. Real implementation is `src/lib/intent-service.ts` |
| `packages/sdk/GhostLockSDK.ts` | References non-existent packages. Premature abstraction |
| `prototype/` | Superseded by current `src/`. Archive or delete |
| `dist/` | Stale build artifacts. Rebuild when ready |
| `server/contracts/` (duplicates) | Keep `lib/contracts/` as source of truth, generate ABIs from there |
| `lib/chainlink/` | Full Chainlink repo clone — use `@chainlink/contracts` npm package instead |

---

## 10. External Solutions Research

### 10.1 Blocklock Encryption (randamu/dcipher) — ✅ ALREADY INTEGRATED

**What:** Threshold encryption via dcipher network. Data encrypted against future block height. Decryption key delivered automatically when condition met.

**Status in codebase:** Core of our architecture. `GhostLockIntents.sol` extends `AbstractBlocklockReceiver`. `IntentService` uses `blocklock-js` for client-side encryption.

**Deployed BlocklockSender Proxy addresses:**

| Network | Address |
|---------|---------|
| Base Sepolia | `0x82Fed730CbdeC5A2D8724F2e3b316a70A565e27e` |
| Arbitrum Sepolia | `0xd22302849a87d5B00f13e504581BC086300DA080` |
| Filecoin Mainnet | `0x34092470CC59A097d770523931E3bC179370B44b` |

**Packages:**
- `blocklock-js` (v1.0.0) — client-side encryption
- `blocklock-solidity` (v0.0.13) — on-chain contracts

**Action:** Already integrated. Improve error handling and add subscription-based funding as alternative to direct funding.

### 10.2 randamu/sealed-bid-auction-demo — 🔍 REFERENCE IMPLEMENTATION

**What:** Next.js demo of sealed-bid auction using blocklock. Encrypts bids, reveals at target block. Built with Wagmi, deployed on Base Sepolia.

**GitHub:** `github.com/randa-mu/sealed-bid-auction-demo`

**Action:** Use as reference for HolmeSwap contract interaction patterns. Their frontend → contract wiring is exactly what HolmeSwap needs.

### 10.3 Pyth Network Price Feeds — ✅ PARTIALLY INTEGRATED

**What:** Pull-based oracle with 400ms latency. Fetch `priceUpdateData` from Hermes, pass to contract for on-chain price validation.

**Status in codebase:**
- ✅ `usePythPrices.ts` — live Hermes REST prices working
- ✅ `pyth-ids.ts` — ETH/USD, USDC/USD, BTC/USD feed IDs
- ✅ `server/services/intents.js` — Pyth price fetching for clearing price reference
- ✅ `PriceOracle.sol` — Pyth integration written but not deployed
- ✅ `lib/pyth-sdk-solidity/` — SDK vendored
- ❌ On-chain price validation not wired into BatchSettlement

**Pyth contract addresses:**

| Network | Address |
|---------|---------|
| Arbitrum One | `0xff1a0f4744e8582DF1aE09D5611b887B6a12925C` |
| Base Sepolia | Available at docs.pyth.network |

**Key Feed IDs:**
- ETH/USD: `0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace`
- BTC/USD: `0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43`
- USDC/USD: `0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a`

**Packages already installed:**
- `@pythnetwork/pyth-evm-js` (v2.0.0)
- `@pythnetwork/express-relay-js` (v0.29.0)

**Action:** Deploy PriceOracle.sol. Wire into BatchSettlement for on-chain clearing price validation.

### 10.4 Chainlink Data Feeds — ⚠️ WRITTEN, NOT DEPLOYED

**What:** Push-based decentralized oracle. Nodes update price feeds at intervals or deviation thresholds. Most battle-tested oracle.

**Status in codebase:**
- ✅ `PriceOracle.sol` uses `AggregatorV3Interface`
- ❌ No Chainlink feed addresses configured
- ❌ `lib/chainlink/` is a full repo clone (wasteful)

**Key addresses on Arbitrum:**

| Feed | Network | Address |
|------|---------|---------|
| ETH/USD | Arbitrum One | Via docs.chain.link |
| ARB/USD | Arbitrum One | `0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6` |

**Action:** Use `@chainlink/contracts` npm package instead of vendored clone. Configure feed addresses in PriceOracle deployment.

### 10.5 Chainlink VRF v2.5 — 🔄 ALTERNATIVE TO CURRENT VRF

**What:** Cryptographically provable on-chain randomness. VRF coordinator generates random number + proof, verified on-chain.

**Current approach:** EpochRNG uses randamu/dcipher's `RandomnessReceiverBase`. This is fine for Base Sepolia where dcipher is deployed. However, Chainlink VRF is more widely available.

**Chainlink VRF on Arbitrum:**

| Component | Address |
|-----------|---------|
| VRF Coordinator (Arbitrum One) | `0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e` |
| VRF Coordinator (Arbitrum Sepolia) | `0x5CE8D5A2BC84beb22a398CCA51996F7930313D61` |
| LINK Token (Arbitrum Sepolia) | `0xb1D4538B4571d411F07960EF2838Ce337FE1E80E` |

**Action:** Keep dcipher VRF as primary (already working). Add Chainlink VRF as fallback for networks where dcipher isn't available. Write `EpochRNG_Chainlink.sol` adapter.

### 10.6 Pyth Express Relay — 🔍 NOT YET INTEGRATED

**What:** Off-chain auction where searchers bid for priority access to protocol operations. Captures MEV and returns it to protocols/users.

**How it works:**
1. Protocols mark operations as Express Relay-gated
2. Searchers discover opportunities via WebSocket/HTTP
3. Searchers submit bids in off-chain auction
4. Winning bids forwarded on-chain
5. Revenue distributed to protocols

**Status in codebase:** `@pythnetwork/express-relay-js` is installed. `express_relays.tsx` is a non-functional Solana code paste.

**Express Relay API:** `https://per-mainnet.dourolabs.app`

**Action:** Evaluate if Express Relay should replace or complement our SolverBoard auction. Their model is parallel to our solver competition — searchers bid for settlement rights. Could use as external solver routing layer.

### 10.7 Uniswap V4 Hooks — 🆕 NOT INTEGRATED, HIGH VALUE

**What:** Custom Solidity logic at pool lifecycle points (`beforeSwap`, `afterSwap`). Enables programmable MEV protection at the AMM level.

**Key MEV protection hooks:**

| Hook | What It Does | GitHub |
|------|-------------|--------|
| **Detoxer** | 4 dynamic fee strategies penalizing MEV bots | `github.com/web3yurii/detoxer` |
| **Privacy Hook** | ZK-SNARK privacy for depositors | `github.com/blackbera/privacy-hook-univ4` |
| **MEVChargeHook** | Cooldown + dynamic fees | `github.com/mrlightspeed/mevchargehook` |
| **Async Swap Hook** | Deferred execution | Official Uniswap docs |

**Uniswap V4 PoolManager addresses:**

| Network | Address |
|---------|---------|
| Arbitrum One | `0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32` |
| Base | `0x498581fF718922c3f8e6A244956aF099B2652b2b` |

**Packages:**
- `@uniswap/v4-periphery` (v1.0.2)
- `@uniswap/v4-core`

**Action:** Build a GhostLock V4 Hook that uses `beforeSwap` to validate oracle prices and `afterSwap` to detect sandwich patterns. This provides execution-layer MEV protection on top of our encryption layer.

### 10.8 CoW Protocol Architecture — 🔍 REFERENCE MODEL

**What:** Batch auction system. Users sign EIP-712 orders (gasless), solvers compete to find optimal execution, uniform directional clearing prices.

**Key learnings for GhostLock:**
- **Gasless orders** via EIP-712 + Permit2 — we should adopt this
- **Solver competition protocol** — their Autopilot broadcasts batches every few seconds
- **Uniform clearing prices** — we already have this
- **GPv2Settlement** contract pattern

**Packages:** `@cowprotocol/cow-sdk` (v5.10.3)

**GPv2Settlement on Arbitrum:** `0x9008D19f58AAbD9eD0D60971565AA8510560ab41`

**Action:** Study their solver API spec. Our SolverBoard design is already similar. Could add CoW as an execution route for our solver node.

### 10.9 Flashbots Protect RPC — ⚠️ L1 ONLY

**What:** Private transaction relay hiding txs from public mempool.

**Limitation:** Ethereum L1 only. Does NOT work on Arbitrum (centralized sequencer, no public mempool in traditional sense).

**Action:** Not applicable for Arbitrum swaps. Potentially useful for L1 bridging transactions. Arbitrum's sequencer FCFS ordering already provides baseline MEV protection.

### 10.10 OnlySwaps — 🔍 INSTALLED BUT NOT USED

**What:** `onlyswaps-js` is installed in `package.json` (v1.0.8). Appears to be a swap routing/settlement library.

**Status:** Package installed but never imported anywhere in the codebase.

**Action:** Investigate what `onlyswaps-js` provides. If it's a routing layer, integrate into solver node's `RouteOptimizer`.

### 10.11 Intent-Based Architecture Standards — 🔍 REFERENCE

| Standard | What | Relevance |
|----------|------|-----------|
| **ERC-7683** | Cross-chain intent settlement | Settlement contract interface |
| **ERC-4337** | Account abstraction | Gasless intent signing |
| **EIP-712** | Typed structured data signing | Order signature format |
| **Permit2** | Universal token approvals | Single approval for all tokens |

**Action:** Adopt EIP-712 for order signing. Implement Permit2 for token approvals (eliminates per-token approve tx).

---

## 11. Integration Architecture

### Target Architecture: 6-Layer MEV Protection Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER INTERFACE (HolmeSwap)                 │
│  Wallet Connect → Token Select → Amount → Sign EIP-712 Intent  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│              LAYER 1: ENCRYPT (blocklock-js + dcipher)          │
│  Intent encrypted against future block height                   │
│  Privacy: padding + dummy intents + uniform ciphertext sizes    │
│  Contract: GhostLockIntents.sol (deployed)                      │
└─────────────────────┬───────────────────────────────────────────┘
                      │ dcipher delivers decryption key at target block
┌─────────────────────▼───────────────────────────────────────────┐
│              LAYER 2: RANDOMIZE (EpochRNG + VRF)                │
│  Per-epoch randomness from dcipher / Chainlink VRF              │
│  Deterministic seed-based intent ordering                       │
│  Contract: EpochRNG.sol (deployed)                              │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│              LAYER 3: VALIDATE (PriceOracle)                    │
│  Pyth (primary, 400ms) + Chainlink (secondary, 1hr)            │
│  Cross-oracle price manipulation detection                      │
│  Contract: PriceOracle.sol (to deploy)                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│              LAYER 4: COMPETE (SolverBoard)                     │
│  Registered solvers (bonded via SolverRegistry) bid on batches  │
│  Highest-surplus solver wins execution rights                   │
│  Slashing for failed settlements                                │
│  Contracts: SolverBoard.sol + SolverRegistry.sol (to deploy)    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│              LAYER 5: EXECUTE (Route Optimization)              │
│  Solver routes through: Uniswap V3/V4 → Curve → Balancer       │
│  Optional: Uniswap V4 Hook with dynamic anti-MEV fees          │
│  Node: solver-node/src/RouteOptimizer.ts                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│              LAYER 6: SETTLE (BatchSettlement)                  │
│  Uniform clearing price for all same-direction trades           │
│  Pro-rata fills when imbalanced                                 │
│  Oracle-validated prices                                        │
│  Contract: BatchSettlement.sol (deployed, needs hardening)      │
└─────────────────────────────────────────────────────────────────┘
```

### Network Deployment Plan

| Contract | Base Sepolia | Arbitrum Sepolia | Arbitrum One |
|----------|:----------:|:---------------:|:----------:|
| GhostLockIntents | ✅ Deployed | ⬜ To deploy | ⬜ Phase 3 |
| BatchSettlement | ✅ Deployed | ⬜ To deploy | ⬜ Phase 3 |
| EpochRNG | ✅ Deployed | ⬜ To deploy | ⬜ Phase 3 |
| SolverBoard | ⬜ To deploy | ⬜ To deploy | ⬜ Phase 3 |
| SolverRegistry | ⬜ To deploy | ⬜ To deploy | ⬜ Phase 3 |
| PriceOracle | ⬜ To deploy | ⬜ To deploy | ⬜ Phase 3 |
| Liveness | ⬜ To deploy | ⬜ To deploy | ⬜ Phase 3 |
| GhostLock V4 Hook | ⬜ Phase 2 | ⬜ Phase 2 | ⬜ Phase 3 |

### External Service Dependencies

| Service | Network | Purpose | Status |
|---------|---------|---------|--------|
| dcipher BlocklockSender | Base Sepolia, Arb Sepolia | Threshold encryption/decryption | ✅ Available |
| dcipher RandomnessSender | Base Sepolia | VRF randomness | ✅ Available |
| Pyth Hermes | All networks | Real-time price feeds | ✅ Available |
| Pyth on-chain | Arbitrum, Base | Price feed verification | ✅ Available |
| Chainlink VRF | Arbitrum Sepolia | Fallback randomness | ✅ Available |
| Chainlink Feeds | Arbitrum, Base | Secondary price oracle | ✅ Available |
| Uniswap V4 PoolManager | Arbitrum, Base | Execution layer | ✅ Available |

---

## 12. Implementation Phases

### Phase 1: Foundation Hardening (Weeks 1-2)

**Goal:** Fix critical issues, deploy missing contracts, wire HolmeSwap to real blockchain.

#### Smart Contracts
- [ ] Fix `BatchSettlement.addMarket()` — add `onlyOwner`
- [ ] Fix `BatchSettlement.settleBatch()` — restrict to SolverBoard
- [ ] Add on-chain price validation (integrate PriceOracle)
- [ ] Fix pro-rata rounding (add dust tolerance)
- [ ] Fix `EpochRNG` concurrent request bug (use requestId → epoch mapping)
- [ ] Deploy `SolverRegistry` to Base Sepolia
- [ ] Deploy `SolverBoard` to Base Sepolia
- [ ] Deploy `PriceOracle` to Base Sepolia (configure Pyth + Chainlink feeds)
- [ ] Deploy `Liveness` to Base Sepolia
- [ ] Write Foundry deployment scripts for all contracts
- [ ] Add `foundry.toml` at project root

#### Server
- [ ] Fix ethers v5 → v6 migration in `settlement.js`
- [ ] Delete broken `oracleAggregator.js`, rewrite as CJS
- [ ] Integrate solver service with deployed SolverBoard

#### Frontend (HolmeSwap)
- [ ] Wire `handleSubmit` to real flow: connect wallet → encrypt intent → submit to GhostLockIntents contract
- [ ] Add deposit flow (deposit tokens to BatchSettlement before trading)
- [ ] Connect Wagmi hooks (`useWriteContract`, `useWaitForTransactionReceipt`)
- [ ] Display real transaction status (pending → confirmed → encrypted → revealed → settled)
- [ ] Show real token balances

#### Cleanup
- [ ] Remove `prototype/` directory
- [ ] Remove `dist/` (will be regenerated)
- [ ] Remove `packages/blocklock/` stub (use `IntentService` directly)
- [ ] Remove `packages/sdk/` stub
- [ ] Remove `lib/chainlink/` clone (use npm package)
- [ ] Remove `src/holmeswap/lib/express_relays.tsx`
- [ ] Consolidate duplicate contracts (`lib/contracts/` = single source)
- [ ] Delete `server/services/oracleAggregator.js`

### Phase 2: Advanced Integration (Weeks 3-4)

**Goal:** Multi-DEX routing, V4 hooks, Arbitrum Sepolia deployment.

#### Uniswap V4 Hook
- [ ] Build `GhostLockHook.sol` extending `BaseHook`
- [ ] Implement `beforeSwap` — oracle price validation (reject manipulated prices)
- [ ] Implement `afterSwap` — sandwich pattern detection + dynamic fee penalty
- [ ] Use `HookMiner.sol` for correct deployment address
- [ ] Deploy on Base Sepolia and test with PoolManager

#### Solver Node
- [ ] Implement real Curve and Balancer routing (or remove stubs)
- [ ] Add Uniswap V4 routing support
- [ ] Try multiple fee tiers for V3 quotes (100, 500, 3000, 10000)
- [ ] Add HTTP polling fallback for BatchMonitor (not all RPCs support WebSocket)
- [ ] Fix `intentId` type mismatch in route hashing
- [ ] Investigate and integrate `onlyswaps-js` if useful

#### Multi-Network
- [ ] Deploy all contracts to Arbitrum Sepolia
- [ ] Update `packages/core/constants.ts` with all deployed addresses
- [ ] Test cross-network solver operation
- [ ] Add Chainlink VRF fallback for Arbitrum (`EpochRNG_Chainlink.sol`)

#### Price Oracle Enhancement
- [ ] Deploy PriceOracle on both networks
- [ ] Configure Pyth + Chainlink feed addresses
- [ ] Add cross-oracle deviation detection
- [ ] Wire BatchSettlement to validate clearing prices against PriceOracle

### Phase 3: Production Readiness (Weeks 5-8)

**Goal:** Audit, testing, Arbitrum One deployment, solver competition launch.

#### Testing
- [ ] Foundry unit tests for all contracts
- [ ] Integration tests: full intent lifecycle (encrypt → reveal → batch → settle)
- [ ] Solver competition simulation (multiple solver nodes bidding)
- [ ] Edge cases: epoch seed failures, oracle stale prices, rounding edge cases
- [ ] Load testing: concurrent intent submissions

#### Security
- [ ] Fix all issues from `SECURITY_AUDIT_AND_ROADMAP.md`
- [ ] External audit of critical contracts (BatchSettlement, SolverBoard)
- [ ] Implement Liveness guarantees (force-reveal, bond slashing)
- [ ] Add emergency pause mechanism

#### Solver Competition
- [ ] Launch solver registration (minimum 1 ETH bond)
- [ ] Document solver API for external participants
- [ ] Reputation-based solver ordering for tie-breaking
- [ ] Public solver dashboard

#### EIP-712 + Permit2
- [ ] Implement EIP-712 typed order signing (gasless intents)
- [ ] Integrate Permit2 for universal token approvals
- [ ] Reduce user transaction count from 3 (approve + deposit + submit) to 1 (sign)

#### Arbitrum One
- [ ] Deploy all contracts to Arbitrum One
- [ ] Configure mainnet oracle feeds
- [ ] Launch with limited token pairs (ETH/USDC, WBTC/USDC)
- [ ] Gradual rollout with conservative parameters

---

## 13. Open Questions

1. **Should we use Pyth Express Relay as our solver auction layer?** Their architecture parallels our SolverBoard. Using Express Relay would give us access to their existing searcher network, but we'd lose customization over the auction mechanism.

2. **Chainlink VRF vs dcipher randomness?** dcipher is already integrated and works on Base Sepolia. Chainlink VRF is more widely deployed. Should we support both, or standardize on one?

3. **What does `onlyswaps-js` provide?** The package is installed but unused. Need to investigate if it's a routing library, a swap SDK, or something else entirely.

4. **Should the Liveness contract replace GhostLockIntents?** Liveness.sol is a superset — it adds bonding, force-reveal, and slashing on top of the same blocklock encryption. Could consolidate.

5. **How aggressive should V4 hook fees be?** Detoxer's research shows 2-5% fees on sandwich attackers work. But aggressive fees might deter legitimate high-frequency traders.

6. **Redis dependency for the server queue** — is Redis deployed in production? If not, the queue system needs an alternative (in-memory, SQLite, or on-chain events).

7. **AI clearing price computation** — the server calls `localhost:4800/api/ai/compute`. Is this an actual ML model? What's the confidence threshold? Should this be optional or core?

8. **Multi-chain settlement** — if a user submits intent on Base Sepolia but liquidity is better on Arbitrum, should solvers cross-chain route? This requires bridging infrastructure.

---

> **Last Updated:** 2026-03-01  
> **Authors:** GhostLock MEV Reaper Team  
> **Status:** Living document — update as implementation progresses
