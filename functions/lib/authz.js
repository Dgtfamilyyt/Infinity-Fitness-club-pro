"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANONICAL_GYM_ID = void 0;
exports.requireAuthenticated = requireAuthenticated;
exports.getCallerContext = getCallerContext;
exports.requireActiveStaff = requireActiveStaff;
exports.requireAdminOrOwner = requireAdminOrOwner;
exports.requireOwner = requireOwner;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
exports.CANONICAL_GYM_ID = 'infinity-neelambur';
/**
 * Validates that request.auth exists.
 * Throws unauthenticated HttpsError if missing.
 */
function requireAuthenticated(auth) {
    if (!auth || !auth.uid) {
        throw new https_1.HttpsError('unauthenticated', 'The operation requires an authenticated Firebase user session.');
    }
    return {
        uid: auth.uid,
        email: (auth.token && auth.token.email) ? String(auth.token.email).trim().toLowerCase() : ''
    };
}
/**
 * Authoritative Server-side Profile Loader.
 * Reads profiles/{uid} from Firestore using Admin SDK.
 * Enforces isActive == true, validates role, and gymId == 'infinity-neelambur'.
 * Never trusts caller-provided role or actor identity.
 */
async function getCallerContext(auth) {
    const { uid, email } = requireAuthenticated(auth);
    const db = admin.firestore();
    const profileSnap = await db.collection('profiles').doc(uid).get();
    if (!profileSnap.exists) {
        // Retain temporary bootstrap fallback for dgtfamilyyt8@gmail.com until canonical owner profile is confirmed
        if (email === 'dgtfamilyyt8@gmail.com') {
            return {
                uid,
                email,
                fullName: 'Emergency Owner',
                role: 'owner',
                gymId: exports.CANONICAL_GYM_ID,
                isActive: true,
                profileDoc: { uid, email, role: 'owner', gymId: exports.CANONICAL_GYM_ID, isActive: true }
            };
        }
        throw new https_1.HttpsError('permission-denied', `No profile found for authenticated account (${uid}).`);
    }
    const profile = profileSnap.data();
    if (profile.isActive !== true) {
        throw new https_1.HttpsError('permission-denied', 'Account is suspended or inactive.');
    }
    const role = profile.role;
    if (!['member', 'trainer', 'admin', 'owner'].includes(role)) {
        throw new https_1.HttpsError('permission-denied', `Invalid account role: ${role}`);
    }
    const gymId = profile.gymId || exports.CANONICAL_GYM_ID;
    if (gymId !== exports.CANONICAL_GYM_ID) {
        throw new https_1.HttpsError('permission-denied', `Account is restricted to ${exports.CANONICAL_GYM_ID}.`);
    }
    return {
        uid,
        email: (profile.email ? String(profile.email).trim().toLowerCase() : '') || email,
        fullName: profile.fullName || 'Staff Member',
        role,
        gymId,
        isActive: true,
        profileDoc: profile
    };
}
/**
 * Requires caller to be an active staff member (trainer, admin, or owner)
 */
async function requireActiveStaff(auth) {
    const caller = await getCallerContext(auth);
    if (!['trainer', 'admin', 'owner'].includes(caller.role)) {
        throw new https_1.HttpsError('permission-denied', 'Only active staff members are authorized.');
    }
    return caller;
}
/**
 * Requires caller to be an active Admin or Owner
 */
async function requireAdminOrOwner(auth) {
    const caller = await getCallerContext(auth);
    if (!['admin', 'owner'].includes(caller.role)) {
        throw new https_1.HttpsError('permission-denied', 'Admin or Owner privileges are required for this action.');
    }
    return caller;
}
/**
 * Requires caller to be an active Owner
 */
async function requireOwner(auth) {
    const caller = await getCallerContext(auth);
    if (caller.role !== 'owner') {
        throw new https_1.HttpsError('permission-denied', 'Strict Owner privileges are required for this action.');
    }
    return caller;
}
//# sourceMappingURL=authz.js.map