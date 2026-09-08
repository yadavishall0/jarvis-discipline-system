// JARVIS Discipline System - Default Routine & GATE Syllabus Seed
const DEFAULT_ROUTINE = [
  {
    id: 'mission-01',
    name: 'WAKE UP & TACTICAL PROTOCOL',
    description: 'Cold hydration, physical activation, system check.',
    category: 'Personal',
    startTime: '05:30',
    endTime: '06:00',
    duration: 30,
    priority: 'HIGH',
    repeatDays: [0, 1, 2, 3, 4, 5, 6],
    target: { type: 'minutes', amount: 30, unit: 'mins' },
    enforcementLevel: 'NORMAL',
    canDelay: false,
    maxDelay: 0,
    createsRecoveryDebt: false,
    countsTowardDiscipline: true,
    color: '#00e5ff',
    icon: 'fa-sun'
  },
  {
    id: 'mission-02',
    name: 'MATHEMATICS — ENGINEERING MATH',
    description: 'Differential Equations & Calculus. Core analytical deep work.',
    category: 'GATE',
    startTime: '06:00',
    endTime: '08:00',
    duration: 120,
    priority: 'CRITICAL',
    repeatDays: [1, 2, 3, 4, 5, 6],
    target: { type: 'questions', amount: 40, unit: 'questions' },
    enforcementLevel: 'STRICT',
    canDelay: true,
    maxDelay: 15,
    createsRecoveryDebt: true,
    countsTowardDiscipline: true,
    linkedSubjectId: 'gate-math',
    linkedTopicId: 'math-diff-eq',
    color: '#00ff9d',
    icon: 'fa-square-root-variable'
  },
  {
    id: 'mission-03',
    name: 'BREAKFAST & NUTRITION',
    description: 'High-protein nourishment. Scheduled recovery break.',
    category: 'Meal',
    startTime: '08:00',
    endTime: '09:00',
    duration: 60,
    priority: 'MEDIUM',
    repeatDays: [0, 1, 2, 3, 4, 5, 6],
    target: { type: 'minutes', amount: 60, unit: 'mins' },
    enforcementLevel: 'NORMAL',
    canDelay: true,
    maxDelay: 15,
    createsRecoveryDebt: false,
    countsTowardDiscipline: false,
    color: '#38bdf8',
    icon: 'fa-utensils'
  },
  {
    id: 'mission-04',
    name: 'GEOTECHNICAL ENGINEERING',
    description: 'Soil Mechanics & Foundation Engineering lecture and notes.',
    category: 'GATE',
    startTime: '09:00',
    endTime: '13:00',
    duration: 240,
    priority: 'CRITICAL',
    repeatDays: [1, 2, 3, 4, 5, 6],
    target: { type: 'lectures', amount: 2, unit: 'lectures' },
    enforcementLevel: 'STRICT',
    canDelay: true,
    maxDelay: 15,
    createsRecoveryDebt: true,
    countsTowardDiscipline: true,
    linkedSubjectId: 'gate-geo',
    linkedTopicId: 'geo-soil-mech',
    color: '#00ff9d',
    icon: 'fa-mountain'
  },
  {
    id: 'mission-05',
    name: 'LUNCH & COGNITIVE RESET',
    description: 'Nutritional fueling and planned non-screen rest.',
    category: 'Meal',
    startTime: '13:00',
    endTime: '14:00',
    duration: 60,
    priority: 'MEDIUM',
    repeatDays: [0, 1, 2, 3, 4, 5, 6],
    target: { type: 'minutes', amount: 60, unit: 'mins' },
    enforcementLevel: 'NORMAL',
    canDelay: true,
    maxDelay: 15,
    createsRecoveryDebt: false,
    countsTowardDiscipline: false,
    color: '#38bdf8',
    icon: 'fa-bowl-food'
  },
  {
    id: 'mission-06',
    name: 'QUESTION PRACTICE & PYQS',
    description: 'High-volume GATE problem solving under timed constraints.',
    category: 'GATE',
    startTime: '14:00',
    endTime: '17:00',
    duration: 180,
    priority: 'CRITICAL',
    repeatDays: [1, 2, 3, 4, 5, 6],
    target: { type: 'questions', amount: 50, unit: 'PYQs' },
    enforcementLevel: 'STRICT',
    canDelay: true,
    maxDelay: 15,
    createsRecoveryDebt: true,
    countsTowardDiscipline: true,
    linkedSubjectId: 'gate-geo',
    linkedTopicId: 'geo-consolidation',
    color: '#f59e0b',
    icon: 'fa-pen-to-square'
  },
  {
    id: 'mission-07',
    name: 'TACTICAL FITNESS / GYM',
    description: 'Resistance training, cardiovascular endurance, mental stamina.',
    category: 'Gym',
    startTime: '17:00',
    endTime: '18:30',
    duration: 90,
    priority: 'HIGH',
    repeatDays: [1, 2, 3, 4, 5, 6],
    target: { type: 'minutes', amount: 80, unit: 'mins' },
    enforcementLevel: 'NORMAL',
    canDelay: true,
    maxDelay: 20,
    createsRecoveryDebt: false,
    countsTowardDiscipline: true,
    color: '#ec4899',
    icon: 'fa-dumbbell'
  },
  {
    id: 'mission-08',
    name: 'ACTIVE REVISION & RETRIEVAL',
    description: 'Formula sheets, active recall testing, error log review.',
    category: 'Study',
    startTime: '19:00',
    endTime: '21:00',
    duration: 120,
    priority: 'HIGH',
    repeatDays: [0, 1, 2, 3, 4, 5, 6],
    target: { type: 'topics', amount: 2, unit: 'topics' },
    enforcementLevel: 'STRICT',
    canDelay: true,
    maxDelay: 10,
    createsRecoveryDebt: true,
    countsTowardDiscipline: true,
    color: '#a855f7',
    icon: 'fa-book-open-reader'
  },
  {
    id: 'mission-09',
    name: 'DAILY ACCOUNTABILITY & REPORT',
    description: 'Discipline review with JARVIS, score calculation, tomorrow plan.',
    category: 'Personal',
    startTime: '21:00',
    endTime: '22:00',
    duration: 60,
    priority: 'HIGH',
    repeatDays: [0, 1, 2, 3, 4, 5, 6],
    target: { type: 'minutes', amount: 30, unit: 'mins' },
    enforcementLevel: 'NORMAL',
    canDelay: false,
    maxDelay: 0,
    createsRecoveryDebt: false,
    countsTowardDiscipline: true,
    color: '#00e5ff',
    icon: 'fa-clipboard-check'
  },
  {
    id: 'mission-10',
    name: 'TACTICAL SLEEP PROTOCOL',
    description: 'Deep physical and neural regeneration. Zero screens.',
    category: 'Sleep',
    startTime: '22:30',
    endTime: '05:30',
    duration: 420,
    priority: 'CRITICAL',
    repeatDays: [0, 1, 2, 3, 4, 5, 6],
    target: { type: 'minutes', amount: 420, unit: 'mins' },
    enforcementLevel: 'NORMAL',
    canDelay: false,
    maxDelay: 0,
    createsRecoveryDebt: false,
    countsTowardDiscipline: true,
    color: '#6366f1',
    icon: 'fa-bed'
  }
];

