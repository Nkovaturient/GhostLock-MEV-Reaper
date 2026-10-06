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

export interface DrandNetwork {
  name: string
  chainHash: string
  publicKey: string
  genesisTime: number
  period: number
  scheme: string
}

export {
  DRAND_EVMNET,
  DRAND_QUICKNET,
  DRAND_RELAYS,
  timeOfRound,
  roundAt,
  roundAfter,
  msUntilRound,
  fetchBeacon,
  signatureToG1,
  roundForEpoch,
  epochFromEvmnetRound,
  epochForTimestamp,
} from '../../shared/drand.js'
