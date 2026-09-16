import { 
  collection, 
  getDocs, 
  onSnapshot, 
  query, 
  where,
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { INITIAL_TRAINERS } from './seedData';

const PROFILES_COLLECTION = 'profiles';

export const trainerService = {
  async getTrainers(): Promise<UserProfile[]> {
    try {
      const q = query(
        collection(db, PROFILES_COLLECTION),
        where('role', '==', 'trainer')
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        return INITIAL_TRAINERS;
      }
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as UserProfile));
    } catch (error) {
      console.warn('Could not read trainers from Firestore, using initial:', error);
      return INITIAL_TRAINERS;
    }
  },

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
  },

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
          callback(INITIAL_TRAINERS);
        }
      },
      (error) => {
        console.warn('Trainers snapshot listener error:', error);
        callback(INITIAL_TRAINERS);
      }
    );
  }
};
