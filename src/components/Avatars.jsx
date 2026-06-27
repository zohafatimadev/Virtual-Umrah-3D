import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

/*
 * Human avatars built from primitive meshes — no external models, so they
 * load instantly and run anywhere.
 *
 *  - Male hajji:   two-piece white ihram (izar + rida), one shoulder bare
 *  - Female hajji: full-length abaya + head covering (any modest colour)
 *  - Trainee:      brighter white + green halo ring + name tag handled by parent
 *
 * `gait` (0..1) drives a simple walk/ә run cycle; pass speed-scaled time.
 */

const SKIN = ['#caa284', '#b98c66', '#d8b48f', '#a9744f', '#e0c0a0']

/* -------------------------------------------------- male hajji (ihram) */
export function MaleAvatar({ skin = SKIN[0], cloth = '#f4f2ec', gaitRef, run = false, trainee = false }) {
  const arm = useRef()
  const legs = useRef()
  useFrame(() => {
    const g = gaitRef ? gaitRef.current : 0
    if (legs.current) {
      const amp = run ? 0.55 : 0.3
      legs.current.children[0].rotation.x = Math.sin(g) * amp
      legs.current.children[1].rotation.x = -Math.sin(g) * amp
    }
    if (arm.current) arm.current.rotation.x = -Math.sin(g) * (run ? 0.7 : 0.35)
  })
  const c = trainee ? '#e63946' : cloth
  return (
    <group>
      <group ref={legs}>
        <mesh position={[-0.12, 0.42, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.07, 0.84, 8]} />
          <meshStandardMaterial color={skin} roughness={0.85} />
        </mesh>
        <mesh position={[0.12, 0.42, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.07, 0.84, 8]} />
          <meshStandardMaterial color={skin} roughness={0.85} />
        </mesh>
      </group>
      {/* izar — lower wrap */}
      <mesh position={[0, 0.88, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.33, 0.82, 12]} />
        <meshStandardMaterial color={c} roughness={0.92} />
      </mesh>
      {/* rida — upper wrap, diagonal across chest (one shoulder bare) */}
      <mesh position={[0.03, 1.5, 0]} rotation={[0, 0, -0.18]} castShadow>
        <cylinderGeometry args={[0.25, 0.31, 0.66, 12]} />
        <meshStandardMaterial color={c} roughness={0.92} />
      </mesh>
      {/* bare left shoulder/arm */}
      <mesh position={[-0.32, 1.4, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.06, 0.055, 0.66, 8]} />
        <meshStandardMaterial color={skin} roughness={0.85} />
      </mesh>
      {/* right arm — animated + used for Istilam (named) */}
      <group name="rightArm" ref={arm} position={[0.32, 1.66, 0]}>
        <mesh position={[0.05, -0.28, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.06, 0.055, 0.66, 8]} />
          <meshStandardMaterial color={skin} roughness={0.85} />
        </mesh>
        <mesh position={[0.12, -0.58, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color={skin} roughness={0.85} />
        </mesh>
      </group>
      {/* head (no cap in ihram) */}
      <mesh position={[0, 2.0, 0]} castShadow>
        <sphereGeometry args={[0.17, 14, 14]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      {trainee && <Halo />}
    </group>
  )
}

/* ------------------------------------------------ female hajji (abaya) */
export function FemaleAvatar({ skin = SKIN[2], cloth = '#3a4150', gaitRef, trainee = false }) {
  const arm = useRef()
  useFrame(() => {
    const g = gaitRef ? gaitRef.current : 0
    if (arm.current) arm.current.rotation.x = -Math.sin(g) * 0.28
  })
  const c = trainee ? '#e63946' : cloth
  return (
    <group>
      {/* full-length abaya — cone skirt + torso */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <coneGeometry args={[0.42, 1.3, 16]} />
        <meshStandardMaterial color={c} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.45, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.3, 0.7, 12]} />
        <meshStandardMaterial color={c} roughness={0.9} />
      </mesh>
      {/* sleeves */}
      <mesh position={[-0.28, 1.45, 0]} rotation={[0, 0, 0.22]}>
        <cylinderGeometry args={[0.07, 0.06, 0.7, 8]} />
        <meshStandardMaterial color={c} roughness={0.9} />
      </mesh>
      <group name="rightArm" ref={arm} position={[0.28, 1.7, 0]}>
        <mesh position={[0.04, -0.3, 0]} rotation={[0, 0, -0.22]}>
          <cylinderGeometry args={[0.07, 0.06, 0.7, 8]} />
          <meshStandardMaterial color={c} roughness={0.9} />
        </mesh>
        <mesh position={[0.08, -0.62, 0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color={skin} roughness={0.85} />
        </mesh>
      </group>
      {/* head + hijab (covers hair, face visible) */}
      <mesh position={[0, 2.02, 0]} castShadow>
        <sphereGeometry args={[0.17, 14, 14]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.06, -0.02]} scale={[1.25, 1.3, 1.25]}>
        <sphereGeometry args={[0.17, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshStandardMaterial color={c} roughness={0.9} side={2} />
      </mesh>
      {trainee && <Halo />}
    </group>
  )
}

function Halo() {
  const ring = useRef()
  useFrame(({ clock }) => {
    if (ring.current) ring.current.material.opacity = 0.6 + Math.sin(clock.elapsedTime * 3) * 0.3
  })
  return (
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
      <ringGeometry args={[0.42, 0.6, 32]} />
      <meshBasicMaterial color="#ff3b46" transparent opacity={0.85} />
    </mesh>
  )
}

export { SKIN }
