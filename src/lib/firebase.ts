import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
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
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, UserRole } from '../types';

// Detect whether running on Vercel production domain to enable same-origin proxy auth handler
const getAuthDomain = (): string => {
  if (typeof window !== 'undefined' && window.location.hostname === 'infinity-fitness-club-pro.vercel.app') {
    return 'infinity-fitness-club-pro.vercel.app';
  }
  return firebaseConfig.authDomain || 'swift-fx-h1ttq.firebaseapp.com';
};

// Initialize Firebase App
const app = getApps().length === 0 
  ? initializeApp({
      ...firebaseConfig,
      authDomain: getAuthDomain()
    }) 
  : getApp();

// Initialize Firestore with robust long-polling to prevent 10s backend connection timeouts in proxied / iframe environments
export const db = (() => {
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      firebaseConfig.firestoreDatabaseId || undefined
    );
  } catch {
    return firebaseConfig.firestoreDatabaseId
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
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

// Conservative mobile detection helper for selecting authentication UX
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  return isMobileUA || (isSmallScreen && isTouch);
};

export interface AuthErrorInfo {
  code: string;
  message: string;
  isPopupBlocked?: boolean;
  isCancelled?: boolean;
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
      message: 'Your browser blocked the Google sign-in window.',
      isPopupBlocked: true
    };
  }
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
      message: 'This website is not authorized for Firebase Authentication. Contact the system administrator.',
      isUnauthorizedDomain: true
    };
  }
  if (code === 'auth/operation-not-allowed') {
    return {
      code,
      message: 'This sign-in provider is not enabled yet in your Firebase Project Console. Please enable it in Firebase Console → Authentication → Sign-in method.',
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

// Resilient Google Sign-In: Desktop uses Popup first directly on click; Mobile uses Redirect
export const signInWithGoogle = async (forceRedirect: boolean = false): Promise<AppAuthUser | null> => {
  const shouldRedirect = forceRedirect || isMobileDevice();

  if (shouldRedirect) {
    await signInWithRedirect(auth, googleProvider);
    return null;
  }

  // Desktop Popup - MUST be triggered directly from the user's click
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      emailVerified: result.user.emailVerified
    };
  } catch (err: any) {
    if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
      console.warn('signInWithPopup failed:', err?.code, err?.message);
    }
    throw err;
  }
};

// Explicit Google Redirect Sign-In
export const signInWithGoogleRedirect = async (): Promise<void> => {
  await signInWithRedirect(auth, googleProvider);
};

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
    if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
      console.warn('getRedirectResult notice:', err);
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

// Firestore Profile management
export const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const ref = doc(db, 'profiles', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.warn('Profile fetch notice (falling back to cache):', err);
    return null;
  }
};

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
      return { ...firstDoc.data(), id: firstDoc.id } as UserProfile;
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
