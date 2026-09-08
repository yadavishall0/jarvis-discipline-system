// JARVIS Mission Lifecycle Engine
(function () {
  'use strict';

  const Mission = {
    // Determine the current mission based on the clock and today's state
    getCurrentMissionContext() {
      const schedule = Routine.getTodaySchedule();
      const now = Utils.getEffectiveDate();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const todayMissions = State.data.todayState.missions || {};

      let activeMission = null;
      let nextMissions = [];
      let pastMissions = [];
      let lateMinutes = 0;

      // Check if there is an explicitly active session running right now
      if (State.data.activeSession) {
        const runningId = State.data.activeSession.missionId;
        const found = schedule.find(m => m.id === runningId);
        if (found) {
          activeMission = found;
        }
      }

      for (let i = 0; i < schedule.length; i++) {
        const item = schedule[i];
        const state = todayMissions[item.id] || {};
        const status = state.status || 'PLANNED';

        const startMin = Utils.timeStringToMinutes(item.startTime);
        let endMin = Utils.timeStringToMinutes(item.endTime);
        if (endMin <= startMin) endMin += 24 * 60; // Overnight

        // If explicitly active or in progress
        if (!activeMission && status === 'ACTIVE') {
          activeMission = item;
        }

        // If clock is within this mission's scheduled window and it hasn't been completed/skipped
        if (!activeMission && nowMinutes >= startMin && nowMinutes < endMin) {
          if (status !== 'COMPLETED' && status !== 'SKIPPED' && status !== 'MISSED') {
            activeMission = item;
            // Calculate late minutes if not started
            if (status !== 'ACTIVE') {
              lateMinutes = Math.max(0, nowMinutes - startMin);
            }
          }
        }

        // Categorize into past vs next
        if (nowMinutes >= endMin) {
          pastMissions.push(item);
        } else if (nowMinutes < startMin) {
          nextMissions.push(item);
        }
      }

      // If no active mission found, look for an upcoming one or immediate overdue
      return {
        activeMission,
        upcomingMissions: nextMissions,
        pastMissions,
        lateMinutes,
        nowMinutes
      };
    },

    // Start a mission
    startMission(missionId) {
      const schedule = Routine.getTodaySchedule();
      const mission = schedule.find(m => m.id === missionId);
      if (!mission) return false;

      const now = Utils.now();
      const state = State.data.todayState.missions[missionId] || {};
      const startMin = Utils.timeStringToMinutes(mission.startTime);
      const nowMin = Utils.getEffectiveDate().getHours() * 60 + Utils.getEffectiveDate().getMinutes();
      const delayMinutes = Math.max(0, nowMin - startMin);

      // Create or update today mission state
      State.updateTodayMission(missionId, {
        status: 'ACTIVE',
        actualStart: now,
        startedAtMin: nowMin,
        lateMinutesAtStart: delayMinutes
      });

      // Calculate initial remaining seconds
      const durationSeconds = (mission.duration || 60) * 60;
      State.setActiveSession({
        missionId: mission.id,
        missionName: mission.name,
        category: mission.category,
        startedAt: now,
        durationSeconds: durationSeconds,
        remainingSeconds: durationSeconds,
        accumulatedSeconds: 0,
        isPaused: false,
        lastTick: now,
        target: mission.target || { type: 'minutes', amount: mission.duration },
        targetAchieved: 0,
        notes: ''
      });

      // Clear escalation alerts
      State.clearEscalation();

      // Audio & Voice feedback
      Voice.playClick();
      Voice.speak(`${mission.name} initiated. Focus mode engaged.`, 'HIGH');
      Notifications.notifyStart(mission.name);

      return true;
    },

    // Delay a mission
    delayMission(missionId, minutes = 5) {
      const schedule = Routine.getTodaySchedule();
      const mission = schedule.find(m => m.id === missionId);
      if (!mission) return { success: false, reason: 'Mission not found' };

      const missionState = State.data.todayState.missions[missionId] || {};
      const delays = missionState.delays || [];
      const totalDelayed = delays.reduce((acc, d) => acc + d, 0) + minutes;

      const maxDelay = mission.maxDelay !== undefined ? mission.maxDelay : 15;

      if (totalDelayed > maxDelay) {
        Voice.playWarning();
        Voice.speak(`Warning. Maximum delay of ${maxDelay} minutes reached. Start now or skip.`, 'HIGH');
        return {
          success: false,
          maxReached: true,
          message: `Maximum delay of ${maxDelay} minutes exceeded. You must start or skip.`
        };
      }

      delays.push(minutes);

      // Push start and end times
      const currentStartMin = Utils.timeStringToMinutes(mission.startTime);
      const newStartMin = currentStartMin + minutes;
      const currentEndMin = Utils.timeStringToMinutes(mission.endTime);
      const newEndMin = currentEndMin + minutes;

      // Note: We record the delay in todayState
      State.updateTodayMission(missionId, {
        status: 'DELAYED',
        delays: delays,
        totalDelayedMinutes: totalDelayed,
        adjustedStartTime: Utils.minutesToTimeString(newStartMin),
        adjustedEndTime: Utils.minutesToTimeString(newEndMin)
      });

      // Apply discipline score penalty for delay
      Discipline.recalculateScore();

      Voice.playWarning();
      Voice.speak(`Mission delayed by ${minutes} minutes. New start time is ${Utils.minutesToTimeString(newStartMin)}.`, 'NORMAL');

      return { success: true, totalDelayed, maxReached: totalDelayed >= maxDelay };
    },

    // Skip a mission explicitly with structured accountability reason
    skipMission(missionId, reason, note = '') {
      const schedule = Routine.getTodaySchedule();
      const mission = schedule.find(m => m.id === missionId);
      if (!mission) return false;

      const duration = mission.duration || 60;
      let debtGenerated = 0;

      // If mission is Study or GATE, generate recovery debt
      if (mission.createsRecoveryDebt) {
        debtGenerated = duration;
        State.updateRecoveryDebt(debtGenerated);
      }

      State.updateTodayMission(missionId, {
        status: 'SKIPPED',
        skipReason: reason,
        skipNote: note,
        lostMinutes: duration,
        debtGenerated: debtGenerated,
        skippedAt: Utils.now()
      });

      // If there was an active session for this, clear it
      if (State.data.activeSession && State.data.activeSession.missionId === missionId) {
        State.setActiveSession(null);
      }
      State.clearEscalation();

      // Recalculate discipline score
      Discipline.recalculateScore();

      Voice.playWarning();
      if (debtGenerated > 0) {
        Voice.speak(`Mission skipped due to ${reason}. ${debtGenerated} minutes added to recovery debt.`, 'HIGH');
        Notifications.notifyCritical(mission.name, debtGenerated);
      } else {
        Voice.speak(`Mission skipped: ${reason}.`, 'NORMAL');
      }

      return true;
    },

    // Complete a mission with honest output verification
    completeMission(missionId, verification = {}) {
      const schedule = Routine.getTodaySchedule();
      const mission = schedule.find(m => m.id === missionId);
      if (!mission) return false;

      const session = State.data.activeSession;
      const actualElapsedSeconds = session ? session.accumulatedSeconds : (mission.duration * 60);
      const actualDurationMinutes = Math.round(actualElapsedSeconds / 60);

      const targetAmount = (mission.target && mission.target.amount) || 1;
      const actualAchieved = verification.targetAchieved !== undefined ? Number(verification.targetAchieved) : targetAmount;
      const completionRatio = targetAmount > 0 ? (actualAchieved / targetAmount) : 1;
      const completionPercentage = Math.min(200, Math.round(completionRatio * 100));

      const isPartial = completionPercentage < 80;
      const finalStatus = completionPercentage === 0 ? 'FAILED' : 'COMPLETED';

      // Record session in log
      const sessionLog = {
        id: Utils.generateId('session'),
        missionId: mission.id,
        missionName: mission.name,
        category: mission.category,
        date: Utils.getTodayDateString(),
        timestamp: Utils.now(),
        plannedDuration: mission.duration,
        actualDuration: actualDurationMinutes,
        target: mission.target,
        targetAchieved: actualAchieved,
        completionPercentage: completionPercentage,
        status: finalStatus,
        notes: verification.notes || ''
      };

      Storage.saveSessionLog(sessionLog);

      // If linked to GATE topic, update syllabus progress
      if (mission.linkedSubjectId && mission.linkedTopicId) {
        Gate.recordTopicProgress(mission.linkedSubjectId, mission.linkedTopicId, actualAchieved, completionPercentage >= 90);
      }

      // If this was a Recovery mission, reduce recovery debt
      if (mission.category === 'Recovery' || mission.name.toUpperCase().includes('RECOVERY')) {
        State.updateRecoveryDebt(-actualDurationMinutes);
      }

      // Update today mission state
      State.updateTodayMission(missionId, {
        status: finalStatus,
        actualEnd: Utils.now(),
        actualDuration: actualDurationMinutes,
        targetResult: {
          target: targetAmount,
          achieved: actualAchieved,
          percentage: completionPercentage
        }
      });

      // Clear active session & escalation
      State.setActiveSession(null);
      State.clearEscalation();

      // Recalculate discipline score
      Discipline.recalculateScore();

      // Audio and voice response
      Voice.playComplete();
      if (isPartial) {
        Voice.speak(`Mission partially complete. ${actualAchieved} achieved. Output recorded.`, 'HIGH');
      } else {
        Voice.speak(`Mission accomplished. Excellent performance, Commander.`, 'HIGH');
      }
      Notifications.notifyComplete(mission.name, actualDurationMinutes);

      return true;
    },

    // Abandon active mission
    abandonMission(missionId) {
      const schedule = Routine.getTodaySchedule();
      const mission = schedule.find(m => m.id === missionId);
      if (!mission) return;

      const session = State.data.activeSession;
      const elapsedMins = session ? Math.floor(session.accumulatedSeconds / 60) : 0;
      const uncompletedMins = Math.max(0, (mission.duration || 60) - elapsedMins);

      if (mission.createsRecoveryDebt && uncompletedMins > 0) {
        State.updateRecoveryDebt(uncompletedMins);
      }

      State.updateTodayMission(missionId, {
        status: 'MISSED',
        actualDuration: elapsedMins,
        uncompletedLostMinutes: uncompletedMins,
        abandonedAt: Utils.now()
      });

      State.setActiveSession(null);
      State.clearEscalation();
      Discipline.recalculateScore();

      Voice.playAlarm();
      Voice.speak(`Mission abandoned. ${uncompletedMins} minutes unfulfilled. Recovery debt increased.`, 'HIGH');
    },

    // Mark mission as missed by escalation level 5
    markMissionMissed(missionId) {
      const schedule = Routine.getTodaySchedule();
      const mission = schedule.find(m => m.id === missionId);
      if (!mission) return;

      const duration = mission.duration || 60;
      if (mission.createsRecoveryDebt) {
        State.updateRecoveryDebt(duration);
      }

      State.updateTodayMission(missionId, {
        status: 'MISSED',
        lostMinutes: duration,
        missedAt: Utils.now()
      });

      Discipline.recalculateScore();
      Notifications.notifyCritical(mission.name, duration);
      Voice.playAlarm();
      Voice.speak(`Mission failure threshold reached for ${mission.name}. Schedule requires recalculation.`, 'CRITICAL');
    }
  };

  window.Mission = Mission;
})();
