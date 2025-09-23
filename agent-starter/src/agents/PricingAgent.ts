import { Agent } from '@openserv-labs/sdk'
import { z } from 'zod'
import { ethers } from 'ethers'
import 'dotenv/config'
import { CONFIG } from '../config'

class GhostLockPricingAgent extends Agent {
  constructor(apiKey: string) {
    super({
      systemPrompt: `You are an expert MEV-aware pricing agent for GhostLock batch auctions.
      Your mission: Compute optimal uniform clearing prices that maximize trade execution 
      while minimizing MEV extraction opportunities. You must consider:
      
      1. Market microstructure and volatility regimes
      2. Intent flow patterns and manipulation attempts
      3. Cross-market arbitrage opportunities
      4. Historical settlement patterns and price impacts
      5. MEV bot behavior prediction
      6. Fair price discovery mechanisms
      
      Always ensure deterministic fallbacks and validate against external price feeds.`,
      apiKey
    })

    this.setupCapabilities()
  }

  setupCapabilities() {
    // Main clearing price computation capability
    this.addCapability({
      name: 'computeOptimalClearingPrice',
      description: 'Compute optimal uniform clearing price for batch auction with MEV protection',
      schema: z.object({
        intents: z.array(z.object({
          side: z.number().min(0).max(1), // 0 = buy, 1 = sell
          amount: z.string(),
          limitPrice: z.string(),
          marketId: z.number(),
          user: z.string(),
          timestamp: z.number().optional()
        })),
        referencePrice: z.string().optional(),
        marketMetrics: z.object({
          volatility: z.number(),
          spread: z.number(),
          depth: z.number(),
          mevPressure: z.number().min(0).max(100)
        }),
        historicalSettlements: z.array(z.object({
          epoch: z.number(),
          price: z.string(),
          volume: z.string(),
          mevSavings: z.string()
        })).optional(),
        epochRandomSeed: z.string().optional()
      }),
      
      async run({ args, action }) {
        const { intents, referencePrice, marketMetrics, historicalSettlements, epochRandomSeed } = args
        const self = this as GhostLockPricingAgent
        
        try {
          await self.addLogToTask?.({
            workspaceId: action?.workspace?.id || CONFIG.OPENSERV.WORKSPACE_ID,
            taskId: CONFIG.OPENSERV.AGENT_ID,
            severity: 'info',
            type: 'text',
            body: `Starting price computation for ${intents.length} intents with MEV pressure: ${marketMetrics.mevPressure}%`
          })
        } catch {}

        try {
          // Step 1: Analyze intent flow patterns
          const flowAnalysis = await self.analyzeIntentFlow(intents, marketMetrics)
          
          // Step 2: Detect potential MEV attacks
          const mevDetection = await self.detectMEVAttacks(intents, marketMetrics)
          
          // Step 3: Calculate MEV protection premium
          const mevAdjustment = await self.calculateMEVProtectionPremium(flowAnalysis, mevDetection)
          
          // Step 4: Optimize price for fairness
          const clearingPrice = await self.optimizePriceForFairness(
            flowAnalysis, 
            mevAdjustment, 
            referencePrice,
            epochRandomSeed
          )
          
          // Step 5: Validate against reference prices
          const validation = await self.validatePriceReasonableness(clearingPrice, referencePrice, marketMetrics)
          
          try {
            await self.addLogToTask?.({
              workspaceId: CONFIG.OPENSERV.WORKSPACE_ID,
              taskId: CONFIG.OPENSERV.AGENT_ID,
              severity: 'info',
              type: 'text',
              body: `Computed clearing price: ${clearingPrice.price} (confidence: ${clearingPrice.confidence}%)`
            })
          } catch {}

          const result = {
            clearingPrice: clearingPrice.price,
            confidence: clearingPrice.confidence,
            mevSavings: mevAdjustment.savingsEstimate,
            priceImpact: clearingPrice.priceImpact,
            method: 'ai-enhanced-multi-factor',
            executedVolume: flowAnalysis.totalVolume,
            fairnessScore: validation.fairnessScore,
            riskMetrics: {
              manipulationRisk: mevDetection.manipulationRisk,
              volatilityAdjustment: mevAdjustment.volatilityPremium,
              liquidityScore: flowAnalysis.liquidityScore
            }
          }

          return JSON.stringify(result)
        } catch (error: any) {
          try {
            await self.addLogToTask?.({
              workspaceId: CONFIG.OPENSERV.WORKSPACE_ID,
              taskId: CONFIG.OPENSERV.AGENT_ID,
              severity: 'error',
              type: 'text',
              body: `Price computation failed: ${error.message}. Falling back to heuristic pricing.`
            })
          } catch {}

          // Fallback to simple heuristic
          const fallbackResult = self.fallbackHeuristicPricing(intents, referencePrice)
          return JSON.stringify(fallbackResult)
        }
      }
    })

    // MEV Detection capability
    this.addCapability({
      name: 'detectMEVOpportunities',
      description: 'Detect potential MEV extraction opportunities in batch',
      schema: z.object({
        intents: z.array(z.any()),
        marketState: z.object({
          currentPrice: z.string(),
          liquidity: z.number(),
          volatility: z.number()
        }),
        crossMarketPrices: z.array(z.object({
          exchange: z.string(),
          price: z.string(),
          timestamp: z.number()
        })).optional()
      }),
      
      async run({ args }) {
        const { intents, marketState, crossMarketPrices } = args
        const self = this as GhostLockPricingAgent
        
        // Detect sandwich attack opportunities
        const sandwichRisk = self.detectSandwichOpportunities(intents, marketState)
        
        // Detect arbitrage opportunities
        const arbRisk = self.detectArbitrageOpportunities(intents, crossMarketPrices || [])
        
        // Detect frontrunning patterns
        const frontrunRisk = self.detectFrontrunningPatterns(intents)
        
        const result = {
          sandwichRisk,
          arbitrageRisk: arbRisk,
          frontrunningRisk: frontrunRisk,
          overallMevRisk: Math.max(sandwichRisk, arbRisk, frontrunRisk),
          recommendations: self.generateMEVMitigationRecommendations(sandwichRisk, arbRisk, frontrunRisk)
        }
        
        return JSON.stringify(result)
      }
    })
  }

