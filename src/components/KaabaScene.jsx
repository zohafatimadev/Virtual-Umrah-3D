import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Html } from '@react-three/drei'
import * as THREE from 'three'
import { MaleAvatar, FemaleAvatar, SKIN } from './Avatars'

/* ============================================================ constants
 *
 * REAL GEOMETRY OF THE KAABA (matching Masjid al-Haram):
 * The four CORNERS point to the compass directions. Tawaf is anti-clockwise,
 * so starting from Hajar al-Aswad (east corner) the pilgrim passes, in order:
 *
 *   Hajar al-Aswad ─▶ Multazam ─▶ DOOR ─▶ Iraqi corner ─▶ HATEEM (Hijr
 *   Ismail, under the Mizab) ─▶ Shami corner ─▶ Yamani corner ─▶ back to
 *   Hajar al-Aswad.
 *
 * Local Kaaba space (before rotation):
 *   +X wall  = door wall (Aswad → Iraqi)         ── passed FIRST
 *   -Z wall  = Hateem wall (Iraqi → Shami)
 *   -X wall  = Shami → Yamani
 *   +Z wall  = Yamani → Aswad                    ── passed LAST
 * The body is rotated by KAABA_ROT so the local (+X,+Z) corner — Hajar
 * al-Aswad — lands EXACTLY on the world +X axis (θ = 0), in line with the
 * green light and the start line.
 */
const PILGRIM_RADIUS = 15
const KAABA_W = 12 // x
const KAABA_D = 14 // z
const KAABA_H = 13.5
const CORNER_DIST = Math.sqrt((KAABA_W / 2) ** 2 + (KAABA_D / 2) ** 2) // 9.22
const KAABA_ROT = Math.atan2(KAABA_D / 2, KAABA_W / 2) // puts Aswad corner at θ=0

const angleToPos = (theta, r) => [r * Math.cos(theta), 0, -r * Math.sin(theta)]

/* ====================================================== kiswah textures */
function useKiswahTextures() {
  return useMemo(() => {
    // --- black kiswah cloth with subtle woven vertical sheen
    const cloth = document.createElement('canvas')
    cloth.width = 512
    cloth.height = 512
    let ctx = cloth.getContext('2d')
    ctx.fillStyle = '#0a0a0c'
    ctx.fillRect(0, 0, 512, 512)
    for (let x = 0; x < 512; x += 8) {
      ctx.fillStyle = x % 16 === 0 ? 'rgba(255,255,255,0.030)' : 'rgba(0,0,0,0.25)'
      ctx.fillRect(x, 0, 3, 512)
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.018)'
    ctx.lineWidth = 1
    for (let i = -512; i < 512; i += 24) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i + 512, 512)
      ctx.stroke()
    }
    const clothTex = new THREE.CanvasTexture(cloth)
    clothTex.wrapS = clothTex.wrapT = THREE.RepeatWrapping
    clothTex.repeat.set(3, 2)

    // --- gold hizam (belt) with Arabic calligraphy
    const belt = document.createElement('canvas')
    belt.width = 2048
    belt.height = 256
    ctx = belt.getContext('2d')
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, '#060607')
    g.addColorStop(0.5, '#101012')
    g.addColorStop(1, '#060607')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 2048, 256)
    ctx.fillStyle = '#c9a227'
    ctx.fillRect(0, 10, 2048, 7)
    ctx.fillRect(0, 239, 2048, 7)
    ctx.fillStyle = '#8a6d1d'
    ctx.fillRect(0, 22, 2048, 2)
    ctx.fillRect(0, 232, 2048, 2)
    ctx.fillStyle = '#e8c54a'
    ctx.shadowColor = '#a37c14'
    ctx.shadowBlur = 6
    ctx.font = 'bold 96px "Amiri", "Traditional Arabic", serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.direction = 'rtl'
    ctx.fillText('لَا إِلَٰهَ إِلَّا اللَّهُ مُحَمَّدٌ رَسُولُ اللَّهِ', 1024, 128)
    ctx.shadowBlur = 0
    for (const x of [80, 1968]) {
      ctx.beginPath()
      ctx.arc(x, 128, 38, 0, Math.PI * 2)
      ctx.strokeStyle = '#e8c54a'
      ctx.lineWidth = 5
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x, 128, 24, 0, Math.PI * 2)
      ctx.stroke()
    }
    const beltTex = new THREE.CanvasTexture(belt)
    beltTex.wrapS = THREE.RepeatWrapping
    beltTex.colorSpace = THREE.SRGBColorSpace

    // --- sitara (door curtain)
    const sitara = document.createElement('canvas')
    sitara.width = 256
    sitara.height = 512
    ctx = sitara.getContext('2d')
    ctx.fillStyle = '#0b0b0d'
    ctx.fillRect(0, 0, 256, 512)
    ctx.strokeStyle = '#d4af37'
    ctx.lineWidth = 4
    ctx.strokeRect(14, 14, 228, 484)
    ctx.lineWidth = 2
    ctx.strokeRect(26, 26, 204, 460)
    ctx.fillStyle = '#d4af37'
    ctx.font = 'bold 44px "Amiri", serif'
    ctx.textAlign = 'center'
    ctx.direction = 'rtl'
    ctx.fillText('بِسْمِ اللَّهِ', 128, 110)
    ctx.fillText('الرَّحْمَٰنِ', 128, 190)
    ctx.fillText('الرَّحِيمِ', 128, 270)
    for (let y = 330; y < 480; y += 36) {
      ctx.beginPath()
      ctx.arc(128, y, 12, 0, Math.PI * 2)
      ctx.stroke()
    }
    const sitaraTex = new THREE.CanvasTexture(sitara)
    sitaraTex.colorSpace = THREE.SRGBColorSpace

    return { clothTex, beltTex, sitaraTex }
  }, [])
}

