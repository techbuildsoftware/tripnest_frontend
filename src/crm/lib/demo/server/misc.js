import { addDays, clone, daysBetween, nowIso, uid } from '../util';
import { LOCATIONS } from '../locations';
import { ApiError, crud, db, del, get, listResponse, nextId, notFound, ok, patch, post, put, save, searchRecords, stampNew, stampUpdate } from './core';

// ── Locations ───────────────────────────────────────────────────────────────
get('/locations/countries', () => ok(Object.keys(LOCATIONS)));
get('/locations/states/:country', ({ params }) => ok(Object.keys(LOCATIONS[params.country] || {})));
get('/locations/cities', ({ query }) => ok(LOCATIONS[query.get('country')]?.[query.get('state')] || []));

// ── Settings ────────────────────────────────────────────────────────────────
get('/settings', () => ok({ company: clone(db().settings.company), quotation: clone(db().settings.quotation), notifications: clone(db().settings.notifications) }));
put('/settings/:key', ({ params, body }) => {
  const value = body?.value ?? body;
  db().settings[params.key] = { ...(db().settings[params.key] || {}), ...clone(value) };
  save();
  return ok(clone(db().settings[params.key]));
});
get('/ai/settings', () => ok(clone(db().settings.ai)));
put('/ai/settings', ({ body }) => {
  const next = { ...db().settings.ai, ...clone(body) };
  next.hasOpenaiApiKey = Boolean(next.openaiApiKey || db().settings.ai.hasOpenaiApiKey); next.hasGeminiApiKey = Boolean(next.geminiApiKey || db().settings.ai.hasGeminiApiKey);
  next.openaiApiKey = ''; next.geminiApiKey = '';
  db().settings.ai = next; save();
  return ok(clone(next));
});

// ── AI (canned, offline) ────────────────────────────────────────────────────
const TITLES = ['Arrival & hotel check-in', 'Island & city highlights', 'Culture and temples', 'Leisure & shopping', 'Adventure day', 'Relax by the beach', 'Farewell & departure'];
post('/ai/itinerary', ({ body }) => {
  const b = body?.booking || {};
  const start = b.travelDate || b.arrivalDate; const end = b.endDate || b.departureDate || start;
  const days = [];
  if (start) for (let i = 0; i <= Math.max(0, daysBetween(start, end)); i += 1) {
    const last = i === daysBetween(start, end) && i > 0;
    days.push({ date: addDays(start, i), title: i === 0 ? TITLES[0] : last ? TITLES[6] : TITLES[1 + ((i - 1) % 5)], description: i === 0 ? 'Meet and greet at the airport, private transfer to the hotel and a relaxed evening.' : last ? 'Breakfast, check-out and private transfer to the airport for the onward flight.' : 'Guided sightseeing in the morning with free time in the afternoon to explore at leisure.' });
  }
  return ok({ days, provider: 'demo' });
});
post('/ai/improve-itinerary-prompt', ({ body }) => ok({ prompt: `${String(body?.prompt || '').trim()}\n\nPlease include airport transfers, one signature sightseeing experience per day and a relaxed final day before departure.`, masterSummary: { hotels: db().hotels.length, sightseeing: db().sightseeingModule.length, transfers: db().operationsM.transfers.length } }));
post('/ai/improve-email', ({ body }) => ok({ subject: body?.subject || 'Your Thailand itinerary from BuildSoftware', bodyHtml: body?.bodyHtml ? `<p>Dear Partner,</p>${body.bodyHtml}<p>Warm regards,<br/>BuildSoftware Reservations</p>` : '<p>Dear Partner,</p><p>Please find the details attached. We look forward to your confirmation.</p><p>Warm regards,<br/>BuildSoftware Reservations</p>' }));

