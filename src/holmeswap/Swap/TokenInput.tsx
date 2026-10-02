import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

import { useSwapStore, type TokenInfo, type TradeTab } from '../stores/swapStore'
import { useTokenBalance } from '../hooks/useTokenBalance'
import { getTokenIcon } from '../assets/TokenIcons'
import { TOKEN_LIST } from '../contracts/tokens'
import { cn } from '../../lib/utils'

const MENU_Z = 50_000
const EST_MENU_PX = 220
const MENU_MARGIN = 8

export function SwapArrowButton() {
  const flipTokens = useSwapStore(s => s.flipTokens)
  return (
    <motion.button
      type="button"
      onClick={flipTokens}
      className="p-2 rounded-xl bg-muted/60 hover:bg-muted border border-border/30 text-foreground transition-all shadow-sm"
      whileHover={{ scale: 1.05, rotate: 90 }}
      whileTap={{ scale: 0.95, rotate: 90 }}
      aria-label="Swap tokens"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-foreground">
        <path d="M3 5h12M3 5l3-3M3 5l3 3M15 13H3m12 0l-3 3M15 13l-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.button>
  )
}

function rowLabelFor(tab: TradeTab, row: 'in' | 'out'): string {
  if (row === 'in') {
    if (tab === 'sell') return 'Sell'
    if (tab === 'buy') return 'You pay'
    if (tab === 'limit') return 'From'
    return 'Pay'
  }
  if (tab === 'sell') return 'Buy'
  if (tab === 'buy') return 'You receive'
  if (tab === 'limit') return 'To'
  return 'Receive'
}

interface TokenInputProps {
  type?:           'in' | 'out'
  readOnly?:      boolean
  onAmountChange?: (value: string) => void
}

