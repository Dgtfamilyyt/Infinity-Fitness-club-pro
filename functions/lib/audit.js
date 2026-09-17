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
exports.writeServerAudit = writeServerAudit;
const admin = __importStar(require("firebase-admin"));
const authz_1 = require("./authz");
/**
 * Appends an immutable, server-generated audit record in audit_logs/{id}.
 * The actor identity is strictly derived from verified CallerContext.
 */
async function writeServerAudit(caller, event) {
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
        gymId: caller.gymId || authz_1.CANONICAL_GYM_ID,
        details: event.details || '',
        timestamp: formattedTime,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('audit_logs').doc(id).set(auditDoc);
    return id;
}
//# sourceMappingURL=audit.js.map