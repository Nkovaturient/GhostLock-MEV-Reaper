import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'

export default function LockIcon() {
  const ref = useRef<Group>(null)

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.2
    }
  })

  return (
    <group ref={ref} scale={0.5}>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.4, 0.3, 0.2]} />
        <meshStandardMaterial color="#A8D8EA" />
      </mesh>
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[0.5, 0.4, 0.3]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
    </group>
  )
}
