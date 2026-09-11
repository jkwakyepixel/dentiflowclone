import * as XLSX from 'xlsx';
import { format, parseISO, isSameMonth } from 'date-fns';
import type { Invoice, Patient, Payment } from '../types';

export const exportFinancialTrackerExcel = (
  clinicName: string,
  patients: Patient[],
  invoices: Invoice[],
  payments: Payment[],
  selectedMonth?: string // YYYY-MM format, e.g. "2026-08"
) => {
  const wb = XLSX.utils.book_new();

  // Filter invoices by month if selected
  let filteredInvoices = invoices;
  let reportTitleDate = 'All Time';
  
  if (selectedMonth) {
    const [year, month] = selectedMonth.split('-');
    const filterDate = new Date(Number(year), Number(month) - 1, 1);
    reportTitleDate = format(filterDate, 'MMMM yyyy');
    
    filteredInvoices = invoices.filter(inv => {
      if (!inv.invoiceDate && !inv.date) return false;
      try {
        const invDate = parseISO(inv.invoiceDate || inv.date || '');
        return isSameMonth(invDate, filterDate);
      } catch (e) {
        return false;
      }
    });
  }

  // Calculate Aggregates
  let sumBilled = 0;
  let sumPaid = 0;
  let sumBalance = 0;
  let openInvoicesCount = 0;

  filteredInvoices.forEach(inv => {
    const billed = Number(inv.total) || 0;
    const paid = Number(inv.amountPaid) || 0;
    const balance = Number(inv.balance) || 0;
    
    sumBilled += billed;
    sumPaid += paid;
    sumBalance += balance;
    
    if (inv.status !== 'Paid' || balance > 0) {
      openInvoicesCount += 1;
    }
  });

  const reportRows: any[] = [];

  // --- Title & Clinic Header ---
  reportRows.push([clinicName || 'Dentiflow Clinic']);
  reportRows.push(['Financial Report', reportTitleDate]);
  reportRows.push(['Generated on:', format(new Date(), 'dd MMM yyyy')]);
  reportRows.push([]); // blank spacing

  // --- High Level Summary ---
  reportRows.push(['EXECUTIVE SUMMARY']);
  reportRows.push(['Total Billed (GH₵)', 'Total Paid (GH₵)', 'Total Balance Due (GH₵)', 'Unpaid Invoices']);
  reportRows.push([
    Number(sumBilled.toFixed(2)),
    Number(sumPaid.toFixed(2)),
    Number(sumBalance.toFixed(2)),
    openInvoicesCount
  ]);
  reportRows.push([]); 
  reportRows.push([]); 

  // --- Detailed Invoices Breakdown ---
  reportRows.push(['DETAILED INVOICE LOG']);
  reportRows.push([
    'Invoice #',
    'Date',
    'Patient Name',
    'Description / Treatments',
    'Total Billed (GH₵)',
    'Amount Paid (GH₵)',
    'Balance Due (GH₵)',
    'Status'
  ]);

  if (filteredInvoices.length === 0) {
    reportRows.push(['No invoices found for this period.', '', '', '', '', '', '', '']);
  } else {
    // Sort by date descending
    filteredInvoices.sort((a, b) => {
      const d1 = new Date(b.invoiceDate || b.date || 0).getTime();
      const d2 = new Date(a.invoiceDate || a.date || 0).getTime();
      return d1 - d2;
    });

    filteredInvoices.forEach(inv => {
      const desc = inv.items?.map(i => i.serviceName).join(', ') || 'Dental Procedures';
      reportRows.push([
        inv.invoiceNumber,
        inv.invoiceDate || inv.date || '—',
        inv.patientName,
        desc,
        Number(inv.total) || 0,
        Number(inv.amountPaid) || 0,
        Number(inv.balance) || 0,
        inv.status || 'Unpaid'
      ]);
    });
  }

  // Final totals row at bottom
  reportRows.push([]);
  reportRows.push([
    'TOTALS',
    '',
    '',
    '',
    Number(sumBilled.toFixed(2)),
    Number(sumPaid.toFixed(2)),
    Number(sumBalance.toFixed(2)),
    ''
  ]);

  const sheet = XLSX.utils.aoa_to_sheet(reportRows);

  // Column formatting to make it look beautiful
  sheet['!cols'] = [
    { wch: 18 }, // Invoice #
    { wch: 14 }, // Date
    { wch: 25 }, // Patient Name
    { wch: 40 }, // Description
    { wch: 20 }, // Total Billed
    { wch: 20 }, // Amount Paid
    { wch: 20 }, // Balance Due
    { wch: 15 }  // Status
  ];

  XLSX.utils.book_append_sheet(wb, sheet, 'Financial Report');

  const fileName = `Financial_Report_${reportTitleDate.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
