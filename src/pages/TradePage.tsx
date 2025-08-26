import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAccount, useBlockNumber } from 'wagmi'
import { ArrowUpDown, Clock, Shield, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/stores/toastStore'
import { MARKETS } from '@/lib/contracts'
import { formatNumber } from '@/lib/utils'

const markets = [
  { value: 'ETH/USDC', label: 'ETH/USDC' },
  { value: 'WBTC/USDC', label: 'WBTC/USDC' },
  { value: 'LINK/USDC', label: 'LINK/USDC' }
]

const timeframes = [
  { value: '5', label: '5 blocks (~1 min)' },
  { value: '10', label: '10 blocks (~2 min)' },
  { value: '20', label: '20 blocks (~4 min)' },
  { value: '50', label: '50 blocks (~10 min)' }
]

export default function TradePage() {
  const { address, isConnected } = useAccount()
  const { data: blockNumber } = useBlockNumber({ watch: true })
  const { success, error } = useToast()
  
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [market, setMarket] = useState('ETH/USDC')
  const [amount, setAmount] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [slippage, setSlippage] = useState('0.5')
  const [timeframe, setTimeframe] = useState('10')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected) {
      error('Please connect your wallet')
      return
    }

    if (!amount || !limitPrice) {
      error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    
    try {
      // Simulate intent submission
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      success(
        'Intent Submitted Successfully',
        `Your ${side} order for ${amount} ${market.split('/')[0]} has been encrypted and submitted.`
      )
      
      // Reset form
      setAmount('')
      setLimitPrice('')
    } catch (err) {
      error('Failed to submit intent', 'Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentBlock = blockNumber ? Number(blockNumber) : 0
  const targetBlock = currentBlock + Number(timeframe)

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Protected Trading
          </h1>
          <p className="text-ghost-300 text-lg">
            Submit encrypted trading intents protected from MEV extraction
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Trading Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-primary-400" />
                  <span>Encrypted Intent</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Side Selection */}
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant={side === 'buy' ? 'primary' : 'ghost'}
                      onClick={() => setSide('buy')}
                      className="flex-1"
                    >
                      Buy
                    </Button>
                    <Button
                      type="button"
                      variant={side === 'sell' ? 'primary' : 'ghost'}
                      onClick={() => setSide('sell')}
                      className="flex-1"
                    >
                      Sell
                    </Button>
                  </div>

                  {/* Market Selection */}
                  <Select
                    label="Market"
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                    options={markets}
                  />

                  {/* Amount Input */}
                  <Input
                    label={`Amount (${market.split('/')[0]})`}
                    type="number"
                    step="0.000001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    required
                  />

                  {/* Limit Price */}
                  <Input
                    label={`Limit Price (${market.split('/')[1]})`}
                    type="number"
                    step="0.01"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder="0.00"
                    required
                  />

                  {/* Slippage */}
                  <Input
                    label="Max Slippage (%)"
                    type="number"
                    step="0.1"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    placeholder="0.5"
                  />

                  {/* Timeframe */}
                  <Select
                    label="Execution Timeframe"
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    options={timeframes}
                  />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    size="lg"
                    loading={isSubmitting}
                    disabled={!isConnected}
                    className="w-full"
                  >
                    {!isConnected ? 'Connect Wallet' : `Submit ${side.charAt(0).toUpperCase() + side.slice(1)} Intent`}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            {/* Current Block */}
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
                    <span className="font-mono">{formatNumber(targetBlock)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ghost-400">Est. Time:</span>
                    <span>{Number(timeframe) * 12}s</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Protection Features */}
            <Card>
              <CardHeader>
                <CardTitle>Protection Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-green-400" />
                    <div>
                      <div className="font-medium">MEV Protection</div>
                      <div className="text-sm text-ghost-400">Encrypted until execution</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <ArrowUpDown className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="font-medium">Fair Ordering</div>
                      <div className="text-sm text-ghost-400">VRF-based sequencing</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Zap className="w-5 h-5 text-purple-400" />
                    <div>
                      <div className="font-medium">Batch Settlement</div>
                      <div className="text-sm text-ghost-400">Uniform pricing</div>
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
                    <span className="text-ghost-400">Avg. Protection:</span>
                    <Badge variant="success">99.2%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}