# Deployment Guide

This guide covers deploying the complete GhostLock: MEV Reaper platform.

## Prerequisites

- Node.js 18+
- Foundry (for smart contracts)
- Git
- Access to Base Sepolia testnet
- WalletConnect Project ID

## Smart Contract Deployment

### 1. Deploy Dependencies

First, deploy the required dependency contracts:

```bash
# Clone and deploy blocklock-solidity
git clone https://github.com/randa-mu/blocklock-solidity
cd blocklock-solidity
forge build
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast

# Clone and deploy randomness-solidity  
git clone https://github.com/randa-mu/randomness-solidity
cd randomness-solidity
forge build
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast
```

### 2. Deploy GhostLock Contracts

```bash
# Deploy GhostLockIntents
forge create server/contracts/GhostLockIntents.sol:GhostLockIntents \
  --constructor-args <BLOCKLOCK_SENDER_ADDRESS> \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY

# Deploy EpochRNG
forge create server/contracts/EpochRNG.sol:GhostLockEpochRNG \
  --constructor-args <RANDOMNESS_SENDER_ADDRESS> <OWNER_ADDRESS> \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY

# Deploy BatchSettlement
forge create server/contracts/BatchSettlement.sol:GhostLockBatchSettlement \
  --constructor-args <INTENTS_ADDRESS> <RNG_ADDRESS> \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY

# Deploy Mock Tokens (for testing)
forge create server/contracts/MockToken.sol:MockToken \
  --constructor-args "Mock ETH" "mETH" 1000000000000000000000000 \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY

forge create server/contracts/MockToken.sol:MockToken \
  --constructor-args "Mock USDC" "mUSDC" 1000000000000 \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### 3. Verify Contracts

```bash
forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_NAME> \
  --chain base-sepolia \
  --etherscan-api-key $BASESCAN_API_KEY
```

## Backend Deployment

### Option 1: Railway

1. **Create Railway Project**
```bash
npm install -g @railway/cli
railway login
railway init
```

2. **Configure Environment**
```bash
railway variables set PORT=4000
railway variables set NODE_ENV=production
railway variables set RPC_URL=https://sepolia.base.org
# Add all other environment variables
```

3. **Deploy**
```bash
cd server
railway up
```

### Option 2: Heroku

1. **Create Heroku App**
```bash
heroku create ghostlock-mev-reaper-api
```

2. **Configure Environment**
```bash
heroku config:set NODE_ENV=production
heroku config:set PORT=4000
heroku config:set RPC_URL=https://sepolia.base.org
# Add all other environment variables
```

3. **Deploy**
```bash
git subtree push --prefix server heroku main
```

## Frontend Deployment

### Option 1: Vercel

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Configure Environment**
Create `vercel.json`:
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_WALLETCONNECT_PROJECT_ID": "@walletconnect_project_id",
    "VITE_API_BASE_URL": "@api_base_url"
  }
}
```

3. **Deploy**
```bash
vercel --prod
```

### Option 2: Netlify

1. **Build the project**
```bash
npm run build
```

2. **Deploy to Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

## Configuration Updates

### 1. Update Contract Addresses

After deployment, update the environment variables:

```bash
# Frontend
VITE_GHOSTLOCK_INTENTS_ADDRESS=0xYourDeployedAddress
VITE_BATCH_SETTLEMENT_ADDRESS=0xYourDeployedAddress
VITE_EPOCH_RNG_ADDRESS=0xYourDeployedAddress

# Backend  
GHOSTLOCK_INTENTS_ADDRESS=0xYourDeployedAddress
BATCH_SETTLEMENT_ADDRESS=0xYourDeployedAddress
EPOCH_RNG_ADDRESS=0xYourDeployedAddress
```

### 2. Configure Markets

Add markets to the BatchSettlement contract:

```bash
# Add ETH/USDC market (marketId: 0)
cast send $BATCH_SETTLEMENT_ADDRESS \
  "addMarket(uint8,address,address)" \
  0 $MOCK_ETH_ADDRESS $MOCK_USDC_ADDRESS \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY
```

## Monitoring and Maintenance

### 1. Health Checks

Set up monitoring for:
- API endpoint health (`/health`)
- Smart contract events
- Transaction success rates
- System performance metrics

### 2. Logging

Configure structured logging:
```javascript
// server/middleware/logging.js
const winston = require('winston')

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
})
```

### 3. Error Tracking

Integrate Sentry for error tracking:
```bash
npm install @sentry/node @sentry/react
```

## Security Checklist

- [ ] All private keys stored securely
- [ ] Environment variables configured properly
- [ ] HTTPS enabled in production
- [ ] CORS configured correctly
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Smart contracts verified on block explorer
- [ ] Access controls properly configured

## Troubleshooting

### Common Issues

1. **Contract Interaction Failures**
   - Verify contract addresses are correct
   - Check network configuration
   - Ensure sufficient gas limits

2. **API Connection Issues**
   - Verify CORS configuration
   - Check API base URL in frontend
   - Confirm server is running and accessible

3. **Wallet Connection Problems**
   - Verify WalletConnect Project ID
   - Check network configuration
   - Ensure wallet is on correct network

### Support

For deployment support:
- Check the [troubleshooting guide](docs/TROUBLESHOOTING.md)
- Join our [Discord community](https://discord.gg/ghostlock)
- Open an issue on GitHub

## Production Considerations

### Security
- Use hardware security modules for key management
- Implement multi-signature wallets for admin functions
- Regular security audits and penetration testing
- Monitor for unusual activity patterns

### Scalability
- Implement caching layers (Redis)
- Use CDN for static assets
- Database optimization and indexing
- Load balancing for high availability

### Compliance
- Implement KYC/AML if required
- Geographic restrictions if needed
- Regulatory compliance monitoring
- User privacy protection measures