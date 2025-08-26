import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Clock, TrendingUp, Users, Filter, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { formatNumber, formatCurrency, formatTime } from '@/lib/utils'

// Mock auction data
const auctions = [
  {
    id: 'A-1001',
    market: 'ETH/USDC',
    clearingPrice: 3120.52,
    aiPrice: 3118.90,
    intents: 42,
    settlementBlock: 12345678,
    status: 'Settled',
    volume: 1250000,
    timestamp: Date.now() - 3600000
  },
  {
    id: 'A-1000',
    market: 'WBTC/USDC',
    clearingPrice: 64123.00,
    aiPrice: 64100.12,
    intents: 11,
    settlementBlock: 12345500,
    status: 'Settling',
    volume: 890000,
    timestamp: Date.now() - 7200000
  },
  {
    id: 'A-999',
    market: 'ETH/USDC',
    clearingPrice: 3115.20,
    aiPrice: 3116.45,
    intents: 28,
    settlementBlock: 12345200,
    status: 'Settled',
    volume: 750000,
    timestamp: Date.now() - 10800000
  }
]

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'settled', label: 'Settled' },
  { value: 'settling', label: 'Settling' },
  { value: 'pending', label: 'Pending' }
]

const marketOptions = [
  { value: 'all', label: 'All Markets' },
  { value: 'ETH/USDC', label: 'ETH/USDC' },
  { value: 'WBTC/USDC', label: 'WBTC/USDC' },
  { value: 'LINK/USDC', label: 'LINK/USDC' }
]

export default function AuctionPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [marketFilter, setMarketFilter] = useState('all')

  const filteredAuctions = auctions.filter(auction => {
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

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Auction Explorer
          </h1>
          <p className="text-ghost-300 text-lg">
            Monitor batch auctions and settlement data in real-time
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Volume', value: '$2.89M', icon: TrendingUp, change: '+12.5%' },
            { label: 'Active Auctions', value: '7', icon: Activity, change: '+2' },
            { label: 'Avg Settlement', value: '42s', icon: Clock, change: '-8.2%' },
            { label: 'Participants', value: '1,247', icon: Users, change: '+15.7%' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-ghost-400 text-sm">{stat.label}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className={`text-xs ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
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
        <Card className="mb-8">
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
                    <th className="text-left py-3 px-4 text-ghost-400 font-medium">Time</th>
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
                        <span className="font-mono">{formatCurrency(auction.clearingPrice)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-ghost-400">
                          {auction.aiPrice ? formatCurrency(auction.aiPrice) : '—'}
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
                          {formatTime(auction.timestamp / 1000)}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}