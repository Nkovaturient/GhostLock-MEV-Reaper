import { useEffect } from 'react'
import { useSwapStore, type IntentStatus } from '../stores/swapStore'
import { useCountdown } from './useCountdown'
import { useTimelineProgress } from './useTimelineProgress'

export function useIntentStatus() {
  const intentStatus = useSwapStore((s) => s.intentStatus)
  const setIntentStatus = useSwapStore((s) => s.setIntentStatus)
  const setCountdown = useSwapStore((s) => s.setCountdown)
  const targetBlock = useSwapStore((s) => s.targetBlock)

  const countdown = useCountdown(targetBlock)
  useTimelineProgress(intentStatus)

  useEffect(() => {
    setCountdown(countdown)
  }, [countdown, setCountdown])

  return { intentStatus, setIntentStatus }
}
