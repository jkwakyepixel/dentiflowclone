import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useClinic } from '../contexts/ClinicContext';
import { fetchById, fetchForClinic, createDoc, updateDocument, logAudit } from '../services/db';
import { recordPayment } from '../services/paymentService';
import type { Patient, Appointment, Invoice, Payment, TreatmentPlan, ClinicalNote, TreatmentOperation } from '../types';
import { usePatients } from '../hooks/usePatients';
import { useAppointments } from '../hooks/useAppointments';
import { useInvoices } from '../hooks/useInvoices';
import { usePayments } from '../hooks/usePayments';
import { useTreatmentPlans } from '../hooks/useTreatmentPlans';
import { useClinicalNotes } from '../hooks/useClinicalNotes';
import { useServices } from '../hooks/useServices';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { 
  ArrowLeft, Phone, Mail, Cake, CalendarIcon, FileText, CreditCard, Trash2, Plus, X, Edit2
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { clinicProfile } = useClinic();

  const { patients, editPatient, loading: patientsLoading } = usePatients();
  const { appointments } = useAppointments();
  const { invoices, removeInvoice } = useInvoices();
  const { payments } = usePayments();
  const { services } = useServices();
  
  const patient = patients.find(p => p.id === id);
  const loading = patientsLoading;
  
  const patientAppointments = appointments.filter(a => a.patientId === id);
  const patientInvoices = invoices.filter(i => i.patientId === id);
  const patientPayments = payments.filter(p => p.patientId === id);
  
  // Tab state preserving the classic view + new tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'treatment' | 'notes' | 'appointments' | 'invoices' | 'payments'>('overview');
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab === 'notes' || tab === 'treatment' || tab === 'appointments' || tab === 'invoices' || tab === 'payments') {
      setActiveTab(tab);
    }
  }, [location.search]);

  // Treatment Plans State
  const { plans: treatmentPlans, addPlan, editPlan, removePlan } = useTreatmentPlans(patient?.id || id);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isRenamingPlan, setIsRenamingPlan] = useState(false);
  const [newPlanNameInput, setNewPlanNameInput] = useState('');
  const [isAddOpModalOpen, setIsAddOpModalOpen] = useState(false);

  // New Operation Form State
  const [opDesc, setOpDesc] = useState('PR002 - Scaling & Polishing (Moderate Stains)');
  const [opTooth, setOpTooth] = useState('All');
  const [opPriority, setOpPriority] = useState(3);
  const [opDentist, setOpDentist] = useState(userData?.name || 'Clinic Staff');
  const [opPlannedDate, setOpPlannedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [opNote, setOpNote] = useState('');
  const [opStatus, setOpStatus] = useState<'TBD' | 'In Progress' | 'Done'>('TBD');

  // Notes State
  const { notes: notesList, addNote, editNote, removeNote } = useClinicalNotes(patient?.id || id);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');

  // Edit Patient State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: 'Male',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    allergies: '',
    medicalNotes: '',
    dentalNotes: ''
  });

  // Modals for Actions
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Mobile Money' | 'Card' | 'Bank Transfer'>('Cash');
  const [paymentRef, setPaymentRef] = useState('');

  const clinicId = userData?.clinicId || 'demo-clinic';

  const formatTimestamp = (ts: any) => ts?.toDate ? format(ts.toDate(), 'dd MMM yyyy') : (ts || 'Unknown');

  const activePlan = treatmentPlans.find(p => p.id === selectedPlanId) || treatmentPlans[0] || {
    id: 'placeholder', name: 'No Plan', operations: [], createdBy: '', createdAt: '', updatedAt: '', isActive: false, teethType: 'permanent'
  };

  const handleCreateNewPlan = async () => {
    try {
      const newPlanId = await addPlan({
        name: `Plan ${treatmentPlans.length + 1}`,
        patientId: patient?.id || id || 'unknown',
        isActive: false,
        teethType: 'permanent',
        createdBy: userData?.name || clinicProfile.name || 'Bright Smile Dental Clinic',
        operations: []
      });
      setSelectedPlanId(newPlanId);
      toast.success(`Created Plan ${treatmentPlans.length + 1}`);
    } catch (error) {
      toast.error('Failed to create plan');
    }
  };

  const handleChangePlanName = async () => {
    if (!newPlanNameInput.trim() || !activePlan.id || activePlan.id === 'placeholder') return;
    try {
      await editPlan(activePlan.id, { name: newPlanNameInput.trim() });
      setIsRenamingPlan(false);
      toast.success('Plan name updated');
    } catch (error) {
      toast.error('Failed to update plan name');
    }
  };

  const handleToggleActivePlan = async (planId: string) => {
    if (!planId || planId === 'placeholder') return;
    try {
      await editPlan(planId, { isActive: !activePlan.isActive });
      toast.success('Active plan toggled');
    } catch (error) {
      toast.error('Failed to toggle active plan');
    }
  };

  const handleAddOperationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opDesc.trim() || !activePlan.id || activePlan.id === 'placeholder') return;

    const newOp: TreatmentOperation = {
      id: `op-${Date.now()}`,
      code: opDesc.split(' - ')[0] || 'OP',
      description: opDesc,
      tooth: opTooth,
      priority: Number(opPriority),
      dentist: opDentist,
      creationDate: format(new Date(), 'MM/dd/yyyy'),
      plannedDate: opPlannedDate,
      note: opNote,
      status: opStatus
    };

    try {
      await editPlan(activePlan.id, {
        operations: [...activePlan.operations, newOp]
      });
      setIsAddOpModalOpen(false);
      setOpNote('');
      toast.success('Operation added to treatment plan');
    } catch (error) {
      toast.error('Failed to add operation');
    }
  };

  const handleDeleteOperation = async (opId: string) => {
    if (!activePlan.id || activePlan.id === 'placeholder') return;
    try {
      await editPlan(activePlan.id, {
        operations: activePlan.operations.filter(op => op.id !== opId)
      });
      toast.success('Operation removed');
    } catch (error) {
      toast.error('Failed to remove operation');
    }
  };

  const handleUpdateOperationStatus = async (opId: string, newStatus: 'TBD' | 'In Progress' | 'Done') => {
    if (!activePlan.id || activePlan.id === 'placeholder') return;
    try {
      await editPlan(activePlan.id, {
        operations: activePlan.operations.map(op => 
          op.id === opId ? { ...op, status: newStatus } : op
        )
      });
      toast.success('Operation status updated');
    } catch (error) {
      toast.error('Failed to update operation status');
    }
  };

  const handleDeletePlan = async () => {
    if (!activePlan.id || activePlan.id === 'placeholder') return;
    try {
      await removePlan(activePlan.id);
      setSelectedPlanId(treatmentPlans.filter(p => p.id !== activePlan.id)[0]?.id || '');
      toast.success('Treatment plan deleted');
    } catch (error) {
      toast.error('Failed to delete treatment plan');
    }
  };

  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    try {
      if (editingNoteId) {
        await editNote(editingNoteId, {
          title: 'Clinical Note',
          content: noteContent.trim(),
          category: 'General'
        });
        toast.success('Clinical note updated');
      } else {
        await addNote({
          title: 'Clinical Note',
          patientId: patient?.id || id || 'unknown',
          content: noteContent.trim(),
          category: 'General',
          dentist: userData?.name || 'Clinic Staff',
          date: format(new Date(), 'dd MMM yyyy')
        });
        toast.success('Clinical note recorded');
      }
      setIsAddNoteModalOpen(false);
      setEditingNoteId(null);
      setNoteContent('');
    } catch (error) {
      toast.error(editingNoteId ? 'Failed to update note' : 'Failed to record clinical note');
    }
  };

  const handleEditNote = (note: ClinicalNote) => {
    setEditingNoteId(note.id as string);
    setNoteContent(note.content);
    setIsAddNoteModalOpen(true);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await removeNote(noteId);
        toast.success('Note deleted successfully');
      } catch (error) {
        toast.error('Failed to delete note');
      }
    }
  };

  const handleOpenEditModal = () => {
    if (!patient) return;
    setEditFormData({
      firstName: patient.firstName || '',
      lastName: patient.lastName || '',
      phone: patient.phone || '',
      email: patient.email || '',
      dateOfBirth: patient.dateOfBirth || '',
      gender: patient.gender || 'Male',
      address: patient.address || '',
      emergencyContactName: patient.emergencyContact?.name || '',
      emergencyContactPhone: patient.emergencyContact?.phone || '',
      allergies: patient.allergies || '',
      medicalNotes: patient.medicalNotes || '',
      dentalNotes: patient.dentalNotes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient?.id) return;
    
    try {
      await editPatient(patient.id, {
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        phone: editFormData.phone,
        email: editFormData.email,
        dateOfBirth: editFormData.dateOfBirth,
        gender: editFormData.gender,
        address: editFormData.address,
        allergies: editFormData.allergies,
        medicalNotes: editFormData.medicalNotes,
        dentalNotes: editFormData.dentalNotes,
        emergencyContact: {
          name: editFormData.emergencyContactName,
          phone: editFormData.emergencyContactPhone,
          relationship: patient.emergencyContact?.relationship || 'Not specified'
        }
      });
      setIsEditModalOpen(false);
      toast.success('Patient information updated');
    } catch (error) {
      toast.error('Failed to update patient');
    }
  };

  if (loading) {
    return <div className="p-8 text-xs text-slate-400">Loading patient details...</div>;
  }

  if (!patient) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        <p>Patient not found.</p>
        <Link to="/patients" className="text-blue-600 font-medium mt-2 inline-block">
          ← Back to patients
        </Link>
      </div>
    );
  }

  const patientFullName = `${patient.firstName} ${patient.lastName}`;
  const patientInitials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase() || 'JM';

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Back link */}
      <div>
        <Link 
          to="/patients" 
          className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to patients</span>
        </Link>
      </div>

      {/* 2. Top Patient Card matching original UI */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#1e293b] text-white font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-xs">
            {patientInitials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{patientFullName}</h1>
              <span className="text-xs text-slate-400 font-mono">{patient.patientId || 'PAT-0001'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
              <span className="inline-flex items-center gap-1">
                <Phone size={13} className="text-slate-400" />
                {patient.phone || 'No phone'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Mail size={13} className="text-slate-400" />
                {patient.email || 'No email'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Cake size={13} className="text-slate-400" />
                {patient.dateOfBirth || 'No DOB'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          <button 
            onClick={() => navigate(`/appointments?patientId=${patient.id || id}&book=true`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <CalendarIcon size={14} />
            <span>Book Appointment</span>
          </button>

          <button 
            onClick={() => navigate(`/invoices/create?patientId=${patient.id || id}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <FileText size={14} />
            <span>Create Invoice</span>
          </button>

          <button 
            onClick={() => navigate(`/payments?patientId=${patient.id || id}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#2563eb] text-white hover:bg-blue-700 shadow-xs transition-colors"
          >
            <CreditCard size={14} />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* 3. Pill Tabs matching original UI */}
      <div className="inline-flex bg-slate-100/90 p-1 rounded-2xl gap-1 text-xs font-medium overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Overview
        </button>

        <button
          onClick={() => setActiveTab('treatment')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'treatment'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Treatment Plans
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'notes'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Clinical Notes
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'appointments'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Appointments
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'invoices'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Invoices
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'payments'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Payments
        </button>
      </div>

      {/* 4. Tab 1: OVERVIEW (Exact matching screenshot layout) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4 relative group">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Personal Information</h2>
                <button 
                  onClick={handleOpenEditModal}
                  className="text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all absolute right-4 top-4"
                  title="Edit Patient Information"
                >
                  <Edit2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Gender</span>
                  <span className="text-slate-900 font-medium mt-0.5 block">{patient.gender || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Address</span>
                  <span className="text-slate-900 font-medium mt-0.5 block">{patient.address || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Emergency contact</span>
                  <span className="text-slate-900 font-medium mt-0.5 block">
                    {patient.emergencyContact?.name || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Emergency phone</span>
                  <span className="text-slate-900 font-medium mt-0.5 block">
                    {patient.emergencyContact?.phone || 'Not specified'}
                  </span>
                </div>
              </div>
            </div>

            {/* Medical & Dental Notes Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
              <h2 className="text-sm font-bold text-slate-900">Medical & Dental Notes</h2>
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Allergies</span>
                  <span className="text-slate-900 font-medium mt-0.5 block">{patient.allergies || 'None recorded'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Medical notes</span>
                  <span className="text-slate-900 font-medium mt-0.5 block">{patient.medicalNotes || 'None recorded'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Dental notes</span>
                  <span className="text-slate-900 font-medium mt-0.5 block">{patient.dentalNotes || 'None recorded'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (1/3) */}
          <div className="space-y-6">
            {/* Balance Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-2">
              <h2 className="text-xs text-slate-400 font-medium">Balance</h2>
              <p className="text-2xl font-bold text-red-600">GH₵ {(Number(patient.balance) || 0).toFixed(2)}</p>
              <p className="text-xs text-slate-400">Outstanding balance</p>
            </div>

            {/* Appointments Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-3 text-xs">
              <h2 className="text-sm font-bold text-slate-900">Appointments</h2>
              <div>
                <span className="text-slate-400 font-medium block">Last appointment</span>
                <span className="text-slate-900 font-medium mt-0.5 block">{patient.lastAppointment || 'Not scheduled'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Next appointment</span>
                <span className="text-slate-900 font-medium mt-0.5 block">{patient.nextAppointment || 'Not scheduled'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab 2: TREATMENT PLANS */}
      {activeTab === 'treatment' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left: Plans List */}
          <div className="md:col-span-3 bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4 self-start">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900">Treatment Plans</h3>
              <button
                onClick={handleCreateNewPlan}
                className="bg-[#0284c7] hover:bg-sky-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xs transition-colors"
              >
                NEW PLAN
              </button>
            </div>

            <div className="space-y-1.5">
              {treatmentPlans.map(plan => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id || '')}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer text-xs transition-all ${
                    selectedPlanId === plan.id
                      ? 'bg-blue-50/50 border-blue-200 font-bold text-blue-900'
                      : 'border-slate-100 hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="selectedPlanRadio"
                      checked={selectedPlanId === plan.id}
                      onChange={() => setSelectedPlanId(plan.id || '')}
                      className="accent-[#0284c7]"
                    />
                    <span>{plan.name} {plan.isActive ? '(Active)' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Plan Details & Operations */}
          <div className="md:col-span-9 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
              {/* Beige Banner */}
              <div className="bg-[#fef9c3]/50 border-b border-amber-200/50 px-6 py-2.5 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-800">{activePlan.name}</span> - Created By {activePlan.createdBy} on {formatTimestamp(activePlan.createdAt)} | Last updated by {activePlan.createdBy} on {formatTimestamp(activePlan.updatedAt)}
              </div>

              <div className="p-6 space-y-6">
                {/* Plan Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-400 font-medium">Plan Name</p>
                    {isRenamingPlan ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newPlanNameInput}
                          onChange={(e) => setNewPlanNameInput(e.target.value)}
                          placeholder={activePlan.name}
                          className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
                        />
                        <button onClick={handleChangePlanName} className="text-blue-600 font-bold text-xs">Save</button>
                        <button onClick={() => setIsRenamingPlan(false)} className="text-slate-400 text-xs">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-900">{activePlan.name}</span>
                        <button
                          onClick={() => {
                            setNewPlanNameInput(activePlan.name);
                            setIsRenamingPlan(true);
                          }}
                          className="text-[#0284c7] font-bold text-[11px] hover:underline"
                        >
                          CHANGE NAME
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        checked={activePlan.isActive}
                        onChange={() => handleToggleActivePlan(activePlan.id || '')}
                        className="accent-[#0284c7] w-4 h-4 rounded"
                      />
                      <span>Is Active</span>
                    </label>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      You need to activate another plan in order to disable this plan
                    </p>
                  </div>
                </div>

                {/* Teeth Classification */}
                <div className="flex items-center gap-6 text-xs text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="teethType"
                      checked={activePlan.teethType === 'primary'}
                      onChange={() => activePlan.id && activePlan.id !== 'placeholder' && editPlan(activePlan.id, { teethType: 'primary' })}
                      className="accent-[#0284c7]"
                    />
                    <span>All Primary Teeth</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="teethType"
                      checked={activePlan.teethType === 'permanent'}
                      onChange={() => activePlan.id && activePlan.id !== 'placeholder' && editPlan(activePlan.id, { teethType: 'permanent' })}
                      className="accent-[#0284c7]"
                    />
                    <span className="font-semibold text-slate-900">All Permanent Teeth</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="teethType"
                      checked={activePlan.teethType === 'mixed'}
                      onChange={() => activePlan.id && activePlan.id !== 'placeholder' && editPlan(activePlan.id, { teethType: 'mixed' })}
                      className="accent-[#0284c7]"
                    />
                    <span>Mixed Teeth</span>
                  </label>
                </div>

                {/* Operations Table */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">Plan Operations</h4>
                    <button
                      onClick={() => setIsAddOpModalOpen(true)}
                      className="bg-[#0284c7] hover:bg-sky-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors"
                    >
                      ADD OPERATION
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-400 font-medium border-b border-slate-100">
                        <tr>
                          <th className="p-3">Description</th>
                          <th className="p-3">Tooth #</th>
                          <th className="p-3">Priority</th>
                          <th className="p-3">Dentist</th>
                          <th className="p-3">Creation Date</th>
                          <th className="p-3">Planned Date</th>
                          <th className="p-3">Note</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {activePlan.operations.map((op) => (
                          <tr key={op.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3 font-semibold text-slate-900 max-w-xs">{op.description}</td>
                            <td className="p-3 text-slate-600">{op.tooth}</td>
                            <td className="p-3 text-slate-600">{op.priority}</td>
                            <td className="p-3 text-slate-600">{op.dentist}</td>
                            <td className="p-3 text-slate-500 whitespace-nowrap">{op.creationDate}</td>
                            <td className="p-3 text-slate-500 whitespace-nowrap">{op.plannedDate}</td>
                            <td className="p-3 text-slate-400 max-w-xs truncate">{op.note || 'Add a note...'}</td>
                            <td className="p-3">
                              <select
                                value={op.status}
                                onChange={(e) => handleUpdateOperationStatus(op.id, e.target.value as 'TBD' | 'In Progress' | 'Done')}
                                className={`px-2 py-1 rounded-lg text-xs font-bold border-0 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/20 ${
                                  op.status === 'Done' ? 'bg-emerald-50 text-emerald-600' :
                                  op.status === 'In Progress' ? 'bg-amber-50 text-amber-600' :
                                  'bg-slate-100 text-slate-600'
                                }`}
                              >
                                <option value="TBD">TBD</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Done">Done</option>
                              </select>
                            </td>
                            <td className="p-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => handleDeleteOperation(op.id)}
                                className="text-slate-400 hover:text-red-600 p-1"
                                title="Remove operation"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {activePlan.operations.length === 0 && (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-slate-400">
                              No operations added yet. Click "ADD OPERATION" to define dental procedures.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    onClick={handleDeletePlan}
                    className="bg-[#ea580c] hover:bg-orange-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors uppercase"
                  >
                    DELETE
                  </button>

                  <button
                    onClick={() => {
                      if (activePlan.id && activePlan.id !== 'placeholder') {
                        toast.success('Treatment plan operations synced successfully');
                      }
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition-colors uppercase"
                  >
                    SYNC PLAN (AUTO-SAVES)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Tab 3: CLINICAL NOTES */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Clinical & Doctor Notes</h3>
            <button
              onClick={() => {
                setEditingNoteId(null);
                setNoteContent('');
                setIsAddNoteModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors"
            >
              <Plus size={15} />
              <span>Add Note</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {notesList.map((note) => (
              <div key={note.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-xs">Clinical Note</h4>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] text-slate-400 font-medium">{note.date} · {note.dentist}</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEditNote(note)}
                        className="text-slate-400 hover:text-blue-600 p-1 rounded-md hover:bg-blue-50 transition-colors"
                        title="Edit Note"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteNote(note.id as string)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors"
                        title="Delete Note"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Tab 4: APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Appointment History</h3>
            <button 
              onClick={() => navigate(`/appointments?patientId=${patient.id || id}&book=true`)}
              className="bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-xs"
            >
              + Schedule Appointment
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {patientAppointments.length === 0 ? (
              <div className="py-8 text-center text-slate-400">No appointments found.</div>
            ) : (
              patientAppointments.map(appt => (
                <div key={appt.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{appt.date} at {appt.startTime}</p>
                    <p className="text-slate-400">{appt.appointmentType} · {appt.room || 'Room TBD'}</p>
                  </div>
                  <span className={`font-semibold px-2.5 py-0.5 rounded-full text-[10px] ${
                    appt.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700' :
                    appt.status === 'Completed' ? 'bg-slate-100 text-slate-600' :
                    appt.status === 'Cancelled' ? 'bg-red-50 text-red-600' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    {appt.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 8. Tab 5: INVOICES */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Invoices</h3>
            <button 
              onClick={() => navigate(`/invoices/create?patientId=${patient.id || id}`)}
              className="bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-xs"
            >
              + Create Invoice
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {patientInvoices.length === 0 ? (
              <div className="py-8 text-center text-slate-400">No invoices found.</div>
            ) : (
              patientInvoices.map(invoice => (
                <div key={invoice.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold font-mono text-slate-900">{invoice.invoiceNumber}</p>
                    <p className="text-slate-400">{invoice.invoiceDate || invoice.dueDate} · {invoice.status}</p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="font-bold text-slate-900">GH₵ {(invoice.total || 0).toFixed(2)}</p>
                      {(invoice.balance || 0) > 0 && (
                        <span className="text-amber-600 text-[10px] font-semibold">Balance: GH₵ {(invoice.balance || 0).toFixed(2)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        onClick={() => navigate(`/invoices/create?edit=${invoice.id}`)}
                        title="Edit Invoice"
                        className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          const p = patient || patients.find(p => p.id === invoice.patientId || p.patientId === invoice.patientId);
                          if (p?.email) {
                            window.location.href = `mailto:${p.email}?subject=Invoice%20${invoice.invoiceNumber}&body=Please%20find%20attached%20your%20invoice.`;
                          } else {
                            toast.error('Patient email not found');
                          }
                        }}
                        title="Email Invoice"
                        className="text-slate-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50 transition-colors"
                      >
                        <Mail size={14} />
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
                        className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 9. Tab 6: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Payment History</h3>
            <button 
              onClick={() => navigate(`/payments?patientId=${patient.id || id}`)}
              className="bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-xs"
            >
              + Record Payment
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {patientPayments.length === 0 ? (
              <div className="py-8 text-center text-slate-400">No payments found.</div>
            ) : (
              patientPayments.map(payment => (
                <div key={payment.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">GH₵ {(payment.amount || 0).toFixed(2)} · {payment.paymentMethod}</p>
                    <p className="text-slate-400">{payment.paymentDate} · Ref: {payment.reference}</p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full text-[10px]">
                    Recorded
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Operation Modal */}
      {isAddOpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#0284c7] px-5 py-3 flex items-center justify-between text-white">
              <h3 className="text-xs font-bold">Add Plan Operation</h3>
              <button onClick={() => setIsAddOpModalOpen(false)} className="text-white/80 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddOperationSubmit} className="p-5 space-y-3 text-xs text-slate-700">
              <div>
                <label className="block font-medium mb-1">Description / Procedure *</label>
                <SearchableSelect
                  value={opDesc}
                  onChange={(val) => setOpDesc(val)}
                  placeholder="Select or search procedure..."
                  options={services.map(s => ({
                    value: s.name,
                    label: s.name,
                    category: s.category,
                    price: s.price
                  }))}
                  onAddCustom={() => {
                    const custom = window.prompt('Enter custom procedure name:');
                    if (custom) setOpDesc(custom);
                  }}
                />
                {opDesc && !services.find(s => s.name === opDesc) && (
                  <p className="text-xs text-blue-600 mt-1">Custom procedure: {opDesc}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Tooth #</label>
                  <input
                    type="text"
                    value={opTooth}
                    onChange={(e) => setOpTooth(e.target.value)}
                    placeholder="All or tooth #"
                    className="w-full border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Priority (1-3)</label>
                  <input
                    type="number"
                    min="1"
                    max="3"
                    value={opPriority}
                    onChange={(e) => setOpPriority(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Dentist</label>
                  <input
                    type="text"
                    value={opDentist}
                    onChange={(e) => setOpDentist(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Planned Date</label>
                  <input
                    type="date"
                    value={opPlannedDate}
                    onChange={(e) => setOpPlannedDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Notes</label>
                <input
                  type="text"
                  value={opNote}
                  onChange={(e) => setOpNote(e.target.value)}
                  placeholder="Clinical notes or procedure details..."
                  className="w-full border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Status</label>
                <select
                  value={opStatus}
                  onChange={(e) => setOpStatus(e.target.value as any)}
                  className="w-full border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="TBD">TBD</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpModalOpen(false)}
                  className="px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#0284c7] hover:bg-sky-700 text-white font-bold px-4 py-1.5 rounded-lg shadow-xs"
                >
                  Add Operation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Clinical Note Modal */}
      {isAddNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#2563eb] px-5 py-3 flex items-center justify-between text-white">
              <h3 className="text-xs font-bold">New Clinical Note</h3>
              <button onClick={() => setIsAddNoteModalOpen(false)} className="text-white/80 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddNoteSubmit} className="p-5 space-y-3 text-xs text-slate-700">


              <div>
                <label className="block font-medium mb-1">Clinical Note *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detailed diagnosis, treatment performed, findings..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddNoteModalOpen(false)}
                  className="px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold px-4 py-1.5 rounded-lg shadow-xs"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-sm font-bold text-slate-900">Edit Patient Information</h2>
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-5 text-xs">
              <div>
                <h3 className="font-bold text-slate-900 mb-3">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">First Name *</label>
                    <input 
                      type="text" 
                      required 
                      value={editFormData.firstName} 
                      onChange={e => setEditFormData({...editFormData, firstName: e.target.value})} 
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Last Name *</label>
                    <input 
                      type="text" 
                      required 
                      value={editFormData.lastName} 
                      onChange={e => setEditFormData({...editFormData, lastName: e.target.value})} 
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Phone *</label>
                    <input 
                      type="tel" 
                      required 
                      value={editFormData.phone} 
                      onChange={e => setEditFormData({...editFormData, phone: e.target.value})} 
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Email</label>
                    <input 
                      type="email" 
                      value={editFormData.email} 
                      onChange={e => setEditFormData({...editFormData, email: e.target.value})} 
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Date of Birth</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 14 Mar 1985"
                      value={editFormData.dateOfBirth} 
                      onChange={e => setEditFormData({...editFormData, dateOfBirth: e.target.value})} 
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Gender</label>
                    <select 
                      value={editFormData.gender} 
                      onChange={e => setEditFormData({...editFormData, gender: e.target.value})} 
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    >
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-medium text-slate-700 mb-1">Address</label>
                    <input 
                      type="text" 
                      value={editFormData.address} 
                      onChange={e => setEditFormData({...editFormData, address: e.target.value})} 
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h3 className="font-bold text-slate-900 mb-3">Emergency Contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Contact Name</label>
                    <input 
                      type="text" 
                      value={editFormData.emergencyContactName} 
                      onChange={e => setEditFormData({...editFormData, emergencyContactName: e.target.value})} 
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Contact Phone</label>
                    <input 
                      type="tel" 
                      value={editFormData.emergencyContactPhone} 
                      onChange={e => setEditFormData({...editFormData, emergencyContactPhone: e.target.value})} 
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h3 className="font-bold text-slate-900 mb-3">Medical Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Allergies</label>
                    <input 
                      type="text" 
                      value={editFormData.allergies} 
                      onChange={e => setEditFormData({...editFormData, allergies: e.target.value})} 
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Medical Notes</label>
                    <textarea 
                      rows={2}
                      value={editFormData.medicalNotes} 
                      onChange={e => setEditFormData({...editFormData, medicalNotes: e.target.value})} 
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" 
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Dental Notes</label>
                    <textarea 
                      rows={2}
                      value={editFormData.dentalNotes} 
                      onChange={e => setEditFormData({...editFormData, dentalNotes: e.target.value})} 
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" 
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-xs font-semibold bg-[#2563eb] text-white hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
