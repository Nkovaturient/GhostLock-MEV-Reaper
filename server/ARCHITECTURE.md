# GhostLock MEV Reaper Server Architecture

## Directory Structure Overview

### 📁 Root Files

**`index.js`** - Main entry point
- Initializes Express server with CORS, JSON parsing
- Registers all API routes
- Initializes solver service, intent watcher, and scheduler
- Starts HTTP server on port 4800
- Health check endpoint

**`config.js`** - Centralized configuration
- Contract addresses (GhostLockIntents, BatchSettlement, EpochRNG)
- Network settings (RPC URLs, chain IDs)
- Auction parameters (epoch duration, settlement delays)
- Solver settings (gas limits, retries)
- Price feed configuration (Pyth, Coinbase, CoinGecko)
- AI/ML settings (OpenServ integration)
- Scheduler intervals
- RPC rate limiting config
- Watcher settings
- Redis connection

**`package.json`** - Dependencies
- Express, ethers.js, ioredis, axios, cors
- OpenServ SDK for AI integration
- Prometheus client for metrics

---

### 📁 `/routes` - API Endpoints

**`auctions.js`** - Auction data endpoints
- `GET /api/auctions` - List all active auctions with clearing prices
- `GET /api/auctions/:id` - Get specific auction details
- `GET /api/auctions/solver/status` - Solver service status
- Caches auction data for 30 seconds
- Groups intents by market-epoch pairs
- Computes uniform clearing prices

**`intents.js`** - Intent management endpoints
- `GET /api/intents` - List all ready intents
- `GET /api/intents/:requestId` - Get specific intent details
- `POST /api/intents/submit` - Submit new intent (frontend integration)
- Fetches intents from blockchain
- Filters by status, epoch, market

**`markets.js`** - Market data endpoints
- `GET /api/markets` - List all supported markets
- `GET /api/markets/:id` - Get market details
- Market depth calculations
- Trading pair information

**`mev.js`** - MEV analytics endpoints
- `GET /api/mev` - Comprehensive MEV data
- `GET /api/mev/global` - Global MEV statistics
- `GET /api/mev/types` - MEV type breakdown
- `GET /api/mev/transactions` - Recent MEV transactions
- Integrates with ZeroMEV API
- Caches data for 1 minute
- Retry logic with exponential backoff

**`ai.js`** - AI-powered clearing price endpoints
- `POST /api/ai/clearing-price` - Get AI-suggested clearing price
- Integrates with OpenServ AI agent
- Fallback to heuristic if AI unavailable
- Confidence threshold validation

**`external.js`** - External data aggregation
- `GET /api/external/price/:symbol` - Fetch price from multiple sources
- Supports Pyth, Coinbase, CoinGecko
- Price aggregation and validation

**`network-stats.js`** - Network statistics
- `GET /netstats` - Current network metrics
- Block number, gas prices, network utilization

---

### 📁 `/services` - Core Business Logic

**`solver.js`** - Main settlement orchestrator
- **SolverService class** - Central coordinator
- `initialize()` - Sets up provider, signer, verifies contracts
- `start()` - Begins settlement loop
- `processSettlements()` - Main settlement processing
  - Dequeues request IDs from Redis
  - Fetches ready intents from blockchain
  - Groups by market-epoch
  - Validates batches
  - Ensures epoch seeds exist
  - Computes clearing prices
  - Executes batch settlements
- `ensureEpochSeed()` - Requests VRF randomness for fair ordering
- `requestEpochSeed()` - Calls EpochRNG contract
- `waitForEpochSeed()` - Polls until seed available
- Tracks settlement statistics

**`intents-watcher.js`** - Blockchain event listener
- **startIntentWatcher()** - Main watcher function
- Listens for `IntentReady` events from GhostLockIntents contract
- Rate-limited log polling (50 blocks per batch)
- Handles large catch-up gaps (>10k blocks)
- Enqueues request IDs to Redis queue
- **ensureEpochSeedForIntent()** - Requests epoch seed when intent detected
- Exponential backoff on rate limits
- Block-based event processing with reorg tolerance

**`scheduler.js`** - Periodic task manager
- **SchedulerService class** - Task coordinator
- `start()` - Initializes all scheduled tasks
- `startSettlementCheck()` - Runs every 30s, calls solver.processSettlements()
- `startHealthCheck()` - Runs every 5min, checks solver balance/status
- `startPriceUpdate()` - Runs every 60s, updates price feeds
- Manages task lifecycle (start/stop/remove)

**`intents.js`** - Intent data fetching
- `fetchReadyIntents()` - Reads intents from blockchain contract
- Rate-limited RPC calls (1 req/2s)
- Decodes encrypted intent data
- Filters by epoch, market, status
- `groupIntentsByMarketEpoch()` - Groups for batch processing
- `filterRealIntents()` - Removes dummy intents
- `analyzePrivacyMetrics()` - Calculates privacy scores
- `fetchReferencePrice()` - Gets external price feeds

**`price.js`** - Clearing price computation
- `computeUniformClearingPrice()` - Main pricing algorithm
  - Finds price that minimizes buy/sell imbalance
  - Uses reference price as tie-breaker
  - Uses epoch seed for provable ordering
  - Supports AI-assisted pricing
