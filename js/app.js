// JARVIS Personal Discipline System - Master Application Orchestrator
(function () {
  'use strict';

  let _globalTicker = null;

  const App = {
    async init() {
      // 1. Initialize persistent storage
      await Storage.init();

      // 2. Initialize state
      State.init();

      // 3. Initialize subsystems
      Voice.init();
      Notifications.init();
      Focus.init();
      JARVIS.init();
      Settings.init();

      // 4. Bind UI Event Handlers
      this.bindEvents();

      // 5. Check First-Run Onboarding
      if (!State.data.settings.initialized) {
        this.openOnboarding();
      }

      // 6. Check Interrupted Session (App Restart Recovery)
      if (State.data.interruptedSession) {
        this.handleInterruptedSession(State.data.interruptedSession);
      }

      // 7. Initial Render & Routing
      this.renderTopHUD();
      this.renderDashboard();
      this.renderRoutineTimeline();
      this.renderGateScreen();
      this.renderAnalyticsScreen();

      // 8. Start Global Ticker (1 second interval)
      this.startClockTicker();

      // 9. Handle Page Visibility / Wakeup
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.checkDayRollover();
          Enforcement.check();
          this.renderTopHUD();
          this.renderDashboard();
        }
      });

      window.addEventListener('focus', () => {
        this.checkDayRollover();
        Enforcement.check();
        this.renderTopHUD();
        this.renderDashboard();
      });

      console.log('JARVIS SYSTEM ONLINE. Operational readiness verified.');
    },

    bindEvents() {
      // Navigation tabs
      Utils.$$('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = e.currentTarget.getAttribute('data-screen');
          if (target) {
            Voice.playClick();
            this.navigateTo(target);
          }
        });
      });

      // Top HUD actions
      const btnEmergency = Utils.$('#btn-emergency-override');
      if (btnEmergency) {
        btnEmergency.addEventListener('click', () => this.openEmergencyModal());
      }

      // Console Command Input
      const cmdInput = Utils.$('#jarvis-cmd-input');
      const cmdSend = Utils.$('#btn-jarvis-send');
      const micBtn = Utils.$('#btn-jarvis-mic');

      if (cmdInput && cmdSend) {
        const sendCmd = () => {
          const val = cmdInput.value.trim();
          if (val) {
            JARVIS.executeCommand(val, 'TEXT');
            cmdInput.value = '';
          }
        };
        cmdSend.addEventListener('click', sendCmd);
        cmdInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') sendCmd();
        });
      }

      if (micBtn) {
        micBtn.addEventListener('click', () => JARVIS.toggleListening());
      }

      // Action Chips in Console
      Utils.$$('.quick-cmd-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
          const cmd = e.currentTarget.getAttribute('data-cmd');
          if (cmd) JARVIS.executeCommand(cmd, 'CHIP');
        });
      });

      // Focus Mode buttons
      const btnPause = Utils.$('#btn-focus-pause');
      const btnComplete = Utils.$('#btn-focus-complete');
      const btnAbandon = Utils.$('#btn-focus-abandon');

      if (btnPause) {
        btnPause.addEventListener('click', () => {
          if (State.data.activeSession && State.data.activeSession.isPaused) {
            Focus.resumeTimer();
          } else {
            Focus.pauseTimer();
          }
        });
      }

      if (btnComplete) {
        btnComplete.addEventListener('click', () => {
          Focus.pauseTimer();
          Focus.openVerificationModal();
        });
      }

      if (btnAbandon) {
        btnAbandon.addEventListener('click', () => {
          if (confirm('TACTICAL WARNING: Abandoning this mission will generate recovery debt and heavily penalize your discipline rating. Confirm abandon?')) {
            if (State.data.activeSession) {
              Mission.abandonMission(State.data.activeSession.missionId);
              Focus.hideFocusHUD();
              App.renderDashboard();
            }
          }
        });
      }

      // Verification Modal Buttons
      const btnVerifyFull = Utils.$('#btn-verify-full');
      const btnVerifyPartial = Utils.$('#btn-verify-partial');
      const btnVerifyFail = Utils.$('#btn-verify-fail');

      if (btnVerifyFull) btnVerifyFull.addEventListener('click', () => Focus.submitVerification('COMPLETED'));
      if (btnVerifyPartial) btnVerifyPartial.addEventListener('click', () => Focus.submitVerification('PARTIAL'));
      if (btnVerifyFail) btnVerifyFail.addEventListener('click', () => Focus.submitVerification('FAILED'));

      // Energy Level Selector
      Utils.$$('.energy-selector-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const level = e.currentTarget.getAttribute('data-energy');
          State.data.todayState.energyLevel = level;
          Storage.set('TODAY_STATE', State.data.todayState);
          this.updateEnergyUI();
          Voice.playClick();
          if (level === 'Low') {
            Voice.speak('Low energy mode acknowledged. Focus on lighter revision or PYQ sets.', 'NORMAL');
          }
        });
      });

      // Test Mode simulator controls
      const simSelect = Utils.$('#sim-speed-select');
      if (simSelect) {
        simSelect.addEventListener('change', (e) => Settings.setSimulationSpeed(e.target.value));
      }
      const btnSim5 = Utils.$('#btn-sim-advance-5');
      if (btnSim5) btnSim5.addEventListener('click', () => Settings.advanceTime(5));
      const btnSim10 = Utils.$('#btn-sim-advance-10');
      if (btnSim10) btnSim10.addEventListener('click', () => Settings.advanceTime(10));
      const btnSimReset = Utils.$('#btn-sim-reset');
      if (btnSimReset) btnSimReset.addEventListener('click', () => Settings.resetTimeSimulation());

      // Settings Save
      const btnSaveSettings = Utils.$('#btn-save-settings');
      if (btnSaveSettings) btnSaveSettings.addEventListener('click', () => Settings.saveFromForm());
      const btnTestVoice = Utils.$('#btn-test-voice');
      if (btnTestVoice) btnTestVoice.addEventListener('click', () => Settings.testVoice());
      const btnNotifPerm = Utils.$('#btn-request-notif');
      if (btnNotifPerm) btnNotifPerm.addEventListener('click', () => Settings.requestNotifications());

      // Data Backup / Restore
      const btnExport = Utils.$('#btn-export-data');
      if (btnExport) btnExport.addEventListener('click', () => Storage.exportAllData());
      const btnImport = Utils.$('#btn-import-data');
      const fileInput = Utils.$('#file-import-input');
      if (btnImport && fileInput) {
        btnImport.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async (event) => {
            const res = await Storage.importAllData(event.target.result);
            if (res.success) {
              alert('DATA RESTORE SUCCESSFUL. Reloading JARVIS...');
              location.reload();
            } else {
              alert(`Import failed: ${res.error}`);
            }
          };
          reader.readAsText(file);
        });
      }
      const btnResetFactory = Utils.$('#btn-reset-factory');
      if (btnResetFactory) {
        btnResetFactory.addEventListener('click', () => {
          if (confirm('CRITICAL ACTION: Reset all routines, logs, and progress back to factory defaults?')) {
            Storage.resetFactoryData();
            location.reload();
          }
        });
      }
    },

    navigateTo(screenId) {
      Utils.$$('.app-screen').forEach(s => s.classList.add('hidden'));
      Utils.$$('.nav-btn').forEach(b => b.classList.remove('active'));

      const target = Utils.$(`#${screenId}`);
      const btn = Utils.$(`.nav-btn[data-screen="${screenId}"]`);

      if (target) target.classList.remove('hidden');
      if (btn) btn.classList.add('active');

      // Refresh screens when visited
      if (screenId === 'screen-dashboard') this.renderDashboard();
      if (screenId === 'screen-routine') this.renderRoutineTimeline();
      if (screenId === 'screen-gate') this.renderGateScreen();
      if (screenId === 'screen-analytics') this.renderAnalyticsScreen();
    },

    startClockTicker() {
      if (_globalTicker) clearInterval(_globalTicker);

      _globalTicker = setInterval(() => {
        this.renderClock();
        this.checkDayRollover();
        Enforcement.check();
        this.renderCurrentMissionLive();
      }, 1000);
    },

    renderClock() {
      const now = Utils.getEffectiveDate();
      const clockEl = Utils.$('#hud-current-clock');
      const dateEl = Utils.$('#hud-current-date');
      const is24h = (State.data.settings.timeFormat || '24h') === '24h';

      if (clockEl) {
        const hours = now.getHours();
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');

        if (is24h) {
          clockEl.textContent = `${String(hours).padStart(2, '0')}:${mins}:${secs}`;
        } else {
          const displayH = hours % 12 || 12;
          const period = hours >= 12 ? 'PM' : 'AM';
          clockEl.textContent = `${String(displayH).padStart(2, '0')}:${mins}:${secs} ${period}`;
        }
      }

      if (dateEl) {
        dateEl.textContent = Utils.formatDateDisplay(Utils.getTodayDateString(now));
      }
    },

    checkDayRollover() {
      const todayStr = Utils.getTodayDateString();
      if (State.data.todayState.date && State.data.todayState.date !== todayStr) {
        console.log(`[DAY ROLLOVER DETECTED] Finalizing report for ${State.data.todayState.date}`);
        Analytics.generateDailyReport(State.data.todayState.date);

        // Reset state for the new day
        State.data.todayState = {
          date: todayStr,
          missions: {},
          dailyScore: 100,
          energyLevel: State.data.settings.energyLevel || 'High',
          emergencyOverride: false
        };
        Storage.set('TODAY_STATE', State.data.todayState);
        State.clearEscalation();
        this.renderTopHUD();
        this.renderDashboard();
        Voice.speak('New operational day initiated. Schedule synchronized.', 'NORMAL');
      }
    },

    renderTopHUD() {
      const disc = Discipline.calculateScore();
      const scoreEl = Utils.$('#hud-score-value');
      const debtEl = Utils.$('#hud-debt-value');
      const modeEl = Utils.$('#hud-enforcement-mode');
      const currentTaskTag = Utils.$('#hud-current-task-tag');

      if (scoreEl) scoreEl.textContent = disc.score;
      if (debtEl) debtEl.textContent = `${State.data.recoveryDebt}m`;
      if (modeEl) modeEl.textContent = State.data.settings.enforcementMode || 'STRICT';

      const ctx = Mission.getCurrentMissionContext();
      if (currentTaskTag) {
        currentTaskTag.textContent = ctx.activeMission ? ctx.activeMission.name : 'STANDBY';
      }

      this.updateEnergyUI();
    },

    updateEnergyUI() {
      const level = State.data.todayState.energyLevel || 'High';
      Utils.$$('.energy-selector-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-energy') === level);
      });
    },

    renderDashboard() {
      this.renderTopHUD();
      const ctx = Mission.getCurrentMissionContext();
      const missionHero = Utils.$('#current-mission-hero');
      const upcomingList = Utils.$('#upcoming-missions-list');
      const escalationBanner = Utils.$('#escalation-alert-banner');
      const recoveryProposal = Utils.$('#recovery-proposal-card');

      // 1. Escalation Alert
      if (escalationBanner) {
        const esc = State.data.escalation;
        if (esc && esc.level > 0 && !State.data.todayState.emergencyOverride) {
          escalationBanner.className = `escalation-alert level-${esc.level}`;
          escalationBanner.innerHTML = `
            <div class="alert-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <div class="alert-content">
              <div class="alert-level-tag">ENFORCEMENT LEVEL ${esc.level}</div>
              <div class="alert-message">${esc.message}</div>
            </div>
            <div class="alert-action">
              <button class="btn btn-primary btn-sm" onclick="Mission.startMission('${esc.missionId}'); Focus.openFocusScreen();">
                <i class="fa-solid fa-bolt"></i> START NOW
              </button>
            </div>
          `;
          escalationBanner.classList.remove('hidden');
        } else {
          escalationBanner.classList.add('hidden');
        }
      }

      // 2. Recovery Proposal Card (if debt exists)
      if (recoveryProposal) {
        if (State.data.recoveryDebt > 0) {
          const slots = Recovery.findAvailableSlots(30);
          if (slots.length > 0) {
            const nextSlot = slots[0];
            recoveryProposal.innerHTML = `
              <div class="recovery-badge"><i class="fa-solid fa-rotate-right"></i> RECOVERY REQUIRED</div>
              <div class="recovery-text">
                <strong>${State.data.recoveryDebt} minutes</strong> of unfulfilled work detected. 
                Next available window: <strong>${nextSlot.startTime} – ${nextSlot.endTime}</strong>.
              </div>
              <button class="btn btn-warning btn-sm" onclick="App.scheduleRecoverySlot('${nextSlot.startTime}', ${nextSlot.duration}, ${nextSlot.startMin})">
                <i class="fa-solid fa-calendar-plus"></i> INSERT RECOVERY SLOT
              </button>
            `;
            recoveryProposal.classList.remove('hidden');
          } else {
            recoveryProposal.innerHTML = `
              <div class="recovery-badge"><i class="fa-solid fa-rotate-right"></i> RECOVERY DEBT: ${State.data.recoveryDebt}m</div>
              <div class="recovery-text">No free windows remaining today without compromising sleep. Debt carries to tomorrow.</div>
            `;
            recoveryProposal.classList.remove('hidden');
          }
        } else {
          recoveryProposal.classList.add('hidden');
        }
      }

      // 3. Current Mission Hero
      if (missionHero) {
        const curr = ctx.activeMission;
        if (!curr) {
          missionHero.innerHTML = `
            <div class="hero-empty-state">
              <div class="hud-radar-pulse"></div>
              <h3>STANDBY // NO ACTIVE MISSION</h3>
              <p>System monitoring schedule. Stand by for upcoming mission window.</p>
            </div>
          `;
        } else {
          const state = State.data.todayState.missions[curr.id] || {};
          const status = state.status || 'PLANNED';
          const session = State.data.activeSession;

          let timeDisplay = '';
          let progressPercent = 0;

          if (session && session.missionId === curr.id) {
            timeDisplay = `${Utils.formatCountdown(session.remainingSeconds)} REMAINING`;
            const totalSec = session.durationSeconds || 1;
            progressPercent = Math.min(100, Math.max(0, Math.round(((totalSec - session.remainingSeconds) / totalSec) * 100)));
          } else {
            timeDisplay = `${curr.startTime} — ${curr.endTime} (${curr.duration}m)`;
          }

          const isRunning = status === 'ACTIVE';

          missionHero.innerHTML = `
            <div class="hero-header">
              <div class="hero-category"><i class="fa-solid ${curr.icon || 'fa-crosshairs'}"></i> ${curr.category.toUpperCase()}</div>
              <div class="hero-status status-${status.toLowerCase()}">${status}</div>
            </div>

            <h2 class="hero-title">${curr.name}</h2>
            <p class="hero-description">${curr.description || 'Dedicated mission block.'}</p>

            ${curr.target ? `
              <div class="hero-target-badge">
                <i class="fa-solid fa-bullseye"></i> TARGET: ${curr.target.amount} ${curr.target.unit || curr.target.type}
              </div>
            ` : ''}

            <div class="hero-time-row">
              <div class="hero-time-val">${timeDisplay}</div>
              ${ctx.lateMinutes > 0 && !isRunning ? `<div class="hero-late-tag">⚠ ${ctx.lateMinutes}m LATE</div>` : ''}
            </div>

            <div class="hud-progress-bar">
              <div class="hud-progress-fill" style="width: ${progressPercent}%;"></div>
            </div>

            <div class="hero-action-buttons">
              ${isRunning ? `
                <button class="btn btn-primary btn-lg" onclick="Focus.openFocusScreen(); Focus.openVerificationModal();">
                  <i class="fa-solid fa-check-double"></i> COMPLETE MISSION
                </button>
                <button class="btn btn-secondary" onclick="Focus.openFocusScreen();">
                  <i class="fa-solid fa-eye"></i> FOCUS HUD
                </button>
              ` : `
                <button class="btn btn-primary btn-lg" onclick="Mission.startMission('${curr.id}'); Focus.openFocusScreen();">
                  <i class="fa-solid fa-play"></i> START MISSION
                </button>
              `}
              
              ${!isRunning && curr.canDelay ? `
                <button class="btn btn-secondary" onclick="App.openDelayModal('${curr.id}')">
                  <i class="fa-solid fa-clock-rotate-left"></i> DELAY
                </button>
              ` : ''}

              ${!isRunning ? `
                <button class="btn btn-danger-outline" onclick="App.openSkipModal('${curr.id}')">
                  <i class="fa-solid fa-forward"></i> SKIP
                </button>
              ` : `
                <button class="btn btn-danger-outline" onclick="Mission.abandonMission('${curr.id}'); App.renderDashboard();">
                  <i class="fa-solid fa-xmark"></i> ABANDON
                </button>
              `}
            </div>
          `;
        }
      }

      // 4. Upcoming Missions List
      if (upcomingList) {
        const upcoming = ctx.upcomingMissions;
        if (upcoming.length === 0) {
          upcomingList.innerHTML = `<div class="empty-list-text">No subsequent missions scheduled for today.</div>`;
        } else {
          upcomingList.innerHTML = upcoming.slice(0, 5).map(m => `
            <div class="upcoming-item">
              <div class="upcoming-time">${m.startTime}</div>
              <div class="upcoming-info">
                <div class="upcoming-name">${m.name}</div>
                <div class="upcoming-meta">${m.category} • ${m.duration}m</div>
              </div>
              <div class="upcoming-priority badge-priority-${m.priority.toLowerCase()}">${m.priority}</div>
            </div>
          `).join('');
        }
      }
    },

    renderCurrentMissionLive() {
      // Fast ticker update for the current mission timer & progress
      const session = State.data.activeSession;
      if (session) {
        const timeVal = Utils.$('.hero-time-val');
        const fill = Utils.$('.hud-progress-fill');
        if (timeVal) {
          timeVal.textContent = `${Utils.formatCountdown(session.remainingSeconds)} REMAINING`;
        }
        if (fill) {
          const totalSec = session.durationSeconds || 1;
          const p = Math.min(100, Math.max(0, Math.round(((totalSec - session.remainingSeconds) / totalSec) * 100)));
          fill.style.width = `${p}%`;
        }
      }
    },

    renderRoutineTimeline() {
      const timeline = Utils.$('#routine-timeline-container');
      if (!timeline) return;

      const schedule = Routine.getTodaySchedule();
      const todayMissions = State.data.todayState.missions || {};

      if (schedule.length === 0) {
        timeline.innerHTML = `<div class="empty-list-text">No active routine configured.</div>`;
        return;
      }

      timeline.innerHTML = schedule.map(item => {
        const state = todayMissions[item.id] || {};
        const status = state.status || 'PLANNED';

        let statusBadge = `<span class="status-tag status-planned">PLANNED</span>`;
        if (status === 'ACTIVE') statusBadge = `<span class="status-tag status-active"><i class="fa-solid fa-spinner fa-spin"></i> ACTIVE</span>`;
        if (status === 'COMPLETED') statusBadge = `<span class="status-tag status-completed"><i class="fa-solid fa-check"></i> DONE</span>`;
        if (status === 'SKIPPED') statusBadge = `<span class="status-tag status-skipped"><i class="fa-solid fa-forward"></i> SKIPPED</span>`;
        if (status === 'MISSED' || status === 'FAILED') statusBadge = `<span class="status-tag status-missed"><i class="fa-solid fa-xmark"></i> MISSED</span>`;
        if (status === 'DELAYED') statusBadge = `<span class="status-tag status-delayed"><i class="fa-solid fa-clock"></i> DELAYED</span>`;

        return `
          <div class="timeline-row row-${status.toLowerCase()}">
            <div class="timeline-time-col">
              <span class="timeline-start">${item.startTime}</span>
              <span class="timeline-end">${item.endTime}</span>
            </div>
            <div class="timeline-node">
              <div class="node-circle node-${status.toLowerCase()}"></div>
              <div class="node-line"></div>
            </div>
            <div class="timeline-card">
              <div class="timeline-card-header">
                <span class="timeline-title">${item.name}</span>
                ${statusBadge}
              </div>
              <div class="timeline-card-desc">${item.description || ''}</div>
              <div class="timeline-card-footer">
                <span class="badge-category">${item.category}</span>
                <span class="timeline-duration">${item.duration}m</span>
                ${item.target ? `<span class="timeline-target"><i class="fa-solid fa-bullseye"></i> ${item.target.amount} ${item.target.unit || ''}</span>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
    },

    renderGateScreen() {
      const syllabus = State.data.gateSyllabus || [];
      const container = Utils.$('#gate-subjects-container');
      const readinessVal = Utils.$('#gate-readiness-val');
      const solvedVal = Utils.$('#gate-solved-val');
      const countdownVal = Utils.$('#gate-countdown-val');

      const stats = Gate.calculateReadiness();
      if (readinessVal) readinessVal.textContent = `${stats.percent}%`;
      if (solvedVal) solvedVal.textContent = stats.solvedQuestions;
      if (countdownVal) countdownVal.textContent = `${Gate.getDaysUntilExam()} DAYS`;

      if (!container) return;

      container.innerHTML = syllabus.map(subject => {
        const topics = subject.topics || [];
        const completed = topics.filter(t => t.completed).length;
        const progressPct = topics.length > 0 ? Math.round((completed / topics.length) * 100) : 0;

        return `
          <div class="gate-subject-card">
            <div class="gate-subject-header">
              <div class="gate-subject-title">
                <i class="fa-solid ${subject.icon || 'fa-book'}"></i> ${subject.name}
              </div>
              <div class="gate-subject-progress">${progressPct}%</div>
            </div>
            <div class="hud-progress-bar">
              <div class="hud-progress-fill" style="width: ${progressPct}%;"></div>
            </div>
            <div class="gate-topics-list">
              ${topics.map(t => `
                <div class="gate-topic-item ${t.completed ? 'completed' : ''}">
                  <label class="gate-topic-label">
                    <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="Gate.toggleTopicComplete('${subject.id}', '${t.id}'); App.renderGateScreen();">
                    <span>${t.name}</span>
                  </label>
                  <span class="gate-pyq-tally">${t.questionsSolved || 0} PYQs</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');
    },

    renderAnalyticsScreen() {
      const disc = Discipline.calculateScore();
      const report = Analytics.generateDailyReport();
      const streaks = Analytics.calculateStreaks();
      const recommendations = Analytics.getAdaptiveRecommendations();

      // Score hero
      const scoreEl = Utils.$('#analytics-score-big');
      const assessEl = Utils.$('#analytics-jarvis-assessment');
      if (scoreEl) scoreEl.textContent = disc.score;
      if (assessEl) assessEl.textContent = `"${report.assessment}"`;

      // Breakdown list
      const breakdownContainer = Utils.$('#analytics-breakdown-list');
      if (breakdownContainer) {
        breakdownContainer.innerHTML = disc.breakdown.map(item => `
          <div class="breakdown-item"><i class="fa-solid fa-angle-right"></i> ${item}</div>
        `).join('');
      }

      // Streaks
      const routineStreakEl = Utils.$('#streak-routine-val');
      const studyStreakEl = Utils.$('#streak-study-val');
      const onTimeStreakEl = Utils.$('#streak-ontime-val');

      if (routineStreakEl) routineStreakEl.textContent = `${streaks.routineStreak} DAYS`;
      if (studyStreakEl) studyStreakEl.textContent = `${streaks.studyStreak} DAYS`;
      if (onTimeStreakEl) onTimeStreakEl.textContent = `${streaks.onTimeStreak} DAYS`;

      // Adaptive recommendations
      const recsContainer = Utils.$('#analytics-recommendations-list');
      if (recsContainer) {
        if (recommendations.length === 0) {
          recsContainer.innerHTML = `<div class="empty-list-text">No recurring friction patterns detected. Routine alignment optimal.</div>`;
        } else {
          recsContainer.innerHTML = recommendations.map(r => `
            <div class="adaptive-rec-card">
              <div class="rec-header"><i class="fa-solid fa-lightbulb"></i> SCHEDULE OPTIMIZATION SUGGESTION</div>
              <div class="rec-reason">${r.reason}</div>
              <div class="rec-suggestion">${r.suggestion}</div>
            </div>
          `).join('');
        }
      }
    },

    // Delay Modal
    openDelayModal(missionId) {
      const mission = (State.data.routine || []).find(m => m.id === missionId);
      if (!mission) return;

      const modal = Utils.$('#modal-delay');
      const title = Utils.$('#delay-modal-mission-title');
      if (title) title.textContent = mission.name;

      // Bind delay buttons
      const btn5 = Utils.$('#btn-delay-5');
      const btn10 = Utils.$('#btn-delay-10');

      if (btn5) {
        btn5.onclick = () => {
          const res = Mission.delayMission(missionId, 5);
          if (modal) modal.classList.add('hidden');
          App.renderDashboard();
        };
      }

      if (btn10) {
        btn10.onclick = () => {
          const res = Mission.delayMission(missionId, 10);
          if (modal) modal.classList.add('hidden');
          App.renderDashboard();
        };
      }

      if (modal) modal.classList.remove('hidden');
    },

    closeDelayModal() {
      const modal = Utils.$('#modal-delay');
      if (modal) modal.classList.add('hidden');
    },

    // Skip Modal
    openSkipModal(missionId) {
      const mission = (State.data.routine || []).find(m => m.id === missionId);
      if (!mission) return;

      const modal = Utils.$('#modal-skip');
      const title = Utils.$('#skip-modal-mission-title');
      const debtWarning = Utils.$('#skip-debt-warning');

      if (title) title.textContent = mission.name;
      if (debtWarning) {
        debtWarning.textContent = mission.createsRecoveryDebt
          ? `WARNING: This mission creates ${mission.duration} minutes of RECOVERY DEBT.`
          : 'Non-study mission. Zero recovery debt incurred.';
      }

      const confirmBtn = Utils.$('#btn-confirm-skip');
      if (confirmBtn) {
        confirmBtn.onclick = () => {
          const reasonRadio = document.querySelector('input[name="skip-reason"]:checked');
          const reason = reasonRadio ? reasonRadio.value : 'Other';
          const noteInput = Utils.$('#skip-note-input');
          const note = noteInput ? noteInput.value.trim() : '';

          Mission.skipMission(missionId, reason, note);
          if (modal) modal.classList.add('hidden');
          App.renderDashboard();
        };
      }

      if (modal) modal.classList.remove('hidden');
    },

    closeSkipModal() {
      const modal = Utils.$('#modal-skip');
      if (modal) modal.classList.add('hidden');
    },

    // Emergency Override Modal
    openEmergencyModal() {
      const modal = Utils.$('#modal-emergency');
      if (modal) modal.classList.remove('hidden');

      const confirmBtn = Utils.$('#btn-confirm-emergency');
      if (confirmBtn) {
        confirmBtn.onclick = () => {
          State.setEmergencyOverride(true);
          Voice.speak('Emergency override engaged. Accountability suspended. Please attend to your urgent real-world priority.', 'HIGH');
          if (modal) modal.classList.add('hidden');
          App.renderDashboard();
        };
      }
    },

    closeEmergencyModal() {
      const modal = Utils.$('#modal-emergency');
      if (modal) modal.classList.add('hidden');
    },

    // App Restart Recovery Modal (Interrupted Session)
    handleInterruptedSession(session) {
      const modal = Utils.$('#modal-interrupted');
      if (!modal) return;

      const desc = Utils.$('#interrupted-desc');
      if (desc) {
        const elapsedMins = Math.floor((Utils.now() - session.startedAt) / 60000);
        desc.innerHTML = `
          <strong>Mission:</strong> ${session.missionName}<br>
          <strong>Started:</strong> ${new Date(session.startedAt).toLocaleTimeString()}<br>
          <strong>Total Time Elapsed:</strong> ${elapsedMins} minutes<br>
          System detected an unexpected app closure during this mission.
        `;
      }

      const btnResume = Utils.$('#btn-interrupted-resume');
      const btnComplete = Utils.$('#btn-interrupted-complete');
      const btnAbandon = Utils.$('#btn-interrupted-abandon');

      if (btnResume) {
        btnResume.onclick = () => {
          State.setActiveSession(session);
          State.clearInterruptedSession();
          modal.classList.add('hidden');
          Focus.openFocusScreen();
        };
      }

      if (btnComplete) {
        btnComplete.onclick = () => {
          State.setActiveSession(session);
          State.clearInterruptedSession();
          modal.classList.add('hidden');
          Focus.openVerificationModal();
        };
      }

      if (btnAbandon) {
        btnAbandon.onclick = () => {
          State.clearInterruptedSession();
          Mission.abandonMission(session.missionId);
          modal.classList.add('hidden');
          App.renderDashboard();
        };
      }

      modal.classList.remove('hidden');
    },

    // Schedule Recovery Slot helper
    scheduleRecoverySlot(startTime, duration, startMin) {
      Recovery.scheduleRecoveryMission({
        startTime,
        duration,
        startMin
      });
      App.renderDashboard();
      App.renderRoutineTimeline();
    },

    // First Run Onboarding
    openOnboarding() {
      const wizard = Utils.$('#modal-onboarding');
      if (wizard) wizard.classList.remove('hidden');

      const btnFinish = Utils.$('#btn-onboarding-finish');
      if (btnFinish) {
        btnFinish.onclick = () => {
          const name = Utils.$('#onboarding-name').value || 'Commander';
          const mode = Utils.$('#onboarding-mode').value || 'STRICT';
          State.updateSettings({
            userName: name,
            enforcementMode: mode,
            initialized: true
          });
          if (wizard) wizard.classList.add('hidden');
          Voice.speak(`JARVIS initialization complete. Welcome aboard, ${name}. Your routine is now an active system.`, 'HIGH');
          App.renderDashboard();
        };
      }
    }
  };

  // Bootstrap when DOM ready
  window.addEventListener('DOMContentLoaded', () => App.init());

  window.App = App;
})();
