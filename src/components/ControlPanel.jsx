import { useState } from 'react'
import s from './ControlPanel.module.css'

const ICONS = { error: '⚠️', success: '✅', info: '🕋' }

function Btn({ onClick, variant, label, sub, disabled }) {
  return (
    <button className={s.actionBtn} data-variant={variant} onClick={onClick} disabled={disabled}>
      {label}<small>{sub}</small>
    </button>
  )
}

export default function ControlPanel({ umrah }) {
  const {
    phase, gender,
    tawafStarted, rounds, istilamCount, progress,
    saiStarted, laps, saiRegion, speedPct, moving, praying,
    errors, errorLog, toasts, totalRounds, totalLaps,
    begin, chooseGender, confirmNiyyah,
    startTawaf, doIstilam, walkTawaf, stopTawaf, endTawaf,
    prayNawafil, enterSai,
    startSai, walkSai, stopSai, changeSpeed, prayAtHill, endSai, saiAction,
    changeTawafSpeed, tawafSpeedPct,
    drinkZamzam, cutHair, skipHair, reset, exportCSV,
  } = umrah
  const [showLog, setShowLog] = useState(false)

  /* ---------- welcome ---------- */
  if (phase === 'welcome') {
    return (
      <div className={s.overlay}>
        <div className={s.card}>
          <div className={s.kaabaIcon}>🕋</div>
          <h1 className={s.title}>Virtual Umrah Training</h1>
          <p className={s.subtitle}>You are the guide — the avatar only obeys</p>
          <p className={s.body}>
            <b>You</b> are the pilgrim being trained. The 3D avatar is just a body with
            <b> zero knowledge</b> — it does nothing on its own and keeps moving until <b>you</b>
            tell it to stop. You decide every action: when to start, when to greet the Black Stone,
            when to speed up, when to stop and pray. The system silently watches and counts every
            mistake, so you learn the rules by <b>trial and error</b>.
          </p>
          <button className={s.primaryBtn} onClick={begin}>Begin Training</button>
        </div>
      </div>
    )
  }

  /* ---------- gender ---------- */
  if (phase === 'gender') {
    return (
      <div className={s.overlay}>
        <div className={s.card}>
          <h2 className={s.title}>Who is performing Umrah?</h2>
          <p className={s.bodyMuted}>Affects Sa‘i: men jog (Ramal) between the green lights, women only walk.</p>
          <div className={s.genderRow}>
            <button className={s.genderBtn} onClick={() => chooseGender('male')}><span>🧔🏻</span>Male Hajji<small>walks + jogs in green zone</small></button>
            <button className={s.genderBtn} onClick={() => chooseGender('female')}><span>🧕🏻</span>Female Hajjah<small>walks throughout</small></button>
          </div>
        </div>
      </div>
    )
  }

  /* ---------- niyyah ---------- */
  if (phase === 'niyyah') {
    return (
      <div className={s.overlay}>
        <div className={s.card}>
          <h2 className={s.title}>النِّيَّة — The Intention</h2>
          <p className={s.arabic}>اللَّهُمَّ إِنِّي أُرِيدُ الْعُمْرَةَ فَيَسِّرْهَا لِي وَتَقَبَّلْهَا مِنِّي</p>
          <p className={s.body}>“O Allah, I intend to perform Umrah, so make it easy for me and accept it from me.”</p>
          <button className={s.primaryBtn} onClick={confirmNiyyah}>I have made my Niyyah</button>
        </div>
      </div>
    )
  }

  /* ---------- complete ---------- */
  if (phase === 'complete') {
    return (
      <div className={s.overlay}>
        <div className={s.card}>
          <div className={s.kaabaIcon}>🌙</div>
          <h2 className={s.titleBig}>عُمْرَة مُبَارَك</h2>
          <h3 className={s.title}>Umrah Mubarak!</h3>
          <div className={s.statRow}>
            <div className={s.stat}><span>{rounds}</span>Tawaf rounds</div>
            <div className={s.stat}><span>{laps}</span>Sa‘i laps</div>
            <div className={s.stat} data-bad={errors > 0}><span>{errors}</span>Mistakes</div>
          </div>
          {errors === 0
            ? <p className={s.body}>A flawless Umrah — every ritual in the right place, order and manner. 🤍</p>
            : <>
                <p className={s.body}>You made <b>{errors}</b> mistake{errors > 1 ? 's' : ''}. Review them and train again until flawless.</p>
                <div className={s.logBox}>
                  {errorLog.map((e, i) => <div key={i} className={s.logItem}><b>{e.code}</b> · {e.text}</div>)}
                </div>
              </>}
          <button className={s.primaryBtn} onClick={reset}>Train Again</button>
        </div>
      </div>
    )
  }

  /* ================= live HUD ================= */
  return (
    <>
      {/* top HUD — feedback group, moved to the RIGHT via CSS */}
      <div className={s.hud}>
        {(phase === 'tawaf' || phase === 'afterTawaf') && (
          <>
            <div className={s.hudBlock}>
              <span className={s.hudLabel}>Tawaf rounds</span>
              <span className={s.hudValue} data-bad={rounds > totalRounds}>{rounds}<small>/{totalRounds}</small></span>
              <div className={s.roundDots}>{Array.from({ length: totalRounds }, (_, i) => <i key={i} data-done={i < rounds} />)}</div>
            </div>
            <div className={s.hudBlock}>
              <span className={s.hudLabel}>Round progress</span>
              <div className={s.progressBar}><i style={{ width: `${progress}%` }} /></div>
              <span className={s.hudSmall}>{moving ? 'avatar walking' : 'avatar stopped'}</span>
            </div>
          </>
        )}
        {phase === 'sai' && (
          <>
            <div className={s.hudBlock}>
              <span className={s.hudLabel}>Sa‘i laps</span>
              <span className={s.hudValue} data-bad={laps > totalLaps}>{laps}<small>/{totalLaps}</small></span>
              <div className={s.roundDots}>{Array.from({ length: totalLaps }, (_, i) => <i key={i} data-done={i < laps} />)}</div>
            </div>
            <div className={s.hudBlock}>
              <span className={s.hudLabel}>Avatar at</span>
              <span className={s.hudValue} style={{ fontSize: 18 }}>
                {saiRegion === 'safa' ? 'SAFA' : saiRegion === 'marwah' ? 'MARWAH' : 'track'}
              </span>
              <span className={s.hudSmall}>{praying ? 'praying 🤲' : moving ? 'moving' : 'stopped'}</span>
            </div>
            <div className={s.hudBlock}>
              <span className={s.hudLabel}>Speed</span>
              <span className={s.hudValue} style={{ fontSize: 20 }}>{speedPct}%</span>
              <span className={s.hudSmall}>↑ / ↓ keys</span>
            </div>
          </>
        )}
        <div className={`${s.hudBlock} ${s.clickable}`} onClick={() => setShowLog(!showLog)}>
          <span className={s.hudLabel}>Mistakes</span>
          <span className={s.hudValue} data-bad={errors > 0}>{errors}</span>
          <span className={s.hudSmall}>{showLog ? 'hide ▲' : 'view ▼'}</span>
        </div>
      </div>

      {showLog && (
        <div className={s.floatingLog}>
          {errorLog.length === 0 ? <div className={s.logItem}>No mistakes yet 🌙</div>
            : errorLog.map((e, i) => <div key={i} className={s.logItem}><b>{e.code}</b>: {e.text}</div>)}
        </div>
      )}

      <div className={s.toasts}>
        {toasts.map((t) => <div key={t.id} className={s.toast} data-type={t.type}><span>{ICONS[t.type]}</span> {t.text}</div>)}
      </div>

      {/* ============== action bar per phase ============== */}
      <div className={s.actions}>
        {phase === 'tawaf' && (
          <>
            {!tawafStarted
              ? <Btn key="t-start" onClick={startTawaf} variant="gold" label="▶ Start Tawaf" sub="press at the green light" />
              : <Btn key="t-istilam" onClick={doIstilam} variant="gold" label="✋💋 Istilam" sub="Salam each round" />}
            <Btn key="t-walk" onClick={moving ? stopTawaf : walkTawaf}
                 variant={moving ? 'stop' : 'green'}
                 label={moving ? '⏸ Stop' : '🚶 Walk'}
                 sub={moving ? 'halt the avatar' : 'avatar moves non-stop'} />
            <Btn key="t-speed" onClick={() => changeTawafSpeed(+0.25)} variant="run"
                 label={`⏩ Speed Up (${tawafSpeedPct}%)`} sub="move avatar faster" />
            <Btn key="t-slow" onClick={() => changeTawafSpeed(-0.25)} variant="plain"
                 label="⏪ Slow Down" sub="reduce speed" />
            <Btn key="t-end" onClick={endTawaf} variant="finish" label="🏁 End Tawaf" sub="only after 7 rounds" />
          </>
        )}

        {phase === 'afterTawaf' && (
          <Btn key="pray2" onClick={prayNawafil} variant="gold" label="🤲 Pray 2 Rak‘ah" sub="Nawafil at the Hateem" />
        )}

        {phase === 'toSai' && (
          <Btn key="enter-sai" onClick={enterSai} variant="green" label="🚶 Enter Sa‘i area" sub="go to the Mas‘a" />
        )}

        {phase === 'sai' && (
          <>
            {!saiStarted
              ? <Btn key="s-start" onClick={startSai} variant="gold" label="▶ Start Sa‘i" sub="must be on SAFA" />
              : <Btn key="s-action" onClick={saiAction}
                     variant={praying ? 'gold' : moving ? 'stop' : (saiRegion === 'safa' || saiRegion === 'marwah') ? 'gold' : 'green'}
                     label={praying ? '🤲 Making Dua…' : moving ? '⏸ Stop' : (saiRegion === 'safa' || saiRegion === 'marwah') ? '🤲 Dua' : '🚶 Walk'}
                     sub={praying ? 'hold ~3s' : moving ? 'halt the avatar' : (saiRegion === 'safa' || saiRegion === 'marwah') ? 'stop & make dua at hill' : 'continue toward the hill'} />}
            {saiStarted && <Btn key="s-speed" onClick={() => changeSpeed(+0.25)} variant="run" label="⏩ Speed Up" sub="jog (green zone)" />}
            {saiStarted && <Btn key="s-slow" onClick={() => changeSpeed(-0.25)} variant="plain" label="⏪ Slow Down" sub="back to walk" />}
            <Btn key="s-end" onClick={endSai} variant="finish" label="🏁 End Sa‘i" sub="only after 7 laps" />
          </>
        )}

        {phase === 'zamzam' && (
          <Btn key="zamzam" onClick={drinkZamzam} variant="gold" label="💧 Drink Zamzam" sub="blessed water" />
        )}

        {phase === 'hair' && (
          <>
            <Btn key="hair" onClick={cutHair} variant="gold" label="✂️ Cut hair" sub={gender === 'female' ? 'Taqsir (trim)' : 'Halq / Taqsir'} />
            <Btn key="skiphair" onClick={skipHair} variant="plain" label="⏭ Skip hair" sub="(see what happens)" />
          </>
        )}

        <Btn onClick={exportCSV} variant="plain" label="📥 Download CSV" sub="this session's data" />
        <Btn onClick={reset} variant="ghost" label="↺ Restart" sub="start over" />
      </div>
    </>
  )
}
