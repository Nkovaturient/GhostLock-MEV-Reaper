# API Documentation

Complete API reference for GhostLock: MEV Reaper backend services.

## Base URL

```
Production: https://api.ghostlock.io
Development: http://localhost:4000
```

## Authentication

Currently, the API uses public endpoints. Future versions will implement:
- JWT-based authentication
- API key management
- Rate limiting per user

## Endpoints

### Auctions

#### GET /api/auctions

Get list of all auctions with optional filtering.

**Query Parameters:**
- `status` (optional): Filter by status (`settled`, `settling`, `pending`)
- `market` (optional): Filter by market (`ETH/USDC`, `WBTC/USDC`)
- `limit` (optional): Limit number of results (default: 50)

**Response:**
```json
[
  {
    "id": "A-1001",
    "market": "ETH/USDC", 
    "clearingPrice": "3120.52",
    "aiPrice": "3118.90",
    "intents": 42,
    "settlementBlock": 12345678,
    "status": "Settled",
    "volume": 1250000,
    "timestamp": 1704067200000,
    "epoch": 2468,
    "buyFill": "125.5",
    "sellFill": "125.5"
  }
]
```

#### GET /api/auctions/:id

Get specific auction details.

**Response:**
```json
{
  "id": "A-1001",
  "market": "ETH/USDC",
  "clearingPrice": "3120.52",
  "aiPrice": "3118.90", 
  "intents": 42,
  "settlementBlock": 12345678,
  "status": "Settled",
  "volume": 1250000,
  "timestamp": 1704067200000,
  "epoch": 2468,
  "buyFill": "125.5",
  "sellFill": "125.5",
  "participants": [
    {
      "address": "0x...",
      "side": "buy",
      "amount": "10.5",
      "fillPrice": "3120.52"
    }
  ]
}
```

#### GET /api/auctions/stats

Get auction statistics and metrics.

**Response:**
```json
{
  "totalVolume": 4200000,
  "totalAuctions": 156,
  "settledAuctions": 154,
  "avgIntents": 28,
  "avgSettlementTime": 42,
  "successRate": 99.2
}
```

### Intents

#### POST /api/intents/submit

Submit a new encrypted trading intent (webhook from smart contract).

**Request Body:**
```json
{
  "requestId": "12345",
  "user": "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
  "targetBlock": 12345700,
  "encrypted": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "intentId": "12345"
}
```

#### GET /api/intents/user/:address

Get all intents for a specific user address.

**Response:**
```json
[
  {
    "id": "12345",
    "user": "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
    "targetBlock": 12345700,
    "encrypted": "0x...",
    "status": "Ready",
    "timestamp": 1704067200000,
    "inclusionBlock": 12345650,
    "settlementPrice": "3120.52",
    "decrypted": {
      "market": "ETH/USDC",
      "side": "buy", 
      "amount": "1.0",
      "limitPrice": "3120.50",
      "slippageBps": 50,
      "marketId": 0,
      "epoch": 2468
    }
  }
]
```

#### GET /api/intents/:id

Get specific intent details.

**Response:**
```json
{
  "id": "12345",
  "user": "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
  "targetBlock": 12345700,
  "encrypted": "0x...",
  "status": "Ready",
  "timestamp": 1704067200000,
  "inclusionBlock": 12345650,
  "settlementPrice": "3120.52"
}
```

#### POST /api/intents/:id/decrypt

Attempt to decrypt an intent if the current block allows it.

**Request Body:**
```json
{
  "currentBlock": 12345700
}
```

**Response:**
```json
{
  "success": true,
  "decrypted": {
    "market": "ETH/USDC",
    "side": "buy",
    "amount": "1.0", 
    "limitPrice": "3120.50",
    "slippageBps": 50,
    "marketId": 0,
    "epoch": 2468
  }
}
```

### Markets

#### GET /api/markets

Get all available trading markets.

