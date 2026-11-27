import { addDays, clone, daysBetween, nowIso, todayBangkok } from '../util';
import { crud, db, helpers, del, get, listResponse, nextId, notFound, ok, post, put, save, stampNew, stampUpdate, ApiError } from './core';

const isAgent = (ctx) => ctx?.user?.role === 'Agent';
const scopeToAgent = (rows, ctx) => (isAgent(ctx) ? rows.filter((r) => r.agentId === ctx.user.agentId) : rows);

// ── Simple master-like collections ──────────────────────────────────────────
crud('/agents', 'agents', {
  prefix: 'AGT-', pad: 3,
  prepare: (r, prev) => {
    const n = Number(String(r.id).replace(/\D/g, '')) || 1;
    return { portalEnabled: true, contacts: [], totalBookings: 0, totalSales: 0, outstanding: 0, profitGenerated: 0, ...r, loginCode: r.loginCode || prev?.loginCode || `AGENT-${r.id}-2026-${String(n).padStart(3, '0')}`, portalPassword: r.portalPassword || prev?.portalPassword || 'Agent@123' };
  },
  defaults: { status: 'Active' },
});
get('/agents/:id/credentials', ({ params }) => {
  const a = db().agents.find((x) => x.id === params.id);
  if (!a) throw notFound('Agent');
  return ok({ loginCode: a.loginCode, password: a.portalPassword });
});
put('/agents/:id/credentials', ({ params, body }) => {
  const a = db().agents.find((x) => x.id === params.id);
  if (!a) throw notFound('Agent');
  if (body.password) a.portalPassword = body.password;
  if (body.loginCode) a.loginCode = body.loginCode;
  save();
  return ok({ loginCode: a.loginCode, password: a.portalPassword });
});
post('/agents/:id/credentials/reset', ({ params }) => {
  const a = db().agents.find((x) => x.id === params.id);
  if (!a) throw notFound('Agent');
  a.portalPassword = `Agent@${Math.floor(100 + Math.random() * 900)}`;
  save();
  return ok({ loginCode: a.loginCode, password: a.portalPassword });
});

crud('/b2c', 'b2c', { prefix: 'B2C-', pad: 3, defaults: { status: 'Active' } });
crud('/hotels', 'hotels', { prefix: 'HTL-', pad: 3, defaults: { status: 'Active' } });
crud('/suppliers', 'suppliers', { prefix: 'SUP-', pad: 3, defaults: { status: 'Active' } });
crud('/yachts', 'yachts', { prefix: 'YCH-', pad: 3, defaults: { status: 'Active' } });
crud('/terms-conditions', 'termsConditions', { prefix: 'TNC-', pad: 3, defaults: { status: 'Active' } });
crud('/query-title-masters', 'queryTitleMasters', { prefix: 'QTM-', pad: 3, defaults: { status: 'Active' } });
crud('/hotel-rates', 'hotelRates', {
  prefix: 'HRT-', pad: 3,
  filter: (rows, q) => rows.filter((r) => (!q.get('hotelId') || r.hotelId === q.get('hotelId')) && (!q.get('market') || r.market === q.get('market'))),
});
crud('/transfer-rates', 'transferRates', { prefix: 'TRR-', pad: 3 });
crud('/restaurant-rates', 'restaurantRates', { prefix: 'RSR-', pad: 3 });
crud('/sightseeing-rates', 'sightseeingRates', { prefix: 'SSR-', pad: 3 });
crud('/users', 'users', { prefix: 'USR-', pad: 3, present: (u) => { const { password, ...rest } = u; return rest; } });
crud('/operations', 'operations', { prefix: 'OPS-', pad: 3, defaults: { status: 'Pending' }, sortBy: 'date', sortDir: 'asc' });

// ── Notifications ───────────────────────────────────────────────────────────
crud('/notifications', 'notifications', { prefix: 'NTF-', pad: 3, defaults: { read: false, type: 'info', time: 'Just now' } });
post('/notifications/read-all', () => { db().notifications.forEach((n) => { n.read = true; }); save(); return ok(clone(db().notifications)); });

// ── Queries ─────────────────────────────────────────────────────────────────
crud('/queries', 'queries', {
  prefix: 'QRY-2026-', pad: 3, defaults: { status: 'New', priority: 'Normal', quotations: [] }, sortBy: 'createdAt', sortDir: 'desc',
  filter: (rows, q, ctx) => scopeToAgent(rows, ctx).filter((r) => (!q.get('status') || q.get('status') === 'All' || r.status === q.get('status')) && (!q.get('priority') || q.get('priority') === 'All' || r.priority === q.get('priority'))),
  prepare: (r, prev, ctx) => (isAgent(ctx) && !prev ? { ...r, clientType: 'Agent', agentId: ctx.user.agentId, agentName: ctx.user.agentName } : r),
  afterWrite: (r, prev) => {
    if (!prev) {
      const n = db().notifications;
      n.unshift({ id: nextId(n, 'NTF-', 3), title: 'New enquiry received', message: `${r.agentName || r.guestName || 'A client'} created query ${r.id}.`, type: 'info', read: false, time: 'Just now' });
    }
  },
});

// ── Quotations ──────────────────────────────────────────────────────────────
const REVISION_OMIT = ['id', 'queryId', 'bookingId', 'versions', 'emailLogs', 'createdAt', 'updatedAt', 'status'];
const snapshotOf = (q) => { const s = clone(q); REVISION_OMIT.forEach((k) => delete s[k]); delete s.acceptedVersion; delete s.acceptedAt; return s; };

