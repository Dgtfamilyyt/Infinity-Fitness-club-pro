import { WorkoutAssignment } from '../types';

export interface WorkoutReminderAlert {
  id: string;
  workoutId: string;
  workoutTitle: string;
  timeSlot: string;
  startTimeFormatted: string;
  minutesRemaining: number;
  zoneName: string;
  trainerName: string;
  exercisesCount: number;
  timestamp: number;
  isTest?: boolean;
}

export interface NotificationPreferences {
  inAppToastEnabled: boolean;
  browserPushEnabled: boolean;
  soundEnabled: boolean;
  advanceMinutes: number; // 60 minutes default
}

const PREFERENCES_KEY = 'ifc_notification_preferences';
const REMINDERS_SENT_KEY = 'ifc_sent_workout_reminders';
const SNOOZED_UNTIL_KEY = 'ifc_workout_reminder_snoozed_until';

class NotificationService {
  private listeners: Set<(alert: WorkoutReminderAlert) => void> = new Set();
  private audioContext: AudioContext | null = null;

  constructor() {
    // Initialize notification preferences if not set
    if (typeof window !== 'undefined') {
      this.getPreferences();
    }
  }

  /**
   * Parse a workout time slot string (e.g. "6:00 PM – 7:00 PM", "18:00 - 19:00", "06:30 AM")
   * into a concrete JavaScript Date object.
   */
  parseStartTime(timeSlot?: string, dateStr?: string): Date | null {
    if (!timeSlot) return null;

    try {
      // Extract start part before dash or en-dash
      const rawStart = timeSlot.split(/[–—\-]/)[0].trim();
      if (!rawStart) return null;

      // Extract hours, minutes, and optional meridian (AM/PM)
      const match = rawStart.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
      if (!match) return null;

      let hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      const meridian = match[3] ? match[3].toUpperCase() : null;

      if (meridian === 'PM' && hours < 12) {
        hours += 12;
      } else if (meridian === 'AM' && hours === 12) {
        hours = 0;
      }

      // Base date
      let targetDate = new Date();
      if (dateStr) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            targetDate = new Date(year, month, day);
          }
        }
      }

      targetDate.setHours(hours, minutes, 0, 0);
      return targetDate;
    } catch (err) {
      console.warn('Could not parse timeSlot:', timeSlot, err);
      return null;
    }
  }

  /**
   * Calculates minutes remaining until the scheduled session starts.
   */
  getMinutesUntilSession(timeSlot?: string, dateStr?: string): number | null {
    const startDate = this.parseStartTime(timeSlot, dateStr);
    if (!startDate) return null;

    const diffMs = startDate.getTime() - Date.now();
    return Math.round(diffMs / 60000);
  }

  /**
   * Format start time nicely (e.g. "6:00 PM")
   */
  formatStartTime(timeSlot?: string, dateStr?: string): string {
    const startDate = this.parseStartTime(timeSlot, dateStr);
    if (!startDate) return timeSlot?.split(/[–—\-]/)[0].trim() || 'Scheduled Time';

    return startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  /**
   * Check if the workout qualifies for a 1-hour advance reminder (e.g., between 60 and 0 minutes left).
   */
  checkShouldTrigger1HourReminder(workout: WorkoutAssignment): {
    shouldTrigger: boolean;
    minutesRemaining: number;
    startTimeFormatted: string;
  } {
    if (this.isSnoozed()) {
      return { shouldTrigger: false, minutesRemaining: 0, startTimeFormatted: '' };
    }

    const minutesRemaining = this.getMinutesUntilSession(workout.timeSlot, workout.date);
    if (minutesRemaining === null) {
      return { shouldTrigger: false, minutesRemaining: 0, startTimeFormatted: '' };
    }

    const startTimeFormatted = this.formatStartTime(workout.timeSlot, workout.date);
    const prefs = this.getPreferences();
    const thresholdMinutes = prefs.advanceMinutes || 60;

    // Trigger if within the reminder window (between 0 and thresholdMinutes e.g. 60 mins)
    const isWithinWindow = minutesRemaining <= thresholdMinutes && minutesRemaining > 0;

    if (!isWithinWindow) {
      return { shouldTrigger: false, minutesRemaining, startTimeFormatted };
    }

    // Check if we already alerted for this workout session window today
    const dateKey = workout.date || new Date().toISOString().split('T')[0];
    const reminderKey = `${workout.id}_${dateKey}_1hr`;
    if (this.hasReminderBeenSent(reminderKey)) {
      return { shouldTrigger: false, minutesRemaining, startTimeFormatted };
    }

    return { shouldTrigger: true, minutesRemaining, startTimeFormatted };
  }

  /**
   * Check whether Web Push / Browser Notifications are supported.
   */
  isPushSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Get current browser notification permission status.
   */
  getPushPermission(): NotificationPermission | 'unsupported' {
    if (!this.isPushSupported()) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Request browser push notification permissions.
   */
  async requestPushPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!this.isPushSupported()) return 'unsupported';
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const prefs = this.getPreferences();
        this.savePreferences({ ...prefs, browserPushEnabled: true });
      }
      return permission;
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return 'denied';
    }
  }

  /**
   * Dispatch a native browser notification if enabled and granted.
   */
  sendNativeNotification(title: string, options?: NotificationOptions): boolean {
    if (!this.isPushSupported()) return false;
    if (Notification.permission !== 'granted') return false;

    const prefs = this.getPreferences();
    if (!prefs.browserPushEnabled) return false;

    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'ifc-workout-reminder',
        ...options
      });
      return true;
    } catch (err) {
      console.warn('Could not display native notification:', err);
      return false;
    }
  }

  /**
   * Plays a subtle, pleasant high-contrast chime using Web Audio API synthesis.
   */
  playNotificationChime(): void {
    const prefs = this.getPreferences();
    if (!prefs.soundEnabled) return;

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioContext) {
        this.audioContext = new AudioContextClass();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;

      // Note 1: 523.25 Hz (C5)
      const osc1 = this.audioContext.createOscillator();
      const gain1 = this.audioContext.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.18, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(this.audioContext.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Note 2: 659.25 Hz (E5) - harmonized chime
      const osc2 = this.audioContext.createOscillator();
      const gain2 = this.audioContext.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.12);
      gain2.gain.setValueAtTime(0, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.22, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(this.audioContext.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.7);

      // Gentle haptic vibration if supported
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([80, 40, 80]);
      }
    } catch (err) {
      console.debug('Audio chime unable to play:', err);
    }
  }

  /**
   * Broadcast an alert to all registered in-app toast listeners and triggers push + sound.
   */
  dispatchReminderAlert(alert: WorkoutReminderAlert, isTest = false): void {
    const prefs = this.getPreferences();

    // 1. Play audio chime
    if (prefs.soundEnabled) {
      this.playNotificationChime();
    }

    // 2. Dispatch native browser push notification
    if (prefs.browserPushEnabled) {
      const body = `Session begins at ${alert.startTimeFormatted} (${alert.minutesRemaining} mins) in ${alert.zoneName}. Tap to view exercises.`;
      this.sendNativeNotification(`Workout Reminder: ${alert.workoutTitle}`, {
        body,
        data: { workoutId: alert.workoutId }
      });
    }

    // 3. Mark as sent if not a test
    if (!isTest) {
      const dateKey = new Date().toISOString().split('T')[0];
      const reminderKey = `${alert.workoutId}_${dateKey}_1hr`;
      this.markReminderSent(reminderKey);
    }

    // 4. Notify in-app toast subscribers
    if (prefs.inAppToastEnabled) {
      this.listeners.forEach(fn => fn(alert));
    }
  }

  /**
   * Manually trigger a preview/test of the 1-hour reminder so users can immediately test it.
   */
  triggerTestReminder(workout: WorkoutAssignment): WorkoutReminderAlert {
    const startTimeFormatted = this.formatStartTime(workout.timeSlot, workout.date);
    const alert: WorkoutReminderAlert = {
      id: `alert-test-${Date.now()}`,
      workoutId: workout.id,
      workoutTitle: workout.title || 'Scheduled Session',
      timeSlot: workout.timeSlot || '6:00 PM – 7:00 PM',
      startTimeFormatted,
      minutesRemaining: 60, // Exactly 1 hour before
      zoneName: workout.zoneName || 'Main Training Floor',
      trainerName: workout.trainerName || 'Floor Coach',
      exercisesCount: workout.exercises?.length || 5,
      timestamp: Date.now(),
      isTest: true
    };

    this.dispatchReminderAlert(alert, true);
    return alert;
  }

  /**
   * Subscribe to in-app reminder alerts. Returns unsubscribe cleanup.
   */
  subscribe(callback: (alert: WorkoutReminderAlert) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Snooze reminders for a set number of minutes (default 10).
   */
  snoozeReminder(minutes = 10): void {
    const until = Date.now() + minutes * 60 * 1000;
    try {
      localStorage.setItem(SNOOZED_UNTIL_KEY, until.toString());
    } catch {
      // storage unavailable
    }
  }

  isSnoozed(): boolean {
    try {
      const raw = localStorage.getItem(SNOOZED_UNTIL_KEY);
      if (!raw) return false;
      const until = parseInt(raw, 10);
      return Date.now() < until;
    } catch {
      return false;
    }
  }

  getSnoozeMinutesRemaining(): number {
    try {
      const raw = localStorage.getItem(SNOOZED_UNTIL_KEY);
      if (!raw) return 0;
      const until = parseInt(raw, 10);
      const diff = until - Date.now();
      return diff > 0 ? Math.ceil(diff / 60000) : 0;
    } catch {
      return 0;
    }
  }

  clearSnooze(): void {
    try {
      localStorage.removeItem(SNOOZED_UNTIL_KEY);
    } catch {
      // storage unavailable
    }
  }

  private hasReminderBeenSent(key: string): boolean {
    try {
      const raw = sessionStorage.getItem(REMINDERS_SENT_KEY);
      if (!raw) return false;
      const list: string[] = JSON.parse(raw);
      return list.includes(key);
    } catch {
      return false;
    }
  }

  private markReminderSent(key: string): void {
    try {
      const raw = sessionStorage.getItem(REMINDERS_SENT_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(key)) {
        list.push(key);
        sessionStorage.setItem(REMINDERS_SENT_KEY, JSON.stringify(list));
      }
    } catch {
      // storage unavailable
    }
  }

  /**
   * Preferences getters and setters.
   */
  getPreferences(): NotificationPreferences {
    const defaults: NotificationPreferences = {
      inAppToastEnabled: true,
      browserPushEnabled: typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted',
      soundEnabled: true,
      advanceMinutes: 60
    };

    try {
      const raw = localStorage.getItem(PREFERENCES_KEY);
      if (!raw) return defaults;
      return { ...defaults, ...JSON.parse(raw) };
    } catch {
      return defaults;
    }
  }

  savePreferences(prefs: NotificationPreferences): void {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    } catch {
      // storage unavailable
    }
  }
}

export const notificationService = new NotificationService();
