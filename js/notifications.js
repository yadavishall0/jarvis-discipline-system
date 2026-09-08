// JARVIS Notifications Engine (Web Notifications & Mobile Haptic Vibration)
(function () {
  'use strict';

  const Notifications = {
    permission: 'default',

    init() {
      if ('Notification' in window) {
        this.permission = Notification.permission;
      }
    },

    async requestPermission() {
      if (!('Notification' in window)) {
        return 'unsupported';
      }
      try {
        const res = await Notification.requestPermission();
        this.permission = res;
        return res;
      } catch (err) {
        console.warn('Failed to request notification permission:', err);
        return 'denied';
      }
    },

    notify(title, body, tag = 'jarvis-discipline', requireInteraction = false) {
      const settings = State.data.settings || {};
      if (!settings.notificationsEnabled) return;

      // Haptic tactile feedback for mobile devices
      if ('vibrate' in navigator) {
        if (requireInteraction) {
          navigator.vibrate([300, 150, 300, 150, 500]);
        } else {
          navigator.vibrate([150, 80, 150]);
        }
      }

      if (!('Notification' in window) || Notification.permission !== 'granted') {
        console.log(`[JARVIS NOTIFICATION FALLBACK] ${title}: ${body}`);
        return;
      }

      try {
        const options = {
          body: body,
          icon: './assets/icons/icon-192.png',
          badge: './assets/icons/icon-192.png',
          tag: tag,
          renotify: true,
          requireInteraction: requireInteraction
        };

        const notification = new Notification(title, options);
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (e) {
        console.warn('Notification instantiation failed:', e);
      }
    },

    notifyUpcoming(missionName, minutesUntil) {
      this.notify(
        'JARVIS: MISSION UPCOMING',
        `${missionName} begins in ${minutesUntil} minutes. Prepare your workstation.`,
        'upcoming'
      );
    },

    notifyStart(missionName) {
      this.notify(
        'JARVIS: MISSION BEGINS NOW',
        `${missionName} is now active. Report to station immediately.`,
        'mission-start',
        true
      );
    },

    notifyLate(missionName, lateMinutes) {
      this.notify(
        'JARVIS: DISCIPLINE WARNING',
        `You are ${lateMinutes} minutes late for ${missionName}. Start the mission now.`,
        'mission-late',
        true
      );
    },

    notifyCritical(missionName, debtAdded) {
      this.notify(
        'JARVIS: CRITICAL ROUTINE VIOLATION',
        `${missionName} violation threshold reached. ${debtAdded}m recovery debt added.`,
        'mission-critical',
        true
      );
    },

    notifyComplete(missionName, durationMins) {
      this.notify(
        'JARVIS: MISSION ACCOMPLISHED',
        `${missionName} completed (${durationMins}m). Targets recorded.`,
        'mission-complete'
      );
    }
  };

  window.Notifications = Notifications;
})();
