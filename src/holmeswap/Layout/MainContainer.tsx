import React from 'react'

interface MainContainerProps {
  left: React.ReactNode
  right: React.ReactNode
  bottom: React.ReactNode
}

export default function MainContainer({ left, right, bottom }: MainContainerProps) {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,1.1fr] gap-6 lg:gap-8 max-w-6xl mx-auto">
        {/* Left column - Swap card */}
        <div className="flex flex-col gap-6">
          {left}
          
          {/* Bottom status cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bottom}
          </div>
        </div>

        {/* Right column - Timeline */}
        <div className="lg:pl-4">
          {right}
        </div>
      </div>
    </main>
  )
}
