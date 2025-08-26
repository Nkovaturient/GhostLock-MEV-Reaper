import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Activity, DollarSign, Shield, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatPercentage } from '@/lib/utils'

const metrics = [
  {
    title: 'Total Value Protected',
    value: '$12.4M',
    change: '+23.5%',
    trend: 'up',
    icon: Shield,
    description: 'Cumulative value shielded from MEV'
  },
  {
    title: 'MEV Savings',
    value: '$847K',
    change: '+18.2%',
    trend: 'up',
    icon: DollarSign,
    description: 'Total MEV extraction prevented'
  },
  {
    title: 'Success Rate',
    value: '99.8%',
    change: '+0.1%',
    trend: 'up',
    icon: Activity,
    description: 'Intent execution success rate'
  },
  {
    title: 'Avg Settlement Time',
    value: '42s',
    change: '-12.3%',
    trend: 'down',
    icon: Zap,
    description: 'Average time to settlement'
  }
]

const topMarkets = [
  { market: 'ETH/USDC', volume: 8420000, share: 45.2, change: 12.5 },
  { market: 'WBTC/USDC', volume: 4230000, share: 22.8, change: -3.2 },
  { market: 'LINK/USDC', volume: 2840000, share: 15.3, change: 8.7 },
  { market: 'UNI/USDC', volume: 1890000, share: 10.2, change: 15.3 },
  { market: 'AAVE/USDC', volume: 1200000, share: 6.5, change: -5.1 }
]

const recentActivity = [
  {
    type: 'Settlement',
    market: 'ETH/USDC',
    amount: 125000,
    price: 3120.52,
    time: '2 min ago',
    status: 'success'
  },
  {
    type: 'Intent',
    market: 'WBTC/USDC',
    amount: 89000,
    price: 64100.12,
    time: '5 min ago',
    status: 'pending'
  },
  {
    type: 'Settlement',
    market: 'LINK/USDC',
    amount: 45000,
    price: 15.67,
    time: '8 min ago',
    status: 'success'
  }
]

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Analytics Dashboard
          </h1>
          <p className="text-ghost-300 text-lg">
            Real-time insights into MEV protection and trading performance
          </p>
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
                {topMarkets.map((market, index) => (
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
                          {formatCurrency(market.volume)} • {market.share}%
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${
                      market.change >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatPercentage(market.change)}
                    </div>
                  </motion.div>
                ))}
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
                {recentActivity.map((activity, index) => (
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
                          {formatCurrency(activity.amount)} @ {formatCurrency(activity.price)}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-ghost-400">
                      {activity.time}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>MEV Protection Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-ghost-800/30 rounded-lg">
              <div className="text-center">
                <Activity className="w-12 h-12 text-ghost-600 mx-auto mb-4" />
                <p className="text-ghost-400">Chart visualization coming soon</p>
                <p className="text-sm text-ghost-500">Real-time MEV protection metrics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}