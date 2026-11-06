import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import type { Patient, Invoice, Payment, Appointment, ClinicalNote, TreatmentPlan } from '../types';
import { safeParseDate, isDateInFilter } from '../utils/dateUtils';

export interface PatientExportOptions {
  clinicName: string;
  currency?: string;
  patients: Patient[];
  invoices: Invoice[];
  payments: Payment[];
  appointments: Appointment[];
  clinicalNotes: ClinicalNote[];
  treatmentPlans?: TreatmentPlan[];
  dateFilter?: string; // 'All Time' | 'Today' | 'This Week' | 'This Month' | 'Last Month' | 'This Year' | 'Custom Range'
  customStartDate?: string;
  customEndDate?: string;
  scope?: 'all' | 'filtered';
  includeInvoices?: boolean;
  includeClinicalNotes?: boolean;
  includePayments?: boolean;
  includeAppointments?: boolean;
  singlePatient?: boolean;
}

/**
 * Format date nicely for human reading in Excel cells
 */
function formatDateCell(value: any): string {
  const d = safeParseDate(value);
  if (!d) return value ? String(value) : '—';
  return format(d, 'yyyy-MM-dd');
}

/**
 * Robust matching to link an entity (invoice, note, payment, appointment) to a patient
 */
function matchesPatient(entityPatientId?: string, entityPatientName?: string, pt?: Patient): boolean {
  if (!pt) return false;

  // 1. Match by Firestore doc ID
  if (pt.id && entityPatientId && entityPatientId === pt.id) {
    return true;
  }

  // 2. Match by clinic patient identifier (e.g. "PAT-0001")
  if (pt.patientId && entityPatientId && entityPatientId.trim().toLowerCase() === pt.patientId.trim().toLowerCase()) {
    return true;
  }

  // 3. Match by full name
  if (entityPatientName) {
    const ptFullName = `${pt.firstName || ''} ${pt.lastName || ''}`.trim().toLowerCase();
    const entName = entityPatientName.trim().toLowerCase();
    if (ptFullName && (entName === ptFullName || entName.includes(ptFullName) || ptFullName.includes(entName))) {
      return true;
    }
  }

  return false;
}

/**
 * Export patient data arranged patient-by-patient for information retrieval
 */
