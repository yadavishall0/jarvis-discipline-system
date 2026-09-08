// JARVIS Recovery Engine - Recovery Debt Calculator & Slot Scheduler
(function () {
  'use strict';

  const Recovery = {
    // Find open available slots in today's routine to pay off recovery debt
    findAvailableSlots(minSlotDuration = 30) {
      const schedule = Routine.getTodaySchedule();
      const slots = [];

      const now = Utils.getEffectiveDate();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      // Scan day from nowMinutes up to 22:30 (sleep cutoff)
      const sleepCutoff = 22 * 60 + 30; // 22:30

      if (nowMinutes >= sleepCutoff) {
        return slots; // No slots left today without compromising sleep
      }

      // Build busy intervals
      const busyIntervals = schedule.map(m => ({
        start: Utils.timeStringToMinutes(m.startTime),
        end: (() => {
          let end = Utils.timeStringToMinutes(m.endTime);
          if (end <= Utils.timeStringToMinutes(m.startTime)) end += 24 * 60;
          return end;
        })(),
        name: m.name,
        category: m.category
      })).sort((a, b) => a.start - b.start);

      // Search gaps between intervals
      let cursor = Math.max(nowMinutes, 6 * 60); // Not before 06:00

      for (let i = 0; i < busyIntervals.length; i++) {
        const busy = busyIntervals[i];
        if (busy.start > cursor) {
          const gapMinutes = busy.start - cursor;
          if (gapMinutes >= minSlotDuration && cursor < sleepCutoff) {
            slots.push({
              startMin: cursor,
              endMin: Math.min(busy.start, sleepCutoff),
              duration: Math.min(gapMinutes, sleepCutoff - cursor),
              startTime: Utils.minutesToTimeString(cursor),
              endTime: Utils.minutesToTimeString(Math.min(busy.start, sleepCutoff))
            });
          }
        }
        cursor = Math.max(cursor, busy.end);
      }

      // Check remaining time before sleep cutoff
      if (cursor < sleepCutoff) {
        const gap = sleepCutoff - cursor;
        if (gap >= minSlotDuration) {
          slots.push({
            startMin: cursor,
            endMin: sleepCutoff,
            duration: gap,
            startTime: Utils.minutesToTimeString(cursor),
            endTime: Utils.minutesToTimeString(sleepCutoff)
          });
        }
      }

      return slots;
    },

    // Schedule a recovery mission into an available slot
    scheduleRecoveryMission(slot, targetCategory = 'GATE', customName = null) {
      const debt = State.data.recoveryDebt;
      const allocatedDuration = Math.min(debt > 0 ? debt : 60, slot.duration);

      const recoveryMission = {
        id: Utils.generateId('recovery'),
        name: customName || `RECOVERY MISSION [${allocatedDuration}M]`,
        description: `Dedicated tactical recovery slot to pay off ${allocatedDuration} minutes of accumulated debt.`,
        category: 'Study',
        startTime: slot.startTime,
        endTime: Utils.minutesToTimeString(slot.startMin + allocatedDuration),
        duration: allocatedDuration,
        priority: 'CRITICAL',
        repeatDays: [Utils.getEffectiveDate().getDay()],
        target: { type: 'minutes', amount: allocatedDuration, unit: 'mins' },
        enforcementLevel: 'STRICT',
        canDelay: false,
        maxDelay: 0,
        createsRecoveryDebt: false,
        countsTowardDiscipline: true,
        color: '#f97316',
        icon: 'fa-rotate-right'
      };

      Routine.saveMission(recoveryMission);

      Voice.playComplete();
      Voice.speak(`Recovery mission scheduled for ${slot.startTime}. Complete this session to restore discipline rating.`, 'HIGH');

      return recoveryMission;
    }
  };

  window.Recovery = Recovery;
})();
