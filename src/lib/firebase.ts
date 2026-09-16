import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  getDoc, 
  getDocFromServer,
  setDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';
import { UserProfile, UserRole } from '../types';

// Detect whether running on Vercel production domain to enable same-origin proxy auth handler
export const getAuthDomain = (): string => {
  if (typeof window !== 'undefined' && window.location.hostname === 'infinity-fitness-club-pro.vercel.app') {
    return 'infinity-fitness-club-pro.vercel.app';
  }
  return 'swift-fx-h1ttq.firebaseapp.com';
};

// Configuration for Firebase Modular Web SDK
export const firebaseConfig = {
  apiKey: "AIzaSyDknL2K2XWB65uh01Ko_RUIue5AMVpImG8",
  authDomain: getAuthDomain(),
  projectId: "swift-fx-h1ttq",
  storageBucket: "swift-fx-h1ttq.firebasestorage.app",
  messagingSenderId: "18005381258",
  appId: "1:18005381258:web:fb1c44daa496409249dd73"
};

// Initialize safely so Firebase is not initialized twice during development/HMR
const app = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApp();

const firestoreDatabaseId = (appletConfig as any)?.firestoreDatabaseId;

// Initialize Firestore with robust long-polling to prevent 10s backend connection timeouts in proxied / iframe environments
export const db = (() => {
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      firestoreDatabaseId || undefined
    );
  } catch {
    return firestoreDatabaseId
      ? getFirestore(app, firestoreDatabaseId)
      : getFirestore(app);
  }
})();

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
  isUnauthorizedDomain?: boolean;
  isOperationNotAllowed?: boolean;
  isNetworkError?: boolean;
}

// Explicit Firebase Auth Error Parser
export const parseAuthError = (err: any): AuthErrorInfo => {
  const code = err?.code || '';
  const rawMessage = err?.message || 'Authentication failed.';

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return {
      code,
      message: 'Google sign-in was cancelled.',
      isCancelled: true
    };
  }
  if (code === 'auth/unauthorized-domain') {
    console.error('Firebase Auth technical error: unauthorized domain. Ensure "infinity-fitness-club-pro.vercel.app" is added in Firebase Console -> Authentication -> Settings -> Authorized domains.', err);
    return {
      code,
      message: 'This domain is not authorized for Firebase Authentication. Please ensure "infinity-fitness-club-pro.vercel.app" is added in Firebase Console → Authentication → Settings → Authorized domains.',
      isUnauthorizedDomain: true
    };
  }
  if (code === 'auth/operation-not-allowed') {
    return {
      code,
      message: 'Google Sign-In is not enabled yet in your Firebase Project Console. Please enable it in Firebase Console → Authentication → Sign-in method.',
      isOperationNotAllowed: true
    };
  }
  if (code === 'auth/network-request-failed') {
    return {
      code,
      message: 'Network connection error. Please check your internet connection.',
      isNetworkError: true
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

// Standard Google Authentication: uses signInWithRedirect exclusively
export const signInWithGoogle = async (): Promise<void> => {
  await signInWithRedirect(auth, googleProvider);
};

// Backward-compatible alias
export const signInWithGoogleRedirect = signInWithGoogle;

// Process redirect result after return (called on app mount)
export const initAuthRedirect = async (): Promise<AppAuthUser | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        emailVerified: result.user.emailVerified
      };
    }
    return null;
  } catch (err: any) {
    const parsed = parseAuthError(err);
    if (!parsed.isCancelled) {
      console.warn('[AUTH REDIRECT NOTICE]', parsed.code, parsed.message);
      throw err;
    }
    return null;
  }
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

// Authoritative Profile Lookup from Firestore: profiles/{uid}
// STRICT: Does NOT default role or gymId
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!uid) return null;
  try {
    const ref = doc(db, 'profiles', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data();
    
    // Validate role strictly - DO NOT DEFAULT
    const role = data.role as UserRole;
    if (!role || !VALID_ROLES.includes(role)) {
      console.warn(`[AUTH] Rejecting profile for UID ${uid}: Invalid or missing role "${data.role}"`);
      return null;
    }

    // Validate gymId strictly - DO NOT DEFAULT
    const gymId = typeof data.gymId === 'string' ? data.gymId.trim() : '';
    if (!gymId) {
      console.warn(`[AUTH] Rejecting profile for UID ${uid}: Missing gymId`);
      return null;
    }

    return {
      ...data,
      id: snap.id,
      uid: snap.id,
      fullName: data.fullName || '',
      email: data.email || '',
      role,
      gymId,
      isActive: data.isActive !== false
    } as UserProfile;
  } catch (err) {
    console.warn('Profile fetch notice for UID:', uid, err);
    return null;
  }
};

// Backward-compatible alias
export const fetchUserProfile = getUserProfile;

export const fetchUserProfileByEmail = async (email: string): Promise<UserProfile | null> => {
  if (!email) return null;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const q = query(
      collection(db, 'profiles'),
      where('email', '==', cleanEmail),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const firstDoc = snap.docs[0];
      const data = firstDoc.data();
      const role = data.role as UserRole;
      if (!role || !VALID_ROLES.includes(role)) return null;
      const gymId = typeof data.gymId === 'string' ? data.gymId.trim() : '';
      if (!gymId) return null;

      return {
        ...data,
        id: firstDoc.id,
        uid: firstDoc.id,
        fullName: data.fullName || '',
        email: data.email || cleanEmail,
        role,
        gymId,
        isActive: data.isActive !== false
      } as UserProfile;
    }
    return null;
  } catch (err) {
    console.warn('Profile fetch by email notice:', err);
    return null;
  }
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
