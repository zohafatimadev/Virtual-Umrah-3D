import { useCallback, useEffect, useRef, useState } from 'react'
import logger, { downloadCSV } from './sessionLogger'

/*
 * useUmrah — master state machine.
 *
 * CORE PHILOSOPHY (supervisor's directive):
 *   The avatar is a body with ZERO knowledge. The TRAINEE (real human) is
 *   the brain. The avatar NEVER decides anything:
 *     - it does not stop after 7 rounds / 7 laps — it moves forever
 *     - it does not slow down in the green zone on its own
 *     - it does not know Safa from Marwah, or where Tawaf begins
 *   The trainee issues every command (start, stop, salam, speed up, pray,
 *   haircut). The system only WATCHES and LOGS whether each command was
 *   correct. We are training the pilgrim, not the avatar.
 *
 * STEPS shown for guidance:
 *   0 Start Umrah · 1 Tawaf start · 2 Tawaf done ·
 *   3 Two Rakkah Nawafil (Hateem) · 4 Go for Sai · 5 Sai completed ·
 *   6 Drink ZamZam · 7 Cutting hair · 8 Umrah Mubarak
 */

const TWO_PI = Math.PI * 2
const TOTAL_ROUNDS = 7
const TOTAL_LAPS = 7

// Tawaf
const ISTILAM_ZONE = 0.5
const TAWAF_SPEED = 0.26 // rad/s constant — avatar never changes this itself

// Sai — parametric 0..1 along Safa(0) <-> Marwah(1)
const SAI_BASE = 0.12 // base progress/s (normal walk)
const SAI_MIN = 0.06
const SAI_MAX = 0.26
const GREEN_FROM = 0.34 // longer green zone (supervisor)
const GREEN_TO = 0.66

const STEPS = [
  'Start Umrah',
  'Tawaf start',
  'Tawaf done',
  'Two Rakkah Nawafil (Hateem)',
  'Go for Sai',
  'Sai completed',
  'Drink ZamZam',
  'Cutting hair',
  'Umrah Mubarak',
]

let toastId = 0

