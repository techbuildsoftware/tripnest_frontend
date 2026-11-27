import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, Circle, Hotel, Car, Compass, Utensils,
  DollarSign, FileText, Users, Activity, CreditCard, Plus,
  Anchor, Plane, MoreHorizontal, Eye, Edit, Trash2, Copy, Download,
  ArrowUpDown, Package, X, MapPin, Calendar, Clock, Moon, Tag,
  BedDouble, User, Phone, Mail, Hash, Percent, BarChart2, Info, Sparkles,
  ChevronDown, ChevronUp, RefreshCw, Search,
  Paperclip,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../lib/api';
import StatusBadge from '../../components/ui/StatusBadge';
import RichTextEditor from '../../components/ui/RichTextEditor';
import DateInput from '../../components/ui/DateInput';
import toast from 'react-hot-toast';
import { downloadExcelTable } from '../../lib/exportTable';
import { formatDate, formatDateTime, todayIsoInTimeZone } from '../../lib/date';
import { bookingInvoicePaymentState, bookingPaymentLines, canOverrideSupplierForPaymentLine, linePaymentState, paymentLineKey, supplierPaymentDueDate, supplierPaymentTiming } from '../../lib/bookingPayments';
import { openPaymentInvoicePdf } from '../../lib/paymentInvoicePdf';
import useSalesMaster from '../../hooks/useSalesMaster';
import { activeMealPlanNames, currentMealPlanName, preferredMealPlanName } from '../../lib/mealPlans';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtN = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtI = (n) => Number(n || 0).toLocaleString();
const dispDate = formatDate;
const inputDateValue = (value) => /^\d{4}-\d{2}-\d{2}/.test(String(value || '')) ? String(value).slice(0, 10) : '';
const weekdayForDate = (value) => value ? new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${String(value).slice(0, 10)}T00:00:00Z`)) : '';
const normaliseWeekday = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return weekdays.find((day) => day.toLowerCase() === raw || day.slice(0, 3).toLowerCase() === raw.slice(0, 3)) || '';
};
const sightseeingTimingSlots = (master, date) => {
  const day = weekdayForDate(date);
  return [...new Set((master?.showTimings || [])
    .filter((timing) => {
      const rawDays = timing?.days || [];
      const days = rawDays.map(normaliseWeekday);
      return timing?.time && (!days.length || rawDays.some((item) => String(item).trim().toLowerCase() === 'all') || days.includes(day));
    })
    .map((timing) => timing.time))];
};
const latestSupplierPaymentDate = (booking, lineKey) => (booking?.payments || [])
  .filter((payment) => payment.type === 'Supplier Payment' && payment.status === 'Paid' && (payment.allocations || []).some((allocation) => String(allocation.lineId) === String(lineKey)))
  .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0]?.date || '';
const paymentLineDates = (line = {}) => {
  const item = line.item || {};
  if (line.kind === 'hotel') return {
    checkIn: inputDateValue(line.checkIn || item.checkIn || item.serviceDate || item.date),
    checkOut: inputDateValue(line.checkOut || item.checkOut),
    serviceDate: '',
  };
  return { checkIn: '', checkOut: '', serviceDate: inputDateValue(line.serviceDate || item.serviceDate || item.date || item.transferDate || item.startDate) };
};
const paymentLineDateLabel = (line = {}) => {
  const dates = paymentLineDates(line);
  if (line.kind === 'hotel') return [dates.checkIn && `Check-in ${formatDate(dates.checkIn)}`, dates.checkOut && `Check-out ${formatDate(dates.checkOut)}`].filter(Boolean).join(' · ') || '—';
  return dates.serviceDate ? formatDate(dates.serviceDate) : '—';
};

const TABS = ['Overview', 'Payments', 'Hotels', 'Services', 'Suppliers', 'Activity Log'];
const progressSteps = [
  { key: 'query', label: 'Query' }, { key: 'quoted', label: 'Quoted' },
  { key: 'confirmed', label: 'Confirmed' }, { key: 'travel', label: 'Travel' },
  { key: 'completed', label: 'Complete' }, { key: 'paid', label: 'Paid' },
];

// ─── Field accessors – normalise real data ↔ demo data ───────────────────────
const hotelOf = (h, idx) => ({
  _raw: h, rowNum: idx + 1,
  name: h.name || h.hotel || 'Unnamed Hotel',
  city: h.itineraryDestination || h.destination || h.city || '—',
  checkIn: dispDate(h.checkIn), checkOut: dispDate(h.checkOut),
  nights: h.nights || 0,
  roomType: h.roomType || h.roomCat || '—',
  roomBed: h.roomBed || '',
  mealPlan: h.mealPlan || h.meal || '—',
  rooms: h.rooms || h.roomCount || '—',
  pax: h.adults ? `${h.adults} Ad${h.children ? ` ${h.children} Ch` : ''}` : (h.pax || '—'),
  supplier: h.supplier || h.supplierName || '—',
  costPR: h.supplierCost || h.costPR || 0,
  totalCost: h.totalSupplierCost || h.totalCost || 0,
  sellPR: h.sellingPrice || h.sellPR || 0,
  totalSell: h.totalSellingPrice || h.totalSell || h.totalSelling || 0,
  profit: (h.totalSellingPrice || h.totalSell || 0) - (h.totalSupplierCost || h.totalCost || 0),
  markup: Number.isFinite(Number(h.markup)) ? Number(h.markup) : ((Number(h.totalSupplierCost || h.totalCost || 0) > 0) ? (((Number(h.totalSellingPrice || h.totalSell || h.totalSelling || 0) - Number(h.totalSupplierCost || h.totalCost || 0)) / Number(h.totalSupplierCost || h.totalCost || 0)) * 100) : 0),
  payStatus: h.payStatus || h.paymentStatus || 'Pending',
  paid: h.paid || 0, total: h.total || h.totalSellingPrice || 0, due: h.due || h.dueDate || '',
  paymentDate: h.paymentDate || '',
  imgGrad: h.imgGrad || 'from-blue-400 to-indigo-600',
  imageUrl: h.image?.url || h.hotelImage?.url || h.hotelImage || h.imageUrl || h.images?.[0]?.url || h.images?.[0] || h.image || '',
  status: h.status || 'Confirmed',
});

const attachmentName = (value) => {
  if (!value) return '';
  if (Array.isArray(value)) return value.map(attachmentName).find(Boolean) || '';
  if (typeof value === 'object') {
    const named = value.originalName || value.original_filename || value.originalname || value.fileName || value.filename || value.name;
    if (named) return String(named);
  }
  const url = attachmentUrl(value);
  if (!url) return '';
  try { return decodeURIComponent(url.split('?')[0].split('/').pop() || '') || 'Attachment'; } catch { return 'Attachment'; }
};
const attachmentUrl = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(attachmentUrl).find(Boolean) || '';
  if (typeof value === 'object') {
    return attachmentUrl(value.url || value.secureUrl || value.secure_url || value.imageUrl || value.src || value.path);
  }
  return '';
};

const normalisedServiceName = (value) => String(value || '').trim().toLocaleLowerCase();
const serviceMasterFor = (service, masters) => {
  const masterIds = [
    service?.masterId, service?.sightseeingId, service?.activityId,
    service?.restaurantId, service?.transferId, service?.yachtId,
  ].filter(Boolean).map(String);
  const byId = masters.find((item) => masterIds.includes(String(item?.id)) || masterIds.includes(String(item?._id)));
  if (byId) return byId;

  // Older quotations saved a display name (for example, "Coral Island · No
  // Meal") but not the master id. Match its master name prefix so its current
  // master image remains available after booking conversion.
  const serviceName = normalisedServiceName(service?.name);
  return masters.find((item) => {
    const name = normalisedServiceName(item?.name);
    if (!name || !serviceName) return false;
    if (name === serviceName || serviceName.startsWith(`${name} ·`) || serviceName.startsWith(`${name} -`)) return true;
    return (item?.variants || []).some((variant) => normalisedServiceName(variant?.name) === normalisedServiceName(service?.variantName));
  });
};

const serviceImageUrl = (service, master) => {
  const selectedVariant = (master?.variants || []).find((variant) => String(variant?.id) === String(service?.variantId));
  // Master media deliberately comes first. A booking stores a historical
  // service snapshot, but its thumbnail must reflect a later master-image
  // update whenever that master can still be identified.
  return attachmentUrl([
    selectedVariant?.image, selectedVariant?.images,
    master?.image, master?.images,
    service?.image, service?.imageUrl, service?.images,
  ]);
};

const hasPassengerValue = (value) => value !== undefined && value !== null && value !== '';
const servicePassengerCounts = (service = {}, booking = {}) => {
  const hasServiceCounts = ['adults', 'children', 'infants'].some((key) => hasPassengerValue(service[key]));
  const source = hasServiceCounts ? service : booking;
  return {
    hasServiceCounts,
    adults: Number(source.adults || 0),
    children: Number(source.children || 0),
    infants: Number(source.infants || 0),
  };
};

const serviceOf = (s, idx, booking = {}) => {
  const passengers = servicePassengerCounts(s, booking);
  const passengerTotal = passengers.adults + passengers.children + passengers.infants;
  const savedPax = Number.parseFloat(s.pax);
  const pax = passengers.hasServiceCounts
    ? `${passengers.adults} Ad${passengers.children ? ` ${passengers.children} Ch` : ''}${passengers.infants ? ` ${passengers.infants} Inf` : ''}`
    : (s.pax || (passengerTotal ? `${passengers.adults} Ad${passengers.children ? ` ${passengers.children} Ch` : ''}${passengers.infants ? ` ${passengers.infants} Inf` : ''}` : '—'));
  return {
  _raw: s, rowNum: idx + 1,
  name: s.name || 'Unnamed Service',
  type: s.type || 'Others',
  date: dispDate(s.serviceDate || s.date),
  time: s.time || '',
  details: s.details || s.variantName || s.basis || '',
  detailSub: s.detailSub || s.inclusions?.join(', ') || '',
  supplier: s.yachtSupplier || s.transferVehicleSupplier || s.vehicleSupplierName || s.supplier || '—',
  pax,
  // `pax` is a display label (for example "4 Ad"). Keep a numeric value for
  // the edit form: browsers intentionally blank invalid values in number
  // inputs, which previously hid the passenger count.
  paxCount: passengerTotal || savedPax || 0,
  cost: s.totalSupplierCost || s.cost || 0,
  selling: s.totalSellingPrice || s.selling || 0,
  profit: (s.totalSellingPrice || s.selling || 0) - (s.totalSupplierCost || s.cost || 0),
  payStatus: s.payStatus || s.paymentStatus || 'Pending',
  paid: s.paid || 0, total: s.total || s.totalSellingPrice || 0, due: s.due || s.dueDate || '',
  paymentDate: s.paymentDate || '',
  imgGrad: s.imgGrad || 'from-purple-400 to-indigo-500',
  imageUrl: attachmentUrl([s.image, s.imageUrl, s.images]),
  status: s.status || 'Confirmed',
  markup: Number.isFinite(Number(s.markup)) ? Number(s.markup) : ((Number(s.totalSupplierCost || s.cost || 0) > 0) ? (((Number(s.totalSellingPrice || s.selling || 0) - Number(s.totalSupplierCost || s.cost || 0)) / Number(s.totalSupplierCost || s.cost || 0)) * 100) : 0),
  notes: s.notes || '',
  };
};

// ─── Demo fallback data (matches real schema) ─────────────────────────────────
const DEMO_HOTELS = [
  { name: 'Ramada Plaza by Wyndham Bangkok Riverside', itineraryDestination: 'Bangkok', imgGrad: 'from-blue-400 to-indigo-600', checkIn: '2026-08-12', checkOut: '2026-08-14', nights: 2, roomType: 'Deluxe Room', roomBed: 'Double', mealPlan: 'RB', rooms: 2, adults: 2, children: 2, supplier: 'Rama Hospitality Co., Ltd.', supplierCost: 3200, totalSupplierCost: 12800, sellingPrice: 4200, totalSellingPrice: 16800, payStatus: 'Deposit Paid', paid: 8000, total: 16800, due: '05 Aug 2026' },
  { name: 'Grande Centre Point Pattaya', itineraryDestination: 'Pattaya', imgGrad: 'from-cyan-400 to-blue-500', checkIn: '2026-08-14', checkOut: '2026-08-16', nights: 2, roomType: 'Deluxe Sea View', roomBed: 'Twin', mealPlan: 'RB', rooms: 2, adults: 2, children: 2, supplier: 'Centre Point Hospitality', supplierCost: 4000, totalSupplierCost: 16000, sellingPrice: 5500, totalSellingPrice: 22000, payStatus: 'Paid', paid: 22000, total: 22000, due: '01 Aug 2026' },
  { name: 'Grande Centre Point Terminal 21', itineraryDestination: 'Bangkok', imgGrad: 'from-emerald-400 to-teal-600', checkIn: '2026-08-16', checkOut: '2026-08-17', nights: 1, roomType: 'Premium Room', roomBed: 'Double', mealPlan: 'RB', rooms: 2, adults: 2, children: 2, supplier: 'Grande Centre Point', supplierCost: 3500, totalSupplierCost: 7000, sellingPrice: 4800, totalSellingPrice: 9600, payStatus: 'Pending', paid: 0, total: 9600, due: '10 Aug 2026' },
];
const DEMO_SERVICES = [
  { name: 'Suvarnabhumi Airport → Pattaya Hotel', type: 'Transfer', imgGrad: 'from-blue-400 to-blue-600', serviceDate: '2026-08-12', time: '10:00', details: 'Private Van', detailSub: 'Enroute (None)', supplier: 'Pattaya Transfer Co., Ltd.', adults: 4, children: 0, totalSupplierCost: 2500, totalSellingPrice: 3500, payStatus: 'Deposit Paid', paid: 2500, total: 2500, due: '01 Aug 2026' },
  { name: 'Coral Island (Koh Larn) by Speedboat with Lunch', type: 'Sightseeing', imgGrad: 'from-cyan-400 to-teal-500', serviceDate: '2026-08-13', time: '08:00 – 16:00', details: 'Speedboat + Lunch', detailSub: 'National Park Fee Included', supplier: 'Sea Star Marine', adults: 4, children: 0, totalSupplierCost: 3000, totalSellingPrice: 4200, payStatus: 'Paid', paid: 12000, total: 12000, due: '02 Aug 2026' },
  { name: 'Alcazar Cabaret Show (Deluxe Seat)', type: 'Sightseeing', imgGrad: 'from-purple-500 to-pink-600', serviceDate: '2026-08-14', time: '19:00 – 21:00', details: 'Deluxe Seat', detailSub: 'Hotel Transfer Included', supplier: 'Alcazar Show Co., Ltd.', adults: 4, children: 0, totalSupplierCost: 2400, totalSellingPrice: 3600, payStatus: 'Deposit Paid', paid: 4800, total: 9600, due: '10 Aug 2026' },
  { name: 'Bangkok City Tour (Grand Palace & Temple)', type: 'Sightseeing', imgGrad: 'from-amber-400 to-orange-500', serviceDate: '2026-08-15', time: '08:00 – 17:00', details: 'Grand Palace + Wat Pho', detailSub: 'Lunch Included', supplier: 'Bangkok Guide Services', adults: 4, children: 0, totalSupplierCost: 2800, totalSellingPrice: 4000, payStatus: 'Pending', paid: 0, total: 16000, due: '12 Aug 2026' },
  { name: 'Saffron Dinner Cruise', type: 'Meal', imgGrad: 'from-rose-400 to-red-500', serviceDate: '2026-08-15', time: '19:00 – 21:00', details: 'International Buffet', detailSub: 'River Cruise', supplier: 'Saffron Cruise', adults: 4, children: 0, totalSupplierCost: 3200, totalSellingPrice: 4800, payStatus: 'Deposit Paid', paid: 6400, total: 19200, due: '12 Aug 2026' },
];
const DEMO_PAYMENTS = [
  { id: 1, date: '01 Aug 2026', type: 'Supplier Payment', typeColor: 'bg-blue-100 text-blue-700', related: 'Hotel', supplier: 'Ramada Hospitality', ref: 'INV-RV-4581', amount: 8000, method: 'Bank Transfer', status: 'Paid', remarks: 'Deposit for 2 Rooms' },
  { id: 2, date: '01 Aug 2026', type: 'Supplier Payment', typeColor: 'bg-blue-100 text-blue-700', related: 'Transfer', supplier: 'Pattaya Transfer Co.', ref: 'INV-PT-2210', amount: 2500, method: 'Bank Transfer', status: 'Paid', remarks: 'Deposit for Private Van' },
  { id: 3, date: '02 Aug 2026', type: 'Supplier Payment', typeColor: 'bg-blue-100 text-blue-700', related: 'Sightseeing', supplier: 'Sea Star Marine', ref: 'INV-SE-7752', amount: 12000, method: 'Bank Transfer', status: 'Paid', remarks: 'Full Payment' },
  { id: 4, date: '10 Aug 2026', type: 'Supplier Payment', typeColor: 'bg-blue-100 text-blue-700', related: 'Sightseeing', supplier: 'Alcazar Show Co.', ref: 'INV-ALC-9981', amount: 4800, method: 'Bank Transfer', status: 'Paid', remarks: 'Deposit Payment' },
  { id: 5, date: '12 Aug 2026', type: 'Supplier Payment', typeColor: 'bg-blue-100 text-blue-700', related: 'Restaurant', supplier: 'Saffron Cruise', ref: 'INV-SAF-6612', amount: 0, method: '—', status: 'Pending', remarks: 'To be paid before arrival' },
  { id: 6, date: '12 Aug 2026', type: 'Supplier Payment', typeColor: 'bg-blue-100 text-blue-700', related: 'Guide', supplier: 'Bangkok Guide', ref: 'INV-BG-3344', amount: 0, method: '—', status: 'Pending', remarks: 'To be paid before arrival' },
  { id: 7, date: '12 Aug 2026', type: 'Client Payment', typeColor: 'bg-purple-100 text-purple-700', related: 'Booking Advance', supplier: 'Mr Shalin (Agent)', ref: 'PAY-CL-1208', amount: 40000, method: 'Bank Transfer', status: 'Paid', remarks: 'Advance Received' },
  { id: 8, date: '12 Aug 2026', type: 'Client Payment', typeColor: 'bg-purple-100 text-purple-700', related: 'Balance Payment', supplier: 'Mr Shalin (Agent)', ref: 'PAY-CL-1305', amount: 0, method: '—', status: 'Pending', remarks: 'Balance before 72 hours' },
];

// ─── Small UI atoms ───────────────────────────────────────────────────────────
function PayBadge({ status, paid, total, due, paymentDate }) {
  const isPaid = status === 'Paid';
  const isDeposit = status === 'Deposit Paid';
  const badge = isPaid ? 'bg-green-100 text-green-700 border-green-200' : isDeposit ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-slate-100 text-slate-500 border-slate-200';
  const bg = isPaid ? 'bg-green-50 border-green-200' : isDeposit ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200';
  const dueColor = isPaid ? 'text-slate-400' : 'text-orange-500 font-semibold';
  return (
    <div className={`${bg} border rounded-lg p-1.5 min-w-[118px]`}>
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${badge}`}>{status}</span>
      {paid !== undefined && total !== undefined && (
        <div className="text-[10px] font-bold text-slate-600 mt-0.5">{fmtI(paid)} / {fmtI(total)}</div>
      )}
      {due && <div className={`text-[9px] ${dueColor} mt-0.5`}>{isPaid ? `Paid on ${due}` : `Due: ${due}`}</div>}
      {paymentDate && <div className="text-[9px] text-slate-500 mt-0.5">Payment: {formatDate(paymentDate)}</div>}
    </div>
  );
}
function MealBadge({ plan }) {
  if (!plan || plan === '—') return <span className="text-[10px] text-slate-400">—</span>;
  return <span className="inline-flex max-w-full whitespace-normal break-words px-2 py-0.5 rounded text-[10px] font-bold leading-snug bg-emerald-100 text-emerald-700 border border-emerald-200">{plan}</span>;
}
function TypeBadge({ type }) {
  const m = { Transfer: 'bg-blue-100 text-blue-700', Sightseeing: 'bg-purple-100 text-purple-700', Meal: 'bg-orange-100 text-orange-700', Restaurant: 'bg-orange-100 text-orange-700', Yacht: 'bg-cyan-100 text-cyan-700', Flight: 'bg-indigo-100 text-indigo-700', Guide: 'bg-teal-100 text-teal-700', Hotel: 'bg-slate-100 text-slate-700', Others: 'bg-pink-100 text-pink-700' };
  return <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${m[type] || 'bg-slate-100 text-slate-600'}`}>{type}</span>;
}
function ConfBadge() { return <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700 border border-green-200">Confirmed</span>; }
function ProfitCell({ profit }) {
  return <div className="text-[11px] font-extrabold text-green-600">{fmtN(profit)}</div>;
}
function MarkupCell({ markup }) {
  const value = Number(markup || 0);
  return <div className={value >= 0 ? 'text-[11px] font-extrabold text-blue-600' : 'text-[11px] font-extrabold text-red-600'}>{value.toFixed(2)}%</div>;
}

function ExpandableText({ text, maxLength = 28 }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  const isLong = text.length > maxLength;
  
  return (
    <div className="flex items-start gap-1">
      <div 
        className={`text-[11px] font-bold text-slate-900 leading-snug ${expanded ? 'whitespace-normal break-words' : 'truncate'}`} 
        style={{ maxWidth: expanded ? 220 : 155 }}
      >
        {text}
      </div>
      {isLong && (
        <button 
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} 
          className="text-slate-400 hover:text-blue-600 mt-0.5 flex-shrink-0 bg-slate-100 hover:bg-blue-50 rounded p-0.5 transition-colors"
          title={expanded ? "Show less" : "Show more"}
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
}

function ActBtns({ onView, onEdit, onDelete, onMail }) {
  return (
    <div className="flex items-center gap-0">
      <button onClick={e => { e.stopPropagation(); onView(); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Eye className="w-3.5 h-3.5" /></button>
      {onMail && <button title="Email supplier" onClick={e => { e.stopPropagation(); onMail(); }} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"><Mail className="w-3.5 h-3.5" /></button>}
      <button onClick={e => { e.stopPropagation(); onEdit?.(); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"><Edit className="w-3.5 h-3.5" /></button>
      <button onClick={e => { e.stopPropagation(); onDelete?.(); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  );
}

const DEFAULT_SUPPLIER_EMAIL_BODY = '<p>Dear Supplier,</p><p>Greetings from BuildSoftware.</p><p>Please check the service request below and confirm its availability at your earliest convenience.</p><p>Thank you,</p>';
const serviceSupplierName = (service) => String(service?.yachtSupplier || service?.transferVehicleSupplier || service?.vehicleSupplierName || (typeof service?.supplier === 'object' ? service.supplier?.name : service?.supplier) || '').trim();
const serviceSupplierId = (service) => String(service?.yachtSupplierId || service?.transferVehicleSupplierId || service?.vehicleSupplierId || service?.supplierId || (typeof service?.supplier === 'object' ? (service.supplier.id || service.supplier._id) : '') || '').trim();
const supplierKey = (name, email) => `${String(name || '').trim().toLowerCase()}|${String(email || '').trim().toLowerCase()}`;
const mailDateTime = (value) => formatDateTime(value);

function SupplierMailComposer({ booking, service, supplierMasters, onClose, onSent, onRefresh }) {
  const supplierName = serviceSupplierName(service._raw);
  const supplierId = serviceSupplierId(service._raw);
  const serviceId = service._raw?.id;
  const supplier = supplierMasters.find((item) => String(item?.id || item?._id) === supplierId)
    || supplierMasters.find((item) => String(item?.name || '').trim().toLowerCase() === supplierName.toLowerCase());
  const recipient = String(service._raw?.supplierEmail || supplier?.email || '').trim();
  const [subject, setSubject] = useState(`Service confirmation request – ${booking.id}`);
  const [bodyHtml, setBodyHtml] = useState(DEFAULT_SUPPLIER_EMAIL_BODY);
  const [ccMails, setCcMails] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [draftInfo, setDraftInfo] = useState(null);
  const [improving, setImproving] = useState(false);
  useEffect(() => {
    let active = true;
    if (!serviceId) { setLoadingDraft(false); return () => { active = false; }; }
    apiClient.get(`/supplier-emails/${encodeURIComponent(booking.id)}/draft?serviceId=${encodeURIComponent(serviceId)}`).then((result) => {
      const draft = result.data;
      if (!active || !draft?.bodyHtml) return;
      setSubject(draft.subject || `Service confirmation request – ${booking.id}`);
      setBodyHtml(draft.bodyHtml);
      setDraftInfo(draft);
    }).catch(() => {}).finally(() => { if (active) setLoadingDraft(false); });
    return () => { active = false; };
  }, [booking.id, serviceId]);
  const improveWithAi = async () => {
    setImproving(true);
    try {
      const result = await apiClient.post('/ai/improve-email', {
        subject, bodyHtml, audience: 'travel supplier',
        context: { bookingId: booking.id, supplierName, serviceName: service.name, serviceType: service.type, serviceDate: service._raw?.serviceDate || service._raw?.date, guestName: booking.guestName, destination: booking.destination },
      });
      setSubject(result.data.subject); setBodyHtml(result.data.bodyHtml);
      toast.success('AI improved the email draft. Review it before sending.');
    } catch (error) { toast.error(error.message); }
    finally { setImproving(false); }
  };
  const send = async () => {
    setSending(true);
    try {
      const result = await apiClient.post(`/supplier-emails/${encodeURIComponent(booking.id)}/send`, { serviceId, subject, bodyHtml, cc: ccMails });
      onSent(result.data); toast.success(`Supplier email sent to ${result.data.supplierEmail}${result.data.ccEmails?.length ? ` with ${result.data.ccEmails.length} CC recipient${result.data.ccEmails.length === 1 ? '' : 's'}` : ''}.`); onClose();
    } catch (error) { toast.error(error.message); }
    finally { setSending(false); onRefresh?.(); }
  };
  return <div className="modal-overlay z-50" onMouseDown={onClose}>
    <div className="modal-content max-w-3xl w-full p-0 overflow-hidden" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-100 p-4"><div className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700"><Mail className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h3 className="text-sm font-extrabold text-slate-800">Email supplier</h3><p className="truncate text-[11px] text-slate-500">{service.name} · {supplierName || 'No supplier selected'}</p></div><button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"><X className="h-4 w-4" /></button></div>
      <div className="max-h-[72vh] space-y-4 overflow-y-auto p-4">
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2"><div><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">To supplier</div><div className="mt-1 text-sm font-bold text-slate-800">{supplierName || 'Select supplier first'}</div></div><div><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Email address</div><div className={`mt-1 text-sm font-bold ${recipient ? 'text-slate-800' : 'text-amber-700'}`}>{recipient || 'No email saved in Supplier Master'}</div></div></div>
        {!recipient && <p className="rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-800">Add this supplier’s email address in Supplier Master before sending the request.</p>}
        <label><span className="form-label">Email subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} className="form-input" maxLength="240" /></label>
        <label><span className="form-label">Additional CC emails</span><input value={ccMails} onChange={(event) => setCcMails(event.target.value)} className="form-input" placeholder="accounts@supplier.com, manager@supplier.com" /><span className="mt-1 block text-[10px] text-slate-500">Saved supplier contacts and these extra addresses receive a copy. Separate addresses with commas, semicolons, or new lines.</span></label>
        <div><div className="mb-1 flex items-center justify-between gap-3"><span className="form-label mb-0">Message</span><div className="flex items-center gap-2"><span className="text-[10px] font-semibold text-slate-400">Editable text</span><button type="button" onClick={improveWithAi} disabled={improving || loadingDraft} className="inline-flex items-center gap-1 rounded border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-60"><Sparkles className={`h-3 w-3 ${improving ? 'animate-pulse' : ''}`} /> {improving ? 'Improving…' : 'Improve with AI'}</button></div></div>{loadingDraft ? <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">Loading the last sent email…</div> : <RichTextEditor value={bodyHtml} onChange={setBodyHtml} placeholder="Write a message to the supplier…" />}{draftInfo && <p className="mt-1 text-[10px] font-semibold text-emerald-700">Using the last successfully sent message · {mailDateTime(draftInfo.updatedAt)}</p>}</div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3"><div className="text-xs font-extrabold text-blue-800">Protected booking details</div><p className="mt-1 text-[11px] text-blue-700">The booking reference, guest, supplier, service, date, time, guests and service details are automatically attached below your message. These values cannot be edited in the email body.</p></div>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 bg-white p-3"><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={send} disabled={sending || !recipient || !supplierName} className="btn-primary disabled:opacity-60"><Mail className="h-4 w-4" /> {sending ? 'Sending...' : 'Send supplier email'}</button></div>
    </div>
  </div>;
}

function SupplierMailHistory({ supplierName, logs, onClose, allSuppliers = false }) {
  const [selectedLog, setSelectedLog] = useState(logs[0] || null);
  const sentCount = logs.filter((log) => log.status === 'Sent').length;
  const recipient = allSuppliers ? 'All supplier mail recipients' : (selectedLog?.supplierEmail || logs[0]?.supplierEmail || '—');
  return <div className="drawer-overlay z-50" onMouseDown={onClose}>
    <aside className="drawer-content flex h-full w-full max-w-[760px] flex-col sm:w-[40vw]" style={{ animation: 'slideInRight 180ms ease-out' }} onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-between bg-[#173b70] px-4 py-3 text-white"><div className="flex items-center gap-2"><Mail className="h-4 w-4" /><div><h3 className="text-sm font-extrabold uppercase tracking-wide">Supplier mail log</h3><p className="mt-0.5 text-[10px] font-semibold text-blue-100">{supplierName}</p></div></div><button onClick={onClose} className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button></div>
      <div className="min-h-0 flex-1 overflow-hidden bg-slate-50 p-3"><div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="border-b border-slate-200 bg-emerald-600 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white">Supplier mail log · {sentCount} sent</div><div className="max-h-[34%] overflow-y-auto border-b border-slate-200 bg-slate-50 p-2"><div className="mb-2 border-l-4 border-emerald-500 bg-white px-3 py-2"><div className="truncate text-[10px] text-slate-500">{recipient}</div><div className="mt-1 text-[10px] font-bold text-emerald-700">{logs.length} logged email{logs.length === 1 ? '' : 's'}</div></div><div className="flex gap-2 overflow-x-auto pb-1">{logs.map((log) => <button key={log.id} onClick={() => setSelectedLog(log)} className={`min-w-[220px] flex-1 border-l-4 px-3 py-2.5 text-left transition ${selectedLog?.id === log.id ? 'border-blue-600 bg-blue-50' : log.status === 'Sent' ? 'border-emerald-500 bg-white hover:bg-slate-100' : 'border-red-500 bg-red-50 hover:bg-red-100'}`}><div className="flex items-center justify-between gap-2"><span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${log.status === 'Sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{log.status}</span><span className="whitespace-nowrap text-[9px] text-slate-400">{mailDateTime(log.sentAt)}</span></div><div className="mt-1.5 truncate text-[11px] font-bold text-slate-800">{log.subject}</div></button>)}</div>{!logs.length && <p className="p-4 text-center text-xs text-slate-400">No supplier email has been sent yet.</p>}</div><section className="flex min-h-0 flex-1 flex-col bg-white">{selectedLog ? <><div className="border-b border-slate-200 bg-slate-50 px-4 py-3"><div className="text-xs font-extrabold text-slate-800">{selectedLog.subject}</div><div className="mt-1 text-[10px] text-slate-500">To: {selectedLog.supplierEmail}{selectedLog.ccEmails?.length ? ` · CC: ${selectedLog.ccEmails.join(', ')}` : ''} · {mailDateTime(selectedLog.sentAt)}{selectedLog.messageId ? ` · ${selectedLog.messageId}` : ''}</div>{selectedLog.error && <div className="mt-2 rounded bg-red-50 p-2 text-[10px] text-red-700">{selectedLog.error}</div>}</div><iframe title={`Supplier email ${selectedLog.id}`} sandbox="" srcDoc={selectedLog.renderedHtml || ''} className="min-h-0 flex-1 w-full border-0" /></> : <div className="grid h-full place-items-center text-sm text-slate-400">Select a mail to preview it.</div>}</section></div></div>
    </aside>
  </div>;
}
function SummaryBar({ items }) {
  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 w-full sm:w-auto [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
      {items.map((it, i) => (
        <div key={i} className={`${it.bg} ${it.bd} !border-slate-300 shadow-sm border rounded-xl px-3 py-1.5 text-center min-w-0 sm:min-w-[140px] h-[58px] flex flex-col items-center justify-center`}>
          <div className={`text-[9px] font-bold uppercase tracking-wide leading-tight ${it.lc}`}>{it.label}</div>
          <div className={`text-sm font-extrabold ${it.vc}`}>{it.value}</div>
          {it.sub && <div className={`text-[9px] font-semibold leading-tight ${it.sc || it.lc}`}>{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── View Modal ───────────────────────────────────────────────────────────────
function ViewModal({ data, type, onClose, onEdit }) {
  if (!data) return null;
  const SVC_ICON_MAP = { Transfer: Car, Sightseeing: Compass, Meal: Utensils, Restaurant: Utensils, Yacht: Anchor, Flight: Plane, Guide: Users, Hotel: Hotel, Others: Package };
  const Icon = SVC_ICON_MAP[type] || Package;
  const isPaid = data.payStatus === 'Paid';
  const isDeposit = data.payStatus === 'Deposit Paid';

  const TONES = ['bg-blue-100 text-blue-600', 'bg-violet-100 text-violet-600', 'bg-amber-100 text-amber-600', 'bg-emerald-100 text-emerald-600', 'bg-rose-100 text-rose-600', 'bg-cyan-100 text-cyan-600', 'bg-indigo-100 text-indigo-600', 'bg-orange-100 text-orange-600'];
  let toneIdx = 0;
  const DataField = ({ icon: Ic, label, value, valueClass = '' }) => {
    const tone = TONES[toneIdx++ % TONES.length];
    return (
    <div className="flex min-w-0 items-center gap-2.5">
      {Ic && <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}><Ic className="w-4 h-4" /></span>}
      <div className="min-w-0">
        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
        <div className={`text-xs font-bold text-slate-800 break-words leading-snug ${valueClass}`}>{value || '—'}</div>
      </div>
    </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content !max-w-3xl w-[calc(100vw-1rem)] sm:w-full p-0 overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] rounded-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="relative flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700">
          {data.imageUrl && <img src={data.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />}
          <div className={`absolute inset-0 ${data.imageUrl ? 'bg-gradient-to-t from-slate-950/85 via-slate-900/30 to-slate-900/10' : ''}`} />
          <button onClick={onClose} className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/85 text-slate-600 shadow backdrop-blur transition-colors hover:bg-white hover:text-slate-900 flex-shrink-0"><X className="w-4 h-4" /></button>
          <div className={`relative flex items-end gap-3 px-4 pb-3.5 pt-4 ${data.imageUrl ? 'min-h-[150px] sm:min-h-[200px]' : 'min-h-[84px] items-center'}`}>
            {!data.imageUrl && <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-white/20 text-white shadow-inner ring-1 ring-white/30"><Icon className="w-6 h-6" /></div>}
            <div className="min-w-0 flex-1 text-white">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ring-1 ring-white/25 backdrop-blur"><Icon className="h-3 w-3" />{type} Details</span>
                <span className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${isPaid ? 'bg-emerald-400/90 text-emerald-950' : isDeposit ? 'bg-amber-300/95 text-amber-950' : 'bg-white/85 text-slate-700'}`}>{data.payStatus || 'Pending'}</span>
              </div>
              <div className="text-lg sm:text-xl font-extrabold leading-tight drop-shadow">{data.name}</div>
              {(data.city || data.itineraryDestination) && (
                <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-white/90"><MapPin className="w-3 h-3" />{data.city || data.itineraryDestination}</div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 min-h-0">
          {/* Status Row */}
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            <StatusBadge status="Confirmed" />
            {data.nights ? <span className="inline-flex items-center gap-1 rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600"><Moon className="h-3 w-3" />{data.nights} Night{data.nights !== 1 ? 's' : ''}</span> : null}
          </div>

          <div className="mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 [&>div]:rounded-xl [&>div]:border [&>div]:border-slate-200 [&>div]:bg-white [&>div]:px-2.5 [&>div]:py-2 [&>div]:shadow-sm">
              {type === 'Hotel' && (
                <>
                  <DataField icon={Calendar} label="Check In" value={data.checkIn} />
                  <DataField icon={Calendar} label="Check Out" value={data.checkOut} />
                  <DataField icon={Moon} label="Nights" value={`${data.nights} Night${data.nights !== 1 ? 's' : ''}`} valueClass="text-blue-600" />
                  <DataField icon={Package} label="Supplier" value={data.supplier} />
                  <div className="col-span-2 sm:col-span-1"><DataField icon={BedDouble} label="Room Type" value={`${data.roomType} ${data.roomBed ? `(${data.roomBed})` : ''}`} /></div>
                  <DataField icon={Tag} label="Meal Plan" value={data.mealPlan} valueClass="text-emerald-600" />
                  <DataField icon={Hotel} label="Rooms" value={String(data.rooms)} />
                  <DataField icon={Users} label="Guests" value={data.pax} />
                </>
              )}
              {type !== 'Hotel' && (
                <>
                  <DataField icon={Calendar} label="Date" value={data.date} />
                  {data.time && <DataField icon={Clock} label="Time" value={data.time} />}
                  <DataField icon={Users} label="Guests" value={data.pax} />
                  <DataField icon={Package} label="Supplier" value={data.supplier} />
                  {data.details && <DataField icon={Info} label="Details" value={data.details} />}
                  {data.detailSub && <div className="col-span-2 sm:col-span-4 mt-1"><DataField icon={Info} label="Inclusions" value={data.detailSub} /></div>}
                </>
              )}
            </div>
          </div>

          {/* Financials */}
          <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-300 p-3 shadow-sm">
            <div className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <DollarSign className="w-3 h-3" /> Financial Breakdown
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[
                { label: type === 'Hotel' ? 'Cost / Room / Night' : 'Supplier Cost', value: fmtN(type === 'Hotel' ? data.costPR : data.cost || data.totalCost), color: 'text-slate-800', bg: 'bg-white' },
                { label: type === 'Hotel' ? 'Total Cost' : 'Total Cost', value: fmtN(data.totalCost), color: 'text-slate-800', bg: 'bg-white' },
                { label: 'Total Selling', value: fmtN(data.totalSell || data.selling || data.totalSelling), color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
              ].map(c => (
                <div key={c.label} className={`${c.bg} rounded-xl border ${c.bg === 'bg-white' ? 'border-slate-200' : ''} p-2 sm:p-2.5 shadow-sm flex flex-col items-center justify-center text-center min-w-0`}>
                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 leading-tight">{c.label}</div>
                  <div className={`text-[12px] sm:text-sm font-black ${c.color}`}>{c.value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-2.5 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="text-[8px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Markup</div>
                <div className="text-[15px] font-black text-blue-700 leading-none">{Number(data.markup || 0).toFixed(2)}%</div>
                <div className="text-[9px] font-bold text-blue-600 mt-1">{fmtN((data.totalSell || data.selling || data.totalSelling || 0) - (data.totalCost || data.cost || 0))}</div>
              </div>
              <div className="bg-green-50 rounded-xl border border-green-200 p-2.5 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="text-[8px] font-bold text-green-600 uppercase tracking-wider mb-0.5">Gross Profit</div>
                <div className="text-[15px] font-black text-green-700 leading-none">{fmtN(data.profit)}</div>
                {(data.totalSell || data.selling || data.totalSelling) > 0 && <div className="text-[9px] font-bold text-green-600 mt-1">{Math.round((data.profit / (data.totalSell || data.selling || data.totalSelling || 1)) * 100)}% Margin</div>}
              </div>
              <div className={`${isPaid ? 'bg-green-50 border-green-200' : isDeposit ? 'bg-orange-50 border-orange-200' : 'bg-slate-100 border-slate-200'} col-span-2 sm:col-span-1 rounded-xl border p-2.5 shadow-sm flex flex-col items-center justify-center text-center`}>
                <div className={`text-[8px] font-bold uppercase tracking-wider mb-0.5 ${isPaid ? 'text-green-600' : isDeposit ? 'text-orange-600' : 'text-slate-500'}`}>Payment Status</div>
                <div className={`text-[15px] font-black leading-none ${isPaid ? 'text-green-700' : isDeposit ? 'text-orange-700' : 'text-slate-700'}`}>{data.paid !== undefined ? `${fmtI(data.paid)} / ${fmtI(data.total)}` : '—'}</div>
                {data.due && <div className={`text-[9px] font-bold mt-1 ${isPaid ? 'text-green-600' : 'text-orange-600'}`}>{isPaid ? `Paid on ${formatDate(data.due, data.due)}` : `Due: ${formatDate(data.due, data.due)}`}</div>}
              </div>
            </div>
          </div>

          {/* Notes */}
          {data.notes && (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="text-[9px] font-black text-yellow-700 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Info className="w-3 h-3" /> Notes</div>
              <div className="text-[11px] font-medium text-slate-700 leading-relaxed">{data.notes}</div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-3 sm:px-4 py-2.5 flex gap-2 bg-slate-50 flex-shrink-0">
          {onEdit && <button onClick={() => { onClose(); onEdit(); }} className="btn-primary flex-1 h-9 text-xs justify-center gap-1.5"><Edit className="w-3.5 h-3.5" /> Edit Booking</button>}
          <button onClick={onClose} className="btn-secondary h-9 px-4 sm:px-6 text-xs justify-center">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Hotels Tab ───────────────────────────────────────────────────────────────
function HotelsTab({ booking, hotelMasters = [], onPersist }) {
  const [selected, setSelected] = useState(null);
  const [editingHotel, setEditingHotel] = useState(null); // null, 'new', or hotel object
  const mealPlanMasters = useSalesMaster('meal-plans');
  const mealPlans = activeMealPlanNames(mealPlanMasters);
  const rawHotels = booking?.hotels || [];
  const paymentLines = bookingPaymentLines(booking);
  const hotels = rawHotels.map((hotel, index) => {
    const master = hotelMasters.find((item) => String(item.id) === String(hotel.hotelId) || String(item.name || '').trim().toLowerCase() === String(hotel.name || hotel.hotel || '').trim().toLowerCase());
    const line = paymentLines.find((item) => item.key === paymentLineKey('hotel', hotel, index));
    const payment = line ? linePaymentState(booking, line) : null;
    const paid = payment?.supplierPaid || 0;
    const total = line?.totalCost || Number(hotel.totalSupplierCost || hotel.totalCost || 0);
    return hotelOf({ ...hotel, mealPlan: currentMealPlanName(hotel.mealPlan || hotel.meal, mealPlans) || hotel.mealPlan || hotel.meal, hotelImage: hotel.hotelImage || master?.hotelImage, image: hotel.image || master?.image, imageUrl: hotel.imageUrl || master?.imageUrl || master?.hotelImage?.url || master?.hotelImage || master?.images?.[0]?.url || master?.images?.[0], paid, total, payStatus: paid >= total && total > 0 ? 'Paid' : paid > 0 ? 'Deposit Paid' : 'Pending', paymentDate: line ? latestSupplierPaymentDate(booking, line.key) : '' }, index);
  });
  const totalCost = hotels.reduce((s, h) => s + h.totalCost, 0);
  const totalSell = hotels.reduce((s, h) => s + h.totalSell, 0);
  const totalProfit = hotels.reduce((s, h) => s + h.profit, 0);
  const pending = hotels.filter(h => h.payStatus !== 'Paid').reduce((s, h) => s + Math.max(0, h.total - h.paid), 0);
  const nightsTotal = hotels.reduce((s, h) => s + h.nights, 0);
  const profPct = totalSell > 0 ? Math.round((totalProfit / totalSell) * 100) : 0;

  const handleSaveHotel = async (e) => {
    e.preventDefault();
    const values = [...e.currentTarget.querySelectorAll('input, select')].map((input) => input.value);
    const [name, city, checkIn, checkOut, roomType, mealPlan, rooms, pax, supplier, totalSupplierCost, totalSellingPrice] = values;
    const master = hotelMasters.find((item) => String(item.name || '').trim().toLowerCase() === String(name || '').trim().toLowerCase());
    const existing = editingHotel === 'new' ? {} : editingHotel._raw;
    const record = { ...existing, id: existing.id || `hotel-${Date.now()}`, type: 'Hotel', name, itineraryDestination: city || master?.city || master?.destination || '', checkIn, checkOut, roomType, mealPlan, rooms: Number(rooms || 1), adults: Number(pax || 0), supplier, totalSupplierCost: Number(totalSupplierCost || 0), totalSellingPrice: Number(totalSellingPrice || 0), hotelImage: existing.hotelImage || master?.hotelImage, image: existing.image || master?.image };
    const nextHotels = editingHotel === 'new' ? [...rawHotels, record] : rawHotels.map((item) => item.id === existing.id ? record : item);
    try { await onPersist({ hotels: nextHotels }, `${editingHotel === 'new' ? 'Added' : 'Updated'} hotel ${name}`); toast.success(editingHotel === 'new' ? 'Hotel added successfully!' : 'Hotel updated successfully!'); setEditingHotel(null); } catch (error) { toast.error(error.message); }
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto lg:overflow-visible">
      {selected && <ViewModal data={selected} type="Hotel" onClose={() => setSelected(null)} onEdit={() => setEditingHotel(selected)} />}
      
      {/* Add/Edit Hotel Modal */}
      {editingHotel && (() => {
        const isNew = editingHotel === 'new';
        const eh = isNew ? {} : editingHotel;
        const er = eh._raw || {};
        const lbl = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500';
        const inp = 'form-input !h-9 text-xs font-semibold';
        const supplierNow = isNew ? '' : (er.supplier || er.supplierName || '');
        const Section = ({ icon: Ic, title, tone }) => <div className="col-span-full flex items-center gap-2 pt-1"><span className={`grid h-6 w-6 place-items-center rounded-md ${tone}`}><Ic className="h-3.5 w-3.5" /></span><span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-700">{title}</span><span className="h-px flex-1 bg-slate-200" /></div>;
        return (
        <div className="modal-overlay" onClick={() => setEditingHotel(null)}>
          <div className="modal-content !max-w-3xl w-[calc(100vw-1rem)] sm:w-full p-0 overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-50 via-white to-indigo-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md flex items-center justify-center flex-shrink-0"><Hotel className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-extrabold text-slate-900">{isNew ? 'Add New Hotel Booking' : 'Edit Hotel Booking'}</div>
                <div className="truncate text-[11px] font-medium text-slate-500">{isNew ? 'Enter hotel reservation details' : `Update details for ${eh.name}`}</div>
              </div>
              <button onClick={() => setEditingHotel(null)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveHotel} className="flex min-h-0 flex-1 flex-col">
              <div className="grid min-h-0 flex-1 grid-cols-2 sm:grid-cols-6 gap-x-3 gap-y-3 overflow-y-auto p-4">
                <Section icon={Hotel} title="Hotel" tone="bg-blue-100 text-blue-600" />
                <div className="col-span-2 sm:col-span-3"><label className={lbl}>Hotel Name</label><input type="text" defaultValue={isNew ? '' : eh.name} className={inp} placeholder="Search or enter hotel name..." autoFocus /></div>
                <div className="col-span-2 sm:col-span-3"><label className={lbl}>City / Destination</label><input type="text" defaultValue={isNew ? '' : eh.city} className={inp} placeholder="e.g. Bangkok" /></div>

                <Section icon={Calendar} title="Stay & Room" tone="bg-violet-100 text-violet-600" />
                <div className="col-span-1 sm:col-span-2"><label className={lbl}>Check In</label><input type="date" defaultValue={inputDateValue(er.checkIn)} className={inp} /></div>
                <div className="col-span-1 sm:col-span-2"><label className={lbl}>Check Out</label><input type="date" defaultValue={inputDateValue(er.checkOut)} className={inp} /></div>
                <div className="col-span-2 sm:col-span-2"><label className={lbl}>Room Category</label><input type="text" defaultValue={isNew ? '' : eh.roomType} className={inp} placeholder="e.g. Deluxe Room" /></div>
                <div className="col-span-2 sm:col-span-2"><label className={lbl}>Meal Plan</label>
                  <select defaultValue={isNew ? preferredMealPlanName(mealPlans) : currentMealPlanName(eh.mealPlan, mealPlans)} className="form-select !h-9 text-xs font-semibold text-slate-700">
                    <option value="">Select Meal Plan</option>
                    {mealPlans.map((mealPlan) => <option key={mealPlan} value={mealPlan}>{mealPlan}</option>)}
                  </select>
                </div>
                <div className="col-span-1 sm:col-span-1"><label className={lbl}>Rooms</label><input type="number" min="1" defaultValue={isNew ? 1 : (er.rooms || 1)} className={inp} /></div>
                <div className="col-span-1 sm:col-span-1"><label className={lbl}>Guests</label><input type="number" min="1" defaultValue={isNew ? 2 : (er.adults || '')} className={inp} /></div>
                <div className="col-span-2 sm:col-span-2"><label className={lbl}>Supplier</label>
                  <select defaultValue={supplierNow || 'Select Supplier'} className="form-select !h-9 text-xs font-semibold text-slate-700">
                    <option>Select Supplier</option>
                    {supplierNow && !['Rama Hospitality Co., Ltd.', 'Direct Booking'].includes(supplierNow) && <option>{supplierNow}</option>}
                    <option>Rama Hospitality Co., Ltd.</option>
                    <option>Direct Booking</option>
                  </select>
                </div>

                <Section icon={DollarSign} title="Financials (THB)" tone="bg-emerald-100 text-emerald-600" />
                <div className="col-span-1 sm:col-span-3 rounded-xl border border-slate-300 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total Supplier Cost</label>
                  <input type="number" defaultValue={isNew ? '' : eh.totalCost} className="mt-0.5 w-full border-0 bg-transparent p-0 text-lg font-extrabold text-slate-900 outline-none focus:ring-0" placeholder="0.00" />
                </div>
                <div className="col-span-1 sm:col-span-3 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-3 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Total Selling Price</label>
                  <input type="number" defaultValue={isNew ? '' : eh.totalSell} className="mt-0.5 w-full border-0 bg-transparent p-0 text-lg font-extrabold text-blue-900 outline-none focus:ring-0" placeholder="0.00" />
                </div>
              </div>

              <div className="flex flex-none items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-4 py-3">
                <button type="button" onClick={() => setEditingHotel(null)} className="btn-secondary h-9 px-6 text-xs">Cancel</button>
                <button type="submit" className="btn-primary h-9 min-w-[160px] justify-center gap-1.5 text-xs"><CheckCircle className="w-4 h-4" /> Save Hotel Booking</button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      <div className="flex items-center justify-between mb-2 flex-shrink-0 gap-2">
        <h2 className="text-sm font-bold text-slate-800 truncate">Hotel Bookings ({hotels.length})</h2>
        <div className="flex gap-1.5 shrink-0">
          <button className="btn-secondary h-8 sm:h-7 px-2.5 text-xs gap-1" title="Reorder"><ArrowUpDown className="w-3.5 h-3.5 sm:w-3 sm:h-3" /> <span className="hidden sm:inline">Reorder</span></button>
          <button onClick={() => setEditingHotel('new')} className="btn-primary h-8 sm:h-7 px-2.5 text-xs gap-1"><Plus className="w-3.5 h-3.5 sm:w-3 sm:h-3" /> Add Hotel</button>
        </div>
      </div>

      <div className="card overflow-hidden flex-none lg:flex-1 lg:min-h-0">
        <div className="overflow-auto h-full">
          <div className="md:hidden p-2 space-y-2">
            {hotels.map((h) => (
              <div key={h.rowNum} onClick={() => setSelected(h)} className="rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-50">
                <div className="flex items-start gap-2.5">
                  <div className={`w-11 h-11 rounded-md bg-gradient-to-br ${h.imgGrad} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                    {h.imageUrl ? <img src={h.imageUrl} alt={h.name} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} /> : <Hotel className="w-5 h-5 text-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 leading-snug break-words">{h.name}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5"><MapPin className="w-2.5 h-2.5" />{h.city}</div>
                    <div className="mt-1"><MealBadge plan={h.mealPlan} /></div>
                  </div>
                  <div onClick={e => e.stopPropagation()} className="shrink-0">
                    <ActBtns onView={() => setSelected(h)} onEdit={() => setEditingHotel(h)} onDelete={async () => { try { await onPersist({ hotels: rawHotels.filter(item => item.id !== h._raw.id) }, `Removed hotel ${h.name}`); toast.success('Hotel removed'); } catch (error) { toast.error(error.message); } }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2.5 pt-2.5 border-t border-slate-100 text-[11px]">
                  <div><div className="text-[9px] uppercase tracking-wide text-slate-400">Stay</div><div className="font-semibold text-slate-800">{formatDate(h.checkIn)} → {formatDate(h.checkOut)}</div><div className="text-[10px] font-bold text-blue-600">{h.nights} Night{h.nights !== 1 ? 's' : ''}</div></div>
                  <div><div className="text-[9px] uppercase tracking-wide text-slate-400">Room</div><div className="font-semibold text-slate-800 break-words">{h.roomType}</div><div className="text-[10px] text-slate-400">{h.rooms} Rooms · {h.pax} Pax</div></div>
                  <div><div className="text-[9px] uppercase tracking-wide text-slate-400">Cost</div><div className="font-bold text-slate-900">{fmtN(h.totalCost)}</div></div>
                  <div><div className="text-[9px] uppercase tracking-wide text-slate-400">Selling</div><div className="font-bold text-slate-900">{fmtN(h.totalSell)}</div></div>
                  <div><div className="text-[9px] uppercase tracking-wide text-slate-400">Profit</div><ProfitCell profit={h.profit} /></div>
                  <div><div className="text-[9px] uppercase tracking-wide text-slate-400">Payment</div><PayBadge status={h.payStatus} paid={h.paid} total={h.total} due={h.due} paymentDate={h.paymentDate} /></div>
                </div>
                {h.supplier && <div className="mt-2 text-[10px] text-slate-400 truncate">Supplier: <span className="text-slate-600">{h.supplier}</span></div>}
              </div>
            ))}
            {hotels.length === 0 && <div className="py-10 text-center text-xs text-slate-400">No hotels added yet</div>}
          </div>
          <table className="w-full text-left hidden md:table">
            <thead><tr>
              {['#', 'Hotel / City', 'Check In → Check Out', 'Room Category', 'Meal Plan', 'Rooms / Pax', 'Supplier', 'Cost (THB)', 'Selling (THB)', 'Markup', 'Profit (THB)', 'Status', 'Payment', 'Actions'].map(h => (
                <th key={h} className="table-header whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {hotels.map((h) => (
                <tr key={h.rowNum} className="table-row hover:bg-blue-50/30 cursor-pointer" onClick={() => setSelected(h)}>
                  <td className="table-cell text-center text-slate-400 text-[10px] w-8">{h.rowNum}</td>
                  <td className="table-cell !whitespace-normal align-top">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-14 h-11 rounded-md bg-gradient-to-br ${h.imgGrad} flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden`}>
                        {h.imageUrl ? <img src={h.imageUrl} alt={h.name} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} /> : <Hotel className="w-5 h-5 text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold text-slate-900 leading-snug whitespace-normal break-words [overflow-wrap:anywhere]">{h.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5"><MapPin className="w-2.5 h-2.5" />{h.city}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell align-top">
                    <div className="text-[10px] font-semibold text-slate-800">{formatDate(h.checkIn)}</div>
                    <div className="text-[10px] text-slate-500">→ {formatDate(h.checkOut)}</div>
                    <div className="text-[10px] font-bold text-blue-600">{h.nights} Night{h.nights !== 1 ? 's' : ''}</div>
                  </td>
                  <td className="table-cell !whitespace-normal align-top">
                    <div className="text-[11px] font-semibold text-slate-800 whitespace-normal break-words [overflow-wrap:anywhere]">{h.roomType}</div>
                    {h.roomBed && <div className="text-[10px] text-slate-400 whitespace-normal break-words">{h.roomBed}</div>}
                  </td>
                  <td className="table-cell !whitespace-normal align-top"><MealBadge plan={h.mealPlan} /></td>
                  <td className="table-cell text-center">
                    <div className="text-[11px] font-semibold text-slate-800">{h.rooms} Rooms</div>
                    <div className="text-[10px] text-slate-400">{h.pax} Pax</div>
                  </td>
                  <td className="table-cell !whitespace-normal align-top"><div className="text-[10px] text-slate-700 whitespace-normal break-words [overflow-wrap:anywhere]">{h.supplier}</div></td>
                  <td className="table-cell">
                    <div className="text-[9px] text-slate-400">{fmtN(h.costPR)}</div>
                    <div className="text-[8px] text-slate-300">Per Room / Night</div>
                    <div className="text-[11px] font-bold text-slate-900">{fmtN(h.totalCost)}</div>
                  </td>
                  <td className="table-cell">
                    <div className="text-[9px] text-slate-400">{fmtN(h.sellPR)}</div>
                    <div className="text-[8px] text-slate-300">Per Room / Night</div>
                    <div className="text-[11px] font-bold text-slate-900">{fmtN(h.totalSell)}</div>
                  </td>
                  <td className="table-cell"><MarkupCell markup={h.markup} /></td>
                  <td className="table-cell"><ProfitCell profit={h.profit} /></td>
                  <td className="table-cell"><ConfBadge /></td>
                  <td className="table-cell p-1"><PayBadge status={h.payStatus} paid={h.paid} total={h.total} due={h.due} paymentDate={h.paymentDate} /></td>
                  <td className="table-cell" onClick={e => e.stopPropagation()}><ActBtns onView={() => setSelected(h)} onEdit={() => setEditingHotel(h)} onDelete={async () => { try { await onPersist({ hotels: rawHotels.filter(item => item.id !== h._raw.id) }, `Removed hotel ${h.name}`); toast.success('Hotel removed'); } catch (error) { toast.error(error.message); } }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
        <div className="text-[11px] font-semibold text-slate-500 w-full sm:w-auto">Total | {hotels.length} Hotels | {nightsTotal} Nights</div>
        <SummaryBar items={[
          { label: 'Hotel Cost (THB)', value: fmtN(totalCost), bg: 'bg-slate-50', bd: 'border-slate-200', lc: 'text-slate-500', vc: 'text-slate-900' },
          { label: 'Selling (THB)', value: fmtN(totalSell), bg: 'bg-blue-50', bd: 'border-blue-200', lc: 'text-blue-600', vc: 'text-blue-800' },
          { label: 'Quotation Markup (THB)', value: fmtN(totalSell - totalCost), sub: `${totalCost > 0 ? (((totalSell - totalCost) / totalCost) * 100).toFixed(2) : 0}%`, bg: 'bg-blue-50', bd: 'border-blue-200', lc: 'text-blue-600', vc: 'text-blue-700', sc: 'text-blue-500' },
          { label: 'Profit (THB)', value: fmtN(totalProfit), sub: `${profPct}%`, bg: 'bg-green-50', bd: 'border-green-200', lc: 'text-green-600', vc: 'text-green-700', sc: 'text-green-500' },
          { label: 'Pending Payment (THB)', value: fmtN(pending), bg: 'bg-orange-50', bd: 'border-orange-200', lc: 'text-orange-600', vc: 'text-orange-600' },
        ]} />
      </div>
    </div>
  );
}

// ─── Services Tab ─────────────────────────────────────────────────────────────
const SVC_FILTERS = ['All', 'Transfer', 'Sightseeing', 'Meal', 'Yacht', 'Flight', 'Others'];
const SVC_ICONS = { Transfer: Car, Sightseeing: Compass, Meal: Utensils, Restaurant: Utensils, Yacht: Anchor, Flight: Plane, Guide: Users, Others: MoreHorizontal };

function ServicesTab({ booking, serviceMasters = [], supplierMasters = [], onPersist }) {
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [mailComposer, setMailComposer] = useState(null);
  const [mailHistoryService, setMailHistoryService] = useState(null);
  const [showAllMailLogs, setShowAllMailLogs] = useState(false);
  const [emailLogs, setEmailLogs] = useState([]);
  const loadEmailLogs = async () => {
    try { setEmailLogs((await apiClient.get(`/supplier-emails/${encodeURIComponent(booking.id)}`)).data || []); }
    catch { setEmailLogs([]); }
  };
  useEffect(() => { loadEmailLogs(); }, [booking?.id]);
  const rawServices = (booking?.services || []).filter(s => s.type !== 'Hotel');
  const paymentLines = bookingPaymentLines(booking);
  const services = rawServices.map((service, index) => {
    const master = serviceMasterFor(service, serviceMasters);
    const sourceServiceKey = paymentLineKey('service', service, index);
    const serviceLines = paymentLines.filter((item) => item.sourceServiceKey === sourceServiceKey || item.key === sourceServiceKey);
    const paid = serviceLines.reduce((sum, line) => sum + linePaymentState(booking, line).supplierPaid, 0);
    const total = serviceLines.length
      ? serviceLines.reduce((sum, line) => sum + Number(line.totalCost || 0), 0)
      : Number(service.totalSupplierCost || service.cost || service.supplierCost || 0);
    const paymentDate = serviceLines
      .map((line) => latestSupplierPaymentDate(booking, line.key))
      .filter(Boolean)
      .sort()
      .at(-1) || '';
    return serviceOf({ ...service, imageUrl: serviceImageUrl(service, master), paid, total, payStatus: paid >= total && total > 0 ? 'Paid' : paid > 0 ? 'Deposit Paid' : 'Pending', paymentDate }, index, booking);
  });
  const counts = SVC_FILTERS.reduce((a, t) => { a[t] = t === 'All' ? services.length : services.filter(s => s.type === t || (t === 'Others' && !SVC_FILTERS.slice(1, -1).includes(s.type))).length; return a; }, {});
  const filtered = filter === 'All' ? services : filter === 'Others'
    ? services.filter(s => !SVC_FILTERS.slice(1, -1).includes(s.type))
    : services.filter(s => s.type === filter);
  const totalCost = filtered.reduce((s, x) => s + x.cost, 0);
  const totalSell = filtered.reduce((s, x) => s + x.selling, 0);
  const totalProfit = filtered.reduce((s, x) => s + x.profit, 0);
  const pending = filtered.filter(s => s.payStatus !== 'Paid').reduce((s, x) => s + Math.max(0, x.total - x.paid), 0);
  const profPct = totalSell > 0 ? Math.round((totalProfit / totalSell) * 100) : 0;
  const supplierMasterId = (supplier) => supplier?.id || supplier?._id || '';
  const normaliseSupplierName = (value) => String(value || '').trim().toLowerCase();
  const serviceBeingEditedIsYacht = editingService !== 'new' && editingService?.type === 'Yacht';
  const serviceBeingEditedIsSightseeing = editingService !== 'new' && editingService?.type === 'Sightseeing';
  const editingRawService = editingService !== 'new' ? editingService?._raw : null;
  const editingServiceMaster = editingRawService ? serviceMasterFor(editingRawService, serviceMasters) : null;
  const bookingSightseeingTimings = sightseeingTimingSlots(editingServiceMaster, editingRawService?.serviceDate || editingRawService?.date);
  const eligibleSuppliers = supplierMasters
    .filter((supplier) => supplier?.status !== 'Inactive')
    .filter((supplier) => !serviceBeingEditedIsYacht || (Array.isArray(supplier?.type) ? supplier.type : [supplier?.type]).some((type) => String(type || '').toLowerCase() === 'yacht'));
  const currentSupplierName = editingService !== 'new'
    ? editingService?.yachtSupplier || editingService?.supplier || editingService?._raw?.yachtSupplier || editingService?._raw?.supplier || ''
    : '';
  const selectedSupplierId = editingService !== 'new'
    ? editingService?._raw?.yachtSupplierId || supplierMasterId(eligibleSuppliers.find((supplier) => normaliseSupplierName(supplier?.name) === normaliseSupplierName(currentSupplierName)))
    : '';
  const logsForService = (service) => emailLogs.filter((log) => String(log.serviceId) === String(service?._raw?.id));
  const logsForSupplier = (service) => {
    const name = serviceSupplierName(service?._raw).toLowerCase();
    const id = serviceSupplierId(service?._raw);
    return emailLogs.filter((log) => (id && String(log.supplierId || '') === id) || supplierKey(log.supplierName, log.supplierEmail).startsWith(`${name}|`));
  };

  const historyLogs = mailHistoryService ? logsForSupplier(mailHistoryService) : [];

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto lg:overflow-visible">
      {selected && <ViewModal data={selected} type={selected.type} onClose={() => setSelected(null)} onEdit={() => { setSelected(null); setEditingService(selected); }} />}
      {mailComposer && <SupplierMailComposer booking={booking} service={mailComposer} supplierMasters={supplierMasters} onClose={() => setMailComposer(null)} onSent={(log) => setEmailLogs((current) => [log, ...current.filter((item) => item.id !== log.id)])} onRefresh={loadEmailLogs} />}
      {mailHistoryService && <SupplierMailHistory supplierName={serviceSupplierName(mailHistoryService._raw) || 'supplier'} logs={historyLogs} onClose={() => setMailHistoryService(null)} />}
      {showAllMailLogs && <SupplierMailHistory supplierName="All booking suppliers" logs={emailLogs} allSuppliers onClose={() => setShowAllMailLogs(false)} />}
      
      {/* Editing Service Modal/Form Overlay */}
      {editingService && (() => {
        const isNew = editingService === 'new';
        const lbl = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500';
        const inp = 'form-input !h-9 text-xs font-semibold';
        const Section = ({ icon: Ic, title, tone }) => <div className="col-span-full flex items-center gap-2 pt-1"><span className={`grid h-6 w-6 place-items-center rounded-md ${tone}`}><Ic className="h-3.5 w-3.5" /></span><span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-700">{title}</span><span className="h-px flex-1 bg-slate-200" /></div>;
        return (
        <div className="modal-overlay z-50" onClick={() => setEditingService(null)}>
          <div className="modal-content !max-w-3xl w-[calc(100vw-1rem)] sm:w-full p-0 overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-50 via-white to-indigo-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md flex items-center justify-center flex-shrink-0"><Compass className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-extrabold text-slate-900">{isNew ? 'Add New Service' : 'Edit Service'}</div>
                <div className="truncate text-[11px] font-medium text-slate-500">{isNew ? 'Enter service details' : `Update details for ${editingService.name}`}</div>
              </div>
              <button onClick={() => setEditingService(null)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={async e => { e.preventDefault(); const values = [...e.currentTarget.querySelectorAll('input, select')].map(input => input.value); const [name, serviceDate, time, pax, details, supplierId, totalSupplierCost, totalSellingPrice] = values; const existing = editingService === 'new' ? {} : editingService._raw; const master = serviceMasters.find(item => String(item.id) === String(existing.masterId) || String(item.name || '').trim().toLowerCase() === String(name || '').trim().toLowerCase()); const selectedSupplier = supplierMasters.find((supplier) => String(supplierMasterId(supplier)) === String(supplierId)); const existingSupplierName = existing.yachtSupplier || existing.transferVehicleSupplier || existing.vehicleSupplierName || (typeof existing.supplier === 'object' ? existing.supplier?.name : existing.supplier) || ''; const supplier = selectedSupplier?.name || existingSupplierName; const isYacht = String(existing.type || 'Others').toLowerCase() === 'yacht'; const nextPax = Number(pax || 0); const existingChildren = Number(existing.children || 0); const existingInfants = Number(existing.infants || 0); const existingPax = Number(existing.adults || 0) + existingChildren + existingInfants; const keepExistingMix = nextPax === existingPax; const children = keepExistingMix ? existingChildren : Math.min(existingChildren, nextPax); const infants = keepExistingMix ? existingInfants : Math.min(existingInfants, Math.max(0, nextPax - children)); const record = { ...existing, id: existing.id || `service-${Date.now()}`, type: existing.type || 'Others', name, serviceDate: serviceDate || existing.serviceDate || existing.date || '', time, adults: Math.max(0, nextPax - children - infants), children, infants, details, supplier, ...(isYacht ? { yachtSupplier: supplier, yachtSupplierId: supplierMasterId(selectedSupplier) || existing.yachtSupplierId || '' } : {}), totalSupplierCost: Number(totalSupplierCost || 0), totalSellingPrice: Number(totalSellingPrice || 0), image: existing.image || master?.image, images: existing.images || master?.images }; const nextServices = editingService === 'new' ? [...(booking.services || []), record] : (booking.services || []).map(item => item.id === existing.id ? record : item); try { await onPersist({ services: nextServices }, `${editingService === 'new' ? 'Added' : 'Updated'} service ${name}`); setEditingService(null); toast.success('Service saved!'); } catch (error) { toast.error(error.message); } }} className="flex min-h-0 flex-1 flex-col">
              <div className="grid min-h-0 flex-1 grid-cols-2 sm:grid-cols-6 gap-x-3 gap-y-3 overflow-y-auto p-4">
                <Section icon={Compass} title="Service" tone="bg-blue-100 text-blue-600" />
                <div className="col-span-2 sm:col-span-6"><label className={lbl}>Service Name</label><input type="text" defaultValue={!isNew ? editingService.name : ''} className={inp} placeholder="e.g. Bangkok Airport To Pattaya Hotel" autoFocus /></div>

                <Section icon={Calendar} title="Schedule & Guests" tone="bg-violet-100 text-violet-600" />
                <div className="col-span-1 sm:col-span-2"><label className={lbl}>Date</label><input type="date" defaultValue={!isNew ? inputDateValue(editingService?._raw?.serviceDate || editingService?._raw?.date) : ''} className={inp} /></div>
                <div className="col-span-1 sm:col-span-2"><label className={lbl}>{serviceBeingEditedIsSightseeing && bookingSightseeingTimings.length ? 'Show Timing' : 'Time'}</label>
                  {serviceBeingEditedIsSightseeing && bookingSightseeingTimings.length ? (
                    <select defaultValue={editingService.time || ''} className="form-select !h-9 text-xs font-semibold text-slate-700">
                      <option value="">Select show timing</option>
                      {bookingSightseeingTimings.map((timing) => <option key={timing} value={timing}>{timing}</option>)}
                    </select>
                  ) : (
                    <input type="time" defaultValue={!isNew ? editingService.time : ''} className={inp} />
                  )}
                </div>
                <div className="col-span-1 sm:col-span-1"><label className={lbl}>Guests (Pax)</label><input type="number" min="1" defaultValue={!isNew ? editingService.paxCount : 2} className={inp} /></div>
                <div className="col-span-1 sm:col-span-1"><label className={lbl}>Type / Details</label><input type="text" defaultValue={!isNew ? editingService.details : ''} className={inp} placeholder="e.g. Private" /></div>

                <Section icon={Package} title="Supplier" tone="bg-amber-100 text-amber-600" />
                <div className="col-span-2 sm:col-span-6">
                  <label className={lbl}>{serviceBeingEditedIsYacht ? 'Yacht Supplier' : 'Supplier'}</label>
                  <select defaultValue={selectedSupplierId} className="form-select !h-9 text-xs font-semibold text-slate-700">
                    <option value="">Select Supplier</option>
                    {eligibleSuppliers.map((supplier) => <option key={supplierMasterId(supplier)} value={supplierMasterId(supplier)}>{supplier.name}</option>)}
                  </select>
                  {serviceBeingEditedIsYacht && eligibleSuppliers.length === 0 && <p className="mt-1 text-[10px] text-amber-600">No active Yacht supplier found. Add a supplier with the Yacht type in Supplier Master.</p>}
                </div>

                <Section icon={DollarSign} title="Financials (THB)" tone="bg-emerald-100 text-emerald-600" />
                <div className="col-span-1 sm:col-span-3 rounded-xl border border-slate-300 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total Supplier Cost</label>
                  <input type="number" defaultValue={!isNew ? editingService.cost : ''} className="mt-0.5 w-full border-0 bg-transparent p-0 text-lg font-extrabold text-slate-900 outline-none focus:ring-0" placeholder="0.00" />
                </div>
                <div className="col-span-1 sm:col-span-3 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-3 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Total Selling Price</label>
                  <input type="number" defaultValue={!isNew ? editingService.selling : ''} className="mt-0.5 w-full border-0 bg-transparent p-0 text-lg font-extrabold text-blue-900 outline-none focus:ring-0" placeholder="0.00" />
                </div>
              </div>

              <div className="flex flex-none items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-4 py-3">
                <button type="button" onClick={() => setEditingService(null)} className="btn-secondary h-9 px-6 text-xs">Cancel</button>
                <button type="submit" className="btn-primary h-9 min-w-[150px] justify-center gap-1.5 text-xs"><CheckCircle className="w-4 h-4" /> Save Service</button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      <div className="mb-2.5 flex flex-shrink-0 flex-wrap items-center gap-x-3 gap-y-2 lg:flex-nowrap">
        <div className="order-1 flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md"><Package className="h-4 w-4" /></span>
          <h2 className="whitespace-nowrap text-[15px] font-extrabold text-slate-800">Services <span className="ml-0.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-blue-600">{services.length}</span></h2>
        </div>
        <div className="order-3 -mx-1 flex w-full min-w-0 items-center gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:order-2 lg:mx-0 lg:w-auto lg:flex-1 lg:px-0">
          {SVC_FILTERS.map(t => {
            const Icon = SVC_ICONS[t];
            const active = filter === t;
            return (
              <button key={t} onClick={() => setFilter(t)}
                className={`flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[11px] font-bold transition-all ${active ? 'border-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25' : 'border-slate-300 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'}`}>
                {Icon && <Icon className="h-3.5 w-3.5" />}{t}
                <span className={`grid min-w-[18px] place-items-center rounded-full px-1 text-[10px] leading-[18px] ${active ? 'bg-white/25 text-white' : counts[t] ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400'}`}>{counts[t]}</span>
              </button>
            );
          })}
        </div>
        <div className="order-2 ml-auto flex shrink-0 gap-1.5 lg:order-3 lg:ml-0">
          <button onClick={() => setShowAllMailLogs(true)} title="Mail logs" className="btn-secondary h-8 px-2.5 text-xs gap-1.5"><Mail className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Mail logs</span> <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold">{emailLogs.length}</span></button>
          <button title="Reorder" className="btn-secondary h-8 px-2.5 text-xs gap-1.5"><ArrowUpDown className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Reorder</span></button>
          <button onClick={() => setEditingService('new')} className="btn-primary h-8 px-3 text-xs gap-1.5 shadow-md shadow-blue-500/20"><Plus className="w-3.5 h-3.5" /> <span className="hidden min-[400px]:inline">Add Service</span><span className="min-[400px]:hidden">Add</span></button>
        </div>
      </div>

      <div className="card overflow-hidden flex-none lg:flex-1 lg:min-h-0">
        <div className="overflow-auto h-full">
          <div className="md:hidden p-2 space-y-2">
            {filtered.map((s) => {
              const Icon = SVC_ICONS[s.type] || Package;
              const latestMail = logsForService(s)[0];
              return (
                <div key={s.rowNum} onClick={() => setSelected(s)} className="rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-50">
                  <div className="flex items-start gap-2.5">
                    <div className={`w-11 h-11 rounded-md bg-gradient-to-br ${s.imgGrad} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                      {s.imageUrl ? <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} /> : <Icon className="w-5 h-5 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 leading-snug break-words">{s.name}</div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap"><TypeBadge type={s.type} /><ConfBadge /></div>
                    </div>
                    <div onClick={e => e.stopPropagation()} className="shrink-0"><ActBtns onView={() => setSelected(s)} onMail={() => setMailComposer(s)} onEdit={() => setEditingService(s)} onDelete={async () => { try { await onPersist({ services: (booking.services || []).filter(item => item.id !== s._raw.id) }, `Removed service ${s.name}`); toast.success('Service removed'); } catch (error) { toast.error(error.message); } }} /></div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
                    <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-400" /><span className="font-semibold text-slate-800">{formatDate(s.date)}{s.time ? ` · ${s.time}` : ''}</span></span>
                    <span className="inline-flex items-center gap-1"><Users className="w-3 h-3 text-slate-400" /><span className="font-semibold text-slate-800">{s.pax} Pax</span></span>
                    {(s.details || s.supplier) && <span className="basis-full text-slate-500 break-words">{[s.details, s.supplier].filter(Boolean).join(' · ')}</span>}
                  </div>
                  <div className="mt-2.5 grid grid-cols-3 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-slate-50/70 text-center">
                    <div className="py-1.5 px-1"><div className="text-[9px] uppercase tracking-wide text-slate-400">Cost</div><div className="text-[12px] font-bold text-slate-900">{fmtN(s.cost)}</div></div>
                    <div className="py-1.5 px-1"><div className="text-[9px] uppercase tracking-wide text-slate-400">Selling</div><div className="text-[12px] font-bold text-slate-900">{fmtN(s.selling)}</div></div>
                    <div className="py-1.5 px-1"><div className="text-[9px] uppercase tracking-wide text-slate-400">Profit</div><div className="text-[12px] font-bold text-green-600">{fmtN(s.profit)}</div></div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[9px] uppercase tracking-wide text-slate-400 shrink-0">Payment</span>
                    <div className="min-w-0 flex-1 flex justify-end"><PayBadge status={s.payStatus} paid={s.paid} total={s.total} due={s.due} paymentDate={s.paymentDate} /></div>
                  </div>
                  <div className="mt-2" onClick={e => e.stopPropagation()}>
                    {latestMail
                      ? <button onClick={() => setMailHistoryService(s)} className={`w-full rounded-lg border px-2 py-1.5 text-left text-[10px] font-bold flex items-center gap-1 ${latestMail.status === 'Sent' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}><Mail className="h-3 w-3" /> Mail {latestMail.status} · View mail log</button>
                      : <button onClick={() => setMailComposer(s)} className="w-full inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-bold text-slate-600"><Mail className="h-3 w-3" /> Compose &amp; send</button>}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div className="py-10 text-center text-xs text-slate-400">No services found</div>}
          </div>
          <table className="w-full text-left hidden md:table">
            <thead><tr>
              {['#', 'Service / Type', 'Date & Time', 'Details', 'Supplier', 'Qty / Pax', 'Cost (THB)', 'Selling (THB)', 'Markup', 'Profit (THB)', 'Status', 'Payment', 'Supplier Email', 'Actions'].map(h => (
                <th key={h} className="table-header whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => {
                const Icon = SVC_ICONS[s.type] || Package;
                const serviceLogs = logsForService(s);
                const latestMail = serviceLogs[0];
                const supplierMailCount = logsForSupplier(s).filter((log) => log.status === 'Sent').length;
                return (
                  <tr key={s.rowNum} className="table-row hover:bg-purple-50/20 cursor-pointer" onClick={() => setSelected(s)}>
                    <td className="table-cell text-center text-slate-400 text-[10px] w-8">{s.rowNum}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className={`w-14 h-11 rounded-md bg-gradient-to-br ${s.imgGrad} flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden`}>
                          {s.imageUrl ? <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} /> : <Icon className="w-5 h-5 text-white" />}
                        </div>
                        <div>
                          <ExpandableText text={s.name} />
                          <div className="mt-0.5"><TypeBadge type={s.type} /></div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-[10px] font-semibold text-slate-800">{formatDate(s.date)}</div>
                      {s.time && <div className="text-[10px] text-slate-400">{s.time}</div>}
                    </td>
                    <td className="table-cell">
                      {s.details && <div className="text-[10px] font-semibold text-slate-800">{s.details}</div>}
                      {s.detailSub && <div className="text-[10px] text-slate-400">{s.detailSub}</div>}
                    </td>
                    <td className="table-cell"><div className="text-[10px] text-slate-700" style={{ maxWidth: 110 }}>{s.supplier}</div></td>
                    <td className="table-cell text-center"><div className="text-[10px] text-slate-600">{s.pax} Pax</div></td>
                    <td className="table-cell"><div className="text-[11px] font-bold text-slate-900">{fmtN(s.cost)}</div></td>
                    <td className="table-cell"><div className="text-[11px] font-bold text-slate-900">{fmtN(s.selling)}</div></td>
                    <td className="table-cell"><MarkupCell markup={s.markup} /></td>
                    <td className="table-cell"><ProfitCell profit={s.profit} /></td>
                    <td className="table-cell"><ConfBadge /></td>
                    <td className="table-cell p-1"><PayBadge status={s.payStatus} paid={s.paid} total={s.total} due={s.due} paymentDate={s.paymentDate} /></td>
                    <td className="table-cell" onClick={e => e.stopPropagation()}>{latestMail ? <button onClick={() => setMailHistoryService(s)} className={`min-w-[118px] rounded-lg border px-2 py-1.5 text-left text-[10px] font-bold ${latestMail.status === 'Sent' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`}><span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Mail {latestMail.status}</span><span className="mt-0.5 block text-[9px] font-medium opacity-80">{supplierMailCount} sent to supplier</span><span className="mt-1 block border-t border-current/15 pt-1 text-[9px] font-extrabold">View mail log</span></button> : <button onClick={() => setMailComposer(s)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"><Mail className="h-3 w-3" /> Compose &amp; send</button>}</td>
                    <td className="table-cell" onClick={e => e.stopPropagation()}><ActBtns onView={() => setSelected(s)} onMail={() => setMailComposer(s)} onEdit={() => setEditingService(s)} onDelete={async () => { try { await onPersist({ services: (booking.services || []).filter(item => item.id !== s._raw.id) }, `Removed service ${s.name}`); toast.success('Service removed'); } catch (error) { toast.error(error.message); } }} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
        <div className="text-[11px] font-semibold text-slate-500">Total | {filtered.length} Services</div>
        <SummaryBar items={[
          { label: 'Total Cost (THB)', value: fmtN(totalCost), bg: 'bg-slate-50', bd: 'border-slate-200', lc: 'text-slate-500', vc: 'text-slate-900' },
          { label: 'Total Selling (THB)', value: fmtN(totalSell), bg: 'bg-blue-50', bd: 'border-blue-200', lc: 'text-blue-600', vc: 'text-blue-800' },
          { label: 'Quotation Markup (THB)', value: fmtN(totalSell - totalCost), sub: `${totalCost > 0 ? (((totalSell - totalCost) / totalCost) * 100).toFixed(2) : 0}%`, bg: 'bg-blue-50', bd: 'border-blue-200', lc: 'text-blue-600', vc: 'text-blue-700', sc: 'text-blue-500' },
          { label: 'Total Profit (THB)', value: fmtN(totalProfit), sub: `${profPct}%`, bg: 'bg-green-50', bd: 'border-green-200', lc: 'text-green-600', vc: 'text-green-700', sc: 'text-green-500' },
          { label: 'Pending Payment (THB)', value: fmtN(pending), bg: 'bg-orange-50', bd: 'border-orange-200', lc: 'text-orange-600', vc: 'text-orange-600' },
        ]} />
      </div>
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────
function PaymentsTab({ booking, onRecordPayment, onPersist }) {
  // Supplier payments remain service-specific. Client collections are against
  // the booking invoice and can be recorded as any number of instalments.
  const [payTab, setPayTab] = useState('Summary');
  const [selectedPay, setSelectedPay] = useState(null);
  const [editingPay, setEditingPay] = useState(null);
  const [showInvoiceSettings, setShowInvoiceSettings] = useState(false);
  const [showCreditNote, setShowCreditNote] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({});
  const [creditForm, setCreditForm] = useState({});
  const [scheduleForm, setScheduleForm] = useState({ type: 'Supplier Payment', lineId: '', amount: '', dueDate: '', notes: '' });
  const payments = booking?.payments || [];
  const paymentSchedules = booking?.paymentSchedules || [];
  const paymentLines = bookingPaymentLines(booking);
  const filteredPayments = payTab === 'Supplier Payments' ? payments.filter(p => p.type === 'Supplier Payment')
    : payTab === 'Client Payments' ? payments.filter(p => ['Client Payment', 'Receivable'].includes(p.type))
    : payments;
  const linePaymentSummaries = paymentLines.map((line) => ({ ...line, ...linePaymentState(booking, line) }));
  const suppTotal = linePaymentSummaries.reduce((sum, line) => sum + line.totalCost, 0);
  const suppPaid = linePaymentSummaries.reduce((sum, line) => sum + line.supplierPaid, 0);
  const suppSavings = linePaymentSummaries.reduce((sum, line) => sum + line.supplierSavings, 0);
  const clientInvoice = bookingInvoicePaymentState(booking);
  const clientTotal = clientInvoice.total;
  const clientPaid = clientInvoice.paid;
  const totalSell = clientInvoice.total;
  const totalPaid = clientInvoice.paid;
  const paidPct = totalSell ? Math.round((totalPaid / totalSell) * 100) : 0;
  const nextPendingPayment = payments.find(p => p.status === 'Pending');
  const invoiceSettings = booking.invoiceSettings || {};
  const openPaymentPdf = (payment) => {
    try { openPaymentInvoicePdf({ booking, payment }); } catch (error) { toast.error(`Could not generate payment PDF: ${error.message}`); }
  };
  const latestPaymentForLine = (line) => payments
    .filter((payment) => payment.type === 'Supplier Payment' && (payment.allocations || []).some((allocation) => String(allocation.lineId) === String(line.key)))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0];

  const openInvoiceSettings = () => {
    setInvoiceForm({
      taxTreatment: invoiceSettings.taxTreatment || 'GST Exclude', taxOn: invoiceSettings.taxOn || 'Total Amount', currency: invoiceSettings.currency || booking.currency || 'THB',
      bankCharges: Number(invoiceSettings.bankCharges || 0), vatPercent: Number(invoiceSettings.vatPercent || 0), discountPercent: Number(invoiceSettings.discountPercent || 0),
      description: invoiceSettings.description || booking.title || booking.destination || '', invoiceType: invoiceSettings.invoiceType || 'Proforma', dueDate: invoiceSettings.dueDate || booking.paymentDeadline || '',
    });
    setShowInvoiceSettings(true);
  };
  const updateCredit = (key, rawValue) => setCreditForm((current) => {
    const next = { ...current, [key]: key === 'reason' ? rawValue : Number(rawValue || 0) };
    const taxable = Number(next.taxableAmount || 0);
    if (key === 'taxableAmount' || key === 'cgstPercent') next.cgstAmount = taxable * Number(next.cgstPercent || 0) / 100;
    if (key === 'taxableAmount' || key === 'sgstPercent') next.sgstAmount = taxable * Number(next.sgstPercent || 0) / 100;
    if (key === 'taxableAmount' || key === 'igstPercent') next.igstAmount = taxable * Number(next.igstPercent || 0) / 100;
    next.totalAmount = taxable + Number(next.cgstAmount || 0) + Number(next.sgstAmount || 0) + Number(next.igstAmount || 0);
    return next;
  });
  const openCreditNote = () => {
    setCreditForm({ reason: '', taxableAmount: 0, cgstPercent: 0, cgstAmount: 0, sgstPercent: 0, sgstAmount: 0, igstPercent: 0, igstAmount: 0, totalAmount: 0 });
    setShowCreditNote(true);
  };
  const saveCreditNote = async () => {
    if (Number(creditForm.totalAmount || 0) <= 0) return toast.error('Enter a credit-note amount greater than zero.');
    if (Number(creditForm.totalAmount) > clientInvoice.beforeCredits + 0.0001) return toast.error('A credit note cannot exceed the outstanding invoice before credits.');
    const note = { id: `CN-${Date.now()}`, date: todayIsoInTimeZone(), ...creditForm, status: 'Applied' };
    try { await onPersist({ creditNotes: [...(booking.creditNotes || []), note] }, `Applied credit note ${note.id}`); setShowCreditNote(false); toast.success('Credit note applied to the client invoice.'); } catch (error) { toast.error(error.message); }
  };
  const openScheduleForm = () => {
    setScheduleForm({ type: 'Supplier Payment', lineId: '', amount: '', dueDate: supplierPaymentDueDate(booking), notes: '' });
    setShowScheduleForm(true);
  };
  const saveSchedule = async () => {
    const amount = Number(scheduleForm.amount || 0);
    if (!scheduleForm.dueDate) return toast.error('Choose a payment due date.');
    if (amount <= 0) return toast.error('Enter a planned amount greater than zero.');
    const isClient = scheduleForm.type === 'Client Payment';
    const line = isClient ? null : linePaymentSummaries.find((item) => item.key === scheduleForm.lineId);
    if (!isClient && !line) return toast.error('Choose the supplier hotel or service.');
    const alreadyPlanned = paymentSchedules.filter((item) => item.status !== 'Cancelled' && item.type === scheduleForm.type && (isClient || item.lineId === line.key)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const available = isClient ? clientInvoice.remaining : line.supplierRemaining;
    if (amount + alreadyPlanned > available + 0.0001) return toast.error(`Planned amount exceeds the remaining ${isClient ? 'client invoice' : 'supplier balance'}.`);
    const schedule = { id: `SCH-${Date.now()}`, type: scheduleForm.type, lineId: line?.key || '', lineName: line?.name || 'Booking Invoice', supplier: line?.supplier || booking.guestName || 'Client', amount, dueDate: scheduleForm.dueDate, notes: scheduleForm.notes.trim(), status: 'Planned', createdAt: new Date().toISOString() };
    try { await onPersist({ paymentSchedules: [...paymentSchedules, schedule] }, `Planned ${schedule.type.toLowerCase()} due ${schedule.dueDate}`); setShowScheduleForm(false); toast.success('Payment schedule added.'); } catch (error) { toast.error(error.message); }
  };

  const exportPayments = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    let head, body, name;
    if (payTab === 'Payment Schedule') {
      name = 'payment-schedule';
      head = ['Type', 'Client / Supplier', 'Hotel or Service', 'Planned Amount', 'Due Date', 'Planning Note', 'Status'];
      body = paymentSchedules.map(x => [x.type, x.supplier, x.lineName, x.amount, x.dueDate, x.notes, x.status || 'Planned']);
    } else if (payTab === 'Summary') {
      name = 'payment-summary';
      head = ['Type', 'Hotel / Service', 'Stay / Service Date', 'Supplier', 'Cost', 'Selling', 'Paid', 'Remaining', 'Markup', 'Profit', 'Confirmation', 'Cut-off', 'Status', 'Last Paid'];
      body = linePaymentSummaries.map(l => { const lp = latestPaymentForLine(l); return [l.type, l.name, paymentLineDateLabel(l), l.supplier, l.totalCost, l.totalSelling, l.supplierPaid, l.supplierRemaining, l.plannedProfit, l.grossProfit, lp?.confirmationNo || '', lp?.cutoffDate || '', lp?.serviceStatus || '', lp?.date || '']; });
    } else {
      name = payTab === 'Client Payments' ? 'client-payments' : 'supplier-payments';
      head = ['Payment Date', 'Payment Type', 'Related To', 'Supplier / Client', 'Reference No.', 'Amount (THB)', 'Payment Method', 'Status', 'Remarks'];
      body = filteredPayments.map(x => [x.date, x.type, x.related, x.supplier, x.ref, x.amount, x.method, x.status, x.remarks]);
    }
    if (!body.length) return toast.error('Nothing to export in this tab.');
    const num = (v) => typeof v === 'number';
    const cell = (v, h) => /date|cut-off|paid$/i.test(h) && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? formatDate(v) : v;
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:Calibri,Arial;font-size:11pt}th{background:#173567;color:#ffffff;font-weight:bold;border:1px solid #0f2547;padding:6px 10px;text-align:left}td{border:1px solid #cbd5e1;padding:5px 10px;mso-number-format:"\\@"}td.n{mso-number-format:"#,##0.00";text-align:right}tr:nth-child(even) td{background:#f1f5f9}</style></head><body><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${r.map((v, i) => { const c = cell(v, head[i]); return `<td${num(c) ? ' class="n"' : ''}>${String(c ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</td>`; }).join('')}</tr>`).join('')}</tbody></table></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${booking.id || 'booking'}-${name}.xls`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Export downloaded.');
  };

  const statCards = [
    { icon: DollarSign, grad: 'from-blue-500 to-indigo-600', val: `${fmtN(totalSell)} THB`, label: 'Total Booking Value', bg: 'bg-blue-50 border-blue-200', vc: 'text-blue-800', lc: 'text-blue-600' },
    { icon: CheckCircle, grad: 'from-emerald-400 to-green-600', val: `${fmtN(totalPaid)} THB`, label: 'Total Paid', sub: `${paidPct}%`, bg: 'bg-green-50 border-green-200', vc: 'text-green-800', lc: 'text-green-600' },
    { icon: CreditCard, grad: 'from-orange-400 to-red-500', val: `${fmtN(clientInvoice.remaining)} THB`, label: 'Invoice Balance', sub: `${100 - paidPct}%`, bg: 'bg-orange-50 border-orange-200', vc: 'text-orange-800', lc: 'text-orange-600' },
    { icon: Clock, grad: 'from-red-400 to-rose-500', val: formatDate(nextPendingPayment?.date), label: 'Next Payment Due', sub: nextPendingPayment ? `${fmtI(nextPendingPayment.amount)} THB` : 'No pending payment', bg: 'bg-red-50 border-red-200', vc: 'text-red-800', lc: 'text-red-500', sc: 'text-slate-500' },
    { icon: Users, grad: 'from-purple-500 to-pink-500', val: `${payments.filter(p => p.type === 'Supplier Payment').length} Suppliers`, label: 'Supplier Dues', sub: `${fmtI(suppTotal - suppPaid)} THB`, bg: 'bg-purple-50 border-purple-200', vc: 'text-purple-800', lc: 'text-purple-600', sc: 'text-slate-500' },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto lg:overflow-visible">
      {showInvoiceSettings && <div className="modal-overlay z-50" onClick={() => setShowInvoiceSettings(false)}><div className="modal-content max-w-3xl w-[calc(100vw-1rem)] sm:w-full p-0 overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] border border-slate-300" onClick={e => e.stopPropagation()}><div className="bg-slate-100 border-b border-slate-300 px-4 py-2.5 flex items-center gap-3 shrink-0"><div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 shadow-sm flex items-center justify-center shrink-0"><FileText className="w-[18px] h-[18px] text-blue-600" /></div><div className="flex-1 min-w-0"><div className="text-sm font-extrabold text-slate-800">Invoice settings</div><div className="text-[10px] text-slate-500">Currency, percentage discount, GST/VAT and payment terms apply to the client invoice only.</div></div><button onClick={() => setShowInvoiceSettings(false)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded"><X className="w-4 h-4" /></button></div><div className="p-3 sm:px-4 overflow-y-auto min-h-0 flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 content-start [&_.form-input]:!h-8 [&_.form-select]:!h-8 [&_.form-input]:!py-0 [&_.form-select]:!py-0 [&_.form-input]:!text-xs [&_.form-select]:!text-xs [&_.form-label]:!mb-0.5 [&_textarea.form-input]:!h-12 [&_textarea.form-input]:!py-1.5"><label><span className="form-label">Tax treatment</span><select className="form-select" value={invoiceForm.taxTreatment} onChange={e => setInvoiceForm(x => ({ ...x, taxTreatment: e.target.value }))}><option>GST Exclude</option><option>GST Include</option></select></label><label><span className="form-label">Tax calculation basis</span><select className="form-select" value={invoiceForm.taxOn} onChange={e => setInvoiceForm(x => ({ ...x, taxOn: e.target.value }))}><option>Total Amount</option><option>Taxable Amount</option></select></label><label><span className="form-label">Currency</span><select className="form-select" value={invoiceForm.currency} onChange={e => setInvoiceForm(x => ({ ...x, currency: e.target.value }))}><option>THB</option><option>USD</option><option>EUR</option><option>INR</option></select></label><label><span className="form-label">VAT / GST %</span><input type="number" min="0" step="0.01" className="form-input" value={invoiceForm.vatPercent} onChange={e => setInvoiceForm(x => ({ ...x, vatPercent: e.target.value }))} /></label><label><span className="form-label">Discount (%)</span><input type="number" min="0" max="100" step="0.01" className="form-input" value={invoiceForm.discountPercent} onChange={e => setInvoiceForm(x => ({ ...x, discountPercent: e.target.value }))} /></label><label><span className="form-label">Bank charges</span><input type="number" min="0" step="0.01" className="form-input" value={invoiceForm.bankCharges} onChange={e => setInvoiceForm(x => ({ ...x, bankCharges: e.target.value }))} /></label><label><span className="form-label">Invoice type</span><select className="form-select" value={invoiceForm.invoiceType} onChange={e => setInvoiceForm(x => ({ ...x, invoiceType: e.target.value }))}><option>Proforma</option><option>Tax Invoice</option><option>Invoice</option></select></label><label><span className="form-label">Due date</span><DateInput className="form-input" value={inputDateValue(invoiceForm.dueDate)} onChange={value => setInvoiceForm(x => ({ ...x, dueDate: value }))} /></label><label className="col-span-2 sm:col-span-1"><span className="form-label">Invoice description</span><input className="form-input" value={invoiceForm.description} onChange={e => setInvoiceForm(x => ({ ...x, description: e.target.value }))} placeholder="e.g. 7 Nights / 8 Days Thailand Family Holiday" /></label></div><div className="border-t border-slate-300 bg-slate-50 px-4 py-2.5 flex justify-end gap-2 shrink-0"><button onClick={() => setShowInvoiceSettings(false)} className="btn-secondary h-9 px-4 text-xs">Cancel</button><button onClick={async () => { try { await onPersist({ invoiceSettings: { ...invoiceForm, vatPercent: Number(invoiceForm.vatPercent || 0), discountPercent: Math.min(100, Math.max(0, Number(invoiceForm.discountPercent || 0))), discount: 0, bankCharges: Number(invoiceForm.bankCharges || 0) } }, 'Updated client invoice settings'); setShowInvoiceSettings(false); toast.success('Invoice settings saved.'); } catch (error) { toast.error(error.message); } }} className="btn-primary h-9 px-4 text-xs">Save invoice</button></div></div></div>}

      {showCreditNote && <div className="modal-overlay z-50" onClick={() => setShowCreditNote(false)}><div className="modal-content max-w-3xl w-[calc(100vw-1rem)] sm:w-full p-0 overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] border border-slate-300" onClick={e => e.stopPropagation()}><div className="bg-slate-100 border-b border-slate-300 px-4 py-2.5 flex items-center gap-3 shrink-0"><div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 shadow-sm flex items-center justify-center shrink-0"><CreditCard className="w-[18px] h-[18px] text-blue-600" /></div><div className="flex-1 min-w-0"><div className="text-sm font-extrabold text-slate-800">Create credit note</div><div className="text-[10px] text-slate-500">The final credit-note amount reduces the client invoice balance.</div></div><button onClick={() => setShowCreditNote(false)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded"><X className="w-4 h-4" /></button></div><div className="p-3 sm:px-4 overflow-y-auto min-h-0 flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 content-start [&_.form-input]:!h-8 [&_.form-select]:!h-8 [&_.form-input]:!py-0 [&_.form-select]:!py-0 [&_.form-input]:!text-xs [&_.form-select]:!text-xs [&_.form-label]:!mb-0.5 [&_textarea.form-input]:!h-12 [&_textarea.form-input]:!py-1.5"><label className="col-span-2 sm:col-span-3"><span className="form-label">Reason</span><input className="form-input" value={creditForm.reason} onChange={e => updateCredit('reason', e.target.value)} placeholder="Reason for the client credit" /></label>{[['taxableAmount', 'Taxable Amount'], ['cgstPercent', 'CGST %'], ['cgstAmount', 'CGST Amount'], ['sgstPercent', 'SGST %'], ['sgstAmount', 'SGST Amount'], ['igstPercent', 'IGST %'], ['igstAmount', 'IGST Amount']].map(([key, label]) => <label key={key}><span className="form-label">{label}</span><input type="number" min="0" step="0.01" className="form-input" value={creditForm[key]} onChange={e => updateCredit(key, e.target.value)} /></label>)}<div className="col-span-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 self-end"><div className="text-[10px] font-bold uppercase text-blue-600">Credit note total</div><div className="text-lg font-extrabold text-blue-900">{fmtN(creditForm.totalAmount)} THB</div></div></div><div className="border-t border-slate-300 bg-slate-50 px-4 py-2.5 flex justify-end gap-2 shrink-0"><button onClick={() => setShowCreditNote(false)} className="btn-secondary h-9 px-4 text-xs">Cancel</button><button onClick={saveCreditNote} className="btn-primary h-9 px-4 text-xs">Apply credit note</button></div></div></div>}

      {showScheduleForm && <div className="modal-overlay z-50" onClick={() => setShowScheduleForm(false)}><div className="modal-content max-w-3xl w-[calc(100vw-1rem)] sm:w-full p-0 overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] border border-slate-300" onClick={e => e.stopPropagation()}><div className="bg-slate-100 border-b border-slate-300 px-4 py-2.5 flex items-center gap-3 shrink-0"><div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 shadow-sm flex items-center justify-center shrink-0"><Calendar className="w-[18px] h-[18px] text-blue-600" /></div><div className="flex-1 min-w-0"><div className="text-sm font-extrabold text-slate-800">Plan payment schedule</div><div className="text-[10px] text-slate-500">Scheduled supplier amounts appear in the central Payment Planner.</div></div><button onClick={() => setShowScheduleForm(false)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded"><X className="w-4 h-4" /></button></div><div className="p-3 sm:px-4 overflow-y-auto min-h-0 flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 content-start [&_.form-input]:!h-8 [&_.form-select]:!h-8 [&_.form-input]:!py-0 [&_.form-select]:!py-0 [&_.form-input]:!text-xs [&_.form-select]:!text-xs [&_.form-label]:!mb-0.5 [&_textarea.form-input]:!h-12 [&_textarea.form-input]:!py-1.5"><label><span className="form-label">Schedule type</span><select className="form-select" value={scheduleForm.type} onChange={e => setScheduleForm(x => ({ ...x, type: e.target.value, lineId: '', amount: '' }))}><option>Supplier Payment</option><option>Client Payment</option></select></label>{scheduleForm.type === 'Supplier Payment' ? <label><span className="form-label">Hotel / service</span><select className="form-select" value={scheduleForm.lineId} onChange={e => { const line = linePaymentSummaries.find(item => item.key === e.target.value); const alreadyPlanned = paymentSchedules.filter(item => item.status !== 'Cancelled' && item.type === 'Supplier Payment' && item.lineId === line?.key).reduce((sum, item) => sum + Number(item.amount || 0), 0); const available = Math.max(0, Number(line?.supplierRemaining || 0) - alreadyPlanned); setScheduleForm(x => ({ ...x, lineId: e.target.value, amount: e.target.value ? String(available) : '' })); }}><option value="">Select supplier line</option>{linePaymentSummaries.filter(line => line.supplierRemaining > 0).map(line => <option key={line.key} value={line.key}>{line.type} · {line.name} · {fmtN(line.supplierRemaining)} due</option>)}</select></label> : <label><span className="form-label">Client invoice</span><div className="form-input flex h-[42px] items-center bg-blue-50 text-sm font-semibold text-blue-800">Remaining {fmtN(clientInvoice.remaining)} THB</div></label>}<label><span className="form-label">Planned amount (THB)</span><input type="number" min="0" step="0.01" className="form-input" value={scheduleForm.amount} onChange={e => setScheduleForm(x => ({ ...x, amount: e.target.value }))} /></label><label><span className="form-label">Due date</span><input type="date" className="form-input" value={scheduleForm.dueDate} onChange={e => setScheduleForm(x => ({ ...x, dueDate: e.target.value }))} /></label><label className="col-span-2"><span className="form-label">Planning note</span><textarea className="form-input" value={scheduleForm.notes} onChange={e => setScheduleForm(x => ({ ...x, notes: e.target.value }))} placeholder="For example: 50% deposit after confirmation" /></label></div><div className="border-t border-slate-300 bg-slate-50 px-4 py-2.5 flex justify-end gap-2 shrink-0"><button onClick={() => setShowScheduleForm(false)} className="btn-secondary h-9 px-4 text-xs">Cancel</button><button onClick={saveSchedule} className="btn-primary h-9 px-4 text-xs">Add to schedule</button></div></div></div>}
      {/* View Payment Modal */}
      {selectedPay && (
        <div className="modal-overlay z-50" onClick={() => setSelectedPay(null)}>
          <div className="modal-content !max-w-2xl w-[calc(100vw-1rem)] sm:w-full p-0 overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-50 via-white to-indigo-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md flex items-center justify-center flex-shrink-0"><CreditCard className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Payment Details</div>
                <div className="text-[15px] font-extrabold text-slate-900 truncate">{selectedPay.ref || 'Payment'}</div>
              </div>
              <span className={`hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${selectedPay.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{selectedPay.status}</span>
              <button onClick={() => setSelectedPay(null)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2.5">
                <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-3 shadow-sm">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-600 text-white shadow"><DollarSign className="h-5 w-5" /></span>
                  <div className="min-w-0"><div className="text-[9px] font-bold uppercase tracking-wide text-blue-600">Amount (THB)</div><div className="text-xl font-black leading-tight text-blue-900">{fmtN(selectedPay.amount)}</div></div>
                </div>
                <div className={`flex items-center gap-3 rounded-xl border p-3 shadow-sm ${selectedPay.status === 'Paid' ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white' : 'border-amber-200 bg-gradient-to-br from-amber-50 to-white'}`}>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white shadow ${selectedPay.status === 'Paid' ? 'bg-emerald-600' : 'bg-amber-500'}`}><Calendar className="h-5 w-5" /></span>
                  <div className="min-w-0"><div className={`text-[9px] font-bold uppercase tracking-wide ${selectedPay.status === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>{selectedPay.status} on</div><div className={`text-xl font-black leading-tight ${selectedPay.status === 'Paid' ? 'text-emerald-800' : 'text-amber-800'}`}>{formatDate(selectedPay.date)}</div></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  [Tag, 'Type', selectedPay.type, false],
                  [Hash, 'Method', selectedPay.method, false],
                  [User, 'Client / Supplier', selectedPay.supplier, true],
                  [Info, 'Related To', selectedPay.related, true],
                  [FileText, 'Bank', selectedPay.bankName || '—', true],
                  [Hash, 'Confirmation No.', selectedPay.confirmationNo || '—', false],
                  [Calendar, 'Cut-off Date', selectedPay.cutoffDate ? formatDate(selectedPay.cutoffDate) : '—', false],
                  [CheckCircle, 'Service Status', selectedPay.serviceStatus || '—', false],
                  ...(selectedPay.remarks ? [[FileText, 'Remarks', selectedPay.remarks, true]] : []),
                ].map(([Ic, label, val, wide], idx) => (
                  <div key={label} className={`flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm ${wide ? 'col-span-2' : ''}`}>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${['bg-blue-100 text-blue-600','bg-violet-100 text-violet-600','bg-emerald-100 text-emerald-600','bg-cyan-100 text-cyan-600','bg-rose-100 text-rose-600','bg-amber-100 text-amber-600','bg-indigo-100 text-indigo-600'][idx % 7]}`}><Ic className="w-4 h-4" /></span>
                    <div className="min-w-0"><div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</div><div className="text-[12px] font-bold leading-snug text-slate-800 break-words">{val}</div></div>
                  </div>
                ))}
              </div>
              {selectedPay.supplierBankDetails && Object.values(selectedPay.supplierBankDetails).some(Boolean) && <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3"><div className="text-[10px] font-extrabold uppercase tracking-wide text-blue-700">Supplier bank details</div><div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-[11px] text-slate-700 sm:grid-cols-2">{[['Account name', selectedPay.supplierBankDetails.accountName], ['Account number', selectedPay.supplierBankDetails.accountNumber], ['Bank', selectedPay.supplierBankDetails.bankName], ['Branch', selectedPay.supplierBankDetails.branch], ['IFSC / IBAN', selectedPay.supplierBankDetails.ifscCode || selectedPay.supplierBankDetails.iban || selectedPay.supplierBankDetails.ibnCode], ['SWIFT', selectedPay.supplierBankDetails.swiftCode]].filter(([, value]) => value).map(([label, value]) => <div key={label}><span className="font-semibold text-slate-500">{label}: </span>{value}</div>)}</div></div>}
              {attachmentUrl(selectedPay.attachment) && <a href={attachmentUrl(selectedPay.attachment)} target="_blank" rel="noreferrer" className="block rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-bold text-blue-700 hover:bg-blue-100"><Paperclip className="mr-1 inline h-3.5 w-3.5" />{attachmentName(selectedPay.attachment) || 'View payment attachment'}</a>}
            </div>
            <div className="border-t border-slate-200 px-3 sm:px-4 py-2.5 flex gap-2 bg-slate-50 flex-shrink-0">
              <button onClick={() => openPaymentPdf(selectedPay)} className="btn-secondary h-9 px-3.5 text-xs justify-center gap-1.5"><FileText className="w-3.5 h-3.5" /> PDF</button>
              <button onClick={() => { setSelectedPay(null); setEditingPay(selectedPay); }} className="btn-primary flex-1 h-9 text-xs justify-center gap-1.5"><Edit className="w-3.5 h-3.5" /> Edit</button>
              <button onClick={() => setSelectedPay(null)} className="btn-secondary h-9 px-5 text-xs">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editingPay && (
        <div className="modal-overlay z-50" onClick={() => setEditingPay(null)}>
          <div className="modal-content max-w-3xl w-[calc(100vw-1rem)] sm:w-full p-0 overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] border border-slate-300" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-blue-50 shadow-sm border border-blue-100 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-[18px] h-[18px] text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-extrabold text-slate-800">{editingPay === 'new' ? 'Add New Payment' : 'Edit Payment'}</div>
                <div className="text-[10px] font-medium text-slate-500">{editingPay === 'new' ? 'Enter payment details' : `Update payment ${editingPay.ref}`}</div>
              </div>
              <button onClick={() => setEditingPay(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={async e => {
              e.preventDefault();
              const fields = e.currentTarget.elements;
              const date = fields.paymentDate.value;
              const type = fields.paymentType.value;
              const related = fields.related.value;
              const supplier = fields.supplier.value;
              const ref = fields.reference.value;
              const method = fields.method.value;
              const amount = fields.amount.value;
              const status = fields.status.value;
              const remarks = fields.remarks.value;
              const existing = editingPay === 'new' ? {} : editingPay;
              const numericAmount = Number(amount || 0);
              if (numericAmount <= 0) { toast.error('Enter a valid payment amount.'); return; }
              let attachment = existing.attachment || null;
              const attachmentFile = e.currentTarget.elements.paymentAttachment?.files?.[0];
              try {
                if (attachmentFile) {
                  const formData = new FormData();
                  formData.append('paymentAttachment', attachmentFile);
                  attachment = (await apiClient.upload('/uploads?folder=payments', formData)).data?.[0] || attachment;
                }
              } catch (error) { toast.error(`Attachment upload failed: ${error.message}`); return; }
              const allocations = (existing.allocations || []).map((allocation) => ({ ...allocation, amount: numericAmount }));
              const payment = { ...existing, id: existing.id || `pay-${Date.now()}`, date, type, related, supplier, ref, reference: ref, method, amount: numericAmount, status, remarks, attachment, allocations, confirmationNo: fields.confirmationNo.value.trim(), cutoffDate: fields.cutoffDate.value, serviceStatus: fields.serviceStatus.value };
              const nextPayments = editingPay === 'new' ? [...payments, payment] : payments.map((item) => item.id === existing.id ? payment : item);
              try { await onPersist({ payments: nextPayments }, `${editingPay === 'new' ? 'Added' : 'Updated'} ${type.toLowerCase()} ${ref || ''}`.trim()); setEditingPay(null); toast.success('Payment saved.'); } catch (error) { toast.error(error.message); }
            }} className="flex flex-col min-h-0 flex-1">
            <div className="p-3 sm:px-4 sm:py-3 overflow-y-auto min-h-0 flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">
                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Date</label>
                  <input name="paymentDate" type="date" defaultValue={inputDateValue(editingPay !== 'new' ? editingPay.date : '')} className="form-input mt-1 h-8 text-xs font-semibold text-slate-700" />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Type</label>
                  <select name="paymentType" defaultValue={editingPay !== 'new' ? editingPay.type : 'Supplier Payment'} className="form-select mt-1 h-8 text-xs font-semibold text-slate-700">
                    <option>Supplier Payment</option><option>Client Payment</option><option>Refund</option>
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Related To</label>
                  <select name="related" defaultValue={editingPay !== 'new' ? editingPay.related : 'Hotel'} className="form-select mt-1 h-8 text-xs font-semibold text-slate-700">
                    <option>Hotel</option><option>Transfer</option><option>Sightseeing</option><option>Booking Advance</option><option>Balance Payment</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Supplier / Client</label>
                  <input name="supplier" type="text" defaultValue={editingPay !== 'new' ? editingPay.supplier : ''} className="form-input mt-1 h-8 text-xs font-semibold" placeholder="e.g. Rama Hospitality" />
                </div>

                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Reference No.</label>
                  <input name="reference" type="text" defaultValue={editingPay !== 'new' ? editingPay.ref : ''} className="form-input mt-1 h-8 text-xs font-semibold text-slate-700" placeholder="e.g. INV-123" />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Payment Method</label>
                  <select name="method" defaultValue={editingPay !== 'new' ? editingPay.method : 'Bank Transfer'} className="form-select mt-1 h-8 text-xs font-semibold text-slate-700">
                    <option>Bank Transfer</option><option>Credit Card</option><option>Cash</option>
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Amount (THB)</label>
                  <input name="amount" type="number" defaultValue={editingPay !== 'new' ? editingPay.amount : ''} className="form-input mt-1 h-8 text-xs font-semibold text-slate-900" placeholder="0.00" />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Status</label>
                  <select name="status" defaultValue={editingPay !== 'new' ? editingPay.status : 'Paid'} className="form-select mt-1 h-8 text-xs font-semibold text-slate-700">
                    <option>Paid</option><option>Pending</option><option>Cancelled</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Remarks</label>
                  <input name="remarks" type="text" defaultValue={editingPay !== 'new' ? editingPay.remarks : ''} className="form-input mt-1 h-8 text-xs font-semibold" placeholder="e.g. Deposit for 2 Rooms" />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Confirmation No.</label>
                  <input name="confirmationNo" type="text" defaultValue={editingPay !== 'new' ? editingPay.confirmationNo : ''} className="form-input mt-1 h-8 text-xs font-semibold" placeholder="Supplier confirmation" />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Cut-off Date</label>
                  <input name="cutoffDate" type="date" defaultValue={inputDateValue(editingPay !== 'new' ? editingPay.cutoffDate : '')} className="form-input mt-1 h-8 text-xs font-semibold" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Service Status</label>
                  <select name="serviceStatus" defaultValue={editingPay !== 'new' ? editingPay.serviceStatus || 'Confirmed' : 'Confirmed'} className="form-select mt-1 h-8 text-xs font-semibold"><option>Confirmed</option><option>Pending</option><option>On Hold</option><option>Cancelled</option></select>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Payment attachment</label>
                  {attachmentUrl(editingPay !== 'new' ? editingPay.attachment : null) && <a href={attachmentUrl(editingPay.attachment)} target="_blank" rel="noreferrer" className="mt-1 block w-fit text-xs font-bold text-blue-600 hover:underline">View current attachment: {attachmentName(editingPay.attachment)}</a>}
                  <input name="paymentAttachment" type="file" accept="image/*,application/pdf" className="form-input mt-1 h-8 py-1.5 text-xs" />
                  <p className="mt-0.5 text-[10px] text-slate-400">Choose a file only to replace the current attachment.</p>
                </div>
              </div>
            </div>

              <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-slate-300 bg-slate-50 shrink-0">
                <button type="submit" className="btn-primary h-9 px-6 justify-center gap-1.5"><Plus className="w-4 h-4" /> Save Payment</button>
                <button type="button" onClick={() => setEditingPay(null)} className="btn-secondary h-9 px-5">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-2 flex-shrink-0 [&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1">
        {statCards.map((c, i) => (
          <div key={i} className={`${c.bg} !border-slate-300 border rounded-xl px-2.5 py-1.5 flex items-center gap-2.5 min-w-0 shadow-sm`}>
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${c.grad} flex items-center justify-center flex-shrink-0 shadow-sm`}>
              <c.icon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className={`text-[9px] font-extrabold uppercase tracking-wider ${c.lc} truncate`}>{c.label}</div>
              <div className={`text-[13px] font-extrabold ${c.vc} truncate`}>{c.val}</div>
              {c.sub && <div className={`text-[9.5px] font-medium ${c.sc || c.lc} truncate`}>{c.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2 flex-shrink-0 flex-wrap gap-2">
        <div className="flex border-b border-slate-200 overflow-x-auto max-w-full w-full sm:w-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {['Summary', 'Payment Schedule', 'Supplier Payments', 'Client Payments'].map(t => (
            <button key={t} onClick={() => setPayTab(t)}
              className={`pb-1.5 px-3 text-[11px] font-bold border-b-2 transition-all whitespace-nowrap ${payTab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>{t}</button>
          ))}
        </div>
        <div className="grid grid-cols-4 sm:flex gap-1.5 w-full sm:w-auto">
          <button onClick={openScheduleForm} title="Plan payment" className="btn-secondary h-8 sm:h-7 px-2 sm:px-2.5 text-[11px] sm:text-xs gap-1 justify-center"><Calendar className="w-3.5 h-3.5 sm:w-3 sm:h-3 shrink-0" /> <span className="truncate"><span className="sm:hidden">Plan</span><span className="hidden sm:inline">Plan payment</span></span></button>
          <button onClick={openInvoiceSettings} title="Invoice settings" className="btn-secondary h-8 sm:h-7 px-2 sm:px-2.5 text-[11px] sm:text-xs gap-1 justify-center"><ArrowUpDown className="w-3.5 h-3.5 sm:w-3 sm:h-3 shrink-0" /> <span className="truncate"><span className="sm:hidden">Invoice</span><span className="hidden sm:inline">Invoice settings</span></span></button>
          <button onClick={openCreditNote} title="Credit note" className="btn-secondary h-8 sm:h-7 px-2 sm:px-2.5 text-[11px] sm:text-xs gap-1 justify-center"><FileText className="w-3.5 h-3.5 sm:w-3 sm:h-3 shrink-0" /> <span className="truncate"><span className="sm:hidden">Credit</span><span className="hidden sm:inline">Credit note</span></span></button>
          <button title="Export" onClick={exportPayments} className="btn-secondary h-8 sm:h-7 px-2 sm:px-2.5 text-[11px] sm:text-xs gap-1 justify-center"><Download className="w-3.5 h-3.5 sm:w-3 sm:h-3 shrink-0" /> <span className="truncate">Export</span></button>
        </div>
      </div>

      {(booking.creditNotes || []).filter(note => note.status !== 'Cancelled').length > 0 && <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs"><span className="font-extrabold text-blue-800">Applied credit notes</span>{(booking.creditNotes || []).filter(note => note.status !== 'Cancelled').map(note => <span key={note.id} className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 font-semibold text-blue-800 border border-blue-100"><span>{note.id} · {fmtN(note.totalAmount)} THB</span><button title="Cancel credit note" onClick={async () => { try { await onPersist({ creditNotes: (booking.creditNotes || []).map(item => item.id === note.id ? { ...item, status: 'Cancelled', cancelledAt: new Date().toISOString() } : item) }, `Cancelled credit note ${note.id}`); toast.success('Credit note cancelled.'); } catch (error) { toast.error(error.message); } }} className="text-blue-500 hover:text-red-600"><X className="w-3 h-3" /></button></span>)}</div>}

      {payTab === 'Payment Schedule' ? (
        <div className="card !border-slate-300 shadow-sm overflow-auto flex-none lg:min-h-0 max-lg:max-h-[75dvh]">
          <table className="w-full text-[11px] [&_.table-cell]:!px-2 [&_.table-cell]:!py-1.5" style={{ minWidth: 850 }}>
            <thead className="lg:sticky top-0 z-10"><tr>{['Type', 'Client / Supplier', 'Hotel or service', 'Planned amount', 'Due date', 'Planning note', 'Status', 'Action'].map(header => <th key={header} className="table-header !bg-[#173567] !text-white !px-2 !py-2 !text-[9.5px] whitespace-nowrap">{header}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-200 [&>tr:nth-child(even)]:bg-slate-50/70">
              {paymentSchedules.map(schedule => <tr key={schedule.id} className="table-row"><td className="table-cell"><span className={`inline-flex whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[9.5px] font-bold ${schedule.type === 'Client Payment' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-orange-200 bg-orange-50 text-orange-700'}`}>{schedule.type}</span></td><td className="table-cell font-semibold text-slate-700">{schedule.supplier}</td><td className="table-cell text-xs text-slate-600">{schedule.lineName}</td><td className="table-cell tabular-nums font-extrabold text-slate-800">{fmtN(schedule.amount)}</td><td className="table-cell whitespace-nowrap text-[10.5px] font-semibold">{formatDate(schedule.dueDate)}</td><td className="table-cell text-xs text-slate-500">{schedule.notes || '—'}</td><td className="table-cell"><span className={`inline-flex rounded-full px-2 py-0.5 text-[9.5px] font-bold ring-1 ${schedule.status === 'Cancelled' ? 'bg-slate-100 text-slate-500 ring-slate-200' : 'bg-blue-50 text-blue-700 ring-blue-200'}`}>{schedule.status || 'Planned'}</span></td><td className="table-cell">{schedule.status !== 'Cancelled' && <button onClick={async () => { try { await onPersist({ paymentSchedules: paymentSchedules.map(item => item.id === schedule.id ? { ...item, status: 'Cancelled', cancelledAt: new Date().toISOString() } : item) }, `Cancelled payment schedule ${schedule.id}`); toast.success('Payment schedule cancelled.'); } catch (error) { toast.error(error.message); } }} className="text-xs font-bold text-red-600 hover:underline">Cancel</button>}</td></tr>)}
              {!paymentSchedules.length && (
                <tr><td colSpan="8" className="p-0">
                  <div className="flex flex-col items-center justify-center gap-2 px-4 py-6 text-center">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm"><Calendar className="h-5 w-5" /></div>
                    <div className="text-sm font-extrabold text-slate-800">No payment schedules planned</div>
                    <p className="max-w-md text-[11px] leading-snug text-slate-500">Plan client or supplier instalments with due dates. Planned amounts also appear in the central Payment Planner.</p>
                    <button onClick={openScheduleForm} className="btn-primary h-8 gap-1.5 px-4 text-xs"><Plus className="h-3.5 w-3.5" /> Plan payment</button>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : payTab === 'Summary' ? (
        <div className="card !border-slate-300 overflow-auto flex-none lg:flex-1 lg:min-h-0 max-lg:max-h-[75dvh] shadow-sm">
          <table className="w-full text-[11px] [&_.table-cell]:!px-2 [&_.table-cell]:!py-1.5" style={{ minWidth: 1420 }}>
            <thead className="lg:sticky top-0 z-10"><tr>{['Type', 'Hotel / Service', 'Stay / Service Date', 'Supplier', 'Cost', 'Selling', 'Paid', 'Remaining', 'Markup', 'Profit', 'Confirmation', 'Cut-off', 'Status', 'Last Paid', 'Payment'].map((header, hi) => <th key={header} className={`table-header !bg-[#173567] !text-white !px-2 !py-2 !text-[9.5px] whitespace-nowrap ${hi >= 4 && hi <= 9 ? '!text-right' : ''}`}>{header}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-200 [&>tr:nth-child(even)]:bg-slate-50/70">
              {linePaymentSummaries.map((line) => {
                const lastPayment = latestPaymentForLine(line);
                return (
                <tr key={line.key} className="table-row">
                  <td className="table-cell"><span className={`inline-flex whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[9.5px] font-bold ${/hotel/i.test(line.type) ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : /transfer/i.test(line.type) ? 'border-sky-200 bg-sky-50 text-sky-700' : /ticket/i.test(line.type) ? 'border-amber-200 bg-amber-50 text-amber-700' : /sight/i.test(line.type) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>{line.type}</span></td>
                  <td className="table-cell !whitespace-normal min-w-[190px]"><div className="font-bold text-slate-800 leading-tight whitespace-normal">{line.name}</div></td>
                  <td className="table-cell !whitespace-normal min-w-[150px]"><div className="text-[10.5px] font-semibold text-slate-600 leading-tight whitespace-normal">{paymentLineDateLabel(line)}</div></td>
                  <td className="table-cell !whitespace-normal min-w-[130px]"><div className="text-slate-600 leading-tight whitespace-normal">{line.supplier}</div></td>
                  <td className="table-cell text-right tabular-nums font-bold text-slate-800">{fmtN(line.totalCost)}</td>
                  <td className="table-cell text-right tabular-nums font-bold text-blue-800">{fmtN(line.totalSelling)}</td>
                  <td className="table-cell text-right tabular-nums font-bold text-green-700">{fmtN(line.supplierPaid)}</td>
                  <td className={`table-cell text-right tabular-nums font-bold ${Number(line.supplierRemaining || 0) > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{fmtN(line.supplierRemaining)}</td>
                  <td className="table-cell text-right tabular-nums font-bold text-blue-700">{fmtN(line.plannedProfit)}</td>
                  <td className="table-cell text-right tabular-nums font-bold text-emerald-700">{fmtN(line.grossProfit)}</td>
                  <td className="table-cell text-[10.5px] font-semibold text-slate-700 whitespace-nowrap">{lastPayment?.confirmationNo || '—'}</td>
                  <td className="table-cell text-[10.5px] font-semibold text-slate-700 whitespace-nowrap">{lastPayment?.cutoffDate ? formatDate(lastPayment.cutoffDate) : '—'}</td>
                  <td className="table-cell">{lastPayment?.serviceStatus ? <span className={`inline-flex rounded-full px-2 py-0.5 text-[9.5px] font-bold ring-1 ${/confirm/i.test(lastPayment.serviceStatus) ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : /cancel/i.test(lastPayment.serviceStatus) ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>{lastPayment.serviceStatus}</span> : <span className="text-slate-400">—</span>}</td>
                  <td className="table-cell text-[10.5px] font-semibold text-slate-700 whitespace-nowrap">{lastPayment?.date ? formatDate(lastPayment.date) : '—'}</td>
                  <td className="table-cell">
                    <div className="flex flex-col gap-1">
                      {!line.supplierSettled && <button onClick={() => onRecordPayment(line)} className="whitespace-nowrap rounded-md bg-orange-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm hover:bg-orange-600">{Number(line.totalCost || 0) === 0 ? 'Settle 0 payment' : 'Pay supplier'}</button>}
                      {line.supplierSettled && <span className="inline-flex items-center whitespace-nowrap rounded-full bg-green-50 px-2 py-0.5 text-[9.5px] font-bold text-green-700 ring-1 ring-green-200">✓ Settled{line.supplierSavings > 0 ? ` · saved ${fmtN(line.supplierSavings)}` : ''}</span>}
                    </div>
                  </td>
                </tr>
              );
              })}
              {!linePaymentSummaries.length && <tr><td colSpan="15" className="table-cell text-center text-slate-400 py-8">No hotel or service payment lines are available.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
      <div className={`card !border-slate-300 overflow-hidden flex-none ${filteredPayments.length ? 'lg:flex-1' : ''} lg:min-h-0 shadow-sm`}>
        <div className="overflow-auto h-full">
          <table className="w-full [&_.table-cell]:!py-1.5 [&_.table-cell]:!px-2" style={{ minWidth: 1050 }}>
            <thead><tr>
              {['#', 'Payment Date', 'Payment Type', 'Related To', 'Supplier / Client', 'Reference No.', 'Amount (THB)', 'Payment Method', 'Attachment', 'Status', 'Remarks', 'Actions'].map(h => (
                <th key={h} className="table-header !bg-[#173567] !text-white !px-2 !py-2 !text-[9.5px] whitespace-nowrap lg:sticky top-0 z-10">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map((p, idx) => (
                <tr key={p.id || idx} className="table-row hover:bg-slate-50/70 cursor-pointer" onClick={() => setSelectedPay(p)}>
                  <td className="table-cell text-center text-slate-500 font-bold text-[10px] w-8">{idx + 1}</td>
                  <td className="table-cell"><div className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">{formatDate(p.date)}</div></td>
                  <td className="table-cell"><span className={`inline-flex whitespace-nowrap px-1.5 py-0.5 rounded-md text-[9px] font-bold ring-1 ring-black/5 ${p.typeColor}`}>{p.type}</span></td>
                  <td className="table-cell"><div className="text-[10px] text-slate-600">{p.related}</div></td>
                  <td className="table-cell"><div className="text-[11px] font-semibold text-slate-800">{p.supplier}</div></td>
                  <td className="table-cell"><span className="text-[10px] font-mono text-slate-600">{p.ref}</span></td>
                  <td className="table-cell"><div className={`text-[12px] font-extrabold ${p.amount > 0 ? 'text-slate-900' : 'text-slate-300'}`}>{p.amount > 0 ? fmtN(p.amount) : '—'}</div></td>
                  <td className="table-cell"><div className="text-[10px] text-slate-600">{p.method}</div></td>
                  <td className="table-cell">{attachmentUrl(p.attachment) ? <a href={attachmentUrl(p.attachment)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} title={attachmentName(p.attachment)} className="inline-flex max-w-[150px] items-center gap-1 rounded-md border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100"><Paperclip className="h-3 w-3 shrink-0" /><span className="truncate">{attachmentName(p.attachment)}</span></a> : <span className="text-[10px] text-slate-400">—</span>}</td>
                  <td className="table-cell">{p.status === 'Paid'
                    ? <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700 border border-green-200">Paid</span>
                    : <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-600 border border-orange-200">Pending</span>}
                  </td>
                  <td className="table-cell"><div className="text-[10px] text-slate-500">{p.remarks}</div></td>
                  <td className="table-cell" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-0">
                      <button onClick={() => setSelectedPay(p)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Eye className="w-3.5 h-3.5" /></button>
                      <button title="Open payment PDF" onClick={() => openPaymentPdf(p)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><FileText className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingPay(p)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={async () => { try { await onPersist({ payments: payments.filter((item) => item.id !== p.id) }, `Deleted payment ${p.ref || p.id}`); toast.success('Payment deleted.'); } catch (error) { toast.error(error.message); } }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredPayments.length && (
                <tr><td colSpan="12" className="p-0">
                  <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm"><CreditCard className="h-6 w-6" /></div>
                    <div className="text-sm font-extrabold text-slate-800">No {payTab === 'Client Payments' ? 'client' : 'supplier'} payments recorded yet</div>
                    <p className="max-w-md text-[11px] leading-snug text-slate-500">{payTab === 'Client Payments' ? 'Payments received from the client will appear here once recorded against the invoice.' : 'Supplier payments will appear here once recorded from the Summary tab.'}</p>
                    <button onClick={() => setEditingPay('new')} className="btn-primary h-8 gap-1.5 px-4 text-xs"><Plus className="h-3.5 w-3.5" /> Add payment</button>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <div className="mt-2 flex items-stretch justify-between flex-shrink-0 flex-wrap gap-2 pb-2">
        <div className="bg-amber-50/60 border border-slate-300 rounded-xl px-3 py-1.5 text-[10px] leading-snug text-slate-500 w-full sm:w-auto sm:max-w-xs shadow-sm">
          <div className="font-bold text-slate-600 mb-0.5">📋 Notes</div>
          Client balance payment to be received 72 hours before arrival.<br />All supplier payments as per contract terms.
        </div>
        <SummaryBar items={[
          { label: 'Total Supplier Payable', value: fmtN(suppTotal), sub: `Paid ${fmtI(suppPaid)} / Pending ${fmtI(suppTotal - suppPaid)}`, bg: 'bg-slate-50', bd: 'border-slate-200', lc: 'text-slate-500', vc: 'text-slate-900', sc: 'text-slate-400' },
          { label: 'Supplier Savings', value: fmtN(suppSavings), sub: 'Settled below quoted cost', bg: 'bg-emerald-50', bd: 'border-emerald-200', lc: 'text-emerald-600', vc: 'text-emerald-700', sc: 'text-emerald-400' },
          { label: 'Total Client Receivable', value: fmtN(clientTotal), sub: `Received ${fmtI(clientPaid)} / Left ${fmtI(clientTotal - clientPaid)}`, bg: 'bg-green-50', bd: 'border-green-200', lc: 'text-green-600', vc: 'text-green-700', sc: 'text-green-400' },
          { label: 'Discount & Credits', value: fmtN(clientInvoice.discount + clientInvoice.creditTotal), sub: `Discount ${fmtI(clientInvoice.discount)} · Credit notes ${fmtI(clientInvoice.creditTotal)}`, bg: 'bg-blue-50', bd: 'border-blue-200', lc: 'text-blue-600', vc: 'text-blue-700', sc: 'text-blue-400' },
          { label: 'Invoice Balance', value: fmtN(clientInvoice.remaining), bg: 'bg-orange-50', bd: 'border-orange-200', lc: 'text-orange-600', vc: 'text-orange-600' },
        ]} />
      </div>
    </div>
  );
}

// ─── Suppliers Tab ───────────────────────────────────────────────────────────
const DEMO_SUPPLIERS = [
  { id: 'sup1', rowNum: 1, logo: 'RAMADA', logoGrad: 'from-blue-600 to-blue-800', name: 'Rama Hospitality Co., Ltd.', type: 'Hotel', service: 'Ramada Plaza Bangkok', serviceDetail: 'Deluxe Room (2 Rooms, 4 Pax)', contact: 'Ms. Nisachol', email: 'nisachol@ramada.com', phone: '+66 2 123 4567', ref: 'RV-BK-092-01', amount: 12800, payStatus: 'Deposit Paid', paid: 8000, total: 16800, due: '05 Aug 2026', status: 'Confirmed' },
  { id: 'sup2', rowNum: 2, logo: 'PATTAYA\nTRANSFER', logoGrad: 'from-slate-600 to-slate-800', name: 'Pattaya Transfer Co., Ltd.', type: 'Transfer', service: 'Suvarnabhumi → Pattaya Hotel', serviceDetail: 'Private Van (4 Pax)', contact: 'Mr. Somchai', email: 'somchai@pattayatransfer.com', phone: '+66 8 1234 5678', ref: 'PT-092-02', amount: 2500, payStatus: 'Deposit Paid', paid: 2500, total: 2500, due: '01 Aug 2026', status: 'Confirmed' },
  { id: 'sup3', rowNum: 3, logo: 'SEA\nSTAR', logoGrad: 'from-cyan-600 to-blue-700', name: 'Sea Star Marine Co., Ltd.', type: 'Sightseeing', service: 'Coral Island (Koh Larn)', serviceDetail: 'Speedboat with Lunch (4 Pax)', contact: 'Mr. Anan', email: 'booking@seastarmarine.com', phone: '+66 8 7654 3210', ref: 'SS-092-03', amount: 3000, payStatus: 'Paid', paid: 12000, total: 12000, due: '02 Aug 2026', status: 'Confirmed' },
  { id: 'sup4', rowNum: 4, logo: 'ALCAZAR', logoGrad: 'from-purple-600 to-pink-700', name: 'Alcazar Show Co., Ltd.', type: 'Sightseeing', service: 'Alcazar Cabaret Show', serviceDetail: 'Deluxe Seat (4 Pax)', contact: 'Ms. Rungnapa', email: 'rungnapa@alcazarshow.com', phone: '+66 8 9876 5432', ref: 'ALC-092-04', amount: 2400, payStatus: 'Deposit Paid', paid: 4800, total: 9600, due: '10 Aug 2026', status: 'Confirmed' },
  { id: 'sup5', rowNum: 5, logo: 'SAFFRON', logoGrad: 'from-amber-500 to-orange-600', name: 'Saffron Cruise Co., Ltd.', type: 'Restaurant', service: 'Saffron Dinner Cruise', serviceDetail: 'International Buffet (4 Pax)', contact: 'Mr. Pravit', email: 'sales@saffroncruise.com', phone: '+66 2 111 2222', ref: 'SAF-092-05', amount: 3200, payStatus: 'Pending', paid: 0, total: 16000, due: '12 Aug 2026', status: 'Confirmed' },
  { id: 'sup6', rowNum: 6, logo: 'BANGKOK\nGUIDE', logoGrad: 'from-green-600 to-emerald-700', name: 'Bangkok Guide Services', type: 'Others', service: 'Bangkok City Tour', serviceDetail: 'Guide + Lunch (4 Pax)', contact: 'Mr. Kritsada', email: 'guide@bangkokguide.com', phone: '+66 8 1122 3344', ref: 'BG-092-06', amount: 2800, payStatus: 'Pending', paid: 0, total: 16000, due: '12 Aug 2026', status: 'Confirmed' },
];

const SUP_FILTERS = ['All', 'Hotels', 'Transfer', 'Sightseeing', 'Restaurant', 'Yacht', 'Flight', 'Others'];
const SUP_TYPE_MAP = { Hotels: 'Hotel' };

const supplierMasterFor = (service, masters) => {
  const supplier = service?.supplier;
  const ids = [
    service?.supplierId, service?.supplierMasterId, service?.supplier?._id,
    service?.supplier?.id,
  ].filter(Boolean).map(String);
  const byId = masters.find((item) => ids.includes(String(item?.id)) || ids.includes(String(item?._id)));
  if (byId) return byId;
  const name = normalisedServiceName((typeof supplier === 'object' ? supplier?.name : supplier) || service?.supplierName);
  return masters.find((item) => normalisedServiceName(item?.name) === name);
};

function SupplierAvatar({ supplier, className = 'w-12 h-12', iconClassName = 'w-6 h-6' }) {
  const [failed, setFailed] = useState(false);
  const Icon = SVC_ICONS[supplier.type === 'Hotel' ? 'Hotels' : supplier.type] || Package;
  return (
    <div className={`${className} rounded-md bg-gradient-to-br ${supplier.logoGrad} flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden`}>
      {supplier.imageUrl && !failed
        ? <img src={supplier.imageUrl} alt={supplier.name} className="w-full h-full object-cover" onError={() => setFailed(true)} />
        : <Icon className={`${iconClassName} text-white opacity-90`} />}
    </div>
  );
}

function SuppliersTab({ booking, supplierMasters = [] }) {
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  // The supplier tab must read the same allocation ledger as Payments. The
  // service's legacy `paid` field is only a fallback for records created
  // before allocations existed, so it cannot be the source of truth here.
  const paymentLineByItem = new Map(bookingPaymentLines(booking).map((line) => [line.item, line]));
  const suppliers = [...(booking?.hotels || []), ...(booking?.services || []).filter(item => item.type !== 'Hotel')].map((service, index) => {
    const supplierName = service.yachtSupplier || service.transferVehicleSupplier || service.vehicleSupplierName || (typeof service.supplier === 'object' ? service.supplier?.name : service.supplier) || service.supplierName || 'Unassigned';
    const master = supplierMasterFor({ ...service, supplier: supplierName, supplierName }, supplierMasters);
    const paymentLine = paymentLineByItem.get(service);
    const payment = paymentLine ? linePaymentState(booking, paymentLine) : null;
    const paid = payment ? payment.supplierPaid : Number(service.paid || 0);
    const total = paymentLine ? paymentLine.totalCost : Number(service.totalSupplierCost || service.supplierCost || 0);
    const payStatus = payment
      ? (payment.supplierSettled ? 'Paid' : paid > 0 ? 'Deposit Paid' : 'Pending')
      : (service.payStatus || service.paymentStatus || 'Pending');
    return { id: service.id || `supplier-${index}`, rowNum: index + 1, logoGrad: service.type === 'Hotel' ? 'from-blue-600 to-blue-800' : 'from-purple-600 to-pink-700', imageUrl: attachmentUrl([master?.image, master?.supplierImage, service?.supplierImage]), name: master?.name || supplierName, type: service.type || 'Hotel', service: service.name || service.hotel || '—', serviceDetail: service.variantName || service.roomType || service.basis || '', contact: master?.contactPerson || master?.contact || '—', email: master?.email || '—', phone: master?.phone || '—', ref: service.supplierReference || service.reference || '—', amount: total, payStatus, paid, total, due: paymentLine?.dueDate || service.due || service.dueDate || '—', status: service.status || 'Confirmed' };
  });
  const counts = SUP_FILTERS.reduce((a, t) => { a[t] = t === 'All' ? suppliers.length : suppliers.filter(s => s.type === (SUP_TYPE_MAP[t] || t)).length; return a; }, {});
  const filtered = filter === 'All' ? suppliers : suppliers.filter(s => s.type === (SUP_TYPE_MAP[filter] || filter));
  const exportSuppliers = () => {
    if (!filtered.length) return toast.error('No suppliers to export.');
    downloadExcelTable({
      filename: `${booking?.id || 'booking'}-suppliers`,
      head: ['#', 'Supplier', 'Type', 'Service', 'Details', 'Contact', 'Email', 'Phone', 'Reference', 'Total Cost', 'Paid', 'Pending', 'Payment Status', 'Due Date', 'Status'],
      rows: filtered.map((x, i) => [i + 1, x.name, x.type, x.service, x.serviceDetail, x.contact, x.email, x.phone, x.ref, Number(x.total || 0), Number(x.paid || 0), Math.max(0, Number(x.total || 0) - Number(x.paid || 0)), x.payStatus, x.due && x.due !== '—' ? formatDate(x.due) : '', x.status]),
    });
    toast.success('Suppliers exported.');
  };
  const totalAmt = filtered.reduce((s, x) => s + (x.amount || 0), 0);
  const totalPaid = filtered.reduce((s, x) => s + (x.paid || 0), 0);
  const totalPending = filtered.reduce((s, x) => s + Math.max(0, (x.total || 0) - (x.paid || 0)), 0);
  const confirmed = filtered.filter(s => s.status === 'Confirmed').length;

  const SupViewModal = ({ sup }) => {
    const ok = sup.payStatus === 'Paid', dep = sup.payStatus === 'Deposit Paid';
    const tones = ['bg-indigo-100 text-indigo-600', 'bg-violet-100 text-violet-600', 'bg-emerald-100 text-emerald-600', 'bg-cyan-100 text-cyan-600', 'bg-rose-100 text-rose-600', 'bg-amber-100 text-amber-600', 'bg-blue-100 text-blue-600'];
    return (
    <div className="modal-overlay" onClick={() => setSelected(null)}>
      <div className="modal-content !max-w-2xl w-[calc(100vw-1rem)] sm:w-full p-0 overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="relative flex-shrink-0 bg-gradient-to-r from-blue-50 via-white to-indigo-50 border-b border-slate-200 px-4 py-3.5 flex items-center gap-3.5">
          <SupplierAvatar supplier={sup} className="w-16 h-16" iconClassName="w-7 h-7" />
          <div className="flex-1 min-w-0">
            <div className="mb-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">Supplier Details</div>
            <div className="text-base font-extrabold leading-tight text-slate-900 break-words">{sup.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5"><TypeBadge type={sup.type} /><span className={`inline-flex rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${ok ? 'border-green-200 bg-green-100 text-green-700' : dep ? 'border-orange-200 bg-orange-100 text-orange-600' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>{sup.payStatus}</span></div>
          </div>
          <button onClick={() => setSelected(null)} className="grid h-8 w-8 place-items-center self-start rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-3 shadow-sm">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-white shadow"><DollarSign className="h-4 w-4" /></span>
              <div><div className="text-[9px] font-bold uppercase tracking-wide text-blue-600">Amount (THB)</div><div className="text-lg font-black leading-tight text-blue-900">{fmtN(sup.amount)}</div></div>
            </div>
            <div className={`flex items-center gap-3 rounded-xl border p-3 shadow-sm ${ok ? 'border-green-200 bg-gradient-to-br from-green-50 to-white' : dep ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-white' : 'border-slate-300 bg-gradient-to-br from-slate-50 to-white'}`}>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white shadow ${ok ? 'bg-green-600' : dep ? 'bg-orange-500' : 'bg-slate-500'}`}><CreditCard className="h-4 w-4" /></span>
              <div><div className={`text-[9px] font-bold uppercase tracking-wide ${ok ? 'text-green-600' : dep ? 'text-orange-600' : 'text-slate-500'}`}>Paid / Total</div><div className={`text-lg font-black leading-tight ${ok ? 'text-green-800' : dep ? 'text-orange-700' : 'text-slate-700'}`}>{fmtI(sup.paid)} / {fmtI(sup.total)}</div></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              [Package, 'Service', sup.service, true],
              [Info, 'Details', sup.serviceDetail, true],
              [User, 'Contact Person', sup.contact, false],
              [Phone, 'Phone', sup.phone, false],
              [Mail, 'Email', sup.email, true],
              [Hash, 'Booking Ref.', sup.ref || '—', false],
              [Calendar, 'Due Date', formatDate(sup.due, sup.due), false],
            ].map(([Ic, label, val, wide], idx) => (
              <div key={label} className={`flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm ${wide ? 'col-span-2' : ''}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tones[idx % tones.length]}`}><Ic className="w-4 h-4" /></span>
                <div className="min-w-0"><div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</div><div className="text-[12px] font-bold leading-snug text-slate-800 break-words">{val || '—'}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-200 px-4 py-3 flex gap-2 bg-slate-50 flex-shrink-0">
          <button onClick={() => { setSelected(null); setEditingSupplier(sup); }} className="btn-primary flex-1 h-9 px-6 text-xs justify-center gap-1.5"><Edit className="w-3.5 h-3.5" /> Edit</button>
          <button onClick={() => setSelected(null)} className="btn-secondary h-9 px-6 text-xs justify-center">Close</button>
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto lg:overflow-visible">
      {selected && <SupViewModal sup={selected} />}
      
      {/* Editing Supplier Modal/Form Overlay */}
      {editingSupplier && (() => {
        const isNew = editingSupplier === 'new';
        const es = isNew ? {} : editingSupplier;
        const lbl = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500';
        const inp = 'form-input !h-9 text-xs font-semibold';
        const Section = ({ icon: Ic, title, tone }) => <div className="col-span-full flex items-center gap-2 pt-1"><span className={`grid h-6 w-6 place-items-center rounded-md ${tone}`}><Ic className="h-3.5 w-3.5" /></span><span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-700">{title}</span><span className="h-px flex-1 bg-slate-200" /></div>;
        return (
        <div className="modal-overlay z-50" onClick={() => setEditingSupplier(null)}>
          <div className="modal-content !max-w-3xl w-[calc(100vw-1rem)] sm:w-full p-0 overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-50 via-white to-indigo-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md flex items-center justify-center flex-shrink-0"><Package className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-extrabold text-slate-900">{isNew ? 'Add New Supplier' : 'Edit Supplier'}</div>
                <div className="truncate text-[11px] font-medium text-slate-500">{isNew ? 'Enter supplier details' : `Update details for ${es.name}`}</div>
              </div>
              <button onClick={() => setEditingSupplier(null)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={e => { e.preventDefault(); setEditingSupplier(null); toast.success('Supplier saved!'); }} className="flex min-h-0 flex-1 flex-col">
              <div className="grid min-h-0 flex-1 grid-cols-2 sm:grid-cols-6 gap-x-3 gap-y-3 overflow-y-auto p-4">
                <Section icon={Package} title="Supplier" tone="bg-blue-100 text-blue-600" />
                <div className="col-span-2 sm:col-span-4"><label className={lbl}>Supplier Name</label><input type="text" defaultValue={es.name || ''} className={inp} placeholder="e.g. Rama Hospitality Co., Ltd." autoFocus /></div>
                <div className="col-span-2 sm:col-span-2"><label className={lbl}>Type</label>
                  <select defaultValue={es.type || 'Hotel'} className="form-select !h-9 text-xs font-semibold text-slate-700"><option>Hotel</option><option>Transfer</option><option>Sightseeing</option><option>Restaurant</option><option>Others</option></select>
                </div>
                <div className="col-span-2 sm:col-span-3"><label className={lbl}>Service Name</label><input type="text" defaultValue={es.service || ''} className={inp} placeholder="e.g. Ramada Plaza Bangkok" /></div>
                <div className="col-span-2 sm:col-span-3"><label className={lbl}>Service Details</label><input type="text" defaultValue={es.serviceDetail || ''} className={inp} placeholder="e.g. Deluxe Room (2 Rooms, 4 Pax)" /></div>

                <Section icon={User} title="Contact" tone="bg-violet-100 text-violet-600" />
                <div className="col-span-1 sm:col-span-2"><label className={lbl}>Contact Person</label><input type="text" defaultValue={es.contact || ''} className={inp} placeholder="Name" /></div>
                <div className="col-span-1 sm:col-span-2"><label className={lbl}>Phone</label><input type="text" defaultValue={es.phone || ''} className={inp} placeholder="Phone Number" /></div>
                <div className="col-span-2 sm:col-span-2"><label className={lbl}>Email</label><input type="email" defaultValue={es.email || ''} className={`${inp} !text-blue-600`} placeholder="Email Address" /></div>

                <Section icon={DollarSign} title="Financials & Terms" tone="bg-emerald-100 text-emerald-600" />
                <div className="col-span-2 sm:col-span-2 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-3 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Amount (THB)</label>
                  <input type="number" defaultValue={es.amount ?? ''} className="mt-0.5 w-full border-0 bg-transparent p-0 text-lg font-extrabold text-blue-900 outline-none focus:ring-0" placeholder="0.00" />
                </div>
                <div className="col-span-1 sm:col-span-2"><label className={lbl}>Booking Ref.</label><input type="text" defaultValue={es.ref || ''} className={inp} placeholder="Reference No." /></div>
                <div className="col-span-1 sm:col-span-2"><label className={lbl}>Due Date</label><input type="text" defaultValue={es.due || ''} className={inp} placeholder="e.g. 05 Aug 2026" /></div>
              </div>

              <div className="flex flex-none items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-4 py-3">
                <button type="button" onClick={() => setEditingSupplier(null)} className="btn-secondary h-9 px-6 text-xs">Cancel</button>
                <button type="submit" className="btn-primary h-9 min-w-[150px] justify-center gap-1.5 text-xs"><CheckCircle className="w-4 h-4" /> Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      <div className="mb-2.5 flex flex-shrink-0 flex-wrap items-center gap-x-3 gap-y-2 lg:flex-nowrap">
        <div className="order-1 flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md"><Package className="h-4 w-4" /></span>
          <h2 className="whitespace-nowrap text-[15px] font-extrabold text-slate-800">Suppliers <span className="ml-0.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-blue-600">{suppliers.length}</span></h2>
        </div>
        <div className="order-3 -mx-1 flex w-full min-w-0 items-center gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:order-2 lg:mx-0 lg:w-auto lg:flex-1 lg:px-0">
          {SUP_FILTERS.map(t => {
            const Icon = SVC_ICONS[t];
            const active = filter === t;
            return (
              <button key={t} onClick={() => setFilter(t)}
                className={`flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[11px] font-bold transition-all ${active ? 'border-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25' : 'border-slate-300 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'}`}>
                {Icon && <Icon className="h-3.5 w-3.5" />}{t}
                <span className={`grid min-w-[18px] place-items-center rounded-full px-1 text-[10px] leading-[18px] ${active ? 'bg-white/25 text-white' : counts[t] ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400'}`}>{counts[t]}</span>
              </button>
            );
          })}
        </div>
        <div className="order-2 ml-auto flex shrink-0 gap-1.5 lg:order-3 lg:ml-0">
          <button title="Export" onClick={exportSuppliers} className="btn-secondary h-8 px-2.5 text-xs gap-1.5"><Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Export</span></button>
          <button onClick={() => setEditingSupplier('new')} className="btn-primary h-8 px-3 text-xs gap-1.5 shadow-md shadow-blue-500/20"><Plus className="w-3.5 h-3.5" /> <span className="hidden min-[400px]:inline">Add Supplier</span><span className="min-[400px]:hidden">Add</span></button>
        </div>
      </div>

      <div className="card overflow-hidden flex-none lg:flex-1 lg:min-h-0">
        <div className="overflow-auto h-full">
          <div className="md:hidden p-2 space-y-2">
            {filtered.map(s => (
              <div key={s.id} onClick={() => setSelected(s)} className="rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-50">
                <div className="flex items-start gap-2.5">
                  <SupplierAvatar supplier={s} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 leading-snug break-words">{s.name}</div>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap"><TypeBadge type={s.type} /><ConfBadge /></div>
                  </div>
                  <div onClick={e => e.stopPropagation()} className="shrink-0"><ActBtns onView={() => setSelected(s)} onEdit={() => setEditingSupplier(s)} onDelete={() => toast('Delete')} /></div>
                </div>
                <div className="mt-2.5 text-[11px] text-slate-600">
                  <div className="font-semibold text-slate-800 break-words">{s.service}{s.serviceDetail ? <span className="font-normal text-slate-500"> · {s.serviceDetail}</span> : null}</div>
                </div>
                <div className="mt-2 grid grid-cols-2 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-slate-50/70 text-center">
                  <div className="py-1.5 px-1"><div className="text-[9px] uppercase tracking-wide text-slate-400">Amount (THB)</div><div className="text-[13px] font-extrabold text-slate-900">{fmtN(s.amount)}</div></div>
                  <div className="py-1.5 px-1"><div className="text-[9px] uppercase tracking-wide text-slate-400">Due</div><div className="text-[12px] font-bold text-slate-800">{formatDate(s.due, s.due)}</div></div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[9px] uppercase tracking-wide text-slate-400 shrink-0">Payment</span>
                  <div className="min-w-0 flex-1 flex justify-end"><PayBadge status={s.payStatus} paid={s.paid} total={s.total} due={null} /></div>
                </div>
                {(s.contact || s.email || s.phone || s.ref) && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-0.5 text-[11px]">
                    {s.contact && <span className="inline-flex items-center gap-1.5 text-slate-700"><User className="w-3 h-3 text-slate-400 shrink-0" />{s.contact}{s.ref ? <span className="ml-auto font-mono text-[10px] text-slate-500">{s.ref}</span> : null}</span>}
                    {s.email && <a href={`mailto:${s.email}`} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1.5 text-blue-600 break-all"><Mail className="w-3 h-3 shrink-0" />{s.email}</a>}
                    {s.phone && <a href={`tel:${s.phone}`} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1.5 text-slate-600"><Phone className="w-3 h-3 text-slate-400 shrink-0" />{s.phone}</a>}
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && <div className="py-10 text-center text-xs text-slate-400">No suppliers found</div>}
          </div>
          <table className="w-full hidden md:table" style={{ minWidth: 1060 }}>
            <thead><tr>
              {['#', 'Supplier / Type', 'Service', 'Contact Person', 'Email / Phone', 'Booking Ref.', 'Amount (THB)', 'Payment Status', 'Due Date', 'Status', 'Actions'].map(h => (
                <th key={h} className="table-header whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => (
                <tr key={s.id} className="table-row hover:bg-blue-50/20 cursor-pointer" onClick={() => setSelected(s)}>
                  <td className="table-cell text-center text-slate-400 text-[10px] w-8">{s.rowNum}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <SupplierAvatar supplier={s} />
                      <div>
                        <div className="text-[11px] font-bold text-slate-900 leading-snug">{s.name}</div>
                        <div className="mt-0.5"><TypeBadge type={s.type} /></div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-[11px] font-semibold text-slate-800">{s.service}</div>
                    <div className="text-[10px] text-slate-400">{s.serviceDetail}</div>
                  </td>
                  <td className="table-cell"><div className="text-[11px] font-semibold text-slate-700">{s.contact}</div></td>
                  <td className="table-cell">
                    <div className="text-[10px] text-blue-600 font-medium">{s.email}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{s.phone}</div>
                  </td>
                  <td className="table-cell"><span className="text-[10px] font-mono font-semibold text-slate-700">{s.ref}</span></td>
                  <td className="table-cell"><div className="text-[13px] font-extrabold text-slate-900">{fmtN(s.amount)}</div></td>
                  <td className="table-cell p-1"><PayBadge status={s.payStatus} paid={s.paid} total={s.total} due={null} /></td>
                  <td className="table-cell"><div className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">{formatDate(s.due, s.due)}</div></td>
                  <td className="table-cell"><ConfBadge /></td>
                  <td className="table-cell" onClick={e => e.stopPropagation()}><ActBtns onView={() => setSelected(s)} onEdit={() => setEditingSupplier(s)} onDelete={() => toast('Delete')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
        <div className="text-[11px] font-semibold text-slate-500">Total | {filtered.length} Suppliers</div>
        <SummaryBar items={[
          { label: 'Total Amount (THB)', value: fmtN(totalAmt), bg: 'bg-slate-50', bd: 'border-slate-200', lc: 'text-slate-500', vc: 'text-slate-900' },
          { label: 'Total Paid (THB)', value: fmtN(totalPaid), bg: 'bg-green-50', bd: 'border-green-200', lc: 'text-green-600', vc: 'text-green-700' },
          { label: 'Total Pending (THB)', value: fmtN(totalPending), bg: 'bg-orange-50', bd: 'border-orange-200', lc: 'text-orange-600', vc: 'text-orange-600' },
          { label: 'Suppliers Confirmed', value: `${confirmed} / ${filtered.length}`, bg: 'bg-blue-50', bd: 'border-blue-200', lc: 'text-blue-600', vc: 'text-blue-700' },
        ]} />
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { bookings, hotels, suppliers, updateBooking, fetchRecord } = useApp();
  const [activeTab, setActiveTab] = useState('Overview');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentType, setPaymentType] = useState('Supplier Payment');
  const [paymentLineId, setPaymentLineId] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => todayIsoInTimeZone());
  const [paymentBank, setPaymentBank] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [paymentAttachment, setPaymentAttachment] = useState(null);
  const [paymentApprovalStatus, setPaymentApprovalStatus] = useState('Confirmed');
  const [settleSupplierBalance, setSettleSupplierBalance] = useState(false);
  const [paymentSupplier, setPaymentSupplier] = useState('');
  const [paymentSupplierId, setPaymentSupplierId] = useState('');
  const [paymentConfirmationNo, setPaymentConfirmationNo] = useState('');
  const [paymentCutoffDate, setPaymentCutoffDate] = useState('');
  const [paymentServiceStatus, setPaymentServiceStatus] = useState('Confirmed');
  const [paymentAdultCost, setPaymentAdultCost] = useState('0');
  const [paymentChildCost, setPaymentChildCost] = useState('0');
  const [paymentInfantCost, setPaymentInfantCost] = useState('0');
  const [paymentGuideCost, setPaymentGuideCost] = useState('0');
  const [paymentVehicleCost, setPaymentVehicleCost] = useState('0');
  const [paymentTaxAmount, setPaymentTaxAmount] = useState('0');
  const [banks, setBanks] = useState([]);
  const [serviceMasters, setServiceMasters] = useState([]);
  const [showVoucherOptions, setShowVoucherOptions] = useState(false);
  const [fetchedBooking, setFetchedBooking] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(true);
  const contextBooking = bookings.find(b => b.id === id);
  const booking = fetchedBooking?.id === id ? fetchedBooking : contextBooking;

  useEffect(() => {
    const requestedTab = new URLSearchParams(location.search).get('tab');
    if (TABS.includes(requestedTab)) setActiveTab(requestedTab);
  }, [location.search]);

  useEffect(() => {
    let active = true;
    setFetchedBooking(null);
    setBookingLoading(true);
    fetchRecord('bookings', id)
      .then((record) => { if (active) setFetchedBooking(record); })
      .catch(() => {})
      .finally(() => { if (active) setBookingLoading(false); });
    return () => { active = false; };
  }, [id, fetchRecord]);

  useEffect(() => {
    let active = true;
    Promise.all([apiClient.get('/sightseeing-module'), apiClient.get('/activity-masters/restaurants'), apiClient.get('/operations-masters/transfers'), apiClient.get('/yachts')])
      .then(([sightseeing, restaurants, transfers, yachts]) => { if (active) setServiceMasters([...(sightseeing.data || []), ...(restaurants.data || []), ...(transfers.data || []), ...(yachts.data || [])]); })
      .catch(() => { if (active) setServiceMasters([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    apiClient.get('/finance-masters/banks?activeOnly=true').then((response) => { if (active) setBanks((response.data || []).filter((bank) => bank.status === 'Active')); }).catch(() => { if (active) setBanks([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const missingDatedYachts = (booking?.services || []).filter((service) => service?.type === 'Yacht' && !inputDateValue(service.serviceDate || service.date));
    if (!booking?.quotationId || !missingDatedYachts.length) return () => { active = false; };

    apiClient.get(`/quotations/${encodeURIComponent(booking.quotationId)}`).then((response) => {
      if (!active) return;
      const quotationServices = (response.data?.days || []).flatMap((day) => (day.services || []).map((service) => ({ ...service, quotationDate: inputDateValue(day.date || service.serviceDate || service.date) })));
      let repaired = false;
      const services = (booking.services || []).map((service) => {
        if (service?.type !== 'Yacht' || inputDateValue(service.serviceDate || service.date)) return service;
        const source = quotationServices.find((candidate) => String(candidate.id || '') === String(service.id || ''))
          || quotationServices.find((candidate) => String(candidate.yachtId || '') === String(service.yachtId || '') && String(candidate.name || '').trim().toLowerCase() === String(service.name || '').trim().toLowerCase());
        if (!source?.quotationDate) return service;
        repaired = true;
        return { ...service, serviceDate: source.quotationDate };
      });
      if (!repaired) return;
      return updateBooking(id, {
        ...booking,
        services,
        activityLog: [{ date: new Date().toISOString(), action: 'Restored Yacht service date from linked quotation', user: 'System' }, ...(booking.activityLog || [])],
      }).then((saved) => { if (active) setFetchedBooking(saved); });
    }).catch(() => {});
    return () => { active = false; };
  }, [booking, id, updateBooking]);

  if (!booking) {
    if (bookingLoading) return <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">Loading booking…</div>;
    return (
      <div className="p-10 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><Package className="w-8 h-8 text-slate-400" /></div>
        <p className="text-slate-500 font-semibold">Booking not found</p>
        <button onClick={() => navigate('/app/bookings')} className="btn-primary mt-4 mx-auto">← Back to Bookings</button>
      </div>
    );
  }

  const profitMargin = booking.totalSelling > 0 ? ((booking.profit / booking.totalSelling) * 100).toFixed(1) : 0;
  const paidPercent = booking.totalSelling > 0 ? Math.min(100, Math.round((booking.paidAmount / booking.totalSelling) * 100)) : 0;
  const paymentLines = bookingPaymentLines(booking);
  const clientInvoice = bookingInvoicePaymentState(booking);
  // Keep the progress line in sync with the payment ledger.  Historical
  // bookings may have an outdated `progress.paid` flag even after every client
  // invoice and supplier payable has been settled.
  const paymentSettled = clientInvoice.remaining <= 0
    && paymentLines.every((line) => linePaymentState(booking, line).supplierSettled);
  const automaticProgress = {
    travel: ['Traveling', 'Completed'].includes(booking.status),
    completed: booking.status === 'Completed',
    paid: paymentSettled,
  };
  const progressDone = (key) => Boolean(booking.progress?.[key] || automaticProgress[key]);
  const quotationMarkup = Number(booking.totalSelling || 0) - Number(booking.totalCost || 0);
  const quotationMarkupPercent = Number(booking.totalCost || 0) > 0 ? (quotationMarkup / Number(booking.totalCost || 0)) * 100 : 0;
  const voucherGuests = booking.vouchers?.combined?.guests || booking.voucher?.guests || [];
  const bookingGuests = (Array.isArray(booking.guests) && booking.guests.length ? booking.guests : voucherGuests).length
    ? (Array.isArray(booking.guests) && booking.guests.length ? booking.guests : voucherGuests)
    : [{ name: booking.guestName || 'Guest', phone: booking.guestPhone, email: booking.guestEmail, isLeader: true }];

  const persistBooking = async (patch, action) => {
    const next = { ...booking, ...patch };
    const lines = [...(next.hotels || []), ...(next.services || []).filter(service => service.type !== 'Hotel')];
    const recalculatedCost = lines.reduce((sum, line) => sum + Number(line.totalSupplierCost || line.supplierCost || line.cost || 0), 0);
    const recalculatedSelling = lines.reduce((sum, line) => sum + Number(line.totalSellingPrice || line.sellingPrice || line.selling || 0), 0);
    const servicesChanged = Object.hasOwn(patch, 'hotels') || Object.hasOwn(patch, 'services');
    const totalCost = servicesChanged ? recalculatedCost : Number(next.totalCost || recalculatedCost);
    // The client amount is the accepted quotation amount. Updating operational
    // service details must not overwrite that agreed amount with supplier-line
    // totals; quotation revisions are the only commercial-price change path.
    const totalSelling = Number(next.totalSelling || recalculatedSelling);
    const clientPaid = (next.payments || []).filter(payment => ['Client Payment', 'Receivable'].includes(payment.type) && payment.status === 'Paid').reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    // A supplier line explicitly finalised below its quoted cost is settled at
    // the agreed amount; its unused balance is realised booking profit.
    const nextPaymentLines = bookingPaymentLines(next);
    const effectiveSupplierCost = nextPaymentLines.length ? nextPaymentLines.reduce((sum, line) => sum + Number(linePaymentState(next, line).effectiveSupplierCost || 0), 0) : totalCost;
    const profit = totalSelling - effectiveSupplierCost;
    const adjustedInvoice = bookingInvoicePaymentState({ ...next, totalSelling });
    const saved = await updateBooking(id, { ...next, totalCost, totalSelling, profit, margin: totalSelling ? Number(((profit / totalSelling) * 100).toFixed(2)) : 0, paidAmount: clientPaid, balanceDue: adjustedInvoice.remaining, paymentStatus: clientPaid >= adjustedInvoice.total && adjustedInvoice.total > 0 ? 'Paid' : clientPaid > 0 ? 'Advance Paid' : 'Pending', activityLog: [{ date: new Date().toISOString(), action, user: 'Admin' }, ...(booking.activityLog || [])] });
    setFetchedBooking(saved);
    return saved;
  };

  const handleAddPayment = async () => {
    const isClientPayment = paymentType === 'Client Payment';
    const amount = Number(paymentAmount);
    const line = isClientPayment ? null : paymentLines.find((item) => item.key === paymentLineId);
    if (!isClientPayment && !line) { toast.error('Choose the hotel or service this payment belongs to.'); return; }
    // Saving a zero supplier payment is an explicit settlement action. It is
    // valid for both a zero-payable service and a supplier waiver; no extra
    // checkbox should be required merely because the amount is 0.
    const willSettleSupplierBalance = !isClientPayment && (settleSupplierBalance || amount === 0);
    const isZeroSupplierSettlement = !isClientPayment && paymentAmount !== '' && amount === 0;
    if (paymentAmount === '' || !Number.isFinite(amount) || amount < 0 || (amount === 0 && !isZeroSupplierSettlement)) {
      toast.error(isClientPayment ? 'Enter a payment amount greater than zero.' : 'Enter a valid supplier payment amount.');
      return;
    }
    const paymentState = line ? linePaymentState(booking, line) : null;
    const remaining = isClientPayment ? clientInvoice.remaining : paymentState.supplierRemaining;
    if (amount > remaining) { toast.error(`Payment exceeds the remaining ${isClientPayment ? 'booking invoice' : 'supplier payable'} amount.`); return; }
    const reference = `PAY-${Date.now()}`;
    let attachment = null;
    try {
      if (paymentAttachment) {
        const formData = new FormData();
        formData.append('paymentAttachment', paymentAttachment);
        attachment = (await apiClient.upload('/uploads?folder=payments', formData)).data?.[0] || null;
      }
    } catch (error) { toast.error(`Attachment upload failed: ${error.message}`); return; }
    const payment = {
      id: `pay${Date.now()}`,
      date: paymentDate || todayIsoInTimeZone(),
      amount,
      method: paymentMethod,
      reference,
      ref: reference,
      type: paymentType,
      related: isClientPayment ? 'Booking Invoice' : `${line.type} · ${line.name}`,
      supplier: isClientPayment ? booking.guestName || 'Client' : paymentSupplier.trim() || line.supplier,
      supplierId: isClientPayment ? '' : selectedSupplierMaster?.id || selectedSupplierMaster?._id || paymentSupplierId || line.supplierId || '',
      status: 'Paid',
      approvalStatus: paymentApprovalStatus,
      bankName: paymentMethod === 'Cash' ? '' : paymentBank,
      supplierBankDetails: isClientPayment ? null : (selectedSupplierMaster?.bankDetails || selectedSupplierLine?.item?.supplierBankDetails || null),
      remarks: paymentRemarks.trim(),
      attachment,
      confirmationNo: isClientPayment ? '' : paymentConfirmationNo.trim(),
      cutoffDate: isClientPayment ? '' : paymentCutoffDate,
      serviceStatus: isClientPayment ? '' : paymentServiceStatus,
      costBreakdown: isClientPayment ? null : {
        adultCount: Number(line.item?.adults ?? booking.adults ?? 0),
        childCount: Number(line.item?.children ?? booking.children ?? 0),
        infantCount: Number(line.item?.infants ?? booking.infants ?? 0),
        adultCost: Number(paymentAdultCost || 0), childCost: Number(paymentChildCost || 0), infantCost: Number(paymentInfantCost || 0),
        guideCost: Number(paymentGuideCost || 0), vehicleCost: Number(paymentVehicleCost || 0), taxAmount: Number(paymentTaxAmount || 0),
      },
      allocations: isClientPayment ? [] : [{ lineId: line.key, lineType: line.type, lineName: line.name, amount, settleSupplierBalance: willSettleSupplierBalance }],
    };
    const operationalSupplierOverride = !isClientPayment && canOverrideSupplierForPaymentLine(line)
      ? { supplier: payment.supplier, supplierId: payment.supplierId, changedAt: new Date().toISOString(), changedBy: 'Operations' }
      : null;
    if (operationalSupplierOverride) payment.operationalSupplierOverride = operationalSupplierOverride;
    try {
      // Confirmation details and any operational supplier change belong to the
      // booked item too. Updating the booking snapshot makes Payments,
      // Services/Transfers and Suppliers agree, while the originating
      // quotation remains untouched.
      const syncedLine = (item, kind, index) => {
        const standardMatch = paymentLineKey(kind, item, index) === line?.key;
        const sightseeingTransferMatch = kind === 'service'
          && line?.component === 'transfer'
          && paymentLineKey('sightseeing-transfer', item, index) === line?.key;
        const sightseeingTicketMatch = kind === 'service'
          && line?.component === 'ticket'
          && paymentLineKey('sightseeing-ticket', item, index) === line?.key;
        if (!standardMatch && !sightseeingTransferMatch && !sightseeingTicketMatch) return item;

        const common = {
          ...item,
          confirmationNo: payment.confirmationNo || item.confirmationNo || '',
          cutoffDate: payment.cutoffDate || item.cutoffDate || '',
          status: payment.serviceStatus || item.status || '',
        };
        if (!operationalSupplierOverride) return { ...common, supplier: payment.supplier || item.supplier };
        if (sightseeingTransferMatch) {
          return {
            ...common,
            transferVehicleSupplier: payment.supplier,
            transferVehicleSupplierId: payment.supplierId || '',
            vehicleSupplierName: payment.supplier,
            vehicleSupplierId: payment.supplierId || '',
          };
        }
        if (standardMatch && String(item.type || '').toLowerCase() === 'yacht') {
          return {
            ...common,
            supplier: payment.supplier,
            supplierName: payment.supplier,
            supplierId: payment.supplierId || '',
            yachtSupplier: payment.supplier,
            yachtSupplierId: payment.supplierId || '',
          };
        }
        return {
          ...common,
          supplier: payment.supplier,
          supplierName: payment.supplier,
          supplierId: payment.supplierId || '',
        };
      };
      // A voucher is a saved operational snapshot. Keep that snapshot in
      // sync with the confirmed booking line so Operations never has to enter
      // the supplier confirmation number a second time in the voucher.
      const voucherItemMatchesPaymentLine = (item, kind) => {
        if (!item || kind !== line?.kind) return false;
        const source = line.item || {};
        if (source.id && item.id) return String(source.id) === String(item.id);
        if (String(source.name || source.hotel || '').trim() !== String(item.name || item.hotel || '').trim()) return false;
        if (kind === 'hotel') {
          return String(source.checkIn || '').slice(0, 10) === String(item.checkIn || '').slice(0, 10)
            && String(source.checkOut || '').slice(0, 10) === String(item.checkOut || '').slice(0, 10);
        }
        return String(source.serviceDate || source.date || '').slice(0, 10) === String(item.serviceDate || item.date || '').slice(0, 10)
          && String(source.type || '') === String(item.type || '');
      };
      const syncVoucherConfirmation = (voucher) => {
        if (!voucher || typeof voucher !== 'object') return voucher;
        const syncRows = (rows, kind) => (Array.isArray(rows) ? rows.map((item) => (
          voucherItemMatchesPaymentLine(item, kind)
            ? {
                ...item,
                confirmationNo: payment.confirmationNo || item.confirmationNo || '',
                cutoffDate: payment.cutoffDate || item.cutoffDate || '',
                status: payment.serviceStatus || item.status || '',
              }
            : item
        )) : rows);
        return {
          ...voucher,
          hotels: syncRows(voucher.hotels, 'hotel'),
          services: syncRows(voucher.services, 'service'),
        };
      };
      const paymentPatch = {
        payments: [...(booking.payments || []), payment],
        ...(isClientPayment ? {} : {
          hotels: (booking.hotels || []).map((item, index) => syncedLine(item, 'hotel', index)),
          services: (booking.services || []).map((item, index) => syncedLine(item, 'service', index)),
          vouchers: Object.fromEntries(Object.entries(booking.vouchers || {}).map(([type, voucher]) => [type, syncVoucherConfirmation(voucher)])),
          voucher: syncVoucherConfirmation(booking.voucher),
          ...(operationalSupplierOverride ? { supplierOverrides: { ...(booking.supplierOverrides || {}), [line.key]: operationalSupplierOverride } } : {}),
        }),
      };
      await persistBooking(paymentPatch, `Recorded ${paymentType.toLowerCase()} for ${isClientPayment ? 'booking invoice' : line.name}`);
      toast.success(isClientPayment ? 'Client invoice payment recorded.' : willSettleSupplierBalance ? `Supplier settlement recorded; ${fmtN(Math.max(0, remaining - amount))} is now profit.` : `Payment allocated to ${line.name}.`); setShowPaymentForm(false); setPaymentAmount(''); setPaymentLineId(''); setPaymentRemarks(''); setPaymentBank(''); setPaymentAttachment(null); setSettleSupplierBalance(false); setPaymentSupplier(''); setPaymentSupplierId(''); setPaymentConfirmationNo(''); setPaymentCutoffDate('');
    } catch (err) { toast.error(err.message); }
  };

  const openLinePayment = (line) => {
    setPaymentLineId(line.key);
    setPaymentType('Supplier Payment');
    setPaymentAmount(String(line.supplierRemaining ?? ''));
    const item = line.item || {};
    const namedSupplier = suppliers.find((supplier) => supplierKey(supplier?.name || supplier?.supplierName) === supplierKey(line.supplier));
    const supplierId = namedSupplier?.id || namedSupplier?._id || line.supplierId || '';
    const timing = supplierPaymentTiming(booking, line);
    setPaymentDate(timing.paymentDate || todayIsoInTimeZone()); setPaymentRemarks(''); setPaymentBank(''); setPaymentAttachment(null); setSettleSupplierBalance(false); setPaymentApprovalStatus('Confirmed'); setPaymentSupplier(line.supplier || ''); setPaymentSupplierId(supplierId); setPaymentConfirmationNo(item.confirmationNo || item.supplierReference || ''); setPaymentCutoffDate(timing.cutOffDate); setPaymentServiceStatus(item.status || 'Confirmed');
    const isSightseeingTransferPayment = line.component === 'transfer';
    setPaymentAdultCost(String(isSightseeingTransferPayment ? 0 : (item.adultTicketCost ?? item.adultCost ?? item.supplierAdultCost ?? 0))); setPaymentChildCost(String(isSightseeingTransferPayment ? 0 : (item.childTicketCost ?? item.childCost ?? item.supplierChildCost ?? 0))); setPaymentInfantCost(String(isSightseeingTransferPayment ? 0 : (item.infantTicketCost ?? item.infantCost ?? item.supplierInfantCost ?? 0))); setPaymentGuideCost(String(item.guideCost ?? 0)); setPaymentVehicleCost(String(isSightseeingTransferPayment ? line.totalCost : (item.vehicleCost ?? item.transferVehicleCost ?? 0))); setPaymentTaxAmount(String(item.taxAmount ?? item.tax ?? 0));
    setShowPaymentForm(true);
  };

  const selectedSupplierLine = paymentLines.find((line) => line.key === paymentLineId);
  const selectedSupplierPayment = selectedSupplierLine ? linePaymentState(booking, selectedSupplierLine) : null;
  const canOverrideSelectedSupplier = canOverrideSupplierForPaymentLine(selectedSupplierLine);
  const isSightseeingTicketPayment = selectedSupplierLine?.component === 'ticket'
    && /sightseeing/i.test(String(selectedSupplierLine?.type || ''));
  // Operational supplier changes are persisted only on this booking. A ticket
  // can use one of the suppliers linked to its Sightseeing Master; a transfer
  // can use an active transfer supplier. Neither change edits the quotation.
  const supplierNames = [...new Set([
    selectedSupplierLine?.supplier,
    selectedSupplierLine?.item?.supplier,
    selectedSupplierLine?.item?.supplierName,
    selectedSupplierLine?.item?.transferVehicleSupplier,
    selectedSupplierLine?.item?.vehicleSupplierName,
  ].filter(Boolean))];
  const supplierKey = (value) => String(value || '').trim().toLowerCase();
  const transferSupplierMasters = suppliers.filter((supplier) => {
    if (String(supplier?.status || '').toLowerCase() === 'inactive') return false;
    const types = Array.isArray(supplier?.type) ? supplier.type : [supplier?.type];
    return types.some((type) => /transfer|vehicle/i.test(String(type || '')));
  });
  const selectedSightseeingMaster = isSightseeingTicketPayment
    ? serviceMasterFor(selectedSupplierLine?.item, serviceMasters)
    : null;
  const isYachtPayment = /yacht/i.test(String(selectedSupplierLine?.type || ''));
  const selectedYachtMaster = isYachtPayment
    ? serviceMasterFor(selectedSupplierLine?.item, serviceMasters)
    : null;
  const sightseeingSupplierMasters = [...new Map(
    [
      ...(Array.isArray(selectedSightseeingMaster?.suppliers) ? selectedSightseeingMaster.suppliers : []),
      selectedSightseeingMaster?.supplier,
    ].filter(Boolean).map((masterSupplier) => {
      const masterSupplierId = masterSupplier?.id || masterSupplier?._id || masterSupplier;
      const matchingSupplier = suppliers.find((supplier) => supplierKey(supplier?.id || supplier?._id) === supplierKey(masterSupplierId));
      const resolvedSupplier = matchingSupplier || (typeof masterSupplier === 'object' ? masterSupplier : null);
      return [supplierKey(resolvedSupplier?.id || resolvedSupplier?._id || resolvedSupplier?.name || resolvedSupplier?.supplierName), resolvedSupplier];
    }).filter(([, supplier]) => supplier && String(supplier.status || '').toLowerCase() !== 'inactive')
  ).values()];
  const yachtSupplierIds = new Set((selectedYachtMaster?.supplierIds || []).map((id) => supplierKey(id)));
  const yachtSupplierMasters = suppliers.filter((supplier) => yachtSupplierIds.has(supplierKey(supplier?.id || supplier?._id)) && String(supplier?.status || '').toLowerCase() !== 'inactive');
  const operationalSupplierMasters = isSightseeingTicketPayment ? sightseeingSupplierMasters : isYachtPayment ? yachtSupplierMasters : transferSupplierMasters;
  const selectedSupplierName = paymentSupplier || selectedSupplierLine?.supplier;
  const selectedSupplierMaster = operationalSupplierMasters.find((supplier) => supplierKey(supplier?.name || supplier?.supplierName) === supplierKey(selectedSupplierName))
    || operationalSupplierMasters.find((supplier) => supplierKey(supplier?.id || supplier?._id) === supplierKey(paymentSupplierId || selectedSupplierLine?.supplierId || selectedSupplierLine?.item?.supplierId || selectedSupplierLine?.item?.transferVehicleSupplierId))
    || suppliers.find((supplier) => supplierKey(supplier?.name || supplier?.supplierName) === supplierKey(selectedSupplierName))
    || suppliers.find((supplier) => supplierKey(supplier?.id || supplier?._id) === supplierKey(paymentSupplierId || selectedSupplierLine?.supplierId || selectedSupplierLine?.item?.supplierId || selectedSupplierLine?.item?.transferVehicleSupplierId));
  const selectedSupplierBankDetails = selectedSupplierMaster?.bankDetails || selectedSupplierLine?.item?.supplierBankDetails || {};
  const supplierBankRows = [
    ['Account name', selectedSupplierBankDetails.accountName],
    ['Account number', selectedSupplierBankDetails.accountNumber],
    ['Bank', selectedSupplierBankDetails.bankName],
    ['Branch', selectedSupplierBankDetails.branch],
    ['IFSC / IBAN', selectedSupplierBankDetails.ifscCode || selectedSupplierBankDetails.iban || selectedSupplierBankDetails.ibnCode],
    ['SWIFT', selectedSupplierBankDetails.swiftCode],
  ].filter(([, value]) => value);
  const selectSupplierPaymentLine = (lineId) => {
    setPaymentLineId(lineId);
    const line = paymentLines.find((item) => item.key === lineId);
    if (!line) return;
    const item = line.item || {};
    const namedSupplier = suppliers.find((supplier) => supplierKey(supplier?.name || supplier?.supplierName) === supplierKey(line.supplier));
    const supplierId = namedSupplier?.id || namedSupplier?._id || line.supplierId || '';
    const timing = supplierPaymentTiming(booking, line);
    setPaymentSupplier(line.supplier || '');
    setPaymentSupplierId(supplierId);
    setPaymentConfirmationNo(item.confirmationNo || item.supplierReference || '');
    setPaymentCutoffDate(timing.cutOffDate);
    setPaymentDate(timing.paymentDate || todayIsoInTimeZone());
    setPaymentServiceStatus(item.status || 'Confirmed');
    const isSightseeingTransferPayment = line.component === 'transfer';
    setPaymentAdultCost(String(isSightseeingTransferPayment ? 0 : (item.adultTicketCost ?? item.adultCost ?? item.supplierAdultCost ?? 0)));
    setPaymentChildCost(String(isSightseeingTransferPayment ? 0 : (item.childTicketCost ?? item.childCost ?? item.supplierChildCost ?? 0)));
    setPaymentInfantCost(String(isSightseeingTransferPayment ? 0 : (item.infantTicketCost ?? item.infantCost ?? item.supplierInfantCost ?? 0)));
    setPaymentGuideCost(String(item.guideCost ?? 0));
    setPaymentVehicleCost(String(isSightseeingTransferPayment ? line.totalCost : (item.vehicleCost ?? item.transferVehicleCost ?? 0)));
    setPaymentTaxAmount(String(item.taxAmount ?? item.tax ?? 0));
  };
  const supplierCostEstimate = selectedSupplierLine ? (
    Number(selectedSupplierLine.item?.adults ?? booking.adults ?? 0) * Number(paymentAdultCost || 0)
    + Number(selectedSupplierLine.item?.children ?? booking.children ?? 0) * Number(paymentChildCost || 0)
    + Number(selectedSupplierLine.item?.infants ?? booking.infants ?? 0) * Number(paymentInfantCost || 0)
    + Number(paymentGuideCost || 0) + Number(paymentVehicleCost || 0) + Number(paymentTaxAmount || 0)
  ) : 0;

  return (
    <div className="flex flex-col h-full" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-4 pt-2 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <button onClick={() => navigate('/app/bookings')} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold text-slate-900 leading-none">{booking.id}</h1>
                <StatusBadge status={booking.status} />
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">{booking.agentName} • {booking.guestName} • {booking.destination}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setShowVoucherOptions(true)} title="Create voucher" className="btn-secondary h-8 px-2.5 sm:px-3 text-xs gap-1.5"><FileText className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Create voucher</span></button>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center pb-1.5">
          {progressSteps.map((step, i) => {
            const done = progressDone(step.key);
            return (
              <React.Fragment key={step.key}>
                <div className={`flex items-center gap-1 text-[10px] font-bold ${done ? 'text-green-600' : 'text-slate-300'}`}>
                  {done ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <Circle className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span className="hidden sm:inline whitespace-nowrap">{step.label}</span>
                </div>
                {i < progressSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1.5 min-w-3 rounded-full ${done && progressDone(progressSteps[i + 1]?.key) ? 'bg-green-400' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex items-center overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-2 px-3 shrink-0 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {showVoucherOptions && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 backdrop-blur-[4px] p-4" onMouseDown={() => setShowVoucherOptions(false)}>
        <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
          <div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-base font-extrabold text-slate-900">Choose voucher type</h2><p className="mt-1 text-xs text-slate-500">Create a full booking voucher or a separate voucher for one service group.</p></div><button onClick={() => setShowVoucherOptions(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[['combined', 'Full / Combined Voucher', 'All booking services, flights, hotels and itinerary', FileText], ['hotel', 'Hotel Voucher', 'Only hotel stays and saved voucher terms', Hotel], ['sightseeing', 'Sightseeing Voucher', 'Only sightseeing services and saved voucher terms', Compass], ['transfer', 'Transfer Voucher', 'Only transfers and saved voucher terms', Car], ['other', 'Other Service Voucher', 'Meals, yachts, ferries, guides and other services', Package]].map(([type, title, description, Icon]) => <button key={type} onClick={() => navigate(`/bookings/${id}/create-voucher?type=${type}`)} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-400 hover:bg-blue-50"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-700"><Icon className="h-4 w-4" /></span><span><span className="block text-sm font-bold text-slate-800">{title}</span><span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">{description}</span></span></button>)}
          </div>
        </div>
      </div>}

      {/* Payment Modal */}
      {showPaymentForm && (
        <div className="modal-overlay" onClick={() => setShowPaymentForm(false)}>
          <div className="modal-content !max-w-6xl w-[96vw] max-h-[calc(100dvh-1rem)] overflow-hidden p-0 flex flex-col rounded-2xl border border-slate-200 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="relative border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-orange-50/60 px-5 pt-4 pb-3">
              <button type="button" onClick={() => setShowPaymentForm(false)} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X className="h-4 w-4" /></button>
              <div className="mb-3 flex items-center gap-3 pr-10">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-md ${paymentType === 'Client Payment' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-orange-400 to-red-500'}`}><CreditCard className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-extrabold text-slate-900">{paymentType === 'Client Payment' ? 'Record Client Invoice Payment' : 'Record Supplier Payment'}</h3>
                  <p className="text-[11px] text-slate-500">{paymentType === 'Client Payment' ? `Record a part payment against the full booking invoice. Remaining: ${fmtN(clientInvoice.remaining)} THB.` : 'Allocate this supplier payment to one hotel or service for accurate outstanding balances.'}</p>
                </div>
              </div>
            <div className="grid grid-cols-1 min-[480px]:grid-cols-3 gap-2.5">
              {(paymentType === 'Client Payment'
                ? [
                    ['Invoice total', clientInvoice.total, 'bg-blue-50 border-blue-200 text-blue-800', 'bg-blue-600', DollarSign],
                    ['Already received', clientInvoice.paid, 'bg-emerald-50 border-emerald-200 text-emerald-800', 'bg-emerald-500', CheckCircle],
                    ['Left to receive', clientInvoice.remaining, 'bg-orange-50 border-orange-200 text-orange-800', 'bg-orange-500', Clock],
                  ]
                : [
                    ['Supplier payable', selectedSupplierLine?.totalCost || 0, 'bg-blue-50 border-blue-200 text-blue-800', 'bg-blue-600', DollarSign],
                    ['Already paid', selectedSupplierPayment?.supplierPaid || 0, 'bg-emerald-50 border-emerald-200 text-emerald-800', 'bg-emerald-500', CheckCircle],
                    ['Pending supplier', selectedSupplierPayment?.supplierRemaining || 0, 'bg-orange-50 border-orange-200 text-orange-800', 'bg-orange-500', Clock],
                  ]
              ).map(([label, value, color, tile, Icon]) => <div key={label} className={`flex items-center gap-3 rounded-xl border px-3 py-2 shadow-sm ${color}`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white shadow ${tile}`}><Icon className="h-4 w-4" /></span><div className="min-w-0"><div className="text-[9.5px] font-bold uppercase tracking-wide opacity-70">{label}</div><div className="truncate text-base font-extrabold leading-tight">{fmtN(value)} THB</div></div></div>)}
            </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [&_.form-input]:!h-9 [&_.form-select]:!h-9 [&_.form-label]:!mb-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
              <div><label className="form-label">Payment Type</label><div className={`form-input flex h-9 items-center text-sm font-semibold ${paymentType === 'Client Payment' ? 'bg-blue-50 text-blue-800' : 'bg-orange-50 text-orange-800'}`}>{paymentType}</div></div>
              {paymentType === 'Supplier Payment' ? <div><label className="form-label">Apply To</label><select value={paymentLineId} onChange={e => selectSupplierPaymentLine(e.target.value)} className="form-select"><option value="">Select hotel or service</option>{paymentLines.map(line => <option key={line.key} value={line.key}>{line.type} · {line.name} · {paymentLineDateLabel(line)}</option>)}</select></div> : <div><label className="form-label">Invoice</label><div className="form-input flex h-9 items-center bg-slate-50 text-sm font-semibold text-slate-700">Booking Invoice · {fmtN(clientInvoice.total)} THB</div></div>}
              {paymentType === 'Supplier Payment' && <><div><label className="form-label">Supplier</label><select value={canOverrideSelectedSupplier ? paymentSupplierId : paymentSupplier} onChange={e => { if (!canOverrideSelectedSupplier) { setPaymentSupplier(e.target.value); return; } const supplier = operationalSupplierMasters.find(item => supplierKey(item.id || item._id) === supplierKey(e.target.value)); setPaymentSupplierId(e.target.value); setPaymentSupplier(supplier?.name || supplier?.supplierName || ''); }} className="form-select"><option value="">Select supplier</option>{canOverrideSelectedSupplier ? <>{paymentSupplier && !operationalSupplierMasters.some(supplier => supplierKey(supplier.id || supplier._id) === supplierKey(paymentSupplierId)) && <option value={paymentSupplierId || ''} disabled>{paymentSupplier}</option>}{operationalSupplierMasters.map(supplier => <option key={supplier.id || supplier._id} value={supplier.id || supplier._id}>{supplier.name || supplier.supplierName}</option>)}</> : supplierNames.map(name => <option key={name} value={name}>{name}</option>)}</select>{canOverrideSelectedSupplier && <p className="mt-1 text-[10px] text-blue-600">{isSightseeingTicketPayment ? `Only active suppliers linked in ${selectedSightseeingMaster?.name || 'this Sightseeing Master'} can be selected. The change updates this booking’s Services, Suppliers, Payments and reporting; the master and quotation stay unchanged.` : isYachtPayment ? `Only active suppliers linked in ${selectedYachtMaster?.name || 'this Yacht Master'} can be selected. The change updates this booking only; the Yacht Master and original quotation stay unchanged.` : 'Changing a transfer supplier updates this booking’s Services, Transfers and Suppliers views. The original quotation stays unchanged.'}</p>}</div><div><label className="form-label">Confirmation No.</label><input value={paymentConfirmationNo} onChange={e => setPaymentConfirmationNo(e.target.value)} className="form-input" placeholder="Supplier confirmation number" /></div><div><label className="form-label">Cut-off Date</label><input type="date" value={paymentCutoffDate} onChange={e => setPaymentCutoffDate(e.target.value)} className="form-input" /></div><div><label className="form-label">Service Status</label><select value={paymentServiceStatus} onChange={e => setPaymentServiceStatus(e.target.value)} className="form-select"><option>Confirmed</option><option>Pending</option><option>On Hold</option><option>Cancelled</option></select></div><div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3"><div className="text-[10px] font-extrabold uppercase tracking-wide text-blue-700">Supplier bank details</div>{supplierBankRows.length ? <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-[11px] text-slate-700">{supplierBankRows.map(([label, value]) => <div key={label}><span className="font-semibold text-slate-500">{label}: </span><span>{value}</span></div>)}</div> : <p className="mt-1 text-[11px] text-slate-500">No bank details are saved for this supplier in Supplier Master.</p>}</div></>}
              <div><label className="form-label">Payment Date</label><input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="form-input" /></div>
              <div><label className="form-label">Amount (THB)</label><input type="number" min="0" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="form-input" placeholder="0" /></div>
              <div><label className="form-label">Method</label>
                <select value={paymentMethod} onChange={e => { const method = e.target.value; setPaymentMethod(method); if (method === 'Cash') setPaymentBank(''); }} className="form-select">
                  {['Bank Transfer', 'Cash', 'Card', 'Other'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              {paymentMethod !== 'Cash' && <div><label className="form-label">BuildSoftware payment bank</label><select value={paymentBank} onChange={e => setPaymentBank(e.target.value)} className="form-select"><option value="">Select payment bank (optional)</option>{banks.filter((bank) => bank.status === 'Active').map(bank => <option key={bank.id} value={bank.name}>{bank.name}</option>)}</select></div>}
              <div><label className="form-label">Approval</label><select value={paymentApprovalStatus} onChange={e => setPaymentApprovalStatus(e.target.value)} className="form-select"><option>Confirmed</option><option>Pending</option></select></div>
              <div><span className="form-label">Attachment</span>
                <label className={`flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-xs transition-colors ${paymentAttachment ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-dashed border-slate-300 bg-white text-slate-500 hover:border-blue-400 hover:bg-blue-50/40'}`}>
                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-semibold" title={paymentAttachment?.name || ''}>{paymentAttachment ? paymentAttachment.name : 'Choose image or PDF'}</span>
                  {paymentAttachment ? <span className="shrink-0 text-[10px] opacity-70">{Math.max(1, Math.round(paymentAttachment.size / 1024))} KB</span> : <span className="shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">Browse</span>}
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setPaymentAttachment(e.target.files?.[0] || null)} />
                </label>
                {paymentAttachment && <button type="button" onClick={() => setPaymentAttachment(null)} className="mt-1 text-[10px] font-bold text-red-500 hover:underline">Remove file</button>}
              </div>
              {paymentType === 'Supplier Payment' && <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-slate-300 bg-gradient-to-br from-slate-50 to-white p-3.5 shadow-sm"><div className="mb-2 flex items-center justify-between"><div><div className="text-[11px] font-extrabold text-slate-800">Supplier cost breakdown</div><div className="text-[10px] text-slate-500">Saved on the payment voucher for audit and supplier reconciliation.</div></div><div className="text-right"><div className="text-[9px] font-bold uppercase text-slate-400">Calculated cost</div><div className="text-sm font-extrabold text-slate-800">{fmtN(supplierCostEstimate)} THB</div></div></div><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2"><label><span className="form-label">Adult cost × {Number(selectedSupplierLine?.item?.adults ?? booking.adults ?? 0)}</span><input type="number" min="0" value={paymentAdultCost} onChange={e => setPaymentAdultCost(e.target.value)} className="form-input" /></label><label><span className="form-label">Child cost × {Number(selectedSupplierLine?.item?.children ?? booking.children ?? 0)}</span><input type="number" min="0" value={paymentChildCost} onChange={e => setPaymentChildCost(e.target.value)} className="form-input" /></label><label><span className="form-label">Infant cost × {Number(selectedSupplierLine?.item?.infants ?? booking.infants ?? 0)}</span><input type="number" min="0" value={paymentInfantCost} onChange={e => setPaymentInfantCost(e.target.value)} className="form-input" /></label><label><span className="form-label">Guide cost</span><input type="number" min="0" value={paymentGuideCost} onChange={e => setPaymentGuideCost(e.target.value)} className="form-input" /></label><label><span className="form-label">Vehicle cost</span><input type="number" min="0" value={paymentVehicleCost} onChange={e => setPaymentVehicleCost(e.target.value)} className="form-input" /></label><label><span className="form-label">Tax amount</span><input type="number" min="0" value={paymentTaxAmount} onChange={e => setPaymentTaxAmount(e.target.value)} className="form-input" /></label></div></div>}
              <label className="sm:col-span-2 lg:col-span-3"><span className="form-label">Remarks</span><textarea value={paymentRemarks} onChange={e => setPaymentRemarks(e.target.value)} className="form-input !h-auto min-h-[56px]" placeholder="Optional payment note or transaction details" /></label>
              {paymentType === 'Supplier Payment' && <label className="sm:col-span-2 lg:col-span-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"><input type="checkbox" checked={settleSupplierBalance} onChange={e => setSettleSupplierBalance(e.target.checked)} className="mt-0.5" /><span><b>Mark supplier as fully settled.</b> Use this when the agreed payment is lower than the quoted supplier cost. Entering 0 also records an explicit zero settlement automatically.</span></label>}
            </div>
            </div>
            <div className="flex flex-none justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button onClick={() => setShowPaymentForm(false)} className="btn-secondary h-9 px-6 text-xs justify-center min-w-[100px]">Cancel</button>
              <button onClick={handleAddPayment} className="btn-primary h-9 px-6 text-xs justify-center gap-1.5 min-w-[130px]"><CheckCircle className="h-3.5 w-3.5" /> Save Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 p-2 sm:p-3 bg-slate-50 flex flex-col" style={{ minHeight: 0, overflow: 'hidden' }}>
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 h-full overflow-auto">
            {/* Left Column */}
            <div className="space-y-4">
              
              {/* Booking Information */}
              <div className="bg-white rounded-2xl border border-slate-300 overflow-hidden relative shadow-sm">
                {/* Banner Background Placeholder */}
                <div className="absolute top-0 right-0 w-2/3 h-24 bg-gradient-to-l from-blue-100/60 to-white/0 pointer-events-none" />
                
                <div className="p-5">
                  <div className="flex items-start justify-between relative z-10 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-[15px] font-extrabold text-slate-800">Booking Information</h3>
                        <p className="text-[11px] text-slate-500 font-medium">Complete details of this confirmed booking</p>
                      </div>
                    </div>
                    <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                      <Calendar className="w-3.5 h-3.5" /> Traveling in 6 days
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 relative z-10">
                    {[
                      { label: 'Booking ID', value: booking.id, icon: FileText, color: 'text-slate-600', bg: 'bg-slate-100' },
                      { label: 'Quotation ID', value: booking.quotationId || '—', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-100', href: booking.quotationId ? `/quotations/${encodeURIComponent(booking.quotationId)}` : '' },
                      { label: 'Query ID', value: booking.queryId || '—', icon: Search, color: 'text-cyan-600', bg: 'bg-cyan-100' },
                      { label: 'Agent', value: booking.agentName, icon: User, color: 'text-emerald-600', bg: 'bg-emerald-100' },
                      { label: 'Guest', value: booking.guestName, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
                      
                      { label: 'Destination', value: booking.destination, icon: MapPin, color: 'text-rose-600', bg: 'bg-rose-100' },
                      { label: 'Arrival', value: formatDate(booking.arrivalDate), icon: Plane, color: 'text-blue-500', bg: 'bg-blue-50' },
                      { label: 'Departure', value: formatDate(booking.departureDate), icon: Plane, color: 'text-orange-500', bg: 'bg-orange-50' },
                      { label: 'Currency', value: booking.currency, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
                      { label: 'Adults', value: booking.adults, icon: User, color: 'text-slate-600', bg: 'bg-slate-100' },

                      { label: 'Children', value: booking.children, icon: User, color: 'text-purple-500', bg: 'bg-purple-50' },
                      { label: 'Arr. Flight', value: booking.arrivalFlight || '—', icon: Plane, color: 'text-sky-500', bg: 'bg-sky-50' },
                      { label: 'Dep. Flight', value: booking.departureFlight || '—', icon: Plane, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                      { label: 'Arr. Time', value: booking.arrivalTime || '—', icon: Clock, color: 'text-purple-500', bg: 'bg-purple-50' },
                      { label: 'Sales Person', value: booking.salesPerson, icon: User, color: 'text-blue-700', bg: 'bg-blue-100' },
                    ].map((item, idx) => (
                      <div key={idx} onClick={item.href ? () => navigate(item.href) : undefined} role={item.href ? 'button' : undefined} tabIndex={item.href ? 0 : undefined} onKeyDown={item.href ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(item.href); } } : undefined} className={`bg-slate-50 p-2.5 rounded-xl border border-slate-300 shadow-sm flex items-center gap-2.5 hover:bg-white hover:border-blue-300 transition-colors ${item.href ? 'cursor-pointer hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300' : ''}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${item.bg} ${item.color}`}>
                          <item.icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{item.label}</div>
                          <div className="text-[11px] font-extrabold text-slate-800 truncate" title={item.value}>{item.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Guest information stays attached to the booking snapshot and is
                  shown here without changing the voucher guest workflow. */}
              <div className="bg-white rounded-2xl border border-slate-300 overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700"><Users className="h-5 w-5" /></div>
                  <div><h3 className="text-[15px] font-extrabold text-slate-800">Guest Details</h3><p className="text-[11px] font-medium text-slate-500">Guest information attached to this booking</p></div>
                </div>
                <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr>{['Guest', 'Contact', 'Passport', 'Date of birth', 'Nationality'].map((label) => <th key={label} className="table-header">{label}</th>)}</tr></thead><tbody>{bookingGuests.map((guest, index) => <tr key={guest.id || `${guest.name || 'guest'}-${index}`} className="table-row"><td className="table-cell"><div className="font-semibold text-slate-800">{guest.name || '—'}{guest.isLeader && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">Leader</span>}</div><div className="text-[10px] text-slate-400">{guest.type || (index < Number(booking.adults || 0) ? 'Adult' : 'Guest')}</div></td><td className="table-cell"><div>{guest.phone || '—'}</div><div className="text-[10px] text-blue-600">{guest.email || '—'}</div></td><td className="table-cell">{guest.passport || guest.passportNo || '—'}</td><td className="table-cell">{formatDate(guest.dob || guest.dateOfBirth, '—')}</td><td className="table-cell">{guest.nationality || '—'}</td></tr>)}</tbody></table></div>
              </div>

              {/* Financial Summary */}
              <div className="bg-white rounded-2xl border border-slate-300 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                      <BarChart2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-extrabold text-slate-800">Financial Summary</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Key financial information for this booking</p>
                    </div>
                  </div>

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Total Selling', value: fmtN(booking.totalSelling), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-600', lightBg: 'bg-blue-50/50', border: 'border-blue-100' },
                    { label: 'Quotation Markup', value: fmtN(quotationMarkup), icon: Percent, color: 'text-indigo-600', bg: 'bg-indigo-500', lightBg: 'bg-indigo-50/50', border: 'border-indigo-100', badge: `${quotationMarkupPercent.toFixed(1)}%` },
                    { label: 'Actual Gross Profit', value: fmtN(booking.profit), icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-500', lightBg: 'bg-emerald-50/50', border: 'border-emerald-100', badge: `${profitMargin}%` },
                    { label: 'Balance Due', value: fmtN(booking.balanceDue), icon: CreditCard, color: 'text-red-600', bg: 'bg-red-500', lightBg: 'bg-red-50/50', border: 'border-red-100' },
                  ].map((c, i) => (
                    <div key={i} className={`rounded-xl border ${c.border} ${c.lightBg} p-3.5 flex flex-col justify-center relative overflow-hidden group`}>
                      <div className="flex items-center gap-3 relative z-10">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${c.bg} shadow-sm flex-shrink-0`}><c.icon className="w-4 h-4" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <div className="text-[10px] font-bold text-slate-500 uppercase">{c.label}</div>
                            {c.badge && <div className="bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-extrabold text-emerald-700 border border-emerald-200/50">{c.badge}</div>}
                          </div>
                          <div className="text-[15px] font-black text-slate-800 mt-0.5">{c.value}</div>
                        </div>
                      </div>
                      <div className="absolute right-0 bottom-0 w-24 h-12 opacity-10 pointer-events-none" style={{ background: `linear-gradient(to top right, transparent, ${c.color.replace('text-', '')})`, filter: 'blur(15px)' }} />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase mb-2">
                  <span>Payment Progress</span>
                  <span className={paidPercent === 100 ? 'text-green-600' : 'text-slate-500'}>{paidPercent}% ({fmtN(booking.paidAmount)} of {fmtN(booking.totalSelling)})</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                  <div className="bg-blue-600 h-full rounded-full transition-all relative" style={{ width: `${paidPercent}%` }}>
                    <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              
              {/* Supplier Payables */}
              <div className="bg-white rounded-2xl border border-slate-300 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <h3 className="text-[14px] font-extrabold text-slate-800">Supplier Payables</h3>
                  </div>
                  <span className="bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold">{(booking.payables || []).length}</span>
                </div>
                
                {(booking.payables || []).length > 0 ? (
                  <div className="space-y-2.5">
                    {(booking.payables || []).map(p => (
                      <div key={p.id} className="p-3 border border-slate-100 bg-slate-50/50 rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-colors">
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="text-[11px] font-bold text-slate-800 truncate pr-2">{p.supplier}</div>
                          <div className="text-[12px] font-extrabold text-slate-900">{fmtN(p.balance)}</div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-[9px] font-semibold text-slate-400">{formatDate(p.dueDate)}</div>
                          <StatusBadge status={p.status} size="xs" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 mb-2 opacity-60 flex items-center justify-center relative">
                      <FileText className="w-10 h-10 text-blue-300 absolute" />
                      <div className="w-5 h-5 rounded-full bg-blue-600 absolute bottom-1 right-1 flex items-center justify-center text-white border-2 border-slate-50"><DollarSign className="w-3 h-3" /></div>
                    </div>
                    <div className="text-[12px] font-extrabold text-slate-800">No payables yet.</div>
                    <div className="text-[10px] text-slate-400 mt-1 max-w-[180px] leading-tight font-medium">Supplier payable details will appear here once services are added.</div>
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl border border-slate-300 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                      <Activity className="w-4 h-4" />
                    </div>
                    <h3 className="text-[14px] font-extrabold text-slate-800">Recent Activity</h3>
                  </div>

                </div>
                
                <div className="space-y-4">
                  {(booking.activityLog || []).slice(-5).reverse().map((log, i) => {
                    const isSystem = log.user === 'System' || log.action.includes('synchronize');
                    return (
                      <div key={i} className="flex gap-3 relative group">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${isSystem ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                          {isSystem ? <RefreshCw className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-slate-800 leading-snug">{log.action}</div>
                          <div className="text-[9px] font-medium text-slate-400 mt-0.5">{formatDate(log.date)} • {log.user}</div>
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 flex-shrink-0 pt-0.5">
                          {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                  {!booking.activityLog?.length && <div className="text-[11px] text-slate-400 text-center py-4 font-semibold">No activity yet.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Hotels' && <HotelsTab booking={booking} hotelMasters={hotels} onPersist={persistBooking} />}
        {activeTab === 'Services' && <ServicesTab booking={booking} serviceMasters={serviceMasters} supplierMasters={suppliers} onPersist={persistBooking} />}
        {activeTab === 'Suppliers' && <SuppliersTab booking={booking} supplierMasters={suppliers} />}
        {activeTab === 'Payments' && <PaymentsTab booking={booking} onRecordPayment={openLinePayment} onPersist={persistBooking} />}
        {activeTab === 'Activity Log' && (
          <div className="h-full overflow-hidden flex flex-col">
            <div className="card flex-1 overflow-auto p-0 relative">
              <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-100 p-4 z-20 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800">Booking Activity History</h2>
                  <p className="text-[10px] font-semibold text-slate-400">Complete audit trail of all actions</p>
                </div>
                <div className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                  {(booking.activityLog || []).length} Records
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-0 relative before:absolute before:inset-y-0 before:left-[19px] before:w-0.5 before:bg-slate-100">
                  {(booking.activityLog || []).map((log, i) => {
                    const isNew = i === 0;
                    return (
                      <div key={i} className="flex gap-4 relative py-3 group">
                        <div className={`w-10 h-10 rounded-full border-4 border-white flex items-center justify-center flex-shrink-0 z-10 shadow-sm transition-transform group-hover:scale-110 ${isNew ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                          <Activity className="w-4 h-4" />
                        </div>
                        <div className={`flex-1 rounded-xl p-3 border transition-colors ${isNew ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-100 group-hover:border-slate-200 group-hover:bg-slate-50'}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className={`text-xs font-bold ${isNew ? 'text-blue-900' : 'text-slate-800'}`}>{log.action}</div>
                              <div className="text-[10px] font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                                <User className="w-3 h-3 text-slate-400" /> {log.user}
                              </div>
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm flex items-center gap-1 flex-shrink-0">
                              <Calendar className="w-3 h-3 text-slate-400" /> {formatDate(log.date)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!booking.activityLog?.length && (
                    <div className="text-center py-10">
                      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                        <Activity className="w-5 h-5 text-slate-300" />
                      </div>
                      <div className="text-xs font-bold text-slate-500">No activity yet</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
