export type AppPermission =
  | 'view_dashboard'
  | 'manage_admissions'
  | 'manage_appointments'
  | 'manage_patients'
  | 'manage_invoices'
  | 'manage_payments'
  | 'view_reports'
  | 'manage_settings';

export const PERMISSION_LABELS: Record<AppPermission, string> = {
  view_dashboard: 'View Dashboard',
  manage_admissions: 'Manage Admissions',
  manage_appointments: 'Manage Appointments',
  manage_patients: 'Manage Patients',
  manage_invoices: 'Manage Invoices',
  manage_payments: 'Manage Payments',
  view_reports: 'View Financial Reports',
  manage_settings: 'Manage Clinic Settings',
};

export type RoleType = 'admin' | 'manager' | 'dentist' | 'receptionist' | 'staff';

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleType, AppPermission[]> = {
  admin: [
    'view_dashboard',
    'manage_admissions',
    'manage_appointments',
    'manage_patients',
    'manage_invoices',
    'manage_payments',
    'view_reports',
    'manage_settings',
  ],
  manager: [
    'view_dashboard',
    'manage_admissions',
    'manage_appointments',
    'manage_patients',
    'manage_invoices',
    'manage_payments',
    'view_reports',
    'manage_settings',
  ],
  dentist: [
    'view_dashboard',
    'manage_admissions',
    'manage_appointments',
    'manage_patients',
  ],
  receptionist: [
    'view_dashboard',
    'manage_admissions',
    'manage_appointments',
    'manage_patients',
    'manage_invoices',
    'manage_payments',
  ],
  staff: [
    'view_dashboard',
  ],
};
