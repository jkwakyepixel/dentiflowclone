import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logAction } from './auditService';
import type { Payment } from '../types';

// ─────────────────────────────────────────────────
// Payment Service — transactional payment recording
// ─────────────────────────────────────────────────

const COL = 'payments';

/** Sort by createdAt descending */
const sortByCreatedDesc = (arr: Payment[]): Payment[] => {
  return [...arr].sort((a, b) => {
    const ta = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : 0;
    const tb = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : 0;
    return tb - ta;
  });
};

/** Filter out soft-deleted */
const excludeDeleted = (list: Payment[]): Payment[] =>
  list.filter((p) => !p.isDeleted);

// ── Read ──

/**
 * Fetch all payments for a clinic (excluding soft-deleted).
 */
export const getPayments = async (clinicId: string): Promise<Payment[]> => {
  const q = query(collection(db, COL), where('clinicId', '==', clinicId));
  const snap = await getDocs(q);
  const payments = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Payment
  );
  return sortByCreatedDesc(excludeDeleted(payments));
};

/**
 * Fetch a single payment by ID.
 */
export const getPaymentById = async (
  paymentId: string,
  clinicId?: string
): Promise<Payment | null> => {
  const ref = doc(db, COL, paymentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const payment = { id: snap.id, ...snap.data() } as Payment;
  if (payment.isDeleted) return null;
  if (clinicId && payment.clinicId !== clinicId) return null;

  return payment;
};

/**
 * Fetch all payments for a specific patient.
 */
export const getPaymentsByPatient = async (
  clinicId: string,
  patientId: string
): Promise<Payment[]> => {
  const q = query(
    collection(db, COL),
    where('clinicId', '==', clinicId),
    where('patientId', '==', patientId)
  );
  const snap = await getDocs(q);
  const payments = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Payment
  );
  return sortByCreatedDesc(excludeDeleted(payments));
};

/**
 * Fetch all payments for a specific invoice.
 */
export const getPaymentsByInvoice = async (
  clinicId: string,
  invoiceId: string
): Promise<Payment[]> => {
  const q = query(
    collection(db, COL),
    where('clinicId', '==', clinicId),
    where('invoiceId', '==', invoiceId)
  );
  const snap = await getDocs(q);
  const payments = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Payment
  );
  return sortByCreatedDesc(excludeDeleted(payments));
};

// ── Write ──

/**
 * Record a payment inside a Firestore transaction.
 *
 * The transaction atomically:
 * 1. Reads the invoice document
 * 2. Validates the payment amount does not exceed the remaining balance
 * 3. Creates the payment document
 * 4. Updates the invoice's amountPaid, balance, and status
 *
 * If the invoice does not yet exist in Firestore (sample/demo data), a stub
 * invoice document is created for backward compatibility — this fallback will
 * be removed in Phase 2 when pages use real data.
 *
 * Signature kept identical to the original for backward compatibility with
 * existing page imports.
 */
