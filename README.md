# 🕋 Virtual Umrah Training System — v4 (Trainee-Controlled)

**Zoha Fatima — FA24-RCS-015 | COMSATS University Islamabad, Sahiwal**
Thesis: *An Interactive Virtual Environment for Training Pilgrims in Umrah Rituals with Automated Error Detection and Feedback*

---

## Core philosophy (per supervisor's guidance)

**We are training the PILGRIM, not the avatar.** The 3D avatar is a body with **zero knowledge**. It never decides anything on its own:

- It does **not** stop after 7 rounds or 7 laps — it keeps moving until the trainee stops it.
- It does **not** slow down in the green zone on its own — the trainee controls the speed.
- It does **not** know Safa from Marwah, or where Tawaf begins.

The **trainee (the real human)** is the brain. Every action — start, stop, Salam, speed up, pray, end, haircut — is a command the trainee issues by **button or arrow key**. The system silently watches each command, decides if it was correct, and **logs every mistake**. At the end it shows the full mistake summary. This is what makes it *training*, not a video.

---

## How the trainee controls the avatar

### Tawaf
- **▶ Start Tawaf** — must be pressed in line with Hajar al-Aswad (the green light). Pressed elsewhere → mistake logged (but not blocked).
- **✋💋 Istilam** — the trainee pays Salam each round; only valid at the Black Stone line. There is no automatic Salam.
- **🚶 Walk / ⏸ Stop** — the avatar moves **non-stop** while walking and only halts when the trainee presses Stop.
- **🏁 End Tawaf** — correct only after 7 rounds. Pressed early → "rounds not complete" mistake. If the trainee lets the avatar run a full **8th round**, that is logged as a mistake (the system stays silent *during* the 7th→8th in case the trainee is about to stop/exit, exactly as advised).

### Sa'i (longer, doubled track)
- The corridor is long with **two lanes** — a GO lane (Safa→Marwah) and a RETURN lane (Marwah→Safa).
- **Safa** (green-domed hill) and **Marwah** (terracotta-arched hill) look clearly different so the trainee can tell them apart.
- **▶ Start Sa‘i** — valid **only on Safa**. Pressed on Marwah → "you cannot start from here, Sa‘i begins at Safa" mistake.
- **🚶 Walk / ⏸ Stop** — avatar moves non-stop until stopped.
- **⏩ Speed Up / ⏪ Slow Down** *and* **↑ / ↓ arrow keys** — the trainee speeds the avatar through the **green zone**. Men must jog there (else mistake E6); women must keep walking (else mistake E7). **Outside the green zone the speed reverts to normal automatically.**
- **🤲 Stop & Pray** — valid only at a hill; it physically holds the avatar ~3 seconds (the prayer). If the trainee lets the avatar pass a hill without praying, the avatar just keeps going (it never stops itself) and the trainee learns to stop at each end.
- **🏁 End Sa‘i** — correct only after 7 laps (Safa→Marwah = 1 … ending at Marwah). Early → mistake; an **8th lap** → mistake.

### Final steps
- **💧 Drink Zamzam** → **✂️ Cut hair** → **عُمْرَة مُبَارَك / Umrah Mubarak**.
- A **Skip hair** option exists so the trainee can see that **not cutting hair is logged as a mistake** (Halq/Taqsir is required to exit Ihram).

---

## Prominent trainee avatar
In both scenes the trainee's avatar is **larger, spotlit, and topped with a floating green beacon and a “YOU” tag**, so it is never confused with the surrounding crowd of male and female pilgrims.

## Error codes
| Code | Meaning |
|------|---------|
| E1 | Started Tawaf / acted away from the Hajar al-Aswad line |
| E2 | Istilam at the wrong place |
| E3 | Ended Tawaf before 7 rounds |
| E-OVER | Did an 8th round / 8th lap |
| E4 | Started Sa‘i somewhere other than Safa |
| E5 | Ended Sa‘i before 7 laps |
| E6 | Man did not jog in the green zone |
| E7 | Woman ran in Sa‘i |
| E8 | Tried to pray in the middle of the track (not at a hill) |
| E9 | Did not cut hair |

## Tech stack
React 18 · Three.js 0.160 · React Three Fiber · drei · Vite 5 · CSS Modules. All 3D from primitives + procedural textures — no downloads.

## Run
```bash
npm install
npm run dev      # http://localhost:5173
```

---
*Supervisor: Dr. Muhammad Shoaib | Co-Supervisor: Dr. Javed Ferzund*


## v5 additions
- **Missed-Salam error (E-SALAM):** if the trainee walks a full round without pressing Istilam, the system now detects it the moment the round completes and logs a counted mistake.
- **🎥 Cinematic follow-camera:** toggle (top-right) makes the camera smoothly track the trainee avatar — around the Kaaba in Tawaf, and along the corridor following the avatar to Safa and to Marwah in Sa'i. Turn it OFF to return to free orbit/zoom.
- **📍 Avatar Location panel (live):** a telemetry readout (bottom-right) showing the avatar's exact x/z, angle or track-progress, region (Safa/Marwah/track), direction, rounds/laps, speed, state and error count. The same data is also published to `window.__umrahState` every frame — a ready-made feature vector for the planned Machine Learning / Deep Learning component.
