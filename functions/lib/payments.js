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
exports.handleRecordPayment = handleRecordPayment;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const authz_1 = require("./authz");
const audit_1 = require("./audit");
const ALLOWED_METHODS = {
    cash: 'Cash',
    upi: 'UPI',
    card: 'Card',
    'bank transfer': 'Bank Transfer',
    banktransfer: 'Bank Transfer',
    net_banking: 'Bank Transfer',
    netbanking: 'Bank Transfer',
    other: 'Other'
};
/**
 * Callable Function: recordPayment
 * Authoritative, server-side payment recording.
 * Derives actor identity strictly from authenticated session.
 * Updates financial records and optionally computes membership extensions atomically.
 */
async function handleRecordPayment(data, auth) {
    const caller = await (0, authz_1.requireAdminOrOwner)(auth);
    if (!data.memberUid || typeof data.memberUid !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'Target memberUid is required.');
    }
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new https_1.HttpsError('invalid-argument', 'Amount must be a finite positive number.');
    }
    const rawMethod = (data.paymentMethod || '').trim().toLowerCase();
    const normalizedMethod = ALLOWED_METHODS[rawMethod] || 'Other';
    const db = admin.firestore();
    const memberRef = db.collection('profiles').doc(data.memberUid);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
        throw new https_1.HttpsError('not-found', `Member profile ${data.memberUid} not found.`);
    }
    const memberData = memberSnap.data();
    if (memberData.role !== 'member') {
        throw new https_1.HttpsError('invalid-argument', 'Payments can only be recorded for accounts with role "member".');
    }
    // Determine membership extension if plan is specified or member has active plan
    const targetPlanId = data.planId || memberData.membershipPlanId;
    let planName = memberData.planName || 'General Membership';
    let membershipExtended = false;
    if (targetPlanId) {
        const planSnap = await db.collection('membership_plans').doc(targetPlanId).get();
        if (planSnap.exists) {
            const planData = planSnap.data();
            planName = planData.name || planName;
            const durationMonths = Number(planData.durationMonths) || 1;
            // Calculate extension
            const now = new Date();
            let baseDate = now;
            if (memberData.membershipExpiry) {
                const parsed = new Date(memberData.membershipExpiry);
                if (!isNaN(parsed.getTime()) && parsed > now) {
                    baseDate = parsed;
                }
            }
            const newExpiry = new Date(baseDate);
            newExpiry.setMonth(newExpiry.getMonth() + durationMonths);
            const newExpiryStr = newExpiry.toISOString().split('T')[0];
            await memberRef.update({
                membershipPlanId: targetPlanId,
                planName,
                membershipExpiry: newExpiryStr,
                status: 'ACTIVE',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            membershipExtended = true;
            // Log membership extension audit
            await (0, audit_1.writeServerAudit)(caller, {
                action: 'MEMBERSHIP_RENEWED',
                targetEntity: 'UserProfile',
                targetId: data.memberUid,
                details: `Renewed plan "${planName}" (+${durationMonths} mo, valid until ${newExpiryStr})`
            });
        }
    }
    // Create immutable payment document in payments/{paymentId}
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const dateStr = new Date().toISOString().split('T')[0];
    const reference = (data.reference || '').trim() || `TXN-${Date.now()}`;
    const paymentDoc = {
        id: paymentId,
        memberId: data.memberUid,
        memberName: memberData.fullName || 'Member',
        planName,
        amount,
        paymentMethod: normalizedMethod,
        reference,
        date: dateStr,
        recordedBy: caller.fullName || caller.email || 'Reception Desk',
        recordedByUid: caller.uid,
        recordedByRole: caller.role,
        gymId: authz_1.CANONICAL_GYM_ID,
        notes: (data.notes || '').trim(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('payments').doc(paymentId).set(paymentDoc);
    // Write server audit log
    await (0, audit_1.writeServerAudit)(caller, {
        action: 'PAYMENT_RECORDED',
        targetEntity: 'PaymentRecord',
        targetId: paymentId,
        details: `Recorded ₹${amount} via ${normalizedMethod} for ${memberData.fullName || data.memberUid} (${reference})`
    });
    return {
        success: true,
        paymentId,
        payment: {
            ...paymentDoc,
            createdAt: new Date().toISOString()
        },
        membershipExtended
    };
}
//# sourceMappingURL=payments.js.map