import { 
  collection, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PaymentRecord } from '../types';
import { INITIAL_PAYMENTS } from './seedData';
import { isDevDemoEnabled } from './devMode';
import { DEFAULT_GYM_ID } from './gymSettingsService';
import { functionsService } from './functionsService';

const PAYMENTS_COLLECTION = 'payments';

export const paymentService = {
  async getPayments(): Promise<PaymentRecord[]> {
    try {
      const q = query(
        collection(db, PAYMENTS_COLLECTION),
        where('gymId', '==', DEFAULT_GYM_ID),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        return isDevDemoEnabled() ? INITIAL_PAYMENTS : [];
      }
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as PaymentRecord));
    } catch (error) {
      console.warn('Could not read payments from Firestore:', error);
      return isDevDemoEnabled() ? INITIAL_PAYMENTS : [];
    }
  },

  subscribePayments(callback: (payments: PaymentRecord[]) => void): () => void {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('gymId', '==', DEFAULT_GYM_ID)
    );
    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const payments = snap.docs.map(d => ({ ...d.data(), id: d.id } as PaymentRecord));
          callback(payments);
        } else {
          callback(isDevDemoEnabled() ? INITIAL_PAYMENTS : []);
        }
      },
      (error) => {
        console.warn('Payments snapshot error:', error);
        callback(isDevDemoEnabled() ? INITIAL_PAYMENTS : []);
      }
    );
  },

  subscribeMemberPayments(memberId: string, callback: (payments: PaymentRecord[]) => void): () => void {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('memberId', '==', memberId)
    );
    return onSnapshot(
      q,
      (snap) => {
        const payments = snap.docs.map(d => ({ ...d.data(), id: d.id } as PaymentRecord));
        callback(payments);
      },
      (error) => {
        console.warn('Member payments snapshot error:', error);
        callback([]);
      }
    );
  },

  /**
   * Record a financial payment
   * PRIVILEGED OPERATION: Dispatched authoritatively to Firebase Functions backend.
   * Actor identity and timestamp are derived server-side.
   */
  async recordPayment(payment: {
    memberId: string;
    memberName?: string;
    planName?: string;
    amount: number;
    paymentMethod: PaymentRecord['paymentMethod'] | string;
    reference?: string;
    recordedBy?: string;
    planId?: string;
    notes?: string;
  }): Promise<PaymentRecord> {
    const res = await functionsService.recordPayment({
      memberUid: payment.memberId,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      reference: payment.reference,
      planId: payment.planId,
      notes: payment.notes
    });

    if (!res.success || !res.payment) {
      throw new Error('Payment recording failed on backend.');
    }

    return res.payment;
  }
};
