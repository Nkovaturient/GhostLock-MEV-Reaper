export interface DrandNetwork {
  name: string
  chainHash: string
  publicKey: string
  genesisTime: number
  period: number
  scheme: string
}

export interface DrandAnchor {
  epochAnchor: number | bigint
  roundAnchor: number | bigint
  roundsPerEpoch: number | bigint
}

export interface DrandBeaconRound {
  round: number
  signature: string
  randomness?: string
}

export const DRAND_EVMNET: DrandNetwork
export const DRAND_QUICKNET: DrandNetwork
export const DRAND_RELAYS: readonly string[]

export function timeOfRound(round: number | bigint, network?: DrandNetwork): number
export function roundAt(timestampSec?: number, network?: DrandNetwork): number
export function roundAfter(timestampSec: number, network?: DrandNetwork): number
export function msUntilRound(round: number | bigint, network?: DrandNetwork): number
export function fetchBeacon(
  round: number | bigint | 'latest',
  network?: DrandNetwork,
  options?: { timeoutMs?: number },
): Promise<DrandBeaconRound>
export function signatureToG1(signature: string): { x: bigint; y: bigint }
export function roundForEpoch(epoch: number | bigint, anchor: DrandAnchor): bigint