export async function exportPatientsDataExcel(options: PatientExportOptions): Promise<void> {
  const {
    clinicName,
    patients,
    invoices = [],
    payments = [],
    appointments = [],
    clinicalNotes = [],
    treatmentPlans = [],
    dateFilter = 'All Time',
    customStartDate,
    customEndDate,
    includeInvoices = true,
    includeClinicalNotes = true,
    includePayments = true,
    includeAppointments = true,
    singlePatient = false,
  } = options;

  const wb = new ExcelJS.Workbook();
  wb.creator = clinicName || 'SmileDesk';
  wb.lastModifiedBy = clinicName || 'SmileDesk';
  wb.created = new Date();
  wb.modified = new Date();

  // Helper styles
  const setBg = (cell: ExcelJS.Cell, argb: string) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
  };

  const setFont = (cell: ExcelJS.Cell, size: number, bold: boolean, color: string = 'FF000000') => {
    cell.font = { name: 'Calibri', size, bold, color: { argb: color } };
  };

  const setThinBorder = (cell: ExcelJS.Cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  };

  const nowFormatted = format(new Date(), 'dd MMMM yyyy, HH:mm');

  // Filter sub-records by date if date filter applied
  const filterRecordByDate = (dateVal: any): boolean => {
    if (dateFilter === 'All Time') return true;
    return isDateInFilter(dateVal, dateFilter, customStartDate, customEndDate);
  };

  const filteredInvoices = invoices.filter(inv => 
    (inv.type || 'Invoice') === 'Invoice' && filterRecordByDate(inv.invoiceDate || inv.date || inv.createdAt)
  );

  const filteredPayments = payments.filter(p => 
    !p.isDeleted && filterRecordByDate(p.paymentDate || p.createdAt)
  );

  const filteredAppointments = appointments.filter(a => 
    !a.isDeleted && filterRecordByDate(a.date || a.createdAt)
  );

  const filteredNotes = clinicalNotes.filter(n => 
    filterRecordByDate(n.date || n.createdAt)
  );

  // =========================================================================
  // SHEET 1: MASTER PATIENT DOSSIERS (ARRANGED PATIENT BY PATIENT)
  // =========================================================================
  const wsDossier = wb.addWorksheet(singlePatient ? 'Patient Dossier' : 'Patient Dossiers (By Patient)', {
    views: [{ showGridLines: true }]
  });

  wsDossier.columns = [
    { width: 16 }, // A: Date / ID / Ref
    { width: 22 }, // B: Category / Status / Sub-info
    { width: 28 }, // C: Title / Doctor / Item
    { width: 24 }, // D: Method / Dentist / Details
    { width: 44 }, // E: Findings / Description / Notes
    { width: 16 }, // F: Billed / Amount (GH₵)
    { width: 16 }, // G: Paid (GH₵)
    { width: 16 }, // H: Balance (GH₵)
  ];

  let r = 2;

  // Title Banner
  wsDossier.mergeCells(`A${r}:H${r}`);
  const title1 = wsDossier.getCell(`A${r}`);
  title1.value = clinicName.toUpperCase();
  setFont(title1, 15, true, 'FFFFFFFF');
  title1.alignment = { horizontal: 'center', vertical: 'middle' };
  setBg(title1, 'FF1E3A8A'); // Navy
  wsDossier.getRow(r).height = 28;
  r++;

  wsDossier.mergeCells(`A${r}:H${r}`);
  const title2 = wsDossier.getCell(`A${r}`);
  title2.value = singlePatient 
    ? 'INDIVIDUAL PATIENT CLINICAL & FINANCIAL DOSSIER'
    : 'COMPREHENSIVE PATIENT DOSSIERS — CLINICAL & FINANCIAL RECORDS';
  setFont(title2, 11, true, 'FFFFFFFF');
  title2.alignment = { horizontal: 'center', vertical: 'middle' };
  setBg(title2, 'FF2563EB'); // Royal Blue
  wsDossier.getRow(r).height = 22;
  r++;

  wsDossier.mergeCells(`A${r}:H${r}`);
  const title3 = wsDossier.getCell(`A${r}`);
  title3.value = `Arranged Patient by Patient for Fast Information Retrieval · Generated: ${nowFormatted} · Filter: ${dateFilter} · Total Patients: ${patients.length}`;
  setFont(title3, 9, false, 'FF475569');
  title3.alignment = { horizontal: 'center', vertical: 'middle' };
  setBg(title3, 'FFF1F5F9');
  wsDossier.getRow(r).height = 18;
  r += 2; // Extra spacer row

  // Loop through each patient and build their complete dossier section
  patients.forEach((pt, index) => {
    const ptFullName = `${pt.salutation ? pt.salutation + ' ' : ''}${pt.firstName || ''} ${pt.middleName ? pt.middleName + ' ' : ''}${pt.lastName || ''}`.trim() || 'Unknown Patient';
    const ptIdentifier = pt.patientId || `PAT-${String(index + 1).padStart(4, '0')}`;

    // Get this patient's sub-records
    const ptInvoices = filteredInvoices.filter(i => matchesPatient(i.patientId, i.patientName, pt));
    const ptPayments = filteredPayments.filter(p => matchesPatient(p.patientId, p.patientName, pt));
    const ptAppts = filteredAppointments.filter(a => matchesPatient(a.patientId, a.patientName, pt));
    const ptNotes = filteredNotes.filter(n => matchesPatient(n.patientId, undefined, pt));

    const totalBilled = ptInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
    const totalPaid = ptPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalBalance = ptInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);

    // ──────────────────────────────────────────────
    // 1. PATIENT HEADER BANNER
    // ──────────────────────────────────────────────
    wsDossier.mergeCells(`A${r}:H${r}`);
    const ptBanner = wsDossier.getCell(`A${r}`);
    ptBanner.value = `[${ptIdentifier}]  ${ptFullName.toUpperCase()}   •   Phone: ${pt.phone || 'N/A'}   •   Gender: ${pt.gender || 'N/A'}`;
    setFont(ptBanner, 11, true, 'FFFFFFFF');
    ptBanner.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    setBg(ptBanner, 'FF1E293B'); // Slate 800
    wsDossier.getRow(r).height = 24;
    r++;

    // ──────────────────────────────────────────────
    // 2. DEMOGRAPHICS & CONTACT DETAILS
    // ──────────────────────────────────────────────
    // Row 1: Email, Address, Registration Date, Recommended By
    wsDossier.mergeCells(`A${r}:B${r}`);
    const emailCell = wsDossier.getCell(`A${r}`);
    emailCell.value = `Email: ${pt.email || '—'}`;
    setFont(emailCell, 9, false, 'FF334155');
    setBg(emailCell, 'FFF8FAFC');
    setThinBorder(emailCell);

    wsDossier.mergeCells(`C${r}:D${r}`);
    const addrCell = wsDossier.getCell(`C${r}`);
    addrCell.value = `Address: ${pt.address || '—'}`;
    setFont(addrCell, 9, false, 'FF334155');
    setBg(addrCell, 'FFF8FAFC');
    setThinBorder(addrCell);

    wsDossier.mergeCells(`E${r}:F${r}`);
    const regCell = wsDossier.getCell(`E${r}`);
    regCell.value = `Registered: ${formatDateCell(pt.createdAt)}`;
    setFont(regCell, 9, false, 'FF334155');
    setBg(regCell, 'FFF8FAFC');
    setThinBorder(regCell);

    wsDossier.mergeCells(`G${r}:H${r}`);
    const recCell = wsDossier.getCell(`G${r}`);
    recCell.value = `Referred by: ${pt.recommendedBy || '—'}`;
    setFont(recCell, 9, false, 'FF334155');
    setBg(recCell, 'FFF8FAFC');
    setThinBorder(recCell);
    wsDossier.getRow(r).height = 18;
    r++;

    // Row 2: Emergency Contact & Medical Alerts
    const emergStr = pt.emergencyContact?.name 
      ? `${pt.emergencyContact.name} (${pt.emergencyContact.phone || 'No phone'}${pt.emergencyContact.relationship ? ' - ' + pt.emergencyContact.relationship : ''})`
      : 'None on record';

    wsDossier.mergeCells(`A${r}:C${r}`);
    const emergCell = wsDossier.getCell(`A${r}`);
    emergCell.value = `Emergency Contact: ${emergStr}`;
    setFont(emergCell, 9, false, 'FF334155');
    setBg(emergCell, 'FFF8FAFC');
    setThinBorder(emergCell);

    wsDossier.mergeCells(`D${r}:H${r}`);
    const allergyCell = wsDossier.getCell(`D${r}`);
    allergyCell.value = `Allergies / Medical Alerts: ${pt.allergies || 'None reported'}`;
    setFont(allergyCell, 9, !!pt.allergies, pt.allergies ? 'FFDC2626' : 'FF334155'); // Bold Red if allergies present
    setBg(allergyCell, pt.allergies ? 'FFFEF2F2' : 'FFF8FAFC');
    setThinBorder(allergyCell);
    wsDossier.getRow(r).height = 18;
    r++;

    // Row 3: Clinic / Medical History Notes (from Patient profile)
    const profileNotes = [pt.medicalNotes, pt.dentalNotes].filter(Boolean).join(' | ');
    if (profileNotes) {
      wsDossier.mergeCells(`A${r}:H${r}`);
      const profNoteCell = wsDossier.getCell(`A${r}`);
      profNoteCell.value = `Patient Medical Background / Clinic Notes: ${profileNotes}`;
      setFont(profNoteCell, 9, false, 'FF475569');
      profNoteCell.alignment = { wrapText: true, vertical: 'top' };
      setBg(profNoteCell, 'FFFFFBEB'); // Warm yellow
      setThinBorder(profNoteCell);
      wsDossier.getRow(r).height = 20;
      r++;
    }

    // Row 4: Financial Balance Bar
    wsDossier.mergeCells(`A${r}:H${r}`);
    const finCell = wsDossier.getCell(`A${r}`);
    finCell.value = `FINANCIAL STATUS: Total Invoiced: GH₵ ${totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}   |   Total Paid: GH₵ ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}   |   Outstanding Balance: GH₵ ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    setFont(finCell, 9.5, true, totalBalance > 0 ? 'FFB45309' : 'FF065F46');
    finCell.alignment = { horizontal: 'center', vertical: 'middle' };
    setBg(finCell, totalBalance > 0 ? 'FFFEF3C7' : 'FFD1FAE5');
    setThinBorder(finCell);
    wsDossier.getRow(r).height = 20;
    r++;

    // ──────────────────────────────────────────────
    // 3. CLINICAL NOTES & OBSERVATIONS SUB-SECTION
    // ──────────────────────────────────────────────
    if (includeClinicalNotes) {
      wsDossier.mergeCells(`A${r}:H${r}`);
      const secNotes = wsDossier.getCell(`A${r}`);
      secNotes.value = `CLINICAL NOTES & OBSERVATIONS (${ptNotes.length} recorded)`;
      setFont(secNotes, 9.5, true, 'FFFFFFFF');
      secNotes.alignment = { vertical: 'middle', indent: 1 };
      setBg(secNotes, 'FFD97706'); // Amber-600
      wsDossier.getRow(r).height = 20;
      r++;

      // Header columns
      const headers = ['Date', 'Category', 'Note Title', 'Doctor / Dentist', 'Clinical Findings, Procedures & Observations', '', '', ''];
      wsDossier.mergeCells(`E${r}:H${r}`);
      headers.forEach((h, colIdx) => {
        if (colIdx > 4) return;
        const cell = wsDossier.getCell(r, colIdx + 1);
        cell.value = h;
        setFont(cell, 8.5, true, 'FF78350F');
        setBg(cell, 'FFFEF3C7');
        setThinBorder(cell);
      });
      wsDossier.getRow(r).height = 18;
      r++;

      if (ptNotes.length === 0) {
        wsDossier.mergeCells(`A${r}:H${r}`);
        const emptyCell = wsDossier.getCell(`A${r}`);
        emptyCell.value = '— No clinical notes recorded for this patient —';
        setFont(emptyCell, 8.5, false, 'FF94A3B8');
        emptyCell.alignment = { horizontal: 'center' };
        setBg(emptyCell, 'FFFFFFFF');
        setThinBorder(emptyCell);
        wsDossier.getRow(r).height = 18;
        r++;
      } else {
        ptNotes.forEach(note => {
          const cDate = wsDossier.getCell(r, 1);
          cDate.value = formatDateCell(note.date || note.createdAt);
          setFont(cDate, 8.5, false);
          setThinBorder(cDate);

          const cCat = wsDossier.getCell(r, 2);
          cCat.value = note.category || 'General';
          setFont(cCat, 8.5, false);
          setThinBorder(cCat);

          const cTitle = wsDossier.getCell(r, 3);
          cTitle.value = note.title || 'Clinical Note';
          setFont(cTitle, 8.5, true);
          setThinBorder(cTitle);

          const cDentist = wsDossier.getCell(r, 4);
          cDentist.value = note.dentist || 'Doctor';
          setFont(cDentist, 8.5, false);
          setThinBorder(cDentist);

          wsDossier.mergeCells(`E${r}:H${r}`);
          const cContent = wsDossier.getCell(r, 5);
          cContent.value = note.content || '—';
          setFont(cContent, 8.5, false);
          cContent.alignment = { wrapText: true, vertical: 'top' };
          setThinBorder(cContent);

          wsDossier.getRow(r).height = Math.max(22, Math.min(80, Math.ceil((note.content?.length || 0) / 60) * 16));
          r++;
        });
      }
    }

    // ──────────────────────────────────────────────
    // 4. INVOICES & TREATMENTS BILLED SUB-SECTION
    // ──────────────────────────────────────────────
    if (includeInvoices) {
      wsDossier.mergeCells(`A${r}:H${r}`);
      const secInv = wsDossier.getCell(`A${r}`);
      secInv.value = `INVOICES & TREATMENTS BILLED (${ptInvoices.length} invoices)`;
      setFont(secInv, 9.5, true, 'FFFFFFFF');
      secInv.alignment = { vertical: 'middle', indent: 1 };
      setBg(secInv, 'FF4338CA'); // Indigo-700
      wsDossier.getRow(r).height = 20;
      r++;

      const invHeaders = [
        'Invoice #',
        'Date',
        'Due Date',
        'Status',
        'Treatments / Services Breakdown',
        'Billed (GHS)',
        'Paid (GHS)',
        'Balance (GHS)'
      ];

      invHeaders.forEach((h, colIdx) => {
        const cell = wsDossier.getCell(r, colIdx + 1);
        cell.value = h;
        setFont(cell, 8.5, true, 'FF312E81');
        setBg(cell, 'FFE0E7FF');
        setThinBorder(cell);
      });
      wsDossier.getRow(r).height = 18;
      r++;

      if (ptInvoices.length === 0) {
        wsDossier.mergeCells(`A${r}:H${r}`);
        const emptyCell = wsDossier.getCell(`A${r}`);
        emptyCell.value = '— No invoices issued for this patient —';
        setFont(emptyCell, 8.5, false, 'FF94A3B8');
        emptyCell.alignment = { horizontal: 'center' };
        setBg(emptyCell, 'FFFFFFFF');
        setThinBorder(emptyCell);
        wsDossier.getRow(r).height = 18;
        r++;
      } else {
        ptInvoices.forEach(inv => {
          const servicesStr = inv.items?.map(i => `${i.serviceName}${i.quantity > 1 ? ' (x' + i.quantity + ')' : ''}`).join(', ') || 'Dental Treatment';

          const cNum = wsDossier.getCell(r, 1);
          cNum.value = inv.invoiceNumber;
          setFont(cNum, 8.5, true);
          setThinBorder(cNum);

          const cDate = wsDossier.getCell(r, 2);
          cDate.value = formatDateCell(inv.invoiceDate || inv.date);
          setFont(cDate, 8.5, false);
          setThinBorder(cDate);

          const cDue = wsDossier.getCell(r, 3);
          cDue.value = formatDateCell(inv.dueDate);
          setFont(cDue, 8.5, false);
          setThinBorder(cDue);

          const cStatus = wsDossier.getCell(r, 4);
          cStatus.value = inv.status;
          setFont(cStatus, 8.5, true, inv.status === 'Paid' ? 'FF065F46' : inv.status === 'Unpaid' ? 'FFB91C1C' : 'FFB45309');
          setThinBorder(cStatus);

          const cServices = wsDossier.getCell(r, 5);
          cServices.value = servicesStr;
          setFont(cServices, 8.5, false);
          cServices.alignment = { wrapText: true, vertical: 'top' };
          setThinBorder(cServices);

          const cBilled = wsDossier.getCell(r, 6);
          cBilled.value = Number(inv.total) || 0;
          cBilled.numFmt = '#,##0.00';
          setFont(cBilled, 8.5, true);
          setThinBorder(cBilled);

          const cPaid = wsDossier.getCell(r, 7);
          cPaid.value = Number(inv.amountPaid) || 0;
          cPaid.numFmt = '#,##0.00';
          setFont(cPaid, 8.5, false);
          setThinBorder(cPaid);

          const cBal = wsDossier.getCell(r, 8);
          cBal.value = Number(inv.balance) || 0;
          cBal.numFmt = '#,##0.00';
          setFont(cBal, 8.5, true, Number(inv.balance) > 0 ? 'FFDC2626' : 'FF065F46');
          setThinBorder(cBal);

          wsDossier.getRow(r).height = 20;
          r++;
        });
      }
    }

    // ──────────────────────────────────────────────
    // 5. PAYMENT RECEIPTS SUB-SECTION
    // ──────────────────────────────────────────────
    if (includePayments) {
      wsDossier.mergeCells(`A${r}:H${r}`);
      const secPay = wsDossier.getCell(`A${r}`);
      secPay.value = `PAYMENT RECEIPTS (${ptPayments.length} transactions)`;
      setFont(secPay, 9.5, true, 'FFFFFFFF');
      secPay.alignment = { vertical: 'middle', indent: 1 };
      setBg(secPay, 'FF047857'); // Emerald-700
      wsDossier.getRow(r).height = 20;
      r++;

      const payHeaders = [
        'Payment Date',
        'Invoice #',
        'Payment Method',
        'Reference #',
        'Recorded By / Notes',
        'Amount (GHS)',
        '',
        ''
      ];
      wsDossier.mergeCells(`E${r}:F${r}`);
      wsDossier.mergeCells(`G${r}:H${r}`);

      payHeaders.forEach((h, colIdx) => {
        if (colIdx > 5) return;
        const cell = wsDossier.getCell(r, colIdx === 5 ? 7 : colIdx + 1);
        cell.value = h;
        setFont(cell, 8.5, true, 'FF064E3B');
        setBg(cell, 'FFD1FAE5');
        setThinBorder(cell);
      });
      wsDossier.getRow(r).height = 18;
      r++;

      if (ptPayments.length === 0) {
        wsDossier.mergeCells(`A${r}:H${r}`);
        const emptyCell = wsDossier.getCell(`A${r}`);
        emptyCell.value = '— No payment receipts recorded for this patient —';
        setFont(emptyCell, 8.5, false, 'FF94A3B8');
        emptyCell.alignment = { horizontal: 'center' };
        setBg(emptyCell, 'FFFFFFFF');
        setThinBorder(emptyCell);
        wsDossier.getRow(r).height = 18;
        r++;
      } else {
        ptPayments.forEach(p => {
          const cDate = wsDossier.getCell(r, 1);
          cDate.value = formatDateCell(p.paymentDate);
          setFont(cDate, 8.5, false);
          setThinBorder(cDate);

          const cInv = wsDossier.getCell(r, 2);
          cInv.value = p.invoiceNumber || '—';
          setFont(cInv, 8.5, true);
          setThinBorder(cInv);

          const cMethod = wsDossier.getCell(r, 3);
          cMethod.value = p.paymentMethod || 'Cash';
          setFont(cMethod, 8.5, false);
          setThinBorder(cMethod);

          const cRef = wsDossier.getCell(r, 4);
          cRef.value = p.reference || '—';
          setFont(cRef, 8.5, false);
          setThinBorder(cRef);

          wsDossier.mergeCells(`E${r}:F${r}`);
          const cNotes = wsDossier.getCell(r, 5);
          cNotes.value = [p.recordedBy ? `By: ${p.recordedBy}` : '', p.notes].filter(Boolean).join(' - ') || '—';
          setFont(cNotes, 8.5, false);
          setThinBorder(cNotes);

          wsDossier.mergeCells(`G${r}:H${r}`);
          const cAmt = wsDossier.getCell(r, 7);
          cAmt.value = Number(p.amount) || 0;
          cAmt.numFmt = '#,##0.00';
          setFont(cAmt, 8.5, true, 'FF047857');
          cAmt.alignment = { horizontal: 'right' };
          setThinBorder(cAmt);

          wsDossier.getRow(r).height = 20;
          r++;
        });
      }
    }

    // ──────────────────────────────────────────────
    // 6. APPOINTMENTS & VISIT HISTORY SUB-SECTION
    // ──────────────────────────────────────────────
    if (includeAppointments) {
      wsDossier.mergeCells(`A${r}:H${r}`);
      const secAppt = wsDossier.getCell(`A${r}`);
      secAppt.value = `APPOINTMENTS & VISIT HISTORY (${ptAppts.length} visits)`;
      setFont(secAppt, 9.5, true, 'FFFFFFFF');
      secAppt.alignment = { vertical: 'middle', indent: 1 };
      setBg(secAppt, 'FF0284C7'); // Sky-600
      wsDossier.getRow(r).height = 20;
      r++;

      const apptHeaders = [
        'Visit Date',
        'Time Slot',
        'Treatment / Type',
        'Dentist',
        'Clinic Room & Status',
        'Visit Notes / Reasons',
        '',
        ''
      ];
      wsDossier.mergeCells(`F${r}:H${r}`);

      apptHeaders.forEach((h, colIdx) => {
        if (colIdx > 5) return;
        const cell = wsDossier.getCell(r, colIdx + 1);
        cell.value = h;
        setFont(cell, 8.5, true, 'FF075985');
        setBg(cell, 'FFE0F2FE');
        setThinBorder(cell);
      });
      wsDossier.getRow(r).height = 18;
      r++;

      if (ptAppts.length === 0) {
        wsDossier.mergeCells(`A${r}:H${r}`);
        const emptyCell = wsDossier.getCell(`A${r}`);
        emptyCell.value = '— No appointment history for this patient —';
        setFont(emptyCell, 8.5, false, 'FF94A3B8');
        emptyCell.alignment = { horizontal: 'center' };
        setBg(emptyCell, 'FFFFFFFF');
        setThinBorder(emptyCell);
        wsDossier.getRow(r).height = 18;
        r++;
      } else {
        ptAppts.forEach(a => {
          const cDate = wsDossier.getCell(r, 1);
          cDate.value = formatDateCell(a.date);
          setFont(cDate, 8.5, false);
          setThinBorder(cDate);

          const cTime = wsDossier.getCell(r, 2);
          cTime.value = [a.startTime, a.endTime].filter(Boolean).join(' - ') || '—';
          setFont(cTime, 8.5, false);
          setThinBorder(cTime);

          const cType = wsDossier.getCell(r, 3);
          cType.value = a.appointmentType || 'Consultation';
          setFont(cType, 8.5, true);
          setThinBorder(cType);

          const cDentist = wsDossier.getCell(r, 4);
          cDentist.value = a.dentist || 'Doctor';
          setFont(cDentist, 8.5, false);
          setThinBorder(cDentist);

          const cStatus = wsDossier.getCell(r, 5);
          cStatus.value = `${a.status}${a.room ? ' (' + a.room + ')' : ''}`;
          setFont(cStatus, 8.5, false);
          setThinBorder(cStatus);

          wsDossier.mergeCells(`F${r}:H${r}`);
          const cNotes = wsDossier.getCell(r, 6);
          cNotes.value = a.notes || '—';
          setFont(cNotes, 8.5, false);
          cNotes.alignment = { wrapText: true, vertical: 'top' };
          setThinBorder(cNotes);

          wsDossier.getRow(r).height = 20;
          r++;
        });
      }
    }

    // Spacer between patients with visual boundary
    wsDossier.mergeCells(`A${r}:H${r}`);
    const divider = wsDossier.getCell(`A${r}`);
    divider.value = '';
    divider.border = { bottom: { style: 'medium', color: { argb: 'FF94A3B8' } } };
    wsDossier.getRow(r).height = 12;
    r += 2; // Blank line for separation
  });

  // =========================================================================
  // SHEET 2: ALL PATIENTS DIRECTORY (TABULAR OVERVIEW)
  // =========================================================================
  const wsPatients = wb.addWorksheet('Patients Directory');
  wsPatients.columns = [
    { header: 'Patient ID', key: 'patientId', width: 14 },
    { header: 'Full Name', key: 'fullName', width: 24 },
    { header: 'Gender', key: 'gender', width: 10 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Email', key: 'email', width: 24 },
    { header: 'Address', key: 'address', width: 28 },
    { header: 'Date Registered', key: 'dateRegistered', width: 15 },
    { header: 'Referred By', key: 'recommendedBy', width: 18 },
    { header: 'Allergies', key: 'allergies', width: 22 },
    { header: 'Medical Notes', key: 'medicalNotes', width: 30 },
    { header: 'Emergency Contact', key: 'emergencyContact', width: 25 },
    { header: 'Total Invoiced (GHS)', key: 'totalInvoiced', width: 18 },
    { header: 'Total Paid (GHS)', key: 'totalPaid', width: 16 },
    { header: 'Outstanding Balance (GHS)', key: 'balance', width: 20 },
  ];

  wsPatients.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsPatients.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  wsPatients.getRow(1).height = 22;

  patients.forEach(pt => {
    const ptInvoices = filteredInvoices.filter(i => matchesPatient(i.patientId, i.patientName, pt));
    const ptPayments = filteredPayments.filter(p => matchesPatient(p.patientId, p.patientName, pt));

    const billed = ptInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const paid = ptPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const bal = ptInvoices.reduce((s, i) => s + (Number(i.balance) || 0), 0);

    const emerg = pt.emergencyContact?.name 
      ? `${pt.emergencyContact.name} (${pt.emergencyContact.phone || ''})` 
      : '';

    const row = wsPatients.addRow({
      patientId: pt.patientId,
      fullName: `${pt.firstName || ''} ${pt.lastName || ''}`.trim(),
      gender: pt.gender || 'Unknown',
      phone: pt.phone || '',
      email: pt.email || '',
      address: pt.address || '',
      dateRegistered: formatDateCell(pt.createdAt),
      recommendedBy: pt.recommendedBy || '',
      allergies: pt.allergies || 'None',
      medicalNotes: [pt.medicalNotes, pt.dentalNotes].filter(Boolean).join(' | '),
      emergencyContact: emerg,
      totalInvoiced: billed,
      totalPaid: paid,
      balance: bal
    });

    row.height = 19;
  });

  ['L', 'M', 'N'].forEach(col => {
    wsPatients.getColumn(col).numFmt = '#,##0.00';
  });

  // =========================================================================
  // SHEET 3: ALL CLINICAL NOTES (TABULAR FOR EASY FILTERING / SEARCHING)
  // =========================================================================
  if (includeClinicalNotes) {
    const wsNotes = wb.addWorksheet('Clinical Notes');
    wsNotes.columns = [
      { header: 'Patient ID', key: 'patientId', width: 14 },
      { header: 'Patient Name', key: 'patientName', width: 24 },
      { header: 'Note Date', key: 'date', width: 15 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Note Title', key: 'title', width: 26 },
      { header: 'Doctor / Dentist', key: 'dentist', width: 20 },
      { header: 'Clinical Content & Findings', key: 'content', width: 55 },
    ];

    wsNotes.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsNotes.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
    wsNotes.getRow(1).height = 22;

    patients.forEach(pt => {
      const ptNotes = filteredNotes.filter(n => matchesPatient(n.patientId, undefined, pt));
      const ptName = `${pt.firstName || ''} ${pt.lastName || ''}`.trim();

      ptNotes.forEach(note => {
        const row = wsNotes.addRow({
          patientId: pt.patientId,
          patientName: ptName,
          date: formatDateCell(note.date || note.createdAt),
          category: note.category || 'General',
          title: note.title || 'Clinical Note',
          dentist: note.dentist || 'Doctor',
          content: note.content || ''
        });
        row.getCell('content').alignment = { wrapText: true };
        row.height = 22;
      });
    });
  }

  // =========================================================================
  // SHEET 4: ALL INVOICES (TABULAR)
  // =========================================================================
  if (includeInvoices) {
    const wsInvoices = wb.addWorksheet('Invoices & Services');
    wsInvoices.columns = [
      { header: 'Invoice #', key: 'invNum', width: 16 },
      { header: 'Patient ID', key: 'patientId', width: 14 },
      { header: 'Patient Name', key: 'patientName', width: 24 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Due Date', key: 'dueDate', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Treatments / Services Billed', key: 'services', width: 40 },
      { header: 'Subtotal (GHS)', key: 'subtotal', width: 15 },
      { header: 'Discount (GHS)', key: 'discount', width: 15 },
      { header: 'Total (GHS)', key: 'total', width: 15 },
      { header: 'Amount Paid (GHS)', key: 'amountPaid', width: 16 },
      { header: 'Balance (GHS)', key: 'balance', width: 15 },
    ];

    wsInvoices.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsInvoices.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
    wsInvoices.getRow(1).height = 22;

    patients.forEach(pt => {
      const ptInvoices = filteredInvoices.filter(i => matchesPatient(i.patientId, i.patientName, pt));
      const ptName = `${pt.firstName || ''} ${pt.lastName || ''}`.trim();

      ptInvoices.forEach(inv => {
        const servicesStr = inv.items?.map(i => `${i.serviceName}${i.quantity > 1 ? ' (x' + i.quantity + ')' : ''}`).join(', ') || 'Dental Service';

        const row = wsInvoices.addRow({
          invNum: inv.invoiceNumber,
          patientId: pt.patientId,
          patientName: ptName,
          date: formatDateCell(inv.invoiceDate || inv.date),
          dueDate: formatDateCell(inv.dueDate),
          status: inv.status,
          services: servicesStr,
          subtotal: Number(inv.subtotal) || 0,
          discount: Number(inv.discount) || 0,
          total: Number(inv.total) || 0,
          amountPaid: Number(inv.amountPaid) || 0,
          balance: Number(inv.balance) || 0
        });
        row.getCell('services').alignment = { wrapText: true };
        row.height = 20;
      });
    });

    ['H', 'I', 'J', 'K', 'L'].forEach(col => {
      wsInvoices.getColumn(col).numFmt = '#,##0.00';
    });
  }

  // =========================================================================
  // SHEET 5: ALL PAYMENTS (TABULAR)
  // =========================================================================
  if (includePayments) {
    const wsPayments = wb.addWorksheet('Payments Ledger');
    wsPayments.columns = [
      { header: 'Payment Date', key: 'date', width: 15 },
      { header: 'Patient ID', key: 'patientId', width: 14 },
      { header: 'Patient Name', key: 'patientName', width: 24 },
      { header: 'Invoice #', key: 'invNum', width: 16 },
      { header: 'Amount (GHS)', key: 'amount', width: 16 },
      { header: 'Method', key: 'method', width: 16 },
      { header: 'Reference', key: 'reference', width: 20 },
      { header: 'Recorded By', key: 'recordedBy', width: 20 },
      { header: 'Notes', key: 'notes', width: 26 },
    ];

    wsPayments.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsPayments.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
    wsPayments.getRow(1).height = 22;

    patients.forEach(pt => {
      const ptPayments = filteredPayments.filter(p => matchesPatient(p.patientId, p.patientName, pt));
      const ptName = `${pt.firstName || ''} ${pt.lastName || ''}`.trim();

      ptPayments.forEach(p => {
        const row = wsPayments.addRow({
          date: formatDateCell(p.paymentDate),
          patientId: pt.patientId,
          patientName: ptName,
          invNum: p.invoiceNumber || '—',
          amount: Number(p.amount) || 0,
          method: p.paymentMethod || 'Cash',
          reference: p.reference || '—',
          recordedBy: p.recordedBy || 'Staff',
          notes: p.notes || ''
        });
        row.height = 19;
      });
    });

    wsPayments.getColumn('E').numFmt = '#,##0.00';
  }

  // =========================================================================
  // SHEET 6: ALL APPOINTMENTS (TABULAR)
  // =========================================================================
  if (includeAppointments) {
    const wsAppts = wb.addWorksheet('Appointments History');
    wsAppts.columns = [
      { header: 'Visit Date', key: 'date', width: 15 },
      { header: 'Time Slot', key: 'time', width: 16 },
      { header: 'Patient ID', key: 'patientId', width: 14 },
      { header: 'Patient Name', key: 'patientName', width: 24 },
      { header: 'Treatment / Type', key: 'type', width: 22 },
      { header: 'Dentist / Doctor', key: 'dentist', width: 20 },
      { header: 'Room', key: 'room', width: 16 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Visit Notes', key: 'notes', width: 35 },
    ];

    wsAppts.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsAppts.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
    wsAppts.getRow(1).height = 22;

    patients.forEach(pt => {
      const ptAppts = filteredAppointments.filter(a => matchesPatient(a.patientId, a.patientName, pt));
      const ptName = `${pt.firstName || ''} ${pt.lastName || ''}`.trim();

      ptAppts.forEach(a => {
        const row = wsAppts.addRow({
          date: formatDateCell(a.date),
          time: [a.startTime, a.endTime].filter(Boolean).join(' - '),
          patientId: pt.patientId,
          patientName: ptName,
          type: a.appointmentType || 'Visit',
          dentist: a.dentist || 'Doctor',
          room: a.room || 'Surgery Room 1',
          status: a.status,
          notes: a.notes || ''
        });
        row.getCell('notes').alignment = { wrapText: true };
        row.height = 19;
      });
    });
  }

  // Generate buffer and trigger browser download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  let fileName = '';
  const dateStamp = format(new Date(), 'yyyy-MM-dd');

  if (singlePatient && patients.length === 1) {
    const pt = patients[0];
    const safeName = `${pt.patientId || 'PT'}_${pt.firstName || ''}_${pt.lastName || ''}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    fileName = `Patient_Dossier_${safeName}_${dateStamp}.xlsx`;
  } else {
    fileName = `Patient_Records_Master_${(clinicName || 'Clinic').replace(/[^a-zA-Z0-9_-]/g, '_')}_${dateStamp}.xlsx`;
  }

  saveAs(blob, fileName);
}
