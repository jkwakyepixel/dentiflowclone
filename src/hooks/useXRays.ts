import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { PatientXRay } from '../types';

// IMPORTANT: Replace these with your actual Cloudinary details once you create an account
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo'; 
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'unsigned_preset';

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
    if (CLOUDINARY_CLOUD_NAME === 'demo') {
      throw new Error('Please configure your Cloudinary Cloud Name and Upload Preset in the code first!');
    }

    // 1. Upload to Cloudinary using their REST API (No Firebase Storage)
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', `dentiflow/${userData.clinicId}/patients/${patientId}`);

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!uploadRes.ok) {
      const errorData = await uploadRes.json();
      throw new Error(errorData.error?.message || 'Failed to upload image to Cloudinary');
    }

    const cloudinaryData = await uploadRes.json();
    const fileUrl = cloudinaryData.secure_url;

    // 2. Save metadata to Firestore database
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
      // 1. Delete the record from Firestore
      await deleteDoc(doc(db, 'patient_xrays', xrayId));
      
      // Note: We don't delete from Cloudinary client-side for security reasons. 
      // The image record is removed from the app instantly.
    } catch (err) {
      console.error("Error deleting X-Ray record:", err);
      throw err;
    }
  };

  return { xrays, loading, error, uploadXRay, deleteXRay };
}
