// JARVIS Voice & Audio Announcer System
(function () {
  'use strict';

  const Voice = {
    _synth: window.speechSynthesis || null,
    _voices: [],
    _selectedVoice: null,
    _isSpeaking: false,

    init() {
      if (!this._synth) {
        console.warn('SpeechSynthesis API not supported in this environment.');
        return;
      }

      this._loadVoices();
      if (this._synth.onvoiceschanged !== undefined) {
        this._synth.onvoiceschanged = () => this._loadVoices();
      }
    },

    _loadVoices() {
      if (!this._synth) return;
      this._voices = this._synth.getVoices();
      const settings = State.data.settings || {};
      
      // Look for a futuristic / calm / professional English voice
      if (this._voices.length > 0) {
        const preferred = this._voices.find(v => 
          v.name.includes('Google UK English Male') ||
          v.name.includes('Daniel') ||
          v.name.includes('George') ||
          v.name.includes('Arthur') ||
          (v.lang.startsWith('en') && v.name.toLowerCase().includes('male'))
        );
        this._selectedVoice = preferred || this._voices.find(v => v.lang.startsWith('en')) || this._voices[0];
      }
    },

    getVoices() {
      return this._voices;
    },

    speak(text, priority = 'NORMAL') {
      const settings = State.data.settings || {};
      if (!settings.voiceEnabled || !this._synth) return;

      // Cancel ongoing lower priority speech if critical
      if (priority === 'CRITICAL' || priority === 'HIGH') {
        this._synth.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      if (this._selectedVoice) {
        utterance.voice = this._selectedVoice;
      }

      utterance.rate = settings.voiceRate || 1.0;
      utterance.pitch = settings.voicePitch || 0.95;
      utterance.volume = settings.voiceVolume || 1.0;

      utterance.onstart = () => {
        this._isSpeaking = true;
      };

      utterance.onend = () => {
        this._isSpeaking = false;
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis error:', e);
        this._isSpeaking = false;
      };

      // Play tactical audio chirp before JARVIS speaks
      if (settings.soundEffects) {
        Utils.playSound(priority === 'CRITICAL' ? 'alarm' : 'start');
      }

      this._synth.speak(utterance);
    },

    stop() {
      if (this._synth) {
        this._synth.cancel();
      }
    },

    // Procedural tactical sound triggers
    playClick() {
      if (State.data.settings.soundEffects) Utils.playSound('click');
    },

    playWarning() {
      if (State.data.settings.soundEffects) Utils.playSound('warning');
    },

    playAlarm() {
      if (State.data.settings.soundEffects) Utils.playSound('alarm');
    },

    playComplete() {
      if (State.data.settings.soundEffects) Utils.playSound('complete');
    }
  };

  window.Voice = Voice;
})();
