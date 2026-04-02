import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'

interface Scene3DProps {
  children: React.ReactNode
  className?: string
}

export default function Scene3D({ children, className = '' }: Scene3DProps) {
  return (
    <div className={`w-full h-full min-h-[120px] ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 2], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 2, 2]} intensity={1} />
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </Canvas>
    </div>
  )
}
