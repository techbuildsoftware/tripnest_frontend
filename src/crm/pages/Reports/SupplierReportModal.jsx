import React, { useMemo, useState } from 'react';
import {
  Building2, CalendarDays, Download, FileText, Hotel, MapPinned, Printer,
  ReceiptText, Route, UserRound, WalletCards, X, Search, CheckCircle2,
  AlertCircle, DollarSign, BookOpen, Layers, ChevronDown, ChevronRight,
  ExternalLink, Sparkles, Filter
} from 'lucide-react';
import { dateLabel, money } from './businessReportData';

const amount = (value) => Number(value || 0);
const safeText = (value) => String(value ?? '—');
const supplierKey = (value) => safeText(value).trim().toLowerCase();
const escapeHtml = (value) => safeText(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
const currency = (value) => money(value).replace(/^THB\s*/, 'THB ');
const today = () => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date());

function categoryFor(line) {
  const type = safeText(line.type).toLowerCase();
  if (type === 'hotel') return 'Hotels';
  if (type.includes('transfer')) return 'Transfers';
  if (type.includes('sightseeing') || type.includes('activity') || type.includes('tour') || type.includes('show')) return 'Sightseeing & Activities';
  return 'Other Services';
}

function createSupplierPrintWindow(supplier, totals, bookingGroups, categories) {
  const reportWindow = window.open('', '_blank', 'width=1200,height=900');
  if (!reportWindow) return false;
  reportWindow.opener = null;
  const lineRows = (lines) => lines.map((line) => `<tr><td><strong>${escapeHtml(line.name)}</strong><span>${escapeHtml(line.type || 'Service')}</span></td><td>${escapeHtml(line.bookingId)}</td><td>${escapeHtml(dateLabel(line.travelDate))}</td><td class="amount">${currency(line.totalCost)}</td><td class="amount paid">${currency(line.supplierPaid)}</td><td class="amount due">${currency(line.supplierRemaining)}</td><td><span class="status ${amount(line.supplierRemaining) <= 0 ? 'settled' : amount(line.supplierPaid) > 0 ? 'partial' : 'open'}">${amount(line.supplierRemaining) <= 0 ? 'Settled' : amount(line.supplierPaid) > 0 ? 'Partially paid' : 'Open'}</span></td></tr>`).join('');
  const bookingRows = bookingGroups.map((booking) => `<tr><td><strong>${escapeHtml(booking.bookingId)}</strong><span>${escapeHtml(booking.guestName || 'Client')}</span></td><td>${escapeHtml(booking.agentName || 'Direct Client')}</td><td>${escapeHtml(booking.destination || 'Unspecified')}<span>${escapeHtml(dateLabel(booking.travelDate))}</span></td><td class="center">${booking.lines.length}</td><td class="amount">${currency(booking.committed)}</td><td class="amount paid">${currency(booking.paid)}</td><td class="amount due">${currency(booking.outstanding)}</td></tr>`).join('');
  const section = (name, lines) => lines.length ? `<section><div class="section-heading"><h2>${escapeHtml(name)}</h2><span>${lines.length} service${lines.length === 1 ? '' : 's'} · ${currency(lines.reduce((sum, line) => sum + amount(line.supplierRemaining), 0))} outstanding</span></div><table><thead><tr><th>Service</th><th>Booking</th><th>Travel date</th><th class="right">Committed</th><th class="right">Paid</th><th class="right">Outstanding</th><th>Status</th></tr></thead><tbody>${lineRows(lines)}</tbody></table></section>` : '';
  reportWindow.document.title = `Supplier Report - ${supplier}`;
  reportWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Supplier Report - ${escapeHtml(supplier)}</title><style>
    @page { size: A4 landscape; margin: 11mm; }
    * { box-sizing: border-box; } body { margin: 0; color: #172033; font-family: Inter, Arial, sans-serif; font-size: 10px; background: #fff; }
    .hero { border-radius: 16px; padding: 21px 24px; color: #fff; background: linear-gradient(115deg, #10264b 0%, #1e4f8a 62%, #0d9488 100%); position: relative; overflow: hidden; }
    .hero:after { content: ''; position:absolute; width:220px; height:220px; right:-74px; top:-142px; border: 36px solid rgba(255,255,255,.12); border-radius: 50%; }
    .eyebrow { color:#9ee9e2; font-size:9px; letter-spacing:1.6px; font-weight:800; text-transform:uppercase; } h1 { margin:5px 0 4px; font-size:25px; letter-spacing:-.6px; } .meta { color:#d9e8ff; } .generated { position:absolute; right:24px; bottom:22px; text-align:right; color:#d9e8ff; }
    .cards { display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin:15px 0; } .card { border:1px solid #dce5f2; padding:12px; border-radius:11px; background:#fff; } .card span { display:block; color:#64748b; text-transform:uppercase; font-size:8px; font-weight:800; letter-spacing:.7px; } .card strong { display:block; margin-top:5px; font-size:17px; color:#10264b; } .card.due { background:#fff8ed; border-color:#bfdbfe; }.card.due strong { color:#154aa0; }.card.paid { background:#effcf6; border-color:#a7f3d0; }.card.paid strong { color:#047857; }
    section { margin-top:15px; page-break-inside:avoid; } .section-heading { display:flex; align-items:baseline; justify-content:space-between; border-bottom:2px solid #1e4f8a; padding:0 0 6px; margin-bottom:7px; } h2 { margin:0; font-size:13px; color:#10264b; } .section-heading span { color:#64748b; font-weight:700; } table { width:100%; border-collapse:collapse; } th { background:#eaf2fd; color:#29456d; font-size:8px; letter-spacing:.5px; text-transform:uppercase; text-align:left; padding:7px 8px; } td { border-bottom:1px solid #e4eaf2; padding:7px 8px; vertical-align:top; } td strong { display:block; color:#172033; } td span { display:block; color:#64748b; font-size:8px; margin-top:2px; } .amount, th.right { text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; } .paid { color:#047857; font-weight:800; } .due { color:#154aa0; font-weight:800; } .center { text-align:center; } .status { display:inline-block; border-radius:20px; padding:3px 6px; font-size:8px; font-weight:800; } .settled { color:#047857; background:#dcfce7; }.partial { color:#a16207; background:#fef3c7; }.open { color:#b91c1c; background:#fee2e2; } footer { margin-top:16px; padding-top:8px; border-top:1px solid #dce5f2; color:#64748b; display:flex; justify-content:space-between; font-size:8px; } @media print { .hero { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
  </style></head><body><div class="hero"><div class="eyebrow">BuildSoftware · Supplier intelligence</div><h1>${escapeHtml(supplier)}</h1><div class="meta">Booking-wise supplier commitment, settlement and outstanding report</div><div class="generated">Generated<br><strong>${escapeHtml(today())}</strong></div></div><div class="cards"><div class="card"><span>Bookings</span><strong>${bookingGroups.length}</strong></div><div class="card"><span>Committed</span><strong>${currency(totals.committed)}</strong></div><div class="card paid"><span>Paid</span><strong>${currency(totals.paid)}</strong></div><div class="card due"><span>Outstanding</span><strong>${currency(totals.outstanding)}</strong></div></div><section><div class="section-heading"><h2>Booking-wise overview</h2><span>All active report lines for this supplier</span></div><table><thead><tr><th>Booking / guest</th><th>Agent</th><th>Destination / travel date</th><th class="center">Services</th><th class="right">Committed</th><th class="right">Paid</th><th class="right">Outstanding</th></tr></thead><tbody>${bookingRows}</tbody></table></section>${Object.entries(categories).map(([name, lines]) => section(name, lines)).join('')}<footer><span>BuildSoftware Supplier Report</span><span>${escapeHtml(supplier)} · Confidential operational document</span></footer></body></html>`);
  reportWindow.document.close();
  window.setTimeout(() => { reportWindow.focus(); reportWindow.print(); }, 300);
  return true;
}

export default function SupplierReportModal({ supplier, ledger, onClose }) {
  const [activeTab, setActiveTab] = useState('bookings');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBookings, setExpandedBookings] = useState(new Set());

  const lines = useMemo(() => (ledger.rows || []).filter((line) => supplierKey(line.supplier) === supplierKey(supplier)), [ledger.rows, supplier]);
  
  const categories = useMemo(() => ({
    Transfers: lines.filter((line) => categoryFor(line) === 'Transfers'),
    Hotels: lines.filter((line) => categoryFor(line) === 'Hotels'),
    'Sightseeing & Activities': lines.filter((line) => categoryFor(line) === 'Sightseeing & Activities'),
    'Other Services': lines.filter((line) => categoryFor(line) === 'Other Services'),
  }), [lines]);

  const bookingGroups = useMemo(() => Object.values(lines.reduce((groups, line) => {
    const key = safeText(line.bookingId);
    groups[key] ||= {
      bookingId: line.bookingId,
      guestName: line.guestName,
      agentName: line.agentName,
      destination: line.destination,
      // The overview is about the booking; its expanded rows retain the
      // individual service travel dates.
      travelDate: line.bookingTravelDate || line.travelDate,
      lines: [],
      committed: 0,
      paid: 0,
      outstanding: 0,
    };
    groups[key].lines.push(line);
    groups[key].committed += amount(line.totalCost);
    groups[key].paid += amount(line.supplierPaid);
    groups[key].outstanding += amount(line.supplierRemaining);
    return groups;
  }, {})).sort((a, b) => String(b.travelDate || '').localeCompare(String(a.travelDate || '')) || String(a.bookingId).localeCompare(String(b.bookingId))), [lines]);

  const totals = useMemo(() => lines.reduce((sum, line) => ({
    committed: sum.committed + amount(line.totalCost),
    paid: sum.paid + amount(line.supplierPaid),
    outstanding: sum.outstanding + amount(line.supplierRemaining),
  }), { committed: 0, paid: 0, outstanding: 0 }), [lines]);

  const printReport = () => createSupplierPrintWindow(supplier, totals, bookingGroups, categories);

  const toggleExpand = (bookingId) => {
    setExpandedBookings((prev) => {
      const next = new Set(prev);
      if (next.has(bookingId)) next.delete(bookingId);
      else next.add(bookingId);
      return next;
    });
  };

  const filteredBookings = useMemo(() => {
    if (!searchTerm.trim()) return bookingGroups;
    const term = searchTerm.toLowerCase();
    return bookingGroups.filter((b) =>
      safeText(b.bookingId).toLowerCase().includes(term) ||
      safeText(b.guestName).toLowerCase().includes(term) ||
      safeText(b.agentName).toLowerCase().includes(term) ||
      safeText(b.destination).toLowerCase().includes(term) ||
      b.lines.some((l) => safeText(l.name).toLowerCase().includes(term))
    );
  }, [bookingGroups, searchTerm]);

  const filteredCategoryLines = useMemo(() => {
    if (activeTab === 'bookings') return [];
    const source = activeTab === 'all-services' ? lines : (categories[activeTab] || []);
    if (!searchTerm.trim()) return source;
    const term = searchTerm.toLowerCase();
    return source.filter((l) =>
      safeText(l.name).toLowerCase().includes(term) ||
      safeText(l.bookingId).toLowerCase().includes(term) ||
      safeText(l.type).toLowerCase().includes(term) ||
      safeText(l.destination).toLowerCase().includes(term)
    );
  }, [activeTab, lines, categories, searchTerm]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-2 sm:p-4 backdrop-blur-sm transition-all"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] max-w-6xl w-full flex-col overflow-hidden rounded-2xl bg-[#F8FAFC] shadow-2xl border border-slate-200"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Compact Header Bar */}
        <header className="relative flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-slate-200/90 bg-white px-3 sm:px-5 py-2.5 sm:py-3 shadow-xs flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-10 sm:pr-0">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm flex-shrink-0">
              <Building2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Supplier Intelligence</span>
                <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[9.5px] font-bold text-emerald-700 border border-emerald-200/60">
                  Live Report
                </span>
              </div>
              <h2 className="text-[15px] sm:text-[16px] font-extrabold text-slate-900 leading-tight break-words">{supplier}</h2>
              <p className="text-[11px] text-slate-500 leading-tight">
                Generated {today()} · {lines.length} service records across {bookingGroups.length} bookings
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5 [&>button:first-of-type]:flex-1 sm:[&>button:first-of-type]:flex-none">
            {/* Outstanding Balance Quick Badge */}
            <div className={`flex items-center justify-between sm:justify-start gap-2 px-3 py-1 rounded-lg border text-right max-sm:order-first max-sm:w-full ${
              totals.outstanding <= 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Outstanding:</span>
              <span className="text-[13px] font-black">{money(totals.outstanding)}</span>
            </div>

            <button
              onClick={printReport}
              className="inline-flex h-8 items-center justify-center gap-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11.5px] font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Printer size={13} /> Print / Save PDF
            </button>

            <button
              onClick={onClose}
              className="absolute right-3 top-2.5 sm:static grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer shadow-xs"
              title="Close report"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-2.5 sm:p-4 space-y-3 sm:space-y-3.5 hide-scrollbar">
          {/* Compact 4 KPI Cards (Aligned with SalesReport & OperationalReport) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="card p-2.5 bg-white border border-blue-100/80 shadow-xs rounded-xl flex items-center gap-2.5 hover:shadow-sm transition-shadow">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0">
                <BookOpen size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider truncate">Bookings</div>
                <div className="text-[16px] font-black text-slate-900 leading-tight truncate">{bookingGroups.length}</div>
                <div className="text-[9.5px] font-medium text-slate-500 truncate">Total matched</div>
              </div>
            </div>

            <div className="card p-2.5 bg-white border border-purple-100/80 shadow-xs rounded-xl flex items-center gap-2.5 hover:shadow-sm transition-shadow">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600 border border-purple-100 flex-shrink-0">
                <DollarSign size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider truncate">Committed</div>
                <div className="text-[16px] font-black text-slate-900 leading-tight truncate">{money(totals.committed)}</div>
                <div className="text-[9.5px] font-medium text-slate-500 truncate">Agreed total cost</div>
              </div>
            </div>

            <div className="card p-2.5 bg-white border border-emerald-100/80 shadow-xs rounded-xl flex items-center gap-2.5 hover:shadow-sm transition-shadow">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
                <CheckCircle2 size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider truncate">Paid / Settled</div>
                <div className="text-[16px] font-black text-emerald-700 leading-tight truncate">{money(totals.paid)}</div>
                <div className="text-[9.5px] font-medium text-slate-500 truncate">Settled disbursements</div>
              </div>
            </div>

            <div className={`card p-2.5 bg-white border ${totals.outstanding > 0 ? 'border-rose-100/80' : 'border-emerald-100/80'} shadow-xs rounded-xl flex items-center gap-2.5 hover:shadow-sm transition-shadow`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${totals.outstanding > 0 ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'} flex-shrink-0`}>
                <AlertCircle size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider truncate">Outstanding</div>
                <div className={`text-[16px] font-black ${totals.outstanding > 0 ? 'text-rose-600' : 'text-slate-900'} leading-tight truncate`}>{money(totals.outstanding)}</div>
                <div className="text-[9.5px] font-medium text-slate-500 truncate">
                  {totals.outstanding <= 0 ? 'Fully settled' : 'Pending payment'}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Navigation & Search Toolbar */}
          <div className="card p-2 bg-white border border-slate-200/90 shadow-xs rounded-xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 hide-scrollbar">
              <button
                onClick={() => setActiveTab('bookings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'bookings'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CalendarDays size={13} />
                <span>Booking Overview</span>
                <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'bookings' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {bookingGroups.length}
                </span>
              </button>

              {categories.Transfers.length > 0 && (
                <button
                  onClick={() => setActiveTab('Transfers')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'Transfers'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Route size={13} />
                  <span>Transfers</span>
                  <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'Transfers' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {categories.Transfers.length}
                  </span>
                </button>
              )}

              {categories['Sightseeing & Activities'].length > 0 && (
                <button
                  onClick={() => setActiveTab('Sightseeing & Activities')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'Sightseeing & Activities'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <MapPinned size={13} />
                  <span>Sightseeing</span>
                  <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'Sightseeing & Activities' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {categories['Sightseeing & Activities'].length}
                  </span>
                </button>
              )}

              {categories.Hotels.length > 0 && (
                <button
                  onClick={() => setActiveTab('Hotels')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'Hotels'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Hotel size={13} />
                  <span>Hotels</span>
                  <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'Hotels' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {categories.Hotels.length}
                  </span>
                </button>
              )}

              {categories['Other Services'].length > 0 && (
                <button
                  onClick={() => setActiveTab('Other Services')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'Other Services'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileText size={13} />
                  <span>Other</span>
                  <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'Other Services' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {categories['Other Services'].length}
                  </span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('all-services')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'all-services'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers size={13} />
                <span>All Services</span>
                <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'all-services' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {lines.length}
                </span>
              </button>
            </div>

            <div className="relative flex-1 min-w-0 sm:min-w-[200px] w-full sm:max-w-xs">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search bookings, guests, services..."
                className="w-full form-input pl-8 pr-7 h-8 text-[11.5px] rounded-lg border-slate-200 bg-slate-50/70 focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
              />
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Tab Content: Bookings Overview Table */}
          {activeTab === 'bookings' && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <CalendarDays size={14} className="text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-800">Booking-Wise Commitments & Settlement</h3>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {filteredBookings.length} booking{filteredBookings.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#F1F5F9] sticky top-0 z-20 shadow-xs">
                    <tr>
                      <th className="w-8 px-2 py-2 text-center text-[10px] font-bold uppercase text-slate-500 bg-[#F1F5F9] border-b border-slate-200">
                        {/* expand arrow column */}
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-[#F1F5F9] border-b border-slate-200 whitespace-nowrap">
                        Booking / Guest
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-[#F1F5F9] border-b border-slate-200 whitespace-nowrap">
                        Agent
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-[#F1F5F9] border-b border-slate-200 whitespace-nowrap">
                        Destination / Travel Date
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-[#F1F5F9] border-b border-slate-200 text-center whitespace-nowrap">
                        Services
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-[#F1F5F9] border-b border-slate-200 text-right whitespace-nowrap">
                        Committed
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-[#F1F5F9] border-b border-slate-200 text-right whitespace-nowrap">
                        Paid
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-[#F1F5F9] border-b border-slate-200 text-right whitespace-nowrap">
                        Outstanding
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-[#F1F5F9] border-b border-slate-200 text-center whitespace-nowrap">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => {
                      const isExpanded = expandedBookings.has(b.bookingId);
                      const isSettled = amount(b.outstanding) <= 0;
                      const isPartial = !isSettled && amount(b.paid) > 0;
                      return (
                        <React.Fragment key={b.bookingId}>
                          <tr
                            onClick={() => toggleExpand(b.bookingId)}
                            className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors cursor-pointer group"
                          >
                            <td className="px-2 py-2 text-center text-slate-400 group-hover:text-blue-600">
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              <span className="font-bold text-blue-600 hover:underline">{b.bookingId}</span>
                              <div className="text-[10.5px] text-slate-500 font-medium leading-tight">{b.guestName || 'Client'}</div>
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-700 font-medium whitespace-nowrap">
                              {b.agentName || 'Direct Client'}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              <div className="font-semibold text-slate-800 leading-tight">{b.destination || 'Unspecified'}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{dateLabel(b.travelDate)}</div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                                {b.lines.length} service{b.lines.length === 1 ? '' : 's'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs font-semibold text-slate-800 text-right tabular-nums whitespace-nowrap">
                              {money(b.committed)}
                            </td>
                            <td className="px-3 py-2 text-xs font-semibold text-emerald-700 text-right tabular-nums whitespace-nowrap">
                              {money(b.paid)}
                            </td>
                            <td className={`px-3 py-2 text-xs font-bold text-right tabular-nums whitespace-nowrap ${
                              isSettled ? 'text-slate-400' : 'text-rose-600'
                            }`}>
                              {money(b.outstanding)}
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[9.5px] font-bold ${
                                isSettled
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : isPartial
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-rose-100 text-rose-700'
                              }`}>
                                {isSettled ? 'Settled' : isPartial ? 'Partially Paid' : 'Pending'}
                              </span>
                            </td>
                          </tr>

                          {/* Expanded Service Sub-Rows */}
                          {isExpanded && (
                            <tr className="bg-slate-50/70 border-b border-slate-200">
                              <td colSpan={9} className="px-4 py-2.5">
                                <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs">
                                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                                    <span>Services included in {b.bookingId}</span>
                                    <span>{b.lines.length} item{b.lines.length === 1 ? '' : 's'}</span>
                                  </div>
                                  <table className="w-full text-left text-xs">
                                    <thead>
                                      <tr className="text-[9.5px] font-bold text-slate-400 uppercase border-b border-slate-100">
                                        <th className="py-1 px-2">Service</th>
                                        <th className="py-1 px-2">Type</th>
                                        <th className="py-1 px-2">Travel Date</th>
                                        <th className="py-1 px-2 text-right">Cost</th>
                                        <th className="py-1 px-2 text-right">Paid</th>
                                        <th className="py-1 px-2 text-right">Outstanding</th>
                                        <th className="py-1 px-2 text-center">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-[11px]">
                                      {b.lines.map((l, idx) => (
                                        <tr key={l.key || idx} className="hover:bg-slate-50">
                                          <td className="py-1.5 px-2 font-semibold text-slate-800">{l.name}</td>
                                          <td className="py-1.5 px-2 text-slate-500">{l.type || 'Service'}</td>
                                          <td className="py-1.5 px-2 text-slate-500">{dateLabel(l.travelDate)}</td>
                                          <td className="py-1.5 px-2 text-right font-medium text-slate-700">{money(l.totalCost)}</td>
                                          <td className="py-1.5 px-2 text-right font-medium text-emerald-700">{money(l.supplierPaid)}</td>
                                          <td className={`py-1.5 px-2 text-right font-bold ${amount(l.supplierRemaining) <= 0 ? 'text-slate-400' : 'text-rose-600'}`}>
                                            {money(l.supplierRemaining)}
                                          </td>
                                          <td className="py-1.5 px-2 text-center">
                                            <span className={`inline-flex rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                                              amount(l.supplierRemaining) <= 0
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : amount(l.supplierPaid) > 0
                                                  ? 'bg-amber-100 text-amber-700'
                                                  : 'bg-rose-100 text-rose-700'
                                            }`}>
                                              {amount(l.supplierRemaining) <= 0 ? 'Settled' : amount(l.supplierPaid) > 0 ? 'Partial' : 'Open'}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {!filteredBookings.length && (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                          No bookings match your current search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab Content: Category Service Tables */}
          {activeTab !== 'bookings' && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Route size={14} className="text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-800">
                    {activeTab === 'all-services' ? 'All Supplier Services' : `${activeTab} Breakdown`}
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {filteredCategoryLines.length} record{filteredCategoryLines.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#F1F5F9] sticky top-0 z-20 shadow-xs">
                    <tr>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-[#F1F5F9] border-b border-slate-200 whitespace-nowrap">
                        Service Name & Category
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-[#F1F5F9] border-b border-slate-200 whitespace-nowrap">
                        Booking ID
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-[#F1F5F9] border-b border-slate-200 whitespace-nowrap">
                        Travel Date
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-[#F1F5F9] border-b border-slate-200 text-right whitespace-nowrap">
                        Committed
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-[#F1F5F9] border-b border-slate-200 text-right whitespace-nowrap">
                        Paid
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-[#F1F5F9] border-b border-slate-200 text-right whitespace-nowrap">
                        Outstanding
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-[#F1F5F9] border-b border-slate-200 text-center whitespace-nowrap">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCategoryLines.map((l, index) => {
                      const isSettled = amount(l.supplierRemaining) <= 0;
                      const isPartial = !isSettled && amount(l.supplierPaid) > 0;
                      return (
                        <tr key={l.key || index} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-3 py-2 text-xs">
                            <div className="font-semibold text-slate-800 leading-tight">{l.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{l.type || 'Service'}</div>
                          </td>
                          <td className="px-3 py-2 text-xs font-bold text-blue-600 hover:underline whitespace-nowrap">
                            {l.bookingId}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                            {dateLabel(l.travelDate)}
                          </td>
                          <td className="px-3 py-2 text-xs font-semibold text-slate-800 text-right tabular-nums whitespace-nowrap">
                            {money(l.totalCost)}
                          </td>
                          <td className="px-3 py-2 text-xs font-semibold text-emerald-700 text-right tabular-nums whitespace-nowrap">
                            {money(l.supplierPaid)}
                          </td>
                          <td className={`px-3 py-2 text-xs font-bold text-right tabular-nums whitespace-nowrap ${
                            isSettled ? 'text-slate-400' : 'text-rose-600'
                          }`}>
                            {money(l.supplierRemaining)}
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[9.5px] font-bold ${
                              isSettled
                                ? 'bg-emerald-100 text-emerald-700'
                                : isPartial
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-rose-100 text-rose-700'
                            }`}>
                              {isSettled ? 'Settled' : isPartial ? 'Partially Paid' : 'Open'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {!filteredCategoryLines.length && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                          No service records found in this category.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Compact Footer */}
        <footer className="flex items-center justify-between border-t border-slate-200/90 bg-white px-5 py-2.5 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Live data based on active report filters</span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              Settlement Rate: <strong className="text-slate-700 font-bold">{totals.committed ? Math.round((totals.paid / totals.committed) * 100) : 100}%</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
              <UserRound size={12} className="text-blue-600" /> Confidential Supplier Report
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
