import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocFromServer,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';
import { UserProfile, UserRole } from '../types';
import { 
  normalizeEmail, 
  hashEmail, 
  PRE_REGISTRATION_LINKS_COLLECTION 
} from '../services/preRegistrationService';

// Configuration for Firebase Modular Web SDK (infinity-fitness-club-52c50)
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCLh948sZvd74VWRwFMw-hJxu5anPtQ7-8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "infinity-fitness-club-52c50.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "infinity-fitness-club-52c50",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "infinity-fitness-club-52c50.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "880588845668",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:880588845668:web:da7b27c1ac83ad2f33a571",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-V01RT496K8"
};

// Log active Firebase config on startup (dev only, never log secrets or tokens)
if (import.meta.env.DEV && typeof window !== 'undefined') {
  console.log("[FIREBASE DEBUG]", {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    storageBucket: firebaseConfig.storageBucket
  });

  // Verify runtime configuration values against requirements
  if (firebaseConfig.projectId !== "infinity-fitness-club-52c50") {
    console.error(`[FIREBASE CONFIG WARNING] Unexpected projectId: "${firebaseConfig.projectId}". Expected: "infinity-fitness-club-52c50". Verify VITE_FIREBASE_PROJECT_ID.`);
  }
  if (firebaseConfig.authDomain !== "infinity-fitness-club-52c50.firebaseapp.com") {
    console.error(`[FIREBASE CONFIG WARNING] Unexpected authDomain: "${firebaseConfig.authDomain}". Expected: "infinity-fitness-club-52c50.firebaseapp.com". Verify VITE_FIREBASE_AUTH_DOMAIN.`);
  }
}

// Initialize safely so Firebase is not initialized twice during development/HMR
const app = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApp();

// Use the default Firestore database for infinity-fitness-club-52c50
export const db = getFirestore(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

// Safe optional Firebase Analytics (browser-only, never breaks execution)
export let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (err) {
        console.warn('Firebase Analytics notice (optional):', err);
      }
    }
  }).catch(() => {});
}

// Validate Connection to Firestore (Firebase Integration Skill constraint)
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore Notice: The client is operating in offline mode.');
    }
  }
}
if (typeof window !== 'undefined') {
  testFirestoreConnection();
}

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export interface AppAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified?: boolean;
}

export const VALID_ROLES: UserRole[] = ['member', 'trainer', 'admin', 'owner'];

export interface AuthErrorInfo {
  code: string;
  message: string;
  isCancelled?: boolean;
  isPopupBlocked?: boolean;
  isUnauthorizedDomain?: boolean;
  isOperationNotAllowed?: boolean;
  isNetworkError?: boolean;
}

// Explicit Firebase Auth Error Parser
export const parseAuthError = (err: any): AuthErrorInfo => {
  const code = err?.code || '';
  const rawMessage = err?.message || 'Authentication failed.';

  if (code === 'auth/popup-blocked') {
    return {
      code,
      message: 'Google sign-in was blocked by your browser. Please allow popups for this site or use email/password.',
      isPopupBlocked: true
    };
  }
  if (code === 'auth/popup-closed-by-user') {
    return {
      code,
      message: 'Google sign-in window was closed before completing.',
      isCancelled: true
    };
  }
  if (code === 'auth/cancelled-popup-request') {
    return {
      code,
      message: 'Google sign-in request was cancelled.',
      isCancelled: true
    };
  }
  if (code === 'auth/unauthorized-domain') {
    console.error('Firebase Auth technical error: unauthorized domain. Ensure your domain is added in Firebase Console -> Authentication -> Settings -> Authorized domains.', err);
    return {
      code,
      message: 'This domain is not authorized for Firebase Authentication. Please ensure this domain is added in Firebase Console → Authentication → Settings → Authorized domains.',
      isUnauthorizedDomain: true
    };
  }
  if (code === 'auth/network-request-failed') {
    return {
      code,
      message: 'Network connection error. Please check your internet connection.',
      isNetworkError: true
    };
  }
  if (code === 'auth/operation-not-allowed') {
    return {
      code,
      message: 'Google Sign-In is not enabled yet in your Firebase Project Console. Please enable it in Firebase Console → Authentication → Sign-in method.',
      isOperationNotAllowed: true
    };
  }
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return {
      code,
      message: 'Invalid credentials. Please verify your email and password.'
    };
  }
  if (code === 'auth/email-already-in-use') {
    return {
      code,
      message: 'An account with this email already exists. Please sign in instead.'
    };
  }
  if (code === 'auth/weak-password') {
    return {
      code,
      message: 'Password must be at least 6 characters.'
    };
  }

  return {
    code,
    message: rawMessage
  };
};

