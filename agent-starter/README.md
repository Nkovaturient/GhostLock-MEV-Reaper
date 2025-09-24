# GhostLock MEV-Aware Pricing Agent (Agent Starter)

An OpenServ SDK agent that computes optimal uniform clearing prices for batch auctions with explicit MEV-awareness. It analyzes intent flow, detects manipulation patterns, applies a MEV-protection premium, and outputs a fair, defensible clearing price with confidence and risk metrics.

This repository is a production-ready starter: strongly typed TypeScript modules, pluggable orchestrator, and clean integration with the OpenServ platform.

## Why this matters (with data and references)

- **MEV is economically material**: Academic and industry sources have documented substantial extractable value across DeFi markets. Public dashboards and studies show cumulative on-chain MEV extraction in the hundreds of millions of USD historically on Ethereum mainnet alone. See references: Flashbots documentation (`https://docs.flashbots.net/`), EigenPhi MEV analytics (`https://www.eigenphi.io/`), and CoW Protocol research blog (`https://blog.cow.fi/`).
- **Batch auctions reduce MEV vs continuous AMM execution**: Price-time priority can be exploited by sandwiching and frontrunning. Uniform-price batch auctions compress or eliminate the profitable window for many of these strategies, improving execution quality. See CoW Protocol docs (`https://docs.cow.fi/`) and related research discussions in their blog (`https://blog.cow.fi/`).
- **Deterministic, auditable pricing improves trust**: Institutions require a clear audit trail of price formation. Producing a price with explainable components (VWAP baseline, imbalance adjustment, MEV premium, randomization seed) and a fairness score materially improves auditability and governance alignment.

> Practical implication: Even modest reductions in effective MEV “tax” (e.g., 5–20 bps on executed notional) compound to meaningful savings for frequent traders and aggregators. By combining batch auctions with MEV-aware pricing, protocols can capture a portion of these savings for users while maintaining healthy liquidity incentives. References above provide methodology and dashboards to verify market-wide MEV ranges and patterns.

## What the agent does

- Ingests a batch of intents (buys/sells with limits, sizes, timestamps, users)
- Analyzes order flow: volume, imbalance, size distribution, and liquidity score
- Detects MEV risks: sandwich patterns, outlier pricing, potential wash trading, and frontrunning indicators
- Calculates a MEV protection premium based on risk and liquidity conditions
- Optimizes a uniform clearing price (VWAP baseline + imbalance and protection adjustments + optional epoch randomness for MEV obfuscation)
- Validates against a reference price and outputs fairness/confidence metrics

## Key outputs

- `clearingPrice`: final batch uniform price
- `confidence`: 10–95 scaled confidence score
- `priceImpact`: deviation from reference price (if provided)
- `riskMetrics`: manipulation risk, volatility premium, liquidity score
- `fairnessScore`: heuristic reasonableness score with warnings

## Architecture

```
agent-starter/
├── src/
│   ├── agents/
│   │   └── PricingAgent.ts        # GhostLockPricingAgent with capabilities
│   ├── orchestrator.ts            # Lifecycle + compute workflow
│   ├── config.ts                  # Typed CONFIG (OpenServ API, IDs)
│   └── index.ts                   # Barrel exports
├── package.json
└── tsconfig.json
```

- `GhostLockPricingAgent` (OpenServ SDK `Agent`) exposes capabilities:
  - `computeOptimalClearingPrice` (primary)
  - `detectMEVOpportunities` (auxiliary diagnostics)
- `GhostLockAIOrchestrator` wires credentials, starts the agent, and offers a simple `computeIntelligentClearingPrice()` API for your app/backend.

## How pricing is computed (high level)

1. **Flow analysis**: splits buys/sells, computes total volumes, VWAP of limits, spread, order imbalance, size variance, and a liquidity score.
2. **MEV detection**: simple heuristics for sandwich-like size patterns, outlier prices (relative to median), user-level buy/sell overlap, and abrupt intent price jumps.
3. **MEV protection premium**: risk-adjusted premium combining manipulation risk, imbalance, liquidity scarcity, and size-variance volatility.
4. **Fairness optimization**: starts at VWAP, moves price to reduce imbalance, adds small randomness seeded per epoch to reduce predictability, and caps magnitude.
5. **Validation**: compares to an external `referencePrice` if supplied and produces a fairness score and warnings list.

