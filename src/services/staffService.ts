import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { INITIAL_TRAINERS, INITIAL_STAFF } from './seedData';
import { isDevDemoEnabled } from './devMode';
import { auditService } from './auditService';
import { DEFAULT_GYM_ID } from './gymSettingsService';
import { normalizeEmail, hashEmail, PRE_REGISTRATION_LINKS_COLLECTION } from './preRegistrationService';

const PROFILES_COLLECTION = 'profiles';

export const staffService = {
  /**
   * Fetch all staff members (trainers, admins, owners) from Firestore
   */
  async getStaff(): Promise<UserProfile[]> {
    try {
      const q = query(
        collection(db, PROFILES_COLLECTION),
        where('role', 'in', ['trainer', 'admin', 'owner'])
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        return isDevDemoEnabled() ? [...INITIAL_STAFF, ...INITIAL_TRAINERS] : [];
      }
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as UserProfile));
    } catch (error) {
      console.warn('Could not read staff from Firestore:', error);
      return isDevDemoEnabled() ? [...INITIAL_STAFF, ...INITIAL_TRAINERS] : [];
    }
  },

  /**
   * Real-time subscription to all staff members (staff authorized)
   */
  subscribeStaff(callback: (staff: UserProfile[]) => void): () => void {
    const q = query(
      collection(db, PROFILES_COLLECTION),
      where('role', 'in', ['trainer', 'admin', 'owner'])
    );
    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const staff = snap.docs.map(d => ({ ...d.data(), id: d.id } as UserProfile));
          callback(staff);
        } else {
          callback(isDevDemoEnabled() ? [...INITIAL_STAFF, ...INITIAL_TRAINERS] : []);
        }
      },
      (error) => {
        console.warn('Staff snapshot listener warning:', error);
        callback(isDevDemoEnabled() ? [...INITIAL_STAFF, ...INITIAL_TRAINERS] : []);
      }
    );
  },

  /**
   * Real-time subscription to floor coaches (publicly viewable)
   */
  subscribeTrainers(callback: (trainers: UserProfile[]) => void): () => void {
    const q = query(
      collection(db, PROFILES_COLLECTION),
      where('role', '==', 'trainer')
    );
    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const trainers = snap.docs.map(d => ({ ...d.data(), id: d.id } as UserProfile));
          callback(trainers);
        } else {
          callback(isDevDemoEnabled() ? INITIAL_TRAINERS : []);
        }
      },
      (error) => {
        console.warn('Trainers snapshot listener warning:', error);
        callback(isDevDemoEnabled() ? INITIAL_TRAINERS : []);
      }
    );
  },

  /**
   * Create a new staff account (trainer, admin, or owner)
   */
  async createStaffMember(
    data: {
      fullName: string;
      email: string;
      phone?: string;
      role: 'trainer' | 'admin' | 'owner';
      fitnessGoal?: string;
      experience?: string;
      trainerNotes?: string;
      avatarUrl?: string;
    },
    creatorName: string
  ): Promise<UserProfile> {
    const cleanEmail = normalizeEmail(data.email);
    if (!cleanEmail) {
      throw new Error('Valid email address is required.');
    }

    const emailHash = await hashEmail(cleanEmail);
    const linkRef = doc(db, PRE_REGISTRATION_LINKS_COLLECTION, emailHash);

    // Check if this email is already pre-registered
    const existingLink = await getDoc(linkRef);
    if (existingLink.exists()) {
      throw new Error('This email is already pre-registered.');
    }

    const rawId = `staff_${data.role}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newStaffProfile: UserProfile = {
      id: rawId,
      uid: rawId,
      fullName: data.fullName.trim(),
      email: cleanEmail,
      phone: data.phone?.trim() || '',
      role: data.role,
      isActive: true,
      avatarUrl: data.avatarUrl || (
        data.role === 'trainer'
          ? 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
      ),
      fitnessGoal: data.fitnessGoal || (
        data.role === 'trainer'
          ? 'Floor Strength & Conditioning Specialist'
          : data.role === 'admin'
          ? 'Reception & Front Desk Lead'
          : 'Club Management'
      ),
      experience: data.experience || (data.role === 'trainer' ? 'Certified Coach' : undefined),
      trainerNotes: data.trainerNotes || '',
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Save profile document
      await setDoc(doc(db, PROFILES_COLLECTION, rawId), {
        ...newStaffProfile,
        gymId: DEFAULT_GYM_ID,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Save pre-registration link record
      await setDoc(linkRef, {
        emailHash,
        emailNormalized: cleanEmail,
        profileDocId: rawId,
        gymId: DEFAULT_GYM_ID,
        role: data.role,
        authUid: null,
        authLinked: false,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 3. Audit log
      await auditService.logAuditEvent(
        creatorName,
        'STAFF_CREATED',
        'UserProfile',
        rawId,
        `Created ${data.role.toUpperCase()} account for ${newStaffProfile.fullName} (${cleanEmail})`
      );

      return newStaffProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${PROFILES_COLLECTION}/${rawId}`);
    }
  },

  /**
   * Update active/suspended status of a staff member
   */
  async updateStaffStatus(uid: string, isActive: boolean, actorName: string): Promise<void> {
    const path = `${PROFILES_COLLECTION}/${uid}`;
    try {
      const ref = doc(db, PROFILES_COLLECTION, uid);
      await updateDoc(ref, {
        isActive,
        updatedAt: serverTimestamp()
      });

      await auditService.logAuditEvent(
        actorName,
        isActive ? 'STAFF_ACTIVATED' : 'STAFF_SUSPENDED',
        'UserProfile',
        uid,
        `${isActive ? 'Activated' : 'Suspended'} staff account (UID: ${uid})`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Update role of a staff member (Owner only)
   */
  async updateStaffRole(uid: string, newRole: UserRole, actorName: string): Promise<void> {
    const path = `${PROFILES_COLLECTION}/${uid}`;
    try {
      const ref = doc(db, PROFILES_COLLECTION, uid);
      await updateDoc(ref, {
        role: newRole,
        updatedAt: serverTimestamp()
      });

      await auditService.logAuditEvent(
        actorName,
        'STAFF_ROLE_CHANGED',
        'UserProfile',
        uid,
        `Changed role of staff account (UID: ${uid}) to ${newRole.toUpperCase()}`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Update staff details (bio, specialty, phone)
   */
  async updateStaffProfile(uid: string, updates: Partial<UserProfile>, actorName: string): Promise<void> {
    const path = `${PROFILES_COLLECTION}/${uid}`;
    try {
      const ref = doc(db, PROFILES_COLLECTION, uid);
      await setDoc(ref, {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });

      await auditService.logAuditEvent(
        actorName,
        'STAFF_PROFILE_UPDATED',
        'UserProfile',
        uid,
        `Updated profile details for staff account ${uid}`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Remove a staff account
   */
  async deleteStaffMember(uid: string, actorName: string): Promise<void> {
    const path = `${PROFILES_COLLECTION}/${uid}`;
    try {
      await deleteDoc(doc(db, PROFILES_COLLECTION, uid));
      await auditService.logAuditEvent(
        actorName,
        'STAFF_DELETED',
        'UserProfile',
        uid,
        `Removed staff account record ${uid}`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};
