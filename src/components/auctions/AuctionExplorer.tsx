import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Search, Filter, TrendingUp, Users, Clock, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Badge } from '../ui/Badge'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { useAuctionData } from '../../hooks/useAuctionData'
import { formatCurrency, formatNumber } from '../../lib/utils'

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'settled', label: 'Settled' },
  { value: 'settling', label: 'Settling' },
  { value: 'pending', label: 'Pending' }
]

const marketOptions = [
  { value: 'all', label: 'All Markets' },
  { value: 'ETH/USDC', label: 'ETH/USDC' },
  { value: 'WBTC/USDC', label: 'WBTC/USDC' }
]

export default function AuctionExplorer() {
  const { data: auctions, isLoading, error } = useAuctionData()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [marketFilter, setMarketFilter] = useState('all')
  
  // Ensure auctions is always an array
  const auctionsArray = Array.isArray(auctions) ? auctions : []
  
  const filteredAuctions = auctionsArray.filter(auction => {
    const matchesSearch = auction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      auction.market.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || auction.status.toLowerCase() === statusFilter
    const matchesMarket = marketFilter === 'all' || auction.market === marketFilter

    return matchesSearch && matchesStatus && matchesMarket
  })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'settled': return 'success'
      case 'settling': return 'warning'
      case 'pending': return 'info'
      default: return 'default'
    }
  }

  // Calculate summary stats
  const totalVolume = auctionsArray.reduce((sum, auction) => sum + auction.volume, 0)
  const avgIntents = auctionsArray.length ? Math.round(auctionsArray.reduce((sum, a) => sum + a.intents, 0) / auctionsArray.length) : 0
  const settledCount = auctionsArray.filter(a => a.status === 'Settled').length

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-ghost-700 rounded mb-2" />
                  <div className="h-8 bg-ghost-700 rounded mb-2" />
                  <div className="h-3 bg-ghost-700 rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        {[
          {
            label: 'Total Volume',
            value: formatCurrency(totalVolume),
            icon: TrendingUp,
            change: '+12.5%',
            color: 'text-green-400'
          },
          {
            label: 'Total Auctions',
            value: auctionsArray.length.toString(),
            icon: Activity,
            change: `+${settledCount}`,
            color: 'text-blue-400'
          },
          {
            label: 'Avg Intents',
            value: avgIntents.toString(),
            icon: Users,
            change: '+8.2%',
            color: 'text-purple-400'
          },
          {
            label: 'Avg Settlement',
            value: '42s',
            icon: Clock,
            change: '-5.1%',
            color: 'text-orange-400'
          }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card hover>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-ghost-400 text-sm">{stat.label}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className={`text-xs ${stat.color}`}>
                      {stat.change}
                    </p>
                  </div>
                  <div className="p-3 bg-primary-500/20 rounded-lg">
                    <stat.icon className="w-6 h-6 text-primary-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search auctions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
            />
            <Select
              value={marketFilter}
              onChange={(e) => setMarketFilter(e.target.value)}
              options={marketOptions}
            />
            <Button variant="secondary">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auctions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Auctions</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
              <p className="text-red-400">Failed to load auction data</p>
            </div>
          ) : filteredAuctions.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-8 h-8 text-ghost-600 mx-auto mb-4" />
              <p className="text-ghost-400">No auctions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ghost-700">
                    <th className="text-left py-3 px-4 text-ghost-400 font-medium">Auction ID</th>
                    <th className="text-left py-3 px-4 text-ghost-400 font-medium">Market</th>
                    <th className="text-left py-3 px-4 text-ghost-400 font-medium">Clearing Price</th>
                    <th className="text-left py-3 px-4 text-ghost-400 font-medium">AI Price</th>
                    <th className="text-left py-3 px-4 text-ghost-400 font-medium">Intents</th>
                    <th className="text-left py-3 px-4 text-ghost-400 font-medium">Volume</th>
                    <th className="text-left py-3 px-4 text-ghost-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-ghost-400 font-medium">Settlement</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuctions.map((auction, index) => (
                    <motion.tr
                      key={auction.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border-b border-ghost-800 hover:bg-ghost-800/30 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <span className="font-mono text-primary-400">{auction.id}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium">{auction.market}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono">{formatCurrency(Number(auction.clearingPrice))}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-ghost-400">
                          {auction.aiPrice ? formatCurrency(Number(auction.aiPrice)) : '—'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium">{auction.intents}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium">{formatCurrency(auction.volume)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={getStatusColor(auction.status) as any}>
                          {auction.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-ghost-400 text-sm">
                          Block {formatNumber(auction.settlementBlock)}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}