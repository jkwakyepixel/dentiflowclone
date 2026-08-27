import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  subscribeTreatmentPlans, 
  createTreatmentPlan, 
  updateTreatmentPlan, 
  deleteTreatmentPlan 
} from '../services/treatmentPlanService';
import type { TreatmentPlan } from '../types';

export function useTreatmentPlans(patientId?: string) {
  const { userData } = useAuth();
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const clinicId = userData?.clinicId;
    if (!clinicId || !patientId) {
      setPlans([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeTreatmentPlans(clinicId, patientId, (fetchedPlans) => {
      setPlans(fetchedPlans);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData?.clinicId, patientId]);

  const addPlan = async (data: Omit<TreatmentPlan, 'id' | 'clinicId' | 'createdAt' | 'updatedAt'>) => {
    if (!userData?.clinicId) throw new Error('No clinic context');
    return createTreatmentPlan({ ...data, clinicId: userData.clinicId });
  };

  const editPlan = async (id: string, data: Partial<TreatmentPlan>) => {
    return updateTreatmentPlan(id, data);
  };

  const removePlan = async (id: string) => {
    return deleteTreatmentPlan(id);
  };

  return { plans, loading, error, addPlan, editPlan, removePlan };
}
