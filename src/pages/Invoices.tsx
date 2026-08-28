import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useClinic } from '../contexts/ClinicContext';
import { useInvoices } from '../hooks/useInvoices';
import { usePatients } from '../hooks/usePatients';
import { exportFinancialTrackerExcel } from '../services/excelExport';
import type { Invoice, Patient } from '../types';
import { 
  Plus, 
  Search, 
  Eye, 
  Printer, 
  X, 
  Check, 
  Download, 
  FileText,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Mail
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Invoices() {
  const { userData } = useAuth();
  const { clinicProfile } = useClinic();
  
  const navigate = useNavigate();
  const { invoices, removeInvoice, loading: invoicesLoading } = useInvoices();
  const { patients, loading: patientsLoading } = usePatients();
  const loading = invoicesLoading || patientsLoading;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [patientFilter, setPatientFilter] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const clinicId = userData?.clinicId || 'demo-clinic';

  const filteredInvoices = invoices.filter(i => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      i.invoiceNumber.toLowerCase().includes(query) || 
      i.patientName.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'All' || i.status === statusFilter;
    const matchesPatient = patientFilter === 'All' || i.patientName === patientFilter;

    return matchesSearch && matchesStatus && matchesPatient;
  });

  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);

  // Unique patient names for filter
  const patientOptions = Array.from(new Set(invoices.map(i => i.patientName)));

  const handlePrint = (invoice: any) => {
    setSelectedInvoice(invoice);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoices</h1>
          <p className="text-xs text-slate-400 mt-1">
            {invoices.length} invoices · <span className="font-semibold text-slate-500">GH₵ {totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> outstanding
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => exportFinancialTrackerExcel(clinicProfile.name || 'Bright Smile Dental Clinic', patients, invoices, [])}
            className="inline-flex items-center justify-center gap-1.5 bg-[#0f766e] hover:bg-[#115e59] text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-xs transition-colors"
          >
            <FileSpreadsheet size={15} />
            <span>Export Excel</span>
          </button>

          <Link to="/invoices/create">
            <button className="inline-flex items-center justify-center gap-1.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors">
              <Plus size={16} />
              <span>Create Invoice</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by invoice number or patient..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2.5">
          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200/90 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer"
          >
            <option value="All">All statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Overdue">Overdue</option>
            <option value="Draft">Draft</option>
          </select>

          {/* Patient Dropdown */}
          <select
            value={patientFilter}
            onChange={e => setPatientFilter(e.target.value)}
            className="bg-white border border-slate-200/90 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer"
          >
            <option value="All">All patients</option>
            {patientOptions.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoices Table Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-slate-400 font-medium border-b border-slate-100">
                <th className="pb-3 font-medium">Invoice</th>
                <th className="pb-3 font-medium">Patient</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Due date</th>
                <th className="pb-3 font-medium">Total</th>
                <th className="pb-3 font-medium">Paid</th>
                <th className="pb-3 font-medium">Balance</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredInvoices.map((invoice: any, idx: number) => {
                const isPaid = invoice.status === 'Paid';
                const isPartiallyPaid = invoice.status === 'Partially Paid';
                const isUnpaid = invoice.status === 'Unpaid';
                const hasBalance = invoice.balance > 0;

                return (
                  <tr key={invoice.id || idx} className="hover:bg-slate-50/50 transition-colors">
                    {/* Invoice ID */}
                    <td className="py-3.5 font-bold font-mono text-slate-900 whitespace-nowrap">
                      {invoice.invoiceNumber}
                    </td>

                    {/* Patient */}
                    <td className="py-3.5 font-normal text-slate-800">
                      {invoice.patientName}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 text-slate-500 whitespace-nowrap">
                      {invoice.invoiceDate}
                    </td>

                    {/* Due Date */}
                    <td className="py-3.5 text-slate-500 whitespace-nowrap">
                      {invoice.dueDate}
                    </td>

                    {/* Total */}
                    <td className="py-3.5 text-slate-700 font-medium whitespace-nowrap">
                      GH₵ {Number(invoice.total).toFixed(2)}
                    </td>

                    {/* Paid */}
                    <td className="py-3.5 text-slate-700 font-medium whitespace-nowrap">
                      GH₵ {Number(invoice.amountPaid || 0).toFixed(2)}
                    </td>

                    {/* Balance */}
                    <td className="py-3.5 whitespace-nowrap">
                      {hasBalance ? (
                        <span className="font-bold text-red-500">
                          GH₵ {Number(invoice.balance).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-medium">
                          GH₵ 0.00
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        isPaid 
                          ? 'bg-emerald-50 text-emerald-600'
                          : isPartiallyPaid
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          title="View Invoice"
                          className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => navigate(`/invoices/create?edit=${invoice.id}`)}
                          title="Edit Invoice"
                          className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => {
                            const p = patients.find(p => p.id === invoice.patientId || p.patientId === invoice.patientId);
                            if (p?.email) {
                              window.location.href = `mailto:${p.email}?subject=Invoice%20${invoice.invoiceNumber}&body=Please%20find%20attached%20your%20invoice.`;
                            } else {
                              toast.error('Patient email not found');
                            }
                          }}
                          title="Email Invoice"
                          className="text-slate-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                        >
                          <Mail size={15} />
                        </button>
                        <button
                          onClick={() => handlePrint(invoice)}
                          title="Print Invoice"
                          className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to delete this invoice?')) {
                              try {
                                await removeInvoice(invoice.id as string);
                                toast.success('Invoice deleted');
                              } catch (e) {
                                toast.error('Failed to delete invoice');
                              }
                            }
                          }}
                          title="Delete Invoice"
                          className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail & Print Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Actions Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-bold text-slate-900 font-mono">{selectedInvoice.invoiceNumber}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs"
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-8 space-y-6 text-xs text-slate-700">
              {/* Top Banner */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-6">
                <div className="flex items-center gap-3">
                  {clinicProfile.logo ? (
                    <img 
                      src={clinicProfile.logo} 
                      alt="Logo" 
                      className="w-10 h-10 object-contain rounded-xl p-1 bg-slate-50 border border-slate-100"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#2563eb] text-white flex items-center justify-center shadow-xs">
                      <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                        <path d="M18.8 4C17.2 4 16 5.1 15.3 6.3C14.6 4.9 13.1 4 11.4 4C8.4 4 6 6.4 6 9.4C6 14.1 10.6 18.5 11.5 19.3C11.7 19.5 11.9 19.5 12.1 19.5C12.3 19.5 12.5 19.5 12.7 19.3C13.6 18.5 18.2 14.1 18.2 9.4C18.2 8.7 18 8 17.6 7.4C18.4 6.8 19 5.8 19 4.7C19 4.3 18.9 4.1 18.8 4ZM12 17.5C10.5 16 7.8 12.8 7.8 9.4C7.8 7.4 9.4 5.8 11.4 5.8C12.8 5.8 14.1 6.6 14.7 7.9C14.8 8.2 15.1 8.4 15.5 8.4C15.9 8.4 16.2 8.2 16.3 7.8C16.8 6.5 17.8 5.8 18.8 5.8C18.9 5.8 19 5.8 19 5.9C18.8 6.7 18.2 7.3 17.4 7.6C17 7.8 16.7 8.2 16.7 8.6C16.7 8.9 16.8 9.2 17 9.4C17.1 9.4 17.1 9.4 17.1 9.4C17.1 12.8 14.4 16 12 17.5Z" opacity="0.9" />
                        <path d="M12 2C8.5 2 5.5 4.5 5 8C4.5 11.5 6 15 8 18.5C9 20 10.5 21.5 11.5 22C11.8 22.1 12.2 22.1 12.5 22C13.5 21.5 15 20 16 18.5C18 15 19.5 11.5 19 8C18.5 4.5 15.5 2 12 2Z" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{clinicProfile.name || 'Bright Smile Dental Clinic'}</h3>
                    <p className="text-slate-400 text-[11px]">{clinicProfile.phone || '+233 30 274 1122'}</p>
                    <p className="text-slate-400 text-[11px]">{clinicProfile.email || 'hello@brightsmiledental.com'}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">INVOICE</span>
                  <span className="font-bold font-mono text-slate-900 text-sm block mt-0.5">{selectedInvoice.invoiceNumber}</span>
                  <span className="text-slate-400 text-[11px] block mt-0.5">{selectedInvoice.invoiceDate}</span>
                </div>
              </div>

              {/* Billed To & Status */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">BILLED TO</p>
                  <p className="font-bold text-slate-900 text-xs mt-1">{selectedInvoice.patientName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">DUE DATE</p>
                  <p className="font-medium text-slate-800 text-xs mt-1">{selectedInvoice.dueDate}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 font-medium border-b border-slate-100">
                    <th className="pb-2">Service</th>
                    <th className="pb-2 text-center">Qty</th>
                    <th className="pb-2 text-right">Price</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(selectedInvoice.items || []).map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2.5 font-medium text-slate-800">{item.serviceName}</td>
                      <td className="py-2.5 text-center text-slate-600">{item.quantity}</td>
                      <td className="py-2.5 text-right text-slate-600">GH₵ {Number(item.unitPrice).toFixed(2)}</td>
                      <td className="py-2.5 text-right font-bold text-slate-900">GH₵ {Number(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <div className="w-56 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span>GH₵ {Number(selectedInvoice.subtotal || selectedInvoice.total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
                    <span>Grand Total</span>
                    <span>GH₵ {Number(selectedInvoice.total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Amount Paid</span>
                    <span>GH₵ {Number(selectedInvoice.amountPaid || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-red-500 pt-1 border-t border-slate-100">
                    <span>Balance Due</span>
                    <span>GH₵ {Number(selectedInvoice.balance || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
