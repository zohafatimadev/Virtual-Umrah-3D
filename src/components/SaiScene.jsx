import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Html } from '@react-three/drei'
import * as THREE from 'three'
import { MaleAvatar, FemaleAvatar, SKIN } from './Avatars'

/*
 * Sa'i corridor (Mas'a) — LONGER and DOUBLED (supervisor):
 *   - Safa hill at -X end, Marwah hill at +X end
 *   - TWO lanes: GO lane (Safa->Marwah, +Z side) and RETURN lane (-Z side)
 *   - trainee uses the lane matching current direction
 *   - longer green jog-zone band embedded in roof + floor
 *   - Safa and Marwah look clearly DIFFERENT so the trainee can tell them apart
 */
const LEN = 96            // longer corridor
const HALF = LEN / 2
const WIDTH = 22
const LANE = 5            // lane offset from centre
const tToX = (t) => -HALF + t * LEN

function Label({ position, children, gold, big }) {
  return (
    <Html position={position} center distanceFactor={big ? 60 : 48} zIndexRange={[10, 0]}>
      <div style={{
        padding: big ? '8px 18px' : '5px 12px', borderRadius: 9, whiteSpace: 'nowrap',
        fontSize: big ? 17 : 14, fontFamily: 'Outfit, sans-serif', fontWeight: 800,
        color: gold ? '#1a1407' : '#eef2f8',
        background: gold ? 'rgba(232,197,74,0.94)' : 'rgba(8,12,24,0.82)',
        border: `1px solid ${gold ? '#f3dd8a' : 'rgba(255,255,255,0.25)'}`,
        pointerEvents: 'none', textAlign: 'center',
      }}>{children}</div>
    </Html>
  )
}

