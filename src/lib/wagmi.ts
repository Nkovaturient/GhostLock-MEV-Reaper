import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { baseSepolia, base, arbitrum, arbitrumSepolia } from 'wagmi/chains'

const arbitrumRpcUrl = import.meta.env.VITE_ARBITRUM_ONE_RPC_URL
const arbitrumSepoliaRpcUrl = import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL
const baseMainnetRpcUrl = import.meta.env.VITE_BASE_MAINNET_RPC_URL

const arbitrumRpcUrls = arbitrumRpcUrl 
  ? [arbitrumRpcUrl]
  : [
      'https://rpc.ankr.com/arbitrum',
      'https://arb1.arbitrum.io/rpc',
    ]

const arbitrumSepoliaRpcUrls = arbitrumSepoliaRpcUrl
  ? [arbitrumSepoliaRpcUrl]
  : [
      'https://sepolia-rollup.arbitrum.io/rpc',
      'https://rpc.ankr.com/arbitrum_sepolia',
    ]

const baseMainnetRpcUrls = baseMainnetRpcUrl
  ? [baseMainnetRpcUrl]
  : [
      'https://mainnet.base.org',
      'https://base-rpc.publicnode.com',
    ]

const arbitrumOne = {
  ...arbitrum,
  rpcUrls: {
    default: {
      http: arbitrumRpcUrls,
      webSocket: ['wss://arb1.arbitrum.io/ws'],
    },
  },
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
}

const arbitrumSepoliaChain = {
  ...arbitrumSepolia,
  rpcUrls: {
    default: {
      http: arbitrumSepoliaRpcUrls,
      webSocket: ['wss://sepolia-rollup.arbitrum.io/ws'],
    },
  },
}

const baseMainnet = {
  ...base,
  rpcUrls: {
    default: {
      http: baseMainnetRpcUrls,
      webSocket: ['wss://mainnet.base.org'],
    },
  },
}

export const wagmiConfig = getDefaultConfig({
  appName: 'GhostLock: MEV Reaper',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string,
  chains: [baseSepolia, baseMainnet, arbitrumOne, arbitrumSepoliaChain],
  ssr: false,
})