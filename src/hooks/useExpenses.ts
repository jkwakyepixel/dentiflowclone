import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Expense } from '../types';

export const useExpenses = (clinicId: string | undefined) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clinicId) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'expenses'),
      where('clinicId', '==', clinicId),
      where('isDeleted', '==', false)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Expense[];
        
        // Sort by date descending
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setExpenses(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching expenses:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clinicId]);

  return { expenses, loading, error };
};
