import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { INITIAL_TRAINERS, INITIAL_STAFF } from './seedData';
import { isDevDemoEnabled } from './devMode';
import { functionsService } from './functionsService';
import { trainerService } from './trainerService';

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
   * Create a new staff account (trainer, admin, or owner)
   * PRIVILEGED OPERATION: Executed authoritatively via Firebase Functions backend.
   * Derives caller identity, enforces role boundaries, creates Auth user & canonical profile.
   */
  async createStaffMember(
    data: {
      fullName: string;
      email: string;
      phone?: string;
      role: 'trainer' | 'admin' | 'owner';
      fitnessGoal?: string;
      experience?: string;
      bio?: string;
      trainerNotes?: string;
      avatarUrl?: string;
    },
    _creatorName?: string
  ): Promise<UserProfile> {
    const result = await functionsService.createStaffAccount({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      role: data.role,
      fitnessGoal: data.fitnessGoal,
      experience: data.experience,
      bio: data.bio,
      trainerNotes: data.trainerNotes,
      avatarUrl: data.avatarUrl
    });

    if (!result.success || !result.profile) {
      throw new Error('Staff account creation failed on server.');
    }

    return result.profile;
  },

  /**
   * Update active/suspended status of a staff member
   * PRIVILEGED OPERATION: Executed authoritatively via Firebase Functions backend.
   * Admins may manage trainers; Owners may manage all staff.
   */
  async updateStaffStatus(uid: string, isActive: boolean, _actorName?: string): Promise<void> {
    const result = await functionsService.setStaffActiveStatus({
      targetUid: uid,
      isActive
    });

    if (!result.success) {
      throw new Error('Failed to update staff active status.');
    }
  },

  /**
   * Update role of a staff member
   * PRIVILEGED OPERATION: Executed authoritatively via Firebase Functions backend (Owner only).
   */
  async updateStaffRole(uid: string, newRole: UserRole, _actorName?: string): Promise<void> {
    if (newRole === 'member') {
      throw new Error('Demoting staff to member directly is not supported.');
    }

    const result = await functionsService.setStaffRole({
      targetUid: uid,
      newRole: newRole as 'trainer' | 'admin' | 'owner'
    });

    if (!result.success) {
      throw new Error('Failed to update staff role.');
    }
  },

  /**
   * Update staff non-privileged profile details (bio, specialty, phone)
   * Enforces that privileged fields (role, isActive, authUid, authLinked, gymId) are never modified directly.
   */
  async updateStaffProfile(uid: string, updates: Partial<UserProfile>, _actorName?: string): Promise<void> {
    // Strip any privileged fields from client update
    const safeUpdates: Partial<UserProfile> = { ...updates };
    delete safeUpdates.role;
    delete safeUpdates.isActive;
    delete safeUpdates.authUid;
    delete safeUpdates.authLinked;
    delete safeUpdates.gymId;
    delete safeUpdates.id;
    delete safeUpdates.uid;

    const path = `${PROFILES_COLLECTION}/${uid}`;
    try {
      const ref = doc(db, PROFILES_COLLECTION, uid);
      await setDoc(ref, {
        ...safeUpdates,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // If updated fields affect trainer public profile, sync safe display fields
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const fullProfile = { ...snap.data(), id: uid } as UserProfile;
        if (fullProfile.role === 'trainer') {
          await trainerService.syncPublicTrainer(fullProfile);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Remove / safely deactivate a staff account
   * PRIVILEGED OPERATION: Executed authoritatively via Firebase Functions backend (Owner only).
   */
  async deleteStaffMember(uid: string, _actorName?: string): Promise<void> {
    const result = await functionsService.deleteStaffMember({
      targetUid: uid
    });

    if (!result.success) {
      throw new Error('Failed to delete staff member on server.');
    }
  }
};
