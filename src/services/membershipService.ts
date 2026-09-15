import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { MembershipPlan, MemberStatus } from '../types';
import { INITIAL_PLANS } from './seedData';
import { auditService } from './auditService';
import { DEFAULT_GYM_ID } from './gymSettingsService';

const PLANS_COLLECTION = 'membership_plans';
const MEMBERSHIPS_COLLECTION = 'memberships';

export interface MembershipRecord {
  id: string;
  gymId: string;
  memberUid: string;
  planId: string;
  planName: string;
  status: MemberStatus;
  startDate: string;
  expiryDate: string;
  freezeStart?: string | null;
  freezeEnd?: string | null;
  createdAt: any;
  updatedAt: any;
}

export const membershipService = {
  async getPlans(): Promise<MembershipPlan[]> {
    try {
      const q = query(collection(db, PLANS_COLLECTION), orderBy('displayOrder', 'asc'));
      const snap = await getDocs(q);
      if (snap.empty) {
        return INITIAL_PLANS;
      }
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as MembershipPlan));
    } catch (error) {
      console.warn('Could not read membership_plans, using initial:', error);
      return INITIAL_PLANS;
    }
  },

  subscribePlans(callback: (plans: MembershipPlan[]) => void): () => void {
    const q = query(collection(db, PLANS_COLLECTION), orderBy('displayOrder', 'asc'));
    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const plans = snap.docs.map(d => ({ ...d.data(), id: d.id } as MembershipPlan));
          callback(plans);
        } else {
          callback(INITIAL_PLANS);
        }
      },
      (error) => {
        console.warn('Plans snapshot listener error:', error);
        callback(INITIAL_PLANS);
      }
    );
  },

  async getMembershipForMember(memberUid: string): Promise<MembershipRecord | null> {
    try {
      const q = query(
        collection(db, MEMBERSHIPS_COLLECTION),
        where('memberUid', '==', memberUid),
        where('gymId', '==', DEFAULT_GYM_ID)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return { ...snap.docs[0].data(), id: snap.docs[0].id } as MembershipRecord;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${MEMBERSHIPS_COLLECTION}/${memberUid}`);
    }
  },

  subscribeMemberMembership(memberUid: string, callback: (mem: MembershipRecord | null) => void): () => void {
    const q = query(
      collection(db, MEMBERSHIPS_COLLECTION),
      where('memberUid', '==', memberUid)
    );
    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          callback({ ...snap.docs[0].data(), id: snap.docs[0].id } as MembershipRecord);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.warn('Membership snapshot error:', error);
        callback(null);
      }
    );
  },

  async adjustMembership(
    memberUid: string, 
    updates: Partial<MembershipRecord>, 
    actorName: string
  ): Promise<void> {
    const membershipId = `mem_${memberUid}`;
    const path = `${MEMBERSHIPS_COLLECTION}/${membershipId}`;
    try {
      const ref = doc(db, MEMBERSHIPS_COLLECTION, membershipId);
      await setDoc(ref, {
        ...updates,
        memberUid,
        gymId: DEFAULT_GYM_ID,
        updatedAt: serverTimestamp()
      }, { merge: true });

      await auditService.logAuditEvent(
        actorName,
        'ADJUST_MEMBERSHIP',
        'Membership',
        membershipId,
        `Adjusted status or dates for member ${memberUid}`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};
