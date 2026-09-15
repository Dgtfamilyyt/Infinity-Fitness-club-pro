import React from 'react';
import { Users, AlertCircle, Activity, Sparkles } from 'lucide-react';
import { GymZone } from '../../types';

interface LiveFloorStatusProps {
  zones: GymZone[];
  totalInside: number;
}

export const LiveFloorStatus: React.FC<LiveFloorStatusProps> = ({ zones, totalInside }) => {
  return (
    <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <h3 className="text-base font-bold text-white tracking-wide">Live Gym Floor Occupancy</h3>
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-mono">
            Smart Balance Active
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-zinc-400">Inside Club:</span>
            <span className="font-bold text-white font-mono">{totalInside} Members</span>
          </div>
        </div>
      </div>

      {/* Zones Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {zones.map((zone) => {
          const ratio = zone.capacity > 0 ? (zone.currentOccupancy / zone.capacity) * 100 : 0;
          const isFull = zone.currentOccupancy >= zone.capacity;
          const isBusy = !isFull && zone.currentOccupancy >= zone.capacity - 1;

          return (
            <div
              key={zone.id}
              className={`relative rounded-xl p-3.5 border transition duration-150 flex flex-col justify-between ${
                isFull
                  ? 'bg-red-950/20 border-red-500/30'
                  : isBusy
                  ? 'bg-amber-950/20 border-amber-500/30'
                  : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-xs font-bold text-white truncate">{zone.name}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold tracking-wider ${
                      isFull
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : isBusy
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {isFull ? 'FULL' : isBusy ? 'BUSY' : 'OPEN'}
                  </span>
                </div>

                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold font-mono text-white">
                    {zone.currentOccupancy}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">/ {zone.capacity}</span>
                </div>
              </div>

              {/* Occupancy Progress Bar */}
              <div className="mt-3">
                <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFull
                        ? 'bg-red-500'
                        : isBusy
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, ratio)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
