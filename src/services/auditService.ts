import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { AuditLog, AuditEntityType } from '../types';

// ─────────────────────────────────────────────────
// Audit Service — records important clinic actions
// ─────────────────────────────────────────────────

/**
 * Create an audit log entry.
 * Fails silently so audit logging never blocks a user-facing operation.
 */
export const logAction = async (
  clinicId: string,
  userId: string,
  action: string,
  entityType: AuditEntityType,
  entityId: string,
  details: string
): Promise<void> => {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      clinicId,
      userId,
      action,
      entityType,
      entityId,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error('[AuditService] Failed to log action:', err);
  }
};

/**
 * Retrieve audit logs for a clinic, sorted newest-first.
 * Uses in-memory sort to avoid requiring a composite Firestore index.
 */
export const getAuditLogs = async (
  clinicId: string,
  maxResults: number = 50
): Promise<AuditLog[]> => {
  const q = query(
    collection(db, 'auditLogs'),
    where('clinicId', '==', clinicId)
  );
  const snap = await getDocs(q);
  const logs = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as AuditLog
  );

  // Sort newest first (in-memory to avoid composite index)
  logs.sort((a, b) => {
    const ta = typeof a.timestamp?.toMillis === 'function' ? a.timestamp.toMillis() : 0;
    const tb = typeof b.timestamp?.toMillis === 'function' ? b.timestamp.toMillis() : 0;
    return tb - ta;
  });

  return logs.slice(0, maxResults);
};

/**
 * Get audit logs filtered by entity.
 */
export const getAuditLogsByEntity = async (
  clinicId: string,
  entityType: AuditEntityType,
  entityId: string
): Promise<AuditLog[]> => {
  const q = query(
    collection(db, 'auditLogs'),
    where('clinicId', '==', clinicId),
    where('entityType', '==', entityType),
    where('entityId', '==', entityId)
  );
  const snap = await getDocs(q);
  const logs = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as AuditLog
  );

  logs.sort((a, b) => {
    const ta = typeof a.timestamp?.toMillis === 'function' ? a.timestamp.toMillis() : 0;
    const tb = typeof b.timestamp?.toMillis === 'function' ? b.timestamp.toMillis() : 0;
    return tb - ta;
  });

  return logs;
};