const DEFAULT_GATE_SYLLABUS = [
  {
    id: 'gate-math',
    name: 'Engineering Mathematics',
    weightage: 15,
    icon: 'fa-square-root-variable',
    topics: [
      { id: 'math-linear-alg', name: 'Linear Algebra (Matrices, Eigenvalues)', completed: true, questionsSolved: 65, totalQuestions: 80 },
      { id: 'math-calc', name: 'Calculus (Gradient, Divergence, Stokes)', completed: true, questionsSolved: 50, totalQuestions: 75 },
      { id: 'math-diff-eq', name: 'Differential Equations (ODE, PDE, Cauchy)', completed: false, questionsSolved: 32, totalQuestions: 60 },
      { id: 'math-prob', name: 'Probability & Statistics', completed: false, questionsSolved: 20, totalQuestions: 50 },
      { id: 'math-num', name: 'Numerical Methods', completed: false, questionsSolved: 15, totalQuestions: 40 }
    ]
  },
  {
    id: 'gate-geo',
    name: 'Geotechnical Engineering',
    weightage: 14,
    icon: 'fa-mountain',
    topics: [
      { id: 'geo-soil-mech', name: 'Soil Mechanics & Phase Relations', completed: true, questionsSolved: 85, totalQuestions: 100 },
      { id: 'geo-consolidation', name: 'Consolidation & Terzaghi Theory', completed: true, questionsSolved: 60, totalQuestions: 70 },
      { id: 'geo-shear', name: 'Shear Strength & Mohr-Coulomb', completed: false, questionsSolved: 28, totalQuestions: 65 },
      { id: 'geo-exploration', name: 'Soil Exploration & Sampling', completed: false, questionsSolved: 12, totalQuestions: 35 },
      { id: 'geo-foundations', name: 'Foundation Engineering (Shallow & Deep)', completed: false, questionsSolved: 18, totalQuestions: 80 }
    ]
  },
  {
    id: 'gate-struct',
    name: 'Structural Engineering',
    weightage: 13,
    icon: 'fa-building',
    topics: [
      { id: 'struct-som', name: 'Strength of Materials (Stress-Strain, Bending)', completed: true, questionsSolved: 75, totalQuestions: 90 },
      { id: 'struct-analysis', name: 'Structural Analysis (Trusses, Arches, Moment Dist)', completed: false, questionsSolved: 34, totalQuestions: 70 },
      { id: 'struct-rcc', name: 'Concrete Structures (LSM, Beams, Slabs)', completed: false, questionsSolved: 22, totalQuestions: 80 },
      { id: 'struct-steel', name: 'Steel Structures (Connections, Columns)', completed: false, questionsSolved: 10, totalQuestions: 55 }
    ]
  },
  {
    id: 'gate-env',
    name: 'Environmental Engineering',
    weightage: 10,
    icon: 'fa-droplet',
    topics: [
      { id: 'env-water', name: 'Water Quality & Treatment Processes', completed: false, questionsSolved: 25, totalQuestions: 60 },
      { id: 'env-waste', name: 'Wastewater Treatment & Disposal', completed: false, questionsSolved: 15, totalQuestions: 50 },
      { id: 'env-air', name: 'Air & Noise Pollution', completed: false, questionsSolved: 8, totalQuestions: 30 }
    ]
  }
];

const DEFAULT_SETTINGS = {
  userName: 'Commander',
  timeFormat: '24h',
  enforcementMode: 'STRICT', // NORMAL, STRICT, HARDCORE
  voiceEnabled: true,
  voiceRate: 1.0,
  voicePitch: 0.95,
  voiceVolume: 1.0,
  selectedVoiceIndex: 0,
  soundEffects: true,
  notificationsEnabled: true,
  energyLevel: 'High', // High, Medium, Low
  examDate: '2027-02-06',
  examName: 'GATE 2027',
  testSimulationSpeed: 1, // 1 real sec = x simulated seconds (1 = normal)
  theme: 'tactical-dark',
  hardcoreDelayLimit: 5, // mins
  strictDelayLimit: 15, // mins
  normalDelayLimit: 30, // mins
  initialized: false
};

// Export to window for vanilla modular architecture
window.DEFAULT_ROUTINE = DEFAULT_ROUTINE;
window.DEFAULT_GATE_SYLLABUS = DEFAULT_GATE_SYLLABUS;
window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
