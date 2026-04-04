/**
 * blockExplorer.ts
 * Chain-accurate explorer URLs for transaction and address lookups.
 */

import { SUPPORTED_CHAINS, type SupportedChainId } from '../contracts/config'

const EXPLORER_BASE_URLS: Record<SupportedChainId, { name: string; tx: string; address: string }> = {
  [SUPPORTED_CHAINS.BASE_SEPOLIA]: {
    name: 'Base Sepolia Explorer',
    tx: 'https://sepolia.basescan.org/tx',
    address: 'https://sepolia.basescan.org/address',
  },
  [SUPPORTED_CHAINS.ARB_SEPOLIA]: {
    name: 'Arbitrum Sepolia Explorer',
    tx: 'https://sepolia.arbiscan.io/tx',
    address: 'https://sepolia.arbiscan.io/address',
  },
  [SUPPORTED_CHAINS.ARBITRUM_ONE]: {
    name: 'Arbiscan',
    tx: 'https://arbiscan.io/tx',
    address: 'https://arbiscan.io/address',
  },
  [SUPPORTED_CHAINS.BASE_MAINNET]: {
    name: 'Basescan',
    tx: 'https://basescan.org/tx',
    address: 'https://basescan.org/address',
  },
}

/**
 * Get the transaction URL for a given chainId and transaction hash.
 */
export function getExplorerTxUrl(chainId: number, hash: `0x${string}`): string | null {
  const base = EXPLORER_BASE_URLS[chainId as SupportedChainId]?.tx
  if (!base) return null
  return `${base}/${hash}`
}

/**
 * Get the address URL for a given chainId and address.
 */
export function getExplorerAddressUrl(chainId: number, address: `0x${string}`): string | null {
  const base = EXPLORER_BASE_URLS[chainId as SupportedChainId]?.address
  if (!base) return null
  return `${base}/${address}`
}

/**
 * Get explorer name for display purposes.
 */
export function getExplorerName(chainId: number): string | null {
  return EXPLORER_BASE_URLS[chainId as SupportedChainId]?.name ?? null
}
