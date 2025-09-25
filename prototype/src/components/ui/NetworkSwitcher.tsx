import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Wifi, WifiOff } from 'lucide-react'
import { useAccount, useSwitchChain } from 'wagmi'
import { baseSepolia, base } from 'wagmi/chains'
import { cn } from '../../../../src/lib/utils'

const networks = [
  {
    chain: baseSepolia,
    name: 'Base Sepolia',
    description: 'Testnet',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30'
  },
  {
    chain: base,
    name: 'Base Mainnet',
    description: 'Mainnet',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30'
  }
]

export default function NetworkSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const { chainId, isConnected } = useAccount()
  const { switchChain, isPending } = useSwitchChain()

  const currentNetwork = networks.find(n => n.chain.id === chainId) || networks[0]

  const handleNetworkSwitch = async (targetChainId: number) => {
    if (chainId === targetChainId) return
    
    try {
      await switchChain({ chainId: targetChainId })
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }

  if (!isConnected) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-ghost-700/50 border border-ghost-600">
        <WifiOff className="w-4 h-4 text-ghost-400" />
        <span className="text-sm text-ghost-400">Not Connected</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={cn(
          'network-indicator',
          currentNetwork.bgColor,
          currentNetwork.borderColor,
          currentNetwork.color,
          isPending && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Wifi className="w-4 h-4" />
        <span>{currentNetwork.name}</span>
        <ChevronDown className={cn(
          'w-4 h-4 transition-transform duration-200',
          isOpen && 'rotate-180'
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-0 mt-2 w-64 glass-effect rounded-lg border border-white/10 shadow-xl z-50"
          >
            <div className="p-2">
              <div className="text-xs text-ghost-400 px-3 py-2 font-medium">
                Switch Network
              </div>
              
              {networks.map((network) => {
                const isActive = chainId === network.chain.id
                
                return (
                  <button
                    key={network.chain.id}
                    onClick={() => handleNetworkSwitch(network.chain.id)}
                    disabled={isActive || isPending}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200',
                      isActive 
                        ? `${network.bgColor} ${network.borderColor} border`
                        : 'hover:bg-ghost-800 text-ghost-300 hover:text-white'
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        'w-3 h-3 rounded-full',
                        isActive ? network.color.replace('text-', 'bg-') : 'bg-ghost-600'
                      )} />
                      <div>
                        <div className={cn(
                          'font-medium',
                          isActive ? network.color : ''
                        )}>
                          {network.name}
                        </div>
                        <div className="text-xs text-ghost-400">
                          {network.description}
                        </div>
                      </div>
                    </div>
                    
                    {isActive && (
                      <div className="text-xs text-ghost-400">
                        Active
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            
            {/* Network Status */}
            <div className="border-t border-white/10 p-3">
              <div className="text-xs text-ghost-400 space-y-1">
                <div>Chain ID: {chainId}</div>
                <div>Contracts: {chainId ? 'Configured' : 'Not Available'}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}