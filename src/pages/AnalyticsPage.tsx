import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Activity, DollarSign, Shield, Network, RefreshCw, CheckCircle, Clock, Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { useMarkets, useMarketStats, refreshMarketData } from '@/hooks/useMarketData'
import { useBlockchainData, useNetworkStats, refreshBlockchainData } from '@/hooks/useBlockchainData'
import { useCryptoData, useDefiData, useExternalMEVData, refreshExternalData } from '@/hooks/useExternalData'
import { useState } from 'react'
import MEVAnalytics from '@/components/analytics/MEVAnalytics'
import { useExplorer } from '@/hooks/useExplorer'

export default function AnalyticsPage() {
  const { data: markets, isLoading: marketsLoading, error: marketsError } = useMarkets()
  const { data: stats, isLoading: statsLoading, error: statsError } = useMarketStats()
  const { data: userIntents, isLoading: intentsLoading, error: intentsError, refetch: refetchIntents } = useExplorer()
  
  // External data hooks
  const { data: cryptoData, isLoading: cryptoLoading } = useCryptoData()
  const { data: defiData, isLoading: defiLoading } = useDefiData()
  const { data: externalMEVData, isLoading: externalMEVLoading } = useExternalMEVData()
  
  // Blockchain data hooks - only load when needed
  const { data: blockchainData, isLoading: blockchainLoading } = useBlockchainData()
  const { data: networkStats, isLoading: networkStatsLoading } = useNetworkStats()
  
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showBlockchainData, setShowBlockchainData] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        refreshMarketData(),
        refreshExternalData()
      ])
      
      // If blockchain data is enabled, also refresh it
      if (showBlockchainData) {
        refreshBlockchainData()
      }
      
      // The queries will automatically refetch due to React Query's invalidation
    } catch (error) {
      console.error('Failed to refresh data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const isLoading = marketsLoading || statsLoading || intentsLoading || cryptoLoading || defiLoading || externalMEVLoading || (showBlockchainData && (blockchainLoading || networkStatsLoading))
  const hasError = marketsError || statsError || intentsError

  // Prepare metrics from real data with external API integration
  const metrics = [
    {
      title: 'Total Value Protected',
      value: stats ? formatCurrency(stats.totalValueProtected) : '—',
      change: stats ? `${stats.totalValueProtected > 0 ? '+' : ''}${((stats.totalValueProtected / 1000000) * 100).toFixed(1)}%` : '—',
      trend: stats && stats.totalValueProtected > 0 ? 'up' as const : 'down' as const,
      icon: Shield,
      description: 'Cumulative value shielded from MEV',
      color: 'text-blue-400'
    },
    {
      title: 'MEV Savings',
      value: externalMEVData ? formatCurrency(externalMEVData.totalMEV) : (stats ? formatCurrency(stats.mevSavings) : '—'),
      change: externalMEVData ? `${externalMEVData.totalMEV > 0 ? '+' : ''}${((externalMEVData.totalMEV / 1000) * 100).toFixed(1)}%` : (stats ? `${stats.mevSavings > 0 ? '+' : ''}${((stats.mevSavings / 1000) * 100).toFixed(1)}%` : '—'),
      trend: (externalMEVData && externalMEVData.totalMEV > 0) || (stats && stats.mevSavings > 0) ? 'up' as const : 'down' as const,
      icon: DollarSign,
      description: 'Total MEV extraction prevented',
      color: 'text-green-400'
    },
    {
      title: 'Success Rate',
      value: stats ? `${stats.successRate.toFixed(1)}%` : '—',
      change: stats ? `${stats.successRate > 50 ? '+' : ''}${(stats.successRate - 50).toFixed(1)}%` : '—',
      trend: stats && stats.successRate > 50 ? 'up' as const : 'down' as const,
      icon: Activity,
      description: 'Intent execution success rate',
      color: 'text-purple-400'
    },
    {
      title: 'Network Congestion',
      value: networkStats ? networkStats.congestionLevel : '—',
      change: networkStats ? `${networkStats.baseFee} gwei` : '—',
      trend: networkStats && networkStats.congestionLevel === 'Low' ? 'down' as const : 'up' as const,
      icon: Network,
      description: 'Current network status',
      color: networkStats ? (networkStats.congestionLevel === 'Low' ? 'text-green-400' : networkStats.congestionLevel === 'Medium' ? 'text-yellow-400' : 'text-red-400') : 'text-gray-400'
    }
  ]

  // Prepare top markets from real data with external price integration
  const topMarkets = markets ? markets
    .map(market => {
      // Get real-time price data for the market
      let currentPrice = market.currentPrice
      let change24h = market.change24h
      
      if (cryptoData) {
        if (market.baseSymbol === 'ETH') {
          currentPrice = cryptoData.ethereum.price
          change24h = cryptoData.ethereum.change24h
        } else if (market.baseSymbol === 'WBTC') {
          currentPrice = cryptoData.wbtc.price
          change24h = cryptoData.wbtc.change24h
        }
      }
      
      return {
        market: market.name,
        currentPrice,
        volume: market.volume24h,
        share: markets.length > 0 ? (market.volume24h / markets.reduce((sum, m) => sum + m.volume24h, 0)) * 100 : 0,
        change: change24h,
        activeIntents: market.activeIntents,
        settledIntents: market.settledIntents
      }
    })
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5) : []

  // Prepare DeFi protocols data
  const topDefiProtocols = defiData ? defiData
    .sort((a, b) => b.tvl - a.tvl)
    .slice(0, 5) : []

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-ghost-400">Loading real-time analytics...</span>
          </div>
        </div>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Activity className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-400 mb-2">Failed to Load Analytics</h2>
            <p className="text-ghost-400 mb-4">Unable to fetch market data from the server</p>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
            >
              {isRefreshing ? 'Refreshing...' : 'Retry'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-4">
                Analytics Dashboard
              </h1>
              <p className="text-ghost-300 text-lg">
                Real-time insights from Etherscan APIs and blockchain data
              </p>
              {showBlockchainData && blockchainData && (
                <div className="mt-2">
                  <p className="text-sm text-ghost-400">
                    Current Block: {blockchainData.currentBlock.toLocaleString()} • 
                    Gas: {blockchainData.gasPrice} gwei • 
                    Last Updated: {new Date(blockchainData.lastUpdated).toLocaleTimeString()}
                  </p>
                  <p className="text-xs text-blue-400 mt-1">
                    🔒 Blockchain data cached for 1 hour to reduce network requests
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowBlockchainData(!showBlockchainData)}
                className="flex items-center space-x-2 px-3 py-2 bg-ghost-600 text-white rounded-lg hover:bg-ghost-500 transition-colors"
              >
                <Network className="w-4 h-4" />
                <span>{showBlockchainData ? 'Hide' : 'Show'} Blockchain Data</span>
              </button>
              {showBlockchainData && (
                <button
                  onClick={() => {
                    refreshBlockchainData()
                    // Force refetch by toggling state
                    setShowBlockchainData(false)
                    setTimeout(() => setShowBlockchainData(true), 100)
                  }}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                  title="Refresh blockchain data (cached for 1 hour)"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh Blockchain</span>
                </button>
              )}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-ghost-700 text-white rounded-lg hover:bg-ghost-600 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh All'}</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        {/* Real-time Market Data */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Top Markets with Real Prices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span>Live Market Prices</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topMarkets.length > 0 ? (
                  topMarkets.map((market, index) => (
                    <motion.div
                      key={market.market}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-ghost-800/30"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{market.market}</div>
                          <div className="text-sm text-ghost-400">
                            ${market.currentPrice?.toFixed(2) || '0.00'} • {market.share.toFixed(1)}%
                          </div>
                          <div className="text-xs text-ghost-500">
                            {market.activeIntents} active, {market.settledIntents} settled
                          </div>
                        </div>
                      </div>
                      <div className={`text-sm font-medium ${
                        market.change >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatPercentage(market.change)}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-ghost-400">
                    <Globe className="w-8 h-8 mx-auto mb-2" />
                    <p>No market data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top DeFi Protocols */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5" />
                <span>Top DeFi Protocols</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topDefiProtocols.length > 0 ? (
                  topDefiProtocols.map((protocol, index) => (
                    <motion.div
                      key={protocol.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-ghost-800/30"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{protocol.name}</div>
                          <div className="text-sm text-ghost-400">
                            {formatCurrency(protocol.tvl)} TVL
                          </div>
                          <div className="text-xs text-ghost-500">
                            {protocol.category}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          protocol.change1d >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatPercentage(protocol.change1d)}
                        </div>
                        <div className="text-xs text-ghost-400">24h</div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-ghost-400">
                    <DollarSign className="w-8 h-8 mx-auto mb-2" />
                    <p>No DeFi data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent User Intents</CardTitle>
                <button 
                  onClick={() => refetchIntents?.()}
                  disabled={intentsLoading}
                  className="flex items-center space-x-2 px-3 py-1 bg-ghost-700 text-white rounded-lg hover:bg-ghost-600 disabled:opacity-50 text-sm"
                >
                  <RefreshCw className={`w-3 h-3 ${intentsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userIntents && userIntents.length > 0 ? (
                  userIntents.slice(0, 6).map((intent, index) => (
                    <motion.div
                      key={intent.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-ghost-800/30"
                    >
                      <div className="flex items-center space-x-3">
                        <Badge variant={intent.message === 'Decrypted' ? 'success' : 'warning'}>
                          {intent.message === 'Decrypted' ? 'Settled' : 'Pending'}
                        </Badge>
                        <div>
                          <div className="font-medium">Intent #{intent.id}</div>
                          <div className="text-sm text-ghost-400">
                            {intent.message === 'Decrypted' ? 'Decrypted' : 'Encrypted'} • Block {intent.encryptedAt}
                          </div>
                          <div className="text-xs text-ghost-500">
                            {intent.requestedBy.slice(0, 6)}...{intent.requestedBy.slice(-4)}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-ghost-400">
                        {intent.message === 'Decrypted' ? (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span>Ready</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-yellow-400" />
                            <span>Waiting</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-ghost-400">
                    <Activity className="w-8 h-8 mx-auto mb-2" />
                    <p>No user intents found</p>
                    <p className="text-xs text-ghost-500 mt-1">Submit an intent to see it here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

                    {/* Blockchain Network Stats - Only show when blockchain data is enabled */}
          {showBlockchainData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Network className="w-5 h-5" />
                  <span>Network Statistics</span>
                </CardTitle>
                <p className="text-xs text-blue-400 mt-1">
                  🔒 Cached for 1 hour • Click "Refresh Blockchain" for fresh data
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {blockchainData && (
                    <>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-ghost-800/30">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xs font-bold">
                            #
                          </div>
                          <div>
                            <div className="font-medium">Current Block</div>
                            <div className="text-sm text-ghost-400">
                              {blockchainData.currentBlock.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-blue-400">
                            {blockchainData.avgBlockTime}s
                          </div>
                          <div className="text-xs text-ghost-400">avg time</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-ghost-800/30">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                            ⚡
                          </div>
                          <div>
                            <div className="font-medium">Network Utilization</div>
                            <div className="text-sm text-ghost-400">
                              {blockchainData.networkUtilization.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-400">
                            {blockchainData.baseFee} gwei
                          </div>
                          <div className="text-xs text-ghost-400">base fee</div>
                        </div>
                      </div>
                    </>
                  )}

                  {networkStats && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-ghost-800/30">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          networkStats.congestionLevel === 'Low' ? 'bg-green-500' :
                          networkStats.congestionLevel === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}>
                          {networkStats.congestionLevel === 'Low' ? '🟢' : 
                           networkStats.congestionLevel === 'Medium' ? '🟡' : '🔴'}
                        </div>
                        <div>
                          <div className="font-medium">Congestion Level</div>
                          <div className="text-sm text-ghost-400">
                            {networkStats.congestionLevel}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-ghost-400">
                          {networkStats.baseFee} gwei
                        </div>
                        <div className="text-xs text-ghost-400">current</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* MEV Analytics */}
        <MEVAnalytics />
      </div>
    </div>
  )
}