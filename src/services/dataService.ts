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
  INITIAL_MEMBERS,
  INITIAL_ACTIVE_SESSIONS,
  INITIAL_TODAY_WORKOUT_ARUN,
  INITIAL_PAYMENTS,
  INITIAL_PERSONAL_RECORDS,
  INITIAL_ATTENDANCE_LOGS
} from './seedData';
import { evaluateWorkoutAssignment } from './workoutEngine';

const STORAGE_KEYS = {
  SETTINGS: 'ifc_gym_settings',
  ZONES: 'ifc_gym_zones',
  PLANS: 'ifc_plans',
  MEMBERS: 'ifc_members',
  TRAINERS: 'ifc_trainers',
  SESSIONS: 'ifc_active_sessions',
  WORKOUT: 'ifc_workout_arun',
  PAYMENTS: 'ifc_payments',
  PRS: 'ifc_prs',
  ATTENDANCE: 'ifc_attendance',
  AUDIT: 'ifc_audit_logs'
};

function loadStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

class DataService {
  private settings: GymSettings = loadStorage(STORAGE_KEYS.SETTINGS, INITIAL_GYM_SETTINGS);
  private zones: GymZone[] = loadStorage(STORAGE_KEYS.ZONES, INITIAL_ZONES);
  private plans: MembershipPlan[] = loadStorage(STORAGE_KEYS.PLANS, INITIAL_PLANS);
  private members: UserProfile[] = loadStorage(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
  private trainers: UserProfile[] = loadStorage(STORAGE_KEYS.TRAINERS, INITIAL_TRAINERS);
  private activeSessions: ActiveGymSession[] = loadStorage(STORAGE_KEYS.SESSIONS, INITIAL_ACTIVE_SESSIONS);
  private arunWorkout: WorkoutAssignment = loadStorage(STORAGE_KEYS.WORKOUT, INITIAL_TODAY_WORKOUT_ARUN);
  private payments: PaymentRecord[] = loadStorage(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
  private personalRecords: PersonalRecord[] = loadStorage(STORAGE_KEYS.PRS, INITIAL_PERSONAL_RECORDS);
  private attendanceLogs: AttendanceRecord[] = loadStorage(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE_LOGS);
  private auditLogs: AuditLog[] = loadStorage(STORAGE_KEYS.AUDIT, [
    {
      id: 'audit-1',
      actor: 'System Engine',
      action: 'BOOTSTRAP',
      targetEntity: 'Infinity System',
      targetId: 'INIT',
      timestamp: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      details: 'Initialized smart gym floor zones and crowd balance parameters'
    }
  ]);

  private listeners: Set<() => void> = new Set();

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  // Getters
  getSettings(): GymSettings { return this.settings; }
  getZones(): GymZone[] { return this.zones; }
  getPlans(): MembershipPlan[] { return this.plans; }
  getMembers(): UserProfile[] { return this.members; }
  getTrainers(): UserProfile[] { return this.trainers; }
  getActiveSessions(): ActiveGymSession[] { return this.activeSessions; }
  getWorkoutAssignment(): WorkoutAssignment { return this.arunWorkout; }
  getPayments(): PaymentRecord[] { return this.payments; }
  getPersonalRecords(): PersonalRecord[] { return this.personalRecords; }
  getAttendanceLogs(): AttendanceRecord[] { return this.attendanceLogs; }
  getAuditLogs(): AuditLog[] { return this.auditLogs; }

  // Check-In Logic
  checkInMember(identifier: string, method: 'QR' | 'MEMBER_ID' | 'MANUAL', checkedInBy: string = 'Staff Desk'): {
    success: boolean;
    message: string;
    session?: ActiveGymSession;
    recommendation?: any;
  } {
    const cleanId = identifier.trim().toUpperCase();
    // Resolve member by memberId, qrToken, email, or id
    const member = this.members.find(m => 
      (m.memberId && m.memberId.toUpperCase() === cleanId) ||
      (m.qrToken && m.qrToken.toUpperCase() === cleanId) ||
      (m.email && m.email.toLowerCase() === identifier.trim().toLowerCase()) ||
      m.id === identifier
    );

    if (!member) {
      return { success: false, message: `Member not found for badge/token: "${identifier}"` };
    }

    // Check membership status
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

    // Prevent duplicate active session
    const existing = this.activeSessions.find(s => s.memberId === member.id);
    if (existing) {
      return {
        success: false,
        message: `${member.fullName} is ALREADY checked in (entered at ${existing.arrival} in ${existing.zoneName})`
      };
    }

    // Run smart workout engine to assign optimal zone
    const recommendation = evaluateWorkoutAssignment(member, this.zones);
    const assignedZone = this.zones.find(z => z.id === recommendation.recommendedZoneId) || this.zones[0];

    // Create session
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

    // Increment zone occupancy
    this.zones = this.zones.map(z => {
      if (z.id === assignedZone.id) {
        const newOcc = z.currentOccupancy + 1;
        return {
          ...z,
          currentOccupancy: newOcc,
          status: newOcc >= z.capacity ? 'FULL' : newOcc >= z.capacity - 1 ? 'BUSY' : 'AVAILABLE'
        };
      }
      return z;
    });

    this.activeSessions = [newSession, ...this.activeSessions];

    // Record attendance log
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
    this.attendanceLogs = [newAttendance, ...this.attendanceLogs];

    // Audit log
    this.addAudit(checkedInBy, 'CHECK_IN', 'ActiveGymSession', newSession.id, `${member.fullName} checked in via ${method} -> ${assignedZone.name}`);

    // Update streak if applicable
    this.members = this.members.map(m => m.id === member.id ? { ...m, attendanceStreak: (m.attendanceStreak || 0) + 1 } : m);

    this.saveAll();
    this.notify();

    return {
      success: true,
      message: `Welcome back, ${member.fullName}! Assigned to ${assignedZone.name} (${recommendation.recommendedWorkout}).`,
      session: newSession,
      recommendation
    };
  }

  // Check-Out Logic
  checkOutMember(sessionId: string, actor: string = 'Staff Desk'): boolean {
    const session = this.activeSessions.find(s => s.id === sessionId);
    if (!session) return false;

    // Decrement zone occupancy
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

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Update attendance record with exit
    this.attendanceLogs = this.attendanceLogs.map(att => {
      if (att.memberId === session.memberId && !att.exit) {
        return {
          ...att,
          exit: nowStr,
          durationMinutes: 65 // calculated/estimated session
        };
      }
      return att;
    });

    this.activeSessions = this.activeSessions.filter(s => s.id !== sessionId);

    this.addAudit(actor, 'CHECK_OUT', 'ActiveGymSession', sessionId, `${session.memberName} checked out from ${session.zoneName}`);

    this.saveAll();
    this.notify();
    return true;
  }

  // Toggle Exercise Complete for Member
  toggleExerciseComplete(exerciseId: string) {
    const updatedExercises = this.arunWorkout.exercises.map(ex => {
      if (ex.id === exerciseId) {
        return { ...ex, completed: !ex.completed };
      }
      return ex;
    });

    const completedCount = updatedExercises.filter(ex => ex.completed).length;
    const completionPercentage = Math.round((completedCount / updatedExercises.length) * 100);

    this.arunWorkout = {
      ...this.arunWorkout,
      exercises: updatedExercises,
      completionPercentage,
      isCompleted: completionPercentage === 100
    };

    saveStorage(STORAGE_KEYS.WORKOUT, this.arunWorkout);
    this.notify();
  }

  // Trainer Override
  applyTrainerOverride(params: {
    memberId: string;
    originalWorkout: string;
    newWorkout: string;
    newZoneId: string;
    newZoneName: string;
    reason: string;
    trainerName: string;
  }) {
    // If active session exists, update it
    this.activeSessions = this.activeSessions.map(s => {
      if (s.memberId === params.memberId) {
        return {
          ...s,
          workoutName: params.newWorkout,
          zoneId: params.newZoneId,
          zoneName: params.newZoneName
        };
      }
      return s;
    });

    // If Arun's workout, update it
    if (this.arunWorkout.memberId === params.memberId) {
      this.arunWorkout = {
        ...this.arunWorkout,
        title: params.newWorkout,
        zoneId: params.newZoneId,
        zoneName: params.newZoneName,
        isOverride: true,
        overrideReason: params.reason
      };
      saveStorage(STORAGE_KEYS.WORKOUT, this.arunWorkout);
    }

    this.addAudit(
      params.trainerName,
      'TRAINER_OVERRIDE',
      'WorkoutAssignment',
      params.memberId,
      `Override: "${params.originalWorkout}" -> "${params.newWorkout}" in ${params.newZoneName}. Reason: ${params.reason}`
    );

    this.saveAll();
    this.notify();
  }

  // Add Member
  addMember(memberData: Partial<UserProfile>): UserProfile {
    const nextNum = 1000 + this.members.length + 1;
    const newMember: UserProfile = {
      id: `member-${Date.now()}`,
      email: memberData.email || `member${nextNum}@infinityfitnessclub.in`,
      fullName: memberData.fullName || 'New Member',
      phone: memberData.phone || '+91 98000 00000',
      role: 'member',
      memberId: `IFC-${nextNum}`,
      qrToken: `IFC_TOKEN_SEC_${nextNum}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      status: memberData.status || 'ACTIVE',
      membershipPlanId: memberData.membershipPlanId || 'plan-quarterly',
      planName: memberData.planName || 'Quarterly Transformation',
      membershipStart: new Date().toISOString().split('T')[0],
      membershipExpiry: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      assignedTrainerId: memberData.assignedTrainerId || 'trainer-rahul',
      assignedTrainerName: memberData.assignedTrainerName || 'Rahul Sharma',
      fitnessGoal: memberData.fitnessGoal || 'General Fitness & Stamina',
      experience: memberData.experience || 'Intermediate',
      workoutFrequency: memberData.workoutFrequency || 4,
      preferredTime: memberData.preferredTime || '6:00 PM',
      restrictions: memberData.restrictions || 'None',
      trainerNotes: memberData.trainerNotes || 'Newly registered member.',
      attendanceStreak: 1,
      workoutStreak: 1,
      createdAt: new Date().toISOString()
    };

    this.members = [newMember, ...this.members];
    this.addAudit('Admin', 'ADD_MEMBER', 'UserProfile', newMember.id, `Enrolled ${newMember.fullName} (${newMember.memberId}) under ${newMember.planName}`);

    this.saveAll();
    this.notify();
    return newMember;
  }

  // Record Payment
  recordPayment(payment: {
    memberId: string;
    memberName: string;
    planName: string;
    amount: number;
    paymentMethod: PaymentRecord['paymentMethod'];
    reference: string;
    recordedBy: string;
    notes?: string;
  }): PaymentRecord {
    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      memberId: payment.memberId,
      memberName: payment.memberName,
      planName: payment.planName,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      reference: payment.reference || `REF-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      recordedBy: payment.recordedBy,
      notes: payment.notes
    };

    this.payments = [newPayment, ...this.payments];
    // Update member status to ACTIVE if was expired/trial
    this.members = this.members.map(m => {
      if (m.id === payment.memberId) {
        return {
          ...m,
          status: 'ACTIVE',
          planName: payment.planName,
          membershipExpiry: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]
        };
      }
      return m;
    });

    this.addAudit(payment.recordedBy, 'PAYMENT_RECORDED', 'PaymentRecord', newPayment.id, `Recorded ${payment.amount} (${payment.paymentMethod}) for ${payment.memberName}`);
    this.saveAll();
    this.notify();
    return newPayment;
  }

  // Update Settings
  updateSettings(patch: Partial<GymSettings>) {
    this.settings = { ...this.settings, ...patch };
    saveStorage(STORAGE_KEYS.SETTINGS, this.settings);
    this.addAudit('Owner', 'UPDATE_CMS', 'GymSettings', this.settings.id, `Updated website identity & settings`);
    this.notify();
  }

  // Update Zone
  updateZone(zoneId: string, patch: Partial<GymZone>) {
    this.zones = this.zones.map(z => z.id === zoneId ? { ...z, ...patch } : z);
    saveStorage(STORAGE_KEYS.ZONES, this.zones);
    this.addAudit('Admin', 'UPDATE_ZONE', 'GymZone', zoneId, `Updated zone parameters`);
    this.notify();
  }

  // Reset to initial demo data
  resetAllData() {
    this.settings = INITIAL_GYM_SETTINGS;
    this.zones = INITIAL_ZONES;
    this.plans = INITIAL_PLANS;
    this.members = INITIAL_MEMBERS;
    this.trainers = INITIAL_TRAINERS;
    this.activeSessions = INITIAL_ACTIVE_SESSIONS;
    this.arunWorkout = INITIAL_TODAY_WORKOUT_ARUN;
    this.payments = INITIAL_PAYMENTS;
    this.personalRecords = INITIAL_PERSONAL_RECORDS;
    this.attendanceLogs = INITIAL_ATTENDANCE_LOGS;
    this.auditLogs = [];

    this.saveAll();
    this.addAudit('Admin', 'RESET_DATA', 'Database', 'SYSTEM', 'Reset system to clean seed data');
    this.notify();
  }

  private addAudit(actor: string, action: string, targetEntity: string, targetId: string, details: string) {
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      actor,
      action,
      targetEntity,
      targetId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      details
    };
    this.auditLogs = [log, ...this.auditLogs.slice(0, 99)];
    saveStorage(STORAGE_KEYS.AUDIT, this.auditLogs);
  }

  private saveAll() {
    saveStorage(STORAGE_KEYS.SETTINGS, this.settings);
    saveStorage(STORAGE_KEYS.ZONES, this.zones);
    saveStorage(STORAGE_KEYS.PLANS, this.plans);
    saveStorage(STORAGE_KEYS.MEMBERS, this.members);
    saveStorage(STORAGE_KEYS.TRAINERS, this.trainers);
    saveStorage(STORAGE_KEYS.SESSIONS, this.activeSessions);
    saveStorage(STORAGE_KEYS.PAYMENTS, this.payments);
    saveStorage(STORAGE_KEYS.PRS, this.personalRecords);
    saveStorage(STORAGE_KEYS.ATTENDANCE, this.attendanceLogs);
  }
}

export const dataService = new DataService();