// Strictly subscribe to real Firebase Auth state changes
export const subscribeToAuth = (callback: (user: AppAuthUser | null) => void): (() => void) => {
  return onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      callback(null);
      return;
    }
    callback({
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName,
      emailVerified: fbUser.emailVerified
    });
  });
};

// Standard Google Authentication: uses signInWithPopup directly from user click
export const signInWithGoogle = async (): Promise<AppAuthUser> => {
  const result = await signInWithPopup(auth, googleProvider);
  return {
    uid: result.user.uid,
    email: result.user.email,
    displayName: result.user.displayName,
    emailVerified: result.user.emailVerified
  };
};

// Real Firebase Email/Password Sign-In
export const signInWithEmail = async (email: string, pass: string): Promise<AppAuthUser> => {
  const cleanEmail = email.trim().toLowerCase();
  const result = await signInWithEmailAndPassword(auth, cleanEmail, pass);
  return {
    uid: result.user.uid,
    email: result.user.email,
    displayName: result.user.displayName,
    emailVerified: result.user.emailVerified
  };
};

// Real Firebase Email/Password Registration
export const signUpWithEmail = async (email: string, pass: string): Promise<AppAuthUser> => {
  const cleanEmail = email.trim().toLowerCase();
  const result = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
  return {
    uid: result.user.uid,
    email: result.user.email,
    displayName: result.user.displayName,
    emailVerified: result.user.emailVerified
  };
};

// Real Firebase Password Reset Email
export const sendResetPassword = async (email: string): Promise<boolean> => {
  await sendPasswordResetEmail(auth, email.trim());
  return true;
};

// Real Firebase Sign Out
export const logoutUser = async (): Promise<void> => {
  await fbSignOut(auth);
};

export type ProfileResolutionStatus = 
  | 'FOUND'
  | 'NOT_FOUND'
  | 'PROFILE_INVALID'
  | 'PERMISSION_DENIED'
  | 'FIRESTORE_ERROR';

export type ProfileResolutionResult =
  | { status: 'FOUND'; profile: UserProfile }
  | { status: 'NOT_FOUND' }
  | { status: 'PROFILE_INVALID'; reason: string }
  | { status: 'PERMISSION_DENIED'; code?: string; message?: string }
  | { status: 'FIRESTORE_ERROR'; code?: string; message: string };

