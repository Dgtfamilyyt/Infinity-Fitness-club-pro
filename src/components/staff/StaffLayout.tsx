import React, { useState } from 'react';
import { 
  Users, 
  Dumbbell, 
  Layers, 
  CreditCard, 
  Camera, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck, 
  Activity, 
  FileText,
  UserCheck,
  Search,
  Globe
} from 'lucide-react';
import { UserProfile, UserRole, GymSettings } from '../../types';

interface StaffLayoutProps {
  settings: GymSettings;
  staffUser: UserProfile;
  activeView: 'TRAINER' | 'RECEPTION' | 'ADMIN';
  setActiveView: (view: 'TRAINER' | 'RECEPTION' | 'ADMIN') => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const StaffLayout: React.FC<StaffLayoutProps> = ({
  settings,
  staffUser,
  activeView,
  setActiveView,
  onLogout,
  children
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Gating based on strict verified role
  const isOwner = staffUser.role === 'owner';
  const isAdmin = staffUser.role === 'admin' || isOwner;
  const isTrainer = staffUser.role === 'trainer' || isOwner;

  const roleLabel = staffUser.role === 'owner' 
    ? 'CLUB OWNER' 
    : staffUser.role === 'admin' 
    ? 'RECEPTION / ADMIN' 
    : 'FLOOR COACH';

  const roleBadgeColor = staffUser.role === 'owner'
    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    : staffUser.role === 'admin'
    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden sticky top-0 z-40 bg-[#121214] border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-black flex items-center justify-center font-black text-sm">
            ∞
          </div>
          <div>
            <span className="font-black text-sm text-white uppercase block leading-none">
              {settings.name}
            </span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border mt-0.5 inline-block ${roleBadgeColor}`}>
              {roleLabel}
            </span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Toggle Staff Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Backdrop & Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-[#121214] border-r border-zinc-800 p-6 flex flex-col justify-between z-10 shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 text-black flex items-center justify-center font-black text-sm">
                    ∞
                  </div>
                  <div>
                    <span className="font-bold text-xs text-white uppercase block">Infinity Staff</span>
                    <span className="text-[10px] text-zinc-400 font-mono">{staffUser.fullName}</span>
                  </div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white p-1">
                  ✕
                </button>
              </div>

              {/* Navigation Items */}
              <div className="space-y-2">
                {isTrainer && (
                  <button
                    onClick={() => {
                      setActiveView('TRAINER');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-left flex items-center gap-3 transition ${
                      activeView === 'TRAINER'
                        ? 'bg-emerald-500 text-black'
                        : 'bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <Dumbbell className="w-4 h-4" />
                    <span>Trainer Portal</span>
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={() => {
                      setActiveView('RECEPTION');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-left flex items-center gap-3 transition ${
                      activeView === 'RECEPTION'
                        ? 'bg-emerald-500 text-black'
                        : 'bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Reception Check-In</span>
                  </button>
                )}

                {isOwner && (
                  <button
                    onClick={() => {
                      setActiveView('ADMIN');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-left flex items-center gap-3 transition ${
                      activeView === 'ADMIN'
                        ? 'bg-emerald-500 text-black'
                        : 'bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    <span>Owner & Management</span>
                  </button>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-800">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out Staff</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar Layout */}
      <aside className="hidden md:flex flex-col justify-between w-64 bg-[#111113] border-r border-zinc-800 p-6 shrink-0 h-screen sticky top-0">
        <div className="space-y-6">
          {/* Logo & Staff Info */}
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-500/20">
                ∞
              </div>
              <div>
                <span className="font-black text-sm text-white uppercase block leading-none">
                  {settings.name}
                </span>
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest block mt-1">
                  Staff Operations
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                  {staffUser.fullName.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold text-xs text-white truncate">{staffUser.fullName}</div>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border inline-block mt-0.5 ${roleBadgeColor}`}>
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 text-xs font-bold uppercase tracking-wider">
            {isTrainer && (
              <button
                onClick={() => setActiveView('TRAINER')}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-left flex items-center gap-2.5 transition ${
                  activeView === 'TRAINER'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Dumbbell className="w-4 h-4" />
                <span>Trainer Portal</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setActiveView('RECEPTION')}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-left flex items-center gap-2.5 transition ${
                  activeView === 'RECEPTION'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Reception Desk</span>
              </button>
            )}

            {isOwner && (
              <button
                onClick={() => setActiveView('ADMIN')}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-left flex items-center gap-2.5 transition ${
                  activeView === 'ADMIN'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Owner & Management</span>
              </button>
            )}
          </nav>
        </div>

        {/* Bottom Sign Out */}
        <div className="pt-4 border-t border-zinc-800">
          <button
            onClick={onLogout}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-red-500/40 text-zinc-400 hover:text-red-400 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Staff Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
};