// ── Email logs & drafts (nothing is actually sent) ─────────────────────────
get('/supplier-emails/settings', () => ok(clone(db().settings.smtp)));
put('/supplier-emails/settings', ({ body }) => { db().settings.smtp = { ...db().settings.smtp, ...clone(body), password: undefined, hasPassword: true, configured: true }; save(); return ok(clone(db().settings.smtp)); });
post('/supplier-emails/settings/test', () => ok({ message: 'Demo mode: SMTP connection simulated successfully.' }));
const draftBody = (intro) => `<p>Dear Team,</p><p>${intro}</p><p>Kindly confirm availability and share your confirmation number.</p><p>Warm regards,<br/>BuildSoftware Reservations</p>`;
get('/supplier-emails/:bookingId/draft', ({ params, query }) => {
  const booking = db().bookings.find((b) => b.id === params.bookingId);
  if (!booking) throw notFound('Booking');
  const service = [...(booking.hotels || []), ...(booking.services || [])].find((s) => s.id === query.get('serviceId')) || booking.hotels?.[0] || {};
  const supplier = db().suppliers.find((s) => s.id === service.supplierId || s.name === (service.supplierName || service.supplier));
  return ok({ supplierName: supplier?.name || service.supplierName || 'Supplier', supplierEmail: supplier?.email || 'reservations@supplier.example', subject: `Booking request ${booking.id} – ${service.name || 'Service'}`, bodyHtml: draftBody(`We would like to confirm ${service.name || 'the service'} for ${booking.guestName} (${booking.id}), ${booking.arrivalDate} to ${booking.departureDate}.`), ccEmails: [] });
});
get('/supplier-emails/:bookingId', ({ params }) => ok(clone(db().emailLogs.supplier.filter((l) => l.bookingId === params.bookingId))));
post('/supplier-emails/:bookingId/send', ({ params, body }) => {
  const booking = db().bookings.find((b) => b.id === params.bookingId);
  if (!booking) throw notFound('Booking');
  const service = [...(booking.hotels || []), ...(booking.services || [])].find((s) => s.id === body.serviceId) || {};
  const supplier = db().suppliers.find((s) => s.id === service.supplierId || s.name === (service.supplierName || service.supplier));
  const log = { id: uid('mail'), bookingId: params.bookingId, status: 'Sent', sentAt: nowIso(), subject: body.subject, supplierEmail: supplier?.email || 'reservations@supplier.example', recipientEmail: supplier?.email || 'reservations@supplier.example', hotelName: service.name, renderedHtml: body.bodyHtml, ccEmails: body.cc || [], messageId: `<demo-${Date.now()}@buildsoftware.in>` };
  db().emailLogs.supplier.unshift(log); save();
  return ok({ ...log, supplierEmail: log.supplierEmail, ccEmails: log.ccEmails });
});

const quotationRecipient = (q, body) => {
  if (body?.recipientType === 'b2c' || q.clientType === 'B2C') { const c = db().b2c.find((x) => x.id === (body?.recipientId || q.b2cId)); return { name: c?.name || q.guestName, email: c?.email || q.recipientEmail }; }
  const a = db().agents.find((x) => x.id === (body?.recipientId || q.agentId));
  return { name: a?.contactPerson || a?.name || q.agentName, email: a?.email || q.recipientEmail };
};
get('/quotation-emails/:id/draft', ({ params }) => {
  const q = db().quotations.find((x) => x.id === params.id);
  if (!q) throw notFound('Quotation');
  const r = quotationRecipient(q);
  return ok({ recipientName: r.name, recipientEmail: r.email, subject: `Quotation ${q.id} – ${q.destination} (${q.travelDate})`, bodyHtml: `<p>Dear ${r.name || 'Partner'},</p><p>Thank you for your enquiry. Please find the proposed itinerary and pricing for ${q.guestName} travelling to ${q.destination} from ${q.travelDate} to ${q.endDate}.</p><p>We would be happy to adjust anything to suit your guests.</p><p>Warm regards,<br/>BuildSoftware Sales Team</p>`, ccMails: [] });
});
get('/quotation-emails/:id', ({ params }) => ok(clone(db().emailLogs.quotation.filter((l) => l.quotationId === params.id))));
post('/quotation-emails/:id/send', ({ params, body }) => {
  const q = db().quotations.find((x) => x.id === params.id);
  if (!q) throw notFound('Quotation');
  const r = quotationRecipient(q, body);
  const log = { id: uid('mail'), quotationId: q.id, status: 'Sent', sentAt: nowIso(), subject: body.subject, recipientName: r.name, recipientEmail: r.email, attachmentName: `${q.id}.pdf`, renderedHtml: body.bodyHtml, ccEmails: body.cc || [], messageId: `<demo-${Date.now()}@buildsoftware.in>` };
  db().emailLogs.quotation.unshift(log);
  if (['Draft', 'Revised'].includes(q.status)) q.status = 'Sent';
  q.emailLogs = [log, ...(q.emailLogs || [])]; save();
  return ok({ ...log, recipientEmail: r.email });
});

