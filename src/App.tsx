import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
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
import '@rainbow-me/rainbowkit/styles.css'
import RevenuePage from './pages/RevenuePage'
import React from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <Router>
            <div className="min-h-screen bg-gradient-to-br from-ghost-900 via-ghost-800 to-ghost-900">
              <Navbar />
              <main className="relative">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/trade" element={<TradePage />} />
                  <Route path="/auctions" element={<AuctionPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/pricing" element={<RevenuePage />} />
                </Routes>
              </main>
              <Toaster />
            </div>
          </Router>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App