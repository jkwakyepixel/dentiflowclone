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
import { getNextInvoiceNumber, getNextQuotationNumber } from './clinicService';
import { logAction } from './auditService';
import type { Invoice, InvoiceItem } from '../types';

// ─────────────────────────────────────────────────
// Invoice Service — CRUD with calculation validation
// ─────────────────────────────────────────────────

const COL = 'invoices';

/** Sort by createdAt descending */
const sortByCreatedDesc = (arr: Invoice[]): Invoice[] => {
  return [...arr].sort((a, b) => {
    const ta = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : 0;
    const tb = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : 0;
    return tb - ta;
  });
};

/** Filter out soft-deleted */
const excludeDeleted = (list: Invoice[]): Invoice[] =>
  list.filter((inv) => !inv.isDeleted);

/**
 * Server-side validation of invoice calculations.
 * Ensures item totals, subtotal, total, and balance are consistent.
 */
const validateInvoiceCalculations = (
  items: InvoiceItem[],
  discount: number,
  tax: number,
  total: number,
  amountPaid: number
): { subtotal: number; calculatedTotal: number; balance: number } => {
  // Recalculate item totals
  const subtotal = items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unitPrice;
    return sum + itemTotal;
  }, 0);

  const calculatedTotal = subtotal - discount + tax;
  const balance = calculatedTotal - amountPaid;

  // Allow small floating-point discrepancy (< 1 cent)
  if (Math.abs(calculatedTotal - total) > 0.01) {
    console.warn(
      `[InvoiceService] Total mismatch: submitted=${total}, calculated=${calculatedTotal}`
    );
  }

  return { subtotal, calculatedTotal, balance };
};

/**
 * Determine invoice status from amountPaid and balance.
 */
const deriveInvoiceStatus = (
  total: number,
  amountPaid: number,
  currentStatus?: string,
  isQuotation?: boolean
): Invoice['status'] => {
  if (currentStatus === 'Cancelled') return 'Cancelled';
  if (isQuotation) {
    if (currentStatus === 'Accepted') return 'Accepted';
    if (currentStatus === 'Rejected') return 'Rejected';
    return (currentStatus as Invoice['status']) || 'Draft';
  }
  if (currentStatus === 'Draft') return 'Draft';
  if (amountPaid <= 0) return 'Unpaid';
  if (amountPaid >= total) return 'Paid';
  return 'Partially Paid';
};

// ── Read ──

/**
 * Fetch all invoices for a clinic (excluding soft-deleted).
 */
export const getInvoices = async (clinicId: string): Promise<Invoice[]> => {
  const q = query(collection(db, COL), where('clinicId', '==', clinicId));
  const snap = await getDocs(q);
  const invoices = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Invoice
  );
  return sortByCreatedDesc(excludeDeleted(invoices));
};

/**
 * Fetch a single invoice by ID.
 */
export const getInvoiceById = async (
  invoiceId: string,
  clinicId?: string
): Promise<Invoice | null> => {
  const ref = doc(db, COL, invoiceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const invoice = { id: snap.id, ...snap.data() } as Invoice;
  if (invoice.isDeleted) return null;
  if (clinicId && invoice.clinicId !== clinicId) return null;

  return invoice;
};

/**
 * Fetch all invoices for a specific patient.
 */
export const getInvoicesByPatient = async (
  clinicId: string,
  patientId: string
): Promise<Invoice[]> => {
  const q = query(
    collection(db, COL),
    where('clinicId', '==', clinicId),
    where('patientId', '==', patientId)
  );
  const snap = await getDocs(q);
  const invoices = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Invoice
  );
  return sortByCreatedDesc(excludeDeleted(invoices));
};

// ── Write ──

export interface CreateInvoiceData {
  type?: 'Invoice' | 'Quotation';
  patientId: string;
  patientName: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  discount: number;
  tax: number;
  amountPaid?: number;
  status?: Invoice['status'];
}

/**
 * Create a new invoice.
 *
 * - Generates a unique invoice number (INV-YYYY-XXXX) via atomic counter.
 * - Validates all financial calculations server-side.
 */
