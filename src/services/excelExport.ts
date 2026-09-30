import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, parseISO, isSameMonth, subMonths, getDaysInMonth, getDate, parse } from 'date-fns';
import type { Invoice, Patient, Payment, Expense } from '../types';

/**
 * Safely parse any date string/object the app stores.
 * Handles: ISO "2026-09-30", human "30 Sep 2026", ISO with time "2026-09-30T...",
 * Firestore Timestamp objects, and plain Date objects.
 * Returns null if unparseable.
 */
function safeParseDate(value: any): Date | null {
  if (!value) return null;

  // Firestore Timestamp → has .toDate()
  if (typeof value?.toDate === 'function') {
    return value.toDate();
  }

  // Already a Date
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== 'string') return null;

  const s = value.trim();
  if (!s) return null;

  // Try ISO first  ("2026-09-30" or "2026-09-30T14:00:00Z")
  try {
    const d = parseISO(s);
    if (!isNaN(d.getTime())) return d;
  } catch { /* ignore */ }

  // Try "d MMM yyyy" ("30 Sep 2026")
  try {
    const d = parse(s, 'd MMM yyyy', new Date());
    if (!isNaN(d.getTime())) return d;
  } catch { /* ignore */ }

  // Try "dd MMM yyyy" ("05 Sep 2026" with leading zero)
  try {
    const d = parse(s, 'dd MMM yyyy', new Date());
    if (!isNaN(d.getTime())) return d;
  } catch { /* ignore */ }

  // Try native Date constructor as last resort
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  } catch { /* ignore */ }

  return null;
}

/**
 * Check if a date value falls in the same month/year as the target date.
 */
function isInMonth(value: any, targetMonth: Date): boolean {
  const d = safeParseDate(value);
  if (!d) return false;
  return isSameMonth(d, targetMonth);
}

/**
 * Format a date value to a readable string for the Excel detail sheets.
 */
function formatDateForSheet(value: any): string {
  const d = safeParseDate(value);
  if (!d) return String(value || '—');
  return format(d, 'yyyy-MM-dd');
}

