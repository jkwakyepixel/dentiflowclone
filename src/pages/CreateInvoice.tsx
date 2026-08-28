import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useClinic } from '../contexts/ClinicContext';
import { usePatients } from '../hooks/usePatients';
import { useServices } from '../hooks/useServices';
import { useInvoices } from '../hooks/useInvoices';
import type { Patient, Invoice, InvoiceItem, ClinicService } from '../types';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Check, 
  Calendar as CalendarIcon, 
  ChevronDown, 
  Sparkles, 
  X, 
  Layers 
} from 'lucide-react';
import toast from 'react-hot-toast';


const SAMPLE_PATIENT_OPTIONS = [
  { id: 'p1', firstName: 'John', lastName: 'Mensah', patientId: 'PAT-0001', phone: '+233 24 123 4567', email: 'john.mensah@gmail.com' },
  { id: 'p2', firstName: 'Ama', lastName: 'Boateng', patientId: 'PAT-0002', phone: '+233 55 234 5678', email: 'ama.boateng@yahoo.com' },
  { id: 'p3', firstName: 'Kwame', lastName: 'Asante', patientId: 'PAT-0003', phone: '+233 20 345 6789', email: 'kwame.asante@outlook.com' },
  { id: 'p4', firstName: 'Efua', lastName: 'Owusu', patientId: 'PAT-0004', phone: '+233 27 456 7890', email: 'efua.owusu@gmail.com' },
  { id: 'p5', firstName: 'Kofi', lastName: 'Adjei', patientId: 'PAT-0005', phone: '+233 24 567 8901', email: 'kofi.adjei@gmail.com' },
  { id: 'p6', firstName: 'Akosua', lastName: 'Frimpong', patientId: 'PAT-0006', phone: '+233 20 678 9012', email: 'akosua.frimpong@gmail.com' },
  { id: 'p7', firstName: 'Yaw', lastName: 'Darko', patientId: 'PAT-0007', phone: '+233 55 789 0123', email: 'yaw.darko@gmail.com' },
  { id: 'p8', firstName: 'Abena', lastName: 'Serwaa', patientId: 'PAT-0008', phone: '+233 26 890 1234', email: 'abena.serwaa@gmail.com' },
];