- `computeAIClearingPrice()` - AI-powered price suggestion
- `computeHeuristicClearingPrice()` - Fallback algorithm
- `computeMarketDepth()` - Order book depth analysis

**`settlement.js` - Settlement transaction execution
- `settleBatchTx()` - Executes batch settlement on-chain
- `simulateSettlementTx()` - Dry-run before execution
- `isBatchReadyForSettlement()` - Validates settlement conditions
- `validateBatchConsistency()` - Ensures all intents match epoch/market
- `createSolverSigner()` - Creates wallet signer from private key

---

### 📁 `/utils` - Utility Functions

**`queue.js`** - Redis queue management
- `enqueueRequestId()` - Pushes request ID to Redis list (FIFO)
- `dequeueRequestId()` - Pops request ID from queue
- Uses Redis list: `ghostlock:readyRequests`

**`metrics.js`** - Prometheus metrics
- Exposes `/metrics` endpoint
- Tracks settlement count, solver balance
- Standard Node.js metrics (CPU, memory, etc.)

---

### 📁 `/contracts` - Smart Contract Definitions

**`ABI.js`** - Contract ABIs
- GhostLockIntents ABI
- BatchSettlement ABI
- EpochRNG ABI
- Used for contract interactions

**`GhostLockIntents.sol`** - Intent submission contract
- Users submit encrypted intents
- Decryption at unlock block
- IntentReady events emitted

**`BatchSettlement.sol`** - Settlement execution contract
- Uniform-price batch auctions
- Requires epoch seed for fair ordering
- Pro-rata fills

**`EpochRNG.sol`** - Randomness for fair ordering
- Requests VRF randomness per epoch
- Stores epoch seeds
- Used to randomize intent execution order

**`Liveness.sol`** - Liveness checks
- Ensures solver is active
- Heartbeat mechanism

**`MockToken.sol`** - Test tokens
- Mock ETH, USDC for testing

---

## Data Flow Architecture

### 1. Intent Submission Flow
```
Frontend → POST /api/intents/submit
  ↓
Routes/intents.js
  ↓
User submits encrypted intent to GhostLockIntents contract
  ↓
IntentReady event emitted
  ↓
intents-watcher.js detects event
  ↓
Enqueues requestId to Redis queue
  ↓
Requests epoch seed for that epoch (if needed)
```

### 2. Settlement Processing Flow
```
Scheduler (every 30s) → solver.processSettlements()
  ↓
Dequeue request IDs from Redis
  ↓
Fetch ready intents from blockchain
  ↓
Group by market-epoch pairs
  ↓
For each batch:
  ├─ Validate batch consistency
  ├─ Check if ready for settlement
  ├─ Ensure epoch seed exists (request if needed)
  ├─ Compute clearing price (AI-assisted or heuristic)
  ├─ Sort intents by epoch seed (fair ordering)
  └─ Execute batch settlement transaction
```

### 3. Price Discovery Flow
```
Routes/auctions.js → fetchAuctionData()
  ↓
services/intents.js → fetchReadyIntents()
  ↓
services/price.js → computeUniformClearingPrice()
  ├─ Fetch reference price (Pyth/Coinbase/CoinGecko)
  ├─ Optionally: AI-assisted pricing (OpenServ)
  └─ Calculate uniform clearing price
  ↓
Return auction data with clearing prices
```

### 4. Epoch Seed Request Flow
```
IntentReady event detected
  ↓
intents-watcher.js → ensureEpochSeedForIntent()
  ↓
Check if seed exists for epoch
  ↓
If not, solver.requestEpochSeed()
  ↓
Call EpochRNG.requestEpochSeed() on-chain
  ↓
VRF callback provides randomness
  ↓
Seed stored in contract
  ↓
Used for fair intent ordering during settlement
```

---

## Component Interactions

```
┌─────────────────────────────────────────────────────────────┐
│                      Express Server                         │
│                         (index.js)                          │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   ┌─────────┐        ┌──────────┐       ┌──────────┐
   │ Routes  │        │ Services │       │  Utils   │
   └─────────┘        └──────────┘       └──────────┘
        │                   │                   │
        │                   │                   │
   ┌────┴────┐         ┌─────┴─────┐      ┌─────┴─────┐
   │         │         │           │      │           │
   ▼         ▼         ▼           ▼      ▼           ▼
auctions  intents  solver   intents-  queue   metrics
markets   mev      price    watcher  (Redis)
ai        external settlement scheduler
```

---

## Key Design Patterns

1. **Event-Driven Architecture**: IntentReady events trigger processing
2. **Queue-Based Processing**: Redis queue decouples event detection from settlement
3. **Rate Limiting**: Protects against RPC provider limits
4. **Caching**: Auction data cached for 30s, MEV data for 60s
5. **Retry Logic**: Exponential backoff for failed operations
6. **Graceful Degradation**: Falls back to heuristic if AI unavailable
7. **Fair Ordering**: Epoch seeds ensure MEV-resistant intent ordering

---

## External Dependencies

- **Blockchain**: Base Sepolia (or configured network)
- **Redis**: Queue storage and state persistence
- **OpenServ**: AI-powered clearing price suggestions
- **ZeroMEV API**: MEV analytics data
- **Price Feeds**: Pyth Network, Coinbase, CoinGecko

