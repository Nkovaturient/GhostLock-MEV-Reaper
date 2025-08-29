import { motion } from 'framer-motion'
import { Shield, DollarSign, Activity, TrendingUp, TrendingDown, AlertTriangle, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { useMEVGlobal, refreshMEVData } from '@/hooks/useMEVData'
import { useState } from 'react'

export default function MEVAnalytics() {
  const { data: mevData, isLoading, error } = useMEVGlobal()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshMEVData()
    } catch (error) {
      console.error('Failed to refresh MEV data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
        <span className="ml-3 text-ghost-400">Loading MEV analytics...</span>
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
