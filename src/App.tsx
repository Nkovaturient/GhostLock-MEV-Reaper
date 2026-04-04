import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { wagmiConfig } from './lib/wagmi'
import { Toaster } from './components/ui/Toaster'
import Navbar from './components/layout/Navbar'
import HomePage from './pages/HomePage'
import TradePage from './pages/TradePage'
import AuctionPage from './pages/AuctionPage'
import AnalyticsPage from './pages/AnalyticsPage'
import HolmeSwapPage from './holmeswap/HolmeSwapPage'
import AdminExplorerPage from './pages/AdminExplorerPage'
import '@rainbow-me/rainbowkit/styles.css'
import RevenuePage from './pages/RevenuePage'
import { useAutoEpochSeedRequest } from './hooks/useAutoEpochSeedRequest'
import React from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

function AppContent() {
  useAutoEpochSeedRequest()
  const location = useLocation()
  const isHolmeSwap = location.pathname === '/holmeswap'

  if (isHolmeSwap) {
    return (
      <>
        <HolmeSwapPage />
        <Toaster />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ghost-900 via-ghost-800 to-ghost-900">
      <Navbar />
      <main className="relative">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/trade" element={<TradePage />} />
          <Route path="/auctions" element={<AuctionPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/admin" element={<AdminExplorerPage />} />
          <Route path="/pricing" element={<RevenuePage />} />
        </Routes>
      </main>
      <Toaster />
    </div>
  )
}

function AppRouter() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <AppRouter />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App