import React from 'react'

export default function Footer() {
  return (
    <footer
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/35 bg-white/40 backdrop-blur-xl"
      role="contentinfo"
    >
      <div className="container mx-auto px-4 py-2.5">
        <p className="text-center text-[11px] text-muted-foreground">
          © 2026 HolmeSwap · MEV-Protected Swaps
        </p>
      </div>
    </footer>
  )
}
