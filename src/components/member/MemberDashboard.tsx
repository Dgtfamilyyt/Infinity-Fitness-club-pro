import React, { useState } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { UserProfile, WorkoutAssignment, GymZone, PersonalRecord, AttendanceRecord } from '../../types';
import { dataService } from '../../services/dataService';
import { QRCodeModal } from '../common/QRCodeModal';
import { LiveFloorStatus } from '../common/LiveFloorStatus';

interface MemberDashboardProps {
  member: UserProfile;
  workout: WorkoutAssignment;
  zones: GymZone[];
  totalInside: number;
  prs: PersonalRecord[];
  attendanceLogs: AttendanceRecord[];
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  member,
  workout,
  zones,
  totalInside,
  prs,
  attendanceLogs
}) => {
  const [showQR, setShowQR] = useState(false);
  const [activeTab, setActiveTab] = useState<'HOME' | 'WORKOUT' | 'PROGRESS' | 'ATTENDANCE'>('HOME');

  const handleToggleExercise = (exerciseId: string) => {
    dataService.toggleExerciseComplete(exerciseId);
  };

  const memberPRs = prs.filter(p => p.memberId === member.id);
  const memberAttendance = attendanceLogs.filter(a => a.memberId === member.id);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 pb-24 md:pb-12">
      {/* Top Banner Bar */}
      <div className="bg-[#121214] border-b border-zinc-800 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="font-mono text-emerald-400 font-bold">{member.memberId}</span>
              <span>•</span>
              <span className="uppercase tracking-wider font-semibold text-zinc-300">{member.planName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase mt-0.5">
              HELLO, {member.fullName.split(' ')[0]}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Attendance & Streak stats */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <Flame className="w-4 h-4 text-orange-400" />
              <div className="text-xs">
                <span className="text-zinc-400">Streak:</span>{' '}
                <strong className="text-white font-mono">{member.attendanceStreak || 0} Days</strong>
              </div>
            </div>

            {/* QR Check-In Pass Button */}
            <button
              onClick={() => setShowQR(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs tracking-wider uppercase transition shadow-lg shadow-emerald-500/10"
            >
              <QrCode className="w-4 h-4" />
              <span>Digital Pass</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto">
          {[
            { id: 'HOME', label: 'Dashboard' },
            { id: 'WORKOUT', label: "Today's Workout" },
            { id: 'PROGRESS', label: 'PRs & Progress' },
            { id: 'ATTENDANCE', label: 'Attendance' }
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

                {/* Exercises Check-off Preview */}
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Exercise Breakdown ({workout.exercises.filter(e => e.completed).length}/{workout.exercises.length} Complete)
                    </h3>
                    <button 
                      onClick={() => setActiveTab('WORKOUT')}
                      className="text-xs text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      View Full Details <ChevronRight className="w-3.5 h-3.5" />
                    </button>
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
                  <span className="text-[10px] text-zinc-400">Verified</span>
                </div>

                <div className="mt-3 space-y-2.5">
                  {memberPRs.map((pr) => (
                    <div key={pr.id} className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-200">{pr.exercise}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-extrabold font-mono text-emerald-400">{pr.weightKg} KG</span>
                          <span className="text-[10px] text-zinc-500 font-mono">× {pr.reps}</span>
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

        {/* TAB 2: DETAILED WORKOUT VIEW */}
        {activeTab === 'WORKOUT' && (
          <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Complete Routine</span>
                <h2 className="text-2xl font-black text-white uppercase mt-1">{workout.title}</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Target: {workout.targetMuscles.join(', ')} • Designated Zone: {workout.zoneName}
                </p>
              </div>

              <div className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                <span className="text-zinc-400">Session Progress:</span>{' '}
                <strong className="text-emerald-400 font-mono text-sm">{workout.completionPercentage}%</strong>
              </div>
            </div>

            <div className="space-y-4">
              {workout.exercises.map((ex, idx) => (
                <div
                  key={ex.id}
                  className={`p-5 rounded-2xl border transition ${
                    ex.completed
                      ? 'bg-emerald-950/15 border-emerald-500/30'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <button
                        onClick={() => handleToggleExercise(ex.id)}
                        className="mt-0.5"
                      >
                        {ex.completed ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <Circle className="w-6 h-6 text-zinc-600 hover:text-emerald-400 transition" />
                        )}
                      </button>

                      <div>
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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PROGRESS & PRS */}
        {activeTab === 'PROGRESS' && (
          <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-xl space-y-6">
            <div className="border-b border-zinc-800 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Strength Analytics</span>
              <h2 className="text-2xl font-black text-white uppercase mt-1">Personal Best Records</h2>
              <p className="text-xs text-zinc-400 mt-1">Official floor-verified weight and rep milestones.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {memberPRs.map((pr) => (
                <div key={pr.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-300">{pr.exercise}</span>
                    <Trophy className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {pr.weightKg} KG
                  </div>
                  <div className="text-xs text-zinc-400 mt-1 font-mono">Repetition Count: {pr.reps} Reps</div>
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
            <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Check-In Logs</span>
                <h2 className="text-2xl font-black text-white uppercase mt-1">Club Attendance Log</h2>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                <span className="text-zinc-400">Total Visits:</span>{' '}
                <strong className="text-white font-mono">{memberAttendance.length}</strong>
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
      </div>

      {/* QR Pass Modal */}
      <QRCodeModal
        member={member}
        isOpen={showQR}
        onClose={() => setShowQR(false)}
      />
    </div>
  );
};
