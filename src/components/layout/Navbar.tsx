import React from 'react';
import { 
  LogIn, 
  LogOut, 
  LayoutDashboard, 
  ShieldCheck, 
  Menu, 
  X,
  Dumbbell
} from 'lucide-react';
import { UserProfile, GymSettings } from '../../types';
import { InfinityLogo } from '../common/InfinityLogo';

interface NavbarProps {
  settings: GymSettings;
  currentUser: UserProfile | null;
  onNavigateHome: () => void;
  onNavigateMemberLogin: () => void;
  onNavigateStaffLogin: () => void;
  onNavigateDashboard: () => void;
  onLogout: () => void;
  currentView: 'HOME' | 'MEMBER_LOGIN' | 'STAFF_LOGIN' | 'MEMBER_DASHBOARD' | 'STAFF_PORTAL';
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  currentUser,
  onNavigateHome,
  onNavigateMemberLogin,
  onNavigateStaffLogin,
  onNavigateDashboard,
  onLogout,
  currentView
}) => {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const isMember = currentUser?.role === 'member';
  const isStaff = currentUser && currentUser.role !== 'member';

  return (
    <header className="sticky top-0 z-40 bg-[#0c0c0e]/95 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div 
          onClick={onNavigateHome}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <InfinityLogo size="md" className="group-hover:scale-105" />
          <div>
            <span className="font-black text-base sm:text-lg tracking-tight uppercase text-white block leading-none">
              {settings.name}
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 block mt-0.5">
              {settings.tagline}
            </span>
          </div>
        </div>

        {/* Public Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-zinc-400">
          <button 
            onClick={onNavigateHome} 
            className={`hover:text-white transition ${currentView === 'HOME' ? 'text-emerald-400' : ''}`}
          >
            Club Home
          </button>
          <a href="#plans" className="hover:text-white transition">Plans</a>
          <a href="#trainers" className="hover:text-white transition">Floor Coaches</a>
          <a href="#zones" className="hover:text-white transition">Zones</a>
          <a href="#location" className="hover:text-emerald-400 transition flex items-center gap-1">
            <span>Location</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 font-mono">Maps</span>
          </a>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {isMember && (
                <button
                  onClick={onNavigateDashboard}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-md shadow-emerald-500/10 min-h-[40px]"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
              )}

              {isStaff && (
                <button
                  onClick={onNavigateDashboard}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-1.5 border border-zinc-700 min-h-[40px]"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Staff Portal</span>
                </button>
              )}

              <button
                onClick={onLogout}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white transition min-h-[40px]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onNavigateStaffLogin}
                className="text-xs font-bold text-zinc-400 hover:text-zinc-200 px-3 py-2 transition hidden sm:inline-block"
              >
                Staff Portal
              </button>

              <button
                onClick={onNavigateMemberLogin}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 min-h-[40px]"
              >
                <LogIn className="w-4 h-4" />
                <span>Member Login</span>
              </button>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="md:hidden p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Navigation Menu"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileNavOpen && (
        <div className="md:hidden bg-[#111113] border-b border-zinc-800 px-4 py-4 space-y-3 animate-in fade-in">
          <button
            onClick={() => {
              onNavigateHome();
              setMobileNavOpen(false);
            }}
            className="w-full text-left py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white block"
          >
            Club Overview
          </button>
          <a
            href="#plans"
            onClick={() => setMobileNavOpen(false)}
            className="w-full text-left py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white block"
          >
            Membership Plans
          </a>
          <a
            href="#trainers"
            onClick={() => setMobileNavOpen(false)}
            className="w-full text-left py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white block"
          >
            Floor Coaches
          </a>
          <a
            href="#zones"
            onClick={() => setMobileNavOpen(false)}
            className="w-full text-left py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white block"
          >
            Smart Zones
          </a>
          <a
            href="#location"
            onClick={() => setMobileNavOpen(false)}
            className="w-full text-left py-2 text-xs font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 block flex items-center justify-between"
          >
            <span>Club Location & Google Maps</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 font-mono">Coimbatore</span>
          </a>

          <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2">
            {!currentUser ? (
              <>
                <button
                  onClick={() => {
                    onNavigateMemberLogin();
                    setMobileNavOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 text-black font-extrabold text-xs uppercase tracking-wider text-center block min-h-[44px]"
                >
                  Member Login
                </button>
                <button
                  onClick={() => {
                    onNavigateStaffLogin();
                    setMobileNavOpen(false);
                  }}
                  className="w-full py-2 text-xs text-zinc-400 hover:text-white font-semibold text-center block min-h-[40px]"
                >
                  Staff Portal Entrance
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  onLogout();
                  setMobileNavOpen(false);
                }}
                className="w-full py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-bold uppercase tracking-wider text-center block min-h-[44px]"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