const quotationFilter = (rows, q, ctx) => {
  let out = scopeToAgent(rows, ctx);
  const status = q.get('status');
  if (status && status !== 'All') out = out.filter((r) => r.status === status);
  if (q.get('availableForBooking') === 'true') out = out.filter((r) => !r.bookingId && !['Cancelled', 'Draft'].includes(r.status));
  return out;
};

crud('/quotations', 'quotations', {
  prefix: 'QT-2026-', pad: 4, defaults: { status: 'Draft', version: 1, versions: [] }, sortBy: 'createdAt', sortDir: 'desc', filter: quotationFilter,
  prepare: (r, prev, ctx) => {
    const next = { ...r, quotationNo: r.quotationNo || r.id };
    if (isAgent(ctx) && !prev) { next.agentId = ctx.user.agentId; next.agentName = ctx.user.agentName; next.clientType = 'Agent'; }
    return next;
  },
  afterWrite: (r, prev) => {
    // Keep the originating query in step with its quotations.
    const query = db().queries.find((x) => x.id === r.queryId);
    if (!query) return;
    query.quotations = Array.from(new Set([...(query.quotations || []), r.id]));
    if (['New', 'Working'].includes(query.status) && ['Sent', 'Accepted', 'Follow-up', 'Revised'].includes(r.status)) query.status = 'Quoted';
    else if (query.status === 'New') query.status = 'Working';
    if (r.status === 'Confirmed') query.status = 'Confirmed';
  },
});

post('/quotations/from-query/:id/plan', ({ params, body }) => {
  const query = db().queries.find((q) => q.id === params.id);
  if (!query) throw notFound('Query');
  const segments = query.travelSegments?.length ? query.travelSegments : [{ departureDestination: 'Bangkok', arrivalDestination: query.destination, fromDate: query.travelDate, toDate: query.endDate }];
  const days = [];
  let n = 1;
  segments.forEach((seg, si) => {
    const span = Math.max(0, daysBetween(seg.fromDate, seg.toDate));
    const last = si === segments.length - 1;
    for (let i = 0; i <= (last ? span : Math.max(0, span - 1)); i += 1) {
      days.push({ id: `day-${n}`, day: n, dayNumber: n, date: addDays(seg.fromDate, i), destination: seg.arrivalDestination || query.destination, title: i === 0 ? `Arrival in ${seg.arrivalDestination || query.destination}` : `Explore ${seg.arrivalDestination || query.destination}`, description: '', services: [], segmentIndex: si });
      n += 1;
    }
  });
  const nights = Math.max(0, daysBetween(query.travelDate, query.endDate));
  return ok({
    queryId: query.id, clientType: query.clientType, agentId: query.agentId, agentName: query.agentName, b2cId: query.b2cId || '', b2cName: query.b2cName || '', recipientEmail: query.contactEmail,
    guestName: query.guestName, guests: clone(query.guests || []), travelDate: query.travelDate, endDate: query.endDate, duration: `${nights} Nights / ${nights + 1} Days`,
    adults: query.adults, children: query.children, infants: query.infants, childAges: query.childAges || [], childHeights: query.childHeights || [], infantAges: query.infantAges || [],
    rooms: query.rooms, roomAllocation: body?.roomAllocation || query.roomAllocation, market: query.market, currency: 'THB', salesPerson: query.salesPerson, destination: query.destination,
    packageType: query.queryTitle, queryServiceType: query.serviceType, travelSegments: clone(segments), days,
  });
});

const applyRevision = (quotation, snapshot) => {
  const keep = { id: quotation.id, queryId: quotation.queryId, bookingId: quotation.bookingId, versions: quotation.versions, emailLogs: quotation.emailLogs, createdAt: quotation.createdAt, status: quotation.status };
  Object.keys(quotation).forEach((k) => { if (!(k in keep)) delete quotation[k]; });
  Object.assign(quotation, clone(snapshot), keep, { updatedAt: nowIso() });
};

const syncBookingFromQuotation = (quotation) => helpers.syncBooking(quotation);

post('/quotations/:id/accept-revision', ({ params, body }) => {
  const quotation = db().quotations.find((q) => q.id === params.id);
  if (!quotation) throw notFound('Quotation');
  const created = !quotation.bookingId;
  let booking = null;
  if (created) booking = helpers.createBookingFromQuotation(quotation, body);
  else booking = syncBookingFromQuotation(quotation);
  quotation.status = 'Accepted';
  quotation.acceptedVersion = quotation.version;
  quotation.acceptedAt = todayBangkok();
  save();
  return ok({ quotation: clone(quotation), booking: clone(booking) });
});

post('/quotations/:id/restore-revision/:version', ({ params }) => {
  const quotation = db().quotations.find((q) => q.id === params.id);
  if (!quotation) throw notFound('Quotation');
  const target = (quotation.versions || []).find((v) => String(v.version) === String(params.version));
  if (!target?.snapshot) throw new ApiError('That revision snapshot is not available.', 404);
  const current = { version: quotation.version, createdAt: nowIso(), sellingPrice: quotation.pricing?.totalSelling || 0, notes: `Version ${quotation.version}`, snapshot: snapshotOf(quotation) };
  const versions = [...(quotation.versions || []).filter((v) => v.version !== quotation.version), current];
  const nextVersion = Math.max(...versions.map((v) => v.version)) + 1;
  applyRevision(quotation, target.snapshot);
  quotation.versions = versions;
  quotation.version = nextVersion;
  quotation.status = 'Revised';
  save();
  return ok({ quotation: clone(quotation), booking: clone(db().bookings.find((b) => b.id === quotation.bookingId) || null) });
});

export { snapshotOf };
