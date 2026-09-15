import React, { useState } from 'react';
import { QrCode, Camera, Search, CheckCircle2, AlertTriangle, X, User, Dumbbell, MapPin, ShieldAlert } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { UserProfile } from '../../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffName: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, staffName }) => {
  const [manualInput, setManualInput] = useState('');
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    session?: any;
    recommendation?: any;
  } | null>(null);

  if (!isOpen) return null;

  const members = dataService.getMembers();

  const handleProcessCheckIn = (tokenOrId: string) => {
    const res = dataService.checkInMember(tokenOrId, 'QR', staffName);
    setResult(res);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const res = dataService.checkInMember(manualInput, 'MEMBER_ID', staffName);
    setResult(res);
    setManualInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#121214] border border-zinc-800 p-6 text-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-zinc-100">Contactless QR Check-In</h3>
              <p className="text-xs text-zinc-400">Reception & Trainer Floor Scanner</p>
            </div>
          </div>
          <button 
            onClick={() => { setResult(null); onClose(); }}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto pr-1 flex-1 py-4 space-y-4">
          {/* Simulated Optical Viewfinder */}
          <div className="relative aspect-video rounded-xl bg-black border border-zinc-800 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute inset-4 border-2 border-dashed border-emerald-500/40 rounded-lg animate-pulse pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-bounce opacity-75" />
            
            <QrCode className="w-12 h-12 text-zinc-600 mb-2" />
            <p className="text-xs text-zinc-400 font-medium">Scanning optical frame for IFC tokens...</p>
            <span className="text-[10px] text-zinc-600 mt-1">High-speed verification active</span>
          </div>

          {/* Quick Member Simulation Badges */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2 block">
              Simulate Member Tap / QR Scan:
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
              {members.slice(0, 6).map(m => (
                <button
                  key={m.id}
                  onClick={() => handleProcessCheckIn(m.qrToken || m.memberId || '')}
                  className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800/80 text-left transition text-xs"
                >
                  <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <div className="truncate">
                    <div className="font-semibold text-zinc-200 truncate">{m.fullName}</div>
                    <div className="text-[10px] font-mono text-zinc-500">{m.memberId}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="pt-1">
            <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5 block">
              Or Type Member ID / Token:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. IFC-1001 or IFC_TOKEN_..."
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition"
              >
                Validate
              </button>
            </div>
          </form>

          {/* Result Card */}
          {result && (
            <div className={`p-4 rounded-xl border animate-in zoom-in-95 duration-150 ${
              result.success 
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' 
                : 'bg-red-950/30 border-red-500/40 text-red-200'
            }`}>
              <div className="flex items-start gap-2.5">
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-sm">
                    {result.success ? 'Access Granted' : 'Check-In Refused'}
                  </div>
                  <div className="text-xs text-zinc-300 mt-0.5">{result.message}</div>
                </div>
              </div>

              {result.success && result.session && (
                <div className="mt-3 pt-3 border-t border-emerald-500/20 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-semibold">{result.session.memberName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                      {result.session.memberStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Workout: <strong className="text-white">{result.session.workoutName}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Allocated Zone: <strong className="text-emerald-400">{result.session.zoneName}</strong></span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    Floor session synchronized in real-time.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
