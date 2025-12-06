import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Menu, X, Shield, Zap, User, Crosshair, Book} from 'lucide-react'
import { cn } from '../../../../src/lib/utils'
import { CONFIG } from '../../lib/config'
import NetworkSwitcher from '../ui/NetworkSwitcher'

const navigation = [
  { name: 'Trade', href: '/trade', icon: Zap },
  { name: 'Dashboard', href: '/dashboard', icon: User },
  { name: 'Attacker Lab', href: '/attacker-lab', icon: Crosshair },
  { name: 'Docs', href: '/docs', icon: Book },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  return (
    <nav className="sticky top-0 z-40 glass-effect border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="p-2 bg-gradient-to-r from-primary-500 to-blue-500 rounded-lg"
            >
              <Shield className="w-6 h-6 text-white" />
            </motion.div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold gradient-text">GhostLock</span>
              <span className="text-sm text-ghost-400 ml-2">Prototype</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'text-primary-400 bg-primary-500/10'
                      : 'text-ghost-300 hover:text-white hover:bg-ghost-800'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Network Switcher & Connect Button */}
          <div className="flex items-center space-x-4">
            {CONFIG.FEATURES.ENABLE_NETWORK_SWITCHING && (
              <NetworkSwitcher />
            )}
            <ConnectButton />
            
            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-lg text-ghost-300 hover:text-white hover:bg-ghost-800 transition-colors"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <motion.div
          initial={false}
          animate={{ height: isOpen ? 'auto' : 0 }}
          className="md:hidden overflow-hidden"
        >
          <div className="py-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'text-primary-400 bg-primary-500/10'
                      : 'text-ghost-300 hover:text-white hover:bg-ghost-800'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </motion.div>
      </div>
    </nav>
  )
}