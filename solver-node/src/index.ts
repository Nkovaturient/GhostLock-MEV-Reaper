import 'dotenv/config'
import { loadConfig } from './config'
import { SolverEngine } from './SolverEngine'
import { logger } from './logger'

async function main(): Promise<void> {
  try {
    const config = loadConfig()
    process.env.LOG_LEVEL = config.logLevel

    const engine = new SolverEngine({
      rpcUrls: config.rpcUrls,
      solverPrivateKey: config.solverPrivateKey,
      solverBoardAddress: config.solverBoardAddress,
      batchSettlementAddress: config.batchSettlementAddress,
      solverRegistryAddress: config.solverRegistryAddress,
      markets: config.markets,
      quoterV2Address: process.env.QUOTER_V2_ADDRESS,
    })

    const shutdown = async (): Promise<void> => {
      logger.info('Shutdown signal received')
      await engine.stop()
      process.exit(0)
    }

    process.on('SIGINT', () => void shutdown())
    process.on('SIGTERM', () => void shutdown())

    await engine.start()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('SOLVER_PRIVATE_KEY') || msg.includes('private key')) {
      logger.error('Invalid or missing private key - exit immediately', { error: 'config' })
    } else if (msg.includes('ADDRESS') || msg.includes('address')) {
      logger.error('Invalid or missing contract address - exit immediately', { error: 'config' })
    } else {
      logger.error('Solver node failed to start', { error: msg })
    }
    process.exit(1)
  }
}

void main()
