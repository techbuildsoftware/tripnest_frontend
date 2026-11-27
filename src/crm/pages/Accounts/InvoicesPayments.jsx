import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Search, Filter, Download, Eye, Edit3, Copy, Trash2,
  FileText, CheckCircle, Clock, AlertCircle, TrendingUp,
  Send, X, ChevronDown, ChevronUp, Printer, Mail, MessageCircle,
  CreditCard, History, RefreshCw, MoreVertical, Calendar,
  Building2, User, DollarSign, Percent, PlusCircle, Minus,
  Receipt, FileCheck, AlertTriangle, XCircle, ArrowRight,
  ChevronRight, BarChart2, Wallet, Loader2, SlidersHorizontal,
  MapPin, Phone, Globe, Plane, Hotel, Camera, Ship, Users, Bed, Tag, Luggage, Landmark,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api';
import { CLIENT_PAYMENT_SCOPES, bookingClientPaymentScopes, bookingInvoicePaymentState, bookingPaymentLines, normaliseClientPaymentScope } from '../../lib/bookingPayments';
import { printPdfDocument } from '../../lib/directPdfDownload';
import LogoImg from '../../assets/logo-color.png';
import DateInput from '../../components/ui/DateInput';
import MiniBars from '../../components/ui/MiniBars';
import WhatsAppSendDialog from '../../components/WhatsAppSendDialog';

// ─── Mock Data ──────────────────────────────────────────────────────────────

// Accounts currently has one live, client-facing invoice ledger: the booking
// invoice. Proforma and Manual entry points intentionally open this same flow.
const INVOICE_TYPES = ['All Types', 'Booking'];
const STATUSES = ['All Status', 'Draft', 'Sent', 'Part Paid', 'Paid', 'Overdue', 'Cancelled'];

