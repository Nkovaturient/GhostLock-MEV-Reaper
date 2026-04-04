import type { PublicClient } from 'viem'

/**
 * Fee params for wallet submit txs. Ensures maxFeePerGas clears the latest
 * baseFee (with headroom) so MetaMask / EIP-1559 does not reject with
 * "max fee per gas less than block base fee".
 */
export async function getEip1559GasForWallet(
  publicClient: PublicClient,
): Promise<{ maxFeePerGas: bigint; maxPriorityFeePerGas: bigint } | Record<string, never>> {
  try {
    const [block, est] = await Promise.all([
      publicClient.getBlock({ blockTag: 'latest' }),
      publicClient.estimateFeesPerGas().catch(() => ({})),
    ])

    const base = block.baseFeePerGas
    if (base == null) return {}

    const estFees = est as { maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint }

    let priority =
      estFees.maxPriorityFeePerGas != null && estFees.maxPriorityFeePerGas > 0n
        ? estFees.maxPriorityFeePerGas
        : base / 10n > 0n
          ? base / 10n
          : 1_000_000n

    let maxFee = estFees.maxFeePerGas ?? base * 2n + priority
    const floor = base + priority + (base / 4n) + 1n
    if (maxFee < floor) maxFee = floor
    maxFee = (maxFee * 13n) / 10n

    return { maxFeePerGas: maxFee, maxPriorityFeePerGas: priority }
  } catch {
    return {}
  }
}
