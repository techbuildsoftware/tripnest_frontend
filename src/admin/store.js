import { useSyncExternalStore } from "react";
import { PACKAGES, SERVICES } from "../data.js";

/* ──────────────────────────────────────────────────────────────────────────
   Admin data store (FRONT-END DEMO). Everything lives in this browser's localStorage.
   Replace the functions at the bottom with real API calls when you have a backend.
   ────────────────────────────────────────────────────────────────────────── */
const KEY = "tripnest_admin_v1";
const OVERRIDES = "tripnest_admin_overrides";   // read by siteOverrides.js → changes the public site
const INBOX = "tripnest_lead_inbox";            // written by leads.jsx when a visitor submits a form on THIS browser
const SESSION = "tripnest_admin_session";

export const DEMO_ADMIN = { email: "admin@tripnest.com", password: "Admin@123", name: "Aarav Admin", role: "Super admin" };

/* small deterministic PRNG so the demo data is stable between reloads */
let seed = 20261127;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const day = 86400000;
const iso = (t) => new Date(t).toISOString();

const FIRST = ["Aarav", "Priya", "Rohan", "Sneha", "Kabir", "Ananya", "Vikram", "Meera", "Arjun", "Isha", "Rahul", "Neha", "Karan", "Pooja", "Siddharth", "Tanvi", "Nikhil", "Divya", "Aditya", "Riya", "Somchai", "Naree", "Emma", "Liam", "Olivia", "Noah", "Mei", "Hiro"];
const LAST = ["Sharma", "Patel", "Singh", "Gupta", "Mehta", "Iyer", "Reddy", "Nair", "Kapoor", "Joshi", "Verma", "Khan", "Wong", "Tanaka", "Smith", "Brown", "Chaiyaporn", "Suwan"];
const CITIES = ["Mumbai", "Delhi", "Bengaluru", "Pune", "Hyderabad", "Kolkata", "Bangkok", "Singapore", "London", "Dubai"];
export const METHODS = ["Visa", "Mastercard", "PromptPay", "UnionPay", "JCB", "Apple Pay", "Bank transfer"];

