# GhostLock: MEV Reaper

A stealth shield against MEV, encrypting trades and settling them fair.

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

5. **Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Health Check: http://localhost:4000/health

## 📋 Smart Contract Deployment

### Deploy Contracts (Foundry/Hardhat)

1. **Deploy dependencies first**:
   - Deploy blocklock-solidity contracts
   - Deploy randomness-solidity contracts

2. **Deploy GhostLock contracts**:
```bash
# Deploy GhostLockIntents
forge create GhostLockIntents --constructor-args <blocklock_sender_address>

# Deploy EpochRNG  
forge create GhostLockEpochRNG --constructor-args <randomness_sender> <owner>

# Deploy BatchSettlement
forge create GhostLockBatchSettlement --constructor-args <intents_address> <rng_address>

# Deploy Mock Tokens (for testing)
forge create MockToken --constructor-args "Mock ETH" "mETH" 1000000000000000000000000
forge create MockToken --constructor-args "Mock USDC" "mUSDC" 1000000000000
```

3. **Update environment variables** with deployed addresses

## 🔧 Configuration

### Environment Variables

#### Frontend (.env)
```bash
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
VITE_GHOSTLOCK_INTENTS_ADDRESS=0x...
VITE_BATCH_SETTLEMENT_ADDRESS=0x...
VITE_EPOCH_RNG_ADDRESS=0x...
```

#### Backend (server/.env)
```bash
PORT=4000
RPC_URL=https://sepolia.base.org
EXECUTOR_PRIVATE_KEY=0x...
GHOSTLOCK_INTENTS_ADDRESS=0x...
```

## 📖 API Documentation

### Endpoints

#### Auctions
- `GET /api/auctions` - List all auctions
- `GET /api/auctions/:id` - Get specific auction
- `GET /api/auctions/stats` - Get auction statistics

#### Intents  
- `POST /api/intents/submit` - Submit new intent
- `GET /api/intents/user/:address` - Get user intents
- `GET /api/intents/:id` - Get specific intent
- `POST /api/intents/:id/decrypt` - Decrypt ready intent

#### Markets
- `GET /api/markets` - List all markets
- `GET /api/markets/:id` - Get specific market
- `GET /api/markets/stats` - Get market statistics

## 🧪 Testing

### Frontend Testing
```bash
npm run test
```

### Smart Contract Testing
```bash
cd contracts
forge test
```

### Integration Testing
```bash
npm run test:integration
```

## 🔐 Security Considerations

### Smart Contract Security
- All contracts audited for common vulnerabilities
- Reentrancy protection on all state-changing functions
- Access control for administrative functions
- Emergency pause mechanisms

### Frontend Security
- Input validation and sanitization
- Secure key management practices
- HTTPS enforcement in production
- Content Security Policy headers

### API Security
- Rate limiting on all endpoints
- Input validation and sanitization
- CORS configuration
- Authentication for sensitive operations

## 🚀 Deployment

### Frontend Deployment (Vercel/Netlify)
```bash
npm run build
# Deploy dist/ folder to your hosting provider
```

### Backend Deployment (Railway/Heroku)
```bash
cd server
# Configure production environment variables
# Deploy using your preferred platform
```

### Smart Contract Deployment
```bash
# Deploy to Base Sepolia
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast

# Verify contracts
forge verify-contract <contract_address> <contract_name> --chain base-sepolia
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Documentation**: [docs.ghostlock.io](https://docs.ghostlock.io)
- **Website**: [ghostlock.io](https://ghostlock.io)
- **Twitter**: [@GhostLockDeFi](https://twitter.com/GhostLockDeFi)
- **Discord**: [Join our community](https://discord.gg/ghostlock)

## 🙏 Acknowledgments

- [Blocklock Protocol](https://github.com/randa-mu/blocklock-solidity) for time-locked encryption
- [Randomness Protocol](https://github.com/randa-mu/randomness-solidity) for VRF implementation
- [Base](https://base.org) for the underlying blockchain infrastructure
- [Drand](https://drand.love) for distributed randomness beacon

---

**⚠️ Disclaimer**: This is experimental software. Use at your own risk. Not audited for mainnet use.