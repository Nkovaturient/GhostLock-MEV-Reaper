import React from 'react'
import { motion, LayoutGroup } from 'framer-motion'
import { useSwapStore, type TradeTab } from '../stores/swapStore'
import { cn } from '../../lib/utils'

const TABS: { id: TradeTab; label: string }[] = [
  { id: 'swap', label: 'Swap' },
  { id: 'limit', label: 'Limit' },
  { id: 'buy', label: 'Buy' },
  { id: 'sell', label: 'Sell' },
]

export default function SwapTradeTabs() {
  const tradeTab = useSwapStore(s => s.tradeTab)
  const setTradeTab = useSwapStore(s => s.setTradeTab)

  return (
    <LayoutGroup id="holme-trade-tabs">
    <div
      className="flex flex-1 min-w-0 rounded-xl bg-muted/40 p-1 border border-border/30"
      role="tablist"
      aria-label="Trade type"
    >
      {TABS.map(({ id, label }) => {
        const active = tradeTab === id
        return (
          <motion.button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setTradeTab(id)}
            className={cn(
              'relative flex-1 py-2 px-2 text-sm font-medium rounded-lg transition-colors',
              active
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/80',
            )}
            whileTap={{ scale: 0.98 }}
          >
            {active && (
              <motion.span
                layoutId="tradeTabPill"
                className="absolute inset-0 rounded-lg bg-card shadow-sm border border-border/40"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{label}</span>
          </motion.button>
        )
      })}
    </div>
    </LayoutGroup>
  )
}
