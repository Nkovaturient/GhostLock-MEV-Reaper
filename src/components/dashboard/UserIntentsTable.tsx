import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ExternalLink, Clock, CheckCircle, AlertCircle, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useUserIntents, useDecryptIntent } from '@/hooks/useUserIntents'
import { useEthersSigner } from '@/hooks/useEthers'
import { formatIntentId, getIntentStatusColor } from '@/lib/blocklock-service'
import { formatNumber } from '@/lib/utils'
import { CONFIG } from '@/lib/config'

export default function UserIntentsTable() {
  const { data: intents, isLoading, error, lastRequestId } = useUserIntents()
  const { decryptIntent } = useDecryptIntent()
  const chainId = CONFIG.CHAIN_ID;
  const signer = useEthersSigner({chainId})
  const [decryptingIds, setDecryptingIds] = useState<Set<string>>(new Set())
  const [autoDecrypt, setAutoDecrypt] = useState<boolean>(false)

  const handleDecrypt = async (intent: any) => {
    if (!signer) return

    setDecryptingIds((prev: Set<string>) => {
      const next = new Set(prev)
      next.add(intent.id)
      return next
    })

    try {
      const decrypted = await decryptIntent(
        Number(intent.targetBlock),
        signer,
        Number(intent.id)
      )
      
      if (decrypted) {
        // Update the intent with decrypted data (in real app, this would trigger a refetch)
        console.log('Decrypted intent:', decrypted)
      }
    } catch (error) {
      console.error('Decryption failed:', error)
    } finally {
      setDecryptingIds((prev: Set<string>) => {
        const next = new Set(prev)
        next.delete(intent.id)
        return next
      })
    }
  }

  // Auto-decrypt once when Ready, if user opted in
  useEffect(() => {
    if (!autoDecrypt || !signer || !intents) return
    const readyUndecrypted = intents.filter(i => i.status === 'Ready' && !i.decrypted)
    let cancelled = false
    const run = async () => {
      for (const i of readyUndecrypted) {
        if (cancelled) break
        try {
          await handleDecrypt(i)
        } catch {}
      }
    }
    run()
    return () => { cancelled = true }
  }, [autoDecrypt, signer, intents])

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
        <div className="flex items-center justify-between">
          <CardTitle>Your Trading Intents</CardTitle>
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-xs text-ghost-400">
              <input type="checkbox" checked={autoDecrypt} onChange={(e) => setAutoDecrypt(e.target.checked)} />
              <span>Auto-decrypt when Ready</span>
            </label>
          </div>
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
                      {getStatusIcon(intent.status)}
                      <Badge variant={getIntentStatusColor(intent.status) as any}>
                        {intent.status}
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
                        <div className="text-ghost-600">Use Request ID #{intent.id} to decrypt</div>
                      </div>
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
              Latest Request ID: <span className="text-primary-400 font-mono">#{lastRequestId || 'N/A'}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}