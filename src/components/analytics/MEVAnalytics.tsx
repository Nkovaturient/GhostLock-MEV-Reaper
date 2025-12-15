import { motion } from 'framer-motion'
import { Shield, DollarSign, Activity, TrendingUp, TrendingDown, AlertTriangle, Zap, Search, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { formatCurrency } from '../../lib/utils'
import { useMEVGlobal, refreshMEVData } from '../../hooks/useMEVData'
import React, { useState, useCallback } from 'react'
import { useSharedBlockNumber } from '../../hooks/useSharedBlockNumber'

export default function MEVAnalytics() {
  const [searchParams, setSearchParams] = useState({
    address: '0x00356ce6250f8489d23ff32742256ab5be9dd8d7',
    count: 10,
    block_number: 16824821,
    page: 1
  })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCustomSearch, setIsCustomSearch] = useState(false)

  // Get current block number
  const { blockNumber: currentBlock } = useSharedBlockNumber()

  // Use dynamic parameters for MEV data
  const { data: mevData, isLoading, error } = useMEVGlobal(searchParams)

  const handleAddressChange = (address: string) => {
    // Basic Ethereum address validation
    if (address === '' || address.startsWith('0x') && address.length === 42) {
      setSearchParams(prev => ({ ...prev, address }))
      setIsCustomSearch(true)
    }
  }

  const handleCountChange = (count: number) => {
    setSearchParams(prev => ({ ...prev, count: Math.min(Math.max(count, 1), 100) }))
    setIsCustomSearch(true)
  }

  const handleBlockNumberChange = (block_number: number) => {
    setSearchParams(prev => ({ ...prev, block_number }))
    setIsCustomSearch(true)
  }

  const handleResetToDefault = () => {
    setSearchParams({
      address: '0x00356ce6250f8489d23ff32742256ab5be9dd8d7',
      count: 10,
      block_number: 16824821,
      page: 1
    })
    setIsCustomSearch(false)
  }

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refreshMEVData(searchParams)
    } catch (error) {
      console.error('Failed to refresh MEV data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [searchParams])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
        <span className="ml-3 text-ghost-400">
          {isCustomSearch ? 'Searching MEV data...' : 'Loading MEV analytics...'}
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-red-400 mb-2">Failed to Load MEV Data</h2>
        <p className="text-ghost-400 mb-4">Unable to fetch MEV protection data</p>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
        >
          {isRefreshing ? 'Refreshing...' : 'Retry'}
        </button>
      </div>
    )
  }

  if (!mevData) return null

  const metrics = [
    {
      title: 'Total MEV Extracted',
      value: formatCurrency(mevData.totalMEV),
      change: '+12.3%',
      trend: 'up' as const,
      icon: DollarSign,
      description: 'Total MEV value extracted from transactions',
      color: 'text-red-400'
    },
    {
      title: 'Total Volume Protected',
      value: formatCurrency(mevData.totalVolume),
      change: '+8.7%',
      trend: 'up' as const,
      icon: Shield,
      description: 'Trading volume exposed to MEV attacks',
      color: 'text-blue-400'
    },
    {
      title: 'MEV to Volume Ratio',
      value: `${mevData.mevToVolumeRatio.toFixed(2)}%`,
      change: '-2.1%',
      trend: 'down' as const,
      icon: Activity,
      description: 'Percentage of volume lost to MEV',
      color: 'text-yellow-400'
    },
    {
      title: 'Avg MEV per Transaction',
      value: formatCurrency(mevData.avgMEVPerTx),
      change: '+5.4%',
      trend: 'up' as const,
      icon: Zap,
      description: 'Average MEV extracted per transaction',
      color: 'text-purple-400'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">MEV Protection Analytics</h2>
          <p className="text-ghost-300">
            Real-time insights from ZeroMEV API • Last updated: {new Date(mevData.lastUpdated).toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-ghost-700 text-white rounded-lg hover:bg-ghost-600 disabled:opacity-50"
        >
          <Zap className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Search and Parameters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>MEV Data Parameters</span>
          </CardTitle>
          <p className="text-sm text-ghost-400">
            Search for MEV data by wallet address, block range, and transaction count. Use the search button to fetch data with your parameters.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Address Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-ghost-300">Wallet Address</label>
              <input
                type="text"
                value={searchParams.address}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="0x..."
                className={`w-full px-3 py-2 bg-ghost-800 border rounded-lg text-white placeholder-ghost-400 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  searchParams.address && (!searchParams.address.startsWith('0x') || searchParams.address.length !== 42)
                    ? 'border-red-500'
                    : 'border-ghost-600'
                }`}
              />
              {searchParams.address && (!searchParams.address.startsWith('0x') || searchParams.address.length !== 42) && (
                <p className="text-xs text-red-400">Please enter a valid Ethereum address (0x...)</p>
              )}
            </div>

            {/* Count Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-ghost-300">Block Count (1-100)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={searchParams.count}
                onChange={(e) => handleCountChange(parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2 bg-ghost-800 border border-ghost-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Block Number Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-ghost-300">Starting Block</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={searchParams.block_number}
                  onChange={(e) => handleBlockNumberChange(parseInt(e.target.value) || 16824821)}
                  className="flex-1 px-3 py-2 bg-ghost-800 border border-ghost-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {currentBlock !== undefined && (
                  <button
                    onClick={() => handleBlockNumberChange(Number(currentBlock))}
                    className="px-2 py-2 bg-ghost-600 text-white rounded-lg hover:bg-ghost-500 transition-colors text-xs"
                    title="Set to current block"
                  >
                    Now
                  </button>
                )}
              </div>
            </div>

            {/* Search Button */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-ghost-300">&nbsp;</label>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || !searchParams.address.startsWith('0x') || searchParams.address.length !== 42}
                className="w-full px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                {isRefreshing ? 'Searching...' : 'Search MEV Data'}
              </button>
            </div>

            {/* Reset Button */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-ghost-300">&nbsp;</label>
              <button
                onClick={handleResetToDefault}
                className="w-full px-3 py-2 bg-ghost-700 text-white rounded-lg hover:bg-ghost-600 transition-colors"
              >
                Reset to Default
              </button>
            </div>
          </div>

          {/* Current Parameters Display */}
          {isCustomSearch && (
            <div className="mt-4 p-3 bg-ghost-800/50 rounded-lg border border-ghost-600">
              <div className="flex items-center space-x-2 mb-2">
                <Settings className="w-4 h-4 text-primary-400" />
                <span className="text-sm font-medium text-ghost-300">Current Parameters:</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-ghost-400">
                <span>Address: {searchParams.address.slice(0, 8)}...{searchParams.address.slice(-6)}</span>
                <span>Count: {searchParams.count}</span>
                <span>Block: {searchParams.block_number}</span>
                <span>Page: {searchParams.page}</span>
                <span>Status: {isCustomSearch ? 'Custom' : 'Default'}</span>
              </div>
              {currentBlock !== undefined && (
                <div className="mt-2 text-xs text-ghost-500">
                  Current Block: {Number(currentBlock).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card hover glow>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-primary-500/20 rounded-lg">
                    <metric.icon className={`w-5 h-5 ${metric.color}`} />
                  </div>
                  <div className={`flex items-center space-x-1 text-sm ${
                    metric.trend === 'up' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {metric.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{metric.change}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">{metric.value}</h3>
                  <p className="text-sm font-medium text-ghost-300">{metric.title}</p>
                  <p className="text-xs text-ghost-400">{metric.description}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* MEV Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>MEV Attack Types Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mevData && Object.entries({
              'Arbitrage': { count: mevData.totalTransactions, profit: mevData.totalMEV, volume: mevData.totalVolume },
              'Frontrunning': { count: Math.floor(mevData.totalTransactions * 0.3), profit: mevData.totalMEV * 0.4, volume: mevData.totalVolume * 0.3 },
              'Sandwich': { count: Math.floor(mevData.totalTransactions * 0.2), profit: mevData.totalMEV * 0.3, volume: mevData.totalVolume * 0.2 },
              'Liquidation': { count: Math.floor(mevData.totalTransactions * 0.1), profit: mevData.totalMEV * 0.2, volume: mevData.totalVolume * 0.1 },
              'Backrunning': { count: Math.floor(mevData.totalTransactions * 0.15), profit: mevData.totalMEV * 0.1, volume: mevData.totalVolume * 0.15 },
              'Swap Volume': { count: Math.floor(mevData.totalTransactions * 0.25), profit: 0, volume: mevData.totalVolume * 0.25 }
            }).map(([type, data]) => (
              <div key={type} className="p-4 rounded-lg bg-ghost-800/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-white">{type}</h4>
                  <Badge variant={type === 'Swap Volume' ? 'info' : 'danger'}>
                    {data.count} tx
                  </Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="text-ghost-400">
                    Profit: {formatCurrency(data.profit)}
                  </div>
                  <div className="text-ghost-400">
                    Volume: {formatCurrency(data.volume)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Protection Impact */}
      <Card>
        <CardHeader>
          <CardTitle>MEV Protection Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-900/20 border border-green-700/30">
              <div className="flex items-center space-x-3">
                <Shield className="w-6 h-6 text-green-400" />
                <div>
                  <h4 className="font-medium text-white">Value Protected</h4>
                  <p className="text-sm text-green-300">
                    {formatCurrency(mevData.totalVolume)} in trading volume exposed to MEV
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-400">
                  {mevData.totalTransactions}
                </div>
                <div className="text-sm text-green-300">Transactions</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-lg bg-red-900/20 border border-red-700/30">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <div>
                  <h4 className="font-medium text-white">MEV Losses</h4>
                  <p className="text-sm text-red-300">
                    {formatCurrency(mevData.totalMEV)} extracted by MEV bots
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-400">
                  {mevData.mevToVolumeRatio.toFixed(2)}%
                </div>
                <div className="text-sm text-red-300">of Volume</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
