/**
 * EncryptedIntentCard.tsx
 *
 * Shows the active encryption state with real ciphertext preview.
 * Idle state: "Bots can't read it!" (unchanged).
 * Active state: ciphertext hash preview from store.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { GhostMegaphoneIcon } from '../assets/IllustrationIcons'
import { useSwapStore }        from '../stores/swapStore'
import { cn }                  from '../../lib/utils'

export default function EncryptedIntentCard() {
  const intentStatus     = useSwapStore((s) => s.intentStatus)
  const ciphertextPreview = useSwapStore((s) => s.ciphertextPreview)
  const txHash           = useSwapStore((s) => s.txHash)

  const isActive = intentStatus !== 'idle' && intentStatus !== 'error'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'rounded-2xl p-5 holme-glass-card',
        'flex items-center gap-4 min-h-[120px]',
        isActive && 'ring-1 ring-holme-primary/40'
      )}
      role="region"
      aria-label="Encrypted intent status"
    >
      {/* Ghost illustration */}
      <div className="flex-shrink-0">
        <motion.div
          className="w-20 h-16"
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        >
          <GhostMegaphoneIcon className="w-full h-full" />
        </motion.div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-foreground text-base mb-2">
          Encrypted Intent
        </h3>

        <AnimatePresence mode="wait">
          {!isActive ? (
            // Idle state
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative inline-block"
            >
              <p
                className={cn(
                  'text-sm text-foreground px-4 py-2.5 rounded-xl',
                  'bg-card border border-border/50 relative inline-block'
                )}
                style={{ fontFamily: 'Comic Sans MS, Chalkboard SE, cursive' }}
              >
                <span
                  className="absolute -left-1.5 top-3 w-3 h-3 rotate-45 bg-card border-l border-b border-border/50"
                  aria-hidden
                />
                Bots can't read it!
              </p>
            </motion.div>
          ) : (
            // Active state — show ciphertext preview
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-1.5"
            >
              {ciphertextPreview && (
                <p className="text-xs font-mono text-muted-foreground truncate">
                  <span className="text-holme-primary font-semibold">ct:</span>{' '}
                  {ciphertextPreview}…
                </p>
              )}
              {txHash && (
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-holme-primary hover:underline truncate block"
                >
                  {txHash.slice(0, 10)}…{txHash.slice(-6)}
                </a>
              )}
              <p
                className={cn(
                  'text-xs text-foreground px-3 py-1.5 rounded-lg',
                  'bg-holme-primary/10 border border-holme-primary/20 inline-block'
                )}
              >
                🔒 Ciphertext on-chain — solvers see nothing
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}