/* ========================================================== label chip */
function Label({ position, children, gold = false }) {
  return (
    <Html position={position} center distanceFactor={42} zIndexRange={[10, 0]}>
      <div
        style={{
          padding: '4px 10px',
          borderRadius: 8,
          whiteSpace: 'nowrap',
          fontSize: 13,
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 600,
          color: gold ? '#1a1407' : '#eef2f8',
          background: gold ? 'rgba(232,197,74,0.92)' : 'rgba(8,12,24,0.82)',
          border: `1px solid ${gold ? '#f3dd8a' : 'rgba(255,255,255,0.25)'}`,
          pointerEvents: 'none',
          textAlign: 'center',
          lineHeight: 1.3,
        }}
      >
        {children}
      </div>
    </Html>
  )
}

/* ============================================== Kaaba + attached sites
 * Everything that belongs to the Kaaba (door, Black Stone, Hateem, Mizab,
 * Maqam Ibrahim) lives INSIDE this rotated group, in local coordinates,
 * so all real-world relationships are preserved exactly.
 */
function KaabaComplex({ showLabels }) {
  const { clothTex, beltTex, sitaraTex } = useKiswahTextures()
  const glow = useRef()
  useFrame(({ clock }) => {
    if (glow.current) glow.current.intensity = 45 + Math.sin(clock.elapsedTime * 3) * 20
  })

  // Hateem: semicircular wall attached to the local -Z wall (Iraqi → Shami)
  const hateem = useMemo(() => {
    const items = []
    const n = 22
    const R = 6.4
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI // 0..π, bulging toward local -Z
      items.push({
        pos: [R * Math.cos(a), 0.65, -KAABA_D / 2 - R * Math.sin(a)],
        rotY: -a,
      })
    }
    return items
  }, [])

  return (
    <group rotation={[0, KAABA_ROT, 0]}>
      {/* ------------------------------------------------ main body */}
      <mesh position={[0, KAABA_H / 2 + 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[KAABA_W, KAABA_H, KAABA_D]} />
        <meshStandardMaterial map={clothTex} color="#141416" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* hizam — golden calligraphy belt on all four walls */}
      {[
        { pos: [0, 0, KAABA_D / 2 + 0.06], rot: [0, 0, 0], w: KAABA_W },
        { pos: [0, 0, -KAABA_D / 2 - 0.06], rot: [0, Math.PI, 0], w: KAABA_W },
        { pos: [KAABA_W / 2 + 0.06, 0, 0], rot: [0, Math.PI / 2, 0], w: KAABA_D },
        { pos: [-KAABA_W / 2 - 0.06, 0, 0], rot: [0, -Math.PI / 2, 0], w: KAABA_D },
      ].map((f, i) => (
        <mesh key={i} position={[f.pos[0], KAABA_H * 0.78, f.pos[2]]} rotation={f.rot}>
          <planeGeometry args={[f.w, 1.9]} />
          <meshStandardMaterial map={beltTex} emissive="#5a4410" emissiveIntensity={0.55} roughness={0.4} metalness={0.6} />
        </mesh>
      ))}

      {/* shadharwan — sloped marble base */}
      <mesh position={[0, 0.3, 0]} receiveShadow>
        <boxGeometry args={[KAABA_W + 1.1, 0.6, KAABA_D + 1.1]} />
        <meshStandardMaterial color="#cfd2d6" roughness={0.35} metalness={0.1} />
      </mesh>

      {/* ----------------------- DOOR (Bab al-Kaaba) — local +X wall,
           close to the Aswad corner, raised ~2.2 m. The strip of wall
           between the door and the Black Stone is the MULTAZAM. */}
      <group position={[KAABA_W / 2 + 0.12, 0, KAABA_D / 2 - 4.0]}>
        <mesh position={[0, 3.9, 0]} castShadow>
          <boxGeometry args={[0.24, 3.6, 2.3]} />
          <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.25} emissive="#3a2c05" />
        </mesh>
        {[-0.58, 0.58].map((z, i) => (
          <mesh key={i} position={[0.14, 3.9, z]}>
            <boxGeometry args={[0.06, 3.3, 0.98]} />
            <meshStandardMaterial color="#e8c54a" metalness={1} roughness={0.18} emissive="#403008" />
          </mesh>
        ))}
        {/* sitara curtain above the door */}
        <mesh position={[0.07, 7.0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[3.2, 2.4]} />
          <meshStandardMaterial map={sitaraTex} roughness={0.6} />
        </mesh>
        <pointLight position={[2.6, 4.2, 0]} intensity={60} distance={12} color="#ffd87a" decay={1.8} />
      </group>

      {/* ----------------------- HAJAR AL-ASWAD — the local (+X,+Z) corner,
           which the rotation places exactly at world θ = 0 */}
      <group position={[KAABA_W / 2 + 0.08, 1.6, KAABA_D / 2 + 0.08]} rotation={[0, Math.PI / 4, 0]}>
        <mesh>
          <torusGeometry args={[0.5, 0.15, 16, 32]} />
          <meshStandardMaterial color="#dfe3e8" metalness={1} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0, -0.04]}>
          <sphereGeometry args={[0.37, 24, 24]} />
          <meshStandardMaterial color="#050505" roughness={0.3} metalness={0.4} />
        </mesh>
        <pointLight ref={glow} color="#9fe8b0" distance={12} intensity={45} decay={1.8} position={[0, 0, 1.2]} />
      </group>

      {/* ----------------------- AL-MIZAB (golden rain spout) — top of the
           Hateem wall, pouring into the Hijr */}
      <mesh position={[0, KAABA_H + 0.15, -KAABA_D / 2 - 0.8]} castShadow>
        <boxGeometry args={[0.55, 0.4, 1.9]} />
        <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.25} emissive="#3a2c05" />
      </mesh>

      {/* ----------------------- HATEEM (Hijr Ismail) — semicircle on the
           local -Z wall, between the Iraqi and Shami corners */}
      {hateem.map((seg, i) => (
        <mesh key={i} position={seg.pos} rotation={[0, seg.rotY, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.15, 1.3, 1.0]} />
          <meshStandardMaterial color="#9a9da1" roughness={0.25} metalness={0.05} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -KAABA_D / 2 - 0.2]}>
        <circleGeometry args={[5.9, 48]} />
        <meshStandardMaterial color="#b8bbbf" roughness={0.18} metalness={0.1} />
      </mesh>
      {[0.5, Math.PI / 2, Math.PI - 0.5].map((a, i) => (
        <pointLight
          key={i}
          position={[5.2 * Math.cos(a), 2.2, -KAABA_D / 2 - 5.2 * Math.sin(a)]}
          intensity={20}
          distance={10}
          color="#fff3d6"
          decay={1.8}
        />
      ))}

      {/* ----------------------- MAQAM IBRAHIM — in front of the door */}
      <group position={[13.5, 0, KAABA_D / 2 - 4.0]}>
        <mesh position={[0, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.9, 1.0, 2.2, 8]} />
          <meshPhysicalMaterial color="#b8860b" metalness={0.9} roughness={0.2} transparent opacity={0.92} />
        </mesh>
        <mesh position={[0, 2.6, 0]} castShadow>
          <sphereGeometry args={[0.95, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.2} />
        </mesh>
        <mesh position={[0, 3.7, 0]}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshStandardMaterial color="#ffe9a0" emissive="#c9a227" emissiveIntensity={1} />
        </mesh>
        <pointLight position={[0, 2, 0]} intensity={30} distance={10} color="#ffe7b0" decay={1.8} />
      </group>

      {/* ----------------------- landmark labels (from the reference diagram) */}
      {showLabels && (
        <>
          <Label gold position={[KAABA_W / 2 + 1.2, 3.6, KAABA_D / 2 + 1.2]}>
            Hajar al-Aswad<br />(Black Stone)
          </Label>
          <Label gold position={[KAABA_W / 2 + 1.4, 6.5, KAABA_D / 2 - 4.0]}>
            Door of the Kaaba
          </Label>
          <Label position={[KAABA_W / 2 + 1.0, 1.8, KAABA_D / 2 - 1.8]}>
            Multazam
          </Label>
          <Label position={[KAABA_W / 2 + 1.0, 2.0, -KAABA_D / 2 - 1.0]}>
            Iraqi Corner
          </Label>
          <Label position={[0, 3.2, -KAABA_D / 2 - 7.5]}>
            Hijr Ism'il<br />(Al-Hateem)
          </Label>
          <Label position={[0, KAABA_H + 2.0, -KAABA_D / 2 - 1.2]}>
            Al-Mizab
          </Label>
          <Label position={[-KAABA_W / 2 - 1.2, 2.0, -KAABA_D / 2 - 1.0]}>
            Shami Corner
          </Label>
          <Label position={[-KAABA_W / 2 - 1.2, 2.0, KAABA_D / 2 + 1.0]}>
            Yamani Corner
          </Label>
          <Label position={[0, 8.5, KAABA_D / 2 + 1.5]}>
            Kiswah Cloth
          </Label>
          <Label gold position={[13.5, 5.2, KAABA_D / 2 - 4.0]}>
            Maqam Ibrahim
          </Label>
        </>
      )}
    </group>
  )
}

