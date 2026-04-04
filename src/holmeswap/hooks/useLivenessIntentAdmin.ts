/**
 * Fetches GhostLockLiveness intent list + on-chain fields for admin / explorer UI.
 * Uses publicClient in one query to keep refetch consistent.
 */
import { useChainId, usePublicClient, useBlockNumber } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { formatEther } from 'viem'
import { GhostLockLivenessABI } from '../ABI/GhostLockLiveness'
import { EpochRNGABI } from '../ABI/EpochRNG'
import {
  AUCTION,
  getAddresses,
  isGhostLockLivenessConfigured,
  PLACEHOLDER_ZERO,
} from '../contracts/config'

const MAX_IDS = 50

export type LivenessIntentAdminRow = {
  requestId: number
  requestedBy: `0x${string}`
  unlockBlock: number
  derivedEpoch: number
  ready: boolean
  forced: boolean
  bondWei: bigint
  bondEth: string
  revealDeadline: bigint
  slashDeadline: bigint
  epochSeed: `0x${string}` | null
}

type IntentReadResult = {
  requestedBy: `0x${string}`
  encryptedAt: number
  unlockBlock: number
  ready: boolean
  forced: boolean
  bond: bigint
  revealDeadline: bigint
  slashDeadline: bigint
}

function toNum(v: unknown): number {
  if (typeof v === 'bigint') return Number(v)
  if (typeof v === 'number') return v
  return Number(v ?? 0)
}

function toBig(v: unknown): bigint {
  if (typeof v === 'bigint') return v
  if (typeof v === 'number') return BigInt(v)
  if (typeof v === 'string') return BigInt(v)
  return 0n
}

function parseIntent(raw: unknown): IntentReadResult | null {
  if (raw == null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const requestedBy = o.requestedBy as `0x${string}` | undefined
  if (!requestedBy || requestedBy === '0x0000000000000000000000000000000000000000') return null
  return {
    requestedBy,
    encryptedAt: toNum(o.encryptedAt),
    unlockBlock: toNum(o.unlockBlock),
    ready: Boolean(o.ready),
    forced: Boolean(o.forced),
    bond: toBig(o.bond),
    revealDeadline: toBig(o.revealDeadline),
    slashDeadline: toBig(o.slashDeadline),
  }
}

export function useLivenessIntentAdmin(walletAddress: `0x${string}` | undefined) {
  const chainId = useChainId()
  const publicClient = usePublicClient({ chainId })
  const addrs = getAddresses(chainId)
  const configured = isGhostLockLivenessConfigured(chainId)
  const rngAddr = addrs.GhostLockEpochRNG
  const rngOk = rngAddr !== PLACEHOLDER_ZERO

  const { data: currentBlock } = useBlockNumber({
    chainId,
    query: { refetchInterval: 12_000 },
  })

  const query = useQuery({
    queryKey: [
      'liveness-intent-admin',
      chainId,
      walletAddress?.toLowerCase(),
      addrs.GhostLockLiveness,
    ],
    enabled: Boolean(configured && publicClient && walletAddress),
    queryFn: async (): Promise<{ rows: LivenessIntentAdminRow[]; requestIds: number[] }> => {
      if (!publicClient || !walletAddress) return { rows: [], requestIds: [] }

      const ids = (await publicClient.readContract({
        address: addrs.GhostLockLiveness,
        abi: GhostLockLivenessABI,
        functionName: 'getRequestIds',
        args: [walletAddress],
      })) as readonly bigint[]

      const capped = [...ids].map((x) => Number(x)).reverse().slice(0, MAX_IDS)
      const rows: LivenessIntentAdminRow[] = []
      const epochSet = new Set<number>()

      for (const requestId of capped) {
        const raw = await publicClient.readContract({
          address: addrs.GhostLockLiveness,
          abi: GhostLockLivenessABI,
          functionName: 'intents',
          args: [BigInt(requestId)],
        })
        const it = parseIntent(raw)
        if (!it) continue
        const derivedEpoch = Math.floor(it.unlockBlock / AUCTION.EPOCH_DURATION_BLOCKS)
        epochSet.add(derivedEpoch)
        rows.push({
          requestId,
          requestedBy: it.requestedBy,
          unlockBlock: it.unlockBlock,
          derivedEpoch,
          ready: it.ready,
          forced: it.forced,
          bondWei: it.bond,
          bondEth: formatEther(it.bond),
          revealDeadline: it.revealDeadline,
          slashDeadline: it.slashDeadline,
          epochSeed: null,
        })
      }

      const epochToSeed = new Map<number, `0x${string}`>()
      if (rngOk) {
        for (const epoch of epochSet) {
          const seed = (await publicClient.readContract({
            address: rngAddr,
            abi: EpochRNGABI,
            functionName: 'getEpochSeed',
            args: [BigInt(epoch)],
          })) as `0x${string}`
          epochToSeed.set(epoch, seed)
        }
      }

      for (const row of rows) {
        row.epochSeed = epochToSeed.get(row.derivedEpoch) ?? null
      }

      return { rows, requestIds: capped }
    },
  })

  return {
    rows: query.data?.rows ?? [],
    requestIds: query.data?.requestIds ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    configured,
    currentBlock: currentBlock != null ? Number(currentBlock) : undefined,
    addresses: addrs,
    chainId,
    rngConfigured: rngOk,
  }
}
