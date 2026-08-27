import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ClinicProvider } from './contexts/ClinicContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Layout
import { AppLayout } from './components/layout/AppLayout';

// Pages (placeholders for now)
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Admissions from './pages/Admissions';
import Appointments from './pages/Appointments';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Invoices from './pages/Invoices';
import CreateInvoice from './pages/CreateInvoice';
import Payments from './pages/Payments';
import FinancialReports from './pages/FinancialReports';
import Settings from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <ClinicProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={
                <ProtectedRoute requiredPermission="view_dashboard"><Dashboard /></ProtectedRoute>
              } />
              <Route path="admissions" element={
                <ProtectedRoute requiredPermission="manage_admissions"><Admissions /></ProtectedRoute>
              } />
              <Route path="appointments" element={
                <ProtectedRoute requiredPermission="manage_appointments"><Appointments /></ProtectedRoute>
              } />
              <Route path="patients" element={
                <ProtectedRoute requiredPermission="manage_patients"><Patients /></ProtectedRoute>
              } />
              <Route path="patients/:id" element={
                <ProtectedRoute requiredPermission="manage_patients"><PatientDetail /></ProtectedRoute>
              } />
              <Route path="invoices" element={
                <ProtectedRoute requiredPermission="manage_invoices"><Invoices /></ProtectedRoute>
              } />
              <Route path="invoices/create" element={
                <ProtectedRoute requiredPermission="manage_invoices"><CreateInvoice /></ProtectedRoute>
              } />
              <Route path="payments" element={
                <ProtectedRoute requiredPermission="manage_payments"><Payments /></ProtectedRoute>
              } />
              <Route path="financial-reports" element={
                <ProtectedRoute requiredPermission="view_reports"><FinancialReports /></ProtectedRoute>
              } />
              <Route path="settings" element={
                <ProtectedRoute requiredPermission="manage_settings"><Settings /></ProtectedRoute>
              } />
            </Route>
          </Routes>
        </BrowserRouter>
      </ClinicProvider>
    </AuthProvider>
  );
}

export default App;