// ── Hotel availability requests ─────────────────────────────────────────────
const availabilityRows = (q) => {
  const stored = db().hotelAvailability[q.id] || {};
  const rows = [];
  (q.days || []).forEach((d) => (d.services || []).filter((s) => s.type === 'Hotel').forEach((h) => {
    const key = `${h.id || h.name}|${h.checkIn || d.date}`;
    if (rows.some((r) => r.key === key)) return;
    const supplier = db().suppliers.find((s) => s.id === h.supplierId || s.name === (h.supplierName || h.supplier));
    const st = stored[key] || {};
    rows.push({ key, serviceId: h.id, hotelName: h.name, supplierName: supplier?.name || h.supplierName || h.supplier || '', recipientEmail: supplier?.email || 'reservations@hotel.example', emailGroupKey: supplier?.id || h.name, supplierHotelCount: 1, destination: d.destination, roomType: h.roomType || h.roomCategory || 'Deluxe', mealPlan: h.mealPlan || 'RB', rooms: h.rooms || q.rooms, checkIn: h.checkIn || d.date, checkOut: h.checkOut || addDays(d.date, h.nights || 1), status: st.status || 'Not Requested', notes: st.notes || '', selected: true, lastSentAt: st.lastSentAt || null });
  }));
  return rows;
};
const availabilityPayload = (q) => ({ rows: availabilityRows(q), logs: clone(db().emailLogs.hotel.filter((l) => l.quotationId === q.id)) });
const findQ = (id) => { const q = db().quotations.find((x) => x.id === id); if (!q) throw notFound('Quotation'); return q; };
get('/quotation-hotel-availability/:id', ({ params }) => ok(availabilityPayload(findQ(params.id))));
post('/quotation-hotel-availability/:id/preview', ({ params, body }) => { const q = findQ(params.id); return ok({ html: body?.bodyHtml || `<p>Availability request for ${q.guestName}</p>`, count: (body?.keys || []).length }); });
post('/quotation-hotel-availability/:id/send', ({ params, body }) => {
  const q = findQ(params.id);
  const keys = body?.keys || [];
  const stored = db().hotelAvailability[q.id] = db().hotelAvailability[q.id] || {};
  availabilityRows(q).filter((r) => !keys.length || keys.includes(r.key)).forEach((r) => {
    stored[r.key] = { ...(stored[r.key] || {}), status: 'Requested', lastSentAt: nowIso() };
    db().emailLogs.hotel.unshift({ id: uid('mail'), quotationId: q.id, status: 'Sent', sentAt: nowIso(), subject: body.subject, recipientEmail: r.recipientEmail, supplierEmail: r.recipientEmail, hotelName: r.hotelName, renderedHtml: body.bodyHtml, ccEmails: body.cc || [], messageId: `<demo-${Date.now()}@buildsoftware.in>` });
  });
  save();
  return ok(availabilityPayload(q));
});
patch('/quotation-hotel-availability/:id/:key', ({ params, body }) => {
  const q = findQ(params.id);
  const stored = db().hotelAvailability[q.id] = db().hotelAvailability[q.id] || {};
  stored[params.key] = { ...(stored[params.key] || {}), status: body.status, notes: body.notes || '' };
  save();
  return ok(availabilityPayload(q));
});

