import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, parseISO, isSameMonth, subMonths, getDaysInMonth, getDate } from 'date-fns';
import type { Invoice, Patient, Payment } from '../types';

export const exportFinancialTrackerExcel = async (
  clinicName: string,
  patients: Patient[],
  invoices: Invoice[],
  payments: Payment[],
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

  // --- Calculations ---

  // 1. Current Month Invoices
  const currentInvoices = invoices.filter(inv => {
    try { return isSameMonth(parseISO(inv.invoiceDate || inv.date || ''), filterDate); } catch { return false; }
  });
  
  // 2. Prior Month Invoices
  const priorInvoices = invoices.filter(inv => {
    try { return isSameMonth(parseISO(inv.invoiceDate || inv.date || ''), prevMonthDate); } catch { return false; }
  });

  // 3. Current Month Payments
  const currentPayments = payments.filter(p => {
    try { return isSameMonth(parseISO(p.paymentDate || ''), filterDate); } catch { return false; }
  });

  // 4. Prior Month Payments
  const priorPayments = payments.filter(p => {
    try { return isSameMonth(parseISO(p.paymentDate || ''), prevMonthDate); } catch { return false; }
  });

  // Values
  const currentBilled = currentInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  const priorBilled = priorInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

  const currentOutstanding = currentInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);
  const priorOutstanding = priorInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);
  
  const currentRevenue = currentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const priorRevenue = priorPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const overdueInvoicesCount = currentInvoices.filter(i => new Date(i.dueDate) < new Date() && i.balance > 0).length;
  const discountsGiven = currentInvoices.reduce((sum, inv) => sum + (Number(inv.discount) || 0), 0);
  
  // Expenses / Net Profit (Calculated as 0 since we don't have expenses, net profit = revenue)
  const expensesPaid = 0.00;
  const netProfit = currentRevenue - expensesPaid;
  const collectionRate = currentBilled > 0 ? (currentRevenue / currentBilled) : 1;

  const revMoM = priorRevenue > 0 ? (currentRevenue - priorRevenue) / priorRevenue : 0;
  const billedMoM = priorBilled > 0 ? (currentBilled - priorBilled) / priorBilled : 0;

  // Patients
  const patientIdsSeen = new Set<string>();
  currentInvoices.forEach(inv => { if(inv.patientId) patientIdsSeen.add(inv.patientId); });
  currentPayments.forEach(p => { if(p.patientId) patientIdsSeen.add(p.patientId); });
  const patientsServed = patientIdsSeen.size || 1; // avoid /0

  const newPatientsCount = patients.filter(pt => {
    try { return pt.createdAt && isSameMonth(new Date(pt.createdAt), filterDate); } catch { return false; }
  }).length;
  
  const returningPatients = Math.max(0, patientsServed - newPatientsCount);
  const retentionRevPct = patientsServed > 0 ? returningPatients / patientsServed : 0;

  // Transactions
  const transactions = currentPayments.length;
  const avgTransaction = transactions > 0 ? currentRevenue / transactions : 0;
  const avgPatientAnnualValue = (currentRevenue * 12) / patientsServed;

  // Daily
  const activeDays = new Set(currentPayments.map(p => p.paymentDate?.split('T')[0] || p.paymentDate?.split(' ')[0])).size;
  const workingDays = activeDays > 0 ? activeDays : 1;
  const revPerWorkingDay = currentRevenue / workingDays;
  const daysPassed = isSameMonth(new Date(), filterDate) ? getDate(new Date()) : getDaysInMonth(filterDate);
  const runRate = daysPassed > 0 ? (currentRevenue / daysPassed) * getDaysInMonth(filterDate) : currentRevenue;

  // Payment Methods
  const methodTotals: Record<string, number> = { 'Cash': 0, 'Bank Transfer': 0, 'Wallet': 0, 'Cheque': 0 };
  currentPayments.forEach(p => {
    const m = p.paymentMethod || 'Cash';
    if (methodTotals[m] !== undefined) methodTotals[m] += Number(p.amount);
    else methodTotals['Cash'] += Number(p.amount);
  });

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

  const setThickBorder = (cell: ExcelJS.Cell) => {
    cell.border = {
      top: { style: 'medium' }, left: { style: 'medium' },
      bottom: { style: 'medium' }, right: { style: 'medium' }
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
  title3.value = `Management Overview · ${reportTitleDate} · Generated ${format(new Date(), 'dd MMMM yyyy \'at\' HH:mm')} · v9.4`;
  setFont(title3, 9, false, 'FF333333');
  title3.alignment = { horizontal: 'center', vertical: 'middle' };
  setBg(title3, 'FFF3F3F3');

  // --- How to read this report ---
  ws.mergeCells('J6:J10');
  const howToRead = ws.getCell('J6');
  howToRead.value = "HOW TO READ THIS REPORT\n\n- Revenue = cash collected (payments endpoint)\n\n- Outstanding = billed but not yet received\n\n- Collection Rate = Revenue / Billed (higher is better)\n\n- All amounts in GHS (Ghanaian Cedi)\n\n- Anomaly Report lists every item needing action";
  setFont(howToRead, 8, false);
  howToRead.alignment = { vertical: 'top', wrapText: true };
  howToRead.border = { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } };

  // --- Helper to build KPI blocks ---
  const buildKPI = (rowIdx: number, colStart: number, label: string, value: any, valColor: string, valBg: string, isPercent = false, isCurrency = false) => {
    // Label Row
    const labelRow = rowIdx;
    const valRow = rowIdx + 1;
    
    // Determine cell letters (colStart 1 => A, 3 => C, 5 => E, 7 => G)
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
  buildKPI(6, 1, '💰 Revenue Collected (GHS)', currentRevenue, 'FFD97706', 'FFFDF5E6', false, true);
  buildKPI(6, 3, '📝 Invoice Billed (GHS)', currentBilled, 'FF000000', 'FFFFFFFF', false, true);
  buildKPI(6, 5, '⏳ Outstanding Balance (GHS)', currentOutstanding, 'FFDC2626', 'FFFCE8E6', false, true);
  buildKPI(6, 7, '⚠️ Overdue Invoices', overdueInvoicesCount, 'FFDC2626', 'FFFCE8E6');

  // Row 8-9 (Operational Core)
  buildKPI(8, 1, '👥 Total Patients Served', patientsServed, 'FF000000', 'FFFFFFFF');
  buildKPI(8, 3, '🆕 New Patients', newPatientsCount, 'FF166534', 'FFE6F4EA');
  buildKPI(8, 5, '💳 Total Transactions', transactions, 'FF000000', 'FFFFFFFF');
  buildKPI(8, 7, '📊 Collection Rate %', collectionRate, 'FF166534', 'FFE6F4EA', true, false);

  // Row 10-11 (Growth & Averages)
  buildKPI(10, 1, '💰 Current Month Revenue (GHS)', currentRevenue, 'FFD97706', 'FFFDF5E6', false, true);
  buildKPI(10, 3, '⏮️ Prior Month Collections (GHS)', priorRevenue, 'FF000000', 'FFFFFFFF', false, true);
  buildKPI(10, 5, '📅 Revenue MoM Δ %', revMoM, 'FF000000', 'FFFFFFFF', true, false);
  buildKPI(10, 7, '💵 Avg Transaction (GHS)', avgTransaction, 'FFD97706', 'FFFDF5E6', false, true);

  // --- Daily Performance ---
  ws.mergeCells('A13:H13');
  const dPerf = ws.getCell('A13');
  dPerf.value = 'DAILY PERFORMANCE';
  setFont(dPerf, 10, true, 'FFFFFFFF');
  setBg(dPerf, 'FF0F2C1A');

  ws.mergeCells('A14:C14');
  ws.mergeCells('A15:C15');
  ws.getCell('A14').value = '📅 Working Days with Revenue';
  ws.getCell('A15').value = workingDays;
  setFont(ws.getCell('A14'), 9, true, 'FFFFFFFF'); setBg(ws.getCell('A14'), 'FF164B2C'); setBorder(ws.getCell('A14'));
  setFont(ws.getCell('A15'), 12, true, 'FF000000'); setBg(ws.getCell('A15'), 'FFFFFFFF'); setBorder(ws.getCell('A15'));

  ws.mergeCells('D14:E14');
  ws.mergeCells('D15:E15');
  ws.getCell('D14').value = '💸 Revenue per Working Day (GHS)';
  ws.getCell('D15').value = revPerWorkingDay;
  ws.getCell('D15').numFmt = '#,##0.00';
  setFont(ws.getCell('D14'), 9, true, 'FFFFFFFF'); setBg(ws.getCell('D14'), 'FF164B2C'); setBorder(ws.getCell('D14'));
  setFont(ws.getCell('D15'), 12, true, 'FFDC2626'); setBg(ws.getCell('D15'), 'FFFCE8E6'); setBorder(ws.getCell('D15'));

  ws.mergeCells('F14:H14');
  ws.mergeCells('F15:H15');
  ws.getCell('F14').value = '🚀 Implied Monthly Run Rate (GHS)';
  ws.getCell('F15').value = runRate;
  ws.getCell('F15').numFmt = '#,##0.00';
  setFont(ws.getCell('F14'), 9, true, 'FFFFFFFF'); setBg(ws.getCell('F14'), 'FF164B2C'); setBorder(ws.getCell('F14'));
  setFont(ws.getCell('F15'), 12, true, 'FF166534'); setBg(ws.getCell('F15'), 'FFE6F4EA'); setBorder(ws.getCell('F15'));

  // --- Insight String ---
  ws.mergeCells('A17:H17');
  const insight = ws.getCell('A17');
  insight.value = `💡 Revenue: GHS ${currentRevenue.toFixed(2)} (${(collectionRate*100).toFixed(1)}% collection rate) | GHS ${currentOutstanding.toFixed(2)} still outstanding on invoices | ${overdueInvoicesCount} HIGH-priority flag(s) to review`;
  setFont(insight, 9, false, 'FF555555');
  setBg(insight, 'FFF4F6F8');

  // --- Payment Methods ---
  ws.mergeCells('A19:D19');
  const payHeader = ws.getCell('A19');
  payHeader.value = 'REVENUE BY PAYMENT METHOD';
  setFont(payHeader, 10, true, 'FFFFFFFF');
  setBg(payHeader, 'FF0F2C1A');

  ws.mergeCells('A20:B20');
  ws.getCell('A20').value = 'Method';
  ws.getCell('C20').value = 'Amount (GHS)';
  ws.getCell('D20').value = '% of Revenue';
  ['A20', 'C20', 'D20'].forEach(c => {
    setFont(ws.getCell(c), 9, true, 'FFFFFFFF');
    setBg(ws.getCell(c), 'FF164B2C');
    setBorder(ws.getCell(c));
    ws.getCell(c).alignment = { horizontal: 'center' };
  });

  let r = 21;
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


  // ==========================================
  // SHEET 2: DETAILED INVOICES
  // ==========================================
  const wsInvoices = wb.addWorksheet('Invoices');
  wsInvoices.columns = [
    { header: 'Invoice #', key: 'invNum', width: 15 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Patient Name', key: 'patient', width: 25 },
    { header: 'Treatments / Services', key: 'services', width: 40 },
    { header: 'Billed (GHS)', key: 'billed', width: 15 },
    { header: 'Discount (GHS)', key: 'discount', width: 15 },
    { header: 'Paid (GHS)', key: 'paid', width: 15 },
    { header: 'Balance (GHS)', key: 'balance', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
  ];

  // Style Header
  wsInvoices.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsInvoices.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF164B2C' } };

  currentInvoices.forEach(inv => {
    const servicesStr = inv.items?.map(i => `${i.serviceName} (x${i.quantity})`).join(', ') || 'Dental Services';
    wsInvoices.addRow({
      invNum: inv.invoiceNumber,
      date: inv.invoiceDate || inv.date,
      patient: inv.patientName,
      services: servicesStr,
      billed: Number(inv.total) || 0,
      discount: Number(inv.discount) || 0,
      paid: Number(inv.amountPaid) || 0,
      balance: Number(inv.balance) || 0,
      status: inv.status
    });
  });

  // Format currency columns
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
    { header: 'Invoice #', key: 'invNum', width: 15 },
    { header: 'Amount (GHS)', key: 'amount', width: 15 },
    { header: 'Method', key: 'method', width: 15 },
    { header: 'Reference', key: 'reference', width: 20 },
    { header: 'Recorded By', key: 'recordedBy', width: 20 },
  ];

  // Style Header
  wsPayments.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsPayments.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF164B2C' } };

  currentPayments.forEach(p => {
    wsPayments.addRow({
      date: p.paymentDate?.split('T')[0] || p.paymentDate?.split(' ')[0],
      patient: p.patientName,
      invNum: p.invoiceNumber,
      amount: Number(p.amount) || 0,
      method: p.paymentMethod || 'Cash',
      reference: p.reference || '-',
      recordedBy: p.recordedBy || 'System'
    });
  });

  wsPayments.getColumn('D').numFmt = '#,##0.00';

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `Financial_Report_${reportTitleDate.replace(/\s+/g, '_')}.xlsx`;
  saveAs(blob, fileName);
};
