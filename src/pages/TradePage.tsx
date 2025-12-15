import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { AlertTriangle } from 'lucide-react'
import IntentSubmissionForm from '../components/trading/IntentSubmissionForm'
import UserIntentsTable from '../components/dashboard/UserIntentsTable'
import { Card, CardContent } from '../components/ui/Card'
import React, { useEffect, useState } from 'react'
import { useNetworkConfig } from '../hooks/useNetworkConfig'
import { useEthersProvider } from '../hooks/useEthers'
import { useSharedBlockNumber } from '../hooks/useSharedBlockNumber'

export default function TradePage() {
  const { isConnected } = useAccount()
  const [blocksAhead, setBlocksAhead] = useState("");
  const [estimatedDecryptionTime, setEstimatedDecryptionTime] = useState("");
  // const signer = useEthersSigner();
  const provider = useEthersProvider();
  // const { chainId } = useAccount();
  const { secondsPerBlock } = useNetworkConfig();
  const [avgBlockTimeSeconds, setAvgBlockTimeSeconds] = useState<number | null>(null)

  // Compute moving average block time from recent N blocks; fallback to config
  // Update less frequently to reduce RPC calls (every 30s is sufficient for block time calculation)
  useEffect(() => {
    let cancelled = false
    const N = 20
    const compute = async () => {
      if (!provider) return
      try {
        const latest = await provider.getBlockNumber();
        const latestBlock = await provider.getBlock(latest);
        const earlier = Math.max(0, latest - N);
        const earlierBlock = await provider.getBlock(earlier);
        if (!latestBlock || !earlierBlock) return
        const dt = Number(latestBlock.timestamp) - Number(earlierBlock.timestamp)
        const dn = latest - earlier
        const avg = dn > 0 ? Math.max(1, Math.round(dt / dn)) : secondsPerBlock || 1
        if (!cancelled) setAvgBlockTimeSeconds(avg)
      } catch {}
    }
    compute() // Compute once on mount
    const id = setInterval(compute, 30000) // Update every 30 seconds (block time doesn't change frequently)
    return () => { cancelled = true; clearInterval(id) }
  }, [provider, secondsPerBlock])

  // Update estimated decryption time - use shared block number to avoid duplicate RPC calls
  // Update less frequently (every 15s) since this is just UI display
  const { blockNumber: sharedBlockNumber } = useSharedBlockNumber()
  
  useEffect(() => {
    const updateEstimate = async () => {
      try {
        const spb = avgBlockTimeSeconds || secondsPerBlock
        if (!provider || !spb || !blocksAhead || !sharedBlockNumber) {
          setEstimatedDecryptionTime("");
          return;
        }
        
        // Use shared block number instead of fetching again
        const currentBlockData = await provider.getBlock(sharedBlockNumber);
        const currentTimestamp =
          currentBlockData?.timestamp || Math.floor(Date.now() / 1000);

        const blocks = Number(blocksAhead);
        if (Number.isNaN(blocks) || blocks <= 0) {
          setEstimatedDecryptionTime("");
          return;
        }

        const targetTimestamp = currentTimestamp + blocks * spb;
        const diffSeconds = Math.max(0, targetTimestamp - currentTimestamp);

        const days = Math.floor(diffSeconds / 86400);
        const hours = Math.floor((diffSeconds % 86400) / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);
        const seconds = Math.floor(diffSeconds % 60);

        const parts: string[] = [];
        if (days) parts.push(`${days}d`);
        if (hours) parts.push(`${hours}h`);
        if (minutes) parts.push(`${minutes}m`);
        if (seconds || parts.length === 0) parts.push(`${seconds}s`);

        const absolute = new Date(targetTimestamp * 1000).toLocaleString();
        setEstimatedDecryptionTime(`in ~${parts.join(" ")} (≈ ${absolute})`);
      } catch {
        setEstimatedDecryptionTime("");
      }
    };

    updateEstimate();
    // Update every 15 seconds (less frequent since it's just UI display)
    const interval = setInterval(updateEstimate, 15000);
    return () => clearInterval(interval);
  }, [provider, avgBlockTimeSeconds, secondsPerBlock, blocksAhead, sharedBlockNumber]);

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
          <IntentSubmissionForm
            setBlocksAhead={setBlocksAhead}
            blocksAhead={blocksAhead}
            estimatedDecryptionTime={estimatedDecryptionTime}
            avgBlockTimeSeconds={avgBlockTimeSeconds || secondsPerBlock}
          />
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