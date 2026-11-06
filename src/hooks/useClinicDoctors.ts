import { useMemo, useCallback } from 'react';
import { useClinic } from '../contexts/ClinicContext';
import { useUsers } from './useUsers';
import {
  formatDoctorName,
  cleanDoctorEntry,
  getSanitizedDoctorList,
  DEFAULT_CLINIC_DOCTORS
} from '../utils/doctorUtils';

export function useClinicDoctors() {
  const { clinicProfile, updateClinicProfile } = useClinic();
  const { users } = useUsers();

  const doctors = useMemo(() => {
    const profileDocs = clinicProfile?.doctors || [];
    const teamDocs = users
      .filter(u => u.role === 'dentist' || u.role === 'admin')
      .map(u => u.name);
    return getSanitizedDoctorList(profileDocs, teamDocs);
  }, [clinicProfile?.doctors, users]);

  const addDoctor = useCallback(async (newDoctorName: string): Promise<string | null> => {
    const formatted = cleanDoctorEntry(newDoctorName);
    if (!formatted) return null;

    const currentDocs = clinicProfile?.doctors || [];
    const sanitizedCurrent = currentDocs
      .map(d => cleanDoctorEntry(d))
      .filter((d): d is string => Boolean(d));

    // Avoid duplicates
    if (!sanitizedCurrent.some(d => d.toLowerCase() === formatted.toLowerCase())) {
      const updated = [...sanitizedCurrent, formatted];
      await updateClinicProfile({ doctors: updated });
    }

    return formatted;
  }, [clinicProfile?.doctors, updateClinicProfile]);

  return {
    doctors,
    addDoctor,
    formatDoctorName,
    cleanDoctorEntry,
    defaultDoctors: DEFAULT_CLINIC_DOCTORS
  };
}
