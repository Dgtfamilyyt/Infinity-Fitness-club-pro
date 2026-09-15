import React, { useState, useEffect } from 'react';
import { UserRole, UserProfile, MembershipPlan } from './types';
import { dataService } from './services/dataService';
import { signInWithGoogle, logoutUser, auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Navbar } from './components/layout/Navbar';
import { PublicLanding } from './components/member/PublicLanding';
import { MemberDashboard } from './components/member/MemberDashboard';
import { TrainerPortal } from './components/staff/TrainerPortal';
import { ReceptionDesk } from './components/staff/ReceptionDesk';
import { AdminOwnerPortal } from './components/staff/AdminOwnerPortal';

export default function App() {
  // Data subscriptions
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
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

  // Navigation & Ecosystem Mode
  const [appMode, setAppMode] = useState<'MEMBER' | 'STAFF'>('MEMBER');
  const [memberViewMode, setMemberViewMode] = useState<'LANDING' | 'DASHBOARD'>('LANDING');
  const [staffSubView, setStaffSubView] = useState<'TRAINER' | 'RECEPTION' | 'ADMIN'>('TRAINER');

  // Active Current User / Persona
  const [currentUser, setCurrentUser] = useState<UserProfile>(members[0] || {} as any);
  const [currentRole, setCurrentRole] = useState<UserRole>('member');

  // Listen to Firebase Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && fbUser.email) {
        // Look up member or create
        const matched = members.find(m => m.email.toLowerCase() === fbUser.email?.toLowerCase());
        if (matched) {
          setCurrentUser(matched);
          setCurrentRole(matched.role);
          setMemberViewMode('DASHBOARD');
        } else {
          // Register as active member
          const newMember = dataService.addMember({
            fullName: fbUser.displayName || 'Google Member',
            email: fbUser.email,
            status: 'ACTIVE'
          });
          setCurrentUser(newMember);
          setCurrentRole('member');
          setMemberViewMode('DASHBOARD');
        }
      }
    });
    return () => unsub();
  }, [members]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error('Google Sign-In failed:', e);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setMemberViewMode('LANDING');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const handleJoinClick = (selectedPlan?: MembershipPlan) => {
    // Open member view or auto-enroll
    setAppMode('MEMBER');
    setMemberViewMode('DASHBOARD');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Universal Ecosystem Navbar */}
      <Navbar
        settings={settings}
        appMode={appMode}
        setAppMode={setAppMode}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        staffSubView={staffSubView}
        setStaffSubView={setStaffSubView}
        currentUser={currentUser}
        onSwitchUser={(u) => {
          setCurrentUser(u);
          setCurrentRole(u.role);
        }}
        members={members}
        trainers={trainers}
        onLoginWithGoogle={handleGoogleLogin}
        onLogout={handleLogout}
        memberViewMode={memberViewMode}
        setMemberViewMode={setMemberViewMode}
      />

      {/* Main Body View */}
      <main className="flex-1">
        {/* APP 1: INFINITY MEMBER */}
        {appMode === 'MEMBER' && (
          <>
            {memberViewMode === 'LANDING' ? (
              <PublicLanding
                settings={settings}
                plans={plans}
                trainers={trainers}
                onJoinClick={handleJoinClick}
                onLoginClick={() => setMemberViewMode('DASHBOARD')}
              />
            ) : (
              <MemberDashboard
                member={currentUser.role === 'member' ? currentUser : members[0]}
                workout={workout}
                zones={zones}
                totalInside={activeSessions.length}
                prs={prs}
                attendanceLogs={attendanceLogs}
              />
            )}
          </>
        )}

        {/* APP 2: INFINITY STAFF */}
        {appMode === 'STAFF' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {staffSubView === 'TRAINER' && (
              <TrainerPortal
                currentTrainer={trainers[0]}
                zones={zones}
                activeSessions={activeSessions}
                members={members}
                workout={workout}
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
              <AdminOwnerPortal
                settings={settings}
                zones={zones}
                plans={plans}
                members={members}
                trainers={trainers}
                activeSessions={activeSessions}
                payments={payments}
                auditLogs={auditLogs}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
