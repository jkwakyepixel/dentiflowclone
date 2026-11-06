import React, { useState } from 'react';
import { X, FileSpreadsheet, Users, Calendar, CheckSquare, Square, Loader2 } from 'lucide-react';

export interface ExportModalConfig {
  scope: 'all' | 'filtered';
  dateFilter: string;
  customStartDate?: string;
  customEndDate?: string;
  includeInvoices: boolean;
  includeClinicalNotes: boolean;
  includePayments: boolean;
  includeAppointments: boolean;
}

export interface ExportPatientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalPatientsCount: number;
  filteredPatientsCount: number;
  isFiltered?: boolean;
  onExport: (config: ExportModalConfig) => Promise<void>;
}

export function ExportPatientsModal({
  isOpen,
  onClose,
  totalPatientsCount,
  filteredPatientsCount,
  isFiltered = false,
  onExport,
}: ExportPatientsModalProps) {
  const [scope, setScope] = useState<'all' | 'filtered'>(isFiltered ? 'filtered' : 'all');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const [includeInvoices, setIncludeInvoices] = useState(true);
  const [includeClinicalNotes, setIncludeClinicalNotes] = useState(true);
  const [includePayments, setIncludePayments] = useState(true);
  const [includeAppointments, setIncludeAppointments] = useState(true);

  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExportClick = async () => {
    try {
      setIsExporting(true);
      await onExport({
        scope,
        dateFilter,
        customStartDate,
        customEndDate,
        includeInvoices,
        includeClinicalNotes,
        includePayments,
        includeAppointments
      });
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0f766e] flex items-center justify-center border border-teal-100 shadow-2xs">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Export Patient Records</h3>
              <p className="text-[11px] text-slate-400">Arranged patient-by-patient with clinical & billing history</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isExporting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-700">
          {/* 1. Patient Scope */}
          <div>
            <label className="block font-bold text-slate-800 mb-2">Patients to Export</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  scope === 'all'
                    ? 'border-blue-600 bg-blue-50/60 text-blue-900 font-semibold shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Users size={14} className={scope === 'all' ? 'text-blue-600' : 'text-slate-400'} />
                  <span>All Patients</span>
                </div>
                <span className="text-[11px] text-slate-400 font-normal mt-1">{totalPatientsCount} registered</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('filtered')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  scope === 'filtered'
                    ? 'border-blue-600 bg-blue-50/60 text-blue-900 font-semibold shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Users size={14} className={scope === 'filtered' ? 'text-blue-600' : 'text-slate-400'} />
                  <span>Current Filter</span>
                </div>
                <span className="text-[11px] text-slate-400 font-normal mt-1">{filteredPatientsCount} matching list</span>
              </button>
            </div>
          </div>

          {/* 2. Date Filter */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-400" />
              <span>Record History Date Range</span>
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full border border-slate-200/90 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs bg-white"
            >
              <option value="All Time">All Time (Complete Historical Records)</option>
              <option value="This Month">This Month</option>
              <option value="Last Month">Last Month</option>
              <option value="This Year">This Year</option>
              <option value="Custom Range">Custom Range</option>
            </select>

            {dateFilter === 'Custom Range' && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="flex-1 bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="flex-1 bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                />
              </div>
            )}
          </div>

          {/* 3. Sub-Records to Include */}
          <div>
            <label className="block font-bold text-slate-800 mb-2">Sections to Include</label>
            <div className="grid grid-cols-2 gap-2">
              <label 
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setIncludeClinicalNotes(!includeClinicalNotes)}
              >
                {includeClinicalNotes ? (
                  <CheckSquare size={16} className="text-amber-600 flex-shrink-0" />
                ) : (
                  <Square size={16} className="text-slate-300 flex-shrink-0" />
                )}
                <span className="text-xs font-medium text-slate-700">Clinical Notes</span>
              </label>

              <label 
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setIncludeInvoices(!includeInvoices)}
              >
                {includeInvoices ? (
                  <CheckSquare size={16} className="text-indigo-600 flex-shrink-0" />
                ) : (
                  <Square size={16} className="text-slate-300 flex-shrink-0" />
                )}
                <span className="text-xs font-medium text-slate-700">Invoices & Services</span>
              </label>

              <label 
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setIncludePayments(!includePayments)}
              >
                {includePayments ? (
                  <CheckSquare size={16} className="text-emerald-600 flex-shrink-0" />
                ) : (
                  <Square size={16} className="text-slate-300 flex-shrink-0" />
                )}
                <span className="text-xs font-medium text-slate-700">Payment Receipts</span>
              </label>

              <label 
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setIncludeAppointments(!includeAppointments)}
              >
                {includeAppointments ? (
                  <CheckSquare size={16} className="text-sky-600 flex-shrink-0" />
                ) : (
                  <Square size={16} className="text-slate-300 flex-shrink-0" />
                )}
                <span className="text-xs font-medium text-slate-700">Visits / Appointments</span>
              </label>
            </div>
          </div>

          {/* Feature Badge / Info Banner */}
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1">
            <p className="text-[11px] font-semibold text-blue-900 flex items-center gap-1.5">
              <span>Arranged Patient by Patient</span>
            </p>
            <p className="text-[10px] text-blue-700 leading-relaxed">
              Generates a master workbook with a detailed Dossier sheet arranged patient-by-patient, plus individual tabular sheets for fast searching and filtering.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 flex items-center justify-end gap-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExportClick}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 bg-[#0f766e] hover:bg-[#115e59] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition-colors disabled:opacity-60"
          >
            {isExporting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Generating Excel...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet size={15} />
                <span>Export Patient Records</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