export const recordPayment = async (
  clinicId: string,
  userId: string,
  paymentData: Omit<Payment, 'id' | 'createdAt' | 'clinicId'>
): Promise<boolean> => {
  const invoiceId = paymentData.invoiceId || 'inv-gen';
  const invoiceRef = doc(db, 'invoices', invoiceId);
  const newPaymentRef = doc(collection(db, COL));

  await runTransaction(db, async (transaction) => {
    // 1. Read the invoice
    const invoiceDoc = await transaction.get(invoiceRef);

    if (invoiceDoc.exists()) {
      const invoice = invoiceDoc.data();

      // Verify clinic ownership
      if (invoice.clinicId && invoice.clinicId !== clinicId) {
        throw new Error('Unauthorized: invoice belongs to a different clinic');
      }

      // 2. Calculate remaining balance
      const currentAmountPaid = Number(invoice.amountPaid) || 0;
      const invoiceTotal = Number(invoice.total) || 0;
      const currentBalance = invoiceTotal - currentAmountPaid;

      // 3. Validate: prevent overpayment
      const paymentAmount = Number(paymentData.amount);
      if (paymentAmount > currentBalance + 0.01) {
        throw new Error(
          `Payment of GH₵ ${paymentAmount.toFixed(2)} exceeds remaining balance of GH₵ ${currentBalance.toFixed(2)}`
        );
      }

      // 4. Compute new values
      const newAmountPaid = currentAmountPaid + paymentAmount;
      const newBalance = Math.max(0, invoiceTotal - newAmountPaid);

      let newStatus: string;
      if (newBalance <= 0) {
        newStatus = 'Paid';
      } else if (newAmountPaid > 0) {
        newStatus = 'Partially Paid';
      } else {
        newStatus = invoice.status || 'Unpaid';
      }

      // 5. Update invoice
      transaction.update(invoiceRef, {
        amountPaid: newAmountPaid,
        balance: newBalance,
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } else {
      // FALLBACK: invoice not in Firestore (sample data).
      // Create a stub so the payment still links properly.
      // This will be removed when pages use real Firestore invoices.
      console.warn(
        `[PaymentService] Invoice ${invoiceId} not found in Firestore. Creating stub for backward compat.`
      );
      transaction.set(invoiceRef, {
        clinicId,
        patientId: paymentData.patientId,
        patientName: paymentData.patientName,
        invoiceNumber: paymentData.invoiceNumber,
        total: Number(paymentData.amount),
        amountPaid: Number(paymentData.amount),
        balance: 0,
        status: 'Paid',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 6. Create the payment document
    transaction.set(newPaymentRef, {
      ...paymentData,
      clinicId,
      createdAt: serverTimestamp(),
    });
  });

  // 7. Audit log (outside transaction — never block a successful payment)
  try {
    await logAction(
      clinicId,
      userId,
      'PAYMENT_RECORDED',
      'payment',
      newPaymentRef.id,
      `Recorded GH₵ ${paymentData.amount} for ${paymentData.patientName} (${paymentData.invoiceNumber})`
    );
  } catch (auditErr) {
    console.warn('[PaymentService] Audit log skipped:', auditErr);
  }

  return true;
};

/**
 * Soft-delete a payment and reverse the invoice balance.
 *
 * The transaction atomically:
 * 1. Reads the payment document
 * 2. Reads the linked invoice document
 * 3. Reverses the payment amount from the invoice
 * 4. Recalculates amountPaid, balance, and status
 * 5. Marks the payment as soft-deleted
 */
export const deletePayment = async (
  paymentId: string,
  clinicId: string,
  userId: string
): Promise<void> => {
  const paymentRef = doc(db, COL, paymentId);

  await runTransaction(db, async (transaction) => {
    // 1. Read the payment
    const paymentSnap = await transaction.get(paymentRef);
    if (!paymentSnap.exists()) {
      throw new Error('Payment not found');
    }

    const payment = paymentSnap.data();
    if (payment.clinicId !== clinicId) {
      throw new Error('Unauthorized: payment belongs to a different clinic');
    }
    if (payment.isDeleted) {
      throw new Error('Payment has already been deleted');
    }

    // 2. Read the linked invoice
    const invoiceRef = doc(db, 'invoices', payment.invoiceId);
    const invoiceSnap = await transaction.get(invoiceRef);

    if (invoiceSnap.exists()) {
      const invoice = invoiceSnap.data();

      // 3. Reverse the payment
      const paymentAmount = Number(payment.amount) || 0;
      const newAmountPaid = Math.max(0, (Number(invoice.amountPaid) || 0) - paymentAmount);
      const invoiceTotal = Number(invoice.total) || 0;
      const newBalance = Math.max(0, invoiceTotal - newAmountPaid);

      // 4. Recalculate status
      let newStatus: string;
      if (newAmountPaid <= 0) {
        newStatus = 'Unpaid';
      } else if (newBalance <= 0) {
        newStatus = 'Paid';
      } else {
        newStatus = 'Partially Paid';
      }

      transaction.update(invoiceRef, {
        amountPaid: newAmountPaid,
        balance: newBalance,
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    }

    // 5. Soft-delete the payment
    transaction.update(paymentRef, {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: userId,
    });
  });

  // Audit log
  await logAction(
    clinicId,
    userId,
    'PAYMENT_DELETED',
    'payment',
    paymentId,
    `Reversed/deleted payment ${paymentId}`
  );
};

// ── Real-time ──

/**
 * Subscribe to real-time payment updates for a clinic.
 * Returns an unsubscribe function.
 */
export const subscribePayments = (
  clinicId: string,
  callback: (payments: Payment[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  const q = query(collection(db, COL), where('clinicId', '==', clinicId));

  return onSnapshot(
    q,
    (snapshot) => {
      const payments = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Payment
      );
      callback(sortByCreatedDesc(excludeDeleted(payments)));
    },
    (error) => {
      console.error('[PaymentService] Subscription error:', error);
      onError?.(error);
    }
  );
};
