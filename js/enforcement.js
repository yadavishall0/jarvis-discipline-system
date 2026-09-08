// JARVIS Escalating Enforcement Engine (Levels 1 to 5)
(function () {
  'use strict';

  const Enforcement = {
    _lastAnnouncedLevel: 0,
    _lastAnnouncedMissionId: null,

    // Ticker called periodically by app loop
    check() {
      // If Emergency Override is active, suspend enforcement
      if (State.data.todayState.emergencyOverride) {
        if (State.data.escalation.level > 0) {
          State.clearEscalation();
        }
        return;
      }

      // If there is already an active session running, no late escalation needed
      if (State.data.activeSession && !State.data.activeSession.isPaused) {
        if (State.data.escalation.level > 0) {
          State.clearEscalation();
          this._lastAnnouncedLevel = 0;
        }
        return;
      }

      const context = Mission.getCurrentMissionContext();
      const current = context.activeMission;

      if (!current) {
        if (State.data.escalation.level > 0) {
          State.clearEscalation();
          this._lastAnnouncedLevel = 0;
        }
        return;
      }

      const missionState = State.data.todayState.missions[current.id] || {};
      const status = missionState.status || 'PLANNED';

      // Only escalate if not completed, skipped, or missed
      if (status === 'COMPLETED' || status === 'SKIPPED' || status === 'MISSED' || status === 'ACTIVE') {
        return;
      }

      const mode = State.data.settings.enforcementMode || 'STRICT';
      const lateMins = context.lateMinutes;

      // Determine escalation level based on mode thresholds
      let level = 0;
      let message = '';

      if (mode === 'HARDCORE') {
        if (lateMins >= 15) level = 5;
        else if (lateMins >= 10) level = 4;
        else if (lateMins >= 5) level = 3;
        else if (lateMins >= 2) level = 2;
        else if (lateMins >= 0) level = 1;
      } else if (mode === 'NORMAL') {
        if (lateMins >= 45) level = 5;
        else if (lateMins >= 30) level = 4;
        else if (lateMins >= 15) level = 3;
        else if (lateMins >= 5) level = 2;
        else if (lateMins >= 0) level = 1;
      } else {
        // STRICT mode (default)
        if (lateMins >= 30) level = 5;
        else if (lateMins >= 20) level = 4;
        else if (lateMins >= 10) level = 3;
        else if (lateMins >= 5) level = 2;
        else if (lateMins >= 0) level = 1;
      }

      // Generate context message
      switch (level) {
        case 1:
          message = `${current.name} mission begins now. Report to station.`;
          break;
        case 2:
          message = `MISSION DELAY DETECTED. You are ${lateMins} minutes late for ${current.name}. Start now.`;
          break;
        case 3:
          message = `DISCIPLINE WARNING. ${current.name} has not started. ${lateMins} minutes of scheduled work lost.`;
          break;
        case 4:
          message = `CRITICAL ROUTINE VIOLATION. Unrecoverable schedule degradation. Recovery debt is being generated.`;
          break;
        case 5:
          message = `MISSION FAILURE THRESHOLD REACHED. ${current.name} failed. Schedule recalculation mandatory.`;
          break;
        default:
          level = 0;
      }

      // Update State escalation
      State.setEscalation(level, current.id, lateMins, message);

      // Trigger announcements once per level per mission
      if (level > this._lastAnnouncedLevel || current.id !== this._lastAnnouncedMissionId) {
        this.triggerEscalationAction(level, current, lateMins, message);
        this._lastAnnouncedLevel = level;
        this._lastAnnouncedMissionId = current.id;
      }
    },

    triggerEscalationAction(level, mission, lateMins, message) {
      switch (level) {
        case 1:
          Notifications.notifyStart(mission.name);
          Voice.speak(`${mission.name} mission begins now.`, 'NORMAL');
          break;

        case 2:
          Voice.playWarning();
          Notifications.notifyLate(mission.name, lateMins);
          Voice.speak(`Warning. Mission delay detected. You are ${lateMins} minutes late for ${mission.name}.`, 'HIGH');
          break;

        case 3:
          Voice.playWarning();
          Notifications.notifyLate(mission.name, lateMins);
          Voice.speak(`Discipline warning. ${mission.name} has not started. ${lateMins} minutes of study time lost.`, 'HIGH');
          break;

        case 4:
          Voice.playAlarm();
          // Generate partial recovery debt immediately on level 4
          if (mission.createsRecoveryDebt) {
            const partialDebt = Math.min(mission.duration || 60, lateMins);
            State.updateRecoveryDebt(partialDebt);
            Notifications.notifyCritical(mission.name, partialDebt);
          }
          Voice.speak(`Critical routine violation. Recovery debt will be generated.`, 'CRITICAL');
          break;

        case 5:
          // Level 5 failure threshold reached -> auto mark missed and recalculate
          Mission.markMissionMissed(mission.id);
          this._lastAnnouncedLevel = 0;
          break;

        default:
          break;
      }
    }
  };

  window.Enforcement = Enforcement;
})();
