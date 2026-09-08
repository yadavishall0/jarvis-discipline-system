// JARVIS Utilities & Audio Synthesizer
(function () {
  'use strict';

  const Utils = {
    // Simulated Time Offset (in milliseconds) for Dev/Test Mode
    _timeOffset: 0,
    _simulationSpeed: 1, // 1 = real-time, 60 = 1s = 1m
    _simulatedStartTime: Date.now(),
    _simulatedVirtualStart: Date.now(),

    // Current effective timestamp (respects simulation speed & offset)
    now() {
      if (this._simulationSpeed === 1) {
        return Date.now() + this._timeOffset;
      }
      const realElapsed = Date.now() - this._simulatedStartTime;
      return this._simulatedVirtualStart + (realElapsed * this._simulationSpeed) + this._timeOffset;
    },

    getEffectiveDate() {
      return new Date(this.now());
    },

    setSimulationSpeed(speed) {
      const currentVirtual = this.now();
      this._simulationSpeed = Number(speed) || 1;
      this._simulatedStartTime = Date.now();
      this._simulatedVirtualStart = currentVirtual;
    },

    advanceTime(minutes) {
      this._timeOffset += (minutes * 60 * 1000);
    },

    resetSimulation() {
      this._timeOffset = 0;
      this._simulationSpeed = 1;
      this._simulatedStartTime = Date.now();
      this._simulatedVirtualStart = Date.now();
    },

    // Time calculations
    timeStringToMinutes(str) {
      if (!str || typeof str !== 'string') return 0;
      const [h, m] = str.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    },

    minutesToTimeString(mins, format24 = true) {
      let m = Math.floor(mins) % (24 * 60);
      if (m < 0) m += (24 * 60);
      const hours = Math.floor(m / 60);
      const minutes = m % 60;

      if (!format24) {
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayH = hours % 12 || 12;
        return `${String(displayH).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
      }
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    },

    formatDuration(minutes) {
      const h = Math.floor(minutes / 60);
      const m = Math.floor(minutes % 60);
      if (h === 0) return `${m}m`;
      if (m === 0) return `${h}h`;
      return `${h}h ${m}m`;
    },

    formatCountdown(totalSeconds) {
      if (totalSeconds < 0) totalSeconds = 0;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = Math.floor(totalSeconds % 60);
      return [hours, minutes, seconds]
        .map(v => String(v).padStart(2, '0'))
        .join(':');
    },

    getTodayDateString(dateObj = null) {
      const d = dateObj || this.getEffectiveDate();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    formatDateDisplay(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).toUpperCase();
    },

    // UUID Generator
    generateId(prefix = 'id') {
      return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6)}`;
    },

    // DOM Helpers
    $(selector, parent = document) {
      return parent.querySelector(selector);
    },

    $$(selector, parent = document) {
      return Array.from(parent.querySelectorAll(selector));
    },

    // Procedural Audio Synthesizer via Web Audio API (Zero external file dependencies)
    _audioCtx: null,

    getAudioContext() {
      if (!this._audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this._audioCtx = new AudioContextClass();
        }
      }
      if (this._audioCtx && this._audioCtx.state === 'suspended') {
        this._audioCtx.resume();
      }
      return this._audioCtx;
    },

    playSound(type) {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        switch (type) {
          case 'click':
            // Tactical HUD micro-click
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.04);
            osc.start(now);
            osc.stop(now + 0.04);
            break;

          case 'start':
            // High-tech mission engage chirp
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
            osc.frequency.exponentialRampToValueAtTime(1760, now + 0.25);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;

          case 'warning':
            // Double pulsed warning beep
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(650, now);
            osc.frequency.setValueAtTime(820, now + 0.12);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.02, now + 0.28);
            osc.start(now);
            osc.stop(now + 0.28);
            break;

          case 'alarm':
            // Escalating Level 4/5 alarm sweep
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(900, now);
            osc.frequency.linearRampToValueAtTime(300, now + 0.18);
            osc.frequency.linearRampToValueAtTime(900, now + 0.36);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0.02, now + 0.45);
            osc.start(now);
            osc.stop(now + 0.45);
            break;

          case 'complete':
            // Harmonic major chord chime
            [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.type = 'sine';
              o.frequency.value = freq;
              o.connect(g);
              g.connect(ctx.destination);
              g.gain.setValueAtTime(0.12, now + i * 0.08);
              g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.5);
              o.start(now + i * 0.08);
              o.stop(now + i * 0.08 + 0.5);
            });
            break;

          default:
            break;
        }
      } catch (err) {
        console.warn('Audio synthesis failed:', err);
      }
    }
  };

  window.Utils = Utils;
})();
