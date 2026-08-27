import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePatients } from '../hooks/usePatients';
import { useAppointments } from '../hooks/useAppointments';
import { useFinancials } from '../hooks/useFinancials';
import { Card, CardContent } from '../components/ui/Card';
import { 
  Calendar as CalendarIcon, 
  Users, 
  FileText, 
  Coins, 
  TrendingUp, 
  ArrowRight 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { format } from 'date-fns';

export default function Dashboard() {
  const { userData, currentUser } = useAuth();
  const { appointments, loading: appointmentsLoading } = useAppointments();
  const { patients, loading: patientsLoading } = usePatients();
  const { 
    revenue, 
    outstanding, 
    openInvoicesCount, 
    invoices, 
    payments, 
    loading: financialsLoading 
  } = useFinancials();
  
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const loading = appointmentsLoading || patientsLoading || financialsLoading;
  const displayName = userData?.name || currentUser?.displayName || userData?.email?.split('@')[0] || currentUser?.email?.split('@')[0] || 'User';
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Metrics calculations
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayAppointments = appointments.filter(a => a.date === todayStr);
  const nextAppt = todayAppointments.find(a => a.status === 'Scheduled' || a.status === 'Confirmed');

  const currentMonthStr = format(new Date(), 'MMM yyyy'); // e.g. "Aug 2026"
  const thisMonthPayments = payments.filter(p => p.paymentDate && p.paymentDate.includes(currentMonthStr));
  const revenueThisMonth = thisMonthPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  // Dynamic Chart Data Construction (Simple aggregated view)
  const chartData = [
    { name: 'Last Month', Revenue: 0, Payments: 0, Outstanding: 0 },
    { name: 'This Month', Revenue: revenueThisMonth, Payments: revenueThisMonth, Outstanding: outstanding },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-8">
      {/* Title & Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {getGreeting()}, {displayName}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Here's what's happening at the clinic today.
        </p>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Today's Appointments */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-slate-200 transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarIcon size={20} />
            </div>
            <p className="text-xs font-medium text-slate-500 mt-4">Today's Appointments</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{todayAppointments.length}</p>
            <p className="text-xs text-slate-400 mt-1">
              {nextAppt ? `Next: ${nextAppt.startTime} — ${nextAppt.patientName}` : 'No upcoming appointments today'}
            </p>
          </div>
          <Link 
            to="/appointments" 
            className="text-xs font-semibold text-[#2563eb] hover:text-blue-700 mt-4 inline-flex items-center gap-1 transition-colors"
          >
            View schedule →
          </Link>
        </div>

        {/* Card 2: Total Patients */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-slate-200 transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <p className="text-xs font-medium text-slate-500 mt-4">Total Patients</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{patients.length}</p>
            <p className="text-xs text-slate-400 mt-1">Active registered patients</p>
          </div>
          <Link 
            to="/patients" 
            className="text-xs font-semibold text-[#2563eb] hover:text-blue-700 mt-4 inline-flex items-center gap-1 transition-colors"
          >
            View patients →
          </Link>
        </div>

        {/* Card 3: Outstanding Invoices */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-slate-200 transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <p className="text-xs font-medium text-slate-500 mt-4">Outstanding Invoices</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{openInvoicesCount}</p>
            <p className="text-xs text-slate-400 mt-1">GH₵ {outstanding.toFixed(2)} owed</p>
          </div>
          <Link 
            to="/invoices" 
            className="text-xs font-semibold text-[#2563eb] hover:text-blue-700 mt-4 inline-flex items-center gap-1 transition-colors"
          >
            View invoices →
          </Link>
        </div>

        {/* Card 4: Revenue This Month */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-slate-200 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Coins size={20} />
              </div>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-4">Revenue This Month</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">GH₵ {revenueThisMonth.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-1">Received from recorded payments</p>
          </div>
          <Link 
            to="/financial-reports" 
            className="text-xs font-semibold text-[#2563eb] hover:text-blue-700 mt-4 inline-flex items-center gap-1 transition-colors"
          >
            View reports →
          </Link>
        </div>
      </div>

      {/* Financial Overview Chart Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Financial Overview</h2>
            <p className="text-xs text-slate-400 mt-0.5">Revenue, payments received and outstanding invoices</p>
          </div>
          
          <div className="inline-flex bg-slate-100/90 p-1 rounded-xl gap-1 self-start sm:self-auto text-xs font-medium">
            <button 
              onClick={() => setTimeRange('week')}
              className={`px-3 py-1 rounded-lg transition-all ${timeRange === 'week' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              This week
            </button>
            <button 
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1 rounded-lg transition-all ${timeRange === 'month' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              This month
            </button>
            <button 
              onClick={() => setTimeRange('quarter')}
              className={`px-3 py-1 rounded-lg transition-all ${timeRange === 'quarter' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Last 3 months
            </button>
            <button 
              onClick={() => setTimeRange('year')}
              className={`px-3 py-1 rounded-lg transition-all ${timeRange === 'year' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              This year
            </button>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: 15 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11 }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11 }} 
                tickFormatter={(value) => {
                  if (value === 0) return 'GH₵0';
                  if (value >= 1000) return `GH₵${(value / 1000).toFixed(1).replace('.0', '')}k`;
                  return `GH₵${value}`;
                }}
              />
              <Tooltip 
                formatter={(value: any) => [`GH₵ ${Number(value).toFixed(2)}`, '']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px' }}
              />
              <Bar 
                dataKey="Revenue" 
                fill="#2563eb" 
                barSize={16} 
                radius={[4, 4, 0, 0]} 
              />
              <Line 
                type="natural" 
                dataKey="Payments" 
                stroke="#0d9488" 
                strokeWidth={2.5} 
                dot={{ r: 3, fill: '#0d9488', strokeWidth: 0 }} 
                activeDot={{ r: 5 }} 
              />
              <Line 
                type="natural" 
                dataKey="Outstanding" 
                stroke="#f59e0b" 
                strokeWidth={2.5} 
                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }} 
                activeDot={{ r: 5 }} 
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-slate-500 pt-3 border-t border-slate-50 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            <span className="text-[11px] font-medium text-slate-600">Outstanding</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0d9488]" />
            <span className="text-[11px] font-medium text-slate-600">Payments</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-xs bg-[#2563eb]" />
            <span className="text-[11px] font-medium text-slate-600">Revenue</span>
          </div>
        </div>
      </div>

      {/* Bottom 2 Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card: Recent Transactions (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Recent Transactions</h2>
            <Link to="/payments" className="text-xs font-semibold text-[#2563eb] hover:text-blue-700 transition-colors">
              View all →
            </Link>
          </div>

          <div className="overflow-x-auto">
            {payments.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                No recent transactions found.
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 font-medium border-b border-slate-100">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Patient</th>
                    <th className="pb-3 font-medium">Invoice</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Method</th>
                    <th className="pb-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {payments.slice(0, 5).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 text-slate-400 font-normal">{item.paymentDate}</td>
                      <td className="py-3 font-bold text-slate-900">{item.patientName}</td>
                      <td className="py-3 text-slate-400 font-mono text-[11px]">{item.invoiceNumber}</td>
                      <td className="py-3 font-bold text-slate-900">GH₵ {Number(item.amount).toFixed(2)}</td>
                      <td className="py-3 text-slate-600">{item.paymentMethod}</td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600">
                          Paid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Card: Upcoming Appointments (1 col) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Upcoming Appointments</h2>
            <Link to="/appointments" className="text-xs font-semibold text-[#2563eb] hover:text-blue-700 transition-colors">
              View all →
            </Link>
          </div>

          <div className="space-y-3.5 flex-1">
            {appointments.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm h-full flex flex-col justify-center">
                No upcoming appointments.
              </div>
            ) : (
              appointments.slice(0, 5).map((appt) => {
                const patientName = appt.patientName || 'Unknown Patient';
                const initials = patientName.substring(0, 2).toUpperCase();
                const service = appt.appointmentType || 'Checkup';
                const dateStr = appt.date && appt.startTime ? `${format(new Date(appt.date), 'd MMM')} · ${appt.startTime}` : appt.date;
                const isConfirmed = appt.status === 'Confirmed';

                return (
                  <div key={appt.id} className="flex items-center justify-between gap-3 p-1 rounded-xl hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#1e293b] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{patientName}</p>
                        <p className="text-[11px] text-slate-400 truncate">{service}</p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 flex flex-col items-end">
                      <p className="text-[11px] text-slate-400 mb-1">{dateStr}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isConfirmed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {appt.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
