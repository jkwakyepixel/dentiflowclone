import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Admission } from '../types';
import { createDoc, updateDocument } from '../services/db';

export function useAdmissions() {
  const { userData } = useAuth();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const clinicId = userData?.clinicId;
    if (!clinicId) {
      setAdmissions([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'admissions'),
      where('clinicId', '==', clinicId)
      // Note: We avoid ordering by createdAt initially to reduce complex index requirements
      // We will sort on the client side
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adms: Admission[] = [];
      snapshot.forEach((doc) => {
        adms.push({ id: doc.id, ...doc.data() } as Admission);
      });
      // Sort by creation time on client side
      adms.sort((a, b) => {
        const timeA = a.createdAt || 0;
        const timeB = b.createdAt || 0;
        return timeB - timeA;
      });
      setAdmissions(adms);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching admissions:', err);
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData?.clinicId]);

  const addAdmission = async (admData: Omit<Admission, 'id' | 'clinicId' | 'createdAt' | 'updatedAt'>) => {
    if (!userData?.clinicId) throw new Error('No clinic selected');
    return createDoc('admissions', {
      ...admData,
      clinicId: userData.clinicId
    });
  };

  const editAdmission = async (id: string, admData: Partial<Admission>) => {
    return updateDocument('admissions', id, admData);
  };

  const removeAdmission = async (id: string) => {
    return deleteDoc(doc(db, 'admissions', id));
  };

  return { admissions, loading, error, addAdmission, editAdmission, removeAdmission };
}