/* Safa — GREEN-toned hill with a domed pavilion */
function Safa({ labelOn }) {
  return (
    <group position={[-HALF - 2, 0, 0]}>
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <sphereGeometry args={[6, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#7c8a5e" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[2, 0.8, 3]} castShadow><dodecahedronGeometry args={[2, 0]} /><meshStandardMaterial color="#8a9568" roughness={1} flatShading /></mesh>
      <mesh position={[-2.5, 0.7, -2]} castShadow><dodecahedronGeometry args={[1.6, 0]} /><meshStandardMaterial color="#6f7a52" roughness={1} flatShading /></mesh>
      <mesh position={[0, 0.2, 0]} receiveShadow><cylinderGeometry args={[9, 9, 0.4, 32]} /><meshStandardMaterial color="#e6ecda" roughness={0.4} /></mesh>
      {/* green dome pavilion = identity marker for Safa */}
      <mesh position={[0, 5.6, 0]}><sphereGeometry args={[2.2, 18, 14, 0, Math.PI*2, 0, Math.PI/2]} /><meshStandardMaterial color="#2f7d4e" metalness={0.4} roughness={0.4} /></mesh>
      <mesh position={[0, 7.9, 0]}><coneGeometry args={[0.3,0.8,8]} /><meshStandardMaterial color="#d4af37" metalness={1} roughness={0.2} /></mesh>
      <pointLight position={[0, 6, 0]} intensity={40} distance={20} color="#bfe8c0" decay={1.8} />
      {labelOn && <Label gold big position={[0, 10, 0]}>صَفَا · SAFA<br />(start here)</Label>}
    </group>
  )
}

/* Marwah — RED/CLAY-toned hill with an arched gateway */
function Marwah({ labelOn }) {
  return (
    <group position={[HALF + 2, 0, 0]}>
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <sphereGeometry args={[6, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#9a6b50" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[-2, 0.8, 3]} castShadow><dodecahedronGeometry args={[2, 0]} /><meshStandardMaterial color="#a8765a" roughness={1} flatShading /></mesh>
      <mesh position={[2.5, 0.7, -2]} castShadow><dodecahedronGeometry args={[1.6, 0]} /><meshStandardMaterial color="#875a42" roughness={1} flatShading /></mesh>
      <mesh position={[0, 0.2, 0]} receiveShadow><cylinderGeometry args={[9, 9, 0.4, 32]} /><meshStandardMaterial color="#f0e6da" roughness={0.4} /></mesh>
      {/* terracotta archway = identity marker for Marwah */}
      <mesh position={[0, 4.4, 0]}><torusGeometry args={[2.6, 0.45, 12, 24, Math.PI]} /><meshStandardMaterial color="#c66a3a" roughness={0.6} /></mesh>
      <mesh position={[-2.6, 2.2, 0]}><cylinderGeometry args={[0.45,0.45,4.4,12]} /><meshStandardMaterial color="#c66a3a" roughness={0.6} /></mesh>
      <mesh position={[2.6, 2.2, 0]}><cylinderGeometry args={[0.45,0.45,4.4,12]} /><meshStandardMaterial color="#c66a3a" roughness={0.6} /></mesh>
      <pointLight position={[0, 6, 0]} intensity={40} distance={20} color="#e8c4a8" decay={1.8} />
      {labelOn && <Label gold big position={[0, 10, 0]}>مَرْوَة · MARWAH<br />(turn point)</Label>}
    </group>
  )
}

/* corridor with two lanes, roof, longer green zone */
function Corridor({ greenFrom, greenTo, labelOn }) {
  const gxFrom = tToX(greenFrom)
  const gxTo = tToX(greenTo)
  const strip = useRef()
  useFrame(({ clock }) => {
    if (strip.current) strip.current.material.opacity = 0.5 + Math.sin(clock.elapsedTime * 3) * 0.28
  })
  const pillars = useMemo(() => {
    const a = []
    for (let x = -HALF + 5; x <= HALF - 5; x += 8) a.push(x)
    return a
  }, [])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[LEN + 24, WIDTH]} />
        <meshStandardMaterial color="#ece9e2" roughness={0.35} metalness={0.05} />
      </mesh>

      {/* central divider separating GO and RETURN lanes */}
      <mesh position={[0, 0.08, 0]}><boxGeometry args={[LEN, 0.5, 0.5]} /><meshStandardMaterial color="#cbbf9c" roughness={0.6} /></mesh>
      {/* lane direction arrows */}
      {labelOn && (<>
        <Label position={[0, 1.2, LANE]}>GO lane → Marwah</Label>
        <Label position={[0, 1.2, -LANE]}>← RETURN lane → Safa</Label>
      </>)}

      {/* side walls */}
      {[-WIDTH / 2, WIDTH / 2].map((z, i) => (
        <mesh key={i} position={[0, 6, z]} receiveShadow><boxGeometry args={[LEN + 24, 12, 0.6]} /><meshStandardMaterial color="#efe9da" roughness={0.6} /></mesh>
      ))}

      {pillars.map((x, i) => (
        <group key={i}>
          <mesh position={[x, 6, -WIDTH / 2 + 0.7]} castShadow><boxGeometry args={[0.9, 12, 0.9]} /><meshStandardMaterial color="#e3ddd0" roughness={0.5} /></mesh>
          <mesh position={[x, 6, WIDTH / 2 - 0.7]} castShadow><boxGeometry args={[0.9, 12, 0.9]} /><meshStandardMaterial color="#e3ddd0" roughness={0.5} /></mesh>
        </group>
      ))}

      <mesh position={[0, 12.3, 0]} receiveShadow><boxGeometry args={[LEN + 24, 0.5, WIDTH]} /><meshStandardMaterial color="#d8d2c4" roughness={0.7} /></mesh>
      {pillars.map((x, i) => <pointLight key={i} position={[x, 11, 0]} intensity={45} distance={18} color="#fff0cf" decay={1.8} />)}

      {/* longer green zone — roof bars at both ends + glowing floor band */}
      {[gxFrom, gxTo].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 11.9, 0]}><boxGeometry args={[0.6, 0.8, WIDTH - 2]} /><meshBasicMaterial color="#22e06c" /></mesh>
          <pointLight position={[x, 10, 0]} color="#2bff7f" intensity={130} distance={22} decay={1.8} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.07, 0]}><planeGeometry args={[0.6, WIDTH - 2]} /><meshBasicMaterial color="#2bff7f" /></mesh>
        </group>
      ))}
      <mesh ref={strip} rotation={[-Math.PI / 2, 0, 0]} position={[(gxFrom + gxTo) / 2, 0.05, 0]}>
        <planeGeometry args={[gxTo - gxFrom, WIDTH - 2]} />
        <meshBasicMaterial color="#2bff7f" transparent opacity={0.45} />
      </mesh>
      {labelOn && <Label position={[(gxFrom + gxTo) / 2, 7.5, 0]}>GREEN ZONE — men jog here (Ramal)</Label>}
    </group>
  )
}

function SaiCrowd({ count = 46 }) {
  const refs = useRef([])
  const seeds = useMemo(() =>
    Array.from({ length: count }, () => {
      const dir = Math.random() > 0.5 ? 1 : -1
      return {
        t: Math.random(), dir,
        lane: dir > 0 ? LANE + (Math.random()-0.5)*5 : -LANE + (Math.random()-0.5)*5,
        speed: 0.04 + Math.random() * 0.05,
        female: Math.random() > 0.5,
        skin: SKIN[Math.floor(Math.random() * SKIN.length)],
        cloth: Math.random() > 0.5 ? '#2f3645' : '#46506a',
        gait: { current: Math.random() * 6 },
      }
    }), [count])

  useFrame((_, dt) => {
    seeds.forEach((s, i) => {
      s.t += s.speed * dt * s.dir
      if (s.t > 1) { s.t = 1; s.dir = -1; s.lane = -LANE + (Math.random()-0.5)*5 }
      if (s.t < 0) { s.t = 0; s.dir = 1; s.lane = LANE + (Math.random()-0.5)*5 }
      s.gait.current += dt * 7
      const g = refs.current[i]
      if (g) { g.position.set(tToX(s.t), 0, s.lane); g.rotation.y = s.dir > 0 ? Math.PI / 2 : -Math.PI / 2 }
    })
  })

  return (
    <group>
      {seeds.map((s, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)} scale={0.9}>
          {s.female ? <FemaleAvatar skin={s.skin} cloth={s.cloth} gaitRef={s.gait} /> : <MaleAvatar skin={s.skin} gaitRef={s.gait} />}
        </group>
      ))}
    </group>
  )
}

