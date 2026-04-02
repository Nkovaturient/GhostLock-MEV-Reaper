import { useEffect, useState } from 'react'
import { useBlockNumber } from 'wagmi'

const BLOCKS_PER_COUNTDOWN = 100
const AVG_BLOCK_TIME_SEC = 2

export function useCountdown(targetBlock: number | null): number {
  const { data: currentBlock } = useBlockNumber({ watch: true })
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (targetBlock == null || currentBlock == null) {
      setSecondsLeft(0)
      return
    }
    const blocksLeft = Math.max(0, targetBlock - Number(currentBlock))
    setSecondsLeft(blocksLeft * AVG_BLOCK_TIME_SEC)
  }, [targetBlock, currentBlock])

  return secondsLeft
}
