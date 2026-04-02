import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'

export default function GhostCharacter() {
  const ref = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.position.y += Math.sin(Date.now() * 0.001) * 0.002
    }
  })

  return (
    <mesh ref={ref} position={[0, 0, 0]}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial color="#A8D8EA" transparent opacity={0.9} />
    </mesh>
  )
}
