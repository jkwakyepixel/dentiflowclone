import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppointments } from '../hooks/useAppointments';
import { usePatients } from '../hooks/usePatients';
import type { Appointment, Patient } from '../types';
import { 
  Search, 
  Calendar as CalendarIcon, 
  List as ListIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X,
  Clock,
  User,
  CheckCircle2,
  CalendarDays,
  CalendarRange,
  Eye,
  AlertCircle,
  Building2,
  MessageSquare,
  Trash2
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  subDays, 
  addWeeks, 
  subWeeks, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isBefore, 
  startOfDay 
} from 'date-fns';
import toast from 'react-hot-toast';

// TIME_SLOTS and CLINIC_ROOMS restored
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

const CLINIC_ROOMS = [
  'Surgery Room 1',
  'Surgery Room 2',
  'Consultation Room 1',
  'Consultation Room 2',
  'Hygiene Suite',
  'Orthodontic Bay'
];

export default function Appointments() {
  const { userData } = useAuth();
  const [searchParams] = useSearchParams();
  const urlPatientId = searchParams.get('patientId');
  const urlBook = searchParams.get('book');

  const { appointments, loading: apptsLoading, addAppointment, removeAppointment, editAppointment } = useAppointments();
  const { patients, loading: patientsLoading, addPatient } = usePatients();
  const loading = apptsLoading || patientsLoading;
  
  // Views: 'day' | 'week' | 'month' | 'list'
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'list'>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editApptId, setEditApptId] = useState<string | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<(Appointment & { room?: string; duration?: number }) | null>(null);

  // Reference-Matched Appointment Form State
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientObj, setSelectedPatientObj] = useState<Patient | null>(null);
  const [clinicRoom, setClinicRoom] = useState('Surgery Room 1');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('08:30');
  const [durationMin, setDurationMin] = useState(30);
  const [appointmentType, setAppointmentType] = useState('Consultation');
  const [dentist, setDentist] = useState(userData?.name || '');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Scheduled' | 'Arrived' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No Show'>('Scheduled');
  const [saving, setSaving] = useState(false);

  // Quick Select & Quick Add Patient popups
  const [showQuickSelect, setShowQuickSelect] = useState(false);
  const [isQuickAddPatientOpen, setIsQuickAddPatientOpen] = useState(false);
  const [newPtFirst, setNewPtFirst] = useState('');
  const [newPtLast, setNewPtLast] = useState('');
  const [newPtPhone, setNewPtPhone] = useState('');

  const clinicId = userData?.clinicId || 'demo-clinic';

  useEffect(() => {
    if (urlPatientId) {
      const ptList = patients.length > 0 ? patients : [
        { id: 'p1', firstName: 'John', lastName: 'Mensah', patientId: 'PAT-0001', phone: '+233 24 123 4567' },
        { id: 'p2', firstName: 'Ama', lastName: 'Boateng', patientId: 'PAT-0002', phone: '+233 55 234 5678' },
        { id: 'p3', firstName: 'Kwame', lastName: 'Asante', patientId: 'PAT-0003', phone: '+233 20 345 6789' },
        { id: 'p4', firstName: 'Efua', lastName: 'Owusu', patientId: 'PAT-0004', phone: '+233 27 456 7890' },
        { id: 'p5', firstName: 'Kofi', lastName: 'Adjei', patientId: 'PAT-0005', phone: '+233 24 567 8901' },
        { id: 'p6', firstName: 'Akosua', lastName: 'Frimpong', patientId: 'PAT-0006', phone: '+233 20 678 9012' },
        { id: 'p7', firstName: 'Yaw', lastName: 'Darko', patientId: 'PAT-0007', phone: '+233 55 789 0123' },
        { id: 'p8', firstName: 'Abena', lastName: 'Serwaa', patientId: 'PAT-0008', phone: '+233 26 890 1234' },
      ];
      const match = ptList.find(p => p.id === urlPatientId || p.patientId === urlPatientId) || ptList[0];
      if (match) {
        setSelectedPatientObj(match as any);
        setPatientSearch(`${match.firstName} ${match.lastName}`);
      }
      if (urlBook === 'true' || urlPatientId) {
        setIsModalOpen(true);
      }
    }
  }, [urlPatientId, urlBook, patients]);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const finalPatientName = selectedPatientObj 
      ? `${selectedPatientObj.firstName} ${selectedPatientObj.lastName}`
      : patientSearch.trim() || 'John Mensah';

    // Calculate end time based on duration
    const [h, m] = startTime.split(':').map(Number);
    const totalMinutes = h * 60 + m + durationMin;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    const endTime = `${endH < 10 ? '0' : ''}${endH}:${endM < 10 ? '0' : ''}${endM}`;

    try {
      if (editApptId) {
        await editAppointment(editApptId, {
          patientId: selectedPatientObj?.id || 'p-gen',
          patientName: finalPatientName,
          date,
          startTime,
          endTime,
          duration: durationMin,
          room: clinicRoom,
          appointmentType,
          dentist,
          notes,
          status,
        });
        toast.success('Appointment updated successfully');
      } else {
        await addAppointment({
          patientId: selectedPatientObj?.id || 'p-gen',
          patientName: finalPatientName,
          date,
          startTime,
          endTime,
          duration: durationMin,
          room: clinicRoom,
          appointmentType,
          dentist,
          notes,
          status,
          isDeleted: false
        });
        toast.success('Appointment created successfully');
      }

      setIsModalOpen(false);
      setEditApptId(null);
      
      // Reset form
      setNotes('');
      setPatientSearch('');
      setSelectedPatientObj(null);
    } catch (error: any) {
      toast.error(error.message || `Failed to ${editApptId ? 'update' : 'create'} appointment`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
      try {
        await removeAppointment(id);
        toast.success('Appointment deleted successfully');
        setSelectedAppt(null);
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete appointment');
      }
    }
  };

  const handleQuickAddPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPtFirst.trim()) return;

    try {
      const newPatientData = {
        firstName: newPtFirst.trim(),
        lastName: newPtLast.trim(),
        phone: newPtPhone.trim() || '+233 24 000 0000',
        gender: 'Male',
        dateOfBirth: '01 Jan',
        email: '',
        address: '',
        allergies: '',
        medicalNotes: '',
        dentalNotes: '',
        isDeleted: false
      };

      const newId = await addPatient(newPatientData);
      const createdObj = { ...newPatientData, id: newId, patientId: 'NEW', clinicId } as Patient;

      setSelectedPatientObj(createdObj);
      setPatientSearch(`${createdObj.firstName} ${createdObj.lastName}`);
      setIsQuickAddPatientOpen(false);
      toast.success(`Patient ${createdObj.firstName} added!`);

      setNewPtFirst('');
      setNewPtLast('');
      setNewPtPhone('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add patient');
    }
  };

  const handleQuickSlotClick = (slotDate: string, slotTime: string) => {
    setDate(slotDate);
    setStartTime(slotTime);
    setIsModalOpen(true);
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter(a => {
    const matchesSearch = searchQuery === '' || 
      a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.appointmentType.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    const matchesDate = !filterDate || a.date === filterDate;

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'day') setCurrentDate(subDays(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Header Title
  const getHeaderTitle = () => {
    if (viewMode === 'day') {
      return format(currentDate, 'EEEE, d MMMM yyyy');
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return `${format(weekStart, 'd MMM')} – ${format(weekEnd, 'd MMM yyyy')}`;
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  };

  // Month grid dates
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startMonthDate = startOfWeek(monthStart);
  const endMonthDate = endOfWeek(monthEnd);

  const monthDays: Date[] = [];
  let d = startMonthDate;
  while (d <= endMonthDate) {
    monthDays.push(d);
    d = addDays(d, 1);
  }

  // Week days
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Today stats
  const actualTodayStr = format(new Date(), 'yyyy-MM-dd');
  const todayCount = appointments.filter(a => a.date === actualTodayStr).length || 0;

  const isSelectedDateInPast = isBefore(new Date(date), startOfDay(new Date()));

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-emerald-50/95 border-emerald-500 text-emerald-950 hover:bg-emerald-100/90';
      case 'Scheduled':
        return 'bg-blue-50/95 border-blue-500 text-blue-950 hover:bg-blue-100/90';
      case 'Arrived':
        return 'bg-amber-50/95 border-amber-500 text-amber-950 hover:bg-amber-100/90';
      case 'Cancelled':
      case 'No Show':
        return 'bg-red-50/95 border-red-500 text-red-950 hover:bg-red-100/90';
      default:
        return 'bg-blue-50/95 border-blue-500 text-blue-950 hover:bg-blue-100/90';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appointments</h1>
          <p className="text-xs text-slate-400 mt-1">{appointments.length} total · {todayCount} today</p>
        </div>
        <button
          onClick={() => {
            setEditApptId(null);
            setPatientSearch('');
            setSelectedPatientObj(null);
            setNotes('');
            setStatus('Scheduled');
            setDate(format(currentDate, 'yyyy-MM-dd'));
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Google Calendar Controls Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by patient or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
          />
        </div>

        {/* Calendar Nav & View Tabs */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Today Button & Chevron Nav */}
          <div className="flex items-center bg-white border border-slate-200/90 rounded-xl p-1 shadow-2xs">
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors border-r border-slate-100"
            >
              Today
            </button>
            <button
              onClick={handlePrev}
              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors"
              title="Previous"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNext}
              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors"
              title="Next"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200/90 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer"
          >
            <option value="All">All statuses</option>
            <option value="Confirmed">Confirmed (In Session)</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Arrived">Arrived (Waiting)</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="No Show">No Show</option>
          </select>

          {/* Google Calendar View Switcher */}
          <div className="bg-slate-100/90 p-1 rounded-xl flex gap-1 text-xs font-medium">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'day'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'week'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'month'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar View Box */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        {/* Dynamic Date Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-900">
            {getHeaderTitle()}
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            {filteredAppointments.length} matching events
          </span>
        </div>

        {/* 1. MONTH VIEW */}
        {viewMode === 'month' && (
          <div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-slate-400 mb-2">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {monthDays.map((dayItem, idx) => {
                const isCurrentMonth = isSameMonth(dayItem, currentDate);
                const dayFormatted = format(dayItem, 'yyyy-MM-dd');
                const isTodayDate = isSameDay(dayItem, new Date());
                const dayAppts = filteredAppointments.filter(a => a.date === dayFormatted);

                if (!isCurrentMonth) {
                  return (
                    <div 
                      key={idx} 
                      className="min-h-[100px] p-2 rounded-xl bg-slate-50/40 border border-slate-50/60 opacity-40"
                    />
                  );
                }

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setCurrentDate(dayItem);
                      setViewMode('day');
                    }}
                    className={`min-h-[105px] p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer group ${
                      isTodayDate
                        ? 'bg-blue-50/40 border-blue-200'
                        : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      {isTodayDate ? (
                        <span className="w-5 h-5 rounded-full bg-[#2563eb] text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                          {format(dayItem, 'd')}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                          {format(dayItem, 'd')}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickSlotClick(dayFormatted, '08:30');
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 p-0.5"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <div className="space-y-1 overflow-hidden flex-1">
                      {dayAppts.slice(0, 2).map((appt) => (
                        <div
                          key={appt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppt(appt);
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium truncate flex items-center gap-1 shadow-2xs border-l-2 ${getStatusStyle(appt.status)}`}
                        >
                          <span className="font-normal opacity-80">{appt.startTime}</span>
                          <span className="truncate">{appt.patientName}</span>
                        </div>
                      ))}
                      {dayAppts.length > 2 && (
                        <div className="text-[10px] text-slate-400 font-medium pl-1">
                          + {dayAppts.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. WEEK VIEW */}
        {viewMode === 'week' && (
          <div className="overflow-x-auto">
            <div className="min-w-[750px]">
              <div className="grid grid-cols-8 border-b border-slate-100 pb-3">
                <div className="text-xs font-medium text-slate-400 text-center flex items-center justify-center">
                  GMT+0
                </div>
                {weekDays.map((dayItem, i) => {
                  const dayStr = format(dayItem, 'yyyy-MM-dd');
                  const isTodayCol = isSameDay(dayItem, new Date());
                  return (
                    <div key={i} className="text-center">
                      <p className="text-[11px] font-medium text-slate-400 uppercase">{format(dayItem, 'EEE M/d')}</p>
                      <div className="mt-1 flex justify-center">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          isTodayCol ? 'bg-[#2563eb] text-white shadow-2xs' : 'text-slate-800'
                        }`}>
                          {format(dayItem, 'd')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="divide-y divide-slate-100">
                {TIME_SLOTS.map((time) => (
                  <div key={time} className="grid grid-cols-8 min-h-[64px] group">
                    <div className="text-[11px] font-medium text-slate-400 pr-3 -mt-2.5 text-right">
                      {time}
                    </div>

                    {weekDays.map((dayItem, dayIdx) => {
                      const dayStr = format(dayItem, 'yyyy-MM-dd');
                      const hourPrefix = time.substring(0, 2);
                      const slotAppts = filteredAppointments.filter(a => 
                        a.date === dayStr && a.startTime.startsWith(hourPrefix)
                      );

                      return (
                        <div
                          key={dayIdx}
                          onClick={() => handleQuickSlotClick(dayStr, time)}
                          className="border-l border-slate-100 p-1 relative hover:bg-blue-50/20 transition-colors cursor-pointer"
                        >
                          {slotAppts.map((appt) => (
                            <div
                              key={appt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAppt(appt);
                              }}
                              className={`p-1.5 rounded-lg border-l-3 text-[10px] shadow-2xs transition-all ${getStatusStyle(appt.status)}`}
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span>{appt.startTime} - {appt.endTime}</span>
                              </div>
                              <p className="font-bold truncate mt-0.5">{appt.patientName}</p>
                              <p className="text-[9px] opacity-75 truncate">{appt.appointmentType} · {appt.room || 'Surgery Room 1'}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. DAY VIEW */}
        {viewMode === 'day' && (
          <div className="space-y-4">
            <div className="divide-y divide-slate-100">
              {TIME_SLOTS.map((time) => {
                const hourPrefix = time.substring(0, 2);
                const dayStr = format(currentDate, 'yyyy-MM-dd');
                const slotAppts = filteredAppointments.filter(a => 
                  a.date === dayStr && a.startTime.startsWith(hourPrefix)
                );

                return (
                  <div key={time} className="grid grid-cols-12 min-h-[70px] py-2 group">
                    <div className="col-span-2 text-xs font-semibold text-slate-400 text-right pr-4 pt-1">
                      {time}
                    </div>

                    <div 
                      onClick={() => handleQuickSlotClick(dayStr, time)}
                      className="col-span-10 border-l-2 border-slate-100 pl-4 relative hover:bg-blue-50/20 transition-colors rounded-r-xl p-1 cursor-pointer flex flex-col justify-center gap-2"
                    >
                      {slotAppts.length > 0 ? (
                        slotAppts.map(appt => (
                          <div
                            key={appt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAppt(appt);
                            }}
                            className={`p-3 rounded-xl border-l-4 shadow-2xs flex items-center justify-between transition-all ${getStatusStyle(appt.status)}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-900/10 flex items-center justify-center font-bold text-xs">
                                {appt.patientName.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold">{appt.patientName}</h4>
                                <p className="text-[11px] opacity-80">{appt.appointmentType} · {appt.room || 'Surgery Room 1'} · Dr. {appt.dentist}</p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-xs font-bold">{appt.startTime} – {appt.endTime}</p>
                              <span className="inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/70">
                                {appt.status}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="opacity-0 group-hover:opacity-100 text-[11px] text-blue-600 font-medium flex items-center gap-1 pl-2">
                          <Plus size={14} /> Click to schedule at {time}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. LIST VIEW */}
        {viewMode === 'list' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 font-medium border-b border-slate-100">
                  <th className="pb-3 font-medium">Date & Time</th>
                  <th className="pb-3 font-medium">Patient</th>
                  <th className="pb-3 font-medium">Room</th>
                  <th className="pb-3 font-medium">Treatment</th>
                  <th className="pb-3 font-medium">Dentist</th>
                  <th className="pb-3 font-medium">Notes</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAppointments.map((item) => (
                  <tr 
                    key={item.id} 
                    onClick={() => setSelectedAppt(item)}
                    className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 font-medium text-slate-800 whitespace-nowrap">
                      {item.date} · {item.startTime} - {item.endTime}
                    </td>
                    <td className="py-3.5 font-bold text-slate-900">{item.patientName}</td>
                    <td className="py-3.5 text-slate-600">{item.room || 'Surgery Room 1'}</td>
                    <td className="py-3.5 text-slate-600">{item.appointmentType}</td>
                    <td className="py-3.5 text-slate-500">Dr. {item.dentist}</td>
                    <td className="py-3.5 text-slate-400 max-w-xs truncate">{item.notes || '—'}</td>
                    <td className="py-3.5 text-right whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        item.status === 'Confirmed'
                          ? 'bg-emerald-50 text-emerald-600'
                          : item.status === 'Scheduled'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500 pt-6 mt-4 border-t border-slate-50">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
            <span className="text-[11px] font-medium text-slate-600">Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
            <span className="text-[11px] font-medium text-slate-600">Scheduled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
            <span className="text-[11px] font-medium text-slate-600">Cancelled / No show</span>
          </div>
        </div>
      </div>

      {/* REFERENCE-MATCHED "ADD APPOINTMENT" MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Blue Banner Header */}
            <div className="bg-[#0284c7] px-5 py-3 flex items-center justify-between text-white flex-shrink-0">
              <h2 className="text-sm font-bold tracking-tight">{editApptId ? 'Edit Appointment' : 'Add Appointment'}</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateAppointment} className="flex-1 overflow-y-auto p-5 space-y-3 text-xs text-slate-700">
              {/* Select Patient */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[#0284c7] text-xs">Select Patient *</label>
                  <div className="flex items-center gap-3 font-bold text-[11px]">
                    <button
                      type="button"
                      onClick={() => setShowQuickSelect(!showQuickSelect)}
                      className="text-[#0284c7] hover:underline"
                    >
                      QUICK SELECT
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddPatientOpen(true)}
                      className="text-[#0284c7] hover:underline"
                    >
                      ADD PATIENT
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Search or enter patient name..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setSelectedPatientObj(null);
                    }}
                    className="w-full border-b-2 border-[#0284c7] pb-1 pt-0.5 text-sm font-medium text-slate-900 focus:outline-none placeholder-slate-400 bg-transparent"
                  />

                  {/* Quick Select Patient Dropdown */}
                  {showQuickSelect && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-44 overflow-y-auto p-1 divide-y divide-slate-50">
                      {patients.map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPatientObj(p);
                            setPatientSearch(`${p.firstName} ${p.lastName}`);
                            setShowQuickSelect(false);
                          }}
                          className="p-2 hover:bg-blue-50 cursor-pointer rounded-lg flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{p.firstName} {p.lastName}</span>
                            <span className="text-slate-400 text-[11px] ml-2 font-mono">{p.patientId}</span>
                          </div>
                          <span className="text-slate-400 text-[11px]">{p.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Clinic Room */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Clinic Room</label>
                <select
                  value={clinicRoom}
                  onChange={(e) => setClinicRoom(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-medium shadow-2xs cursor-pointer"
                >
                  {CLINIC_ROOMS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Date & Time Row */}
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Date */}
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Date</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-2 bg-white shadow-2xs">
                      <CalendarIcon size={15} className="text-slate-400 flex-shrink-0" />
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-transparent text-xs text-slate-800 focus:outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Time */}
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Time</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-2 bg-white shadow-2xs">
                      <Clock size={15} className="text-slate-400 flex-shrink-0" />
                      <input
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-transparent text-xs text-slate-800 focus:outline-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {isSelectedDateInPast && (
                  <p className="text-[11px] text-red-500 font-medium mt-1 text-right">
                    The date is in the past
                  </p>
                )}
              </div>

              {/* Duration (min) Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Duration (min)</label>
                  <input
                    type="number"
                    min="15"
                    max="180"
                    step="15"
                    value={durationMin}
                    onChange={(e) => setDurationMin(Number(e.target.value))}
                    className="w-14 border border-slate-200 rounded-lg p-1 text-center text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <input
                  type="range"
                  min="15"
                  max="180"
                  step="15"
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0284c7]"
                />
              </div>

              {/* Treatment Type & Dentist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Treatment Type</label>
                  <select
                    value={appointmentType}
                    onChange={(e) => setAppointmentType(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white shadow-2xs"
                  >
                    <option>Consultation</option>
                    <option>Cleaning</option>
                    <option>Tooth Extraction</option>
                    <option>Filling</option>
                    <option>Root Canal</option>
                    <option>Dental Checkup</option>
                    <option>Follow-up</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Dentist *</label>
                  <input
                    type="text"
                    required
                    value={dentist}
                    onChange={(e) => setDentist(e.target.value)}
                    placeholder="Doctor's name"
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                  />
                </div>
              </div>

              {/* SMS Notice Banner matching screenshot */}
              <div className="p-2.5 bg-red-50/70 border border-red-100 rounded-xl text-center space-y-0.5">
                <p className="text-[10px] font-bold text-red-500">SMS Limit Reached!</p>
                <p className="text-[10px] text-slate-500">
                  To upgrade your plan, Please <span className="text-[#0284c7] font-semibold cursor-pointer underline">Connect with us on WhatsApp</span> or drop us an email at <span className="text-slate-700 font-semibold">info@dentiflow.com</span>
                </p>
              </div>

              {/* Note / Remarks */}
              <div className="space-y-1">
                <textarea
                  maxLength={300}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Note"
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs resize-none"
                />
                <div className="text-right text-[10px] text-slate-400">
                  {notes.length} / 300
                </div>
              </div>

              {/* Footer Actions inside the form */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 uppercase transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#2563eb] hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {saving ? 'Saving...' : (editApptId ? 'Update' : 'Schedule')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Patient Sub-Modal */}
      {isQuickAddPatientOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900">Quick Add Patient</h3>
              <button onClick={() => setIsQuickAddPatientOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleQuickAddPatientSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={newPtFirst}
                  onChange={(e) => setNewPtFirst(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={newPtLast}
                  onChange={(e) => setNewPtLast(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  placeholder="+233..."
                  value={newPtPhone}
                  onChange={(e) => setNewPtPhone(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickAddPatientOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0284c7] hover:bg-sky-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Add & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Details & Actions Modal */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Appointment Details</h3>
              <button onClick={() => setSelectedAppt(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Patient</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedAppt.patientName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 font-medium">Date</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedAppt.date}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Time</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedAppt.startTime} - {selectedAppt.endTime}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Treatment</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedAppt.appointmentType}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Status</p>
                  <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    selectedAppt.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-600' :
                    selectedAppt.status === 'Scheduled' ? 'bg-blue-50 text-blue-600' :
                    selectedAppt.status === 'Arrived' ? 'bg-amber-50 text-amber-600' :
                    'bg-red-50 text-red-600'
                  }`}>
                    {selectedAppt.status}
                  </span>
                </div>
              </div>
              {selectedAppt.notes && (
                <div>
                  <p className="text-slate-400 font-medium">Notes</p>
                  <p className="text-slate-700 mt-0.5 bg-slate-50 p-2 rounded-lg">{selectedAppt.notes}</p>
                </div>
              )}
            </div>
            <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handleDeleteAppointment(selectedAppt.id as string)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedAppt(null);
                    setEditApptId(selectedAppt.id as string);
                    setDate(selectedAppt.date);
                    setStartTime(selectedAppt.startTime);
                    setDurationMin(selectedAppt.duration || 30);
                    setAppointmentType(selectedAppt.appointmentType);
                    setDentist(selectedAppt.dentist);
                    setNotes(selectedAppt.notes || '');
                    setStatus(selectedAppt.status as any);
                    setClinicRoom(selectedAppt.room || 'Surgery Room 1');
                    setPatientSearch(selectedAppt.patientName);
                    setSelectedPatientObj(patients.find(p => p.id === selectedAppt.patientId) || null);
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-xl transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setSelectedAppt(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