Notes:
- The included heuristics are intentionally conservative and explainable. They are designed to be extended with live market data, cross-venue quotes, and more sophisticated anomaly detection.
- Randomization is bounded (e.g., ±10 bps of VWAP) to avoid destabilizing prices while mitigating deterministic exploitation.

## Installation & Build

```bash
npm install
```

```bash
npm run build
```

## Configuration

Set environment variables (numbers for IDs, strings for keys):

- `OPENSERV_API_KEY`: OpenServ platform API key (string)
- `OPENSERV_WORKSPACE_ID`: numeric workspace id (number)
- `OPENSERV_AGENT_ID`: numeric agent id (number)
- `OPENAI_API_KEY`: optional, for local LLM testing with `process()` (string)

Example `.env`:

```bash
OPENSERV_API_KEY=sk_live_xxx
OPENSERV_WORKSPACE_ID=1234
OPENSERV_AGENT_ID=5678
OPENAI_API_KEY=sk-openai-xxx
```

## Quick start

Start the agent (HTTP server for OpenServ):

```bash
npm run dev
# or
npm start
```

Expose locally (optional during development):

```bash
ngrok http 7378
```

## Programmatic usage

Use the orchestrator to compute a clearing price from your app or service.

```typescript
import { GhostLockAIOrchestrator } from './src/orchestrator'

async function main() {
  const orchestrator = new GhostLockAIOrchestrator()
  await orchestrator.start()

  const intents = [
    { side: 0, amount: '10', limitPrice: '100.00', marketId: 1, user: '0xBuyer' },
    { side: 1, amount: '8',  limitPrice: '101.00', marketId: 1, user: '0xSeller' }
  ]

  const result = await orchestrator.computeIntelligentClearingPrice(intents, {
    symbol: 'ASSET/USD',
    metrics: { volatility: 0.05, spread: 0.002, depth: 100000, mevPressure: 35 },
    referencePrice: '100.50',
    epochRandomSeed: 'epoch-2025-09-22'
  })

  console.log(result)
}

main().catch(console.error)
```

## Capability interface (primary)

- `computeOptimalClearingPrice` expects:
  - `intents`: array with fields { side 0|1, amount, limitPrice, marketId, user, timestamp? }
  - `marketMetrics`: { volatility, spread, depth, mevPressure }
  - `referencePrice?`: string
  - `epochRandomSeed?`: string

Returns a structured object with `clearingPrice`, `confidence`, `priceImpact`, `fairnessScore`, and `riskMetrics`.

## Security and limitations

- The included MEV detectors are heuristic and should be complemented with:
  - Cross-venue quotes and depth (broader market context)
  - Time-based clustering to detect intent bursts
  - Wallet clustering and historical behavior fingerprints
  - Post-trade surveillance and feedback loops
- The randomness mechanism reduces determinism but must be carefully seeded operationally (e.g., epoch-based, pre-committed seeds) to avoid governance manipulation.
- Always log price components for audits and post-mortems.

## Extending the agent

- Plug in real-time market data feeds and TWAP/VWAP references
- Add slippage-aware optimization and supply-demand curve fitting
- Introduce per-market parameterization (max adjustment caps, volatility bands)
- Persist capability outputs for analytics and compliance

## References and further reading

- Flashbots documentation: `https://docs.flashbots.net/`
- EigenPhi MEV analytics: `https://www.eigenphi.io/`
- CoW Protocol docs: `https://docs.cow.fi/`
- CoW Protocol blog (batch auctions and MEV): `https://blog.cow.fi/`
- MEV research overview (Ethereum Foundation blog): `https://blog.ethereum.org/` (search for “MEV”)

These sources provide data, dashboards, and research context to validate the economic significance of MEV, assess batch auction benefits, and design mitigation strategies.

## License

MIT
