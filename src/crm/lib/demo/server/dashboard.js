import { addDays, initialsOf, monthLabel, PALETTE, todayBangkok } from '../util';
import { db, get, ok } from './core';
import { travelState } from './bookings';

const sumBy = (rows, fn) => rows.reduce((s, r) => s + Number(fn(r) || 0), 0);
const pax = (b) => Number(b.adults || 0) + Number(b.children || 0);
const group = (rows, keyFn, valueFn = () => 0) => {
  const map = new Map();
  rows.forEach((r) => { (Array.isArray(keyFn(r)) ? keyFn(r) : [keyFn(r)]).filter(Boolean).forEach((k) => { const cur = map.get(k) || { name: k, bookings: 0, revenue: 0 }; cur.bookings += 1; cur.revenue += Number(valueFn(r) || 0); map.set(k, cur); }); });
  return [...map.values()].sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings);
};
const colored = (rows) => rows.map((r, i) => ({ ...r, color: PALETTE[i % PALETTE.length] }));

get('/dashboard', ({ query, ctx }) => {
  const today = todayBangkok();
  const month = /^\d{4}-\d{2}$/.test(query.get('month') || '') ? query.get('month') : today.slice(0, 7);
  const year = month.slice(0, 4);
  const agentScope = ctx.user?.role === 'Agent' ? ctx.user.agentId : null;
  const own = (rows) => (agentScope ? rows.filter((r) => r.agentId === agentScope) : rows);
  const queries = own(db().queries); const quotations = own(db().quotations); const bookings = own(db().bookings);
  const inMonth = (iso) => String(iso || '').startsWith(month);

  const mQueries = queries.filter((q) => inMonth(q.queryDate));
  const mQuotations = quotations.filter((q) => inMonth(q.quotationDate));
  const mBookings = bookings.filter((b) => inMonth(b.bookingDate));
  const active = mBookings.filter((b) => b.status !== 'Cancelled');
  const stateCounts = { Confirmed: 0, Upcoming: 0, Traveling: 0, Completed: 0, Cancelled: 0 };
  mBookings.forEach((b) => { if (b.status === 'Confirmed') stateCounts.Confirmed += 1; stateCounts[travelState(b, today)] += 1; });

  const monthly = Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    const bs = bookings.filter((b) => String(b.bookingDate).startsWith(key) && b.status !== 'Cancelled');
    return { month: monthLabel(`${key}-01`), queries: queries.filter((q) => String(q.queryDate).startsWith(key)).length, bookings: bs.length, revenue: sumBy(bs, (b) => b.totalSelling) };
  });
  const years = [...new Set([...queries.map((q) => String(q.queryDate).slice(0, 4)), ...bookings.map((b) => String(b.bookingDate).slice(0, 4)), today.slice(0, 4)])].sort();

  // Calendar events for the selected month
  const events = [];
  bookings.filter((b) => b.status !== 'Cancelled').forEach((b) => {
    const base = { bookingId: b.id, client: b.guestName, pax: pax(b), arrival: b.arrivalDate, departure: b.departureDate, image: undefined };
    if (inMonth(b.arrivalDate)) events.push({ ...base, id: `${b.id}-arr`, date: b.arrivalDate, title: `Arrival – ${b.guestName}`, label: 'Arrival', time: '10:30', type: 'arrival', detail: `${b.destination} · ${pax(b)} pax` });
    if (inMonth(b.departureDate)) events.push({ ...base, id: `${b.id}-dep`, date: b.departureDate, title: `Departure – ${b.guestName}`, label: 'Departure', time: '14:00', type: 'departure', detail: `${b.destination} · ${pax(b)} pax` });
    (b.hotels || []).forEach((h, i) => {
      if (inMonth(h.checkIn)) events.push({ ...base, id: `${b.id}-in-${i}`, date: h.checkIn, title: `Check-in – ${h.name}`, label: 'Check-in', time: '14:00', type: 'checkin', checkIn: h.checkIn, checkOut: h.checkOut, detail: `${b.guestName} · ${b.id}` });
      if (inMonth(h.checkOut)) events.push({ ...base, id: `${b.id}-out-${i}`, date: h.checkOut, title: `Check-out – ${h.name}`, label: 'Check-out', time: '12:00', type: 'checkout', checkIn: h.checkIn, checkOut: h.checkOut, detail: `${b.guestName} · ${b.id}` });
    });
  });
  events.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const upcomingToday = events.length ? [] : [];
  bookings.filter((b) => b.status !== 'Cancelled' && (b.arrivalDate === today || b.departureDate === today)).forEach((b) => upcomingToday.push({ id: `${b.id}-today`, date: today, title: b.arrivalDate === today ? `Arrival – ${b.guestName}` : `Departure – ${b.guestName}`, time: '10:30', bookingId: b.id, detail: b.destination }));

  const recentEnquiries = [...queries].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 6).map((q, i) => ({ id: q.id, initials: initialsOf(q.agentName || q.guestName), name: q.agentName || q.guestName, detail: `${q.queryTitle} · ${q.destination}`, status: q.status, date: q.queryDate, color: PALETTE[i % PALETTE.length] }));

  const scope = active.length ? active : bookings.filter((b) => b.status !== 'Cancelled');
  const topAgents = group(scope, (b) => b.agentName, (b) => b.totalSelling).slice(0, 5).map((a, i) => ({ ...a, initials: initialsOf(a.name), color: PALETTE[i % PALETTE.length] }));
  const topHotels = colored(group(scope, (b) => (b.hotels || []).map((h) => h.name), (b) => b.totalSelling / Math.max(1, (b.hotels || []).length))).slice(0, 5);
  const topSuppliers = colored(group(scope, (b) => [...new Set([...(b.hotels || []), ...(b.services || [])].map((s) => s.supplierName || s.supplier).filter(Boolean))], (b) => b.totalCost / 3)).slice(0, 5);
  const topSightseeing = colored(group(scope, (b) => (b.services || []).filter((s) => s.type === 'Sightseeing').map((s) => s.name), (b) => b.totalSelling / 6)).slice(0, 5);
  const topB2C = colored(group(scope.filter((b) => b.clientType === 'B2C'), (b) => b.guestName, (b) => b.totalSelling)).slice(0, 5);
  const destCounts = group(scope, (b) => b.destinations || String(b.destination || '').split(',').map((x) => x.trim()));
  const destTotal = sumBy(destCounts, (d) => d.bookings) || 1;
  const topDestinations = destCounts.sort((a, b) => b.bookings - a.bookings).slice(0, 6).map((d, i) => ({ name: d.name, bookings: d.bookings, pct: Math.round((d.bookings / destTotal) * 100), color: PALETTE[i % PALETTE.length] }));
  const revenueBreakdown = (() => {
    const t = (k) => sumBy(scope, (b) => [...(b.hotels || []), ...(b.services || [])].filter(k).reduce((s, x) => s + Number(x.totalSellingPrice || x.sellingPrice || 0), 0));
    return [['Hotels', (x) => x.type === 'Hotel' || x.checkIn], ['Transfers', (x) => x.type === 'Transfer'], ['Sightseeing', (x) => x.type === 'Sightseeing'], ['Meals & Others', (x) => !['Hotel', 'Transfer', 'Sightseeing'].includes(x.type) && !x.checkIn]].map(([name, fn], i) => ({ name, value: t(fn), color: PALETTE[i % PALETTE.length] })).filter((x) => x.value > 0);
  })();
  const sources = {}; queries.forEach((q) => { sources[q.leadSource || 'Direct'] = (sources[q.leadSource || 'Direct'] || 0) + 1; });
  const leadSources = Object.entries(sources).map(([name, value], i) => ({ name, value, color: PALETTE[i % PALETTE.length] }));

  return ok({
    summary: {
      totalQueries: mQueries.length, quotations: mQuotations.filter((q) => q.status !== 'Draft').length, confirmedBookings: stateCounts.Confirmed,
      lostQueries: mQueries.filter((q) => q.status === 'Lost').length, totalBookings: mBookings.length, totalPax: sumBy(active, pax), revenue: sumBy(active, (b) => b.totalSelling), bookingStatusCounts: stateCounts,
    },
    availableYears: years, monthly, upcomingToday, calendar: { events }, recentEnquiries, topAgents, topHotels, topSuppliers, topSightseeing, topB2C, topDestinations, revenueBreakdown, leadSources,
  });
});
export { addDays };
