import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, 
  X, 
  Sparkles, 
  Flame, 
  TrendingUp, 
  CheckCircle2, 
  Dumbbell, 
  Calendar, 
  UserCheck 
} from 'lucide-react';
import { UserProfile, PersonalRecord } from '../../types';
import { dataService } from '../../services/dataService';
import { triggerPrConfetti } from '../../utils/confetti';

interface LogPRModalProps {
  member: UserProfile;
  existingPRs: PersonalRecord[];
  isOpen: boolean;
  onClose: () => void;
  onPrLogged?: (newPr: PersonalRecord) => void;
}

const COMMON_EXERCISES = [
  'Barbell Bench Press',
  'Barbell Back Squat',
  'Deadlift (Conventional)',
  'Overhead Barbell Press',
  'Barbell Bent-Over Row',
  'Lat Pulldown (Neutral)',
  'Incline Dumbbell Press',
  'Dumbbell Bicep Curl',
  'Leg Press (45-Degree)',
  'Weighted Pull-Ups'
];

export const LogPRModal: React.FC<LogPRModalProps> = ({
  member,
  existingPRs,
  isOpen,
  onClose,
  onPrLogged
}) => {
  const [exercise, setExercise] = useState(COMMON_EXERCISES[0]);
  const [customExercise, setCustomExercise] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [weightKg, setWeightKg] = useState<string>('100');
  const [reps, setReps] = useState<string>('1');
  const [verifiedBy, setVerifiedBy] = useState<string>(member.assignedTrainerName || 'Coach Karan Singhania');
  const [date, setDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [celebrationPR, setCelebrationPR] = useState<PersonalRecord | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowCelebration(false);
      setCelebrationPR(null);
    }
  }, [isOpen]);

  // Determine current active exercise name
  const activeExerciseName = isCustom ? (customExercise.trim() || 'Custom Lift') : exercise;

  // Find previous best for this exercise if any
  const previousRecord = useMemo(() => {
    const matching = existingPRs.filter(
      p => p.exercise.toLowerCase() === activeExerciseName.toLowerCase()
    );
    if (matching.length === 0) return null;
    // Return the highest weight record
    return matching.reduce((max, curr) => (curr.weightKg > max.weightKg ? curr : max), matching[0]);
  }, [existingPRs, activeExerciseName]);

  const currentWeightNum = parseFloat(weightKg) || 0;
  const currentRepsNum = parseInt(reps, 10) || 1;

  // Calculate improvement percentage
  const improvement = useMemo(() => {
    if (!previousRecord || !previousRecord.weightKg) return null;
    const diff = currentWeightNum - previousRecord.weightKg;
    if (diff <= 0) return null;
    const pct = Math.round((diff / previousRecord.weightKg) * 100);
    return { diff: Math.round(diff * 10) / 10, pct };
  }, [previousRecord, currentWeightNum]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentWeightNum <= 0) return;

    const prData: Omit<PersonalRecord, 'id'> = {
      memberId: member.id,
      exercise: activeExerciseName,
      weightKg: currentWeightNum,
      reps: currentRepsNum,
      previousWeightKg: previousRecord ? previousRecord.weightKg : undefined,
      improvementPercentage: improvement ? improvement.pct : (previousRecord ? 0 : 100),
      date: date || new Date().toISOString().split('T')[0],
      verifiedBy: verifiedBy.trim() || 'Floor Coach'
    };

    const savedRecord = dataService.recordPersonalRecord(prData);
    setCelebrationPR(savedRecord);
    setShowCelebration(true);

    // Trigger celebratory confetti effect
    triggerPrConfetti();

    if (onPrLogged) {
      onPrLogged(savedRecord);
    }
  };

  const handleAdjustWeight = (delta: number) => {
    const newWeight = Math.max(2.5, Math.round((currentWeightNum + delta) * 10) / 10);
    setWeightKg(String(newWeight));
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl bg-[#121214] border border-zinc-800 p-6 sm:p-7 text-white shadow-2xl overflow-hidden"
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-14 -right-14 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-14 -left-14 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
              <Trophy className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base uppercase tracking-wide text-white">
                  Log Personal Record
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-mono font-bold uppercase border border-emerald-500/30">
                  New PR
                </span>
              </div>
              <p className="text-xs text-zinc-400">Record a new milestone and celebrate your strength gains</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition"
            aria-label="Close PR dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Celebration State View */}
        {showCelebration && celebrationPR ? (
          <div className="py-6 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
            {/* Animated Trophy Badge */}
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-emerald-400 text-black flex items-center justify-center shadow-2xl shadow-amber-500/25 animate-bounce">
                <Trophy className="w-10 h-10 fill-black/20" />
              </div>
              <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-400 text-black flex items-center justify-center font-black text-xs shadow">
                ★
              </div>
            </div>

            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Personal Record Shattered!
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mt-1">
                {celebrationPR.exercise}
              </h2>
            </div>

            {/* Achievement Card */}
            <div className="w-full p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-around">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Weight</span>
                  <span className="text-3xl font-black font-mono text-emerald-400">
                    {celebrationPR.weightKg} <span className="text-sm font-sans font-normal text-zinc-400">KG</span>
                  </span>
                </div>
                <div className="w-px h-10 bg-zinc-800" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Reps</span>
                  <span className="text-3xl font-black font-mono text-white">
                    {celebrationPR.reps} <span className="text-sm font-sans font-normal text-zinc-400">Reps</span>
                  </span>
                </div>
              </div>

              {celebrationPR.improvementPercentage ? (
                <div className="py-2 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  <span>+{celebrationPR.improvementPercentage}% over previous best ({celebrationPR.previousWeightKg} KG)</span>
                </div>
              ) : null}

              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                <span>Verified: {celebrationPR.verifiedBy}</span>
                <span>Date: {celebrationPR.date}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full pt-2">
              <button
                onClick={() => {
                  triggerPrConfetti();
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Replay Confetti</span>
              </button>

              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Done</span>
              </button>
            </div>
          </div>
        ) : (
          /* Form Entry State */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Exercise Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Target Exercise
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustom(!isCustom)}
                  className="text-[11px] text-emerald-400 hover:underline font-semibold"
                >
                  {isCustom ? 'Choose from list' : '+ Custom exercise'}
                </button>
              </div>

              {isCustom ? (
                <input
                  type="text"
                  value={customExercise}
                  onChange={(e) => setCustomExercise(e.target.value)}
                  placeholder="e.g. Bulgarian Split Squat"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500"
                />
              ) : (
                <select
                  value={exercise}
                  onChange={(e) => setExercise(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  {COMMON_EXERCISES.map((ex) => (
                    <option key={ex} value={ex} className="bg-zinc-900 text-white">
                      {ex}
                    </option>
                  ))}
                </select>
              )}

              {previousRecord && (
                <div className="mt-1.5 text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <span className="text-zinc-500">Current Best:</span>
                  <strong className="text-amber-400 font-mono">{previousRecord.weightKg} KG</strong>
                  <span className="text-zinc-500">× {previousRecord.reps} reps ({previousRecord.date})</span>
                </div>
              )}
            </div>

            {/* Weight Input with Steppers */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block mb-1.5">
                Weight Lifted (KG)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="600"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  required
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-lg font-bold focus:outline-none focus:border-emerald-500"
                />
                <div className="flex items-center gap-1">
                  {[2.5, 5, 10].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => handleAdjustWeight(inc)}
                      className="px-2.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono font-bold text-emerald-400 transition"
                    >
                      +{inc}
                    </button>
                  ))}
                </div>
              </div>

              {improvement && (
                <div className="mt-1.5 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span>+{improvement.diff} KG (+{improvement.pct}% improvement over your previous record!)</span>
                </div>
              )}
            </div>

            {/* Repetitions & Date Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block mb-1.5">
                  Repetitions Completed
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-sm font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block mb-1.5">
                  Milestone Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Verified By */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block mb-1.5">
                Verified By (Coach or Floor Trainer)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={verifiedBy}
                  onChange={(e) => setVerifiedBy(e.target.value)}
                  placeholder="e.g. Coach Karan Singhania"
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500 pl-9"
                />
                <UserCheck className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider transition"
              >
                Cancel
              </button>

              {/* Exact 'Log PR' action button */}
              <button
                id="submit-log-pr-btn"
                type="submit"
                className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Log PR</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
