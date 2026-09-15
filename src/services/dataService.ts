import { 
  UserProfile, 
  GymZone, 
  MembershipPlan, 
  WorkoutAssignment, 
  ActiveGymSession, 
  AttendanceRecord, 
  PaymentRecord, 
  PersonalRecord, 
  GymSettings, 
  AuditLog 
} from '../types';
import {
  INITIAL_GYM_SETTINGS,
  INITIAL_ZONES,
  INITIAL_PLANS,
  INITIAL_TRAINERS,
  INITIAL_STAFF,
  INITIAL_MEMBERS,
  INITIAL_ACTIVE_SESSIONS,
  INITIAL_TODAY_WORKOUT_ARUN,
  INITIAL_PAYMENTS,
  INITIAL_PERSONAL_RECORDS,
  INITIAL_ATTENDANCE_LOGS
} from './seedData';
import { evaluateWorkoutAssignment } from './workoutEngine';
import { gymSettingsService } from './gymSettingsService';
import { zoneService } from './zoneService';
import { membershipService } from './membershipService';
import { memberService } from './memberService';
import { trainerService } from './trainerService';
import { paymentService } from './paymentService';
import { workoutService } from './workoutService';
import { progressService } from './progressService';
import { auditService } from './auditService';
import { attendanceService } from './attendanceService';

/**
 * DataService acts as the reactive client-side cache and coordinator.
 * Operates purely in-memory, backed continuously and authoritative by Firestore real-time snapshots.
 * NO operational database storage in localStorage.
 */
class DataService {
  private settings: GymSettings = INITIAL_GYM_SETTINGS;
  private zones: GymZone[] = INITIAL_ZONES;
  private plans: MembershipPlan[] = INITIAL_PLANS;
  private members: UserProfile[] = INITIAL_MEMBERS;
  private trainers: UserProfile[] = INITIAL_TRAINERS;
  private staff: UserProfile[] = INITIAL_STAFF;
  private activeSessions: ActiveGymSession[] = INITIAL_ACTIVE_SESSIONS;
  private arunWorkout: WorkoutAssignment = INITIAL_TODAY_WORKOUT_ARUN;
  private payments: PaymentRecord[] = INITIAL_PAYMENTS;
  private personalRecords: PersonalRecord[] = INITIAL_PERSONAL_RECORDS;
  private attendanceLogs: AttendanceRecord[] = INITIAL_ATTENDANCE_LOGS;
  private auditLogs: AuditLog[] = [
    {
      id: 'audit-1',
      actor: 'System Engine',
      action: 'BOOTSTRAP',
      targetEntity: 'Infinity System',
      targetId: 'INIT',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      details: 'Initialized smart gym floor zones and crowd balance parameters'
    }
  ];

  private listeners: Set<() => void> = new Set();
  private unsubs: (() => void)[] = [];
  private roleUnsubs: (() => void)[] = [];

  constructor() {
    this.initRealtimeFirestoreSync();
  }

  private initRealtimeFirestoreSync() {
    try {
      // 1. Gym Settings (Public)
      this.unsubs.push(
        gymSettingsService.subscribeSettings('infinity-neelambur', (settings) => {
          this.settings = settings;
          this.notify();
        })
      );

      // 2. Gym Zones & Occupancy (Public)
      this.unsubs.push(
        zoneService.subscribeZones((zones) => {
          this.zones = zones;
          this.notify();
        })
      );

      // 3. Membership Plans (Public)
      this.unsubs.push(
        membershipService.subscribePlans((plans) => {
          this.plans = plans;
          this.notify();
        })
      );

      // 4. Trainers Directory (Public)
      this.unsubs.push(
        trainerService.subscribeTrainers((trainers) => {
          this.trainers = trainers;
          this.notify();
        })
      );
    } catch (err) {
      console.warn('Real-time Firestore listeners initialization deferred:', err);
    }
  }

