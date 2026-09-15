import React from 'react';
import { 
  Dumbbell, 
  ShieldCheck, 
  User, 
  LogIn, 
  LogOut, 
  Sparkles, 
  ChevronDown, 
  QrCode,
  LayoutDashboard,
  Users,
  Settings
} from 'lucide-react';
import { UserRole, UserProfile, GymSettings } from '../../types';

interface NavbarProps {
  settings: GymSettings;
  appMode: 'MEMBER' | 'STAFF';
  setAppMode: (mode: 'MEMBER' | 'STAFF') => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  staffSubView: 'TRAINER' | 'RECEPTION' | 'ADMIN';
  setStaffSubView: (view: 'TRAINER' | 'RECEPTION' | 'ADMIN') => void;
  currentUser: UserProfile;
  onSwitchUser: (user: UserProfile) => void;
  members: UserProfile[];
  trainers: UserProfile[];
  onLoginWithGoogle: () => void;
  onLogout: () => void;
  memberViewMode: 'LANDING' | 'DASHBOARD';
  setMemberViewMode: (view: 'LANDING' | 'DASHBOARD') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  appMode,
  setAppMode,
  currentRole,
  setCurrentRole,
  staffSubView,
  setStaffSubView,
  currentUser,
  onSwitchUser,
  members,
  trainers,
  onLoginWithGoogle,
  onLogout,
  memberViewMode,
  setMemberViewMode
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0c0c0e]/95 backdrop-blur-md border-b border-zinc-800">
      {/* Ecosystem Switcher Bar */}
      <div className="bg-black/60 border-b border-zinc-900 px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Dual Apps Switcher */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold hidden sm:inline mr-2">
              ECOSYSTEM:
            </span>
            <button
              onClick={() => {
                setAppMode('MEMBER');
                setCurrentRole('member');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider transition ${
                appMode === 'MEMBER'
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              Infinity Member
            </button>
            <button
              onClick={() => {
                setAppMode('STAFF');
                if (currentRole === 'member') setCurrentRole('trainer');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider transition ${
                appMode === 'STAFF'
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              Infinity Staff
            </button>
          </div>

          {/* Quick Demo Persona Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-mono hidden md:inline">Quick Persona:</span>
            <select
              value={currentUser.id}
              onChange={(e) => {
                const id = e.target.value;
                const found = [...members, ...trainers].find(u => u.id === id);
                if (found) {
                  onSwitchUser(found);
                  if (found.role === 'member') {
                    setAppMode('MEMBER');
                    setMemberViewMode('DASHBOARD');
                  } else {
                    setAppMode('STAFF');
                  }
                } else if (id === 'admin-owner') {
                  setCurrentRole('owner');
                  setAppMode('STAFF');
                  setStaffSubView('ADMIN');
                }
              }}
              className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 focus:outline-none focus:border-emerald-500"
            >
              <optgroup label="Members">
                {members.slice(0, 4).map(m => (
                  <option key={m.id} value={m.id}>
                    Member: {m.fullName} ({m.memberId})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Staff / Coaches">
                {trainers.map(t => (
                  <option key={t.id} value={t.id}>
                    Coach: {t.fullName}
                  </option>
                ))}
                <option value="admin-owner">Owner / Club Admin</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Tagline */}
        <div 
          onClick={() => {
            if (appMode === 'MEMBER') setMemberViewMode('LANDING');
          }}
          className="flex items-center gap-3 cursor-pointer select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-500/20">
            ∞
          </div>
          <div>
            <span className="font-black text-base sm:text-lg tracking-tight uppercase text-white block leading-none">
              {settings.name}
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 block mt-1">
              {settings.tagline}
            </span>
          </div>
        </div>

        {/* Member App Controls */}
        {appMode === 'MEMBER' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMemberViewMode(memberViewMode === 'LANDING' ? 'DASHBOARD' : 'LANDING')}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-white transition flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-400" />
              <span>{memberViewMode === 'LANDING' ? 'Member Dashboard' : 'Public Website'}</span>
            </button>

            <button
              onClick={onLoginWithGoogle}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition"
              title="Firebase Google Sign-In"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              <span>Google Sign-In</span>
            </button>
          </div>
        )}

        {/* Staff App Navigation Sub-Views */}
        {appMode === 'STAFF' && (
          <div className="flex items-center gap-2">
            <div className="bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl flex items-center gap-1">
              <button
                onClick={() => {
                  setStaffSubView('TRAINER');
                  setCurrentRole('trainer');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  staffSubView === 'TRAINER'
                    ? 'bg-emerald-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Trainer Portal
              </button>

              <button
                onClick={() => {
                  setStaffSubView('RECEPTION');
                  setCurrentRole('admin');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  staffSubView === 'RECEPTION'
                    ? 'bg-emerald-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Reception Desk
              </button>

              <button
                onClick={() => {
                  setStaffSubView('ADMIN');
                  setCurrentRole('owner');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  staffSubView === 'ADMIN'
                    ? 'bg-emerald-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Admin / Owner
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
