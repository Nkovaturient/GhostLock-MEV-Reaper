import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { baseSepolia, base } from 'wagmi/chains'
import { CONFIG } from './config'

export const wagmiConfig = getDefaultConfig({
  appName: CONFIG.APP.NAME,
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string,
  chains: [baseSepolia, base], // Support both networks
  ssr: false,
})