import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { PreRegistrationLink, UserProfile, UserRole } from '../types';
import { DEFAULT_GYM_ID } from './gymSettingsService';
import { auditService } from './auditService';

export const PRE_REGISTRATION_LINKS_COLLECTION = 'pre_registration_links';

/**
 * Normalizes email address deterministically:
 * trims surrounding whitespace and converts to lowercase.
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Computes deterministic SHA-256 hash using Web Crypto API.
 * Returns lowercase hexadecimal string.
 * Never uses Math.random or reversible base64.
 */
export async function hashEmail(email: string): Promise<string> {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error('Cannot hash empty or invalid email.');
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates a minimal lookup record in pre_registration_links/{emailHash}.
 * If a link document already exists for this email hash, throws an explicit duplicate error.
 * Does NOT copy sensitive profile fields.
 */
export async function createPreRegistrationLink(params: {
  email: string;
  profileDocId: string;
  role: UserRole;
  gymId?: string;
  isActive?: boolean;
}): Promise<PreRegistrationLink> {
  const emailNormalized = normalizeEmail(params.email);
  if (!emailNormalized) {
    throw new Error('Valid email is required for pre-registration link.');
  }

  const emailHash = await hashEmail(emailNormalized);
  const linkRef = doc(db, PRE_REGISTRATION_LINKS_COLLECTION, emailHash);

  // Check for duplicate pre-registration
  const existing = await getDoc(linkRef);
  if (existing.exists()) {
    throw new Error('This email is already pre-registered.');
  }

  const linkData: PreRegistrationLink = {
    emailHash,
    emailNormalized,
    profileDocId: params.profileDocId,
    gymId: params.gymId || DEFAULT_GYM_ID,
    role: params.role,
    authUid: null,
    authLinked: false,
    isActive: params.isActive !== false
  };

  try {
    await setDoc(linkRef, {
      ...linkData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return linkData;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${PRE_REGISTRATION_LINKS_COLLECTION}/${emailHash}`);
    throw error;
  }
}

/**
 * Fetches a single pre-registration link document by email hash.
 */
export async function getPreRegistrationLink(emailHash: string): Promise<PreRegistrationLink | null> {
  if (!emailHash) return null;
  try {
    const linkRef = doc(db, PRE_REGISTRATION_LINKS_COLLECTION, emailHash);
    const snap = await getDoc(linkRef);
    if (!snap.exists()) return null;
    return snap.data() as PreRegistrationLink;
  } catch (error) {
    console.warn(`[PRE_REG] Error fetching link for hash ${emailHash}:`, error);
    return null;
  }
}

/**
 * Backward compatibility migration helper (Requirement 10).
 * Creates missing pre_registration_links for known existing profile records.
 * Can ONLY be triggered manually by an authorized admin/owner action,
 * NOT automatically on app startup.
 */
export async function migrateExistingPreRegistrationLinks(actorName: string = 'Club Owner'): Promise<{
  scanned: number;
  created: number;
  alreadyExisted: number;
  skipped: number;
  errors: string[];
}> {
  const result = {
    scanned: 0,
    created: 0,
    alreadyExisted: 0,
    skipped: 0,
    errors: [] as string[]
  };

  try {
    const profilesSnap = await getDocs(collection(db, 'profiles'));
    result.scanned = profilesSnap.size;

    for (const profileDoc of profilesSnap.docs) {
      const data = profileDoc.data() as UserProfile;
      const email = data.email;
      if (!email || typeof email !== 'string') {
        result.skipped++;
        continue;
      }

      const emailNormalized = normalizeEmail(email);
      if (!emailNormalized) {
        result.skipped++;
        continue;
      }

      try {
        const emailHash = await hashEmail(emailNormalized);
        const linkRef = doc(db, PRE_REGISTRATION_LINKS_COLLECTION, emailHash);
        const linkSnap = await getDoc(linkRef);

        if (linkSnap.exists()) {
          result.alreadyExisted++;
          continue;
        }

        const isAuthLinked = data.authLinked === true || (Boolean(data.authUid) && data.authUid !== profileDoc.id);
        const resolvedAuthUid = data.authUid || (data.id === data.uid && data.authLinked ? data.id : null);

        await setDoc(linkRef, {
          emailHash,
          emailNormalized,
          profileDocId: profileDoc.id,
          gymId: data.gymId || DEFAULT_GYM_ID,
          role: data.role,
          authUid: resolvedAuthUid,
          authLinked: Boolean(isAuthLinked),
          isActive: data.isActive !== false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        result.created++;
      } catch (docErr: any) {
        result.errors.push(`Doc ${profileDoc.id}: ${docErr.message || String(docErr)}`);
      }
    }

    await auditService.logAuditEvent(
      actorName,
      'PRE_REG_LINKS_MIGRATED',
      'pre_registration_links',
      'batch_migration',
      `Migrated pre-registration links: scanned ${result.scanned}, created ${result.created}, existing ${result.alreadyExisted}`
    );
  } catch (err: any) {
    result.errors.push(`Migration query failed: ${err.message || String(err)}`);
  }

  return result;
}
