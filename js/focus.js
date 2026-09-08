// JARVIS Focus Mode Controller & Study Verification
(function () {
  'use strict';

  let _timerInterval = null;

  const Focus = {
    init() {
      // Listen to active session changes
      State.on('session:changed', (session) => {
        if (session) {
          this.startTicker();
          this.renderFocusHUD();
        } else {
          this.stopTicker();
          this.hideFocusHUD();
        }
      });
    },

    startTicker() {
      if (_timerInterval) clearInterval(_timerInterval);

      _timerInterval = setInterval(() => {
        const session = State.data.activeSession;
        if (!session || session.isPaused) return;

        const effectiveSpeed = State.data.settings.testSimulationSpeed || 1;
        const deltaSeconds = 1 * effectiveSpeed;

        session.remainingSeconds = Math.max(0, session.remainingSeconds - deltaSeconds);
        session.accumulatedSeconds += deltaSeconds;

        // Auto-save session state every 5 seconds
        if (Math.floor(session.accumulatedSeconds) % 5 === 0) {
          Storage.set('ACTIVE_SESSION', session);
        }

        this.renderFocusHUD();

        // Check if countdown hit zero
        if (session.remainingSeconds <= 0) {
          Voice.playWarning();
          Voice.speak(`Scheduled duration for ${session.missionName} has elapsed. Please verify your completed output.`, 'HIGH');
          this.pauseTimer();
          this.openVerificationModal();
        }
      }, 1000);
    },

    stopTicker() {
      if (_timerInterval) {
        clearInterval(_timerInterval);
        _timerInterval = null;
      }
    },

    pauseTimer() {
      if (State.data.activeSession) {
        State.data.activeSession.isPaused = true;
        State.setActiveSession(State.data.activeSession);
        Voice.playClick();
        this.renderFocusHUD();
      }
    },

    resumeTimer() {
      if (State.data.activeSession) {
        State.data.activeSession.isPaused = false;
        State.setActiveSession(State.data.activeSession);
        Voice.playClick();
        this.renderFocusHUD();
      }
    },

    openFocusScreen() {
      const container = Utils.$('#focus-overlay');
      if (container) {
        container.classList.remove('hidden');
        document.body.classList.add('in-focus-mode');
        this.renderFocusHUD();
      }
    },

    hideFocusHUD() {
      const container = Utils.$('#focus-overlay');
      if (container) {
        container.classList.add('hidden');
        document.body.classList.remove('in-focus-mode');
      }
    },

    renderFocusHUD() {
      const session = State.data.activeSession;
      if (!session) return;

      const titleEl = Utils.$('#focus-mission-title');
      const categoryEl = Utils.$('#focus-mission-category');
      const timerEl = Utils.$('#focus-countdown');
      const progressEl = Utils.$('#focus-progress-fill');
      const targetLabelEl = Utils.$('#focus-target-label');
      const pauseBtn = Utils.$('#btn-focus-pause');

      if (titleEl) titleEl.textContent = session.missionName;
      if (categoryEl) categoryEl.textContent = `${session.category.toUpperCase()} MISSION // FOCUS ACTIVE`;
      if (timerEl) timerEl.textContent = Utils.formatCountdown(session.remainingSeconds);

      const totalSec = session.durationSeconds || 1;
      const progressPercent = Math.min(100, Math.max(0, Math.round(((totalSec - session.remainingSeconds) / totalSec) * 100)));
      if (progressEl) progressEl.style.width = `${progressPercent}%`;

      if (targetLabelEl && session.target) {
        targetLabelEl.textContent = `TARGET: ${session.target.amount} ${session.target.unit || session.target.type}`;
      }

      if (pauseBtn) {
        pauseBtn.innerHTML = session.isPaused
          ? '<i class="fa-solid fa-play"></i> RESUME'
          : '<i class="fa-solid fa-pause"></i> PAUSE';
      }
    },

    openVerificationModal() {
      const modal = Utils.$('#modal-verification');
      const session = State.data.activeSession;
      if (!modal || !session) return;

      const targetDesc = Utils.$('#verify-target-description');
      const inputAchieved = Utils.$('#verify-achieved-input');
      const inputNotes = Utils.$('#verify-notes-input');

      if (targetDesc) {
        targetDesc.textContent = `Planned Target: ${session.target.amount} ${session.target.unit || session.target.type} in ${Math.round(session.durationSeconds / 60)} minutes`;
      }
      if (inputAchieved) {
        inputAchieved.value = session.target.amount;
        inputAchieved.max = session.target.amount * 3;
      }
      if (inputNotes) inputNotes.value = '';

      modal.classList.remove('hidden');
    },

    submitVerification(statusType = 'COMPLETED') {
      const session = State.data.activeSession;
      if (!session) return;

      const inputAchieved = Utils.$('#verify-achieved-input');
      const inputNotes = Utils.$('#verify-notes-input');
      const modal = Utils.$('#modal-verification');

      let achieved = session.target.amount;
      if (statusType === 'FAILED') {
        achieved = 0;
      } else if (inputAchieved && inputAchieved.value !== '') {
        achieved = Math.max(0, Number(inputAchieved.value));
      }

      const notes = inputNotes ? inputNotes.value.trim() : '';

      Mission.completeMission(session.missionId, {
        targetAchieved: achieved,
        notes: notes
      });

      if (modal) modal.classList.add('hidden');
      this.hideFocusHUD();
    }
  };

  window.Focus = Focus;
})();
