import { useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { formatDate } from '../../lib/date';

const isoFromDisplayDate = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const display = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!display) return null;
  const [, day, month, year] = display;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day)
    ? `${year}-${month}-${day}`
    : null;
};

const isWithinBounds = (date, min, max) => (
  Boolean(date)
  && (!min || date >= min)
  && (!max || date <= max)
);

/**
 * Stores calendar dates as ISO strings while consistently displaying them as
 * DD-MM-YYYY. The invisible native control retains the normal calendar picker.
 */
export default function DateInput({
  value,
  onChange,
  min,
  max,
  className = 'form-input',
  compact = false,
  disabled = false,
  ariaLabel = 'Date in DD-MM-YYYY format',
}) {
  const pickerRef = useRef(null);
  const useNativeMobilePicker = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const [draftState, setDraftState] = useState(() => ({
    value,
    draft: value ? formatDate(value, '') : '',
  }));
  // Derive a replacement draft when a parent updates the saved ISO date.
  // This avoids a synchronizing effect and the extra render it would cause.
  const draft = draftState.value === value
    ? draftState.draft
    : (value ? formatDate(value, '') : '');
  const setDraft = (next) => setDraftState({ value, draft: next });
  const restoreSavedDate = () => setDraftState({ value, draft: value ? formatDate(value, '') : '' });
  const commit = () => {
    const parsed = isoFromDisplayDate(draft);
    if (parsed === '') {
      onChange('');
      return;
    }
    if (!isWithinBounds(parsed, min, max)) {
      restoreSavedDate();
      return;
    }
    if (parsed === null) {
      restoreSavedDate();
      return;
    }
    onChange(parsed);
  };

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker || disabled) return;
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.click();
  };
  const calendarValue = isoFromDisplayDate(value) || '';
  const calendarMin = isoFromDisplayDate(min) || undefined;
  const calendarMax = isoFromDisplayDate(max) || undefined;

  return (
    <div className="w-full">
      {/* Mobile Safari and several Android browsers block a picker opened from
          an invisible input. A real native field keeps the calendar usable. */}
      <input
        type="date"
        value={calendarValue}
        min={calendarMin}
        max={calendarMax}
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(formatDate(next, ''));
          onChange(next);
        }}
        className={`${className} w-full ${useNativeMobilePicker ? 'block' : 'hidden'}`}
        aria-label={ariaLabel}
      />
      <div className={`relative w-full ${useNativeMobilePicker ? 'hidden' : 'block'}`}>
        <input
          type="text"
          inputMode="numeric"
          value={draft}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            const parsed = isoFromDisplayDate(next);
            if (isWithinBounds(parsed, min, max)) onChange(parsed);
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
          }}
          placeholder="DD-MM-YYYY"
          maxLength={10}
          className={`${className}${compact ? ' pr-6' : ' pr-9'}`}
          aria-label={ariaLabel}
        />
        <button
          type="button"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={openPicker}
          className={`absolute inset-y-0 right-0 grid ${compact ? 'w-6' : 'w-9'} place-items-center text-slate-500 hover:text-primary-600 disabled:cursor-not-allowed disabled:text-slate-300`}
          title="Choose date"
        >
          <CalendarDays className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </button>
        <input
          ref={pickerRef}
          type="date"
          value={calendarValue}
          min={calendarMin}
          max={calendarMax}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(formatDate(next, ''));
            onChange(next);
          }}
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute h-px w-px opacity-0"
        />
      </div>
    </div>
  );
}

