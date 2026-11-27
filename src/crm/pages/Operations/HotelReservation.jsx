import React, { useMemo, useState } from "react";
import { ExternalLink, RefreshCw, Search, Bed, Download, LayoutDashboard, SlidersHorizontal, Plus, Eye, CheckCircle, Clock3, XCircle, Users, TrendingUp, MoreVertical, FileText, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { downloadExcelTable } from "../../lib/exportTable";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import {
  bookingInvoicePaymentState,
  bookingPaymentLines,
  linePaymentState,
} from "../../lib/bookingPayments";
import { formatDate } from "../../lib/date";
import DateInput from "../../components/ui/DateInput";
import MiniBars from "../../components/ui/MiniBars";

const RESERVATION_STATUSES = [
  "Pending",
  "Requested",
  "Confirmed",
  "On Hold",
  "Cancelled",
];
const COL_KEYS = ["check","query","guest","pax","hotel","stay","room","paxs","supplier","confirm","status","payment","voucher","profit","action"];
const COLUMN_OPTIONS = [
  ["query", "Query / Booking ID"], ["guest", "Guest Name"], ["pax", "Pax"], ["hotel", "Hotel / Details"],
  ["stay", "Stay Details"], ["room", "Room & Meal"], ["paxs", "Room Pax"], ["supplier", "Supplier"],
  ["confirm", "Confirmation"], ["status", "Booking Status"], ["payment", "Payment Status"],
  ["voucher", "Voucher"], ["profit", "Profit (THB)"], ["action", "Action"],
];
const EXPORTABLE = {
  query: ["Query ID", (r) => r.booking.queryId || r.booking.id],
  booking: ["Booking ID", (r) => r.booking.id],
  guest: ["Guest Name", (r) => r.booking.guestName || ""],
  pax: ["Pax", (r) => Number(r.booking.adults || 0) + Number(r.booking.children || 0)],
  hotel: ["Hotel", (r) => r.hotel.name || r.hotel.hotel || ""],
  stay: ["Check In - Check Out", (r) => `${r.checkIn} to ${r.checkOut} (${r.nights.length} nights)`],
  room: ["Room & Meal", (r) => `${r.hotel.roomType || ""} ${r.hotel.mealPlan || r.hotel.boardBasis || ""}`.trim()],
  paxs: ["Room Pax", (r) => roomLines(r.hotel, r.booking).join(" + ")],
  supplier: ["Supplier", (r) => r.hotel.supplierName || r.hotel.supplier || ""],
  confirm: ["Confirmation No", (r) => r.hotel.confirmationNo || r.hotel.confirmationNumber || ""],
  status: ["Booking Status", (r) => r.status],
  payment: ["Payment Status", (r) => (r.clientPayment.remaining > 0 ? (r.clientPayment.paid > 0 ? "Part Paid" : "Pending") : "Paid")],
  profit: ["Profit (THB)", (r) => Number(r.payment.grossProfit || 0)],
};
const inputClass =
  "h-8 min-w-28 rounded-lg border border-slate-300 bg-white px-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
const dateOnly = (value) => String(value || "").slice(0, 10);
const attachmentUrl = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(attachmentUrl).find(Boolean) || "";
  return attachmentUrl(value.url || value.secureUrl || value.secure_url || value.imageUrl || value.src || value.path);
};
const hotelImageFor = (hotel = {}, hotelMasters = []) => {
  const id = hotel.hotelId || hotel.masterId || hotel.id;
  const name = String(hotel.name || hotel.hotel || hotel.hotelName || "").trim().toLowerCase();
  const master = hotelMasters.find((item) => String(item.id || item._id || "") === String(id || ""))
    || hotelMasters.find((item) => String(item.name || item.hotel || "").trim().toLowerCase() === name);
  return attachmentUrl([
    master?.hotelImage, master?.image, master?.imageUrl, master?.images,
    hotel.hotelImage, hotel.image, hotel.imageUrl, hotel.images,
  ]);
};
// Keep this aligned with paymentLineKey('hotel', hotel, index) so that a stay
// without a persisted id still resolves to its live supplier-payment ledger.
const hotelKey = (hotel, index) => hotel.id || String(index);
const roomText = (hotel, booking) => {
  const allocation =
    hotel.roomAllocation ||
    (hotel.rooms && typeof hotel.rooms === "object" ? hotel.rooms : {});
  const labels = [
    ["sgl", "SGL"],
    ["dbl", "DBL"],
    ["adultExtraBed", "Extra Bed"],
    ["cwb", "CWB"],
    ["cnb", "CNB"],
    ["inf", "Infant"],
  ];
  const parts = labels
    .filter(([field]) => Number(allocation?.[field] || 0) > 0)
    .map(([field, label]) => `${Number(allocation[field])} ${label}`);
  if (parts.length) return parts.join(" + ");
  const rooms = Number(
    hotel.roomsRequired || hotel.rooms || booking.rooms || 0,
  );
  return rooms > 0
    ? `${rooms} Room${rooms === 1 ? "" : "s"}`
    : "Room allocation on request";
};
const roomLines = (hotel = {}, booking = {}) => {
  const has = (a) => a && typeof a === "object" && Object.values(a).some((v) => Number(v || 0) > 0);
  const allocation = [hotel.roomAllocation, hotel.rooms, booking.roomAllocation].find(has) || {};
  const labels = [["sgl", "Single (s)"], ["dbl", "Double (s)"], ["adultExtraBed", "Extra Bed (s)"], ["cwb", "CWB"], ["cnb", "CNB"], ["inf", "Infant (s)"]];
  const lines = labels.filter(([f]) => Number(allocation[f] || 0) > 0).map(([f, l]) => `${Number(allocation[f])} ${l}`);
  if (lines.length) return lines;
  const n = Number(hotel.roomsRequired || (typeof hotel.rooms !== "object" && hotel.rooms) || booking.rooms || 0);
  return [n > 0 ? `${n} Room${n === 1 ? "" : "s"}` : "On request"];
};
const statusStyle = (status) =>
  status === "Confirmed"
    ? "bg-emerald-100 text-emerald-700"
    : status === "Cancelled"
      ? "bg-red-100 text-red-700"
      : status === "On Hold"
        ? "bg-violet-100 text-violet-700"
        : "bg-amber-100 text-amber-700";
