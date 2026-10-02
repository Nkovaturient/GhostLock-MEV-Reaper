import { useEffect, useState } from 'react'
import { useBlockNumber, useChainId } from 'wagmi'

/** Arbitrum L2 ~0.25s/block; other chains use a conservative default */
const SEC_PER_BLOCK: Record<number, number> = {
  421614: 0.25,
  42161: 0.25,
  84532: 2,
  8453: 2,
}

export function useCountdown(targetBlock: number | null, active = true): number {
  const chainId = useChainId()
  const hasTarget = active && targetBlock != null && targetBlock > 0
  const { data: currentBlock } = useBlockNumber({
    watch: false,
    query: {
      enabled: hasTarget,
      refetchInterval: hasTarget ? 8_000 : false,
      refetchIntervalInBackground: false,
    },
  })
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (targetBlock == null || currentBlock == null) {
      setSecondsLeft(0)
      return
    }
    const blocksLeft = Math.max(0, targetBlock - Number(currentBlock))
    const secPerBlock = SEC_PER_BLOCK[chainId] ?? 2
    setSecondsLeft(Math.max(0, Math.ceil(blocksLeft * secPerBlock)))
  }, [targetBlock, currentBlock, chainId])

  return secondsLeft
}
