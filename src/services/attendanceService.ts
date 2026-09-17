import {
  doc,
  getDoc,
  setDoc,
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
import { isDevDemoEnabled } from './devMode';
import { INITIAL_ZONES } from './seedData';

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

  /**
   * Initializes Firestore data for zones if needed.
   * Note: Staff-only listeners (active_gym_sessions, attendance_records) are attached
   * strictly through dataService.syncForUser(user) when active staff is authenticated.
   */
  async initializeAttendanceSystem(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }

  /**
   * Subscribes to real-time active_gym_sessions updates.
   * Must ONLY be attached for authenticated staff users.
   */
  subscribeActiveSessions(callback: (sessions: ActiveGymSession[]) => void): () => void {
    try {
      const sessionsRef = collection(db, 'active_gym_sessions');
      return onSnapshot(sessionsRef, (snapshot) => {
        const sessions: ActiveGymSession[] = [];
        snapshot.forEach(docSnap => {
          sessions.push({ id: docSnap.id, ...docSnap.data() } as ActiveGymSession);
        });
        callback(sessions);
      }, (err) => {
        console.warn('Active gym sessions subscription notice (staff access required):', err);
      });
    } catch (err) {
      console.warn('Could not attach active_gym_sessions listener:', err);
      return () => {};
    }
  }

  /**
   * Subscribes to real-time attendance_records updates.
   * Must ONLY be attached for authenticated staff users.
   */
  subscribeAttendanceLogs(callback: (logs: AttendanceRecord[]) => void): () => void {
    try {
      const logsRef = collection(db, 'attendance_records');
      return onSnapshot(logsRef, (snapshot) => {
        const logs: AttendanceRecord[] = [];
        snapshot.forEach(docSnap => {
          logs.push({ id: docSnap.id, ...docSnap.data() } as AttendanceRecord);
        });
        // Sort latest arrived first
        logs.sort((a, b) => (b.arrivedAtMs || 0) - (a.arrivedAtMs || 0));
        callback(logs);
      }, (err) => {
        console.warn('Attendance logs subscription notice (staff access required):', err);
      });
    } catch (err) {
      console.warn('Could not attach attendance_records listener:', err);
      return () => {};
    }
  }

  /**
   * Seeds initial zones into Firestore if not present
   */
  async ensureZonesSeeded(): Promise<void> {
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
   * Ensures members have valid cryptographic QR tokens and SHA-256 hashes mapped in Firestore
   */
  async ensureQrTokensSeeded(): Promise<void> {
    try {
      const allMembers = dataService.getMembers();
      for (const member of allMembers) {
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
   * Handles Camera QR scan or Manual Member ID entry through an authoritative, atomic transaction.
   * 
   * GUARANTEES:
   * 1. If Firestore transaction fails, check-in returns failure. Local state is NOT updated.
   * 2. Transaction checks zone capacity on Firestore document; does not exceed capacity.
   * 3. Duplicate check-in is prevented inside transaction by inspecting active_gym_sessions/{memberUid}.
   * 4. Session, attendance record (with collision-resistant auto-ID), zone occupancy, and audit log commit atomically.
   */
  async processMemberCheckIn(params: {
    rawIdentifier: string;
    method: 'QR' | 'MEMBER_ID' | 'MANUAL';
    staffUid?: string;
    staffName?: string;
    overrideZoneId?: string;
  }): Promise<CheckInResult> {
    const { rawIdentifier, method, staffName = 'Staff Desk', overrideZoneId } = params;
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

    // STEP 1: RESOLVE MEMBER AUTHENTICATION / IDENTITY
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

      // Fallback lookup from cached member seed/state ONLY in DEV/Demo mode
      if (!memberUid && isDevDemoEnabled()) {
        const cachedMember = dataService.getMembers().find(m => m.qrToken === cleanId);
        if (cachedMember) {
          memberUid = cachedMember.id;
          memberProfile = cachedMember;
        }
      }

      if (!memberUid) {
        return {
          success: false,
          status: 'CHECK_IN_REFUSED',
          message: 'Check-in refused: Unrecognized or inactive digital pass.'
        };
      }
    } else {
      // Member ID or Manual entry: e.g. "IFC-1001" or "1001"
      const upperSearch = cleanId.toUpperCase();
      
      // Authoritative Firestore lookup by memberId
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

      // Local fallback ONLY in DEV/Demo mode
      if (!memberUid && isDevDemoEnabled()) {
        const found = dataService.getMembers().find(m => 
          (m.memberId && m.memberId.toUpperCase() === upperSearch) ||
          m.id.toLowerCase() === cleanId.toLowerCase() ||
          (upperSearch.startsWith('IFC-') && m.memberId?.endsWith(upperSearch.replace('IFC-', '')))
        );
        if (found) {
          memberUid = found.id;
          memberProfile = found;
        }
      }

      if (!memberUid) {
        return {
          success: false,
          status: 'CHECK_IN_REFUSED',
          message: `Check-in refused: No member found matching ID "${cleanId}".`
        };
      }
    }

    // STEP 2: LOAD AUTHORITATIVE PROFILE DATA & VALIDATE STATUS
    if (!memberProfile && memberUid) {
      try {
        const pSnap = await getDoc(doc(db, 'profiles', memberUid));
        if (pSnap.exists()) {
          memberProfile = pSnap.data() as UserProfile;
        }
      } catch {
        // Fallback
      }
      if (!memberProfile && isDevDemoEnabled()) {
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

    // STEP 3: WORKOUT RECOMMENDATION & CANDIDATE ZONES
    const zones = dataService.getZones();
    const recommendation = evaluateWorkoutAssignment(memberProfile, zones);

    // Prepare candidate zones order for the transaction:
    // If staff specified an override zone, only that zone is evaluated.
    // Otherwise, primary recommended zone is first, followed by alternative options, then remaining zones.
    let candidateZoneIds: string[];
    if (overrideZoneId) {
      candidateZoneIds = [overrideZoneId];
    } else {
      const altZoneNames = recommendation.alternativeOptions.map(o => o.zoneName);
      const altZoneIds = zones.filter(z => altZoneNames.includes(z.name)).map(z => z.id);
      const otherZoneIds = zones.map(z => z.id).filter(id => id !== recommendation.recommendedZoneId && !altZoneIds.includes(id));
      candidateZoneIds = Array.from(new Set([recommendation.recommendedZoneId, ...altZoneIds, ...otherZoneIds]));
    }

    const sessionDocId = memberProfile.id; // Authoritative 1-session-per-member-UID
    const now = new Date();
    const arrivalTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // State captured on successful transaction commit
    let committedSession: ActiveGymSession | null = null;
    let committedAttendance: AttendanceRecord | null = null;
    let committedZone: GymZone | null = null;
    let alternativeAssigned = false;

    // STEP 4: AUTHORITATIVE ATOMIC FIRESTORE TRANSACTION
    try {
      await runTransaction(db, async (transaction) => {
        // 1. DUPLICATE CHECK: Verify active_gym_sessions/{memberUid} does NOT already exist
        const activeSessionRef = doc(db, 'active_gym_sessions', sessionDocId);
        const existingSessionSnap = await transaction.get(activeSessionRef);

        if (existingSessionSnap.exists()) {
          throw new Error('DUPLICATE_CHECK_IN');
        }

        // 2. TRANSACTION-SIDE CAPACITY CHECK: Read candidate zones inside transaction
        const zoneSnaps = await Promise.all(
          candidateZoneIds.map(zid => transaction.get(doc(db, 'gym_zones', zid)))
        );

        let selectedZoneSnap = null;
        let selectedZoneData: GymZone | null = null;

        for (const snap of zoneSnaps) {
          if (snap.exists()) {
            const zData = { id: snap.id, ...snap.data() } as GymZone;
            const currentOcc = zData.currentOccupancy ?? 0;
            const cap = zData.capacity ?? 10;
            if (currentOcc < cap) {
              selectedZoneSnap = snap;
              selectedZoneData = { ...zData, currentOccupancy: currentOcc, capacity: cap };
              break;
            }
          }
        }

        if (!selectedZoneSnap || !selectedZoneData) {
          throw new Error('ZONE_FULL');
        }

        const isAlt = !overrideZoneId && selectedZoneData.id !== recommendation.recommendedZoneId;

        // 3. COLLISION-RESISTANT ATTENDANCE RECORD ID (Auto-ID)
        const attRef = doc(collection(db, 'attendance_records'));
        const attendanceRecordId = attRef.id;

        // 4. PREPARE ACTIVE SESSION
        const sessionPayload: ActiveGymSession = {
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
          zoneId: selectedZoneData.id,
          zoneName: selectedZoneData.name,
          trainerName: memberProfile.assignedTrainerName || 'Floor Trainer',
          method,
          checkedInBy: staffName,
          attendanceRecordId
        };

        // 5. PREPARE ATTENDANCE RECORD
        const attendancePayload: AttendanceRecord = {
          id: attendanceRecordId,
          memberId: memberProfile.id,
          memberUid: memberProfile.id,
          memberName: memberProfile.fullName,
          arrival: arrivalTimeStr,
          arrivedAtMs: now.getTime(),
          workoutName: recommendation.recommendedWorkout,
          zoneName: selectedZoneData.name,
          method,
          date: todayStr,
          checkedInBy: staffName
        };

        // 6. ATOMIC COMMITS: Session, Attendance, Zone Occupancy, Audit Log
        transaction.set(activeSessionRef, {
          ...sessionPayload,
          createdAt: serverTimestamp()
        });

        transaction.set(attRef, {
          ...attendancePayload,
          timestamp: serverTimestamp()
        });

        const updatedOccupancy = selectedZoneData.currentOccupancy + 1;
        const newStatus = updatedOccupancy >= selectedZoneData.capacity
          ? 'FULL'
          : updatedOccupancy >= selectedZoneData.capacity - 1
            ? 'BUSY'
            : 'AVAILABLE';

        transaction.set(selectedZoneSnap.ref, {
          currentOccupancy: updatedOccupancy,
          status: newStatus,
          updatedAt: serverTimestamp()
        }, { merge: true });

        const auditRef = doc(collection(db, 'audit_logs'));
        transaction.set(auditRef, {
          actor: staffName,
          action: 'CHECK_IN',
          targetEntity: 'ActiveGymSession',
          targetId: sessionDocId,
          timestamp: new Date().toISOString(),
          details: `${memberProfile.fullName} checked in via ${method} into ${selectedZoneData.name}`
        });

        // Store outputs on successful transaction completion
        committedSession = sessionPayload;
        committedAttendance = attendancePayload;
        committedZone = { ...selectedZoneData, currentOccupancy: updatedOccupancy, status: newStatus };
        alternativeAssigned = isAlt;
      });
    } catch (err: any) {
      if (err?.message === 'DUPLICATE_CHECK_IN') {
        const existingSession = dataService.getActiveSessions().find(s => s.memberId === memberProfile?.id);
        const arrivalText = existingSession 
          ? `Checked in at ${existingSession.arrival} in ${existingSession.zoneName}` 
          : 'Already on the gym floor';
        return {
          success: false,
          status: 'ALREADY_CHECKED_IN',
          member: memberProfile,
          session: existingSession,
          message: `${memberProfile.fullName} is ALREADY CHECKED IN (${arrivalText}). Duplicate check-in denied.`
        };
      }

      if (err?.message === 'ZONE_FULL') {
        return {
          success: false,
          status: 'CHECK_IN_REFUSED',
          member: memberProfile,
          message: overrideZoneId 
            ? `Check-in denied: Selected zone is at maximum capacity (${recommendation.recommendedZoneName}).`
            : 'Check-in denied: All training zones have reached maximum capacity. Please wait for an athlete to check out.'
        };
      }

      // Authoritative failure: MUST return failure, MUST NOT update local state
      handleFirestoreError(err, OperationType.TRANSACTION, 'active_gym_sessions');
      return {
        success: false,
        status: 'CHECK_IN_REFUSED',
        member: memberProfile,
        message: 'Attendance could not be confirmed. Please reconnect and retry.'
      };
    }

    // Step 5: ONLY update client-side dataService AFTER transaction has authoritatively committed
    if (!committedSession || !committedAttendance || !committedZone) {
      return {
        success: false,
        status: 'CHECK_IN_REFUSED',
        member: memberProfile,
        message: 'Attendance could not be confirmed. Please reconnect and retry.'
      };
    }

    dataService.recordSuccessfulCheckIn({
      session: committedSession,
      attendance: committedAttendance,
      assignedZoneId: committedZone.id
    });

    const isRestricted = memberProfile.restrictions && memberProfile.restrictions.toLowerCase() !== 'none';
    const status: CheckInResult['status'] = isRestricted 
      ? 'TRAINER_REVIEW_REQUIRED' 
      : alternativeAssigned 
        ? 'ZONE_CAPACITY_REASSIGNED' 
        : 'SUCCESS';

    let successMsg = `Welcome, ${memberProfile.fullName}! Access granted to ${committedZone.name}.`;
    if (isRestricted) {
      successMsg = `Check-in recorded for ${memberProfile.fullName}. Medical safety notice flagged for floor trainer: "${memberProfile.restrictions}".`;
    } else if (alternativeAssigned) {
      successMsg = `Primary zone reached peak capacity. Seamlessly reassigned ${memberProfile.fullName} to ${committedZone.name}.`;
    }

    return {
      success: true,
      status,
      message: successMsg,
      session: committedSession,
      member: memberProfile,
      recommendation,
      alternativeAssigned,
      restrictionsFlagged: recommendation.restrictionsFlagged
    };
  }

  /**
   * Authoritative Atomic Check-Out Processor:
   * 1. Loads active session inside transaction; rejects if not found.
   * 2. Deletes active session document.
   * 3. Decrements zone occupancy safely (Math.max(0, current - 1), never negative).
   * 4. Updates linked attendance record with exitedAt, exitedAtMs, durationMinutes, checkedOutBy, updatedAt.
   * 5. Appends audit log.
   * 6. Returns failure if transaction fails; does NOT update local state on failure.
   */
  async processMemberCheckOut(params: {
    memberUid: string;
    sessionId?: string;
    staffName?: string;
  }): Promise<CheckOutResult> {
    const { memberUid, sessionId, staffName = 'Staff Desk' } = params;
    const targetUid = (memberUid || sessionId || '').trim();

    if (!targetUid) {
      return {
        success: false,
        message: 'Athlete identifier required for check-out.'
      };
    }

    const now = new Date();
    const exitTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const exitedAtMs = now.getTime();

    let committedSession: ActiveGymSession | null = null;

    try {
      await runTransaction(db, async (transaction) => {
        // 1. READ ACTIVE SESSION
        const sessionRef = doc(db, 'active_gym_sessions', targetUid);
        const sessionSnap = await transaction.get(sessionRef);

        if (!sessionSnap.exists()) {
          throw new Error('NO_ACTIVE_SESSION');
        }

        const sessionData = { id: sessionSnap.id, ...sessionSnap.data() } as ActiveGymSession;

        // 2. READ ZONE DOCUMENT
        const zoneRef = doc(db, 'gym_zones', sessionData.zoneId);
        const zoneSnap = await transaction.get(zoneRef);

        // 3. READ LINKED ATTENDANCE RECORD IF ATTACHED
        let attRef = null;
        let attSnap = null;
        if (sessionData.attendanceRecordId) {
          attRef = doc(db, 'attendance_records', sessionData.attendanceRecordId);
          attSnap = await transaction.get(attRef);
        }

        // --- ALL READS COMPLETE, EXECUTE WRITES ---

        // 1. Delete active session
        transaction.delete(sessionRef);

        // 2. Decrement zone occupancy safely (never below 0)
        let currentOcc = 0;
        let capacity = 10;
        if (zoneSnap.exists()) {
          const zData = zoneSnap.data() as GymZone;
          currentOcc = zData.currentOccupancy ?? 0;
          capacity = zData.capacity ?? 10;
        }
        const newOcc = Math.max(0, currentOcc - 1);
        const newStatus = newOcc >= capacity ? 'FULL' : newOcc >= capacity - 1 ? 'BUSY' : 'AVAILABLE';

        transaction.set(zoneRef, {
          currentOccupancy: newOcc,
          status: newStatus,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // 3. Update matching attendance record with exit timestamp and duration
        const arrivedAtMs = sessionData.arrivedAtMs || (attSnap?.exists() ? attSnap.data().arrivedAtMs : null) || exitedAtMs;
        const durationMinutes = Math.max(1, Math.round((exitedAtMs - arrivedAtMs) / 60000));

        if (attRef && attSnap?.exists()) {
          transaction.set(attRef, {
            exit: exitTimeStr,
            exitedAt: exitTimeStr,
            exitedAtMs,
            durationMinutes,
            checkedOutBy: staffName,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }

        // 4. Log checkout audit
        const auditRef = doc(collection(db, 'audit_logs'));
        transaction.set(auditRef, {
          actor: staffName,
          action: 'CHECK_OUT',
          targetEntity: 'ActiveGymSession',
          targetId: sessionData.id,
          timestamp: new Date().toISOString(),
          details: `${sessionData.memberName} checked out from ${sessionData.zoneName} by ${staffName}`
        });

        committedSession = sessionData;
      });
    } catch (err: any) {
      if (err?.message === 'NO_ACTIVE_SESSION') {
        return {
          success: false,
          message: 'No active floor session found for this athlete. Member may already be checked out.'
        };
      }

      handleFirestoreError(err, OperationType.TRANSACTION, `active_gym_sessions/${targetUid}`);
      return {
        success: false,
        message: 'Attendance could not be confirmed. Please reconnect and retry.'
      };
    }

    if (!committedSession) {
      return {
        success: false,
        message: 'Attendance could not be confirmed. Please reconnect and retry.'
      };
    }

    // ONLY update local state AFTER Firestore transaction has authoritatively committed
    dataService.recordSuccessfulCheckOut(committedSession.id, exitTimeStr, staffName);

    return {
      success: true,
      message: `${committedSession.memberName} checked out successfully. Floor session concluded at ${exitTimeStr}.`,
      session: committedSession
    };
  }

  cleanup() {
    // Cleanup handled by dataService unsubscriptions
  }
}

export const attendanceService = new AttendanceService();
