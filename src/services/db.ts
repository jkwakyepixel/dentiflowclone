import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Helper to get collection reference
const getCol = (colName: string) => collection(db, colName);

// Generic function to fetch all documents for a clinic with resilient in-memory sorting (no composite index required!)
export const fetchForClinic = async <T>(colName: string, clinicId: string, orderByField?: string): Promise<T[]> => {
  try {
    const q = query(getCol(colName), where('clinicId', '==', clinicId));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as (T & Record<string, any>)));
    
    if (orderByField) {
      data.sort((a, b) => {
        const valA = a[orderByField];
        const valB = b[orderByField];
        if (!valA && !valB) return 0;
        if (!valA) return 1;
        if (!valB) return -1;

        // Handle Firestore Timestamp objects or date strings/numbers
        const compA = typeof valA?.toMillis === 'function' ? valA.toMillis() : valA;
        const compB = typeof valB?.toMillis === 'function' ? valB.toMillis() : valB;

        if (compA < compB) return 1;
        if (compA > compB) return -1;
        return 0;
      });
    }

    return data as T[];
  } catch (error) {
    console.error(`Error fetching collection ${colName}:`, error);
    throw error;
  }
};

export const fetchById = async <T>(colName: string, id: string): Promise<T | null> => {
  const docRef = doc(db, colName, id);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as T;
  }
  return null;
};

export const createDoc = async (colName: string, data: any) => {
  const payload = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  return await addDoc(getCol(colName), payload);
};

export const updateDocument = async (colName: string, id: string, data: any) => {
  const payload = {
    ...data,
    updatedAt: serverTimestamp()
  };
  const docRef = doc(db, colName, id);
  await updateDoc(docRef, payload);
};

export const logAudit = async (clinicId: string, userId: string, action: string, entityType: string, entityId: string, details: string) => {
  try {
    await addDoc(getCol('auditLogs'), {
      clinicId,
      userId,
      action,
      entityType,
      entityId,
      details,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.warn("Could not log audit event:", err);
  }
};