export default function useUmrah() {
  const [phase, setPhase] = useState('welcome')
  const [gender, setGender] = useState(null)
  const [step, setStep] = useState(0)

  // tawaf
  const [tawafStarted, setTawafStarted] = useState(false)
  const [rounds, setRounds] = useState(0)
  const [istilamCount, setIstilamCount] = useState(0)
  const [progress, setProgress] = useState(0)

  // sai
  const [saiStarted, setSaiStarted] = useState(false)
  const [laps, setLaps] = useState(0)
  const [saiRegion, setSaiRegion] = useState('safa') // where avatar currently is/near
  const [speedPct, setSpeedPct] = useState(100)

  // shared
  const [moving, setMoving] = useState(false)
  const [praying, setPraying] = useState(false)
  const [errors, setErrors] = useState(0)
  const [errorLog, setErrorLog] = useState([])
  const [toasts, setToasts] = useState([])

  // refs the scenes read every frame
  const thetaRef = useRef(0)
  const istilamAnimRef = useRef(0)
  const tawafSpeedRef = useRef(1) // trainee-controlled Tawaf speed multiplier
  const saiTRef = useRef(0) // 0..1
  const saiDirRef = useRef(1) // +1 toward Marwah, -1 toward Safa
  const gaitRef = useRef(0)
  const movingRef = useRef(false)
  const speedRef = useRef(1) // multiplier set by trainee (keys/buttons)
  const prayingRef = useRef(false)

  const roundsRef = useRef(0)
  const lapsRef = useRef(0)
  const errorsRef = useRef(0)
  const tawafStartedRef = useRef(false)
  const saiStartedRef = useRef(false)

  const flags = useRef({
    istilamThisRound: false,
    overrunWarned: false,    // tawaf 8th round
    saiOverWarned: false,    // sai 8th lap
    lastRegionStopped: null, // which hill we already prayed at (this lap end)
    greenWarnedDir: 0,
  })

  const pushToast = useCallback((type, text) => {
    const id = ++toastId
    setToasts((t) => [...t.slice(-3), { id, type, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4800)
  }, [])

  const addError = useCallback((code, text) => {
    errorsRef.current += 1
    setErrors((e) => e + 1)
    setErrorLog((log) => [...log, { code, text }])
    pushToast('error', text)
  }, [pushToast])

  /* ------------------------------- session logging (imitation-learning data) */
  // Build a state snapshot at the instant an action is taken.
  const snapshot = useCallback((scene) => {
    const theta = thetaRef.current
    const norm = ((theta % TWO_PI) + TWO_PI) % TWO_PI
    const t = saiTRef.current
    return {
      gender, phase, scene,
      x: scene === 'sai'
        ? (-48 + t * 96).toFixed(2)
        : (15 * Math.cos(theta)).toFixed(2),
      z: scene === 'sai'
        ? (saiDirRef.current > 0 ? '5.00' : '-5.00')
        : (-15 * Math.sin(theta)).toFixed(2),
      angleNum: scene === 'sai' ? '' : (norm * 180 / Math.PI).toFixed(1),
      progressNum: scene === 'sai' ? t.toFixed(3) : '',
      region: scene === 'sai'
        ? (t < 0.12 ? 'SAFA' : t > 0.88 ? 'MARWAH' : 'track')
        : '',
      directionTag: scene === 'sai'
        ? (saiDirRef.current > 0 ? 'safa->marwah' : 'marwah->safa')
        : 'ccw',
      round: scene === 'sai' ? '' : Math.min(roundsRef.current + 1, TOTAL_ROUNDS),
      lap: scene === 'sai' ? lapsRef.current : '',
      istilamPaid: scene === 'sai' ? '' : (flags.current.istilamThisRound ? 1 : 0),
      speedPct: Math.round(speedRef.current * 100),
      moving: movingRef.current ? 1 : 0,
      errors: errorsRef.current,
    }
  }, [gender, phase])

  // Log one action row. result = {ok:true} or {ok:false, code:'E1'}
  const logAction = useCallback((action, result, scene) => {
    try { logger.log(action, result || { ok: true }, snapshot(scene)) } catch (e) { /* no-op */ }
  }, [snapshot])

  const exportCSV = useCallback(() => {
    const out = logger.finish()
    downloadCSV(out.csv, out.filename)
    pushToast('info', `📥 CSV exported: ${out.rows} actions, labelled “${out.label}”.`)
    return out
  }, [pushToast])

  /* ----------------------------------------------------- navigation */
  const begin = useCallback(() => setPhase('gender'), [])
  const chooseGender = useCallback((g) => {
    setGender(g)
    logger.start(g)              // begin a fresh logging session
    logAction('ChooseGender', { ok: true }, 'tawaf')
    setPhase('niyyah')
  }, [logAction])
  const confirmNiyyah = useCallback(() => {
    setPhase('tawaf'); setStep(1)
    logAction('Niyyah', { ok: true }, 'tawaf')
    pushToast('info', 'You are in the Mataf. The avatar will only do what YOU command. What is the first thing to do, and where?')
  }, [pushToast, logAction])

  /* =================================================== TAWAF ========= */
  // Trainee presses "Start Tawaf" — valid only near the Hajar al-Aswad line.
  const startTawaf = useCallback(() => {
    if (phase !== 'tawaf') return
    if (tawafStartedRef.current) { pushToast('info', 'Tawaf already started. Use Walk / Istilam.'); return }
    const local = ((thetaRef.current % TWO_PI) + TWO_PI) % TWO_PI
    const nearLine = local < ISTILAM_ZONE || local > TWO_PI - ISTILAM_ZONE
    if (!nearLine) {
      addError('E1', 'You cannot start Tawaf here — Tawaf must begin in line with Hajar al-Aswad (the green light). Walk the avatar to the line first.')
      logAction('StartTawaf', { ok: false, code: 'E1' }, 'tawaf')
      // per supervisor: system does NOT block; it only logs. Start anyway.
    } else {
      logAction('StartTawaf', { ok: true }, 'tawaf')
    }
    tawafStartedRef.current = true
    setTawafStarted(true)
    pushToast('success', 'Tawaf started. Press Istilam to greet Hajar al-Aswad, then Walk.')
  }, [phase, addError, pushToast, logAction])

  const doIstilam = useCallback(() => {
    if (phase !== 'tawaf' || !tawafStartedRef.current) {
      if (phase === 'tawaf') { addError('E1', 'Press “Start Tawaf” at the green light before making Istilam.'); logAction('Istilam', { ok: false, code: 'E1' }, 'tawaf') }
      return
    }
    const local = ((thetaRef.current % TWO_PI) + TWO_PI) % TWO_PI
    const nearLine = local < ISTILAM_ZONE || local > TWO_PI - ISTILAM_ZONE
    if (!nearLine) {
      addError('E2', 'Wrong place for Salam! Istilam (✋💋) is made only facing Hajar al-Aswad, at the green light.')
      logAction('Istilam', { ok: false, code: 'E2' }, 'tawaf')
      return
    }
    if (flags.current.istilamThisRound) {
      pushToast('info', 'Salam already paid for this round. Press Walk to continue.')
      return
    }
    flags.current.istilamThisRound = true
    istilamAnimRef.current = performance.now()
    setIstilamCount((c) => c + 1)
    logAction('Istilam', { ok: true }, 'tawaf')
    pushToast('success', `Salam paid (round ${Math.min(roundsRef.current + 1, TOTAL_ROUNDS)}) — “Bismillahi Allahu Akbar”. Now press Walk.`)
  }, [phase, addError, pushToast, logAction])

  // Walk / Stop — avatar moves only while moving===true, but the AVATAR
  // itself never stops on its own. Only the trainee stops it.
  const walkTawaf = useCallback(() => {
    if (phase !== 'tawaf') return
    if (!tawafStartedRef.current) { addError('E1', 'Press “Start Tawaf” first, at the green light.'); logAction('Walk', { ok: false, code: 'E1' }, 'tawaf'); return }
    movingRef.current = true; setMoving(true)
    logAction('Walk', { ok: true }, 'tawaf')
  }, [phase, addError, logAction])

  const stopTawaf = useCallback(() => { movingRef.current = false; setMoving(false); logAction('Stop', { ok: true }, 'tawaf') }, [logAction])

  // Tawaf speed control (trainee speeds up the avatar to complete faster)
  const [tawafSpeedPct, setTawafSpeedPct] = useState(100)
  const changeTawafSpeed = useCallback((delta) => {
    tawafSpeedRef.current = Math.max(0.5, Math.min(3, tawafSpeedRef.current + delta))
    setTawafSpeedPct(Math.round(tawafSpeedRef.current * 100))
    logAction(delta > 0 ? 'SpeedUp' : 'SlowDown', { ok: true }, 'tawaf')
  }, [logAction])

  // Trainee decides Tawaf is finished. Correct ONLY if rounds>=7 and <8.
  const endTawaf = useCallback(() => {
    if (phase !== 'tawaf') return
    if (roundsRef.current < TOTAL_ROUNDS) {
      addError('E3', `Your rounds are not complete — only ${roundsRef.current} of 7 done. You cannot finish Tawaf yet.`)
      logAction('EndTawaf', { ok: false, code: 'E3' }, 'tawaf')
      return
    }
    movingRef.current = false; setMoving(false)
    setStep(2)
    logAction('EndTawaf', { ok: true }, 'tawaf')
    pushToast('success', 'Tawaf complete (7 rounds), Masha\u2019Allah! Proceed to pray 2 Rak\u2019ah at the Hateem.')
    setTimeout(() => setPhase('afterTawaf'), 1200)
  }, [phase, addError, pushToast, logAction])

  /* --------------------------------------------- prayer after tawaf */
  const prayNawafil = useCallback(() => {
    if (phase !== 'afterTawaf') return
    setStep(4)
    logAction('PrayNawafil', { ok: true }, 'tawaf')
    pushToast('success', 'Two Rak\u2019ah Nawafil offered at the Hateem. 🤲 Now go to the Sa\u2019i area.')
    setPhase('toSai')
  }, [phase, pushToast, logAction])

  // Entering Sai: avatar is PLACED on the track but does NOT auto-start.
  // Supervisor: avatar may be near Marwah; trainee must walk to Safa first.
  const enterSai = useCallback(() => {
    setPhase('sai')
    // start the avatar partway so the trainee must recognise Safa vs Marwah
    saiTRef.current = 0.0
    saiDirRef.current = 1
    saiStartedRef.current = false
    setSaiStarted(false)
    setSaiRegion('safa')
    pushToast('info', 'You are in the Mas\u2019a. Sa\u2019i must START FROM SAFA. Walk the avatar onto Safa, then press “Start Sa\u2019i”.')
  }, [pushToast])

  /* ===================================================== SAI ========= */
  const startSai = useCallback(() => {
    if (phase !== 'sai') return
    if (saiStartedRef.current) { pushToast('info', 'Sa\u2019i already started.'); return }
    const onSafa = saiTRef.current < 0.08
    const onMarwah = saiTRef.current > 0.92
    if (onMarwah) {
      addError('E4', 'You cannot start Sa\u2019i from here — this is Marwah. Sa\u2019i begins at SAFA. Walk the avatar to Safa.')
      logAction('StartSai', { ok: false, code: 'E4' }, 'sai')
      return
    }
    if (!onSafa) {
      addError('E4', 'You are not on Safa yet. Sa\u2019i must start from Safa — walk the avatar onto the Safa platform first.')
      logAction('StartSai', { ok: false, code: 'E4' }, 'sai')
      return
    }
    saiStartedRef.current = true
    setSaiStarted(true)
    logAction('StartSai', { ok: true }, 'sai')
    pushToast('success', 'Sa\u2019i started at Safa. Press Walk to head toward Marwah. Speed up only in the green zone (men).')
  }, [phase, addError, pushToast, logAction])

  const walkSai = useCallback(() => {
    if (phase !== 'sai') return
    if (!saiStartedRef.current) { addError('E4', 'Press “Start Sa\u2019i” at Safa before walking.'); logAction('Walk', { ok: false, code: 'E4' }, 'sai'); return }
    movingRef.current = true; setMoving(true)
    logAction('Walk', { ok: true }, 'sai')
  }, [phase, addError, logAction])

  const stopSai = useCallback(() => { movingRef.current = false; setMoving(false); logAction('Stop', { ok: true }, 'sai') }, [logAction])

  // speed control (buttons + arrow keys). Only meaningful for men in green zone.
  const changeSpeed = useCallback((delta) => {
    speedRef.current = Math.max(SAI_MIN / SAI_BASE, Math.min(SAI_MAX / SAI_BASE, speedRef.current + delta))
    setSpeedPct(Math.round(speedRef.current * 100))
    logAction(delta > 0 ? 'SpeedUp' : 'SlowDown', { ok: true }, 'sai')
  }, [logAction])

  // Pray (Dua) at a hill: holds the avatar ~3s. Valid only when on a hill.
  const prayAtHill = useCallback(() => {
    if (phase !== 'sai') return
    const onSafa = saiTRef.current < 0.08
    const onMarwah = saiTRef.current > 0.92
    if (!onSafa && !onMarwah) {
      addError('E8', 'You can only stop to make Dua at a hill (Safa or Marwah) — not in the middle of the track.')
      logAction('Dua', { ok: false, code: 'E8' }, 'sai')
      return
    }
    const hill = onSafa ? 'safa' : 'marwah'
    flags.current.lastRegionStopped = hill
    prayingRef.current = true
    movingRef.current = false
    setPraying(true); setMoving(false)
    logAction('Dua', { ok: true }, 'sai')
    pushToast('success', `Stopped at ${hill === 'safa' ? 'Safa' : 'Marwah'} to make Dua. 🤲 (hold ~3s)`) 
    setTimeout(() => {
      prayingRef.current = false
      setPraying(false)
      pushToast('info', 'Dua done. Press the button to continue Sa\u2019i.')
    }, 3000)
  }, [phase, addError, pushToast, logAction])

  // SINGLE combined Sa'i button. One control does everything based on context:
  //   - on a hill & stopped  -> make Dua (hold 3s)
  //   - moving               -> stop
  //   - stopped on track     -> walk
  const saiAction = useCallback(() => {
    if (phase !== 'sai') return
    if (!saiStartedRef.current) { addError('E4', 'Press “Start Sa\u2019i” at Safa first.'); logAction('Walk', { ok: false, code: 'E4' }, 'sai'); return }
    if (prayingRef.current) return // currently making dua, ignore
    const onHill = saiTRef.current < 0.08 || saiTRef.current > 0.92
    if (movingRef.current) {
      // currently moving -> stop
      movingRef.current = false; setMoving(false)
      logAction('Stop', { ok: true }, 'sai')
    } else if (onHill) {
      // stopped on a hill -> make Dua
      prayAtHill()
    } else {
      // stopped on the track -> walk
      movingRef.current = true; setMoving(true)
      logAction('Walk', { ok: true }, 'sai')
    }
  }, [phase, addError, logAction, prayAtHill])

  const endSai = useCallback(() => {
    if (phase !== 'sai') return
    if (lapsRef.current < TOTAL_LAPS) {
      addError('E5', `Your Sa\u2019i is not complete — only ${lapsRef.current} of 7 laps. You cannot finish yet.`)
      logAction('EndSai', { ok: false, code: 'E5' }, 'sai')
      return
    }
    movingRef.current = false; setMoving(false)
    setStep(6)
    logAction('EndSai', { ok: true }, 'sai')
    setPhase('zamzam')
  }, [phase, addError, logAction])

  /* ------------------------------------------------- final steps */
  const drinkZamzam = useCallback(() => {
    setStep(7); logAction('DrinkZamzam', { ok: true }, 'sai'); pushToast('success', 'You drank Zamzam water. 💧'); setPhase('hair')
  }, [pushToast, logAction])

  const cutHair = useCallback(() => {
    setStep(8)
    logAction('CutHair', { ok: true }, 'sai')
    pushToast('success', gender === 'female' ? 'Taqsir done — a fingertip length trimmed. ✂️' : 'Halq/Taqsir done. ✂️')
    // auto-export the completed run's CSV
    try { const out = logger.finish(); downloadCSV(out.csv, out.filename); pushToast('info', `📥 Session CSV saved: ${out.rows} actions (“${out.label}”).`) } catch (e) {}
    setPhase('complete')
  }, [gender, pushToast, logAction])

  // Trainee tries to finish WITHOUT cutting hair -> mistake (supervisor).
  const skipHair = useCallback(() => {
    addError('E9', 'You did not cut your hair! Halq/Taqsir is required to exit Ihram and complete Umrah.')
    setStep(8)
    logAction('SkipHair', { ok: false, code: 'E9' }, 'sai')
    try { const out = logger.finish(); downloadCSV(out.csv, out.filename); pushToast('info', `📥 Session CSV saved: ${out.rows} actions (“${out.label}”).`) } catch (e) {}
    setPhase('complete')
  }, [addError, logAction, pushToast])

  const reset = useCallback(() => {
    thetaRef.current = 0; istilamAnimRef.current = 0; saiTRef.current = 0
    saiDirRef.current = 1; gaitRef.current = 0; movingRef.current = false
    speedRef.current = 1; prayingRef.current = false; tawafSpeedRef.current = 1
    roundsRef.current = 0; lapsRef.current = 0; errorsRef.current = 0
    tawafStartedRef.current = false; saiStartedRef.current = false
    flags.current = { istilamThisRound: false, overrunWarned: false, saiOverWarned: false, lastRegionStopped: null, greenWarnedDir: 0 }
    setPhase('welcome'); setGender(null); setStep(0)
    setTawafStarted(false); setRounds(0); setIstilamCount(0); setProgress(0)
    setSaiStarted(false); setLaps(0); setSaiRegion('safa'); setSpeedPct(100); setTawafSpeedPct(100)
    setMoving(false); setPraying(false); setErrors(0); setErrorLog([]); setToasts([])
  }, [])

  /* ============================ keyboard speed control (arrow keys) */
  useEffect(() => {
    const onKey = (e) => {
      if (phase !== 'sai') return
      if (e.key === 'ArrowUp') { e.preventDefault(); changeSpeed(+0.25) }
      if (e.key === 'ArrowDown') { e.preventDefault(); changeSpeed(-0.25) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, changeSpeed])

  /* ====================================== per-frame tick (TAWAF) ===== */
  const tickTawaf = useCallback((dt) => {
    if (phase !== 'tawaf' || !tawafStartedRef.current) return
    if (movingRef.current) {
      thetaRef.current += TAWAF_SPEED * tawafSpeedRef.current * dt   // avatar moves NON-STOP while walking
      gaitRef.current += dt * 8
    }
    const theta = thetaRef.current
    const completed = Math.floor(theta / TWO_PI)

    // round just completed?
    if (completed > roundsRef.current) {
      const nr = completed
      // ---- did the trainee pay Salam for the round just finished? ----
      // The round that just ended is the one whose Istilam should have been
      // made at its start. If istilamThisRound is still false, Salam was missed.
      if (nr <= TOTAL_ROUNDS && !flags.current.istilamThisRound) {
        addError('E-SALAM', `You forgot to pay Salam to Hajar al-Aswad for round ${nr}! Every round must begin with Istilam (✋💋) at the green light. Press Istilam before walking.`)
      }
      roundsRef.current = nr
      setRounds(Math.min(nr, 99))
      flags.current.istilamThisRound = false // reset for the next round
      if (nr <= TOTAL_ROUNDS) {
        pushToast('success', `✅ Round ${nr}/7 — you passed the Hajar al-Aswad line. ${nr < TOTAL_ROUNDS ? 'Pay Salam, then Walk for the next round.' : 'Tawaf reaches 7 — press “End Tawaf” to finish.'}`)
      }
    }

    // E-overrun: trainee let the avatar run into the 8th round.
    // Per supervisor: only flag once the 8th round is COMPLETED.
    if (roundsRef.current >= TOTAL_ROUNDS + 1 && !flags.current.overrunWarned) {
      flags.current.overrunWarned = true
      addError('E-OVER', 'You did the 8th round! Tawaf is exactly 7 rounds — you should have pressed “End Tawaf” after the 7th. Avatar keeps going until YOU stop it.')
    }

    const within = roundsRef.current >= TOTAL_ROUNDS ? 100 : Math.floor(((theta % TWO_PI) / TWO_PI) * 100)
    setProgress((p) => (p === within ? p : within))
  }, [phase, addError, pushToast])

  /* ======================================== per-frame tick (SAI) ===== */
  const tickSai = useCallback((dt) => {
    if (phase !== 'sai' || !saiStartedRef.current) return
    if (prayingRef.current) return // frozen during prayer

    const inGreen = saiTRef.current > GREEN_FROM && saiTRef.current < GREEN_TO

    if (movingRef.current) {
      // avatar moves NON-STOP; speed multiplier only matters where trainee set it
      let mult = speedRef.current
      // outside the green zone, speed reverts to normal automatically
      if (!inGreen) mult = 1
      const sp = SAI_BASE * mult
      saiTRef.current += sp * dt * saiDirRef.current
      gaitRef.current += dt * (mult > 1.2 ? 13 : 7)

      // region tracking for HUD
      const reg = saiTRef.current < 0.12 ? 'safa' : saiTRef.current > 0.88 ? 'marwah' : 'track'
      setSaiRegion((r) => (r === reg ? r : reg))

      // E6/E7 green-zone speed correctness (men jog, women walk)
      if (inGreen && flags.current.greenWarnedDir !== saiDirRef.current) {
        if (gender === 'male' && speedRef.current <= 1.05) {
          flags.current.greenWarnedDir = saiDirRef.current
          addError('E6', 'Men should JOG (Ramal) between the green lights — speed up the avatar here (Speed Up / ↑). You only walked.')
        } else if (gender === 'female' && speedRef.current > 1.2) {
          flags.current.greenWarnedDir = saiDirRef.current
          addError('E7', 'Women do not run in Sa\u2019i — only walk. Slow the avatar down (Slow Down / ↓).')
        }
      }
      if (!inGreen) flags.current.greenWarnedDir = 0

      // reached an end -> count a lap; AVATAR DOES NOT STOP (bounces & continues)
      if (saiTRef.current >= 1 || saiTRef.current <= 0) {
        saiTRef.current = Math.max(0, Math.min(1, saiTRef.current))
        const nl = lapsRef.current + 1
        lapsRef.current = nl
        setLaps(Math.min(nl, 99))
        const reachedMarwah = saiDirRef.current > 0
        saiDirRef.current *= -1
        setSaiRegion(reachedMarwah ? 'marwah' : 'safa')
        if (nl <= TOTAL_LAPS) {
          pushToast(reachedMarwah ? 'info' : 'info',
            `Lap ${nl}/7 — reached ${reachedMarwah ? 'Marwah' : 'Safa'}. Stop & Pray here, or the avatar will keep going.`)
        }
      }
    }

    // E-overrun sai: 8th lap completed without trainee ending
    if (lapsRef.current >= TOTAL_LAPS + 1 && !flags.current.saiOverWarned) {
      flags.current.saiOverWarned = true
      addError('E-OVER', 'You did an 8th lap! Sa\u2019i is exactly 7 laps (Safa→Marwah = 1 … ending at Marwah). You should have pressed “End Sa\u2019i” after lap 7.')
    }
  }, [phase, gender, addError, pushToast])

  return {
    phase, gender, step, steps: STEPS,
    tawafStarted, rounds, istilamCount, progress,
    saiStarted, laps, saiRegion, speedPct, moving, praying,
    errors, errorLog, toasts,
    totalRounds: TOTAL_ROUNDS, totalLaps: TOTAL_LAPS,
    greenFrom: GREEN_FROM, greenTo: GREEN_TO,
    thetaRef, istilamAnimRef, saiTRef, saiDirRef, gaitRef,
    begin, chooseGender, confirmNiyyah,
    startTawaf, doIstilam, walkTawaf, stopTawaf, endTawaf,
    prayNawafil, enterSai,
    startSai, walkSai, stopSai, changeSpeed, prayAtHill, endSai, saiAction,
    changeTawafSpeed, tawafSpeedPct,
    drinkZamzam, cutHair, skipHair, reset, exportCSV,
    tickTawaf, tickSai,
  }
}
