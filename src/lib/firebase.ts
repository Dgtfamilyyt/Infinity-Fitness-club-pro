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
  serverTimestamp
} from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';
import { UserProfile, UserRole } from '../types';

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

// Log active Firebase config on startup (never log secrets or tokens)
if (typeof window !== 'undefined') {
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
  console.log(`[FIREBASE AUTH] Reading profile document at: ${profilePath}`);

  try {
    const ref = doc(db, 'profiles', uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      console.log(`[FIREBASE AUTH] Result for ${profilePath}: NOT_FOUND`);
      return { status: 'NOT_FOUND' };
    }

    const data = snap.data();
    console.log(`[FIREBASE AUTH] Document exists at ${profilePath}, inspecting data:`, data);

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
      console.warn(`[FIREBASE AUTH] Result for ${profilePath}: PROFILE_INVALID (${reason})`);
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

    console.log(`[FIREBASE AUTH] Result for ${profilePath}: FOUND`, {
      uid: validatedProfile.uid,
      fullName: validatedProfile.fullName,
      email: validatedProfile.email,
      role: validatedProfile.role,
      gymId: validatedProfile.gymId,
      isActive: validatedProfile.isActive
    });

    return {
      status: 'FOUND',
      profile: validatedProfile
    };
  } catch (err: any) {
    const code = err?.code || 'unknown';
    const message = err?.message || String(err);
    console.error(`[FIREBASE AUTH] Error reading ${profilePath}:`, { code, message, raw: err });

    if (
      code === 'permission-denied' || 
      code === 'firestore/permission-denied' ||
      message.includes('permission-denied') || 
      message.includes('Missing or insufficient permissions')
    ) {
      console.error(`[FIREBASE AUTH] Result for ${profilePath}: PERMISSION_DENIED (code: ${code})`);
      return {
        status: 'PERMISSION_DENIED',
        code,
        message
      };
    }

    console.error(`[FIREBASE AUTH] Result for ${profilePath}: FIRESTORE_ERROR (code: ${code})`);
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
  | { status: 'FOUND'; profile: UserProfile; docId: string }
  | { status: 'NOT_FOUND' }
  | { status: 'DUPLICATE' }
  | { status: 'ALREADY_LINKED'; linkedUid: string }
  | { status: 'INVALID'; reason: string }
  | { status: 'PERMISSION_DENIED'; code?: string }
  | { status: 'ERROR'; message: string };

/**
 * Safe Pre-registration Email Lookup (Requirement 3):
 * - normalize email using trim().toLowerCase()
 * - query profiles where email == normalized email
 * - limit(1)
 * - validate role (member, trainer, admin, owner)
 * - validate gymId
 * - return pre-registered profile
 * - never assign a role itself, never default role to member, never default gymId
 * - return null if invalid
 */
export const fetchUserProfileByEmail = async (email: string): Promise<UserProfile | null> => {
  if (!email || typeof email !== 'string') return null;
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;

  try {
    const q = query(
      collection(db, 'profiles'),
      where('email', '==', cleanEmail),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      return null;
    }

    const docSnap = snap.docs[0];
    const data = docSnap.data();

    // Validate role
    const role = data.role as UserRole;
    if (!role || !VALID_ROLES.includes(role)) {
      console.warn(`[FIREBASE AUTH] Pre-registered profile for ${cleanEmail} has invalid role:`, data.role);
      return null;
    }

    // Validate gymId
    const gymId = typeof data.gymId === 'string' ? data.gymId.trim() : '';
    if (!gymId) {
      console.warn(`[FIREBASE AUTH] Pre-registered profile for ${cleanEmail} is missing gymId`);
      return null;
    }

    // Never default role, never default gymId
    const profile: UserProfile = {
      ...data,
      id: docSnap.id,
      email: cleanEmail,
      role,
      gymId,
      fullName: typeof data.fullName === 'string' ? data.fullName.trim() : '',
      isActive: typeof data.isActive === 'boolean' ? data.isActive : true
    } as UserProfile;

    return profile;
  } catch (err) {
    console.warn(`[FIREBASE AUTH] fetchUserProfileByEmail error for ${cleanEmail}:`, err);
    return null;
  }
};

/**
 * Granular Pre-Registration Lookup with Duplicate & Link Verification (Requirements 3, 6, 8)
 * - Queries profiles with limit(2) to safely detect duplicate accounts
 * - Checks if profile is already linked to another authUid
 * - Strictly validates required fields (fullName, email, role, gymId, isActive)
 */
export const lookupPreRegisteredProfile = async (
  email: string,
  currentAuthUid: string,
  fallbackProfiles: UserProfile[] = []
): Promise<PreRegisterLookupResult> => {
  if (!email || typeof email !== 'string') return { status: 'NOT_FOUND' };
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return { status: 'NOT_FOUND' };

  console.log(`[FIREBASE AUTH] Querying pre-registered profile for email: ${cleanEmail}`);

  try {
    // Query with limit(2) to safely detect duplicate email profiles (Requirement 6)
    const q = query(
      collection(db, 'profiles'),
      where('email', '==', cleanEmail),
      limit(2)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      console.log(`[FIREBASE AUTH] No profile doc found via query for email: ${cleanEmail}. Checking local cache...`);
      // Check fallbackProfiles if Firestore collection query returns empty
      const localMatches = fallbackProfiles.filter(p => p.email && p.email.trim().toLowerCase() === cleanEmail);
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
          docId: local.id
        };
      }
      return { status: 'NOT_FOUND' };
    }

    // Requirement 6: If more than one pre-registration profile has the same normalized email:
    // Do NOT auto-link. Return a safe error status: PROFILE_DUPLICATE_EMAIL
    if (snap.docs.length > 1) {
      console.warn(`[FIREBASE AUTH] Multiple profiles found with email: ${cleanEmail}`);
      return { status: 'DUPLICATE' };
    }

    const docSnap = snap.docs[0];
    const data = docSnap.data();

    // Requirement 8: If pre-registered profile has:
    // authLinked === true AND authUid exists AND authUid !== authUser.uid
    // then stop and return: PROFILE_ALREADY_LINKED
    if (data.authLinked === true && data.authUid && data.authUid !== currentAuthUid) {
      console.warn(`[FIREBASE AUTH] Profile for ${cleanEmail} is already linked to another UID:`, data.authUid);
      return { status: 'ALREADY_LINKED', linkedUid: data.authUid };
    }

    // Strict validation: require fullName, valid role, gymId, isActive
    const invalidReasons: string[] = [];

    const fullName = typeof data.fullName === 'string' && data.fullName.trim() ? data.fullName.trim() : '';
    if (!fullName) invalidReasons.push('missing or empty fullName');

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
      const reason = `Pre-registered profile has invalid data: ${invalidReasons.join(', ')}`;
      console.warn(`[FIREBASE AUTH] Pre-registered profile for ${cleanEmail} is invalid:`, reason);
      return { status: 'INVALID', reason };
    }

    const validProfile: UserProfile = {
      ...data,
      id: docSnap.id,
      fullName,
      email: cleanEmail,
      role,
      gymId,
      isActive: data.isActive
    } as UserProfile;

    return {
      status: 'FOUND',
      profile: validProfile,
      docId: docSnap.id
    };
  } catch (err: any) {
    const code = err?.code || 'unknown';
    const message = err?.message || String(err);
    console.error(`[FIREBASE AUTH] Error in lookupPreRegisteredProfile for ${cleanEmail}:`, { code, message });

    if (
      code === 'permission-denied' ||
      code === 'firestore/permission-denied' ||
      message.includes('permission-denied') ||
      message.includes('Missing or insufficient permissions')
    ) {
      const localMatches = fallbackProfiles.filter(p => p.email && p.email.trim().toLowerCase() === cleanEmail);
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
          docId: local.id
        };
      }
      return { status: 'PERMISSION_DENIED', code };
    }

    return { status: 'ERROR', message };
  }
};

