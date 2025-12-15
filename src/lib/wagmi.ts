import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { baseSepolia, arbitrum } from 'wagmi/chains'

const arbitrumRpcUrl = import.meta.env.VITE_ARBITRUM_ONE_RPC_URL

const arbitrumRpcUrls = arbitrumRpcUrl 
  ? [arbitrumRpcUrl] // If custom RPC is provided, use it
  : [
      'https://rpc.ankr.com/arbitrum', // Ankr public RPC (CORS-enabled)
      'https://arb1.arbitrum.io/rpc', // Fallback to official (may have CORS issues),
    ]

const arbitrumOne = {
  ...arbitrum,
  rpcUrls: {
    default: {
      http: arbitrumRpcUrls,
      webSocket: ['wss://arb1.arbitrum.io/ws'],
    },
  },
}

export const wagmiConfig = getDefaultConfig({
  appName: 'GhostLock: MEV Reaper',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string,
  chains: [baseSepolia, arbitrumOne],
  ssr: false,
})