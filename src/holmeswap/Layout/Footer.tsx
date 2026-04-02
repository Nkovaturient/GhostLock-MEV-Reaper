import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'

const badges = [
  { id: 'ghostlock', label: 'ARBONE', letter: 'A', color: 'bg-holme-blue' },
  { id: 'base', label: 'BASE', letter: 'B', color: 'bg-primary' },
  { id: 'sepolia', label: 'Sepolia (Testnet)', letter: 'S', color: 'bg-holme-purple' },
]

export default function Footer() {
  const activeBadge = 'ghostlock' // Mock active state

  return (
    <footer className="border-t border-border/30 bg-card/50 backdrop-blur-sm" role="contentinfo">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-wrap justify-center gap-2">
          {badges.map((badge) => {
            const isActive = badge.id === activeBadge
            return (
              <span
                key={badge.id}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all',
                  isActive
                    ? 'bg-holme-ghost-blue/40 text-foreground border border-primary/30 shadow-holme-soft'
                    : 'bg-card/70 text-muted-foreground border border-border/40 hover:bg-muted/50'
                )}
              >
                <span className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                  isActive ? badge.color + ' text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {badge.letter}
                </span>
                {badge.label}
                {isActive && <Check className="w-3.5 h-3.5 text-holme-green-success" aria-hidden />}
              </span>
            )
          })}
        </div>
        
        <p className="text-center text-xs text-muted-foreground mt-3">
          © 2026 HolmeSwap • MEV-Protected Swaps
        </p>
      </div>
    </footer>
  )
}
