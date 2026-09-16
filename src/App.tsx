import React, { useState, useEffect, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { UserRole, UserProfile, MembershipPlan } from './types';
import { dataService } from './services/dataService';
import { attendanceService } from './services/attendanceService';
import { generateCryptographicQrToken } from './services/qrService';
import { 
  getUserProfile,
  fetchUserProfile, 
  fetchUserProfileByEmail,
  saveUserProfile, 
  logoutUser,
  subscribeToAuth,
  AppAuthUser
} from './lib/firebase';
import { Navbar } from './components/layout/Navbar';
import { PublicLanding } from './components/member/PublicLanding';
import { MemberDashboard } from './components/member/MemberDashboard';
import { MemberLogin } from './components/auth/MemberLogin';
import { StaffLogin } from './components/auth/StaffLogin';
import { StaffLayout } from './components/staff/StaffLayout';
import { TrainerPortal } from './components/staff/TrainerPortal';
import { ReceptionDesk } from './components/staff/ReceptionDesk';
import { AdminOwnerPortal } from './components/staff/AdminOwnerPortal';
import { 
  ShieldAlert, 
  Loader2, 
  LogOut, 
  ArrowLeft, 
  CheckCircle2, 
  Lock 
} from 'lucide-react';

type AppRoute = 'HOME' | 'MEMBER_LOGIN' | 'STAFF_LOGIN' | 'MEMBER_DASHBOARD' | 'STAFF_PORTAL';

export default function App() {
  // Real-time data sync from DataService
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    // Initialize Firestore Attendance system & real-time listeners
    attendanceService.initializeAttendanceSystem();

    return dataService.subscribe(() => {
      setDataVersion(v => v + 1);
    });
  }, []);

  const settings = dataService.getSettings();
  const zones = dataService.getZones();
  const plans = dataService.getPlans();
  const members = dataService.getMembers();
  const trainers = dataService.getTrainers();
  const activeSessions = dataService.getActiveSessions();
  const workout = dataService.getWorkoutAssignment();
  const payments = dataService.getPayments();
  const prs = dataService.getPersonalRecords();
  const attendanceLogs = dataService.getAttendanceLogs();
  const auditLogs = dataService.getAuditLogs();

  // Navigation State & Route Management
  const [route, setRoute] = useState<AppRoute>('HOME');
  const [staffSubView, setStaffSubView] = useState<'TRAINER' | 'RECEPTION' | 'ADMIN'>('TRAINER');

  // Auth State
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [accountStatus, setAccountStatus] = useState<'OK' | 'UNCONFIGURED' | 'DENIED' | 'INACTIVE'>('OK');
  const [denialMessage, setDenialMessage] = useState<string>('');

  // Initial Route Check from URL pathname or hash
  useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    if (path.includes('/staff/login') || hash.includes('staff/login') || hash.includes('staff-login')) {
      setRoute('STAFF_LOGIN');
    } else if (path.includes('/login') || hash.includes('login')) {
      setRoute('MEMBER_LOGIN');
    } else if (path.includes('/staff') || hash.includes('staff')) {
      setRoute('STAFF_PORTAL');
    } else if (path.includes('/dashboard') || hash.includes('dashboard')) {
      setRoute('MEMBER_DASHBOARD');
    }
  }, []);

  // Sync route with URL history
  const navigateTo = useCallback((targetRoute: AppRoute) => {
    setRoute(targetRoute);
    setAccountStatus('OK');
    setDenialMessage('');

    let path = '/';
    if (targetRoute === 'MEMBER_LOGIN') path = '/login';
    else if (targetRoute === 'STAFF_LOGIN') path = '/staff/login';
    else if (targetRoute === 'MEMBER_DASHBOARD') path = '/dashboard';
    else if (targetRoute === 'STAFF_PORTAL') path = '/staff';

    try {
      window.history.pushState(null, '', path);
    } catch {
      // In restricted iframe environments pushState might be restricted
    }
  }, []);

  // Listen to Auth state (Firebase Auth)
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (authUser: AppAuthUser | null) => {
      setAuthLoading(true);

      if (!authUser) {
        // No active session
        dataService.syncForUser(null);
        setCurrentUser(null);
        setAccountStatus('OK');
        setAuthLoading(false);

        // If currently in a protected route, redirect to the corresponding login
        setRoute(prev => {
          if (prev === 'MEMBER_DASHBOARD') return 'MEMBER_LOGIN';
          if (prev === 'STAFF_PORTAL') return 'STAFF_LOGIN';
          return prev;
        });
        return;
      }

      // User is authenticated: resolve profile strictly from Firestore profiles/{uid}
      const userEmail = (authUser.email || '').toLowerCase().trim();

      try {
        // 1. Check Firestore by UID: profiles/{uid}
        let profile = await getUserProfile(authUser.uid);

        // 2. If not found by UID yet, check if reception pre-registered this email
        if (!profile && userEmail) {
          const preRegistered = await fetchUserProfileByEmail(userEmail) || dataService.findProfileByEmail(userEmail);
          if (preRegistered) {
            // Bind the verified Firebase Auth UID to the pre-registered profile
            profile = {
              ...preRegistered,
              uid: authUser.uid,
              id: authUser.uid
            };
            dataService.upsertProfile(profile);
            await saveUserProfile(profile).catch((e) => console.warn('Profile sync notice:', e));
          }
        }

        // 3. If profile does not exist, user is unconfigured (Google login does NOT auto-create membership or staff roles)
        if (!profile) {
          dataService.syncForUser(null);
          setCurrentUser(null);
          setAccountStatus('UNCONFIGURED');
          setAuthLoading(false);
          return;
        }

        // 4. Check if profile is inactive or suspended
        if (profile.isActive === false) {
          dataService.syncForUser(null);
          setCurrentUser(profile);
          setAccountStatus('INACTIVE');
          setAuthLoading(false);
          return;
        }

        // 5. Valid active profile: sync role-scoped records and establish authorized session
        dataService.syncForUser(profile);
        setCurrentUser(profile);
        setAccountStatus('OK');

        // 6. Authoritative role-based routing (Role determines the view, never the client)
        if (profile.role === 'member') {
          setRoute(prev => {
            if (prev === 'STAFF_PORTAL' || prev === 'STAFF_LOGIN') {
              setAccountStatus('DENIED');
              setDenialMessage('Access Denied: Athletes and gym members do not have staff operations clearance.');
              return 'STAFF_LOGIN';
            }
            return prev === 'HOME' ? 'HOME' : 'MEMBER_DASHBOARD';
          });
        } else if (profile.role === 'trainer') {
          setStaffSubView('TRAINER');
          setRoute(prev => (prev === 'HOME' ? 'HOME' : 'STAFF_PORTAL'));
        } else if (profile.role === 'admin') {
          setStaffSubView('RECEPTION');
          setRoute(prev => (prev === 'HOME' ? 'HOME' : 'STAFF_PORTAL'));
        } else if (profile.role === 'owner') {
          setStaffSubView('ADMIN');
          setRoute(prev => (prev === 'HOME' ? 'HOME' : 'STAFF_PORTAL'));
        }
      } catch (err) {
        console.error('Error resolving user profile:', err);
        setAccountStatus('UNCONFIGURED');
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      setAuthLoading(true);
      dataService.syncForUser(null);
      await logoutUser();
      setCurrentUser(null);
      setAccountStatus('OK');
      setDenialMessage('');
      
      // Route after logout
      if (route === 'STAFF_PORTAL' || route === 'STAFF_LOGIN') {
        navigateTo('STAFF_LOGIN');
      } else {
        navigateTo('MEMBER_LOGIN');
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  // 1. Initial Session Loading Screen (Zero flicker)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-2xl animate-pulse">
            ∞
          </div>
          <div className="absolute -inset-2 rounded-3xl bg-emerald-500/5 blur-xl -z-10" />
        </div>
        <h1 className="mt-6 text-xl font-black uppercase tracking-wider text-white">
          AUTHENTICATING
        </h1>
        <p className="mt-1 text-xs font-mono text-emerald-400 tracking-widest uppercase">
          Verifying authentication & security permissions...
        </p>
        <div className="mt-6 flex items-center gap-2 text-zinc-500 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          <span>Connecting to Firebase Auth & Cloud Firestore</span>
        </div>
        <Analytics />
      </div>
    );
  }

  // 2. Unconfigured Account Screen
  if (accountStatus === 'UNCONFIGURED') {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md p-8 rounded-3xl bg-[#121214] border border-zinc-800 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="mt-5 text-xl font-black uppercase text-white tracking-tight">
            ACCOUNT NOT CONFIGURED
          </h2>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            Please contact Infinity Fitness Club reception.
          </p>
          <p className="mt-2 text-[11px] text-zinc-500">
            Your account does not have a linked membership or staff profile registered in the club database.
          </p>
          <div className="mt-6 pt-6 border-t border-zinc-800 flex gap-3">
            <button
              onClick={() => navigateTo('HOME')}
              className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider transition"
            >
              Public Home
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
        <Analytics />
      </div>
    );
  }

  // 3. Deactivated / Inactive Account Screen
  if (accountStatus === 'INACTIVE') {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md p-8 rounded-3xl bg-[#121214] border border-zinc-800 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="mt-5 text-xl font-black uppercase text-white tracking-tight">
            ACCOUNT INACTIVE
          </h2>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            Your account is inactive or suspended. Please contact Infinity Fitness Club administration.
          </p>
          <div className="mt-6 pt-6 border-t border-zinc-800 flex justify-center">
            <button
              onClick={handleLogout}
              className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider transition"
            >
              Sign Out
            </button>
          </div>
        </div>
        <Analytics />
      </div>
    );
  }

  // 4. Access Denied Screen (e.g. Member attempting to open staff route)
  if (accountStatus === 'DENIED') {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md p-8 rounded-3xl bg-[#121214] border border-red-500/30 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="mt-5 text-xl font-black uppercase text-red-400 tracking-tight">
            ACCESS DENIED
          </h2>
          <p className="mt-2 text-xs text-zinc-300 leading-relaxed">
            {denialMessage || 'You do not have the required role permissions to view this secure portal.'}
          </p>
          <div className="mt-6 pt-6 border-t border-zinc-800 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigateTo('MEMBER_DASHBOARD')}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold uppercase tracking-wider transition"
            >
              Go to Member Portal
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-bold uppercase tracking-wider transition"
            >
              Sign Out
            </button>
          </div>
        </div>
        <Analytics />
      </div>
    );
  }

  // 5. Dedicated Member Login Page
  if (route === 'MEMBER_LOGIN') {
    return (
      <>
        <MemberLogin
          settings={settings}
          onSuccess={() => {
            navigateTo('MEMBER_DASHBOARD');
          }}
          onNavigateHome={() => navigateTo('HOME')}
          onNavigateStaffLogin={() => navigateTo('STAFF_LOGIN')}
        />
        <Analytics />
      </>
    );
  }

  // 6. Dedicated Staff Login Page
  if (route === 'STAFF_LOGIN') {
    return (
      <>
        <StaffLogin
          settings={settings}
          onSuccess={() => {
            navigateTo('STAFF_PORTAL');
          }}
          onNavigateMemberLogin={() => navigateTo('MEMBER_LOGIN')}
          onNavigateHome={() => navigateTo('HOME')}
        />
        <Analytics />
      </>
    );
  }

  // 7. Protected Staff Portal (Strict Role Enforced)
  if (route === 'STAFF_PORTAL') {
    // Unauthenticated staff redirect
    if (!currentUser) {
      return (
        <>
          <StaffLogin
            settings={settings}
            onSuccess={() => navigateTo('STAFF_PORTAL')}
            onNavigateMemberLogin={() => navigateTo('MEMBER_LOGIN')}
            onNavigateHome={() => navigateTo('HOME')}
          />
          <Analytics />
        </>
      );
    }

    // Role check: members are not permitted
    if (currentUser.role === 'member') {
      return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 text-center">
          <div className="max-w-md p-8 rounded-3xl bg-[#121214] border border-red-500/30">
            <ShieldAlert className="w-10 h-10 text-red-400 mx-auto" />
            <h2 className="text-xl font-bold text-white uppercase mt-4">Staff Clearance Required</h2>
            <p className="text-xs text-zinc-400 mt-2">
              Athletes and members do not have staff credentials. Please access your workout through the Member Portal.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => navigateTo('MEMBER_DASHBOARD')}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs uppercase"
              >
                Go to Member Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-bold uppercase"
              >
                Sign Out
              </button>
            </div>
          </div>
          <Analytics />
        </div>
      );
    }

    // Role-based staff view with desktop sidebar and mobile drawer
    return (
      <StaffLayout
        settings={settings}
        staffUser={currentUser}
        activeView={staffSubView}
        setActiveView={(v) => {
          // Gating: only owners can view ADMIN
          if (v === 'ADMIN' && currentUser.role !== 'owner') {
            alert('Restricted: Club Owner permissions required.');
            return;
          }
          setStaffSubView(v);
        }}
        onLogout={handleLogout}
      >
        {staffSubView === 'TRAINER' && (
          <TrainerPortal
            currentTrainer={currentUser.role === 'trainer' ? currentUser : trainers[0]}
            zones={zones}
            activeSessions={activeSessions}
            members={members}
            workout={workout}
            onUpdateTrainer={(updated) => {
              if (currentUser && (currentUser.id === updated.id || currentUser.email.toLowerCase() === updated.email.toLowerCase())) {
                setCurrentUser(updated);
              }
            }}
          />
        )}

        {staffSubView === 'RECEPTION' && (
          <ReceptionDesk
            zones={zones}
            activeSessions={activeSessions}
            members={members}
            payments={payments}
          />
        )}

        {staffSubView === 'ADMIN' && (
          currentUser.role === 'owner' ? (
            <AdminOwnerPortal
              settings={settings}
              zones={zones}
              plans={plans}
              members={members}
              trainers={trainers}
              staff={dataService.getStaff()}
              currentUser={currentUser}
              activeSessions={activeSessions}
              payments={payments}
              auditLogs={auditLogs}
            />
          ) : (
            <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center">
              <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className="text-base font-bold text-white uppercase mt-2">Owner Clearance Required</h3>
              <p className="text-xs text-zinc-400 mt-1">This section is restricted to the Gym Owner and Director.</p>
            </div>
          )
        )}
        <Analytics />
      </StaffLayout>
    );
  }

  // 8. Protected Member Dashboard
  if (route === 'MEMBER_DASHBOARD') {
    if (!currentUser) {
      return (
        <>
          <MemberLogin
            settings={settings}
            onSuccess={() => navigateTo('MEMBER_DASHBOARD')}
            onNavigateHome={() => navigateTo('HOME')}
            onNavigateStaffLogin={() => navigateTo('STAFF_LOGIN')}
          />
          <Analytics />
        </>
      );
    }

    return (
      <>
        <MemberDashboard
          member={currentUser}
          workout={workout}
          zones={zones}
          totalInside={activeSessions.length}
          prs={prs}
          attendanceLogs={attendanceLogs}
          onLogout={handleLogout}
        />
        <Analytics />
      </>
    );
  }

  // 9. Public Landing Page (Home)
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      <Navbar
        settings={settings}
        currentUser={currentUser}
        onNavigateHome={() => navigateTo('HOME')}
        onNavigateMemberLogin={() => navigateTo('MEMBER_LOGIN')}
        onNavigateStaffLogin={() => navigateTo('STAFF_LOGIN')}
        onNavigateDashboard={() => {
          if (currentUser?.role === 'member') navigateTo('MEMBER_DASHBOARD');
          else if (currentUser) navigateTo('STAFF_PORTAL');
          else navigateTo('MEMBER_LOGIN');
        }}
        onLogout={handleLogout}
        currentView={route}
      />

      <main className="flex-1">
        <PublicLanding
          settings={settings}
          plans={plans}
          trainers={trainers}
          onJoinClick={() => navigateTo('MEMBER_LOGIN')}
          onLoginClick={() => navigateTo('MEMBER_LOGIN')}
          onStaffLoginClick={() => navigateTo('STAFF_LOGIN')}
        />
      </main>
      <Analytics />
    </div>
  );
}
