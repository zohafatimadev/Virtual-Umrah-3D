import { useEffect, useRef, useState } from 'react'
import s from '../App.module.css'

/*
 * AvatarLocation — a small telemetry panel that reads the avatar's live
 * position straight from the simulation refs every animation frame.
 *
 * This is intentionally exposed for future Machine Learning / Deep Learning
 * work: the same values shown here (and pushed to window.__umrahState) are a
 * ready-made feature vector describing the avatar's state at any instant —
 * position, phase, direction, speed, rounds/laps, and error count. A model
 * could log these over time, or read window.__umrahState in real time.
 */
const TWO_PI = Math.PI * 2
const PILGRIM_RADIUS = 15
const SAI_LEN = 96
const SAI_HALF = SAI_LEN / 2

export default function AvatarLocation({ umrah, inSai, hidden }) {
  const { thetaRef, saiTRef, saiDirRef, phase, gender, rounds, laps, errors, speedPct, moving, praying } = umrah
  const [snap, setSnap] = useState({})
  const raf = useRef()

  useEffect(() => {
    const loop = () => {
      let data
      if (inSai) {
        const t = saiTRef.current
        const x = -SAI_HALF + t * SAI_LEN
        const dir = saiDirRef.current > 0 ? 'Safa→Marwah' : 'Marwah→Safa'
        const region = t < 0.12 ? 'SAFA' : t > 0.88 ? 'MARWAH' : 'track'
        data = {
          scene: 'sai', phase, gender,
          x: x.toFixed(2), z: (saiDirRef.current > 0 ? 5 : -5).toFixed(2),
          progress: (t * 100).toFixed(1) + '%',
          direction: dir, region, laps, speed: speedPct + '%',
          state: praying ? 'praying' : moving ? 'moving' : 'stopped',
          errors,
        }
      } else {
        const theta = thetaRef.current
        const norm = ((theta % TWO_PI) + TWO_PI) % TWO_PI
        const deg = (norm * 180 / Math.PI).toFixed(1)
        const x = PILGRIM_RADIUS * Math.cos(theta)
        const z = -PILGRIM_RADIUS * Math.sin(theta)
        data = {
          scene: 'tawaf', phase, gender,
          x: x.toFixed(2), z: z.toFixed(2),
          angle: deg + '°',
          round: Math.min(Math.floor(theta / TWO_PI) + 1, 7),
          rounds,
          state: praying ? 'praying' : moving ? 'moving' : 'stopped',
          errors,
        }
      }
      // expose globally for ML/DL pipelines
      window.__umrahState = data
      setSnap(data)
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, [umrah, inSai, phase, gender, rounds, laps, errors, speedPct, moving, praying, thetaRef, saiTRef, saiDirRef])

  // only show during the active ritual phases
  if (hidden) return null
  if (!['tawaf', 'afterTawaf', 'sai'].includes(phase)) return null

  return (
    <div className={s.telemetry}>
      <div className={s.telemetryHead}>📍 Avatar Location <small>(live)</small></div>
      <div className={s.telemetryGrid}>
        <span>scene</span><b>{snap.scene}</b>
        <span>x</span><b>{snap.x}</b>
        <span>z</span><b>{snap.z}</b>
        {snap.angle && (<><span>angle</span><b>{snap.angle}</b></>)}
        {snap.progress && (<><span>progress</span><b>{snap.progress}</b></>)}
        {snap.region && (<><span>region</span><b>{snap.region}</b></>)}
        {snap.direction && (<><span>dir</span><b>{snap.direction}</b></>)}
        {snap.round && (<><span>round</span><b>{snap.round}</b></>)}
        {typeof snap.laps !== 'undefined' && (<><span>laps</span><b>{snap.laps}</b></>)}
        {snap.speed && (<><span>speed</span><b>{snap.speed}</b></>)}
        <span>state</span><b>{snap.state}</b>
        <span>errors</span><b style={{ color: snap.errors > 0 ? '#ff6b6b' : '#2bff7f' }}>{snap.errors}</b>
      </div>
    </div>
  )
}
