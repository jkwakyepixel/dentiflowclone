import * as XLSX from 'xlsx';
import type { Invoice, Patient, Payment } from '../types';

export interface PatientFinancialSummary {
  patientId: string;
  patientName: string;
  totalBilled: number;
  totalPaid: number;
  totalBalanceDue: number;
  openInvoicesCount: number;
  invoices: Invoice[];
}

export const exportFinancialTrackerExcel = (
  clinicName: string,
  patients: Patient[],
  invoices: Invoice[],
  payments: Payment[]
) => {
  const wb = XLSX.utils.book_new();

  // 1. Group financial records by patient
  const patientMap: Record<string, PatientFinancialSummary> = {};

  patients.forEach(p => {
    const pName = `${p.firstName} ${p.lastName}`.trim();
    patientMap[p.id || pName] = {
      patientId: p.patientId || p.id || '',
      patientName: pName,
      totalBilled: 0,
      totalPaid: 0,
      totalBalanceDue: 0,
      openInvoicesCount: 0,
      invoices: []
    };
  });

  // Aggregate invoices
  invoices.forEach(inv => {
    const key = inv.patientId || inv.patientName || 'unknown';
    if (!patientMap[key]) {
      patientMap[key] = {
        patientId: inv.patientId || '',
        patientName: inv.patientName || 'Unknown Patient',
        totalBilled: 0,
        totalPaid: 0,
        totalBalanceDue: 0,
        openInvoicesCount: 0,
        invoices: []
      };
    }
    const billed = Number(inv.total) || 0;
    const paid = Number(inv.amountPaid) || 0;
    const balance = Number(inv.balance) || 0;

    patientMap[key].totalBilled += billed;
    patientMap[key].totalPaid += paid;
    patientMap[key].totalBalanceDue += balance;
    if (inv.status !== 'Paid' || balance > 0) {
      patientMap[key].openInvoicesCount += 1;
    }
    patientMap[key].invoices.push(inv);
  });

  const patientSummaries = Object.values(patientMap);

  // 2. Build Sheet 1: "Summary" exactly matching the reference photo
  const summaryRows: any[] = [];

  // Title Block
  summaryRows.push(['Patient Invoice Summary']);
  summaryRows.push(['Each row links to one patient\'s sheet (tab at bottom). Add a row here whenever you add a new patient sheet.']);
  summaryRows.push([]); // blank row

  // Table Headers
  summaryRows.push([
    'Patient Name',
    'Total Billed (GH₵)',
    'Total Paid (GH₵)',
    'Total Balance Due (GH₵)',
    'Open Invoices (Unpaid/Overdue)'
  ]);

  let sumBilled = 0;
  let sumPaid = 0;
  let sumBalance = 0;
  let sumOpenInvoices = 0;

  patientSummaries.forEach(ps => {
    sumBilled += ps.totalBilled;
    sumPaid += ps.totalPaid;
    sumBalance += ps.totalBalanceDue;
    sumOpenInvoices += ps.openInvoicesCount;

    summaryRows.push([
      ps.patientName,
      ps.totalBilled > 0 ? Number(ps.totalBilled.toFixed(2)) : '-',
      ps.totalPaid > 0 ? Number(ps.totalPaid.toFixed(2)) : '-',
      ps.totalBalanceDue > 0 ? Number(ps.totalBalanceDue.toFixed(2)) : '-',
      ps.openInvoicesCount
    ]);
  });

  // Total Summary Row
  summaryRows.push([
    'TOTAL (all patients)',
    Number(sumBilled.toFixed(2)),
    Number(sumPaid.toFixed(2)),
    Number(sumBalance.toFixed(2)),
    sumOpenInvoices
  ]);

  summaryRows.push([]);
  summaryRows.push(['Adding a New Patient Guide:']);
  summaryRows.push(['1) Right-click the "Template" tab -> Move or Copy -> check "Create a copy" -> OK']);
  summaryRows.push(['2) Rename the new tab to the patient\'s name']);
  summaryRows.push(['3) Fill in the patient info block and invoice rows']);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);

  // Adjust column widths for Sheet 1
  summarySheet['!cols'] = [
    { wch: 26 }, // Patient Name
    { wch: 20 }, // Total Billed
    { wch: 20 }, // Total Paid
    { wch: 25 }, // Total Balance Due
    { wch: 30 }, // Open Invoices
  ];

  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // 3. Build Template Sheet
  const templateRows: any[] = [
    ['Patient Name:', '[Patient Name Here]', '', 'Patient ID:', '[PAT-XXXX]'],
    ['Phone:', '+233 XX XXX XXXX', '', 'Email:', 'patient@example.com'],
    [],
    ['Invoice #', 'Date', 'Description / Treatment', 'Total Billed (GH₵)', 'Amount Paid (GH₵)', 'Balance Due (GH₵)', 'Status', 'Due Date'],
    ['INV-2026-0001', '2026-08-26', 'Routine Cleaning & Examination', 350.00, 350.00, 0.00, 'Paid', '2026-09-09'],
    ['TOTALS', '', '', 350.00, 350.00, 0.00, '', '']
  ];
  const templateSheet = XLSX.utils.aoa_to_sheet(templateRows);
  templateSheet['!cols'] = [
    { wch: 18 }, { wch: 14 }, { wch: 32 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, templateSheet, 'Template - Copy Me');

  // 4. Build Individual Tabs for Patients with Invoices
  patientSummaries.forEach(ps => {
    // Sheet name limit is 31 chars in Excel
    const safeSheetName = ps.patientName.substring(0, 30).replace(/[:\\\/\?\*\[\]]/g, '');
    
    const ptRows: any[] = [
      ['Patient Name:', ps.patientName, '', 'Patient ID:', ps.patientId || 'PAT-0001'],
      ['Clinic:', clinicName || 'Bright Smile Dental Clinic', '', 'Export Date:', '26 Aug 2026'],
      [],
      ['Invoice #', 'Invoice Date', 'Description / Treatments', 'Total Billed (GH₵)', 'Amount Paid (GH₵)', 'Balance Due (GH₵)', 'Status', 'Due Date']
    ];

    if (ps.invoices.length === 0) {
      ptRows.push(['No Invoices', '—', 'No recorded procedures yet', 0, 0, 0, 'Clean', '—']);
    } else {
      ps.invoices.forEach(inv => {
        const desc = inv.items?.map(i => i.serviceName).join(', ') || 'Dental Procedures';
        ptRows.push([
          inv.invoiceNumber,
          inv.invoiceDate || inv.date || '2026-08-26',
          desc,
          Number(inv.total) || 0,
          Number(inv.amountPaid) || 0,
          Number(inv.balance) || 0,
          inv.status || 'Unpaid',
          inv.dueDate || '2026-09-09'
        ]);
      });
    }

    ptRows.push([
      'TOTALS',
      '',
      '',
      Number(ps.totalBilled.toFixed(2)),
      Number(ps.totalPaid.toFixed(2)),
      Number(ps.totalBalanceDue.toFixed(2)),
      ps.totalBalanceDue === 0 ? 'Paid in Full' : 'Outstanding',
      ''
    ]);

    const ptSheet = XLSX.utils.aoa_to_sheet(ptRows);
    ptSheet['!cols'] = [
      { wch: 18 }, { wch: 14 }, { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 14 }
    ];

    // Ensure unique sheet name
    if (!wb.SheetNames.includes(safeSheetName)) {
      XLSX.utils.book_append_sheet(wb, ptSheet, safeSheetName);
    }
  });

  // 5. Download the Excel file
  const fileName = `patient_invoice_tracker_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
