// JARVIS Central Reactive State Store
(function () {
  'use strict';

  const listeners = {};

  const State = {
    // Current in-memory state
    data: {
      settings: {},
      routine: [],
      gateSyllabus: [],
      recoveryDebt: 0,
      todayState: {
        date: '',
        missions: {}, // key: missionId, value: { status: 'PLANNED'|'ACTIVE'|'COMPLETED'|'LATE'|'DELAYED'|'SKIPPED'|'MISSED'|'RECOVERY', actualStart, actualEnd, actualDuration, delays: [], skipReason: '', targetResult: null }
        dailyScore: 100,
        energyLevel: 'High',
        emergencyOverride: false
      },
      activeSession: null, // { missionId, startedAt, scheduledEnd, remainingSeconds, isPaused, accumulatedSeconds, target, notes }
      escalation: {
        level: 0, // 0 = none, 1 = start, 2 = 5m late, 3 = 10m late, 4 = 20m critical, 5 = 30m failure
        missionId: null,
        lateMinutes: 0,
        message: ''
      },
      interruptedSession: null
    },

    // Event Emitter
    on(event, callback) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
      return () => this.off(event, callback);
    },

    off(event, callback) {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter(cb => cb !== callback);
    },

    emit(event, payload) {
      if (listeners[event]) {
        listeners[event].forEach(cb => {
          try {
            cb(payload, this.data);
          } catch (err) {
            console.error(`Error in event listener for ${event}:`, err);
          }
        });
      }
    },

    // Initializer
    init() {
      // 1. Load Settings
      this.data.settings = Storage.get('SETTINGS', window.DEFAULT_SETTINGS || {});
      
      // 2. Load Routine
      this.data.routine = Storage.get('ROUTINE', window.DEFAULT_ROUTINE || []);
      
      // 3. Load GATE Syllabus
      this.data.gateSyllabus = Storage.get('GATE_SYLLABUS', window.DEFAULT_GATE_SYLLABUS || []);
      
      // 4. Load Recovery Debt
      this.data.recoveryDebt = Storage.get('RECOVERY_DEBT', 0);

      // 5. Load Active Session if interrupted
      const savedActiveSession = Storage.get('ACTIVE_SESSION', null);
      if (savedActiveSession) {
        // App was closed or refreshed while a session was running!
        this.data.interruptedSession = savedActiveSession;
      }

      // 6. Check Today State
      const todayStr = Utils.getTodayDateString();
      let today = Storage.get('TODAY_STATE', null);
      if (!today || today.date !== todayStr) {
        today = {
          date: todayStr,
          missions: {},
          dailyScore: 100,
          energyLevel: this.data.settings.energyLevel || 'High',
          emergencyOverride: false
        };
        Storage.set('TODAY_STATE', today);
      }
      this.data.todayState = today;

      this.emit('state:initialized', this.data);
    },

    // State Mutators
    updateSettings(newSettings) {
      this.data.settings = { ...this.data.settings, ...newSettings };
      Storage.set('SETTINGS', this.data.settings);
      this.emit('settings:updated', this.data.settings);
    },

    updateRoutine(newRoutine) {
      this.data.routine = [...newRoutine];
      Storage.set('ROUTINE', this.data.routine);
      this.emit('routine:updated', this.data.routine);
    },

    updateGateSyllabus(newSyllabus) {
      this.data.gateSyllabus = [...newSyllabus];
      Storage.set('GATE_SYLLABUS', this.data.gateSyllabus);
      this.emit('gate:updated', this.data.gateSyllabus);
    },

    updateRecoveryDebt(deltaMinutes) {
      this.data.recoveryDebt = Math.max(0, this.data.recoveryDebt + deltaMinutes);
      Storage.set('RECOVERY_DEBT', this.data.recoveryDebt);
      this.emit('recovery:debt-updated', this.data.recoveryDebt);
    },

    setRecoveryDebt(totalMinutes) {
      this.data.recoveryDebt = Math.max(0, totalMinutes);
      Storage.set('RECOVERY_DEBT', this.data.recoveryDebt);
      this.emit('recovery:debt-updated', this.data.recoveryDebt);
    },

    updateTodayMission(missionId, updates) {
      if (!this.data.todayState.missions[missionId]) {
        this.data.todayState.missions[missionId] = {};
      }
      this.data.todayState.missions[missionId] = {
        ...this.data.todayState.missions[missionId],
        ...updates
      };
      Storage.set('TODAY_STATE', this.data.todayState);
      this.emit('today:mission-updated', { missionId, missionState: this.data.todayState.missions[missionId] });
    },

    setActiveSession(session) {
      this.data.activeSession = session;
      if (session) {
        Storage.set('ACTIVE_SESSION', session);
      } else {
        Storage.remove('ACTIVE_SESSION');
      }
      this.emit('session:changed', session);
    },

    clearInterruptedSession() {
      this.data.interruptedSession = null;
      Storage.remove('ACTIVE_SESSION');
      this.emit('session:interrupted-cleared');
    },

    setEscalation(level, missionId, lateMinutes, message) {
      this.data.escalation = { level, missionId, lateMinutes, message };
      this.emit('enforcement:escalated', this.data.escalation);
    },

    clearEscalation() {
      this.data.escalation = { level: 0, missionId: null, lateMinutes: 0, message: '' };
      this.emit('enforcement:cleared');
    },

    setEmergencyOverride(enabled) {
      this.data.todayState.emergencyOverride = !!enabled;
      Storage.set('TODAY_STATE', this.data.todayState);
      this.emit('emergency:toggled', enabled);
    }
  };

  window.State = State;
})();
