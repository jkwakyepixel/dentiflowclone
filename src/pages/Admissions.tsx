import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppointments } from '../hooks/useAppointments';
import { useAdmissions } from '../hooks/useAdmissions';
import type { Admission } from '../types';
import { 
  Search, 
  Plus, 
  X, 
  FileText, 
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// Initial sample queue matching the reference screenshot exactly for 2026-08-26
const DEFAULT_SAMPLE_ADMISSIONS: (Admission & { elapsedMin?: number; date?: string })[] = [
  {
    id: 'adm-1',
    clinicId: 'demo-clinic',
    patientId: 'p-1',
    patientName: 'Samuel Tetteh',
    dentist: 'Dr. SmileDesk',
    room: 'Surgery Room 1',
    scheduledTime: '1:00 PM\n1:30 PM',
    arrivalTime: '',
    status: 'Late',
    notes: '2 hours late',
    date: '2026-08-26',
    createdAt: null
  },
  {
    id: 'adm-2',
    clinicId: 'demo-clinic',
    patientId: 'p-2',
    patientName: 'Comfort Anku',
    dentist: 'Dr. SmileDesk',
    room: 'Surgery Room 1',
    scheduledTime: '1:30 PM\n2:00 PM',
    arrivalTime: '01:21 pm',
    status: 'Ended',
    notes: 'Arrived: 01:21 pm',
    date: '2026-08-26',
    createdAt: null
  },
  {
    id: 'adm-3',
    clinicId: 'demo-clinic',
    patientId: 'p-3',
    patientName: 'Mr Dennis Kyei',
    dentist: 'Dr. SmileDesk',
    room: 'Surgery Room 1',
    scheduledTime: '2:00 PM\n2:30 PM',
    arrivalTime: '',
    status: 'Late',
    notes: '44 minutes late',
    date: '2026-08-26',
    createdAt: null
  },
  {
    id: 'adm-4',
    clinicId: 'demo-clinic',
    patientId: 'p-4',
    patientName: 'Mr Shalom A',
    dentist: 'Dr. SmileDesk',
    room: 'Surgery Room 1',
    scheduledTime: '2:00 PM\n3:00 PM',
    arrivalTime: '02:08 pm',
    status: 'In Session',
    elapsedMin: 21,
    notes: 'Arrived: 02:08 pm',
    date: '2026-08-26',
    createdAt: null
  }
];

export default function Admissions() {
  const { userData } = useAuth();
  const { admissions: dbAdmissions, addAdmission, editAdmission } = useAdmissions();
  const { appointments: dbAppts } = useAppointments();
  
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Admit Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [patientNameInput, setPatientNameInput] = useState('');
  const [dentistInput, setDentistInput] = useState('Dr. SmileDesk');
  const [roomInput, setRoomInput] = useState('Surgery Room 1');
  const [startTimeInput, setStartTimeInput] = useState('2:30 PM');
  const [endTimeInput, setEndTimeInput] = useState('3:00 PM');
  const [statusInput, setStatusInput] = useState<'Waiting' | 'In Session' | 'Late'>('Waiting');
  const [saving, setSaving] = useState(false);

  const clinicId = userData?.clinicId || 'demo-clinic';
  const todayDateStr = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    // Filter admissions for today
    const todayAdmissions = dbAdmissions.filter((a: any) => !a.date || a.date === todayDateStr);

    if (todayAdmissions.length === 0 && dbAppts.length > 0) {
      // populate into admissions from appointments for today if no actual admissions exist yet
      const todayAppts = dbAppts.filter(a => a.date === todayDateStr);
      if (todayAppts.length > 0) {
        const mappedAppts = todayAppts.map((a, idx) => ({
          id: a.id || `app-adm-${idx}`,
          clinicId,
          patientId: a.patientId,
          patientName: a.patientName,
          dentist: a.dentist.startsWith('Dr.') ? a.dentist : `Dr. ${a.dentist}`,
          room: (a as any).room || 'Surgery Room 1',
          scheduledTime: `${a.startTime}\n${a.endTime}`,
          arrivalTime: a.status === 'Confirmed' ? a.startTime : '',
          status: a.status === 'Confirmed' ? 'In Session' : a.status === 'Completed' ? 'Ended' : 'Waiting',
          notes: a.status === 'Confirmed' ? `Arrived: ${a.startTime}` : a.notes || 'Scheduled',
          date: todayDateStr
        }));
        setAdmissions(mappedAppts);
      } else {
        setAdmissions(todayAdmissions);
      }
    } else {
      setAdmissions(todayAdmissions);
    }
  }, [dbAdmissions, dbAppts, clinicId, todayDateStr]);

  // Status Metrics Calculation
  const inSessionCount = admissions.filter(a => a.status === 'In Session').length;
  const waitingCount = admissions.filter(a => a.status === 'Waiting').length;
  const lateCount = admissions.filter(a => a.status === 'Late').length;
  const noShowCount = admissions.filter(a => a.status === 'No Show').length;
  const canceledCount = admissions.filter(a => a.status === 'Canceled').length;
  const endedCount = admissions.filter(a => a.status === 'Ended').length;
  const totalCount = admissions.length;

  const handleCallIn = async (item: any) => {
    try {
      const updated = admissions.map(a => {
        if (a.id === item.id) {
          return {
            ...a,
            status: 'In Session',
            elapsedMin: 1,
            notes: a.arrivalTime ? `Arrived: ${a.arrivalTime}` : 'Arrived: Just now'
          };
        }
        return a;
      });
      setAdmissions(updated);
      toast.success(`${item.patientName} admitted to ${item.room || 'Surgery Room 1'}`);

      if (item.id && !item.id.startsWith('adm-') && !item.id.startsWith('app-')) {
        await editAdmission(item.id, {
          status: 'In Session',
          sessionStartTimestamp: Date.now()
        });
      }
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const handleEndSession = async (item: any) => {
    try {
      const updated = admissions.map(a => {
        if (a.id === item.id) {
          return {
            ...a,
            status: 'Ended'
          };
        }
        return a;
      });
      setAdmissions(updated);
      toast.success(`Session for ${item.patientName} ended`);

      if (item.id && !item.id.startsWith('adm-') && !item.id.startsWith('app-')) {
        await editAdmission(item.id, {
          status: 'Ended'
        });
      }
    } catch (e) {
      toast.error('Failed to end session');
    }
  };

  const handleCancel = async (item: any) => {
    try {
      const updated = admissions.map(a => {
        if (a.id === item.id) {
          return { ...a, status: 'Canceled', notes: 'Canceled' };
        }
        return a;
      });
      setAdmissions(updated);
      toast.success(`${item.patientName}'s admission canceled`);

      if (item.id && !item.id.startsWith('adm-') && !item.id.startsWith('app-')) {
        await editAdmission(item.id, { status: 'Canceled' });
      }
    } catch (e) {
      toast.error('Failed to cancel admission');
    }
  };

  const handleNoShow = async (item: any) => {
    try {
      const updated = admissions.map(a => {
        if (a.id === item.id) {
          return { ...a, status: 'No Show', notes: 'No Show' };
        }
        return a;
      });
      setAdmissions(updated);
      toast.success(`Marked ${item.patientName} as No Show`);

      if (item.id && !item.id.startsWith('adm-') && !item.id.startsWith('app-')) {
        await editAdmission(item.id, { status: 'No Show' });
      }
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const handleAddAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientNameInput.trim()) return;

    setSaving(true);
    try {
      const newAdm: any = {
        clinicId,
        patientId: 'p-quick',
        patientName: patientNameInput.trim(),
        dentist: dentistInput,
        room: roomInput,
        scheduledTime: `${startTimeInput}\n${endTimeInput}`,
        arrivalTime: statusInput === 'Waiting' || statusInput === 'In Session' ? format(new Date(), 'hh:mm a') : '',
        status: statusInput,
        notes: statusInput === 'Late' ? 'Arrived late' : statusInput === 'In Session' ? `Arrived: ${format(new Date(), 'hh:mm a')}` : 'Waiting in lobby',
        date: todayDateStr
      };

      const docRef = await addAdmission(newAdm);
      toast.success(`${newAdm.patientName} added to waiting room`);
      setIsAddModalOpen(false);
      setPatientNameInput('');
    } catch (err) {
      toast.error('Failed to add admission');
    } finally {
      setSaving(false);
    }
  };

  const filteredAdmissions = admissions.filter(a => {
    const q = searchQuery.toLowerCase();
    return !searchQuery || 
      a.patientName.toLowerCase().includes(q) || 
      a.dentist.toLowerCase().includes(q) || 
      (a.room && a.room.toLowerCase().includes(q)) || 
      a.scheduledTime.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header Bar matching reference */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Admissions</h1>
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search Patients"
            className="w-full bg-white border border-slate-200/90 rounded-lg px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Main Admissions Card */}
      <div className="bg-white rounded-2xl p-7 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-7">
        <h2 className="text-sm font-bold text-slate-900">Live Waiting Room View</h2>

        {/* 7 Metric Stats Bar */}
        <div className="grid grid-cols-7 text-center gap-2">
          <div>
            <p className="text-xl font-bold text-[#0284c7]">{inSessionCount}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">In Session</p>
          </div>

          <div>
            <p className="text-xl font-bold text-[#0284c7]">{waitingCount}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Waiting</p>
          </div>

          <div>
            <p className="text-xl font-bold text-[#0284c7]">{lateCount}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Late</p>
          </div>

          <div>
            <p className="text-xl font-bold text-[#0284c7]">{noShowCount}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">No Show</p>
          </div>

          <div>
            <p className="text-xl font-bold text-[#0284c7]">{canceledCount}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Canceled</p>
          </div>

          <div>
            <p className="text-xl font-bold text-[#0284c7]">{endedCount}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Ended</p>
          </div>

          <div>
            <p className="text-xl font-bold text-slate-900">{totalCount}</p>
            <p className="text-[11px] text-slate-900 font-bold mt-1">Total</p>
          </div>
        </div>

        {/* Search Bar & + Add Button */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search by Patient, Doctor, or Timestamp. Press F for Quick Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#f8fafc] border border-slate-200/80 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 bg-[#0284c7] hover:bg-sky-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-xs transition-colors flex-shrink-0"
          >
            <Plus size={15} />
            <span>Add</span>
          </button>
        </div>

        {/* Live Queue Table with 100% Fluid Layout (No Horizontal Scroll) */}
        <div className="divide-y divide-slate-100 text-xs">
          {filteredAdmissions.map((item) => {
            const isLate = item.status === 'Late';
            const isInSession = item.status === 'In Session';
            const isEnded = item.status === 'Ended';
            const isWaiting = item.status === 'Waiting';
            const isCanceled = item.status === 'Canceled';
            const isNoShow = item.status === 'No Show';

            const times = item.scheduledTime ? item.scheduledTime.split('\n') : ['1:00 PM', '1:30 PM'];
            const startT = times[0] || '1:00 PM';
            const endT = times[1] || '1:30 PM';

            return (
              <div
                key={item.id}
                className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors rounded-lg px-1 text-xs"
              >
                {/* Column 1: Time */}
                <div className="w-16 flex-shrink-0 text-slate-400 font-medium">
                  <p className="text-slate-700 font-semibold leading-tight text-xs">{startT}</p>
                  <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{endT}</p>
                </div>

                {/* Column 2: Blue bar + Patient Name */}
                <div className="flex-1 min-w-[120px] flex items-center gap-2.5">
                  <div className="w-[3px] h-8 rounded-full bg-[#0284c7] flex-shrink-0" />
                  <span className="font-bold text-slate-900 text-xs truncate">{item.patientName}</span>
                </div>

                {/* Column 3: Doctor / Clinic */}
                <div className="w-36 lg:w-44 flex-shrink-0 text-[#0284c7] font-medium truncate text-xs">
                  {item.dentist}
                </div>

                {/* Column 4: Room */}
                <div className="w-28 lg:w-32 flex-shrink-0 text-slate-400 font-normal truncate text-xs">
                  {item.room || 'Surgery Room 1'}
                </div>

                {/* Column 5: Arrival / Late Status */}
                <div className="w-28 lg:w-36 flex-shrink-0 text-left">
                  {isLate && (
                    <span className="text-red-500 font-medium whitespace-nowrap text-xs">
                      {item.notes || 'Late'}
                    </span>
                  )}
                  {isInSession && (
                    <span className="text-slate-500 whitespace-nowrap text-xs">
                      {item.notes || (item.arrivalTime ? `Arrived: ${item.arrivalTime}` : 'Arrived: 02:08 pm')}
                    </span>
                  )}
                  {isEnded && (
                    <span className="text-slate-400 whitespace-nowrap text-xs">
                      {item.notes || (item.arrivalTime ? `Arrived: ${item.arrivalTime}` : 'Ended')}
                    </span>
                  )}
                  {isWaiting && (
                    <span className="text-amber-600 whitespace-nowrap text-xs">
                      Waiting in lobby
                    </span>
                  )}
                  {isCanceled && (
                    <span className="text-slate-400 whitespace-nowrap text-xs">
                      Canceled
                    </span>
                  )}
                  {isNoShow && (
                    <span className="text-red-500 whitespace-nowrap text-xs">
                      No Show
                    </span>
                  )}
                </div>

                {/* Column 6: Note Icon + Actions */}
                <div className="w-48 lg:w-52 flex-shrink-0 flex items-center justify-end gap-2 text-right">
                  {/* Notepad outline icon */}
                  <button
                    title="Clinical Notes"
                    className="text-slate-300 hover:text-slate-600 p-1 rounded transition-colors"
                  >
                    <FileText size={15} />
                  </button>

                  {/* Actions matching reference */}
                  {isInSession ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#0284c7] font-semibold text-[11px] whitespace-nowrap">
                        In Session: {item.elapsedMin || 21} minutes
                      </span>
                      <button
                        onClick={() => handleEndSession(item)}
                        className="text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 px-2 py-0.5 rounded border border-slate-200 transition-colors"
                      >
                        End
                      </button>
                    </div>
                  ) : isEnded || isCanceled || isNoShow ? (
                    <span className="text-slate-400 font-normal text-xs pr-1">
                      {item.status}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCancel(item)}
                        title="Cancel Admission"
                        className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200 hover:bg-slate-50 px-1.5 py-0.5 rounded transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleNoShow(item)}
                        title="Mark as No Show"
                        className="text-[10px] font-semibold text-slate-400 hover:text-red-600 border border-transparent hover:border-red-100 hover:bg-red-50 px-1.5 py-0.5 rounded transition-all"
                      >
                        No Show
                      </button>
                      {/* Arrow icon for admitting */}
                      <button
                        onClick={() => handleCallIn(item)}
                        title="Admit to Surgery"
                        className="text-slate-400 hover:text-[#0284c7] p-1 transition-colors pr-1"
                      >
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredAdmissions.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              No patients in waiting room today.
            </div>
          )}
        </div>
      </div>

      {/* Add Walk-in / Admission Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#0284c7] px-5 py-3 flex items-center justify-between text-white">
              <h2 className="text-sm font-bold tracking-tight">Add to Live Waiting Room</h2>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddAdmission} className="p-5 space-y-3.5 text-xs text-slate-700">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Patient Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Tetteh"
                  value={patientNameInput}
                  onChange={(e) => setPatientNameInput(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Doctor / Dentist</label>
                <input
                  type="text"
                  value={dentistInput}
                  onChange={(e) => setDentistInput(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Clinic Room</label>
                  <select
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="Surgery Room 1">Surgery Room 1</option>
                    <option value="Surgery Room 2">Surgery Room 2</option>
                    <option value="Consultation Room 1">Consultation Room 1</option>
                    <option value="Hygiene Suite">Hygiene Suite</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start & End Time</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={startTimeInput}
                      onChange={(e) => setStartTimeInput(e.target.value)}
                      className="w-1/2 border border-slate-200 rounded-lg p-2 text-center"
                    />
                    <input
                      type="text"
                      value={endTimeInput}
                      onChange={(e) => setEndTimeInput(e.target.value)}
                      className="w-1/2 border border-slate-200 rounded-lg p-2 text-center"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value as any)}
                  className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="Waiting">Waiting in lobby</option>
                  <option value="In Session">In Session</option>
                  <option value="Late">Late</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#0284c7] hover:bg-sky-700 text-white font-bold px-4 py-2 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
