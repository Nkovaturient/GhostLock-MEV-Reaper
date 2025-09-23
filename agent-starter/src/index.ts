import { GhostLockPricingAgent } from './agents/PricingAgent'
import { CONFIG } from './config'

type Intent = {
  side: 0 | 1
  amount: string
  limitPrice: string
  marketId: number
  user: string
  timestamp?: number
}

type MarketMetrics = {
  volatility: number
  spread: number
  depth: number
  mevPressure: number
}

type MarketData = {
  symbol: string
  metrics: MarketMetrics
  referencePrice?: string
  epochRandomSeed?: string
}

class GhostLockAIOrchestrator {
  pricingAgent: GhostLockPricingAgent

  constructor() {
    this.pricingAgent = new GhostLockPricingAgent(CONFIG.OPENSERV.API_KEY)
  }

  async start() {
    await this.pricingAgent.start()
    console.log('GhostLock AI Orchestrator online')
  }

  async stop() {
    await this.pricingAgent.stop?.()
  }

  async computeIntelligentClearingPrice(intents: Intent[], marketData: MarketData) {
    try {
      await this.pricingAgent.createTask({
        workspaceId: CONFIG.OPENSERV.WORKSPACE_ID,
        assignee: CONFIG.OPENSERV.AGENT_ID,
        description: 'Compute optimal clearing price',
        body: 'AI-enhanced price computation for batch auction',
        input: JSON.stringify({ intents: intents.length, market: marketData.symbol }),
        expectedOutput: 'Clearing price with confidence metrics',
        dependencies: []
      })
    } catch {}

    const result = await this.pricingAgent.process({
      messages: [
        { role: 'system', content: 'Compute optimal clearing price for the given intents' },
        { role: 'user', content: JSON.stringify({
          intents,
          referencePrice: marketData.referencePrice,
          marketMetrics: marketData.metrics,
          epochRandomSeed: marketData.epochRandomSeed
        }) }
      ]
    })

    return result
  }
}

;(async () => {
  try {
    const orchestrator = new GhostLockAIOrchestrator()
    await orchestrator.start()
  } catch (err) {
    console.error('Failed to start GhostLock AI Orchestrator:', err)
    process.exit(1)
  }
})()

export { GhostLockAIOrchestrator }
