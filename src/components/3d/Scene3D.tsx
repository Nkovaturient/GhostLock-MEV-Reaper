import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { FloatingCube } from './FloatingCube'
import { ParticleField } from './ParticleField'

interface Scene3DProps {
  className?: string
}

export function Scene3D({ className }: Scene3DProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          
          <ParticleField />
          
          <FloatingCube position={[-3, 0, 0]} color="#0ea5e9" speed={0.8} />
          <FloatingCube position={[3, 0, 0]} color="#3b82f6" speed={1.2} />
          <FloatingCube position={[0, 3, 0]} color="#6366f1" speed={1.0} />
          
          <Environment preset="night" />
          <OrbitControls enableZoom={false} enablePan={false} />
        </Suspense>
      </Canvas>
    </div>
  )
}