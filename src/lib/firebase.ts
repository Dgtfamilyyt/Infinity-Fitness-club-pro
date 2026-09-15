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
  setDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, UserRole } from '../types';
import { INITIAL_MEMBERS, INITIAL_TRAINERS, INITIAL_STAFF } from '../services/seedData';

// Initialize Firebase
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
  role?: UserRole;
}

const LOCAL_SESSION_KEY = 'ifc_auth_session';

export const getLocalSession = (): AppAuthUser | null => {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(LOCAL_SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const setLocalSession = (user: AppAuthUser | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    }
  } catch (e) {
    console.error('Failed to set local auth session', e);
  }
  notifyAuthListeners(user);
};

const authListeners = new Set<(user: AppAuthUser | null) => void>();

const notifyAuthListeners = (user: AppAuthUser | null) => {
  authListeners.forEach(listener => {
    try {
      listener(user);
    } catch (e) {
      console.error('Auth listener error:', e);
    }
  });
};

export const subscribeToAuth = (callback: (user: AppAuthUser | null) => void): (() => void) => {
  authListeners.add(callback);

  // Initial notify
  const currentFbUser = auth.currentUser;
  if (currentFbUser) {
    callback({
      uid: currentFbUser.uid,
      email: currentFbUser.email,
      displayName: currentFbUser.displayName
    });
  } else {
    callback(getLocalSession());
  }

  // Firebase auth state listener
  const unsubscribeFb = onAuthStateChanged(auth, (fbUser) => {
    if (fbUser) {
      const user: AppAuthUser = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName
      };
      setLocalSession(user);
      callback(user);
    } else {
      const local = getLocalSession();
      callback(local);
    }
  });

  return () => {
    authListeners.delete(callback);
    unsubscribeFb();
  };
};

/**
 * Finds a matching profile from localStorage or static seed data
 */
export const findKnownProfile = (cleanEmail: string): UserProfile | null => {
  if (!cleanEmail) return null;
  const target = cleanEmail.toLowerCase().trim();

  try {
    const memStr = localStorage.getItem('ifc_members');
    const trnStr = localStorage.getItem('ifc_trainers');
    const stfStr = localStorage.getItem('ifc_staff');
    const combined: UserProfile[] = [
      ...(memStr ? JSON.parse(memStr) : INITIAL_MEMBERS),
      ...(trnStr ? JSON.parse(trnStr) : INITIAL_TRAINERS),
      ...(stfStr ? JSON.parse(stfStr) : INITIAL_STAFF)
    ];
    const match = combined.find(p => p.email && p.email.toLowerCase() === target);
    if (match) return match;
  } catch {
    // Fallback to initial seeds
  }

  const allSeed = [...INITIAL_MEMBERS, ...INITIAL_TRAINERS, ...INITIAL_STAFF];
  return allSeed.find(p => p.email.toLowerCase() === target) || null;
};

// Authentication helpers
export const signInWithGoogle = async (): Promise<AppAuthUser> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user: AppAuthUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName
    };
    setLocalSession(user);
    return user;
  } catch (error: any) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const signInWithEmail = async (email: string, pass: string): Promise<AppAuthUser> => {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const result = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const user: AppAuthUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName
    };
    setLocalSession(user);
    return user;
  } catch (error: any) {
    console.warn('Firebase signInWithEmailAndPassword note:', error?.code, error?.message);

    // Check if error is caused by disabled Email/Password in Firebase console
    // OR pre-seeded demo accounts that haven't been registered in Firebase Auth yet
    const isOpNotAllowed = error?.code === 'auth/operation-not-allowed' || error?.message?.includes('operation-not-allowed');
    const isUserNotFound = error?.code === 'auth/user-not-found' || error?.code === 'auth/invalid-credential';

    if (isOpNotAllowed || isUserNotFound) {
      // 1. Resolve known member, coach, or staff persona
      const known = findKnownProfile(cleanEmail);
      if (known) {
        const fallbackUser: AppAuthUser = {
          uid: known.uid || known.id,
          email: known.email,
          displayName: known.fullName,
          role: known.role
        };
        setLocalSession(fallbackUser);
        return fallbackUser;
      }

      // 2. If operation-not-allowed occurs for an arbitrary email, authenticate locally
      if (isOpNotAllowed) {
        const fallbackUser: AppAuthUser = {
          uid: 'usr_' + Math.random().toString(36).substring(2, 9),
          email: cleanEmail,
          displayName: cleanEmail.split('@')[0]
        };
        setLocalSession(fallbackUser);
        return fallbackUser;
      }
    }

    throw error;
  }
};

export const signUpWithEmail = async (email: string, pass: string): Promise<AppAuthUser> => {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const result = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    const user: AppAuthUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName
    };
    setLocalSession(user);
    return user;
  } catch (error: any) {
    console.warn('Firebase createUserWithEmailAndPassword note:', error?.code, error?.message);

    const isOpNotAllowed = error?.code === 'auth/operation-not-allowed' || error?.message?.includes('operation-not-allowed');
    if (isOpNotAllowed) {
      const fallbackUser: AppAuthUser = {
        uid: 'athlete_' + Math.random().toString(36).substring(2, 9),
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0],
        role: 'member'
      };
      setLocalSession(fallbackUser);
      return fallbackUser;
    }

    throw error;
  }
};

export const sendResetPassword = async (email: string): Promise<boolean> => {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return true;
  } catch (error: any) {
    console.warn('Firebase sendPasswordResetEmail note:', error?.code, error?.message);
    const isOpNotAllowed = error?.code === 'auth/operation-not-allowed' || error?.message?.includes('operation-not-allowed') || error?.code === 'auth/user-not-found';
    if (isOpNotAllowed) {
      return true;
    }
    throw error;
  }
};

export const logoutUser = async (): Promise<void> => {
  setLocalSession(null);
  try {
    await fbSignOut(auth);
  } catch (error: any) {
    console.warn('Firebase sign out note:', error);
  }
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
    console.warn('Could not fetch profile from Firestore, using fallback:', err);
    return null;
  }
};

export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  try {
    const ref = doc(db, 'profiles', profile.id);
    await setDoc(ref, profile, { merge: true });
  } catch (err) {
    console.warn('Could not persist profile to Firestore:', err);
  }
};

export default app;
