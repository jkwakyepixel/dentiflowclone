/**
 * Utility functions for handling doctor/dentist names cleanly across Dentiflow.
 */

export const DEFAULT_CLINIC_DOCTORS = [
  'Dr. Sarah Smith',
  'Dr. Michael Chang'
];

/**
 * Strips 'Dr.' prefix and cleans up whitespace.
 */
export function getCleanDoctorName(name?: string | null): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/^Dr\.?\s*/i, '')
    .trim();
}

/**
 * Validates and formats a doctor name into a standard "Dr. [Full Name]" string.
 * Returns null if the entry is invalid (e.g., empty, just "Dr.", "Dr. ", or single character).
 */
export function cleanDoctorEntry(name?: string | null): string | null {
  const clean = getCleanDoctorName(name);
  if (!clean || clean.length < 2 || clean.toLowerCase() === 'unassigned') {
    return null;
  }
  return `Dr. ${clean}`;
}

/**
 * Formats any raw doctor string for display.
 * If raw is null, empty, or just "Dr." / "Dr. ", returns fallback (default: 'Unassigned').
 */
export function formatDoctorName(name?: string | null, fallback: string = 'Unassigned'): string {
  const valid = cleanDoctorEntry(name);
  return valid || fallback;
}

/**
 * Combines and deduplicates doctor lists from clinicProfile.doctors and team members (users).
 * Always filters out invalid entries like "Dr." or blank lines.
 */
export function getSanitizedDoctorList(
  profileDoctors?: (string | null | undefined)[],
  teamDentists?: (string | null | undefined)[]
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const addDoctor = (raw?: string | null) => {
    const formatted = cleanDoctorEntry(raw);
    if (!formatted) return;
    const key = formatted.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(formatted);
    }
  };

  // Add from team members first (dentists / admins)
  (teamDentists || []).forEach(addDoctor);

  // Add from clinic profile doctors
  (profileDoctors || []).forEach(addDoctor);

  // If no valid doctors exist, return defaults
  if (result.length === 0) {
    return [...DEFAULT_CLINIC_DOCTORS];
  }

  return result;
}
