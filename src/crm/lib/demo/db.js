// In-browser demo database. The whole CRM runs on this: there is no backend.
// State lives in memory and is persisted to IndexedDB so changes survive a refresh.
import { stockImages } from './assets';
import { buildMasters } from './seedMasters';
import { buildRecords } from './seedRecords';
import { addDays, todayBangkok } from './util';
import { bookingPaymentLines, linePaymentState } from '../bookingPayments';

const DB_NAME = 'buildsoftware-demo';
const STORE = 'state';
const KEY = 'db-v1';
const MAX_SEED_AGE_DAYS = 21;

let db = null;
let ready = null;
let saveTimer = null;

// ── Tiny IndexedDB wrapper with graceful fallback ────────────────────────────
const openIdb = () => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const idbGet = async (key) => {
  const handle = await openIdb();
  return new Promise((resolve, reject) => {
    const request = handle.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};
const idbSet = async (key, value) => {
  const handle = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = handle.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const signature = () => `${stockImages.bangkok}|v3`;

export function buildSeed() {
  const masters = buildMasters();
  const m = { ...masters, restaurants: masters.activity.restaurants };
  const records = buildRecords(m);
  const today = todayBangkok();
  const stamp = records.stamp;

  const activityM = { ...masters.activity };
  activityM['insurance-companies'] = ['Tata AIG', 'Bajaj Allianz', 'HDI Global'].map((name, i) => ({ id: `INC-00${i + 1}`, name, status: 'Active', website: `https://${name.toLowerCase().replace(/[^a-z]+/g, '')}.example`, contactEmail: `care@${name.toLowerCase().replace(/[^a-z]+/g, '')}.example`, contactPhone: '+91 22 0000 000' + i }));
  activityM['insurance-plans'] = [['Thailand Silver', 'Tata AIG'], ['Thailand Gold', 'Bajaj Allianz']].map(([name, company], i) => ({ id: `INP-00${i + 1}`, name, company, status: 'Active', description: `${name} travel cover for Thailand trips.` }));
  activityM['insurance-days'] = ['1-7 Days', '8-15 Days', '16-30 Days'].map((name, i) => ({ id: `IND-00${i + 1}`, name, position: i + 1, status: 'Active' }));
  activityM['insurance-ages'] = ['0-40 Years', '41-60 Years', '61-70 Years'].map((name, i) => ({ id: `INA-00${i + 1}`, name, position: i + 1, status: 'Active' }));
  activityM['insurance-sums'] = [['USD 50,000', 50000], ['USD 100,000', 100000]].map(([name, amount], i) => ({ id: `INS-00${i + 1}`, name, amount, currency: 'USD', status: 'Active' }));
  activityM['insurance-features'] = ['Medical expenses', 'Trip cancellation', 'Baggage loss'].map((name, i) => ({ id: `INF-00${i + 1}`, name, description: name, status: 'Active' }));
  activityM['insurance-costs'] = [{ id: 'INC-C-001', name: 'Insurance Cost', plan: 'Thailand Silver', day: '1-7 Days', age: '0-40 Years', sumInsured: 'USD 50,000', cost: 450, currency: 'THB', status: 'Active' }];

  const quotationTemplates = [
    { name: 'TripNest Classic', description: 'Clean day-wise itinerary with full pricing summary.', isDefault: true, config: {} },
    { name: 'Compact Summary', description: 'Short one-page quotation overview.', isDefault: false, config: {} },
  ].map((t, i) => ({ id: `PDT-Q-00${i + 1}`, documentType: 'quotation', isFavorite: i === 0, isEnabled: true, createdAt: stamp(-60), updatedAt: stamp(-5 - i), ...t }));
  const voucherTemplates = [
    { name: 'Standard Confirmation Voucher', description: 'Default booking confirmation voucher.', isDefault: true, config: {} },
  ].map((t, i) => ({ id: `PDT-V-00${i + 1}`, documentType: 'voucher', isFavorite: false, isEnabled: true, createdAt: stamp(-60), updatedAt: stamp(-5), ...t }));

  // Give every confirmed booking an invoice so the Accounts screens have data.
  records.bookings.forEach((booking, i) => {
    if (i >= records.bookings.length - 2) return; // leave the two furthest trips un-invoiced so "Create invoice" can be tested
    booking.invoiceSettings = { ...booking.invoiceSettings, invoiceCreatedAt: booking.bookingDate, invoiceStatus: 'Active', currency: 'THB', vatPercent: i % 3 === 0 ? 7 : 0, taxTreatment: 'GST Exclude' };
  });

  // Trips that already finished have had every supplier settled.
  records.bookings.filter((b) => b.departureDate < today).forEach((booking) => {
    bookingPaymentLines(booking).forEach((line, i) => {
      const st = linePaymentState(booking, line);
      if (st.supplierRemaining <= 0) return;
      booking.payments.push({ id: `PAY-${booking.id}-S${i}`, ref: `SP-${booking.id.slice(-3)}-S${i}`, type: 'Supplier Payment', amount: st.supplierRemaining, currency: 'THB', date: addDays(booking.departureDate, 2), status: 'Paid', method: 'Bank Transfer', notes: '', supplier: line.supplier, allocations: [{ lineId: line.key, amount: st.supplierRemaining }] });
    });
  });

  const settings = {
    company: { name: 'TripNest CRM', email: 'admin@tripnest.com', phone: '+66 76 345 678', address: '123 Phuket Road, Phuket 83000, Thailand', website: 'www.tripnest.com', currency: 'THB', timezone: 'Asia/Bangkok', logo: null },
    quotation: { defaultMarkup: 10, defaultValidDays: 14, defaultCurrency: 'THB', autoSaveInterval: 30, showSupplierInClient: false, defaultMealPlan: 'RB', defaultHotelCategory: '4 Star' },
    notifications: { quotationFollowup: true, paymentDue: true, supplierConfirmation: true, arrivalReminder: true, emailNotifications: true, browserNotifications: false },
    ai: { provider: 'openai', model: 'gpt-4o-mini', customModel: '', openaiApiKey: '', geminiApiKey: '', hasOpenaiApiKey: true, hasGeminiApiKey: false },
    smtp: { host: 'smtpout.secureserver.net', port: 465, secure: true, username: 'demo@tripnest.com', fromName: 'TripNest Reservations', fromEmail: 'demo@tripnest.com', hasPassword: true, configured: true },
    whatsapp: { baseUrl: 'https://api.pulsesend.app/api', hasApiKey: true, configured: true, defaultConnectedPhoneNumber: '+66949831312' },
  };

  return {
    signature: signature(), seedDate: today, version: 1,
    queries: records.queries, quotations: records.quotations, bookings: records.bookings, agents: records.agents, b2c: records.b2c, users: records.users,
    notifications: records.notifications, operations: records.operations,
    hotels: masters.hotels, suppliers: masters.suppliers, hotelRates: masters.hotelRates, transferRates: masters.transferRates, restaurantRates: masters.restaurantRates,
    sightseeingModule: masters.sightseeingModule, sightseeingRates: [], yachts: masters.yachts, termsConditions: masters.termsConditions, queryTitleMasters: masters.queryTitleMasters,
    sales: masters.sales, operationsM: masters.operations, activityM, financeM: masters.finance, systemM: masters.system,
    pdfTemplates: [...quotationTemplates, ...voucherTemplates], proformas: [], settings,
    emailLogs: { quotation: [], supplier: [], hotel: [] }, shareLinks: {}, paymentLinks: {}, hotelAvailability: {},
    whatsappSessions: [{ id: 'wa-session-1', displayName: 'TripNest Sales', phoneNumber: '+66949831312', status: 'connected', createdAt: stamp(-30) }],
    counters: { query: 100, quotation: 100, booking: 200, proforma: 0, generic: 0 },
    dueDate: addDays(today, 0),
  };
}

async function load() {
  try {
    const saved = await idbGet(KEY);
    if (saved && saved.signature === signature()) {
      const age = Math.abs((new Date(`${todayBangkok()}T00:00:00Z`) - new Date(`${saved.seedDate}T00:00:00Z`)) / 86400000);
      if (age <= MAX_SEED_AGE_DAYS) { db = saved; return db; }
    }
  } catch { /* fall through to a fresh seed */ }
  db = buildSeed();
  try { await idbSet(KEY, db); } catch { /* persistence is optional */ }
  return db;
}

export const ensureDb = () => { if (!ready) ready = load(); return ready; };
export const getDb = () => db;

// Debounced write-behind. Every mutation calls save().
export function save() {
  if (!db) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { idbSet(KEY, db).catch(() => { /* quota / private mode: keep working in memory */ }); }, 250);
}

export async function resetDemoData() {
  db = buildSeed();
  ready = Promise.resolve(db);
  try { await idbSet(KEY, db); } catch { /* ignore */ }
  return db;
}

if (typeof window !== 'undefined') window.__resetDemoData = async () => { await resetDemoData(); window.location.href = '/crm/login'; };
