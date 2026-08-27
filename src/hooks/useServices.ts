import { useState, useEffect } from 'react';
import { 
  subscribeServices, 
  getServiceById, 
  createService, 
  updateService, 
  deleteService,
  getActiveServices
} from '../services/serviceService';
import { useAuth } from '../contexts/AuthContext';
import type { ClinicService } from '../types';

export function useServices() {
  const { userData } = useAuth();
  const [services, setServices] = useState<ClinicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const clinicId = userData?.clinicId;

  useEffect(() => {
    if (!clinicId) {
      setServices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeServices(
      clinicId,
      (data) => {
        setServices(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching services:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clinicId]);

  const addService = async (data: Omit<ClinicService, 'id' | 'clinicId' | 'createdAt' | 'updatedAt'>) => {
    if (!clinicId || !userData?.id) throw new Error('Not authenticated');
    return await createService(clinicId, userData.id, data);
  };

  const editService = async (id: string, data: Partial<ClinicService>) => {
    if (!clinicId || !userData?.id) throw new Error('Not authenticated');
    return await updateService(id, clinicId, userData.id, data);
  };

  const removeService = async (id: string) => {
    if (!clinicId || !userData?.id) throw new Error('Not authenticated');
    return await deleteService(id, clinicId, userData.id);
  };

  const getService = async (id: string) => {
    if (!clinicId) return null;
    return await getServiceById(id, clinicId);
  };

  const getActive = async () => {
    if (!clinicId) return [];
    return await getActiveServices(clinicId);
  };

  return {
    services,
    loading,
    error,
    addService,
    editService,
    removeService,
    getService,
    getActive
  };
}
