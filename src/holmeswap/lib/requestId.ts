/** GhostLock tlock request IDs are uint256 (>= 2^128). Never use JavaScript Number. */
export function requestIdToString(id: bigint | number | string): string {
  if (typeof id === 'string') return id
  if (typeof id === 'bigint') return id.toString()
  return String(id)
}

export function requestIdsEqual(
  a: bigint | number | string | null | undefined,
  b: bigint | number | string | null | undefined,
): boolean {
  if (a == null || b == null) return false
  return requestIdToString(a) === requestIdToString(b)
}

export function requestIdToBigInt(id: string): bigint {
  return BigInt(id)
}
