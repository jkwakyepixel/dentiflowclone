import { getDocs, collection, query, doc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function forceReconcileDatabase(clinicId: string) {
  console.log("Starting full database reconciliation for clinic:", clinicId);
  
  const batch = writeBatch(db);
  let updatesCount = 0;

  // 1. Get all invoices
  const invoicesQuery = query(collection(db, 'invoices'), where('clinicId', '==', clinicId));
  const invoicesSnap = await getDocs(invoicesQuery);
  const invoices = invoicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

  // 2. Get all payments
  const paymentsQuery = query(collection(db, 'payments'), where('clinicId', '==', clinicId));
  const paymentsSnap = await getDocs(paymentsQuery);
  const payments = paymentsSnap.docs.map(d => ({ docId: d.id, ...d.data() } as any));

  for (const inv of invoices) {
    if ((inv.type || 'Invoice') !== 'Invoice') continue;

    // Find all valid payments for this invoice
    const invPayments = payments.filter(p => p.invoiceId === inv.id && !p.isDeleted);
    
    // 1. Calculate true sum of payments
    const trueAmountPaid = invPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const invoiceTotal = Number(inv.total) || 0;
    const trueBalance = Math.max(0, invoiceTotal - trueAmountPaid);

    let needsInvoiceUpdate = false;
    const invUpdate: any = {};

    if (Number(inv.amountPaid) !== trueAmountPaid) {
      invUpdate.amountPaid = trueAmountPaid;
      needsInvoiceUpdate = true;
    }
    if (Number(inv.balance) !== trueBalance) {
      invUpdate.balance = trueBalance;
      needsInvoiceUpdate = true;
    }

    if (needsInvoiceUpdate) {
      const invRef = doc(db, 'invoices', inv.id);
      batch.update(invRef, invUpdate);
      updatesCount++;
    }

    // 2. Force payment dates to exactly match invoice dates so monthly reports align perfectly
    const targetDate = inv.invoiceDate || (inv.createdAt?.toDate ? inv.createdAt.toDate().toISOString().split('T')[0] : null);
    if (targetDate) {
      for (const p of invPayments) {
        if (p.paymentDate !== targetDate) {
          const pRef = doc(db, 'payments', p.docId);
          batch.update(pRef, { paymentDate: targetDate });
          updatesCount++;
        }
      }
    }
  }

  if (updatesCount > 0) {
    await batch.commit();
  }
  
  return updatesCount;
}