const paymentStyle = (status) =>
  status === "Paid"
    ? "bg-emerald-100 text-emerald-700"
    : status === "Part Paid"
      ? "bg-blue-100 text-blue-700"
      : "bg-amber-100 text-amber-700";
const reservationStatusFor = (hotel = {}) => {
  const saved = hotel.reservationStatus || hotel.status || "Pending";
  return ({ Confirm: "Confirmed", Cancel: "Cancelled" })[saved] || saved;
};
const ORDINAL = (number) =>
  `${number}${number % 10 === 1 && number % 100 !== 11 ? "st" : number % 10 === 2 && number % 100 !== 12 ? "nd" : number % 10 === 3 && number % 100 !== 13 ? "rd" : "th"}`;
function nightsFor(checkIn, checkOut, fallback = 0) {
  const start = dateOnly(checkIn);
  const end = dateOnly(checkOut);
  const dates = [];
  if (start && end) {
    const cursor = new Date(`${start}T00:00:00`);
    const final = new Date(`${end}T00:00:00`);
    while (cursor < final && dates.length < 60) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  if (!dates.length && start)
    return Array.from(
      { length: Math.max(1, Number(fallback || 1)) },
      (_, index) => {
        const date = new Date(`${start}T00:00:00`);
        date.setDate(date.getDate() + index);
        return date.toISOString().slice(0, 10);
      },
    );
  return dates;
}

export default function HotelReservation() {
  const navigate = useNavigate();
  const { bookings, hotels, updateBooking, refreshData } = useApp();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [colsOpen, setColsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [visibleCols, setVisibleCols] = useState(() => COLUMN_OPTIONS.map(([k]) => k));
  const toggleCol = (key) => setVisibleCols((cols) => (cols.includes(key) ? cols.filter((k) => k !== key) : [...cols, key]));
  const hiddenCss = COLUMN_OPTIONS.filter(([k]) => !visibleCols.includes(k)).map(([k]) => `[data-col="${k}"]`).join(",");
  const exportCsv = () => {
    const keys = COLUMN_OPTIONS.map(([k]) => k).filter((k) => visibleCols.includes(k) && EXPORTABLE[k]);
    if (visibleCols.includes("query")) keys.splice(keys.indexOf("query") + 1, 0, "booking");
    if (!keys.length) return toast.error("Select at least one column to export.");
    if (!rows.length) return toast.error("No hotel bookings to export.");
    downloadExcelTable({
      filename: `hotel-reservations-${new Date().toISOString().slice(0, 10)}`,
      head: keys.map((k) => EXPORTABLE[k][0]),
      rows: rows.map((r) => keys.map((k) => EXPORTABLE[k][1](r))),
    });
    toast.success(`Exported ${rows.length} rows.`);
  };
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const rows = useMemo(
    () =>
      bookings
        .flatMap((booking) => {
          const lines = bookingPaymentLines(booking);
          const clientPayment = bookingInvoicePaymentState(booking);
          return (booking.hotels || []).map((hotel, index) => {
            const key = hotelKey(hotel, index);
            const line = lines.find((item) => item.key === `hotel:${key}`);
            const payment = line
              ? linePaymentState(booking, line)
              : { supplierRemaining: 0, supplierPaid: 0, grossProfit: 0 };
            const checkIn = dateOnly(hotel.checkIn || booking.arrivalDate);
            const checkOut = dateOnly(hotel.checkOut || booking.departureDate);
            return {
              booking,
              hotel,
              index,
              key,
              payment,
              clientPayment,
              checkIn,
              checkOut,
              nights: nightsFor(checkIn, checkOut, hotel.nights),
              status: reservationStatusFor(hotel),
              imageUrl: hotelImageFor(hotel, hotels || []),
            };
          });
        })
        .filter((row) => {
          const haystack = [
            row.booking.id,
            row.booking.queryId,
            row.booking.guestName,
            row.hotel.name,
            row.hotel.hotel,
            row.hotel.supplier,
            row.hotel.supplierName,
          ]
            .join(" ")
            .toLowerCase();
          const company = row.booking.company || "TripNest";
          return (
            (!fromDate || row.checkIn >= fromDate) &&
            (!toDate || row.checkIn <= toDate) &&
            (!search || haystack.includes(search.toLowerCase())) &&
            (statusFilter === "All" || row.status === statusFilter) &&
            (companyFilter === "All" || company === companyFilter)
          );
        }),
    [bookings, hotels, fromDate, toDate, statusFilter, companyFilter, search],
  );
  const companies = useMemo(
    () => [
      ...new Set(bookings.map((booking) => booking.company).filter(Boolean)),
    ],
    [bookings],
  );
  const saveHotel = async (row, patch) => {
    const key = `${row.booking.id}:${row.key}`;
    setSavingKey(key);
    try {
      const hotels = (row.booking.hotels || []).map((hotel, index) =>
        index === row.index ? { ...hotel, ...patch } : hotel,
      );
      await updateBooking(row.booking.id, {
        ...row.booking,
        hotels,
        activityLog: [
          {
            date: new Date().toISOString(),
            action: `Hotel reservation updated: ${row.hotel.name || row.hotel.hotel || "Hotel"}`,
            user: "Operations",
          },
          ...(row.booking.activityLog || []),
        ],
      });
      toast.success("Hotel reservation saved.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingKey("");
    }
  };
  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setStatusFilter("All");
    setCompanyFilter("All");
    setSearch("");
  };
  return (
    <div className="flex flex-col h-full overflow-y-auto lg:overflow-hidden bg-slate-50">
      {/* ── Page Header ── */}
      <div className="flex flex-col shrink-0 gap-2 px-3 sm:px-5 pt-3 sm:pt-4 pb-2.5 bg-white border-b border-slate-200">
        <div className="flex items-center sm:items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm"><Bed className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h1 className="text-[16px] sm:text-[18px] font-extrabold text-slate-900 tracking-tight leading-tight truncate">Hotel Reservation</h1>
              <p className="hidden sm:block text-xs text-slate-500 mt-0.5">Manage hotel bookings, room allocation, confirmation, payment and operations.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button type="button" onClick={() => setFiltersOpen(o => !o)} aria-expanded={filtersOpen} className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-bold ${filtersOpen ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-700"}`}><SlidersHorizontal className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => refreshData(["bookings"])} className="flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm">
              <RefreshCw className="h-3.5 w-3.5" /> <span className="hidden min-[480px]:inline">Save</span>
            </button>
            <button type="button" onClick={exportCsv} className="flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 hover:bg-slate-100 transition-colors shadow-sm">
              <Download className="h-3.5 w-3.5" /> <span className="hidden min-[480px]:inline">Export</span>
            </button>
            <div className="relative">
              <button type="button" onClick={() => setColsOpen((o) => !o)} aria-expanded={colsOpen} className="flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 hover:bg-slate-100 transition-colors shadow-sm">
                <LayoutDashboard className="h-3.5 w-3.5" /> <span className="hidden min-[480px]:inline">Columns</span>
              </button>
              {colsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setColsOpen(false)} />
                  <div className="absolute right-0 top-9 z-50 w-60 max-w-[calc(100vw-1.5rem)] rounded-xl border border-slate-300 bg-white p-2 shadow-xl">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <button type="button" onClick={() => setVisibleCols(COLUMN_OPTIONS.map(([k]) => k))} className="flex-1 h-7 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700">Select all</button>
                      <button type="button" onClick={() => setVisibleCols([])} className="flex-1 h-7 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold hover:bg-slate-200">Clear all</button>
                    </div>
                    <div className="mt-1 max-h-72 overflow-y-auto">
                      {COLUMN_OPTIONS.map(([key, label]) => (
                        <label key={key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          <input type="checkbox" checked={visibleCols.includes(key)} onChange={() => toggleCol(key)} className="rounded border-slate-300" />
                          {label}
                        </label>
                      ))}
                    </div>
                    <div className="mt-1 border-t border-slate-200 pt-1.5 text-[10px] text-slate-500">Selected columns show in the table and are used for Export.</div>
                  </div>
                </>
              )}
            </div>
            <button type="button" onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm">
              <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Add Hotel Booking</span><span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className={`${filtersOpen ? "grid sm:flex" : "hidden"} grid-cols-2 sm:flex-wrap items-center gap-1.5 sm:rounded-xl sm:border sm:border-slate-300 sm:bg-slate-50 sm:p-2 [&>*]:min-w-0 max-sm:[&_input]:!w-full max-sm:[&_select]:!w-full`}>
          <div className="sm:w-[128px]"><DateInput ariaLabel="Start date" value={fromDate} onChange={setFromDate} className={`${inputClass} w-full`} compact /></div>
          <div className="sm:w-[128px]"><DateInput ariaLabel="End date" value={toDate} onChange={setToDate} className={`${inputClass} w-full`} compact /></div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`${inputClass} w-[130px]`}>
            <option>All Status</option>
            {RESERVATION_STATUSES.map(status => <option key={status}>{status}</option>)}
          </select>
          <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className={`${inputClass} w-[130px]`}>
            <option>All Company</option>
            {companies.map(company => <option key={company}>{company}</option>)}
          </select>
          <select className={`${inputClass} w-[130px] max-sm:col-span-2`}>
             <option>All Hotels</option>
          </select>
          <label className="relative sm:min-w-64 sm:flex-1 col-span-2">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search hotel, booking, guest, query..." className={`${inputClass} w-full pl-8`} />
          </label>
          <button type="button" onClick={() => refreshData(["bookings"])} className="h-7 px-4 rounded-lg bg-blue-600 max-sm:w-full text-white text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-1">
            <Search className="h-3 w-3" /> Search
          </button>
          <button type="button" onClick={clearFilters} className="h-7 px-4 rounded-lg bg-slate-100 max-sm:w-full text-slate-600 text-xs font-semibold hover:bg-slate-200 transition-colors">
            Reset
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2 sm:px-5 sm:py-2.5">
        <div className="-mx-3 flex snap-x gap-2 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:gap-2.5 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {[
            ['Total Bookings', rows.length, 'All hotel bookings', Bed, 'from-indigo-500 to-violet-600', 'text-indigo-500'],
            ['Confirmed', rows.filter(r => r.status === 'Confirmed').length, 'Ready to travel', CheckCircle, 'from-emerald-400 to-green-600', 'text-emerald-500'],
            ['Pending', rows.filter(r => r.status === 'Pending').length, 'Awaiting confirmation', Clock3, 'from-amber-400 to-orange-500', 'text-orange-500'],
            ['Cancelled', rows.filter(r => r.status === 'Cancelled').length, 'Cancelled stays', XCircle, 'from-rose-400 to-red-600', 'text-rose-500'],
            ['Total Guests', rows.reduce((sum, r) => sum + Number(r.booking.adults || 0) + Number(r.booking.children || 0), 0), 'Adults + children', Users, 'from-blue-500 to-sky-600', 'text-blue-500'],
            ['Total Profit', `THB ${rows.reduce((sum, r) => sum + Number(r.payment.grossProfit || 0), 0).toLocaleString()}`, 'Gross profit', TrendingUp, 'from-purple-500 to-fuchsia-600', 'text-purple-500'],
          ].map(([label, value, sub, Icon, grad, bar]) => (
            <div key={label} className="group relative flex h-[62px] min-w-[158px] flex-1 shrink-0 snap-start items-center overflow-hidden rounded-xl border border-slate-300 bg-white px-2.5 shadow-sm transition-all hover:shadow-md sm:min-w-[170px] sm:px-3">
              <div className="relative z-10 flex min-w-0 items-center gap-2.5">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${grad} text-white shadow-md transition-transform duration-300 group-hover:scale-105`}><Icon className="h-4 w-4" /></span>
                <div className="min-w-0 leading-tight">
                  <div className="truncate text-[9.5px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
                  <div className="truncate text-[15px] font-extrabold text-slate-800 sm:text-base">{value}</div>
                  <div className="truncate text-[10px] text-slate-400">{sub}</div>
                </div>
              </div>
              <MiniBars value={value} className={bar} show="hidden 2xl:flex" />
            </div>
          ))}
        </div>
      </div>

      {hiddenCss && <style>{`${hiddenCss}{display:none}`}</style>}
      {addOpen && (() => {
        const q = addSearch.toLowerCase();
        const matches = bookings.filter((b) => [b.id, b.queryId, b.guestName].join(" ").toLowerCase().includes(q));
        const initials = (name) => String(name || "G").replace(/^(mr|mrs|ms|miss|dr)\.?\s+/i, "").split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-[4px] p-2 backdrop-blur-[4px]" onClick={() => setAddOpen(false)}>
          <div className="flex max-h-[min(72dvh,calc(100dvh-1rem))] w-[calc(100vw-1rem)] max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm"><Bed className="h-[18px] w-[18px]" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold leading-tight text-slate-900">Add Hotel Booking</div>
                  <div className="text-[10px] font-medium text-slate-500">Select a booking to add a hotel stay</div>
                </div>
                <span className="shrink-0 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600">{matches.length} bookings</span>
                <button type="button" onClick={() => setAddOpen(false)} aria-label="Close" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-slate-300 bg-white text-base font-bold leading-none text-slate-500 hover:bg-slate-100">×</button>
              </div>
              <label className="relative mt-2 block">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input autoFocus value={addSearch} onChange={(e) => setAddSearch(e.target.value)} placeholder="Search booking, guest, query..." className={`${inputClass} w-full pl-8`} />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-[#173567] text-left text-[9px] font-extrabold uppercase tracking-wider text-white">
                  <tr><th className="px-3 py-1.5">Guest</th><th className="px-2 py-1.5 whitespace-nowrap">Query ID</th><th className="px-2 py-1.5 whitespace-nowrap">Arrival</th><th className="px-3 py-1.5 text-right">Add</th></tr>
                </thead>
                <tbody className="[&>tr>td]:border-b [&>tr>td]:border-slate-200">
                  {matches.slice(0, 100).map((b, i) => (
                    <tr key={b.id} onClick={() => navigate(`/bookings/${b.id}?tab=Hotels`)} className={`group cursor-pointer hover:bg-blue-50 ${i % 2 ? "bg-slate-50" : "bg-white"}`}>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-indigo-200 bg-indigo-50 text-[9px] font-extrabold text-indigo-700">{initials(b.guestName)}</span>
                          <span className="max-w-[170px] truncate font-bold text-slate-800">{b.guestName || "Guest"}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5"><span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">{b.queryId || b.id}</span></td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-[11px] font-medium text-slate-600">{formatDate(b.arrivalDate)}</td>
                      <td className="px-3 py-1.5 text-right"><span className="ml-auto grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 transition-colors group-hover:bg-emerald-600 group-hover:text-white"><Plus className="h-3.5 w-3.5" /></span></td>
                    </tr>
                  ))}
                  {!matches.length && <tr><td colSpan="4" className="p-8 text-center text-slate-400">No bookings found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ── Table ── */}
      <div className="flex-none lg:flex-1 overflow-x-auto lg:overflow-auto">
        <table className="w-full min-w-[1900px] text-xs">
          <thead className="bg-[#173567] text-left text-[9px] uppercase tracking-wide text-white">
            <tr>
              {[
                "",
                "Query ID\nBooking ID",
                "Guest Name",
                "Pax",
                "Hotel / Details",
                "Stay Details",
                "Room & Meal",
                "Pax (s)",
                "Supplier",
                "Confirmation",
                "Booking Status",
                "Payment Status",
                "Voucher",
                "Profit\n(THB)",
                "Action",
              ].map((heading, index) => {
                let widthClass = "";
                let stickyClass = "";
                if (index === 0) {
                  widthClass = "w-[40px]";
                  stickyClass = "lg:sticky left-0 z-20";
                }
                if (index === 1) {
                  widthClass = "min-w-[140px]";
                  stickyClass = "lg:sticky left-[40px] z-20 shadow-[inset_-2px_0_2px_-2px_rgba(0,0,0,0.3)]";
                }
                if (heading === "Stay Details") widthClass = "min-w-[150px]";
                if (heading === "Hotel / Details") widthClass = "min-w-[270px]";
                
                return (
                  <th key={heading} data-col={COL_KEYS[index]} data-sort-header={heading ? "true" : undefined} className={`px-2 py-2 font-extrabold whitespace-pre-line text-[9px] uppercase tracking-wider ${widthClass} ${stickyClass} ${index === 0 ? 'border-l border-white/30' : ''}`}
                      style={stickyClass ? { background: '#173567' } : { background: '#173567' }}>
                    {heading}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white [&>tr>td]:border-b [&>tr>td]:border-slate-200">
            {rows.map((row, rowIdx) => {
              const hotel = row.hotel;
              const hotelName = hotel.name || hotel.hotel || "Hotel";
              const supplierStatus =
                row.payment.supplierRemaining > 0
                  ? row.payment.supplierPaid > 0
                    ? "Part Paid"
                    : "Pending"
                  : "Paid";
              const bookingStatus =
                row.clientPayment.remaining > 0
                  ? row.clientPayment.paid > 0
                    ? "Part Paid"
                    : "Pending"
                  : "Paid";
              const busy = savingKey === `${row.booking.id}:${row.key}`;
              const isEven = rowIdx % 2 === 0;
              const rowBg = isEven ? 'bg-white' : 'bg-slate-50';
              return (
                <tr
                  key={`${row.booking.id}-${row.key}`}
                  className={`group align-middle hover:bg-blue-50 ${rowBg}`}
                >
                  <td data-col="check" className={`px-2 py-2 lg:sticky left-0 z-10 ${rowBg} group-hover:bg-blue-50 border-r-0 align-middle`}>
                    <input type="checkbox" className="rounded border-slate-300" />
                  </td>
                  <td data-col="query" className={`px-2 py-2 lg:sticky z-10 ${rowBg} group-hover:bg-blue-50 shadow-[inset_-2px_0_2px_-2px_rgba(0,0,0,0.1)]`} style={{ left: '40px' }}>
                    <div className="font-bold text-slate-800 text-[11px] leading-tight">
                      {row.booking.queryId || row.booking.id}
                    </div>
                    <div className="font-mono font-medium text-emerald-600 text-[9px] mt-0.5">
                      BKG-00125
                    </div>
                    <div className="mt-1.5 inline-flex rounded bg-emerald-500 px-1.5 py-[1px] text-[8.5px] font-bold text-white shadow-sm leading-none">
                      {row.booking.company || "TripNest Pvt Ltd"}
                    </div>
                  </td>
                  <td data-col="guest" className="px-2 py-2">
                    <div className="font-bold text-slate-800 text-[11px] max-w-40 leading-tight">
                      {row.booking.guestName || "Guest"}
                    </div>
                    <div className="mt-1 text-[10px] font-medium text-slate-500">
                      {row.booking.mobile || row.booking.phone || ""}
                    </div>
                  </td>
                  <td data-col="pax" className="px-2 py-2 font-extrabold text-slate-800 text-center align-middle">
                    <div className="text-sm leading-none">{Number(row.booking.adults || 0) + Number(row.booking.children || 0)}</div>
                    <div className="text-[9px] font-bold text-slate-400 leading-none mt-0.5">(A-{row.booking.adults || 0})</div>
                  </td>
                  <td data-col="hotel" className="px-2 py-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-14 w-[68px] shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-slate-100 shadow-sm">
                        {row.imageUrl ? <img src={row.imageUrl} className="h-full w-full object-cover" alt={hotelName} onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <Bed className="m-auto h-full w-5 text-slate-400" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-800 text-[11px] leading-tight max-w-[200px]">{hotelName} <span className="font-bold text-amber-600">3 Star</span></div>
                        <div className="mt-0.5 text-[11px] leading-none text-amber-400 tracking-tight">★★★</div>
                        <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600"><MapPin className="h-3 w-3" />{hotel.city || hotel.itineraryDestination || row.booking.destination || "Pattaya"}</div>
                        <div className="text-[9.5px] font-medium text-slate-500 leading-tight">{hotel.contactNumber || hotel.phone || hotel.landline || "+66 3842 2331"}</div>
                      </div>
                    </div>
                  </td>
                  <td data-col="stay" className="px-2 py-2">
                    <div className="flex flex-col gap-1">
                      {row.nights.map((night, index) => (
                        <div key={night} className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 shadow-sm">
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-50 text-[9px] font-extrabold text-indigo-700 ring-1 ring-indigo-200">{index + 1}</span>
                          <div className="leading-tight">
                            <div className="whitespace-nowrap text-[10.5px] font-bold text-slate-700">{formatDate(night)}</div>
                            <div className="text-[9px] font-medium text-slate-400">{ORDINAL(index + 1)} Night</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td data-col="room" className="px-2 py-2">
                    <div className="flex flex-col gap-1">
                      {row.nights.map((night) => (
                        <div key={night} className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 shadow-sm">
                          <span className="max-w-[120px] truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200">{hotel.roomType || "Superior Room"}</span>
                          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">{hotel.mealPlan || hotel.boardBasis || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td data-col="paxs" className="px-2 py-2">
                    <div className="flex flex-col gap-1">
                      {row.nights.map((night) => (
                        <div key={night} className="flex min-h-9 flex-col justify-center rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold leading-tight text-slate-700 shadow-sm whitespace-nowrap">
                          {roomLines(hotel, row.booking).map((part, k) => <span key={k} className={k ? "font-medium text-slate-500" : ""}>{part}</span>)}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td data-col="supplier" className="px-2 py-2 align-middle">
                     <div className="font-bold text-slate-800 text-[11px] leading-tight">Golden Beach</div>
                  </td>
                  <td data-col="confirm" className="px-2 py-2 align-middle">
                     <div className="font-bold text-slate-800 text-[11px] leading-none mb-1">
                       RR159581
                     </div>
                     <div className="text-[9px] font-medium text-slate-500 leading-none">(06-09-2026)</div>
                  </td>
                  <td data-col="status" className="px-2 py-2 align-middle">
                    <select
                      value={row.status}
                      onChange={(event) =>
                        saveHotel(row, {
                          reservationStatus: event.target.value,
                          reservationStatusManuallySet: true,
                          status: event.target.value,
                        })
                      }
                      className={`h-6 rounded border border-slate-200 px-1.5 text-[9.5px] font-bold outline-none cursor-pointer ${statusStyle(row.status)}`}
                    >
                      {RESERVATION_STATUSES.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td data-col="payment" className="px-2 py-2 align-middle">
                    <span
                      className={`rounded px-1.5 py-1 text-[9.5px] font-bold ${paymentStyle(bookingStatus)}`}
                    >
                      {bookingStatus}
                    </span>
                  </td>
                  <td data-col="voucher" className="px-2 py-2 align-middle">
                    <div className="flex items-center gap-2 text-blue-600">
                      <FileText className="h-4 w-4 cursor-pointer hover:text-blue-800" />
                      <Download className="h-4 w-4 cursor-pointer hover:text-blue-800" />
                      <div className="text-[#25D366] cursor-pointer hover:opacity-80">
                         <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="css-i6dzq1"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                      </div>
                    </div>
                  </td>
                  <td data-col="profit" className={`px-2 py-2 align-middle font-extrabold text-[11px] ${Number(row.payment.grossProfit || 0) >= 0 ? "text-slate-800" : "text-red-700"}`}>
                    {Number(row.payment.grossProfit || 0).toLocaleString()}
                  </td>
                  <td data-col="action" className="px-2 py-2 align-middle">
                    <button
                      type="button"
                      onClick={() => navigate(`/bookings/${row.booking.id}?tab=Payments`)}
                      className="flex items-center justify-center h-6 w-6 rounded bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan="15" className="p-12 text-center text-slate-400">
                  No live hotel stays match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
