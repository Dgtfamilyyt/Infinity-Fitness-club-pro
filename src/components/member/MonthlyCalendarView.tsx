import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  Trophy, 
  Flame, 
  MapPin, 
  Dumbbell, 
  ShieldCheck, 
  Circle, 
  QrCode, 
  Activity, 
  Zap,
  Sparkles,
  Info
} from 'lucide-react';
import { UserProfile, WorkoutAssignment, AttendanceRecord, PersonalRecord, GymZone, ExerciseItem } from '../../types';
import { triggerPrConfetti } from '../../utils/confetti';

export interface MonthlyCalendarViewProps {
  member: UserProfile;
  currentWorkout: WorkoutAssignment;
  attendanceLogs: AttendanceRecord[];
  personalRecords: PersonalRecord[];
  zones?: GymZone[];
  onToggleExercise?: (exerciseId: string) => void;
  onOpenCheckInQR?: () => void;
}

interface DayWorkoutSchedule {
  dateStr: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 = Sun, 1 = Mon ...
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  attendance?: AttendanceRecord;
  personalRecord?: PersonalRecord;
  scheduledWorkout?: {
    title: string;
    targetMuscles: string[];
    zoneName: string;
    timeSlot?: string;
    exercises: { name: string; sets: string; reps: string; equipment: string }[];
    isRestDay?: boolean;
  };
}