/**
 * Pre-registration UID Linking (Requirements 4, 7, 8)
 * - Writes canonical profile document at profiles/{authUser.uid}
 * - Preserves all fields (role, gymId, membership, memberId, qrToken, etc.)
 * - Sets id: authUser.uid, uid: authUser.uid, authUid: authUser.uid, authLinked: true
 * - Updates old pre-registration document with authUid and authLinked (does NOT delete)
 */
export const linkPreRegisteredProfile = async (
  oldDocId: string,
  authUser: AppAuthUser,
  preRegisteredProfile: UserProfile
): Promise<UserProfile> => {
  const normalizedEmail = (authUser.email || preRegisteredProfile.email).toLowerCase().trim();

  const canonicalProfile: UserProfile = {
    ...preRegisteredProfile,
    id: authUser.uid,
    uid: authUser.uid,
    authUid: authUser.uid,
    authLinked: true,
    email: normalizedEmail
  };

  // 1. Create/save canonical profile at profiles/{authUser.uid}
  const canonicalRef = doc(db, 'profiles', authUser.uid);
  await setDoc(canonicalRef, {
    ...canonicalProfile,
    updatedAt: serverTimestamp()
  }, { merge: true });

  console.log(`[FIREBASE AUTH] Created canonical profile at profiles/${authUser.uid} for ${normalizedEmail} with role "${canonicalProfile.role}"`);

  // 2. Requirement 7: If oldDocId is different from authUser.uid, update the old document
  if (oldDocId && oldDocId !== authUser.uid) {
    try {
      const oldRef = doc(db, 'profiles', oldDocId);
      await updateDoc(oldRef, {
        authUid: authUser.uid,
        authLinked: true,
        updatedAt: serverTimestamp()
      });
      console.log(`[FIREBASE AUTH] Updated pre-registration doc profiles/${oldDocId} with authUid=${authUser.uid} and authLinked=true`);
    } catch (oldErr) {
      console.warn(`[FIREBASE AUTH] Notice: could not update old pre-registration doc ${oldDocId}:`, oldErr);
    }
  }

  return canonicalProfile;
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
