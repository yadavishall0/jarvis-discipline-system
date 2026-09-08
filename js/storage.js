// JARVIS Storage Layer - LocalStorage & IndexedDB Engine
(function () {
  'use strict';

  const DB_NAME = 'JARVIS_DISCIPLINE_DB';
  const DB_VERSION = 1;

  const Storage = {
    _db: null,

    init() {
      return new Promise((resolve) => {
        if (!window.indexedDB) {
          console.warn('IndexedDB not supported, relying strictly on localStorage.');
          return resolve(false);
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('sessions')) {
            db.createObjectStore('sessions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('dailyReports')) {
            db.createObjectStore('dailyReports', { keyPath: 'date' });
          }
          if (!db.objectStoreNames.contains('violations')) {
            db.createObjectStore('violations', { keyPath: 'id' });
          }
        };

        request.onsuccess = (e) => {
          this._db = e.target.result;
          resolve(true);
        };

        request.onerror = (e) => {
          console.warn('IndexedDB open failed:', e);
          resolve(false);
        };
      });
    },

    // LocalStorage Get/Set with JSON error guarding
    get(key, defaultValue = null) {
      try {
        const val = localStorage.getItem('JARVIS_' + key);
        if (val === null || val === undefined) return defaultValue;
        return JSON.parse(val);
      } catch (e) {
        console.error(`Storage read error for ${key}:`, e);
        return defaultValue;
      }
    },

    set(key, value) {
      try {
        localStorage.setItem('JARVIS_' + key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.error(`Storage write error for ${key}:`, e);
        return false;
      }
    },

    remove(key) {
      try {
        localStorage.removeItem('JARVIS_' + key);
      } catch (e) {
        console.error(`Storage remove error for ${key}:`, e);
      }
    },

    // IndexedDB helpers
    saveSessionLog(sessionRecord) {
      if (!this._db) {
        const existing = this.get('SESSION_LOGS', []);
        existing.unshift(sessionRecord);
        if (existing.length > 500) existing.pop();
        this.set('SESSION_LOGS', existing);
        return Promise.resolve(true);
      }

      return new Promise((resolve) => {
        try {
          const tx = this._db.transaction(['sessions'], 'readwrite');
          const store = tx.objectStore('sessions');
          store.put(sessionRecord);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) {
          console.warn('IndexedDB write session failed, using fallback:', e);
          const existing = this.get('SESSION_LOGS', []);
          existing.unshift(sessionRecord);
          this.set('SESSION_LOGS', existing);
          resolve(true);
        }
      });
    },

    getAllSessionLogs() {
      if (!this._db) {
        return Promise.resolve(this.get('SESSION_LOGS', []));
      }

      return new Promise((resolve) => {
        try {
          const tx = this._db.transaction(['sessions'], 'readonly');
          const store = tx.objectStore('sessions');
          const req = store.getAll();
          req.onsuccess = () => {
            const list = req.result || [];
            list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            resolve(list);
          };
          req.onerror = () => resolve(this.get('SESSION_LOGS', []));
        } catch (e) {
          resolve(this.get('SESSION_LOGS', []));
        }
      });
    },

    saveDailyReport(report) {
      if (!report || !report.date) return Promise.resolve(false);
      
      // Also cache in localStorage for fast dashboard widgets
      const reports = this.get('DAILY_REPORTS', {});
      reports[report.date] = report;
      this.set('DAILY_REPORTS', reports);

      if (!this._db) return Promise.resolve(true);

      return new Promise((resolve) => {
        try {
          const tx = this._db.transaction(['dailyReports'], 'readwrite');
          const store = tx.objectStore('dailyReports');
          store.put(report);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) {
          resolve(true);
        }
      });
    },

    getDailyReports() {
      return this.get('DAILY_REPORTS', {});
    },

    // Export complete data to portable JSON
    async exportAllData() {
      const sessionLogs = await this.getAllSessionLogs();
      const exportObject = {
        meta: {
          app: 'JARVIS_DISCIPLINE_SYSTEM',
          version: '1.0.0',
          exportedAt: new Date().toISOString()
        },
        settings: this.get('SETTINGS', {}),
        routine: this.get('ROUTINE', []),
        routinesLibrary: this.get('ROUTINES_LIBRARY', {}),
        gateSyllabus: this.get('GATE_SYLLABUS', []),
        recoveryDebt: this.get('RECOVERY_DEBT', 0),
        recoveryLogs: this.get('RECOVERY_LOGS', []),
        dailyReports: this.get('DAILY_REPORTS', {}),
        todayState: this.get('TODAY_STATE', {}),
        disciplineHistory: this.get('DISCIPLINE_HISTORY', []),
        sessionLogs: sessionLogs
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `JARVIS_BACKUP_${Utils.getTodayDateString()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      return true;
    },

    // Import data with defensive validation
    async importAllData(jsonString) {
      try {
        const data = JSON.parse(jsonString);
        if (!data || typeof data !== 'object') throw new Error('Invalid JSON structure.');
        if (data.meta && data.meta.app !== 'JARVIS_DISCIPLINE_SYSTEM') {
          throw new Error('Unrecognized backup format.');
        }

        if (data.settings) this.set('SETTINGS', data.settings);
        if (data.routine) this.set('ROUTINE', data.routine);
        if (data.routinesLibrary) this.set('ROUTINES_LIBRARY', data.routinesLibrary);
        if (data.gateSyllabus) this.set('GATE_SYLLABUS', data.gateSyllabus);
        if (typeof data.recoveryDebt === 'number') this.set('RECOVERY_DEBT', data.recoveryDebt);
        if (data.recoveryLogs) this.set('RECOVERY_LOGS', data.recoveryLogs);
        if (data.dailyReports) this.set('DAILY_REPORTS', data.dailyReports);
        if (data.todayState) this.set('TODAY_STATE', data.todayState);
        if (data.disciplineHistory) this.set('DISCIPLINE_HISTORY', data.disciplineHistory);

        if (Array.isArray(data.sessionLogs)) {
          for (const s of data.sessionLogs) {
            await this.saveSessionLog(s);
          }
        }

        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // Reset all application data
    resetFactoryData() {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith('JARVIS_')) {
          localStorage.removeItem(k);
        }
      }
      return true;
    }
  };

  window.Storage = Storage;
})();
