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
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, UserRole } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export interface AppAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified?: boolean;
}

// Active session state tracking (combining Firebase Auth and fast preview session)
let sessionAuthUser: AppAuthUser | null = (() => {
  try {
    const raw = sessionStorage.getItem('infinity_active_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

const authSubscribers = new Set<(user: AppAuthUser | null) => void>();

// Subscribe to real Firebase Auth state changes with session memory
export const subscribeToAuth = (callback: (user: AppAuthUser | null) => void): (() => void) => {
  authSubscribers.add(callback);

  // If a session already exists and Firebase hasn't resolved yet, inform subscriber
  if (sessionAuthUser && !auth.currentUser) {
    callback(sessionAuthUser);
  }

  const unsubscribeFb = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
    if (fbUser) {
      sessionAuthUser = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        emailVerified: fbUser.emailVerified
      };
      try {
        sessionStorage.setItem('infinity_active_user', JSON.stringify(sessionAuthUser));
      } catch {}
      callback(sessionAuthUser);
    } else {
      // Check if user is using an instant preview session
      if (sessionAuthUser) {
        callback(sessionAuthUser);
      } else {
        callback(null);
      }
    }
  });

  return () => {
    authSubscribers.delete(callback);
    unsubscribeFb();
  };
};

// Real Firebase Google Sign-In
export const signInWithGoogle = async (): Promise<AppAuthUser> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user: AppAuthUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      emailVerified: result.user.emailVerified
    };
    sessionAuthUser = user;
    try {
      sessionStorage.setItem('infinity_active_user', JSON.stringify(user));
    } catch {}
    authSubscribers.forEach(cb => cb(user));
    return user;
  } catch (err: any) {
    if (err.code === 'auth/operation-not-allowed') {
      err.friendlyMessage = 'Google Sign-In is not enabled yet in your Firebase Console. Please go to Firebase Console → Authentication → Sign-in method, click Google, and toggle Enable.';
    }
    throw err;
  }
};

// Real Firebase Email/Password Sign-In
export const signInWithEmail = async (email: string, pass: string): Promise<AppAuthUser> => {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const result = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const user: AppAuthUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      emailVerified: result.user.emailVerified
    };
    sessionAuthUser = user;
    try {
      sessionStorage.setItem('infinity_active_user', JSON.stringify(user));
    } catch {}
    authSubscribers.forEach(cb => cb(user));
    return user;
  } catch (err: any) {
    if (err.code === 'auth/operation-not-allowed') {
      err.friendlyMessage = 'Email/Password provider is not enabled yet in your Firebase Console. Please go to Firebase Console → Authentication → Sign-in method, click Email/Password, and toggle Enable.';
    }
    throw err;
  }
};

// Real Firebase Email/Password Registration
export const signUpWithEmail = async (email: string, pass: string): Promise<AppAuthUser> => {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const result = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    const user: AppAuthUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      emailVerified: result.user.emailVerified
    };
    sessionAuthUser = user;
    try {
      sessionStorage.setItem('infinity_active_user', JSON.stringify(user));
    } catch {}
    authSubscribers.forEach(cb => cb(user));
    return user;
  } catch (err: any) {
    if (err.code === 'auth/operation-not-allowed') {
      err.friendlyMessage = 'Email/Password registration is not enabled yet in your Firebase Console. Please go to Firebase Console → Authentication → Sign-in method, click Email/Password, and toggle Enable.';
    }
    throw err;
  }
};

// Instant Quick Sign-In (Allows testing portals immediately even when Firebase Console providers are pending configuration)
export const signInAsDemoUser = (email: string, displayName?: string): AppAuthUser => {
  const cleanEmail = email.trim().toLowerCase();
  const demoUser: AppAuthUser = {
    uid: `usr-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
    email: cleanEmail,
    displayName: displayName || cleanEmail.split('@')[0],
    emailVerified: true
  };
  sessionAuthUser = demoUser;
  try {
    sessionStorage.setItem('infinity_active_user', JSON.stringify(demoUser));
  } catch {}
  authSubscribers.forEach(cb => cb(demoUser));
  return demoUser;
};

// Real Firebase Password Reset Email
export const sendResetPassword = async (email: string): Promise<boolean> => {
  await sendPasswordResetEmail(auth, email.trim());
  return true;
};

// Real Firebase Sign Out
export const logoutUser = async (): Promise<void> => {
  sessionAuthUser = null;
  try {
    sessionStorage.removeItem('infinity_active_user');
  } catch {}
  try {
    await fbSignOut(auth);
  } catch {}
  authSubscribers.forEach(cb => cb(null));
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
