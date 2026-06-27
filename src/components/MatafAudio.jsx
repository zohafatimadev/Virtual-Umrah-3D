import { useEffect, useRef, useState } from 'react'
import s from './App.module.css'

/*
 * MatafAudio — plays background audio during the Tawaf (Mataf) phase.
 *
 * Browsers block autoplay until the user interacts, so we expose a small
 * play/pause button. The audio file should be placed at:
 *     public/mataf.mp3
 * (Download the audio from your reference and save it there — see README.)
 *
 * If the file is missing, the button simply does nothing harmful.
 */
const MATAF_PHASES = ['tawaf', 'afterTawaf']

export default function MatafAudio({ phase }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const inMataf = MATAF_PHASES.includes(phase)

  // pause automatically when leaving the Mataf area
  useEffect(() => {
    if (!inMataf && audioRef.current) {
      audioRef.current.pause()
      setPlaying(false)
    }
  }, [inMataf])

  if (!inMataf) return null

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause(); setPlaying(false)
    } else {
      a.play().then(() => setPlaying(true)).catch(() => {
        // file missing or blocked — fail quietly
        setPlaying(false)
      })
    }
  }

  return (
    <>
      <audio ref={audioRef} src="/mataf.mp3" loop preload="auto" />
      <button className={s.audioBtn} data-on={playing} onClick={toggle}>
        {playing ? '🔊 Mataf audio: ON' : '🔈 Play Mataf audio'}
      </button>
    </>
  )
}
