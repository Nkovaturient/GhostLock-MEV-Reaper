import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GhostLockPricingAgent } from '../src/agents/PricingAgent'
import { CONFIG } from '../src/config'

type Intent = {
  side: 0 | 1
  amount: string
  limitPrice: string
  marketId: number
}

type FeaturesPayload = {
  intents: Intent[] | { side: number; amount: string; limitPrice: string; marketId: number }[]
  referencePrice?: string | null
  symbol?: string
  marketMetrics?: {
    volatility?: number
    spread?: number
    depth?: number
    mevPressure?: number
  }
  epochRandomSeed?: string
}

let agent: GhostLockPricingAgent | null = null
let started = false

async function getAgent(): Promise<GhostLockPricingAgent> {
  if (!agent) {
    agent = new GhostLockPricingAgent(CONFIG.OPENSERV.API_KEY)
  }
  if (!started) {
    await agent.start()
    started = true
  }
  return agent
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const body: FeaturesPayload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body

    const intents: Intent[] = (body.intents as any[]).map((i) => ({
      side: (i.side as number) === 0 ? 0 : 1,
      amount: String(i.amount),
      limitPrice: String(i.limitPrice),
      marketId: Number(i.marketId)
    }))

    const marketMetrics = body.marketMetrics || { volatility: 0.05, spread: 0.002, depth: 100000, mevPressure: 25 }

    const pricingAgent = await getAgent()
    const result = await pricingAgent.process({
      messages: [
        { role: 'system', content: 'Compute optimal uniform clearing price with MEV-aware adjustments. Return JSON with keys: clearingPrice, confidence, priceImpact, fairnessScore, riskMetrics.' },
        { role: 'user', content: JSON.stringify({
          intents,
          referencePrice: body.referencePrice,
          marketMetrics,
          epochRandomSeed: body.epochRandomSeed || undefined,
          symbol: body.symbol || 'ASSET/USD'
        }) }
      ]
    })

    // Expect the agent to return a JSON-like object. If it returned a string, try to parse.
    const payload = typeof result === 'string' ? JSON.parse(result) : result

    if (!payload || !payload.clearingPrice) {
      res.status(422).json({ error: 'Agent did not return a clearingPrice' })
      return
    }

    res.status(200).json({
      clearingPrice: String(payload.clearingPrice),
      confidence: Number(payload.confidence ?? 70),
      priceImpact: payload.priceImpact ?? null,
      fairnessScore: payload.fairnessScore ?? null,
      riskMetrics: payload.riskMetrics ?? null,
      method: 'ai'
    })
  } catch (error: any) {
    console.error('AI pricing endpoint error:', error)
    res.status(500).json({ error: error?.message || 'Internal Server Error' })
  }
}



