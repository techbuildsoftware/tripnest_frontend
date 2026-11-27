// Small shared helpers for the in-browser demo data engine.

export const todayBangkok = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const v = Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
  return `${v.year}-${v.month}-${v.day}`;
};

export const addDays = (iso, n) => {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(n || 0));
  return d.toISOString().slice(0, 10);
};

export const daysBetween = (from, to) => {
  if (!from || !to) return 0;
  return Math.round((new Date(`${String(to).slice(0, 10)}T00:00:00Z`) - new Date(`${String(from).slice(0, 10)}T00:00:00Z`)) / 86400000);
};

export const nowIso = () => new Date().toISOString();

export const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

let counter = 0;
export const uid = (prefix = 'id') => {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
};

export const pad = (n, size = 3) => String(n).padStart(size, '0');

export const roundMoney = (v) => Math.round(Number(v || 0));
export const num = (v) => Number(v || 0);

export const monthLabel = (iso) => new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(`${iso.slice(0, 7)}-01T00:00:00Z`));

export const initialsOf = (name = '') => String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'NA';

export const PALETTE = ['#1d6fe8', '#7c3aed', '#16a34a', '#f59e0b', '#ef4444', '#0891b2', '#db2777', '#4f46e5'];
