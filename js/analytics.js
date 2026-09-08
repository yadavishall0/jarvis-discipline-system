// JARVIS Analytics, Streaks & Adaptive Routine Engine
(function () {
  'use strict';

  const Analytics = {
    // Generate full daily performance report
    generateDailyReport(targetDateStr = null) {
      const dateStr = targetDateStr || Utils.getTodayDateString();
      const reports = Storage.getDailyReports();
      if (reports[dateStr]) return reports[dateStr];

      const schedule = Routine.getTodaySchedule();
      const todayMissions = State.data.todayState.missions || {};
      const disc = Discipline.calculateScore();

      let scheduledStudyMins = 0;
      let actualStudyMins = 0;
      let onTimeCount = 0;
      let delayedCount = 0;
      let skippedCount = 0;
      let missedCount = 0;
      let completedCount = 0;

      schedule.forEach(m => {
        const isStudy = m.category === 'Study' || m.category === 'GATE';
        if (isStudy) scheduledStudyMins += (m.duration || 0);

        const st = todayMissions[m.id] || {};
        const status = st.status || 'PLANNED';

        if (status === 'COMPLETED') {
          completedCount++;
          if (isStudy) actualStudyMins += (st.actualDuration || m.duration);
        } else if (status === 'SKIPPED') {
          skippedCount++;
        } else if (status === 'MISSED' || status === 'FAILED') {
          missedCount++;
        }

        if (st.delays && st.delays.length > 0) {
          delayedCount++;
        }

        if (st.actualStart && (st.lateMinutesAtStart || 0) <= 2) {
          onTimeCount++;
        }
      });

      // Formulate JARVIS professional AI assessment
      let assessment = 'System standards satisfied.';
      if (disc.score >= 90) {
        assessment = 'Exemplary discipline. Schedule executed with military precision.';
      } else if (disc.score >= 75) {
        assessment = delayedCount > 0
          ? `Adequate consistency, though ${delayedCount} delayed mission(s) eroded operational momentum.`
          : 'Solid baseline execution. Minor target variances recorded.';
      } else if (disc.score >= 50) {
        assessment = 'Discipline degradation detected. Multiple routine targets were postponed or skipped.';
      } else {
        assessment = 'Critical routine failure. Immediate schedule recovery mandatory for tomorrow.';
      }

      const report = {
        date: dateStr,
        scheduledHours: Utils.formatDuration(scheduledStudyMins),
        scheduledMinutes: scheduledStudyMins,
        actualHours: Utils.formatDuration(actualStudyMins),
        actualMinutes: actualStudyMins,
        completionRate: disc.completionRate,
        onTimeRate: disc.onTimeRate,
        onTimeStarts: `${onTimeCount}/${schedule.length}`,
        delayedCount,
        skippedCount,
        missedCount,
        completedCount,
        recoveryDebtMinutes: State.data.recoveryDebt,
        disciplineScore: disc.score,
        assessment,
        timestamp: Utils.now()
      };

      Storage.saveDailyReport(report);
      return report;
    },

    // Calculate Streaks (Requires true discipline >= 75%, not merely opening the app)
    calculateStreaks() {
      const reports = Storage.getDailyReports();
      const dates = Object.keys(reports).sort().reverse();

      let routineStreak = 0;
      let onTimeStreak = 0;
      let studyStreak = 0;

      for (const d of dates) {
        const rep = reports[d];
        if (rep.disciplineScore >= 75) {
          routineStreak++;
        } else {
          break;
        }

        if (rep.onTimeRate >= 80) {
          onTimeStreak++;
        }
        if (rep.actualMinutes >= 120) {
          studyStreak++;
        }
      }

      // If today is on track, count today
      const currentScore = State.data.todayState.dailyScore || 100;
      if (currentScore >= 75) routineStreak = Math.max(1, routineStreak);

      return {
        routineStreak,
        onTimeStreak: Math.max(routineStreak > 0 ? 1 : 0, onTimeStreak),
        studyStreak: Math.max(routineStreak > 0 ? 1 : 0, studyStreak)
      };
    },

    // Adaptive Routine Engine: detects repeated delays or misses and suggests schedule optimization
    getAdaptiveRecommendations() {
      const schedule = Routine.getTodaySchedule();
      const todayMissions = State.data.todayState.missions || {};
      const recommendations = [];

      schedule.forEach(m => {
        const st = todayMissions[m.id] || {};
        if (st.delays && st.delays.length >= 2) {
          const totalDelay = st.delays.reduce((a, b) => a + b, 0);
          const startMin = Utils.timeStringToMinutes(m.startTime);
          const suggestedStart = Utils.minutesToTimeString(startMin + totalDelay);
          recommendations.push({
            missionId: m.id,
            missionName: m.name,
            reason: `Repeated delays detected (${totalDelay}m total).`,
            suggestion: `Consider shifting ${m.name} from ${m.startTime} to ${suggestedStart} to align with your natural wake-up velocity.`
          });
        }
      });

      return recommendations;
    }
  };

  window.Analytics = Analytics;
})();
