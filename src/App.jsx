import { useState } from 'react'
import KaabaScene from './components/KaabaScene'
import SaiScene from './components/SaiScene'
import ControlPanel from './components/ControlPanel'
import AvatarLocation from './components/AvatarLocation'
import MatafAudio from './components/MatafAudio'
import useUmrah from './hooks/useUmrah'
import s from './App.module.css'

const SAI_PHASES = ['toSai', 'sai', 'zamzam', 'hair']

export default function App() {
  const umrah = useUmrah()
  const [showLabels, setShowLabels] = useState(true)
  const [follow, setFollow] = useState(false)

  const inSai = SAI_PHASES.includes(umrah.phase)

  return (
    <div className={s.app}>
      {inSai
        ? <SaiScene umrah={umrah} showLabels={showLabels} follow={follow} />
        : <KaabaScene umrah={umrah} showLabels={showLabels} follow={follow} />}
      <ControlPanel umrah={umrah} />

      {/* camera + label controls (top-right) */}
      <div className={s.viewBtns}>
        <button className={s.viewBtn} data-active={follow} onClick={() => setFollow(!follow)}>
          {inSai
            ? (follow ? '🖐 Manual camera' : '🎥 Auto-follow avatar')
            : (follow ? '🎥 Cinematic: ON' : '🎥 Cinematic: OFF')}
        </button>
        <button className={s.viewBtn} onClick={() => setShowLabels(!showLabels)}>
          {showLabels ? '🏷 Hide labels' : '🏷 Show labels'}
        </button>
      </div>

      {/* live avatar coordinates — kept in window.__umrahState for ML/DL,
          but hidden from screen to keep the Mataf/Sa'i area clear */}
      <AvatarLocation umrah={umrah} inSai={inSai} hidden />

      {/* background audio for the Mataf (Tawaf) area */}
      <MatafAudio phase={umrah.phase} />

      <footer className={s.credit}>
        Virtual Umrah Training System · Zoha Fatima FA24-RCS-015 · COMSATS Sahiwal
      </footer>
    </div>
  )
}
