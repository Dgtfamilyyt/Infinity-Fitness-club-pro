import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { PersonalRecord } from '../types';
import { INITIAL_PERSONAL_RECORDS } from './seedData';
import { isDevDemoEnabled } from './devMode';
import { auditService } from './auditService';
import { DEFAULT_GYM_ID } from './gymSettingsService';

const PR_COLLECTION = 'personal_records';

export const progressService = {
  async getPersonalRecords(memberId?: string): Promise<PersonalRecord[]> {
    try {
      let q = query(collection(db, PR_COLLECTION));
      if (memberId) {
        q = query(collection(db, PR_COLLECTION), where('memberId', '==', memberId));
      }
      const snap = await getDocs(q);
      if (snap.empty) {
        if (!isDevDemoEnabled()) return [];
        return memberId ? INITIAL_PERSONAL_RECORDS.filter(p => p.memberId === memberId) : INITIAL_PERSONAL_RECORDS;
      }
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as PersonalRecord));
    } catch (error) {
      console.warn('Could not load personal records from Firestore:', error);
      if (!isDevDemoEnabled()) return [];
      return INITIAL_PERSONAL_RECORDS;
    }
  },

  subscribePersonalRecords(memberId: string, callback: (prs: PersonalRecord[]) => void): () => void {
    const q = query(collection(db, PR_COLLECTION), where('memberId', '==', memberId));
    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as PersonalRecord)));
        } else {
          callback(isDevDemoEnabled() ? INITIAL_PERSONAL_RECORDS.filter(p => p.memberId === memberId) : []);
        }
      },
      (error) => {
        console.warn('PR snapshot listener error:', error);
        callback(isDevDemoEnabled() ? INITIAL_PERSONAL_RECORDS.filter(p => p.memberId === memberId) : []);
      }
    );
  },

  async recordPR(pr: Omit<PersonalRecord, 'id'>, actorName: string): Promise<PersonalRecord> {
    const id = `pr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const path = `${PR_COLLECTION}/${id}`;
    const newRecord: PersonalRecord = {
      ...pr,
      id
    };

    try {
      const ref = doc(db, PR_COLLECTION, id);
      await setDoc(ref, {
        ...newRecord,
        gymId: DEFAULT_GYM_ID,
        createdAt: serverTimestamp()
      });

      await auditService.logAuditEvent(
        actorName,
        'RECORD_PR',
        'PersonalRecord',
        id,
        `Logged PR for ${pr.exercise}: ${pr.weightKg}kg x ${pr.reps} reps`
      );

      return newRecord;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
};
