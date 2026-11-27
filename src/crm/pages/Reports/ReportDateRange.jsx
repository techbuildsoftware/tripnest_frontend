import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { formatDate } from '../../lib/date';

const isoFromDisplayDate = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const display = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!display) return null;
  const [, day, month, year] = display;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return parsed.getUTCFullYear() === Number(year)
    && parsed.getUTCMonth() === Number(month) - 1
    && parsed.getUTCDate() === Number(day)
    ? `${year}-${month}-${day}`
    : null;
};

export function ReportDateInput({ value, onChange, label, placeholder = 'DD-MM-YYYY' }) {
  const pickerRef = useRef(null);
  const [draft, setDraft] = useState(value ? formatDate(value, '') : '');
  useEffect(() => { setDraft(value ? formatDate(value, '') : ''); }, [value]);

  const commit = () => {
    const parsed = isoFromDisplayDate(draft);
    if (parsed === null) { setDraft(value ? formatDate(value, '') : ''); return; }
    onChange(parsed);
  };

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.click();
  };

  return (
    <div className="relative min-w-0 flex-1 flex items-center">
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          const parsed = isoFromDisplayDate(next);
          if (parsed) onChange(parsed);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
        }}
        placeholder={placeholder}
        maxLength={10}
        className="h-7 w-full bg-transparent pr-4.5 pl-0.5 text-[11px] font-medium tracking-tight outline-none text-slate-700 placeholder:text-slate-400 tabular-nums"
        aria-label={label}
      />
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={openPicker}
        className="absolute right-0 top-1/2 -translate-y-1/2 grid h-5 w-4 place-items-center text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
        title="Choose date"
      >
        <CalendarDays size={12} />
      </button>
      <input
        ref={pickerRef}
        type="date"
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
    </div>
  );
}

export default function ReportDateRange({ from, to, onChange, className = '' }) {
  const hasValue = Boolean(from || to);

  const clearRange = (e) => {
    e.stopPropagation();
    onChange('from', '');
    onChange('to', '');
  };

  return (
    <div
      className={`group flex h-8 items-center gap-1.5 rounded-[0.45rem] border border-slate-200/90 bg-white px-2.5 text-slate-700 shadow-2xs hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all w-full min-w-[215px] ${className}`}
    >
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <ReportDateInput
          value={from}
          onChange={(value) => onChange('from', value)}
          label="Travel date from in DD-MM-YYYY format"
          placeholder="DD-MM-YYYY"
        />
        <span className="text-slate-300 text-xs font-semibold select-none">–</span>
        <ReportDateInput
          value={to}
          onChange={(value) => onChange('to', value)}
          label="Travel date to in DD-MM-YYYY format"
          placeholder="DD-MM-YYYY"
        />
      </div>

      {hasValue && (
        <button
          type="button"
          onClick={clearRange}
          className="ml-0.5 text-slate-300 hover:text-slate-500 transition-colors p-0.5 rounded cursor-pointer"
          title="Clear date range"
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
}
