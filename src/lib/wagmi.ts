import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { baseSepolia, base } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'GhostLock: MEV Reaper',
  projectId: process.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: [baseSepolia, base],
  ssr: false,
})