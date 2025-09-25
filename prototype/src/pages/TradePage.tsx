import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { AlertTriangle, Shield } from 'lucide-react'
// import EnhancedIntentForm from '../components/trading/EnhancedIntentForm'
import UserIntentsTable from '../../../src/components/dashboard/UserIntentsTable'
import { Card, CardContent } from '../../../src/components/ui/Card'
import DynamicIntentForm from '../components/trading/DynamicIntentForm'

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
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="w-8 h-8 text-primary-400" />
            <div>
              <h1 className="text-4xl font-bold gradient-text">
                Encrypt.Randomize.Equalize
              </h1>
              <p className="text-ghost-300 text-lg">
                Submit encrypted trading intents with advanced privacy protection
              </p>
            </div>
          </div>
          
          {/* Process Steps */}
          <div className="flex items-center space-x-4 text-sm text-ghost-400">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
              <span>Encrypt Intent</span>
            </div>
            <div className="w-8 h-0.5 bg-ghost-600" />
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
              <span>Add Privacy</span>
            </div>
            <div className="w-8 h-0.5 bg-ghost-600" />
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
              <span>Fair Settlement</span>
            </div>
          </div>
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
                      Connect your wallet to submit encrypted trading intents and access the full demo.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Enhanced Intent Submission Form */}
        <div className="mb-12">
          <DynamicIntentForm />
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