export default function CreateInvoice() {
  const { userData } = useAuth();
  const { clinicProfile } = useClinic();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlPatientId = searchParams.get('patientId') || '';
  const editInvoiceId = searchParams.get('edit');

  const { patients } = usePatients();
  const { services: dbServices, addService } = useServices();
  const { invoices, addInvoice, editInvoice } = useInvoices();
  
  const [catalogServices, setCatalogServices] = useState<{ name: string; price: number; category?: string }[]>([]);
  
  const [patientId, setPatientId] = useState(urlPatientId);
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`);
  const [invoiceDate, setInvoiceDate] = useState('2026-08-26');
  const [dueDate, setDueDate] = useState('2026-09-09');
  
  const [items, setItems] = useState<InvoiceItem[]>([]);
  
  const [discount, setDiscount] = useState<number | string>('0.00');
  const [tax, setTax] = useState<number | string>('0.00');
  const [amountPaid, setAmountPaid] = useState<number | string>('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Service Modal State
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('General');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [savingService, setSavingService] = useState(false);

  const clinicId = userData?.clinicId || 'demo-clinic';

  // Fetch edit data
  useEffect(() => {
    if (editInvoiceId && invoices.length > 0) {
      const invToEdit = invoices.find(i => i.id === editInvoiceId);
      if (invToEdit) {
        setPatientId(invToEdit.patientId || '');
        setInvoiceNumber(invToEdit.invoiceNumber || '');
        setInvoiceDate(invToEdit.invoiceDate || '');
        setDueDate(invToEdit.dueDate || '');
        setItems(invToEdit.items || []);
        setDiscount(invToEdit.discount || 0);
        setTax(invToEdit.tax || 0);
        setAmountPaid(invToEdit.amountPaid || 0);
      }
    }
  }, [editInvoiceId, invoices]);

  useEffect(() => {
    if (dbServices) {
      setCatalogServices(dbServices);
    }
  }, [dbServices]);

  const handleQuickAddService = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    if (!selectedName) return;

    if (selectedName === '__ADD_NEW__') {
      setIsNewServiceModalOpen(true);
      e.target.value = '';
      return;
    }

    const found = catalogServices.find(s => s.name === selectedName);
    if (found) {
      setItems([
        ...items,
        {
          id: Math.random().toString(),
          serviceName: found.name,
          description: '',
          quantity: 1,
          unitPrice: found.price,
          total: found.price
        }
      ]);
    }
    e.target.value = '';
  };

  const handleAddBlankLine = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(),
        serviceName: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0
      }
    ]);
  };

  const handleCreateCustomService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) {
      toast.error('Please enter a service name');
      return;
    }
    const priceNum = parseFloat(newServicePrice) || 0;

    setSavingService(true);
    try {
      await addService({
        name: newServiceName.trim(),
        price: priceNum,
        category: newServiceCategory,
        description: newServiceDesc.trim()
      });

      const addedService = { name: newServiceName.trim(), price: priceNum, category: newServiceCategory };
      setCatalogServices([addedService, ...catalogServices]);

      // Automatically add this new service to the current invoice
      setItems([
        ...items,
        {
          id: Math.random().toString(),
          serviceName: addedService.name,
          description: newServiceDesc.trim(),
          quantity: 1,
          unitPrice: priceNum,
          total: priceNum
        }
      ]);

      toast.success(`"${addedService.name}" added to catalog and invoice!`);
      setIsNewServiceModalOpen(false);

      // Reset form
      setNewServiceName('');
      setNewServicePrice('');
      setNewServiceDesc('');
    } catch (error) {
      toast.error('Failed to save service');
    } finally {
      setSavingService(false);
    }
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      const q = typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : item.quantity;
      const p = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice;
      item.total = q * p;
    }
    
    newItems[index] = item as InvoiceItem;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const numDiscount = parseFloat(discount as string) || 0;
  const numTax = parseFloat(tax as string) || 0;
  const numPaid = parseFloat(amountPaid as string) || 0;

  const grandTotal = Math.max(0, subtotal + numTax - numDiscount);
  const balanceDue = Math.max(0, grandTotal - numPaid);

  const selectedPatient = patients.find(p => p.id === patientId || p.patientId === patientId);

  const handleSave = async (status: 'Draft' | 'Unpaid' | 'Paid') => {
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const invoiceData = {
        patientId: selectedPatient.id || 'p-gen',
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        invoiceDate,
        dueDate,
        items: items.length > 0 ? items : [{ id: '1', serviceName: 'Dental Care', description: '', quantity: 1, unitPrice: grandTotal, total: grandTotal }],
        discount: numDiscount,
        tax: numTax,
        amountPaid: numPaid,
        status
      };

      if (editInvoiceId) {
        await editInvoice(editInvoiceId, invoiceData);
        toast.success(`Invoice ${status === 'Draft' ? 'draft saved' : 'updated'} successfully`);
      } else {
        await addInvoice(invoiceData as any);
        toast.success(`Invoice ${status === 'Draft' ? 'draft saved' : 'created'} successfully`);
      }
      
      navigate('/invoices');
    } catch (error) {
      toast.error('Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Back to invoices link */}
      <div>
        <Link 
          to="/invoices" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to invoices</span>
        </Link>
      </div>

      {/* Header Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{editInvoiceId ? 'Edit Invoice' : 'Create Invoice'}</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">Invoice number {invoiceNumber}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleSave('Draft')}
            disabled={isSubmitting}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xs transition-colors disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => handleSave(balanceDue === 0 && grandTotal > 0 ? 'Paid' : 'Unpaid')}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-1.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={16} />
            )}
            <span>{isSubmitting ? 'Saving...' : (editInvoiceId ? 'Update Invoice' : 'Create Invoice')}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Forms - 7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Invoice Information */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4 text-xs">
            <h2 className="text-xs font-bold text-slate-900">Invoice Information</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Patient</label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full border border-slate-200/90 rounded-xl p-2.5 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value="">Select patient...</option>
                  {patients.map((p) => (
                    <option key={p.id || p.patientId} value={p.id || p.patientId}>
                      {p.firstName} {p.lastName} ({p.patientId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Invoice number</label>
                <input
                  type="text"
                  readOnly
                  value={invoiceNumber}
                  className="w-full border border-slate-200/90 rounded-xl p-2.5 bg-slate-50/50 text-xs font-mono text-slate-800 focus:outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Invoice date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full border border-slate-200/90 rounded-xl p-2.5 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Due date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-slate-200/90 rounded-xl p-2.5 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Services */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xs font-bold text-slate-900">Services</h2>
              <div className="flex flex-wrap items-center gap-2">
                {/* Quick Add Dropdown */}
                <select
                  onChange={handleQuickAddService}
                  defaultValue=""
                  className="border border-slate-200/90 rounded-xl px-3 py-1.5 bg-white text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
                >
                  <option value="" disabled>Quick add service...</option>
                  {catalogServices.map((s, i) => (
                    <option key={`${s.name}-${i}`} value={s.name}>
                      {s.name} (GH₵ {s.price.toFixed(2)})
                    </option>
                  ))}
                  <option value="__ADD_NEW__" className="font-semibold text-blue-600">
                    + Add New Custom Service...
                  </option>
                </select>

                {/* Direct Add Blank Line */}
                <button
                  type="button"
                  onClick={handleAddBlankLine}
                  className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-2xs transition-colors"
                >
                  <Plus size={14} />
                  <span>Add line</span>
                </button>
              </div>
            </div>

            {/* Line Items List */}
            {items.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                No services yet. Use "Add line" or "Quick add service".
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={item.id || idx} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/40 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        placeholder="Service name or procedure..."
                        value={item.serviceName}
                        onChange={(e) => handleItemChange(idx, 'serviceName', e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-md transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Unit Price (GH₵)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Line Total</label>
                        <div className="py-1 text-xs font-bold text-slate-900">
                          GH₵ {Number(item.total).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Totals */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4 text-xs">
            <h2 className="text-xs font-bold text-slate-900">Totals</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Discount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full border border-slate-200/90 rounded-xl p-2 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Tax</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className="w-full border border-slate-200/90 rounded-xl p-2 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Amount paid</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full border border-slate-200/90 rounded-xl p-2 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                />
              </div>
            </div>

            {/* Bottom summary row */}
            <div className="flex flex-wrap items-center justify-end gap-6 pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                Subtotal: <strong className="text-slate-800 font-bold">GH₵ {subtotal.toFixed(2)}</strong>
              </span>
              <span className="text-slate-500">
                Grand total: <strong className="text-slate-900 font-bold">GH₵ {grandTotal.toFixed(2)}</strong>
              </span>
              <span className="text-slate-500">
                Balance due: <strong className="text-[#10b981] font-bold">GH₵ {balanceDue.toFixed(2)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (Live Invoice Document Preview - 5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] text-xs text-slate-600 flex flex-col justify-between min-h-[480px]">
            <div>
              {/* Header Logo & Clinic Details */}
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#2563eb] text-white flex items-center justify-center shadow-2xs flex-shrink-0">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M18.8 4C17.2 4 16 5.1 15.3 6.3C14.6 4.9 13.1 4 11.4 4C8.4 4 6 6.4 6 9.4C6 14.1 10.6 18.5 11.5 19.3C11.7 19.5 11.9 19.5 12.1 19.5C12.3 19.5 12.5 19.5 12.7 19.3C13.6 18.5 18.2 14.1 18.2 9.4C18.2 8.7 18 8 17.6 7.4C18.4 6.8 19 5.8 19 4.7C19 4.3 18.9 4.1 18.8 4ZM12 17.5C10.5 16 7.8 12.8 7.8 9.4C7.8 7.4 9.4 5.8 11.4 5.8C12.8 5.8 14.1 6.6 14.7 7.9C14.8 8.2 15.1 8.4 15.5 8.4C15.9 8.4 16.2 8.2 16.3 7.8C16.8 6.5 17.8 5.8 18.8 5.8C18.9 5.8 19 5.8 19 5.9C18.8 6.7 18.2 7.3 17.4 7.6C17 7.8 16.7 8.2 16.7 8.6C16.7 8.9 16.8 9.2 17 9.4C17.1 9.4 17.1 9.4 17.1 9.4C17.1 12.8 14.4 16 12 17.5Z" opacity="0.9" />
                      <path d="M12 2C8.5 2 5.5 4.5 5 8C4.5 11.5 6 15 8 18.5C9 20 10.5 21.5 11.5 22C11.8 22.1 12.2 22.1 12.5 22C13.5 21.5 15 20 16 18.5C18 15 19.5 11.5 19 8C18.5 4.5 15.5 2 12 2Z" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 leading-tight">Bright Smile Dental Clinic</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">+233 30 274 1122</p>
                    <p className="text-[10px] text-slate-400">hello@brightsmiledental.com</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">INVOICE</span>
                  <span className="text-xs font-bold font-mono text-slate-900 block mt-0.5">{invoiceNumber}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{invoiceDate}</span>
                </div>
              </div>

              {/* Billed To & Due Date subrow */}
              <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">BILLED TO</p>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Select a patient'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">DUE DATE</p>
                  <p className="text-xs font-medium text-slate-800 mt-0.5">{dueDate}</p>
                </div>
              </div>

              {/* Services Preview Table */}
              <div className="py-4">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-[10px] text-slate-400 font-medium border-b border-slate-100">
                      <th className="pb-2">Service</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-right">Unit price</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-[11px] text-slate-400 italic">
                          No services added yet
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => (
                        <tr key={idx} className="text-slate-700">
                          <td className="py-2.5 font-medium">{item.serviceName || '—'}</td>
                          <td className="py-2.5 text-center">{item.quantity}</td>
                          <td className="py-2.5 text-right">GH₵ {Number(item.unitPrice).toFixed(2)}</td>
                          <td className="py-2.5 text-right font-bold text-slate-900">GH₵ {Number(item.total).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Subtotals */}
              <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-800">GH₵ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-slate-900 pt-1">
                  <span>Grand total</span>
                  <span>GH₵ {grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-[#10b981]">
                  <span>Balance due</span>
                  <span>GH₵ {balanceDue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Bottom Footer */}
            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>12 Airport Hills, Accra, Ghana</span>
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                Draft
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Custom Service Modal */}
      {isNewServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Add Service to Catalog</h2>
              </div>
              <button 
                onClick={() => setIsNewServiceModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomService} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Service / Procedure Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dental Veneers, Night Guard"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Standard Price (GH₵) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={newServiceCategory}
                    onChange={(e) => setNewServiceCategory(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="General">General</option>
                    <option value="Preventive">Preventive</option>
                    <option value="Cosmetic">Cosmetic</option>
                    <option value="Restorative">Restorative</option>
                    <option value="Surgical">Surgical</option>
                    <option value="Orthodontics">Orthodontics</option>
                    <option value="Endodontics">Endodontics</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Clinical notes or procedure description..."
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewServiceModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingService}
                  className="px-4 py-2 font-semibold text-white bg-[#2563eb] hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-2"
                >
                  {savingService && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {savingService ? 'Saving...' : 'Save & Add to Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
