import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { 
  UserProfile, 
  GymZone, 
  ActiveGymSession, 
  AttendanceRecord, 
  CheckInResult, 
  CheckOutResult,
  QrTokenRecord
} from '../types';
import { hashQrToken, isValidQrTokenFormat, generateCryptographicQrToken } from './qrService';
import { evaluateWorkoutAssignment } from './workoutEngine';
import { dataService } from './dataService';
import { INITIAL_MEMBERS, INITIAL_ZONES } from './seedData';

// Firestore Error Handling Interface mandated by Firebase guidelines
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  TRANSACTION = 'transaction'
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null
    },
    operationType,
    path
  };
  console.warn('Attendance Firestore Warning/Context:', JSON.stringify(errInfo));
  return errInfo;
}

class AttendanceService {
  private isInitialized = false;
  private unsubscribeSessions: (() => void) | null = null;
  private unsubscribeZones: (() => void) | null = null;

  /**
   * Initializes Firestore data for zones, member QR tokens, and starts real-time listeners
   */
  async initializeAttendanceSystem(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // Attach real-time Firestore listeners for Multi-Device synchronization
      this.attachRealtimeListeners();
    } catch (e) {
      console.warn('Attendance system background sync initialized with local cache fallback:', e);
    }
  }

  private attachRealtimeListeners() {
    try {
      // Listen to active_gym_sessions
      const sessionsRef = collection(db, 'active_gym_sessions');
      this.unsubscribeSessions = onSnapshot(sessionsRef, (snapshot) => {
        const sessions: ActiveGymSession[] = [];
        snapshot.forEach(docSnap => {
          sessions.push({ id: docSnap.id, ...docSnap.data() } as ActiveGymSession);
        });
        if (sessions.length > 0 || snapshot.metadata.fromCache === false) {
          dataService.syncActiveSessionsFromFirestore(sessions);
        }
      }, (err) => {
        console.warn('Active gym sessions subscription notice (staff authentication required):', err);
      });

      // Listen to gym_zones
      const zonesRef = collection(db, 'gym_zones');
      this.unsubscribeZones = onSnapshot(zonesRef, (snapshot) => {
        const zones: GymZone[] = [];
        snapshot.forEach(docSnap => {
          zones.push({ id: docSnap.id, ...docSnap.data() } as GymZone);
        });
        if (zones.length > 0) {
          dataService.syncZonesFromFirestore(zones);
        }
      }, (err) => {
        console.warn('Gym zones listener notice:', err);
      });
    } catch (err) {
      console.warn('Could not attach Firestore real-time listeners:', err);
    }
  }

  /**
   * Seeds initial zones into Firestore if not present
   */
  private async ensureZonesSeeded(): Promise<void> {
    try {
      for (const zone of INITIAL_ZONES) {
        const zoneRef = doc(db, 'gym_zones', zone.id);
        const snap = await getDoc(zoneRef);
        if (!snap.exists()) {
          await setDoc(zoneRef, zone, { merge: true });
        }
      }
    } catch (err) {
      console.warn('Zones seed check bypassed:', err);
    }
  }

  /**
   * Ensures every member has a valid cryptographic QR token and SHA-256 hash mapped in Firestore
   */
  async ensureQrTokensSeeded(): Promise<void> {
    try {
      const allMembers = dataService.getMembers();
      for (const member of allMembers) {
        // Ensure member has a valid modern or seed token
        let token = member.qrToken;
        if (!token || !isValidQrTokenFormat(token)) {
          token = generateCryptographicQrToken();
          member.qrToken = token;
          dataService.upsertProfile(member);
        }

        const tokenHash = await hashQrToken(token);
        if (!tokenHash) continue;

        const tokenRef = doc(db, 'qr_tokens', tokenHash);
        const tokenSnap = await getDoc(tokenRef);

        if (!tokenSnap.exists()) {
          const record: QrTokenRecord = {
            memberUid: member.id,
            memberId: member.memberId || 'IFC-1001',
            gymId: 'infinity-neelambur',
            active: member.isActive && member.status !== 'EXPIRED' && member.status !== 'FROZEN',
            createdAt: new Date().toISOString(),
            revokedAt: null,
            version: 'IFC1'
          };
          await setDoc(tokenRef, record);
        }

        // Also ensure member document in 'profiles' collection
        const profileRef = doc(db, 'profiles', member.id);
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
          await setDoc(profileRef, member);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'qr_tokens');
    }
  }

  /**
   * Registers a newly generated cryptographic QR token in Firestore
   */
  async registerMemberQrToken(memberUid: string, token: string): Promise<void> {
    try {
      const tokenHash = await hashQrToken(token);
      if (!tokenHash) return;
      const tokenRef = doc(db, 'qr_tokens', tokenHash);
      const record: QrTokenRecord = {
        memberUid,
        memberId: memberUid,
        gymId: 'infinity-neelambur',
        active: true,
        createdAt: new Date().toISOString(),
        revokedAt: null,
        version: 'IFC1'
      };
      await setDoc(tokenRef, record, { merge: true });
    } catch (err) {
      console.warn('QR token registration notice:', err);
    }
  }

  /**
   * Core Production Check-In Processor:
   * Handles Camera QR scan or Manual Member ID entry through the EXACT same transactional pipeline.
   */
  async processMemberCheckIn(params: {
    rawIdentifier: string;
    method: 'QR' | 'MEMBER_ID' | 'MANUAL';
    staffUid?: string;
    staffName?: string;
    overrideZoneId?: string;
  }): Promise<CheckInResult> {
    const { rawIdentifier, method, staffName = 'Staff Desk' } = params;
    const cleanId = (rawIdentifier || '').trim();

    if (!cleanId) {
      return {
        success: false,
        status: 'CHECK_IN_REFUSED',
        message: 'No identification provided. Please scan a QR pass or enter a Member ID.'
      };
    }

    let memberUid: string | null = null;
    let memberProfile: UserProfile | null = null;

    // STEP 1: RESOLVE MEMBER
    if (method === 'QR') {
      if (!isValidQrTokenFormat(cleanId)) {
        return {
          success: false,
          status: 'CHECK_IN_REFUSED',
          message: 'Malformed or unrecognized QR pass. Please present a valid Infinity Digital Pass.'
        };
      }

      // Hash raw token with SHA-256
      const tokenHash = await hashQrToken(cleanId);
      
      try {
        const tokenDocRef = doc(db, 'qr_tokens', tokenHash);
        const tokenDocSnap = await getDoc(tokenDocRef);

        if (tokenDocSnap.exists()) {
          const tokenData = tokenDocSnap.data() as QrTokenRecord;
          if (!tokenData.active || tokenData.revokedAt) {
            return {
              success: false,
              status: 'CHECK_IN_REFUSED',
              message: 'Check-in refused: This QR pass has been revoked or deactivated.'
            };
          }
          memberUid = tokenData.memberUid;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `qr_tokens/${tokenHash}`);
      }

      // Fallback lookup from cached member seed/state if Firestore offline
      if (!memberUid) {
        const cachedMember = dataService.getMembers().find(m => m.qrToken === cleanId);
        if (cachedMember) {
          memberUid = cachedMember.id;
          memberProfile = cachedMember;
        } else {
          return {
            success: false,
            status: 'CHECK_IN_REFUSED',
            message: 'Check-in refused: Unrecognized or inactive digital pass.'
          };
        }
      }
    } else {
      // Member ID or Manual entry: e.g. "IFC-1001" or "1001"
      const upperSearch = cleanId.toUpperCase();
      
      // Try Firestore lookup by memberId
      try {
        const q = query(collection(db, 'profiles'), where('memberId', '==', upperSearch));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          const docItem = qSnap.docs[0];
          memberUid = docItem.id;
          memberProfile = docItem.data() as UserProfile;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'profiles');
      }

      // Local fallback
      if (!memberUid) {
        const found = dataService.getMembers().find(m => 
          (m.memberId && m.memberId.toUpperCase() === upperSearch) ||
          m.id.toLowerCase() === cleanId.toLowerCase() ||
          (upperSearch.startsWith('IFC-') && m.memberId?.endsWith(upperSearch.replace('IFC-', '')))
        );
        if (found) {
          memberUid = found.id;
          memberProfile = found;
        } else {
          return {
            success: false,
            status: 'CHECK_IN_REFUSED',
            message: `Check-in refused: No member found matching ID "${cleanId}".`
          };
        }
      }
    }

    // STEP 2: LOAD MEMBER DATA & VALIDATE STATUS
    if (!memberProfile && memberUid) {
      try {
        const pSnap = await getDoc(doc(db, 'profiles', memberUid));
        if (pSnap.exists()) {
          memberProfile = pSnap.data() as UserProfile;
        }
      } catch {
        // Fallback
      }
      if (!memberProfile) {
        memberProfile = dataService.getMembers().find(m => m.id === memberUid) || null;
      }
    }

    if (!memberProfile) {
      return {
        success: false,
        status: 'CHECK_IN_REFUSED',
        message: 'Member record could not be retrieved.'
      };
    }

    // Check account active state
    if (memberProfile.isActive === false) {
      return {
        success: false,
        status: 'CHECK_IN_REFUSED',
        message: 'Account is deactivated. Please consult club administration.'
      };
    }

    // Check Membership Expiry & Status
    const todayStr = new Date().toISOString().split('T')[0];
    if (memberProfile.status === 'EXPIRED' || (memberProfile.membershipExpiry && memberProfile.membershipExpiry < todayStr)) {
      return {
        success: false,
        status: 'MEMBERSHIP_EXPIRED',
        member: memberProfile,
        message: `Membership expired on ${memberProfile.membershipExpiry || 'past date'}. Please renew membership at reception.`
      };
    }

    if (memberProfile.status === 'FROZEN') {
      return {
        success: false,
        status: 'MEMBERSHIP_FROZEN',
        member: memberProfile,
        message: 'Membership is currently on freeze hold. Contact staff to unfreeze your account.'
      };
    }

    // STEP 3: FIRESTORE TRANSACTION FOR ATOMIC CHECK-IN & DUPLICATE PREVENTION
    const zones = dataService.getZones();
    const recommendation = evaluateWorkoutAssignment(memberProfile, zones);

    let assignedZone = zones.find(z => z.id === recommendation.recommendedZoneId) || zones[0];
    let alternativeAssigned = false;

    // Check Zone Capacity & Reassign if full
    if (assignedZone.currentOccupancy >= assignedZone.capacity) {
      const openAlt = recommendation.alternativeOptions.find(alt => {
        const z = zones.find(zn => zn.name === alt.zoneName);
        return z && z.currentOccupancy < z.capacity;
      });

      if (openAlt) {
        const altZoneObj = zones.find(zn => zn.name === openAlt.zoneName);
        if (altZoneObj) {
          assignedZone = altZoneObj;
          alternativeAssigned = true;
        }
      }
    }

    const sessionDocId = memberProfile.id; // 1 active session per member UID
    const now = new Date();
    const arrivalTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newSession: ActiveGymSession = {
      id: sessionDocId,
      memberId: memberProfile.id,
      memberUid: memberProfile.id,
      memberName: memberProfile.fullName,
      memberAvatar: memberProfile.avatarUrl,
      memberStatus: memberProfile.status || 'ACTIVE',
      planName: memberProfile.planName || 'Infinity Plan',
      arrival: arrivalTimeStr,
      arrivedAtMs: now.getTime(),
      workoutName: recommendation.recommendedWorkout,
      zoneId: assignedZone.id,
      zoneName: assignedZone.name,
      trainerName: memberProfile.assignedTrainerName || 'Floor Trainer',
      method,
      checkedInBy: staffName
    };

    const attendanceId = `att-${Date.now()}`;
    const newAttendance: AttendanceRecord = {
      id: attendanceId,
      memberId: memberProfile.id,
      memberUid: memberProfile.id,
      memberName: memberProfile.fullName,
      arrival: arrivalTimeStr,
      arrivedAtMs: now.getTime(),
      workoutName: recommendation.recommendedWorkout,
      zoneName: assignedZone.name,
      method,
      date: todayStr,
      checkedInBy: staffName
    };

    // Execute atomic Firestore transaction
    try {
      await runTransaction(db, async (transaction) => {
        const activeSessionRef = doc(db, 'active_gym_sessions', sessionDocId);
        const existingSessionSnap = await transaction.get(activeSessionRef);

        if (existingSessionSnap.exists()) {
          throw new Error('DUPLICATE_CHECK_IN');
        }

        const targetZoneRef = doc(db, 'gym_zones', assignedZone.id);
        const zoneSnap = await transaction.get(targetZoneRef);
        let updatedOccupancy = assignedZone.currentOccupancy + 1;

        if (zoneSnap.exists()) {
          const zData = zoneSnap.data() as GymZone;
          updatedOccupancy = (zData.currentOccupancy || 0) + 1;
        }

        // 1. Create Active Gym Session
        transaction.set(activeSessionRef, {
          ...newSession,
          createdAt: serverTimestamp()
        });

        // 2. Create Attendance Record
        const attRef = doc(db, 'attendance_records', attendanceId);
        transaction.set(attRef, {
          ...newAttendance,
          timestamp: serverTimestamp()
        });

        // 3. Update Zone Occupancy
        transaction.set(targetZoneRef, {
          currentOccupancy: updatedOccupancy,
          status: updatedOccupancy >= assignedZone.capacity ? 'FULL' : updatedOccupancy >= assignedZone.capacity - 1 ? 'BUSY' : 'AVAILABLE'
        }, { merge: true });

        // 4. Audit Log
        const auditRef = doc(db, 'audit_logs', `audit-${Date.now()}`);
        transaction.set(auditRef, {
          actor: staffName,
          action: 'CHECK_IN',
          targetEntity: 'ActiveGymSession',
          targetId: sessionDocId,
          timestamp: new Date().toISOString(),
          details: `${memberProfile?.fullName} checked in via ${method} into ${assignedZone.name}`
        });
      });
    } catch (err: any) {
      if (err?.message === 'DUPLICATE_CHECK_IN') {
        const existingSession = dataService.getActiveSessions().find(s => s.memberId === memberProfile?.id) || newSession;
        return {
          success: false,
          status: 'ALREADY_CHECKED_IN',
          member: memberProfile,
          session: existingSession,
          message: `${memberProfile.fullName} is ALREADY CHECKED IN on the gym floor (Checked in at ${existingSession.arrival} in ${existingSession.zoneName}).`
        };
      }
      handleFirestoreError(err, OperationType.TRANSACTION, 'active_gym_sessions');
    }

    // Synchronize local state with dataService
    dataService.recordSuccessfulCheckIn({
      session: newSession,
      attendance: newAttendance,
      assignedZoneId: assignedZone.id
    });

    const isRestricted = memberProfile.restrictions && memberProfile.restrictions.toLowerCase() !== 'none';
    const status: CheckInResult['status'] = isRestricted 
      ? 'TRAINER_REVIEW_REQUIRED' 
      : alternativeAssigned 
        ? 'ZONE_CAPACITY_REASSIGNED' 
        : 'SUCCESS';

    let successMsg = `Welcome, ${memberProfile.fullName}! Access granted to ${assignedZone.name}.`;
    if (isRestricted) {
      successMsg = `Check-in recorded for ${memberProfile.fullName}. Medical safety notice flagged for floor trainer: "${memberProfile.restrictions}".`;
    } else if (alternativeAssigned) {
      successMsg = `Primary zone reached peak capacity. Seamlessly reassigned ${memberProfile.fullName} to ${assignedZone.name}.`;
    }

    return {
      success: true,
      status,
      message: successMsg,
      session: newSession,
      member: memberProfile,
      recommendation,
      alternativeAssigned,
      restrictionsFlagged: recommendation.restrictionsFlagged
    };
  }

  /**
   * Atomic Check-Out Processor:
   * Decrements zone capacity, timestamps attendance exit, removes active floor session.
   */
  async processMemberCheckOut(params: {
    memberUid: string;
    sessionId?: string;
    staffName?: string;
  }): Promise<CheckOutResult> {
    const { memberUid, staffName = 'Staff Desk' } = params;
    const session = dataService.getActiveSessions().find(s => s.memberId === memberUid || s.id === memberUid);

    if (!session) {
      return {
        success: false,
        message: 'No active session found for this athlete.'
      };
    }

    const now = new Date();
    const exitTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Delete from active_gym_sessions
        const sessionRef = doc(db, 'active_gym_sessions', session.id);
        transaction.delete(sessionRef);

        // 2. Decrement zone occupancy
        const zoneRef = doc(db, 'gym_zones', session.zoneId);
        const zoneSnap = await transaction.get(zoneRef);
        if (zoneSnap.exists()) {
          const zData = zoneSnap.data() as GymZone;
          const newOcc = Math.max(0, (zData.currentOccupancy || 1) - 1);
          transaction.set(zoneRef, {
            currentOccupancy: newOcc,
            status: newOcc >= zData.capacity ? 'FULL' : newOcc >= zData.capacity - 1 ? 'BUSY' : 'AVAILABLE'
          }, { merge: true });
        }

        // 3. Log checkout audit
        const auditRef = doc(db, 'audit_logs', `audit-${Date.now()}`);
        transaction.set(auditRef, {
          actor: staffName,
          action: 'CHECK_OUT',
          targetEntity: 'ActiveGymSession',
          targetId: session.id,
          timestamp: new Date().toISOString(),
          details: `${session.memberName} checked out from ${session.zoneName} by ${staffName}`
        });
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.TRANSACTION, `active_gym_sessions/${session.id}`);
    }

    // Synchronize local dataService
    dataService.recordSuccessfulCheckOut(session.id, exitTimeStr, staffName);

    return {
      success: true,
      message: `${session.memberName} checked out successfully. Floor session concluded at ${exitTimeStr}.`,
      session
    };
  }

  cleanup() {
    if (this.unsubscribeSessions) this.unsubscribeSessions();
    if (this.unsubscribeZones) this.unsubscribeZones();
  }
}

export const attendanceService = new AttendanceService();
