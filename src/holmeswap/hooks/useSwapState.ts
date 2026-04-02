import { useCallback } from 'react'
import { useSwapStore } from '../stores/swapStore'

export function useSwapState() {
  const setAmountOut = useSwapStore((s) => s.setAmountOut)

  const updateAmountOutFromPrice = useCallback(
    (amountIn: string, pricePerUnit: number, decimalsOut: number) => {
      const inNum = parseFloat(amountIn) || 0
      const out = inNum * pricePerUnit
      setAmountOut(out.toFixed(decimalsOut))
    },
    [setAmountOut]
  )

  return { updateAmountOutFromPrice }
}
