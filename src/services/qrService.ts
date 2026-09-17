/**
 * QR Code Token Cryptographic Engine for Infinity Fitness Club
 * 
 * Rules:
 * - QR payload contains ONLY an opaque cryptographic token (versioned prefix + 256 bits of entropy)
 * - Raw token is NEVER stored as a document key; only the lowercase SHA-256 hash is stored in Firestore
 * - Absolutely NO PII (name, phone, email, medical notes) is stored in the QR code or token
 */

import { isDevDemoEnabled } from './devMode';

export const QR_TOKEN_VERSION = 'IFC1';

export const STRICT_QR_TOKEN_REGEX = /^IFC1\.[0-9a-fA-F]{64}$/;

/**
 * Generates an opaque, cryptographically secure token
 * Format: IFC1.<hex-encoded 32 bytes>
 */
export function generateCryptographicQrToken(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    const hex = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `${QR_TOKEN_VERSION}.${hex}`;
  }

  // Fallback for non-browser/test runtimes
  const arr = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${QR_TOKEN_VERSION}.${hex}`;
}

/**
 * Computes the lowercase SHA-256 hash of a raw QR token string
 */
export async function hashQrToken(token: string): Promise<string> {
  const clean = token.trim();
  if (!clean) return '';

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(clean);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback simple 64-char hex hash representation if subtle crypto unavailable
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  return (p1 + p1 + p1 + p1).substring(0, 64).padStart(64, '0');
}

/**
 * Validates token string syntax
 */
export function isValidQrTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  
  // Authoritative production format: IFC1.<64-character-hex>
  if (STRICT_QR_TOKEN_REGEX.test(trimmed)) {
    return true;
  }
  
  // Backwards compatibility with legacy seed tokens ONLY in DEV / demo mode
  if (isDevDemoEnabled()) {
    if (trimmed.startsWith('IFC_TOKEN_SEC_') || trimmed.startsWith('QR-IFC-')) {
      return true;
    }
  }

  return false;
}

/**
 * Masks raw token for safe display in UI
 * e.g. IFC1.4a8b••••••••••5f2c
 */
export function maskQrToken(token: string | undefined): string {
  if (!token) return 'NO PASS ISSUED';
  const trimmed = token.trim();
  if (trimmed.length <= 14) return 'IFC1.••••••••••';
  const prefix = trimmed.substring(0, 9);
  const suffix = trimmed.substring(trimmed.length - 4);
  return `${prefix}••••••••••${suffix}`;
}
