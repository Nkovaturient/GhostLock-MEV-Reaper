import { motion } from 'framer-motion'
import { Brain, TrendingUp } from 'lucide-react'
import AuctionExplorer from '../../../src/components/auctions/AuctionExplorer'
import { Card, CardContent, CardHeader, CardTitle } from '../../../src/components/ui/Card'
import { Badge } from '../../../src/components/ui/Badge'

export default function AuctionPage() {
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
                Batch Auction Explorer
              </h1>
              <p className="text-ghost-300 text-lg">
                Monitor real-time batch auctions with dual pricing methods and settlement data
              </p>
            </div>
            
            {/* Pricing Methods Legend */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" />
                <span className="text-sm text-ghost-300">AI-Enhanced</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-ghost-600 rounded-full" />
                <span className="text-sm text-ghost-300">Heuristic</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Pricing Methods Info */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <span>AI-Enhanced Pricing</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-ghost-300 text-sm">
                  Advanced machine learning algorithms analyze intent flow patterns, 
                  detect MEV risks, and optimize clearing prices for maximum fairness.
                </p>
                <div className="flex items-center space-x-2">
                  <Badge variant="info">MEV-Aware</Badge>
                  <Badge variant="success">Confidence Scoring</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <span>Deterministic Pricing</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-ghost-300 text-sm">
                  Mathematical optimization using volume-weighted average pricing 
                  with imbalance adjustments and reference price validation.
                </p>
                <div className="flex items-center space-x-2">
                  <Badge variant="warning">Fallback Safe</Badge>
                  <Badge variant="info">Transparent</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Auction Explorer */}
        <AuctionExplorer />
      </div>
    </div>
  )
}