  async analyzeIntentFlow(intents: any[], marketMetrics: { volatility: number; spread: number; depth: number; mevPressure: number; }) {
    // Separate buy and sell intents
    const buyIntents = intents.filter(i => i.side === 0)
    const sellIntents = intents.filter(i => i.side === 1)
    
    // Calculate total volumes
    const totalBuyVolume = buyIntents.reduce((sum, intent) => 
      sum + parseFloat(intent.amount), 0
    )
    const totalSellVolume = sellIntents.reduce((sum, intent) => 
      sum + parseFloat(intent.amount), 0
    )
    
    // Calculate weighted average limit prices
    const avgBuyPrice = buyIntents.reduce((sum, intent) => 
      sum + parseFloat(intent.limitPrice) * parseFloat(intent.amount), 0
    ) / totalBuyVolume || 0
    
    const avgSellPrice = sellIntents.reduce((sum, intent) => 
      sum + parseFloat(intent.limitPrice) * parseFloat(intent.amount), 0
    ) / totalSellVolume || 0
    
    // Calculate order imbalance
    const orderImbalance = Math.abs(totalBuyVolume - totalSellVolume) / 
      Math.max(totalBuyVolume + totalSellVolume, 1)
    
    // Analyze intent size distribution
    const intentSizes = intents.map(i => parseFloat(i.amount))
    const avgSize = intentSizes.reduce((a, b) => a + b, 0) / intentSizes.length
    const sizeStdDev = Math.sqrt(
      intentSizes.reduce((sum, size) => sum + Math.pow(size - avgSize, 2), 0) / intentSizes.length
    )
    
    // Calculate liquidity score (higher is better)
    const liquidityScore = Math.min(100, (intents.length * 10) + (Math.min(totalBuyVolume, totalSellVolume) * 5))
    
    return {
      totalIntents: intents.length,
      buyIntents: buyIntents.length,
      sellIntents: sellIntents.length,
      totalBuyVolume,
      totalSellVolume,
      totalVolume: totalBuyVolume + totalSellVolume,
      avgBuyPrice,
      avgSellPrice,
      spread: avgBuyPrice > 0 && avgSellPrice > 0 ? avgBuyPrice - avgSellPrice : 0,
      orderImbalance,
      avgIntentSize: avgSize,
      intentSizeVariance: sizeStdDev,
      liquidityScore,
      confidence: Math.min(95, 50 + liquidityScore * 0.45) // Base confidence calculation
    }
  }

