# GhostLock Prototype: Encrypt.Randomize.Equalize

A comprehensive demonstration of encrypted intent trading with MEV protection on Base Sepolia/Mainnet.

## Core Objective

Functional demo showcasing the three-step workflow:
1. **Encrypt**: Submit encrypted trading intents using blocklock technology
2. **Randomize**: Privacy obfuscation with dummy intents and padding
3. **Equalize**: Uniform clearing prices via AI-enhanced batch auctions

## Architecture

This prototype leverages ALL existing GhostLock modules:
- Frontend: React components from `src/`
- Backend: Express server from `server/`
- AI Agent: Pricing agent from `agent-starter/`
- Smart Contracts: Deployed on Base Sepolia

## Key Features

### 1. Intent Encryption & Submission
- Enhanced `IntentSubmissionForm` with privacy controls
- Real blockchain interactions via `useIntentSubmission`
- Network switching (Base Sepolia ↔ Base Mainnet)
- Request ID tracking and confirmation toasts

### 2. Privacy Obfuscation
- Configurable padding (default: 256 bytes)
- Dummy intent generation (default: 3 per real intent)
- Privacy health indicators
- Batch submission with obfuscation metrics

### 3. Uniform Price Clearing
- Dual pricing: Deterministic + AI-powered
- Real-time auction monitoring via `AuctionExplorer`
- Settlement through existing solver service
- Fairness and confidence metrics display

### 4. Adversarial Simulation
- "Attacker Lab" page for MEV attack simulation
- Configurable attack sophistication
- Quantified protection metrics
- Attack failure analysis

## Pages Structure

- **Home**: Overview with navigation
- **Trade**: Enhanced form with privacy controls
- **Auctions**: Real-time auction monitoring
- **Analytics**: MEV protection metrics
- **Dashboard**: User intent history
- **Attacker Lab**: MEV attack simulation
- **Docs**: Process explanation

## Demo Scenarios

1. **Happy Path**: Encrypted intent → unlock → batch auction → settlement
2. **Attack Prevention**: MEV attempts → encryption blocks → minimal profit
3. **Network Switch**: Seamless Base Mainnet toggle

## Setup

1. Copy environment variables from main project
2. Ensure all contract addresses are configured
3. Start backend server and AI agent
4. Launch prototype application

## Success Metrics

- End-to-end encrypted intent flow
- Quantifiable MEV attack failure rates
- Real-time privacy and fairness metrics
- Seamless network switching

Built with existing GhostLock infrastructure - no code duplication.