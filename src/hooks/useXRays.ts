import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { PatientXRay } from '../types';

export function useXRays(patientId?: string) {
  const { userData } = useAuth();
  const [xrays, setXRays] = useState<PatientXRay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userData?.clinicId || !patientId) {
      setXRays([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'patient_xrays'),
      where('clinicId', '==', userData.clinicId),
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const results = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PatientXRay[];
        setXRays(results);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching X-Rays:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userData?.clinicId, patientId]);

  const uploadXRay = async (file: File, title: string, description: string = '') => {
    if (!userData?.clinicId || !patientId) throw new Error('Missing clinic or patient info');

    // 1. Upload to Storage
    const storageRef = ref(storage, `clinics/${userData.clinicId}/patients/${patientId}/xrays/${Date.now()}_${file.name}`);
    const uploadTask = await uploadBytesResumable(storageRef, file);
    const fileUrl = await getDownloadURL(uploadTask.ref);

    // 2. Save metadata to Firestore
    const xrayData: Omit<PatientXRay, 'id'> = {
      clinicId: userData.clinicId,
      patientId,
      title,
      description,
      fileUrl,
      uploadedBy: userData.name || 'Admin',
      dateUploaded: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'patient_xrays'), xrayData);
    return docRef.id;
  };

  const deleteXRay = async (xrayId: string, fileUrl: string) => {
    try {
      // 1. Delete from Firestore
      await deleteDoc(doc(db, 'patient_xrays', xrayId));
      
      // 2. Delete from Storage
      const fileRef = ref(storage, fileUrl);
      await deleteObject(fileRef);
    } catch (err) {
      console.error("Error deleting X-Ray:", err);
      throw err;
    }
  };

  return { xrays, loading, error, uploadXRay, deleteXRay };
}
