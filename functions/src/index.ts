import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import {
  handleCreateStaffAccount,
  handleSetStaffRole,
  handleSetStaffActiveStatus,
  handleDeleteStaffMember
} from './staff';
import { handleRecordPayment } from './payments';

// Initialize Firebase Admin SDK server-side only
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Callable: createStaffAccount
 * Privileged staff account creation with Firebase Auth & authoritative Firestore profile.
 */
export const createStaffAccount = onCall(
  { cors: true },
  async (request) => {
    return handleCreateStaffAccount(request.data, request.auth);
  }
);

/**
 * Callable: setStaffRole
 * Strictly Owner-only. Modifies staff roles, updates Auth custom claims, and updates public cards.
 */
export const setStaffRole = onCall(
  { cors: true },
  async (request) => {
    return handleSetStaffRole(request.data, request.auth);
  }
);

/**
 * Callable: setStaffActiveStatus
 * Activates or suspends staff accounts. Admins can manage trainers; Owners can manage all staff.
 */
export const setStaffActiveStatus = onCall(
  { cors: true },
  async (request) => {
    return handleSetStaffActiveStatus(request.data, request.auth);
  }
);

/**
 * Callable: deleteStaffMember
 * Strictly Owner-only. Safely removes staff profile, syncs public cards, and logs audit event.
 */
export const deleteStaffMember = onCall(
  { cors: true },
  async (request) => {
    return handleDeleteStaffMember(request.data, request.auth);
  }
);

/**
 * Callable: recordPayment
 * Authoritative financial payment recording with server-side validation and optional plan renewal.
 */
export const recordPayment = onCall(
  { cors: true },
  async (request) => {
    return handleRecordPayment(request.data, request.auth);
  }
);