// ── WhatsApp (simulated) ────────────────────────────────────────────────────
get('/whatsapp/settings', () => ok(clone(db().settings.whatsapp)));
put('/whatsapp/settings', ({ body }) => { db().settings.whatsapp = { ...db().settings.whatsapp, ...clone(body), hasApiKey: true, configured: true }; save(); return ok(clone(db().settings.whatsapp)); });
get('/whatsapp/sessions', () => ok(clone(db().whatsappSessions)));
get('/whatsapp/account', () => ok({ plan: 'Demo', phoneNumber: db().whatsappSessions[0]?.phoneNumber, status: 'connected', messagesRemaining: 1000 }));
post('/whatsapp/connect', ({ body }) => { const s = { id: uid('wa'), displayName: body?.displayName || 'BuildSoftware WhatsApp', phoneNumber: '+66949831312', status: 'connected', createdAt: nowIso() }; db().whatsappSessions.push(s); save(); return ok(clone(s)); });
get('/whatsapp/sessions/:id/qr', ({ params }) => ok({ status: 'connected', sessionId: params.id }));
post('/whatsapp/sessions/:id/reconnect', ({ params }) => { const s = db().whatsappSessions.find((x) => x.id === params.id); if (s) s.status = 'connected'; save(); return ok(clone(s) || {}); });
post('/whatsapp/send', () => ok({ status: 'sent', message: 'Demo mode: WhatsApp message simulated.' }));

// ── Uploads (stored as data URLs) ──────────────────────────────────────────
const readFile = (file) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error); r.readAsDataURL(file); });
post('/uploads', async ({ body }) => {
  const out = [];
  const entries = body instanceof FormData ? [...body.entries()] : [];
  for (const [field, value] of entries) {
    if (typeof value === 'string') continue;
    out.push({ field, url: await readFile(value), name: value.name, originalName: value.name, mimeType: value.type, size: value.size });
  }
  return ok(out);
});

// ── PDF templates ───────────────────────────────────────────────────────────
crud('/pdf-templates', 'pdfTemplates', {
  prefix: 'PDT-', pad: 3, defaults: { isEnabled: true, isFavorite: false, isDefault: false, config: {} },
  filter: (rows, q) => rows.filter((r) => !q.get('documentType') || r.documentType === q.get('documentType')),
  afterWrite: (rec) => { if (rec.isDefault) db().pdfTemplates.forEach((t) => { if (t.documentType === rec.documentType && t.id !== rec.id) t.isDefault = false; }); },
});

// ── Sightseeing module ──────────────────────────────────────────────────────
const supplierView = (s) => s && ({ id: s.id, name: s.name, email: s.email, phone: s.phone, contactPerson: s.contactPerson, type: s.type, city: s.city, country: s.country });
const populate = (rec) => {
  const ids = [...new Set([...(Array.isArray(rec.suppliers) ? rec.suppliers : []), rec.supplier].filter(Boolean).map((x) => (typeof x === 'object' ? x.id : x)))];
  const views = ids.map((id) => supplierView(db().suppliers.find((s) => s.id === id))).filter(Boolean);
  return { ...rec, supplier: views[0] || null, suppliers: views };
};
const idOf = (x) => (typeof x === 'object' && x ? x.id : x);
const normalise = (rec) => ({ ...rec, supplier: idOf(rec.supplier) || '', suppliers: (rec.suppliers || []).map(idOf).filter(Boolean) });
const moduleBase = (base) => {
  get(`${base}/suppliers`, ({ query }) => ok(clone(searchRecords(db().suppliers.filter((s) => !/vehicle|transport|cab/i.test(s.type || '')), query.get('search')).map(supplierView))));
  get(`${base}/vehicle-suppliers`, () => ok(clone(db().suppliers.filter((s) => /vehicle|transport|cab|coach/i.test(`${s.type} ${s.category}`)).map(supplierView))));
  crud(base, 'sightseeingModule', { prefix: 'SSM-', pad: 3, present: populate, prepare: normalise, defaults: { status: 'Active', variants: [], transfers: [], addons: [], policies: [] } });
  put(`${base}/:id/supplier`, ({ params, body }) => {
    const rec = db().sightseeingModule.find((x) => x.id === params.id);
    if (!rec) throw notFound();
    let supplierId = body.supplierId;
    if (body.create) { supplierId = nextId(db().suppliers, 'SUP-', 3); db().suppliers.unshift(stampNew({ status: 'Active', ...clone(body.create), id: supplierId })); }
    rec.suppliers = Array.from(new Set([...(rec.suppliers || []).map(idOf), supplierId])); rec.supplier = rec.supplier ? idOf(rec.supplier) : supplierId;
    rec.supplierLinks = { ...(rec.supplierLinks || {}), [supplierId]: { contractRef: body.contractRef || '', notes: body.notes || '' } };
    save();
    return ok(populate(clone(rec)));
  });
  del(`${base}/:id/supplier/:supplierId`, ({ params }) => {
    const rec = db().sightseeingModule.find((x) => x.id === params.id);
    if (!rec) throw notFound();
    rec.suppliers = (rec.suppliers || []).map(idOf).filter((s) => s !== params.supplierId);
    if (idOf(rec.supplier) === params.supplierId) rec.supplier = rec.suppliers[0] || '';
    save();
    return ok(populate(clone(rec)));
  });
};
moduleBase('/sightseeing-module');
moduleBase('/activity-masters/sightseeing');

