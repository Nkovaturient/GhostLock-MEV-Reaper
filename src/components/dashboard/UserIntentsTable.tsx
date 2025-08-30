import { motion } from 'framer-motion'
import { ExternalLink, CheckCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useUserIntents } from '@/hooks/useUserIntents'
import { formatIntentId } from '@/lib/blocklock-service'
import { formatNumber } from '@/lib/utils'
import { CONFIG } from '@/lib/config'
import Button from '../ui/Button'

export default function UserIntentsTable() {
  const { data: intents, isLoading, error } = useUserIntents()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400 mx-auto mb-4"></div>
            <p className="text-ghost-400">Loading intents...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-400 mb-2">Error loading intents</p>
            <p className="text-ghost-500 text-sm">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!intents || intents.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-ghost-400 mb-2">No intents found</p>
            <p className="text-ghost-500 text-sm">Submit an intent to see it here</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Your Trading Intents</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ghost-700">
                <th className="text-left py-3 px-4 text-ghost-400 font-medium">Intent ID</th>
                <th className="text-left py-3 px-4 text-ghost-400 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-ghost-400 font-medium">Target Block</th>
                <th className="text-left py-3 px-4 text-ghost-400 font-medium">Settlement Price</th>
                <th className="text-left py-3 px-4 text-ghost-400 font-medium">Details</th>
                <th className="text-left py-3 px-4 text-ghost-400 font-medium">Transaction</th>
                <th className="text-left py-3 px-4 text-ghost-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {intents.map((intent, index) => (
                <motion.tr
                  key={intent.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border-b border-ghost-800 hover:bg-ghost-800/30 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex flex-col">
                      <span className="font-mono text-primary-400">
                        {formatIntentId(intent.id)}
                      </span>
                      <span className="text-xs text-ghost-500">
                        Blocklock #{intent.id}
                      </span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      {intent.isDecrypted ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-yellow-400" />
                      )}
                      <Badge variant={intent.isDecrypted ? 'success' : 'warning'}>
                        {intent.isDecrypted ? 'Decrypted' : 'Encrypted'}
                      </Badge>
                    </div>
                  </td>
                  
                  <td className="py-4 px-4">
                    <div className="flex flex-col">
                      <span className="font-mono">{formatNumber(Number(intent.targetBlock))}</span>
                      <span className="text-xs text-ghost-500">
                        Block {intent.inclusionBlock}
                      </span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-4">
                    <span className="font-mono">
                      {intent.settlementPrice && intent.settlementPrice !== '0' 
                        ? `$${Number(intent.settlementPrice).toFixed(2)}`
                        : '—'
                      }
                    </span>
                  </td>
                  
                  <td className="py-4 px-4">
                    {intent.decrypted ? (
                      <div className="text-xs space-y-1">
                        <div className="font-medium">{intent.decrypted.side.toUpperCase()} {intent.decrypted.amount}</div>
                        <div className="text-ghost-400">{intent.decrypted.market}</div>
                        <div className="text-ghost-500">${Number(intent.decrypted.limitPrice).toFixed(2)}</div>
                      </div>
                    ) : (
                      <div className="text-xs">
                        <span className="text-ghost-500">Encrypted</span>
                        <div className="text-ghost-600">Decryption at block {intent.targetBlock}</div>
                      </div>
                    )}
                  </td>
                  
                  <td className="py-4 px-4">
                    <div className="flex flex-col">
                      <span className="font-mono text-primary-400">
                        {intent.transactionHash ? (
                          <a
                            href={`https://sepolia.basescan.org/tx/${intent.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-primary-300"
                          >
                            {formatIntentId(intent.id)}
                          </a>
                        ) : (
                          '—'
                        )}
                      </span>
                      <span className="text-xs text-ghost-500">
                        {intent.transactionHash ? 'View on BaseScan' : 'Pending Transaction'}
                      </span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => window.open(`https://sepolia.basescan.org/address/${CONFIG.CONTRACTS.GHOSTLOCK_INTENTS}#readContract`, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Contract
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Summary Info */}
        <div className="mt-6 p-4 bg-ghost-800/30 rounded-lg border border-ghost-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ghost-400">
              Total Intents: <span className="text-white font-medium">{intents.length}</span>
            </span>
            <span className="text-ghost-400">
              {intents.length > 0 ? (
                <>Latest Intent: <span className="text-primary-400 font-mono">#{intents[0]?.id || 'N/A'}</span></>
              ) : (
                <span className="text-ghost-500">No intents submitted yet</span>
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}