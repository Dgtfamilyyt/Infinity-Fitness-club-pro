import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import { 
  requireAdminOrOwner, 
  requireOwner, 
  CANONICAL_GYM_ID 
} from './authz';
import { writeServerAudit } from './audit';

export interface CreateStaffAccountData {
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

export interface SetStaffRoleData {
  targetUid: string;
  newRole: 'trainer' | 'admin' | 'owner';
}

export interface SetStaffActiveStatusData {
  targetUid: string;
  isActive: boolean;
}

export interface DeleteStaffData {
  targetUid: string;
}

/**
 * Normalizes email address and calculates SHA-256 hash
 */
function getEmailHash(email: string): { normalizedEmail: string; emailHash: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const emailHash = crypto.createHash('sha256').update(normalizedEmail).digest('hex');
  return { normalizedEmail, emailHash };
}

/**
 * Callable Function: createStaffAccount
 * Creates a verified Firebase Auth user (if needed) and authoritative Firestore profile.
 * Strictly checks caller role: Admins may create trainers only; Owners may create any staff role.
 */
export async function handleCreateStaffAccount(
  data: CreateStaffAccountData,
  auth: { uid: string; token: any } | undefined
) {
  const caller = await requireAdminOrOwner(auth);

  // Role validation
  if (!['trainer', 'admin', 'owner'].includes(data.role)) {
    throw new HttpsError('invalid-argument', `Invalid staff role "${data.role}". Must be trainer, admin, or owner.`);
  }

  // Admin boundary: Admin may create trainer accounts only
  if (caller.role === 'admin' && data.role !== 'trainer') {
    throw new HttpsError('permission-denied', 'Admins are authorized to create trainer accounts only.');
  }

  const fullName = (data.fullName || '').trim();
  if (!fullName) {
    throw new HttpsError('invalid-argument', 'Full name is required.');
  }

  const { normalizedEmail, emailHash } = getEmailHash(data.email || '');
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new HttpsError('invalid-argument', 'A valid email address is required.');
  }

  const db = admin.firestore();

  // 1. Prevent duplicate active profiles
  const existingProfileQuery = await db.collection('profiles')
    .where('email', '==', normalizedEmail)
    .limit(1)
    .get();

  if (!existingProfileQuery.empty) {
    const existingDoc = existingProfileQuery.docs[0].data();
    if (existingDoc.isActive === true) {
      throw new HttpsError('already-exists', `An active account already exists with email ${normalizedEmail}.`);
    }
  }

  // 2. Manage Firebase Auth User
  let authUid: string;
  let resetLink: string | null = null;

