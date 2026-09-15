import React, { useState } from 'react';
import { Dumbbell, ShieldAlert, ArrowRight, Check, X, AlertCircle } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { GymZone, UserProfile } from '../../types';

interface TrainerOverrideModalProps {
  member: UserProfile;
  currentWorkout: string;
  currentZoneName: string;
  zones: GymZone[];
  isOpen: boolean;
  onClose: () => void;
  trainerName: string;
}

export const TrainerOverrideModal: React.FC<TrainerOverrideModalProps> = ({
  member,
  currentWorkout,
  currentZoneName,
  zones,
  isOpen,
  onClose,
  trainerName
}) => {
  const [newWorkout, setNewWorkout] = useState('');
  const [newZoneId, setNewZoneId] = useState(zones[0]?.id || '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkout.trim()) {
      setError('Please select or specify the replacement workout.');
      return;
    }
    if (!reason.trim()) {
      setError('A clinical/trainer audit reason is required for any manual override.');
      return;
    }

    const targetZone = zones.find(z => z.id === newZoneId) || zones[0];

    dataService.applyTrainerOverride({
      memberId: member.id,
      originalWorkout: currentWorkout,
      newWorkout: newWorkout.trim(),
      newZoneId: targetZone.id,
      newZoneName: targetZone.name,
      reason: reason.trim(),
      trainerName
    });

    onClose();
  };

  const presetAlternatives = [
    { name: 'Back & Biceps Pull Split', zoneId: 'zone-back' },
    { name: 'Legs & Calves Hypertrophy', zoneId: 'zone-legs' },
    { name: 'Rotator Cuff & Shoulder Mobility Protocol', zoneId: 'zone-shoulders' },
    { name: 'Active Cardio Flush & Core Stabilization', zoneId: 'zone-cardio' },
    { name: 'Arms & High-Rep Isolation', zoneId: 'zone-arms' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#121214] border border-zinc-800 p-6 text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-zinc-100">Trainer Floor Override</h3>
              <p className="text-xs text-zinc-400">Trainer has final clinical & floor authority</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleApply} className="py-4 space-y-4 text-xs">
          {/* Member Details */}
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider block">Member</span>
              <strong className="text-sm text-white">{member.fullName}</strong>
              <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">{member.memberId}</div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider block">Current Assigned</span>
              <div className="text-xs font-semibold text-amber-400">{currentWorkout}</div>
              <div className="text-[11px] text-zinc-400">{currentZoneName}</div>
            </div>
          </div>

          {/* Quick Preset Selector */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Select Replacement Workout:
            </label>
            <div className="space-y-1.5">
              {presetAlternatives.map((alt) => (
                <button
                  key={alt.name}
                  type="button"
                  onClick={() => {
                    setNewWorkout(alt.name);
                    setNewZoneId(alt.zoneId);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border transition flex items-center justify-between ${
                    newWorkout === alt.name
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-200'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <span className="font-medium">{alt.name}</span>
                  {newWorkout === alt.name && <Check className="w-4 h-4 text-amber-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Or Custom Workout Input */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Or Custom Workout Title:
            </label>
            <input
              type="text"
              placeholder="e.g. Deload Hamstring & Core Stabilization"
              value={newWorkout}
              onChange={(e) => setNewWorkout(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Target Zone */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Target Gym Floor Zone:
            </label>
            <select
              value={newZoneId}
              onChange={(e) => setNewZoneId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              {zones.map(z => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.currentOccupancy}/{z.capacity} slots)
                </option>
              ))}
            </select>
          </div>

          {/* Mandatory Override Reason */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Audit Reason (Required for Record-Keeping):
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Member reported acute right pectoral tightness during warm-up; redirected to Back & Biceps split to prevent injury."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-red-400 text-xs bg-red-950/40 p-2.5 rounded-lg border border-red-500/30">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition shadow-lg shadow-amber-500/10"
            >
              Confirm Override
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
