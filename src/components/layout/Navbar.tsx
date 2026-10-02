import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Menu, X, Activity, BarChart3, Zap, BanknoteIcon, Database } from 'lucide-react'
import { cn } from '../../lib/utils'
import NetworkSwitcher from '../ui/NetworkSwitcher'
import BrandLogo from '../BrandLogo'

const navigation = [
  { name: 'HolmeSwap', href: '/holmeswap', icon: Zap },
  { name: 'Batch Auctions', href: '/auctions', icon: Activity },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Intent admin', href: '/admin', icon: Database },
  { name: 'Pricing', href: '/pricing', icon: BanknoteIcon },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  return (
    <nav className="sticky top-0 z-50 glass-effect border-b border-white/10 overflow-x-clip">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
          {/* Brand */}
          <Link
            to="/"
            className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-2.5 group"
          >
            <motion.span
              className="flex min-w-0 items-center gap-2 sm:gap-2.5"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <BrandLogo className="h-9 w-9 sm:h-10 sm:w-10" />
              <div className="hidden min-w-0 leading-tight md:block">
                <span className="block truncate text-sm font-bold gradient-text lg:text-base xl:text-lg">
                  GhostLock
                </span>
                <span className="block truncate text-[10px] text-ghost-400 lg:text-xs">
                  MEV Reaper
                </span>
              </div>
            </motion.span>
          </Link>

          {/* Desktop navigation — icon-only lg, labels xl+ */}
          <div className="hidden min-w-0 overflow-hidden lg:flex lg:justify-center lg:px-1">
            <div className="flex max-w-full items-center gap-0.5 xl:gap-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    title={item.name}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-all duration-200 xl:px-3 xl:text-sm',
                      isActive
                        ? 'bg-primary-500/10 text-primary-400'
                        : 'text-ghost-300 hover:bg-ghost-800 hover:text-white',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="hidden whitespace-nowrap xl:inline">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Wallet + mobile menu */}
          <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            <ConnectButton
              chainStatus="icon"
              accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
              showBalance={false}
            />

            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              className="rounded-lg p-2 text-ghost-300 transition-colors hover:bg-ghost-800 hover:text-white lg:hidden"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile / tablet navigation */}
        <motion.div
          initial={false}
          animate={{ height: isOpen ? 'auto' : 0 }}
          className="overflow-hidden lg:hidden"
        >
          <div className="space-y-2 border-t border-white/10 py-4">
            <div className="px-1 pb-2">
              <NetworkSwitcher />
            </div>
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary-500/10 text-primary-400'
                      : 'text-ghost-300 hover:bg-ghost-800 hover:text-white',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
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
