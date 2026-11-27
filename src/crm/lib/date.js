const pad = (value) => String(value).padStart(2, '0');
const DEFAULT_TIME_ZONE = 'Asia/Bangkok';
let displayTimeZone = DEFAULT_TIME_ZONE;

export function getDisplayTimeZone() {
  return displayTimeZone;
}

export function setDisplayTimeZone(timeZone) {
  if (['Asia/Bangkok', 'Asia/Kolkata'].includes(timeZone)) displayTimeZone = timeZone;
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const str = String(value).trim();
  const ddmmyyyyMatch = str.match(/^(\d{2})-(\d{2})-(\d{4})(.*)$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year, rest] = ddmmyyyyMatch;
    const isoCandidate = `${year}-${month}-${day}${rest ? (rest.startsWith(' ') ? 'T' + rest.trim() : rest) : 'T00:00:00Z'}`;
    const d = new Date(isoCandidate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

const formatterParts = (value, options = {}) => {
  const date = parseDate(value);
  if (!date) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: displayTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options,
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value: part }) => [type, part]));
};

/**
 * Returns a calendar date for the CRM's operating timezone without converting
 * it through UTC.  `Date#toISOString()` can otherwise turn a newly-created
 * India/Thailand query into the previous day late in the evening.
 */
export function todayIsoInTimeZone(timeZone = displayTimeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
}

/** Display dates consistently in the CRM as DD-MM-YYYY. */
export function formatDate(value, fallback = '—') {
  if (!value) return fallback;
  const serialized = String(value);
  // Date-only values are business calendar dates (check-in, travel date,
  // contracts), not instants. Preserve them exactly in every timezone.
  const raw = serialized.slice(0, 10);
  const alreadyFormatted = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (alreadyFormatted) return raw;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match && !serialized.includes('T')) return `${match[3]}-${match[2]}-${match[1]}`;
  const parts = formatterParts(value);
  return parts ? `${parts.day}-${parts.month}-${parts.year}` : fallback;
}

/** Display a calendar date with its weekday without shifting the stored date. */
export function formatDateWithDay(value, fallback = '—') {
  const formatted = formatDate(value, fallback);
  if (formatted === fallback) return fallback;
  if (String(value).includes('T')) {
    const date = parseDate(value);
    if (!date) return formatted;
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: displayTimeZone }).format(date);
    return `${formatted} · ${weekday}`;
  }
  const match = formatted.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return formatted;
  const calendarDate = new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00Z`);
  if (Number.isNaN(calendarDate.getTime())) return formatted;
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(calendarDate);
  return `${formatted} · ${weekday}`;
}

/** Display timestamp as DD-MM-YYYY hh:mm AM/PM. Falls back to date-only if no time was provided. */
export function formatDateTime(value, fallback = '—') {
  if (!value) return fallback;
  const serialized = String(value).trim();
  const hasTime = serialized.includes('T') || serialized.includes(':') || (value instanceof Date) || typeof value === 'number';
  const parts = formatterParts(value, { hour: '2-digit', minute: '2-digit', hour12: true });
  if (!parts) return fallback;
  const period = (parts.dayPeriod || '').toUpperCase();
  const time = period ? `${parts.hour}:${parts.minute} ${period}` : `${parts.hour}:${parts.minute}`;
  if (!hasTime) return `${parts.day}-${parts.month}-${parts.year}`;
  return `${parts.day}-${parts.month}-${parts.year} ${time}`.trim();
}

/** Check if a date string, ISO timestamp, or date instance matches today's calendar date across local and operating timezones. */
export function isTodayDate(value) {
  if (!value) return false;
  const now = new Date();
  const localTodayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const localTodayFormatted = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;

  const displayTodayIso = todayIsoInTimeZone();
  const displayTodayFormatted = formatDate(displayTodayIso);

  const formatted = formatDate(value);
  if (formatted === localTodayFormatted || formatted === displayTodayFormatted) return true;

  const serialized = String(value).trim();
  const raw = serialized.slice(0, 10);

  if (raw === localTodayIso || raw === localTodayFormatted) return true;
  if (raw === displayTodayIso || raw === displayTodayFormatted) return true;

  return false;
}
