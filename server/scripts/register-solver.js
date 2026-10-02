#!/usr/bin/env node
/**
 * Register the solver wallet in SolverRegistry with MIN_BOND (1 ETH).
 *
 * Usage (from server/):
 *   node scripts/register-solver.js
 *
 * Requires SOLVER_PRIVATE_KEY and SOLVER_REGISTRY_ADDRESS in .env
 */

require('dotenv').config()
const { ethers } = require('ethers')
const { CONFIG, ABIS } = require('../config.js')

async function main() {
  if (!CONFIG.SOLVER.PRIVATE_KEY) {
    throw new Error('SOLVER_PRIVATE_KEY not set')
  }

  const provider = new ethers.JsonRpcProvider(CONFIG.NETWORK.RPC_URL)
  const signer = new ethers.Wallet(CONFIG.SOLVER.PRIVATE_KEY, provider)
  const address = await signer.getAddress()

  const registry = new ethers.Contract(
    CONFIG.CONTRACTS.SOLVER_REGISTRY,
    ABIS.SOLVER_REGISTRY_ABI,
    signer
  )

  const existing = await registry.solvers(address)
  if (existing.isActive) {
    console.log(`Already registered: ${address}`)
    console.log(`Bond: ${ethers.formatEther(existing.bondAmount)} ETH`)
    return
  }

  const minBond = await registry.MIN_BOND()
  const balance = await provider.getBalance(address)
  console.log(`Wallet:  ${address}`)
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`)
  console.log(`Min bond: ${ethers.formatEther(minBond)} ETH`)
  console.log(`Registry: ${CONFIG.CONTRACTS.SOLVER_REGISTRY}`)

  if (balance < minBond) {
    throw new Error(
      `Insufficient balance: need ${ethers.formatEther(minBond)} ETH, have ${ethers.formatEther(balance)} ETH`
    )
  }

  const endpoint = process.env.SOLVER_ENDPOINT_URL || 'http://localhost:4800/api/auctions/solver/status'
  const tx = await registry.registerSolver(endpoint, { value: minBond })
  console.log(`registerSolver tx: ${tx.hash}`)
  const receipt = await tx.wait()
  console.log(`Registered in block ${receipt.blockNumber}`)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