  async detectMEVAttacks(intents: any[], marketMetrics: any) {
    // Detect unusual intent patterns that might indicate MEV attacks
    const suspiciousPatterns = {
      largeOrderSandwich: this.detectLargeOrderSandwich(intents),
      priceManipulation: this.detectPriceManipulation(intents),
      washTrading: this.detectWashTrading(intents),
      timingAttacks: this.detectTimingAttacks(intents)
    }
    
    const manipulationRisk = Math.max(
      suspiciousPatterns.largeOrderSandwich,
      suspiciousPatterns.priceManipulation,
      suspiciousPatterns.washTrading,
      suspiciousPatterns.timingAttacks
    )
    
    return {
      manipulationRisk,
      patterns: suspiciousPatterns,
      riskLevel: manipulationRisk > 70 ? 'HIGH' : manipulationRisk > 40 ? 'MEDIUM' : 'LOW'
    }
  }

  async calculateMEVProtectionPremium(flowAnalysis: any, mevDetection: any) {
    // Base MEV protection premium calculation
    let basePremium = 0
    
    // Adjust for manipulation risk
    if (mevDetection.manipulationRisk > 50) {
      basePremium += mevDetection.manipulationRisk * 0.0001 // 0.01% per risk point above 50
    }
    
    // Adjust for order imbalance (higher imbalance = higher premium)
    const imbalancePremium = flowAnalysis.orderImbalance * 0.002 // Up to 0.2% for full imbalance
    
    // Adjust for liquidity (lower liquidity = higher premium)
    const liquidityPremium = Math.max(0, (100 - flowAnalysis.liquidityScore) * 0.00005) // Up to 0.5%
    
    // Volatility premium based on market metrics
    const volatilityPremium = flowAnalysis.intentSizeVariance > 0 ? 
      Math.log(1 + flowAnalysis.intentSizeVariance) * 0.001 : 0
    
    const totalPremium = basePremium + imbalancePremium + liquidityPremium + volatilityPremium
    
    // Estimate MEV savings (what users would lose to MEV without protection)
    const potentialMEVLoss = flowAnalysis.totalVolume * 0.002 // Assume 0.2% average MEV tax
    const actualProtection = Math.min(potentialMEVLoss * 0.8, potentialMEVLoss * (1 - totalPremium))
    
    return {
      basePremium,
      imbalancePremium,
      liquidityPremium,
      volatilityPremium,
      totalPremium,
      savingsEstimate: actualProtection.toString(),
      protectionEffectiveness: (actualProtection / potentialMEVLoss) * 100
    }
  }

