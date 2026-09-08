// JARVIS Routine Engine - Schedule Calculator & Routine Builder
(function () {
  'use strict';

  const Routine = {
    // Get missions scheduled for the current effective day
    getTodaySchedule() {
      const routine = State.data.routine || [];
      const now = Utils.getEffectiveDate();
      const currentDayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday

      const activeList = routine.filter(item => {
        if (!item.repeatDays || !Array.isArray(item.repeatDays)) return true;
        return item.repeatDays.includes(currentDayOfWeek);
      });

      // Sort chronologically by start time
      activeList.sort((a, b) => {
        const startA = Utils.timeStringToMinutes(a.startTime);
        const startB = Utils.timeStringToMinutes(b.startTime);
        return startA - startB;
      });

      return activeList;
    },

    // Check for overlapping missions in the current routine
    detectOverlaps(schedule = null) {
      const list = schedule || this.getTodaySchedule();
      const conflicts = [];

      for (let i = 0; i < list.length - 1; i++) {
        const curr = list[i];
        const next = list[i + 1];

        const currStart = Utils.timeStringToMinutes(curr.startTime);
        let currEnd = Utils.timeStringToMinutes(curr.endTime);
        if (currEnd < currStart) currEnd += (24 * 60); // Overnight mission

        const nextStart = Utils.timeStringToMinutes(next.startTime);

        if (currEnd > nextStart) {
          conflicts.push({
            first: curr,
            second: next,
            overlapMinutes: currEnd - nextStart
          });
        }
      }

      return conflicts;
    },

    // Calculate total planned study/deep-work minutes for today
    getPlannedStudyMinutes() {
      const schedule = this.getTodaySchedule();
      return schedule
        .filter(m => m.category === 'Study' || m.category === 'GATE')
        .reduce((sum, m) => sum + (m.duration || 0), 0);
    },

    // Add or Update mission in routine
    saveMission(missionData) {
      const routine = [...(State.data.routine || [])];
      const index = routine.findIndex(m => m.id === missionData.id);

      // Compute duration in minutes
      const startMin = Utils.timeStringToMinutes(missionData.startTime);
      let endMin = Utils.timeStringToMinutes(missionData.endTime);
      if (endMin <= startMin) endMin += 24 * 60;
      missionData.duration = endMin - startMin;

      if (index >= 0) {
        routine[index] = { ...routine[index], ...missionData };
      } else {
        if (!missionData.id) {
          missionData.id = Utils.generateId('mission');
        }
        routine.push(missionData);
      }

      State.updateRoutine(routine);
      return missionData;
    },

    deleteMission(missionId) {
      const routine = (State.data.routine || []).filter(m => m.id !== missionId);
      State.updateRoutine(routine);
    },

    duplicateMission(missionId) {
      const routine = [...(State.data.routine || [])];
      const orig = routine.find(m => m.id === missionId);
      if (!orig) return;

      const copy = JSON.parse(JSON.stringify(orig));
      copy.id = Utils.generateId('mission');
      copy.name = `${copy.name} (COPY)`;
      routine.push(copy);
      State.updateRoutine(routine);
    },

    // Reset current routine back to default template
    resetToDefault() {
      if (window.DEFAULT_ROUTINE) {
        State.updateRoutine(window.DEFAULT_ROUTINE);
      }
    }
  };

  window.Routine = Routine;
})();
