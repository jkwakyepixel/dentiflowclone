import { 
  collection, 
  doc, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ClinicalNote } from '../types';

const COLLECTION_NAME = 'clinicalNotes';

export const subscribeClinicalNotes = (clinicId: string, patientId: string, callback: (notes: ClinicalNote[]) => void) => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('clinicId', '==', clinicId),
    where('patientId', '==', patientId)
  );

  return onSnapshot(q, (snapshot) => {
    const notes: ClinicalNote[] = [];
    snapshot.forEach((doc) => {
      notes.push({ id: doc.id, ...doc.data() } as ClinicalNote);
    });
    // Sort client-side by creation date descending
    notes.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
    callback(notes);
  });
};

export const createClinicalNote = async (data: Omit<ClinicalNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateClinicalNote = async (id: string, data: Partial<ClinicalNote>): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteClinicalNote = async (id: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
};