// Authoritative Profile Lookup from Firestore: profiles/{uid}
// Distinct status handling per requirements:
// A. NOT_FOUND: Firestore document does not exist
// B. FOUND: Profile exists and is valid
// C. PROFILE_INVALID: Document exists but missing required fields
// D. PERMISSION_DENIED: Firestore security rules permission denied
// E. FIRESTORE_ERROR: Network or Firestore connection error
export const getUserProfile = async (uid: string): Promise<ProfileResolutionResult> => {
  if (!uid) return { status: 'NOT_FOUND' };

  const profilePath = `profiles/${uid}`;
  if (import.meta.env.DEV) {
    console.log(`[FIREBASE AUTH] Reading profile document at: ${profilePath}`);
  }

  try {
    const ref = doc(db, 'profiles', uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      if (import.meta.env.DEV) {
        console.log(`[FIREBASE AUTH] Result for ${profilePath}: NOT_FOUND`);
      }
      return { status: 'NOT_FOUND' };
    }

    const data = snap.data();
    if (import.meta.env.DEV) {
      console.log(`[FIREBASE AUTH] Document exists at ${profilePath}, inspecting data:`, data);
    }

    // Profile validation per Requirement 7:
    // If the profile document exists, require:
    // uid, fullName, email, role, gymId, isActive
    // Valid roles: member, trainer, admin, owner
    // Do not default missing role to member. Do not default missing gymId.
    const invalidReasons: string[] = [];

    const profileUid = typeof data.uid === 'string' && data.uid.trim() ? data.uid.trim() : snap.id;
    if (!profileUid) invalidReasons.push('missing uid');

    const fullName = typeof data.fullName === 'string' && data.fullName.trim() ? data.fullName.trim() : '';
    if (!fullName) invalidReasons.push('missing or empty fullName');

    const email = typeof data.email === 'string' && data.email.trim() ? data.email.trim() : '';
    if (!email) invalidReasons.push('missing or empty email');

    const role = data.role as UserRole;
    if (!role || !VALID_ROLES.includes(role)) {
      invalidReasons.push(`invalid role "${data.role}" (must be member, trainer, admin, or owner)`);
    }

    const gymId = typeof data.gymId === 'string' ? data.gymId.trim() : '';
    if (!gymId) {
      invalidReasons.push('missing or empty gymId');
    }

    if (typeof data.isActive !== 'boolean') {
      invalidReasons.push('missing or invalid isActive flag (must be boolean)');
    }

    if (invalidReasons.length > 0) {
      const reason = `Profile at ${profilePath} is incomplete: ${invalidReasons.join(', ')}`;
      if (import.meta.env.DEV) {
        console.warn(`[FIREBASE AUTH] Result for ${profilePath}: PROFILE_INVALID (${reason})`);
      } else {
        console.warn('[FIREBASE AUTH] Profile document is invalid');
      }
      return {
        status: 'PROFILE_INVALID',
        reason
      };
    }

    const validatedProfile: UserProfile = {
      ...data,
      id: snap.id,
      uid: profileUid,
      fullName,
      email,
      role,
      gymId,
      isActive: data.isActive
    } as UserProfile;

    if (import.meta.env.DEV) {
      console.log(`[FIREBASE AUTH] Result for ${profilePath}: FOUND`, {
        uid: validatedProfile.uid,
        fullName: validatedProfile.fullName,
        email: validatedProfile.email,
        role: validatedProfile.role,
        gymId: validatedProfile.gymId,
        isActive: validatedProfile.isActive
      });
    }

    return {
      status: 'FOUND',
      profile: validatedProfile
    };
  } catch (err: any) {
    const code = err?.code || 'unknown';
    const message = err?.message || String(err);
    if (import.meta.env.DEV) {
      console.error(`[FIREBASE AUTH] Error reading ${profilePath}:`, { code, message, raw: err });
    } else {
      console.error('[FIREBASE AUTH] Error reading profile');
    }

    if (
      code === 'permission-denied' || 
      code === 'firestore/permission-denied' ||
      message.includes('permission-denied') || 
      message.includes('Missing or insufficient permissions')
    ) {
      if (import.meta.env.DEV) {
        console.error(`[FIREBASE AUTH] Result for ${profilePath}: PERMISSION_DENIED (code: ${code})`);
      } else {
        console.error('[FIREBASE AUTH] Result: PERMISSION_DENIED');
      }
      return {
        status: 'PERMISSION_DENIED',
        code,
        message
      };
    }

    if (import.meta.env.DEV) {
      console.error(`[FIREBASE AUTH] Result for ${profilePath}: FIRESTORE_ERROR (code: ${code})`);
    } else {
      console.error('[FIREBASE AUTH] Result: FIRESTORE_ERROR');
    }
    return {
      status: 'FIRESTORE_ERROR',
      code,
      message
    };
  }
};

// Backward-compatible alias
export const fetchUserProfile = getUserProfile;

