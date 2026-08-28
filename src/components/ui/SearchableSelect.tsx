import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface Option {
  value: string;
  label: string;
  category?: string;
  price?: number;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onAddCustom?: () => void;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  onAddCustom,
  className,
  disabled = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opt.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group options by category if available
  const groupedOptions = filteredOptions.reduce((acc, opt) => {
    const cat = opt.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(opt);
    return acc;
  }, {} as Record<string, Option[]>);

  const hasCategories = Object.keys(groupedOptions).some(c => c !== 'Other');

  return (
    <div className={twMerge('relative', className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "w-full flex items-center justify-between border border-slate-200 rounded-xl p-2.5 bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm",
          disabled && "opacity-50 cursor-not-allowed",
          !selectedOption && "text-slate-400"
        )}
      >
        <span className="truncate pr-4">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className="text-slate-400 shrink-0" />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-80 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <Search size={14} className="text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              autoFocus
              className="w-full text-sm outline-none placeholder:text-slate-400"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">
                No results found
              </div>
            ) : hasCategories ? (
              Object.entries(groupedOptions).map(([cat, opts]) => (
                <div key={cat} className="mb-2 last:mb-0">
                  <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                    {cat}
                  </div>
                  {opts.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                      className={clsx(
                        "w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between group transition-colors",
                        value === opt.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {opt.price !== undefined && (
                        <span className="text-xs text-slate-400 group-hover:text-slate-500">GH₵ {opt.price}</span>
                      )}
                      {value === opt.value && <Check size={14} className="text-blue-600 shrink-0 ml-2" />}
                    </button>
                  ))}
                </div>
              ))
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={clsx(
                    "w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between group transition-colors",
                    value === opt.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.price !== undefined && (
                    <span className="text-xs text-slate-400 group-hover:text-slate-500">GH₵ {opt.price}</span>
                  )}
                  {value === opt.value && <Check size={14} className="text-blue-600 shrink-0 ml-2" />}
                </button>
              ))
            )}
          </div>

          {onAddCustom && (
            <div className="p-1 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  onAddCustom();
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg flex items-center gap-2 font-medium transition-colors"
              >
                <Plus size={14} />
                <span>Add Custom Service</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