/* ============================================================= Mataf */
function Mataf() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 512
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#e8eaec'
    ctx.fillRect(0, 0, 512, 512)
    ctx.strokeStyle = 'rgba(120,125,135,0.35)'
    ctx.lineWidth = 2
    for (let i = 0; i <= 512; i += 64) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(150,155,165,0.18)'
    for (let i = 0; i < 30; i++) {
      ctx.beginPath()
      ctx.moveTo(Math.random() * 512, Math.random() * 512)
      ctx.bezierCurveTo(Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512)
      ctx.stroke()
    }
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(14, 14)
    return t
  }, [])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[64, 96]} />
        <meshStandardMaterial map={tex} color="#f2f3f5" roughness={0.32} metalness={0.05} />
      </mesh>
      {/* the start line: from Hajar al-Aswad straight out to the green light */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(CORNER_DIST + 64) / 2, 0.02, 0]}>
        <planeGeometry args={[64 - CORNER_DIST, 0.5]} />
        <meshStandardMaterial color="#6b4a2b" roughness={0.7} />
      </mesh>
      {/* tawaf guide rings — outside the Hateem so paths never cross it */}
      {[16, 24, 32].map((r) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <ringGeometry args={[r - 0.06, r + 0.06, 128]} />
          <meshBasicMaterial color="#b9bec6" transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  )
}

