import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { TreatmentPlan } from '../types';

const COLLECTION_NAME = 'treatmentPlans';

export const subscribeTreatmentPlans = (clinicId: string, patientId: string, callback: (plans: TreatmentPlan[]) => void) => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('clinicId', '==', clinicId),
    where('patientId', '==', patientId)
  );

  return onSnapshot(q, (snapshot) => {
    const plans: TreatmentPlan[] = [];
    snapshot.forEach((doc) => {
      plans.push({ id: doc.id, ...doc.data() } as TreatmentPlan);
    });
    // Sort client-side by creation date descending
    plans.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
    callback(plans);
  });
};

export const createTreatmentPlan = async (data: Omit<TreatmentPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateTreatmentPlan = async (id: string, data: Partial<TreatmentPlan>): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteTreatmentPlan = async (id: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
};
