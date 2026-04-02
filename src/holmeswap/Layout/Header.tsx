import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useSwitchChain } from 'wagmi'
import { ChevronDown, Settings, Check, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import MascotIcon from '../assets/MascotIcon'
import { useSwapStore } from '../stores/swapStore'

// ─── Supported networks shown in switcher ────────────────────────────────────

const NETWORKS = [
  { id: 84532,  label: 'Base Sepolia',    short: 'BASE-S', badge: 'BS', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-400/30' },
  { id: 8453,   label: 'Base Mainnet',    short: 'BASE',   badge: 'B',  color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-500/15',   border: 'border-blue-400/30'   },
  { id: 42161,  label: 'Arbitrum One',    short: 'ARBONE', badge: 'A',  color: 'text-sky-600 dark:text-sky-400',      bg: 'bg-sky-500/15',    border: 'border-sky-400/30'    },
  { id: 421614, label: 'Arbitrum Sepolia', short: 'ARB-S', badge: 'AS', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-400/30' },
]

// ─── Slippage options ─────────────────────────────────────────────────────────

const SLIPPAGE_PRESETS = ['0.1', '0.5', '1.0', '2.0']

// ─── Network Switcher (HolmeSwap flavour) ────────────────────────────────────

function HolmeNetworkSwitcher() {
  const [open, setOpen]    = useState(false)
  const ref                = useRef<HTMLDivElement>(null)
  const { chainId }        = useAccount()
  const { switchChain, isPending } = useSwitchChain()

  const current = NETWORKS.find(n => n.id === chainId) ?? NETWORKS[0]

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <motion.button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={isPending}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium',
          'bg-card/90 border shadow-holme-soft hover:shadow-holme-card transition-all',
          current.border, current.bg, current.color,
          isPending && 'opacity-60 cursor-wait'
        )}
        whileTap={{ scale: 0.97 }}
      >
        <span className="hidden sm:inline text-muted-foreground text-xs font-normal">Network</span>
        <span className="font-semibold">{current.short}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: -8,  scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 26 }}
            className="absolute right-0 mt-2 py-2 w-52 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/50 shadow-holme-card z-50"
          >
            {NETWORKS.map(n => {
              const isActive = chainId === n.id
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    disabled={isActive || isPending}
                    onClick={() => { switchChain({ chainId: n.id }); setOpen(false) }}
                    className={cn(
                      'w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors',
                      isActive
                        ? cn('font-semibold', n.color, n.bg)
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    )}
                  >
                    <span className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                      isActive ? cn(n.bg, n.color, n.border, 'border') : 'bg-muted text-muted-foreground'
                    )}>
                      {n.badge}
                    </span>
                    <span className="flex-1">{n.label}</span>
                    {isActive && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                  </button>
                </li>
              )
            })}
            {isPending && (
              <li className="px-4 py-2 text-xs text-muted-foreground text-center">
                Switching network…
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Slippage Settings popover ────────────────────────────────────────────────

function SlippageSettings() {
  const [open, setOpen]             = useState(false)
  const [custom, setCustom]         = useState('')
  const ref                         = useRef<HTMLDivElement>(null)
  const slippageBps = useSwapStore(s => s.slippageBps)
  const setSlippageBps = useSwapStore(s => s.setSlippageBps)

  const currentPct = (slippageBps / 100).toFixed(1)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const applyCustom = () => {
    const val = parseFloat(custom)
    if (!isNaN(val) && val > 0 && val <= 50) {
      setSlippageBps(Math.round(val * 100))
      setCustom('')
    }
  }

  return (
    <div className="relative" ref={ref}>
      <motion.button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'p-2.5 rounded-full bg-card/90 border border-border/50',
          'shadow-holme-soft hover:shadow-holme-card transition-all text-foreground',
          open && 'ring-2 ring-primary/30'
        )}
        aria-label="Swap settings"
        whileHover={{ rotate: open ? 0 : 45 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <Settings className="w-5 h-5" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: -8,  scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 26 }}
            className="absolute right-0 mt-2 w-72 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/50 shadow-holme-card z-50 p-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground text-sm">Transaction Settings</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Slippage */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Max Slippage <span className="text-foreground font-medium">{currentPct}%</span>
              </p>
              <div className="flex gap-2 flex-wrap">
                {SLIPPAGE_PRESETS.map(p => {
                  const bps = Math.round(parseFloat(p) * 100)
                  const isActive = slippageBps === bps
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSlippageBps(bps)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border',
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border/40 hover:bg-muted/80'
                      )}
                    >
                      {p}%
                    </button>
                  )
                })}
              </div>

              {/* Custom input */}
              <div className="flex gap-2 mt-3">
                <input
                  type="number"
                  min="0.01"
                  max="50"
                  step="0.1"
                  placeholder="Custom %"
                  value={custom}
                  onChange={e => setCustom(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyCustom()}
                  className={cn(
                    'flex-1 bg-muted/50 rounded-xl px-3 py-1.5 text-xs font-mono',
                    'border border-border/40 outline-none focus:ring-2 focus:ring-primary/30',
                    'text-foreground placeholder:text-muted-foreground'
                  )}
                />
                <button
                  type="button"
                  onClick={applyCustom}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90"
                >
                  Set
                </button>
              </div>

              {/* Warning for high slippage */}
              {slippageBps > 100 && (
                <p className="text-xs text-holme-warning mt-2">
                  ⚠ High slippage — your trade may be frontrun
                </p>
              )}
            </div>

            {/* MEV protection note */}
            <div className="mt-4 pt-3 border-t border-border/30">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                🔒 GhostLock's 3-layer MEV protection means your slippage tolerance is a
                <em> ceiling</em>, not a target. Encrypted intents prevent bots from
                reading your limit before execution.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Wallet button (RainbowKit Custom) ───────────────────────────────────────

function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
        authenticationStatus,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading'
        const connected = ready && account && chain

        if (!ready) return <div className="w-32 h-10 rounded-full bg-muted animate-pulse" />

        if (!connected) {
          return (
            <motion.button
              type="button"
              onClick={openConnectModal}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold',
                'bg-primary text-primary-foreground shadow-holme-soft',
                'hover:opacity-90 transition-all hover:shadow-holme-card'
              )}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Connect Wallet
            </motion.button>
          )
        }

        if (chain.unsupported) {
          return (
            <motion.button
              type="button"
              onClick={openChainModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30 transition-colors"
              whileTap={{ scale: 0.97 }}
            >
              Wrong Network
            </motion.button>
          )
        }

        return (
          <motion.button
            type="button"
            onClick={openAccountModal}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium',
              'bg-card/90 border border-border/50 shadow-holme-soft hover:shadow-holme-card transition-all',
              'text-foreground hover:scale-[1.02]'
            )}
            whileTap={{ scale: 0.97 }}
          >
            {/* Avatar */}
            {account.ensAvatar ? (
              <img
                src={account.ensAvatar}
                alt={account.displayName}
                className="w-5 h-5 rounded-full flex-shrink-0"
              />
            ) : (
              <span
                className="w-5 h-5 rounded-full flex-shrink-0 bg-gradient-to-br from-primary to-secondary"
                aria-hidden
              />
            )}
            <span className="hidden sm:inline">
              {account.ensName ?? account.displayName}
            </span>
            {/* Live green dot */}
            <span className="w-2 h-2 rounded-full bg-holme-green-success flex-shrink-0" />
          </motion.button>
        )
      }}
    </ConnectButton.Custom>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

export default function Header() {
  return (
    <header className="sticky top-0 z-50 holme-glass-card border-b border-border/40 rounded-none">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <motion.div
          className="flex items-center gap-3 cursor-pointer"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <MascotIcon className="w-10 h-10 flex-shrink-0" />
          <span className="text-xl font-semibold text-foreground tracking-tight">
            HolmeSwap
          </span>
        </motion.div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <HolmeNetworkSwitcher />
          <WalletButton />
          <SlippageSettings />
        </div>
      </div>
    </header>
  )
}