function seedData() {
  seed = 20261127;
  const now = Date.now();
  const customers = Array.from({ length: 26 }, (_, i) => {
    const f = FIRST[i % FIRST.length], l = LAST[(i * 7) % LAST.length];
    return { id: `C-${1001 + i}`, name: `${f} ${l}`, email: `${f}.${l}`.toLowerCase() + "@example.com", phone: `+91 9${String(Math.floor(rnd() * 1e9)).padStart(9, "0")}`, city: pick(CITIES), type: rnd() > 0.82 ? "Business" : "Traveller", joined: iso(now - Math.floor(rnd() * 200) * day), notes: "" };
  });

  const packages = PACKAGES.map((p) => ({ id: p.id, title: p.title, dest: p.dest, price: p.price, was: p.was, off: p.off, status: "active", sold: Math.floor(rnd() * 40 + 8) }));
  const services = SERVICES.map((s) => ({ id: s.id, title: s.title, cat: s.cat, from: s.from, status: "active" }));

  const items = [...packages.map((p) => ({ name: p.title, price: p.price })), ...services.map((s) => ({ name: s.title, price: s.from }))];
  const statuses = ["Confirmed", "Confirmed", "Completed", "Completed", "Pending", "Cancelled"];
  const bookings = [], payments = [];
  for (let i = 0; i < 64; i++) {
    const c = pick(customers), it = pick(items), pax = 1 + Math.floor(rnd() * 5);
    const created = now - Math.floor(rnd() * 90) * day - Math.floor(rnd() * day);
    const amount = Math.round((it.price * (it.price > 20000 ? Math.max(1, Math.ceil(pax / 2)) : pax)) / 100) * 100;
    let status = pick(statuses);
    const travel = created + (7 + Math.floor(rnd() * 60)) * day;
    if (travel < now - 3 * day && status === "Confirmed") status = "Completed";
    if (travel > now && status === "Completed") status = "Confirmed";
    const ref = `TN-${2001 + i}`;
    let paid = 0;
    const mk = (amt, st, off, method) => { payments.push({ id: `PAY-${5001 + payments.length}`, booking: ref, customer: c.name, method, amount: amt, status: st, date: iso(Math.min(now - 3600000, created + off * 3600000)), note: "" }); if (st === "Paid") paid += amt; };
    const m = pick(METHODS);
    if (status === "Cancelled") { if (rnd() > 0.5) { mk(Math.round(amount * 0.3), "Refunded", 2, m); } }
    else if (status === "Pending") { if (rnd() > 0.5) mk(Math.round(amount * 0.3), "Paid", 1, m); mk(amount - Math.round(amount * 0.3) * (paid ? 1 : 0), "Pending", 30, m); }
    else if (rnd() > 0.55) { mk(Math.round(amount * 0.4), "Paid", 1, m); mk(amount - Math.round(amount * 0.4), "Paid", 200, m); }
    else { if (rnd() > 0.9) mk(amount, "Failed", 1, m); mk(amount, "Paid", 2, m); }
    bookings.push({ ref, customerId: c.id, customer: c.name, email: c.email, item: it.name, pax, amount, travel: iso(travel), created: iso(created), status, notes: "" });
  }
  bookings.sort((a, b) => b.created.localeCompare(a.created));
  payments.sort((a, b) => b.date.localeCompare(a.date));

  const coupons = [
    { code: "NEST10", label: "Flat 10% off hotels", type: "percent", value: 10, uses: 84, limit: 500, expires: iso(now + 60 * day).slice(0, 10), active: true },
    { code: "SUNSET", label: "Yacht party deal", type: "flat", value: 500, uses: 41, limit: 200, expires: iso(now + 30 * day).slice(0, 10), active: true },
    { code: "FLYNEST", label: "Flights from ฿1,990", type: "flat", value: 300, uses: 122, limit: 300, expires: iso(now + 15 * day).slice(0, 10), active: true },
    { code: "THRILL15", label: "Adventure bundle", type: "percent", value: 15, uses: 19, limit: 100, expires: iso(now - 5 * day).slice(0, 10), active: false },
  ];

  const posts = [
    ["10 things to do in Phuket", "Blog", "Published"], ["Best time to visit Thailand", "Blog", "Published"], ["Songkran 2027 travel guide", "Blog", "Draft"],
    ["Year-end sale: up to 15% off packages", "Offer", "Published"], ["New: Koh Tao diving packages", "Announcement", "Published"], ["Visa-free update for Indian travellers", "Announcement", "Draft"],
  ].map(([title, type, status], i) => ({ id: `P-${i + 1}`, title, type, status, author: "Aarav Admin", date: iso(now - i * 6 * day).slice(0, 10), body: "Write your post content here…", views: Math.floor(rnd() * 3000) }));

  const srcs = ["Quote form", "Contact form", "WhatsApp", "Partner enquiry"];
  const msgs = ["Looking for a honeymoon package for 6 nights, 2 adults.", "Need net rates for a group of 20 from Pune.", "Can you arrange a yacht party for 12 people?", "Do you provide visa assistance?", "Want to partner as a travel agent in Delhi.", "Family of 5, Phuket + Krabi, budget ฿1.5 lakh."];
  const leads = Array.from({ length: 16 }, (_, i) => { const c = pick(customers); return { id: `L-${3001 + i}`, name: c.name, email: c.email, phone: c.phone, source: pick(srcs), message: pick(msgs), status: pick(["New", "New", "Contacted", "Won", "Lost"]), date: iso(now - i * 0.9 * day), notes: "" }; });

  const payMethods = Object.fromEntries(METHODS.map((m, i) => [m, { enabled: i < 6, fee: m === "Bank transfer" ? 0 : m === "PromptPay" ? 1.0 : 2.9 }]));
  const settings = {
    siteName: "TripNest", supportEmail: "tripnesttraveltech@gmail.com", phone: "+66 61 376 7464", vat: 7, serviceFee: 2, depositPct: 30,
    cancellation: "Free cancellation up to 7 days before travel. 50% refund within 7–3 days. No refund within 72 hours.", payMethods,
    team: [
      { name: "Aarav Admin", email: "admin@tripnest.com", role: "Super admin" }, { name: "Naree Suwan", email: "naree@tripnest.com", role: "Manager" },
      { name: "Priya Sharma", email: "priya@tripnest.com", role: "Support" },
    ],
  };
  const ev = ["New booking TN-2064 from " + customers[0].name, "Payment PAY-5081 received · ฿21,400", "Package price updated: Pattaya Adventure Weekend", "Coupon SUNSET created", "Lead from Quote form converted", "Booking TN-2059 marked Confirmed", "Refund issued · PAY-5017", "Post \"Best time to visit Thailand\" published"];
  const activity = ev.map((text, i) => ({ id: i + 1, text, at: iso(now - (i * 47 + 5) * 60000 * (i + 1)) }));
  return { customers, bookings, payments, packages, services, coupons, posts, leads, settings, activity, password: DEMO_ADMIN.password };
}