// ── Suppliers: usages ───────────────────────────────────────────────────────
get('/suppliers/:id/usages', ({ params }) => {
  const supplier = db().suppliers.find((s) => s.id === params.id);
  if (!supplier) throw notFound('Supplier');
  const usages = [];
  db().hotels.filter((h) => h.supplierId === supplier.id).forEach((h) => usages.push({ kind: 'Hotel', type: 'hotel', id: h.id, title: h.name, details: `${h.destination || ''} hotel linked to this supplier`, action: { label: 'Open hotel', href: '/app/masters/hotels' } }));
  db().sightseeingModule.filter((s) => [...(s.suppliers || []).map(idOf), idOf(s.supplier)].includes(supplier.id)).forEach((s) => usages.push({ kind: 'Sightseeing', type: 'sightseeing', id: s.id, title: s.name, details: 'Sightseeing experience', action: { label: 'Open sightseeing', href: '/app/masters/sightseeing' } }));
  db().transferRates.filter((r) => r.supplier === supplier.id).forEach((r) => usages.push({ kind: 'Transfer rate', type: 'transfer-rate', id: r.id, title: r.transferName, details: 'Transfer price', action: { label: 'Open transfer prices', href: '/app/masters/transfer-prices' } }));
  db().restaurantRates.filter((r) => r.supplier === supplier.id).forEach((r) => usages.push({ kind: 'Restaurant rate', type: 'restaurant-rate', id: r.id, title: r.restaurantName, details: 'Restaurant price', action: { label: 'Open restaurant prices', href: '/app/masters/restaurant-prices' } }));
  return ok({ supplier: clone(supplier), usages });
});
del('/suppliers/:id/usages/:type/:entryId', ({ params }) => {
  const d = db();
  const remove = (key, test) => { d[key] = d[key].filter((x) => !test(x)); };
  if (params.type === 'hotel') { const h = d.hotels.find((x) => x.id === params.entryId); if (h) { h.supplierId = ''; h.supplier = ''; h.supplierName = ''; } }
  else if (params.type === 'sightseeing') { const s = d.sightseeingModule.find((x) => x.id === params.entryId); if (s) { s.suppliers = (s.suppliers || []).map(idOf).filter((x) => x !== params.id); if (idOf(s.supplier) === params.id) s.supplier = s.suppliers[0] || ''; } }
  else if (params.type === 'transfer-rate') remove('transferRates', (x) => x.id === params.entryId);
  else if (params.type === 'restaurant-rate') remove('restaurantRates', (x) => x.id === params.entryId);
  save();
  return ok({ id: params.entryId });
});