/* ================================== surrounding Masjid al-Haram arcade */
function Colonnade() {
  const arches = useMemo(() => {
    const items = []
    const R = 68
    const n = 44
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      items.push({ a, pos: [R * Math.cos(a), 0, -R * Math.sin(a)] })
    }
    return items
  }, [])

  return (
    <group>
      {arches.map(({ a, pos }, i) => (
        <group key={i} position={pos} rotation={[0, a, 0]}>
          <mesh position={[0, 5.5, 0]} castShadow>
            <cylinderGeometry args={[0.7, 0.85, 11, 10]} />
            <meshStandardMaterial color="#e3ddd0" roughness={0.5} />
          </mesh>
          <mesh position={[0, 11.4, 0]}>
            <boxGeometry args={[2.2, 0.9, 2.2]} />
            <meshStandardMaterial color="#d8d2c4" roughness={0.5} />
          </mesh>
        </group>
      ))}
      {[13.4, 19.2].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <cylinderGeometry args={[70.5, 70.5, i === 0 ? 3.4 : 4.2, 96, 1, true]} />
          <meshStandardMaterial color={i === 0 ? '#efe9da' : '#e6dfcf'} side={THREE.DoubleSide} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 16.4, 0]}>
        <cylinderGeometry args={[70.2, 70.2, 1.1, 96, 1, true]} />
        <meshBasicMaterial color="#ffd98a" side={THREE.DoubleSide} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 21.8, 0]}>
        <cylinderGeometry args={[70.2, 70.2, 0.8, 96, 1, true]} />
        <meshBasicMaterial color="#ffe3a6" side={THREE.DoubleSide} transparent opacity={0.65} />
      </mesh>
      <mesh position={[0, 23.5, 0]}>
        <cylinderGeometry args={[72, 72, 1.4, 96]} />
        <meshStandardMaterial color="#cfc8b6" roughness={0.7} />
      </mesh>

      {[Math.PI * 0.3, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.7].map((a, i) => (
        <group key={i} position={[76 * Math.cos(a), 0, -76 * Math.sin(a)]}>
          <mesh position={[0, 21, 0]} castShadow>
            <cylinderGeometry args={[1.6, 2.4, 42, 10]} />
            <meshStandardMaterial color="#e8e2d4" roughness={0.55} />
          </mesh>
          <mesh position={[0, 44.5, 0]}>
            <coneGeometry args={[2.0, 5.5, 10]} />
            <meshStandardMaterial color="#3f7d4e" roughness={0.4} />
          </mesh>
          <mesh position={[0, 48, 0]}>
            <sphereGeometry args={[0.5, 10, 10]} />
            <meshStandardMaterial color="#ffd87a" emissive="#c9a227" emissiveIntensity={0.8} />
          </mesh>
          <pointLight position={[0, 40, 0]} intensity={120} distance={40} color="#fff0cf" decay={1.8} />
        </group>
      ))}
    </group>
  )
}

