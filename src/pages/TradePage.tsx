import React from 'react'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { Shield, AlertTriangle } from 'lucide-react'
import IntentSubmissionForm from '@/components/trading/IntentSubmissionForm'
import UserIntentsTable from '@/components/dashboard/UserIntentsTable'
import { Card, CardContent } from '@/components/ui/Card'

export default function TradePage() {
  const { isConnected } = useAccount()

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

        {/* Connection Warning */}
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="font-medium text-yellow-400">Wallet Connection Required</p>
                    <p className="text-ghost-400 text-sm">
                      Please connect your wallet to submit trading intents and access the dashboard.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Intent Submission Form */}
        <div className="mb-12">
          <IntentSubmissionForm />
        </div>

        {/* User Intents Table */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <UserIntentsTable />
          </motion.div>
        )}
      </div>
    </div>
  )
}