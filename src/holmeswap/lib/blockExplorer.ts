/**
 * blockExplorer.ts
 * Chain-accurate explorer URLs for transaction and address lookups.
 */

import { SUPPORTED_CHAINS, type SupportedChainId } from '../contracts/config'

const EXPLORER_BASE_URLS: Record<SupportedChainId, { name: string; tx: string; address: string }> = {
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
}

export function getExplorerTxUrl(chainId: number, hash: `0x${string}`): string | null {
  const base = EXPLORER_BASE_URLS[chainId as SupportedChainId]?.tx
  if (!base) return null
  return `${base}/${hash}`
}

export function getExplorerAddressUrl(chainId: number, address: `0x${string}`): string | null {
  const base = EXPLORER_BASE_URLS[chainId as SupportedChainId]?.address
  if (!base) return null
  return `${base}/${address}`
}

export function getExplorerName(chainId: number): string | null {
  return EXPLORER_BASE_URLS[chainId as SupportedChainId]?.name ?? null
}
