import { addDays, clone, daysBetween, nowIso, todayBangkok } from '../util';
import { quotationToBooking } from '../seedRecords';
import { ApiError, crud, db, get, helpers, nextId, notFound, ok, post, save } from './core';
import { bookingPaymentLines, bookingInvoicePaymentState } from '../../bookingPayments';

const isAgent = (ctx) => ctx?.user?.role === 'Agent';

export const travelState = (b, today = todayBangkok()) => {
  if (b.status === 'Cancelled') return 'Cancelled';
  const arrival = b.arrivalDate || b.travelDate; const departure = b.departureDate || b.endDate || arrival;
  if (arrival && arrival > today) return 'Upcoming';
  if (departure && departure < today) return 'Completed';
  return 'Traveling';
};

const freshBookingFromQuotation = (quotation, id) => {
  const today = todayBangkok();
  const booking = quotationToBooking(quotation, { id, bookingDate: today, stamp: null, startOffset: 0, agents: db().agents, b2c: db().b2c, users: db().users });
  booking.payments = []; booking.paidAmount = 0; booking.balanceDue = booking.totalSelling; booking.paymentStatus = 'Pending';
  [...booking.hotels, ...booking.services].forEach((s) => { s.payStatus = 'Pending'; delete s.paid; });
  booking.createdAt = nowIso(); booking.updatedAt = nowIso();
  booking.activityLog = [{ date: nowIso(), action: `Booking created from quotation ${quotation.id}`, user: 'Admin User' }];
  booking.invoiceSettings = { ...booking.invoiceSettings };
  return booking;
};

helpers.createBookingFromQuotation = (quotation) => {
  const existing = db().bookings.find((b) => b.id === quotation.bookingId);
  if (existing) return existing;
  const id = nextId(db().bookings, 'BK-2026-', 3, 100);
  const booking = freshBookingFromQuotation(quotation, id);
  db().bookings.unshift(booking);
  quotation.bookingId = id; quotation.status = 'Confirmed'; quotation.acceptedVersion = quotation.version; quotation.acceptedAt = todayBangkok();
  const query = db().queries.find((q) => q.id === quotation.queryId);
  if (query) query.status = 'Confirmed';
  db().notifications.unshift({ id: nextId(db().notifications, 'NTF-', 3), title: 'Booking confirmed', message: `${id} was created from quotation ${quotation.id}.`, type: 'success', read: false, time: 'Just now' });
  return booking;
};

// Re-sync an existing booking with an accepted quotation revision, keeping money history.
helpers.syncBooking = (quotation) => {
  const booking = db().bookings.find((b) => b.id === quotation.bookingId);
  if (!booking) return null;
  const fresh = freshBookingFromQuotation(quotation, booking.id);
  const keep = ['id', 'bookingDate', 'payments', 'paymentSchedules', 'creditNotes', 'debitNotes', 'vouchers', 'activityLog', 'supplierOverrides', 'createdAt', 'status', 'flights', 'invoiceSettings', 'operationPerson'];
  const next = { ...fresh };
  keep.forEach((k) => { if (booking[k] !== undefined) next[k] = booking[k]; });
  next.quotationVersion = quotation.version;
  const paid = (next.payments || []).filter((p) => p.status === 'Paid' && ['Client Payment', 'Receivable'].includes(p.type)).reduce((s, p) => s + Number(p.amount || 0), 0);
  next.paidAmount = paid; next.balanceDue = Math.max(0, next.totalSelling - paid);
  next.paymentStatus = paid >= next.totalSelling ? 'Paid' : paid > 0 ? 'Advance Paid' : 'Pending';
  next.activityLog = [{ date: nowIso(), action: `Booking updated from quotation revision V${quotation.version}`, user: 'Admin User' }, ...(booking.activityLog || [])];
  next.updatedAt = nowIso();
  Object.keys(booking).forEach((k) => delete booking[k]);
  Object.assign(booking, next);
  return booking;
};

const matchesStatus = (b, status, today) => {
  if (!status || status === 'All') return true;
  if (status === 'Today') return b.status !== 'Cancelled' && (b.arrivalDate === today || b.departureDate === today);
  if (status === 'Confirmed') return b.status === 'Confirmed';
  return travelState(b, today) === status;
};

crud('/bookings', 'bookings', {
  prefix: 'BK-2026-', pad: 3, idStart: 100, defaults: { status: 'Confirmed', payments: [], hotels: [], services: [] }, sortBy: 'createdAt', sortDir: 'desc',
  summaryFn: (rows, q, ctx) => bookingSummary(isAgent(ctx) ? rows.filter((r) => r.agentId === ctx.user.agentId) : rows),
  filter: (rows, q, ctx) => {
    const today = todayBangkok();
    let out = isAgent(ctx) ? rows.filter((r) => r.agentId === ctx.user.agentId) : rows;
    out = out.filter((b) => matchesStatus(b, q.get('status'), today));
    if (q.get('arrivalDate')) out = out.filter((b) => b.arrivalDate === q.get('arrivalDate'));
    if (q.get('departureDate')) out = out.filter((b) => b.departureDate === q.get('departureDate'));
    if (q.get('travelState') === 'ongoing') out = out.filter((b) => travelState(b, today) === 'Traveling');
    return out;
  },
});

post('/bookings/from-quotation/:id', ({ params }) => {
  const quotation = db().quotations.find((q) => q.id === params.id);
  if (!quotation) throw notFound('Quotation');
  if (quotation.bookingId && db().bookings.some((b) => b.id === quotation.bookingId)) throw new ApiError('This quotation already has a booking.', 409);
  const booking = helpers.createBookingFromQuotation(quotation);
  save();
  return ok({ booking: clone(booking), quotation: clone(quotation) });
});

// Status counts for the booking list summary (derived travel state).
export function bookingSummary(rows) {
  const today = todayBangkok();
  const statusCounts = { Confirmed: 0, Upcoming: 0, Traveling: 0, Completed: 0, Cancelled: 0 };
  rows.forEach((b) => { if (b.status === 'Confirmed') statusCounts.Confirmed += 1; const s = travelState(b, today); statusCounts[s] = (statusCounts[s] || 0) + 1; });
  return { total: rows.length, statusCounts };
}
helpers.bookingSummary = bookingSummary;

post('/bookings/:id/client-payment-link', ({ params, body }) => {
  const booking = db().bookings.find((b) => b.id === params.id);
  if (!booking) throw notFound('Booking');
  const token = `pay-${params.id.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;
  db().paymentLinks[token] = { bookingId: booking.id, scope: body?.scope || 'full', createdAt: nowIso() };
  save();
  return ok({ token });
});
get('/payment-portal/:token', ({ params }) => {
  const link = db().paymentLinks[params.token];
  const booking = link && db().bookings.find((b) => b.id === link.bookingId);
  if (!booking) throw notFound('Payment link');
  const state = bookingInvoicePaymentState(booking);
  return ok({
    invoice: { total: state.total, paid: state.paid, remaining: state.remaining }, payments: clone((booking.payments || []).filter((p) => ['Client Payment', 'Receivable'].includes(p.type))),
    schedules: clone((booking.paymentSchedules || []).filter((s) => s.type === 'Client Payment')), currency: booking.currency || 'THB', guestName: booking.guestName, bookingId: booking.id,
    destination: booking.destination, travelDate: booking.arrivalDate, scopeLabel: link.scope === 'full' ? 'Full Payment' : link.scope, company: clone(db().settings.company),
  });
});
export { bookingPaymentLines };
