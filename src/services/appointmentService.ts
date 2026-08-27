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
import { logAction } from './auditService';
import type { Appointment } from '../types';

// ─────────────────────────────────────────────────
// Appointment Service — CRUD with clinic isolation
// ─────────────────────────────────────────────────

const COL = 'appointments';

/** Sort by date ASC, then startTime ASC */
const sortByDateAsc = (arr: Appointment[]): Appointment[] => {
  return [...arr].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.startTime || '').localeCompare(b.startTime || '');
  });
};

/** Filter out soft-deleted */
const excludeDeleted = (list: Appointment[]): Appointment[] =>
  list.filter((a) => !a.isDeleted);

// ── Read ──

/**
 * Fetch all appointments for a clinic (excluding soft-deleted).
 */
export const getAppointments = async (
  clinicId: string
): Promise<Appointment[]> => {
  const q = query(collection(db, COL), where('clinicId', '==', clinicId));
  const snap = await getDocs(q);
  const appts = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Appointment
  );
  return sortByDateAsc(excludeDeleted(appts));
};

/**
 * Fetch a single appointment by ID.
 */
export const getAppointmentById = async (
  appointmentId: string,
  clinicId?: string
): Promise<Appointment | null> => {
  const ref = doc(db, COL, appointmentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const appt = { id: snap.id, ...snap.data() } as Appointment;
  if (appt.isDeleted) return null;
  if (clinicId && appt.clinicId !== clinicId) return null;

  return appt;
};

/**
 * Fetch appointments for a specific date.
 */
export const getAppointmentsByDate = async (
  clinicId: string,
  date: string // YYYY-MM-DD
): Promise<Appointment[]> => {
  const q = query(
    collection(db, COL),
    where('clinicId', '==', clinicId),
    where('date', '==', date)
  );
  const snap = await getDocs(q);
  const appts = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Appointment
  );
  return sortByDateAsc(excludeDeleted(appts));
};

/**
 * Fetch appointments for a specific patient.
 */
export const getAppointmentsByPatient = async (
  clinicId: string,
  patientId: string
): Promise<Appointment[]> => {
  const q = query(
    collection(db, COL),
    where('clinicId', '==', clinicId),
    where('patientId', '==', patientId)
  );
  const snap = await getDocs(q);
  const appts = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Appointment
  );
  return sortByDateAsc(excludeDeleted(appts));
};

// ── Write ──

/**
 * Create a new appointment.
 */
export const createAppointment = async (
  clinicId: string,
  userId: string,
  data: Omit<Appointment, 'id' | 'clinicId' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const payload: Record<string, unknown> = {
    ...data,
    clinicId,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COL), payload);

  await logAction(
    clinicId,
    userId,
    'APPOINTMENT_CREATED',
    'appointment',
    docRef.id,
    `Booked ${data.appointmentType} for ${data.patientName} on ${data.date} at ${data.startTime}`
  );

  return docRef.id;
};

/**
 * Update an existing appointment.
 */
export const updateAppointment = async (
  id: string,
  clinicId: string,
  userId: string,
  data: Partial<Appointment>
): Promise<void> => {
  const existing = await getAppointmentById(id, clinicId);
  if (!existing) {
    throw new Error('Appointment not found or access denied');
  }

  const { id: _id, clinicId: _cid, createdAt: _ca, ...safeData } = data;

  await updateDoc(doc(db, COL, id), {
    ...safeData,
    updatedAt: serverTimestamp(),
  });

  const action =
    data.status === 'Cancelled' ? 'APPOINTMENT_CANCELLED' : 'APPOINTMENT_UPDATED';

  await logAction(
    clinicId,
    userId,
    action,
    'appointment',
    id,
    `${action === 'APPOINTMENT_CANCELLED' ? 'Cancelled' : 'Updated'} appointment for ${existing.patientName} on ${existing.date}`
  );
};

/**
 * Soft-delete an appointment.
 */
export const deleteAppointment = async (
  id: string,
  clinicId: string,
  userId: string
): Promise<void> => {
  const existing = await getAppointmentById(id, clinicId);
  if (!existing) {
    throw new Error('Appointment not found or access denied');
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
    'APPOINTMENT_DELETED',
    'appointment',
    id,
    `Soft-deleted appointment for ${existing.patientName} on ${existing.date}`
  );
};

// ── Real-time ──

/**
 * Subscribe to real-time appointment updates for a clinic.
 * Returns an unsubscribe function.
 */
export const subscribeAppointments = (
  clinicId: string,
  callback: (appointments: Appointment[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  const q = query(collection(db, COL), where('clinicId', '==', clinicId));

  return onSnapshot(
    q,
    (snapshot) => {
      const appts = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Appointment
      );
      callback(sortByDateAsc(excludeDeleted(appts)));
    },
    (error) => {
      console.error('[AppointmentService] Subscription error:', error);
      onError?.(error);
    }
  );
};
