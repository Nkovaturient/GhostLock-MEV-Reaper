import { useEffect, useState } from 'react'
import { unlockTimeForRound } from '../../lib/tlock-service'

/** Seconds until drand unlock round (tlock reveal window). */
export function useRevealCountdown(unlockRound: number | null, active = true): number {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (!active || unlockRound == null || unlockRound <= 0) {
      setSecondsLeft(0)
      return
    }

    const tick = () => {
      const unlockTs = unlockTimeForRound(unlockRound)
      setSecondsLeft(Math.max(0, unlockTs - Math.floor(Date.now() / 1000)))
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [unlockRound, active])

  return secondsLeft
}
