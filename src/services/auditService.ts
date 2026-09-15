import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AuditLog } from '../types';

const AUDIT_COLLECTION = 'audit_logs';

export const auditService = {
  async logAuditEvent(
    actor: string,
    action: string,
    targetEntity: string,
    targetId: string,
    details?: string
  ): Promise<void> {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ref = doc(db, AUDIT_COLLECTION, id);
    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      await setDoc(ref, {
        id,
        actor,
        action,
        targetEntity,
        targetId,
        details: details || '',
        timestamp: formattedTime,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.warn('Audit log write failed (continuing operation):', error);
    }
  },

  async getAuditLogs(limitCount = 50): Promise<AuditLog[]> {
    try {
      const q = query(
        collection(db, AUDIT_COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as AuditLog);
    } catch (error) {
      console.warn('Audit logs list permission or network notice:', error);
      return [];
    }
  },

  subscribeAuditLogs(callback: (logs: AuditLog[]) => void): () => void {
    const q = query(
      collection(db, AUDIT_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    return onSnapshot(
      q,
      (snap) => {
        const logs = snap.docs.map(d => d.data() as AuditLog);
        callback(logs);
      },
      (error) => {
        console.warn('Audit logs subscription inactive (admin authorization required):', error);
        callback([]);
      }
    );
  }
};
