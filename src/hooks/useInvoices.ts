import { useState, useEffect } from 'react';
import { 
  subscribeInvoices, 
  getInvoiceById, 
  getInvoicesByPatient, 
  createInvoice, 
  updateInvoice, 
  deleteInvoice
} from '../services/invoiceService';
import type { CreateInvoiceData } from '../services/invoiceService';
import { useAuth } from '../contexts/AuthContext';
import type { Invoice } from '../types';

export function useInvoices() {
  const { userData } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const clinicId = userData?.clinicId;

  useEffect(() => {
    if (!clinicId) {
      setInvoices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeInvoices(
      clinicId,
      (data) => {
        setInvoices(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching invoices:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clinicId]);

  const addInvoice = async (data: CreateInvoiceData) => {
    if (!clinicId || !userData?.id) throw new Error('Not authenticated');
    return await createInvoice(clinicId, userData.id, data);
  };

  const editInvoice = async (id: string, data: Partial<Invoice>) => {
    if (!clinicId || !userData?.id) throw new Error('Not authenticated');
    return await updateInvoice(id, clinicId, userData.id, data);
  };

  const removeInvoice = async (id: string) => {
    if (!clinicId || !userData?.id) throw new Error('Not authenticated');
    return await deleteInvoice(id, clinicId, userData.id);
  };

  const getInvoice = async (id: string) => {
    if (!clinicId) return null;
    return await getInvoiceById(id, clinicId);
  };

  const getByPatient = async (patientId: string) => {
    if (!clinicId) return [];
    return await getInvoicesByPatient(clinicId, patientId);
  };

  return {
    invoices,
    loading,
    error,
    addInvoice,
    editInvoice,
    removeInvoice,
    getInvoice,
    getByPatient
  };
}
