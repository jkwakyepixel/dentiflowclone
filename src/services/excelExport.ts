import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, parseISO, isSameMonth, subMonths, isAfter, getDaysInMonth, getDate } from 'date-fns';
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
  const prevMonthName = format(prevMonthDate, 'MMMM yyyy');
  const twoMonthsAgoDate = subMonths(filterDate, 2);

  // --- Calculations ---

  // 1. Current Month Invoices
  const currentInvoices = invoices.filter(inv => {
    try { return isSameMonth(parseISO(inv.invoiceDate || inv.date || ''), filterDate); } catch { return false; }
  });
  
  // 2. Prior Month Invoices
  const priorInvoices = invoices.filter(inv => {
    try { return isSameMonth(parseISO(inv.invoiceDate || inv.date || ''), prevMonthDate); } catch { return false; }
  });

  const twoMonthsAgoInvoices = invoices.filter(inv => {
    try { return isSameMonth(parseISO(inv.invoiceDate || inv.date || ''), twoMonthsAgoDate); } catch { return false; }
  });

  // 3. Current Month Payments
  const currentPayments = payments.filter(p => {
    try { return isSameMonth(parseISO(p.paymentDate || ''), filterDate); } catch { return false; }
  });

  // 4. Prior Month Payments
  const priorPayments = payments.filter(p => {
    try { return isSameMonth(parseISO(p.paymentDate || ''), prevMonthDate); } catch { return false; }
  });

  const twoMonthsAgoPayments = payments.filter(p => {
    try { return isSameMonth(parseISO(p.paymentDate || ''), twoMonthsAgoDate); } catch { return false; }
  });

  // Values
  const currentBilled = currentInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  const priorBilled = priorInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  const twoMonthsAgoBilled = twoMonthsAgoInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

  const currentOutstanding = currentInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);
  const priorOutstanding = priorInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);
  const twoMonthsAgoOutstanding = twoMonthsAgoInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);
  
  const currentRevenue = currentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const priorRevenue = priorPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const twoMonthsAgoRevenue = twoMonthsAgoPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

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

  // Row 6-7
  buildKPI(6, 1, '💰 Revenue Collected (GHS)', currentRevenue, 'FFD97706', 'FFFDF5E6', false, true);
  buildKPI(6, 3, '💸 Expenses Paid (GHS)', expensesPaid, 'FF000000', 'FFFFFFFF', false, true);
  buildKPI(6, 5, '📈 Net Profit/Loss (GHS)', netProfit, 'FF000000', 'FFFFFFFF', false, true);
  buildKPI(6, 7, '📝 Invoice Billed (GHS)', currentBilled, 'FF000000', 'FFFFFFFF', false, true);

  // Row 8-9
  buildKPI(8, 1, '⏳ Outstanding (GHS)', currentOutstanding, 'FFDC2626', 'FFFCE8E6', false, true);
  buildKPI(8, 3, '🏷️ Discounts Given (GHS)', discountsGiven, 'FFDC2626', 'FFFCE8E6', false, true);
  buildKPI(8, 5, '📊 Collection Rate %', collectionRate, 'FF166534', 'FFE6F4EA', true, false);
  buildKPI(8, 7, '📅 Revenue MoM Δ %', revMoM, 'FF000000', 'FFFFFFFF', true, false);

  // Row 10-11
  buildKPI(10, 1, '👥 Patients Served', patientsServed, 'FF000000', 'FFFFFFFF');
  buildKPI(10, 3, '💳 Transactions', transactions, 'FF000000', 'FFFFFFFF');
  buildKPI(10, 5, '💵 Avg Transaction (GHS)', avgTransaction, 'FFD97706', 'FFFDF5E6', false, true);
  buildKPI(10, 7, '⚠️ Overdue Invoices', overdueInvoicesCount, 'FFDC2626', 'FFFCE8E6');

  // Row 12-13
  buildKPI(12, 1, '💰 Current Month Revenue (GHS)', currentRevenue, 'FFD97706', 'FFFDF5E6', false, true);
  buildKPI(12, 3, '⏮️ Prior Month Collections (GHS)', priorRevenue, 'FFD97706', 'FFFDF5E6', false, true);
  buildKPI(12, 5, '🆕 New Patients', newPatientsCount, 'FFDC2626', 'FFFCE8E6');
  buildKPI(12, 7, '🔄 Returning Patients', returningPatients, 'FF166534', 'FFE6F4EA');

  // Row 14-15
  buildKPI(14, 1, '🤝 Retention %', retentionRevPct, 'FFDC2626', 'FFFCE8E6', true, false);
  buildKPI(14, 3, '⭐ Billed MoM Δ %', billedMoM, 'FFDC2626', 'FFFCE8E6', true, false);
  buildKPI(14, 5, '💎 Avg Patient Annual Value (GHS)', avgPatientAnnualValue, 'FFD97706', 'FFFDF5E6', false, true);
  ws.mergeCells('G14:H15');
  const emptyVal = ws.getCell('G14');
  setBg(emptyVal, 'FFFDF5E6');

  // --- Daily Performance ---
  ws.mergeCells('A17:H17');
  const dPerf = ws.getCell('A17');
  dPerf.value = 'DAILY PERFORMANCE';
  setFont(dPerf, 10, true, 'FFFFFFFF');
  setBg(dPerf, 'FF0F2C1A');

  ws.mergeCells('A18:C18');
  ws.mergeCells('A19:C19');
  ws.getCell('A18').value = '📅 Working Days with Revenue';
  ws.getCell('A19').value = workingDays;
  setFont(ws.getCell('A18'), 9, true, 'FFFFFFFF'); setBg(ws.getCell('A18'), 'FF164B2C'); setBorder(ws.getCell('A18'));
  setFont(ws.getCell('A19'), 12, true, 'FF000000'); setBg(ws.getCell('A19'), 'FFFFFFFF'); setBorder(ws.getCell('A19'));

  ws.mergeCells('D18:E18');
  ws.mergeCells('D19:E19');
  ws.getCell('D18').value = '💸 Revenue per Working Day (GHS)';
  ws.getCell('D19').value = revPerWorkingDay;
  ws.getCell('D19').numFmt = '#,##0.00';
  setFont(ws.getCell('D18'), 9, true, 'FFFFFFFF'); setBg(ws.getCell('D18'), 'FF164B2C'); setBorder(ws.getCell('D18'));
  setFont(ws.getCell('D19'), 12, true, 'FFDC2626'); setBg(ws.getCell('D19'), 'FFFCE8E6'); setBorder(ws.getCell('D19'));

  ws.mergeCells('F18:H18');
  ws.mergeCells('F19:H19');
  ws.getCell('F18').value = '🚀 Implied Monthly Run Rate (GHS)';
  ws.getCell('F19').value = runRate;
  ws.getCell('F19').numFmt = '#,##0.00';
  setFont(ws.getCell('F18'), 9, true, 'FFFFFFFF'); setBg(ws.getCell('F18'), 'FF164B2C'); setBorder(ws.getCell('F18'));
  setFont(ws.getCell('F19'), 12, true, 'FF166534'); setBg(ws.getCell('F19'), 'FFE6F4EA'); setBorder(ws.getCell('F19'));

  // --- Insight String ---
  ws.mergeCells('A21:H21');
  const insight = ws.getCell('A21');
  insight.value = `💡 Net Profit: GHS ${netProfit.toFixed(2)} (${(collectionRate*100).toFixed(1)}% collection rate) | GHS ${currentOutstanding.toFixed(2)} still outstanding on invoices | ${overdueInvoicesCount} HIGH-priority flag(s) to review`;
  setFont(insight, 9, false, 'FF555555');
  setBg(insight, 'FFF4F6F8');

  // --- Comparative Table ---
  ws.mergeCells('A23:H23');
  const compHeader = ws.getCell('A23');
  compHeader.value = 'COMPARATIVE PROFIT & LOSS — MULTI-MONTH TREND';
  setFont(compHeader, 10, true, 'FFFFFFFF');
  setBg(compHeader, 'FF0F2C1A');

  const compHeaders = ['Metric', '', format(twoMonthsAgoDate, 'MMMM yyyy'), prevMonthName, reportTitleDate, 'MoM Δ (GHS)', 'MoM Δ (%)', ''];
  ws.mergeCells('A24:B24');
  ws.mergeCells('G24:H24');
  compHeaders.forEach((h, i) => {
    if (h !== '') {
      const cell = ws.getCell(24, i + 1);
      cell.value = h;
      setFont(cell, 9, true, 'FFFFFFFF');
      setBg(cell, 'FF164B2C');
      setBorder(cell);
      cell.alignment = { horizontal: 'center' };
    }
  });

  const addCompRow = (r: number, metric: string, m1: number, m2: number, m3: number) => {
    ws.mergeCells(`A${r}:B${r}`);
    ws.mergeCells(`G${r}:H${r}`);
    const deltaGhs = m3 - m2;
    const deltaPct = m2 > 0 ? deltaGhs / m2 : 0;
    
    ws.getCell(`A${r}`).value = metric;
    ws.getCell(`C${r}`).value = m1;
    ws.getCell(`D${r}`).value = m2;
    ws.getCell(`E${r}`).value = m3;
    ws.getCell(`F${r}`).value = deltaGhs;
    ws.getCell(`G${r}`).value = deltaPct;

    ['C', 'D', 'E', 'F'].forEach(c => {
      ws.getCell(`${c}${r}`).numFmt = '#,##0.00';
      setBorder(ws.getCell(`${c}${r}`));
    });
    ws.getCell(`G${r}`).numFmt = '0.0%';
    setBorder(ws.getCell(`A${r}`));
    setBorder(ws.getCell(`G${r}`));
  };

  addCompRow(25, 'Revenue Collected', twoMonthsAgoRevenue, priorRevenue, currentRevenue);
  addCompRow(26, 'Invoice Billed', twoMonthsAgoBilled, priorBilled, currentBilled);
  addCompRow(27, 'Outstanding', twoMonthsAgoOutstanding, priorOutstanding, currentOutstanding);
  addCompRow(28, 'Expenses Paid', 0, 0, 0);
  addCompRow(29, 'Net Profit', twoMonthsAgoRevenue, priorRevenue, currentRevenue);

  // --- Payment Methods ---
  ws.mergeCells('A31:D31');
  const payHeader = ws.getCell('A31');
  payHeader.value = 'REVENUE BY PAYMENT METHOD';
  setFont(payHeader, 10, true, 'FFFFFFFF');
  setBg(payHeader, 'FF0F2C1A');

  ws.mergeCells('A32:B32');
  ws.getCell('A32').value = 'Method';
  ws.getCell('C32').value = 'Amount (GHS)';
  ws.getCell('D32').value = '% of Revenue';
  ['A32', 'C32', 'D32'].forEach(c => {
    setFont(ws.getCell(c), 9, true, 'FFFFFFFF');
    setBg(ws.getCell(c), 'FF164B2C');
    setBorder(ws.getCell(c));
    ws.getCell(c).alignment = { horizontal: 'center' };
  });

  let r = 33;
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

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `Financial_Report_${reportTitleDate.replace(/\s+/g, '_')}.xlsx`;
  saveAs(blob, fileName);
};
