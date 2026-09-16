import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  Clock, 
  MapPin, 
  User, 
  X, 
  ChevronRight, 
  QrCode, 
  Volume2, 
  VolumeX,
  AlarmClockOff,
  Sparkles
} from 'lucide-react';
import { WorkoutReminderAlert, notificationService } from '../../services/notificationService';

interface WorkoutReminderToastProps {
  alert: WorkoutReminderAlert | null;
  onClose: () => void;
  onViewRoutine: () => void;
  onOpenCheckInQR: () => void;
}

export const WorkoutReminderToast: React.FC<WorkoutReminderToastProps> = ({
  alert,
  onClose,
  onViewRoutine,
  onOpenCheckInQR
}) => {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);

  useEffect(() => {
    if (!alert) {
      setProgress(100);
      return;
    }

    // Reset progress on new alert
    setProgress(100);
    const duration = 16000; // 16 seconds auto-dismiss
    const interval = 100;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      if (!isPaused) {
        setProgress((prev) => {
          if (prev <= 0) {
            clearInterval(timer);
            onClose();
            return 0;
          }
          return Math.max(0, prev - step);
        });
      }
    }, interval);

    return () => clearInterval(timer);
  }, [alert, isPaused, onClose]);

  if (!alert) return null;

  const handleSnooze = () => {
    notificationService.snoozeReminder(10);
    onClose();
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prefs = notificationService.getPreferences();
    const nextSound = !prefs.soundEnabled;
    notificationService.savePreferences({ ...prefs, soundEnabled: nextSound });
    setSoundMuted(!nextSound);
    if (nextSound) {
      notificationService.playNotificationChime();
    }
  };

  return (
    <div 
      className="fixed top-4 right-4 left-4 sm:left-auto sm:w-[440px] z-50 animate-in slide-in-from-top-4 duration-300 pointer-events-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
      aria-live="assertive"
    >
      <div className="relative rounded-2xl bg-[#121214]/95 backdrop-blur-xl border border-emerald-500/40 shadow-2xl shadow-emerald-500/10 text-white overflow-hidden p-4 sm:p-5">
        {/* Top subtle glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-400" />

        {/* Header row */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center relative">
              <Bell className="w-4 h-4 animate-bounce" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-zinc-900 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                  Workout Starting Soon
                </span>
                {alert.isTest && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold uppercase border border-amber-500/30">
                    Preview
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                1-Hour advance reminder for your scheduled session
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleMute}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition"
              title={soundMuted ? 'Sound muted' : 'Mute notification chimes'}
            >
              {soundMuted ? <VolumeX className="w-4 h-4 text-zinc-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="py-3 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-base sm:text-lg font-black uppercase text-white tracking-tight leading-snug">
              {alert.workoutTitle}
            </h4>
            <div className="shrink-0 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>In {alert.minutesRemaining}m</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-zinc-500 uppercase block">Slot Time</span>
                <strong className="text-white font-mono text-[11px]">{alert.startTimeFormatted}</strong>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-zinc-500 uppercase block">Floor Zone</span>
                <strong className="text-emerald-400 text-[11px] truncate block">{alert.zoneName}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 px-0.5">
            <span className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-zinc-500" />
              <span>Coach {alert.trainerName}</span>
            </span>
            <span className="font-mono text-zinc-400">
              {alert.exercisesCount} Exercises Scheduled
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2">
          <button
            id="toast-view-routine-btn"
            onClick={() => {
              onViewRoutine();
              onClose();
            }}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition active:scale-95"
          >
            <span>View Routine</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            id="toast-open-pass-btn"
            onClick={() => {
              onOpenCheckInQR();
              onClose();
            }}
            className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95"
            title="Open digital entry pass"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Check-In Pass</span>
          </button>

          <button
            id="toast-snooze-btn"
            onClick={handleSnooze}
            className="py-2 px-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-amber-400 text-xs font-semibold flex items-center gap-1 transition"
            title="Snooze reminder for 10 minutes"
          >
            <AlarmClockOff className="w-3.5 h-3.5" />
            <span className="text-[10px] hidden sm:inline">10m</span>
          </button>
        </div>

        {/* Auto-dismiss timer progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
          <div 
            className="h-full bg-emerald-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
