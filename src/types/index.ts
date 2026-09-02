// ─────────────────────────────────────────────────
// Dentiflow — Core TypeScript interfaces
// ─────────────────────────────────────────────────

// ── Users ──

export interface User {
  id: string;
  clinicId: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff' | 'dentist' | 'receptionist';
  createdAt?: any;
}

// ── Clinic ──

export interface Clinic {
  id?: string;
  name: string;
  logo?: string | null;
  phone?: string;
  email?: string;
  address?: string;
  currency?: string;
  taxEnabled?: boolean;
  taxRate?: number;
  invoicePrefix?: string;
  quotationPrefix?: string;
  patientCounter?: number;
  invoiceCounter?: number;
  quotationCounter?: number;
  createdAt?: any;
  updatedAt?: any;
}

// ── Patients ──

export interface Patient {
  id?: string;
  clinicId: string;
  patientId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  salutation?: string;
  recommendedBy?: string;
  phone: string;
  email?: string;
  dateOfBirth: string;
  gender: string;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  allergies?: string;
  medicalNotes?: string;
  dentalNotes?: string;
  balance?: number;
  lastAppointment?: string;
  nextAppointment?: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  isDeleted?: boolean;
  deletedAt?: any;
  deletedBy?: string;
}

// ── Appointments ──

export interface Appointment {
  id?: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  date: string;
  startTime: string;
  endTime: string;
  appointmentType: string;
  dentist: string;
  room?: string;
  duration?: number;
  notes: string;
  status: 'Scheduled' | 'Arrived' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No Show';
  sessionStartTimestamp?: number;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  isDeleted?: boolean;
  deletedAt?: any;
  deletedBy?: string;
}

// ── Invoice Items ──

export interface InvoiceItem {
  id: string;
  serviceId?: string;
  serviceName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// ── Invoices ──

export interface Invoice {
  id?: string;
  clinicId: string;
  type?: 'Invoice' | 'Quotation';
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  invoiceDate?: string;
  dueDate: string;
  items?: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: 'Draft' | 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled' | 'Issued' | 'Accepted' | 'Rejected';
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  isDeleted?: boolean;
  deletedAt?: any;
  deletedBy?: string;
  // Backward-compat aliases used in some existing page mock data
  date?: string;
  services?: any[];
}

// ── Payments ──

export interface Payment {
  id?: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  paymentMethod: 'Cash' | 'Mobile Money' | 'Card' | 'Bank Transfer' | 'Other' | string;
  reference: string;
  paymentDate: string;
  notes?: string;
  recordedBy: string; // User ID or Name
  createdAt?: any;
  isDeleted?: boolean;
  deletedAt?: any;
  deletedBy?: string;
}

// ── Audit Logs ──

export type AuditEntityType =
  | 'patient'
  | 'appointment'
  | 'invoice'
  | 'payment'
  | 'service'
  | 'user'
  | 'clinic';

export interface AuditLog {
  id?: string;
  clinicId: string;
  userId: string;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  timestamp: any;
  details: string;
}

// ── Clinic Services (catalog) ──

export interface ClinicService {
  id?: string;
  clinicId: string;
  name: string;
  category?: string;
  price: number;
  description?: string;
  active?: boolean;
  createdAt?: any;
  updatedAt?: any;
  isDeleted?: boolean;
}

// ── Admissions ──

export interface Admission {
  id?: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  dentist: string;
  room: string;
  scheduledTime: string;
  arrivalTime?: string;
  status: 'Scheduled' | 'Waiting' | 'In Session' | 'Late' | 'No Show' | 'Canceled' | 'Ended';
  sessionStartTimestamp?: number;
  notes?: string;
  createdAt?: any;
}

// ── Treatment Plans ──

export interface TreatmentOperation {
  id: string;
  code: string;
  description: string;
  tooth: string;
  priority: number;
  dentist: string;
  creationDate: string;
  plannedDate: string;
  note: string;
  status: 'TBD' | 'In Progress' | 'Done';
}

export interface TreatmentPlan {
  id?: string;
  clinicId: string;
  patientId: string;
  name: string;
  isActive: boolean;
  teethType: 'primary' | 'permanent' | 'mixed';
  operations: TreatmentOperation[];
  createdBy: string;
  createdAt?: any;
  updatedAt?: any;
}

// ── Clinical Notes ──

export interface ClinicalNote {
  id?: string;
  clinicId: string;
  patientId: string;
  title: string;
  content: string;
  category: 'Procedure Note' | 'Diagnosis' | 'Follow-up' | 'General';
  dentist: string;
  date: string;
  createdAt?: any;
  updatedAt?: any;
}