// Master training split templates for the gym program
const WEEKLY_SPLIT_TEMPLATES: Record<number, { 
  title: string; 
  targetMuscles: string[]; 
  zoneName: string; 
  timeSlot?: string;
  exercises: { name: string; sets: string; reps: string; equipment: string }[]; 
  isRestDay?: boolean; 
}> = {
  1: { // Monday
    title: 'Chest + Triceps Hypertrophy',
    targetMuscles: ['Pectorals', 'Anterior Delts', 'Triceps Brachii'],
    zoneName: 'Chest Zone',
    exercises: [
      { name: 'Flat Barbell Bench Press', sets: '4', reps: '10, 8, 8, 6', equipment: 'Olympic Barbell' },
      { name: 'Incline Dumbbell Press', sets: '3', reps: '10-12', equipment: '30° Bench & Dumbbells' },
      { name: 'Cable Pec Fly (Mid-Pulley)', sets: '3', reps: '12-15', equipment: 'Cable Crossover' },
      { name: 'Overhead Tricep Rope Extension', sets: '4', reps: '12', equipment: 'Cable Stack' }
    ]
  },
  2: { // Tuesday
    title: 'Back & Biceps Pull Day',
    targetMuscles: ['Latissimus Dorsi', 'Rhomboids', 'Biceps'],
    zoneName: 'Back & Pull Zone',
    exercises: [
      { name: 'Lat Pulldown (Neutral Grip)', sets: '4', reps: '10-12', equipment: 'Cable Lat Machine' },
      { name: 'Barbell Bent-Over Row', sets: '4', reps: '8', equipment: 'Olympic Barbell' },
      { name: 'Seated Cable Row', sets: '3', reps: '12', equipment: 'Low Row Cable' },
      { name: 'Incline Dumbbell Bicep Curl', sets: '3', reps: '12', equipment: 'Dumbbells & Bench' }
    ]
  },
  3: { // Wednesday
    title: 'Legs Quads & Calves Heavy',
    targetMuscles: ['Quadriceps', 'Glutes', 'Calves'],
    zoneName: 'Legs & Quads Bay',
    exercises: [
      { name: 'Barbell Back Squat', sets: '5', reps: '6-8', equipment: 'Squat Rack' },
      { name: 'Leg Press (Foot Placed Low)', sets: '4', reps: '12', equipment: '45-Degree Leg Press' },
      { name: 'Walking Dumbbell Lunges', sets: '3', reps: '20 steps', equipment: 'Dumbbells' },
      { name: 'Standing Calf Raise', sets: '4', reps: '20', equipment: 'Calf Machine' }
    ]
  },
  4: { // Thursday
    title: 'Active Mobility & Core Recovery',
    targetMuscles: ['Core', 'Hip Flexors', 'Thoracic Spine'],
    zoneName: 'Functional Turf & Calisthenics',
    isRestDay: false,
    exercises: [
      { name: 'Thoracic Foam Roll & Open Books', sets: '3', reps: '10/side', equipment: 'Foam Roller & Mat' },
      { name: 'Hanging Leg Raises', sets: '3', reps: '15', equipment: 'Pull-up Bar' },
      { name: 'Cable Woodchoppers', sets: '3', reps: '12/side', equipment: 'Cable Tower' },
      { name: 'Zone 2 Light Incline Walk', sets: '1', reps: '20 min', equipment: 'Woodway Curve Treadmill' }
    ]
  },
  5: { // Friday
    title: 'Shoulder Biomechanics & Core',
    targetMuscles: ['Anterior/Lateral Delts', 'Traps', 'Rotator Cuff'],
    zoneName: 'Shoulders & Delts',
    exercises: [
      { name: 'Seated Dumbbell Overhead Press', sets: '4', reps: '8-10', equipment: 'Adjustable Bench' },
      { name: 'Cable Lateral Raise', sets: '4', reps: '15', equipment: 'Cable Pulley' },
      { name: 'Rear Delt Fly (Pec Deck)', sets: '3', reps: '15', equipment: 'Reverse Fly Machine' },
      { name: 'Barbell Shrugs (Controlled)', sets: '4', reps: '12', equipment: 'Olympic Barbell' }
    ]
  },
  6: { // Saturday
    title: 'Arms & Conditioning Blitz',
    targetMuscles: ['Biceps', 'Triceps', 'Cardiovascular'],
    zoneName: 'Arms & Isolation',
    exercises: [
      { name: 'Close-Grip Barbell Bench Press', sets: '4', reps: '8', equipment: 'Flat Bench' },
      { name: 'Barbell EZ-Bar Curl', sets: '4', reps: '10', equipment: 'EZ Bar' },
      { name: 'Rope Tricep Pushdown', sets: '4', reps: '15', equipment: 'Cable Stack' },
      { name: 'Battle Ropes HIIT Finisher', sets: '5 rounds', reps: '30s on / 30s off', equipment: 'Battle Ropes' }
    ]
  },
  0: { // Sunday
    title: 'Rest & Muscular Recovery',
    targetMuscles: ['Full Body Rest', 'Hydration', 'Central Nervous System'],
    zoneName: 'Recovery & Mobility Suite',
    isRestDay: true,
    exercises: []
  }
};

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({
  member,
  currentWorkout,
  attendanceLogs,
  personalRecords,
  zones = [],
  onToggleExercise,
  onOpenCheckInQR
}) => {
  // Format today's date in local YYYY-MM-DD
  const today = useMemo(() => new Date(), []);
  const todayDateStr = useMemo(() => {
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [today]);

  // Current viewed month (year, month index 0-11)
  const [viewDate, setViewDate] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayDateStr);
  const [filterType, setFilterType] = useState<'ALL' | 'COMPLETED' | 'SCHEDULED' | 'PRS'>('ALL');

  // Month navigation
  const handlePrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    const freshToday = new Date();
    setViewDate(new Date(freshToday.getFullYear(), freshToday.getMonth(), 1));
    setSelectedDateStr(todayDateStr);
  };

  // Filter attendance logs for this member
  const memberAttendance = useMemo(() => {
    return attendanceLogs.filter(
      a => a.memberId === member.id || 
           (member.memberId && a.memberId === member.memberId) ||
           (a.memberName && member.fullName && a.memberName.toLowerCase() === member.fullName.toLowerCase())
    );
  }, [attendanceLogs, member]);

  // Quick lookup maps
  const attendanceByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    memberAttendance.forEach(log => {
      map.set(log.date, log);
    });
    return map;
  }, [memberAttendance]);

  const prsByDate = useMemo(() => {
    const map = new Map<string, PersonalRecord>();
    personalRecords.forEach(pr => {
      if (pr.memberId === member.id || (member.memberId && pr.memberId === member.memberId)) {
        map.set(pr.date, pr);
      }
    });
    return map;
  }, [personalRecords, member]);

  // Generate the monthly calendar grid days
  const calendarDays = useMemo<DayWorkoutSchedule[]>(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // In JS, getDay() returns 0 for Sunday, 1 for Monday... 6 for Saturday
    // Convert to Monday = 0, Sunday = 6
    const firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7;

    const days: DayWorkoutSchedule[] = [];

    // 1. Leading days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayOfWeek = prevDate.getDay();

      const attendance = attendanceByDate.get(dateStr);
      const personalRecord = prsByDate.get(dateStr);
      const split = WEEKLY_SPLIT_TEMPLATES[dayOfWeek];

      days.push({
        dateStr,
        dayOfWeek,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
        isPast: dateStr < todayDateStr,
        isFuture: dateStr > todayDateStr,
        attendance,
        personalRecord,
        scheduledWorkout: split
      });
    }

    // 2. Days of current month
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const curDate = new Date(year, month, dayNum);
      const y = curDate.getFullYear();
      const m = String(curDate.getMonth() + 1).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayOfWeek = curDate.getDay();

      const attendance = attendanceByDate.get(dateStr);
      const personalRecord = prsByDate.get(dateStr);

      // If it's today and currentWorkout has a title, use currentWorkout
      let scheduledWorkout = WEEKLY_SPLIT_TEMPLATES[dayOfWeek];
      if (dateStr === todayDateStr && currentWorkout && currentWorkout.title) {
        scheduledWorkout = {
          title: currentWorkout.title,
          targetMuscles: currentWorkout.targetMuscles,
          zoneName: currentWorkout.zoneName,
          timeSlot: currentWorkout.timeSlot || '6:00 PM – 7:00 PM',
          exercises: currentWorkout.exercises.map(ex => ({
            name: ex.name,
            sets: String(ex.sets),
            reps: String(ex.reps),
            equipment: ex.equipment
          })),
          isRestDay: false
        };
      }

      days.push({
        dateStr,
        dayOfWeek,
        isCurrentMonth: true,
        isToday: dateStr === todayDateStr,
        isPast: dateStr < todayDateStr,
        isFuture: dateStr > todayDateStr,
        attendance,
        personalRecord,
        scheduledWorkout
      });
    }

    // 3. Trailing days from next month to complete the row (multiples of 7)
    const remainingDays = (7 - (days.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remainingDays; dayNum++) {
      const nextDate = new Date(year, month + 1, dayNum);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayOfWeek = nextDate.getDay();

      const attendance = attendanceByDate.get(dateStr);
      const personalRecord = prsByDate.get(dateStr);
      const split = WEEKLY_SPLIT_TEMPLATES[dayOfWeek];

      days.push({
        dateStr,
        dayOfWeek,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
        isPast: dateStr < todayDateStr,
        isFuture: dateStr > todayDateStr,
        attendance,
        personalRecord,
        scheduledWorkout: split
      });
    }

    return days;
  }, [viewDate, attendanceByDate, prsByDate, todayDateStr, currentWorkout]);

  // Statistics for the displayed month
  const monthStats = useMemo(() => {
    const currentMonthDays = calendarDays.filter(d => d.isCurrentMonth);
    const completedDays = currentMonthDays.filter(d => d.attendance);
    const scheduledWorkouts = currentMonthDays.filter(d => !d.scheduledWorkout?.isRestDay);
    const totalMinutes = completedDays.reduce((acc, d) => acc + (d.attendance?.durationMinutes || 60), 0);
    const prCount = currentMonthDays.filter(d => d.personalRecord).length;
    
    // Adherence: completed days up to today vs scheduled training days up to today
    const pastScheduledDays = currentMonthDays.filter(d => (d.isPast || d.isToday) && !d.scheduledWorkout?.isRestDay);
    const adherence = pastScheduledDays.length > 0 
      ? Math.min(100, Math.round((completedDays.length / pastScheduledDays.length) * 100))
      : 100;

    return {
      completedCount: completedDays.length,
      scheduledAheadCount: currentMonthDays.filter(d => d.isFuture && !d.scheduledWorkout?.isRestDay).length,
      totalHours: (totalMinutes / 60).toFixed(1),
      adherence,
      prCount
    };
  }, [calendarDays]);

  // Find the currently selected day object
  const selectedDay = useMemo(() => {
    return calendarDays.find(d => d.dateStr === selectedDateStr) || calendarDays.find(d => d.isToday) || calendarDays[0];
  }, [calendarDays, selectedDateStr]);

  const monthTitle = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Format selected date for display
  const selectedDateFormatted = useMemo(() => {
    if (!selectedDay) return '';
    const [y, m, d] = selectedDay.dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, [selectedDay]);

  return (
    <div className="space-y-6">
      {/* Top Header & Monthly Performance Highlights */}
      <div className="rounded-3xl bg-[#121214] border border-zinc-800 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold uppercase tracking-wider">
              <CalendarIcon className="w-4 h-4" />
              <span>Training Calendar & Adherence Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mt-1">
              Monthly Workout Schedule
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-xl">
              Track your scheduled floor programming, verified check-in completions, and milestone personal records.
            </p>
          </div>

          {/* Month Switcher Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handlePrevMonth}
              className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition active:scale-95"
              title="Previous Month"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-center min-w-[170px]">
              <span className="text-sm font-bold text-white tracking-wide uppercase font-sans">
                {monthTitle}
              </span>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition active:scale-95"
              title="Next Month"
              aria-label="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={handleGoToToday}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider transition active:scale-95"
            >
              Today
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-6">
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Completed</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
              {monthStats.completedCount} <span className="text-xs font-sans text-zinc-500 font-normal">Sessions</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Verified floor attendance</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Floor Time</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-white">
              {monthStats.totalHours} <span className="text-xs font-sans text-zinc-500 font-normal">Hours</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Logged session volume</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Adherence</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-orange-400">
              {monthStats.adherence}%
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Scheduled split target met</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Milestones</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-400">
              {monthStats.prCount} <span className="text-xs font-sans text-zinc-500 font-normal">PR Records</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Official strength benchmarks</div>
          </div>
        </div>

        {/* Legend & Quick Filter Strip */}
        <div className="mt-6 pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-zinc-400">
            <span className="font-semibold text-zinc-300">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-[9px] text-emerald-400 font-bold">✓</span>
              <span>Completed Log</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-[9px] text-blue-400 font-bold">⚡</span>
              <span>Scheduled Workout</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-emerald-400 bg-emerald-400/20" />
              <span>Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>Personal Record</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-500">
              <span className="w-3 h-3 rounded-md bg-zinc-800 border border-zinc-700" />
              <span>Rest Day</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {(['ALL', 'COMPLETED', 'SCHEDULED', 'PRS'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition ${
                  filterType === type 
                    ? 'bg-emerald-500 text-black shadow' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {type === 'PRS' ? 'PRs' : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Left = Monthly Calendar Grid, Right = Day Inspector */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Grid Container (8 Cols on Desktop) */}
        <div className="lg:col-span-7 xl:col-span-8 rounded-3xl bg-[#121214] border border-zinc-800 p-4 sm:p-6 shadow-xl space-y-4">
          {/* Weekday Header Row */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
            {WEEKDAY_NAMES.map((name, i) => (
              <div 
                key={name}
                className={`py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl ${
                  i >= 5 ? 'text-amber-400/80 bg-zinc-900/40' : 'text-zinc-400 bg-zinc-900/60'
                }`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((day) => {
              const isSelected = day.dateStr === selectedDateStr;
              const hasAttendance = Boolean(day.attendance);
              const hasPR = Boolean(day.personalRecord);
              const isRestDay = day.scheduledWorkout?.isRestDay;

              // Filter logic highlight
              let isDimmedByFilter = false;
              if (filterType === 'COMPLETED' && !hasAttendance) isDimmedByFilter = true;
              if (filterType === 'SCHEDULED' && (hasAttendance || isRestDay)) isDimmedByFilter = true;
              if (filterType === 'PRS' && !hasPR) isDimmedByFilter = true;

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => setSelectedDateStr(day.dateStr)}
                  className={`relative min-h-[90px] sm:min-h-[105px] p-2 sm:p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all duration-150 group focus:outline-none ${
                    !day.isCurrentMonth
                      ? 'bg-zinc-950/40 border-zinc-900/70 text-zinc-600 opacity-40 hover:opacity-80'
                      : isSelected
                      ? 'bg-emerald-950/30 border-emerald-400 ring-2 ring-emerald-400/30 shadow-lg shadow-emerald-500/10'
                      : hasAttendance
                      ? 'bg-emerald-950/15 border-emerald-500/25 hover:border-emerald-500/50'
                      : day.isToday
                      ? 'bg-zinc-900 border-zinc-700 ring-1 ring-emerald-500/40'
                      : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                  } ${isDimmedByFilter ? 'opacity-25' : ''}`}
                  aria-label={`Select date ${day.dateStr}`}
                >
                  {/* Top Bar inside cell: Date Number and Badges */}
                  <div className="flex items-center justify-between w-full">
                    <span 
                      className={`text-xs sm:text-sm font-bold font-mono ${
                        day.isToday 
                          ? 'w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center font-extrabold' 
                          : isSelected
                          ? 'text-emerald-400'
                          : day.isCurrentMonth 
                          ? 'text-zinc-200' 
                          : 'text-zinc-600'
                      }`}
                    >
                      {parseInt(day.dateStr.split('-')[2], 10)}
                    </span>

                    <div className="flex items-center gap-1">
                      {hasPR && (
                        <span title="Personal Record Hit" className="text-amber-400">
                          <Trophy className="w-3.5 h-3.5 fill-amber-400/20" />
                        </span>
                      )}
                      {day.isToday && (
                        <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-emerald-500 text-black font-bold text-[8px] uppercase tracking-wider">
                          Today
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cell Body: Workout status representation */}
                  <div className="mt-1.5 w-full space-y-1">
                    {hasAttendance ? (
                      /* Completed Floor Attendance */
                      <div className="p-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="text-[10px] font-bold tracking-tight truncate">
                            {day.attendance?.durationMinutes ? `${day.attendance.durationMinutes}m` : 'Done'}
                          </span>
                        </div>
                        <div className="text-[9px] text-zinc-300 font-medium truncate hidden sm:block mt-0.5">
                          {day.attendance?.workoutName || 'Completed'}
                        </div>
                      </div>
                    ) : day.isToday ? (
                      /* Today's Active Session */
                      <div className="p-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[9px] font-bold uppercase tracking-tight text-emerald-400">
                            Active
                          </span>
                        </div>
                        <div className="text-[9px] text-zinc-200 font-medium truncate hidden sm:block mt-0.5">
                          {day.scheduledWorkout?.title}
                        </div>
                      </div>
                    ) : isRestDay ? (
                      /* Scheduled Rest Day */
                      <div className="py-0.5 px-1 rounded bg-zinc-800/60 text-zinc-500 text-[9px] font-medium hidden sm:block truncate">
                        Rest Day
                      </div>
                    ) : (
                      /* Scheduled Workout */
                      <div className="p-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300">
                        <div className="flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                          <span className="text-[9px] font-semibold truncate">
                            {day.scheduledWorkout?.title.split(' ')[0]}
                          </span>
                        </div>
                        <div className="text-[8px] text-zinc-400 truncate hidden sm:block">
                          {day.scheduledWorkout?.zoneName.split(' ')[0]}
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Day Inspector & Drilldown (4-5 Cols on Desktop) */}
        <div className="lg:col-span-5 xl:col-span-4 rounded-3xl bg-[#121214] border border-zinc-800 p-6 shadow-xl space-y-5">
          {/* Header of Inspector */}
          <div className="border-b border-zinc-800 pb-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                Session Inspector
              </span>
              {selectedDay.isToday && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Today's Schedule
                </span>
              )}
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight mt-1">
              {selectedDateFormatted}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {selectedDay.dateStr}
            </p>
          </div>

          {/* Status Badge Card */}
          {selectedDay.attendance ? (
            <div className="p-4 rounded-2xl bg-emerald-950/25 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Floor Verified Completed
                    </div>
                    <div className="text-sm font-bold text-white">
                      {selectedDay.attendance.workoutName}
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Details Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-xs">
                <div>
                  <span className="text-zinc-400 text-[11px] block">Arrival – Exit:</span>
                  <span className="font-mono text-zinc-200 font-semibold">
                    {selectedDay.attendance.arrival} – {selectedDay.attendance.exit || 'Floor Active'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 text-[11px] block">Duration:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {selectedDay.attendance.durationMinutes || 60} Minutes
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 text-[11px] block">Floor Zone:</span>
                  <span className="text-zinc-200 font-medium">
                    {selectedDay.attendance.zoneName}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 text-[11px] block">Check-In Mode:</span>
                  <span className="text-zinc-200 font-mono text-[11px]">
                    {selectedDay.attendance.method === 'QR' ? 'QR Pass Verified' : selectedDay.attendance.method}
                  </span>
                </div>
              </div>
            </div>
          ) : selectedDay.isToday ? (
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-bold">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Today's Assigned Session
                    </div>
                    <div className="text-sm font-bold text-white">
                      {currentWorkout?.title || selectedDay.scheduledWorkout?.title}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono text-emerald-400 font-bold">
                    {currentWorkout?.completionPercentage || 0}% Done
                  </div>
                </div>
              </div>

              {onOpenCheckInQR && (
                <button
                  onClick={onOpenCheckInQR}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-500/10"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Check In via Digital Pass</span>
                </button>
              )}
            </div>
          ) : selectedDay.scheduledWorkout?.isRestDay ? (
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2 text-center">
              <div className="w-10 h-10 rounded-2xl bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5 text-zinc-400" />
              </div>
              <h4 className="text-sm font-bold text-white uppercase">Scheduled Rest & Recovery</h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                Prioritize myofascial hydration, deep REM sleep, and muscle glycogen replenishment.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-400" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                    Programmed Upcoming Session
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    {selectedDay.scheduledWorkout?.title}
                  </h4>
                </div>
              </div>
              <div className="text-xs text-zinc-400 pt-1 flex items-center gap-3">
                <span>Bay: <strong className="text-zinc-200">{selectedDay.scheduledWorkout?.zoneName}</strong></span>
              </div>
            </div>
          )}

          {/* Personal Record Milestone Highlight on this day */}
          {selectedDay.personalRecord && (
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Trophy className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Strength Milestone Verified
                  </div>
                  <div className="text-sm font-black text-white mt-0.5">
                    {selectedDay.personalRecord.exercise}: {selectedDay.personalRecord.weightKg} KG
                  </div>
                  <div className="text-xs text-zinc-400 mt-1 font-mono">
                    {selectedDay.personalRecord.reps} reps • Improved by +{selectedDay.personalRecord.improvementPercentage}%
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">
                    Floor Verified by {selectedDay.personalRecord.verifiedBy}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => triggerPrConfetti()}
                title="Celebrate this PR!"
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Celebrate</span>
              </button>
            </div>
          )}

          {/* Routine Exercises Blueprint List */}
          {selectedDay.scheduledWorkout && selectedDay.scheduledWorkout.exercises.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Exercise Breakdown ({selectedDay.scheduledWorkout.exercises.length} Exercises)
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Target: {selectedDay.scheduledWorkout.targetMuscles.slice(0, 2).join(', ')}
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {selectedDay.isToday && currentWorkout?.exercises ? (
                  // Interactive checkboxes for today's workout
                  currentWorkout.exercises.map((ex) => (
                    <div
                      key={ex.id}
                      onClick={() => onToggleExercise && onToggleExercise(ex.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        ex.completed 
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-zinc-300'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-white'
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
                          <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                            {ex.sets} Sets × {ex.reps} • {ex.equipment}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  // Static exercise blueprint for past or scheduled day
                  selectedDay.scheduledWorkout.exercises.map((ex, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-bold text-zinc-200">
                          {ex.name}
                        </span>
                        <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                          {ex.sets} Sets × {ex.reps} • {ex.equipment}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-zinc-800">
                        {idx + 1}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Quick Guidance Note */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-start gap-2.5 text-xs text-zinc-400">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              Workouts are synchronized with gym floor QR check-in gates. Completed logs update immediately once checked in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
