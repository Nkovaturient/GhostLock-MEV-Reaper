import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { baseSepolia } from 'wagmi/chains'

export const wagmiConfig = getDefaultConfig({
  appName: 'GhostLock: MEV Reaper',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string,
  chains: [baseSepolia],
  ssr: false,
})