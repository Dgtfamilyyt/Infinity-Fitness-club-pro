import { 
  collection, 
  getDocs, 
  onSnapshot, 
  query, 
  where,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, PublicTrainer } from '../types';
import { INITIAL_PUBLIC_TRAINERS } from './seedData';
import { isDevDemoEnabled } from './devMode';

export const PUBLIC_TRAINERS_COLLECTION = 'public_trainers';
const PROFILES_COLLECTION = 'profiles';

export const trainerService = {
  /**
   * Fetches public trainers for unauthenticated visitors & public landing.
   * Exclusively reads from public_trainers collection where isPublic == true.
   * If empty in production, returns empty array (neutral UI state).
   */
  async getPublicTrainers(): Promise<PublicTrainer[]> {
    try {
      const q = query(
        collection(db, PUBLIC_TRAINERS_COLLECTION),
        where('isPublic', '==', true)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        return isDevDemoEnabled() ? INITIAL_PUBLIC_TRAINERS : [];
      }
      return snap.docs
        .map(d => {
          const data = d.data();
          return {
            id: d.id,
            displayName: data.displayName || '',
            avatarUrl: data.avatarUrl || '',
            specialty: data.specialty || '',
            experience: data.experience || '',
            bio: data.bio || '',
            displayOrder: data.displayOrder ?? 99,
            isPublic: Boolean(data.isPublic),
            gymId: 'infinity-neelambur'
          } as PublicTrainer;
        })
        .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
    } catch (error) {
      console.warn('Could not read public trainers from Firestore:', error);
      return isDevDemoEnabled() ? INITIAL_PUBLIC_TRAINERS : [];
    }
  },

  /**
   * Real-time subscription to public coaches directory (public_trainers where isPublic == true).
   * Never queries private profiles collection.
   */
  subscribePublicTrainers(callback: (trainers: PublicTrainer[]) => void): () => void {
    const q = query(
      collection(db, PUBLIC_TRAINERS_COLLECTION),
      where('isPublic', '==', true)
    );
    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const trainers = snap.docs
            .map(d => {
              const data = d.data();
              return {
                id: d.id,
                displayName: data.displayName || '',
                avatarUrl: data.avatarUrl || '',
                specialty: data.specialty || '',
                experience: data.experience || '',
                bio: data.bio || '',
                displayOrder: data.displayOrder ?? 99,
                isPublic: Boolean(data.isPublic),
                gymId: 'infinity-neelambur'
              } as PublicTrainer;
            })
            .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
          callback(trainers);
        } else {
          callback(isDevDemoEnabled() ? INITIAL_PUBLIC_TRAINERS : []);
        }
      },
      (error) => {
        console.warn('Public trainers snapshot listener warning:', error);
        callback(isDevDemoEnabled() ? INITIAL_PUBLIC_TRAINERS : []);
      }
    );
  },

  /**
   * Syncs safe display fields into public_trainers/{trainerId} for authorized admin/owner workflows.
   * Only sanitized fields may be copied:
   * displayName, avatarUrl, specialty, experience, bio, displayOrder, isPublic, gymId.
   * STRICT PRIVACY: NEVER copies email, phone, authUid, uid, trainerNotes,
   * payments, restrictions, or internal metadata.
   */
  async syncPublicTrainer(profile: UserProfile, isPublicOverride?: boolean): Promise<void> {
    if (profile.role !== 'trainer') return;
    try {
      const ref = doc(db, PUBLIC_TRAINERS_COLLECTION, profile.id);
      const isPublic = isPublicOverride !== undefined 
        ? isPublicOverride 
        : (profile.isActive === true);

      const safeDoc: PublicTrainer = {
        id: profile.id,
        displayName: profile.fullName || 'Certified Floor Coach',
        gymId: 'infinity-neelambur',
        isPublic,
        displayOrder: typeof profile.displayOrder === 'number' ? profile.displayOrder : 1
      };

      if (profile.avatarUrl) safeDoc.avatarUrl = profile.avatarUrl;
      if (profile.fitnessGoal) safeDoc.specialty = profile.fitnessGoal;
      if (profile.experience) safeDoc.experience = profile.experience;
      if (profile.bio) safeDoc.bio = profile.bio;

      await setDoc(ref, safeDoc);
    } catch (error) {
      console.warn('Could not sync public trainer document:', error);
    }
  },

  /**
   * Sets the public visibility of a coach card in public_trainers.
   * If a trainer is deactivated, their private profile remains intact in profiles/{uid}
   * while isPublic is set to false in public_trainers/{trainerId}.
   */
  async setPublicTrainerVisibility(trainerId: string, isPublic: boolean): Promise<void> {
    try {
      const ref = doc(db, PUBLIC_TRAINERS_COLLECTION, trainerId);
      await updateDoc(ref, { isPublic });
    } catch (error) {
      console.warn('Could not update public trainer visibility:', error);
    }
  },

  /**
   * Deletes public trainer card when deleted by owner.
   */
  async deletePublicTrainer(trainerId: string): Promise<void> {
    try {
      const ref = doc(db, PUBLIC_TRAINERS_COLLECTION, trainerId);
      await deleteDoc(ref);
    } catch (error) {
      console.warn('Could not delete public trainer document:', error);
    }
  },

  /**
   * Updates internal private trainer profile in profiles/{uid}.
   * Note: Does NOT silently sync trainer self-edits directly into public_trainers.
   * Public-facing publication into public_trainers/{trainerId} requires admin/owner approval.
   */
  async updateTrainer(trainer: UserProfile): Promise<void> {
    try {
      const ref = doc(db, PROFILES_COLLECTION, trainer.id);
      await setDoc(ref, {
        ...trainer,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.warn('Could not persist trainer update to Firestore:', error);
    }
  }
};
