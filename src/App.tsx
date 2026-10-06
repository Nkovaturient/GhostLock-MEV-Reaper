import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { wagmiConfig } from './lib/wagmi'
import { Toaster } from './components/ui/Toaster'
import Navbar from './components/layout/Navbar'
import '@rainbow-me/rainbowkit/styles.css'

const HomePage = lazy(() => import('./pages/HomePage'))
const TradePage = lazy(() => import('./pages/TradePage'))
const AuctionPage = lazy(() => import('./pages/AuctionPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const HolmeSwapPage = lazy(() => import('./holmeswap/HolmeSwapPage'))
const AdminExplorerPage = lazy(() => import('./pages/AdminExplorerPage'))
const RevenuePage = lazy(() => import('./pages/RevenuePage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
      retryDelay: 2_000,
    },
  },
})

function AppContent() {
  const location = useLocation()
  const isHolmeSwap = location.pathname === '/holmeswap'

  if (isHolmeSwap) {
    return (
      <Suspense fallback={null}>
        <HolmeSwapPage />
        <Toaster />
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ghost-900 via-ghost-800 to-ghost-900">
      <Navbar />
      <main className="relative">
        <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/trade" element={<TradePage />} />
          <Route path="/auctions" element={<AuctionPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/admin" element={<AdminExplorerPage />} />
          <Route path="/pricing" element={<RevenuePage />} />
        </Routes>
        </Suspense>
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