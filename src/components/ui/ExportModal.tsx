import React, { useState } from 'react';
import { X, FileSpreadsheet } from 'lucide-react';
import { format, subMonths } from 'date-fns';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (selectedMonth: string) => void;
}

export function ExportModal({ isOpen, onClose, onExport }: ExportModalProps) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  if (!isOpen) return null;

  // Generate last 12 months for the dropdown
  const monthOptions = [{ label: 'All Time', value: '' }];
  for (let i = 0; i < 12; i++) {
    const d = subMonths(new Date(), i);
    monthOptions.push({
      label: format(d, 'MMMM yyyy'),
      value: format(d, 'yyyy-MM')
    });
  }

  const handleExport = () => {
    onExport(selectedMonth);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-[#0f766e]" />
            Export Financial Report
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <p className="text-slate-500">
            Select the month for the financial report. A beautifully formatted Excel sheet will be generated.
          </p>
          <div>
            <label className="block font-medium text-slate-700 mb-1 text-xs">Select Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e] bg-white"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-5 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0f766e] hover:bg-[#115e59] rounded-xl shadow-xs transition-colors"
          >
            Generate Excel
          </button>
        </div>
      </div>
    </div>
  );
}
