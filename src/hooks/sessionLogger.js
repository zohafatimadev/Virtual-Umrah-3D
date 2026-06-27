/*
 * sessionLogger.js — records one row per trainee ACTION for the
 * Imitation Learning dataset.
 *
 * Each row is a (state → action → result) tuple: the simulation state at the
 * moment an action was taken, the action itself, and whether it was correct.
 * Correct demonstrations are the imitation targets; incorrect ones are kept
 * as labelled test/analysis data. Runs are auto-tagged "correct" or
 * "had_errors" so datasets can be split for behavioural cloning.
 *
 * Usage (inside the hook):
 *   logger.start(gender)            // begin a run
 *   logger.log(action, result, st)  // append a row
 *   logger.finish()                 // returns {csv, filename, label, rows}
 */

const COLUMNS = [
  'run_id',
  'scenario_label',   // auto: 'correct' | 'had_errors'
  'step_index',
  'timestamp_ms',
  'elapsed_ms',
  'gender',
  'phase',
  'scene',            // tawaf | sai
  'action',           // Istilam, Walk, Stop, SpeedUp, SlowDown, Pray, EndTawaf, ...
  'result',           // ok | error
  'error_code',       // E1.. or '' if none
  'pos_x',
  'pos_z',
  'angle_deg',        // tawaf only
  'sai_progress',     // sai only (0..1)
  'region',           // SAFA | MARWAH | track | ''
  'direction',        // ccw | safa->marwah | marwah->safa | ''
  'round',
  'lap',
  'istilam_paid_this_round',
  'speed_pct',
  'moving',
  'errors_so_far',
]

function csvEscape(v) {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

class SessionLogger {
  constructor() {
    this.rows = []
    this.runId = null
    this.startTs = 0
    this.stepIndex = 0
    this.gender = null
    this.hadError = false
  }

  start(gender) {
    this.runId = 'run_' + new Date().toISOString().replace(/[:.]/g, '-')
    this.startTs = performance.now()
    this.stepIndex = 0
    this.rows = []
    this.gender = gender
    this.hadError = false
  }

  // action: string, result: {ok:bool, code?:string}, st: window.__umrahState-like
  log(action, result, st = {}) {
    if (!this.runId) this.start(st.gender)
    const now = performance.now()
    const isError = result && result.ok === false
    if (isError) this.hadError = true

    this.rows.push({
      run_id: this.runId,
      scenario_label: '', // filled at finish()
      step_index: this.stepIndex++,
      timestamp_ms: Math.round(now),
      elapsed_ms: Math.round(now - this.startTs),
      gender: st.gender ?? this.gender ?? '',
      phase: st.phase ?? '',
      scene: st.scene ?? '',
      action,
      result: isError ? 'error' : 'ok',
      error_code: isError ? (result.code ?? '') : '',
      pos_x: st.x ?? '',
      pos_z: st.z ?? '',
      angle_deg: st.angleNum ?? '',
      sai_progress: st.progressNum ?? '',
      region: st.region ?? '',
      direction: st.directionTag ?? '',
      round: st.round ?? '',
      lap: st.lap ?? '',
      istilam_paid_this_round: st.istilamPaid ?? '',
      speed_pct: st.speedPct ?? '',
      moving: st.moving ?? '',
      errors_so_far: st.errors ?? '',
    })
  }

  get count() { return this.rows.length }

  // returns {csv, filename, label, rows} and tags every row with the label
  finish() {
    const label = this.hadError ? 'had_errors' : 'correct'
    for (const r of this.rows) r.scenario_label = label
    const header = COLUMNS.join(',')
    const body = this.rows
      .map((r) => COLUMNS.map((c) => csvEscape(r[c])).join(','))
      .join('\n')
    const csv = header + '\n' + body + '\n'
    const filename = `umrah_${label}_${this.runId}.csv`
    return { csv, filename, label, rows: this.rows.length }
  }
}

export function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export { COLUMNS }
export default new SessionLogger()
