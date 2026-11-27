import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../lib/api';
import ReportDateRange from './ReportDateRange.jsx';

const EMPTY_FILTERS = {
  from: '', to: '', agent: 'All', destination: 'All', branch: 'All', status: 'All',
  salesPerson: 'All', currency: 'All', clientType: 'All', serviceType: 'All', supplier: 'All',
  nationality: 'All', travelType: 'All', groupBy: 'Date',
};

const value = (item, key) => Number(item?.[key] || 0);
const sum = (items, key) => items.reduce((total, item) => total + value(item, key), 0);
const totalPax = (items) => sum(items, 'pax');
const title = (isoDate) => {
  if (!isoDate) return 'Unknown';
  try {
    const str = String(isoDate).trim();
    const isoClean = str.includes('T') ? str : `${str.slice(0, 10)}T00:00:00`;
    const d = new Date(isoClean);
    if (isNaN(d.getTime())) {
      const fallback = new Date(str);
      if (isNaN(fallback.getTime())) return str;
      return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(fallback);
    }
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(d);
  } catch {
    return String(isoDate);
  }
};
const group = (rows, key) => Object.values(rows.reduce((groups, row) => {
  const name = typeof key === 'function' ? key(row) : row[key];
  if (!name) return groups;
  groups[name] ||= { name, bookings: 0, pax: 0, revenue: 0, cost: 0, profit: 0, lastBooking: '' };
  const item = groups[name];
  item.bookings += 1; item.pax += value(row, 'pax'); item.revenue += value(row, 'revenue'); item.cost += value(row, 'cost'); item.profit += value(row, 'profit');
  item.lastBooking = !item.lastBooking || row.date > item.lastBooking ? row.date : item.lastBooking;
  return groups;
}, {})).map((item) => ({ ...item, margin: item.revenue ? Number(((item.profit / item.revenue) * 100).toFixed(1)) : 0, avgBooking: item.bookings ? Math.round(item.revenue / item.bookings) : 0 }))
  .sort((left, right) => right.revenue - left.revenue);

export function reportSummary(rows = []) {
  const revenue = sum(rows, 'revenue');
  const cost = sum(rows, 'cost');
  const profit = sum(rows, 'profit');
  const trends = Object.values(rows.reduce((items, row) => {
    const date = row.date || 'Unknown';
    items[date] ||= { date: title(row.date), key: date, sales: 0, cost: 0, profit: 0, bookings: 0, pax: 0 };
    items[date].sales += value(row, 'revenue'); items[date].cost += value(row, 'cost'); items[date].profit += value(row, 'profit'); items[date].bookings += 1; items[date].pax += value(row, 'pax');
    return items;
  }, {})).sort((left, right) => left.key.localeCompare(right.key));
  const destinations = group(rows, 'destination');
  const agents = group(rows, 'agent');
  const serviceRows = group(rows.flatMap((row) => (row.serviceTypes?.length ? row.serviceTypes : ['Package']).map((service) => ({ ...row, service }))), 'service');
  return {
    totals: { revenue, cost, profit, bookings: rows.length, pax: totalPax(rows), margin: revenue ? Number(((profit / revenue) * 100).toFixed(1)) : 0, averageBooking: rows.length ? Math.round(revenue / rows.length) : 0 },
    trends, destinations, agents, serviceRows,
  };
}

export function trendByDimension(rows = [], dimension, names = []) {
  const byDate = new Map();
  rows.forEach((row) => {
    const key = row.date || 'Unknown';
    if (!byDate.has(key)) byDate.set(key, { date: title(row.date), key });
    const item = byDate.get(key);
    names.forEach((name, index) => {
      if (row[dimension] === name) item[`series${index}`] = (item[`series${index}`] || 0) + value(row, 'revenue');
    });
  });
  return [...byDate.values()].sort((left, right) => left.key.localeCompare(right.key));
}

export function useBusinessReport(initialValues = {}) {
  // Dashboard drill-downs arrive with a precise entity in the URL. Initialise
  // the shared report hook from it so every chart, table and total uses the
  // same server-side scope instead of loading all records first.
  const initialKey = JSON.stringify(initialValues || {});
  const initialFilters = useMemo(() => ({ ...EMPTY_FILTERS, ...(initialValues || {}) }), [initialKey]);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [payload, setPayload] = useState({ rows: [], filterOptions: {}, ledger: { rows: [], payments: [], invoices: [], totals: {} } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (nextFilters = EMPTY_FILTERS) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams(Object.entries(nextFilters).filter(([, current]) => current && current !== 'All'));
      const response = await apiClient.get(`/reports/business${params.size ? `?${params.toString()}` : ''}`);
      setPayload(response.data || { rows: [], filterOptions: {}, ledger: { rows: [], payments: [], invoices: [], totals: {} } });
    } catch (requestError) {
      setError(requestError.message || 'Unable to load the live report.');
      setPayload({ rows: [], filterOptions: {}, ledger: { rows: [], payments: [], invoices: [], totals: {} } });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    load(initialFilters);
  }, [initialKey, initialFilters, load]);
  const generate = () => { setAppliedFilters(filters); load(filters); };
  const reset = () => { setFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); load(EMPTY_FILTERS); };
  const updateFilter = (key, current) => setFilters((previous) => ({ ...previous, [key]: current }));
  const summary = useMemo(() => reportSummary(payload.rows), [payload.rows]);
  return {
    filters, updateFilter, generate, reset, loading, error, rows: payload.rows || [],
    options: payload.filterOptions || {}, ledger: payload.ledger || { rows: [], payments: [], invoices: [], totals: {} },
    summary, appliedFilters,
  };
}

// All live report screens use the same travel-date contract. Keeping the
// controls here prevents a report from showing a static date label that never
// reaches the backend.
export const TravelDateRange = ReportDateRange;

export const dateLabel = (value) => {
  if (!value) return '—';
  try {
    const str = String(value).trim();
    const isoClean = str.includes('T') ? str : `${str.slice(0, 10)}T00:00:00`;
    const d = new Date(isoClean);
    if (isNaN(d.getTime())) {
      const fallback = new Date(str);
      if (isNaN(fallback.getTime())) return str || '—';
      return new Intl.DateTimeFormat('en-GB').format(fallback);
    }
    return new Intl.DateTimeFormat('en-GB').format(d);
  } catch {
    return String(value || '—');
  }
};
export const money = (amount) => `THB ${Number(amount || 0).toLocaleString()}`;
