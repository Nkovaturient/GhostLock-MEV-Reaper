# GhostLock: MEV Reaper <img src="https://img.shields.io/badge/Randamu%20Inc-blue" alt="Randamu Inc" /> <img src="https://img.shields.io/badge/Dcipher%20Network-orange" alt="Dcipher Network" /> <img src="https://img.shields.io/badge/Drand-indigo" alt="Drand" />

A stealth shield against MEV, encrypting trades and settling them fair.

## Glance [Sherlock Holmes of DeFi]

| Live | YouTube | Blog |
| --- | --- | --- |
| [Preview](https://ghostlock.vercel.app/) 🟢 | [Demo](https://youtu.be/plceuO9AG8c) 🎥 | [Hashnode](https://randomticks.hashnode.dev/ghostlock-mev-reaper) 📝 |


<img width="1500" height="600" alt="ChatGPT Image Aug 30, 2025, 09_57_54 PM" src="https://github.com/user-attachments/assets/71315e2c-3956-495f-8739-fa2d08d45ac0" />

## 🛡️ Overview

**ENCRYPT → RANDOMIZE → EQUALIZE** on **Arbitrum Sepolia** (testnet) and **Arbitrum One** (mainnet-ready). HolmeSwap at `/holmeswap` submits encrypted intents to `GhostLockLiveness`. Self-hosted dcipher: [docs/DCIPHER-OPS.md](docs/DCIPHER-OPS.md).

![GhostLock Banner](https://github.com/user-attachments/assets/8b445ad2-000e-404b-afeb-6e77991f677a)

## What is MEV, anyway?

- In theory, validators control MEV because they decide what goes into a block and in what order. In practice, they outsource the hard work to searchers. Searchers detect MEV opportunities, compete to execute them, and bribe validators via gas fees for inclusion priority. Validators still win because competition forces searchers to hand over most of the profit just to get included.

- **MEV is not “lost” by validators. It is auctioned off.**

```  
┌──────────────┐      observe state       ┌──────────────┐      submit tx + gas bid     ┌──────────────┐     include + order tx     ┌────────────────┐
│  Blockchain  │ ──────────────────────▶  │   Searchers  │ ───────────────────────────▶ │  Validators  │ ─────────────────────────▶ │ Block Execution│
│              │   (state, mempool,       │              │   (priority fee / bribe)     │              │   (tx ordering & inclusion)│                │
│              │    blocks)               │  bots + algos│                              │ block makers │                            │                │
└──────────────┘                          └──────────────┘                              └──────────────┘                            └────────────────┘

```

## Between-Block MEV Problem

| Normal On-chain World | MEV-Distorted World |
| --- | --- |
| Validators extend the chain honestly because future rewards exceed attacking past blocks. | Rewriting history becomes more profitable than extending it. |
| 
```
Block N produced
↓
Block N+1 builds on it
↓
Finality increases
↓
Consensus stable
```
| 
```
Block N contains large MEV
↓
Validator evaluates:
MEV(N) > Reward(N+1)
↓
Reorg becomes profitable
↓
Validator re-mines Block N
↓
Extracts MEV
↓
Original Block N discarded
```
|



## ✨ Key Features

### 3-Layer MEV Protection Strategy

1. **🔒 ENCRYPT (Layer 1)**: Blocklock time-locked encryption hides trading intents until execution block
2. **🎲 RANDOMIZE (Layer 2)**: EpochRNG VRF-based fair ordering prevents sandwich attacks via deterministic randomization
3. **⚡ EQUALIZE (Layer 3)**: Batch auctions with uniform pricing eliminate front-running opportunities and price manipulations.

### Additional Features

- **🤖 Trade Intents Settlement**: Automated solver with AI-optimized clearing prices
- **📊 Transparency Panel**: Gas estimates, unlock block ETA, expected receive amounts via 1inch API
- **💳 Mock ERC-20 Tokens**: ETH, USDC, WETH for development and testing
- **🌐 Multi-Chain**: Deployed on Base Sepolia (testnet) and Arbitrum One (mainnet-ready)  


## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS with custom design system
- **Animations**: Framer Motion + Three.js for 3D components
- **Web3**: Wagmi + RainbowKit for wallet integration
- **State**: Zustand for client state management

### Backend (Node.js + Express)
- **Runtime**: Node.js with Express framework
- **Blockchain**: Ethers.js for smart contract interaction
- **APIs**: RESTful API design with comprehensive endpoints
- **Solver Service**: Automated batch settlement with epoch seed management (Layer 2)
- **Scheduler**: Proactive epoch seed monitoring and VRF request handling
- **Real-time**: WebSocket support for live updates

### Smart Contracts (Solidity)
- **GhostLockIntents**: Manages encrypted trading intents
- **EpochRNG**: Provides verifiable randomness for fair ordering
- **BatchSettlement**: Handles uniform-price batch auctions
- **MockTokens**: Test tokens for development and testing

### Layer 2: EpochRNG Randomization

**Purpose**: Prevents sandwich attacks by randomizing intent execution order using verifiable randomness.

**How it works**:
1. Backend solver automatically requests VRF seed from Drand network via EpochRNG contract for each epoch
2. When intents are decrypted (after Layer 1), solver ensures epoch seed exists before processing
3. Intents are grouped by epoch and ordered deterministically using `keccak256(epochSeed || requestId || user)`
4. This creates fair, unbiased sequencing that attackers cannot predict or manipulate
5. Same seed always produces same order → verifiable and deterministic

**Implementation**:
- **Backend**: `solver.js` automatically requests epoch seeds, waits for VRF callback, then orders intents
- **Backend**: `scheduler.js` proactively monitors and pre-requests seeds for upcoming epochs
- **Frontend**: `useEpochRNG` hook reads seeds for display, `useAutoEpochSeedRequest` monitors availability (read-only)
- **Utilities**: `epoch-ordering.ts` provides deterministic comparison functions matching backend logic

**Tackles**:
- ✅ Sandwich attacks (can't predict order to insert front/back-run)
- ✅ Front-running (order is randomized, not first-come-first-served)
- ✅ MEV extraction via sequencing manipulation

## ⚔️ How GhostLock is Different

**Compared to other MEV-resistant efforts, GhostLock stands apart:**

- **Flashbots / SUAVE**  
  - Focus: private mempools + off-chain transaction sequencing.  
  - Limitation: requires trust in relays / builders; opaque order-flow markets.  
  - **GhostLock advantage**: no trusted relay; instead, ciphertexts are *natively encrypted on-chain* and decrypted only after safe block height. No privileged actors.

- **CoW Protocol**  
  - Focus: batch auctions with solver competition.  
  - Limitation: intents visible before clearing → still exploitable; solvers can extract flow.  
  - **GhostLock advantage**: adds **3-layer protection (ENCRYPT + RANDOMIZE + EQUALIZE)**, so intents remain hidden until reveal, then shuffled via VRF to remove sequencing edge, then settled uniformly. GhostLock inherits batch auction fairness but *eliminates pre-reveal leakage and sequencing manipulation*.

- **MEV-Boost / PBS**  
  - Focus: splitting block builders and proposers.  
  - Limitation: improves validator decentralization but not user-level trade protection.  
  - **GhostLock advantage**: *user-first MEV protection*, solving leakage at the transaction level.

- **Secret Network / TEEs**  
  - Focus: hardware-enforced secrecy.  
  - Limitation: trust in hardware enclaves, supply-chain risk.  
  - **GhostLock advantage**: cryptographic, open, and verifiable; no hardware black box.


## ⚠️ Limitations & Edge Cases

- **Decryption timing mismatch**: If unlock block < inclusion block, could allow premature reveal. Mitigation → safety margins + epoch alignment.  
- **Solver centralization**: Current AI call is centralized; roadmap includes **solver marketplace + bond/slashing** to prevent manipulation.  
- **Metadata leakage**: Ciphertext size/timing may leak info. Roadmap → padding + dummy intents.  
- **Latency vs UX tradeoff**: Batch auctions add delay (~minutes). Mitigation → deploy on L2 for faster block times.  
- **Oracle/API dependency**: Reliance on 1inch & external VRF oracles. Add fallback quoting + distributed randomness in roadmap.  


## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm


### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/ghostlock-mev-reaper.git
cd ghostlock-mev-reaper
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..
```

3. **Environment Setup**
```bash
# Copy environment files
cp .env.example .env
cp server/.env.example server/.env

# Update with your configuration
# - Add your WalletConnect Project ID
# - Configure RPC URLs
# - Set contract addresses (after deployment)
```

4. **Start Development Servers**
```bash
# Terminal 1: Start frontend
npm run dev

# Terminal 2: Start backend API
npm run server
```

5. **Access the Application locally**
   
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4800`
- Health Check: [Preview](https://ghost-lock-mev-reaper.vercel.app/health)
- Peak the server here 👀: [Preview](https://ghost-lock-mev-reaper.vercel.app/)

## 📋 Smart Contract Deployment

### **Arbitrum Sepolia (Testnet)**

- [Arbitrum Sepolia Faucet](https://www.alchemy.com/faucets/arbitrum-sepolia)
- [PriceOracle](https://sepolia.arbiscan.io/address/0x86c4023741467c3179683ed152471921DC2D48BC) - `0x86c4023741467c3179683ed152471921DC2D48BC`
- [SolverRegistry](https://sepolia.arbiscan.io/address/0x3302E3d04d166C6D23E5B09a29a8eE3d2C7Baf98) - `0x3302E3d04d166C6D23E5B09a29a8eE3d2C7Baf98`
- [DrandBeacon](https://sepolia.arbiscan.io/address/0x74FBA5163505e43634F366c52C92824C23027076) - `0x74FBA5163505e43634F366c52C92824C23027076`
- [GhostLockEpochRNG](https://sepolia.arbiscan.io/address/0x73A35514Ab9405381A323c513220e20ACb9d7c30) - `0x73A35514Ab9405381A323c513220e20ACb9d7c30`
- [GhostLockLiveness](https://sepolia.arbiscan.io/address/0x9c3772c9B2E8ae8A074aa9Fc8Aaa4943e0ffC983) - `0x9c3772c9B2E8ae8A074aa9Fc8Aaa4943e0ffC983`
- [BatchSettlement](https://sepolia.arbiscan.io/address/0x926349E53527f690E25CF9C5d60e8791985aD14E) - `0x926349E53527f690E25CF9C5d60e8791985aD14E`
- [SolverBoard](https://sepolia.arbiscan.io/address/0xB1A20FFFf4E4e15c0735fc0a79ad8BB8F3909916) - `0xB1A20FFFf4E4e15c0735fc0a79ad8BB8F3909916`

### **Arbitrum One (Mainnet)**

- [GHOSTLOCK_INTENTS](https://arbiscan.io/address/0x2Ad463E1f6783e610504A1027D6AdE8b2DcF10b2) - `0x2Ad463E1f6783e610504A1027D6AdE8b2DcF10b2`
- [EPOCH_RNG](https://arbiscan.io/address/0x96EE446A832b7AdcF598C4B2340131f622677c25) - `0x96EE446A832b7AdcF598C4B2340131f622677c25`  

## Future Roadmap

<!-- - **On-chain verified randomness Intefrations** → Calling the Drand( VRF) verification baked directly into EpochRNG contracts, so ordering proofs are trustless. -->
- Batch auctions with uniform pricing - Solver Competiton board
- **Liveness guarantees** → Bond + slashing for missed reveals, fallback threshold revealers, and permissionless settlement calls so no one can grief the auction.
<!-- - **Privacy hardening** → Add ciphertext(intent) padding, dummy intents, and batch-only publication so metadata leakage doesn’t kill the whole “encrypted” vibe. -->


<!--
## 🔗 Links

- **Documentation**: [docs.ghostlock.io](https://docs.ghostlock.io)
- **Website**: [ghostlock.io](https://ghostlock.io)
- **Twitter**: [@GhostLockDeFi](https://twitter.com/GhostLockDeFi)
- **Discord**: [Join our community](https://discord.gg/ghostlock)
-->

##  Acknowledgments

- [Dcipher Network](https://docs.dcipher.network/quickstart/blocklock/) upholding the permissionless threshold signing network
- [Blocklock Protocol](https://github.com/randa-mu/blocklock-solidity) for time-locked encryption
- [Randomness Protocol](https://github.com/randa-mu/randomness-solidity) for VRF implementation
- [Base](https://base.org) + Arbitrum for the underlying blockchain infrastructure
- [Drand](https://drand.love) for distributed randomness beacon
