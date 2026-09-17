import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { UserProfile, PaymentRecord, UserRole } from '../types';

export interface CreateStaffAccountPayload {
  fullName: string;
  email: string;
  phone?: string;
  role: 'trainer' | 'admin' | 'owner';
  fitnessGoal?: string;
  experience?: string;
  bio?: string;
  trainerNotes?: string;
  avatarUrl?: string;
  gymId?: string;
}

export interface SetStaffRolePayload {
  targetUid: string;
  newRole: 'trainer' | 'admin' | 'owner';
}

export interface SetStaffActiveStatusPayload {
  targetUid: string;
  isActive: boolean;
}

export interface DeleteStaffPayload {
  targetUid: string;
}

export interface RecordPaymentPayload {
  memberUid: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  planId?: string;
  notes?: string;
}

/**
 * Standardized Firebase Functions Error extractor
 */
function extractCallableError(err: any): Error {
  const message = err?.message || err?.details || 'Backend operation failed.';
  const code = err?.code || '';
  if (code === 'functions/permission-denied' || message.includes('permission-denied')) {
    return new Error(message || 'Access denied: You do not have permission for this privileged operation.');
  }
  if (code === 'functions/already-exists' || message.includes('already exists')) {
    return new Error(message || 'An account with this email address already exists.');
  }
  if (code === 'functions/unauthenticated' || message.includes('unauthenticated')) {
    return new Error('Session expired or unauthenticated. Please sign in again.');
  }
  return new Error(message);
}

export const functionsService = {
  /**
   * Authoritative staff provisioning via Firebase Functions backend.
   * Creates Auth user & canonical Firestore profile.
   */
  async createStaffAccount(payload: CreateStaffAccountPayload): Promise<{
    success: boolean;
    profile: UserProfile;
    resetLink?: string;
  }> {
    try {
      const callable = httpsCallable<CreateStaffAccountPayload, {
        success: boolean;
        profile: UserProfile;
        resetLink?: string;
      }>(functions, 'createStaffAccount');

      const res = await callable(payload);
      return res.data;
    } catch (err: any) {
      console.error('[FUNCTIONS ERROR] createStaffAccount failed:', err);
      throw extractCallableError(err);
    }
  },

  /**
   * Authoritative staff role modification.
   * Owner only. Synchronizes Firestore role, Auth custom claims, and public trainer cards.
   */
  async setStaffRole(payload: SetStaffRolePayload): Promise<{
    success: boolean;
    targetUid: string;
    newRole: UserRole;
  }> {
    try {
      const callable = httpsCallable<SetStaffRolePayload, {
        success: boolean;
        targetUid: string;
        newRole: UserRole;
      }>(functions, 'setStaffRole');

      const res = await callable(payload);
      return res.data;
    } catch (err: any) {
      console.error('[FUNCTIONS ERROR] setStaffRole failed:', err);
      throw extractCallableError(err);
    }
  },

  /**
   * Authoritative staff active status toggle.
   * Suspends or activates staff accounts.
   */
  async setStaffActiveStatus(payload: SetStaffActiveStatusPayload): Promise<{
    success: boolean;
    targetUid: string;
    isActive: boolean;
  }> {
    try {
      const callable = httpsCallable<SetStaffActiveStatusPayload, {
        success: boolean;
        targetUid: string;
        isActive: boolean;
      }>(functions, 'setStaffActiveStatus');

      const res = await callable(payload);
      return res.data;
    } catch (err: any) {
      console.error('[FUNCTIONS ERROR] setStaffActiveStatus failed:', err);
      throw extractCallableError(err);
    }
  },

  /**
   * Authoritative staff removal / safe deactivation.
   * Owner only.
   */
  async deleteStaffMember(payload: DeleteStaffPayload): Promise<{
    success: boolean;
    targetUid: string;
  }> {
    try {
      const callable = httpsCallable<DeleteStaffPayload, {
        success: boolean;
        targetUid: string;
      }>(functions, 'deleteStaffMember');

      const res = await callable(payload);
      return res.data;
    } catch (err: any) {
      console.error('[FUNCTIONS ERROR] deleteStaffMember failed:', err);
      throw extractCallableError(err);
    }
  },

  /**
   * Authoritative financial payment recording.
   * Verifies member profile, logs immutable payment, updates plan extension, and logs server audit.
   */
  async recordPayment(payload: RecordPaymentPayload): Promise<{
    success: boolean;
    paymentId: string;
    payment: PaymentRecord;
    membershipExtended?: boolean;
  }> {
    try {
      const callable = httpsCallable<RecordPaymentPayload, {
        success: boolean;
        paymentId: string;
        payment: PaymentRecord;
        membershipExtended?: boolean;
      }>(functions, 'recordPayment');

      const res = await callable(payload);
      return res.data;
    } catch (err: any) {
      console.error('[FUNCTIONS ERROR] recordPayment failed:', err);
      throw extractCallableError(err);
    }
  }
};