  try {
    const existingAuthUser = await admin.auth().getUserByEmail(normalizedEmail);
    authUid = existingAuthUser.uid;
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      // Create new Auth user record without password
      const newAuthUser = await admin.auth().createUser({
        email: normalizedEmail,
        displayName: fullName
      });
      authUid = newAuthUser.uid;

      // Generate initial password reset/activation link
      try {
        resetLink = await admin.auth().generatePasswordResetLink(normalizedEmail);
      } catch (linkErr) {
        console.warn('Password reset link generation note:', linkErr);
      }
    } else {
      throw new HttpsError('internal', `Auth user lookup failed: ${err.message}`);
    }
  }

  // 3. Set Custom Claims for Privileged Access (server-side only)
  try {
    await admin.auth().setCustomUserClaims(authUid, {
      role: data.role,
      gymId: CANONICAL_GYM_ID
    });
  } catch (claimErr) {
    console.warn('Could not set custom user claims:', claimErr);
  }

  // 4. Create authoritative profiles/{authUid}
  // CANONICAL DOC ID IS THE AUTH UID (never random staff_* IDs)
  const defaultAvatar = data.role === 'trainer'
    ? 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80';

  const staffProfileDoc: Record<string, any> = {
    id: authUid,
    uid: authUid,
    authUid: authUid,
    authLinked: true,
    fullName,
    email: normalizedEmail,
    phone: (data.phone || '').trim(),
    role: data.role,
    gymId: CANONICAL_GYM_ID,
    isActive: true,
    avatarUrl: data.avatarUrl || defaultAvatar,
    fitnessGoal: data.fitnessGoal || (
      data.role === 'trainer'
        ? 'Floor Strength & Conditioning Specialist'
        : data.role === 'admin'
        ? 'Reception & Front Desk Lead'
        : 'Club Management'
    ),
    experience: data.experience || (data.role === 'trainer' ? 'Certified Coach' : undefined),
    bio: data.bio || '',
    trainerNotes: data.trainerNotes || '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('profiles').doc(authUid).set(staffProfileDoc, { merge: true });

  // 5. Create or sync pre_registration_links/{emailHash}
  await db.collection('pre_registration_links').doc(emailHash).set({
    emailHash,
    emailNormalized: normalizedEmail,
    profileDocId: authUid,
    gymId: CANONICAL_GYM_ID,
    role: data.role,
    authUid: authUid,
    authLinked: true,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // 6. If role === 'trainer', sync strictly sanitized public display fields
  if (data.role === 'trainer') {
    const publicTrainerDoc = {
      id: authUid,
      displayName: fullName,
      avatarUrl: staffProfileDoc.avatarUrl,
      specialty: staffProfileDoc.fitnessGoal,
      experience: staffProfileDoc.experience || 'Certified Coach',
      bio: staffProfileDoc.bio || '',
      displayOrder: 1,
      isPublic: true,
      gymId: CANONICAL_GYM_ID
    };
    await db.collection('public_trainers').doc(authUid).set(publicTrainerDoc);
  }

  // 7. Write server-side audit event
  const actionName = data.role === 'owner' 
    ? 'OWNER_CREATED' 
    : data.role === 'admin' 
    ? 'ADMIN_CREATED' 
    : 'STAFF_CREATED';

  await writeServerAudit(caller, {
    action: actionName,
    targetEntity: 'UserProfile',
    targetId: authUid,
    details: `Created ${data.role.toUpperCase()} account for ${fullName} (${normalizedEmail})`
  });

  return {
    success: true,
    profile: {
      ...staffProfileDoc,
      createdAt: new Date().toISOString()
    },
    resetLink: resetLink || undefined
  };
}

/**
 * Callable Function: setStaffRole
 * Strictly Owner-only. Updates staff role, updates claims, adjusts public trainer visibility.
 */
export async function handleSetStaffRole(
  data: SetStaffRoleData,
  auth: { uid: string; token: any } | undefined
) {
  const caller = await requireOwner(auth);

  if (!data.targetUid || typeof data.targetUid !== 'string') {
    throw new HttpsError('invalid-argument', 'Target staff UID is required.');
  }

  if (!['trainer', 'admin', 'owner'].includes(data.newRole)) {
    throw new HttpsError('invalid-argument', `Invalid role "${data.newRole}". Must be trainer, admin, or owner.`);
  }

  const db = admin.firestore();
  const profileRef = db.collection('profiles').doc(data.targetUid);
  const profileSnap = await profileRef.get();

  if (!profileSnap.exists) {
    throw new HttpsError('not-found', `Staff profile ${data.targetUid} not found.`);
  }

  const currentProfile = profileSnap.data()!;
  const oldRole = currentProfile.role;

  // Prevent demoting another owner unless intentional
  if (oldRole === 'owner' && data.targetUid === caller.uid && data.newRole !== 'owner') {
    throw new HttpsError('invalid-argument', 'You cannot demote your own active owner account.');
  }

  // Update profile
  await profileRef.update({
    role: data.newRole,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Update Custom Claims
  try {
    await admin.auth().setCustomUserClaims(data.targetUid, {
      role: data.newRole,
      gymId: CANONICAL_GYM_ID
    });
  } catch (claimErr) {
    console.warn('Could not update custom user claims:', claimErr);
  }

  // Synchronize public trainer directory
  const publicRef = db.collection('public_trainers').doc(data.targetUid);
  if (data.newRole === 'trainer') {
    await publicRef.set({
      id: data.targetUid,
      displayName: currentProfile.fullName || 'Certified Floor Coach',
      avatarUrl: currentProfile.avatarUrl || '',
      specialty: currentProfile.fitnessGoal || 'Strength & Conditioning',
      experience: currentProfile.experience || 'Certified Coach',
      bio: currentProfile.bio || '',
      displayOrder: 1,
      isPublic: currentProfile.isActive === true,
      gymId: CANONICAL_GYM_ID
    }, { merge: true });
  } else {
    // Demoted from trainer: hide or deactivate public trainer card
    await publicRef.set({ isPublic: false }, { merge: true });
  }

  // Write server-side audit event
  await writeServerAudit(caller, {
    action: 'STAFF_ROLE_CHANGED',
    targetEntity: 'UserProfile',
    targetId: data.targetUid,
    details: `Updated role for ${currentProfile.fullName || data.targetUid} from ${String(oldRole).toUpperCase()} to ${data.newRole.toUpperCase()}`
  });

  return {
    success: true,
    targetUid: data.targetUid,
    newRole: data.newRole
  };
}

/**
 * Callable Function: setStaffActiveStatus
 * Activates or suspends a staff account.
 * Admins may only activate/suspend trainers.
 * Owners may activate/suspend trainers and admins, but cannot suspend their own active account.
 */
export async function handleSetStaffActiveStatus(
  data: SetStaffActiveStatusData,
  auth: { uid: string; token: any } | undefined
) {
  const caller = await requireAdminOrOwner(auth);

  if (!data.targetUid || typeof data.targetUid !== 'string') {
    throw new HttpsError('invalid-argument', 'Target staff UID is required.');
  }

  if (typeof data.isActive !== 'boolean') {
    throw new HttpsError('invalid-argument', 'isActive flag must be a boolean.');
  }

  const db = admin.firestore();
  const profileRef = db.collection('profiles').doc(data.targetUid);
  const profileSnap = await profileRef.get();

  if (!profileSnap.exists) {
    throw new HttpsError('not-found', `Staff profile ${data.targetUid} not found.`);
  }

  const targetProfile = profileSnap.data()!;

  // Admin boundary: Admins may only suspend/activate trainers
  if (caller.role === 'admin') {
    if (targetProfile.role !== 'trainer') {
      throw new HttpsError('permission-denied', 'Admins are authorized to activate or suspend trainers only.');
    }
  }

  // Owner safe handling: Owner cannot disable themselves
  if (caller.role === 'owner') {
    if (data.targetUid === caller.uid && !data.isActive) {
      throw new HttpsError('invalid-argument', 'Cannot suspend your own active owner account.');
    }
  }

  // Update profile
  await profileRef.update({
    isActive: data.isActive,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // If trainer, update public trainer visibility
  if (targetProfile.role === 'trainer') {
    const publicRef = db.collection('public_trainers').doc(data.targetUid);
    await publicRef.set({ isPublic: data.isActive }, { merge: true });
  }

  // Write server audit event
  await writeServerAudit(caller, {
    action: data.isActive ? 'STAFF_ACTIVATED' : 'STAFF_SUSPENDED',
    targetEntity: 'UserProfile',
    targetId: data.targetUid,
    details: `${data.isActive ? 'Activated' : 'Suspended'} staff account ${targetProfile.fullName || data.targetUid} (${targetProfile.role})`
  });

  return {
    success: true,
    targetUid: data.targetUid,
    isActive: data.isActive
  };
}

/**
 * Callable Function: deleteStaffMember
 * Owner only. Safely removes staff profile, hides public trainer card, and records audit.
 */
export async function handleDeleteStaffMember(
  data: DeleteStaffData,
  auth: { uid: string; token: any } | undefined
) {
  const caller = await requireOwner(auth);

  if (!data.targetUid || typeof data.targetUid !== 'string') {
    throw new HttpsError('invalid-argument', 'Target staff UID is required.');
  }

  if (data.targetUid === caller.uid) {
    throw new HttpsError('invalid-argument', 'Cannot delete your own active owner account.');
  }

  const db = admin.firestore();
  const profileRef = db.collection('profiles').doc(data.targetUid);
  const profileSnap = await profileRef.get();

  if (!profileSnap.exists) {
    throw new HttpsError('not-found', `Staff profile ${data.targetUid} not found.`);
  }

  const targetProfile = profileSnap.data()!;

  // Delete profile document
  await profileRef.delete();

  // Delete public trainer document if exists
  await db.collection('public_trainers').doc(data.targetUid).delete();

  // Write server audit event
  await writeServerAudit(caller, {
    action: 'STAFF_DELETED',
    targetEntity: 'UserProfile',
    targetId: data.targetUid,
    details: `Deleted staff profile for ${targetProfile.fullName || data.targetUid} (${targetProfile.role})`
  });

  return {
    success: true,
    targetUid: data.targetUid
  };
}