  async optimizePriceForFairness(flowAnalysis: any, mevAdjustment: any, referencePrice?: string, randomSeed?: string) {
    // Start with volume-weighted average price (VWAP) of limit prices
    const totalVolume = flowAnalysis.totalVolume
    if (totalVolume === 0) {
      throw new Error("No volume to settle")
    }
    
    // Calculate VWAP from intents
    let vwap = ((flowAnalysis.avgBuyPrice * flowAnalysis.totalBuyVolume) + 
                (flowAnalysis.avgSellPrice * flowAnalysis.totalSellVolume)) / totalVolume
    
    // Use reference price if VWAP is unreasonable
    if (referencePrice && (vwap === 0 || isNaN(vwap))) {
      vwap = parseFloat(referencePrice)
    }
    
    // Apply MEV protection adjustments
    let adjustedPrice = vwap
    
    // Adjust for order imbalance (move price to balance supply/demand)
    if (flowAnalysis.orderImbalance > 0.1) {
      const imbalanceDirection = flowAnalysis.totalBuyVolume > flowAnalysis.totalSellVolume ? 1 : -1
      const imbalanceAdjustment = flowAnalysis.orderImbalance * 0.01 * vwap * imbalanceDirection
      adjustedPrice += imbalanceAdjustment
    }
    
    // Add randomness for MEV protection (use epochRandomSeed if available)
    if (randomSeed) {
      const seedHash = ethers.keccak256(ethers.toUtf8Bytes(randomSeed))
      const randomFactor = parseInt(seedHash.slice(2, 10), 16) / 0xFFFFFFFF // Convert to 0-1
      const maxRandomAdjustment = vwap * 0.001 // Max 0.1% random adjustment
      const randomAdjustment = (randomFactor - 0.5) * 2 * maxRandomAdjustment
      adjustedPrice += randomAdjustment
    }
    
    // Calculate price impact
    const priceImpact = referencePrice ? 
      Math.abs(adjustedPrice - parseFloat(referencePrice)) / parseFloat(referencePrice) * 100 : 0
    
    // Adjust confidence based on various factors
    let confidence = flowAnalysis.confidence
    confidence -= priceImpact * 2 // Reduce confidence for high price impact
    confidence += (100 - mevAdjustment.totalPremium * 10000) * 0.1 // Higher confidence for lower premiums
    confidence = Math.max(10, Math.min(95, confidence))
    
    return {
      price: adjustedPrice.toFixed(8),
      confidence: Math.round(confidence),
      priceImpact: priceImpact.toFixed(4),
      components: {
        baseVWAP: vwap,
        imbalanceAdjustment: adjustedPrice - vwap,
        mevProtectionPremium: mevAdjustment.totalPremium
      }
    }
  }

  async validatePriceReasonableness(clearingPrice: { price: string }, referencePrice?: string, marketMetrics?: any) {
    if (!referencePrice) {
      return { 
        isValid: true, 
        fairnessScore: 85, 
        warnings: ['No reference price available for validation'] 
      }
    }
    
    const price = parseFloat(clearingPrice.price)
    const reference = parseFloat(referencePrice)
    const deviation = Math.abs(price - reference) / reference
    
    let fairnessScore = 100
    const warnings: string[] = []
    
    // Check for excessive deviation
    if (deviation > 0.05) { // 5%
      fairnessScore -= Math.min(30, deviation * 100)
      warnings.push(`Price deviates ${(deviation * 100).toFixed(2)}% from reference`)
    }
    
    // Check for manipulation indicators
    if (marketMetrics?.mevPressure > 80) {
      fairnessScore -= 20
      warnings.push('High MEV pressure detected')
    }
    
    // Volatility adjustments
    if (marketMetrics?.volatility > 0.1) {
      fairnessScore += 10 // Higher volatility makes larger deviations more acceptable
    }
    
    return {
      isValid: deviation < 0.1, // 10% max deviation
      fairnessScore: Math.max(0, Math.round(fairnessScore)),
      deviation: deviation * 100,
      warnings
    }
  }

  // Fallback heuristic pricing when AI fails
  fallbackHeuristicPricing(intents: any[], referencePrice?: string) {
    console.warn('Using fallback heuristic pricing')
    
    const buyIntents = intents.filter(i => i.side === 0)
    const sellIntents = intents.filter(i => i.side === 1)
    
    if (buyIntents.length === 0 && sellIntents.length === 0) {
      throw new Error('No valid intents for pricing')
    }
    
    // Simple midpoint calculation
    let price = parseFloat(referencePrice || '0')
    
    if (buyIntents.length > 0 && sellIntents.length > 0) {
      const maxBuyPrice = Math.max(...buyIntents.map(i => parseFloat(i.limitPrice)))
      const minSellPrice = Math.min(...sellIntents.map(i => parseFloat(i.limitPrice)))
      price = (maxBuyPrice + minSellPrice) / 2
    } else if (buyIntents.length > 0) {
      price = Math.max(...buyIntents.map(i => parseFloat(i.limitPrice)))
    } else {
      price = Math.min(...sellIntents.map(i => parseFloat(i.limitPrice)))
    }
    
    return {
      clearingPrice: price.toFixed(8),
      confidence: 60,
      mevSavings: '0',
      method: 'fallback-heuristic',
      executedVolume: intents.reduce((sum, i) => sum + parseFloat(i.amount), 0),
      fairnessScore: 70,
      riskMetrics: {
        manipulationRisk: 0,
        volatilityAdjustment: 0,
        liquidityScore: 50
      }
    }
  }

