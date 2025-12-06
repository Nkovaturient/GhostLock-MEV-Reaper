import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { baseSepolia, base, arbitrum, arbitrumSepolia } from 'wagmi/chains'
import { NETWORKS, CONFIG } from './config'

const arbitrumOne = {
  ...arbitrum,
  rpcUrls: {
    default: {
      http: [NETWORKS.ARBITRUM_ONE.rpcUrl],
      webSocket: ['wss://arb1.arbitrum.io/ws'],
    },
  },
}

export const wagmiConfig = getDefaultConfig({
  appName: CONFIG.APP.NAME,
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string,
  chains: [baseSepolia, base, arbitrumOne, arbitrumSepolia],
  ssr: false,
})