  /**
   * Dynamically attaches or detaches role-scoped listeners (e.g. Audit Logs, Payments, Members)
   * strictly when an authenticated user with sufficient authorization is active.
   */
  public syncForUser(user: UserProfile | null) {
    // 1. Clean up existing role-scoped subscriptions
    this.roleUnsubs.forEach(unsub => {
      try { unsub(); } catch {}
    });
    this.roleUnsubs = [];

    if (!user) {
      this.auditLogs = [];
      this.notify();
      return;
    }

    const isStaff = user.role === 'trainer' || user.role === 'admin' || user.role === 'owner';
    const isAdminOrOwner = user.role === 'admin' || user.role === 'owner';

    try {
      // Staff members get access to Member list
      if (isStaff) {
        this.roleUnsubs.push(
          memberService.subscribeMembers((members) => {
            this.members = members;
            this.notify();
          })
        );
      }

      // Only Admins and Owners get access to sensitive Payments and Audit Logs
      if (isAdminOrOwner) {
        this.roleUnsubs.push(
          paymentService.subscribePayments((payments) => {
            this.payments = payments;
            this.notify();
          })
        );

        this.roleUnsubs.push(
          auditService.subscribeAuditLogs((logs) => {
            this.auditLogs = logs;
            this.notify();
          })
        );
      }
    } catch (err) {
      console.warn('Failed to establish role-based subscriptions:', err);
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (e) {
        console.error('Listener callback error:', e);
      }
    });
  }

  // Getters
  getSettings(): GymSettings { return this.settings; }
  getZones(): GymZone[] { return this.zones; }
  getPlans(): MembershipPlan[] { return this.plans; }
  getMembers(): UserProfile[] { return this.members; }
  getTrainers(): UserProfile[] { return this.trainers; }
  getStaff(): UserProfile[] { return this.staff; }
  getAllProfiles(): UserProfile[] { return [...this.members, ...this.trainers, ...this.staff]; }

  findProfileByEmail(email: string): UserProfile | null {
    if (!email) return null;
    const lower = email.trim().toLowerCase();
    return this.getAllProfiles().find(p => p.email.toLowerCase() === lower) || null;
  }

  findProfileByUid(uid: string): UserProfile | null {
    if (!uid) return null;
    return this.getAllProfiles().find(p => p.id === uid || p.uid === uid) || null;
  }

  upsertProfile(profile: UserProfile): void {
    const list = profile.role === 'member' 
      ? this.members 
      : profile.role === 'trainer' 
      ? this.trainers 
      : this.staff;
    const idx = list.findIndex(p => p.id === profile.id || (profile.uid && p.uid === profile.uid) || p.email.toLowerCase() === profile.email.toLowerCase());
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...profile };
    } else {
      list.push(profile);
    }
    this.notify();
  }

  getActiveSessions(): ActiveGymSession[] { return this.activeSessions; }
  getWorkoutAssignment(): WorkoutAssignment { return this.arunWorkout; }
  getPayments(): PaymentRecord[] { return this.payments; }
  getPersonalRecords(): PersonalRecord[] { return this.personalRecords; }
  getAttendanceLogs(): AttendanceRecord[] { return this.attendanceLogs; }
  getAuditLogs(): AuditLog[] { return this.auditLogs; }

  syncActiveSessionsFromFirestore(sessions: ActiveGymSession[]) {
    this.activeSessions = sessions;
    this.notify();
  }

  syncZonesFromFirestore(zones: GymZone[]) {
    this.zones = zones;
    this.notify();
  }

  recordSuccessfulCheckIn(params: {
    session: ActiveGymSession;
    attendance: AttendanceRecord;
    assignedZoneId: string;
  }) {
    const { session, attendance, assignedZoneId } = params;
    this.activeSessions = [session, ...this.activeSessions.filter(s => s.memberId !== session.memberId && s.id !== session.id)];
    this.attendanceLogs = [attendance, ...this.attendanceLogs.filter(a => a.id !== attendance.id)];

    this.zones = this.zones.map(z => {
      if (z.id === assignedZoneId) {
        const newOcc = z.currentOccupancy + 1;
        return {
          ...z,
          currentOccupancy: newOcc,
          status: newOcc >= z.capacity ? 'FULL' : newOcc >= z.capacity - 1 ? 'BUSY' : 'AVAILABLE'
        };
      }
      return z;
    });

    this.members = this.members.map(m => m.id === session.memberId ? { ...m, attendanceStreak: (m.attendanceStreak || 0) + 1 } : m);
    this.notify();
  }

  recordSuccessfulCheckOut(sessionId: string, exitTimeStr: string, actor: string = 'Staff Desk') {
    const session = this.activeSessions.find(s => s.id === sessionId || s.memberId === sessionId);
    if (!session) return;

    this.zones = this.zones.map(z => {
      if (z.id === session.zoneId) {
        const newOcc = Math.max(0, z.currentOccupancy - 1);
        return {
          ...z,
          currentOccupancy: newOcc,
          status: newOcc >= z.capacity ? 'FULL' : newOcc >= z.capacity - 1 ? 'BUSY' : 'AVAILABLE'
        };
      }
      return z;
    });

    this.attendanceLogs = this.attendanceLogs.map(att => {
      if (att.memberId === session.memberId && !att.exit) {
        return {
          ...att,
          exit: exitTimeStr,
          durationMinutes: 60
        };
      }
      return att;
    });

    this.activeSessions = this.activeSessions.filter(s => s.id !== session.id && s.memberId !== session.memberId);
    this.addAudit(actor, 'CHECK_OUT', 'ActiveGymSession', session.id, `${session.memberName} checked out from ${session.zoneName}`);
    this.notify();
  }

  // Check-In Logic
  checkInMember(identifier: string, method: 'QR' | 'MEMBER_ID' | 'MANUAL', checkedInBy: string = 'Staff Desk'): {
    success: boolean;
    message: string;
    session?: ActiveGymSession;
    recommendation?: any;
  } {
    const cleanId = identifier.trim().toUpperCase();
    const member = this.members.find(m => 
      (m.memberId && m.memberId.toUpperCase() === cleanId) ||
      (m.qrToken && m.qrToken.toUpperCase() === cleanId) ||
      (m.email && m.email.toLowerCase() === identifier.trim().toLowerCase()) ||
      m.id === identifier
    );

    if (!member) {
      return { success: false, message: `Member not found for badge/token: "${identifier}"` };
    }

    if (member.status === 'EXPIRED') {
      return { 
        success: false, 
        message: `Check-in blocked: ${member.fullName}'s membership has EXPIRED. Please renew at reception.` 
      };
    }
    if (member.status === 'FROZEN') {
      return { 
        success: false, 
        message: `Check-in blocked: Membership for ${member.fullName} is currently FROZEN.` 
      };
    }

    const existing = this.activeSessions.find(s => s.memberId === member.id);
    if (existing) {
      return {
        success: false,
        message: `${member.fullName} is ALREADY checked in (entered at ${existing.arrival} in ${existing.zoneName})`
      };
    }

    const recommendation = evaluateWorkoutAssignment(member, this.zones);
    const assignedZone = this.zones.find(z => z.id === recommendation.recommendedZoneId) || this.zones[0];

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newSession: ActiveGymSession = {
      id: `session-${Date.now()}`,
      memberId: member.id,
      memberName: member.fullName,
      memberAvatar: member.avatarUrl,
      memberStatus: member.status || 'ACTIVE',
      arrival: nowStr,
      workoutName: recommendation.recommendedWorkout,
      zoneId: assignedZone.id,
      zoneName: assignedZone.name,
      trainerName: member.assignedTrainerName || 'Floor Trainer',
      method,
      checkedInBy
    };

    const newAttendance: AttendanceRecord = {
      id: `att-${Date.now()}`,
      memberId: member.id,
      memberName: member.fullName,
      arrival: nowStr,
      workoutName: recommendation.recommendedWorkout,
      zoneName: assignedZone.name,
      method,
      date: new Date().toISOString().split('T')[0]
    };

    this.recordSuccessfulCheckIn({
      session: newSession,
      attendance: newAttendance,
      assignedZoneId: assignedZone.id
    });

    this.addAudit(checkedInBy, 'CHECK_IN', 'ActiveGymSession', newSession.id, `${member.fullName} checked in via ${method}`);

    return {
      success: true,
      message: `Welcome, ${member.fullName}! Assigned to ${assignedZone.name}.`,
      session: newSession,
      recommendation
    };
  }

  checkOutMember(sessionId: string, checkedOutBy: string = 'Staff Desk'): {
    success: boolean;
    message: string;
    session?: ActiveGymSession;
  } {
    const session = this.activeSessions.find(s => s.id === sessionId || s.memberId === sessionId);
    if (!session) {
      return { success: false, message: 'Session not found or already checked out' };
    }

    const exitStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.recordSuccessfulCheckOut(session.id, exitStr, checkedOutBy);

    return {
      success: true,
      message: `${session.memberName} checked out successfully.`,
      session
    };
  }

  updateZoneCapacity(zoneId: string, newCapacity: number, actor: string = 'Director Karan Singhania'): void {
    const oldZone = this.zones.find(z => z.id === zoneId);
    if (!oldZone) return;

    this.zones = this.zones.map(z => {
      if (z.id === zoneId) {
        return {
          ...z,
          capacity: Number(newCapacity),
          status: z.currentOccupancy >= newCapacity ? 'FULL' : z.currentOccupancy >= newCapacity - 1 ? 'BUSY' : 'AVAILABLE'
        };
      }
      return z;
    });

    // Write directly to Firestore
    zoneService.updateZoneCapacity(zoneId, newCapacity, actor).catch(e => {
      console.warn('Firestore zone update error:', e);
    });

    this.addAudit(actor, 'UPDATE_ZONE_CAPACITY', 'GymZone', zoneId, `Changed capacity of ${oldZone.name} to ${newCapacity}`);
    this.notify();
  }

  addMember(memberData: Partial<UserProfile>, staffName: string = 'Reception'): UserProfile {
    const newMember: UserProfile = {
      id: `athlete_${Date.now()}`,
      uid: `athlete_${Date.now()}`,
      memberId: `IFC-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: memberData.fullName || 'New Member',
      email: memberData.email || `athlete${Date.now()}@infinityfitnessclub.in`,
      phone: memberData.phone || '+91 98000 00000',
      role: 'member',
      status: 'ACTIVE',
      isActive: true,
      planName: memberData.planName || 'Quarterly Transformation',
      membershipPlanId: 'plan-quarterly',
      membershipStart: new Date().toISOString().split('T')[0],
      membershipExpiry: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      assignedTrainerName: memberData.assignedTrainerName || 'Rahul Sharma',
      fitnessGoal: memberData.fitnessGoal || 'Hypertrophy & Strength',
      experience: memberData.experience || 'Intermediate',
      workoutFrequency: memberData.workoutFrequency || 4,
      preferredTime: memberData.preferredTime || '6:00 PM',
      restrictions: memberData.restrictions || 'None',
      attendanceStreak: 0,
      workoutStreak: 0,
      qrToken: `IFC1.${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`
    };

    this.members = [newMember, ...this.members];

    // Write to Firestore in background
    memberService.createMember({
      fullName: newMember.fullName,
      email: newMember.email,
      phone: newMember.phone || '',
      planName: newMember.planName || 'Quarterly Transformation',
      assignedTrainerName: newMember.assignedTrainerName || 'Rahul Sharma',
      fitnessGoal: newMember.fitnessGoal || 'Hypertrophy & Strength',
      restrictions: newMember.restrictions || 'None'
    }, staffName).catch(e => console.warn('Firestore member create error:', e));

    this.addAudit(staffName, 'ADD_MEMBER', 'UserProfile', newMember.id, `Created profile for ${newMember.fullName} (${newMember.memberId})`);
    this.notify();
    return newMember;
  }

  updateMember(memberId: string, updates: Partial<UserProfile>, staffName: string = 'Reception'): void {
    this.members = this.members.map(m => m.id === memberId ? { ...m, ...updates } : m);
    if (updates.status) {
      memberService.updateMemberStatus(memberId, updates.status, staffName).catch(e => console.warn(e));
    }
    this.notify();
  }

  recordPayment(paymentData: Omit<PaymentRecord, 'id' | 'date'> & { date?: string }): PaymentRecord {
    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      ...paymentData,
      date: paymentData.date || new Date().toISOString().split('T')[0]
    };

    this.payments = [newPayment, ...this.payments];

    // Write to Firestore
    paymentService.recordPayment({
      memberId: newPayment.memberId,
      memberName: newPayment.memberName,
      planName: newPayment.planName,
      amount: newPayment.amount,
      paymentMethod: newPayment.paymentMethod,
      reference: newPayment.reference,
      recordedBy: newPayment.recordedBy,
      notes: newPayment.notes
    }).catch(e => console.warn('Firestore payment record error:', e));

    this.addAudit(newPayment.recordedBy, 'RECORD_PAYMENT', 'PaymentRecord', newPayment.id, `Recorded ₹${newPayment.amount} via ${newPayment.paymentMethod} from ${newPayment.memberName}`);
    this.notify();
    return newPayment;
  }

  toggleExerciseCompleted(exerciseId: string): void {
    const updatedExercises = this.arunWorkout.exercises.map(ex => {
      if (ex.id === exerciseId) {
        return { ...ex, completed: !ex.completed };
      }
      return ex;
    });

    const completedCount = updatedExercises.filter(e => e.completed).length;
    const totalCount = updatedExercises.length;
    const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const isCompleted = completedCount === totalCount && totalCount > 0;

    this.arunWorkout = {
      ...this.arunWorkout,
      exercises: updatedExercises,
      completionPercentage,
      isCompleted
    };

    // Write to Firestore
    workoutService.toggleExerciseComplete(this.arunWorkout.id, exerciseId, this.arunWorkout).catch(e => console.warn(e));
    this.notify();
  }

  toggleExerciseComplete(exerciseId: string): void {
    this.toggleExerciseCompleted(exerciseId);
  }

  applyTrainerOverride(params: {
    memberId: string;
    originalWorkout: string;
    newWorkout: string;
    newZoneId: string;
    newZoneName: string;
    reason: string;
    trainerName: string;
  }): void {
    const { newWorkout, reason, trainerName, newZoneId, newZoneName } = params;
    this.arunWorkout = {
      ...this.arunWorkout,
      title: newWorkout,
      zoneId: newZoneId,
      zoneName: newZoneName,
      isOverride: true,
      overrideReason: `${newWorkout} - ${reason} (Approved by ${trainerName})`
    };

    workoutService.recordWorkoutOverride({
      assignmentId: this.arunWorkout.id,
      memberId: params.memberId,
      memberName: this.arunWorkout.memberName,
      trainerName,
      originalWorkout: params.originalWorkout,
      newWorkout,
      reason
    }).catch(e => console.warn(e));

    this.addAudit(trainerName, 'OVERRIDE_WORKOUT', 'WorkoutAssignment', this.arunWorkout.id, `Overrode workout to "${newWorkout}" in ${newZoneName}. Reason: ${reason}`);
    this.notify();
  }

  updateZone(zoneId: string, updates: Partial<GymZone>, actor: string = 'Director Karan Singhania'): void {
    if (updates.capacity !== undefined) {
      this.updateZoneCapacity(zoneId, updates.capacity, actor);
    }
  }

  overrideWorkout(newWorkoutName: string, reason: string, trainerName: string): void {
    this.arunWorkout = {
      ...this.arunWorkout,
      title: newWorkoutName,
      isOverride: true,
      overrideReason: `${newWorkoutName} - ${reason} (Approved by ${trainerName})`
    };

    workoutService.recordWorkoutOverride({
      assignmentId: this.arunWorkout.id,
      memberId: this.arunWorkout.memberId,
      memberName: this.arunWorkout.memberName,
      trainerName,
      originalWorkout: 'Chest + Triceps Hypertrophy',
      newWorkout: newWorkoutName,
      reason
    }).catch(e => console.warn(e));

    this.addAudit(trainerName, 'OVERRIDE_WORKOUT', 'WorkoutAssignment', this.arunWorkout.id, `Overrode workout to "${newWorkoutName}". Reason: ${reason}`);
    this.notify();
  }

  recordPersonalRecord(prData: Omit<PersonalRecord, 'id'>): PersonalRecord {
    const newPR: PersonalRecord = {
      id: `pr-${Date.now()}`,
      ...prData
    };
    this.personalRecords = [newPR, ...this.personalRecords];

    progressService.recordPR(prData, prData.verifiedBy || 'Trainer').catch(e => console.warn(e));
    this.addAudit(prData.verifiedBy || 'Trainer', 'RECORD_PR', 'PersonalRecord', newPR.id, `Logged new PR: ${prData.exercise} ${prData.weightKg}kg x ${prData.reps} reps`);
    this.notify();
    return newPR;
  }

  updateSettings(newSettings: Partial<GymSettings>, actor: string = 'Director Karan Singhania'): void {
    this.settings = { ...this.settings, ...newSettings };
    gymSettingsService.updateSettings(newSettings, actor).catch(e => console.warn(e));
    this.addAudit(actor, 'UPDATE_CMS', 'GymSettings', this.settings.id, 'Updated gym CMS website parameters and hours');
    this.notify();
  }

  addAudit(actor: string, action: string, targetEntity: string, targetId: string, details?: string): void {
    const newLog: AuditLog = {
      id: `audit-${Date.now()}`,
      actor,
      action,
      targetEntity,
      targetId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      details
    };
    this.auditLogs = [newLog, ...this.auditLogs.slice(0, 99)];
    auditService.logAuditEvent(actor, action, targetEntity, targetId, details).catch(() => {});
    this.notify();
  }

  cleanup() {
    this.unsubs.forEach(unsub => unsub());
    this.unsubs = [];
  }
}

export const dataService = new DataService();