  // MEV Detection helper methods
  detectLargeOrderSandwich(intents: any[]) {
    // Look for pattern: small order, large order, small order (potential sandwich)
    if (intents.length < 3) return 0
    
    const sizes = intents.map(i => parseFloat(i.amount))
    const avgSize = sizes.reduce((a, b) => a + b) / sizes.length
    
    let suspiciousPatterns = 0
    for (let i = 1; i < sizes.length - 1; i++) {
      if (sizes[i] > avgSize * 3 && sizes[i-1] < avgSize * 0.5 && sizes[i+1] < avgSize * 0.5) {
        suspiciousPatterns++
      }
    }
    
    return Math.min(100, suspiciousPatterns * 25)
  }

  detectPriceManipulation(intents: any[]) {
    // Look for intents with prices significantly away from the median
    const prices = intents.map(i => parseFloat(i.limitPrice)).sort((a, b) => a - b)
    const median = prices[Math.floor(prices.length / 2)]
    
    const outliers = prices.filter(p => Math.abs(p - median) / median > 0.1)
    return Math.min(100, (outliers.length / prices.length) * 200)
  }

  detectWashTrading(intents: any[]) {
    // Look for same user having both buy and sell orders
    const userSides: Record<string, Set<number>> = {}
    intents.forEach(intent => {
      if (!userSides[intent.user]) userSides[intent.user] = new Set()
      userSides[intent.user].add(intent.side)
    })
    
    const suspiciousUsers = Object.values(userSides).filter(sides => sides.size > 1).length
    return Math.min(100, (suspiciousUsers / Object.keys(userSides).length) * 100)
  }

  detectTimingAttacks(intents: any[]) {
    // This would require timestamp analysis - simplified for now
    return 0
  }

  detectSandwichOpportunities(intents: any[], marketState: { currentPrice: string; liquidity: number; volatility: number; }) {
    // Simplified sandwich detection
    const largeOrders = intents.filter(i => parseFloat(i.amount) > parseFloat(marketState.currentPrice) * 0.01)
    return Math.min(100, largeOrders.length * 20)
  }

  detectArbitrageOpportunities(intents: any[], crossMarketPrices: Array<{ price: string }>) {
    if (crossMarketPrices.length === 0) return 0
    
    // Simplified arbitrage detection based on price differences
    const intentPrices = intents.map(i => parseFloat(i.limitPrice))
    const maxIntentPrice = Math.max(...intentPrices)
    const minIntentPrice = Math.min(...intentPrices)
    
    const marketPrices = crossMarketPrices.map(p => parseFloat(p.price))
    const maxMarketPrice = Math.max(...marketPrices)
    const minMarketPrice = Math.min(...marketPrices)
    
    const maxArb = Math.max(
      (maxIntentPrice - minMarketPrice) / minMarketPrice,
      (maxMarketPrice - minIntentPrice) / minIntentPrice
    )
    
    return Math.min(100, maxArb * 1000) // Scale to 0-100
  }

  detectFrontrunningPatterns(intents: any[]) {
    // Look for patterns in intent ordering that might indicate frontrunning
    // Simplified implementation
    const priceMovements: number[] = []
    for (let i = 1; i < intents.length; i++) {
      const prevPrice = parseFloat(intents[i-1].limitPrice)
      const currPrice = parseFloat(intents[i].limitPrice)
      if (prevPrice > 0) {
        priceMovements.push((currPrice - prevPrice) / prevPrice)
      }
    }
    
    // Look for sudden price jumps
    const largeMoves = priceMovements.filter(move => Math.abs(move) > 0.05)
    return Math.min(100, largeMoves.length * 20)
  }

  generateMEVMitigationRecommendations(sandwichRisk: number, arbRisk: number, frontrunRisk: number) {
    const recommendations: string[] = []
    
    if (sandwichRisk > 50) {
      recommendations.push('Implement stricter order size validation and temporal randomization')
    }
    
    if (arbRisk > 50) {
      recommendations.push('Consider cross-market price validation before settlement')
    }
    
    if (frontrunRisk > 50) {
      recommendations.push('Increase randomization in intent processing order')
    }
    
    return recommendations
  }
}

export { GhostLockPricingAgent }


