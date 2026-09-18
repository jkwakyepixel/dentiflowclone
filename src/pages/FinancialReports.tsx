import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useClinic } from '../contexts/ClinicContext';
import { usePatients } from '../hooks/usePatients';
import { useInvoices } from '../hooks/useInvoices';
import { usePayments } from '../hooks/usePayments';
import { exportFinancialTrackerExcel } from '../services/excelExport';
import { ExportModal } from '../components/ui/ExportModal';
import type { Invoice, Patient, Payment } from '../types';
import { 
  DollarSign, 
  FileText, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  AlertCircle,
  Calendar as CalendarIcon,
  CreditCard,
  Building2,
  Smartphone,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { parse, isToday, isThisWeek, isThisMonth, isThisYear, subMonths, isAfter } from 'date-fns';

interface OutstandingInvoice {
  id: string;
  patient: string;
  invoice: string;
  date: string;
  total: number;
  paid: number;
  balance: number;
  due: string;
  status: 'Unpaid' | 'Partially Paid' | 'Overdue';
}

export default function FinancialReports() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { clinicProfile } = useClinic();
  
  const { patients } = usePatients();
  const { invoices } = useInvoices();
  const { payments } = usePayments();
  const [isExporting, setIsExporting] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState<
    'Today' | 'This Week' | 'This Month' | 'Last Month' | 'Last 3 Months' | 'This Year'
  >('This Month');
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const clinicId = userData?.clinicId || 'demo-clinic';

  const handleExportExcel = (selectedMonth: string) => {
    try {
      setIsExporting(true);
      exportFinancialTrackerExcel(
        clinicProfile.name || 'Bright Smile Dental Clinic',
        patients,
        invoices,
        payments,
        selectedMonth
      );
      toast.success('Excel workbook exported successfully!');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export Excel spreadsheet');
    } finally {
      setIsExporting(false);
    }
  };

  const periods: ('Today' | 'This Week' | 'This Month' | 'Last Month' | 'Last 3 Months' | 'This Year')[] = [
    'Today',
    'This Week',
    'This Month',
    'Last Month',
    'Last 3 Months',
    'This Year'
  ];

  const checkDateInPeriod = (dateString: string | undefined) => {
    if (!dateString) return true; // Include if no date
    try {
      let dateObj = new Date(dateString);
      if (isNaN(dateObj.getTime())) {
        dateObj = parse(dateString, 'd MMM yyyy', new Date());
      }
      
      const now = new Date();
      if (selectedPeriod === 'Today') return isToday(dateObj);
      if (selectedPeriod === 'This Week') return isThisWeek(dateObj);
      if (selectedPeriod === 'This Month') return isThisMonth(dateObj);
      if (selectedPeriod === 'Last Month') {
        const lastMonth = subMonths(now, 1);
        return dateObj.getMonth() === lastMonth.getMonth() && dateObj.getFullYear() === lastMonth.getFullYear();
      }
      if (selectedPeriod === 'Last 3 Months') return isAfter(dateObj, subMonths(now, 3));
      if (selectedPeriod === 'This Year') return isThisYear(dateObj);
      
      return true;
    } catch (e) {
      return true;
    }
  };

  // Filter out quotations globally
  const allInvoices = invoices.filter(i => (i.type || 'Invoice') === 'Invoice');

  // Period-filtered data for charts and activity metrics
  const periodInvoices = allInvoices.filter(i => checkDateInPeriod(i.invoiceDate || i.date));
  const periodPayments = payments.filter(p => checkDateInPeriod(p.paymentDate));

  // KPI Calculations - use ALL invoices for lifetime totals, period for activity
  // "Total Invoiced" = sum of all invoice totals (lifetime, not period-filtered)
  const totalInvoiced = allInvoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  // "Total Collected" = sum of all payment amounts (lifetime)
  const totalCollected = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  // "Total Outstanding" = sum of remaining balances on all invoices
  const totalOutstanding = allInvoices.reduce((sum, i) => sum + (Number(i.balance) || 0), 0);

  // Period-specific metrics for the header subtitle
  const periodRevenue = periodPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const periodInvoicedTotal = periodInvoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const periodTransactions = periodPayments.length;

  // Invoice statuses (all time)
  const paidInvoices = allInvoices.filter(i => i.status === 'Paid' || i.balance === 0).length;
  const partiallyPaidInvoices = allInvoices.filter(i => i.status === 'Partially Paid' || (i.balance > 0 && i.amountPaid > 0)).length;
  const unpaidInvoices = allInvoices.filter(i => i.status === 'Unpaid' || i.status === 'Draft' || (i.balance === i.total && i.balance > 0)).length;
  const overdueInvoices = allInvoices.filter(i => new Date(i.dueDate) < new Date() && i.balance > 0).length;

  const outstandingInvoicesList = allInvoices.filter(i => i.balance > 0).map(i => ({
    id: i.id || i.invoiceNumber,
    patient: i.patientName,
    invoice: i.invoiceNumber,
    date: i.invoiceDate || i.date || '',
    total: i.total,
    paid: i.amountPaid,
    balance: i.balance,
    due: i.dueDate,
    status: i.status
  }));

  // Group payments by date for the chart (period-filtered)
  const paymentsByDate = periodPayments.reduce((acc, p) => {
    const date = p.paymentDate;
    if (!acc[date]) acc[date] = 0;
    acc[date] += Number(p.amount);
    return acc;
  }, {} as Record<string, number>);

  const chartBars = Object.entries(paymentsByDate)
    .map(([date, amount]) => ({ date: date.substring(0, 6), amount }))
    .slice(-7);
  
  const maxChartVal = chartBars.length > 0 ? Math.max(...chartBars.map(b => b.amount)) : 800;

  // Service Revenue (period-filtered)
  const serviceRevenueMap: Record<string, number> = {};
  periodInvoices.forEach(inv => {
    if (inv.items) {
      inv.items.forEach(item => {
        if (!serviceRevenueMap[item.serviceName]) serviceRevenueMap[item.serviceName] = 0;
        serviceRevenueMap[item.serviceName] += Number(item.total);
      });
    }
  });

  const topServices = Object.entries(serviceRevenueMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: periodInvoicedTotal > 0 ? (amount / periodInvoicedTotal) * 100 : 0
    }));

  // Donut chart percentages (period-filtered)
  const paymentMethods: Record<string, number> = {
    'Cash': 0, 'Mobile Money': 0, 'Bank Transfer': 0, 'Card': 0, 'Other': 0
  };
  periodPayments.forEach(p => {
    if (paymentMethods[p.paymentMethod] !== undefined) {
      paymentMethods[p.paymentMethod] += Number(p.amount);
    } else {
      paymentMethods['Other'] += Number(p.amount);
    }
  });

  const getDashOffset = (percent: number, prevOffset: number) => {
    const dashArray = 238.7; // circumference
    const fill = (percent / 100) * dashArray;
    return { fill, offset: prevOffset - fill };
  };

  const cashPct = periodRevenue > 0 ? (paymentMethods['Cash'] / periodRevenue) * 100 : 0;
  const momoPct = periodRevenue > 0 ? (paymentMethods['Mobile Money'] / periodRevenue) * 100 : 0;
  const bankPct = periodRevenue > 0 ? (paymentMethods['Bank Transfer'] / periodRevenue) * 100 : 0;
  const cardPct = periodRevenue > 0 ? (paymentMethods['Card'] / periodRevenue) * 100 : 0;

  const cashLine = (cashPct / 100) * 238.7;
  const momoLine = (momoPct / 100) * 238.7;
  const bankLine = (bankPct / 100) * 238.7;
  const cardLine = (cardPct / 100) * 238.7;

  // Collection rate
  const collectionRate = totalInvoiced > 0 ? Math.min(100, (totalCollected / totalInvoiced) * 100) : 0;

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header & Period Filters & Export Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Overview</h1>
          <p className="text-xs text-slate-400 mt-1">Automatically calculated from invoices and payments</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Period Pills */}
          <div className="inline-flex bg-slate-100/90 p-1 rounded-2xl gap-1 text-xs font-medium overflow-x-auto shadow-2xs">
            {periods.map(period => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                  selectedPeriod === period
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {period}
              </button>
            ))}
          </div>

          {/* Export to Excel Button matching user format */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 bg-[#0f766e] hover:bg-[#115e59] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            title="Export beautiful summary financial report"
          >
            <FileSpreadsheet size={15} />
            <span>{isExporting ? 'Exporting...' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      {/* 2. Lifetime Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced (All Time) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#eff6ff] text-[#3b82f6] flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="stroke-[2.5]" />
            </div>
            <p className="text-xs text-slate-400 font-medium">Total Invoiced</p>
          </div>
          <p className="text-xl font-bold text-slate-900">GH₵ {totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-slate-400 mt-1">All time · {allInvoices.length} invoices</p>
        </div>

        {/* Total Collected (All Time) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] text-[#10b981] flex items-center justify-center flex-shrink-0">
              <DollarSign size={20} className="stroke-[2.5]" />
            </div>
            <p className="text-xs text-slate-400 font-medium">Total Collected</p>
          </div>
          <p className="text-xl font-bold text-slate-900">GH₵ {totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {collectionRate.toFixed(0)}% collection rate · {payments.length} payments
          </p>
        </div>

        {/* Total Outstanding (All Time) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#fffbeb] text-[#f59e0b] flex items-center justify-center flex-shrink-0">
              <AlertCircle size={20} className="stroke-[2.5]" />
            </div>
            <p className="text-xs text-slate-400 font-medium">Outstanding Balance</p>
          </div>
          <p className="text-xl font-bold text-slate-900">GH₵ {totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-slate-400 mt-1">{outstandingInvoicesList.length} unpaid invoices</p>
        </div>

        {/* Period Activity Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#f0fdfa] text-[#14b8a6] flex items-center justify-center flex-shrink-0">
              <TrendingUp size={20} className="stroke-[2.5]" />
            </div>
            <p className="text-xs text-slate-400 font-medium">{selectedPeriod} Activity</p>
          </div>
          <p className="text-xl font-bold text-slate-900">GH₵ {periodRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {periodTransactions} payments · {periodInvoices.length} invoices
          </p>
        </div>
      </div>

      {/* 3. Middle Section: Revenue Over Time & Revenue by Payment Method */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Revenue Over Time Bar Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-6 flex flex-col justify-between">
          <h2 className="text-sm font-bold text-slate-900">Revenue Over Time</h2>

          <div className="relative h-64 flex items-end pt-8 pb-4">
            {/* Y-Axis Guide Lines */}
            <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-300">
              <div className="flex items-center gap-2 border-b border-slate-100/80 pb-0.5">
                <span className="w-6 text-right">{maxChartVal}</span>
                <div className="flex-1" />
              </div>
              <div className="flex items-center gap-2 border-b border-slate-100/80 pb-0.5">
                <span className="w-6 text-right">{(maxChartVal * 0.75).toFixed(0)}</span>
                <div className="flex-1" />
              </div>
              <div className="flex items-center gap-2 border-b border-slate-100/80 pb-0.5">
                <span className="w-6 text-right">{(maxChartVal * 0.5).toFixed(0)}</span>
                <div className="flex-1" />
              </div>
              <div className="flex items-center gap-2 border-b border-slate-100/80 pb-0.5">
                <span className="w-6 text-right">{(maxChartVal * 0.25).toFixed(0)}</span>
                <div className="flex-1" />
              </div>
              <div className="flex items-center gap-2 border-b border-slate-100 pb-0.5">
                <span className="w-6 text-right">0</span>
                <div className="flex-1" />
              </div>
            </div>

            {/* Bars */}
            <div className="relative z-10 w-full pl-8 flex items-end justify-between gap-2 sm:gap-4 h-full">
              {chartBars.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                  No payment data available
                </div>
              )}
              {chartBars.map((bar, idx) => {
                const heightPercent = maxChartVal > 0 ? (bar.amount / maxChartVal) * 100 : 0;
                const isHovered = hoveredBar === idx;
                return (
                  <div 
                    key={bar.date}
                    onMouseEnter={() => setHoveredBar(idx)}
                    onMouseLeave={() => setHoveredBar(null)}
                    className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                  >
                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div className="bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg font-bold shadow-lg mb-1 whitespace-nowrap animate-in fade-in">
                        GH₵ {bar.amount.toFixed(2)}
                      </div>
                    )}
                    <div 
                      style={{ height: `${heightPercent}%` }}
                      className="w-full max-w-[28px] bg-[#2563eb] hover:bg-blue-700 rounded-t-md transition-all duration-300 shadow-2xs"
                    />
                    <span className="text-[10px] text-slate-400 mt-2 font-medium whitespace-nowrap">
                      {bar.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Revenue by Payment Method Donut Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4 flex flex-col justify-between">
          <h2 className="text-sm font-bold text-slate-900">Revenue by Payment Method</h2>

          {/* Donut Chart Presentation */}
          <div className="relative flex items-center justify-center py-4">
            <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth="14"
              />
              {/* Cash segment - Blue */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#2563eb"
                strokeWidth="14"
                strokeDasharray={`${cashLine} 238.7`}
                strokeDashoffset="0"
              />
              {/* Mobile Money segment - Teal */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#0d9488"
                strokeWidth="14"
                strokeDasharray={`${momoLine} 238.7`}
                strokeDashoffset={`-${cashLine}`}
              />
              {/* Bank Transfer segment - Orange */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#f59e0b"
                strokeWidth="14"
                strokeDasharray={`${bankLine} 238.7`}
                strokeDashoffset={`-${cashLine + momoLine}`}
              />
              {/* Card segment - Green */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#10b981"
                strokeWidth="14"
                strokeDasharray={`${cardLine} 238.7`}
                strokeDashoffset={`-${cashLine + momoLine + bankLine}`}
              />
            </svg>

            {/* Hover Tooltip Badge at bottom right of donut */}
            <div className="absolute bottom-6 right-16 bg-white/90 backdrop-blur-xs border border-slate-100 shadow-sm rounded-lg px-2 py-0.5 text-[11px] font-bold text-slate-700">
              GH₵ {periodRevenue.toFixed(2)}
            </div>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-600 font-medium flex-wrap pt-2 border-t border-slate-50">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b] inline-block" />
              <span>Bank Transfer</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#10b981] inline-block" />
              <span>Card</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#2563eb] inline-block" />
              <span>Cash</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#0d9488] inline-block" />
              <span>Mobile Money</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Lower Section: Revenue by Service & Invoice Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Revenue by Service */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-5">
          <h2 className="text-sm font-bold text-slate-900">Revenue by Service</h2>

          <div className="space-y-4 text-xs">
            {topServices.length === 0 ? (
              <div className="text-center text-slate-400 py-10">No service revenue data</div>
            ) : (
              topServices.map(service => (
                <div key={service.name} className="space-y-1.5">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-700">{service.name}</span>
                    <span className="font-bold text-slate-900">GH₵ {service.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      style={{ width: `${service.percentage}%` }}
                      className="h-full bg-[#0d9488] rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Invoice Status (2x2 Grid) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Invoice Status</h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Paid */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs space-y-2">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ecfdf5] text-[#10b981]">
                Paid
              </span>
              <p className="text-2xl font-bold text-slate-900">{paidInvoices}</p>
              <p className="text-[11px] text-slate-400 font-medium">invoices</p>
            </div>

            {/* Partially Paid */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs space-y-2">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fffbeb] text-[#f59e0b]">
                Partially Paid
              </span>
              <p className="text-2xl font-bold text-slate-900">{partiallyPaidInvoices}</p>
              <p className="text-[11px] text-slate-400 font-medium">invoices</p>
            </div>

            {/* Unpaid */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs space-y-2">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fef2f2] text-[#ef4444]">
                Unpaid
              </span>
              <p className="text-2xl font-bold text-slate-900">{unpaidInvoices}</p>
              <p className="text-[11px] text-slate-400 font-medium">invoices</p>
            </div>

            {/* Overdue */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs space-y-2">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fff1f2] text-[#f43f5e]">
                Overdue
              </span>
              <p className="text-2xl font-bold text-slate-900">{overdueInvoices}</p>
              <p className="text-[11px] text-slate-400 font-medium">invoices</p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bottom Section: Outstanding Invoices Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Outstanding Invoices</h2>
          <span className="text-xs text-slate-400 font-medium">{outstandingInvoicesList.length} unpaid</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-slate-400 font-medium border-b border-slate-100">
                <th className="pb-3.5 font-medium">Patient</th>
                <th className="pb-3.5 font-medium">Invoice</th>
                <th className="pb-3.5 font-medium">Date</th>
                <th className="pb-3.5 font-medium">Total</th>
                <th className="pb-3.5 font-medium">Paid</th>
                <th className="pb-3.5 font-medium">Balance</th>
                <th className="pb-3.5 font-medium">Due</th>
                <th className="pb-3.5 font-medium">Status</th>
                <th className="pb-3.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {outstandingInvoicesList.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 font-bold text-slate-900 whitespace-nowrap">{inv.patient}</td>
                  <td className="py-3.5 font-mono text-slate-500 whitespace-nowrap">{inv.invoice}</td>
                  <td className="py-3.5 text-slate-600 whitespace-nowrap">{inv.date}</td>
                  <td className="py-3.5 font-semibold text-slate-900 whitespace-nowrap">
                    GH₵ {Number(inv.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 text-slate-600 whitespace-nowrap">
                    GH₵ {Number(inv.paid).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 font-bold text-red-600 whitespace-nowrap">
                    GH₵ {Number(inv.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 text-slate-600 whitespace-nowrap">{inv.due}</td>
                  <td className="py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      inv.status === 'Unpaid' 
                        ? 'bg-[#fef2f2] text-[#ef4444]' 
                        : 'bg-[#fffbeb] text-[#f59e0b]'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => navigate(`/payments?invoiceId=${inv.id || inv.invoice}`)}
                      title="Record Payment"
                      className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition-colors font-medium text-[10px]"
                    >
                      <CreditCard size={13} />
                      Pay
                    </button>
                  </td>
                </tr>
              ))}
              {outstandingInvoicesList.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No outstanding invoices.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        onExport={(selectedMonth) => handleExportExcel(selectedMonth)} 
      />
    </div>
  );
}
