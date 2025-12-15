import { ethers } from 'ethers'

export interface IntentForOrdering {
  requestId?: number | string
  id?: string | number
  user: string
  [key: string]: any
}

/**
 * Deterministic ordering function matching server-side compareBySeed logic
 * Uses keccak256(seed || requestId || user) for fair, unbiased ordering
 * 
 * @param seed Epoch seed from EpochRNG contract (bytes32)
 * @param a First intent to compare
 * @param b Second intent to compare
 * @returns Comparison result (-1, 0, or 1)
 */
export function compareBySeed(
  seed: `0x${string}` | string | null,
  a: IntentForOrdering,
  b: IntentForOrdering
): number {
  if (!seed || seed === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    return 0
  }

  const normalizeAddress = (addr: string): string => {
    if (!addr) return '0x0000000000000000000000000000000000000000'
    return ethers.getAddress(addr)
  }

  const normalizeRequestId = (id: number | string | undefined): bigint => {
    if (id === undefined) return BigInt(0)
    return BigInt(id)
  }

  const requestIdA = normalizeRequestId(a.requestId ?? a.id)
  const requestIdB = normalizeRequestId(b.requestId ?? b.id)
  const userA = normalizeAddress(a.user)
  const userB = normalizeAddress(b.user)

  const hashA = ethers.keccak256(
    ethers.concat([
      seed as `0x${string}`,
      ethers.zeroPadValue(ethers.toBeHex(requestIdA), 32),
      ethers.getBytes(ethers.zeroPadValue(userA, 32))
    ])
  )

  const hashB = ethers.keccak256(
    ethers.concat([
      seed as `0x${string}`,
      ethers.zeroPadValue(ethers.toBeHex(requestIdB), 32),
      ethers.getBytes(ethers.zeroPadValue(userB, 32))
    ])
  )

  if (hashA < hashB) return -1
  if (hashA > hashB) return 1
  return 0
}

/**
 * Orders an array of intents using the epoch seed for fair sequencing
 * This prevents sandwich attacks by randomizing the order of intents
 * 
 * @param intents Array of intents to order
 * @param epochSeed Seed from EpochRNG contract for the epoch
 * @returns Ordered array of intents
 */
export function orderIntentsBySeed<T extends IntentForOrdering>(
  intents: T[],
  epochSeed: `0x${string}` | string | null
): T[] {
  if (!epochSeed || epochSeed === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    return [...intents]
  }

  return [...intents].sort((a, b) => compareBySeed(epochSeed, a, b))
}

/**
 * Groups intents by epoch and orders each group using the respective epoch seed
 * 
 * @param intents Array of intents with epoch property
 * @param getEpochSeed Function to fetch epoch seed for a given epoch
 * @returns Promise resolving to ordered intents
 */
export async function orderIntentsByEpochSeed<T extends IntentForOrdering & { epoch: number }>(
  intents: T[],
  getEpochSeed: (epoch: number) => Promise<`0x${string}` | null>
): Promise<T[]> {
  const groupedByEpoch = new Map<number, T[]>()
  
  for (const intent of intents) {
    const epoch = intent.epoch
    if (!groupedByEpoch.has(epoch)) {
      groupedByEpoch.set(epoch, [])
    }
    groupedByEpoch.get(epoch)!.push(intent)
  }

  const orderedIntents: T[] = []
  
  for (const [epoch, epochIntents] of groupedByEpoch.entries()) {
    const seed = await getEpochSeed(epoch)
    const ordered = orderIntentsBySeed(epochIntents, seed)
    orderedIntents.push(...ordered)
  }

  return orderedIntents
}

/**
 * Creates a deterministic hash for an intent using the epoch seed
 * Useful for consistent ordering across different contexts
 * 
 * @param seed Epoch seed
 * @param requestId Intent request ID
 * @param user User address
 * @returns Deterministic hash
 */
export function getIntentOrderHash(
  seed: `0x${string}` | string | null,
  requestId: number | string | undefined,
  user: string
): `0x${string}` {
  if (!seed || seed === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    return ethers.keccak256(ethers.toUtf8Bytes(`${requestId ?? '0'}-${user}`)) as `0x${string}`
  }

  const normalizedUser = ethers.getAddress(user)
  const normalizedRequestId = BigInt(requestId ?? 0)

  return ethers.keccak256(
    ethers.concat([
      seed as `0x${string}`,
      ethers.zeroPadValue(ethers.toBeHex(normalizedRequestId), 32),
      ethers.getBytes(ethers.zeroPadValue(normalizedUser, 32))
    ])
  ) as `0x${string}`
}

