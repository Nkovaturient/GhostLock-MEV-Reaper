import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAccount, usePublicClient, useWatchContractEvent } from 'wagmi'
import { GhostLockLivenessABI } from '../holmeswap/ABI/GhostLockLiveness'
import {
  getAddresses,
  isGhostLockLivenessConfigured,
} from '../holmeswap/contracts/config'
import { useNetworkConfig } from './useNetworkConfig'

export interface tempFig {
  id: number
  requestedBy: string
  encryptedAt: number
  decryptedAt: number | null
  message: string
  ready: boolean
}

function parseIntentRow(raw: unknown): {
  requestedBy: string
  encryptedAt: number
  ready: boolean
} | null {
  if (raw == null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const requestedBy = String(o.requestedBy ?? '')
  if (!requestedBy || requestedBy === '0x0000000000000000000000000000000000000000') {
    return null
  }
  const encryptedAt =
    typeof o.encryptedAt === 'bigint'
      ? Number(o.encryptedAt)
      : Number(o.encryptedAt ?? 0)
  return {
    requestedBy,
    encryptedAt,
    ready: Boolean(o.ready),
  }
}

export const useExplorer = (setActiveTab?: (tab: string) => void) => {
  const { chainId, address } = useAccount()
  const publicClient = usePublicClient({ chainId })
  const queryClient = useQueryClient()
  const { isSupported } = useNetworkConfig()

  const liveness =
    chainId && isGhostLockLivenessConfigured(chainId)
      ? getAddresses(chainId).GhostLockLiveness
      : undefined

  useWatchContractEvent({
    chainId: isSupported && chainId ? Number(chainId) : undefined,
    abi: GhostLockLivenessABI,
    address: liveness,
    eventName: 'IntentSubmitted',
    enabled: isSupported && !!liveness && !!address,
    onLogs: (logs) => {
      const mine = logs.some(
        (log) =>
          log.args.user?.toLowerCase() === address?.toLowerCase(),
      )
      if (mine) {
        queryClient.invalidateQueries({ queryKey: ['userRequests'] })
      }
    },
  })

  useWatchContractEvent({
    chainId: isSupported && chainId ? Number(chainId) : undefined,
    abi: GhostLockLivenessABI,
    address: liveness,
    eventName: 'IntentDecrypted',
    enabled: isSupported && !!liveness && !!address,
    onLogs: () => {
      queryClient.invalidateQueries({ queryKey: ['userRequests'] })
    },
  })

  return useQuery({
    queryKey: ['userRequests', chainId, address, liveness],
    queryFn: async (): Promise<tempFig[]> => {
      if (setActiveTab) setActiveTab('decrypt')
      if (!publicClient || !address || !liveness) return []

      const ids = (await publicClient.readContract({
        address: liveness,
        abi: GhostLockLivenessABI,
        functionName: 'getRequestIds',
        args: [address],
      })) as readonly bigint[]

      const rows: tempFig[] = []
      for (const id of [...ids].reverse().slice(0, 20)) {
        const requestId = Number(id)
        const raw = await publicClient.readContract({
          address: liveness,
          abi: GhostLockLivenessABI,
          functionName: 'intents',
          args: [BigInt(requestId)],
        })
        const it = parseIntentRow(raw)
        if (!it || it.requestedBy.toLowerCase() !== address.toLowerCase()) {
          continue
        }
        rows.push({
          id: requestId,
          requestedBy: it.requestedBy,
          encryptedAt: it.encryptedAt,
          decryptedAt: it.ready ? it.encryptedAt : null,
          message: it.ready ? 'Decrypted' : 'Encrypted',
          ready: it.ready,
        })
      }
      return rows
    },
    staleTime: 60_000,
    enabled: !!publicClient && !!address && !!liveness && isSupported,
  })
}
