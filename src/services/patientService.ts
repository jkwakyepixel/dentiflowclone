import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getNextPatientId } from './clinicService';
import { logAction } from './auditService';
import type { Patient } from '../types';

// ─────────────────────────────────────────────────
// Patient Service — full CRUD with clinic isolation
// ─────────────────────────────────────────────────

const COL = 'patients';

/** Helper: sort by createdAt descending (in-memory, no composite index needed) */
const sortByCreatedDesc = (arr: Patient[]): Patient[] => {
  return [...arr].sort((a, b) => {
    const ta = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : 0;
    const tb = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : 0;
    return tb - ta;
  });
};

/** Helper: filter out soft-deleted documents */
const excludeDeleted = (patients: Patient[]): Patient[] =>
  patients.filter((p) => !p.isDeleted);

// ── Read ──

/**
 * Fetch all patients for a clinic (excluding soft-deleted).
 */
export const getPatients = async (clinicId: string): Promise<Patient[]> => {
  const q = query(collection(db, COL), where('clinicId', '==', clinicId));
  const snap = await getDocs(q);
  const patients = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Patient
  );
  return sortByCreatedDesc(excludeDeleted(patients));
};

/**
 * Fetch a single patient by Firestore document ID.
 * Returns null if not found or belongs to a different clinic.
 */
export const getPatientById = async (
  patientId: string,
  clinicId?: string
): Promise<Patient | null> => {
  const ref = doc(db, COL, patientId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const patient = { id: snap.id, ...snap.data() } as Patient;
  if (patient.isDeleted) return null;
  if (clinicId && patient.clinicId !== clinicId) return null;

  return patient;
};

/**
 * Search patients by name, phone, or patient ID (client-side filter).
 * Firestore doesn't support native full-text search, so we fetch all
 * clinic patients and filter in-memory — perfectly fine for small clinic datasets.
 */
export const searchPatients = async (
  clinicId: string,
  searchQuery: string
): Promise<Patient[]> => {
  const all = await getPatients(clinicId);
  if (!searchQuery.trim()) return all;

  const q = searchQuery.toLowerCase().trim();
  return all.filter(
    (p) =>
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.patientId.toLowerCase().includes(q) ||
      (p.email && p.email.toLowerCase().includes(q))
  );
};

// ── Write ──

/**
 * Create a new patient.
 *
 * Automatically generates a unique patient ID (PAT-XXXX) via an atomic
 * Firestore counter transaction.
 */
export const createPatient = async (
  clinicId: string,
  userId: string,
  data: Omit<Patient, 'id' | 'clinicId' | 'patientId' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const patientId = await getNextPatientId(clinicId);

  const payload: Record<string, unknown> = {
    ...data,
    clinicId,
    patientId,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COL), payload);

  await logAction(
    clinicId,
    userId,
    'PATIENT_CREATED',
    'patient',
    docRef.id,
    `Created patient ${data.firstName} ${data.lastName} (${patientId})`
  );

  return docRef.id;
};

/**
 * Update an existing patient.
 * Validates clinic ownership before writing.
 */
export const updatePatient = async (
  id: string,
  clinicId: string,
  userId: string,
  data: Partial<Patient>
): Promise<void> => {
  // Verify clinic ownership
  const existing = await getPatientById(id, clinicId);
  if (!existing) {
    throw new Error('Patient not found or access denied');
  }

  // Strip fields that should not be overwritten
  const { id: _id, clinicId: _cid, patientId: _pid, createdAt: _ca, ...safeData } = data;

  await updateDoc(doc(db, COL, id), {
    ...safeData,
    updatedAt: serverTimestamp(),
  });

  await logAction(
    clinicId,
    userId,
    'PATIENT_UPDATED',
    'patient',
    id,
    `Updated patient ${existing.firstName} ${existing.lastName} (${existing.patientId})`
  );
};

/**
 * Soft-delete a patient.
 * Sets `isDeleted`, `deletedAt`, and `deletedBy` — does not remove the document.
 */
export const deletePatient = async (
  id: string,
  clinicId: string,
  userId: string
): Promise<void> => {
  const existing = await getPatientById(id, clinicId);
  if (!existing) {
    throw new Error('Patient not found or access denied');
  }

  await updateDoc(doc(db, COL, id), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: userId,
    updatedAt: serverTimestamp(),
  });

  await logAction(
    clinicId,
    userId,
    'PATIENT_DELETED',
    'patient',
    id,
    `Soft-deleted patient ${existing.firstName} ${existing.lastName} (${existing.patientId})`
  );
};

// ── Real-time ──

/**
 * Subscribe to real-time patient updates for a clinic.
 * Returns an unsubscribe function.
 */
export const subscribePatients = (
  clinicId: string,
  callback: (patients: Patient[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  const q = query(collection(db, COL), where('clinicId', '==', clinicId));

  return onSnapshot(
    q,
    (snapshot) => {
      const patients = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Patient
      );
      callback(sortByCreatedDesc(excludeDeleted(patients)));
    },
    (error) => {
      console.error('[PatientService] Subscription error:', error);
      onError?.(error);
    }
  );
};
