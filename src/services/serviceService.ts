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
import type { ClinicService } from '../types';

// ─────────────────────────────────────────────────
// Service Service — dental services catalog CRUD
// ─────────────────────────────────────────────────

const COL = 'services';

/** Sort alphabetically by name */
const sortByName = (arr: ClinicService[]): ClinicService[] =>
  [...arr].sort((a, b) => a.name.localeCompare(b.name));

/** Filter out soft-deleted */
const excludeDeleted = (list: ClinicService[]): ClinicService[] =>
  list.filter((s) => !s.isDeleted);

// ── Read ──

/**
 * Fetch all services for a clinic (excluding soft-deleted).
 */
export const getServices = async (
  clinicId: string
): Promise<ClinicService[]> => {
  const q = query(collection(db, COL), where('clinicId', '==', clinicId));
  const snap = await getDocs(q);
  const services = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as ClinicService
  );
  return sortByName(excludeDeleted(services));
};

/**
 * Fetch only active services (for use in invoice/appointment forms).
 */
export const getActiveServices = async (
  clinicId: string
): Promise<ClinicService[]> => {
  const all = await getServices(clinicId);
  return all.filter((s) => s.active !== false); // Default to active if not set
};

/**
 * Fetch a single service by ID.
 */
export const getServiceById = async (
  serviceId: string,
  clinicId?: string
): Promise<ClinicService | null> => {
  const ref = doc(db, COL, serviceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const service = { id: snap.id, ...snap.data() } as ClinicService;
  if (service.isDeleted) return null;
  if (clinicId && service.clinicId !== clinicId) return null;

  return service;
};

// ── Write ──

/**
 * Create a new service in the catalog.
 */
export const createService = async (
  clinicId: string,
  userId: string,
  data: Omit<ClinicService, 'id' | 'clinicId' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const payload: Record<string, unknown> = {
    ...data,
    clinicId,
    active: data.active !== false, // Default to active
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COL), payload);

  await logAction(
    clinicId,
    userId,
    'SERVICE_CREATED',
    'service',
    docRef.id,
    `Created service "${data.name}" at GH₵ ${data.price.toFixed(2)}`
  );

  return docRef.id;
};

/**
 * Update an existing service.
 */
export const updateService = async (
  id: string,
  clinicId: string,
  userId: string,
  data: Partial<ClinicService>
): Promise<void> => {
  const existing = await getServiceById(id, clinicId);
  if (!existing) {
    throw new Error('Service not found or access denied');
  }

  const { id: _id, clinicId: _cid, createdAt: _ca, ...safeData } = data;

  await updateDoc(doc(db, COL, id), {
    ...safeData,
    updatedAt: serverTimestamp(),
  });

  await logAction(
    clinicId,
    userId,
    'SERVICE_UPDATED',
    'service',
    id,
    `Updated service "${existing.name}"`
  );
};

/**
 * Soft-delete a service (marks as inactive and deleted).
 */
export const deleteService = async (
  id: string,
  clinicId: string,
  userId: string
): Promise<void> => {
  const existing = await getServiceById(id, clinicId);
  if (!existing) {
    throw new Error('Service not found or access denied');
  }

  await updateDoc(doc(db, COL, id), {
    isDeleted: true,
    active: false,
    updatedAt: serverTimestamp(),
  });

  await logAction(
    clinicId,
    userId,
    'SERVICE_DELETED',
    'service',
    id,
    `Soft-deleted service "${existing.name}"`
  );
};

// ── Real-time ──

/**
 * Subscribe to real-time service updates for a clinic.
 * Returns an unsubscribe function.
 */
export const subscribeServices = (
  clinicId: string,
  callback: (services: ClinicService[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  const q = query(collection(db, COL), where('clinicId', '==', clinicId));

  return onSnapshot(
    q,
    (snapshot) => {
      const services = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as ClinicService
      );
      callback(sortByName(excludeDeleted(services)));
    },
    (error) => {
      console.error('[ServiceService] Subscription error:', error);
      onError?.(error);
    }
  );
};