const today = () => new Date().toISOString().slice(0, 10);
const addCalendarDays = (value, days) => {
  const iso = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const acceptedInvoiceDate = (booking = {}) => String(booking.invoiceSettings?.invoiceDate || booking.quotationAcceptedAt || booking.acceptedAt || booking.createdAt || today()).slice(0, 10);
const isB2CBooking = (booking = {}) => String(booking.clientType || booking.customerType || '').toUpperCase() === 'B2C'
  || Boolean(booking.b2cName)
  || !String(booking.agentName || '').trim();
const defaultInvoiceDueDate = (booking = {}) => {
  const invoiceDate = acceptedInvoiceDate(booking);
  return isB2CBooking(booking) ? invoiceDate : addCalendarDays(invoiceDate, 7);
};
const formatInvoiceDate = (value) => {
  const iso = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '—';
  const [year, month, day] = iso.split('-');
  return `${day}-${month}-${year}`;
};
const customerForBooking = (booking = {}) => booking.agentName || booking.b2cName || booking.clientName || booking.guestName || 'Direct client';
const sameContactValue = (left, right) => String(left || '').trim().toLocaleLowerCase() === String(right || '').trim().toLocaleLowerCase();
const billingContactFromBooking = (booking = {}, master = null) => {
  const directCustomer = isB2CBooking(booking);
  const linkedContact = (master?.contacts || []).find((contact) => contact?.isPrimary || contact?.primary || contact?.status === 'Primary')
    || master?.contacts?.[0]
    || {};
  const city = master?.city || booking.agentCity || booking.clientCity || booking.city || '';
  const state = master?.state || booking.agentState || booking.clientState || booking.state || '';
  const country = master?.country || booking.agentCountry || booking.clientCountry || booking.country || '';
  const zip = master?.zip || master?.postalCode || booking.agentZip || booking.clientZip || booking.zip || '';
  const location = [city, state, country].filter(Boolean).join(', ');
  return {
    name: master?.name || customerForBooking(booking),
    attention: directCustomer
      ? (booking.guestName || master?.name || '')
      : (linkedContact.name || master?.contactPerson || booking.contactPerson || booking.guestName || ''),
    email: linkedContact.email || master?.email || booking.agentEmail || booking.clientEmail || booking.contactEmail || booking.email || '',
    phone: linkedContact.phone || master?.phone || master?.mobile || master?.landline || booking.agentPhone || booking.clientPhone || booking.contactPhone || booking.mobile || booking.phone || '',
    address: [master?.address || booking.agentAddress || booking.clientAddress || booking.address || '', location, zip].filter(Boolean).join(location && zip ? ' · ' : ', '),
  };
};
const billingMasterForBooking = (masters = [], booking = {}, directCustomer = false) => {
  const ids = directCustomer
    ? [booking.b2cId, booking.clientId, booking.customerId]
    : [booking.agentId, booking.clientId];
  const names = directCustomer
    ? [booking.b2cName, booking.clientName, booking.guestName]
    : [booking.agentName, booking.clientName];
  return masters.find((record) => ids.filter(Boolean).some((id) => String(record.id || record._id) === String(id)))
    || masters.find((record) => names.filter(Boolean).some((name) => sameContactValue(record.name, name)))
    || null;
};
const whatsappPhoneForBooking = (booking = {}) => String(
  booking.guestPhone
  || booking.guestMobile
  || booking.mobile
  || booking.mobileNumber
  || booking.phone
  || booking.contactPhone
  || booking.guests?.[0]?.phone
  || booking.guests?.[0]?.mobile
  || '',
).trim();
const whatsappMessageForInvoice = (invoice = {}) => `Hello ${invoice.guest || invoice.agent || 'there'},\n\nYour invoice ${invoice.id || ''} for ${fmtAmount(invoice.amount || 0, invoice.currency || 'THB')} is ready. Please contact us if you need any assistance.`;
const hasBookingInvoice = (booking = {}) => Boolean(booking.invoiceSettings?.invoiceCreatedAt);
const paymentStatus = (invoice, dueDate) => {
  if (invoice.remaining <= 0) return 'Paid';
  if (invoice.paid > 0) return 'Part Paid';
  if (dueDate && dueDate < today()) return 'Overdue';
  return 'Sent';
};
const invoiceFromBooking = (booking = {}) => {
  const state = bookingInvoicePaymentState(booking);
  const settings = booking.invoiceSettings || {};
  const due = settings.dueDate || defaultInvoiceDueDate(booking);
  const services = bookingPaymentLines(booking).map((line) => ({
    desc: `${line.type} - ${line.name}`,
    date: line.item?.serviceDate || line.item?.checkIn || line.item?.date || booking.arrivalDate || '',
    sell: Number(line.totalSelling || 0),
  }));
  return {
    id: `INV-${booking.id || 'BOOKING'}`,
    type: 'Booking', bookingId: booking.id || '', booking,
    agent: customerForBooking(booking), guest: booking.guestName || booking.title || 'Guest',
    date: acceptedInvoiceDate(booking), due,
    amount: state.total, paid: state.paid, balance: state.remaining,
    status: settings.invoiceStatus === 'Cancelled' ? 'Cancelled' : paymentStatus(state, due), currency: settings.currency || booking.currency || 'THB',
    services, subtotal: state.baseAmount, discount: state.discount, tax: state.taxAmount, bankCharges: state.bankCharges,
  };
};

const emptyProformaService = () => ({ id: `manual-service-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, desc: '', date: today(), amount: '' });
const emptyProformaForm = () => ({
  source: 'quotation', quotationId: '', customer: '', guest: '', services: [],
  date: today(), dueDate: today(), currency: 'THB', quoteTotal: 0, remarks: '',
});
const quotationProformaServices = (quotation = {}) => {
  const rows = [];
  const add = (service = {}, index, dayDate = '') => {
    const amount = Number(service.totalSellingPrice ?? service.totalSell ?? service.sellingPrice ?? service.selling ?? service.price ?? service.amount ?? 0);
    const name = String(service.name || service.hotel || service.description || service.serviceName || service.type || '').trim();
    if (!name || !Number.isFinite(amount)) return;
    rows.push({
      id: String(service.id || `quotation-service-${index}`),
      desc: `${service.type && !name.toLowerCase().startsWith(String(service.type).toLowerCase()) ? `${service.type} - ` : ''}${name}`,
      date: String(service.serviceDate || service.date || service.checkIn || dayDate || '').slice(0, 10),
      amount,
    });
  };
  (quotation.days || []).forEach((day, dayIndex) => (day.services || []).forEach((service, serviceIndex) => add(service, `${dayIndex}-${serviceIndex}`, day.date)));
  if (!rows.length) (quotation.services || []).forEach((service, index) => add(service, index));
  if (!rows.length) (quotation.hotels || []).forEach((hotel, index) => add({ ...hotel, type: 'Hotel', name: hotel.name || hotel.hotel }, index, hotel.checkIn));
  return rows;
};
const proformaServiceTotal = (services = []) => services.reduce((total, service) => total + Math.max(0, Number(service.amount || 0)), 0);

const statusConfig = {
  'Draft':     { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  'Sent':      { bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-500' },
  'Part Paid': { bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-500' },
  'Paid':      { bg: 'bg-emerald-50',text: 'text-emerald-700',dot:'bg-emerald-500'},
  'Overdue':   { bg: 'bg-red-50',    text: 'text-red-700',   dot: 'bg-red-500' },
  'Cancelled': { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
  'Closed':    { bg: 'bg-purple-50', text: 'text-purple-700',dot: 'bg-purple-500'},
};

const typeConfig = {
  'Proforma':    { bg: 'bg-blue-100',   text: 'text-blue-800' },
  'Booking':     { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  'Manual':      { bg: 'bg-orange-100', text: 'text-orange-800' },
  'Tax/GST':     { bg: 'bg-violet-100', text: 'text-violet-800' },
  'Credit Note': { bg: 'bg-red-100',    text: 'text-red-800' },
  'Debit Note':  { bg: 'bg-pink-100',   text: 'text-pink-800' },
};

const TEMPLATES = [
  { id: 1, name: 'Proforma Invoice', color: 'from-blue-600 to-blue-800', accentColor: '#2b7de9', label: 'PROFORMA INVOICE', headerBg: '#0e2c63', tag: 'PRO' },
  { id: 2, name: 'Booking Invoice',  color: 'from-indigo-600 to-indigo-800', accentColor: '#6366f1', label: 'BOOKING INVOICE', headerBg: '#312e81', tag: 'BKG' },
  { id: 3, name: 'Tax/GST Invoice',  color: 'from-violet-600 to-violet-800', accentColor: '#7c3aed', label: 'TAX INVOICE', headerBg: '#4c1d95', tag: 'GST' },
  { id: 4, name: 'Credit Note',      color: 'from-red-500 to-red-700',     accentColor: '#ef4444', label: 'CREDIT NOTE', headerBg: '#7f1d1d', tag: 'CR' },
  { id: 5, name: 'Debit Note',       color: 'from-pink-500 to-pink-700',   accentColor: '#ec4899', label: 'DEBIT NOTE', headerBg: '#831843', tag: 'DR' },
  { id: 6, name: 'Payment Receipt',  color: 'from-emerald-600 to-emerald-800', accentColor: '#10b981', label: 'PAYMENT RECEIPT', headerBg: '#064e3b', tag: 'RCP' },
];

const fmt = (n) => `฿ ${Number(n || 0).toLocaleString()}`;
const DEFAULT_COMPANY_PROFILE = {
  name: 'BuildSoftware Pvt Ltd', email: 'admin@buildsoftware.in', phone: '+66 94 983 1312',
  address: '64/103 Soi 3/5, Thepprasit Road, Pattaya, Thailand 20150', website: 'www.buildsoftware.in', logo: '',
};
const attachmentUrl = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(attachmentUrl).find(Boolean) || '';
  if (typeof value === 'object') return attachmentUrl(value.url || value.secureUrl || value.secure_url || value.imageUrl || value.src || value.path);
  return '';
};
const companyProfile = (value = {}) => ({
  ...DEFAULT_COMPANY_PROFILE,
  ...value,
  logo: attachmentUrl(value.logo || value.companyLogo),
});

const getCurrencySymbol = (currency = 'THB') => {
  switch (String(currency || 'THB').toUpperCase()) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'INR': return '₹';
    case 'THB':
    default:
      return '฿';
  }
};

const fmtAmount = (val, currency = 'THB') => `${getCurrencySymbol(currency)}${Number(val || 0).toLocaleString()}`;

// ─── Status Badge ─────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig['Draft'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

function InvoiceHeaderBadge({ status }) {
  const badgeMap = {
    'Sent':      { text: 'text-blue-600', dot: 'bg-blue-600' },
    'Paid':      { text: 'text-emerald-600', dot: 'bg-emerald-600' },
    'Part Paid': { text: 'text-amber-600', dot: 'bg-amber-600' },
    'Overdue':   { text: 'text-red-600', dot: 'bg-red-600' },
    'Draft':     { text: 'text-slate-600', dot: 'bg-slate-500' },
    'Cancelled': { text: 'text-slate-500', dot: 'bg-slate-400' },
    'Closed':    { text: 'text-purple-600', dot: 'bg-purple-600' },
  };
  const cfg = badgeMap[status] || { text: 'text-blue-600', dot: 'bg-blue-600' };
  return (
    <span className="inline-flex items-center gap-1.5 bg-white px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm">
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      <span className={cfg.text}>{status}</span>
    </span>
  );
}

function TypeBadge({ type }) {
  const cfg = typeConfig[type] || { bg: 'bg-slate-100', text: 'text-slate-600' };
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
      {type}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, iconBg }) {
  const theme = (/blue/.test(color) && ['from-blue-500 to-indigo-600', 'text-blue-500'])
    || (/emerald|green/.test(color) && ['from-emerald-400 to-green-600', 'text-emerald-500'])
    || (/amber|orange/.test(color) && ['from-amber-400 to-orange-500', 'text-orange-500'])
    || (/red/.test(color) && ['from-red-400 to-rose-500', 'text-rose-500'])
    || ['from-violet-500 to-purple-600', 'text-violet-500'];
  return (
    <div className="group relative flex min-w-0 flex-1 items-center overflow-hidden rounded-xl border border-slate-300 bg-white px-2.5 py-2 sm:px-3 sm:py-2.5 shadow-sm transition-all hover:shadow-md sm:min-w-[170px]">
      <div className="relative z-10 flex min-w-0 items-center gap-2.5">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${theme[0]} text-white shadow-md transition-transform duration-300 group-hover:scale-105`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[9.5px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className={`truncate text-[15px] sm:text-base font-extrabold ${color}`}>{value}</p>
          {sub && <p className="truncate text-[10px] text-slate-400">{sub}</p>}
        </div>
      </div>
      <MiniBars value={value} className={theme[1]} show="hidden xl:flex" />
    </div>
  );
}

// ─── Client Invoice PDF Vector Graphics ─────────────────────────────────────

function WatArunTempleSilhouette() {
  return (
    <svg
      className="absolute right-0 bottom-0 pointer-events-none opacity-35"
      width="220"
      height="100"
      viewBox="0 0 240 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 170 108 L 170 70 L 167 65 L 173 65 L 169 50 L 171 45 L 169 35 L 171 25 L 170 15 L 171 5 L 172 15 L 171 25 L 173 35 L 171 45 L 173 50 L 169 65 L 175 65 L 172 70 L 172 108 Z"
        stroke="#60a5fa"
        strokeWidth="1.2"
        fill="#e0f2fe"
      />
      <path
        d="M 158 108 L 158 80 L 162 72 L 170 70 L 178 72 L 182 80 L 182 108"
        stroke="#60a5fa"
        strokeWidth="1"
        fill="#f0f9ff"
      />
      <path
        d="M 152 108 L 155 90 L 160 85 L 180 85 L 185 90 L 188 108"
        stroke="#93c5fd"
        strokeWidth="1"
        fill="#f0f9ff"
      />
      <path
        d="M 125 108 L 125 80 L 123 72 L 127 72 L 124 58 L 126 50 L 124 35 L 125 25 L 126 35 L 124 50 L 126 58 L 123 72 L 127 72 L 125 80 L 125 108"
        stroke="#93c5fd"
        strokeWidth="1"
        fill="#e0f2fe"
      />
      <path
        d="M 115 108 L 118 92 L 124 85 L 126 85 L 132 92 L 135 108"
        stroke="#bae6fd"
        strokeWidth="0.8"
        fill="#f0f9ff"
      />
      <path
        d="M 215 108 L 215 80 L 213 72 L 217 72 L 214 58 L 216 50 L 214 35 L 215 25 L 216 35 L 214 50 L 216 58 L 213 72 L 217 72 L 215 80 L 215 108"
        stroke="#93c5fd"
        strokeWidth="1"
        fill="#e0f2fe"
      />
      <path
        d="M 205 108 L 208 92 L 214 85 L 216 85 L 222 92 L 225 108"
        stroke="#bae6fd"
        strokeWidth="0.8"
        fill="#f0f9ff"
      />
      <path
        d="M 70 108 L 75 95 L 85 92 L 95 85 L 85 82 L 98 75 L 88 72 L 100 65 L 102 60 L 104 65 L 115 108"
        stroke="#93c5fd"
        strokeWidth="0.9"
        fill="#e0f2fe"
      />
    </svg>
  );
}

function FlightRouteGraphic() {
  return (
    <div className="flex flex-col items-end">
      <div className="relative w-40 h-12 flex items-center justify-end overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 160 50" fill="none">
          <circle cx="20" cy="15" r="2" fill="#93c5fd" />
          <circle cx="28" cy="12" r="1.5" fill="#93c5fd" />
          <circle cx="35" cy="18" r="2.5" fill="#93c5fd" />
          <circle cx="45" cy="22" r="2" fill="#93c5fd" />
          <circle cx="55" cy="15" r="3" fill="#93c5fd" />
          <circle cx="70" cy="25" r="2" fill="#93c5fd" />
          <circle cx="85" cy="18" r="3" fill="#93c5fd" />
          <circle cx="100" cy="22" r="2" fill="#93c5fd" />
          <circle cx="115" cy="28" r="2.5" fill="#93c5fd" />
          <circle cx="130" cy="20" r="3" fill="#93c5fd" />
          <circle cx="145" cy="30" r="2" fill="#93c5fd" />
        </svg>
        <svg className="relative w-full h-full" viewBox="0 0 160 50" fill="none">
          <path
            d="M 15 36 Q 75 8 135 18"
            stroke="#1d62c9"
            strokeWidth="1.4"
            strokeDasharray="4 4"
            fill="none"
          />
          <g transform="translate(135, 18) rotate(22)">
            <path
              d="M 0 -5 L 3 0 L 8 2 L 3 3.5 L 0 5 L 0.8 0.8 L -4 0 L 0.8 -0.8 Z"
              fill="#154aa0"
            />
          </g>
        </svg>
      </div>
      <div className="text-right">
        <div className="text-[10px] font-black text-[#14365d] tracking-wider uppercase">
          THAILAND
        </div>
        <div className="text-[8.5px] font-semibold text-slate-600 tracking-wide mt-0.5">
          BANGKOK <span className="text-slate-300 mx-0.5">|</span> PATTAYA
        </div>
        <div className="text-[8.5px] font-semibold text-slate-600 tracking-wide">
          PHUKET <span className="text-slate-300 mx-0.5">|</span> KRABI
        </div>
        <div className="text-[8.5px] font-semibold text-slate-600 tracking-wide">
          KOH SAMUI <span className="text-slate-300 mx-0.5">|</span> CHIANG MAI
        </div>
      </div>
    </div>
  );
}

// ─── Invoice Preview Modal ─────────────────────────────────────────────────

function PreviewModal({ invoice, company, onClose, onEdit, onDelete }) {
  const [printing, setPrinting] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [billingContact, setBillingContact] = useState(() => billingContactFromBooking(invoice?.booking || {}));

  useEffect(() => {
    let active = true;
    const booking = invoice?.booking || {};
    const directCustomer = isB2CBooking(booking);
    setBillingContact(billingContactFromBooking(booking));
    // Invoice rows contain a booking snapshot for speed. Resolve the live
    // master too, so later corrections to an agent/customer's contact details
    // are reflected in both preview and downloaded PDF.
    apiClient.get(directCustomer ? '/b2c?limit=100&summary=false' : '/agents?limit=100&summary=false')
      .then((response) => {
        if (!active) return;
        const master = billingMasterForBooking(response.data || [], booking, directCustomer);
        if (master) setBillingContact(billingContactFromBooking(booking, master));
      })
      .catch(() => { /* Keep the booking snapshot; never replace it with fake contact details. */ });
    return () => { active = false; };
  }, [invoice]);
  if (!invoice) return null;
  const cfg = statusConfig[invoice.status] || {};
  const profile = companyProfile(company);
  const invoiceSettings = invoice.booking?.invoiceSettings || {};
  const showPaymentTerms = invoiceSettings.showPaymentTerms !== false;
  const showBankDetails = invoiceSettings.showBankDetails !== false;
  const bankDetails = invoiceSettings.invoiceBankDetails || null;
  const bankLines = bankDetails ? [
    ['Bank Name', bankDetails.name || bankDetails.bankName],
    ['Account Name', bankDetails.accountName],
    ['Account No.', bankDetails.accountNumber],
    ['Account Details', bankDetails.accountDetails],
    ['Branch', bankDetails.branch || [bankDetails.city, bankDetails.state].filter(Boolean).join(', ')],
    ['SWIFT / IFSC', bankDetails.swiftCode || bankDetails.ifscCode || bankDetails.ibnCode],
    ['Currency', bankDetails.currency],
  ].filter(([, value]) => String(value || '').trim()) : [];
  const printClientInvoice = async () => {
    if (printing) return;
    const documentElement = document.getElementById('client-payment-invoice');
    if (!documentElement) return toast.error('The invoice document is not ready yet.');
    try {
      setPrinting(true);
      // Render only the client-facing invoice to one generated A4 page. This
      // avoids browser-printing the hidden reference layout as a duplicate.
      await printPdfDocument(documentElement, invoice.id, undefined, { margin: 0, topMargin: 0, singlePage: true });
    } catch (error) {
      toast.error(error.message || 'Unable to generate the invoice PDF.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 bg-slate-900/45 backdrop-blur-[4px]" onMouseDown={onClose}>
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]" onMouseDown={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-10 sm:pr-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm leading-tight break-all">{invoice.id}</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Invoice Preview</p>
            </div>
          </div>
          <div className="grid grid-cols-4 sm:flex sm:items-center gap-1.5 sm:gap-2 sm:ml-auto [&>button]:justify-center [&>button]:px-2 sm:[&>button]:px-3 [&>button]:py-2 sm:[&>button]:py-1.5">
            <button title="Edit" onClick={() => onEdit(invoice)} className="flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 text-xs font-semibold hover:bg-indigo-100 transition-colors">
              <Edit3 className="h-3.5 w-3.5" /> <span className="hidden min-[380px]:inline">Edit</span>
            </button>
            {onDelete && <button title="Delete" onClick={() => onDelete(invoice)} className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"><Trash2 className="h-3.5 w-3.5" /> <span className="hidden min-[380px]:inline">Delete</span></button>}
            <button title="Download PDF" disabled={printing} onClick={printClientInvoice} className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 text-xs font-semibold hover:bg-blue-100 transition-colors disabled:cursor-not-allowed disabled:opacity-60 print:hidden">
              {printing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} <span className="hidden min-[380px]:inline">{printing ? 'Preparing…' : 'PDF'}</span>
            </button>
            <button title="Email" onClick={() => toast.success('Opening email dialog...')} className="flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 text-xs font-semibold hover:bg-green-100 transition-colors">
              <Mail className="h-3.5 w-3.5" /> <span className="hidden min-[380px]:inline">Email</span>
            </button>
            <button onClick={onClose} className="absolute right-3 top-2.5 sm:static rounded-lg bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Invoice Preview Content */}
        <div className="px-3 sm:px-6 pt-2 sm:pt-1 pb-4 sm:pb-5 overflow-y-auto flex-1 min-h-0 print:overflow-visible print:max-h-none print:p-0">
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 print:hidden">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Internal reference only. The downloaded client PDF does not include this service breakdown.
          </div>
          {/* Internal reference — never selected by the client PDF print stylesheet. */}
          <div id="invoice-reference-preview" className="rounded-2xl overflow-hidden border border-slate-200 mb-4 bg-white shadow-sm">
            <div className="bg-[#0b2447] px-3 sm:px-6 py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-white">
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                <div className="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-white p-1.5">
                  <img src={profile.logo || LogoImg} alt={`${profile.name} logo`} className="h-full w-full object-contain" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = LogoImg; }} />
                </div>
                <div className="h-8 w-[1px] shrink-0 bg-white/20 mx-0.5 sm:mx-1" />
                <div>
                  <div className="text-white font-extrabold text-[13px] sm:text-base tracking-wide uppercase leading-tight font-sans break-words">{profile.name}</div>
                  <div className="flex flex-wrap items-center gap-x-2 mt-1 text-[11px] sm:text-xs"><span className="text-white font-extrabold tracking-wide uppercase">INVOICE</span><span className="text-white/40 font-light">|</span><span className="text-slate-300 font-normal">{profile.website || profile.email || 'Thailand'}</span></div>
                </div>
              </div>

              {/* Invoice Number & Status & Dates */}
              <div className="sm:text-right border-t border-white/10 pt-2 sm:border-0 sm:pt-0">
                <div className="flex items-center sm:justify-end gap-2 sm:gap-3 flex-wrap">
                  <span className="text-white font-bold text-base sm:text-xl tracking-tight">{invoice.id}</span>
                  <InvoiceHeaderBadge status={invoice.status} />
                </div>
                <div className="mt-1 text-[11px] sm:text-xs text-slate-300 font-normal flex flex-wrap items-center sm:justify-end gap-x-2">
                  <span>Date: <span className="font-medium text-white">{formatInvoiceDate(invoice.date)}</span></span>
                  <span className="text-white/30">|</span>
                  <span>Due: <span className="font-medium text-white">{formatInvoiceDate(invoice.due)}</span></span>
                </div>
              </div>
            </div>

            {/* Subheader Strip: Bill To & Booking Ref */}
            <div className="px-3 sm:px-6 py-2 sm:py-2.5 bg-[#f8fafc] border-b border-slate-200 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-1.5 sm:gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">BILL TO:</span>
                <span className="text-slate-900 font-bold text-xs">{billingContact.name || invoice.agent || '—'}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600 font-medium text-xs">{billingContact.attention || invoice.guest || '—'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <div className="h-3.5 w-[1px] bg-slate-200 mr-2 hidden sm:block" />
                <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">BOOKING REF:</span>
                <span className="text-blue-600 font-extrabold text-xs">{invoice.bookingId}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-normal text-xs">Currency: <span className="text-slate-700 font-semibold">{invoice.currency}</span></span>
              </div>
            </div>

            {/* Services Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#edf2f9] border-b border-slate-200">
                    <th className="py-2 sm:py-2.5 px-2 sm:px-3 text-center text-[10px] sm:text-[11px] font-bold text-slate-700 tracking-wider uppercase w-10 sm:w-14 border-r border-slate-200">#</th>
                    <th className="py-2 sm:py-2.5 px-2 sm:px-4 text-left text-[10px] sm:text-[11px] font-bold text-slate-700 tracking-wider uppercase border-r border-slate-200">SERVICE DESCRIPTION</th>
                    <th className="py-2 sm:py-2.5 px-2 sm:px-4 text-center text-[10px] sm:text-[11px] font-bold text-slate-700 tracking-wider uppercase w-24 sm:w-36 border-r border-slate-200">DATE</th>
                    <th className="py-2 sm:py-2.5 px-2 sm:px-6 text-right text-[10px] sm:text-[11px] font-bold text-slate-700 tracking-wider uppercase w-28 sm:w-40">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {(invoice.services || []).map((row, i) => (
                    <tr key={i} className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors">
                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-center text-slate-600 text-xs font-normal border-r border-slate-200">{i + 1}</td>
                      <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-left text-slate-800 text-[11px] sm:text-xs font-normal border-r border-slate-200">{row.desc}</td>
                      <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-center text-slate-600 text-[11px] sm:text-xs font-normal border-r whitespace-nowrap border-slate-200">{formatInvoiceDate(row.date)}</td>
                      <td className="py-2 sm:py-2.5 px-2 sm:px-6 text-right font-normal text-slate-700 text-[11px] sm:text-xs font-mono whitespace-nowrap">
                        {fmtAmount(row.sell || row.amount || 0, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                  {(!invoice.services || invoice.services.length === 0) && (
                    <tr className="border-b border-slate-200">
                      <td colSpan="4" className="py-5 text-center text-slate-400 text-xs italic">
                        No service items found for this invoice.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="px-3 sm:px-6 py-3 sm:py-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 sm:gap-6">
              {/* Left Side: Notes & Payment Terms */}
              <div className="flex-1 max-w-sm space-y-2 py-0.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Notes & Terms
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal mt-0.5">
                    {invoice.remarks || 'Thank you for booking with BuildSoftware. Please settle payment by the due date.'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-normal">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Electronic Invoice · BuildSoftware</span>
                </div>
              </div>

              {/* Right Side: Redesigned Executive Summary Card */}
              <div className="w-full sm:w-80 rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-normal">Subtotal</span>
                  <span className="font-normal text-slate-700 font-mono text-xs tabular-nums">{fmtAmount(invoice.subtotal ?? invoice.amount ?? 0, invoice.currency)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-normal">Discount</span>
                  <span className="font-normal text-rose-500 font-mono text-xs tabular-nums">- {fmtAmount(invoice.discount || 0, invoice.currency)}</span>
                </div>
                {Boolean(invoice.tax) && Number(invoice.tax) > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-normal">Tax / VAT</span>
                    <span className="font-normal text-slate-700 font-mono text-xs tabular-nums">+{fmtAmount(invoice.tax, invoice.currency)}</span>
                  </div>
                )}
                {Boolean(invoice.bankCharges) && Number(invoice.bankCharges) > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-normal">Bank Charges</span>
                    <span className="font-normal text-slate-700 font-mono text-xs tabular-nums">+{fmtAmount(invoice.bankCharges, invoice.currency)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200/80 my-1.5" />
                <div className="flex justify-between items-center text-xs py-0.5">
                  <span className="text-slate-700 font-normal">Total Amount</span>
                  <span className="text-blue-600 font-normal font-mono text-xs tabular-nums">{fmtAmount(invoice.amount, invoice.currency)}</span>
                </div>
                <div className="flex justify-between items-center text-xs py-0.5">
                  <span className="text-slate-600 font-normal">Total Received</span>
                  <span className="text-emerald-600 font-normal font-mono text-xs tabular-nums">{fmtAmount(invoice.paid, invoice.currency)}</span>
                </div>
                <div className={`mt-2 flex justify-between items-center rounded-lg px-3.5 py-2.5 border transition-all ${
                  (invoice.balance || 0) > 0
                    ? 'bg-rose-50/90 border-rose-200/90 text-rose-600'
                    : 'bg-emerald-50/90 border-emerald-200/90 text-emerald-700'
                }`}>
                  <span className="font-normal text-xs uppercase tracking-wide">
                    {(invoice.balance || 0) > 0 ? 'Balance Due' : 'Fully Settled'}
                  </span>
                  <span className="font-normal font-mono text-xs tracking-tight tabular-nums">
                    {fmtAmount(Math.max(0, invoice.balance || 0), invoice.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* This is the only document selected for browser printing/PDF download. Designed to match the luxury BuildSoftware client booking invoice. */}
          <div
            id="client-payment-invoice"
            className="fixed left-[-10000px] top-0 bg-white text-slate-800"
            style={{
              width: '210mm',
              maxHeight: '296mm',
              height: 'auto',
              boxSizing: 'border-box',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              background: '#ffffff',
              padding: '0',
              overflow: 'hidden',
            }}
          >
            {/* Top Container with generous padding */}
            <div className="px-8 pt-5 pb-2">
              {/* 1. Header: Logo, Company Info & Flight Route Graphic */}
              <div className="flex items-start justify-between gap-4 pb-3">
                {/* Left: Buddha emblem logo */}
                <div className="flex flex-col items-center justify-center w-28 shrink-0">
                  <img
                    src={profile.logo || LogoImg}
                    alt={`${profile.name} logo`}
                    className="max-h-20 max-w-full object-contain"
                    onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = LogoImg; }}
                  />
                  <span className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase mt-1">DMC</span>
                </div>

                {/* Center: Company Name & Contact Details */}
                <div className="flex-1 px-4 text-center">
                  <h1 className="text-xl font-extrabold text-[#14365d] tracking-tight leading-tight">
                    {profile.name || 'BuildSoftware Pvt Ltd'}
                  </h1>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                    At Your service 24 Hours
                  </p>
                  <div className="mt-2 space-y-0.5 text-[9.5px] text-slate-600">
                    <div className="flex items-center justify-center gap-1.5">
                      <MapPin className="h-3 w-3 text-[#14365d] shrink-0" />
                      <span>{profile.address || '64/103 Soi 3/5, Thepprasit Road, Pattaya, Thailand 20150'}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <Phone className="h-3 w-3 text-[#14365d] shrink-0" />
                      <span>{profile.phone || '+66 94 983 1312'}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <Mail className="h-3 w-3 text-[#14365d] shrink-0" />
                      <span>{profile.email || 'admin@buildsoftware.in'}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <Globe className="h-3 w-3 text-[#14365d] shrink-0" />
                      <span>{profile.website || 'www.buildsoftware.in'}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Route Illustration & Destinations */}
                <div className="w-44 shrink-0 text-right">
                  <FlightRouteGraphic />
                </div>
              </div>

              {/* Thin Divider */}
              <div className="h-[1px] bg-slate-200/80 my-3" />

              {/* 2. Title Strip: BOOKING INVOICE & Meta Card */}
              <div className="flex items-center justify-between gap-4 mt-2">
                <div>
                  <h2 className="text-2xl font-black tracking-wide text-[#154aa0] uppercase leading-none font-sans">
                    {invoice.type === 'Proforma' ? 'PROFORMA INVOICE' : 'BOOKING INVOICE'}
                  </h2>
                  <p className="text-[9.5px] font-bold text-slate-500 tracking-wider uppercase mt-1.5">
                    HOLIDAYS <span className="text-slate-300">|</span> TRANSFERS <span className="text-slate-300">|</span> SIGHTSEEING <span className="text-slate-300">|</span> MICE <span className="text-slate-300">|</span> EXPERIENCES
                  </p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-[#f0f7ff] px-4 py-2 text-right shadow-xs min-w-[200px]">
                  <div className="text-sm font-black text-[#14365d] tracking-tight">{invoice.id}</div>
                  <div className="mt-1 space-y-0.5 text-[9px] font-bold text-slate-600">
                    <div>ISSUE DATE: <span className="font-normal text-slate-700">{formatInvoiceDate(invoice.date)}</span></div>
                    <div>DUE DATE: <span className="font-normal text-slate-700">{formatInvoiceDate(invoice.due)}</span></div>
                    <div>CURRENCY: <span className="font-normal text-slate-700">{invoice.currency || 'THB'}</span></div>
                  </div>
                </div>
              </div>

              {/* 3. Bill To & Booking Reference */}
              <div className="grid grid-cols-2 gap-8 items-start mt-4 pt-2">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">BILL TO</div>
                  <div className="mt-1 text-base font-extrabold text-[#14365d]">
                    {billingContact.name || invoice.agent || invoice.guest || '—'}
                  </div>
                  {billingContact.attention && <div className="text-xs font-semibold text-slate-700 mt-0.5">{billingContact.attention.toLowerCase().startsWith('mr') || billingContact.attention.toLowerCase().startsWith('ms') || billingContact.attention.toLowerCase().startsWith('mrs') ? billingContact.attention : `Attn: ${billingContact.attention}`}</div>}
                  <div className="mt-1.5 space-y-0.5 text-[10px] text-slate-600">
                    {billingContact.email && <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>{billingContact.email}</span>
                    </div>}
                    {billingContact.phone && <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>{billingContact.phone}</span>
                    </div>}
                    {billingContact.address && <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>{billingContact.address}</span>
                    </div>}
                  </div>
                </div>

                <div className="border-l border-slate-200/90 pl-6 text-left">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">BOOKING REFERENCE</div>
                    <div className="mt-1 text-xl font-black text-[#154aa0] tracking-tight">
                      {invoice.bookingId || invoice.id.replace(/^INV-/, '') || 'BK-2026-122'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Booking Details Strip */}
              <div className="mt-4">
                <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-1">
                  BOOKING DETAILS
                </div>
                <div className="grid grid-cols-[1.15fr_1.85fr_0.85fr_0.65fr_1.1fr] divide-x divide-blue-200/80 rounded-xl border border-blue-200 bg-[#f0f7ff] py-2 px-1 text-center items-center">
                  <div className="px-2 min-w-0">
                    <div className="flex items-center justify-center gap-1 text-[8.5px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                      <MapPin className="h-2.5 w-2.5 text-[#154aa0]" /> DESTINATION
                    </div>
                    <div className="mt-0.5 text-xs font-black text-[#14365d] whitespace-nowrap truncate" title={invoice.booking?.destination || invoice.booking?.destinations?.[0] || 'Thailand'}>
                      {invoice.booking?.destination || invoice.booking?.destinations?.[0] || 'Thailand'}
                    </div>
                  </div>

                  <div className="px-2 min-w-0">
                    <div className="flex items-center justify-center gap-1 text-[8.5px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                      <Calendar className="h-2.5 w-2.5 text-[#154aa0]" /> TRAVEL PERIOD
                    </div>
                    <div className="mt-0.5 text-[11px] font-black text-[#14365d] whitespace-nowrap tracking-tight">
                      {invoice.booking?.arrivalDate ? `${formatInvoiceDate(invoice.booking.arrivalDate)}${invoice.booking?.departureDate ? ` - ${formatInvoiceDate(invoice.booking.departureDate)}` : ''}` : '--'}
                    </div>
                  </div>

                  <div className="px-2 min-w-0">
                    <div className="flex items-center justify-center gap-1 text-[8.5px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                      <Users className="h-2.5 w-2.5 text-[#154aa0]" /> GUESTS
                    </div>
                    <div className="mt-0.5 text-xs font-black text-[#14365d] whitespace-nowrap">
                      {invoice.booking?.pax ? `${invoice.booking.pax} Pax` : (invoice.booking?.adults ? `${invoice.booking.adults} Pax` : '-- Pax')}
                    </div>
                  </div>

                  <div className="px-2 min-w-0">
                    <div className="flex items-center justify-center gap-1 text-[8.5px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                      <Bed className="h-2.5 w-2.5 text-[#154aa0]" /> ROOMS
                    </div>
                    <div className="mt-0.5 text-xs font-black text-[#14365d] whitespace-nowrap">
                      {invoice.booking?.rooms ? `${invoice.booking.rooms}` : '--'}
                    </div>
                  </div>

                  <div className="px-2 min-w-0">
                    <div className="flex items-center justify-center gap-1 text-[8.5px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                      <Tag className="h-2.5 w-2.5 text-[#154aa0]" /> PACKAGE TYPE
                    </div>
                    <div className="mt-0.5 text-xs font-black text-[#14365d] whitespace-nowrap">
                      {invoice.booking?.packageType || 'Land Package'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Package Summary */}
              <div className="mt-3.5">
                <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-1">
                  PACKAGE SUMMARY
                </div>
                <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-r from-[#f0f7ff] via-[#eaf4fe] to-[#f4f9ff] px-4 py-3.5">
                  <WatArunTempleSilhouette />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2">
                      <Luggage className="h-4 w-4 text-[#154aa0] shrink-0" />
                      <span className="text-sm font-extrabold text-[#14365d]">
                        {invoice.booking?.destination ? `${invoice.booking.destination} Land Package` : 'Thailand Land Package'}
                      </span>
                    </div>
                    <div className="ml-6 mt-0.5 text-xs font-semibold text-slate-600">
                      {(invoice.booking?.destinations && invoice.booking.destinations.length > 0) ? invoice.booking.destinations.join(' – ') : 'Bangkok – Pattaya'}
                    </div>
                    <p className="mt-2 text-[9.5px] text-slate-500 max-w-[460px] leading-relaxed">
                      This booking invoice is issued as a total amount. Individual hotel, transfer and activity prices are not shown in the client copy.
                    </p>
                  </div>
                </div>
              </div>

              {/* 6. Totals Trio Cards */}
              <div className="grid grid-cols-3 gap-3.5 mt-3.5">
                {/* Invoice Total */}
                <div className="rounded-xl bg-[#0c2340] px-4 py-3 text-center text-white shadow-xs">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-blue-200">
                    INVOICE TOTAL
                  </div>
                  <div className="mt-1 text-2xl font-black tracking-tight text-white">
                    {getCurrencySymbol(invoice.currency)} {Number(invoice.amount || 0).toLocaleString()}
                  </div>
                </div>

                {/* Amount Received */}
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center shadow-xs">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    AMOUNT RECEIVED
                  </div>
                  <div className="mt-1 text-2xl font-black tracking-tight text-emerald-600">
                    {getCurrencySymbol(invoice.currency)} {Number(invoice.paid || 0).toLocaleString()}
                  </div>
                </div>

                {/* Balance Due */}
                <div className="rounded-xl border border-rose-200 bg-[#fef2f2] px-4 py-3 text-center shadow-xs">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-rose-500">
                    BALANCE DUE
                  </div>
                  <div className="mt-1 text-2xl font-black tracking-tight text-red-600">
                    {getCurrencySymbol(invoice.currency)} {Number(invoice.balance || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* 7. Payment Terms & Bank Details */}
              {(showPaymentTerms || showBankDetails) && <div className={`grid gap-3.5 mt-3.5 ${showPaymentTerms && showBankDetails ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {/* Left: Payment Terms */}
                {showPaymentTerms && <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#14365d] uppercase tracking-wide">
                    <FileText className="h-3.5 w-3.5 text-[#154aa0]" />
                    PAYMENT TERMS
                  </div>
                  {invoiceSettings.invoiceTermsHtml
                    ? <div className="rich-text-content mt-2 text-[9px] leading-normal text-slate-600 [&_ol]:ml-4 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:my-1 [&_ul]:ml-4 [&_ul]:list-disc [&_ul]:space-y-1" dangerouslySetInnerHTML={{ __html: invoiceSettings.invoiceTermsHtml }} />
                    : <p className="mt-2 text-[9px] text-slate-400">No payment-terms template was selected for this invoice.</p>}
                </div>}

                {/* Right: Bank Details (THB) */}
                {showBankDetails && <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-black text-[#14365d] uppercase tracking-wide">
                      <Landmark className="h-3.5 w-3.5 text-[#154aa0]" />
                      BANK DETAILS ({bankDetails?.currency || invoice.currency || 'THB'})
                    </div>
                    {bankLines.length
                      ? <div className="mt-2 space-y-0.5 text-[9px] text-slate-600">{bankLines.map(([label, value]) => <div key={label}><span className="text-slate-400">{label}</span> : <strong className="break-words text-slate-800">{value}</strong></div>)}</div>
                      : <p className="mt-2 text-[9px] text-slate-400">No active bank was selected for this invoice.</p>}
                  </div>
                </div>}
              </div>}

              {/* 8. Thank you note */}
              <div className="text-center mt-3 pt-1">
                <div className="text-[11px] font-extrabold text-[#14365d]">
                  Thank you for choosing BuildSoftware Pvt Ltd.
                </div>
                <p className="text-[9.5px] text-slate-500 mt-0.5">
                  Please contact us if you need any assistance with this invoice.
                </p>
              </div>

              {/* 9. Service Icons row */}
              <div className="grid grid-cols-5 text-center mt-3 pt-2.5 border-t border-slate-100">
                <div className="flex flex-col items-center">
                  <Plane className="h-4 w-4 text-[#14365d]" />
                  <span className="text-[7.5px] font-bold uppercase tracking-wider text-slate-700 mt-1">
                    AIRPORT TRANSFERS
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <Hotel className="h-4 w-4 text-[#14365d]" />
                  <span className="text-[7.5px] font-bold uppercase tracking-wider text-slate-700 mt-1">
                    HOTELS
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <Camera className="h-4 w-4 text-[#14365d]" />
                  <span className="text-[7.5px] font-bold uppercase tracking-wider text-slate-700 mt-1">
                    SIGHTSEEING & TOURS
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <Ship className="h-4 w-4 text-[#14365d]" />
                  <span className="text-[7.5px] font-bold uppercase tracking-wider text-slate-700 mt-1">
                    YACHT EXPERIENCES
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <Users className="h-4 w-4 text-[#14365d]" />
                  <span className="text-[7.5px] font-bold uppercase tracking-wider text-slate-700 mt-1">
                    MICE & GROUPS
                  </span>
                </div>
              </div>
            </div>

            {/* 10. Bottom Navy Footer Bar */}
            <div className="bg-[#0b2447] text-white px-8 py-2 flex items-center justify-between text-[9.5px] font-medium mt-2">
              <div className="flex items-center gap-1.5">
                <Globe className="h-3 w-3 text-blue-300" />
                <span>www.buildsoftware.in</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>At Your service 24 Hours</span>
                <Plane className="h-3 w-3 text-blue-300" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 sm:gap-2 mt-4">
            {[
              { icon: Eye, label: 'Preview PDF', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
              { icon: Download, label: 'Download PDF', color: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100' },
              { icon: Mail, label: 'Send Email', color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' },
              { icon: MessageCircle, label: 'Send WhatsApp', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
              { icon: History, label: 'Payment History', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
              { icon: Copy, label: 'Duplicate Invoice', color: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100' },
              { icon: FileCheck, label: 'Create Credit Note', color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
              { icon: XCircle, label: 'Cancel Invoice', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' },
            ].map(({ icon: Ic, label, color }) => (
              <button key={label} onClick={() => {
                if (label.includes('PDF')) return printClientInvoice();
                if (label === 'Send WhatsApp') return setWhatsappOpen(true);
                toast.success(`${label} is available from the invoice editor.`);
              }} className={`flex items-center justify-center sm:justify-start gap-1.5 rounded-lg border px-2 sm:px-3 py-2 sm:py-1.5 text-[11px] sm:text-xs font-semibold transition-colors min-w-0 ${color} print:hidden`}>
                <Ic className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {whatsappOpen && <WhatsAppSendDialog
        title={`Send invoice ${invoice.id || ''}`}
        recipientName={invoice.guest || invoice.agent}
        recipientPhone={whatsappPhoneForBooking(invoice.booking)}
        initialMessage={whatsappMessageForInvoice(invoice)}
        onClose={() => setWhatsappOpen(false)}
      />}
    </div>
  );
}

// ─── Edit / Create Modal ──────────────────────────────────────────────────

function EditModal({ invoice, bookings = [], initialBookingId = '', onClose, onPreview, onSave }) {
  const isNew = !invoice?.id;
  const [bookingId, setBookingId] = useState(invoice?.bookingId || initialBookingId || '');
  const selectedBooking = useMemo(() => bookings.find((booking) => booking.id === bookingId) || invoice?.booking || null, [bookings, bookingId, invoice]);
  const selectedInvoice = useMemo(() => selectedBooking ? invoiceFromBooking(selectedBooking) : invoice, [selectedBooking, invoice]);
  const [services, setServices] = useState(() => selectedInvoice?.services || []);
  const [payments, setPayments] = useState([]);
  const [invoiceDate, setInvoiceDate] = useState(selectedInvoice?.date || today());
  const [dueDate, setDueDate] = useState(selectedInvoice?.due || '');
  const [currency, setCurrency] = useState(selectedInvoice?.currency || 'THB');
  const [discountPercent, setDiscountPercent] = useState(Number(selectedBooking?.invoiceSettings?.discountPercent || 0));
  const [remarks, setRemarks] = useState(selectedBooking?.invoiceSettings?.remarks || '');
  const [banks, setBanks] = useState([]);
  const [invoiceTermsTemplates, setInvoiceTermsTemplates] = useState([]);
  const [invoiceBankId, setInvoiceBankId] = useState(selectedBooking?.invoiceSettings?.invoiceBankId || '');
  const [invoiceTermsTemplateId, setInvoiceTermsTemplateId] = useState(selectedBooking?.invoiceSettings?.invoiceTermsTemplateId || '');
  const [showPaymentEntry, setShowPaymentEntry] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ date: today(), amount: '', scope: 'Full Payment', method: 'Bank Transfer', bankName: '', approvalStatus: 'Confirmed', remarks: '', attachmentFile: null });
  const [editingPaymentIndex, setEditingPaymentIndex] = useState(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [shareScope, setShareScope] = useState('Full Payment');
  const [sharingPaymentLink, setSharingPaymentLink] = useState(false);
  const [clientPaymentLink, setClientPaymentLink] = useState('');
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [noteDialog, setNoteDialog] = useState('');
  const [noteForm, setNoteForm] = useState({ taxableAmount: '', cgstValue: '', cgstAmount: '', sgstValue: '', sgstAmount: '', igstValue: '', igstAmount: '' });
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [addTax, setAddTax] = useState(false);
  const [addTcs, setAddTcs] = useState(false);
  const [addBank, setAddBank] = useState(true);
  const [showTerms, setShowTerms] = useState(true);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const taxRate = 7;

  useEffect(() => {
    if (!selectedBooking) return;
    const liveInvoice = invoiceFromBooking(selectedBooking);
    setServices(liveInvoice.services);
    setPayments((selectedBooking.payments || []).flatMap((payment, sourcePaymentIndex) => (
      ['Client Payment', 'Receivable'].includes(payment.type) && payment.status === 'Paid' ? [{
        sourcePaymentIndex,
        date: String(payment.date || '').slice(0, 10), mode: payment.method || '', ref: payment.reference || payment.ref || '', amount: Number(payment.amount || 0),
        scope: normaliseClientPaymentScope(payment.clientPaymentScope), note: payment.remarks || '', bankName: payment.bankName || '', approvalStatus: payment.approvalStatus || '', attachment: payment.attachment || null, existing: true,
      }] : []
    )));
    setInvoiceDate(liveInvoice.date || today());
    setDueDate(liveInvoice.due || '');
    setCurrency(liveInvoice.currency || 'THB');
    setDiscountPercent(Number(selectedBooking.invoiceSettings?.discountPercent || 0));
    setRemarks(selectedBooking.invoiceSettings?.remarks || '');
    setInvoiceBankId(selectedBooking.invoiceSettings?.invoiceBankId || '');
    setInvoiceTermsTemplateId(selectedBooking.invoiceSettings?.invoiceTermsTemplateId || '');
    setAddBank(selectedBooking.invoiceSettings?.showBankDetails !== false);
    setShowTerms(selectedBooking.invoiceSettings?.showPaymentTerms !== false);
  }, [selectedBooking?.id]);
  useEffect(() => {
    let active = true;
    apiClient.get('/finance-masters/banks?activeOnly=true').then((response) => { if (active) setBanks((response.data || []).filter((bank) => bank.status === 'Active')); }).catch(() => { if (active) setBanks([]); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    apiClient.get('/terms-conditions').then((response) => {
      if (!active) return;
      setInvoiceTermsTemplates((response.data || []).filter((template) => (
        template.status === 'Active'
        && (template.section === 'Invoice Terms & Conditions' || (template.documentTypes || []).includes('Invoice'))
      )));
    }).catch(() => { if (active) setInvoiceTermsTemplates([]); });
    return () => { active = false; };
  }, []);

  const subtotal = Number(selectedInvoice?.subtotal ?? services.reduce((sum, row) => sum + Number(row.sell || 0), 0));
  const discount = Math.round(subtotal * Math.min(100, Math.max(0, Number(discountPercent || 0))) * 100) / 10000;
  const invoiceSettings = selectedBooking?.invoiceSettings || {};
  const selectedInvoiceBank = banks.find((bank) => String(bank.id || bank._id) === String(invoiceBankId)) || null;
  const selectedInvoiceTermsTemplate = invoiceTermsTemplates.find((template) => String(template.id || template._id) === String(invoiceTermsTemplateId)) || null;
  const invoiceSettingsForSave = () => ({
    ...(selectedBooking?.invoiceSettings || {}),
    invoiceType: 'Booking',
    invoiceCreatedAt: selectedBooking?.invoiceSettings?.invoiceCreatedAt || new Date().toISOString(),
    invoiceDate,
    dueDate,
    currency,
    discountPercent: Math.min(100, Math.max(0, Number(discountPercent || 0))),
    discount: 0,
    remarks,
    showBankDetails: addBank,
    showPaymentTerms: showTerms,
    invoiceBankId: selectedInvoiceBank ? (selectedInvoiceBank.id || selectedInvoiceBank._id) : '',
    invoiceBankDetails: selectedInvoiceBank ? { ...selectedInvoiceBank } : null,
    invoiceTermsTemplateId: selectedInvoiceTermsTemplate ? (selectedInvoiceTermsTemplate.id || selectedInvoiceTermsTemplate._id) : '',
    invoiceTermsTemplateName: selectedInvoiceTermsTemplate?.name || '',
    invoiceTermsHtml: selectedInvoiceTermsTemplate?.content || '',
  });
  const taxableAmount = Math.max(0, subtotal - discount);
  const vatPercent = Math.max(0, Number(invoiceSettings.vatPercent || 0));
  const taxAmt = invoiceSettings.taxTreatment === 'GST Include'
    ? taxableAmount * (vatPercent / (100 + vatPercent || 1))
    : taxableAmount * (vatPercent / 100);
  const bankCharges = Math.max(0, Number(invoiceSettings.bankCharges || 0));
  const total = invoiceSettings.taxTreatment === 'GST Include'
    ? taxableAmount + bankCharges
    : taxableAmount + taxAmt + bankCharges;
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const balance = total - totalPaid;
  const paymentScopes = useMemo(() => selectedBooking ? bookingClientPaymentScopes(selectedBooking) : [], [selectedBooking]);
  const paymentScope = (scope) => paymentScopes.find((item) => item.label === normaliseClientPaymentScope(scope)) || paymentScopes.find((item) => item.key === 'full');
  const editingPayment = editingPaymentIndex === null ? null : selectedBooking?.payments?.[editingPaymentIndex] || null;
  const editablePaymentScopes = useMemo(() => {
    if (!selectedBooking || editingPaymentIndex === null) return paymentScopes;
    // Editing treats the original receipt as temporarily removed, so its
    // entire amount is available again for a corrected date, amount or type.
    return bookingClientPaymentScopes({ ...selectedBooking, payments: (selectedBooking.payments || []).filter((_, index) => index !== editingPaymentIndex) });
  }, [selectedBooking, editingPaymentIndex, paymentScopes]);
  const editablePaymentScope = (scope) => editablePaymentScopes.find((item) => item.label === normaliseClientPaymentScope(scope)) || editablePaymentScopes.find((item) => item.key === 'full');
  const paymentMaximum = (scope = paymentForm.scope) => {
    return Number(editablePaymentScope(scope)?.remaining || 0);
  };

  const addService = () => setServices(s => [...s, { desc: '', date: '', cost: 0, sell: 0 }]);
  const removeService = (i) => setServices(s => s.filter((_, idx) => idx !== i));
  const updateService = (i, field, val) => setServices(s => s.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const addPayment = () => {
    if (!selectedBooking) return toast.error('Select a booking first.');
    const fullScope = paymentScope('Full Payment');
    if (!fullScope?.remaining) return toast.error('This booking invoice is already fully paid.');
    setEditingPaymentIndex(null);
    setPaymentForm({ date: invoiceDate, amount: String(fullScope.remaining || ''), scope: 'Full Payment', method: 'Bank Transfer', bankName: '', approvalStatus: 'Confirmed', remarks: '', attachmentFile: null });
    setShowPaymentEntry(true);
  };
  const editPayment = (payment) => {
    if (!selectedBooking || payment.sourcePaymentIndex === undefined) return;
    setEditingPaymentIndex(payment.sourcePaymentIndex);
    setPaymentForm({
      date: payment.date || invoiceDate,
      amount: String(Number(payment.amount || 0)),
      scope: normaliseClientPaymentScope(payment.scope),
      method: payment.mode || 'Bank Transfer',
      bankName: payment.bankName || '',
      approvalStatus: payment.approvalStatus || 'Confirmed',
      remarks: payment.note || '',
      attachmentFile: null,
    });
    setShowPaymentEntry(true);
  };
  const changePaymentScope = (scope) => {
    const selectedScope = editablePaymentScope(scope);
    setPaymentForm((current) => ({ ...current, scope: selectedScope?.label || 'Full Payment', amount: String(selectedScope?.remaining || '') }));
  };
  const stagePayment = async () => {
    if (savingPayment) return;
    const amount = Number(paymentForm.amount || 0);
    const selectedScope = editablePaymentScope(paymentForm.scope);
    if (!paymentForm.date || amount <= 0) return toast.error('Enter a valid payment date and amount.');
    if (!selectedScope || selectedScope.total <= 0) return toast.error('This payment type has no amount on the selected booking.');
    if (amount > paymentMaximum(selectedScope.label) + 0.0001) return toast.error(`Payment amount cannot exceed the ${selectedScope.label.toLowerCase()} balance.`);
    let attachment = null;
    try {
      setSavingPayment(true);
      if (paymentForm.attachmentFile) {
        const formData = new FormData();
        formData.append('paymentAttachment', paymentForm.attachmentFile);
        attachment = (await apiClient.upload('/uploads?folder=payments', formData)).data?.[0] || null;
      }
      const reference = editingPayment?.reference || editingPayment?.ref || `PAY-${Date.now()}`;
      const updatedPayment = {
        ...(editingPayment || {}),
        id: editingPayment?.id || `pay-${Date.now()}`,
        date: paymentForm.date, amount, method: paymentForm.method, reference, ref: reference,
        type: 'Client Payment', clientPaymentScope: selectedScope.label, related: selectedScope.label, supplier: customerForBooking(selectedBooking), status: 'Paid',
        approvalStatus: paymentForm.approvalStatus, bankName: paymentForm.method === 'Cash' ? '' : paymentForm.bankName,
        remarks: paymentForm.remarks.trim(), attachment: attachment || editingPayment?.attachment || null, allocations: editingPayment?.allocations || [],
      };
      await onSave(selectedBooking, {
        invoiceSettings: invoiceSettingsForSave(),
        payments: editingPayment
          ? (selectedBooking.payments || []).map((payment, index) => index === editingPaymentIndex ? updatedPayment : payment)
          : [...(selectedBooking.payments || []), updatedPayment],
      });
      setShowPaymentEntry(false);
      setEditingPaymentIndex(null);
      toast.success(editingPayment ? 'Payment updated.' : 'Payment recorded.');
    } catch (error) {
      toast.error(error.message || 'Unable to save payment.');
    } finally {
      setSavingPayment(false);
    }
  };
  const removePayment = (i) => setPayments(p => p.filter((_, idx) => idx !== i));
  const updatePayment = (i, field, val) => setPayments(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const previewCurrentInvoice = () => {
    if (!selectedBooking) return toast.error('Select a booking first.');
    onPreview({ ...selectedInvoice, booking: { ...selectedBooking, invoiceSettings: invoiceSettingsForSave() }, date: invoiceDate, due: dueDate, currency, subtotal, discount, tax: taxAmt, amount: total, paid: totalPaid, balance: Math.max(0, balance), services });
  };
  const shareClientPaymentLink = async () => {
    if (!selectedBooking || sharingPaymentLink) return;
    const selectedScope = paymentScope(shareScope);
    if (!selectedScope?.total) return toast.error('This payment type has no amount on the selected booking.');
    try {
      setSharingPaymentLink(true);
      const response = await apiClient.post(`/bookings/${encodeURIComponent(selectedBooking.id)}/client-payment-link`, { scope: selectedScope.label });
      const link = `${window.location.origin}/crm/payment/${response.data.token}`;
      setClientPaymentLink(link);
      await navigator.clipboard?.writeText(link);
      toast.success(`${selectedScope.label} link copied to clipboard.`);
    } catch (error) {
      toast.error(error.message || 'Unable to create the client payment link.');
    } finally {
      setSharingPaymentLink(false);
    }
  };
  const saveBookingInvoice = async () => {
    if (savingInvoice) return;
    if (!selectedBooking) return toast.error('Select a booking first.');
    const newPayments = payments.filter((payment) => !payment.existing);
    const invalid = newPayments.some((payment) => !payment.date || !payment.mode || Number(payment.amount || 0) <= 0);
    if (invalid) return toast.error('Complete the date, mode and amount for each new payment.');
    const newTotal = newPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    if (newTotal > Number(selectedInvoice.balance || 0) + 0.0001) return toast.error('Payment amount cannot exceed the booking invoice balance.');
    try {
      setSavingInvoice(true);
      const createdPayments = [];
      for (let index = 0; index < newPayments.length; index += 1) {
        const payment = newPayments[index];
        let attachment = null;
        if (payment.attachmentFile) {
          const formData = new FormData();
          formData.append('paymentAttachment', payment.attachmentFile);
          attachment = (await apiClient.upload('/uploads?folder=payments', formData)).data?.[0] || null;
        }
        const reference = `PAY-${Date.now()}-${index + 1}`;
        createdPayments.push({
          id: `pay-${Date.now()}-${index}`, date: payment.date, amount: Number(payment.amount), method: payment.mode,
          reference, ref: reference, type: 'Client Payment', clientPaymentScope: normaliseClientPaymentScope(payment.scope), related: normaliseClientPaymentScope(payment.scope), supplier: customerForBooking(selectedBooking),
          status: 'Paid', approvalStatus: payment.approvalStatus || 'Confirmed', bankName: payment.mode === 'Cash' ? '' : (payment.bankName || ''),
          remarks: payment.note.trim(), attachment, allocations: [],
        });
      }
      await onSave(selectedBooking, {
        invoiceSettings: invoiceSettingsForSave(),
        payments: [...(selectedBooking.payments || []), ...createdPayments],
      });
    } catch (error) {
      toast.error(error.message || 'Unable to save the booking invoice.');
    } finally {
      setSavingInvoice(false);
    }
  };
  const openInvoiceNote = (kind) => {
    if (!selectedBooking) return toast.error('Select a booking first.');
    setNoteForm({ taxableAmount: '', cgstValue: '', cgstAmount: '', sgstValue: '', sgstAmount: '', igstValue: '', igstAmount: '' });
    setNoteDialog(kind);
  };
  const updateNote = (key, value) => setNoteForm((current) => {
    const next = { ...current, [key]: value };
    const taxable = Number(next.taxableAmount || 0);
    if (key === 'taxableAmount' || key === 'cgstValue') next.cgstAmount = taxable && next.cgstValue !== '' ? (taxable * Number(next.cgstValue || 0) / 100).toFixed(2) : '';
    if (key === 'taxableAmount' || key === 'sgstValue') next.sgstAmount = taxable && next.sgstValue !== '' ? (taxable * Number(next.sgstValue || 0) / 100).toFixed(2) : '';
    if (key === 'taxableAmount' || key === 'igstValue') next.igstAmount = taxable && next.igstValue !== '' ? (taxable * Number(next.igstValue || 0) / 100).toFixed(2) : '';
    return next;
  });
  const noteTotal = ['taxableAmount', 'cgstAmount', 'sgstAmount', 'igstAmount'].reduce((sum, key) => sum + Number(noteForm[key] || 0), 0);
  const saveInvoiceNote = async () => {
    if (noteTotal <= 0) return toast.error('Enter a note amount greater than zero.');
    if (noteDialog === 'credit' && noteTotal > Number(selectedInvoice.amount || 0) + 0.0001) return toast.error('A credit note cannot exceed the current invoice amount.');
    const note = { id: `${noteDialog === 'credit' ? 'CN' : 'DN'}-${Date.now()}`, date: today(), taxableAmount: Number(noteForm.taxableAmount || 0), cgstValue: Number(noteForm.cgstValue || 0), cgstAmount: Number(noteForm.cgstAmount || 0), sgstValue: Number(noteForm.sgstValue || 0), sgstAmount: Number(noteForm.sgstAmount || 0), igstValue: Number(noteForm.igstValue || 0), igstAmount: Number(noteForm.igstAmount || 0), totalAmount: noteTotal, status: 'Applied' };
    await onSave(selectedBooking, {
      [noteDialog === 'credit' ? 'creditNotes' : 'debitNotes']: [...(selectedBooking[noteDialog === 'credit' ? 'creditNotes' : 'debitNotes'] || []), note],
    });
  };
  const cancelInvoice = async () => {
    if (!selectedBooking || !window.confirm('Cancel this booking invoice? Existing recorded payments will remain in the booking ledger.')) return;
    await onSave(selectedBooking, { invoiceSettings: { ...(selectedBooking.invoiceSettings || {}), invoiceStatus: 'Cancelled' } });
  };
  const runInvoiceAction = (label) => {
    if (label === 'Preview PDF' || label === 'Download PDF') return previewCurrentInvoice();
    if (label === 'Payment History') return document.getElementById('invoice-payment-details')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (label === 'Edit Invoice') return toast.success('You are already editing this booking invoice.');
    if (label === 'Duplicate Invoice') return toast.error('Only one invoice can be created for each booking.');
    if (label === 'Create Credit Note') return openInvoiceNote('credit');
    if (label === 'Create Debit Note') return openInvoiceNote('debit');
    if (label === 'Cancel Invoice') return cancelInvoice();
    if (label === 'Send WhatsApp') return setWhatsappOpen(true);
    toast.success(`${label} is available from the booking invoice.`);
  };

  const inputCls = "w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all";
  const labelCls = "block text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-0.5";
  const attachmentLabel = (attachment) => {
    if (!attachment) return 'No attachment';
    if (typeof attachment === 'string') return attachment.split('/').pop() || 'Attachment';
    return attachment.originalName || attachment.filename || attachment.name || attachment.url?.split('/').pop() || 'Attachment';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-slate-900/45 backdrop-blur-[4px]" onMouseDown={onClose}>
      <div className="w-full lg:w-[80vw] max-w-[1500px] bg-slate-50 rounded-2xl shadow-2xl overflow-hidden max-h-[calc(100dvh-1rem)] flex flex-col" onMouseDown={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5 sm:py-3.5 bg-white border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm leading-tight">{isNew ? 'Create Booking Invoice' : `Edit ${invoice.id}`}</h2>
              <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">Customer invoices only — agent or B2C; supplier invoices are not included.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2.5 sm:p-5">
          <div className="grid grid-cols-12 gap-2.5 sm:gap-3">

            {/* ── Section 2: Invoice Form ── */}
            <div className="col-span-12 lg:col-span-5 min-w-0">
              <SectionCard num="2" title="Create Invoice (From Quotation / Booking)">
                <div className="grid grid-cols-2 gap-2 mb-3 [&>div]:min-w-0">
                  <div>
                    <label className={labelCls}>Invoice Type *</label>
                    <div className={`${inputCls} flex items-center bg-slate-50 text-slate-600`}>Booking invoice</div>
                  </div>
                  <div>
                    <label className={labelCls}>Booking ID *</label>
                    <select value={bookingId} onChange={e => setBookingId(e.target.value)} className={inputCls}>
                      <option value="">Select booking</option>
                      {bookings.filter((booking) => booking.id === bookingId || !hasBookingInvoice(booking)).map((booking) => <option key={booking.id} value={booking.id}>{booking.id} · {customerForBooking(booking)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Agent *</label>
                    <input className={inputCls} value={selectedBooking ? customerForBooking(selectedBooking) : ''} readOnly placeholder="Agent / B2C customer" />
                  </div>
                  <div>
                    <label className={labelCls}>Invoice Date *</label>
                    <DateInput className={inputCls} value={invoiceDate} onChange={setInvoiceDate} />
                  </div>
                  <div>
                    <label className={labelCls}>Due Date *</label>
                    <DateInput className={inputCls} value={dueDate} onChange={setDueDate} />
                  </div>
                  <div>
                    <label className={labelCls}>Currency</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className={inputCls}>
                      <option>THB</option><option>USD</option><option>EUR</option><option>INR</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Discount (%)</label>
                    <input type="number" min="0" max="100" step="0.01" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="mb-2">
                  <label className={labelCls}>Remarks</label>
                  <textarea value={remarks} onChange={e => setRemarks(e.target.value)} className={`${inputCls} h-12 resize-none`} placeholder="Invoice remarks..." />
                </div>

                {/* Services */}
                <div className="mt-3">
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Include Services (Auto from Booking)</div>
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <div className="overflow-x-auto"><table className="w-full min-w-[330px] text-[10px]">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-[9px] font-bold text-slate-400">#</th>
                          <th className="px-2 py-1.5 text-left text-[9px] font-bold text-slate-400">Service</th>
                          <th className="px-2 py-1.5 text-right text-[9px] font-bold text-slate-400">Date</th>
                          <th className="px-2 py-1.5 text-right text-[9px] font-bold text-slate-400">Sell Amt</th>
                          <th className="px-1 py-1.5" />
                        </tr>
                      </thead>
                      <tbody>
                        {services.map((row, i) => (
                          <tr key={i} className="border-b border-slate-50">
                            <td className="px-2 py-1 text-slate-400">{i + 1}</td>
                            <td className="px-2 py-1"><input className="w-full min-w-[120px] text-[10px] outline-none font-medium text-slate-800 bg-transparent" value={row.desc} readOnly /></td>
                            <td className="px-2 py-1"><input className="w-20 text-[10px] outline-none text-right text-slate-500 bg-transparent" value={row.date} readOnly /></td>
                            <td className="px-2 py-1"><input className="w-20 text-[10px] outline-none text-right font-normal text-slate-800 bg-transparent" value={row.sell} readOnly /></td>
                            <td className="px-1 py-1" />
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                    <div className="px-2 py-1.5 flex flex-wrap gap-1.5 justify-between border-t border-slate-100 bg-slate-50/50">
                      <span className="flex items-center gap-1 text-slate-500 text-[10px] font-semibold"><FileCheck className="h-3 w-3" /> Services auto-filled from booking</span>
                      <div className="text-right space-y-0.5">
                        <div className="text-[9px] text-slate-500">Subtotal <span className="font-normal text-slate-800">฿{subtotal.toLocaleString()}</span></div>
                        <div className="text-[9px] text-slate-500">Discount ({Number(discountPercent || 0)}%) <span className="font-normal text-red-600">- {currency} {discount.toLocaleString()}</span></div>
                        <div className="text-[9px] font-normal text-slate-900">Total <span className="text-blue-700 font-normal">฿{total.toLocaleString()}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* ── Section 3: Payment Details ── */}
            <div id="invoice-payment-details" className="col-span-12 lg:col-span-7 min-w-0">
              <SectionCard num="3" title="Payment Details" className="scroll-mt-6" >
                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2.5 mb-3">
                  {!payments.length && <div className="py-5 text-center text-xs text-slate-400">No client payment has been recorded for this invoice.</div>}
                  {payments.map((row, i) => (
                    <div key={row.sourcePaymentIndex ?? i} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                      <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-extrabold text-slate-700">Payment #{i + 1} · {normaliseClientPaymentScope(row.scope)}</span>
                        <div className="flex items-center gap-2"><span className="text-sm font-extrabold text-emerald-700">{fmt(row.amount)}</span>{row.existing && <button type="button" onClick={() => editPayment(row)} className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-1 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-50"><Edit3 className="h-3 w-3" /> Edit</button>}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 md:grid-cols-4">
                        {[
                          ['Payment Date', formatInvoiceDate(row.date)],
                          ['Payment Type', normaliseClientPaymentScope(row.scope)],
                          ['Method', row.mode || '—'],
                          ['Payment Bank', row.bankName || '—'],
                          ['Approval', row.approvalStatus || '—'],
                          ['Reference No.', row.ref || '—'],
                          ['Attachment', attachmentLabel(row.attachment)],
                          ['Remarks', row.note || '—'],
                        ].map(([label, value]) => (
                          <div key={label} className={label === 'Remarks' || label === 'Attachment' ? 'md:col-span-2' : ''}>
                            <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
                            <div className="mt-0.5 truncate text-xs font-semibold text-slate-700" title={value}>{value}</div>
                          </div>
                        ))}
                        {!row.existing && <button onClick={() => removePayment(i)} className="self-end text-left text-xs font-semibold text-red-500 hover:text-red-700"><X className="mr-1 inline h-3 w-3" />Remove</button>}
                      </div>
                    </div>
                  ))}
                  <button onClick={addPayment} className="w-full flex items-center gap-1 justify-center py-1.5 text-blue-600 text-[10px] font-semibold hover:bg-blue-50 transition-colors border-t border-slate-100">
                    <PlusCircle className="h-3 w-3" /> Add Payment
                  </button>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="min-w-48 flex-1"><span className={labelCls}>Client payment link</span><select value={shareScope} onChange={event => { setShareScope(event.target.value); setClientPaymentLink(''); }} className={inputCls}>{CLIENT_PAYMENT_SCOPES.map((scope) => { const value = paymentScope(scope.label); return <option key={scope.key} value={scope.label} disabled={!value?.total}>{scope.label}{value?.total ? ` · ${fmt(value.remaining)} pending` : ' · unavailable'}</option>; })}</select></label>
                    <button disabled={!selectedBooking || sharingPaymentLink} onClick={shareClientPaymentLink} className="btn-primary h-[32px] px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60">{sharingPaymentLink ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}{sharingPaymentLink ? 'Creating…' : 'Create & Copy Link'}</button>
                  </div>
                  <p className="mt-2 text-[10px] text-blue-700">The shared client PDF shows this payment type’s total only—never the internal service breakdown.</p>
                  {clientPaymentLink && <div className="mt-2 flex gap-2"><input readOnly value={clientPaymentLink} className={`${inputCls} flex-1 bg-white text-[10px]`} /><button onClick={() => window.open(clientPaymentLink, '_blank', 'noopener,noreferrer')} className="btn-secondary h-[30px] px-3 text-xs">Open</button></div>}
                </div>
                {/* Totals */}
                <div className="space-y-1 text-xs">
                  {[
                    { label: 'Total Amount', val: fmt(total), bold: false },
                    { label: 'Total Received', val: fmt(totalPaid), bold: false, color: 'text-emerald-700' },
                    { label: 'Balance', val: fmt(balance), bold: true, color: balance > 0 ? 'text-red-700' : 'text-emerald-700' },
                  ].map(({ label, val, bold, color }) => (
                    <div key={label} className={`flex justify-between ${bold ? 'border-t border-slate-200 pt-1 text-slate-800' : 'text-slate-600'}`}>
                      <span className="font-normal">{label}</span>
                      <span className={`font-normal font-mono ${color || ''}`}>{val}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Section 4: Additional Options */}
              <SectionCard num="4" title="Additional Options" className="mt-3">
                <div className="mb-3 grid gap-2.5 border-b border-slate-100 pb-3 sm:grid-cols-2">
                  <label>
                    <span className={labelCls}>Bank details for client PDF</span>
                    <select value={invoiceBankId} onChange={(event) => setInvoiceBankId(event.target.value)} className={inputCls}>
                      <option value="">Select an active bank</option>
                      {banks.map((bank) => <option key={bank.id || bank._id} value={bank.id || bank._id}>{bank.name}{bank.currency ? ` · ${bank.currency}` : ''}</option>)}
                    </select>
                    <span className="mt-1 block text-[9px] text-slate-400">The selected active Bank Master record is saved as this invoice&apos;s bank-details snapshot.</span>
                  </label>
                  <label>
                    <span className={labelCls}>Payment terms for client PDF</span>
                    <select value={invoiceTermsTemplateId} onChange={(event) => setInvoiceTermsTemplateId(event.target.value)} className={inputCls}>
                      <option value="">Select active invoice payment terms</option>
                      {invoiceTermsTemplates.map((template) => <option key={template.id || template._id} value={template.id || template._id}>{template.name}</option>)}
                    </select>
                    <span className="mt-1 block text-[9px] text-slate-400">Only active Invoice Terms &amp; Conditions templates are available.</span>
                  </label>
                </div>
                {[
                  { label: 'Add Tax (GST / VAT)', val: addTax, set: setAddTax },
                  { label: 'Add TCS / TDS', val: addTcs, set: setAddTcs },
                  { label: 'Add Bank Details in PDF', val: addBank, set: setAddBank },
                  { label: 'Show Company Terms & Conditions', val: showTerms, set: setShowTerms },
                ].map(({ label, val, set }) => (
                  <label key={label} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer mb-1.5">
                    <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} className="accent-blue-600 h-3.5 w-3.5 rounded" />
                    <span>{label}</span>
                    {label.includes('Tax') && val && (
                      <span className="ml-auto flex items-center gap-1">
                        <input defaultValue={taxRate} className="w-10 rounded border border-slate-200 px-1 text-xs text-center outline-none" /> %
                      </span>
                    )}
                  </label>
                ))}
              </SectionCard>
            </div>

          </div>

          {/* Bottom action bar */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 mt-4 pt-3 border-t border-slate-200">
            <button disabled={savingInvoice || savingPayment} onClick={onClose} className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors disabled:cursor-not-allowed disabled:opacity-60">
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-1.5 sm:gap-2 min-w-0 [&>button]:justify-center [&>button]:px-2 sm:[&>button]:px-4 [&>button]:whitespace-nowrap">
              <button onClick={() => runInvoiceAction('Create Credit Note')} className="order-2 sm:order-none flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors">
                <FileCheck className="h-3.5 w-3.5" /> Credit Note
              </button>
              <div className="relative col-span-2 sm:col-span-1 order-3 sm:order-none">
                <button onClick={() => setShowMoreActions(current => !current)} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                  <MoreVertical className="h-3.5 w-3.5" /> More Actions
                </button>
                {showMoreActions && <div className="absolute bottom-10 max-sm:left-0 max-sm:right-0 sm:right-0 z-[60] sm:w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                  {[
                    { icon: Download, label: 'Download PDF', color: 'text-slate-700' },
                    { icon: History, label: 'Payment History', color: 'text-amber-700' },
                    { icon: AlertTriangle, label: 'Create Debit Note', color: 'text-pink-700' },
                    { icon: XCircle, label: 'Cancel Invoice', color: 'text-red-700' },
                  ].map(({ icon: Ic, label, color }) => <button key={label} onClick={() => { setShowMoreActions(false); runInvoiceAction(label); }} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 ${color}`}><Ic className="h-3.5 w-3.5" />{label}</button>)}
                </div>}
              </div>
              <button onClick={previewCurrentInvoice} className="order-4 sm:order-none flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 text-xs font-semibold hover:bg-blue-100 transition-colors">
                <Eye className="h-3.5 w-3.5" /> Preview PDF
              </button>
              <button className="order-4 sm:order-none flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-2 text-xs font-semibold hover:bg-green-100 transition-colors">
                <Mail className="h-3.5 w-3.5" /> Send Email
              </button>
              <button onClick={() => setWhatsappOpen(true)} className="order-4 sm:order-none col-span-2 sm:col-span-1 flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 text-xs font-semibold hover:bg-emerald-100 transition-colors">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </button>
              <button disabled={savingInvoice || savingPayment} onClick={saveBookingInvoice} className="order-2 sm:order-none flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 text-xs font-semibold hover:bg-slate-100 transition-colors disabled:cursor-not-allowed disabled:opacity-60">
                {savingInvoice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCheck className="h-3.5 w-3.5" />} {savingInvoice ? 'Saving…' : 'Save Invoice'}
              </button>
              <button disabled={savingInvoice || savingPayment} onClick={addPayment} className="order-1 sm:order-none col-span-2 sm:col-span-1 flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-5 py-2 text-xs font-bold hover:bg-indigo-700 transition-colors shadow disabled:cursor-not-allowed disabled:opacity-60">
                <CreditCard className="h-3.5 w-3.5" /> Record Payment
              </button>
            </div>
          </div>
        </div>
        {showPaymentEntry && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 backdrop-blur-[4px] p-4" onMouseDown={() => !savingPayment && setShowPaymentEntry(false)}>
            <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={e => e.stopPropagation()}>
              <div className="border-b border-slate-200 px-5 pt-4 pb-3">
                <h3 className="text-sm font-bold text-slate-800">{editingPayment ? 'Edit Client Invoice Payment' : 'Record Client Invoice Payment'}</h3>
                <p className="mt-1 text-[11px] text-slate-500">Choose the payment type first. The amount can be corrected up to that type’s remaining balance.</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    ['Invoice total', total, 'bg-blue-50 border-blue-200 text-blue-800'],
                    ['Already received', totalPaid, 'bg-emerald-50 border-emerald-200 text-emerald-800'],
                    ['Left to receive', Math.max(0, balance), 'bg-orange-50 border-orange-200 text-orange-800'],
                  ].map(([label, value, color]) => <div key={label} className={`rounded-lg border px-3 py-2 ${color}`}><div className="text-[9px] font-bold uppercase tracking-wide opacity-70">{label}</div><div className="mt-0.5 text-sm font-extrabold">{fmt(value)}</div></div>)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 px-5 py-4">
                <div><label className={labelCls}>Payment Type</label><select value={paymentForm.scope} onChange={event => changePaymentScope(event.target.value)} className={inputCls}>{CLIENT_PAYMENT_SCOPES.map((scope) => { const value = editablePaymentScope(scope.label); return <option key={scope.key} value={scope.label} disabled={!value?.total}>{scope.label}{value?.total ? ` · ${fmt(value.remaining)} pending` : ' · unavailable'}</option>; })}</select></div>
                <div><label className={labelCls}>Selected Payment Total</label><div className={`${inputCls} flex h-[42px] items-center bg-slate-50 text-slate-700`}>{editablePaymentScope(paymentForm.scope)?.label || 'Payment'} · {fmt(editablePaymentScope(paymentForm.scope)?.total || 0)}</div></div>
                <div><label className={labelCls}>Payment Date</label><DateInput value={paymentForm.date} onChange={value => setPaymentForm(current => ({ ...current, date: value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Amount (THB)</label><input type="number" min="0" max={paymentMaximum()} step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm(current => ({ ...current, amount: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Method</label><select value={paymentForm.method} onChange={e => setPaymentForm(current => ({ ...current, method: e.target.value, bankName: e.target.value === 'Cash' ? '' : current.bankName }))} className={inputCls}>{['Bank Transfer', 'Cash', 'Card', 'Other'].map(method => <option key={method}>{method}</option>)}</select></div>
                {paymentForm.method !== 'Cash' && <div><label className={labelCls}>BuildSoftware Payment Bank</label><select value={paymentForm.bankName} onChange={e => setPaymentForm(current => ({ ...current, bankName: e.target.value }))} className={inputCls}><option value="">Select payment bank (optional)</option>{banks.filter((bank) => bank.status === 'Active').map(bank => <option key={bank.id} value={bank.name}>{bank.name}</option>)}</select></div>}
                <div><label className={labelCls}>Approval</label><select value={paymentForm.approvalStatus} onChange={e => setPaymentForm(current => ({ ...current, approvalStatus: e.target.value }))} className={inputCls}><option>Confirmed</option><option>Pending</option></select></div>
                <label><span className={labelCls}>Attachment</span><input type="file" accept="image/*,application/pdf" onChange={e => setPaymentForm(current => ({ ...current, attachmentFile: e.target.files?.[0] || null }))} className={`${inputCls} h-[42px] py-2 text-xs`} /></label>
                <label className="col-span-2"><span className={labelCls}>Remarks</span><textarea value={paymentForm.remarks} onChange={e => setPaymentForm(current => ({ ...current, remarks: e.target.value }))} className={`${inputCls} min-h-[72px]`} placeholder="Optional payment note or transaction details" /></label>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
                {savingPayment && <span className="mr-auto flex items-center gap-1.5 text-xs font-medium text-blue-700"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving payment…</span>}
                <button disabled={savingPayment} onClick={stagePayment} className="btn-primary flex h-9 min-w-[120px] items-center justify-center gap-1.5 px-6 text-xs disabled:cursor-not-allowed disabled:opacity-60">{savingPayment && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{savingPayment ? 'Saving…' : editingPayment ? 'Update Payment' : 'Save Payment'}</button>
                <button disabled={savingPayment} onClick={() => { setShowPaymentEntry(false); setEditingPaymentIndex(null); }} className="btn-secondary h-9 min-w-[100px] px-6 text-xs disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
              </div>
            </div>
          </div>
        )}
        {noteDialog && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 backdrop-blur-[4px] p-4" onMouseDown={() => setNoteDialog('')}>
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={e => e.stopPropagation()}>
              <div className={`px-5 py-4 ${noteDialog === 'credit' ? 'bg-rose-50 border-b border-rose-100' : 'bg-pink-50 border-b border-pink-100'}`}>
                <h3 className="text-sm font-extrabold text-slate-800">Create {noteDialog === 'credit' ? 'Credit' : 'Debit'} Note</h3>
                <p className="mt-1 text-[11px] text-slate-500">{noteDialog === 'credit' ? 'This reduces' : 'This increases'} the live booking invoice balance.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 p-5">
                {[['cgstValue', 'CGST Value'], ['cgstAmount', 'CGST Amount'], ['sgstValue', 'SGST Value'], ['sgstAmount', 'SGST Amount'], ['igstValue', 'IGST Value'], ['igstAmount', 'IGST Amount'], ['taxableAmount', 'Taxable Amount']].map(([key, label]) => <label key={key}><span className={labelCls}>{label}{key.endsWith('Value') ? ' (%)' : ''}</span><input type="number" min="0" step="0.01" readOnly={key.endsWith('Amount')} value={noteForm[key]} onChange={e => updateNote(key, e.target.value)} className={`${inputCls} ${key.endsWith('Amount') ? 'bg-slate-50 text-slate-500' : ''}`} placeholder="0.00" /></label>)}
                <label><span className={labelCls}>Total Amount</span><input type="number" readOnly value={noteTotal ? noteTotal.toFixed(2) : ''} className={`${inputCls} bg-slate-50 text-slate-700`} placeholder="0.00" /></label>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
                <button onClick={() => setNoteDialog('')} className="btn-secondary h-9 px-5 text-xs">Close</button>
                <button onClick={saveInvoiceNote} className="btn-primary h-9 px-5 text-xs">Save {noteDialog === 'credit' ? 'Credit' : 'Debit'} Note</button>
              </div>
            </div>
          </div>
        )}
      </div>
      {whatsappOpen && <WhatsAppSendDialog
        title={`Send invoice ${selectedInvoice?.id || ''}`}
        recipientName={selectedInvoice?.guest || selectedInvoice?.agent}
        recipientPhone={whatsappPhoneForBooking(selectedBooking)}
        initialMessage={whatsappMessageForInvoice(selectedInvoice)}
        onClose={() => setWhatsappOpen(false)}
      />}
    </div>
  );
}

function SectionCard({ num, title, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white overflow-hidden ${className}`}>
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#203664] text-white text-[10px] font-extrabold">{num}</div>
        <span className="text-xs font-bold text-slate-700">{title}</span>
      </div>
      <div className="p-2.5 sm:p-3.5">{children}</div>
    </div>
  );
}

// ─── Template Card ─────────────────────────────────────────────────────────

function TemplateCard({ tpl, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(tpl.id)}
      className={`relative flex-shrink-0 w-44 rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 ${selected === tpl.id ? 'border-blue-500 shadow-lg shadow-blue-200/50' : 'border-slate-200'}`}
    >
      {/* Mini template preview */}
      <div className={`bg-gradient-to-br ${tpl.color} p-2.5`}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-white text-[8px] font-bold">BUILDSOFTWARE</div>
          <div className="bg-white/20 text-white text-[7px] font-extrabold px-1.5 py-0.5 rounded">{tpl.tag}</div>
        </div>
        <div className="text-white font-black text-[13px] tracking-tight">{tpl.label}</div>
        <div className="text-white/60 text-[7px] mt-0.5">Thailand</div>
      </div>
      <div className="bg-white p-2 space-y-1">
        {[40, 60, 50, 40, 55].map((w, i) => (
          <div key={i} className="flex gap-1 items-center">
            <div className="h-1.5 bg-slate-200 rounded-full" style={{ width: `${w}%` }} />
            <div className="h-1.5 bg-slate-100 rounded-full flex-1" />
          </div>
        ))}
        <div className="mt-2 flex justify-end">
          <div className="h-2 bg-blue-200 rounded-full w-16" />
        </div>
      </div>
      {/* Overlay selected check */}
      {selected === tpl.id && (
        <div className="absolute top-1.5 right-1.5">
          <CheckCircle className="h-4 w-4 text-blue-500 bg-white rounded-full" />
        </div>
      )}
      <div className="px-2 pb-2 bg-white">
        <div className="text-[10px] font-bold text-slate-700 text-center">{tpl.name}</div>
      </div>
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function InvoicesPayments() {
  const [activeLedgerTab, setActiveLedgerTab] = useState('booking');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('All Agents');
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [editInvoice, setEditInvoice] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(2);
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState(null);
  const [actionInvoice, setActionInvoice] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [bookingOptions, setBookingOptions] = useState([]);
  const [agentOptions, setAgentOptions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState({ totalInvoiced: 0, totalReceived: 0, totalOutstanding: 0, invoiceCount: 0 });
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(DEFAULT_COMPANY_PROFILE);
  const [proformas, setProformas] = useState([]);
  const [proformaQuotations, setProformaQuotations] = useState([]);
  const [showProformaModal, setShowProformaModal] = useState(false);
  const [savingProforma, setSavingProforma] = useState(false);
  const [editingProforma, setEditingProforma] = useState(null);
  const [proformaForm, setProformaForm] = useState(emptyProformaForm);
  const [whatsappInvoice, setWhatsappInvoice] = useState(null);

  useEffect(() => {
    let active = true;
    apiClient.get('/settings')
      .then((response) => { if (active) setCompany(companyProfile(response.data?.company || {})); })
      .catch(() => { /* The built-in company profile remains a safe print fallback. */ });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    apiClient.get('/accounts/proforma-invoices')
      .then((response) => { if (active) setProformas(response.data || []); })
      .catch(() => { if (active) setProformas([]); });
    return () => { active = false; };
  }, [reloadKey]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(pagination.page), limit: String(pagination.limit), status: statusFilter, agent: agentFilter });
        if (search.trim()) params.set('search', search.trim());
        if (fromDate) params.set('fromDate', fromDate);
        if (toDate) params.set('toDate', toDate);
        const response = await apiClient.get(`/accounts/booking-invoices?${params.toString()}`);
        if (!active) return;
        setInvoices(response.data || []);
        setPagination((current) => ({ ...current, ...(response.pagination || {}) }));
        setAgentOptions(response.filterOptions?.agents || []);
        setSummary(response.summary || { totalInvoiced: 0, totalReceived: 0, totalOutstanding: 0, invoiceCount: 0 });
      } catch (error) {
        if (active) { toast.error(error.message || 'Unable to load booking invoices.'); setInvoices([]); }
      } finally {
        if (active) setLoading(false);
      }
    }, search.trim() ? 300 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [pagination.page, pagination.limit, statusFilter, agentFilter, fromDate, toDate, search, reloadKey]);

  const openCreateInvoice = async () => {
    setActiveLedgerTab('booking');
    setShowCreateModal(true);
    try {
      const response = await apiClient.get('/accounts/booking-invoice-options');
      setBookingOptions(response.data || []);
    } catch (error) {
      toast.error(error.message || 'Unable to load bookings for invoice creation.');
      setBookingOptions([]);
    }
  };
  const openCreateProforma = async () => {
    setActiveLedgerTab('proforma');
    setEditingProforma(null);
    setProformaForm(emptyProformaForm());
    setShowProformaModal(true);
    try {
      const response = await apiClient.get('/accounts/proforma-quotation-options');
      setProformaQuotations(response.data || []);
    } catch (error) {
      toast.error(error.message || 'Unable to load quotations for proforma creation.');
      setProformaQuotations([]);
    }
  };
  const selectProformaQuotation = (quotationId) => {
    const quotation = proformaQuotations.find((item) => item.id === quotationId);
    setProformaForm((current) => ({
      ...current, quotationId,
      customer: quotation?.agentName || quotation?.b2cName || quotation?.clientName || quotation?.guestName || '',
      guest: quotation?.guestName || '', services: quotation ? quotationProformaServices(quotation) : [], quoteTotal: Number(quotation?.pricing?.totalSelling || 0),
      currency: quotation?.currency || 'THB',
    }));
  };
  const updateProformaService = (id, patch) => setProformaForm((current) => ({
    ...current,
    services: current.services.map((service) => service.id === id ? { ...service, ...patch } : service),
  }));
  const removeProformaService = (id) => setProformaForm((current) => ({ ...current, services: current.services.filter((service) => service.id !== id) }));
  const openEditProforma = async (record) => {
    setActiveLedgerTab('proforma');
    setEditingProforma(record);
    setProformaForm({
      source: record.source === 'quotation' ? 'quotation' : 'manual', quotationId: record.quotationId || '',
      customer: record.customer || '', guest: record.guest || '',
      services: (record.services || []).map((service, index) => ({ id: String(service.id || `saved-service-${index}`), desc: service.desc || service.name || '', date: String(service.date || '').slice(0, 10), amount: Number(service.amount ?? service.sell ?? 0) || '' })),
      date: String(record.date || today()).slice(0, 10), dueDate: String(record.dueDate || record.date || today()).slice(0, 10), currency: record.currency || 'THB', quoteTotal: Number(record.amount || 0), remarks: record.remarks || '',
    });
    setShowProformaModal(true);
    if (record.source !== 'quotation' || proformaQuotations.length) return;
    try {
      const response = await apiClient.get('/accounts/proforma-quotation-options');
      setProformaQuotations(response.data || []);
    } catch {
      setProformaQuotations([]);
    }
  };
  const proformaInvoice = (record) => ({
    id: record.id, type: 'Proforma', bookingId: record.quotationNumber || record.quotationId || '—', agent: record.customer || 'Direct client', guest: record.guest || '—',
    date: record.date, due: record.dueDate || record.date, amount: Number(record.amount || 0), paid: 0, balance: Number(record.amount || 0),
    status: record.status || 'Sent', currency: record.currency || 'THB',
    services: (record.services || []).map((service) => ({ desc: service.desc || service.name || 'Service', date: service.date || '', sell: Number(service.amount ?? service.sell ?? 0) })),
    subtotal: Number(record.amount || 0), discount: 0, tax: 0, bankCharges: 0, remarks: record.remarks || '',
  });
  const saveProforma = async () => {
    if (savingProforma) return;
    if (proformaForm.source === 'quotation' && !proformaForm.quotationId) return toast.error('Select a quotation for this proforma invoice.');
    if (!proformaForm.customer.trim()) return toast.error('Enter the customer or agent name.');
    if (proformaForm.source === 'manual' && !proformaForm.services.some((service) => String(service.desc || '').trim() && Number(service.amount || 0) > 0)) return toast.error('Add at least one manual service with a price.');
    const quotation = proformaQuotations.find((item) => item.id === proformaForm.quotationId);
    try {
      setSavingProforma(true);
      const payload = { ...proformaForm, quotationNumber: quotation?.id || '' };
      const response = editingProforma
        ? await apiClient.put(`/accounts/proforma-invoices/${encodeURIComponent(editingProforma.id)}`, payload)
        : await apiClient.post('/accounts/proforma-invoices', payload);
      const created = response.data;
      setProformas((current) => editingProforma ? current.map((record) => record.id === created.id ? created : record) : [created, ...current]);
      setShowProformaModal(false);
      setEditingProforma(null);
      setPreviewInvoice(proformaInvoice(created));
      toast.success(editingProforma ? 'Proforma invoice updated.' : 'Proforma invoice saved as a separate record.');
    } catch (error) {
      toast.error(error.message || 'Unable to save proforma invoice.');
    } finally {
      setSavingProforma(false);
    }
  };
  const saveBookingInvoice = async (booking, patch) => {
    try {
      await apiClient.put(`/bookings/${encodeURIComponent(booking.id)}`, { ...booking, ...patch });
      setReloadKey((key) => key + 1);
      setEditInvoice(null);
      setShowCreateModal(false);
      toast.success('Booking invoice and client payments saved.');
    } catch (error) {
      toast.error(error.message || 'Unable to save the booking invoice.');
    }
  };
  const closeInvoiceActionMenu = () => {
    setOpenActionMenu(null);
    setActionMenuPosition(null);
    setActionInvoice(null);
  };
  const deleteProforma = async (record) => {
    if (!record || !window.confirm(`Delete proforma ${record.id}? This only removes the separate proforma record.`)) return;
    try {
      await apiClient.delete(`/accounts/proforma-invoices/${encodeURIComponent(record.id)}`);
      setProformas((current) => current.filter((item) => item.id !== record.id));
      setPreviewInvoice((current) => current?.id === record.id ? null : current);
      setEditingProforma((current) => current?.id === record.id ? null : current);
      setShowProformaModal(false);
      toast.success('Proforma invoice deleted.');
    } catch (error) {
      toast.error(error.message || 'Unable to delete the proforma invoice.');
    }
  };
  const deleteBookingInvoice = async (invoice) => {
    const bookingId = invoice?.bookingId || invoice?.booking?.id;
    if (!bookingId || !window.confirm(`Delete booking invoice ${invoice?.id || ''}? The booking and all recorded payments will remain.`)) return;
    try {
      await apiClient.delete(`/accounts/booking-invoices/${encodeURIComponent(bookingId)}`);
      setPreviewInvoice((current) => current?.id === invoice.id ? null : current);
      setEditInvoice(null);
      setReloadKey((key) => key + 1);
      toast.success('Booking invoice deleted. The booking and payments were kept.');
    } catch (error) {
      toast.error(error.message || 'Unable to delete the booking invoice.');
    }
  };
  const runBookingInvoiceAction = (label) => {
    const invoice = actionInvoice;
    closeInvoiceActionMenu();
    if (!invoice) return;
    if (label === 'Delete') return deleteBookingInvoice(invoice);
    if (label === 'Preview PDF' || label === 'Download PDF') return setPreviewInvoice(invoice);
    if (label === 'Send WhatsApp') return setWhatsappInvoice(invoice);
    toast(`${label} is available from the invoice preview.`);
  };

  const totalInvoiced = summary.totalInvoiced;
  const totalReceived = summary.totalReceived;
  const totalOutstanding = summary.totalOutstanding;
  const totalOverdue = statusFilter === 'Overdue' ? summary.totalOutstanding : invoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + i.balance, 0);
  const overdueCount = statusFilter === 'Overdue' ? summary.invoiceCount : invoices.filter(i => i.status === 'Overdue').length;

  const inputCls = "h-7 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all";

  return (
    <div className="space-y-3 sm:space-y-3.5 p-3 sm:p-5 pb-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm"><FileText className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h1 className="page-title text-[18px] sm:text-[22px] font-extrabold text-slate-900">Invoices & Payments</h1>
            <p className="mt-0.5 text-xs text-slate-500">Accounts <ChevronRight className="inline h-3 w-3" /> Invoices & Payments</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 sm:flex-wrap [&>button]:whitespace-nowrap">
          {activeLedgerTab === 'booking' && <button type="button" title="Filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(o => !o)} className={`lg:hidden relative grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-xl border ${filtersOpen ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}><SlidersHorizontal className="h-4 w-4" />{(typeFilter !== 'All Types' || statusFilter !== 'All Status' || agentFilter !== 'All Agents' || search || fromDate || toDate) && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white" />}</button>}
          <button
            onClick={openCreateProforma}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 text-white px-2.5 sm:px-3 py-2 text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
          >
            <Plus className="h-3.5 w-3.5" /> Proforma<span className="hidden sm:inline">&nbsp;Invoice</span>
          </button>
          <button
            onClick={openCreateInvoice}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 text-white px-2.5 sm:px-3 py-2 text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
          >
            <Plus className="h-3.5 w-3.5" /> Booking<span className="hidden sm:inline">&nbsp;Invoice</span>
          </button>
          {/* Manual Invoice and Tax / GST Invoice are intentionally paused until
              their separate compliance workflows are introduced. */}
          <button className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 px-2.5 sm:px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors">
            <span className="hidden sm:inline">More</span> <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="flex items-end gap-1 border-b border-slate-200 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button type="button" onClick={() => setActiveLedgerTab('booking')} className={`shrink-0 whitespace-nowrap rounded-t-lg px-3 sm:px-4 py-2 text-xs font-bold transition-colors ${activeLedgerTab === 'booking' ? 'border border-b-white border-indigo-200 bg-white text-indigo-700 -mb-px' : 'text-slate-500 hover:bg-slate-100'}`}>Booking Invoices</button>
        <button type="button" onClick={() => setActiveLedgerTab('proforma')} className={`shrink-0 whitespace-nowrap rounded-t-lg px-3 sm:px-4 py-2 text-xs font-bold transition-colors ${activeLedgerTab === 'proforma' ? 'border border-b-white border-blue-200 bg-white text-blue-700 -mb-px' : 'text-slate-500 hover:bg-slate-100'}`}>Proforma Invoices <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px]">{proformas.length}</span></button>
      </div>

      {activeLedgerTab === 'proforma' && (
        <div className="rounded-xl border border-blue-100 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50/60 px-3 py-2">
            <div><h2 className="text-sm font-bold text-slate-800">Proforma records</h2><p className="text-[10px] text-slate-500">Separate commercial records; they do not change booking accounts or payment balances.</p></div>
            <button onClick={openCreateProforma} className="text-xs font-semibold text-blue-700 hover:text-blue-800">+ New Proforma</button>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{['Proforma No.', 'Source', 'Customer', 'Quotation', 'Date', 'Currency', 'Amount', ''].map((label) => <th key={label} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide">{label}</th>)}</tr></thead><tbody>{proformas.map((record) => <tr key={record.id} className="border-t border-slate-100 hover:bg-blue-50"><td className="px-3 py-2 font-bold text-blue-700">{record.id}</td><td className="px-3 py-2 capitalize text-slate-600">{record.source}</td><td className="px-3 py-2 font-medium text-slate-700">{record.customer}</td><td className="px-3 py-2 text-slate-600">{record.quotationNumber || 'Manual'}</td><td className="px-3 py-2 text-slate-500">{formatInvoiceDate(record.date)}</td><td className="px-3 py-2 text-slate-600">{record.currency}</td><td className="px-3 py-2 font-bold text-slate-800">{fmtAmount(record.amount, record.currency)}</td><td className="px-3 py-2"><div className="flex items-center gap-1"><button onClick={() => setPreviewInvoice(proformaInvoice(record))} className="rounded-md p-1 text-blue-700 hover:bg-blue-100" title="Preview proforma"><Eye className="h-3.5 w-3.5" /></button><button onClick={() => openEditProforma(record)} className="rounded-md p-1 text-indigo-700 hover:bg-indigo-100" title="Edit proforma"><Edit3 className="h-3.5 w-3.5" /></button><button onClick={() => deleteProforma(record)} className="rounded-md p-1 text-rose-600 hover:bg-rose-100" title="Delete proforma"><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>)}{!proformas.length && <tr><td colSpan="8" className="px-3 py-12 text-center text-xs text-slate-400">No proforma invoices have been created yet.</td></tr>}</tbody></table></div>
        </div>
      )}

      {activeLedgerTab === 'booking' && <>
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2.5 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
        <StatCard icon={FileText} label="Total Invoiced" value={fmt(totalInvoiced)} sub="(This Month)" color="text-blue-700" iconBg="bg-blue-50" />
        <StatCard icon={CheckCircle} label="Received" value={fmt(totalReceived)} sub={`(${totalInvoiced ? Math.round(totalReceived / totalInvoiced * 100) : 0}%)`} color="text-emerald-700" iconBg="bg-emerald-50" />
        <StatCard icon={Clock} label="Outstanding" value={fmt(totalOutstanding)} sub={`(${totalInvoiced ? Math.round(totalOutstanding / totalInvoiced * 100) : 0}%)`} color="text-amber-700" iconBg="bg-amber-50" />
        <StatCard icon={AlertCircle} label="Overdue" value={fmt(totalOverdue)} sub={`(${overdueCount} Invoices)`} color="text-red-700" iconBg="bg-red-50" />
        <StatCard icon={BarChart2} label="Matching Invoices" value={summary.invoiceCount} sub="Current server-side filters" color="text-violet-700" iconBg="bg-violet-50" />
      </div>

      {/* ── Filters ── */}
      <div className={`${filtersOpen ? 'grid' : 'hidden'} grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 [&>*]:min-w-0 max-lg:[&_select]:!w-full`}>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPagination(current => ({ ...current, page: 1 })); }} className={inputCls}>
          {INVOICE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <div className="flex items-center gap-1 col-span-2 lg:col-span-1">
          <DateInput value={fromDate} onChange={value => { setFromDate(value); setPagination(current => ({ ...current, page: 1 })); }} className={inputCls} />
          <span className="text-slate-400 text-xs">—</span>
          <DateInput value={toDate} onChange={value => { setToDate(value); setPagination(current => ({ ...current, page: 1 })); }} className={inputCls} />
        </div>
        <select value={agentFilter} onChange={e => { setAgentFilter(e.target.value); setPagination(current => ({ ...current, page: 1 })); }} className={`${inputCls} w-[130px]`}>
          <option>All Agents</option>
          {agentOptions.map(a => <option key={a}>{a}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPagination(current => ({ ...current, page: 1 })); }} className={`${inputCls} w-[120px]`}>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <label className="relative flex-1 lg:min-w-[180px] col-span-2 lg:col-span-1">
          <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-slate-400" />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPagination(current => ({ ...current, page: 1 })); }}
            placeholder="Search invoice, booking, guest..."
            className={`${inputCls} pl-8 w-full`}
          />
        </label>
        <button onClick={() => {}} className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
          <Search className="h-3 w-3" /> Search
        </button>
        <button onClick={() => { setTypeFilter('All Types'); setStatusFilter('All Status'); setAgentFilter('All Agents'); setSearch(''); setFromDate(''); setToDate(''); setPagination(current => ({ ...current, page: 1 })); }} className="h-7 px-3 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200 transition-colors">
          Reset
        </button>
      </div>

      {/* ── Invoice Table ── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="bg-[#203664] text-white">
              <tr>
                {['', 'Invoice No.', 'Type', 'Booking ID', 'Agent / Customer', 'Guest / Group', 'Invoice Date', 'Due Date', 'Amount', 'Paid', 'Balance', 'Status', 'Action'].map((h, i) => (
                  <th key={h} data-sort-header={h && h !== 'Action' && h !== '' ? 'true' : undefined} className={`px-3 py-2.5 text-left font-bold whitespace-nowrap ${i === 0 ? 'w-8' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="13" className="py-14 text-center text-slate-400"><RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />Loading booking invoices…</td></tr>}
              {!loading && invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="group border-b border-slate-100 cursor-pointer hover:bg-blue-50 transition-colors"
                  onClick={() => setPreviewInvoice(inv)}
                >
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="accent-blue-600 h-3.5 w-3.5 rounded" />
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-bold text-blue-700 hover:underline cursor-pointer">{inv.id}</span>
                  </td>
                  <td className="px-3 py-2"><TypeBadge type={inv.type} /></td>
                  <td className="px-3 py-2">
                    {inv.bookingId !== '-' ? (
                      <span className="font-bold text-blue-600">{inv.bookingId}</span>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-700">{inv.agent}</td>
                  <td className="px-3 py-2 text-slate-600">{inv.guest}</td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{formatInvoiceDate(inv.date)}</td>
                  <td className={`px-3 py-2 whitespace-nowrap font-medium ${inv.status === 'Overdue' ? 'text-red-600' : 'text-slate-500'}`}>{formatInvoiceDate(inv.due)}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-normal text-slate-800">
                    <span className={inv.amount < 0 ? 'text-red-700' : ''}>฿{Math.abs(inv.amount).toLocaleString()}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-normal text-emerald-700">
                    {inv.paid ? `฿${Math.abs(inv.paid).toLocaleString()}` : <span className="text-slate-400">฿0</span>}
                  </td>
                  <td className={`px-3 py-2 whitespace-nowrap font-normal ${inv.balance > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                    {fmt(inv.balance)}
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={inv.status} /></td>
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1 transition-opacity">
                      <button
                        onClick={() => setPreviewInvoice(inv)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                        title="Preview"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setEditInvoice(inv)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <div>
                        <button
                          onClick={(event) => {
                            if (openActionMenu === inv.id) {
                              closeInvoiceActionMenu();
                              return;
                            }
                            const rect = event.currentTarget.getBoundingClientRect();
                            const menuHeight = 240;
                            const opensUpward = rect.bottom + menuHeight > window.innerHeight - 8;
                            setActionMenuPosition({
                              top: opensUpward ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4,
                              right: Math.max(8, window.innerWidth - rect.right),
                            });
                            setOpenActionMenu(inv.id);
                            setActionInvoice(inv);
                          }}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !invoices.length && (
                <tr>
                  <td colSpan="13" className="py-14 text-center text-slate-400">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <div className="text-sm font-semibold">No invoices match the current filters.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <span>Showing {invoices.length ? ((pagination.page - 1) * pagination.limit) + 1 : 0}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} invoices</span>
          <div className="flex items-center gap-2">
            <button disabled={pagination.page <= 1 || loading} onClick={() => setPagination(current => ({ ...current, page: current.page - 1 }))} className="rounded border border-slate-200 bg-white px-2.5 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
            <span>Page {pagination.page} / {pagination.totalPages}</span>
            <button disabled={pagination.page >= pagination.totalPages || loading} onClick={() => setPagination(current => ({ ...current, page: current.page + 1 }))} className="rounded border border-slate-200 bg-white px-2.5 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* ── Invoice Templates ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#203664] text-white text-[10px] font-extrabold">T</div>
          <h2 className="text-sm font-bold text-slate-700">Invoice Templates</h2>
          <span className="text-xs text-slate-400 ml-1">— Click a template to select it for new invoices</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {TEMPLATES.map(tpl => (
            <TemplateCard key={tpl.id} tpl={tpl} selected={selectedTemplate} onSelect={setSelectedTemplate} />
          ))}
        </div>
      </div>
      </>}

      {/* ── Modals ── */}
      {previewInvoice && (
        <PreviewModal
          invoice={previewInvoice}
          company={company}
          onClose={() => setPreviewInvoice(null)}
          onEdit={(inv) => { if (inv.type === 'Proforma') { setPreviewInvoice(null); openEditProforma(proformas.find((record) => record.id === inv.id) || inv); return; } setPreviewInvoice(null); setEditInvoice(inv); }}
          onDelete={(inv) => inv.type === 'Proforma' ? deleteProforma(proformas.find((record) => record.id === inv.id) || inv) : deleteBookingInvoice(inv)}
        />
      )}
      {(editInvoice || showCreateModal) && (
        <EditModal
          invoice={editInvoice}
          bookings={editInvoice?.booking ? [editInvoice.booking] : bookingOptions}
          onClose={() => { setEditInvoice(null); setShowCreateModal(false); }}
          onPreview={(invoiceToPreview) => setPreviewInvoice(invoiceToPreview)}
          onSave={saveBookingInvoice}
        />
      )}
      {showProformaModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 backdrop-blur-[4px] p-2 sm:p-4" onMouseDown={() => !savingProforma && (setShowProformaModal(false), setEditingProforma(null))}>
          <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="border-b border-slate-200 px-3 py-2.5 sm:px-5 sm:py-4 flex-shrink-0"><h2 className="text-sm sm:text-base font-extrabold text-slate-900">{editingProforma ? 'Edit Proforma Invoice' : 'Create Proforma Invoice'}</h2><p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs leading-snug text-slate-500 line-clamp-2 sm:line-clamp-none">Quotation proformas are refreshed from their quotation. Manual proformas calculate their total from the service rows below and never affect booking accounts.</p></div>
            <div className="grid flex-1 min-h-0 grid-cols-2 gap-2 sm:gap-3 overflow-y-auto p-3 sm:p-5 [&_.form-label]:text-[10px] [&_.form-label]:mb-0.5 [&_.form-input]:h-8 [&_.form-select]:h-8 [&_.form-input]:text-xs [&_.form-select]:text-xs">
              <label className="col-span-2"><span className="form-label">Source</span><select disabled={Boolean(editingProforma)} value={proformaForm.source} onChange={(event) => setProformaForm((current) => ({ ...emptyProformaForm(), source: event.target.value, date: current.date, dueDate: current.dueDate }))} className="form-select disabled:bg-slate-50"><option value="quotation">From quotation</option><option value="manual">Manual proforma</option></select>{editingProforma && <span className="mt-1 block text-[10px] text-slate-400">The source is locked after creation.</span>}</label>
              {proformaForm.source === 'quotation' && <label className="col-span-2"><span className="form-label">Quotation *</span><select disabled={Boolean(editingProforma)} value={proformaForm.quotationId} onChange={(event) => selectProformaQuotation(event.target.value)} className="form-select disabled:bg-slate-50"><option value="">Select quotation</option>{proformaQuotations.map((quotation) => <option key={quotation.id} value={quotation.id}>{quotation.id} · {quotation.agentName || quotation.b2cName || quotation.guestName || 'Direct client'} · {fmtAmount(quotation?.pricing?.totalSelling || 0, quotation.currency || 'THB')}</option>)}</select></label>}
              <label><span className="form-label">Customer / Agent *</span><input value={proformaForm.customer} readOnly={proformaForm.source === 'quotation'} onChange={(event) => setProformaForm((current) => ({ ...current, customer: event.target.value }))} className={`form-input ${proformaForm.source === 'quotation' ? 'bg-slate-50' : ''}`} /></label>
              <label><span className="form-label">Guest / Group</span><input value={proformaForm.guest} readOnly={proformaForm.source === 'quotation'} onChange={(event) => setProformaForm((current) => ({ ...current, guest: event.target.value }))} className={`form-input ${proformaForm.source === 'quotation' ? 'bg-slate-50' : ''}`} /></label>
              <label><span className="form-label">Proforma Date *</span><DateInput value={proformaForm.date} onChange={(value) => setProformaForm((current) => ({ ...current, date: value, dueDate: current.dueDate || value }))} className="form-input" /></label>
              <label><span className="form-label">Due Date</span><DateInput value={proformaForm.dueDate} onChange={(value) => setProformaForm((current) => ({ ...current, dueDate: value }))} className="form-input" /></label>
              <label><span className="form-label">Currency</span><select disabled={proformaForm.source === 'quotation'} value={proformaForm.currency} onChange={(event) => setProformaForm((current) => ({ ...current, currency: event.target.value }))} className="form-select disabled:bg-slate-50"><option>THB</option><option>USD</option><option>INR</option><option>EUR</option></select></label>
              <div><span className="form-label">Proforma Total</span><div className="form-input flex h-8 items-center bg-slate-50 font-bold text-slate-800">{fmtAmount(proformaForm.source === 'quotation' ? (Number(proformaForm.quoteTotal || 0) || proformaServiceTotal(proformaForm.services)) : proformaServiceTotal(proformaForm.services), proformaForm.currency)}</div></div>
              <div className="col-span-2 overflow-hidden rounded-xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2"><div><div className="text-xs font-bold text-slate-800">Services & Prices</div><p className="text-[10px] text-slate-500">{proformaForm.source === 'quotation' ? 'Fetched from the quotation and refreshed when this proforma is saved.' : 'Add each manual service and its client price.'}</p></div>{proformaForm.source === 'manual' && <button type="button" onClick={() => setProformaForm((current) => ({ ...current, services: [...current.services, emptyProformaService()] }))} className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-50"><Plus className="h-3 w-3" /> Add service</button>}</div>
                <div className="max-h-64 overflow-y-auto"><table className="w-full text-xs"><thead className="sticky top-0 bg-white text-slate-400"><tr><th className="px-3 py-2 text-left text-[10px] font-bold uppercase">Service</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase">Date</th><th className="px-3 py-2 text-right text-[10px] font-bold uppercase">Price</th>{proformaForm.source === 'manual' && <th className="w-10" />}</tr></thead><tbody>{proformaForm.services.map((service) => <tr key={service.id} className="border-t border-slate-100"><td className="px-3 py-1.5">{proformaForm.source === 'quotation' ? <span className="font-medium text-slate-700">{service.desc}</span> : <input value={service.desc} onChange={(event) => updateProformaService(service.id, { desc: event.target.value })} className="form-input h-8" placeholder="Hotel, transfer, activity…" />}</td><td className="px-3 py-1.5">{proformaForm.source === 'quotation' ? <span className="text-slate-600">{formatInvoiceDate(service.date)}</span> : <DateInput value={service.date || ''} onChange={(value) => updateProformaService(service.id, { date: value })} className="form-input h-8" compact />}</td><td className="px-3 py-1.5 text-right">{proformaForm.source === 'quotation' ? <span className="font-bold text-slate-700">{fmtAmount(service.amount, proformaForm.currency)}</span> : <input type="number" min="0" step="0.01" value={service.amount} onChange={(event) => updateProformaService(service.id, { amount: event.target.value })} className="form-input h-8 text-right" placeholder="0.00" />}</td>{proformaForm.source === 'manual' && <td className="px-2 py-1.5 text-center"><button type="button" onClick={() => removeProformaService(service.id)} className="rounded p-1 text-rose-500 hover:bg-rose-50" title="Remove service"><Trash2 className="h-3.5 w-3.5" /></button></td>}</tr>)}{!proformaForm.services.length && <tr><td colSpan={proformaForm.source === 'manual' ? 4 : 3} className="px-3 py-7 text-center text-xs text-slate-400">{proformaForm.source === 'quotation' ? 'Select a quotation to load its services.' : 'Add at least one service.'}</td></tr>}</tbody></table></div>
              </div>
              <label className="col-span-2"><span className="form-label">Remarks</span><textarea value={proformaForm.remarks} onChange={(event) => setProformaForm((current) => ({ ...current, remarks: event.target.value }))} className="form-input !h-auto min-h-[56px] sm:min-h-[72px]" placeholder="Optional internal reference" /></label>
            </div>
            <div className="flex justify-end gap-2 sm:gap-3 border-t border-slate-200 bg-slate-50 px-3 sm:px-5 py-2.5 sm:py-3 flex-shrink-0 [&>button]:flex-1 sm:[&>button]:flex-none"><button disabled={savingProforma} onClick={() => { setShowProformaModal(false); setEditingProforma(null); }} className="btn-secondary h-9 px-5 text-xs">Cancel</button><button disabled={savingProforma} onClick={saveProforma} className="btn-primary h-9 min-w-[130px] px-5 text-xs">{savingProforma ? 'Saving…' : editingProforma ? 'Update Proforma' : 'Save Proforma'}</button></div>
          </div>
        </div>
      )}

      {/* Render in document.body so the table's scroll container can never clip this menu. */}
      {openActionMenu && actionMenuPosition && createPortal(
        <>
          <div className="fixed inset-0 z-[70]" onClick={closeInvoiceActionMenu} />
          <div className="fixed z-[80] w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-xl" style={actionMenuPosition}>
            {[
              { icon: Eye, label: 'Preview PDF', color: 'text-blue-700' },
              { icon: Download, label: 'Download PDF', color: 'text-slate-700' },
              { icon: Mail, label: 'Send Email', color: 'text-green-700' },
              { icon: MessageCircle, label: 'Send WhatsApp', color: 'text-emerald-700' },
              { icon: Copy, label: 'Duplicate', color: 'text-violet-700' },
              { icon: FileCheck, label: 'Credit Note', color: 'text-rose-700' },
              { icon: Trash2, label: 'Delete', color: 'text-red-600' },
            ].map(({ icon: Ic, label, color }) => (
              <button key={label} onClick={() => runBookingInvoiceAction(label)} className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 ${color}`}>
                <Ic className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
      {whatsappInvoice && <WhatsAppSendDialog
        title={`Send invoice ${whatsappInvoice.id || ''}`}
        recipientName={whatsappInvoice.guest || whatsappInvoice.agent}
        recipientPhone={whatsappPhoneForBooking(whatsappInvoice.booking)}
        initialMessage={whatsappMessageForInvoice(whatsappInvoice)}
        onClose={() => setWhatsappInvoice(null)}
      />}
    </div>
  );
}
