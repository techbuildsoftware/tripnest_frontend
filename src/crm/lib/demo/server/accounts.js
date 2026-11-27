import { addDays, clone, todayBangkok } from '../util';
import { accountLedger, bookingInvoicePaymentState, bookingPaymentLines, linePaymentState } from '../../bookingPayments';
import { crud, db, del, get, listResponse, notFound, ok, save, searchRecords, sortRecords } from './core';
import { travelState } from './bookings';

const num = (v) => Number(v || 0);
const isAgent = (ctx) => ctx?.user?.role === 'Agent';
const scoped = (ctx) => (isAgent(ctx) ? db().bookings.filter((b) => b.agentId === ctx.user.agentId) : db().bookings);

export const invoiceFromBooking = (b, today = todayBangkok()) => {
  const state = bookingInvoicePaymentState(b);
  const due = b.invoiceSettings?.dueDate || b.paymentDeadline || b.arrivalDate;
  let status = 'Sent';
  if (b.status === 'Cancelled') status = 'Cancelled';
  else if (state.total > 0 && state.paid >= state.total) status = 'Paid';
  else if (due && due < today) status = 'Overdue';
  else if (state.paid > 0) status = 'Part Paid';
  return {
    id: `INV-${b.id}`, type: 'Booking', bookingId: b.id, booking: b.id, agent: b.agentName || 'Direct client', guest: b.guestName, date: b.invoiceSettings?.invoiceCreatedAt || b.bookingDate, due,
    amount: state.total, paid: state.paid, balance: state.remaining, status, currency: b.currency || 'THB',
    services: bookingPaymentLines(b).map((l) => ({ desc: l.name, date: l.checkIn || l.item?.serviceDate || b.arrivalDate, sell: l.totalSelling })),
    subtotal: state.baseAmount, discount: state.discount, tax: state.taxAmount, bankCharges: state.bankCharges,
  };
};

get('/accounts/booking-invoices', ({ query, ctx }) => {
  const today = todayBangkok();
  let rows = scoped(ctx).filter((b) => b.invoiceSettings?.invoiceCreatedAt).map((b) => invoiceFromBooking(b, today));
  const agents = [...new Set(rows.map((r) => r.agent))].sort();
  const agent = query.get('agent'); const status = query.get('status');
  if (agent && agent !== 'All') rows = rows.filter((r) => r.agent === agent);
  if (query.get('fromDate')) rows = rows.filter((r) => r.date >= query.get('fromDate'));
  if (query.get('toDate')) rows = rows.filter((r) => r.date <= query.get('toDate'));
  rows = searchRecords(rows, query.get('search'));
  const summary = { totalInvoiced: rows.reduce((s, r) => s + (r.status === 'Cancelled' ? 0 : r.amount), 0), totalReceived: rows.reduce((s, r) => s + r.paid, 0), totalOutstanding: rows.reduce((s, r) => s + (r.status === 'Cancelled' ? 0 : r.balance), 0), invoiceCount: rows.length };
  if (status && status !== 'All') rows = rows.filter((r) => r.status === status);
  rows = sortRecords(rows, query.get('sortBy') || 'date', query.get('sortDir') || 'desc');
  const limit = Number(query.get('limit')) || rows.length || 1; const page = Math.max(1, Number(query.get('page')) || 1);
  const total = rows.length;
  return { data: clone(rows.slice((page - 1) * limit, page * limit)), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }, filterOptions: { agents }, summary };
});
get('/accounts/booking-invoice-options', ({ ctx }) => ok(clone(scoped(ctx).filter((b) => !b.invoiceSettings?.invoiceCreatedAt && b.status !== 'Cancelled'))));
get('/accounts/proforma-quotation-options', ({ ctx }) => ok(clone((isAgent(ctx) ? db().quotations.filter((q) => q.agentId === ctx.user.agentId) : db().quotations).filter((q) => q.status !== 'Cancelled'))));
del('/accounts/booking-invoices/:bookingId', ({ params }) => {
  const b = db().bookings.find((x) => x.id === params.bookingId);
  if (!b) throw notFound('Booking');
  b.invoiceSettings = { ...(b.invoiceSettings || {}), invoiceCreatedAt: '' }; save();
  return ok({ id: b.id });
});
crud('/accounts/proforma-invoices', 'proformas', { prefix: 'PRO-', pad: 4, defaults: { status: 'Draft' }, sortBy: 'createdAt', sortDir: 'desc' });

