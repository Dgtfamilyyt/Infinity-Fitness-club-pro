import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  QrCode, 
  Flame, 
  Trophy, 
  Clock, 
  CheckCircle2, 
  Circle, 
  User, 
  MapPin, 
  TrendingUp, 
  Calendar,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Home,
  ShieldAlert,
  ExternalLink,
  History,
  Plus,
  Sparkles,
  Bell,
  Smartphone,
  Volume2
} from 'lucide-react';
import { UserProfile, WorkoutAssignment, GymZone, PersonalRecord, AttendanceRecord } from '../../types';
import { dataService } from '../../services/dataService';
import { generateCryptographicQrToken, isValidQrTokenFormat } from '../../services/qrService';
import { triggerPrConfetti } from '../../utils/confetti';
import { notificationService, WorkoutReminderAlert } from '../../services/notificationService';
import { QRCodeModal } from '../common/QRCodeModal';
import { LiveFloorStatus } from '../common/LiveFloorStatus';
import { WorkoutHistoryView } from './WorkoutHistoryView';
import { MonthlyCalendarView } from './MonthlyCalendarView';
import { LogPRModal } from './LogPRModal';
import { WorkoutReminderToast } from '../common/WorkoutReminderToast';
import { WorkoutReminderSettingsModal } from './WorkoutReminderSettingsModal';

