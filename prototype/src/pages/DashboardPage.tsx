import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { User, AlertCircle } from 'lucide-react'
import UserIntentsTable from '../../../../src/components/dashboard/UserIntentsTable'
import { Card, CardContent } from '../../../../src/components/ui/Card'

export default function DashboardPage() {
  const { isConnected, address } = useAccount()

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-4">
            <User className="w-8 h-8 text-primary-400" />
            <div>
              <h1 className="text-4xl font-bold gradient-text">
                Trading Dashboard
              </h1>
              <p className="text-ghost-300 text-lg">
                Monitor your encrypted intents and settlement history
              </p>
            </div>
          </div>
          
          {address && (
            <div className="text-sm text-ghost-400">
              Connected: {address.slice(0, 6)}...{address.slice(-4)}
            </div>
          )}
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
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="font-medium text-yellow-400">Wallet Connection Required</p>
                    <p className="text-ghost-400 text-sm">
                      Please connect your wallet to view your trading dashboard and intent history.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

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