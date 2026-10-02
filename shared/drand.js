/**
 * Shared drand client used by both the browser app and the solver server.
 *
 * GhostLock uses two drand networks, for two different jobs:
 *
 *   quicknet (BLS12-381, sigs on G1) — timelock encryption of intents (tlock).
 *     Only quicknet supports tlock, so the ENCRYPT layer targets it.
 *
 *   evmnet (BN254, sigs on G1) — the per-epoch ordering seed.
 *     BN254 is what the EVM pairing precompile speaks, so DrandBeacon.sol can
 *     verify these signatures on-chain with no trusted relayer.
 *
 * Both are public, permissionless beacons: unlike the dcipher blocklock agent,
 * no single operator's downtime can stall the protocol.
 */

/** @typedef {{ name: string, chainHash: string, publicKey: string, genesisTime: number, period: number, scheme: string }} DrandNetwork */

/** @type {DrandNetwork} */
export const DRAND_EVMNET = {
  name: 'evmnet',
  chainHash: '04f1e9062b8a81f848fded9c12306733282b2727ecced50032187751166ec8c3',
  publicKey:
    '07e1d1d335df83fa98462005690372c643340060d205306a9aa8106b6bd0b382' +
    '0557ec32c2ad488e4d4f6008f89a346f18492092ccc0d594610de2732c8b808f' +
    '0095685ae3a85ba243747b1b2f426049010f6b73a0cf1d389351d5aaaa1047f6' +
    '297d3a4f9749b33eb2d904c9d9ebf17224150ddd7abd7567a9bec6c74480ee0b',
  genesisTime: 1727521075,
  period: 3,
  scheme: 'bls-bn254-unchained-on-g1',
}

/** @type {DrandNetwork} */
export const DRAND_QUICKNET = {
  name: 'quicknet',
  chainHash: '52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971',
  publicKey:
    '83cf0f2896adee7eb8b5f01fcad3912212c437e0073e911fb90022d3e760183c' +
    '8c4b450b6a0a6c3ac6a5776a2d1064510d1fec758c921cc22b0e17e63aaf4bcb' +
    '5ed66304de9cf809bd274ca73bab4af5a6e9c76a4bc09e76eae8991ef5ece45a',
  genesisTime: 1692803367,
  period: 3,
  scheme: 'bls-unchained-g1-rfc9380',
}

/**
 * Relays are tried in order. All of these serve the v1 `/{chainHash}/public/{round}`
 * route; Cloudflare does not serve the v2 route, so v1 is used throughout.
 */
export const DRAND_RELAYS = [
  'https://api.drand.sh',
  'https://api2.drand.sh',
  'https://api3.drand.sh',
  'https://drand.cloudflare.com',
]

/** Timestamp (seconds) at which `round` is emitted. */
export function timeOfRound(round, network = DRAND_EVMNET) {
  if (round < 1) throw new Error(`drand: round must be >= 1, got ${round}`)
  return network.genesisTime + (Number(round) - 1) * network.period
}

/** Latest round emitted at or before `timestampSec` (defaults to now). */
export function roundAt(timestampSec = Math.floor(Date.now() / 1000), network = DRAND_EVMNET) {
  if (timestampSec < network.genesisTime) return 1
  return Math.floor((timestampSec - network.genesisTime) / network.period) + 1
}

/** First round emitted at or after `timestampSec`. */
export function roundAfter(timestampSec, network = DRAND_EVMNET) {
  const round = roundAt(timestampSec, network)
  return timeOfRound(round, network) >= timestampSec ? round : round + 1
}

/** Milliseconds until `round` is emitted; 0 once it is due. */
export function msUntilRound(round, network = DRAND_EVMNET) {
  return Math.max(0, timeOfRound(round, network) * 1000 - Date.now())
}

/**
 * Fetch a round from the first responsive relay.
 * @param {number|bigint|'latest'} round
 * @returns {Promise<{ round: number, signature: string, randomness?: string }>}
 */
export async function fetchBeacon(round, network = DRAND_EVMNET, { timeoutMs = 8000 } = {}) {
  const path = `/${network.chainHash}/public/${round}`
  const errors = []

  for (const relay of DRAND_RELAYS) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      let res
      try {
        res = await fetch(`${relay}${path}`, { signal: controller.signal })
      } finally {
        clearTimeout(timer)
      }
      if (!res.ok) {
        errors.push(`${relay}: HTTP ${res.status}`)
        continue
      }
      const body = await res.json()
      if (!body?.signature) {
        errors.push(`${relay}: no signature in response`)
        continue
      }
      return { round: Number(body.round), signature: body.signature, randomness: body.randomness }
    } catch (err) {
      errors.push(`${relay}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  throw new Error(`drand: all relays failed for ${network.name} round ${round} — ${errors.join('; ')}`)
}

/**
 * Split an evmnet signature into the G1 coordinates DrandBeacon.relay expects.
 * evmnet signatures are 64 bytes serialised as x || y.
 * @returns {{ x: bigint, y: bigint }}
 */
export function signatureToG1(signature) {
  const hex = signature.startsWith('0x') ? signature.slice(2) : signature
  if (hex.length !== 128) {
    throw new Error(`drand: expected a 64-byte BN254 G1 signature, got ${hex.length / 2} bytes`)
  }
  return { x: BigInt(`0x${hex.slice(0, 64)}`), y: BigInt(`0x${hex.slice(64)}`) }
}

/**
 * Mirror of GhostLockEpochRNG.roundForEpoch. The anchor is immutable on-chain, so
 * clients must read it from the contract rather than assume it.
 * @param {{ epochAnchor: number|bigint, roundAnchor: number|bigint, roundsPerEpoch: number|bigint }} anchor
 */
export function roundForEpoch(epoch, anchor) {
  const e = BigInt(epoch)
  const epochAnchor = BigInt(anchor.epochAnchor)
  if (e === 0n) throw new Error('drand: epoch 0 is reserved')
  if (e < epochAnchor) throw new Error(`drand: epoch ${epoch} precedes anchor ${epochAnchor}`)
  return BigInt(anchor.roundAnchor) + (e - epochAnchor) * BigInt(anchor.roundsPerEpoch)
}