interface MemberDashboardProps {
  member: UserProfile;
  workout: WorkoutAssignment;
  zones: GymZone[];
  totalInside: number;
  prs: PersonalRecord[];
  attendanceLogs: AttendanceRecord[];
  onLogout?: () => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  member,
  workout,
  zones,
  totalInside,
  prs,
  attendanceLogs,
  onLogout
}) => {
  const [showQR, setShowQR] = useState(false);
  const [showLogPRModal, setShowLogPRModal] = useState(false);
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  const [activeReminderAlert, setActiveReminderAlert] = useState<WorkoutReminderAlert | null>(null);
  const [, setClockTick] = useState(Date.now());
  const [recentPRAlert, setRecentPRAlert] = useState<{ exercise: string; weight: number; improvement?: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'HOME' | 'CALENDAR' | 'WORKOUT' | 'PROGRESS' | 'ATTENDANCE' | 'PROFILE'>('HOME');
  const [workoutSubTab, setWorkoutSubTab] = useState<'CURRENT' | 'PAST'>('PAST');
  const [activeQrToken, setActiveQrToken] = useState<string>(() => {
    return member.qrToken && isValidQrTokenFormat(member.qrToken) ? member.qrToken : '';
  });

  // Listen to incoming notifications and run automatic 1-hour workout reminder checks
  useEffect(() => {
    // 1. Subscribe to alerts dispatched through the notification system
    const unsubscribe = notificationService.subscribe((alert) => {
      setActiveReminderAlert(alert);
    });

    // 2. Scheduled session check function
    const evaluateWorkoutReminder = () => {
      setClockTick(Date.now());
      if (!workout) return;

      const evalResult = notificationService.checkShouldTrigger1HourReminder(workout);
      if (evalResult.shouldTrigger) {
        notificationService.dispatchReminderAlert({
          id: `reminder-${workout.id}-${Date.now()}`,
          workoutId: workout.id,
          workoutTitle: workout.title || 'Scheduled Session',
          timeSlot: workout.timeSlot || '6:00 PM – 7:00 PM',
          startTimeFormatted: evalResult.startTimeFormatted,
          minutesRemaining: evalResult.minutesRemaining,
          zoneName: workout.zoneName || 'Main Training Floor',
          trainerName: workout.trainerName || member.assignedTrainerName || 'Floor Coach',
          exercisesCount: workout.exercises?.length || 5,
          timestamp: Date.now()
        });
      }
    };

    // Run immediately on load and periodic poll every 25 seconds
    evaluateWorkoutReminder();
    const interval = setInterval(evaluateWorkoutReminder, 25000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [workout, member.assignedTrainerName]);

  const minutesUntilSession = notificationService.getMinutesUntilSession(workout.timeSlot, workout.date);
  const isWithin1HourWindow = minutesUntilSession !== null && minutesUntilSession <= 60 && minutesUntilSession > 0;
  const sessionStartTimeStr = notificationService.formatStartTime(workout.timeSlot, workout.date);
  const reminderTimeFormatted = (() => {
    const startObj = notificationService.parseStartTime(workout.timeSlot, workout.date);
    if (!startObj) return '1 hr before';
    return new Date(startObj.getTime() - 60 * 60 * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  })();

  const handlePrLogged = (newPr: PersonalRecord) => {
    setRecentPRAlert({
      exercise: newPr.exercise,
      weight: newPr.weightKg,
      improvement: newPr.improvementPercentage
    });
    setTimeout(() => {
      setRecentPRAlert(null);
    }, 7000);
  };

  const handleOpenCheckInQR = () => {
    let token = activeQrToken || member.qrToken;
    if (!token || !isValidQrTokenFormat(token)) {
      token = generateCryptographicQrToken();
      dataService.upsertProfile({ ...member, qrToken: token });
    }
    setActiveQrToken(token);
    setShowQR(true);
  };

  const handleToggleExercise = (exerciseId: string) => {
    dataService.toggleExerciseComplete(exerciseId);
  };

  const memberPRs = prs.filter(p => p.memberId === member.id || (member.memberId && p.memberId === member.memberId));
  const memberAttendance = attendanceLogs.filter(
    a => a.memberId === member.id || 
         (member.memberId && a.memberId === member.memberId) ||
         (a.memberName && member.fullName && a.memberName.toLowerCase() === member.fullName.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 pb-28 md:pb-12">
      {/* Top Banner Bar */}
      <div className="bg-[#121214] border-b border-zinc-800 px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="font-mono text-emerald-400 font-bold">{member.memberId || 'IFC-MEMBER'}</span>
              <span>•</span>
              <span className="uppercase tracking-wider font-semibold text-zinc-300">{member.planName || 'Active Tier'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase mt-0.5">
              HELLO, {member.fullName.split(' ')[0]}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Attendance & Streak stats */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <Flame className="w-4 h-4 text-orange-400" />
              <div className="text-xs">
                <span className="text-zinc-400 hidden sm:inline">Streak:</span>{' '}
                <strong className="text-white font-mono">{member.attendanceStreak || 0}d</strong>
              </div>
            </div>

            {/* 1-Hour Workout Reminder Alert Bell */}
            <button
              id="header-workout-reminder-btn"
              onClick={() => setShowReminderSettings(true)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition active:scale-95"
              title="Workout Reminders & Push Notification Settings"
            >
              <Bell className="w-4 h-4 text-emerald-400" />
              {isWithin1HourWindow && (
                <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1.5 right-1.5 animate-ping" />
              )}
              <span className="hidden sm:inline text-xs font-bold font-mono">
                {isWithin1HourWindow ? `${minutesUntilSession}m` : 'Alerts'}
              </span>
            </button>

            {/* QR Check-In Pass Button */}
            <button
              id="header-digital-pass-btn"
              onClick={handleOpenCheckInQR}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs tracking-wider uppercase transition shadow-lg shadow-emerald-500/10 min-h-[40px]"
            >
              <QrCode className="w-4 h-4" />
              <span>Digital Pass</span>
            </button>

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-400 hover:text-white transition"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Desktop Navigation Tabs */}
        <div className="hidden md:flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto">
          {[
            { id: 'HOME', label: 'Dashboard' },
            { id: 'CALENDAR', label: 'Monthly Calendar' },
            { id: 'WORKOUT', label: 'Workout History' },
            { id: 'PROGRESS', label: 'PRs & Progress' },
            { id: 'ATTENDANCE', label: 'Attendance Logs' },
            { id: 'PROFILE', label: 'Athlete Profile' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition shrink-0 ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Live Floor Status Bar */}
        <LiveFloorStatus zones={zones} totalInside={totalInside} />

        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'HOME' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Today's Workout Focus */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
                      Assigned Floor Session
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-1">
                      {workout.title}
                    </h2>
                    {workout.isOverride && (
                      <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Trainer Override Active: {workout.overrideReason}
                      </div>
                    )}
                  </div>

                  {/* Progress Ring / Percentage */}
                  <div className="flex items-center gap-3 bg-zinc-900/80 px-4 py-2.5 rounded-xl border border-zinc-800">
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Progress</div>
                      <div className="text-xl font-black font-mono text-emerald-400">
                        {workout.completionPercentage}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Session Meta */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4">
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Assigned Coach</span>
                    <div className="text-xs font-bold text-white mt-0.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                      {workout.trainerName || member.assignedTrainerName || 'Floor Coach'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Designated Zone</span>
                    <div className="text-xs font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      {workout.zoneName}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Slot Time</span>
                    <div className="text-xs font-bold text-white mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      {workout.timeSlot || '6:00 PM – 7:00 PM'}
                    </div>
                  </div>
                </div>

                {/* 1-Hour Advance Reminder Status Banner & Controls */}
                <div className={`my-3 p-3 sm:p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isWithin1HourWindow
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-300'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isWithin1HourWindow
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${
                          isWithin1HourWindow ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {isWithin1HourWindow 
                            ? `Workout Starting Soon • In ${minutesUntilSession} Mins` 
                            : 'Scheduled Session Reminder'}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          1 Hr Before
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {isWithin1HourWindow 
                          ? `Session starts at ${sessionStartTimeStr} in ${workout.zoneName}. Get ready!`
                          : `Automatic push & toast alert set for ${reminderTimeFormatted} (1 hr before session)`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      id="card-test-reminder-btn"
                      onClick={() => notificationService.triggerTestReminder(workout)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 border border-zinc-700"
                      title="Trigger sample 1-hour push notification and toast alert right now"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Test Alert</span>
                    </button>

                    <button
                      id="card-reminder-settings-btn"
                      onClick={() => setShowReminderSettings(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider transition active:scale-95"
                    >
                      Alert Settings
                    </button>
                  </div>
                </div>

                {/* Exercises Check-off Preview */}
                <div className="mt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Exercise Breakdown ({workout.exercises.filter(e => e.completed).length}/{workout.exercises.length} Complete)
                    </h3>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button 
                        onClick={() => {
                          setWorkoutSubTab('PAST');
                          setActiveTab('WORKOUT');
                        }}
                        className="text-xs text-zinc-400 hover:text-white font-semibold flex items-center gap-1.5 transition px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
                      >
                        <History className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Past Records</span>
                      </button>
                      <button 
                        onClick={() => {
                          setWorkoutSubTab('CURRENT');
                          setActiveTab('WORKOUT');
                        }}
                        className="text-xs text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>Today's Routine</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {workout.exercises.map((ex) => (
                      <div
                        key={ex.id}
                        onClick={() => handleToggleExercise(ex.id)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                          ex.completed
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-zinc-300'
                            : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {ex.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-zinc-600 shrink-0" />
                          )}
                          <div>
                            <span className={`text-xs font-bold ${ex.completed ? 'line-through text-zinc-500' : 'text-white'}`}>
                              {ex.name}
                            </span>
                            <div className="text-[11px] text-zinc-400 mt-0.5">
                              {ex.sets} Sets × {ex.reps} • {ex.equipment}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-zinc-500">
                          {ex.restSeconds}s rest
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Member Stats & PRs */}
            <div className="space-y-6">
              {/* Membership Status Card */}
              <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-5 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Membership</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {member.status}
                  </span>
                </div>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Plan:</span>
                    <strong className="text-white">{member.planName}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Valid Through:</span>
                    <strong className="text-white font-mono">{member.membershipExpiry}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Assigned Coach:</span>
                    <strong className="text-white">{member.assignedTrainerName}</strong>
                  </div>
                </div>
              </div>

              {/* Personal Records Card */}
              <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-5 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">Personal Bests</span>
                  </div>
                  <button
                    id="home-log-pr-btn"
                    onClick={() => setShowLogPRModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider transition active:scale-95"
                    title="Log a new Personal Record and celebrate"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log PR</span>
                  </button>
                </div>

                <div className="mt-3 space-y-2.5">
                  {memberPRs.map((pr) => (
                    <div key={pr.id} className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-200">{pr.exercise}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-extrabold font-mono text-emerald-400">{pr.weightKg} KG</span>
                            <span className="text-[10px] text-zinc-500 font-mono">× {pr.reps}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerPrConfetti();
                            }}
                            title="Celebrate this PR!"
                            className="p-1 rounded-lg hover:bg-amber-500/20 text-zinc-500 hover:text-amber-400 transition active:scale-90"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {pr.improvementPercentage && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                          <TrendingUp className="w-3 h-3" />
                          <span>+{pr.improvementPercentage}% improvement</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly Schedule & Calendar Quick-Access Card */}
              <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-5 shadow-xl relative overflow-hidden group">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">Monthly Schedule</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    {memberAttendance.length} Logged
                  </span>
                </div>
                <div className="mt-3 space-y-2.5">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Interactive monthly calendar mapping scheduled split programming against verified floor check-in dates.
                  </p>
                  <button
                    id="home-open-monthly-calendar-btn"
                    onClick={() => setActiveTab('CALENDAR')}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95"
                  >
                    <span>Open Monthly Calendar</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Safety & Restrictions Info */}
              {member.restrictions && member.restrictions !== 'None' && (
                <div className="rounded-2xl bg-amber-950/20 border border-amber-500/30 p-4 text-xs">
                  <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Safety Restriction on File</span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed">{member.restrictions}</p>
                  <p className="text-[10px] text-zinc-500 mt-2">
                    Floor coaches review this before every session to adapt angles and weights.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: MONTHLY CALENDAR VIEW */}
        {activeTab === 'CALENDAR' && (
          <MonthlyCalendarView
            member={member}
            currentWorkout={workout}
            attendanceLogs={attendanceLogs}
            personalRecords={prs}
            zones={zones}
            onToggleExercise={handleToggleExercise}
            onOpenCheckInQR={handleOpenCheckInQR}
          />
        )}

        {/* TAB 2: WORKOUT HISTORY & CURRENT ROUTINE */}
        {activeTab === 'WORKOUT' && (
          <WorkoutHistoryView
            member={member}
            currentWorkout={workout}
            attendanceLogs={attendanceLogs}
            personalRecords={prs}
            onToggleExercise={handleToggleExercise}
            initialSubTab={workoutSubTab}
          />
        )}

        {/* TAB 3: PROGRESS & PRS */}
        {activeTab === 'PROGRESS' && (
          <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-xl space-y-6">
            <div className="border-b border-zinc-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Strength Analytics</span>
                <h2 className="text-2xl font-black text-white uppercase mt-1">Personal Best Records</h2>
                <p className="text-xs text-zinc-400 mt-1">Official floor-verified weight and rep milestones.</p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  id="progress-celebrate-btn"
                  onClick={() => triggerPrConfetti()}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-400 hover:text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95"
                  title="Trigger celebration confetti effect"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Celebrate</span>
                </button>

                <button
                  id="progress-log-pr-btn"
                  onClick={() => setShowLogPRModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log PR</span>
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {memberPRs.map((pr) => (
                <div key={pr.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 relative group transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-300">{pr.exercise}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerPrConfetti();
                      }}
                      title="Celebrate this PR achievement!"
                      className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition active:scale-90"
                    >
                      <Trophy className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {pr.weightKg} KG
                  </div>
                  <div className="text-xs text-zinc-400 mt-1 font-mono">Repetition Count: {pr.reps} Reps</div>
                  {pr.improvementPercentage ? (
                    <div className="mt-2 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>+{pr.improvementPercentage}% improvement</span>
                    </div>
                  ) : null}
                  <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>Verified: {pr.verifiedBy}</span>
                    <span>{pr.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ATTENDANCE HISTORY */}
        {activeTab === 'ATTENDANCE' && (
          <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-xl space-y-6">
            <div className="border-b border-zinc-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Check-In Logs</span>
                <h2 className="text-2xl font-black text-white uppercase mt-1">Club Attendance Log</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="attendance-switch-calendar-btn"
                  onClick={() => setActiveTab('CALENDAR')}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Switch to Calendar View</span>
                </button>
                <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                  <span className="text-zinc-400">Visits:</span>{' '}
                  <strong className="text-white font-mono">{memberAttendance.length}</strong>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 rounded-l-lg">Date</th>
                    <th className="py-3 px-4">Arrival</th>
                    <th className="py-3 px-4">Exit</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Zone</th>
                    <th className="py-3 px-4 rounded-r-lg">Check-In Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {memberAttendance.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-900/40 transition">
                      <td className="py-3.5 px-4 font-mono text-zinc-300">{log.date}</td>
                      <td className="py-3.5 px-4 text-emerald-400 font-semibold">{log.arrival}</td>
                      <td className="py-3.5 px-4 text-zinc-400">{log.exit || 'Active Floor'}</td>
                      <td className="py-3.5 px-4 text-zinc-300 font-mono">{log.durationMinutes ? `${log.durationMinutes} min` : 'In Progress'}</td>
                      <td className="py-3.5 px-4 text-zinc-300">{log.zoneName}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                          {log.method}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: ATHLETE PROFILE */}
        {activeTab === 'PROFILE' && (
          <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-xl space-y-6">
            <div className="border-b border-zinc-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-xl">
                  {member.fullName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase">{member.fullName}</h2>
                  <p className="text-xs text-zinc-400 font-mono">{member.email}</p>
                </div>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition flex items-center gap-2 self-start sm:self-auto min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Club</span>
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">Membership Plan</span>
                <span className="text-white font-bold text-sm mt-1 block">{member.planName || 'Active Tier'}</span>
                <span className="text-emerald-400 text-[11px] font-mono mt-0.5 block">Valid until {member.membershipExpiry || '2027-01-01'}</span>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">Assigned Coach</span>
                <span className="text-white font-bold text-sm mt-1 block">{member.assignedTrainerName || 'Rahul Sharma'}</span>
                <span className="text-zinc-400 text-[11px] mt-0.5 block">CSCS Certified Strength Specialist</span>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">Membership Badge ID</span>
                <span className="text-emerald-400 font-mono font-bold text-sm mt-1 block">{member.memberId || 'IFC-1001'}</span>
                <span className="text-zinc-400 text-[11px] font-mono mt-0.5 block">Status: {member.status || 'ACTIVE'}</span>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 sm:col-span-2">
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">Physical Restrictions & Biomechanics Notes</span>
                <div className="mt-1 flex items-start gap-2 text-zinc-300">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{member.restrictions && member.restrictions !== 'None' ? member.restrictions : 'No joint impingements or clinical restrictions logged.'}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">Emergency Contact</span>
                <span className="text-white font-mono mt-1 block">{member.emergencyContact || '+91 98200 00000'}</span>
              </div>

              {/* Home Club Google Maps Location */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-emerald-500/20 sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">Infinity Fitness Club</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        4.9 ★ Neelambur
                      </span>
                    </div>
                    <p className="text-zinc-400 text-xs mt-0.5">
                      No. 1/215, Upstairs Union Bank of India, Avinashi Rd, Neelambur, Coimbatore - 641062
                    </p>
                    <div className="flex items-center gap-4 text-[11px] text-zinc-500 mt-1 font-mono">
                      <span>Morning: 5:30 AM – 10:00 AM</span>
                      <span>•</span>
                      <span>Evening: 5:00 PM – 9:30 PM</span>
                    </div>
                  </div>
                </div>

                <a
                  href="https://maps.app.goo.gl/Xyt9iQEcfS67D6K5A"
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shrink-0 shadow-md shadow-emerald-500/10"
                >
                  <span>Google Maps Directions</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) for Quick Check-In QR Pass */}
      <aside 
        id="fab-checkin-container"
        aria-label="Contactless Check-In QR Pass"
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 flex items-center group"
      >
        {/* Context Tooltip Pill (Desktop Hover) */}
        <div className="hidden sm:flex items-center mr-3 px-3.5 py-2 rounded-2xl bg-[#121214]/95 backdrop-blur-md border border-zinc-800 text-xs text-white font-semibold shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2" />
          <span className="text-zinc-400 mr-1.5 font-sans">Check-In Pass:</span>
          <span className="text-emerald-400 font-mono font-bold">IFC1 QR</span>
        </div>

        {/* Floating Action Button */}
        <button
          id="fab-checkin-qr"
          onClick={handleOpenCheckInQR}
          className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-emerald-400 text-black shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[#0a0a0c]"
          aria-label="Generate and open check-in QR code pass"
          title="Open Check-In QR Pass"
        >
          {/* Subtle pulse ring animation */}
          <span className="absolute -inset-1 rounded-2xl bg-emerald-500/25 animate-ping opacity-40 pointer-events-none" />
          <QrCode className="w-7 h-7 relative z-10 stroke-[2.2]" />

          {/* Verification Shield Indicator Dot */}
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-zinc-900 border border-emerald-500/80 flex items-center justify-center text-[10px] text-emerald-400 font-bold shadow-md">
            ✓
          </span>
        </button>
      </aside>

      {/* QR Pass Modal */}
      <QRCodeModal
        member={member}
        token={activeQrToken}
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        onRegenerateToken={(newToken) => setActiveQrToken(newToken)}
      />

      {/* Log PR Modal with Confetti Celebration */}
      <LogPRModal
        member={member}
        existingPRs={prs}
        isOpen={showLogPRModal}
        onClose={() => setShowLogPRModal(false)}
        onPrLogged={handlePrLogged}
      />

      {/* Subtle Milestone Celebration Toast Notification */}
      {recentPRAlert && (
        <div 
          id="pr-celebration-toast"
          className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md p-4 rounded-2xl bg-[#121214]/95 border border-emerald-500/50 text-white shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 animate-bounce">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>New Personal Record Logged!</span>
              </div>
              <div className="text-sm font-black text-white uppercase">
                {recentPRAlert.exercise} — <span className="font-mono text-emerald-400">{recentPRAlert.weight} KG</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => triggerPrConfetti()}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider shadow-md transition active:scale-95 shrink-0 flex items-center gap-1"
            title="Replay celebration confetti"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Confetti</span>
          </button>
        </div>
      )}

      {/* In-App Workout Reminder Toast Alert (1 hour advance reminder) */}
      <WorkoutReminderToast
        alert={activeReminderAlert}
        onClose={() => setActiveReminderAlert(null)}
        onViewRoutine={() => {
          setWorkoutSubTab('CURRENT');
          setActiveTab('WORKOUT');
        }}
        onOpenCheckInQR={handleOpenCheckInQR}
      />

      {/* Workout Reminder & Push Notification Settings Modal */}
      <WorkoutReminderSettingsModal
        workout={workout}
        isOpen={showReminderSettings}
        onClose={() => setShowReminderSettings(false)}
        onTriggerTestReminder={() => notificationService.triggerTestReminder(workout)}
      />

      {/* Mobile App Bottom Navigation (Fixed, reachable, min 44px touch targets) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#121214]/95 backdrop-blur-lg border-t border-zinc-800 px-2 py-1 flex items-center justify-around shadow-2xl">
        {[
          { id: 'HOME', label: 'Home', icon: Home },
          { id: 'CALENDAR', label: 'Calendar', icon: Calendar },
          { id: 'WORKOUT', label: 'Workouts', icon: History },
          { id: 'PROGRESS', label: 'PRs', icon: Trophy },
          { id: 'PROFILE', label: 'Profile', icon: User }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-h-[48px] py-1 flex flex-col items-center justify-center rounded-xl transition ${
                isActive
                  ? 'text-emerald-400 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400 stroke-[2.5]' : 'stroke-[1.75]'}`} />
              <span className="text-[10px] tracking-tight uppercase mt-0.5 font-medium">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
