import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { GymSettings } from '../types';
import { INITIAL_GYM_SETTINGS } from './seedData';
import { auditService } from './auditService';

export const DEFAULT_GYM_ID = 'infinity-neelambur';
const GYMS_COLLECTION = 'gyms';

export const gymSettingsService = {
  async getSettings(gymId: string = DEFAULT_GYM_ID): Promise<GymSettings> {
    try {
      const ref = doc(db, GYMS_COLLECTION, gymId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as GymSettings;
      }
      return INITIAL_GYM_SETTINGS;
    } catch (error) {
      console.warn('Could not read gym settings from Firestore, using initial:', error);
      return INITIAL_GYM_SETTINGS;
    }
  },

  subscribeSettings(gymId: string = DEFAULT_GYM_ID, callback: (settings: GymSettings) => void): () => void {
    const ref = doc(db, GYMS_COLLECTION, gymId);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          callback(snap.data() as GymSettings);
        } else {
          callback(INITIAL_GYM_SETTINGS);
        }
      },
      (error) => {
        console.warn('Gym settings snapshot error:', error);
        callback(INITIAL_GYM_SETTINGS);
      }
    );
  },

  async updateSettings(settings: Partial<GymSettings>, actorName: string, gymId: string = DEFAULT_GYM_ID): Promise<void> {
    const path = `${GYMS_COLLECTION}/${gymId}`;
    try {
      const ref = doc(db, GYMS_COLLECTION, gymId);
      await setDoc(ref, {
        ...INITIAL_GYM_SETTINGS,
        ...settings,
        id: gymId,
        slug: gymId,
        updatedAt: serverTimestamp()
      }, { merge: true });

      await auditService.logAuditEvent(
        actorName,
        'UPDATE_GYM_SETTINGS',
        'GymSettings',
        gymId,
        `Updated settings for ${settings.name || gymId}`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};