/* ===================================================== green light */
function GreenLight({ showLabels }) {
  const beam = useRef()
  const lamp = useRef()
  useFrame(({ clock }) => {
    const k = 0.65 + Math.sin(clock.elapsedTime * 2.4) * 0.35
    if (beam.current) beam.current.material.opacity = 0.16 + k * 0.12
    if (lamp.current) lamp.current.intensity = 150 + k * 120
  })
  // mounted on the colonnade at θ = 0, exactly in line with Hajar al-Aswad
  return (
    <group position={[67.2, 0, 0]}>
      <mesh position={[0, 9.5, 0]}>
        <boxGeometry args={[0.6, 2.6, 1.6]} />
        <meshBasicMaterial color="#22e06c" />
      </mesh>
      <mesh position={[0, 9.5, 0]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial color="#2bff7f" transparent opacity={0.22} />
      </mesh>
      <pointLight ref={lamp} position={[-1.5, 9.5, 0]} color="#2bff7f" distance={45} intensity={200} decay={1.8} />
      <mesh ref={beam} position={[-1.2, 4.7, 0]} rotation={[0, 0, 0.12]}>
        <coneGeometry args={[2.6, 9.4, 16, 1, true]} />
        <meshBasicMaterial color="#2bff7f" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* glowing start marker on the floor at the pilgrim's radius */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-(67.2 - PILGRIM_RADIUS), 0.03, 0]}>
        <ringGeometry args={[1.1, 1.6, 32]} />
        <meshBasicMaterial color="#2bff7f" transparent opacity={0.85} />
      </mesh>
      {showLabels && (
        <Label gold position={[-2.5, 13.5, 0]}>
          Green Light —<br />Start of Tawaf (anti-clockwise)
        </Label>
      )}
    </group>
  )
}

/* the trainee — PROMINENT: larger, spotlit beacon + name tag.
   Auto-walks ONLY while moving; never stops on its own. */
function UserPilgrim({ thetaRef, istilamAnimRef, gaitRef, gender, praying }) {
  const group = useRef()
  const inner = useRef()
  const beacon = useRef()

  useFrame(({ clock }) => {
    const theta = thetaRef.current
    const [x, , z] = angleToPos(theta, PILGRIM_RADIUS)
    if (!group.current) return
    group.current.position.set(x, 0, z)
    group.current.rotation.y = theta + Math.PI

    if (beacon.current) beacon.current.material.opacity = 0.4 + Math.sin(clock.elapsedTime * 4) * 0.25

    const arm = inner.current && inner.current.getObjectByName('rightArm')
    if (arm) {
      const dt = (performance.now() - istilamAnimRef.current) / 1000
      if (istilamAnimRef.current && dt < 2.4) {
        const t = Math.min(dt / 2.4, 1)
        const lift = Math.sin(t * Math.PI)
        arm.rotation.z = lift * 1.9
        arm.rotation.x = lift * 0.4
      }
    }
  })

  return (
    <group ref={group}>
      <group ref={inner} scale={1.25}>
        {gender === 'female'
          ? <FemaleAvatar gaitRef={gaitRef} trainee />
          : <MaleAvatar gaitRef={gaitRef} trainee />}
      </group>
      {/* floating beacon so the trainee is unmistakable in the crowd */}
      <mesh ref={beacon} position={[0, 4.4, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#ff3b46" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <coneGeometry args={[0.45, 0.9, 4]} />
        <meshBasicMaterial color="#ff3b46" />
      </mesh>
      <pointLight position={[0, 5.2, 0]} color="#ff3b46" intensity={32} distance={11} decay={1.6} />
    </group>
  )
}

/* ================================================== crowd of pilgrims */
function Crowd({ count = 60 }) {
  const refs = useRef([])
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        // min radius keeps the crowd OUTSIDE the Hateem — real Tawaf
        // circles the Hijr, never cuts through it
        r: 14.5 + Math.random() * 20,
        a: Math.random() * Math.PI * 2,
        speed: 0.04 + Math.random() * 0.06,
        female: Math.random() > 0.5,
        skin: SKIN[Math.floor(Math.random() * SKIN.length)],
        cloth: Math.random() > 0.5 ? '#2f3645' : '#46506a',
        gait: { current: Math.random() * 6 },
      })),
    [count],
  )

  useFrame((_, dt) => {
    seeds.forEach((s, i) => {
      s.a += s.speed * dt // anti-clockwise
      s.gait.current += dt * 6
      const [x, , z] = angleToPos(s.a, s.r)
      const g = refs.current[i]
      if (g) {
        g.position.set(x, 0, z)
        g.rotation.y = s.a + Math.PI // face direction of travel
      }
    })
  })

  return (
    <group>
      {seeds.map((s, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)} scale={0.96}>
          {s.female
            ? <FemaleAvatar skin={s.skin} cloth={s.cloth} gaitRef={s.gait} />
            : <MaleAvatar skin={s.skin} gaitRef={s.gait} />}
        </group>
      ))}
    </group>
  )
}


