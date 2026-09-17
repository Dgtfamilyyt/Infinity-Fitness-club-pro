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
exports.recordPayment = exports.deleteStaffMember = exports.setStaffActiveStatus = exports.setStaffRole = exports.createStaffAccount = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const staff_1 = require("./staff");
const payments_1 = require("./payments");
// Initialize Firebase Admin SDK server-side only
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * Callable: createStaffAccount
 * Privileged staff account creation with Firebase Auth & authoritative Firestore profile.
 */
exports.createStaffAccount = (0, https_1.onCall)({ cors: true }, async (request) => {
    return (0, staff_1.handleCreateStaffAccount)(request.data, request.auth);
});
/**
 * Callable: setStaffRole
 * Strictly Owner-only. Modifies staff roles, updates Auth custom claims, and updates public cards.
 */
exports.setStaffRole = (0, https_1.onCall)({ cors: true }, async (request) => {
    return (0, staff_1.handleSetStaffRole)(request.data, request.auth);
});
/**
 * Callable: setStaffActiveStatus
 * Activates or suspends staff accounts. Admins can manage trainers; Owners can manage all staff.
 */
exports.setStaffActiveStatus = (0, https_1.onCall)({ cors: true }, async (request) => {
    return (0, staff_1.handleSetStaffActiveStatus)(request.data, request.auth);
});
/**
 * Callable: deleteStaffMember
 * Strictly Owner-only. Safely removes staff profile, syncs public cards, and logs audit event.
 */
exports.deleteStaffMember = (0, https_1.onCall)({ cors: true }, async (request) => {
    return (0, staff_1.handleDeleteStaffMember)(request.data, request.auth);
});
/**
 * Callable: recordPayment
 * Authoritative financial payment recording with server-side validation and optional plan renewal.
 */
exports.recordPayment = (0, https_1.onCall)({ cors: true }, async (request) => {
    return (0, payments_1.handleRecordPayment)(request.data, request.auth);
});
//# sourceMappingURL=index.js.map