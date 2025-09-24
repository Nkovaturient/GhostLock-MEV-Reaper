import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAccount, useBlockNumber } from 'wagmi'
import { Shield, Settings, Info, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../src/components/ui/Card'
import Button from '../../../../src/components/ui/Button'
import Input from '../../../../src/components/ui/Input'
import Select from '../../../../src/components/ui/Select'
import { Badge } from '../../../../src/components/ui/Badge'
import { useIntentSubmission } from '../../../../src/hooks/useIntentSubmission'
import { useEpochInfo } from '../../../../src/hooks/useAuctionData'
import { MARKETS, CONFIG } from '../lib/config'
import { formatNumber } from '../../../../src/lib/utils'
import PrivacyHealthIndicator from '../ui/PrivacyHealthIndicator'

const marketOptions = MARKETS.map(market => ({
  value: market.id.toString(),
  label: market.name
}))

interface PrivacyConfig {
  enablePadding: boolean
  enableDummyIntents: boolean
  paddingSize: number
  dummyIntentCount: number
  dummyIntentRatio: number
}

export default function EnhancedIntentForm() {
  const { isConnected } = useAccount()
  const { data: blockNumber } = useBlockNumber({ watch: true })
  const { data: epochInfo } = useEpochInfo()
  const { submitIntent, isSubmitting, lastRequestId, lastTxHash, isConfirming, receipt } = useIntentSubmission()

  // Form state
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [marketId, setMarketId] = useState('0')
  const [amount, setAmount] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [slippageBps, setSlippageBps] = useState('50')
  const [blocksAhead, setBlocksAhead] = useState('20')

  // Privacy configuration
  const [privacyConfig, setPrivacyConfig] = useState<PrivacyConfig>({
    enablePadding: CONFIG.PRIVACY.ENABLE_PADDING,
    enableDummyIntents: CONFIG.PRIVACY.ENABLE_DUMMY_INTENTS,
    paddingSize: CONFIG.PRIVACY.DEFAULT_PADDING_SIZE,
    dummyIntentCount: CONFIG.PRIVACY.DEFAULT_DUMMY_COUNT,
    dummyIntentRatio: CONFIG.PRIVACY.DEFAULT_DUMMY_RATIO,
  })

  const [showPrivacySettings, setShowPrivacySettings] = useState(false)

  const currentBlock = blockNumber ? Number(blockNumber) : 0
  const targetBlock = currentBlock + Number(blocksAhead)
  const selectedMarket = MARKETS.find(m => m.id === Number(marketId))

  // Auto-update limit price based on market
  useEffect(() => {
    if (selectedMarket && !limitPrice) {
      const defaultPrices: Record<string, string> = {
        'ETH/USDC': '3120.50',
        'WBTC/USDC': '64100.00'
      }
      setLimitPrice(defaultPrices[selectedMarket.name] || '1.00')
    }
  }, [selectedMarket, limitPrice])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected || !selectedMarket || !amount || !limitPrice) {
      return
    }

    try {
      await submitIntent({
        market: selectedMarket.name,
        side,
        amount,
        limitPrice,
        slippageBps: Number(slippageBps),
        marketId: Number(marketId),
        targetBlock,
        privacyConfig // Pass privacy configuration
      })

      setAmount('')
    } catch (error) {
      console.error('Submission failed:', error)
    }
  }

  const estimatedDecryptionTime = () => {
    const blocksToWait = Number(blocksAhead)
    const avgBlockTime = 2 // Base network ~2 seconds per block
    const totalSeconds = blocksToWait * avgBlockTime
    
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    
    if (minutes > 0) {
      return `~${minutes}m ${seconds}s`
    }
    return `~${seconds}s`
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Main Form */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-primary-400" />
                <span>Submit Encrypted Intent</span>
              </div>
              <button
                onClick={() => setShowPrivacySettings(!showPrivacySettings)}
                className="flex items-center space-x-2 px-3 py-1 bg-ghost-700 text-white rounded-lg hover:bg-ghost-600 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Privacy</span>
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Privacy Settings Panel */}
            <AnimatePresence>
              {showPrivacySettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 p-4 bg-ghost-800/30 rounded-lg border border-ghost-700"
                >
                  <h4 className="font-medium text-white mb-4 flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>Privacy Configuration</span>
                  </h4>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Padding Settings */}
                    <div className="space-y-3">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={privacyConfig.enablePadding}
                          onChange={(e) => setPrivacyConfig(prev => ({
                            ...prev,
                            enablePadding: e.target.checked
                          }))}
                          className="rounded border-ghost-600 bg-ghost-800 text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-sm text-ghost-300">Enable Padding</span>
                      </label>
                      
                      {privacyConfig.enablePadding && (
                        <Input
                          label="Padding Size (bytes)"
                          type="number"
                          min="64"
                          max="1024"
                          value={privacyConfig.paddingSize}
                          onChange={(e) => setPrivacyConfig(prev => ({
                            ...prev,
                            paddingSize: Number(e.target.value)
                          }))}
                        />
                      )}
                    </div>

                    {/* Dummy Intents Settings */}
                    <div className="space-y-3">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={privacyConfig.enableDummyIntents}
                          onChange={(e) => setPrivacyConfig(prev => ({
                            ...prev,
                            enableDummyIntents: e.target.checked
                          }))}
                          className="rounded border-ghost-600 bg-ghost-800 text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-sm text-ghost-300">Enable Dummy Intents</span>
                      </label>
                      
                      {privacyConfig.enableDummyIntents && (
                        <>
                          <Input
                            label="Dummy Count"
                            type="number"
                            min="1"
                            max="10"
                            value={privacyConfig.dummyIntentCount}
                            onChange={(e) => setPrivacyConfig(prev => ({
                              ...prev,
                              dummyIntentCount: Number(e.target.value)
                            }))}
                          />
                          <Input
                            label="Dummy Ratio"
                            type="number"
                            step="0.05"
                            min="0.1"
                            max="0.5"
                            value={privacyConfig.dummyIntentRatio}
                            onChange={(e) => setPrivacyConfig(prev => ({
                              ...prev,
                              dummyIntentRatio: Number(e.target.value)
                            }))}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Privacy Health Indicator */}
                  <div className="mt-4">
                    <PrivacyHealthIndicator config={privacyConfig} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Side Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-ghost-300">
                  Order Type
                </label>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant={side === 'buy' ? 'primary' : 'ghost'}
                    onClick={() => setSide('buy')}
                    className="flex-1"
                  >
                    Buy {selectedMarket?.baseSymbol}
                  </Button>
                  <Button
                    type="button"
                    variant={side === 'sell' ? 'primary' : 'ghost'}
                    onClick={() => setSide('sell')}
                    className="flex-1"
                  >
                    Sell {selectedMarket?.baseSymbol}
                  </Button>
                </div>
              </div>

              {/* Market Selection */}
              <Select
                label="Market"
                value={marketId}
                onChange={(e) => setMarketId(e.target.value)}
                options={marketOptions}
              />

              {/* Amount Input */}
              <Input
                label={`Amount (${selectedMarket?.baseSymbol || 'Token'})`}
                type="number"
                step="0.000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                required
              />

              {/* Limit Price */}
              <Input
                label={`Limit Price (${selectedMarket?.quoteSymbol || 'USDC'})`}
                type="number"
                step="0.01"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="0.00"
                required
              />

              {/* Slippage */}
              <Input
                label="Max Slippage (basis points)"
                type="number"
                step="1"
                min="1"
                max="1000"
                value={slippageBps}
                onChange={(e) => setSlippageBps(e.target.value)}
                placeholder="50"
              />

              {/* Target Block */}
              <Input
                label="Blocks Ahead"
                type="number"
                min="5"
                max="100"
                value={blocksAhead}
                onChange={(e) => setBlocksAhead(e.target.value)}
                placeholder="20"
              />

              {/* Execution Summary */}
              {amount && limitPrice && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-ghost-800/30 rounded-lg border border-ghost-700"
                >
                  <h4 className="font-medium text-white mb-2">Execution Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ghost-400">Order:</span>
                      <span>{side.toUpperCase()} {amount} {selectedMarket?.baseSymbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ghost-400">Limit Price:</span>
                      <span>{limitPrice} {selectedMarket?.quoteSymbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ghost-400">Est. Total:</span>
                      <span>
                        {(Number(amount) * Number(limitPrice)).toFixed(2)} {selectedMarket?.quoteSymbol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ghost-400">Target Block:</span>
                      <span>{formatNumber(targetBlock)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ghost-400">Est. Execution:</span>
                      <span>{estimatedDecryptionTime()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ghost-400">Privacy Score:</span>
                      <span>{Math.round((privacyConfig.enablePadding ? 50 : 0) + (privacyConfig.enableDummyIntents ? 50 : 0))}%</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                loading={isSubmitting}
                disabled={!isConnected || !amount || !limitPrice}
                className="w-full"
              >
                {!isConnected
                  ? 'Connect Wallet to Continue'
                  : `Submit Encrypted ${side.charAt(0).toUpperCase() + side.slice(1)} Intent`
                }
              </Button>
            </form>

            {/* Transaction Status */}
            {lastTxHash && (
              <div className="mt-6 p-4 bg-primary-500/10 rounded-lg border border-primary-500/20">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-primary-400" />
                  <span className="text-sm font-medium text-primary-300">
                    Intent Submitted Successfully
                  </span>
                </div>
                {lastRequestId && (
                  <p className="text-xs text-ghost-200 mt-1">
                    Blocklock Request ID: #{lastRequestId}
                  </p>
                )}
                <p className="text-xs text-ghost-300 mt-1">
                  Transaction: {lastTxHash.slice(0, 10)}...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Panel */}
      <div className="space-y-6">
        {/* Privacy Health */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy Protection</CardTitle>
          </CardHeader>
          <CardContent>
            <PrivacyHealthIndicator config={privacyConfig} />
            
            <div className="mt-4 space-y-2 text-sm text-ghost-400">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span>Blocklock encryption active</span>
              </div>
              {privacyConfig.enablePadding && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                  <span>{privacyConfig.paddingSize} bytes padding</span>
                </div>
              )}
              {privacyConfig.enableDummyIntents && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full" />
                  <span>{privacyConfig.dummyIntentCount} dummy intents</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Block Info */}
        <Card>
          <CardHeader>
            <CardTitle>Block Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-ghost-400">Current Block:</span>
                <span className="font-mono">{formatNumber(currentBlock)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ghost-400">Target Block:</span>
                <span className="font-mono">{formatNumber(targetBlock)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ghost-400">Est. Time:</span>
                <span>{estimatedDecryptionTime()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Epoch Info */}
        {epochInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Current Epoch</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-ghost-400">Epoch:</span>
                  <span className="font-mono">#{epochInfo.currentEpoch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ghost-400">Progress:</span>
                  <span>{epochInfo.progressPercent.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-ghost-700 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-primary-500 to-blue-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${epochInfo.progressPercent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* MEV Protection Notice */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-400 mb-1">MEV Protection Active</p>
                <p className="text-ghost-400">
                  Your intent will be encrypted using blocklock technology and settled 
                  in a fair batch auction to prevent MEV extraction.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}