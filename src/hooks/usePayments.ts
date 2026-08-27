import { useState, useEffect } from 'react';
import { 
  subscribePayments, 
  getPaymentById, 
  getPaymentsByPatient,
  getPaymentsByInvoice,
  recordPayment, 
  deletePayment 
} from '../services/paymentService';
import { useAuth } from '../contexts/AuthContext';
import type { Payment } from '../types';

export function usePayments() {
  const { userData } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const clinicId = userData?.clinicId;

  useEffect(() => {
    if (!clinicId) {
      setPayments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribePayments(
      clinicId,
      (data) => {
        setPayments(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching payments:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clinicId]);

  const addPayment = async (data: Omit<Payment, 'id' | 'createdAt' | 'clinicId'>) => {
    if (!clinicId || !userData?.id) throw new Error('Not authenticated');
    return await recordPayment(clinicId, userData.id, data);
  };

  const removePayment = async (id: string) => {
    if (!clinicId || !userData?.id) throw new Error('Not authenticated');
    return await deletePayment(id, clinicId, userData.id);
  };

  const getPayment = async (id: string) => {
    if (!clinicId) return null;
    return await getPaymentById(id, clinicId);
  };

  const getByPatient = async (patientId: string) => {
    if (!clinicId) return [];
    return await getPaymentsByPatient(clinicId, patientId);
  };

  const getByInvoice = async (invoiceId: string) => {
    if (!clinicId) return [];
    return await getPaymentsByInvoice(clinicId, invoiceId);
  };

  return {
    payments,
    loading,
    error,
    addPayment,
    removePayment,
    getPayment,
    getByPatient,
    getByInvoice
  };
}
