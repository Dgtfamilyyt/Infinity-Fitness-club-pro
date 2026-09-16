import React, { useState, useMemo } from 'react';
import { 
  Dumbbell, 
  Calendar, 
  Clock, 
  Trophy, 
  TrendingUp, 
  CheckCircle2, 
  Circle, 
  History, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Flame, 
  MapPin, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  Zap,
  Activity,
  Check,
  X,
  Sparkles,
  Bell
} from 'lucide-react';
import { UserProfile, WorkoutAssignment, AttendanceRecord, PersonalRecord } from '../../types';
import { triggerPrConfetti } from '../../utils/confetti';
import { notificationService } from '../../services/notificationService';

export interface WorkoutHistoryViewProps {
  member: UserProfile;
  currentWorkout: WorkoutAssignment;
  attendanceLogs: AttendanceRecord[];
  personalRecords: PersonalRecord[];
  onToggleExercise?: (exerciseId: string) => void;
  initialSubTab?: 'CURRENT' | 'PAST';
}

// Sample historical exercise breakdowns for enriched past sessions
const HISTORICAL_EXERCISE_PRESETS: Record<string, { targetMuscles: string[]; exercises: { name: string; sets: string; equipment: string }[] }> = {
  'Back & Biceps Pull Day': {
    targetMuscles: ['Lats', 'Upper Back', 'Biceps'],
    exercises: [
      { name: 'Lat Pulldown (Neutral Grip)', sets: '4 sets × 10-12 reps', equipment: 'Cable Lat Machine' },
      { name: 'Barbell Bent-Over Row', sets: '4 sets × 8 reps', equipment: 'Olympic Barbell' },
      { name: 'Seated Cable Row', sets: '3 sets × 12 reps', equipment: 'Low Cable Row' },
      { name: 'Incline Dumbbell Bicep Curl', sets: '3 sets × 12 reps', equipment: 'Dumbbells & Bench' },
      { name: 'Face Pulls with Rope', sets: '4 sets × 15 reps', equipment: 'Cable Machine' }
    ]
  },
  'Legs Quads & Calves Heavy': {
    targetMuscles: ['Quadriceps', 'Glutes', 'Calves'],
    exercises: [
      { name: 'Barbell Back Squat', sets: '5 sets × 6-8 reps', equipment: 'Squat Rack' },
      { name: 'Leg Press (Foot Placed Low)', sets: '4 sets × 12 reps', equipment: '45-Degree Leg Press' },
      { name: 'Walking Dumbbell Lunges', sets: '3 sets × 20 steps', equipment: 'Dumbbells' },
      { name: 'Leg Extension Machine', sets: '4 sets × 15 reps', equipment: 'Leg Extension' },
      { name: 'Standing Calf Raise', sets: '4 sets × 20 reps', equipment: 'Calf Machine' }
    ]
  },
  'Shoulder Biomechanics & Core': {
    targetMuscles: ['Deltoids', 'Traps', 'Core'],
    exercises: [
      { name: 'Seated Dumbbell Overhead Press', sets: '4 sets × 8-10 reps', equipment: 'Adjustable Bench' },
      { name: 'Cable Lateral Raise', sets: '4 sets × 15 reps', equipment: 'Cable Pulley' },
      { name: 'Rear Delt Fly (Pec Deck)', sets: '3 sets × 15 reps', equipment: 'Reverse Fly Machine' },
      { name: 'Hanging Knee Raises', sets: '3 sets × 15 reps', equipment: 'Captain\'s Chair' },
      { name: 'Cable Woodchoppers', sets: '3 sets × 12 reps/side', equipment: 'Cable Stack' }
    ]
  },
  'Arms & High-Intensity Conditioning': {
    targetMuscles: ['Biceps', 'Triceps', 'Forearms'],
    exercises: [
      { name: 'Close-Grip Bench Press', sets: '4 sets × 8 reps', equipment: 'Flat Bench' },
      { name: 'Barbell EZ-Bar Curl', sets: '4 sets × 10 reps', equipment: 'EZ Curl Bar' },
      { name: 'Overhead Tricep Extension', sets: '3 sets × 12 reps', equipment: 'Dumbbell' },
      { name: 'Hammer Curls', sets: '3 sets × 12 reps', equipment: 'Dumbbells' },
      { name: 'Battle Ropes HIIT Finisher', sets: '5 rounds × 30s', equipment: 'Battle Ropes' }
    ]
  }
};

