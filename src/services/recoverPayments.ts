import { getDocs, collection, query, doc, setDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function fixMissingPayments() {
  console.log("Starting missing payments sync...");
  let fixedCount = 0;

  // 1. Get all invoices
  const invoicesSnap = await getDocs(collection(db, 'invoices'));
  const invoices = invoicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

  // 2. Get all payments
  const paymentsSnap = await getDocs(collection(db, 'payments'));
  const payments = paymentsSnap.docs.map(d => d.data() as any);

  for (const inv of invoices) {
    const amtPaid = Number(inv.amountPaid) || 0;
    
    // Only care if the invoice claims to have money paid
    if (amtPaid > 0) {
      // Find all payments for this invoice
      const invPayments = payments.filter((p: any) => p.invoiceId === inv.id && !p.isDeleted);
      const sumOfPayments = invPayments.reduce((sum, p: any) => sum + (Number(p.amount) || 0), 0);
      
      // If the sum of formal payments is less than what the invoice claims was paid,
      // it means the amount was entered directly on the creation screen without a payment record.
      if (sumOfPayments < amtPaid) {
        const missingAmount = amtPaid - sumOfPayments;
        
        console.log(`Fixing Invoice ${inv.invoiceNumber}. Claims paid: ${amtPaid}. Found payments: ${sumOfPayments}. Missing: ${missingAmount}`);
        
        // Create a missing payment record
        const paymentRef = doc(collection(db, 'payments'));
        await setDoc(paymentRef, {
          clinicId: inv.clinicId || 'demo-clinic',
          patientId: inv.patientId,
          patientName: inv.patientName || 'Unknown Patient',
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber || 'INV-UNKNOWN',
          amount: missingAmount,
          paymentMethod: 'Cash', // default fallback
          reference: 'Initial Payment (Auto-recovered)',
          paymentDate: inv.invoiceDate || inv.createdAt?.toDate().toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          recordedBy: 'System Recovery',
          isDeleted: false,
          createdAt: inv.createdAt || new Date()
        });
        
        fixedCount++;
      }
    }
  }

  console.log(`Sync complete. Created ${fixedCount} missing payment records.`);
  return fixedCount;
}
