import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

export interface CallerContext {
  uid: string;
  email: string;
  fullName: string;
  role: 'member' | 'trainer' | 'admin' | 'owner';
  gymId: string;
  isActive: boolean;
  profileDoc: admin.firestore.DocumentData;
}

export const CANONICAL_GYM_ID = 'infinity-neelambur';

/**
 * Validates that request.auth exists.
 * Throws unauthenticated HttpsError if missing.
 */
export function requireAuthenticated(auth: { uid: string; token: any } | undefined): { uid: string; email: string } {
  if (!auth || !auth.uid) {
    throw new HttpsError('unauthenticated', 'The operation requires an authenticated Firebase user session.');
  }
  return {
    uid: auth.uid,
    email: (auth.token && auth.token.email) ? String(auth.token.email).trim().toLowerCase() : ''
  };
}

/**
 * Authoritative Server-side Profile Loader.
 * Reads profiles/{uid} from Firestore using Admin SDK.
 * Enforces isActive == true, validates role, and gymId == 'infinity-neelambur'.
 * Never trusts caller-provided role or actor identity.
 */
export async function getCallerContext(auth: { uid: string; token: any } | undefined): Promise<CallerContext> {
  const { uid, email } = requireAuthenticated(auth);
  const db = admin.firestore();
  const profileSnap = await db.collection('profiles').doc(uid).get();

  if (!profileSnap.exists) {
    // Retain temporary bootstrap fallback for dgtfamilyyt8@gmail.com until canonical owner profile is confirmed
    if (email === 'dgtfamilyyt8@gmail.com') {
      return {
        uid,
        email,
        fullName: 'Emergency Owner',
        role: 'owner',
        gymId: CANONICAL_GYM_ID,
        isActive: true,
        profileDoc: { uid, email, role: 'owner', gymId: CANONICAL_GYM_ID, isActive: true }
      };
    }
    throw new HttpsError('permission-denied', `No profile found for authenticated account (${uid}).`);
  }

  const profile = profileSnap.data()!;

  if (profile.isActive !== true) {
    throw new HttpsError('permission-denied', 'Account is suspended or inactive.');
  }

  const role = profile.role as 'member' | 'trainer' | 'admin' | 'owner';
  if (!['member', 'trainer', 'admin', 'owner'].includes(role)) {
    throw new HttpsError('permission-denied', `Invalid account role: ${role}`);
  }

  const gymId = profile.gymId || CANONICAL_GYM_ID;
  if (gymId !== CANONICAL_GYM_ID) {
    throw new HttpsError('permission-denied', `Account is restricted to ${CANONICAL_GYM_ID}.`);
  }

  return {
    uid,
    email: (profile.email ? String(profile.email).trim().toLowerCase() : '') || email,
    fullName: profile.fullName || 'Staff Member',
    role,
    gymId,
    isActive: true,
    profileDoc: profile
  };
}

/**
 * Requires caller to be an active staff member (trainer, admin, or owner)
 */
export async function requireActiveStaff(auth: { uid: string; token: any } | undefined): Promise<CallerContext> {
  const caller = await getCallerContext(auth);
  if (!['trainer', 'admin', 'owner'].includes(caller.role)) {
    throw new HttpsError('permission-denied', 'Only active staff members are authorized.');
  }
  return caller;
}

/**
 * Requires caller to be an active Admin or Owner
 */
export async function requireAdminOrOwner(auth: { uid: string; token: any } | undefined): Promise<CallerContext> {
  const caller = await getCallerContext(auth);
  if (!['admin', 'owner'].includes(caller.role)) {
    throw new HttpsError('permission-denied', 'Admin or Owner privileges are required for this action.');
  }
  return caller;
}

/**
 * Requires caller to be an active Owner
 */
export async function requireOwner(auth: { uid: string; token: any } | undefined): Promise<CallerContext> {
  const caller = await getCallerContext(auth);
  if (caller.role !== 'owner') {
    throw new HttpsError('permission-denied', 'Strict Owner privileges are required for this action.');
  }
  return caller;
}
