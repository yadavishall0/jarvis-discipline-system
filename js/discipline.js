// JARVIS Transparent Discipline Scoring Engine
(function () {
  'use strict';

  const Discipline = {
    // Transparently calculate current discipline score (0 - 100)
    calculateScore() {
      const schedule = Routine.getTodaySchedule();
      const todayMissions = State.data.todayState.missions || {};

      if (schedule.length === 0) {
        return {
          score: 100,
          onTimeRate: 100,
          completionRate: 100,
          breakdown: ['No scheduled missions today. Base score maintained.']
        };
      }

      let totalScheduled = 0;
      let completedCount = 0;
      let onTimeCount = 0;
      let startedCount = 0;
      let totalLateMinutes = 0;
      let totalDelays = 0;
      let skipCount = 0;
      let missedCount = 0;
      let targetRatios = [];

      schedule.forEach(item => {
        if (!item.countsTowardDiscipline) return;
        totalScheduled++;

        const state = todayMissions[item.id] || {};
        const status = state.status || 'PLANNED';

        if (status === 'COMPLETED') {
          completedCount++;
        } else if (status === 'SKIPPED') {
          skipCount++;
        } else if (status === 'MISSED' || status === 'FAILED') {
          missedCount++;
        }

        if (state.delays && Array.isArray(state.delays)) {
          totalDelays += state.delays.length;
        }

        if (state.actualStart) {
          startedCount++;
          const late = state.lateMinutesAtStart || 0;
          totalLateMinutes += late;
          if (late <= 2) {
            onTimeCount++;
          }
        }

        if (state.targetResult) {
          const ratio = (state.targetResult.achieved || 0) / (state.targetResult.target || 1);
          targetRatios.push(Math.min(1.2, ratio));
        }
      });

      // Avoid division by zero
      const onTimeRate = startedCount > 0 ? Math.round((onTimeCount / startedCount) * 100) : 100;
      const completionRate = totalScheduled > 0 ? Math.round((completedCount / totalScheduled) * 100) : 100;
      const avgTargetCompletion = targetRatios.length > 0 
        ? Math.round((targetRatios.reduce((a, b) => a + b, 0) / targetRatios.length) * 100)
        : 100;

      // Base formula:
      // Weight 1: Completion (35 points)
      const completionPoints = (completionRate / 100) * 35;

      // Weight 2: On-Time execution (25 points)
      const onTimePoints = (onTimeRate / 100) * 25;

      // Weight 3: Target output verification (20 points)
      const outputPoints = (Math.min(100, avgTargetCompletion) / 100) * 20;

      // Weight 4: Schedule adherence baseline (20 points)
      const baselinePoints = 20;

      let rawScore = completionPoints + onTimePoints + outputPoints + baselinePoints;

      // Penalties:
      const latePenalty = Math.min(15, Math.floor(totalLateMinutes / 5)); // -1 per 5m late
      const delayPenalty = totalDelays * 3; // -3 per delay
      const skipPenalty = skipCount * 8; // -8 per skip
      const missedPenalty = missedCount * 18; // -18 per missed

      // Bonus:
      const recoveryBonus = (State.data.recoveryDebt === 0 && completedCount > 0) ? 5 : 0;

      rawScore = rawScore - latePenalty - delayPenalty - skipPenalty - missedPenalty + recoveryBonus;
      const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

      const breakdown = [
        `Base Execution: ${Math.round(completionPoints + onTimePoints + outputPoints + baselinePoints)} / 100`,
        `On-time start rate: ${onTimeRate}% (${onTimeCount}/${startedCount || 1} missions)`,
        `Completion rate: ${completionRate}% (${completedCount}/${totalScheduled} missions)`,
        `Target output fidelity: ${avgTargetCompletion}%`
      ];

      if (totalLateMinutes > 0) breakdown.push(`Late Penalty: -${latePenalty} pts (${totalLateMinutes}m late total)`);
      if (totalDelays > 0) breakdown.push(`Delay Penalty: -${delayPenalty} pts (${totalDelays} delays)`);
      if (skipCount > 0) breakdown.push(`Skip Penalty: -${skipPenalty} pts (${skipCount} skipped)`);
      if (missedCount > 0) breakdown.push(`Missed Penalty: -${missedPenalty} pts (${missedCount} missed)`);
      if (recoveryBonus > 0) breakdown.push(`Recovery Integrity Bonus: +${recoveryBonus} pts (zero debt)`);

      return {
        score: finalScore,
        onTimeRate,
        completionRate,
        avgTargetCompletion,
        totalLateMinutes,
        totalDelays,
        skipCount,
        missedCount,
        recoveryBonus,
        breakdown
      };
    },

    recalculateScore() {
      const result = this.calculateScore();
      State.data.todayState.dailyScore = result.score;
      Storage.set('TODAY_STATE', State.data.todayState);
      State.emit('discipline:score-updated', result);
      return result;
    }
  };

  window.Discipline = Discipline;
})();