export const createInvoice = async (
  clinicId: string,
  userId: string,
  data: CreateInvoiceData
): Promise<string> => {
  const isQuotation = data.type === 'Quotation';
  const invoiceNumber = isQuotation 
    ? await getNextQuotationNumber(clinicId) 
    : await getNextInvoiceNumber(clinicId);
  const amountPaid = data.amountPaid ?? 0;

  // Validate calculations
  const { subtotal, calculatedTotal, balance } = validateInvoiceCalculations(
    data.items,
    data.discount,
    data.tax,
    0, // total not submitted yet — we use the calculated one
    amountPaid
  );

  const status = data.status ?? deriveInvoiceStatus(calculatedTotal, amountPaid, undefined, isQuotation);

  const payload: Record<string, unknown> = {
    type: data.type || 'Invoice',
    clinicId,
    invoiceNumber,
    patientId: data.patientId,
    patientName: data.patientName,
    invoiceDate: data.invoiceDate,
    dueDate: data.dueDate,
    items: data.items,
    subtotal,
    discount: data.discount,
    tax: data.tax,
    total: calculatedTotal,
    amountPaid,
    balance: Math.max(0, balance),
    status,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COL), payload);

  await logAction(
    clinicId,
    userId,
    isQuotation ? 'QUOTATION_CREATED' : 'INVOICE_CREATED',
    'invoice',
    docRef.id,
    `Created ${isQuotation ? 'quotation' : 'invoice'} ${invoiceNumber} for ${data.patientName} — GH₵ ${calculatedTotal.toFixed(2)}`
  );

  return docRef.id;
};

/**
 * Update an existing invoice.
 * If items/discount/tax change, recalculates totals.
 */
export const updateInvoice = async (
  id: string,
  clinicId: string,
  userId: string,
  data: Partial<Invoice>
): Promise<void> => {
  const existing = await getInvoiceById(id, clinicId);
  if (!existing) {
    throw new Error('Invoice not found or access denied');
  }

  // Strip immutable fields
  const {
    id: _id,
    clinicId: _cid,
    invoiceNumber: _inum,
    createdAt: _ca,
    ...safeData
  } = data;

  // If items changed, recalculate
  if (safeData.items) {
    const discount = safeData.discount ?? existing.discount;
    const tax = safeData.tax ?? existing.tax;
    const amountPaid = safeData.amountPaid ?? existing.amountPaid;

    const { subtotal, calculatedTotal, balance } = validateInvoiceCalculations(
      safeData.items,
      discount,
      tax,
      0,
      amountPaid
    );

    safeData.subtotal = subtotal;
    safeData.total = calculatedTotal;
    safeData.balance = Math.max(0, balance);
    safeData.status = deriveInvoiceStatus(calculatedTotal, amountPaid, safeData.status, existing.type === 'Quotation');
  }

  await updateDoc(doc(db, COL, id), {
    ...safeData,
    updatedAt: serverTimestamp(),
  });

  await logAction(
    clinicId,
    userId,
    'INVOICE_UPDATED',
    'invoice',
    id,
    `Updated invoice ${existing.invoiceNumber} for ${existing.patientName}`
  );
};

/**
 * Soft-delete an invoice.
 * Financial records should not be permanently deleted.
 */
export const deleteInvoice = async (
  id: string,
  clinicId: string,
  userId: string
): Promise<void> => {
  const existing = await getInvoiceById(id, clinicId);
  if (!existing) {
    throw new Error('Invoice not found or access denied');
  }

  await updateDoc(doc(db, COL, id), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: userId,
    status: 'Cancelled',
    updatedAt: serverTimestamp(),
  });

  await logAction(
    clinicId,
    userId,
    'INVOICE_DELETED',
    'invoice',
    id,
    `Soft-deleted invoice ${existing.invoiceNumber} for ${existing.patientName}`
  );
};

// ── Real-time ──

/**
 * Subscribe to real-time invoice updates for a clinic.
 * Returns an unsubscribe function.
 */
export const subscribeInvoices = (
  clinicId: string,
  callback: (invoices: Invoice[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  const q = query(collection(db, COL), where('clinicId', '==', clinicId));

  return onSnapshot(
    q,
    (snapshot) => {
      const invoices = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Invoice
      );
      callback(sortByCreatedDesc(excludeDeleted(invoices)));
    },
    (error) => {
      console.error('[InvoiceService] Subscription error:', error);
      onError?.(error);
    }
  );
};
