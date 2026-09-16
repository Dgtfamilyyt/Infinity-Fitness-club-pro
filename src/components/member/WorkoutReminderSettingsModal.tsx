import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Clock, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Sparkles, 
  X, 
  Check, 
  AlertCircle, 
  Info, 
  FastForward,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { WorkoutAssignment } from '../../types';
import { notificationService, NotificationPreferences } from '../../services/notificationService';
import { dataService } from '../../services/dataService';

interface WorkoutReminderSettingsModalProps {
  workout: WorkoutAssignment;
  isOpen: boolean;
  onClose: () => void;
  onTriggerTestReminder: () => void;
}

export const WorkoutReminderSettingsModal: React.FC<WorkoutReminderSettingsModalProps> = ({
  workout,
  isOpen,
  onClose,
  onTriggerTestReminder
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => 
    notificationService.getPreferences()
  );
  const [pushStatus, setPushStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [scheduledSlot, setScheduledSlot] = useState(workout.timeSlot || '6:00 PM – 7:00 PM');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPreferences(notificationService.getPreferences());
      setPushStatus(notificationService.getPushPermission());
      setScheduledSlot(workout.timeSlot || '6:00 PM – 7:00 PM');
      setSaveSuccess(false);
    }
  }, [isOpen, workout.timeSlot]);

  if (!isOpen) return null;

  const handleToggleToast = () => {
    const updated = { ...preferences, inAppToastEnabled: !preferences.inAppToastEnabled };
    setPreferences(updated);
    notificationService.savePreferences(updated);
  };

  const handleToggleSound = () => {
    const updated = { ...preferences, soundEnabled: !preferences.soundEnabled };
    setPreferences(updated);
    notificationService.savePreferences(updated);
    if (updated.soundEnabled) {
      notificationService.playNotificationChime();
    }
  };

  const handleRequestPush = async () => {
    setIsRequestingPermission(true);
    const result = await notificationService.requestPushPermission();
    setPushStatus(result);
    setIsRequestingPermission(false);

    if (result === 'granted') {
      const updated = { ...preferences, browserPushEnabled: true };
      setPreferences(updated);
      notificationService.savePreferences(updated);
      // Dispatch a quick test push notification
      notificationService.sendNativeNotification('Infinity Fitness Club', {
        body: 'Push notifications successfully activated for workout session reminders!'
      });
    }
  };

  const handleTogglePushPref = () => {
    if (pushStatus !== 'granted') {
      handleRequestPush();
      return;
    }
    const updated = { ...preferences, browserPushEnabled: !preferences.browserPushEnabled };
    setPreferences(updated);
    notificationService.savePreferences(updated);
  };

  const handleSetSlotOneHourFromNow = () => {
    // Calculate 1 hour from now for quick real-time testing
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const twoHoursLater = new Date(now.getTime() + 120 * 60 * 1000);

    const formatTime = (d: Date) => 
      d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    const newSlotStr = `${formatTime(oneHourLater)} – ${formatTime(twoHoursLater)}`;
    setScheduledSlot(newSlotStr);
    dataService.updateWorkoutTimeSlot(newSlotStr);

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCustomSlotSave = () => {
    dataService.updateWorkoutTimeSlot(scheduledSlot);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Calculate reminder time (1 hour prior to session)
  const startTimeObj = notificationService.parseStartTime(workout.timeSlot, workout.date);
  const reminderTimeFormatted = startTimeObj 
    ? new Date(startTimeObj.getTime() - 60 * 60 * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
    : '1 Hour Before';

  const minutesUntil = notificationService.getMinutesUntilSession(workout.timeSlot, workout.date);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl bg-[#121214] border border-zinc-800 p-6 text-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Bell className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base uppercase tracking-wide text-white">
                  Workout Reminders
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-mono font-bold uppercase border border-emerald-500/30">
                  1 Hr Advance
                </span>
              </div>
              <p className="text-xs text-zinc-400">Push notifications and in-app alerts before training sessions</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="py-4 overflow-y-auto space-y-4 pr-1">
          {/* Current Schedule Summary Card */}
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Scheduled Today
              </span>
              <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                {minutesUntil !== null ? (
                  minutesUntil > 0 ? `In ${minutesUntil} mins` : minutesUntil === 0 ? 'Starting Now' : 'Session In Progress'
                ) : 'Time Pending'}
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <h4 className="text-sm font-black text-white uppercase">{workout.title}</h4>
                <div className="text-xs text-zinc-400 mt-0.5 font-mono">
                  {workout.timeSlot || '6:00 PM – 7:00 PM'} • {workout.zoneName}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
              <span>Automatic 1-Hour Alert:</span>
              <strong className="text-emerald-400 font-mono font-bold">{reminderTimeFormatted}</strong>
            </div>
          </div>

          {/* Alert Channels & Toggles */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block">
              Alert Channels
            </label>

            {/* In-App Toast Toggle */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-800 text-emerald-400 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">In-App Toast Alerts</div>
                  <div className="text-[11px] text-zinc-400">Presents an interactive top banner 1 hour before session</div>
                </div>
              </div>
              <button
                onClick={handleToggleToast}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  preferences.inAppToastEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
                }`}
              >
                <div 
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    preferences.inAppToastEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Browser Push Notifications */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-800 text-emerald-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Browser Push Notifications</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                      pushStatus === 'granted' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : pushStatus === 'denied' 
                        ? 'bg-rose-500/20 text-rose-400' 
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {pushStatus === 'granted' ? 'Allowed' : pushStatus === 'denied' ? 'Blocked' : 'Default'}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400">Desktop & Mobile device notifications even when tab is backgrounded</div>
                </div>
              </div>

              {pushStatus === 'granted' ? (
                <button
                  onClick={handleTogglePushPref}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    preferences.browserPushEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                >
                  <div 
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      preferences.browserPushEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              ) : (
                <button
                  onClick={handleRequestPush}
                  disabled={isRequestingPermission}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider transition active:scale-95 disabled:opacity-50"
                >
                  {isRequestingPermission ? 'Requesting...' : 'Enable Push'}
                </button>
              )}
            </div>

            {/* Audio Chime Toggle */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-800 text-emerald-400 flex items-center justify-center shrink-0">
                  {preferences.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Audio Chime & Haptics</div>
                  <div className="text-[11px] text-zinc-400">Subtle harmonized chime when 1-hour reminder arrives</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => notificationService.playNotificationChime()}
                  className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 font-semibold"
                  title="Test chime sound"
                >
                  Test Audio
                </button>
                <button
                  onClick={handleToggleSound}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    preferences.soundEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                >
                  <div 
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      preferences.soundEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Real-Time Live Testing & Quick Scheduling */}
          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <FastForward className="w-3.5 h-3.5 text-emerald-400" />
                Live Demo & Testing Tools
              </span>
              {saveSuccess && (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Updated
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-400">
              Want to see the reminder in action right away? Click below to instantly trigger the 1-hour alert or adjust the session slot:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                id="test-1-hour-reminder-btn"
                onClick={() => {
                  onTriggerTestReminder();
                  onClose();
                }}
                className="py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Test 1-Hr Alert Now</span>
              </button>

              <button
                id="set-session-one-hour-btn"
                onClick={handleSetSlotOneHourFromNow}
                className="py-2.5 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-zinc-700 transition active:scale-95"
                title="Sets scheduled session start time to exactly 60 minutes from now"
              >
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Set Slot to +1 Hr</span>
              </button>
            </div>

            {/* Custom Time Slot Editor */}
            <div className="pt-2 border-t border-zinc-800 flex items-center gap-2">
              <input
                type="text"
                value={scheduledSlot}
                onChange={(e) => setScheduledSlot(e.target.value)}
                placeholder="e.g. 6:00 PM – 7:00 PM"
                className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleCustomSlotSave}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-bold uppercase transition"
              >
                Save Slot
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reminders delivered in advance</span>
          </div>
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-xs uppercase tracking-wider transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
