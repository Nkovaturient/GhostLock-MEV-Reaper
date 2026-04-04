import { useChainId, useWatchContractEvent } from 'wagmi'
import { useSwapStore } from '../stores/swapStore'
import { GhostLockLivenessABI } from '../ABI/GhostLockLiveness'
import { getAddresses } from '../contracts/config'

/**
 * When blocklock delivers the key, GhostLockLiveness emits IntentDecrypted.
 * Advancing on this event avoids relying only on isReady refetch (see useIntentLivenessFollowup).
 * Also captures the transactionHash for the reveal transaction.
 */
export function useIntentDecryptedWatch() {
  const chainId = useChainId()
  const lastRequestId = useSwapStore((s) => s.lastRequestId)
  const intentStatus = useSwapStore((s) => s.intentStatus)
  const setIntentStatus = useSwapStore((s) => s.setIntentStatus)
  const setStep = useSwapStore((s) => s.setStep)
  const setRevealTxHash = useSwapStore((s) => s.setRevealTxHash)

  const addrs = getAddresses(chainId)
  const enabled =
    lastRequestId != null &&
    intentStatus === 'locked' &&
    Boolean(addrs.GhostLockLiveness)

  useWatchContractEvent({
    address: addrs.GhostLockLiveness,
    abi: GhostLockLivenessABI,
    eventName: 'IntentDecrypted',
    ...(enabled && lastRequestId != null
      ? { args: { requestId: BigInt(lastRequestId) } as const }
      : {}),
    enabled,
    onLogs: (logs) => {
      const rid = lastRequestId
      if (rid == null) return
      for (const log of logs) {
        const got = (log as { args?: { requestId?: bigint } }).args?.requestId
        const txHash = (log as { transactionHash?: `0x${string}` }).transactionHash
        if (got != null && Number(got) === rid) {
          // Capture the reveal transaction hash
          if (txHash) {
            setRevealTxHash(txHash)
          }
          setIntentStatus('ordering')
          setStep(4)
          setTimeout(() => setIntentStatus('competing'), 2_000)
          return
        }
      }
    },
  })
}
