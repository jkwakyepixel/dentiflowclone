import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePatients } from '../hooks/usePatients';
import type { Patient } from '../types';
import { 
  Plus, 
  Search, 
  Eye, 
  FileText, 
  Calendar as CalendarIcon, 
  X,
  Trash2,
  User,
  Phone,
  Mail,
  MapPin,
  ClipboardList
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Patients() {
  const { patients, loading, addPatient, removePatient } = usePatients();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('All genders');

  // New Patient Form State
  const [salutation, setSalutation] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [recommendedBy, setRecommendedBy] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Male');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRel, setEmergencyRel] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await addPatient({
        salutation,
        firstName,
        lastName,
        middleName,
        recommendedBy,
        phone,
        email,
        dateOfBirth,
        gender,
        address,
        emergencyContact: {
          name: emergencyName,
          phone: emergencyPhone,
          relationship: emergencyRel
        },
        allergies,
        medicalNotes,
        dentalNotes: '',
        isDeleted: false
      });
      
      toast.success('Patient created successfully');
      setIsModalOpen(false);
      
      // Reset form
      setSalutation('');
      setFirstName(''); 
      setLastName(''); 
      setMiddleName('');
      setRecommendedBy('');
      setPhone(''); 
      setEmail(''); 
      setDateOfBirth('');
      setAddress('');
      setEmergencyName('');
      setEmergencyPhone('');
      setEmergencyRel('');
      setAllergies('');
      setMedicalNotes('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create patient');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      try {
        await removePatient(id);
        toast.success('Patient deleted successfully');
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete patient');
      }
    }
  };

  const filteredPatients = patients.filter(p => {
    const query = searchTerm.toLowerCase();
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    const matchesSearch = !searchTerm || 
      fullName.includes(query) || 
      p.phone?.toLowerCase().includes(query) || 
      p.patientId?.toLowerCase().includes(query) ||
      p.email?.toLowerCase().includes(query);

    const matchesGender = genderFilter === 'All genders' || p.gender === genderFilter;

    return matchesSearch && matchesGender && !p.isDeleted;
  });

  const getAvatarColor = (index: number) => {
    const colors = [
      'bg-[#1e293b]',
      'bg-[#0d9488]',
      'bg-[#334155]',
      'bg-[#059669]',
      'bg-[#10b981]',
      'bg-[#0f766e]',
      'bg-[#047857]',
      'bg-[#065f46]'
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patients</h1>
          <p className="text-xs text-slate-400 mt-1">{filteredPatients.length} registered patients</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Patient</span>
        </button>
      </div>

      {/* Search & Gender Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by name, phone or ID..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
          />
        </div>

        {/* Gender Filter */}
        <select
          value={genderFilter}
          onChange={e => setGenderFilter(e.target.value)}
          className="bg-white border border-slate-200/90 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs cursor-pointer"
        >
          <option value="All genders">All genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Patients Table Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="overflow-x-auto">
          {filteredPatients.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No patients match your search or filter criteria.
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 font-medium border-b border-slate-100">
                  <th className="pb-3 font-medium">Patient</th>
                  <th className="pb-3 font-medium">Phone</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">DOB</th>
                  <th className="pb-3 font-medium">Gender</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPatients.map((patient, index: number) => {
                  const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase() || 'P';
                  const avatarBg = getAvatarColor(index);

                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Patient Name & Code */}
                      <td className="py-3.5 pr-4">
                        <Link to={`/patients/${patient.id}`} className="flex items-center gap-3 group">
                          <div className={`w-8 h-8 rounded-full ${avatarBg} text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 shadow-2xs`}>
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">{patient.firstName} {patient.lastName}</p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{patient.patientId}</p>
                          </div>
                        </Link>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 text-slate-600 font-normal whitespace-nowrap">{patient.phone || '—'}</td>

                      {/* Email */}
                      <td className="py-3.5 text-slate-600 font-normal">{patient.email || '—'}</td>

                      {/* DOB */}
                      <td className="py-3.5 text-slate-600 font-normal whitespace-nowrap">{patient.dateOfBirth || '—'}</td>

                      {/* Gender */}
                      <td className="py-3.5 text-slate-600 font-normal">{patient.gender || '—'}</td>

                      {/* Actions */}
                      <td className="py-3.5 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Link 
                            to={`/patients/${patient.id}`}
                            title="View Details"
                            className="text-slate-400 hover:text-blue-600 p-1 rounded-md hover:bg-blue-50 transition-colors"
                          >
                            <Eye size={15} />
                          </Link>
                          <button 
                            title="Create Invoice"
                            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
                          >
                            <FileText size={15} />
                          </button>
                          <button 
                            title="Schedule Appointment"
                            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
                          >
                            <CalendarIcon size={15} />
                          </button>
                          <button 
                            onClick={() => handleDelete(patient.id as string, `${patient.firstName} ${patient.lastName}`)}
                            title="Delete Patient"
                            className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors ml-1"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* View Patient Details Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#2563eb] text-white flex items-center justify-center font-bold text-xs">
                  {selectedPatient.firstName?.[0]}{selectedPatient.lastName?.[0]}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{selectedPatient.firstName} {selectedPatient.lastName}</h2>
                  <p className="text-xs text-slate-400 font-mono">{selectedPatient.patientId}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPatient(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-slate-400">Phone</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedPatient.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Email</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedPatient.email || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Date of Birth</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedPatient.dateOfBirth || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Gender</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedPatient.gender || '—'}</p>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-1">Address</p>
                <p className="text-slate-600">{selectedPatient.address || 'No address recorded'}</p>
              </div>

              {selectedPatient.emergencyContact && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="font-bold text-slate-900 mb-1">Emergency Contact</p>
                  <p className="text-slate-700">
                    <span className="font-semibold">{selectedPatient.emergencyContact.name}</span> {selectedPatient.emergencyContact.relationship ? `(${selectedPatient.emergencyContact.relationship})` : ''} {selectedPatient.emergencyContact.phone ? `— ${selectedPatient.emergencyContact.phone}` : ''}
                  </p>
                </div>
              )}

              {selectedPatient.allergies && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="font-bold text-slate-900 mb-1">Allergies</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600">
                    {selectedPatient.allergies}
                  </span>
                </div>
              )}

              {selectedPatient.dentalNotes && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="font-bold text-slate-900 mb-1">Dental Notes</p>
                  <p className="text-slate-600">{selectedPatient.dentalNotes}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Patient Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-[#f4f6f8] rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-[#1a73e8] flex items-center justify-between sticky top-0 z-10 rounded-t-xl">
              <h2 className="text-base font-medium text-white tracking-wide">Add Patient</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8 text-sm">
              {/* Row 1: Salutation, First Name, Last Name */}
              <div className="flex gap-4 items-start">
                <div className="mt-3 text-blue-600"><User size={20} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 flex-1">
                  <div className="relative">
                    <input type="text" value={salutation} onChange={e => setSalutation(e.target.value)} placeholder="Salutation" className="w-full bg-transparent border-b border-slate-300 rounded-none px-0 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-400" />
                  </div>
                  <div className="relative">
                    <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First Name *" className="w-full bg-transparent border-b border-slate-300 rounded-none px-0 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-400" />
                  </div>
                  <div className="relative">
                    <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last Name *" className="w-full bg-transparent border-b border-slate-300 rounded-none px-0 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-400" />
                  </div>
                </div>
              </div>

              {/* Row 2: Gender, Middle Name, Recommended By */}
              <div className="flex gap-4 items-start">
                <div className="mt-3 text-slate-500"><FileText size={20} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 flex-1">
                  <div className="relative">
                    <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-transparent border-b border-slate-300 rounded-none px-0 py-2 focus:outline-none focus:border-blue-500 text-slate-700 appearance-none cursor-pointer">
                      <option value="" disabled hidden>Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="relative">
                    <input type="text" value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Middle Name" className="w-full bg-transparent border-b border-slate-300 rounded-none px-0 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-400" />
                  </div>
                  <div className="relative">
                    <input type="text" value={recommendedBy} onChange={e => setRecommendedBy(e.target.value)} placeholder="Recommended By" className="w-full bg-transparent border-b border-slate-300 rounded-none px-0 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-400" />
                  </div>
                </div>
              </div>

              {/* Row 3: Phone, DOB */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex gap-4 items-start">
                  <div className="mt-3 text-slate-500"><Phone size={20} /></div>
                  <div className="flex-1 relative">
                    <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone Number *" className="w-full bg-transparent border-b border-slate-300 rounded-none px-0 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-400" />
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="mt-3 text-slate-500"><CalendarIcon size={20} /></div>
                  <div className="flex-1 relative">
                    <input type="text" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} placeholder="Date of Birth" className="w-full bg-transparent border-b border-slate-300 rounded-none px-0 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-400" />
                  </div>
                </div>
              </div>

              {/* Row 4: Email */}
              <div className="flex gap-4 items-start">
                <div className="mt-3 text-slate-500"><Mail size={20} /></div>
                <div className="flex-1 relative">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full bg-transparent border-b border-slate-300 rounded-none px-0 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-400" />
                </div>
              </div>

              {/* Row 5: Address */}
              <div className="flex gap-4 items-start">
                <div className="mt-3 text-slate-500"><MapPin size={20} /></div>
                <div className="flex-1 relative">
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" className="w-full bg-transparent border-b border-slate-300 rounded-none px-0 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-400" />
                </div>
              </div>

              {/* Row 6: Clinic Note */}
              <div className="flex gap-4 items-start">
                <div className="mt-3 text-slate-500"><ClipboardList size={20} /></div>
                <div className="flex-1 relative">
                  <input type="text" value={medicalNotes} onChange={e => setMedicalNotes(e.target.value)} placeholder="Clinic Note" className="w-full bg-transparent border-b border-slate-300 rounded-none px-0 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-400" />
                </div>
              </div>
              
              {/* Other Fields (Hidden in screenshot but necessary) */}
              <div className="pt-8 mt-4 border-t border-slate-200/60">
                <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-4">Additional Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="relative">
                    <input type="text" value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="Allergies (e.g. Penicillin, Latex)" className="w-full bg-transparent border-b border-slate-300 rounded-none px-0 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-400" />
                  </div>
                  <div className="relative">
                    <input type="text" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} placeholder="Emergency Contact Name" className="w-full bg-transparent border-b border-slate-300 rounded-none px-0 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-400" />
                  </div>
                  <div className="relative">
                    <input type="text" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder="Emergency Contact Phone" className="w-full bg-transparent border-b border-slate-300 rounded-none px-0 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-400" />
                  </div>
                  <div className="relative">
                    <input type="text" value={emergencyRel} onChange={e => setEmergencyRel(e.target.value)} placeholder="Emergency Contact Relationship" className="w-full bg-transparent border-b border-slate-300 rounded-none px-0 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-400" />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 flex items-center justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#0ea5e9] hover:bg-[#0284c7] rounded-md transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 tracking-wide"
                >
                  {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  CREATE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
