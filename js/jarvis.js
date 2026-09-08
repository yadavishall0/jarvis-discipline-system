// JARVIS Intelligence Console & Natural Deterministic Command Interpreter
(function () {
  'use strict';

  const JARVIS = {
    _commandHistory: [],
    _recognition: null,
    _isListening: false,

    init() {
      // Setup Web Speech Recognition if supported
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this._recognition = new SpeechRecognition();
        this._recognition.continuous = false;
        this._recognition.interimResults = false;
        this._recognition.lang = 'en-US';

        this._recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          this.executeCommand(transcript, 'VOICE');
        };

        this._recognition.onerror = (event) => {
          console.warn('Speech recognition error:', event.error);
          this._isListening = false;
          this._updateMicUI();
        };

        this._recognition.onend = () => {
          this._isListening = false;
          this._updateMicUI();
        };
      }
    },

    toggleListening() {
      if (!this._recognition) {
        this.logOutput('SYSTEM', 'Voice recognition not available on this browser. Use command input.');
        return;
      }

      if (this._isListening) {
        this._recognition.stop();
        this._isListening = false;
      } else {
        try {
          this._recognition.start();
          this._isListening = true;
          Voice.playClick();
        } catch (e) {
          console.warn(e);
        }
      }
      this._updateMicUI();
    },

    _updateMicUI() {
      const micBtn = Utils.$('#btn-jarvis-mic');
      if (micBtn) {
        micBtn.classList.toggle('active-listening', this._isListening);
      }
    },

    // Deterministic Command Parser
    parseCommand(rawText) {
      const text = rawText.trim().toLowerCase();

      // Current Mission
      if (text.includes('current') || text.includes('what should i be doing') || text.includes('what am i doing') || text === 'now') {
        const ctx = Mission.getCurrentMissionContext();
        if (ctx.activeMission) {
          const state = State.data.todayState.missions[ctx.activeMission.id] || {};
          return {
            reply: `Current mission is ${ctx.activeMission.name} (${ctx.activeMission.startTime}–${ctx.activeMission.endTime}). Status: ${state.status || 'PLANNED'}. ${ctx.lateMinutes > 0 ? `You are ${ctx.lateMinutes} minutes late.` : 'On schedule.'}`,
            action: null
          };
        }
        return { reply: 'No active mission scheduled at this moment. Review upcoming schedule.', action: null };
      }

      // Next Mission
      if (text.includes('next') || text.includes('what comes next')) {
        const ctx = Mission.getCurrentMissionContext();
        if (ctx.upcomingMissions.length > 0) {
          const next = ctx.upcomingMissions[0];
          return {
            reply: `Your next mission is ${next.name} at ${next.startTime} (${next.category}). Duration: ${next.duration} minutes.`,
            action: null
          };
        }
        return { reply: 'No further missions scheduled for today.', action: null };
      }

      // Schedule / Routine
      if (text.includes('schedule') || text.includes('routine') || text.includes('timeline')) {
        const schedule = Routine.getTodaySchedule();
        const summary = schedule.map(m => `${m.startTime} ${m.name}`).join(' | ');
        return {
          reply: `Today's schedule contains ${schedule.length} missions: ${summary}`,
          action: () => App.navigateTo('screen-routine')
        };
      }

      // Start Mission
      if (text.startsWith('start') || text.includes('begin mission')) {
        const ctx = Mission.getCurrentMissionContext();
        if (ctx.activeMission) {
          Mission.startMission(ctx.activeMission.id);
          Focus.openFocusScreen();
          return {
            reply: `Initiating ${ctx.activeMission.name}. Focus mode active.`,
            action: null
          };
        }
        return { reply: 'No pending mission found to start.', action: null };
      }

      // Delay Mission
      if (text.startsWith('delay') || text.includes('snooze') || text.includes('postpone')) {
        const ctx = Mission.getCurrentMissionContext();
        if (ctx.activeMission) {
          let mins = 5;
          const match = text.match(/\d+/);
          if (match) mins = parseInt(match[0], 10);
          const res = Mission.delayMission(ctx.activeMission.id, mins);
          if (res.success) {
            return { reply: `Mission delayed by ${mins} minutes. Total delay: ${res.totalDelayed}m.`, action: null };
          }
          return { reply: res.message || 'Delay rejected by system rules.', action: null };
        }
        return { reply: 'No active mission eligible for delay.', action: null };
      }

      // Skip Mission
      if (text.startsWith('skip') || text.includes('skip mission')) {
        const ctx = Mission.getCurrentMissionContext();
        if (ctx.activeMission) {
          return {
            reply: 'Skipping requires explicit authorization. Opening skip modal.',
            action: () => App.openSkipModal(ctx.activeMission.id)
          };
        }
        return { reply: 'No active mission to skip.', action: null };
      }

      // Recovery Debt
      if (text.includes('recovery') || text.includes('debt')) {
        const debt = State.data.recoveryDebt;
        if (debt === 0) {
          return { reply: 'System records show ZERO recovery debt. Operational integrity optimal.', action: null };
        }
        return {
          reply: `You currently have ${debt} minutes of accumulated recovery debt. Would you like me to schedule a recovery slot?`,
          action: () => App.navigateTo('screen-dashboard')
        };
      }

      // Discipline Score
      if (text.includes('discipline') || text.includes('score') || text.includes('rating')) {
        const disc = Discipline.calculateScore();
        return {
          reply: `Current Discipline Score is ${disc.score}/100. On-Time rate: ${disc.onTimeRate}%. Completion rate: ${disc.completionRate}%.`,
          action: () => App.navigateTo('screen-analytics')
        };
      }

      // Study Progress / Remaining
      if (text.includes('study') || text.includes('how much study remains') || text.includes('progress')) {
        const planned = Routine.getPlannedStudyMinutes();
        const disc = Discipline.calculateScore();
        return {
          reply: `Today requires ${Utils.formatDuration(planned)} of deep study. Current completion: ${disc.completionRate}%.`,
          action: null
        };
      }

      // GATE Progress
      if (text.includes('gate') || text.includes('exam')) {
        const gateInfo = Gate.calculateReadiness();
        const days = Gate.getDaysUntilExam();
        return {
          reply: `GATE Readiness is currently ${gateInfo.percent}%. ${gateInfo.solvedQuestions} PYQs completed. ${days} days remain until target examination.`,
          action: () => App.navigateTo('screen-gate')
        };
      }

      // Focus Mode
      if (text.includes('focus') || text.includes('enter focus')) {
        Focus.openFocusScreen();
        return { reply: 'Focus mode interface engaged.', action: null };
      }

      // Daily Report
      if (text.includes('report') || text.includes('accountability')) {
        const report = Analytics.generateDailyReport();
        return {
          reply: `Daily Report: ${report.actualHours} study completed. Discipline score: ${report.disciplineScore}. Assessment: "${report.assessment}"`,
          action: () => App.navigateTo('screen-analytics')
        };
      }

      // Emergency Override
      if (text.includes('emergency override')) {
        return {
          reply: 'Opening Emergency Override protocol.',
          action: () => App.openEmergencyModal()
        };
      }

      // Help / Commands
      return {
        reply: `Command not recognized. Try: "current mission", "what's next", "start mission", "delay 5", "recovery debt", "discipline score", "gate progress", or "today's report".`,
        action: null
      };
    },

    executeCommand(commandText, source = 'TEXT') {
      if (!commandText || !commandText.trim()) return;

      this.logOutput('USER', commandText);
      const res = this.parseCommand(commandText);

      this.logOutput('JARVIS', res.reply);
      Voice.speak(res.reply, 'HIGH');

      if (res.action && typeof res.action === 'function') {
        res.action();
      }
    },

    logOutput(sender, message) {
      const logContainer = Utils.$('#jarvis-console-feed');
      if (!logContainer) return;

      const timeStr = Utils.minutesToTimeString(
        Utils.getEffectiveDate().getHours() * 60 + Utils.getEffectiveDate().getMinutes()
      );

      const entry = document.createElement('div');
      entry.className = `console-entry entry-${sender.toLowerCase()}`;
      entry.innerHTML = `
        <div class="console-entry-header">
          <span class="console-tag tag-${sender.toLowerCase()}">${sender}</span>
          <span class="console-timestamp">${timeStr}</span>
        </div>
        <div class="console-entry-body">${message}</div>
      `;

      logContainer.appendChild(entry);
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  };

  window.JARVIS = JARVIS;
})();