// ── System documents (folders) ──────────────────────────────────────────────
get('/system-masters/documents', ({ query }) => {
  let rows = db().systemM.documents;
  if (query.get('all') !== 'true') { const parent = query.get('parentFolder') || ''; rows = rows.filter((f) => (f.parentFolder || '') === parent); }
  return listResponse(rows, query);
});
del('/system-masters/documents/:id/files', ({ params, body }) => {
  const folder = db().systemM.documents.find((f) => f.id === params.id);
  if (!folder) throw notFound('Folder');
  folder.files = (folder.files || []).filter((f) => f.key !== body?.key);
  save();
  return ok(clone(folder));
});

// ── Proforma / reports helpers live elsewhere ───────────────────────────────

// ── Generic master groups (registered last) ────────────────────────────────
const GROUPS = { 'sales-masters': 'sales', 'operations-masters': 'operationsM', 'activity-masters': 'activityM', 'finance-masters': 'financeM', 'system-masters': 'systemM' };
const prefixFor = (list, type) => { const first = list.find((x) => /^[A-Za-z0-9]+-\d+$/.test(String(x.id || ''))); return first ? String(first.id).replace(/\d+$/, '') : `${type.replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase() || 'MST'}-`; };
const masterList = (group, type) => {
  const store = db()[GROUPS[group]];
  if (!store[type]) store[type] = [];
  return store[type];
};
Object.keys(GROUPS).forEach((group) => {
  const base = `/${group}/:type`;
  get(base, ({ params, query }) => {
    let rows = masterList(group, params.type);
    ['status', 'destination', 'market', 'company'].forEach((f) => { if (query.get(f) && query.get(f) !== 'All') rows = rows.filter((r) => r[f] === query.get(f)); });
    return listResponse(rows, query);
  });
  get(`${base}/:id`, ({ params }) => { const row = masterList(group, params.type).find((r) => r.id === params.id); if (!row) throw notFound(); return ok(clone(row)); });
  post(base, ({ params, body }) => {
    const list = masterList(group, params.type);
    const record = stampNew({ status: 'Active', ...clone(body), id: body.id || nextId(list, prefixFor(list, params.type), 3) });
    list.unshift(record); save();
    return ok(clone(record));
  });
  put(`${base}/:id`, ({ params, body }) => {
    const list = masterList(group, params.type);
    const i = list.findIndex((r) => r.id === params.id);
    if (i < 0) throw notFound();
    list[i] = stampUpdate({ ...list[i], ...clone(body), id: list[i].id, createdAt: list[i].createdAt }); save();
    return ok(clone(list[i]));
  });
  del(`${base}/:id`, ({ params }) => {
    const list = masterList(group, params.type);
    const i = list.findIndex((r) => r.id === params.id);
    if (i < 0) throw notFound();
    list.splice(i, 1); save();
    return ok({ id: params.id });
  });
});

get('/masters/summary', () => {
  const d = db();
  const c = {};
  const add = (store, group, keys) => keys.forEach((k) => { c[`/masters/${k}`] = (store[k] || []).length; });
  add(d.sales, 's', ['lead-sources', 'markets', 'query-types', 'markup-categories', 'hotel-categories', 'room-types', 'room-categories', 'meal-plans', 'amenities']);
  add(d.operationsM, 'o', ['transfers', 'destinations', 'locations', 'airports', 'vehicles', 'drivers', 'guides', 'ferry-classes']);
  add(d.activityM, 'a', ['restaurants', 'restaurant-types', 'visa']);
  add(d.financeM, 'f', ['currencies', 'banks', 'expense-types']);
  add(d.systemM, 'y', ['itinerary', 'arrival-departure', 'documents', 'guest-documents', 'feedback-types']);
  Object.assign(c, { '/masters/agents': d.agents.length, '/masters/b2c': d.b2c.length, '/masters/hotels': d.hotels.length, '/masters/suppliers': d.suppliers.length, '/masters/yacht': d.yachts.length, '/masters/sightseeing': d.sightseeingModule.length, '/masters/terms-conditions': d.termsConditions.length, '/masters/travel-insurance': (d.activityM['insurance-plans'] || []).length });
  return ok({ counts: c });
});
