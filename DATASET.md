# Umrah Interaction Dataset — Schema & Methodology

This document describes the CSV data produced by the Virtual Umrah Training System
for the **Imitation Learning** component of the thesis.

## How data is generated

Each time a trainee performs an Umrah run, every **action** they command (button
press or arrow key) is recorded as one row capturing the simulation **state** at
that instant, the **action** taken, and whether it was **correct**. When a run
finishes, the file is auto-downloaded and auto-labelled:

- `correct`     — the run contained **no** errors (a clean demonstration)
- `had_errors`  — the run contained one or more errors

A manual **Download CSV** button is also available at any time.

## Recommended workflow for the dataset

1. Collect many runs across **different scenarios** (correct runs, runs with
   specific mistakes, male vs. female, fast vs. slow, etc.). Each run = one CSV.
2. Concatenate all per-run CSVs into one **master dataset** (they share identical
   columns, so a simple append works).
3. Split the data:
   - **Training set** = `scenario_label == correct` rows → the demonstrations the
     imitation-learning model (behavioural cloning) learns to copy.
   - **Test / analysis set** = `had_errors` rows → used to evaluate the model and
     to study human error patterns.
4. Train a behavioural-cloning model: input = state columns, target = `action`.
5. Compare the trained agent's accuracy against novice human trainees on held-out
   scenarios.

> Note: the model is trained on **correct** demonstrations only — it is never
> taught to imitate mistakes. Incorrect runs are kept as labelled evaluation data.

## Column dictionary

| Column | Meaning |
|--------|---------|
| run_id | Unique id per Umrah run (timestamped) |
| scenario_label | Auto: `correct` or `had_errors` |
| step_index | 0-based action order within the run |
| timestamp_ms | High-resolution clock at the action |
| elapsed_ms | Milliseconds since the run started |
| gender | `male` / `female` (affects Sa'i jog rule) |
| phase | welcome / niyyah / tawaf / afterTawaf / toSai / sai / zamzam / hair |
| scene | `tawaf` or `sai` |
| action | Istilam, Walk, Stop, SpeedUp, SlowDown, PrayAtHill, StartTawaf, EndTawaf, StartSai, EndSai, DrinkZamzam, CutHair, … |
| result | `ok` or `error` |
| error_code | E1…E9 / E-SALAM / E-OVER, or empty |
| pos_x, pos_z | Avatar world coordinates |
| angle_deg | Tawaf angle (0° = Hajar al-Aswad line) |
| sai_progress | Sa'i track position 0 (Safa) … 1 (Marwah) |
| region | SAFA / MARWAH / track |
| direction | ccw / safa->marwah / marwah->safa |
| round | Current Tawaf round (1–7) |
| lap | Completed Sa'i laps (0–7) |
| istilam_paid_this_round | 1 if Salam already paid this round, else 0 |
| speed_pct | Avatar speed as % of normal walk |
| moving | 1 if avatar moving, else 0 |
| errors_so_far | Cumulative error count at this step |

## Suggested feature/label split for behavioural cloning

- **Features (X):** gender, scene, phase, angle_deg / sai_progress, region,
  direction, round, lap, istilam_paid_this_round, speed_pct, moving
- **Label (y):** action

Position (`pos_x`, `pos_z`) can be included as features too; `result`,
`error_code`, and `errors_so_far` are useful for evaluation and error-pattern
analysis rather than as cloning inputs.