/* ───────── store plumbing ───────── */
const load = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s?.bookings) return s; } catch {} return seedData(); };
let state = load();
const subs = new Set();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

/** Push price/status edits to the public website (applied at next page load by siteOverrides.js). */
function publish() {
  const o = { packages: {}, services: {}, at: Date.now() };
  state.packages.forEach((p) => (o.packages[p.id] = { price: p.price, was: p.was, off: p.off, title: p.title, status: p.status }));
  state.services.forEach((s) => (o.services[s.id] = { from: s.from, status: s.status }));
  try { localStorage.setItem(OVERRIDES, JSON.stringify(o)); } catch {}
}
const set = (patch, log) => {
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  if (log) state.activity = [{ id: Date.now() + Math.random(), text: log, at: new Date().toISOString() }, ...state.activity].slice(0, 40);
  persist(); subs.forEach((f) => f());
};
const sub = (cb) => { subs.add(cb); return () => subs.delete(cb); };

/** Pull in leads submitted through the public forms (same browser only until a real backend exists). */
function pullInbox() {
  try {
    const box = JSON.parse(localStorage.getItem(INBOX) || "[]");
    if (!box.length) return;
    localStorage.removeItem(INBOX);
    const fresh = box.map((b, i) => ({ id: `L-${Date.now() + i}`, name: b.name || b.Name || b["Your name"] || b["Full name"] || "Website visitor", email: b.email || b.Email || "", phone: b.phone || b.Phone || "", source: `${b.kind || "Website"} form`, message: b.message || b.Message || b.text || "", status: "New", date: b.at || new Date().toISOString(), notes: "" }));
    set((s) => ({ leads: [...fresh, ...s.leads] }), `${fresh.length} new lead(s) from the website`);
  } catch {}
}
pullInbox();

export const useAdmin = () => useSyncExternalStore(sub, () => state);
export const getState = () => state;
export const newId = (p) => `${p}-${Date.now().toString(36).toUpperCase()}`;

/* ───────── session ───────── */
const readSession = () => { try { return JSON.parse(sessionStorage.getItem(SESSION)); } catch { return null; } };
let session = readSession();
const sessSubs = new Set();
export const useSession = () => useSyncExternalStore((cb) => { sessSubs.add(cb); return () => sessSubs.delete(cb); }, () => session);
export function adminLogin(email, password) {
  if (email.trim().toLowerCase() === DEMO_ADMIN.email && password === state.password) {
    session = { email: DEMO_ADMIN.email, name: DEMO_ADMIN.name, role: DEMO_ADMIN.role };
    try { sessionStorage.setItem(SESSION, JSON.stringify(session)); } catch {}
    sessSubs.forEach((f) => f()); pullInbox(); return true;
  }
  return false;
}
export function adminLogout() { session = null; try { sessionStorage.removeItem(SESSION); } catch {} sessSubs.forEach((f) => f()); }

