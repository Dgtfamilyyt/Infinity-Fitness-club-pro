import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { requireAdminOrOwner, CANONICAL_GYM_ID } from './authz';
import { writeServerAudit } from './audit';

export interface RecordPaymentData {
  memberUid: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  planId?: string;
  notes?: string;
}

const ALLOWED_METHODS: Record<string, 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Other'> = {
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
export async function handleRecordPayment(
  data: RecordPaymentData,
  auth: { uid: string; token: any } | undefined
) {
  const caller = await requireAdminOrOwner(auth);

  if (!data.memberUid || typeof data.memberUid !== 'string') {
    throw new HttpsError('invalid-argument', 'Target memberUid is required.');
  }

  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpsError('invalid-argument', 'Amount must be a finite positive number.');
  }

  const rawMethod = (data.paymentMethod || '').trim().toLowerCase();
  const normalizedMethod = ALLOWED_METHODS[rawMethod] || 'Other';

  const db = admin.firestore();
  const memberRef = db.collection('profiles').doc(data.memberUid);
  const memberSnap = await memberRef.get();

  if (!memberSnap.exists) {
    throw new HttpsError('not-found', `Member profile ${data.memberUid} not found.`);
  }

  const memberData = memberSnap.data()!;
  if (memberData.role !== 'member') {
    throw new HttpsError('invalid-argument', 'Payments can only be recorded for accounts with role "member".');
  }

  // Determine membership extension if plan is specified or member has active plan
  const targetPlanId = data.planId || memberData.membershipPlanId;
  let planName = memberData.planName || 'General Membership';
  let membershipExtended = false;

  if (targetPlanId) {
    const planSnap = await db.collection('membership_plans').doc(targetPlanId).get();
    if (planSnap.exists) {
      const planData = planSnap.data()!;
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
      await writeServerAudit(caller, {
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
    gymId: CANONICAL_GYM_ID,
    notes: (data.notes || '').trim(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('payments').doc(paymentId).set(paymentDoc);

  // Write server audit log
  await writeServerAudit(caller, {
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
