import { useState, useEffect } from 'react';
import { subscribePatients, getPatientById, createPatient, updatePatient, deletePatient, searchPatients } from '../services/patientService';
import { useAuth } from '../contexts/AuthContext';
import type { Patient } from '../types';

export function usePatients() {
  const { userData } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const clinicId = userData?.clinicId;

  useEffect(() => {
    if (!clinicId) {
      setPatients([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribePatients(
      clinicId,
      (data) => {
        setPatients(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching patients:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clinicId]);

  const addPatient = async (data: Omit<Patient, 'id' | 'clinicId' | 'patientId' | 'createdAt' | 'updatedAt'>) => {
    if (!clinicId || !userData?.id) throw new Error('Not authenticated');
    return await createPatient(clinicId, userData.id, data);
  };

  const editPatient = async (id: string, data: Partial<Patient>) => {
    if (!clinicId || !userData?.id) throw new Error('Not authenticated');
    return await updatePatient(id, clinicId, userData.id, data);
  };

  const removePatient = async (id: string) => {
    if (!clinicId || !userData?.id) throw new Error('Not authenticated');
    return await deletePatient(id, clinicId, userData.id);
  };

  const getPatient = async (id: string) => {
    if (!clinicId) return null;
    return await getPatientById(id, clinicId);
  };

  const search = async (query: string) => {
    if (!clinicId) return [];
    return await searchPatients(clinicId, query);
  };

  return {
    patients,
    loading,
    error,
    addPatient,
    editPatient,
    removePatient,
    getPatient,
    search
  };
}
