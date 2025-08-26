import React from 'react'
import { motion } from 'framer-motion'
import AuctionExplorer from '@/components/auctions/AuctionExplorer'

export default function AuctionPage() {
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Auction Explorer
          </h1>
          <p className="text-ghost-300 text-lg">
            Monitor batch auctions and settlement data in real-time
          </p>
        </motion.div>

        <AuctionExplorer />
      </div>
    </div>
  )
}