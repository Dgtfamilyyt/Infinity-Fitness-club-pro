import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, MemberStatus } from '../types';
import { INITIAL_MEMBERS } from './seedData';
import { isDevDemoEnabled } from './devMode';
import { auditService } from './auditService';
import { DEFAULT_GYM_ID } from './gymSettingsService';
import { generateCryptographicQrToken, hashQrToken } from './qrService';
import { normalizeEmail, hashEmail, PRE_REGISTRATION_LINKS_COLLECTION } from './preRegistrationService';

const PROFILES_COLLECTION = 'profiles';
const QR_TOKENS_COLLECTION = 'qr_tokens';
const MEMBERSHIPS_COLLECTION = 'memberships';

export const memberService = {
  async getMembers(): Promise<UserProfile[]> {
    try {
      const q = query(
        collection(db, PROFILES_COLLECTION),
        where('role', '==', 'member')
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        return isDevDemoEnabled() ? INITIAL_MEMBERS : [];
      }
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as UserProfile));
    } catch (error) {
      console.warn('Could not read members from Firestore:', error);
      return isDevDemoEnabled() ? INITIAL_MEMBERS : [];
    }
  },

  subscribeMembers(callback: (members: UserProfile[]) => void): () => void {
    const q = query(
      collection(db, PROFILES_COLLECTION),
      where('role', '==', 'member')
    );
    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const members = snap.docs.map(d => ({ ...d.data(), id: d.id } as UserProfile));
          callback(members);
        } else {
          callback(isDevDemoEnabled() ? INITIAL_MEMBERS : []);
        }
      },
      (error) => {
        console.warn('Members snapshot listener error:', error);
        callback(isDevDemoEnabled() ? INITIAL_MEMBERS : []);
      }
    );
  },

  async createMember(
    data: {
      fullName: string;
      email: string;
      phone: string;
      planName: string;
      assignedTrainerName: string;
      fitnessGoal: string;
      restrictions: string;
    },
    staffName: string
  ): Promise<UserProfile> {
    const cleanEmail = normalizeEmail(data.email);
    if (!cleanEmail) {
      throw new Error('Valid email is required.');
    }

    const emailHash = await hashEmail(cleanEmail);
    const linkRef = doc(db, PRE_REGISTRATION_LINKS_COLLECTION, emailHash);

    // Check if this email is already pre-registered
    const existingLink = await getDoc(linkRef);
    if (existingLink.exists()) {
      throw new Error('This email is already pre-registered.');
    }

    const rawId = `athlete_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const memberId = `IFC-${Math.floor(1000 + Math.random() * 9000)}`;
    const rawQrToken = generateCryptographicQrToken();
    const tokenHash = await hashQrToken(rawQrToken);

    const newProfile: UserProfile = {
      id: rawId,
      uid: rawId,
      memberId,
      fullName: data.fullName.trim(),
      email: cleanEmail,
      phone: data.phone.trim(),
      role: 'member',
      status: 'ACTIVE',
      isActive: true,
      membershipPlanId: 'plan-quarterly',
      planName: data.planName,
      membershipStart: new Date().toISOString().split('T')[0],
      membershipExpiry: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      assignedTrainerName: data.assignedTrainerName,
      fitnessGoal: data.fitnessGoal,
      restrictions: data.restrictions,
      qrToken: rawQrToken,
      attendanceStreak: 0,
      workoutStreak: 0,
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Save Profile
      await setDoc(doc(db, PROFILES_COLLECTION, rawId), {
        ...newProfile,
        gymId: DEFAULT_GYM_ID,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Issue QR Token record
      await setDoc(doc(db, QR_TOKENS_COLLECTION, tokenHash), {
        memberUid: rawId,
        memberId,
        gymId: DEFAULT_GYM_ID,
        active: true,
        version: 'IFC1',
        createdAt: serverTimestamp()
      });

      // 3. Issue Membership record
      await setDoc(doc(db, MEMBERSHIPS_COLLECTION, `mem_${rawId}`), {
        gymId: DEFAULT_GYM_ID,
        memberUid: rawId,
        planId: 'plan-quarterly',
        planName: data.planName,
        status: 'ACTIVE',
        startDate: newProfile.membershipStart,
        expiryDate: newProfile.membershipExpiry,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 4. Save Pre-registration link record
      await setDoc(linkRef, {
        emailHash,
        emailNormalized: cleanEmail,
        profileDocId: rawId,
        gymId: DEFAULT_GYM_ID,
        role: 'member',
        authUid: null,
        authLinked: false,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 5. Audit Log
      await auditService.logAuditEvent(
        staffName,
        'MEMBER_CREATED',
        'UserProfile',
        rawId,
        `Created member ${newProfile.fullName} (${memberId}) with plan ${data.planName}`
      );

      return newProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${PROFILES_COLLECTION}/${rawId}`);
    }
  },

  async updateMemberStatus(uid: string, status: MemberStatus, staffName: string): Promise<void> {
    const path = `${PROFILES_COLLECTION}/${uid}`;
    try {
      const ref = doc(db, PROFILES_COLLECTION, uid);
      await updateDoc(ref, {
        status,
        updatedAt: serverTimestamp()
      });

      // Also update membership document
      await setDoc(doc(db, MEMBERSHIPS_COLLECTION, `mem_${uid}`), {
        status,
        updatedAt: serverTimestamp()
      }, { merge: true });

      await auditService.logAuditEvent(
        staffName,
        'STATUS_UPDATED',
        'UserProfile',
        uid,
        `Updated member status to ${status}`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};