export default function TokenInput({ type = 'in', readOnly = false, onAmountChange }: TokenInputProps) {
  const [selectorOpen, setSelectorOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuStyle, setMenuStyle] = useState<{
    left: number
    minWidth: number
    top?: number
    bottom?: number
  } | null>(null)

  const tradeTab    = useSwapStore(s => s.tradeTab)
  const tokenIn     = useSwapStore(s => s.tokenIn)
  const tokenOut    = useSwapStore(s => s.tokenOut)
  const amountIn    = useSwapStore(s => s.amountIn)
  const amountOut   = useSwapStore(s => s.amountOut)
  const setTokenIn  = useSwapStore(s => s.setTokenIn)
  const setTokenOut = useSwapStore(s => s.setTokenOut)
  const setAmountIn = useSwapStore(s => s.setAmountIn)

  const token    = type === 'in' ? tokenIn  : tokenOut
  const amount   = type === 'in' ? amountIn : amountOut
  const setToken = type === 'in' ? setTokenIn : setTokenOut

  const { rawBalance, formattedBalance: balance, isLoading: balLoading } =
    useTokenBalance(token.symbol, token.decimals, type === 'in', type === 'in' ? amountIn : '')

  const isOverBalance = (() => {
    if (!rawBalance || !amount) return false
    const inNum = parseFloat(amount)
    if (!inNum || inNum === 0) return false
    const balNum = Number(rawBalance) / Math.pow(10, token.decimals)
    return inNum > balNum
  })()

  const updateMenuPosition = useCallback(() => {
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - MENU_MARGIN
    const spaceAbove = rect.top - MENU_MARGIN
    const openUp = spaceBelow < EST_MENU_PX && spaceAbove > spaceBelow
    const minW = Math.max(rect.width, 190)
    const pad = 8
    const left = Math.min(Math.max(pad, rect.left), Math.max(pad, window.innerWidth - minW - pad))
    if (openUp) {
      setMenuStyle({ left, minWidth: minW, bottom: window.innerHeight - rect.top + MENU_MARGIN })
    } else {
      setMenuStyle({ left, minWidth: minW, top: rect.bottom + MENU_MARGIN })
    }
  }, [])

  useLayoutEffect(() => {
    if (!selectorOpen) return
    updateMenuPosition()
    const onWin = () => updateMenuPosition()
    window.addEventListener('resize', onWin)
    window.addEventListener('scroll', onWin, true)
    return () => {
      window.removeEventListener('resize', onWin)
      window.removeEventListener('scroll', onWin, true)
    }
  }, [selectorOpen, updateMenuPosition])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (anchorRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      setSelectorOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const handleChange = (v: string) => {
    if (v === '' || /^\d*\.?\d*$/.test(v)) {
      if (type === 'in') {
        setAmountIn(v)
      }
      onAmountChange?.(v)
    }
  }

  const handleTokenSelect = (t: TokenInfo) => {
    if (type === 'in') {
      setTokenIn(t)
      if (t.symbol === tokenOut.symbol) {
        setTokenOut(tokenIn)
      }
    } else {
      setTokenOut(t)
      if (t.symbol === tokenIn.symbol) {
        setTokenIn(tokenOut)
      }
    }
    setSelectorOpen(false)
  }

  const balanceLabel = balLoading ? '…' : balance ?? '—'
  const rowLabel = rowLabelFor(tradeTab, type)

  return (
    <div
      className={cn(
        'rounded-2xl p-4 border bg-card/95 backdrop-blur',
        'shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(255,255,255,0.8)]',
        'transition-all',
        isOverBalance && type === 'in'
          ? 'border-destructive/50 hover:border-destructive'
          : 'border-border/40 hover:border-primary/20 hover:shadow-holme-card',
        'overflow-visible'
      )}
    >
      <p className="text-xs font-medium text-muted-foreground mb-2">{rowLabel}</p>
      <div className="flex items-center justify-between mb-3">
        <div ref={anchorRef} className="inline-flex">
          <motion.button
            type="button"
            onClick={e => { e.stopPropagation(); setSelectorOpen(o => !o) }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted border border-border/30 text-foreground font-medium transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-haspopup="listbox"
            aria-expanded={selectorOpen}
          >
            {getTokenIcon(token.symbol)}
            <span className="font-semibold">{token.symbol}</span>
            <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', selectorOpen && 'rotate-180')} />
          </motion.button>
        </div>

        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {selectorOpen && menuStyle && (
              <motion.div
                ref={menuRef}
                role="presentation"
                initial={{ opacity: 0, y: menuStyle.bottom != null ? 6 : -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="fixed py-2 rounded-2xl bg-card border border-border/50 shadow-lg max-h-[min(55vh,280px)] overflow-y-auto"
                style={{ zIndex: MENU_Z, left: menuStyle.left, minWidth: menuStyle.minWidth, ...(menuStyle.top != null ? { top: menuStyle.top } : { bottom: menuStyle.bottom }) }}
                onPointerDown={e => e.stopPropagation()}
              >
                <ul className="min-w-[190px]" role="listbox" aria-label="Select token">
                  {TOKEN_LIST.map(cfg => {
                    const t: TokenInfo = { symbol: cfg.symbol, address: '', decimals: cfg.decimals }
                    const isSelected = token.symbol === cfg.symbol
                    return (
                      <li key={cfg.symbol} role="option" className="px-2">
                        <motion.button
                          type="button"
                          onClick={e => { e.stopPropagation(); handleTokenSelect(t) }}
                          className={cn('w-full text-left px-3 py-2.5 text-sm font-medium rounded-xl flex items-center gap-3 transition-colors', isSelected ? 'bg-primary/10 text-foreground' : 'hover:bg-muted text-foreground')}
                          whileHover={{ scale: 1.02, x: 2 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {getTokenIcon(cfg.symbol)}
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold block">{cfg.symbol}</span>
                            <span className="text-[11px] text-muted-foreground">{cfg.name}</span>
                          </div>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                        </motion.button>
                      </li>
                    )
                  })}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

        {type === 'in' && (
          <motion.button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => balance && balance !== '—' && setAmountIn(balance)}
            title="Use max balance"
          >
            Balance:{' '}
            <span className={cn('font-medium tabular-nums', isOverBalance ? 'text-destructive' : 'text-foreground/80')}>
              {balanceLabel}
            </span>{' '}{token.symbol}
          </motion.button>
        )}
      </div>

      <motion.div
        key={type === 'out' ? amount : undefined}
        initial={type === 'out' && amount ? { opacity: 0.85, scale: 0.995 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      >
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={e => handleChange(e.target.value)}
          readOnly={readOnly}
          placeholder="0"
          className={cn(
            'w-full bg-transparent text-3xl font-semibold text-foreground',
            'outline-none placeholder:text-muted-foreground/40',
            readOnly && 'cursor-default',
            isOverBalance && type === 'in' && 'text-destructive/80'
          )}
          aria-label={type === 'in' ? 'Amount to swap' : 'Amount to receive'}
        />
      </motion.div>

      {type === 'out' && amount && parseFloat(amount) > 0 && (
        <p className="text-xs text-muted-foreground mt-1 tabular-nums">
          ≈ {amount} {token.symbol} (live oracle price)
        </p>
      )}
    </div>
  )
}