import React, { useState } from 'react';
import { 
  Users, 
  Dumbbell, 
  ShieldAlert, 
  Camera, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  BrainCircuit, 
  UserCheck,
  Send,
  Loader2,
  Edit3
} from 'lucide-react';
import { UserProfile, GymZone, ActiveGymSession, WorkoutAssignment } from '../../types';
import { dataService } from '../../services/dataService';
import { QRScannerModal } from '../common/QRScannerModal';
import { TrainerOverrideModal } from '../common/TrainerOverrideModal';
import { LiveFloorStatus } from '../common/LiveFloorStatus';
import { EditTrainerProfileModal } from './EditTrainerProfileModal';
import { consultWorkoutSafetyAdvisor } from '../../services/aiAdvisor';

interface TrainerPortalProps {
  currentTrainer: UserProfile;
  zones: GymZone[];
  activeSessions: ActiveGymSession[];
  members: UserProfile[];
  workout: WorkoutAssignment;
  onUpdateTrainer?: (trainer: UserProfile) => void;
}

export const TrainerPortal: React.FC<TrainerPortalProps> = ({
  currentTrainer,
  zones,
  activeSessions,
  members,
  workout,
  onUpdateTrainer
}) => {
  const [showScanner, setShowScanner] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [selectedMemberForOverride, setSelectedMemberForOverride] = useState<UserProfile | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // AI Advisor state
  const [advisorQuery, setAdvisorQuery] = useState('');
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorResponse, setAdvisorResponse] = useState<string | null>(null);
  const [advisorSelectedMember, setAdvisorSelectedMember] = useState<UserProfile>(members[0] || {} as any);

  // Filter members assigned to this trainer or all
  const assignedMembers = members.filter(m => 
    (!currentTrainer.id || m.assignedTrainerId === currentTrainer.id || m.assignedTrainerName === currentTrainer.fullName) &&
    (m.fullName.toLowerCase().includes(searchFilter.toLowerCase()) || (m.memberId && m.memberId.toLowerCase().includes(searchFilter.toLowerCase())))
  );

  const handleConsultAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisorQuery.trim()) return;

    setAdvisorLoading(true);
    setAdvisorResponse(null);

    try {
      const answer = await consultWorkoutSafetyAdvisor({
        memberName: advisorSelectedMember.fullName,
        memberGoal: advisorSelectedMember.fitnessGoal || 'Hypertrophy',
        experience: advisorSelectedMember.experience || 'Intermediate',
        restrictions: advisorSelectedMember.restrictions || 'None',
        proposedWorkout: workout.title,
        zoneName: workout.zoneName,
        query: advisorQuery.trim()
      });
      setAdvisorResponse(answer);
    } catch (err) {
      console.error(err);
      setAdvisorResponse('Error consulting safety advisor.');
    } finally {
      setAdvisorLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setShowEditProfile(true)}
            className="relative group rounded-xl overflow-hidden cursor-pointer"
            title="Click to change trainer profile photo"
          >
            <img
              src={currentTrainer.avatarUrl || 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80'}
              alt={currentTrainer.fullName}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-500/40 group-hover:border-emerald-400 transition"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white uppercase">{currentTrainer.fullName}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                TRAINER PORTAL
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">{currentTrainer.fitnessGoal || 'Head Strength & Conditioning Coach'}</p>
            {currentTrainer.experience && (
              <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">{currentTrainer.experience}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEditProfile(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-emerald-500/50 text-white font-bold text-xs uppercase tracking-wider transition"
          >
            <Edit3 className="w-4 h-4 text-emerald-400" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/10"
          >
            <Camera className="w-4 h-4" />
            <span>Floor QR Scanner</span>
          </button>
        </div>
      </div>

      {/* Live Floor Realtime Grid */}
      <LiveFloorStatus zones={zones} totalInside={activeSessions.length} />

      {/* Main 2-column Floor View */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Assigned Members & Floor Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wide">Assigned Athletes & Members</h3>
                <p className="text-xs text-zinc-400">Review training split, restrictions, or apply floor overrides</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter name or ID..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {assignedMembers.map((member) => {
                const isInside = activeSessions.some(s => s.memberId === member.id);
                const hasRestriction = member.restrictions && member.restrictions !== 'None';

                return (
                  <div
                    key={member.id}
                    className={`p-4 rounded-xl border transition ${
                      isInside
                        ? 'bg-zinc-900/90 border-emerald-500/40 shadow-sm'
                        : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{member.fullName}</span>
                          <span className="text-[10px] font-mono text-zinc-500">{member.memberId}</span>
                          {isInside ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              ON FLOOR
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono text-zinc-400 bg-zinc-800">
                              Off-Floor
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-zinc-400">
                          <span>Goal: <strong className="text-zinc-200">{member.fitnessGoal}</strong></span>
                          <span>•</span>
                          <span>Plan: <strong className="text-zinc-200">{member.planName}</strong></span>
                          <span>•</span>
                          <span>Preferred Time: <strong className="text-zinc-200">{member.preferredTime || '6:00 PM'}</strong></span>
                        </div>

                        {hasRestriction && (
                          <div className="mt-2 text-xs flex items-center gap-1.5 text-amber-400 bg-amber-950/20 px-2.5 py-1 rounded-lg border border-amber-500/20 max-w-xl">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            <span>Restriction: {member.restrictions}</span>
                          </div>
                        )}
                      </div>

                      {/* Floor Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedMemberForOverride(member)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition flex items-center gap-1.5"
                        >
                          <Dumbbell className="w-3.5 h-3.5" />
                          <span>Override Split</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: AI Biomechanics & Safety Advisor with HIGH thinking */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                  AI Biomechanics & Safety Advisor
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                    HIGH THINKING
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400">Gemini 3.1 Pro Deep Clinical Floor Reasoning</p>
              </div>
            </div>

            <form onSubmit={handleConsultAI} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                  Select Athlete:
                </label>
                <select
                  value={advisorSelectedMember.id}
                  onChange={(e) => {
                    const found = members.find(m => m.id === e.target.value);
                    if (found) setAdvisorSelectedMember(found);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.restrictions && m.restrictions !== 'None' ? m.restrictions : 'No restrictions'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                  Trainer Inquiry / Biomechanics Problem:
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Member has right shoulder impingement; recommend 3 safe substitutions for Barbell Incline Press and adjust rep tempo."
                  value={advisorQuery}
                  onChange={(e) => setAdvisorQuery(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500 resize-none text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={advisorLoading || !advisorQuery.trim()}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                {advisorLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Biomechanics with High Thinking...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run Clinical Analysis</span>
                  </>
                )}
              </button>
            </form>

            {advisorResponse && (
              <div className="mt-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800/80 text-xs text-zinc-300 leading-relaxed max-h-72 overflow-y-auto space-y-2 whitespace-pre-line">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5 pb-2 border-b border-zinc-800">
                  <CheckCircle2 className="w-4 h-4" />
                  Advisor Guidance for {advisorSelectedMember.fullName}:
                </div>
                <div>{advisorResponse}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        staffName={currentTrainer.fullName}
      />

      {/* Trainer Override Modal */}
      {selectedMemberForOverride && (
        <TrainerOverrideModal
          member={selectedMemberForOverride}
          currentWorkout="Chest + Triceps Hypertrophy"
          currentZoneName="Chest Zone"
          zones={zones}
          isOpen={true}
          onClose={() => setSelectedMemberForOverride(null)}
          trainerName={currentTrainer.fullName}
        />
      )}

      {/* Edit Trainer Profile Modal */}
      <EditTrainerProfileModal
        trainer={currentTrainer}
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        onSave={(updated) => {
          dataService.updateTrainer(updated);
          onUpdateTrainer?.(updated);
        }}
      />
    </div>
  );
};