/* =============================================== ties hook ↔ render loop */
function TawafDriver({ tick }) {
  useFrame((_, dt) => tick(Math.min(dt, 0.05)))
  return null
}

/* cinematic follow-camera — orbits with the trainee around the Kaaba */
function FollowCam({ thetaRef, enabled }) {
  const desired = useRef(new THREE.Vector3())
  const target = useRef(new THREE.Vector3())
  useFrame(({ camera }, dt) => {
    if (!enabled) return
    const theta = thetaRef.current
    const [ax, , az] = angleToPos(theta, PILGRIM_RADIUS)
    // camera sits a bit outside the pilgrim radius, slightly behind on the path
    const camR = PILGRIM_RADIUS + 11
    const camTheta = theta - 0.35
    desired.current.set(camR * Math.cos(camTheta), 9, -camR * Math.sin(camTheta))
    camera.position.lerp(desired.current, Math.min(1, dt * 2.5))
    target.current.lerp(new THREE.Vector3(ax, 2.2, az), Math.min(1, dt * 4))
    camera.lookAt(target.current)
  })
  return null
}

/* ============================================================== scene */
export default function KaabaScene({ umrah, showLabels, follow }) {
  const { thetaRef, istilamAnimRef, gaitRef, gender, praying, tickTawaf, phase, tawafStarted } = umrah

  return (
    <Canvas
      shadows
      camera={{ position: [34, 26, 34], fov: 50, near: 0.5, far: 600 }}
      gl={{ antialias: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#070b14']} />
      <fog attach="fog" args={['#070b14', 90, 260]} />

      <Stars radius={250} depth={60} count={4000} factor={5} saturation={0} fade speed={0.6} />

      <ambientLight intensity={0.35} color="#bcc7e6" />
      <hemisphereLight args={['#2c3a5c', '#0c0f16', 0.5]} />
      <directionalLight
        position={[40, 60, 25]}
        intensity={1.1}
        color="#fff2da"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
      />
      <spotLight position={[-35, 45, -20]} angle={0.55} intensity={6000} color="#ffeccb" distance={160} penumbra={0.6} decay={1.6} />
      <spotLight position={[20, 50, -40]} angle={0.55} intensity={5000} color="#e8f0ff" distance={170} penumbra={0.7} decay={1.6} />
      <spotLight position={[45, 40, 30]} angle={0.5} intensity={4500} color="#fff2da" distance={160} penumbra={0.7} decay={1.6} />

      <Mataf />
      <KaabaComplex showLabels={showLabels} />
      <Colonnade />
      <GreenLight showLabels={showLabels} />
      <Crowd />

      {(phase === 'tawaf' || phase === 'afterTawaf') && (
        <UserPilgrim
          thetaRef={thetaRef}
          istilamAnimRef={istilamAnimRef}
          gaitRef={gaitRef}
          gender={gender}
          praying={praying}
        />
      )}

      <TawafDriver tick={tickTawaf} />
      <FollowCam thetaRef={thetaRef} enabled={follow && (phase === 'tawaf' || phase === 'afterTawaf')} />

      {!follow && (
        <OrbitControls
          target={[0, 8, 0]}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={14}
          maxDistance={150}
          enablePan={false}
        />
      )}
    </Canvas>
  )
}
