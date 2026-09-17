import * as admin from 'firebase-admin';
import { CallerContext, CANONICAL_GYM_ID } from './authz';

export interface ServerAuditEvent {
  actorUid: string;
  actorRole: string;
  actorName: string;
  action:
    | 'STAFF_CREATED'
    | 'STAFF_ROLE_CHANGED'
    | 'STAFF_ACTIVATED'
    | 'STAFF_SUSPENDED'
    | 'STAFF_DELETED'
    | 'PAYMENT_RECORDED'
    | 'MEMBERSHIP_RENEWED'
    | 'OWNER_CREATED'
    | 'ADMIN_CREATED';
  targetEntity: string;
  targetId: string;
  details?: string;
}

/**
 * Appends an immutable, server-generated audit record in audit_logs/{id}.
 * The actor identity is strictly derived from verified CallerContext.
 */
export async function writeServerAudit(
  caller: CallerContext,
  event: Omit<ServerAuditEvent, 'actorUid' | 'actorRole' | 'actorName'>
): Promise<string> {
  const db = admin.firestore();
  const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const auditDoc = {
    id,
    actor: caller.fullName || caller.email || caller.uid, // Backward compatibility for UI
    actorUid: caller.uid,
    actorRole: caller.role,
    actorName: caller.fullName || caller.email,
    action: event.action,
    targetEntity: event.targetEntity,
    targetId: event.targetId,
    gymId: caller.gymId || CANONICAL_GYM_ID,
    details: event.details || '',
    timestamp: formattedTime,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('audit_logs').doc(id).set(auditDoc);
  return id;
}
