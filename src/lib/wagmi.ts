import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { fallback, http } from 'viem'
import { arbitrum, arbitrumSepolia } from 'wagmi/chains'

const rpcHttp = (url: string) =>
  http(url, { retryCount: 1, retryDelay: 2_000, timeout: 10_000 })

const arbitrumRpcUrls = [
  'https://arb1.arbitrum.io/rpc',
  'https://rpc.ankr.com/arbitrum',
]

const arbitrumSepoliaRpcUrls = [
  'https://sepolia-rollup.arbitrum.io/rpc',
  'https://arbitrum-sepolia.publicnode.com',
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
      webSocket: [],
    },
  },
}

export const wagmiConfig = getDefaultConfig({
  appName: 'GhostLock: MEV Reaper',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string,
  chains: [arbitrumSepoliaChain, arbitrumOne],
  ssr: false,
  pollingInterval: 12_000,
  transports: {
    [arbitrumSepolia.id]: fallback(arbitrumSepoliaRpcUrls.map(rpcHttp), { rank: false }),
    [arbitrum.id]: fallback(arbitrumRpcUrls.map(rpcHttp), { rank: false }),
  },
})