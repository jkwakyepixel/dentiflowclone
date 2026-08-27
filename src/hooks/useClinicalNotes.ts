import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  subscribeClinicalNotes, 
  createClinicalNote, 
  updateClinicalNote, 
  deleteClinicalNote 
} from '../services/clinicalNoteService';
import type { ClinicalNote } from '../types';

export function useClinicalNotes(patientId?: string) {
  const { userData } = useAuth();
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const clinicId = userData?.clinicId;
    if (!clinicId || !patientId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeClinicalNotes(clinicId, patientId, (fetchedNotes) => {
      setNotes(fetchedNotes);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData?.clinicId, patientId]);

  const addNote = async (data: Omit<ClinicalNote, 'id' | 'clinicId' | 'createdAt' | 'updatedAt'>) => {
    if (!userData?.clinicId) throw new Error('No clinic context');
    return createClinicalNote({ ...data, clinicId: userData.clinicId });
  };

  const editNote = async (id: string, data: Partial<ClinicalNote>) => {
    return updateClinicalNote(id, data);
  };

  const removeNote = async (id: string) => {
    return deleteClinicalNote(id);
  };

  return { notes, loading, error, addNote, editNote, removeNote };
}
