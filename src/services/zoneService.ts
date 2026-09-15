import { 
  collection, 
  doc, 
  getDocs, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { GymZone, ZoneStatus } from '../types';
import { INITIAL_ZONES } from './seedData';
import { auditService } from './auditService';

const ZONES_COLLECTION = 'gym_zones';

export const zoneService = {
  async getZones(): Promise<GymZone[]> {
    try {
      const q = query(collection(db, ZONES_COLLECTION), orderBy('displayOrder', 'asc'));
      const snap = await getDocs(q);
      if (snap.empty) {
        return INITIAL_ZONES;
      }
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as GymZone));
    } catch (error) {
      console.warn('Could not read gym_zones from Firestore, using initial:', error);
      return INITIAL_ZONES;
    }
  },

  subscribeZones(callback: (zones: GymZone[]) => void): () => void {
    const q = query(collection(db, ZONES_COLLECTION), orderBy('displayOrder', 'asc'));
    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const zones = snap.docs.map(d => ({ ...d.data(), id: d.id } as GymZone));
          callback(zones);
        } else {
          callback(INITIAL_ZONES);
        }
      },
      (error) => {
        console.warn('Zones snapshot listener error:', error);
        callback(INITIAL_ZONES);
      }
    );
  },

  async updateZoneCapacity(zoneId: string, capacity: number, actorName: string): Promise<void> {
    const path = `${ZONES_COLLECTION}/${zoneId}`;
    try {
      const ref = doc(db, ZONES_COLLECTION, zoneId);
      await updateDoc(ref, {
        capacity: Number(capacity),
        updatedAt: serverTimestamp()
      });

      await auditService.logAuditEvent(
        actorName,
        'ZONE_CAPACITY_CHANGED',
        'GymZone',
        zoneId,
        `Adjusted floor capacity to ${capacity} bays`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};