/* trainee — PROMINENT: larger, spotlit, floating beacon + name tag */
function SaiTrainee({ umrah }) {
  const { saiTRef, saiDirRef, gaitRef, gender } = umrah
  const g = useRef()
  const beacon = useRef()
  useFrame(({ clock }) => {
    if (!g.current) return
    const lane = saiDirRef.current > 0 ? LANE : -LANE
    g.current.position.set(tToX(saiTRef.current), 0, lane)
    g.current.rotation.y = saiDirRef.current > 0 ? Math.PI / 2 : -Math.PI / 2
    if (beacon.current) beacon.current.material.opacity = 0.4 + Math.sin(clock.elapsedTime * 4) * 0.25
  })
  return (
    <group ref={g}>
      <group scale={1.25}>
        {gender === 'female' ? <FemaleAvatar gaitRef={gaitRef} trainee /> : <MaleAvatar gaitRef={gaitRef} run={umrah.speedPct > 120} trainee />}
      </group>
      {/* floating beacon above the trainee */}
      <mesh ref={beacon} position={[0, 4.2, 0]}><sphereGeometry args={[0.5, 16, 16]} /><meshBasicMaterial color="#ff3b46" transparent opacity={0.5} /></mesh>
      <mesh position={[0, 3.4, 0]}><coneGeometry args={[0.45, 0.9, 4]} /><meshBasicMaterial color="#ff3b46" /></mesh>
      <pointLight position={[0, 5, 0]} color="#ff3b46" intensity={30} distance={10} decay={1.6} />
    </group>
  )
}

function Driver({ tick }) { useFrame((_, dt) => tick(Math.min(dt, 0.05))); return null }

/* follow-camera — ALWAYS tracks the trainee avatar in Sa'i from a high,
   clear angle, so the trainee can always see the avatar reach Safa and
   Marwah and know exactly when to stop. */
function FollowCam({ umrah, enabled }) {
  const { saiTRef, saiDirRef } = umrah
  const target = useRef(new THREE.Vector3())
  const desired = useRef(new THREE.Vector3())
  useFrame(({ camera }, dt) => {
    if (!enabled) return
    const lane = saiDirRef.current > 0 ? LANE : -LANE
    const ax = tToX(saiTRef.current)
    // look at the avatar
    target.current.lerp(new THREE.Vector3(ax, 3.0, lane), Math.min(1, dt * 5))
    // camera sits HIGH and to the side, slightly behind the direction of
    // travel — high enough to clear the green-zone bars and the hills so the
    // avatar is never hidden. Position is offset along Z so we see the lane.
    const behind = saiDirRef.current > 0 ? -14 : 14
    desired.current.set(ax + behind, 22, lane + 26)
    camera.position.lerp(desired.current, Math.min(1, dt * 3))
    camera.lookAt(target.current)
  })
  return null
}

/* small overhead mini-view is not needed — the main follow-cam handles it. */

export default function SaiScene({ umrah, showLabels, follow }) {
  return (
    <Canvas shadows camera={{ position: [-HALF, 26, 42], fov: 52, near: 0.5, far: 500 }}
      gl={{ antialias: true }} style={{ position: 'absolute', inset: 0 }}>
      <color attach="background" args={['#070b14']} />
      <fog attach="fog" args={['#070b14', 90, 220]} />
      <Stars radius={220} depth={50} count={2500} factor={4} fade speed={0.5} />
      <ambientLight intensity={0.4} color="#bcc7e6" />
      <hemisphereLight args={['#2c3a5c', '#0c0f16', 0.5]} />
      <directionalLight position={[20, 55, 25]} intensity={1.1} color="#fff2da" castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-left={-70} shadow-camera-right={70} shadow-camera-top={50} shadow-camera-bottom={-50} />

      <Corridor greenFrom={umrah.greenFrom} greenTo={umrah.greenTo} labelOn={showLabels} />
      <Safa labelOn={showLabels} />
      <Marwah labelOn={showLabels} />
      <SaiCrowd />
      <SaiTrainee umrah={umrah} />
      <Driver tick={umrah.tickSai} />
      {/* follow-cam is ON by default in Sa'i (unless the trainee turns on
          manual cinematic orbit) so the avatar is always visible */}
      <FollowCam umrah={umrah} enabled={!follow} />

      {follow && (
        <OrbitControls target={[0, 5, 0]} maxPolarAngle={Math.PI / 2.05} minDistance={14} maxDistance={170} enablePan={false} />
      )}
    </Canvas>
  )
}