**Response:**
```json
[
  {
    "id": 0,
    "name": "ETH/USDC",
    "baseToken": "0x...",
    "quoteToken": "0x...",
    "baseSymbol": "ETH",
    "quoteSymbol": "USDC",
    "currentPrice": 3120.50,
    "volume24h": 2400000,
    "change24h": 2.5,
    "high24h": 3145.20,
    "low24h": 3098.30
  }
]
```

#### GET /api/markets/:id

Get specific market details.

**Response:**
```json
{
  "id": 0,
  "name": "ETH/USDC",
  "baseToken": "0x...",
  "quoteToken": "0x...", 
  "baseSymbol": "ETH",
  "quoteSymbol": "USDC",
  "currentPrice": 3120.50,
  "volume24h": 2400000,
  "change24h": 2.5,
  "high24h": 3145.20,
  "low24h": 3098.30,
  "orderBook": {
    "bids": [
      { "price": "3119.50", "amount": "10.5" }
    ],
    "asks": [
      { "price": "3121.00", "amount": "8.2" }
    ]
  }
}
```

#### GET /api/markets/stats

Get overall market statistics.

**Response:**
```json
{
  "totalValueProtected": 12400000,
  "mevSavings": 847000,
  "successRate": 99.8,
  "avgSettlementTime": 42,
  "activeTraders": 1247,
  "totalVolume24h": 4200000,
  "avgPrice": 33610.25,
  "marketsCount": 2
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details"
}
```

### Common Error Codes

- `400` - Bad Request (invalid parameters)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Rate Limiting

Current rate limits:
- 100 requests per minute per IP
- 1000 requests per hour per IP
- Burst allowance of 20 requests

## WebSocket Events (Future)

Real-time updates will be available via WebSocket:

```javascript
const ws = new WebSocket('wss://api.ghostlock.io/ws')

ws.on('auction_settled', (data) => {
  console.log('Auction settled:', data)
})

ws.on('intent_ready', (data) => {
  console.log('Intent ready for settlement:', data)
})
```

## SDK Usage

### JavaScript/TypeScript

```typescript
import { GhostLockAPI } from '@ghostlock/sdk'

const api = new GhostLockAPI({
  baseURL: 'https://api.ghostlock.io',
  apiKey: 'your-api-key' // Future feature
})

// Get auctions
const auctions = await api.auctions.list({ status: 'settled' })

// Get user intents  
const intents = await api.intents.getByUser('0x...')

// Get market data
const markets = await api.markets.list()
```

### Python

```python
import requests

class GhostLockAPI:
    def __init__(self, base_url="https://api.ghostlock.io"):
        self.base_url = base_url
    
    def get_auctions(self, status=None, market=None):
        params = {}
        if status:
            params['status'] = status
        if market:
            params['market'] = market
            
        response = requests.get(f"{self.base_url}/api/auctions", params=params)
        return response.json()
```

## Testing

### API Testing

```bash
# Health check
curl http://localhost:4000/health

# Get auctions
curl http://localhost:4000/api/auctions

# Get user intents
curl http://localhost:4000/api/intents/user/0x742d35Cc6634C0532925a3b8D4C9db96590c6C87

# Get market stats
curl http://localhost:4000/api/markets/stats
```

### Load Testing

```bash
# Install artillery
npm install -g artillery

# Run load test
artillery run test/load-test.yml
```

## Monitoring

### Health Monitoring

The API provides health check endpoints:

```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": "GhostLock MEV Reaper API",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": "healthy",
    "blockchain": "healthy",
    "external_apis": "healthy"
  }
}
```

### Metrics

Key metrics to monitor:
- Request latency (p50, p95, p99)
- Error rates by endpoint
- Active connections
- Memory and CPU usage
- Blockchain sync status

### Alerting

Set up alerts for:
- API response time > 2s
- Error rate > 1%
- Server downtime
- Smart contract failures
- Unusual trading patterns