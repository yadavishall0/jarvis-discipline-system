// JARVIS Settings & Developer Test Simulation Controller
(function () {
  'use strict';

  const Settings = {
    init() {
      this.populateSettingsForm();
      this.populateVoiceList();
    },

    populateVoiceList() {
      const select = Utils.$('#setting-voice-select');
      if (!select) return;

      const voices = Voice.getVoices();
      select.innerHTML = '';

      voices.forEach((v, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `${v.name} (${v.lang})`;
        select.appendChild(opt);
      });

      if (State.data.settings.selectedVoiceIndex !== undefined) {
        select.value = State.data.settings.selectedVoiceIndex;
      }
    },

    populateSettingsForm() {
      const s = State.data.settings || {};

      const nameInput = Utils.$('#setting-username');
      const timeFormat = Utils.$('#setting-timeformat');
      const enforcementMode = Utils.$('#setting-enforcement');
      const voiceEnabled = Utils.$('#setting-voice-enabled');
      const voiceRate = Utils.$('#setting-voice-rate');
      const voicePitch = Utils.$('#setting-voice-pitch');
      const voiceVolume = Utils.$('#setting-voice-volume');
      const soundEffects = Utils.$('#setting-sfx-enabled');
      const notifEnabled = Utils.$('#setting-notif-enabled');
      const examDate = Utils.$('#setting-exam-date');
      const examName = Utils.$('#setting-exam-name');

      if (nameInput) nameInput.value = s.userName || 'Commander';
      if (timeFormat) timeFormat.value = s.timeFormat || '24h';
      if (enforcementMode) enforcementMode.value = s.enforcementMode || 'STRICT';
      if (voiceEnabled) voiceEnabled.checked = s.voiceEnabled !== false;
      if (voiceRate) voiceRate.value = s.voiceRate || 1.0;
      if (voicePitch) voicePitch.value = s.voicePitch || 0.95;
      if (voiceVolume) voiceVolume.value = s.voiceVolume || 1.0;
      if (soundEffects) soundEffects.checked = s.soundEffects !== false;
      if (notifEnabled) notifEnabled.checked = s.notificationsEnabled !== false;
      if (examDate) examDate.value = s.examDate || '2027-02-06';
      if (examName) examName.value = s.examName || 'GATE 2027';

      this.updateNotifStatusUI();
    },

    updateNotifStatusUI() {
      const statusEl = Utils.$('#notif-perm-status');
      if (!statusEl) return;
      if (!('Notification' in window)) {
        statusEl.textContent = 'UNSUPPORTED';
        statusEl.className = 'hud-badge badge-warning';
      } else {
        statusEl.textContent = Notification.permission.toUpperCase();
        statusEl.className = `hud-badge ${Notification.permission === 'granted' ? 'badge-active' : 'badge-warning'}`;
      }
    },

    saveFromForm() {
      const nameInput = Utils.$('#setting-username');
      const timeFormat = Utils.$('#setting-timeformat');
      const enforcementMode = Utils.$('#setting-enforcement');
      const voiceEnabled = Utils.$('#setting-voice-enabled');
      const voiceRate = Utils.$('#setting-voice-rate');
      const voicePitch = Utils.$('#setting-voice-pitch');
      const voiceVolume = Utils.$('#setting-voice-volume');
      const voiceSelect = Utils.$('#setting-voice-select');
      const soundEffects = Utils.$('#setting-sfx-enabled');
      const notifEnabled = Utils.$('#setting-notif-enabled');
      const examDate = Utils.$('#setting-exam-date');
      const examName = Utils.$('#setting-exam-name');

      const newSettings = {
        userName: nameInput ? nameInput.value.trim() : 'Commander',
        timeFormat: timeFormat ? timeFormat.value : '24h',
        enforcementMode: enforcementMode ? enforcementMode.value : 'STRICT',
        voiceEnabled: voiceEnabled ? voiceEnabled.checked : true,
        voiceRate: voiceRate ? parseFloat(voiceRate.value) : 1.0,
        voicePitch: voicePitch ? parseFloat(voicePitch.value) : 0.95,
        voiceVolume: voiceVolume ? parseFloat(voiceVolume.value) : 1.0,
        selectedVoiceIndex: voiceSelect ? parseInt(voiceSelect.value, 10) : 0,
        soundEffects: soundEffects ? soundEffects.checked : true,
        notificationsEnabled: notifEnabled ? notifEnabled.checked : true,
        examDate: examDate ? examDate.value : '2027-02-06',
        examName: examName ? examName.value : 'GATE 2027'
      };

      State.updateSettings(newSettings);
      Voice.playClick();
      Voice.speak('System parameters updated and synchronized.', 'NORMAL');
    },

    testVoice() {
      this.saveFromForm();
      Voice.speak('JARVIS system online. Audio synthesis operational at designated parameters.', 'HIGH');
    },

    async requestNotifications() {
      const res = await Notifications.requestPermission();
      this.updateNotifStatusUI();
      if (res === 'granted') {
        Notifications.notify('JARVIS PROTOCOL ACTIVE', 'Tactical accountability notifications verified.');
        Voice.speak('Notification link confirmed.', 'NORMAL');
      }
    },

    // Developer Test Simulation Actions
    setSimulationSpeed(speed) {
      Utils.setSimulationSpeed(speed);
      State.updateSettings({ testSimulationSpeed: Number(speed) });
      Voice.playClick();
    },

    advanceTime(minutes) {
      Utils.advanceTime(minutes);
      Voice.playClick();
      // Immediately trigger checks
      Enforcement.check();
      App.renderDashboard();
    },

    resetTimeSimulation() {
      Utils.resetSimulation();
      State.updateSettings({ testSimulationSpeed: 1 });
      Voice.playClick();
      App.renderDashboard();
    },

    simulateLevel(levelNum) {
      const ctx = Mission.getCurrentMissionContext();
      if (!ctx.activeMission) return;
      Enforcement.triggerEscalationAction(levelNum, ctx.activeMission, levelNum * 5, `SIMULATED LEVEL ${levelNum}`);
    },

    simulateAppRestartInterrupted() {
      const ctx = Mission.getCurrentMissionContext();
      if (!ctx.activeMission) return;

      const duration = (ctx.activeMission.duration || 60) * 60;
      Storage.set('ACTIVE_SESSION', {
        missionId: ctx.activeMission.id,
        missionName: ctx.activeMission.name,
        category: ctx.activeMission.category,
        startedAt: Utils.now() - (35 * 60 * 1000), // 35 minutes ago
        durationSeconds: duration,
        remainingSeconds: duration - (35 * 60),
        accumulatedSeconds: 35 * 60,
        isPaused: false,
        lastTick: Utils.now() - (15 * 60 * 1000), // closed 15m ago
        target: ctx.activeMission.target
      });

      location.reload();
    }
  };

  window.Settings = Settings;
})();
