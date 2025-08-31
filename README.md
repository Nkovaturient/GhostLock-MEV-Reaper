# GhostLock: MEV Reaper

A stealth shield against MEV, encrypting trades and settling them fair.
### Live: [Preview](https://ghostlock.vercel.app/) 🟢
### Youtube: [Demo](https://youtu.be/plceuO9AG8c) 🎥
### Blog: [Hashnode](https://randomticks.hashnode.dev/ghostlock-mev-reaper) 📝

![GhostLock Banner](https://github.com/user-attachments/assets/8b445ad2-000e-404b-afeb-6e77991f677a)

## 🛡️ Overview

GhostLock: MEV Reaper is a cutting-edge DeFi platform that protects traders from Maximal Extractable Value (MEV) attacks through advanced cryptographic techniques and fair ordering mechanisms. Built on Base Sepolia, it leverages blocklock encryption, VRF-based ordering, and AI-optimized batch auctions.

## ✨ Key Features

- **🔒 Blocklock Encryption**: Time-locked encryption hides trading intents until execution
- **🎲 VRF Ordering**: Verifiable Random Function ensures fair transaction sequencing  
- **⚡ Batch Auctions**: Uniform pricing eliminates front-running opportunities
- **🤖 AI Optimization**: Machine learning optimizes settlement prices and reduces slippage
- **🛡️ MEV Protection**: Advanced shield against sandwich attacks and front-running
- **⚖️ Fair Access**: Equal opportunity trading for all participants

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
- **Real-time**: WebSocket support for live updates

### Smart Contracts (Solidity)
- **GhostLockIntents**: Manages encrypted trading intents
- **BatchSettlement**: Handles uniform-price batch auctions
- **EpochRNG**: Provides verifiable randomness for fair ordering
- **MockTokens**: Test tokens for development and testing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Git
- MetaMask or compatible Web3 wallet

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

### **Deployed Smart Contracts on BaseSepolia Network**:

- [BaseSepolia Faucets](https://www.alchemy.com/faucets/base-sepolia)
- [GHOSTLOCK_INTENTS_ADDRESS](https://sepolia.basescan.org/address/0xB049f2a5E2aeEa5950675EA89d0DA79E5749fB5C)
- [BATCH_SETTLEMENT_ADDRESS](https://sepolia.basescan.org/address/0x8aF0Ec5b9a22d02acdC0fb3ad75831fef3208706) 
- [EPOCH_RNG_ADDRESS](https://sepolia.basescan.org/address/0xA785F4B588013C9761b6B2Dff025e058C42cb798) 
- [MOCK_ETH_ADDRESS](https://sepolia.basescan.org/address/0xE8901D9f2f262f4F09E30344aA8470eCEbc64CBD) 

## 📖 API Documentation

### Endpoints

#### Auctions
- `GET /api/auctions` - List all auctions
- `GET /api/auctions/:id` - Get specific auction
- `GET /api/auctions/stats` - Get auction statistics

#### Markets[ZEROMEV API]
- `GET /api/markets` - List all markets
- `GET /api/markets/:id` - Get specific market
- `GET /api/markets/stats` - Get market statistics
  

## Future Roadmap

- **On-chain verified randomness Intefrations** → Calling the Drand( VRF) verification baked directly into EpochRNG contracts, so ordering proofs are trustless.
- **Batch-Auctions Settlemets** → via AI enhanced regulations
- **Liveness guarantees** → Bond + slashing for missed reveals, fallback threshold revealers, and permissionless settlement calls so no one can grief the auction.
- **Privacy hardening** → Add ciphertext(intent) padding, dummy intents, and batch-only publication so metadata leakage doesn’t kill the whole “encrypted” vibe.
- **Tests & security** → Foundry fuzz, audits, invariant checks
- **UI polish** → countdowns, public view mode, better status UX

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


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
- [Base](https://base.org) for the underlying blockchain infrastructure
- [Drand](https://drand.love) for distributed randomness beacon

Happy building! 😄😊