export type PreRegisterLookupResult =
  | { status: 'FOUND'; profile: UserProfile; docId: string; emailHash: string }
  | { status: 'NOT_FOUND' }
  | { status: 'DUPLICATE' }
  | { status: 'ALREADY_LINKED'; linkedUid: string }
  | { status: 'INVALID'; reason: string }
  | { status: 'PERMISSION_DENIED'; code?: string }
  | { status: 'ERROR'; message: string };

/**
 * Backward-compatible helper for finding pre-registered user profile by email
 * without querying the profiles collection directly.
 */
export const fetchUserProfileByEmail = async (email: string): Promise<UserProfile | null> => {
  if (!email || typeof email !== 'string') return null;
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return null;

  try {
    const lookup = await lookupPreRegisteredProfile(cleanEmail, '');
    if (lookup.status === 'FOUND') {
      return lookup.profile;
    }
    return null;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[FIREBASE AUTH] fetchUserProfileByEmail error for ${cleanEmail}:`, err);
    } else {
      console.warn('[FIREBASE AUTH] fetchUserProfileByEmail error');
    }
    return null;
  }
};

/**
 * Secure Pre-Registration Lookup using Dedicated Minimal Lookup Collection (Step 3)
 * - Hashes normalized email to deterministic SHA-256 key
 * - Directly reads pre_registration_links/{emailHash} (NO collection queries against profiles)
 * - Validates link metadata (emailNormalized, profileDocId, gymId, role, isActive)
 * - Verifies already-linked status against current authenticated UID
 * - Fetches profiles/{profileDocId} and validates against link document
 */
export const lookupPreRegisteredProfile = async (
  email: string,
  currentAuthUid: string,
  fallbackProfiles: UserProfile[] = []
): Promise<PreRegisterLookupResult> => {
  if (!email || typeof email !== 'string') return { status: 'NOT_FOUND' };
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return { status: 'NOT_FOUND' };

  if (import.meta.env.DEV) {
    console.log(`[FIREBASE AUTH] Looking up pre-registration link for normalized email: ${cleanEmail}`);
  }

  try {
    const emailHash = await hashEmail(cleanEmail);
    const linkRef = doc(db, PRE_REGISTRATION_LINKS_COLLECTION, emailHash);
    const linkSnap = await getDoc(linkRef);

    if (!linkSnap.exists()) {
      if (import.meta.env.DEV) {
        console.log(`[FIREBASE AUTH] No pre-registration link found at ${PRE_REGISTRATION_LINKS_COLLECTION}/${emailHash}`);
      }

      // Fallback only for local development/in-memory profiles
      if (fallbackProfiles && fallbackProfiles.length > 0) {
        const localMatches = fallbackProfiles.filter(p => p.email && normalizeEmail(p.email) === cleanEmail);
        if (localMatches.length > 1) {
          return { status: 'DUPLICATE' };
        }
        if (localMatches.length === 1) {
          const local = localMatches[0];
          if (local.authLinked === true && local.authUid && local.authUid !== currentAuthUid) {
            return { status: 'ALREADY_LINKED', linkedUid: local.authUid };
          }
          return {
            status: 'FOUND',
            profile: local,
            docId: local.id,
            emailHash
          };
        }
      }

      return { status: 'NOT_FOUND' };
    }

    const linkData = linkSnap.data();

    // 1. Validate link document fields
    if (linkData.emailNormalized !== cleanEmail) {
      if (import.meta.env.DEV) {
        console.warn(`[FIREBASE AUTH] Pre-registration link email mismatch: stored=${linkData.emailNormalized}, query=${cleanEmail}`);
      } else {
        console.warn('[FIREBASE AUTH] Pre-registration link email mismatch');
      }
      return { status: 'INVALID', reason: 'Pre-registration link email mismatch.' };
    }

    if (!linkData.profileDocId || typeof linkData.profileDocId !== 'string') {
      return { status: 'INVALID', reason: 'Pre-registration link missing profileDocId.' };
    }

    if (!linkData.gymId || typeof linkData.gymId !== 'string') {
      return { status: 'INVALID', reason: 'Pre-registration link missing gymId.' };
    }

    const linkRole = linkData.role as UserRole;
    if (!linkRole || !VALID_ROLES.includes(linkRole)) {
      return { status: 'INVALID', reason: `Pre-registration link has invalid role: ${linkData.role}` };
    }

    if (linkData.isActive === false) {
      return { status: 'INVALID', reason: 'Account pre-registration is inactive or suspended.' };
    }

    // 2. Already linked check (Requirement 5)
    if (linkData.authLinked === true && linkData.authUid && linkData.authUid !== currentAuthUid) {
      if (import.meta.env.DEV) {
        console.warn(`[FIREBASE AUTH] Pre-registration for ${cleanEmail} is already linked to another UID: ${linkData.authUid}`);
      } else {
        console.warn('[FIREBASE AUTH] Pre-registration is already linked to another account');
      }
      return { status: 'ALREADY_LINKED', linkedUid: linkData.authUid };
    }

    // If already linked to current UID, load the canonical profile directly
    if (linkData.authLinked === true && linkData.authUid === currentAuthUid) {
      const canonRef = doc(db, 'profiles', currentAuthUid);
      const canonSnap = await getDoc(canonRef);
      if (canonSnap.exists()) {
        const cData = canonSnap.data() as UserProfile;
        return {
          status: 'FOUND',
          profile: {
            ...cData,
            id: currentAuthUid,
            uid: currentAuthUid
          },
          docId: currentAuthUid,
          emailHash
        };
      }
    }

    // 3. Fetch pre-registration profile document: profiles/{profileDocId}
    const profileRef = doc(db, 'profiles', linkData.profileDocId);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      if (import.meta.env.DEV) {
        console.warn(`[FIREBASE AUTH] Profile doc ${linkData.profileDocId} referenced by link does not exist.`);
      } else {
        console.warn('[FIREBASE AUTH] Profile document referenced by link does not exist');
      }
      return { status: 'NOT_FOUND' };
    }

    const profileData = profileSnap.data();

    // 4. Validate profile against link metadata (Requirement 4)
    const profileEmailNorm = normalizeEmail(profileData.email || '');
    if (profileEmailNorm !== cleanEmail) {
      return { status: 'INVALID', reason: 'Profile document email does not match verified authenticated email.' };
    }

    if (profileData.role !== linkRole) {
      return { status: 'INVALID', reason: 'Profile document role does not match pre-registration link role.' };
    }

    if (profileData.gymId && linkData.gymId && profileData.gymId !== linkData.gymId) {
      return { status: 'INVALID', reason: 'Profile document gymId does not match link gymId.' };
    }

    if (typeof profileData.isActive !== 'boolean') {
      return { status: 'INVALID', reason: 'Profile document isActive must be a boolean.' };
    }

    if (profileData.authLinked === true && profileData.authUid && profileData.authUid !== currentAuthUid) {
      return { status: 'ALREADY_LINKED', linkedUid: profileData.authUid };
    }

    const validatedProfile: UserProfile = {
      ...profileData,
      id: profileSnap.id,
      fullName: typeof profileData.fullName === 'string' ? profileData.fullName.trim() : '',
      email: cleanEmail,
      role: linkRole,
      gymId: linkData.gymId,
      isActive: profileData.isActive
    } as UserProfile;

    return {
      status: 'FOUND',
      profile: validatedProfile,
      docId: linkData.profileDocId,
      emailHash
    };
  } catch (err: any) {
    const code = err?.code || 'unknown';
    const message = err?.message || String(err);
    if (import.meta.env.DEV) {
      console.error(`[FIREBASE AUTH] Error in lookupPreRegisteredProfile for ${cleanEmail}:`, { code, message });
    } else {
      console.error('[FIREBASE AUTH] Error in lookupPreRegisteredProfile');
    }

    if (
      code === 'permission-denied' ||
      code === 'firestore/permission-denied' ||
      message.includes('permission-denied') ||
      message.includes('Missing or insufficient permissions')
    ) {
      return { status: 'PERMISSION_DENIED', code };
    }

    return { status: 'ERROR', message };
  }
};

/**
 * Pre-registration UID Linking via Firestore Atomic Transaction (Requirement 6)
 * Within the transaction:
 * 1. Re-read: pre_registration_links/{emailHash}
 * 2. Confirm it is still unlinked OR linked to the same UID.
 * 3. Read: profiles/{profileDocId}
 * 4. Confirm: email matches authenticated email, role/gymId unchanged, not linked to another UID
 * 5. Create canonical: profiles/{authUid}
 * 6. Update original pre-registration profile: profiles/{profileDocId}
 * 7. Update: pre_registration_links/{emailHash}
 */
export const linkPreRegisteredProfile = async (
  profileDocId: string,
  authUser: AppAuthUser,
  preRegisteredProfile: UserProfile,
  providedEmailHash?: string
): Promise<UserProfile> => {
  const normalizedEmail = normalizeEmail(authUser.email || preRegisteredProfile.email);
  const emailHash = providedEmailHash || await hashEmail(normalizedEmail);

  const linkRef = doc(db, PRE_REGISTRATION_LINKS_COLLECTION, emailHash);
  const origProfileRef = doc(db, 'profiles', profileDocId);
  const canonicalProfileRef = doc(db, 'profiles', authUser.uid);

  let canonicalProfile: UserProfile | null = null;

  await runTransaction(db, async (transaction) => {
    // 1. Re-read pre_registration_links/{emailHash}
    const linkDoc = await transaction.get(linkRef);
    if (!linkDoc.exists()) {
      throw new Error('Pre-registration link record does not exist.');
    }
    const linkData = linkDoc.data();

    // 2. Confirm it is still unlinked OR linked to the same UID
    if (linkData.authLinked === true && linkData.authUid && linkData.authUid !== authUser.uid) {
      throw new Error(`PROFILE_ALREADY_LINKED:${linkData.authUid}`);
    }

    // 3. Read profiles/{profileDocId}
    const origDoc = await transaction.get(origProfileRef);
    if (!origDoc.exists()) {
      throw new Error('Original pre-registration profile does not exist.');
    }
    const origData = origDoc.data() as UserProfile;

    // 4. Confirm email matches, role/gymId unchanged, not linked to another UID
    const origEmailNorm = normalizeEmail(origData.email || '');
    if (origEmailNorm !== normalizedEmail) {
      throw new Error('Profile email does not match authenticated email.');
    }
    if (origData.role !== linkData.role) {
      throw new Error('Profile role does not match link role.');
    }
    if (origData.gymId && linkData.gymId && origData.gymId !== linkData.gymId) {
      throw new Error('Profile gymId does not match link gymId.');
    }
    if (origData.authLinked === true && origData.authUid && origData.authUid !== authUser.uid) {
      throw new Error(`PROFILE_ALREADY_LINKED:${origData.authUid}`);
    }

    // 5. Create canonical profiles/{authUid}
    canonicalProfile = {
      ...origData,
      id: authUser.uid,
      uid: authUser.uid,
      authUid: authUser.uid,
      authLinked: true,
      email: normalizedEmail,
      preRegistrationDocId: profileDocId
    };

    transaction.set(canonicalProfileRef, {
      ...canonicalProfile,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // 6. Update original pre-registration profile
    if (profileDocId !== authUser.uid) {
      transaction.update(origProfileRef, {
        authUid: authUser.uid,
        authLinked: true,
        updatedAt: serverTimestamp()
      });
    }

    // 7. Update pre_registration_links/{emailHash}
    transaction.update(linkRef, {
      authUid: authUser.uid,
      authLinked: true,
      updatedAt: serverTimestamp()
    });
  });

  if (import.meta.env.DEV) {
    console.log(`[FIREBASE AUTH] Successfully bound pre-registration ${profileDocId} to auth UID ${authUser.uid} via atomic transaction`);
  }
  return canonicalProfile!;
};

export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  try {
    const ref = doc(db, 'profiles', profile.id);
    await setDoc(ref, {
      ...profile,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error('Failed to persist profile to Firestore:', err);
    throw err;
  }
};

// Standardized Firestore Error Handler adhering to Firebase Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Security / Operation Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default app;
