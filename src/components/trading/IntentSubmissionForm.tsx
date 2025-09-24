import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAccount, useBlockNumber } from 'wagmi'
import { Shield, Clock, TrendingUp, AlertCircle, ArrowUpDown, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { Badge } from '../ui/Badge'
import { useIntentSubmission } from '../../hooks/useIntentSubmission'
import { useEpochInfo } from '../../hooks/useAuctionData'
import { MARKETS } from '../../lib/config'
import { formatNumber } from '../../lib/utils'
import { ethers } from 'ethers'

const marketOptions = MARKETS.map(market => ({
  value: market.id.toString(),
  label: market.name
}))

export default function IntentSubmissionForm({
  setBlocksAhead,
  blocksAhead,
  estimatedDecryptionTime,
  avgBlockTimeSeconds
}: {
  setBlocksAhead: React.Dispatch<React.SetStateAction<string>>,
  blocksAhead: string,
  estimatedDecryptionTime: string,
  avgBlockTimeSeconds?: number
}) {
  const { isConnected } = useAccount()
  const { data: blockNumber } = useBlockNumber({ watch: true })
  const { data: epochInfo } = useEpochInfo()
  const { submitIntent, isSubmitting, lastRequestId, lastTxHash, isConfirming, receipt } = useIntentSubmission()

  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [marketId, setMarketId] = useState('0')
  const [amount, setAmount] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [slippageBps, setSlippageBps] = useState('50')

  const currentBlock = blockNumber ? Number(blockNumber) : 0
  const targetBlock = currentBlock + Number(blocksAhead)
  const selectedMarket = MARKETS.find(m => m.id === Number(marketId))

  const [unit, setUnit] = useState<'blocks' | 'seconds'>('blocks')
  const [secondsAhead, setSecondsAhead] = useState('')

  useEffect(() => {
    if (unit === 'seconds') {
      const spb = avgBlockTimeSeconds || 1
      const secs = Number(secondsAhead)
      if (!Number.isFinite(secs) || secs <= 0) return
      const blocks = Math.max(1, Math.ceil(secs / spb))
      setBlocksAhead(String(blocks))
    }
  }, [unit, secondsAhead, avgBlockTimeSeconds, setBlocksAhead])

  // Auto-update limit price based on market
  useEffect(() => {
    if (selectedMarket && !limitPrice) {
      // Set default prices based on market
      const defaultPrices: Record<string, string> = {
        'ETH/USDC': '3120.50',
        'WBTC/USDC': '64100.00'
      }
      setLimitPrice(defaultPrices[selectedMarket.name] || '1.00')
    }
  }, [selectedMarket, limitPrice])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected || !selectedMarket) {
      return
    }

    if (!amount || !limitPrice) {
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
        targetBlock
      })

      setAmount('')
    } catch (error) {
      console.error('Submission failed:', error)
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Main Form */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-primary-400" />
              <span>Submit Encrypted Intent</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
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

              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Button type="button" variant={unit === 'blocks' ? 'primary' : 'ghost'} onClick={() => setUnit('blocks')} className="flex-1">Blocks</Button>
                  <Button type="button" variant={unit === 'seconds' ? 'primary' : 'ghost'} onClick={() => setUnit('seconds')} className="flex-1">Seconds</Button>
                </div>
                {unit === 'blocks' ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="Enter number of blocks ahead"
                    value={blocksAhead}
                    onChange={(e) => setBlocksAhead(e.target.value)}
                    className="font-funnel-display w-full px-4 py-2 border border-gray-300 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="Enter seconds until decryption"
                    value={secondsAhead}
                    onChange={(e) => setSecondsAhead(e.target.value)}
                    className="font-funnel-display w-full px-4 py-2 border border-gray-300 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
                {unit === 'seconds' && avgBlockTimeSeconds && (
                  <p className="text-xs text-ghost-500">≈ {blocksAhead} blocks @ ~{avgBlockTimeSeconds}s/block</p>
                )}
              </div>
              {estimatedDecryptionTime && (
                <p className="text-sm text-green-500 mt-2 font-funnel-display">
                  Estimated decryption: {estimatedDecryptionTime}
                </p>
              )}

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
                      <span>{estimatedDecryptionTime}</span>
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
                  : `Submit ${side.charAt(0).toUpperCase() + side.slice(1)} Intent`
                }
              </Button>
            </form>
          </CardContent>

          {/* Request ID Display */}
          {lastRequestId && (
                <div className="p-4 mt-4 bg-primary-500/50 rounded-lg border border-primary-500/20">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-primary-400" />
                    <span className="text-sm font-medium text-primary-300">
                      Blocklock Request ID: #{lastRequestId}
                    </span>
                  </div>
                  <p className="text-xs text-ghost-200 mt-1">
                    Use this ID to track decryption status
                  </p>
                </div>
              )}

          {/* Transaction Hash Display */}
        {lastTxHash && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-primary-400" />
                <span>Transaction Submitted</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Transaction Hash */}
                <div className="p-4 bg-ghost-800/50 rounded-lg border border-ghost-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-ghost-300 mb-1">
                        Transaction Hash
                      </div>
                      <div className="font-mono text-sm text-primary-400 break-all">
                        {lastTxHash}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const baseScanUrl = `https://sepolia.basescan.org/tx/${lastTxHash}`;
                        window.open(baseScanUrl, '_blank');
                      }}
                      className="text-xs"
                    >
                      View on BaseScan
                    </Button>
                  </div>
                </div>
                </div>

                {/* Transaction Status */}
                <div className="flex flex-col justify-between m-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isConfirming ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
                    <span className="text-sm text-ghost-300">
                      {isConfirming ? 'Confirming...' : 'Confirmed'}
                    </span>
                  </div>
                  {receipt && (
                    <Badge variant="success" className="text-xs">
                      Block #{receipt.blockNumber?.toString()}
                    </Badge>
                  )}

                {/* Intent Details */}
                {receipt && (
                  <div className="p-3 bg-ghost-800/30 rounded-lg">
                    <div className="text-xs text-ghost-300 space-y-1">
                      <div>Gas Used: {receipt.gasUsed?.toString() || 'N/A'}</div>
                      <div>Effective Gas Price: {receipt.effectiveGasPrice ? ethers.formatUnits(receipt.effectiveGasPrice, 'gwei') + ' gwei' : 'N/A'}</div>
                      <div>Status: {receipt?.status?.toUpperCase()}</div>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <div className="text-xs text-ghost-300 bg-ghost-800/20 p-3 rounded-lg">
                  <p className="mb-2">
                    <strong>Next Steps:</strong>
                  </p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Your intent is now encrypted and stored on-chain</li>
                    <li>Decryption will happen automatically at block {targetBlock}</li>
                    <li>Monitor the UserIntentsTable for status updates</li>
                    <li>Use the transaction hash above to verify on BaseScan</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </Card>
      </div>

      {/* Info Panel */}
      <div className="space-y-6">
        {/* Block Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span>Block Info</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-ghost-400">Current Block:</span>
                <span className="font-mono">{formatNumber(currentBlock)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ghost-400">Target Block:</span>
                <span className="font-mono">{formatNumber(currentBlock + Number(blocksAhead))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ghost-400">Est. Time:</span>
                <span>{estimatedDecryptionTime}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Epoch Info */}
        {epochInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                <span>Current Epoch</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-ghost-400">Epoch:</span>
                  <span className="font-mono">#{epochInfo?.currentEpoch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ghost-400">Progress:</span>
                  <span>{epochInfo?.progressPercent.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-ghost-700 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-primary-500 to-blue-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${epochInfo?.progressPercent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="flex justify-between text-xs text-ghost-400">
                  <span>Block {epochInfo?.epochStartBlock}</span>
                  <span>Block {epochInfo?.epochEndBlock}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Protection Features */}
        <Card>
          <CardHeader>
            <CardTitle>MEV Protection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-green-400" />
                <div>
                  <div className="font-medium">Blocklock Encryption</div>
                  <div className="text-sm text-ghost-400">Intent hidden until execution</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <ArrowUpDown className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="font-medium">VRF Ordering</div>
                  <div className="text-sm text-ghost-400">Fair transaction sequencing</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Zap className="w-5 h-5 text-purple-400" />
                <div>
                  <div className="font-medium">Batch Settlement</div>
                  <div className="text-sm text-ghost-400">Uniform pricing mechanism</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Market Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Market Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-ghost-400">24h Volume:</span>
                <span>$2.4M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ghost-400">Active Intents:</span>
                <span>47</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ghost-400">Success Rate:</span>
                <Badge variant="success">99.2%</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-ghost-400">Avg. Protection:</span>
                <Badge variant="info">98.7%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warning */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-yellow-400 mb-1">Important Notice</p>
                <p className="text-ghost-400">
                  Your intent will be encrypted and only executable after the target block.
                  Ensure you have sufficient token balances for settlement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}