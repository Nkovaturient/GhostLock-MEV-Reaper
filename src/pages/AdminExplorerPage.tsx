import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAccount, useChainId, useReadContract } from 'wagmi'
import {
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Database,
  Shield,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { cn } from '../lib/utils'
import { useLivenessIntentAdmin } from '../holmeswap/hooks/useLivenessIntentAdmin'
import {
  getAddresses,
  isGhostLockLivenessConfigured,
  isHolmeswapChainId,
  PLACEHOLDER_ZERO,
  SUPPORTED_CHAINS,
} from '../holmeswap/contracts/config'
import { getExplorerAddressUrl, getExplorerName } from '../holmeswap/lib/blockExplorer'
import { GhostLockLivenessABI } from '../holmeswap/ABI/GhostLockLiveness'

const ZERO_SEED =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const

function isValidAddress(a: string): a is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(a)
}

export default function AdminExplorerPage() {
  const chainId = useChainId()
  const { address } = useAccount()
  const [addrInput, setAddrInput] = useState('')
  const chainOk = isHolmeswapChainId(chainId)
  const configured = isGhostLockLivenessConfigured(chainId)
  const addrs = getAddresses(chainId)

  const effectiveWallet = useMemo(() => {
    const raw = addrInput.trim() || address || ''
    return raw && isValidAddress(raw) ? (raw as `0x${string}`) : undefined
  }, [addrInput, address])

  const {
    rows,
    isLoading,
    isFetching,
    error,
    refetch,
    currentBlock,
    rngConfigured,
  } = useLivenessIntentAdmin(chainOk && configured ? effectiveWallet : undefined)

  const { data: blocklockSender } = useReadContract({
    address: addrs.GhostLockLiveness,
    abi: GhostLockLivenessABI,
    functionName: 'blocklock',
    query: {
      enabled: configured && addrs.GhostLockLiveness !== PLACEHOLDER_ZERO,
    },
  })

  const explorer = getExplorerName(chainId)

  const panelClass =
    '!bg-ghost-900/60 backdrop-blur-md border-white/10 shadow-none hover:!scale-100 cursor-default'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-ghost-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
            <Database className="w-7 h-7 text-primary-400 shrink-0" />
            Intent explorer
          </h1>
          <p className="text-sm text-ghost-300 mt-2 max-w-2xl leading-relaxed">
            GhostLockLiveness request IDs, derived epochs, and EpochRNG seeds for the connected network.
            <span className="text-ghost-500"> Unauthenticated — internal / demo only.</span>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/holmeswap"
            className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
          >
            HolmeSwap
          </Link>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching || !configured || !effectiveWallet}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
              'bg-ghost-800/80 border border-white/15 text-ghost-100',
              'hover:bg-ghost-700 hover:border-white/25 disabled:opacity-40 disabled:pointer-events-none',
              'transition-colors',
            )}
          >
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
            Refetch
          </button>
        </div>
      </div>

      {!chainOk && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/35 bg-amber-500/10"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-white">Unsupported network</p>
            <p className="text-sm text-ghost-300 mt-1">
              Switch wallet to Arbitrum Sepolia ({SUPPORTED_CHAINS.ARB_SEPOLIA}) or Arbitrum One (
              {SUPPORTED_CHAINS.ARBITRUM_ONE}).
            </p>
          </div>
        </motion.div>
      )}

      {chainOk && !configured && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-xl border border-red-500/35 bg-red-500/10"
        >
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-300">GhostLockLiveness not configured</p>
            <p className="text-sm text-ghost-300 mt-1">
              Set the <code className="text-xs bg-ghost-800 px-1.5 py-0.5 rounded border border-white/10 text-ghost-200 font-mono">VITE_*</code> addresses for this chain
              (see env mapping below). Mainnet entries default to zero until you set them.
            </p>
          </div>
        </motion.div>
      )}

      <Card hover={false} className={cn(panelClass, 'p-5 sm:p-6')}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-white">Wallet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 !text-ghost-200">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 min-w-0">
              <label htmlFor="admin-wallet" className="text-xs text-ghost-400 uppercase tracking-wide block mb-2">
                Inspect address (defaults to connected wallet)
              </label>
              <input
                id="admin-wallet"
                value={addrInput}
                onChange={(e) => setAddrInput(e.target.value)}
                placeholder={address ?? '0x…'}
                className={cn(
                  'w-full px-3 py-2.5 rounded-lg text-sm font-mono',
                  'bg-ghost-800/90 border border-white/15 text-ghost-100',
                  'placeholder:text-ghost-500',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50',
                )}
              />
            </div>
            {address && (
              <button
                type="button"
                onClick={() => setAddrInput(address)}
                className="text-sm font-medium text-primary-400 hover:text-primary-300 shrink-0 py-2.5"
              >
                Use connected
              </button>
            )}
          </div>
          <p className="text-xs text-ghost-500 font-mono">
            Chain {chainId}
            {explorer ? ` · ${explorer}` : ''}
            {currentBlock != null ? ` · head block ${currentBlock}` : ''}
          </p>
        </CardContent>
      </Card>

      <Card hover={false} className={cn(panelClass, 'p-5 sm:p-6')}>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-400" />
            Contracts
          </CardTitle>
        </CardHeader>
        <CardContent className="!text-ghost-200">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Liveness', addrs.GhostLockLiveness],
            ['Epoch RNG', addrs.GhostLockEpochRNG],
            ['Batch settlement', addrs.BatchSettlement],
          ].map(([label, addr]) => {
            const href =
              addr !== PLACEHOLDER_ZERO
                ? getExplorerAddressUrl(chainId, addr as `0x${string}`)
                : null
            return (
              <div
                key={label}
                className="rounded-lg border border-white/10 bg-ghost-800/40 px-3 py-2.5 min-w-0"
              >
                <div className="text-[10px] uppercase tracking-wider text-ghost-500 mb-1">{label}</div>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 hover:text-primary-300 text-xs font-mono inline-flex items-center gap-1 break-all"
                  >
                    {(addr as string).slice(0, 10)}…
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                  </a>
                ) : (
                  <span className="text-ghost-500 text-xs">not set</span>
                )}
              </div>
            )
          })}
          {blocklockSender &&
            blocklockSender !== PLACEHOLDER_ZERO &&
            getExplorerAddressUrl(chainId, blocklockSender as `0x${string}`) && (
              <div className="rounded-lg border border-white/10 bg-ghost-800/40 px-3 py-2.5 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-ghost-500 mb-1">Blocklock</div>
                <a
                  href={getExplorerAddressUrl(chainId, blocklockSender as `0x${string}`)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300 text-xs font-mono inline-flex items-center gap-1 break-all"
                >
                  {String(blocklockSender).slice(0, 10)}…
                  <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card hover={false} className={cn(panelClass, 'p-5 sm:p-6 overflow-hidden')}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-white">Intents (max 50, newest first)</CardTitle>
        </CardHeader>
        <CardContent className="!text-ghost-200">
          {!effectiveWallet && chainOk && configured && (
            <p className="text-sm text-ghost-400">Connect a wallet or paste an address to load intents.</p>
          )}
          {error && (
            <p className="text-sm text-red-400 mb-2">
              {(error as Error).message ?? String(error)}
            </p>
          )}
          {isLoading && (
            <div className="h-24 flex items-center justify-center text-ghost-400 text-sm">
              Loading…
            </div>
          )}
          {!isLoading && effectiveWallet && rows.length === 0 && !error && (
            <p className="text-sm text-ghost-400">No intents for this address.</p>
          )}
          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-white/10 bg-ghost-900/40">
              <table className="w-full text-sm text-left min-w-[720px]">
                <thead>
                  <tr className="border-b border-white/10 bg-ghost-800/60 text-ghost-400 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3 text-left font-semibold">Request ID</th>
                    <th className="py-3 px-3 text-left font-semibold">Unlock block</th>
                    <th className="py-3 px-3 text-left font-semibold">Derived epoch</th>
                    <th className="py-3 px-3 text-left font-semibold">Ready</th>
                    <th className="py-3 px-3 text-left font-semibold">Bond (ETH)</th>
                    <th className="py-3 px-3 text-left font-semibold">Reveal by block</th>
                    <th className="py-3 px-3 text-left font-semibold">Slash by block</th>
                    <th className="py-3 px-3 text-left font-semibold">Epoch seed</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.requestId}
                      className="border-b border-white/[0.06] hover:bg-white/[0.04] transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono tabular-nums text-ghost-100">{r.requestId}</td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-ghost-200">{r.unlockBlock}</td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-ghost-200">{r.derivedEpoch}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={cn(
                            'text-xs font-medium px-2 py-0.5 rounded-md',
                            r.ready
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-ghost-700/80 text-ghost-300',
                          )}
                        >
                          {r.ready ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-ghost-200">{r.bondEth}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-ghost-200">
                        {r.revealDeadline.toString()}
                        {currentBlock != null && (
                          <span className="text-ghost-500 block text-[11px]">
                            Δ {Number(r.revealDeadline) - currentBlock}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-ghost-200">
                        {r.slashDeadline.toString()}
                        {currentBlock != null && (
                          <span className="text-ghost-500 block text-[11px]">
                            Δ {Number(r.slashDeadline) - currentBlock}
                          </span>
                        )}
                      </td>
                      <td
                        className="py-2.5 px-3 font-mono text-[10px] max-w-[140px] truncate text-ghost-300"
                        title={r.epochSeed ?? ''}
                      >
                        {!rngConfigured
                          ? 'RNG n/a'
                          : !r.epochSeed || r.epochSeed === ZERO_SEED
                            ? '—'
                            : `${r.epochSeed.slice(0, 10)}…`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* <Card hover={false} className={cn(panelClass, 'p-5 sm:p-6')}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-white">contracts/.env.example → Vite</CardTitle>
          <p className="text-xs text-ghost-500 mt-1 font-normal">
            Deploy keys in <span className="font-mono text-ghost-400">contracts/.env</span>; frontend uses{' '}
            <span className="font-mono text-ghost-400">VITE_*</span> in project root <span className="font-mono text-ghost-400">.env</span>.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto !text-ghost-200">
          <div className="rounded-lg border border-white/10 bg-ghost-900/40 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-ghost-800/60 text-left text-ghost-400 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 font-semibold w-[28%]">Example / concept</th>
                  <th className="py-3 px-3 font-semibold w-[32%]">Frontend env</th>
                  <th className="py-3 px-3 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {ENV_MAPPING.map((row) => (
                  <tr
                    key={row.exampleKey}
                    className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="py-2.5 px-3 font-mono text-xs text-ghost-200 align-top">{row.exampleKey}</td>
                    <td className="py-2.5 px-3 font-mono text-xs text-primary-300/90 align-top">{row.viteKey}</td>
                    <td className="py-2.5 px-3 text-ghost-400 text-xs align-top leading-snug">{row.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card> */}
    </div>
  )
}
