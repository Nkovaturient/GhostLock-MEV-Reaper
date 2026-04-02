export interface SolverConfig {
  rpcUrls: string[]
  solverPrivateKey: string
  solverBoardAddress: string
  batchSettlementAddress: string
  solverRegistryAddress: string
  logLevel: string
  markets: Map<number, { baseToken: string; quoteToken: string }>
}

const MIN_RPC_URLS = 1

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v || v === '0x...') {
    throw new Error(`Missing or invalid env: ${name}`)
  }
  return v
}

function parseMarkets(): Map<number, { baseToken: string; quoteToken: string }> {
  const m = new Map<number, { baseToken: string; quoteToken: string }>()
  let i = 0
  while (true) {
    const base = process.env[`MARKET_${i}_BASE`]
    const quote = process.env[`MARKET_${i}_QUOTE`]
    if (!base || !quote) break
    m.set(i, { baseToken: base, quoteToken: quote })
    i++
  }
  return m
}

export function loadConfig(): SolverConfig {
  const rpcUrl = requireEnv('RPC_URL')
  const fallback1 = process.env.RPC_FALLBACK_1
  const fallback2 = process.env.RPC_FALLBACK_2
  const rpcUrls = [rpcUrl]
  if (fallback1) rpcUrls.push(fallback1)
  if (fallback2) rpcUrls.push(fallback2)

  if (rpcUrls.length < MIN_RPC_URLS) {
    throw new Error('At least one RPC_URL is required')
  }

  const solverBoardAddress = requireEnv('SOLVER_BOARD_ADDRESS')
  const batchSettlementAddress = requireEnv('BATCH_SETTLEMENT_ADDRESS')
  const solverRegistryAddress = requireEnv('SOLVER_REGISTRY_ADDRESS')

  if (!/^0x[a-fA-F0-9]{40}$/.test(solverBoardAddress)) {
    throw new Error('SOLVER_BOARD_ADDRESS must be a valid 20-byte hex address')
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(batchSettlementAddress)) {
    throw new Error('BATCH_SETTLEMENT_ADDRESS must be a valid 20-byte hex address')
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(solverRegistryAddress)) {
    throw new Error('SOLVER_REGISTRY_ADDRESS must be a valid 20-byte hex address')
  }

  const solverPrivateKey = requireEnv('SOLVER_PRIVATE_KEY')
  if (!solverPrivateKey.startsWith('0x') || solverPrivateKey.length < 64) {
    throw new Error('SOLVER_PRIVATE_KEY must be a valid hex private key')
  }

  const markets = parseMarkets()

  return {
    rpcUrls,
    solverPrivateKey,
    solverBoardAddress,
    batchSettlementAddress,
    solverRegistryAddress,
    logLevel: process.env.LOG_LEVEL ?? 'info',
    markets,
  }
}
