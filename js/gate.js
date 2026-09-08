// JARVIS GATE Module - Syllabus Mastery & Question Bank Tracker
(function () {
  'use strict';

  const Gate = {
    // Calculate overall GATE syllabus readiness percentage based on topic completion and subject weightages
    calculateReadiness() {
      const syllabus = State.data.gateSyllabus || [];
      if (syllabus.length === 0) return { percent: 0, totalQuestions: 0, solvedQuestions: 0 };

      let weightedSum = 0;
      let totalWeights = 0;
      let totalQuestions = 0;
      let solvedQuestions = 0;

      syllabus.forEach(subject => {
        const weight = subject.weightage || 10;
        totalWeights += weight;

        const topics = subject.topics || [];
        if (topics.length > 0) {
          const completedCount = topics.filter(t => t.completed).length;
          const subjectRatio = completedCount / topics.length;
          weightedSum += subjectRatio * weight;

          topics.forEach(t => {
            totalQuestions += (t.totalQuestions || 50);
            solvedQuestions += (t.questionsSolved || 0);
          });
        }
      });

      const percent = totalWeights > 0 ? Math.round((weightedSum / totalWeights) * 100) : 0;
      return {
        percent,
        totalQuestions,
        solvedQuestions,
        questionRatio: totalQuestions > 0 ? Math.round((solvedQuestions / totalQuestions) * 100) : 0
      };
    },

    // Days remaining until GATE target date
    getDaysUntilExam() {
      const examDateStr = State.data.settings.examDate || '2027-02-06';
      const target = new Date(examDateStr + 'T09:00:00');
      const now = Utils.getEffectiveDate();
      const diffMs = target - now;
      return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    },

    // Record question practice or completion
    recordTopicProgress(subjectId, topicId, questionsCount = 0, markComplete = false) {
      const syllabus = [...(State.data.gateSyllabus || [])];
      const subject = syllabus.find(s => s.id === subjectId);
      if (!subject) return;

      const topic = (subject.topics || []).find(t => t.id === topicId);
      if (!topic) return;

      topic.questionsSolved = (topic.questionsSolved || 0) + Number(questionsCount);
      if (markComplete) {
        topic.completed = true;
      }

      State.updateGateSyllabus(syllabus);
    },

    toggleTopicComplete(subjectId, topicId) {
      const syllabus = [...(State.data.gateSyllabus || [])];
      const subject = syllabus.find(s => s.id === subjectId);
      if (!subject) return;

      const topic = (subject.topics || []).find(t => t.id === topicId);
      if (!topic) return;

      topic.completed = !topic.completed;
      State.updateGateSyllabus(syllabus);
      Voice.playClick();
    },

    addTopic(subjectId, topicName, totalQuestions = 50) {
      const syllabus = [...(State.data.gateSyllabus || [])];
      const subject = syllabus.find(s => s.id === subjectId);
      if (!subject) return;

      if (!subject.topics) subject.topics = [];
      subject.topics.push({
        id: Utils.generateId('topic'),
        name: topicName,
        completed: false,
        questionsSolved: 0,
        totalQuestions: Number(totalQuestions) || 50
      });

      State.updateGateSyllabus(syllabus);
    }
  };

  window.Gate = Gate;
})();
