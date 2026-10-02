import { useAccount } from 'wagmi'
import { CONFIG } from '../lib/config'

export const CHAIN_ID_TO_ADDRESS = {
  '421614': CONFIG.ARBITRUM_SEPOLIA.GHOST_LOCK_LIVENESS,
  '42161': CONFIG.ARBITRUM.GHOST_LOCK_LIVENESS,
} as const

export const CHAIN_ID_TO_EPOCH_RNG = {
  '421614': CONFIG.ARBITRUM_SEPOLIA.EPOCH_RNG,
  '42161': CONFIG.ARBITRUM.EPOCH_RNG,
} as const

export const CHAIN_ID_BLOCK_TIME = {
  '42161': 0.25,
  '421614': 0.25,
} as const

export const useNetworkConfig = () => {
  const { chainId } = useAccount()
  const availableChains = Object.keys(CHAIN_ID_TO_ADDRESS)

  if (chainId && !availableChains.includes(chainId.toString())) {
    console.warn(`Chain ${chainId} not supported. Available chains: ${availableChains.join(', ')}`)
  }

  const key = chainId?.toString() as keyof typeof CHAIN_ID_TO_ADDRESS | undefined

  return {
    CONTRACT_ADDRESS: key ? CHAIN_ID_TO_ADDRESS[key] : undefined,
    EPOCH_RNG_ADDRESS: key ? CHAIN_ID_TO_EPOCH_RNG[key] : undefined,
    secondsPerBlock: key ? CHAIN_ID_BLOCK_TIME[key as keyof typeof CHAIN_ID_BLOCK_TIME] : undefined,
    chainId: chainId?.toString(),
    isSupported: chainId ? availableChains.includes(chainId.toString()) : false,
  }
}
