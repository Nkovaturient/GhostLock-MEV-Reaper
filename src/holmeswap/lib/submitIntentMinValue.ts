import type { PublicClient } from 'viem'
import { GhostLockLivenessABI } from '../ABI/GhostLockLiveness'
import { BlocklockSenderPriceABI } from '../ABI/BlocklockSenderPrice'

export type SubmitIntentMinWeiResult = {
  requestPrice: bigint
  bondMinimum: bigint
  minValue: bigint
}

/**
 * Blocklock enforces callbackGasLimit <= maxGasLimit (often 500k on Randamu senders).
 * Sending AUCTION.CALLBACK_GAS_LIMIT above that reverts the whole submit.
 */
export async function getEffectiveCallbackGasLimit(
  publicClient: PublicClient,
  livenessAddress: `0x${string}`,
  desired: number,
): Promise<number> {
  try {
    const blocklockAddr = await publicClient.readContract({
      address: livenessAddress,
      abi: GhostLockLivenessABI,
      functionName: 'blocklock',
    })
    const cfg = await publicClient.readContract({
      address: blocklockAddr,
      abi: BlocklockSenderPriceABI,
      functionName: 'getConfig',
    })
    const maxGasLimit = Number((cfg as readonly [bigint, ...unknown[]])[0])
    if (!Number.isFinite(maxGasLimit) || maxGasLimit <= 0) return desired
    return Math.min(desired, maxGasLimit)
  } catch {
    return desired
  }
}

/**
 * Matches GhostLockLiveness.submitIntentWithBond: msg.value must be >=
 * blocklock.calculateRequestPriceNative(callbackGasLimit) + BOND_MINIMUM.
 */
export async function getSubmitIntentMinValueWei(
  publicClient: PublicClient,
  livenessAddress: `0x${string}`,
  callbackGasLimit: number,
): Promise<SubmitIntentMinWeiResult> {
  const [bondMinimum, blocklockAddr] = await Promise.all([
    publicClient.readContract({
      address: livenessAddress,
      abi: GhostLockLivenessABI,
      functionName: 'BOND_MINIMUM',
    }),
    publicClient.readContract({
      address: livenessAddress,
      abi: GhostLockLivenessABI,
      functionName: 'blocklock',
    }),
  ])

  const requestPrice = await publicClient.readContract({
    address: blocklockAddr,
    abi: BlocklockSenderPriceABI,
    functionName: 'calculateRequestPriceNative',
    args: [callbackGasLimit],
  })

  return {
    requestPrice,
    bondMinimum,
    minValue: requestPrice + bondMinimum,
  }
}
