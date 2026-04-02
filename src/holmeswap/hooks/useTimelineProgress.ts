import { useEffect } from 'react'
import { useSwapStore, type IntentStatus } from '../stores/swapStore'

const statusToStep: Record<IntentStatus, number> = {
  idle: 0,
  encrypting: 1,
  locked: 2,
  ordering: 3,
  competing: 4,
  settled: 5,
}

export function useTimelineProgress(intentStatus: IntentStatus) {
  const setStep = useSwapStore((s) => s.setStep)

  useEffect(() => {
    setStep(statusToStep[intentStatus] as 0 | 1 | 2 | 3 | 4 | 5)
  }, [intentStatus, setStep])
}
