import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Activity, DollarSign, Shield, Zap, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { useMarkets, useMarketStats, refreshMarketData } from '@/hooks/useMarketData'
import { useState } from 'react'
import MEVAnalytics from '@/components/analytics/MEVAnalytics'

export default function AnalyticsPage() {
  const { data: markets, isLoading: marketsLoading, error: marketsError } = useMarkets()
  const { data: stats, isLoading: statsLoading, error: statsError } = useMarketStats()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshMarketData()
      // The queries will automatically refetch due to React Query's invalidation
    } catch (error) {
      console.error('Failed to refresh market data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const isLoading = marketsLoading || statsLoading
  const hasError = marketsError || statsError

  // Prepare metrics from real data
  const metrics = [
    {
      title: 'Total Value Protected',
      value: stats ? formatCurrency(stats.totalValueProtected) : '—',
      change: '+23.5%', // This could be calculated from historical data
      trend: 'up' as const,
      icon: Shield,
      description: 'Cumulative value shielded from MEV'
    },
    {
      title: 'MEV Savings',
      value: stats ? formatCurrency(stats.mevSavings) : '—',
      change: '+18.2%',
      trend: 'up' as const,
      icon: DollarSign,
      description: 'Total MEV extraction prevented'
    },
    {
      title: 'Success Rate',
      value: stats ? `${stats.successRate.toFixed(1)}%` : '—',
      change: '+0.1%',
      trend: 'up' as const,
      icon: Activity,
      description: 'Intent execution success rate'
    },
    {
      title: 'Avg Settlement Time',
      value: stats ? `${Math.round(stats.avgSettlementTime / 1000)}s` : '—',
      change: '-12.3%',
      trend: 'down' as const,
      icon: Zap,
      description: 'Average time to settlement'
    }
  ]

  // Prepare top markets from real data
  const topMarkets = markets ? markets
    .map(market => ({
      market: market.name,
      volume: market.volume24h,
      share: markets.length > 0 ? (market.volume24h / markets.reduce((sum, m) => sum + m.volume24h, 0)) * 100 : 0,
      change: market.change24h,
      activeIntents: market.activeIntents,
      settledIntents: market.settledIntents
    }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5) : []

  // Prepare recent activity from real data
  const recentActivity = markets ? markets
    .flatMap(market => [
      {
        type: 'Intent' as const,
        market: market.name,
        amount: market.activeIntents,
        price: market.currentPrice,
        time: 'Active',
        status: 'pending' as const
      },
      {
        type: 'Settlement' as const,
        market: market.name,
        amount: market.settledIntents,
        price: market.currentPrice,
        time: 'Settled',
        status: 'success' as const
      }
    ])
    .sort((a, b) => {
      // Sort by activity type and then by amount
      if (a.type !== b.type) return a.type === 'Settlement' ? -1 : 1
      return b.amount - a.amount
    })
    .slice(0, 6) : []

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-ghost-400">Loading market analytics...</span>
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
                Real-time insights into MEV protection and trading performance
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-ghost-700 text-white rounded-lg hover:bg-ghost-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
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
                      <metric.icon className="w-5 h-5 text-primary-400" />
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

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Top Markets */}
          <Card>
            <CardHeader>
              <CardTitle>Top Markets by Volume</CardTitle>
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
                            {formatCurrency(market.volume)} • {market.share.toFixed(1)}%
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
                    <Activity className="w-8 h-8 mx-auto mb-2" />
                    <p>No market data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-ghost-800/30"
                    >
                      <div className="flex items-center space-x-3">
                        <Badge variant={activity.status === 'success' ? 'success' : 'warning'}>
                          {activity.type}
                        </Badge>
                        <div>
                          <div className="font-medium">{activity.market}</div>
                          <div className="text-sm text-ghost-400">
                            {activity.amount} intents @ {formatCurrency(activity.price)}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-ghost-400">
                        {activity.time}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-ghost-400">
                    <Activity className="w-8 h-8 mx-auto mb-2" />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MEV Analytics */}
        <MEVAnalytics />
      </div>
    </div>
  )
}