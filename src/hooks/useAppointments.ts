import { useState, useEffect } from 'react';
import { 
  subscribeAppointments, 
  getAppointmentById, 
  getAppointmentsByDate,
  getAppointmentsByPatient,
  createAppointment, 
  updateAppointment, 
  deleteAppointment 
} from '../services/appointmentService';
import { useAuth } from '../contexts/AuthContext';
import type { Appointment } from '../types';

export function useAppointments() {
  const { userData } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const clinicId = userData?.clinicId;

  useEffect(() => {
    if (!clinicId) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeAppointments(
      clinicId,
      (data) => {
        setAppointments(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching appointments:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clinicId]);

  const addAppointment = async (data: Omit<Appointment, 'id' | 'clinicId' | 'createdAt' | 'updatedAt'>) => {
    if (!clinicId || !userData?.id) throw new Error('Not authenticated');
    return await createAppointment(clinicId, userData.id, data);
  };

  const editAppointment = async (id: string, data: Partial<Appointment>) => {
    if (!clinicId || !userData?.id) throw new Error('Not authenticated');
    return await updateAppointment(id, clinicId, userData.id, data);
  };

  const removeAppointment = async (id: string) => {
    if (!clinicId || !userData?.id) throw new Error('Not authenticated');
    return await deleteAppointment(id, clinicId, userData.id);
  };

  const getAppointment = async (id: string) => {
    if (!clinicId) return null;
    return await getAppointmentById(id, clinicId);
  };

  const getByDate = async (date: string) => {
    if (!clinicId) return [];
    return await getAppointmentsByDate(clinicId, date);
  };

  const getByPatient = async (patientId: string) => {
    if (!clinicId) return [];
    return await getAppointmentsByPatient(clinicId, patientId);
  };

  return {
    appointments,
    loading,
    error,
    addAppointment,
    editAppointment,
    removeAppointment,
    getAppointment,
    getByDate,
    getByPatient
  };
}