export const exportFinancialTrackerExcel = async (
  clinicName: string,
  patients: Patient[],
  invoices: Invoice[],
  payments: Payment[],
  expenses: Expense[],
  selectedMonth?: string // YYYY-MM format, e.g. "2026-08"
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Monthly Summary', {
    views: [{ showGridLines: false }]
  });

  // Target Date calculations
  const now = new Date();
  let filterDate = now;
  let reportTitleDate = format(now, 'MMMM yyyy');
  if (selectedMonth) {
    const [year, month] = selectedMonth.split('-');
    filterDate = new Date(Number(year), Number(month) - 1, 1);
    reportTitleDate = format(filterDate, 'MMMM yyyy');
  }

  const prevMonthDate = subMonths(filterDate, 1);

  // --- DEBUG: Log counts so we can verify ---
  console.log(`[ExcelExport] Generating for: ${reportTitleDate}`);
  console.log(`[ExcelExport] Total invoices in system: ${invoices.length}`);
  console.log(`[ExcelExport] Total payments in system: ${payments.length}`);
  console.log(`[ExcelExport] Total expenses in system: ${expenses.length}`);

  // --- Filter data for the selected month ---

  const currentInvoices = invoices.filter(inv =>
    isInMonth(inv.invoiceDate || inv.date, filterDate)
  );

  const priorInvoices = invoices.filter(inv =>
    isInMonth(inv.invoiceDate || inv.date, prevMonthDate)
  );

  const currentPayments = payments.filter(p =>
    isInMonth(p.paymentDate, filterDate)
  );

  const priorPayments = payments.filter(p =>
    isInMonth(p.paymentDate, prevMonthDate)
  );

  const currentExpenses = expenses.filter(exp =>
    isInMonth(exp.date, filterDate)
  );

  console.log(`[ExcelExport] Current month invoices: ${currentInvoices.length}`);
  console.log(`[ExcelExport] Current month payments: ${currentPayments.length}`);
  console.log(`[ExcelExport] Current month expenses: ${currentExpenses.length}`);

  // --- KPI Calculations ---

  const currentBilled = currentInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  const priorBilled = priorInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

  const currentOutstanding = currentInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);

  const currentRevenue = currentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const priorRevenue = priorPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const overdueInvoicesCount = currentInvoices.filter(i => {
    const dueDate = safeParseDate(i.dueDate);
    return dueDate && dueDate < new Date() && (Number(i.balance) || 0) > 0;
  }).length;

  const discountsGiven = currentInvoices.reduce((sum, inv) => sum + (Number(inv.discount) || 0), 0);

  const expensesPaid = currentExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const netProfit = currentRevenue - expensesPaid;
  const collectionRate = currentBilled > 0 ? (currentRevenue / currentBilled) : 0;

  const revMoM = priorRevenue > 0 ? (currentRevenue - priorRevenue) / priorRevenue : 0;

  // Patients
  const patientIdsSeen = new Set<string>();
  currentInvoices.forEach(inv => { if (inv.patientId) patientIdsSeen.add(inv.patientId); });
  currentPayments.forEach(p => { if (p.patientId) patientIdsSeen.add(p.patientId); });
  const patientsServed = patientIdsSeen.size;

  const newPatientsCount = patients.filter(pt => isInMonth(pt.createdAt, filterDate)).length;

  // Transactions
  const transactions = currentPayments.length;
  const avgTransaction = transactions > 0 ? currentRevenue / transactions : 0;

  // Daily
  const paymentDays = new Set<string>();
  currentPayments.forEach(p => {
    const d = safeParseDate(p.paymentDate);
    if (d) paymentDays.add(format(d, 'yyyy-MM-dd'));
  });
  const workingDays = paymentDays.size > 0 ? paymentDays.size : 1;
  const revPerWorkingDay = currentRevenue / workingDays;
  const daysPassed = isSameMonth(new Date(), filterDate) ? getDate(new Date()) : getDaysInMonth(filterDate);
  const runRate = daysPassed > 0 ? (currentRevenue / daysPassed) * getDaysInMonth(filterDate) : currentRevenue;

  // Payment Methods — dynamically collect ALL methods actually used
  const methodTotals: Record<string, number> = {};
  currentPayments.forEach(p => {
    const m = p.paymentMethod || 'Cash';
    methodTotals[m] = (methodTotals[m] || 0) + (Number(p.amount) || 0);
  });

  console.log(`[ExcelExport] Revenue: ${currentRevenue}, Billed: ${currentBilled}, Outstanding: ${currentOutstanding}, Expenses: ${expensesPaid}`);

  // --- Excel Setup ---

  ws.columns = [
    { width: 18 }, { width: 18 }, // A-B
    { width: 18 }, { width: 18 }, // C-D
    { width: 18 }, { width: 18 }, // E-F
    { width: 18 }, { width: 18 }, // G-H
    { width: 3 },                 // I (Spacer)
    { width: 35 }                 // J (How to read)
  ];

  const setBg = (cell: ExcelJS.Cell, argb: string) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
  };

  const setFont = (cell: ExcelJS.Cell, size: number, bold: boolean, color: string = 'FF000000') => {
    cell.font = { name: 'Arial', size, bold, color: { argb: color } };
  };

  const setBorder = (cell: ExcelJS.Cell) => {
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  };

  // --- Header ---
  ws.mergeCells('A2:H2');
  const title1 = ws.getCell('A2');
  title1.value = clinicName.toUpperCase();
  setFont(title1, 16, true, 'FFDCA451');
  title1.alignment = { horizontal: 'center', vertical: 'middle' };
  setBg(title1, 'FF0F2C1A');

  ws.mergeCells('A3:H3');
  const title2 = ws.getCell('A3');
  title2.value = 'MONTHLY FINANCIAL SUMMARY';
  setFont(title2, 12, true, 'FFDCA451');
  title2.alignment = { horizontal: 'center', vertical: 'middle' };
  setBg(title2, 'FF164B2C');

  ws.mergeCells('A4:H4');
  const title3 = ws.getCell('A4');
  title3.value = `Management Overview · ${reportTitleDate} · Generated ${format(new Date(), 'dd MMMM yyyy \'at\' HH:mm')}`;
  setFont(title3, 9, false, 'FF333333');
  title3.alignment = { horizontal: 'center', vertical: 'middle' };
  setBg(title3, 'FFF3F3F3');

  // --- How to read this report ---
  ws.mergeCells('J6:J10');
  const howToRead = ws.getCell('J6');
  howToRead.value = "HOW TO READ THIS REPORT\n\n- Revenue = cash collected (payments)\n\n- Outstanding = billed but not yet received\n\n- Collection Rate = Revenue / Billed\n\n- All amounts in GHS (₵)\n\n- Net Profit = Revenue − Expenses";
  setFont(howToRead, 8, false);
  howToRead.alignment = { vertical: 'top', wrapText: true };
  howToRead.border = { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } };

  // --- Helper to build KPI blocks ---
  const buildKPI = (rowIdx: number, colStart: number, label: string, value: any, valColor: string, valBg: string, isPercent = false, isCurrency = false) => {
    const labelRow = rowIdx;
    const valRow = rowIdx + 1;

    const c1 = String.fromCharCode(64 + colStart);
    const c2 = String.fromCharCode(64 + colStart + 1);

    ws.mergeCells(`${c1}${labelRow}:${c2}${labelRow}`);
    const lCell = ws.getCell(`${c1}${labelRow}`);
    lCell.value = label;
    setFont(lCell, 9, true, 'FFFFFFFF');
    lCell.alignment = { horizontal: 'center', vertical: 'middle' };
    setBg(lCell, 'FF164B2C');
    setBorder(lCell);
    ws.getCell(`${c2}${labelRow}`).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    ws.mergeCells(`${c1}${valRow}:${c2}${valRow}`);
    const vCell = ws.getCell(`${c1}${valRow}`);

    if (isPercent) {
      vCell.value = value;
      vCell.numFmt = '0.0%';
    } else if (isCurrency) {
      vCell.value = value;
      vCell.numFmt = '#,##0.00';
    } else {
      vCell.value = value;
    }

    setFont(vCell, 12, true, valColor);
    vCell.alignment = { horizontal: 'center', vertical: 'middle' };
    setBg(vCell, valBg);
    setBorder(vCell);
    ws.getCell(`${c2}${valRow}`).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  };

  // Row 6-7 (Financial Core)
  buildKPI(6, 1, 'Revenue Collected (GHS)', currentRevenue, 'FFD97706', 'FFFDF5E6', false, true);
  buildKPI(6, 3, 'Invoice Billed (GHS)', currentBilled, 'FF000000', 'FFFFFFFF', false, true);
  buildKPI(6, 5, 'Outstanding Balance (GHS)', currentOutstanding, 'FFDC2626', 'FFFCE8E6', false, true);
  buildKPI(6, 7, 'Overdue Invoices', overdueInvoicesCount, 'FFDC2626', 'FFFCE8E6');

  // Row 8-9 (Operational Core)
  buildKPI(8, 1, 'Total Patients Served', patientsServed, 'FF000000', 'FFFFFFFF');
  buildKPI(8, 3, 'New Patients', newPatientsCount, 'FF166534', 'FFE6F4EA');
  buildKPI(8, 5, 'Total Transactions', transactions, 'FF000000', 'FFFFFFFF');
  buildKPI(8, 7, 'Collection Rate %', collectionRate, 'FF166534', 'FFE6F4EA', true, false);

  // Row 10-11 (Growth & Averages)
  buildKPI(10, 1, 'Current Month Revenue (GHS)', currentRevenue, 'FFD97706', 'FFFDF5E6', false, true);
  buildKPI(10, 3, 'Prior Month Collections (GHS)', priorRevenue, 'FF000000', 'FFFFFFFF', false, true);
  buildKPI(10, 5, 'Revenue MoM Change %', revMoM, 'FF000000', 'FFFFFFFF', true, false);
  buildKPI(10, 7, 'Avg Transaction (GHS)', avgTransaction, 'FFD97706', 'FFFDF5E6', false, true);

  // Row 12-13 (Profitability)
  buildKPI(12, 1, 'Expenses Paid (GHS)', expensesPaid, 'FFDC2626', 'FFFCE8E6', false, true);
  buildKPI(12, 3, 'Net Profit (GHS)', netProfit, netProfit >= 0 ? 'FF166534' : 'FFDC2626', netProfit >= 0 ? 'FFE6F4EA' : 'FFFCE8E6', false, true);
  buildKPI(12, 5, 'Discounts Given (GHS)', discountsGiven, 'FF000000', 'FFFFFFFF', false, true);
  ws.mergeCells('G12:H13');
  const emptyVal = ws.getCell('G12');
  setBg(emptyVal, 'FFFDF5E6');

  // --- Daily Performance ---
  ws.mergeCells('A15:H15');
  const dPerf = ws.getCell('A15');
  dPerf.value = 'DAILY PERFORMANCE';
  setFont(dPerf, 10, true, 'FFFFFFFF');
  setBg(dPerf, 'FF0F2C1A');

  ws.mergeCells('A16:C16');
  ws.mergeCells('A17:C17');
  ws.getCell('A16').value = 'Working Days with Revenue';
  ws.getCell('A17').value = workingDays;
  setFont(ws.getCell('A16'), 9, true, 'FFFFFFFF'); setBg(ws.getCell('A16'), 'FF164B2C'); setBorder(ws.getCell('A16'));
  setFont(ws.getCell('A17'), 12, true, 'FF000000'); setBg(ws.getCell('A17'), 'FFFFFFFF'); setBorder(ws.getCell('A17'));

  ws.mergeCells('D16:E16');
  ws.mergeCells('D17:E17');
  ws.getCell('D16').value = 'Revenue per Working Day (GHS)';
  ws.getCell('D17').value = revPerWorkingDay;
  ws.getCell('D17').numFmt = '#,##0.00';
  setFont(ws.getCell('D16'), 9, true, 'FFFFFFFF'); setBg(ws.getCell('D16'), 'FF164B2C'); setBorder(ws.getCell('D16'));
  setFont(ws.getCell('D17'), 12, true, 'FFDC2626'); setBg(ws.getCell('D17'), 'FFFCE8E6'); setBorder(ws.getCell('D17'));

  ws.mergeCells('F16:H16');
  ws.mergeCells('F17:H17');
  ws.getCell('F16').value = 'Implied Monthly Run Rate (GHS)';
  ws.getCell('F17').value = runRate;
  ws.getCell('F17').numFmt = '#,##0.00';
  setFont(ws.getCell('F16'), 9, true, 'FFFFFFFF'); setBg(ws.getCell('F16'), 'FF164B2C'); setBorder(ws.getCell('F16'));
  setFont(ws.getCell('F17'), 12, true, 'FF166534'); setBg(ws.getCell('F17'), 'FFE6F4EA'); setBorder(ws.getCell('F17'));

  // --- Insight String ---
  ws.mergeCells('A19:H19');
  const insight = ws.getCell('A19');
  insight.value = `Revenue: GHS ${currentRevenue.toFixed(2)} | Expenses: GHS ${expensesPaid.toFixed(2)} | Net Profit: GHS ${netProfit.toFixed(2)} | Collection Rate: ${(collectionRate * 100).toFixed(1)}% | ${overdueInvoicesCount} overdue invoice(s)`;
  setFont(insight, 9, false, 'FF555555');
  setBg(insight, 'FFF4F6F8');

  // --- Payment Methods ---
  const methodKeys = Object.keys(methodTotals);
  if (methodKeys.length > 0) {
    ws.mergeCells('A21:D21');
    const payHeader = ws.getCell('A21');
    payHeader.value = 'REVENUE BY PAYMENT METHOD';
    setFont(payHeader, 10, true, 'FFFFFFFF');
    setBg(payHeader, 'FF0F2C1A');

    ws.mergeCells('A22:B22');
    ws.getCell('A22').value = 'Method';
    ws.getCell('C22').value = 'Amount (GHS)';
    ws.getCell('D22').value = '% of Revenue';
    ['A22', 'C22', 'D22'].forEach(c => {
      setFont(ws.getCell(c), 9, true, 'FFFFFFFF');
      setBg(ws.getCell(c), 'FF164B2C');
      setBorder(ws.getCell(c));
      ws.getCell(c).alignment = { horizontal: 'center' };
    });

    let r = 23;
    for (const [method, amount] of Object.entries(methodTotals)) {
      ws.mergeCells(`A${r}:B${r}`);
      ws.getCell(`A${r}`).value = method;
      ws.getCell(`C${r}`).value = amount;
      ws.getCell(`D${r}`).value = currentRevenue > 0 ? amount / currentRevenue : 0;

      ws.getCell(`C${r}`).numFmt = '#,##0.00';
      ws.getCell(`D${r}`).numFmt = '0.0%';
      setBorder(ws.getCell(`A${r}`));
      setBorder(ws.getCell(`C${r}`));
      setBorder(ws.getCell(`D${r}`));
      r++;
    }
  }

  // ==========================================
  // SHEET 2: DETAILED INVOICES
  // ==========================================
  const wsInvoices = wb.addWorksheet('Invoices');
  wsInvoices.columns = [
    { header: 'Invoice #', key: 'invNum', width: 18 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Patient Name', key: 'patient', width: 25 },
    { header: 'Treatments / Services', key: 'services', width: 40 },
    { header: 'Billed (GHS)', key: 'billed', width: 15 },
    { header: 'Discount (GHS)', key: 'discount', width: 15 },
    { header: 'Paid (GHS)', key: 'paid', width: 15 },
    { header: 'Balance (GHS)', key: 'balance', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
  ];

  wsInvoices.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsInvoices.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF164B2C' } };

  currentInvoices.forEach(inv => {
    const servicesStr = inv.items?.map(i => `${i.serviceName} (x${i.quantity})`).join(', ') || 'Dental Services';
    wsInvoices.addRow({
      invNum: inv.invoiceNumber,
      date: formatDateForSheet(inv.invoiceDate || inv.date),
      patient: inv.patientName,
      services: servicesStr,
      billed: Number(inv.total) || 0,
      discount: Number(inv.discount) || 0,
      paid: Number(inv.amountPaid) || 0,
      balance: Number(inv.balance) || 0,
      status: inv.status
    });
  });

  // Totals row for invoices
  if (currentInvoices.length > 0) {
    const totRow = wsInvoices.addRow({
      invNum: '',
      date: '',
      patient: '',
      services: 'TOTALS',
      billed: currentBilled,
      discount: discountsGiven,
      paid: currentInvoices.reduce((s, i) => s + (Number(i.amountPaid) || 0), 0),
      balance: currentOutstanding,
      status: ''
    });
    totRow.font = { bold: true };
  }

  ['E', 'F', 'G', 'H'].forEach(col => {
    wsInvoices.getColumn(col).numFmt = '#,##0.00';
  });

  // ==========================================
  // SHEET 3: DETAILED PAYMENTS
  // ==========================================
  const wsPayments = wb.addWorksheet('Payments');
  wsPayments.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Patient Name', key: 'patient', width: 25 },
    { header: 'Invoice #', key: 'invNum', width: 18 },
    { header: 'Amount (GHS)', key: 'amount', width: 15 },
    { header: 'Method', key: 'method', width: 18 },
    { header: 'Reference', key: 'reference', width: 20 },
    { header: 'Recorded By', key: 'recordedBy', width: 20 },
  ];

  wsPayments.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsPayments.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF164B2C' } };

  currentPayments.forEach(p => {
    wsPayments.addRow({
      date: formatDateForSheet(p.paymentDate),
      patient: p.patientName,
      invNum: p.invoiceNumber,
      amount: Number(p.amount) || 0,
      method: p.paymentMethod || 'Cash',
      reference: p.reference || '-',
      recordedBy: p.recordedBy || 'System'
    });
  });

  // Totals row for payments
  if (currentPayments.length > 0) {
    const totRow = wsPayments.addRow({
      date: '',
      patient: '',
      invNum: 'TOTAL',
      amount: currentRevenue,
      method: '',
      reference: '',
      recordedBy: ''
    });
    totRow.font = { bold: true };
  }

  wsPayments.getColumn('D').numFmt = '#,##0.00';

  // ==========================================
  // SHEET 4: DETAILED EXPENSES
  // ==========================================
  const wsExpenses = wb.addWorksheet('Expenses');
  wsExpenses.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Amount (GHS)', key: 'amount', width: 15 },
    { header: 'Recorded By', key: 'recordedBy', width: 20 },
  ];

  wsExpenses.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsExpenses.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF164B2C' } };

  currentExpenses.forEach(e => {
    wsExpenses.addRow({
      date: formatDateForSheet(e.date),
      category: e.category,
      description: e.description,
      amount: Number(e.amount) || 0,
      recordedBy: e.recordedBy || 'System'
    });
  });

  // Totals row for expenses
  if (currentExpenses.length > 0) {
    const totRow = wsExpenses.addRow({
      date: '',
      category: '',
      description: 'TOTAL',
      amount: expensesPaid,
      recordedBy: ''
    });
    totRow.font = { bold: true };
  }

  wsExpenses.getColumn('D').numFmt = '#,##0.00';

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `Financial_Report_${reportTitleDate.replace(/\s+/g, '_')}.xlsx`;
  saveAs(blob, fileName);
};
