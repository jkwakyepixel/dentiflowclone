import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useClinic } from '../contexts/ClinicContext';
import { usePayments } from '../hooks/usePayments';
import { useInvoices } from '../hooks/useInvoices';
import { usePatients } from '../hooks/usePatients';
import type { Payment, Invoice, Patient } from '../types';
import { 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  DollarSign, 
  FileText, 
  X,
  CreditCard,
  Printer,
  CheckCircle2,
  Receipt as ReceiptIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Payments() {
  const { userData } = useAuth();
  const { clinicProfile } = useClinic();
  const [searchParams] = useSearchParams();
  const urlPatientId = searchParams.get('patientId');

  const { payments, loading: pmtsLoading, addPayment } = usePayments();
  const { invoices, loading: invsLoading } = useInvoices();
  const { patients, loading: patsLoading } = usePatients();
  
  const loading = pmtsLoading || invsLoading || patsLoading;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('All');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState<{
    receiptNumber: string;
    patientName: string;
    invoiceNumber: string;
    amount: number;
    paymentMethod: string;
    reference: string;
    paymentDate: string;
    recordedBy: string;
    remainingBalance?: number;
    notes?: string;
  } | null>(null);

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState(urlPatientId || '');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash'|'Mobile Money'|'Card'|'Bank Transfer'|'Other'>('Cash');
  const [reference, setReference] = useState('');
  const [paymentDate, setPaymentDate] = useState('2026-08-26');
  const [notes, setNotes] = useState('');

  const clinicId = userData?.clinicId || 'demo-clinic';

  useEffect(() => {
    if (urlPatientId) {
      setSelectedPatientId(urlPatientId);
      setIsModalOpen(true);
    }
  }, [urlPatientId]);

  const activePatientInvoices = invoices.filter(i => i.patientId === selectedPatientId && i.balance > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inv = invoices.find(i => (i.id || i.invoiceNumber) === selectedInvoiceId);
    if (!inv) {
      toast.error('Please select an invoice');
      return;
    }
    
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Invalid payment amount');
      return;
    }

    if (paymentAmount > inv.balance) {
      toast.error('Payment cannot exceed remaining invoice balance');
      return;
    }

    setIsSubmitting(true);
    const newRef = reference || `REF-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReceiptNum = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const formattedDate = format(new Date(paymentDate), 'd MMM yyyy');
    const remainingBal = Math.max(0, inv.balance - paymentAmount);

    try {
      await addPayment({
        patientId: inv.patientId,
        patientName: inv.patientName,
        invoiceId: inv.id || 'inv-gen',
        invoiceNumber: inv.invoiceNumber,
        amount: paymentAmount,
        paymentMethod,
        reference: newRef,
        paymentDate: formattedDate,
        notes,
        recordedBy: userData?.name || 'Clinic Staff',
        isDeleted: false
      });
      
      toast.success('Payment recorded successfully');
      setIsModalOpen(false);
      
      // Auto-open branded payment receipt!
      setReceiptData({
        receiptNumber: newReceiptNum,
        patientName: inv.patientName,
        invoiceNumber: inv.invoiceNumber,
        amount: paymentAmount,
        paymentMethod,
        reference: newRef,
        paymentDate: formattedDate,
        recordedBy: userData?.name || 'Clinic Staff',
        remainingBalance: remainingBal,
        notes
      });

      // Reset form
      setSelectedPatientId('');
      setSelectedInvoiceId('');
      setAmount('');
      setReference('');
      setNotes('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReceiptFromRow = (p: Payment) => {
    setReceiptData({
      receiptNumber: `REC-${p.reference ? p.reference.replace('REF-', '') : '2026-9001'}`,
      patientName: p.patientName,
      invoiceNumber: p.invoiceNumber,
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod,
      reference: p.reference || 'REF-9001',
      paymentDate: p.paymentDate,
      recordedBy: p.recordedBy || 'Clinic Staff',
      remainingBalance: 0.00,
      notes: p.notes
    });
  };

  // Metric Totals
  const totalMonthPayments = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalOutstandingBalance = invoices.reduce((acc, inv) => acc + (Number(inv.balance) || 0), 0) || 2500.00;

  const filteredPayments = payments.filter(p => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      p.patientName.toLowerCase().includes(q) || 
      p.invoiceNumber.toLowerCase().includes(q) || 
      (p.reference && p.reference.toLowerCase().includes(q)) ||
      (p.recordedBy && p.recordedBy.toLowerCase().includes(q));

    const matchesMethod = methodFilter === 'All' || p.paymentMethod === methodFilter;

    return matchesSearch && matchesMethod;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payments</h1>
          <p className="text-xs text-slate-400 mt-1">{payments.length} recorded payments</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <CreditCard size={15} />
          <span>Record Payment</span>
        </button>
      </div>

      {/* 3 KPI Cards on Top */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Payments today */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#eff6ff] text-[#2563eb] flex items-center justify-center flex-shrink-0">
            <CalendarIcon size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Payments today</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">GHC 0.00</p>
          </div>
        </div>

        {/* Payments this month */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#f0fdf4] text-[#16a34a] flex items-center justify-center flex-shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Payments this month</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">
              GHC {totalMonthPayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Outstanding balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#fffbeb] text-[#d97706] flex items-center justify-center flex-shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Outstanding balance</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">
              GHC {totalOutstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Method Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search by patient, invoice or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
          />
        </div>

        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="bg-white border border-slate-200/90 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer"
        >
          <option value="All">All methods</option>
          <option value="Cash">Cash</option>
          <option value="Mobile Money">Mobile Money</option>
          <option value="Card">Card</option>
          <option value="Bank Transfer">Bank Transfer</option>
        </select>
      </div>

      {/* Payments Table Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-slate-400 font-medium border-b border-slate-100">
                <th className="pb-3.5 font-medium">Date</th>
                <th className="pb-3.5 font-medium">Patient</th>
                <th className="pb-3.5 font-medium">Invoice</th>
                <th className="pb-3.5 font-medium">Amount</th>
                <th className="pb-3.5 font-medium">Method</th>
                <th className="pb-3.5 font-medium">Reference</th>
                <th className="pb-3.5 font-medium">Recorded by</th>
                <th className="pb-3.5 font-medium text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 text-slate-600 whitespace-nowrap">{p.paymentDate}</td>
                  <td className="py-3.5 font-bold text-slate-900 whitespace-nowrap">{p.patientName}</td>
                  <td className="py-3.5 font-mono text-slate-500 whitespace-nowrap">{p.invoiceNumber}</td>
                  <td className="py-3.5 font-bold text-slate-900 whitespace-nowrap">
                    GHC {Number(p.amount).toFixed(2)}
                  </td>
                  <td className="py-3.5 text-slate-600 whitespace-nowrap">{p.paymentMethod}</td>
                  <td className="py-3.5 font-mono text-slate-500 whitespace-nowrap">{p.reference || '—'}</td>
                  <td className="py-3.5 text-slate-600 whitespace-nowrap">{p.recordedBy || 'Clinic Staff'}</td>
                  <td className="py-3.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleOpenReceiptFromRow(p)}
                      title="View Official Receipt"
                      className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <ReceiptIcon size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal Matching Reference Screenshot */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Record Payment</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Fields matching reference */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
              {/* Row 1: Patient & Invoice */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Patient</label>
                  <select
                    required
                    value={selectedPatientId}
                    onChange={(e) => {
                      setSelectedPatientId(e.target.value);
                      setSelectedInvoiceId('');
                      setAmount('');
                    }}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  >
                    <option value="">Select patient...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Invoice</label>
                  <select
                    required
                    value={selectedInvoiceId}
                    onChange={(e) => {
                      setSelectedInvoiceId(e.target.value);
                      const inv = activePatientInvoices.find(i => (i.id || i.invoiceNumber) === e.target.value);
                      if (inv) setAmount(inv.balance.toString());
                    }}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  >
                    {activePatientInvoices.length === 0 ? (
                      <option value="">No outstanding invoices</option>
                    ) : (
                      <>
                        <option value="">Select invoice...</option>
                        {activePatientInvoices.map(inv => (
                          <option key={inv.id || inv.invoiceNumber} value={inv.id || inv.invoiceNumber}>
                            {inv.invoiceNumber} (Balance: GH₵ {inv.balance.toFixed(2)})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Row 2: Amount & Payment method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Reference / transaction number & Payment date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Reference / transaction number</label>
                  <input
                    type="text"
                    placeholder="REF-..."
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment date</label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Notes */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#2563eb] hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {isSubmitting ? 'Recording...' : 'Record payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BRANDED OFFICIAL PAYMENT RECEIPT MODAL */}
      {receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Top Bar */}
            <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Payment Receipt Generated
              </span>
              <button 
                onClick={() => setReceiptData(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* Printable Receipt Body */}
            <div className="p-7 space-y-6 text-xs text-slate-800" id="printable-receipt">
              {/* Clinic Branding Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  {clinicProfile.logo ? (
                    <img 
                      src={clinicProfile.logo} 
                      alt="Logo" 
                      className="w-12 h-12 object-contain rounded-xl p-1 bg-slate-50 border border-slate-100"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#2563eb] text-white flex items-center justify-center font-bold">
                      <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                        <path d="M18.8 4C17.2 4 16 5.1 15.3 6.3C14.6 4.9 13.1 4 11.4 4C8.4 4 6 6.4 6 9.4C6 14.1 10.6 18.5 11.5 19.3C11.7 19.5 11.9 19.5 12.1 19.5C12.3 19.5 12.5 19.5 12.7 19.3C13.6 18.5 18.2 14.1 18.2 9.4C18.2 8.7 18 8 17.6 7.4C18.4 6.8 19 5.8 19 4.7C19 4.3 18.9 4.1 18.8 4ZM12 17.5C10.5 16 7.8 12.8 7.8 9.4C7.8 7.4 9.4 5.8 11.4 5.8C12.8 5.8 14.1 6.6 14.7 7.9C14.8 8.2 15.1 8.4 15.5 8.4C15.9 8.4 16.2 8.2 16.3 7.8C16.8 6.5 17.8 5.8 18.8 5.8C18.9 5.8 19 5.8 19 5.9C18.8 6.7 18.2 7.3 17.4 7.6C17 7.8 16.7 8.2 16.7 8.6C16.7 8.9 16.8 9.2 17 9.4C17.1 9.4 17.1 9.4 17.1 9.4C17.1 12.8 14.4 16 12 17.5Z" opacity="0.9" />
                        <path d="M12 2C8.5 2 5.5 4.5 5 8C4.5 11.5 6 15 8 18.5C9 20 10.5 21.5 11.5 22C11.8 22.1 12.2 22.1 12.5 22C13.5 21.5 15 20 16 18.5C18 15 19.5 11.5 19 8C18.5 4.5 15.5 2 12 2Z" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{clinicProfile.name || 'Bright Smile Dental Clinic'}</h3>
                    <p className="text-[11px] text-slate-400">{clinicProfile.address || '12 Airport Hills, Accra, Ghana'}</p>
                    <p className="text-[11px] text-slate-400">{clinicProfile.phone || '+233 30 274 1122'} · {clinicProfile.email || 'hello@brightsmiledental.com'}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    Payment Receipt
                  </span>
                  <p className="font-mono text-xs font-bold text-slate-800 mt-2">{receiptData.receiptNumber}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{receiptData.paymentDate}</p>
                </div>
              </div>

              {/* Patient & Invoice Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Received From</span>
                  <p className="font-bold text-slate-900 mt-0.5">{receiptData.patientName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Invoice Reference</span>
                  <p className="font-mono font-bold text-blue-600 mt-0.5">{receiptData.invoiceNumber}</p>
                </div>
              </div>

              {/* Payment Details Table */}
              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-semibold text-slate-900">{receiptData.paymentMethod}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Transaction Reference:</span>
                  <span className="font-mono text-slate-700">{receiptData.reference}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Recorded By:</span>
                  <span className="text-slate-700">{receiptData.recordedBy}</span>
                </div>
                {receiptData.notes && (
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Notes:</span>
                    <span className="text-slate-700 italic">{receiptData.notes}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-slate-200 text-sm font-bold">
                  <span className="text-slate-900">Amount Paid:</span>
                  <span className="text-emerald-600">GH₵ {receiptData.amount.toFixed(2)}</span>
                </div>
                {receiptData.remainingBalance !== undefined && (
                  <div className="flex justify-between py-1.5 text-xs">
                    <span className="text-slate-500">Remaining Balance:</span>
                    <span className={`font-bold ${receiptData.remainingBalance === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {receiptData.remainingBalance === 0 ? 'PAID IN FULL (GH₵ 0.00)' : `GH₵ ${receiptData.remainingBalance.toFixed(2)}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Thank you note */}
              <div className="text-center pt-2 text-[11px] text-slate-400 border-t border-slate-100">
                <p>Thank you for choosing <span className="font-semibold text-slate-700">{clinicProfile.name || 'Bright Smile Dental Clinic'}</span> for your dental care!</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50 print:hidden">
              <button
                onClick={() => setReceiptData(null)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 bg-[#2563eb] hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl shadow-xs"
              >
                <Printer size={15} />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
