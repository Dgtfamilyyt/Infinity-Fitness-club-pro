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
import { PaymentRecord } from '../types';
import { INITIAL_PAYMENTS } from './seedData';
import { auditService } from './auditService';
import { DEFAULT_GYM_ID } from './gymSettingsService';

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
        return INITIAL_PAYMENTS;
      }
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as PaymentRecord));
    } catch (error) {
      console.warn('Could not read payments from Firestore, using initial:', error);
      return INITIAL_PAYMENTS;
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
          callback(INITIAL_PAYMENTS);
        }
      },
      (error) => {
        console.warn('Payments snapshot error:', error);
        callback(INITIAL_PAYMENTS);
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

  async recordPayment(payment: {
    memberId: string;
    memberName: string;
    planName: string;
    amount: number;
    paymentMethod: PaymentRecord['paymentMethod'];
    reference: string;
    recordedBy: string;
    notes?: string;
  }): Promise<PaymentRecord> {
    const id = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const dateStr = new Date().toISOString().split('T')[0];
    const path = `${PAYMENTS_COLLECTION}/${id}`;

    const newRecord: PaymentRecord = {
      id,
      memberId: payment.memberId,
      memberName: payment.memberName,
      planName: payment.planName,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      reference: payment.reference,
      date: dateStr,
      recordedBy: payment.recordedBy,
      notes: payment.notes || ''
    };

    try {
      const ref = doc(db, PAYMENTS_COLLECTION, id);
      await setDoc(ref, {
        ...newRecord,
        gymId: DEFAULT_GYM_ID,
        createdAt: serverTimestamp()
      });

      await auditService.logAuditEvent(
        payment.recordedBy,
        'PAYMENT_RECORDED',
        'Payment',
        id,
        `Recorded ${payment.amount} INR via ${payment.paymentMethod} from ${payment.memberName} (${payment.reference})`
      );

      return newRecord;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
};