export const WorkoutHistoryView: React.FC<WorkoutHistoryViewProps> = ({
  member,
  currentWorkout,
  attendanceLogs,
  personalRecords,
  onToggleExercise,
  initialSubTab = 'PAST'
}) => {
  const [subTab, setSubTab] = useState<'CURRENT' | 'PAST'>(initialSubTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Filter logs for this member
  const memberAttendance = useMemo(() => {
    return attendanceLogs.filter(
      a => a.memberId === member.id || 
           (member.memberId && a.memberId === member.memberId) ||
           (a.memberName && member.fullName && a.memberName.toLowerCase() === member.fullName.toLowerCase())
    );
  }, [attendanceLogs, member]);

  // Filter personal records for this member
  const memberPRs = useMemo(() => {
    return personalRecords.filter(
      p => p.memberId === member.id || (member.memberId && p.memberId === member.memberId)
    );
  }, [personalRecords, member]);

  // Extract unique zones from past logs
  const availableZones = useMemo(() => {
    const zones = new Set<string>();
    memberAttendance.forEach(a => {
      if (a.zoneName) zones.add(a.zoneName);
    });
    return Array.from(zones);
  }, [memberAttendance]);

  // Filtered and searched past records
  const filteredPastRecords = useMemo(() => {
    return memberAttendance.filter(record => {
      const matchesSearch = 
        record.workoutName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.zoneName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.date.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesZone = selectedZoneFilter === 'ALL' || record.zoneName === selectedZoneFilter;

      return matchesSearch && matchesZone;
    });
  }, [memberAttendance, searchQuery, selectedZoneFilter]);

  // Total floor time in minutes
  const totalFloorMinutes = useMemo(() => {
    return memberAttendance.reduce((acc, curr) => acc + (curr.durationMinutes || 60), 0);
  }, [memberAttendance]);

  const toggleExpandLog = (logId: string) => {
    setExpandedLogId(prev => (prev === logId ? null : logId));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Interactive Segmented Toggle */}
      <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold tracking-wider uppercase">
              ATHLETE TRAINING LOGS
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              {member.memberId || 'IFC-MEMBER'} • {member.fullName}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase mt-1">
            Workout History & Records
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Review completed floor sessions, current assigned routine, and verified strength milestones
          </p>
        </div>

        {/* Segmented SubTab Control */}
        <div className="flex items-center bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800 shrink-0 self-start md:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => setSubTab('PAST')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              subTab === 'PAST'
                ? 'bg-emerald-500 text-black shadow-md font-extrabold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Past Workout Records</span>
            <span className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-bold ${
              subTab === 'PAST' ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-300'
            }`}>
              {memberAttendance.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('CURRENT')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              subTab === 'CURRENT'
                ? 'bg-emerald-500 text-black shadow-md font-extrabold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Current Workout</span>
            <span className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-bold ${
              subTab === 'CURRENT' ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-300'
            }`}>
              {currentWorkout.completionPercentage}%
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: PAST WORKOUT RECORDS                                              */}
      {/* ========================================================================= */}
      {subTab === 'PAST' && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#121214] border border-zinc-800 shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Total Workouts</span>
                <Dumbbell className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {memberAttendance.length}
              </div>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">Floor logged sessions</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#121214] border border-zinc-800 shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Total Floor Time</span>
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {totalFloorMinutes} <span className="text-xs text-zinc-500 font-normal">min</span>
              </div>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">
                Avg ~{memberAttendance.length ? Math.round(totalFloorMinutes / memberAttendance.length) : 0} min / session
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#121214] border border-zinc-800 shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Milestone PRs</span>
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {memberPRs.length}
              </div>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">Verified personal bests</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#121214] border border-zinc-800 shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Current Streak</span>
                <Flame className="w-4 h-4 text-orange-400" />
              </div>
              <div className="text-2xl font-black text-orange-400 font-mono">
                {member.attendanceStreak || memberAttendance.length} <span className="text-xs text-zinc-500 font-normal">days</span>
              </div>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">Consecutive training frequency</span>
            </div>
          </div>

          {/* Filter, Search & Zone Tabs */}
          <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search Bar */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search workout, zone, or date..."
                  className="w-full pl-10 pr-9 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-3 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Reset / Count Display */}
              <div className="text-xs text-zinc-400 flex items-center gap-2 self-end sm:self-center">
                <span>Showing <strong className="text-white font-mono">{filteredPastRecords.length}</strong> of {memberAttendance.length} records</span>
                {(searchQuery || selectedZoneFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedZoneFilter('ALL');
                    }}
                    className="text-[11px] text-emerald-400 hover:underline font-semibold"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Zone Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider shrink-0 mr-1">
                Zone:
              </span>
              <button
                type="button"
                onClick={() => setSelectedZoneFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-[11px] transition shrink-0 ${
                  selectedZoneFilter === 'ALL'
                    ? 'bg-emerald-500 text-black shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                All Zones
              </button>
              {availableZones.map((zone) => (
                <button
                  key={zone}
                  type="button"
                  onClick={() => setSelectedZoneFilter(zone)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition shrink-0 ${
                    selectedZoneFilter === zone
                      ? 'bg-emerald-500 text-black shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  {zone}
                </button>
              ))}
            </div>
          </div>

          {/* Past Workout Sessions List */}
          {filteredPastRecords.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#121214] border border-zinc-800 text-zinc-500 space-y-3">
              <History className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-400">No workout records matching your search</p>
              <p className="text-xs text-zinc-500">Try changing the zone filter or clearing the search box</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPastRecords.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const preset = HISTORICAL_EXERCISE_PRESETS[log.workoutName];
                // Check if any PR was verified on or near this date
                const relatedPR = memberPRs.find(p => p.date === log.date);

                return (
                  <div
                    key={log.id}
                    className="rounded-2xl bg-[#121214] border border-zinc-800 hover:border-zinc-700 p-5 shadow-xl transition space-y-4"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {log.date}
                          </span>
                          <span>•</span>
                          <span className="text-[11px] font-mono text-zinc-400">
                            {log.arrival} – {log.exit || 'Floor Complete'}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-white uppercase mt-0.5">
                          {log.workoutName}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <span className="px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          {log.durationMinutes ? `${log.durationMinutes} min` : 'Completed'}
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-bold uppercase">
                          {log.method} Scanned
                        </span>
                      </div>
                    </div>

                    {/* Meta row: Zone, Coach, and PR Callout */}
                    <div className="grid sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Trained Zone</span>
                          <span className="font-bold text-zinc-200">{log.zoneName}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Supervising Coach</span>
                          <span className="font-bold text-zinc-200">
                            {member.assignedTrainerName || 'Rahul Sharma (CSCS)'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Attendance Verification</span>
                          <span className="font-bold text-emerald-400">Verified Floor Checkout</span>
                        </div>
                      </div>
                    </div>

                    {/* Milestone PR Hit Callout if any */}
                    {relatedPR && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-amber-300">
                          <Trophy className="w-4 h-4 shrink-0 text-amber-400" />
                          <div>
                            <span className="font-bold">Milestone PR Achieved: </span>
                            <span>{relatedPR.exercise} — </span>
                            <strong className="font-mono text-white">{relatedPR.weightKg} KG × {relatedPR.reps} reps</strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {relatedPR.improvementPercentage && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold shrink-0">
                              +{relatedPR.improvementPercentage}% Peak
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerPrConfetti();
                            }}
                            title="Celebrate this PR!"
                            className="p-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 transition active:scale-90"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Expandable Exercise Routine Breakdown */}
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleExpandLog(log.id)}
                        className="w-full pt-2 flex items-center justify-between text-xs text-zinc-400 hover:text-white transition group cursor-pointer"
                      >
                        <span className="font-semibold flex items-center gap-1.5 group-hover:text-emerald-400 transition">
                          <Layers className="w-3.5 h-3.5" />
                          {isExpanded ? 'Hide Routine Breakdown' : 'View Completed Exercises & Targets'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-3 animate-in fade-in">
                          {preset ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-zinc-500 uppercase font-semibold">
                                  Target Muscle Groups:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {preset.targetMuscles.map((m, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 font-mono text-[10px] font-bold">
                                      {m}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="grid sm:grid-cols-2 gap-2 text-xs">
                                {preset.exercises.map((ex, idx) => (
                                  <div key={idx} className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-start gap-2.5">
                                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                    <div>
                                      <div className="font-bold text-white">{ex.name}</div>
                                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{ex.sets}</div>
                                      <div className="text-[10px] text-zinc-500 mt-0.5">Equip: {ex.equipment}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="p-3 rounded-xl bg-zinc-900 text-xs text-zinc-400">
                              Completed comprehensive full-body workout routine in the designated zone.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Correlated Personal Best Milestones Section */}
          <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white uppercase tracking-wide">
                    Personal Best Records Across Past Sessions
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Official weight & repetition milestones verified by gym floor trainers
                  </p>
                </div>
              </div>
              <span className="text-xs text-zinc-500 font-mono">{memberPRs.length} Milestones</span>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {memberPRs.map((pr) => (
                <div key={pr.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200">{pr.exercise}</span>
                    <Trophy className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-emerald-400">{pr.weightKg} KG</span>
                    <span className="text-xs text-zinc-400 font-mono">× {pr.reps} reps</span>
                  </div>
                  {pr.improvementPercentage && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>+{pr.improvementPercentage}% breakthrough</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                    <span>{pr.date}</span>
                    <span>{pr.verifiedBy || 'Trainer Verified'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: CURRENT WORKOUT ASSIGNMENT                                        */}
      {/* ========================================================================= */}
      {subTab === 'CURRENT' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl pointer-events-none" />

            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Active Assigned Session
                </span>
                <h2 className="text-2xl font-black text-white uppercase mt-1">
                  {currentWorkout.title}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Target: {currentWorkout.targetMuscles.join(', ')} • Designated Zone: {currentWorkout.zoneName}
                </p>

                {currentWorkout.isOverride && (
                  <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Trainer Override Active: {currentWorkout.overrideReason}
                  </div>
                )}
              </div>

              {/* Progress Ring / Percentage Box */}
              <div className="flex items-center gap-4 bg-zinc-900 px-5 py-3 rounded-2xl border border-zinc-800 self-start sm:self-auto">
                <div className="text-right">
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Today's Progress</div>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {currentWorkout.completionPercentage}%
                  </div>
                </div>
              </div>
            </div>

            {/* Session Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4 border-b border-zinc-800">
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Assigned Coach</span>
                <div className="text-xs font-bold text-white mt-0.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  {currentWorkout.trainerName || member.assignedTrainerName || 'Rahul Sharma'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Floor Zone</span>
                <div className="text-xs font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  {currentWorkout.zoneName}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Scheduled Slot</span>
                <div className="text-xs font-bold text-white mt-0.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  {currentWorkout.timeSlot || '6:00 PM – 7:00 PM'}
                </div>
              </div>
            </div>

            {/* Session 1-Hour Reminder Notice */}
            <div className="mt-4 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>1-Hour Session Reminder:</strong> In-app alerts and push notifications are active for this scheduled slot.
                </span>
              </div>
              <button
                type="button"
                onClick={() => notificationService.triggerTestReminder(currentWorkout)}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider transition active:scale-95 shrink-0 flex items-center gap-1"
                title="Send test 1-hour workout reminder alert"
              >
                <Sparkles className="w-3 h-3" />
                <span>Test Alert</span>
              </button>
            </div>

            {/* Interactive Exercise Checklist */}
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Exercise Breakdown ({currentWorkout.exercises.filter(e => e.completed).length}/{currentWorkout.exercises.length} Complete)
                </h3>
                <span className="text-[11px] text-zinc-500">Tap checkboxes to log completion</span>
              </div>

              <div className="space-y-3.5">
                {currentWorkout.exercises.map((ex, idx) => (
                  <div
                    key={ex.id}
                    className={`p-5 rounded-2xl border transition ${
                      ex.completed
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <button
                        type="button"
                        onClick={() => onToggleExercise?.(ex.id)}
                        className="mt-1 cursor-pointer focus:outline-none shrink-0"
                        title={ex.completed ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {ex.completed ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <Circle className="w-6 h-6 text-zinc-600 hover:text-emerald-400 transition" />
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-emerald-400 font-bold">0{idx + 1}</span>
                          <h4 className={`text-base font-bold ${ex.completed ? 'line-through text-zinc-500' : 'text-white'}`}>
                            {ex.name}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                          <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-semibold font-mono">
                            {ex.sets} Sets
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-semibold font-mono">
                            {ex.reps} Reps
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 text-emerald-400 font-semibold font-mono">
                            {ex.restSeconds}s Rest
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400">
                            {ex.equipment}
                          </span>
                        </div>

                        <p className="mt-3 text-xs text-zinc-400 leading-relaxed max-w-2xl">
                          {ex.instructions}
                        </p>

                        {ex.notes && (
                          <div className="mt-2 text-[11px] text-amber-400/90 font-medium">
                            Trainer Note: {ex.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick footer switch */}
            <div className="mt-6 pt-5 border-t border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Need to check past sessions or strength gains?</span>
              <button
                type="button"
                onClick={() => setSubTab('PAST')}
                className="flex items-center gap-1.5 text-emerald-400 hover:underline font-bold"
              >
                <span>View Past Workout Records</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
