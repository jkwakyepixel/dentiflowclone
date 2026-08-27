import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';

import type { AppPermission, RoleType } from '../config/permissions';

export interface ClinicProfile {
  name: string;
  logo: string | null;
  phone: string;
  email: string;
  address: string;
  currency: string;
  rolePermissions?: Partial<Record<RoleType, AppPermission[]>>;
}

const DEFAULT_CLINIC_PROFILE: ClinicProfile = {
  name: 'Bright Smile Dental Clinic',
  logo: null,
  phone: '+233 30 274 1122',
  email: 'hello@brightsmiledental.com',
  address: '12 Airport Hills, Accra, Ghana',
  currency: 'GH₵ (Ghana Cedi)'
};

interface ClinicContextType {
  clinicProfile: ClinicProfile;
  updateClinicProfile: (profile: Partial<ClinicProfile>) => Promise<void>;
  loading: boolean;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userData } = useAuth();
  const [clinicProfile, setClinicProfile] = useState<ClinicProfile>(() => {
    const saved = localStorage.getItem('dentiflow_clinic_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_CLINIC_PROFILE;
      }
    }
    return DEFAULT_CLINIC_PROFILE;
  });
  const [loading, setLoading] = useState(false);

  const clinicId = userData?.clinicId || 'demo-clinic';

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const clinicDoc = await getDoc(doc(db, 'clinics', clinicId));
        if (clinicDoc.exists()) {
          const data = clinicDoc.data() as ClinicProfile;
          setClinicProfile(data);
          localStorage.setItem('dentiflow_clinic_profile', JSON.stringify(data));
        }
      } catch (err) {
        console.warn('Could not load clinic profile from Firestore, using local:', err);
      }
    };
    loadProfile();
  }, [clinicId]);

  useEffect(() => {
    if (clinicProfile.name) {
      document.title = `${clinicProfile.name} - Clinic Management`;
    } else {
      document.title = 'Dentiflow - Clinic Management';
    }

    const faviconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (faviconLink) {
      if (clinicProfile.logo) {
        faviconLink.href = clinicProfile.logo;
      } else {
        faviconLink.href = '/favicon.svg'; // Fallback
      }
    }
  }, [clinicProfile.name, clinicProfile.logo]);

  const updateClinicProfile = async (updates: Partial<ClinicProfile>) => {
    const updated = { ...clinicProfile, ...updates };
    setClinicProfile(updated);
    localStorage.setItem('dentiflow_clinic_profile', JSON.stringify(updated));

    try {
      await setDoc(doc(db, 'clinics', clinicId), updated, { merge: true });
      toast.success('Clinic branding & profile updated!');
    } catch (err) {
      console.error('Error saving clinic profile to Firestore:', err);
      toast.success('Saved to local profile!');
    }
  };

  return (
    <ClinicContext.Provider value={{ clinicProfile, updateClinicProfile, loading }}>
      {children}
    </ClinicContext.Provider>
  );
};