get('/accounts/supplier-payment-planner', ({ ctx }) => {
  const today = todayBangkok();
  const bookings = scoped(ctx).filter((b) => b.status !== 'Cancelled');
  const payments = [];
  bookings.forEach((b) => bookingPaymentLines(b).forEach((line) => {
    const st = linePaymentState(b, line);
    if (st.supplierRemaining <= 0) return;
    const sched = (b.paymentSchedules || []).find((s) => s.type === 'Supplier Payment' && s.lineId === line.key && s.status !== 'Paid');
    const dueDate = sched?.dueDate || line.dueDate || b.arrivalDate;
    const priority = dueDate < today ? 'OVERDUE' : dueDate === today ? 'DUE TODAY' : dueDate <= addDays(today, 3) ? 'HIGH' : dueDate <= addDays(today, 7) ? 'MEDIUM' : 'SCHEDULED';
    payments.push({ bookingId: b.id, key: line.key, scheduleId: sched?.id || '', scheduled: Boolean(sched), plannedAmount: sched ? num(sched.amount) : st.supplierRemaining, supplier: line.supplier, type: line.type, name: line.name, guestName: b.guestName, supplierPaid: st.supplierPaid, totalCost: line.totalCost, supplierRemaining: st.supplierRemaining, priority, dueDate });
  }));
  payments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const byDate = new Map();
  payments.forEach((p) => { const cur = byDate.get(p.dueDate) || { date: p.dueDate, count: 0, amount: 0 }; cur.count += 1; cur.amount += p.plannedAmount; byDate.set(p.dueDate, cur); });
  const within = (days) => payments.filter((p) => p.dueDate >= today && p.dueDate <= addDays(today, days)).reduce((s, p) => s + p.plannedAmount, 0);
  const ledger = accountLedger(bookings);
  const received = ledger.totals.clientReceived; const paid = ledger.totals.supplierPaid;
  return ok({
    payments, schedule: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    totals: { dueToday: payments.filter((p) => p.dueDate === today).reduce((s, p) => s + p.plannedAmount, 0), next3Days: within(3), next7Days: within(7), overdue: payments.filter((p) => p.dueDate < today).reduce((s, p) => s + p.plannedAmount, 0), totalOutstanding: payments.reduce((s, p) => s + p.supplierRemaining, 0) },
    cash: { clientReceived: received, supplierPaid: paid, cashPosition: received - paid, availableToPay: Math.max(0, received - paid) },
  });
});

// ── Business report ─────────────────────────────────────────────────────────
get('/reports/business', ({ query, ctx }) => {
  const all = scoped(ctx);
  const rowOf = (b) => {
    const lines = [...(b.hotels || []), ...(b.services || [])];
    return {
      id: b.id, booking: b.id, bookingId: b.id, date: b.bookingDate, travelDate: b.arrivalDate, agent: b.agentName || 'Direct client', client: b.guestName, guestName: b.guestName, destination: b.destination, branch: 'Head Office',
      status: b.status === 'Cancelled' ? 'Cancelled' : travelState(b), salesPerson: b.salesPerson || 'BuildSoftware', currency: b.currency || 'THB', clientType: b.clientType || 'Agent', pax: num(b.adults) + num(b.children),
      revenue: num(b.totalSelling), cost: num(b.totalCost), profit: num(b.profit), serviceTypes: [...new Set(lines.map((l) => (l.checkIn || l.type === 'Hotel' ? 'Hotel' : l.type)).filter(Boolean))],
      suppliers: [...new Set(lines.map((l) => l.supplierName || l.supplier).filter(Boolean))],
      guests: (b.guests || []).map((g) => ({ name: g.name, nationality: g.nationality || 'Indian', passport: g.passport || '', email: g.email || b.guestEmail || '', phone: g.phone || '', travelType: g.travelType || 'Leisure' })),
    };
  };
  let rows = all.map((b) => ({ b, r: rowOf(b) }));
  const filterOptions = {};
  const uniq = (fn) => [...new Set(rows.map(({ r }) => fn(r)).flat().filter(Boolean))].sort();
  Object.assign(filterOptions, { agents: uniq((r) => r.agent), destinations: uniq((r) => r.destination.split(',').map((x) => x.trim())), branches: uniq((r) => r.branch), statuses: uniq((r) => r.status), salesPeople: uniq((r) => r.salesPerson), currencies: uniq((r) => r.currency), clientTypes: uniq((r) => r.clientType), serviceTypes: uniq((r) => r.serviceTypes), suppliers: uniq((r) => r.suppliers) });
  const has = (k) => query.get(k) && query.get(k) !== 'All';
  rows = rows.filter(({ r }) => (!query.get('from') || r.date >= query.get('from')) && (!query.get('to') || r.date <= query.get('to'))
    && (!has('agent') || r.agent === query.get('agent')) && (!has('destination') || r.destination.includes(query.get('destination'))) && (!has('branch') || r.branch === query.get('branch'))
    && (!has('status') || r.status === query.get('status')) && (!has('salesPerson') || r.salesPerson === query.get('salesPerson')) && (!has('currency') || r.currency === query.get('currency'))
    && (!has('clientType') || r.clientType === query.get('clientType')) && (!has('serviceType') || r.serviceTypes.includes(query.get('serviceType'))) && (!has('supplier') || r.suppliers.includes(query.get('supplier')))
    && (!has('nationality') || r.guests.some((g) => g.nationality === query.get('nationality'))) && (!has('travelType') || r.guests.some((g) => g.travelType === query.get('travelType'))));
  const bookings = rows.map(({ b }) => b);
  const ledger = accountLedger(bookings);
  const byId = Object.fromEntries(rows.map(({ r }) => [r.bookingId, r]));
  const ledgerRows = ledger.rows.map((row) => ({ ...row, destination: byId[row.bookingId]?.destination, bookingTravelDate: byId[row.bookingId]?.travelDate, travelDate: byId[row.bookingId]?.travelDate }));
  const invoices = bookings.map((b) => invoiceFromBooking(b)).map((i) => ({ bookingId: i.bookingId, guestName: i.guest, agentName: i.agent, travelDate: byId[i.bookingId]?.travelDate, total: i.amount, paid: i.paid, remaining: i.balance, status: i.status, date: i.date }));
  return ok({ rows: rows.map(({ r }) => r), filterOptions, ledger: { rows: ledgerRows, payments: ledger.payments, invoices, totals: ledger.totals } });
});
