import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ExternalLink, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useUserIntents, useDecryptIntent } from '@/hooks/useUserIntents'
import { useEthersSigner } from '@/hooks/useEthers'
import { formatIntentId, getIntentStatusColor } from '@/lib/blocklock-service'
import { formatNumber, formatAddress } from '@/lib/utils'

export default function UserIntentsTable() {
  const { data: intents, isLoading, error } = useUserIntents()
  const { decryptIntent } = useDecryptIntent()
  const signer = useEthersSigner()
  const [decryptingIds, setDecryptingIds] = useState<Set<string>>(new Set())

  const handleDecrypt = async (intent: any) => {
    if (!signer) return
    
    setDecryptingIds(prev => new Set(prev).add(intent.id))
    
    try {
      const decrypted = await decryptIntent(
        intent.encrypted,
        Number(intent.targetBlock),
        signer
      )
      
      if (decrypted) {
        // Update the intent with decrypted data (in real app, this would trigger a refetch)
        console.log('Decrypted intent:', decrypted)
      }
    } catch (error) {
      console.error('Decryption failed:', error)
    } finally {
      setDecryptingIds(prev => {
        const next = new Set(prev)
        next.delete(intent.id)
        return next
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Settled':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'Ready':
        return <AlertCircle className="w-4 h-4 text-blue-400" />
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-ghost-400">Loading your intents...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <p className="text-red-400">Failed to load intents</p>
          <p className="text-ghost-400 text-sm mt-2">{String(error)}</p>
        </CardContent>
      </Card>
    )
  }

  if (!intents || intents.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 text-ghost-600 mx-auto mb-4" />
          <p className="text-ghost-400 mb-2">No intents submitted yet</p>
          <p className="text-ghost-500 text-sm">Submit your first encrypted trading intent to get started</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Trading Intents</CardTitle>
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
                    <span className="font-mono text-primary-400">
                      {formatIntentId(intent.id)}
                    </span>
                  </td>
                  
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(intent.status)}
                      <Badge variant={getIntentStatusColor(intent.status) as any}>
                        {intent.status}
                      </Badge>
                    </div>
                  </td>
                  
                  <td className="py-4 px-4">
                    <span className="font-mono">{formatNumber(Number(intent.targetBlock))}</span>
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
                        <div>{intent.decrypted.side.toUpperCase()} {intent.decrypted.amount}</div>
                        <div className="text-ghost-400">{intent.decrypted.market}</div>
                      </div>
                    ) : (
                      <span className="text-ghost-500 text-xs">Encrypted</span>
                    )}
                  </td>
                  
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      {intent.status === 'Ready' && !intent.decrypted && signer && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDecrypt(intent)}
                          loading={decryptingIds.has(intent.id)}
                          className="text-xs"
                        >
                          {intent.decrypted ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          Decrypt
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => window.open(`https://sepolia.basescan.org/tx/${intent.id}`, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}