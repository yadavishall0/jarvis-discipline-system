# JARVIS — Personal Discipline System

> **"What should I be doing right now?"**
> **"Am I actually following my routine?"**

A futuristic, tactical personal discipline operating system inspired by JARVIS, combined with military mission-control standards and a strict personal coach.

This is a standalone, local-first Progressive Web Application (PWA) with complete offline support, escalating 5-level accountability, recovery scheduling, honest output verification, and GATE exam mastery.

---

## ⚡ Core Systems

1. **Mission Control Dashboard**
   - Live JARVIS Core status, military countdown timer, dynamic progress bar, and immediate mission status (`PLANNED`, `ACTIVE`, `LATE`, `DELAYED`, `COMPLETED`, `SKIPPED`, `MISSED`, `RECOVERY`).
   - Action controls: `START MISSION`, `COMPLETE`, `PAUSE`, `DELAY`, `SKIP`, `ABANDON`.

2. **5-Level Escalating Enforcement Protocol**
   - **Level 1 (0 min)**: Mission start announcement via notifications & speech.
   - **Level 2 (5 min late)**: Delay Detected warning banner + audio alert.
   - **Level 3 (10 min late)**: Discipline Warning + lost study time announcement + score penalty.
   - **Level 4 (20 min late)**: Critical Routine Violation + pulsing HUD warning + automatic generation of recovery debt.
   - **Level 5 (30+ min late)**: Mission Failure threshold reached + marked `MISSED` + schedule recalculation triggered.
   - Modes: `NORMAL`, `STRICT`, `HARDCORE`.

3. **Recovery Debt Engine**
   - Any skipped, abandoned, or missed study/GATE mission generates **Recovery Debt** (in minutes).
   - Scans today's schedule for open slots without compromising essential sleep or meal protocols.
   - One-click `INSERT RECOVERY SLOT` into the active routine.

4. **Focus Mode & Honest Study Verification**
   - Full-screen distraction-free HUD with circular countdown ring and target checklist.
   - Distinguishes **TIME INVESTED** from **WORK COMPLETED**.
   - Output verification form tracks actual questions solved, lectures completed, topics covered, and calculates completion percentage.

5. **GATE Preparation Section**
   - Hierarchical syllabus tracking: Subjects &rarr; Topics &rarr; Subtopics.
   - Pre-loaded with Engineering Mathematics, Geotechnical Engineering, Structural, and Environmental.
   - Real-time exam countdown and PYQ tracking.

6. **JARVIS AI Console & Natural Commands**
   - Voice and text command parser (zero cloud API dependency):
     - *"What's next?"*
     - *"Current mission"*
     - *"Start mission"*
     - *"Delay 5 minutes"*
     - *"How late am I?"*
     - *"Recovery debt"*
     - *"Discipline score"*
     - *"GATE progress"*
     - *"Daily report"*
     - *"Emergency override"*

7. **Discipline Scoring Engine (0–100)**
   - Transparent mathematical scoring:
     - On-time starts (25%)
     - Duration completion (35%)
     - Verified target output (20%)
     - Schedule adherence baseline (20%)
     - Deductions for late starts, delays, skips, and misses.
     - Recovery bonus for zero debt balance.

8. **Resilient Time & App Restart Recovery**
   - Recovers seamlessly if closed or interrupted during an active session (`MISSION INTERRUPTED` modal with options to Resume, Complete, or Abandon).
   - Automatic midnight day-rollover with archived performance reports.

---

## 📱 How to Run & Install on Mobile

### 1. Local Testing on WiFi (Instant)
Run the built-in zero-dependency server:
```bash
node server.js
```
The terminal will display your local IP (e.g., `http://192.168.1.X:8080`). Open this link in Chrome on your phone to test the interface immediately!

### 2. Install as PWA on Mobile (Recommended)
1. Open the hosted URL or local IP in Chrome on Android.
2. Tap the browser menu (**⋮**) and select **"Add to Home screen"** or **"Install App"**.
3. JARVIS installs as a standalone full-screen app with the official HUD icon in your app drawer!

### 3. Generate Android APK File
There are two automated methods:

#### Method A: Automated GitHub Deployment & PWABuilder
1. Create `config.json` in the root folder with:
   ```json
   {
     "username": "your-github-username",
     "token": "ghp_your_personal_access_token"
   }
   ```
2. Run:
   ```bash
   node deploy_and_build_apk.js
   ```
3. Your app is published to GitHub Pages, and you can download the signed `.apk` package directly from [PWABuilder](https://www.pwabuilder.com) using your live URL.

#### Method B: GitHub Actions CI/CD Workflow
The project includes `.github/workflows/build-apk.yml`. Pushing to your GitHub repository will automatically build and publish the installable Android APK in GitHub Actions artifacts!

---

## 🧪 Developer / Test Simulation Mode

To verify all 18 test scenarios quickly without waiting in real time:
1. Navigate to **CONFIG** (Settings tab).
2. Scroll to **Developer / Test Scenario Simulator**.
3. Accelerate time (1x, 10x, 60x where 1 sec = 1 min).
4. Use **+5 MINS**, **+10 MINS**, simulate Level 2/4 escalation, or test **Simulate App Restart**.