/* ───────── actions (swap for API calls later) ───────── */
const upsert = (list, item, key = "id") => (list.some((x) => x[key] === item[key]) ? list.map((x) => (x[key] === item[key] ? { ...x, ...item } : x)) : [item, ...list]);
const without = (list, id, key = "id") => list.filter((x) => x[key] !== id);

export const actions = {
  saveBooking: (b) => set((s) => ({ bookings: upsert(s.bookings, b, "ref") }), `Booking ${b.ref} saved`),
  setBookingStatus: (ref, status) => set((s) => ({ bookings: s.bookings.map((b) => (b.ref === ref ? { ...b, status } : b)) }), `Booking ${ref} → ${status}`),
  deleteBooking: (ref) => set((s) => ({ bookings: without(s.bookings, ref, "ref"), payments: s.payments.filter((p) => p.booking !== ref) }), `Booking ${ref} deleted`),
  savePayment: (p) => set((s) => ({ payments: upsert(s.payments, p) }), `Payment ${p.id} ${p.status.toLowerCase()} · ฿${p.amount.toLocaleString("en-US")}`),
  setPaymentStatus: (id, status) => set((s) => ({ payments: s.payments.map((p) => (p.id === id ? { ...p, status, date: status === "Paid" ? new Date().toISOString() : p.date } : p)) }), `Payment ${id} → ${status}`),
  deletePayment: (id) => set((s) => ({ payments: without(s.payments, id) }), `Payment ${id} deleted`),
  savePackage: (p) => { set((s) => ({ packages: upsert(s.packages, { ...p, off: p.was > p.price ? Math.round((1 - p.price / p.was) * 100) : 0 }) }), `Package "${p.title}" updated`); publish(); },
  bulkPriceAdjust: (pct) => { set((s) => ({ packages: s.packages.map((p) => { const price = Math.round((p.price * (1 + pct / 100)) / 100) * 100; return { ...p, price, off: p.was > price ? Math.round((1 - price / p.was) * 100) : 0 }; }) }), `All package prices ${pct > 0 ? "+" : ""}${pct}%`); publish(); },
  saveService: (sv) => { set((s) => ({ services: upsert(s.services, sv) }), `Service "${sv.title}" updated`); publish(); },
  saveCoupon: (c) => set((s) => ({ coupons: upsert(s.coupons, c, "code") }), `Coupon ${c.code} saved`),
  deleteCoupon: (code) => set((s) => ({ coupons: without(s.coupons, code, "code") }), `Coupon ${code} deleted`),
  savePost: (p) => set((s) => ({ posts: upsert(s.posts, p) }), `Post "${p.title}" ${p.status.toLowerCase()}`),
  deletePost: (id) => set((s) => ({ posts: without(s.posts, id) }), "Post deleted"),
  saveLead: (l) => set((s) => ({ leads: upsert(s.leads, l) }), `Lead ${l.name} → ${l.status}`),
  deleteLead: (id) => set((s) => ({ leads: without(s.leads, id) }), "Lead deleted"),
  saveCustomer: (c) => set((s) => ({ customers: upsert(s.customers, c) }), `Customer ${c.name} saved`),
  deleteCustomer: (id) => set((s) => ({ customers: without(s.customers, id) }), "Customer deleted"),
  saveSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } }), "Settings updated"),
  setPassword: (password) => set({ password }, "Admin password changed"),
  resetDemo: () => { const d = seedData(); state = d; persist(); try { localStorage.removeItem(OVERRIDES); } catch {} subs.forEach((f) => f()); },
};

/* ───────── helpers ───────── */
export const thb = (n) => "฿" + Math.round(n || 0).toLocaleString("en-US");
export const dShort = (s) => new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
export const dFull = (s) => new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
export const paidOf = (ref, payments) => payments.filter((p) => p.booking === ref && p.status === "Paid").reduce((a, p) => a + p.amount, 0);
