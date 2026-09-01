import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Clinic } from '../types';

// ─────────────────────────────────────────────────
// Clinic Service — clinic profile & atomic counters
// ─────────────────────────────────────────────────

/**
 * Get a clinic's profile document.
 */
export const getClinic = async (clinicId: string): Promise<Clinic | null> => {
  const ref = doc(db, 'clinics', clinicId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Clinic;
};

/**
 * Create or update a clinic's profile document (merge).
 */
export const updateClinic = async (
  clinicId: string,
  data: Partial<Clinic>
): Promise<void> => {
  const ref = doc(db, 'clinics', clinicId);
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
};

/**
 * Generate the next patient ID atomically using a Firestore transaction.
 *
 * Reads `clinics/{clinicId}.patientCounter`, increments it, and returns
 * `PAT-XXXX` (zero-padded to 4 digits).
 *
 * Concurrent calls from different clients will never produce duplicate IDs
 * because Firestore transactions use optimistic concurrency control — if the
 * document changes between the read and the commit, the transaction retries.
 */
export const getNextPatientId = async (clinicId: string): Promise<string> => {
  const clinicRef = doc(db, 'clinics', clinicId);

  const nextCounter = await runTransaction(db, async (tx) => {
    const snap = await tx.get(clinicRef);
    const current = snap.exists() ? (snap.data().patientCounter ?? 0) : 0;
    const next = current + 1;
    tx.set(clinicRef, { patientCounter: next }, { merge: true });
    return next;
  });

  return `PAT-${String(nextCounter).padStart(4, '0')}`;
};

/**
 * Generate the next invoice number atomically using a Firestore transaction.
 *
 * Format: `INV-{YYYY}-{XXXX}` where YYYY is the current year.
 *
 * Uses the same optimistic-concurrency guarantee as `getNextPatientId`.
 */
export const getNextInvoiceNumber = async (
  clinicId: string
): Promise<string> => {
  const clinicRef = doc(db, 'clinics', clinicId);
  const year = new Date().getFullYear();

  const nextCounter = await runTransaction(db, async (tx) => {
    const snap = await tx.get(clinicRef);
    const current = snap.exists() ? (snap.data().invoiceCounter ?? 0) : 0;
    const next = current + 1;
    tx.set(clinicRef, { invoiceCounter: next }, { merge: true });
    return next;
  });

  return `INV-${year}-${String(nextCounter).padStart(4, '0')}`;
};

/**
 * Generate the next quotation number atomically using a Firestore transaction.
 *
 * Format: `QUO-{YYYY}-{XXXX}` where YYYY is the current year.
 */
export const getNextQuotationNumber = async (
  clinicId: string
): Promise<string> => {
  const clinicRef = doc(db, 'clinics', clinicId);
  const year = new Date().getFullYear();

  const nextCounter = await runTransaction(db, async (tx) => {
    const snap = await tx.get(clinicRef);
    const current = snap.exists() ? (snap.data().quotationCounter ?? 0) : 0;
    const next = current + 1;
    tx.set(clinicRef, { quotationCounter: next }, { merge: true });
    return next;
  });

  return `QUO-${year}-${String(nextCounter).padStart(4, '0')}`;
};
