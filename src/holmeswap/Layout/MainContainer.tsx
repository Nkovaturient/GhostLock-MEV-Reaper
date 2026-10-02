import React from 'react'

interface MainContainerProps {
  children: React.ReactNode
}

export default function MainContainer({ children }: MainContainerProps) {
  return (
    <main className="container mx-auto flex min-h-full w-full items-center justify-center px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex w-full justify-center py-1 sm:py-2">
        {children}
      </div>
    </main>
  )
}
