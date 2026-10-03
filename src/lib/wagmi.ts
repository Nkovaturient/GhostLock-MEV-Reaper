import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { arbitrum, arbitrumSepolia } from 'wagmi/chains'


const arbitrumRpcUrls = [
  'https://rpc.ankr.com/arbitrum',
  'https://arb1.arbitrum.io/rpc',
]


const arbitrumSepoliaRpcUrls = ['https://arbitrum-sepolia.publicnode.com']

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
})