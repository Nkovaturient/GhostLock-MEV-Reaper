import { useChainId, useWatchContractEvent } from 'wagmi'
import { useSwapStore } from '../stores/swapStore'
import { GhostLockLivenessABI } from '../ABI/GhostLockLiveness'
import { getAddresses } from '../contracts/config'
import { requestIdsEqual } from '../lib/requestId'

/**
 * When GhostLockLiveness emits IntentDecrypted, advance to batch ordering (step 3).
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
    (intentStatus === 'locked' || intentStatus === 'ordering') &&
    Boolean(addrs.GhostLockLiveness)

  useWatchContractEvent({
    address: addrs.GhostLockLiveness,
    abi: GhostLockLivenessABI,
    eventName: 'IntentDecrypted',
    enabled,
    onLogs: (logs) => {
      const rid = lastRequestId
      if (rid == null) return
      for (const log of logs) {
        const got = (log as { args?: { requestId?: bigint } }).args?.requestId
        const txHash = (log as { transactionHash?: `0x${string}` }).transactionHash
        if (!requestIdsEqual(got, rid)) continue
        // #region agent log
        fetch('http://127.0.0.1:7863/ingest/1c9654de-6579-4cb1-ad7e-6ea69c8510bd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6912e8'},body:JSON.stringify({sessionId:'6912e8',hypothesisId:'H2',location:'useIntentDecryptedWatch.ts:onLogs',message:'IntentDecrypted matched',data:{rid,got:got?.toString()},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (txHash) setRevealTxHash(txHash)
        setIntentStatus('ordering')
        setStep(3)
        return
      }
    },
  })
}
