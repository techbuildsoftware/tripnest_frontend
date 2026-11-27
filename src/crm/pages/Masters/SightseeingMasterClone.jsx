import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/api";
import SearchableSelect from "../../components/ui/SearchableSelect";
import RichTextEditor from "../../components/ui/RichTextEditor";
import DateInput from "../../components/ui/DateInput";
import {
  ArrowLeft,
  Plus,
  Search,
  Pencil,
  Trash2,
  MapPin,
  Check,
  ChevronDown,
  Ticket,
  Users,
  Eye,
  X,
  Save,
  Globe,
  CheckCircle2,
  AlertCircle,
  Printer,
  Download,
  Info,
  Car,
  PackagePlus,
  ShieldCheck,
  ImagePlus,
  FileText,
  Clock3,
  CalendarDays,
  Filter,
  Upload,
  Settings2,
} from "lucide-react";
import { formatDate, todayIsoInTimeZone } from "../../lib/date";

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SELECTED_SIGHTSEEING_STORAGE_KEY = "buildsoftware:sightseeing-master:selected-id";

// This is a UI preference only. The selected master remains selected after a
// refresh, but no master data is changed until the user saves it.
const readSelectedSightseeingId = () => {
  try {
    return window.localStorage.getItem(SELECTED_SIGHTSEEING_STORAGE_KEY) || "";
  } catch {
    return "";
  }
};

const rememberSelectedSightseeingId = (id) => {
  try {
    if (id === null || id === undefined || id === "") {
      window.localStorage.removeItem(SELECTED_SIGHTSEEING_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SELECTED_SIGHTSEEING_STORAGE_KEY, String(id));
    }
  } catch {
    // Storage can be disabled by the browser. Selection still works for this visit.
  }
};

// The original clone UI uses short field names. These adapters deliberately
// keep that UI contract while the API stores the complete sightseeing module
// in the shared Sightseeing collection used by the regular Activity screen.
const toCloneItem = (record) => ({
  id: record.id,
  name: record.name || "",
  dest: record.destination || "",
  cat: record.category || "",
  status: record.status || "Active",
  img: record.emoji || "🏛️",
  duration: record.duration || "",
  desc: record.details || "",
  location: record.locationText || "",
  supplier: record.supplier || null,
  suppliers: Array.isArray(record.suppliers) && record.suppliers.length ? record.suppliers : record.supplier ? [record.supplier] : [],
  supplierContractRef: record.supplierContractRef || "",
  supplierNotes: record.supplierNotes || "",
  // Basic Details has a dedicated main image; Images is a separate gallery.
  mainImage: record.image?.url ? record.image : null,
  images: Array.isArray(record.images) ? record.images : [],
  documents: Array.isArray(record.documents) ? record.documents : [],
  imageUrl: record.image?.url || "",
  _record: record,
});

const fromRecord = (record) => {
  const item = toCloneItem(record);
  const variants = (record.variants || []).map((variant, index) => ({
    id: String(variant.id || `option-${index + 1}`),
    name: variant.name || "",
    code: variant.code || "",
    cat: variant.category || "",
    order: variant.order || index + 1,
    status: variant.status || "Active",
    desc: variant.description || "",
    defaultFromTime: variant.defaultFromTime || "",
    defaultToTime: variant.defaultToTime || "",
    defaultDropTime: variant.defaultDropTime || "",
    // Variant media is not the sightseeing main image or its gallery.
    // Each variant owns one PDF/voucher image. Keep the legacy array shape so
    // existing records remain readable, but retain only its first image.
    images: (Array.isArray(variant.images) && variant.images.length ? variant.images : variant.image?.url ? [variant.image] : []).slice(0, 1),
  }));
  const rates = (record.variants || []).flatMap((variant, variantIndex) =>
    (variant.rates || []).map((rate, rateIndex) => ({
      id: String(rate.id || `${variant.id || `option-${variantIndex + 1}`}:rate:${rateIndex + 1}`),
      varId: String(variant.id || `option-${variantIndex + 1}`),
      from: rate.fromDate || "",
      to: rate.toDate || "",
      market: rate.market || "Indian",
      rateType: rate.rateType || "B2B",
      adultCost: Number(rate.adultCost || 0),
      adultSell: Number(rate.adultSell || 0),
      childCost: Number(rate.childCost || 0),
      childSell: Number(rate.childSell || 0),
    })),
  );
  return {
    item,
    variants,
    rates,
    transfers: (record.transfers || []).map((transfer, index) => ({
      id: String(transfer.id || `transfer-${index + 1}`),
      variantId: String(transfer.variantId || record.variants?.[0]?.id || ""),
      type: String(transfer.type || "").toLowerCase().includes("ticket") ? "Ticket Only" : String(transfer.type || "").toLowerCase().includes("sic") ? "SIC" : "PVT",
      vehicleSupplierId: transfer.vehicleSupplierId || "",
      vehicleSupplierName: transfer.vehicleSupplierName || "",
      vehicleId: transfer.vehicleId || "",
      vehicleName: transfer.vehicleName || "",
      vehicleCapacity: Number(transfer.vehicleCapacity || 0),
      vehicleCosts: (transfer.vehicleCosts || []).map((cost) => ({ vehicleId: cost.vehicleId || "", vehicleName: cost.vehicleName || "", capacity: Number(cost.capacity || 0), cost: Number(cost.cost || 0) })),
      route: transfer.route || "",
      ticketRateId: transfer.ticketRateId || "",
      adultP: Number(transfer.adultPrice || 0),
      childP: Number(transfer.childPrice || 0),
      details: transfer.details || "",
      status: transfer.status || "Active",
    })),
    addons: (record.addons || []).map((addon, index) => ({
      id: String(addon.id || `addon-${index + 1}`),
      name: addon.name || "",
      type: addon.type || "Add-on",
      adultP: Number(addon.adultPrice || 0),
      childP: Number(addon.childPrice || 0),
      status: addon.status || "Active",
    })),
    supps: (record.supplements || []).map((supplement, index) => ({
      id: String(supplement.id || `supplement-${index + 1}`),
      label: supplement.label || "",
      amount: Number(supplement.amount || 0),
    })),
    policies: (record.policies || []).map((policy, index) => ({
      id: String(policy.id || `policy-${index + 1}`),
      text: policy.text || "",
    })),
    timings: (record.showTimings || []).map((timing) => ({
      time: timing.time,
      openingTime: timing.openingTime || "",
      closingTime: timing.closingTime || "",
      days: timing.days?.length ? timing.days : WEEK_DAYS,
    })),
  };
};

const INIT_SS = [
  {
    id: 1,
    name: "Dolphinarium Pattaya",
    dest: "Pattaya",
    cat: "Show & Marine Life",
    status: "Active",
    img: "🐬",
    duration: "~2 Hours",
    desc: "Enjoy an amazing dolphin show.",
    location: "Pattaya, Thailand",
  },
  {
    id: 2,
    name: "Alcazar Cabaret Show",
    dest: "Pattaya",
    cat: "Show",
    status: "Active",
    img: "🎭",
    duration: "~1.5 Hours",
    desc: "World-famous cabaret show.",
    location: "Pattaya, Thailand",
  },
  {
    id: 3,
    name: "Nong Nooch Garden",
    dest: "Pattaya",
    cat: "Garden & Culture",
    status: "Active",
    img: "🌿",
    duration: "~3 Hours",
    desc: "Beautiful tropical garden.",
    location: "Pattaya, Thailand",
  },
  {
    id: 4,
    name: "Tiger Kingdom",
    dest: "Phuket",
    cat: "Wildlife",
    status: "Active",
    img: "🐯",
    duration: "~1 Hour",
    desc: "Get up close with tigers.",
    location: "Phuket, Thailand",
  },
  {
    id: 5,
    name: "Phi Phi Island Tour",
    dest: "Phuket",
    cat: "Island Tour",
    status: "Inactive",
    img: "🏝",
    duration: "~6 Hours",
    desc: "Stunning island hopping.",
    location: "Phuket, Thailand",
  },
  {
    id: 6,
    name: "Koh Larn Island",
    dest: "Pattaya",
    cat: "Island Tour",
    status: "Active",
    img: "🌊",
    duration: "~5 Hours",
    desc: "Crystal clear beaches.",
    location: "Pattaya, Thailand",
  },
  {
    id: 7,
    name: "Safari World Bangkok",
    dest: "Bangkok",
    cat: "Wildlife",
    status: "Active",
    img: "🦁",
    duration: "~4 Hours",
    desc: "Largest open-zoo in Bangkok.",
    location: "Bangkok, Thailand",
  },
  {
    id: 8,
    name: "Grand Palace Bangkok",
    dest: "Bangkok",
    cat: "Garden & Culture",
    status: "Active",
    img: "🏛",
    duration: "~3 Hours",
    desc: "Magnificent royal palace.",
    location: "Bangkok, Thailand",
  },
];
const INIT_VARIANTS = [
  {
    id: 1,
    name: "Regular Seat",
    code: "DOL-REG",
    cat: "Show Ticket",
    order: 1,
    status: "Active",
    desc: "Standard seating.",
  },
  {
    id: 2,
    name: "Deluxe Seat",
    code: "DOL-DLX",
    cat: "Show Ticket",
    order: 2,
    status: "Active",
    desc: "Enhanced seating.",
  },
  {
    id: 3,
    name: "Premium Seat",
    code: "DOL-PRE",
    cat: "Show Ticket",
    order: 3,
    status: "Active",
    desc: "Premium seating with the best view.",
  },
  {
    id: 4,
    name: "First Row",
    code: "DOL-FR1",
    cat: "Show Ticket",
    order: 4,
    status: "Active",
    desc: "Closest to the action!",
  },
  {
    id: 5,
    name: "Swim w/ Dolphin",
    code: "DOL-SWIM",
    cat: "Interactive",
    order: 5,
    status: "Active",
    desc: "Swim with dolphins.",
  },
];
const INIT_RATES = [
  {
    id: 1,
    varId: 3,
    from: "2025-10-01",
    to: "2026-03-31",
    market: "Indian",
    rateType: "B2B",
    adultCost: 670,
    adultSell: 800,
    childCost: 570,
    childSell: 700,
  },
  {
    id: 2,
    varId: 3,
    from: "2026-04-01",
    to: "2026-09-30",
    market: "Indian",
    rateType: "B2B",
    adultCost: 720,
    adultSell: 850,
    childCost: 600,
    childSell: 740,
  },
];
const INIT_TX = [
  {
    id: 1,
    type: "Ticket Only",
    route: "-",
    adultP: 0,
    childP: 0,
    details: "Show Ticket Only",
    status: "Active",
  },
  {
    id: 2,
    type: "SIC Transfer",
    route: "Pattaya City",
    adultP: 200,
    childP: 150,
    details: "Hotel - Dolphinarium - Hotel",
    status: "Active",
  },
  {
    id: 3,
    type: "Private Car",
    route: "Pattaya City",
    adultP: 1000,
    childP: 1000,
    details: "1-3 Pax (Car)",
    status: "Active",
  },
  {
    id: 4,
    type: "Private Van",
    route: "Pattaya City",
    adultP: 1500,
    childP: 1500,
    details: "4-8 Pax (Van)",
    status: "Active",
  },
];
const INIT_ADDONS = [
  {
    id: 1,
    name: "Photo Package",
    type: "Add-on",
    adultP: 500,
    childP: 500,
    status: "Active",
  },
  {
    id: 2,
    name: "Video Package",
    type: "Add-on",
    adultP: 800,
    childP: 800,
    status: "Active",
  },
  {
    id: 3,
    name: "Dolphin Feeding",
    type: "Add-on",
    adultP: 700,
    childP: 700,
    status: "Active",
  },
  {
    id: 4,
    name: "Swim with Dolphin",
    type: "Add-on",
    adultP: 3500,
    childP: 3500,
    status: "Active",
  },
];
const INIT_SUPPS = [
  { id: 1, label: "Weekend Supplement", amount: 100 },
  { id: 2, label: "Peak Date Supplement", amount: 200 },
];
const INIT_POLICIES = [
  { id: 1, text: "Child below 2 yrs is free of charge." },
  { id: 2, text: "Show timing is subject to change without notice." },
  { id: 3, text: "No outside food or beverages allowed inside." },
  { id: 4, text: "Tickets are non-refundable once booking is confirmed." },
];
const INIT_TIMINGS = ["11:00", "14:00", "17:00", "19:00"];
const SIDENAV = [
  { key: "basic", label: "Basic Details", Icon: FileText },
  { key: "options", label: "Variants", Icon: Ticket },
  { key: "addons", label: "Add-ons", Icon: PackagePlus },
  { key: "supplier", label: "Supplier", Icon: Users },
  { key: "policies", label: "Policies", Icon: ShieldCheck },
  { key: "images", label: "Images", Icon: ImagePlus },
  { key: "documents", label: "Documents", Icon: FileText },
];
const RATE_TYPES = ["B2B", "B2C", "Corporate", "Group"];
const CATS = [
  "Show Ticket",
  "Interactive",
  "Add-on",
  "Tour",
  "Island Tour",
  "Wildlife",
];
const DESTS = [
  "Pattaya",
  "Phuket",
  "Bangkok",
  "Chiang Mai",
  "Koh Samui",
  "Krabi",
];
const SS_CATS = [
  "Show & Marine Life",
  "Show",
  "Garden & Culture",
  "Wildlife",
  "Island Tour",
  "Adventure",
  "Cultural",
];
const SUPPLIER_BANK_FIELDS = [["accountName", "Account Name"], ["accountNumber", "Account Number"], ["bankName", "Bank Name"], ["branch", "Branch"], ["ifscCode", "IFSC Code"], ["swiftCode", "Swift Code"]];

const nid = () => Date.now() + Math.random();

function ABadge({ status = "Active" }) {
  const ok = status === "Active";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ok ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-slate-400"}`}
      />
      {status}
    </span>
  );
}

function MBtn({
  children,
  onClick,
  v = "primary",
  sz = "sm",
  disabled = false,
}) {
  const s = sz === "xs" ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-[11px]";
  const c =
    v === "primary"
      ? "bg-[#1a5fa8] text-white hover:bg-[#175092] shadow-sm"
      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-all active:scale-95 ${s} ${c}`}
    >
      {children}
    </button>
  );
}

function FL({ children }) {
  return (
    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
      {children}
    </span>
  );
}

function FI(p) {
  return (
    <input
      className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
      {...p}
    />
  );
}

function DateFI({ value, onChange, min, max }) {
  const pickerRef = useRef(null);
  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.click();
  };
  return <div className="relative">
    <input value={value ? formatDate(value, '') : ''} readOnly placeholder="DD-MM-YYYY" onClick={openPicker} className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 pr-8 text-[11px] text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all cursor-pointer" />
    <button type="button" onClick={openPicker} className="absolute inset-y-0 right-0 grid w-8 place-items-center text-slate-500 hover:text-blue-600" title="Choose date"><CalendarDays className="h-3.5 w-3.5" /></button>
    <input ref={pickerRef} type="date" value={value || ''} min={min || undefined} max={max || undefined} onChange={(event) => onChange(event.target.value)} tabIndex={-1} aria-hidden="true" className="absolute h-px w-px opacity-0 pointer-events-none" />
  </div>;
}

function FTA(p) {
  return (
    <textarea
      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all resize-none"
      {...p}
    />
  );
}

function FS({ children, value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  if (!options)
    return (
      <div className="flex h-8 items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] text-slate-700 cursor-pointer hover:border-blue-300 transition-colors">
        <span>{children}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1 flex-shrink-0" />
      </div>
    );
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-8 w-full items-center justify-between rounded-lg border px-2.5 text-[11px] transition-colors ${open ? "border-blue-400 ring-2 ring-blue-100 bg-white" : "border-slate-200 bg-white hover:border-blue-300"}`}
      >
        <span
          className={
            value && value !== "All"
              ? "text-blue-700 font-semibold"
              : "text-slate-500"
          }
        >
          {value && value !== "All" ? value : placeholder || "Select..."}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 ml-1 flex-shrink-0 transition-transform ${open ? "rotate-180 text-blue-500" : "text-slate-400"}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[130px] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange && onChange(opt);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left transition-colors ${value === opt ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {value === opt ? (
                <Check className="h-3 w-3 text-blue-600 flex-shrink-0" />
              ) : (
                <span className="w-3" />
              )}
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Panel({ n, title, children, action }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-[38px] items-center justify-between gap-2 bg-gradient-to-r from-[#0d3f6e] to-[#1a5fa8] px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/20 text-[11px] font-bold text-white ring-1 ring-white/30">
            {n}
          </span>
          <h2 className="text-[11.5px] font-bold tracking-wide text-white">
            {title}
          </h2>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function CT({ headers, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

function CRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <span
        onClick={onChange}
        className={`grid h-4 w-4 place-items-center rounded border transition-colors flex-shrink-0 cursor-pointer ${checked ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300 bg-white group-hover:border-blue-300"}`}
      >
        {checked && <Check className="h-2.5 w-2.5" />}
      </span>
      <span className="text-[11px] text-slate-600">{label}</span>
    </label>
  );
}

function ModalBox({ open, onClose, title, children, footer, size = "md" }) {
  if (!open) return null;
  const w = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
    >
      <div
        className={`relative w-full ${w[size]} bg-white rounded-2xl shadow-2xl overflow-hidden`}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#0d3f6e] to-[#1a5fa8]">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 max-h-[75vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-4 py-3 bg-slate-50 border-t border-slate-200">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function useToast() {
  const [t, setT] = useState(null);
  const show = (msg, type = "success") => {
    setT({ msg, type });
    setTimeout(() => setT(null), 2500);
  };
  const Toast = t ? (
    <div
      className={`fixed bottom-5 right-5 z-[999] flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ${t.type === "success" ? "bg-emerald-600 text-white" : "bg-red-500 text-white"}`}
    >
      {t.type === "success" ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      {t.msg}
    </div>
  ) : null;
  return { show, Toast };
}

export default function SightseeingMasterClone() {
  const navigate = useNavigate();
  const { show, Toast } = useToast();

  // This screen is backed by the live sightseeing API.  Keeping the old demo
  // rows in state while the request is in flight made it possible to save a
  // variant against the wrong sightseeing master.
  const [ssList, setSsList] = useState([]);
  const [variants, setVariants] = useState([]);
  const [rates, setRates] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [addons, setAddons] = useState([]);
  const [supps, setSupps] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [activeTimes, setActiveTimes] = useState([]);
  const [customTimings, setCustomTimings] = useState([]);
  const [timingDays, setTimingDays] = useState([]);
  const [timingOpenings, setTimingOpenings] = useState([]);
  const [timingClosings, setTimingClosings] = useState([]);
  const [newTimingDays, setNewTimingDays] = useState(WEEK_DAYS);
  const [newOpeningTime, setNewOpeningTime] = useState("");
  const [newClosingTime, setNewClosingTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [activitySuppliers, setActivitySuppliers] = useState([]);
  const [vehicleSuppliers, setVehicleSuppliers] = useState([]);
  const [categoryMasters, setCategoryMasters] = useState([]);
  const [marketMasters, setMarketMasters] = useState([]);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [categoryMasterOpen, setCategoryMasterOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ supplierId: "", contractRef: "", notes: "", name: "", contactPerson: "", email: "", phone: "", country: "Thailand", currency: "THB", bankDetails: {} });
  const [addingSupplier, setAddingSupplier] = useState(false);
  const imageInputRef = useRef(null);
  const mainImageInputRef = useRef(null);
  const variantImageInputRef = useRef(null);
  const rateContractsRef = useRef(null);
  const transferOptionsRef = useRef(null);
  const selectedSightseeingIdRef = useRef("");

  const [selSS, setSelSS] = useState(null);
  const [selVar, setSelVar] = useState(null);
  const [sideTab, setSideTab] = useState("basic");
  // Stage 4 is the workspace for the selected variant.  The two linked
  // managers below it (stages 5 and 6) always use this same selection.
  const [variantStageTab, setVariantStageTab] = useState("basic");

  const [search, setSearch] = useState("");
  const [filterDest, setFilterDest] = useState("All");
  const [filterCat, setFilterCat] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const allDest = ["All", ...Array.from(new Set(ssList.map((s) => s.dest)))];
  const allCat = ["All", ...Array.from(new Set(ssList.map((s) => s.cat)))];
  const activeFiltersCount = [filterDest, filterCat, filterStatus].filter(
    (f) => f !== "All",
  ).length;
  const resetFilters = () => {
    setFilterDest("All");
    setFilterCat("All");
    setFilterStatus("All");
    setSearch("");
  };

  const filteredSS = useMemo(
    () =>
      ssList.filter((s) => {
        const q = search.toLowerCase();
        return (
          (s.name.toLowerCase().includes(q) ||
            s.dest.toLowerCase().includes(q) ||
            s.cat.toLowerCase().includes(q)) &&
          (filterDest === "All" || s.dest === filterDest) &&
          (filterCat === "All" || s.cat === filterCat) &&
          (filterStatus === "All" || s.status === filterStatus)
        );
      }),
    [ssList, search, filterDest, filterCat, filterStatus],
  );
  const linkedSightseeingSuppliers = useMemo(() => selSS?.suppliers || [], [selSS]);
  const availableActivitySuppliers = useMemo(() => {
    const linkedIds = new Set(linkedSightseeingSuppliers.map((supplier) => String(supplier?.id || supplier?._id || supplier)));
    return activitySuppliers.filter((supplier) => !linkedIds.has(String(supplier.id || supplier._id)));
  }, [activitySuppliers, linkedSightseeingSuppliers]);

  const [qDate, setQDate] = useState("2026-01-15");
  const [qTime, setQTime] = useState("");
  const [qPax, setQPax] = useState({ adult: 4, child: 2, infant: 0 });
  const [qTxId, setQTxId] = useState(INIT_TX[1].id);
  const [qAddonIds, setQAddonIds] = useState([1]);

  const qTxItem = transfers.find((t) => t.id === qTxId);
  const qAddonList = addons.filter(
    (a) => qAddonIds.includes(a.id) && a.status === "Active",
  );
  const activeRate = rates.find((r) => r.varId === selVar?.id) || {
    adultSell: 800,
    childSell: 700,
  };
  const baseA = activeRate.adultSell || 800;
  const baseC = activeRate.childSell || 700;
  const txA = qTxItem ? qTxItem.adultP : 0;
  const txC = qTxItem ? qTxItem.childP : 0;
  const adA = qAddonList.reduce((s, a) => s + a.adultP, 0);
  const adC = qAddonList.reduce((s, a) => s + a.childP, 0);
  const totalA = baseA + txA + adA;
  const totalC = baseC + txC + adC;
  const grandTotal = totalA * qPax.adult + totalC * qPax.child;

  const [mSS, setMSS] = useState(false);
  const [mVar, setMVar] = useState(false);
  const [mRate, setMRate] = useState(false);
  const [mTx, setMTx] = useState(false);
  const [mAddon, setMAddon] = useState(false);
  const [mVoucher, setMVoucher] = useState(false);
  const [mSupp, setMSupp] = useState(false);
  const [mPolicy, setMPolicy] = useState(false);
  const [mTiming, setMTiming] = useState(false);
  const [viewSupplier, setViewSupplier] = useState(null);
  const [showExpiredRates, setShowExpiredRates] = useState(false);

  const [editSS, setEditSS] = useState(null);
  const [editVar, setEditVar] = useState(null);
  const [editRate, setEditRate] = useState(null);
  const [editTx, setEditTx] = useState(null);
  const [editAddon, setEditAddon] = useState(null);

  const [fSS, setFSS] = useState({});
  const [fVar, setFVar] = useState({});
  const [fRate, setFRate] = useState({});
  const [fTx, setFTx] = useState({});
  const [fAddon, setFAddon] = useState({});
  const [fSupp, setFSupp] = useState({ label: "", amount: "" });
  const [fPolicy, setFPolicy] = useState({ text: "" });
  const [newTiming, setNewTiming] = useState("");

  const selectRecord = (record, message = "", preferredVariantId = null) => {
    const data = fromRecord(record);
    selectedSightseeingIdRef.current = String(data.item.id);
    rememberSelectedSightseeingId(data.item.id);
    setSelSS(data.item);
    setVariants(data.variants);
    setRates(data.rates);
    setTransfers(data.transfers);
    setAddons(data.addons);
    setSupps(data.supps);
    setPolicies(data.policies);
    setCustomTimings(data.timings.map((timing) => timing.time));
    setTimingDays(data.timings.map((timing) => timing.days));
    setTimingOpenings(data.timings.map((timing) => timing.openingTime || ""));
    setTimingClosings(data.timings.map((timing) => timing.closingTime || ""));
    setActiveTimes(data.timings.map(() => true));
    setSelVar(data.variants.find((variant) => String(variant.id) === String(preferredVariantId)) || data.variants[0] || null);
    setVariantStageTab("basic");
    const linkedSuppliers = data.item.suppliers || [];
    setAddingSupplier(linkedSuppliers.length === 0);
    setSupplierForm({ supplierId: "", contractRef: data.item.supplierContractRef || "", notes: data.item.supplierNotes || "", name: linkedSuppliers.length ? "" : data.item.name || "", contactPerson: "", email: "", phone: "", country: "Thailand", currency: "THB", bankDetails: {} });
    if (message) show(message);
  };

  const makePayload = (item, next = {}) => {
    const nextVariants = next.variants ?? variants;
    const nextRates = next.rates ?? rates;
    const nextTransfers = next.transfers ?? transfers;
    const nextAddons = next.addons ?? addons;
    const nextSupps = next.supps ?? supps;
    const nextPolicies = next.policies ?? policies;
    const nextTimings = next.timings ?? customTimings.map((time, index) => ({ time, days: timingDays[index] || WEEK_DAYS, openingTime: timingOpenings[index] || "", closingTime: timingClosings[index] || "" }));
    const nextImages = next.images ?? item.images ?? [];
    const nextDocuments = next.documents ?? item.documents ?? [];
    const nextImage = Object.hasOwn(next, "image") ? next.image : item.mainImage || null;
    const variantIds = new Set(nextVariants.map((variant) => String(variant.id || "")).filter(Boolean));
    return {
      name: item.name,
      destination: item.dest,
      category: item.cat,
      status: item.status,
      emoji: item.img || "🏛️",
      duration: item.duration,
      details: item.desc,
      locationText: item.location,
      supplier: item.supplier?.id || item.supplier?._id || item.supplier || null,
      suppliers: (item.suppliers || []).map((supplier) => supplier?.id || supplier?._id || supplier).filter(Boolean),
      supplierContractRef: item.supplierContractRef || "",
      supplierNotes: item.supplierNotes || "",
      images: nextImages,
      documents: nextDocuments,
      image: nextImage,
      activityType: "Standard Activity",
      showTimings: nextTimings,
      operatingDays: [...new Set(nextTimings.flatMap((timing) => timing.days || []))],
      variants: nextVariants.map((variant) => ({
        id: String(variant.id),
        name: variant.name,
        code: variant.code,
        category: variant.cat,
        order: Number(variant.order) || 0,
        status: variant.status,
        description: variant.desc,
        defaultFromTime: variant.defaultFromTime || "",
        defaultToTime: variant.defaultToTime || "",
        defaultDropTime: variant.defaultDropTime || "",
        images: Array.isArray(variant.images) ? variant.images : [],
        rates: nextRates.filter((rate) => String(rate.varId) === String(variant.id)).map((rate) => ({
          id: String(rate.id),
          fromDate: rate.from,
          toDate: rate.to,
          market: rate.market,
          rateType: rate.rateType,
          adultCost: Number(rate.adultCost) || 0,
          adultSell: Number(rate.adultSell) || 0,
          childCost: Number(rate.childCost) || 0,
          childSell: Number(rate.childSell) || 0,
        })),
      })),
      transfers: nextTransfers.map((transfer) => {
        const requestedVariantId = String(transfer.variantId || "");
        // Do not send a retired variant link back to the API. Transfers are
        // valid activity-level options even when they have no variant.
        const variantId = variantIds.has(requestedVariantId) ? requestedVariantId : "";
        return {
          id: String(transfer.id), variantId, type: transfer.type, vehicleSupplierId: transfer.vehicleSupplierId || "", vehicleSupplierName: transfer.vehicleSupplierName || "", vehicleId: transfer.vehicleId || "", vehicleName: transfer.vehicleName || "", vehicleCapacity: Number(transfer.vehicleCapacity) || 0, vehicleCosts: (transfer.vehicleCosts || []).map((cost) => ({ vehicleId: cost.vehicleId, vehicleName: cost.vehicleName, capacity: Number(cost.capacity) || 0, cost: Number(cost.cost) || 0 })), route: transfer.route,
          ticketRateId: transfer.ticketRateId || "", adultPrice: Number(transfer.adultP) || 0, childPrice: Number(transfer.childP) || 0,
          details: transfer.details, status: transfer.status,
        };
      }),
      addons: nextAddons.map((addon) => ({
        id: String(addon.id), name: addon.name, type: addon.type,
        adultPrice: Number(addon.adultP) || 0, childPrice: Number(addon.childP) || 0,
        status: addon.status,
      })),
      supplements: nextSupps.map((supplement) => ({
        id: String(supplement.id), label: supplement.label,
        amount: Number(supplement.amount) || 0,
      })),
      policies: nextPolicies.map((policy) => ({ id: String(policy.id), text: policy.text })),
    };
  };

  const persist = async (item = selSS, next = {}, preferredVariantId = selVar?.id || null) => {
    if (!item?.id) return null;
    // The Edit button can save a master that is not the currently selected
    // row. Never reuse the selected row's nested state in that case: doing so
    // copied Mario Kart's variants into YONA (or any other master) when only
    // its basic details were being changed.
    const editingSelectedMaster = String(item.id) === String(selSS?.id || '');
    const itemSnapshot = editingSelectedMaster
      ? { variants, rates, transfers, addons, supps, policies }
      : fromRecord(item._record || item);
    const scopedNext = {
      ...next,
      variants: next.variants ?? itemSnapshot.variants,
      rates: next.rates ?? itemSnapshot.rates,
      transfers: next.transfers ?? itemSnapshot.transfers,
      addons: next.addons ?? itemSnapshot.addons,
      supps: next.supps ?? itemSnapshot.supps,
      policies: next.policies ?? itemSnapshot.policies,
    };
    setSaving(true);
    try {
      const response = await apiClient.put(`/sightseeing-module/${item.id}`, makePayload(item, scopedNext));
      const record = response.data;
      const mapped = toCloneItem(record);
      setSsList((list) => list.map((row) => (String(row.id) === String(mapped.id) ? mapped : row)));
      // Do not allow an earlier save to switch the user back to another
      // sightseeing record after they have selected a different one.
      if (selectedSightseeingIdRef.current === String(item.id)) {
        selectRecord(record, "", preferredVariantId);
      }
      return record;
    } catch (error) {
      show(error.message || "Could not save sightseeing.", "error");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const uploadSightseeingImages = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length || !selSS?.id) return;
    if (files.some((file) => !file.type.startsWith("image/"))) {
      return show("Please choose image files only.", "error");
    }
    const currentImages = selSS.images || [];
    if (currentImages.length + files.length > 10) {
      return show("A sightseeing can have up to 10 images.", "error");
    }
    setSaving(true);
    try {
      const data = new FormData();
      files.forEach((file) => data.append("activityImages", file));
      const response = await apiClient.upload("/uploads?folder=sightseeing", data);
      const uploaded = (response.data || []).filter((file) => file.field === "activityImages");
      const nextImages = [...currentImages, ...uploaded];
      const saved = await persist({ ...selSS, images: nextImages }, { images: nextImages });
      if (saved) show(`${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded.`);
    } catch (error) {
      show(error.message || "Could not upload image.", "error");
    } finally {
      setSaving(false);
    }
  };

  const replaceSightseeingMainImage = async (event) => {
    const [file] = Array.from(event.target.files || []);
    event.target.value = "";
    if (!file || !selSS?.id) return;
    if (!file.type.startsWith("image/")) return show("Please choose an image file.", "error");
    setSaving(true);
    try {
      const data = new FormData();
      data.append("activityImages", file);
      const response = await apiClient.upload("/uploads?folder=sightseeing", data);
      const uploaded = (response.data || []).find((entry) => entry.field === "activityImages");
      if (!uploaded) throw new Error("The image upload did not return a file.");
      const saved = await persist({ ...selSS, mainImage: uploaded }, { image: uploaded });
      if (saved) show("Main image updated.");
    } catch (error) {
      show(error.message || "Could not upload image.", "error");
    } finally {
      setSaving(false);
    }
  };

  const uploadVariantImages = async (event) => {
    const files = Array.from(event.target.files || []).slice(0, 1);
    event.target.value = "";
    if (!files.length || !selSS?.id || !selVar?.id) return;
    if (files.some((file) => !file.type.startsWith("image/"))) return show("Please choose image files only.", "error");
    setSaving(true);
    try {
      const data = new FormData();
      files.forEach((file) => data.append("activityImages", file));
      const response = await apiClient.upload("/uploads?folder=sightseeing-variants", data);
      const uploaded = (response.data || []).filter((entry) => entry.field === "activityImages");
      if (!uploaded.length) throw new Error("The image upload did not return any files.");
      const nextVariants = variants.map((variant) => variant.id === selVar.id ? { ...variant, images: uploaded.slice(0, 1), image: uploaded[0] || null } : variant);
      setVariants(nextVariants);
      const saved = await persist(selSS, { variants: nextVariants }, selVar.id);
      if (saved) show("Variant image updated.");
    } catch (error) {
      show(error.message || "Could not upload variant images.", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeVariantImage = async (index) => {
    if (!selVar?.id) return;
    const nextVariants = variants.map((variant) => variant.id === selVar.id ? { ...variant, images: (variant.images || []).filter((_, imageIndex) => imageIndex !== index) } : variant);
    setVariants(nextVariants);
    if (await persist(selSS, { variants: nextVariants }, selVar.id)) show("Variant image removed.");
  };

  const removeSightseeingImage = async (index) => {
    const nextImages = (selSS?.images || []).filter((_, imageIndex) => imageIndex !== index);
    if (await persist({ ...selSS, images: nextImages }, { images: nextImages })) show("Image removed.");
  };

  useEffect(() => {
    let live = true;
    apiClient.get("/sightseeing-module")
      .then((response) => {
        if (!live) return;
        const records = response.data || [];
        const rows = records.map(toCloneItem);
        setSsList(rows);
        const rememberedId = readSelectedSightseeingId();
        const selectedRecord = records.find((record) => String(record.id) === rememberedId) || records[0];
        if (selectedRecord) {
          selectRecord(selectedRecord);
        } else {
          selectedSightseeingIdRef.current = "";
          rememberSelectedSightseeingId(null);
          setSelSS(null);
          setSelVar(null);
        }
      })
      .catch((error) => live && show(error.message || "Could not load sightseeing.", "error"));
    return () => { live = false; };
  }, []);

  useEffect(() => {
    let live = true;
    Promise.all([
      apiClient.get("/operations-masters/vehicles"),
      apiClient.get("/sightseeing-module/suppliers"),
      apiClient.get("/sightseeing-module/vehicle-suppliers"),
      apiClient.get("/activity-masters/sightseeing-categories"),
      apiClient.get("/sales-masters/markets"),
    ]).then(([vehicleResponse, supplierResponse, vehicleSupplierResponse, categoryResponse, marketResponse]) => {
      if (!live) return;
      setVehicles(vehicleResponse.data || []);
      setActivitySuppliers(supplierResponse.data || []);
      setVehicleSuppliers(vehicleSupplierResponse.data || []);
      setCategoryMasters(categoryResponse.data || []);
      setMarketMasters(marketResponse.data || []);
    }).catch((error) => live && show(error.message || "Could not load sightseeing master data.", "error"));
    return () => { live = false; };
  }, []);

  const categoryOptions = useMemo(() => categoryMasters.filter((category) => category.status === "Active").map((category) => category.name), [categoryMasters]);
  const marketOptions = useMemo(() => marketMasters.filter((market) => market.status !== "Inactive").map((market) => market.name), [marketMasters]);
  const availableVehicles = useMemo(() => vehicles.filter((vehicle) => vehicle.status === "Active" && vehicle.vehicleType === fTx.type), [vehicles, fTx.type]);

  // Sightseeing CRUD
  const openSS = (item = null) => {
    setEditSS(item);
    setFSS(
      item
        ? { ...item }
        : {
          name: "",
          dest: "Pattaya",
          cat: "Show & Marine Life",
          status: "Active",
          img: "🌟",
          duration: "~2 Hours",
          desc: "",
          location: "",
        },
    );
    setMSS(true);
  };
  const saveSS = async () => {
    if (!fSS.name?.trim()) return show("Name required", "error");
    if (editSS) {
      const saved = await persist({ ...editSS, ...fSS });
      if (saved) show("Updated!");
    } else {
      setSaving(true);
      try {
        const response = await apiClient.post("/sightseeing-module", makePayload(fSS, {
          variants: [], rates: [], transfers: [], addons: [], supps: [], policies: [], timings: [],
        }));
        const saved = response.data;
        setSsList((list) => [toCloneItem(saved), ...list]);
        selectRecord(saved);
        show("Created!");
      } catch (error) {
        show(error.message || "Could not create sightseeing.", "error");
        return;
      } finally {
        setSaving(false);
      }
    }
    setMSS(false);
  };

  // Variant CRUD
  const openVar = (v = null) => {
    setEditVar(v);
    setFVar(
      v
        ? { ...v }
        : {
          name: "",
          code: "",
          cat: "Show Ticket",
          order: variants.length + 1,
          status: "Active",
          desc: "",
          defaultFromTime: "",
          defaultToTime: "",
          defaultDropTime: "",
          // A new variant starts clean. Transfer pricing is copied only when
          // the user explicitly selects a source variant below.
          copyTransferPricingFrom: "",
        },
    );
    setMVar(true);
  };
  const saveVar = async () => {
    if (!selSS?.id) return show("Select a sightseeing master before saving a variant.", "error");
    if (!fVar.name?.trim()) return show("Name required", "error");
    let next;
    let nextTransfers = transfers;
    let nextRates = rates;
    if (editVar) {
      next = variants.map((x) => (x.id === editVar.id ? { ...x, ...fVar } : x));
    } else {
      const item = { ...fVar, id: nid(), order: Number(fVar.order) || 1 };
      next = [...variants, item];
      if (fVar.copyTransferPricingFrom) {
        // Copy only transfer price data. Ticket-only options and their linked
        // ticket rate contracts must never follow a newly-created variant.
        nextTransfers = [
          ...transfers,
          ...transfers
            .filter((transfer) => String(transfer.variantId) === String(fVar.copyTransferPricingFrom) && transfer.type !== 'Ticket Only')
            .map((transfer) => ({ ...transfer, id: nid(), variantId: item.id, ticketRateId: '' })),
        ];
      }
    }
    const preferredVariantId = editVar?.id || next[next.length - 1]?.id || null;
    const selectedMasterId = String(selSS.id);
    const saved = await persist(selSS, { variants: next, rates: nextRates, transfers: nextTransfers }, preferredVariantId);
    if (!saved) return;
    // A save for another master may complete after the user has selected a
    // new row. In that case the new row must remain untouched on screen.
    if (selectedSightseeingIdRef.current !== selectedMasterId) {
      setMVar(false);
      show("Variant saved to the originally selected sightseeing master.");
      return;
    }
    // Commit only after the server accepts the complete master record. This
    // prevents a rejected save from leaving a fake variant visible in the UI.
    setVariants(next);
    setRates(nextRates);
    setTransfers(nextTransfers);
    setSelVar(next.find((variant) => String(variant.id) === String(preferredVariantId)) || null);
    setVariantStageTab("basic");
    show(editVar ? "Variant updated!" : fVar.copyTransferPricingFrom ? "Variant created with copied transfer pricing!" : "Variant created!");
    setMVar(false);
  };
  const deleteVar = async (id) => {
    const next = variants.filter((x) => x.id !== id);
    setVariants(next);
    if (selVar?.id === id) {
      setSelVar(next[0] || null);
      setVariantStageTab("basic");
    }
    if (await persist(selSS, { variants: next, rates: rates.filter((rate) => rate.varId !== id) })) show("Deleted", "error");
  };

  // Rate CRUD
  const openRate = (r = null) => {
    if (!r && !selVar?.id) return show("Select a variant before adding a rate contract.", "error");
    setEditRate(r);
    setFRate(
      r
        ? { ...r }
        : {
          varId: selVar?.id,
          from: "",
          to: "",
          market: marketOptions[0] || "",
          rateType: "B2B",
          adultCost: "",
          childCost: "",
        },
    );
    setMRate(true);
  };
  const saveRate = async () => {
    if (!selVar?.id) return show("Select a variant before saving a rate contract.", "error");
    if (!fRate.from || !fRate.to) return show("Select both validity dates.", "error");
    if (fRate.to < fRate.from) return show("Valid to date cannot be before valid from date.", "error");
    const d = {
      ...fRate,
      adultCost: Number(fRate.adultCost),
      childCost: Number(fRate.childCost),
      // Ticket selling prices are intentionally locked to the entered costs.
      // Keep them in the persisted contract because quotations consume these
      // fields, but never let a stale UI or manually crafted request set markup.
      adultSell: Number(fRate.adultCost),
      childSell: Number(fRate.childCost),
    };
    const next = editRate
      ? rates.map((x) => (x.id === editRate.id ? { ...x, ...d } : x))
      : [...rates, { ...d, id: nid(), varId: selVar?.id }];
    setRates(next);
    if (await persist(selSS, { rates: next })) show("Rate saved!");
    setMRate(false);
  };
  const deleteRate = async (id) => {
    const next = rates.filter((x) => x.id !== id);
    setRates(next);
    if (await persist(selSS, { rates: next })) show("Deleted", "error");
  };

  // Transfer CRUD
  const openTx = (t = null) => {
    const ticketRate = rates.filter((rate) => rate.varId === selVar?.id).sort((left, right) => String(right.to || '').localeCompare(String(left.to || '')))[0];
    setEditTx(t);
    setFTx(
      t
        ? { ...t }
        : {
          variantId: selVar?.id || "",
          type: "SIC",
          vehicleSupplierId: "",
          vehicleSupplierName: "",
          vehicleId: "",
          vehicleName: "",
          vehicleCapacity: 0,
          vehicleCosts: [],
          ticketRateId: ticketRate?.id || "",
          route: "",
          adultP: ticketRate ? Number(ticketRate.adultSell || 0) : "",
          childP: ticketRate ? Number(ticketRate.childSell || 0) : "",
          details: "",
          status: "Active",
        },
    );
    setMTx(true);
  };
  const saveTx = async () => {
    if (!selVar?.id) return show("Select a variant before adding a transfer.", "error");
    if (!fTx.type?.trim()) return show("Type required", "error");
    const d = {
      ...fTx,
      variantId: selVar.id,
      ...(fTx.type === "Ticket Only" ? { vehicleSupplierId: "", vehicleSupplierName: "", vehicleId: "", vehicleName: "", vehicleCapacity: 0, vehicleCosts: [] } : {}),
      adultP: Number(fTx.adultP),
      childP: Number(fTx.childP),
    };
    const next = editTx
      ? transfers.map((x) => (x.id === editTx.id ? { ...x, ...d } : x))
      : [...transfers, { ...d, id: nid() }];
    setTransfers(next);
    if (await persist(selSS, { transfers: next })) show("Transfer saved!");
    setMTx(false);
  };

  const transferVehicleCost = (vehicle) => fTx.vehicleCosts?.find((row) => row.vehicleId === vehicle.id)?.cost ?? "";
  const setTransferVehicleCost = (vehicle, cost) => setFTx((current) => ({ ...current, vehicleCosts: [...(current.vehicleCosts || []).filter((row) => row.vehicleId !== vehicle.id), { vehicleId: vehicle.id, vehicleName: vehicle.name, capacity: Number(vehicle.sightseeingCapacity) || 0, cost }] }));

  const saveSupplier = async () => {
    if (!selSS?.id) return;
    if (!supplierForm.supplierId && !supplierForm.name?.trim()) return show("Select or create a sightseeing supplier.", "error");
    setSaving(true);
    try {
      const response = await apiClient.put(`/sightseeing-module/${selSS.id}/supplier`, supplierForm.supplierId
        ? { supplierId: supplierForm.supplierId, contractRef: supplierForm.contractRef, notes: supplierForm.notes }
        : { create: { name: supplierForm.name, contactPerson: supplierForm.contactPerson, email: supplierForm.email, phone: supplierForm.phone, country: supplierForm.country || "Thailand", currency: supplierForm.currency || "THB", bankDetails: supplierForm.bankDetails }, contractRef: supplierForm.contractRef, notes: supplierForm.notes });
      const saved = response.data;
      const mapped = toCloneItem(saved);
      setSsList((list) => list.map((row) => row.id === mapped.id ? mapped : row));
      if (saved.suppliers?.length) setActivitySuppliers((list) => [...saved.suppliers, ...list.filter((supplier) => !saved.suppliers.some((linked) => (linked.id || linked._id) === (supplier.id || supplier._id)))]);
      selectRecord(saved, supplierForm.supplierId ? "Supplier linked to sightseeing." : "Supplier created in Supplier Master and linked to sightseeing.");
    } catch (error) {
      show(error.message || "Could not save supplier.", "error");
    } finally { setSaving(false); }
  };

  const removeSupplier = async (supplier) => {
    if (!selSS?.id || !supplier) return;
    setSaving(true);
    try {
      const supplierId = supplier.id || supplier._id || supplier;
      const response = await apiClient.delete(`/sightseeing-module/${selSS.id}/supplier/${encodeURIComponent(supplierId)}`);
      const saved = response.data;
      const mapped = toCloneItem(saved);
      setSsList((list) => list.map((row) => row.id === mapped.id ? mapped : row));
      selectRecord(saved, "Supplier unlinked from sightseeing.");
    } catch (error) {
      show(error.message || "Could not remove supplier.", "error");
    } finally { setSaving(false); }
  };

  const addCategory = async () => {
    const name = categoryDraft.trim();
    if (!name) return show("Enter a category name.", "error");
    try {
      const response = await apiClient.post("/activity-masters/sightseeing-categories", { name, status: "Active" });
      setCategoryMasters((list) => [...list, response.data].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryDraft("");
      show("Category created.");
    } catch (error) { show(error.message || "Could not create category.", "error"); }
  };

  const removeCategory = async (category) => {
    try {
      await apiClient.delete(`/activity-masters/sightseeing-categories/${category.id}`);
      setCategoryMasters((list) => list.filter((item) => item.id !== category.id));
      show("Category removed.");
    } catch (error) { show(error.message || "This category cannot be removed.", "error"); }
  };
  const deleteTx = async (id) => {
    const next = transfers.filter((x) => x.id !== id);
    setTransfers(next);
    if (qTxId === id) setQTxId(null);
    if (await persist(selSS, { transfers: next })) show("Deleted", "error");
  };

  // Addon CRUD
  const openAddon = (a = null) => {
    setEditAddon(a);
    setFAddon(
      a
        ? { ...a }
        : {
          name: "",
          type: "Add-on",
          adultP: "",
          childP: "",
          status: "Active",
        },
    );
    setMAddon(true);
  };
  const saveAddon = async () => {
    if (!fAddon.name?.trim()) return show("Name required", "error");
    const d = {
      ...fAddon,
      adultP: Number(fAddon.adultP),
      childP: Number(fAddon.childP),
    };
    const next = editAddon
      ? addons.map((x) => (x.id === editAddon.id ? { ...x, ...d } : x))
      : [...addons, { ...d, id: nid() }];
    setAddons(next);
    if (await persist(selSS, { addons: next })) show("Add-on saved!");
    setMAddon(false);
  };
  const deleteAddon = async (id) => {
    const next = addons.filter((x) => x.id !== id);
    setAddons(next);
    setQAddonIds((ids) => ids.filter((i) => i !== id));
    if (await persist(selSS, { addons: next })) show("Deleted", "error");
  };

  const today = todayIsoInTimeZone();
  const expiredRateCount = rates.filter((rate) => rate.to && rate.to < today).length;
  const varRates = rates.filter((r) => r.varId === selVar?.id && (!showExpiredRates || (r.to && r.to < today)));
  const variantTransfers = transfers.filter((transfer) => String(transfer.variantId) === String(selVar?.id));
  const selectVariant = (variant, tab = "basic") => {
    setSelVar(variant);
    setVariantStageTab(tab);
  };
  const openVariantManager = (tab) => {
    setVariantStageTab(tab);
    const target = tab === "rates" ? rateContractsRef.current : transferOptionsRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {Toast}

      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-2.5 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/masters")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">
              Sightseeing
            </h1>
            <p className="text-[10px] text-slate-400">
              Complete sightseeing setup · rates · quotation · voucher workflow
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-700">
            <Globe className="h-3 w-3" />
            {selSS?.name}
          </span>
          <MBtn onClick={() => openSS()}>
            <Plus className="h-3.5 w-3.5" /> Add Sightseeing
          </MBtn>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Row 1 */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel
            n="1"
            title="Sightseeing Master List"
            action={
              <MBtn sz="xs" onClick={() => openSS()}>
                <Plus className="h-3 w-3" /> Add
              </MBtn>
            }
          >
            <div className="p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[140px]">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, destination, category..."
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-6 text-[11px] outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2 top-2 text-slate-300 hover:text-slate-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="w-32">
                  <FS
                    value={filterDest}
                    options={allDest}
                    onChange={setFilterDest}
                    placeholder="Destination"
                  >
                    Dest
                  </FS>
                </div>
                <div className="w-36">
                  <FS
                    value={filterCat}
                    options={allCat}
                    onChange={setFilterCat}
                    placeholder="Category"
                  >
                    Cat
                  </FS>
                </div>
                <div className="w-24">
                  <FS
                    value={filterStatus}
                    options={["All", "Active", "Inactive"]}
                    onChange={setFilterStatus}
                    placeholder="Status"
                  >
                    Status
                  </FS>
                </div>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1 h-8 px-2 rounded-lg border border-orange-200 bg-orange-50 text-[10px] font-semibold text-orange-600 hover:bg-orange-100 whitespace-nowrap"
                  >
                    <X className="h-3 w-3" /> Clear ({activeFiltersCount})
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <Filter className="h-3 w-3" />
                <span>
                  Showing{" "}
                  <strong className="text-slate-600">
                    {filteredSS.length}
                  </strong>{" "}
                  of <strong className="text-slate-600">{ssList.length}</strong>
                </span>
                {filterDest !== "All" && (
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold">
                    {filterDest}
                  </span>
                )}
                {filterCat !== "All" && (
                  <span className="px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 font-semibold">
                    {filterCat}
                  </span>
                )}
                {filterStatus !== "All" && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-semibold">
                    {filterStatus}
                  </span>
                )}
              </div>
              <div className="max-h-[460px] overflow-y-auto custom-scrollbar rounded-lg border border-slate-200">
                <CT
                  headers={["#", "Img", "Name", "Dest", "Category", "Status", ""]}
                >
                {filteredSS.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-6 text-center text-[11px] text-slate-400"
                    >
                      No records.{" "}
                      <button
                        onClick={resetFilters}
                        className="text-blue-500 underline"
                      >
                        Reset
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredSS.map((item, i) => (
                    <tr
                      key={item.id}
                      onClick={() => {
                        const record = item._record;
                        if (record) selectRecord(record, "Selected: " + item.name);
                      }}
                      className={
                        "cursor-pointer transition-all text-[11px] " +
                        (selSS?.id === item.id
                          ? "bg-blue-50 border-l-[3px] border-l-blue-500"
                          : "hover:bg-slate-50")
                      }
                    >
                      <td className="px-2.5 py-1.5 text-slate-400">{i + 1}</td>
                      <td className="px-2.5 py-1.5">
                        {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-7 w-8 rounded object-cover border border-slate-200" /> : <span className={"grid h-7 w-8 place-items-center rounded text-base " + (i % 2 ? "bg-violet-50" : "bg-sky-50")}>{item.img}</span>}
                      </td>
                      <td className="px-2.5 py-1.5 font-semibold text-slate-700">
                        {item.name}
                      </td>
                      <td className="px-2.5 py-1.5 text-slate-500">
                        {item.dest}
                      </td>
                      <td className="px-2.5 py-1.5 text-slate-500">
                        {item.cat}
                      </td>
                      <td className="px-2.5 py-1.5">
                        <ABadge status={item.status} />
                      </td>
                      <td className="px-2.5 py-1.5">
                        <div className="flex justify-end gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openSS(item);
                            }}
                            className="rounded p-1 text-blue-500 hover:bg-blue-50"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              apiClient.delete(`/sightseeing-module/${item.id}`)
                                .then(() => {
                                  setSsList((list) => list.filter((row) => row.id !== item.id));
                                  if (selSS?.id === item.id) setSelSS(null);
                                  show("Deleted", "error");
                                })
                                .catch((error) => show(error.message || "Could not delete sightseeing.", "error"));
                            }}
                            className="rounded p-1 text-red-400 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                </CT>
              </div>
            </div>
          </Panel>

          <Panel
            n="2"
            title={`Edit — ${selSS?.name || "Select a sightseeing"}`}
            action={<ABadge status={selSS?.status || "Active"} />}
          >
            <div className="grid grid-cols-[110px_1fr] divide-x divide-slate-100 min-h-[300px]">
              <nav className="p-2 space-y-0.5">
                {SIDENAV.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => setSideTab(key)}
                    className={
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[10.5px] transition-colors " +
                      (sideTab === key
                        ? "bg-blue-50 font-semibold text-blue-700"
                        : "text-slate-500 hover:bg-slate-50")
                    }
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </nav>
              <div className="p-3 overflow-y-auto max-h-[420px]">
                {sideTab === "basic" && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-[80px_1fr] gap-2.5 items-start">
                      <div className="space-y-1.5">
                        <div className="grid h-20 overflow-hidden place-items-center rounded-xl bg-gradient-to-br from-sky-100 to-blue-200 text-4xl">
                          {selSS?.mainImage?.url ? <img src={selSS.mainImage.url} alt={`${selSS?.name || "Sightseeing"} main`} className="h-full w-full object-cover" /> : (selSS?.img || "🌊")}
                        </div>
                        <input ref={mainImageInputRef} type="file" accept="image/*" className="hidden" onChange={replaceSightseeingMainImage} />
                        <button type="button" disabled={saving || !selSS?.id} onClick={() => mainImageInputRef.current?.click()} className="flex w-full items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-1.5 py-1 text-[9px] font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"><Upload className="h-3 w-3" /> {saving ? "Uploading..." : selSS?.mainImage?.url ? "Change image" : "Upload image"}</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="col-span-2">
                          <FL>Name *</FL>
                          <FI
                            value={selSS?.name || ""}
                            onChange={(e) =>
                              setSelSS((s) => ({ ...s, name: e.target.value }))
                            }
                          />
                        </label>
                        <label>
                          <FL>Destination</FL>
                          <FS
                            value={selSS?.dest}
                            options={DESTS}
                            onChange={(v) =>
                              setSelSS((s) => ({ ...s, dest: v }))
                            }
                            placeholder="Dest"
                          >
                            {selSS?.dest}
                          </FS>
                        </label>
                        <label>
                          <FL>Duration</FL>
                          <FI
                            value={selSS?.duration || ""}
                            onChange={(e) =>
                              setSelSS((s) => ({
                                ...s,
                                duration: e.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          <FL>Category</FL>
                          <FS
                            value={selSS?.cat}
                            options={categoryOptions}
                            onChange={(v) =>
                              setSelSS((s) => ({ ...s, cat: v }))
                            }
                            placeholder="Cat"
                          >
                            {selSS?.cat}
                          </FS>
                        </label>
                        <label>
                          <FL>Status</FL>
                          <FS
                            value={selSS?.status}
                            options={["Active", "Inactive"]}
                            onChange={(v) =>
                              setSelSS((s) => ({ ...s, status: v }))
                            }
                          >
                            {selSS?.status}
                          </FS>
                        </label>
                        <label className="col-span-2">
                          <FL>Location</FL>
                          <FI
                            value={selSS?.location || ""}
                            onChange={(e) =>
                              setSelSS((s) => ({
                                ...s,
                                location: e.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>
                    </div>
                    <label>
                      <FL>Description (PDF-ready rich text)</FL>
                      <RichTextEditor value={selSS?.desc || ""} onChange={(value) => setSelSS((s) => ({ ...s, desc: value }))} />
                    </label>
                    <div className="flex justify-end">
                      <MBtn
                        onClick={async () => {
                          if (await persist(selSS)) show("Saved!");
                        }}
                      >
                        <Save className="h-3 w-3" /> {saving ? "Saving..." : "Save"}
                      </MBtn>
                    </div>
                  </div>
                )}
                {sideTab === "options" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">
                        Variants
                      </p>
                      <MBtn sz="xs" onClick={() => openVar()}>
                        <Plus className="h-3 w-3" /> Add
                      </MBtn>
                    </div>
                    {variants.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => selectVariant(v)}
                        className={
                          "flex items-center justify-between rounded-lg border px-2.5 py-2 cursor-pointer transition-colors " +
                          (selVar?.id === v.id
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 hover:bg-slate-50")
                        }
                      >
                        <div className="flex items-center gap-2">
                          <Ticket
                            className={
                              "h-3.5 w-3.5 " +
                              (selVar?.id === v.id
                                ? "text-blue-600"
                                : "text-slate-400")
                            }
                          />
                          <span className="text-[11px] font-semibold text-slate-700">
                            {v.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {v.code}
                          </span>
                          <ABadge status={v.status} />
                        </div>
                        <div className="flex gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openVar(v);
                            }}
                            className="p-1 text-blue-500 hover:bg-blue-100 rounded"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteVar(v.id);
                            }}
                            className="p-1 text-red-400 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {variants.length === 0 && (
                      <p className="text-[11px] text-slate-400 text-center py-4">
                        No variants. Click Add.
                      </p>
                    )}
                  </div>
                )}
                {sideTab === "addons" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">
                        Add-ons
                      </p>
                      <MBtn sz="xs" onClick={() => openAddon()}>
                        <Plus className="h-3 w-3" /> Add
                      </MBtn>
                    </div>
                    {addons.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 px-2.5 py-2 hover:bg-slate-50"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <PackagePlus className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-[11px] font-semibold text-slate-700">
                              {a.name}
                            </span>
                            <ABadge status={a.status} />
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 ml-5">
                            Adult:{" "}
                            <strong className="text-blue-700">
                              THB {a.adultP}
                            </strong>{" "}
                            · Child:{" "}
                            <strong className="text-blue-600">
                              THB {a.childP}
                            </strong>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          <button
                            onClick={() => openAddon(a)}
                            className="p-1 text-blue-500 hover:bg-blue-100 rounded"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => deleteAddon(a.id)}
                            className="p-1 text-red-400 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {addons.length === 0 && (
                      <p className="text-[11px] text-slate-400 text-center py-4">
                        No add-ons.
                      </p>
                    )}
                  </div>
                )}
                {sideTab === "supplier" && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between"><p className="text-[10px] text-slate-500 font-semibold uppercase">Sightseeing Suppliers</p>{linkedSightseeingSuppliers.length > 0 && !addingSupplier && <MBtn sz="xs" onClick={() => { setAddingSupplier(true); setSupplierForm({ supplierId: "", contractRef: "", notes: "", name: "", contactPerson: "", email: "", phone: "", country: "Thailand", currency: "THB", bankDetails: {} }); }}><Plus className="h-3 w-3" /> Add supplier</MBtn>}</div>
                    {linkedSightseeingSuppliers.length === 0 ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900"><div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><div><strong>No supplier is linked yet.</strong><p className="mt-0.5 text-amber-800">Create <strong>{selSS?.name || "this sightseeing"}</strong> as a new supplier, or choose an existing Sightseeing / Activity supplier below.</p></div></div></div> : <div className="space-y-2">{linkedSightseeingSuppliers.map((supplier) => <div key={supplier.id || supplier._id || supplier} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"><div><p className="text-[11px] font-semibold text-slate-700">{supplier.name || supplier}</p><p className="mt-0.5 text-[10px] text-slate-500">{supplier.contactPerson || supplier.email || supplier.phone || "No contact details"}</p></div><div className="flex items-center gap-1"><button type="button" onClick={() => setViewSupplier(supplier)} className="rounded-md p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="View supplier details"><Eye className="h-3.5 w-3.5" /></button><button type="button" onClick={() => removeSupplier(supplier)} disabled={saving} className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50" title="Unlink supplier"><X className="h-3.5 w-3.5" /></button></div></div>)}</div>}
                    {addingSupplier && <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3"><div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">{linkedSightseeingSuppliers.length ? "Add another supplier" : "Choose or create supplier"}</p>{linkedSightseeingSuppliers.length > 0 && <button type="button" onClick={() => setAddingSupplier(false)} className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>}</div><div className="grid grid-cols-2 gap-2"><label className="col-span-2"><FL>Sightseeing Supplier *</FL><SearchableSelect value={supplierForm.supplierId || supplierForm.name} onChange={(value) => { const supplier = availableActivitySuppliers.find((item) => (item.id || item._id) === value); setSupplierForm((form) => supplier ? ({ ...form, supplierId: supplier.id || supplier._id, name: supplier.name || "", contactPerson: supplier.contactPerson || "", email: supplier.email || "", phone: supplier.phone || "", country: supplier.country || "Thailand", currency: supplier.currency || "THB", bankDetails: supplier.bankDetails || {} }) : ({ ...form, supplierId: "", name: value, contactPerson: "", email: "", phone: "", country: "Thailand", currency: "THB", bankDetails: {} })); }} options={availableActivitySuppliers.map((supplier) => ({ value: supplier.id || supplier._id, label: `${supplier.name}${supplier.contactPerson ? ` · ${supplier.contactPerson}` : ""}` }))} placeholder="Select existing or type a new supplier" isCreatable /><span className="mt-1 block text-[10px] text-slate-500">Only active suppliers not already linked to this sightseeing are listed.</span></label><label><FL>Contact Person</FL><FI disabled={!!supplierForm.supplierId} value={supplierForm.contactPerson} onChange={(event) => setSupplierForm((form) => ({ ...form, contactPerson: event.target.value }))} placeholder="Full name" /></label><label><FL>Phone</FL><FI disabled={!!supplierForm.supplierId} value={supplierForm.phone} onChange={(event) => setSupplierForm((form) => ({ ...form, phone: event.target.value }))} placeholder="+66..." /></label><label><FL>Email</FL><FI disabled={!!supplierForm.supplierId} type="email" value={supplierForm.email} onChange={(event) => setSupplierForm((form) => ({ ...form, email: event.target.value }))} placeholder="supplier@email.com" /></label><label><FL>Contract Ref</FL><FI value={supplierForm.contractRef} onChange={(event) => setSupplierForm((form) => ({ ...form, contractRef: event.target.value }))} placeholder="Contract no." /></label><label><FL>Country</FL><FS value={supplierForm.country || "Thailand"} options={["Thailand"]} onChange={(value) => setSupplierForm((form) => ({ ...form, country: value }))}>Thailand</FS></label><label><FL>Currency</FL><FS value={supplierForm.currency || "THB"} options={["THB"]} onChange={(value) => setSupplierForm((form) => ({ ...form, currency: value }))}>THB</FS></label><div className="col-span-2 rounded-xl border border-slate-200 bg-slate-100 p-3"><div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Supplier bank details</div><div className="grid grid-cols-2 gap-2">{SUPPLIER_BANK_FIELDS.map(([key, label]) => <label key={key} className={key === "ibnCode" ? "col-span-1" : ""}><FL>{label}</FL><FI disabled={!!supplierForm.supplierId} value={supplierForm.bankDetails?.[key] || ""} onChange={(event) => setSupplierForm((form) => ({ ...form, bankDetails: { ...form.bankDetails, [key]: event.target.value } }))} /></label>)}</div></div><label className="col-span-2"><FL>Notes</FL><FTA rows={2} value={supplierForm.notes} onChange={(event) => setSupplierForm((form) => ({ ...form, notes: event.target.value }))} placeholder="Notes..." /></label></div><div className="mt-3 flex justify-end"><MBtn onClick={saveSupplier} disabled={saving}><Save className="h-3 w-3" /> {saving ? "Saving..." : supplierForm.supplierId ? "Add selected supplier" : `Create ${supplierForm.name || selSS?.name || "supplier"}`}</MBtn></div></div>}
                  </div>
                )}
                {sideTab === "policies" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">
                        Policies
                      </p>
                      <MBtn
                        sz="xs"
                        onClick={() => {
                          setFPolicy({ text: "" });
                          setMPolicy(true);
                        }}
                      >
                        <Plus className="h-3 w-3" /> Add
                      </MBtn>
                    </div>
                    {policies.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-start gap-2 rounded-lg border border-slate-200 px-2.5 py-2"
                      >
                        <Info className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                        <span className="flex-1 text-[11px] text-slate-600">
                          {p.text}
                        </span>
                        <button
                          onClick={async () => {
                            const next = policies.filter((x) => x.id !== p.id);
                            setPolicies(next);
                            await persist(selSS, { policies: next });
                          }}
                          className="p-0.5 text-red-400 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {policies.length === 0 && (
                      <p className="text-[11px] text-slate-400 text-center py-4">
                        No policies.
                      </p>
                    )}
                  </div>
                )}
                {sideTab === "images" && (
                  <div className="space-y-2.5">
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">
                      Images
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(selSS?.images || []).slice(0, 10).map((image, index) => (
                        <div key={image.key || image.url || index} className="group relative h-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          <img src={image.url} alt={image.name || `${selSS?.name || "Sightseeing"} image`} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeSightseeingImage(index)}
                            className="absolute right-1 top-1 hidden rounded bg-white/95 p-1 text-red-500 shadow group-hover:block"
                            title="Remove image"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {(selSS?.images || []).length === 0 && (
                        <>
                          <div className="grid h-20 place-items-center rounded-xl bg-sky-50 text-4xl">
                            {selSS?.img || "🌊"}
                          </div>
                          <div className="grid h-20 place-items-center rounded-xl bg-blue-50 text-4xl">🎫</div>
                        </>
                      )}
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={uploadSightseeingImages}
                      />
                      <button
                        type="button"
                        disabled={saving || !selSS?.id || (selSS?.images || []).length >= 10}
                        className="grid h-20 place-items-center rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-400 transition-colors"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <div>
                          <Upload className="h-5 w-5 mx-auto" />
                          <span className="text-[10px] mt-1 block">{(selSS?.images || []).length >= 10 ? "Maximum reached" : saving ? "Uploading..." : "Upload"}</span>
                        </div>
                      </button>
                    </div>
                    <div className="flex justify-end">
                      <MBtn onClick={async () => { if (await persist(selSS)) show("Images saved!"); }}>
                        <Save className="h-3 w-3" /> {saving ? "Saving..." : "Save"}
                      </MBtn>
                    </div>
                  </div>
                )}
                {sideTab === "documents" && (
                  <div className="space-y-2.5">
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">
                      Documents
                    </p>
                    <label className="block cursor-pointer">
                      <div className="rounded-lg border-2 border-dashed border-slate-200 p-6 text-center text-slate-400 hover:border-blue-300 transition-colors">
                        <Upload className="h-6 w-6 mx-auto mb-1" />
                        <p className="text-[11px]">Click to upload document</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="application/pdf,image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const formData = new FormData();
                            formData.append("sightseeingDocuments", file);
                            const res = await apiClient.upload("/uploads?folder=sightseeing", formData);
                            const newDoc = (res.data || []).find((entry) => entry.field === "sightseeingDocuments");
                            if (newDoc) {
                              const nextDocs = [...(selSS.documents || []), newDoc];
                              if (await persist(selSS, { documents: nextDocs })) {
                                setSelSS(v => ({ ...v, documents: nextDocs }));
                                show("Document uploaded!");
                              }
                            }
                          } catch (err) {
                            show(err.message || "Could not upload document.", "error");
                          }
                          e.target.value = null;
                        }}
                      />
                    </label>
                    <div className="space-y-2">
                      {(selSS.documents || []).map((doc, idx) => (
                        <div key={idx} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <a href={doc.url} target="_blank" rel="noreferrer" className="flex-1 text-[11px] text-slate-600 hover:underline">
                            {doc.name || `Document ${idx + 1}`}
                          </a>
                          <button
                            className="text-red-400 hover:text-red-600"
                            onClick={async () => {
                              const nextDocs = (selSS.documents || []).filter((_, i) => i !== idx);
                              if (await persist(selSS, { documents: nextDocs })) {
                                setSelSS(v => ({ ...v, documents: nextDocs }));
                                show("Document removed!");
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Panel>

        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1.6fr_1fr]">
          <Panel
            n="3"
            title="Variants"
            action={
              <MBtn sz="xs" onClick={() => openVar()}>
                <Plus className="h-3 w-3" /> Add Variant
              </MBtn>
            }
          >
            <div className="p-3">
              <CT
                headers={[
                  "#",
                  "Img",
                  "Variant Name",
                  "Code",
                  "Category",
                  "Status",
                  "Order",
                  "",
                ]}
              >
                {variants.map((v, i) => (
                  <tr
                    key={v.id}
                    onClick={() => selectVariant(v)}
                    className={
                      "cursor-pointer text-[11px] " +
                      (selVar?.id === v.id
                        ? "bg-blue-50 ring-1 ring-inset ring-blue-200"
                        : "hover:bg-slate-50")
                    }
                  >
                    <td className="px-2.5 py-1.5 text-slate-400">{i + 1}</td>
                    <td className="px-2.5 py-1.5">
                      <span
                        className={
                          "grid h-6 w-7 place-items-center rounded " +
                          (i % 2
                            ? "bg-blue-100 text-blue-600"
                            : "bg-cyan-100 text-cyan-600")
                        }
                      >
                        <Ticket className="h-3 w-3" />
                      </span>
                    </td>
                    <td className="px-2.5 py-1.5 font-medium text-slate-700">
                      {v.name}
                    </td>
                    <td className="px-2.5 py-1.5 text-slate-400 font-mono text-[10px]">
                      {v.code}
                    </td>
                    <td className="px-2.5 py-1.5">{v.cat}</td>
                    <td className="px-2.5 py-1.5">
                      <ABadge status={v.status} />
                    </td>
                    <td className="px-2.5 py-1.5 text-center">{v.order}</td>
                    <td className="px-2.5 py-1.5">
                      <div className="flex justify-end gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openVar(v);
                          }}
                          className="rounded p-1 text-blue-500 hover:bg-blue-50"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteVar(v.id);
                          }}
                          className="rounded p-1 text-red-400 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {variants.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-6 text-center text-[11px] text-slate-400"
                    >
                      No variants yet.
                    </td>
                  </tr>
                )}
              </CT>
            </div>
          </Panel>

          <Panel
            n="4"
            title={"Variant Details — " + (selVar?.name || "Select a Variant")}
            action={<ABadge status={selVar?.status || "Active"} />}
          >
            {selVar ? (
              <div className="grid min-h-[260px] grid-cols-[116px_minmax(0,1fr)]">
                <aside className="border-r border-slate-100 bg-slate-50/70 p-2">
                  {[
                    ["basic", "Basic info", Settings2],
                    ["rates", "Rate contracts", FileText],
                    ["transfers", "Transfer options", Car],
                    ["images", "Variant image", ImagePlus],
                  ].map(([id, label, Icon]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => ["basic", "images"].includes(id) ? setVariantStageTab(id) : openVariantManager(id)}
                      className={"mb-1 flex w-full items-center gap-1.5 rounded-md px-2 py-2 text-left text-[10px] font-medium transition-colors " + (variantStageTab === id ? "bg-blue-100 text-blue-700" : "text-slate-500 hover:bg-slate-100")}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{label}</span>
                    </button>
                  ))}
                </aside>
                <div className="p-3">
                  {variantStageTab === "basic" && (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <label><FL>Variant Name *</FL><FI value={selVar.name} onChange={(e) => setSelVar((s) => ({ ...s, name: e.target.value }))} /></label>
                        <label><FL>Variant Code *</FL><FI value={selVar.code} onChange={(e) => setSelVar((s) => ({ ...s, code: e.target.value }))} /></label>
                        <label className="col-span-2"><FL>Category *</FL><FS value={selVar.cat} options={categoryOptions} onChange={(v) => setSelVar((s) => ({ ...s, cat: v }))} placeholder="Category">{selVar.cat}</FS></label>
                        <label><FL>Sort Order</FL><FI type="number" value={selVar.order} onChange={(e) => setSelVar((s) => ({ ...s, order: Number(e.target.value) }))} /></label>
                        <label><FL>Status</FL><FS value={selVar.status} options={["Active", "Inactive"]} onChange={(v) => setSelVar((s) => ({ ...s, status: v }))}>{selVar.status}</FS></label>
                        <label className="col-span-2"><FL>Description (PDF-ready rich text)</FL><RichTextEditor value={selVar.desc || ""} onChange={(value) => setSelVar((s) => ({ ...s, desc: value }))} /></label>
                      </div>
                      <div className="flex justify-end"><MBtn onClick={async () => { const next = variants.map((option) => (option.id === selVar.id ? selVar : option)); setVariants(next); if (await persist(selSS, { variants: next })) show("Variant saved!"); }}><Save className="h-3 w-3" /> Save</MBtn></div>
                    </div>
                  )}
                  {variantStageTab === "rates" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold text-slate-700">{varRates.length} rate contract{varRates.length === 1 ? "" : "s"}</p><p className="text-[10px] text-slate-400">Only rates for {selVar.name} are shown.</p></div><MBtn sz="xs" onClick={() => { rateContractsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); openRate(); }}><Plus className="h-3 w-3" /> Add rate</MBtn></div>
                      {varRates.length ? <div className="space-y-1.5">{varRates.map((rate) => <button type="button" key={rate.id} onClick={() => { rateContractsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); openRate(rate); }} className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-left hover:border-blue-300"><span><span className="block text-[10px] font-semibold text-slate-700">{rate.market} · {rate.rateType}</span><span className="block text-[10px] text-slate-400">{formatDate(rate.from)} to {formatDate(rate.to)}</span></span><span className="text-[10px] font-semibold text-blue-700">Adult THB {Number(rate.adultSell || 0).toLocaleString()}</span></button>)}</div> : <p className="py-5 text-center text-[10px] text-slate-400">No rate contracts for this variant. Add its first contract.</p>}
                    </div>
                  )}
                  {variantStageTab === "transfers" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold text-slate-700">{variantTransfers.length} transfer option{variantTransfers.length === 1 ? "" : "s"}</p><p className="text-[10px] text-slate-400">Only transfers linked to {selVar.name} are shown.</p></div><MBtn sz="xs" onClick={() => { transferOptionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); openTx(); }}><Plus className="h-3 w-3" /> Add transfer</MBtn></div>
                      {variantTransfers.length ? <div className="space-y-1.5">{variantTransfers.map((transfer) => <button type="button" key={transfer.id} onClick={() => { transferOptionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); openTx(transfer); }} className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-left hover:border-blue-300"><span><span className="block text-[10px] font-semibold text-slate-700">{transfer.type} · {transfer.route || "Route not set"}</span><span className="block text-[10px] text-slate-400">{transfer.vehicleName || (transfer.vehicleCosts?.length ? `${transfer.vehicleCosts.length} vehicle prices` : "No vehicle selected")}{transfer.vehicleSupplierName ? ` · ${transfer.vehicleSupplierName}` : ""}</span></span><span className="text-[10px] font-semibold text-blue-700">Adult THB {Number(transfer.adultP || 0).toLocaleString()}</span></button>)}</div> : <p className="py-5 text-center text-[10px] text-slate-400">No transfer options for this variant. Add one in Stage 6.</p>}
                    </div>
                  )}
                  {variantStageTab === "images" && (
                    <div className="space-y-3">
                      <div><p className="text-[11px] font-semibold text-slate-700">Variant image</p><p className="text-[10px] text-slate-400">This one image belongs only to {selVar.name} and is used in the selected variant's quotation and voucher PDFs.</p></div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {(selVar.images || []).map((image, index) => <div key={image.key || image.url || index} className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50"><img src={image.url} alt={`${selVar.name} ${index + 1}`} className="h-20 w-full object-cover" /><button type="button" title="Remove variant image" disabled={saving} onClick={() => removeVariantImage(index)} className="absolute right-1 top-1 rounded bg-white/90 p-1 text-red-500 opacity-0 shadow group-hover:opacity-100 disabled:cursor-not-allowed"><X className="h-3 w-3" /></button><p className="truncate px-1.5 py-1 text-[9px] text-slate-500">{image.name || `Image ${index + 1}`}</p></div>)}
                        <button type="button" disabled={saving} onClick={() => variantImageInputRef.current?.click()} className="grid h-[106px] place-items-center rounded-lg border-2 border-dashed border-slate-200 text-slate-400 transition-colors hover:border-blue-300 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-60"><span className="text-center"><Upload className="mx-auto h-4 w-4" /><span className="mt-1 block text-[10px]">{saving ? "Uploading..." : (selVar.images || []).length ? "Replace image" : "Upload image"}</span></span></button>
                      </div>
                      <input ref={variantImageInputRef} type="file" accept="image/*" className="hidden" onChange={uploadVariantImages} />
                      <p className="text-[10px] text-slate-400">One image per variant. Uploading a replacement updates all future PDFs.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center text-slate-300 gap-2">
                <Settings2 className="h-6 w-6" />
                <p className="text-[11px]">Select a variant</p>
              </div>
            )}
          </Panel>

          <div ref={rateContractsRef} className="scroll-mt-4">
            <Panel
              n="5"
              title={"Rate Contracts — " + (selVar?.name || "Select a Variant")}
              action={<div className="flex items-center gap-1.5"><button type="button" onClick={() => setShowExpiredRates((value) => !value)} className={`rounded-md px-2 py-1 text-[10px] font-semibold ${showExpiredRates ? "bg-red-600 text-white" : "bg-red-50 text-red-700"}`}>{expiredRateCount} expired</button><MBtn sz="xs" disabled={!selVar?.id} onClick={() => openRate()}><Plus className="h-3 w-3" /> Add Rate</MBtn></div>}
            >
            <div className="p-3 space-y-2.5">
              {varRates.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-3">
                  {selVar ? `No rates for ${selVar.name}. Add one!` : "Select a variant to view rate contracts."}
                </p>
              )}
              {varRates.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-slate-200 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border-b border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-600">
                      {r.market} · {r.rateType} · {formatDate(r.from)} → {formatDate(r.to)}
                    </span>
                    <div className="flex gap-0.5">
                      <button
                        onClick={() => openRate(r)}
                        className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => deleteRate(r.id)}
                        className="p-1 text-red-400 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <CT
                    headers={[
                      "Pax Type",
                      "Cost (THB)",
                      "Selling (THB)",
                      "Markup",
                    ]}
                  >
                    {[
                      [
                        "Adult",
                        r.adultCost,
                        r.adultSell,
                        r.adultSell - r.adultCost,
                      ],
                      [
                        "Child",
                        r.childCost,
                        r.childSell,
                        r.childSell - r.childCost,
                      ],
                    ].map(([label, cost, sell, markup]) => (
                      <tr key={label} className="text-[11px]">
                        <td className="px-2.5 py-1.5 font-medium text-slate-700">
                          {label}
                        </td>
                        <td className="px-2.5 py-1.5">{cost}</td>
                        <td className="px-2.5 py-1.5 font-semibold text-blue-700">
                          {sell}
                        </td>
                        <td
                          className={
                            "px-2.5 py-1.5 font-medium " +
                            (markup > 0 ? "text-emerald-600" : "text-slate-300")
                          }
                        >
                          {markup > 0 ? "+" + markup : "—"}
                        </td>
                      </tr>
                    ))}
                  </CT>
                </div>
              ))}
            </div>
            </Panel>
          </div>

        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div ref={transferOptionsRef} className="scroll-mt-4">
            <Panel
              n="6"
              title={"Transfer Options — " + (selVar?.name || "Select a Variant")}
              action={
              <MBtn sz="xs" disabled={!selVar?.id} onClick={() => openTx()}>
                <Plus className="h-3 w-3" /> Add Transfer
              </MBtn>
            }
          >
            <div className="p-3">
              <CT
                headers={[
                  "#",
                  "Transfer Type",
                  "Route",
                  "Adult",
                  "Child",
                  "Status",
                  "",
                ]}
              >
                {variantTransfers.map((t, i) => (
                  <tr key={t.id} className="hover:bg-slate-50 text-[11px]">
                    <td className="px-2.5 py-1.5 text-slate-400">{i + 1}</td>
                    <td className="px-2.5 py-1.5 font-medium text-slate-700">
                      {t.type}
                    </td>
                    <td className="px-2.5 py-1.5 text-slate-500"><div>{t.route}</div>{t.vehicleSupplierName && <div className="mt-0.5 text-[10px] text-violet-600">Supplier: {t.vehicleSupplierName}</div>}{t.vehicleCosts?.length ? <div className="mt-0.5 text-[10px] text-blue-600">{t.vehicleCosts.length} {t.type} vehicle price{t.vehicleCosts.length === 1 ? "" : "s"}</div> : t.vehicleName && <div className="mt-0.5 text-[10px] text-blue-600">{t.vehicleName} · {t.vehicleCapacity || 0} Pax</div>}</td>
                    <td className="px-2.5 py-1.5 text-blue-700 font-semibold">
                      {t.adultP.toLocaleString()}
                    </td>
                    <td className="px-2.5 py-1.5 text-blue-600">
                      {t.childP.toLocaleString()}
                    </td>
                    <td className="px-2.5 py-1.5">
                      <ABadge status={t.status} />
                    </td>
                    <td className="px-2.5 py-1.5">
                      <div className="flex justify-end gap-0.5">
                        <button
                          onClick={() => openTx(t)}
                          className="rounded p-1 text-blue-500 hover:bg-blue-50"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => deleteTx(t.id)}
                          className="rounded p-1 text-red-400 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {variantTransfers.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-4 text-center text-[11px] text-slate-400"
                    >
                      {selVar ? `No transfers for ${selVar.name}.` : "Select a variant to view transfer options."}
                    </td>
                  </tr>
                )}
              </CT>
            </div>
            </Panel>
          </div>

          {/* Section 7 is intentionally paused for now.  Keep its implementation
              available so existing add-on data is not altered. */}
          {false && <Panel
            n="7"
            title="Add-ons (optional activities)"
            action={
              <MBtn sz="xs" onClick={() => openAddon()}>
                <Plus className="h-3 w-3" /> Add Add-on
              </MBtn>
            }
          >
            <div className="p-3">
              <CT
                headers={[
                  "#",
                  "Add-on Name",
                  "Type",
                  "Adult (THB)",
                  "Child (THB)",
                  "Status",
                  "",
                ]}
              >
                {addons.map((a, i) => (
                  <tr key={a.id} className="hover:bg-slate-50 text-[11px]">
                    <td className="px-2.5 py-1.5 text-slate-400">{i + 1}</td>
                    <td className="px-2.5 py-1.5 font-medium text-slate-700">
                      {a.name}
                    </td>
                    <td className="px-2.5 py-1.5">{a.type}</td>
                    <td className="px-2.5 py-1.5 text-blue-700 font-semibold">
                      {a.adultP.toLocaleString()}
                    </td>
                    <td className="px-2.5 py-1.5 text-blue-600">
                      {a.childP.toLocaleString()}
                    </td>
                    <td className="px-2.5 py-1.5">
                      <ABadge status={a.status} />
                    </td>
                    <td className="px-2.5 py-1.5">
                      <div className="flex justify-end gap-0.5">
                        <button
                          onClick={() => openAddon(a)}
                          className="rounded p-1 text-blue-500 hover:bg-blue-50"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => deleteAddon(a.id)}
                          className="rounded p-1 text-red-400 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {addons.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-4 text-center text-[11px] text-slate-400"
                    >
                      No add-ons.
                    </td>
                  </tr>
                )}
              </CT>
            </div>
          </Panel>}

          <Panel n="8" title="Show Timings, Supplements & Policies">
            <div className="grid grid-cols-3 divide-x divide-slate-100 p-3">
              <div className="pr-3 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wide text-blue-700">
                    Timings
                  </h3>
                  <button
                    onClick={() => setMTiming(true)}
                    className="text-[9px] flex items-center gap-0.5 text-blue-500 hover:text-blue-700"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    Add
                  </button>
                </div>
                {customTimings.map((t, i) => (
                  <div key={t + i} className="flex items-center gap-1">
                    <CRow
                      label={
                        <span className="flex items-center gap-1">
                          <Clock3 className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span>{t || 'No specific show time'}</span>
                          <span className="text-[8px] text-slate-400">
                            {(timingDays[i] || WEEK_DAYS).map((day) => day.slice(0, 3)).join(", ")}
                          </span>
                          {(timingOpenings[i] || timingClosings[i]) && <span className="text-[8px] font-medium text-blue-600">{timingOpenings[i] || '—'} – {timingClosings[i] || '—'}</span>}
                        </span>
                      }
                      checked={activeTimes[i] !== false}
                      onChange={() =>
                        setActiveTimes((p) => {
                          const n = [...p];
                          n[i] = !n[i];
                          return n;
                        })
                      }
                    />
                    <button
                      onClick={async () => {
                        const nextTimings = customTimings.filter((_, j) => j !== i);
                        const nextDays = timingDays.filter((_, j) => j !== i);
                        const nextOpenings = timingOpenings.filter((_, j) => j !== i);
                        const nextClosings = timingClosings.filter((_, j) => j !== i);
                        setCustomTimings(nextTimings);
                        setTimingDays(nextDays);
                        setTimingOpenings(nextOpenings);
                        setTimingClosings(nextClosings);
                        setActiveTimes((a) => a.filter((_, j) => j !== i));
                        await persist(selSS, { timings: nextTimings.map((time, index) => ({ time, days: nextDays[index] || WEEK_DAYS, openingTime: nextOpenings[index] || '', closingTime: nextClosings[index] || '' })) });
                      }}
                      className="ml-auto text-red-300 hover:text-red-500"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="px-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    Supplements
                  </h3>
                  <button
                    onClick={() => {
                      setFSupp({ label: "", amount: "" });
                      setMSupp(true);
                    }}
                    className="text-[9px] flex items-center gap-0.5 text-blue-500 hover:text-blue-700"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    Add
                  </button>
                </div>
                <table className="w-full text-[10px]">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="text-left py-1 font-semibold">Type</th>
                      <th className="py-1 font-semibold text-right">Amt</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {supps.map((s) => (
                      <tr key={s.id} className="border-t border-slate-100">
                        <td className="py-1 text-slate-600">{s.label}</td>
                        <td className="py-1 text-right font-semibold text-blue-700">
                          {s.amount}
                        </td>
                        <td className="py-1 pl-1">
                          <button
                            onClick={async () => {
                              const next = supps.filter((x) => x.id !== s.id);
                              setSupps(next);
                              await persist(selSS, { supps: next });
                            }}
                            className="text-red-300 hover:text-red-500"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {supps.length === 0 && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    No supplements.
                  </p>
                )}
              </div>
              <div className="pl-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    Policies
                  </h3>
                  <button
                    onClick={() => {
                      setFPolicy({ text: "" });
                      setMPolicy(true);
                    }}
                    className="text-[9px] flex items-center gap-0.5 text-blue-500 hover:text-blue-700"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    Add
                  </button>
                </div>
                <ul className="space-y-1">
                  {policies.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-start gap-1.5 text-[10px] text-slate-600"
                    >
                      <Info className="h-2.5 w-2.5 mt-0.5 text-slate-300 flex-shrink-0" />
                      <span className="flex-1">{p.text}</span>
                      <button
                        onClick={async () => {
                          const next = policies.filter((x) => x.id !== p.id);
                          setPolicies(next);
                          await persist(selSS, { policies: next });
                        }}
                        className="text-red-300 hover:text-red-500 flex-shrink-0"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                {policies.length === 0 && (
                  <p className="text-[10px] text-slate-400">No policies.</p>
                )}
              </div>
            </div>
          </Panel>
        </div>

        {/* Final master-data step */}
        <div className="grid grid-cols-1 gap-4">
          <Panel n="9" title="Category Master" action={<MBtn sz="xs" v="secondary" onClick={() => setCategoryMasterOpen((open) => !open)}>{categoryMasterOpen ? "Close" : "Manage"}<span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600">{categoryMasters.length}</span></MBtn>}>
            <div className="p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="text-[11px] font-semibold text-slate-700">Sightseeing categories</p><p className="text-[10px] text-slate-400">Used by the sightseeing and variant category dropdowns.</p></div>
                {!categoryMasterOpen && <button type="button" onClick={() => setCategoryMasterOpen(true)} className="text-[10px] font-semibold text-blue-600 hover:text-blue-700">Add or manage categories</button>}
              </div>
              {categoryMasterOpen && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <div className="flex gap-2"><FI value={categoryDraft} onChange={(event) => setCategoryDraft(event.target.value)} placeholder="New category" /><MBtn sz="xs" onClick={addCategory}><Plus className="h-3 w-3" /> Add</MBtn></div>
                  <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    {categoryMasters.map((category) => <div key={category.id} className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-1 pl-2 pr-1 text-[10px] font-medium text-slate-700"><span>{category.name}</span><ABadge status={category.status} /><button type="button" title={`Remove ${category.name}`} onClick={() => removeCategory(category)} className="rounded-full p-0.5 text-red-400 hover:bg-red-50"><Trash2 className="h-3 w-3" /></button></div>)}
                    {categoryMasters.length === 0 && <p className="py-2 text-[11px] text-slate-400">No categories yet.</p>}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* Row 4 */}
        {/* <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
          <Panel n="9" title="How it Appears in Quotation / Booking">
            <div className="grid grid-cols-1 gap-4 p-3 md:grid-cols-[260px_1fr]">
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-700">
                  Build Quotation Item
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <label className="col-span-2">
                    <FL>Sightseeing *</FL>
                    <FS
                      value={selSS?.name}
                      options={ssList
                        .filter((s) => s.status === "Active")
                        .map((s) => s.name)}
                      onChange={(v) => {
                        const f = ssList.find((s) => s.name === v);
                        if (f) setSelSS(f);
                      }}
                      placeholder="Select sightseeing"
                    >
                      {selSS?.name}
                    </FS>
                  </label>
                  <label className="col-span-2">
                    <FL>Option *</FL>
                    <FS
                      value={selVar?.name}
                      options={variants
                        .filter((v) => v.status === "Active")
                        .map((v) => v.name)}
                      onChange={(v) => {
                        const f = variants.find((x) => x.name === v);
                        if (f) selectVariant(f);
                      }}
                      placeholder="Select option"
                    >
                      {selVar?.name}
                    </FS>
                  </label>
                  <label>
                    <FL>Date *</FL>
                    <DateInput
                      value={qDate}
                      onChange={setQDate}
                    />
                  </label>
                  <label>
                    <FL>Show Time</FL>
                    <FS
                      value={qTime}
                      options={customTimings.filter(
                        (_, i) => activeTimes[i] !== false,
                      )}
                      onChange={setQTime}
                      placeholder="Select time"
                    >
                      {qTime}
                    </FS>
                  </label>
                </div>
                <div>
                  <FL>Pax</FL>
                  <div className="grid grid-cols-3 gap-2">
                    {["adult", "child", "infant"].map((type) => (
                      <div key={type}>
                        <div className="text-[9px] text-slate-400 mb-0.5 capitalize">
                          {type}
                        </div>
                        <div className="flex items-center h-8 border border-slate-200 rounded-lg overflow-hidden bg-white">
                          <button
                            onClick={() =>
                              setQPax((p) => ({
                                ...p,
                                [type]: Math.max(0, p[type] - 1),
                              }))
                            }
                            className="w-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 h-full border-r border-slate-100 font-bold"
                          >
                            -
                          </button>
                          <span className="flex-1 text-center text-[11px] font-semibold text-slate-700">
                            {qPax[type]}
                          </span>
                          <button
                            onClick={() =>
                              setQPax((p) => ({ ...p, [type]: p[type] + 1 }))
                            }
                            className="w-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 h-full border-l border-slate-100 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 space-y-1.5">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                    Transfer
                  </p>
                  {transfers
                    .filter((t) => t.status === "Active")
                    .map((t) => (
                      <CRow
                        key={t.id}
                        label={
                          <span className="flex items-center gap-1">
                            <Car className="h-3 w-3 text-slate-400" />
                            {t.type}
                            {t.adultP > 0
                              ? " (+" + t.adultP + "A/" + t.childP + "C)"
                              : " (Free)"}
                          </span>
                        }
                        checked={qTxId === t.id}
                        onChange={() => setQTxId(qTxId === t.id ? null : t.id)}
                      />
                    ))}
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mt-1.5 mb-1">
                    Add-ons
                  </p>
                  {addons
                    .filter((a) => a.status === "Active")
                    .map((a) => (
                      <CRow
                        key={a.id}
                        label={
                          <span className="flex items-center gap-1">
                            <PackagePlus className="h-3 w-3 text-slate-400" />
                            {a.name} (+{a.adultP})
                          </span>
                        }
                        checked={qAddonIds.includes(a.id)}
                        onChange={() =>
                          setQAddonIds((ids) =>
                            ids.includes(a.id)
                              ? ids.filter((i) => i !== a.id)
                              : [...ids, a.id],
                          )
                        }
                      />
                    ))}
                </div>
                <MBtn onClick={() => show("Added to itinerary!")}>
                  <Plus className="h-3 w-3" /> Add to Itinerary
                </MBtn>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Quotation View (Live)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Auto-calculated
                  </span>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {[
                        "#",
                        "Service",
                        "Details",
                        "Date",
                        "Pax",
                        "Rate (THB)",
                        "Amount",
                        "",
                      ].map((h, i) => (
                        <th
                          key={i}
                          className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 text-[11px]">
                      <td className="px-2.5 py-2 text-slate-400">1</td>
                      <td className="px-2.5 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">
                            {selSS?.img || "🐬"}
                          </span>
                          <span className="font-semibold text-slate-700">
                            {selSS?.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-2.5 py-2">
                        <div className="text-[10px] text-slate-600 space-y-0.5">
                          <div className="font-medium">{selVar?.name}</div>
                          <div className="text-slate-400">
                            {qTime} · {qTxItem ? qTxItem.type : "No Transfer"}
                          </div>
                          {qAddonList.map((a) => (
                            <div key={a.id} className="text-emerald-600">
                              + {a.name}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-2.5 py-2 text-[10.5px]">{qDate}</td>
                      <td className="px-2.5 py-2 text-[10.5px]">
                        {qPax.adult}A
                        {qPax.child > 0 ? "+" + qPax.child + "C" : ""}
                      </td>
                      <td className="px-2.5 py-2">
                        <div className="text-[10px] space-y-0.5">
                          <div>
                            {totalA} x {qPax.adult}
                          </div>
                          {qPax.child > 0 && (
                            <div>
                              {totalC} x {qPax.child}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-2.5 py-2 font-bold text-blue-700">
                        {grandTotal.toLocaleString()}
                      </td>
                      <td className="px-2.5 py-2">
                        <button
                          onClick={() => show("Removed", "error")}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50">
                      <td
                        colSpan={6}
                        className="px-2.5 py-2 text-right font-bold text-slate-700 text-[11px]"
                      >
                        Grand Total
                      </td>
                      <td className="px-2.5 py-2 font-bold text-blue-800 text-[12px]">
                        {grandTotal.toLocaleString()}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
                <div className="px-3 py-2 bg-slate-50/50 border-t border-slate-100">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                    Rate Breakdown / Adult
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 text-[10px]">
                    <span className="text-slate-500">
                      Base ({selVar?.name})
                    </span>
                    <span className="font-semibold text-slate-700">
                      THB {baseA}
                    </span>
                    {qTxItem && qTxItem.adultP > 0 && (
                      <>
                        <span className="text-slate-500">{qTxItem.type}</span>
                        <span className="font-semibold text-slate-700">
                          THB {txA}
                        </span>
                      </>
                    )}
                    {qAddonList.map((a) => (
                      <React.Fragment key={a.id}>
                        <span className="text-slate-500">{a.name}</span>
                        <span className="font-semibold text-slate-700">
                          THB {a.adultP}
                        </span>
                      </React.Fragment>
                    ))}
                    <span className="font-bold text-slate-700 border-t border-slate-200 mt-1 pt-1">
                      Total / Adult
                    </span>
                    <span className="font-bold text-blue-700 border-t border-slate-200 mt-1 pt-1">
                      THB {totalA}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel
            n="10"
            title="Output — Confirmation Voucher"
            action={
              <div className="flex items-center gap-1">
                <MBtn sz="xs" v="secondary" onClick={() => show("Printed!")}>
                  <Printer className="h-3 w-3" />
                </MBtn>
                <MBtn sz="xs" onClick={() => setMVoucher(true)}>
                  <Eye className="h-3 w-3" /> Preview
                </MBtn>
              </div>
            }
          >
            <div className="p-3">
              <div className="rounded-xl border border-slate-200 bg-white shadow-inner overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#0d3f6e] to-[#1a5fa8]">
                  <div>
                    <div className="text-xs font-bold text-white">
                      TripNest
                    </div>
                    <div className="text-[9px] text-blue-200">
                      Your trusted travel partner
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] font-bold text-white uppercase tracking-wider">
                      Confirmation Voucher
                    </div>
                    <div className="text-[9px] text-blue-200 font-mono">
                      VOC-{qDate?.replace(/-/g, "")?.slice(2)}-01
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-[11px] font-bold text-slate-800 mb-2">
                    Sightseeing: {selSS?.name}
                  </h3>
                  <div className="grid grid-cols-[52px_1fr] gap-2.5 mb-3">
                    <div className="grid h-14 place-items-center rounded-lg bg-sky-50 text-3xl">
                      {selSS?.img || "🐬"}
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9.5px]">
                      {[
                        ["Option", selVar?.name],
                        ["Date/Time", qDate + " " + qTime],
                        [
                          "Pax",
                          qPax.adult +
                            "A" +
                            (qPax.child > 0 ? " + " + qPax.child + "C" : ""),
                        ],
                        ["Transfer", qTxItem ? qTxItem.type : "No Transfer"],
                        [
                          "Add-ons",
                          qAddonList.map((a) => a.name).join(", ") || "None",
                        ],
                        ["Meeting", "Lobby"],
                      ].map(([k, v]) => (
                        <React.Fragment key={k}>
                          <dt className="text-slate-400">{k}</dt>
                          <dd className="font-medium text-slate-700 truncate">
                            {v}
                          </dd>
                        </React.Fragment>
                      ))}
                    </dl>
                  </div>
                  <div className="rounded-lg bg-blue-50 px-3 py-2 flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-blue-700">
                      Total Amount
                    </span>
                    <span className="text-sm font-bold text-blue-800">
                      THB {grandTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-2 text-[9.5px] text-amber-700">
                    <strong>Remarks:</strong> Arrive 30 min before show. Present
                    voucher at venue entrance.
                  </div>
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-100">
                  <div className="grid h-7 w-7 place-items-center rounded bg-slate-200 text-slate-400 text-[8px] font-bold">
                    QR
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    REF: TA-{qDate?.replace(/-/g, "")?.slice(2)}-01
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => show("Downloaded!")}
                      className="text-slate-400 hover:text-blue-600"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => show("Printing...")}
                      className="text-slate-400 hover:text-blue-600"
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </div> */}
      </div>

      {/* MODALS */}
      <ModalBox
        open={mSS}
        onClose={() => setMSS(false)}
        title={editSS ? "Edit Sightseeing" : "Add New Sightseeing"}
        footer={
          <>
            <MBtn v="secondary" onClick={() => setMSS(false)}>
              Cancel
            </MBtn>
            <MBtn onClick={saveSS}>
              <Save className="h-3 w-3" /> {editSS ? "Update" : "Create"}
            </MBtn>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2">
            <FL>Name *</FL>
            <FI
              value={fSS.name || ""}
              onChange={(e) => setFSS((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g. Dolphinarium Pattaya"
            />
          </label>
          <label>
            <FL>Destination *</FL>
            <FS
              value={fSS.dest}
              options={DESTS}
              onChange={(v) => setFSS((s) => ({ ...s, dest: v }))}
              placeholder="Destination"
            >
              {fSS.dest}
            </FS>
          </label>
          <label>
            <FL>Category *</FL>
            <FS
              value={fSS.cat}
              options={categoryOptions}
              onChange={(v) => setFSS((s) => ({ ...s, cat: v }))}
              placeholder="Category"
            >
              {fSS.cat}
            </FS>
          </label>
          <label>
            <FL>Duration</FL>
            <FI
              value={fSS.duration || ""}
              onChange={(e) =>
                setFSS((s) => ({ ...s, duration: e.target.value }))
              }
              placeholder="~2 Hours"
            />
          </label>
          <label>
            <FL>Status</FL>
            <FS
              value={fSS.status}
              options={["Active", "Inactive"]}
              onChange={(v) => setFSS((s) => ({ ...s, status: v }))}
            >
              {fSS.status}
            </FS>
          </label>
          <label className="col-span-2">
            <FL>Ticket Rate Contract</FL>
            <SearchableSelect value={fTx.ticketRateId || ""} options={rates.filter((rate) => rate.varId === selVar?.id).map((rate) => ({ value: rate.id, label: `${rate.market || "All markets"} · ${formatDate(rate.from)} to ${formatDate(rate.to)} · Adult THB ${Number(rate.adultSell || 0).toLocaleString()}` }))} onChange={(ticketRateId) => {
              const rate = rates.find((item) => item.id === ticketRateId);
              setFTx((current) => ({ ...current, ticketRateId, adultP: Number(rate?.adultSell || 0), childP: Number(rate?.childSell || 0) }));
            }} placeholder="Select a saved variant rate" />
            <span className="mt-1 block text-[10px] text-slate-500">Selecting a contract automatically uses its adult and child ticket selling rates below.</span>
          </label>
          <label>
            <FL>Emoji / Icon</FL>
            <FI
              value={fSS.img || ""}
              onChange={(e) => setFSS((s) => ({ ...s, img: e.target.value }))}
              placeholder="🌟"
            />
          </label>
          <label>
            <FL>Location</FL>
            <FI
              value={fSS.location || ""}
              onChange={(e) =>
                setFSS((s) => ({ ...s, location: e.target.value }))
              }
              placeholder="City, Country"
            />
          </label>
          <label className="col-span-2">
            <FL>Description (PDF-ready rich text)</FL>
            <RichTextEditor value={fSS.desc || ""} onChange={(value) => setFSS((s) => ({ ...s, desc: value }))} placeholder="Brief description..." />
          </label>
        </div>
      </ModalBox>

      <ModalBox
        open={mVar}
        onClose={() => setMVar(false)}
            title={editVar ? "Edit Variant" : "Add Variant"}
        footer={
          <>
            <MBtn v="secondary" onClick={() => setMVar(false)}>
              Cancel
            </MBtn>
            <MBtn onClick={saveVar}>
              <Save className="h-3 w-3" /> {editVar ? "Update" : "Create"}
            </MBtn>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <label>
            <FL>Variant Name *</FL>
            <FI
              value={fVar.name || ""}
              onChange={(e) => setFVar((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g. Premium Seat"
            />
          </label>
          <label>
            <FL>Variant Code *</FL>
            <FI
              value={fVar.code || ""}
              onChange={(e) => setFVar((s) => ({ ...s, code: e.target.value }))}
              placeholder="e.g. DOL-PRE"
            />
          </label>
          <label>
            <FL>Category *</FL>
            <FS
              value={fVar.cat}
              options={categoryOptions}
              onChange={(v) => setFVar((s) => ({ ...s, cat: v }))}
              placeholder="Category"
            >
              {fVar.cat}
            </FS>
          </label>
          <label>
            <FL>Sort Order</FL>
            <FI
              type="number"
              value={fVar.order || 1}
              onChange={(e) =>
                setFVar((s) => ({ ...s, order: Number(e.target.value) }))
              }
            />
          </label>
          <label>
            <FL>Status</FL>
            <FS
              value={fVar.status}
              options={["Active", "Inactive"]}
              onChange={(v) => setFVar((s) => ({ ...s, status: v }))}
            >
              {fVar.status}
            </FS>
          </label>
          <label>
            <FL>Default from time</FL>
            <FI type="time" value={fVar.defaultFromTime || ""} onChange={(e) => setFVar((s) => ({ ...s, defaultFromTime: e.target.value }))} />
          </label>
          <label>
            <FL>Default to time</FL>
            <FI type="time" value={fVar.defaultToTime || ""} onChange={(e) => setFVar((s) => ({ ...s, defaultToTime: e.target.value }))} />
          </label>
          <label>
            <FL>Default drop time</FL>
            <FI type="time" value={fVar.defaultDropTime || ""} onChange={(e) => setFVar((s) => ({ ...s, defaultDropTime: e.target.value }))} />
          </label>
          {!editVar && variants.length > 0 && (
            <label className="col-span-2">
              <FL>Copy transfer pricing from</FL>
              <SearchableSelect
                value={fVar.copyTransferPricingFrom || ""}
                options={variants.map((variant) => ({ value: variant.id, label: `${variant.name}${transfers.some((transfer) => String(transfer.variantId) === String(variant.id) && transfer.type !== 'Ticket Only') ? " — copy its transfer prices" : " — no transfer prices"}` }))}
                onChange={(value) => setFVar((current) => ({ ...current, copyTransferPricingFrom: value }))}
                placeholder="Do not copy transfer pricing"
              />
              <p className="mt-1 text-[10px] text-slate-400">Copies only SIC/PVT transfer prices and vehicle costs. Ticket prices, ticket-only options and ticket rate contracts are not copied.</p>
            </label>
          )}
          <label className="col-span-2">
            <FL>Description (PDF-ready rich text)</FL>
            <RichTextEditor value={fVar.desc || ""} onChange={(value) => setFVar((s) => ({ ...s, desc: value }))} />
          </label>
        </div>
      </ModalBox>

      <ModalBox
        open={mRate}
        onClose={() => setMRate(false)}
        title={editRate ? "Edit Rate Contract" : "Add Rate Contract"}
        size="lg"
        footer={
          <>
            <MBtn v="secondary" onClick={() => setMRate(false)}>
              Cancel
            </MBtn>
            <MBtn onClick={saveRate}>
              <Save className="h-3 w-3" /> Save
            </MBtn>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <label>
            <FL>Valid From *</FL>
            <DateFI value={fRate.from || ""} max={fRate.to || undefined} onChange={(value) => setFRate((s) => ({ ...s, from: value, to: s.to && value > s.to ? "" : s.to }))} />
          </label>
          <label>
            <FL>Valid To *</FL>
            <DateFI value={fRate.to || ""} min={fRate.from || undefined} onChange={(value) => setFRate((s) => ({ ...s, to: value }))} />
          </label>
          <label>
            <FL>Market *</FL>
            <FS
              value={fRate.market}
              options={marketOptions}
              onChange={(v) => setFRate((s) => ({ ...s, market: v }))}
              placeholder="Market"
            >
              {fRate.market}
            </FS>
          </label>
          <label>
            <FL>Rate Type *</FL>
            <FS
              value={fRate.rateType}
              options={RATE_TYPES}
              onChange={(v) => setFRate((s) => ({ ...s, rateType: v }))}
              placeholder="Rate Type"
            >
              {fRate.rateType}
            </FS>
          </label>
          <label>
            <FL>Adult Cost (THB)</FL>
            <FI
              type="number"
              value={fRate.adultCost || ""}
              onChange={(e) =>
                setFRate((s) => ({ ...s, adultCost: e.target.value }))
              }
              placeholder="0"
            />
          </label>
          <label>
            <FL>Child Cost (THB)</FL>
            <FI
              type="number"
              value={fRate.childCost || ""}
              onChange={(e) =>
                setFRate((s) => ({ ...s, childCost: e.target.value }))
              }
              placeholder="0"
            />
          </label>
        </div>
      </ModalBox>

      <ModalBox
        open={mTx}
        onClose={() => setMTx(false)}
        title={editTx ? "Edit Transfer" : "Add Transfer Option"}
        footer={
          <>
            <MBtn v="secondary" onClick={() => setMTx(false)}>
              Cancel
            </MBtn>
            <MBtn onClick={saveTx}>
              <Save className="h-3 w-3" /> Save
            </MBtn>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2">
            <FL>Transfer Type *</FL>
            <SearchableSelect value={fTx.type || ""} options={["SIC", "PVT", "Ticket Only"]} onChange={(type) => setFTx((current) => ({ ...current, type, vehicleSupplierId: "", vehicleSupplierName: "", vehicleId: "", vehicleName: "", vehicleCapacity: 0, vehicleCosts: [] }))} placeholder="Select transfer type" />
          </label>
          {["SIC", "PVT"].includes(fTx.type) && <>
            <label className="col-span-2">
              <FL>Vehicle / Transfer Supplier <span className="normal-case font-normal">(optional)</span></FL>
              <SearchableSelect
                value={fTx.vehicleSupplierId || ""}
                options={vehicleSuppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
                onChange={(supplierId) => {
                  const supplier = vehicleSuppliers.find((item) => item.id === supplierId);
                  setFTx((current) => ({ ...current, vehicleSupplierId: supplierId || "", vehicleSupplierName: supplier?.name || "" }));
                }}
                placeholder="Select vehicle or transfer supplier"
              />
              <p className="mt-1 text-[10px] text-slate-400">Active Vehicle and Transfer suppliers are available. The selected supplier is saved with this SIC/PVT option and shown when the sightseeing service is added to a quotation or booking.</p>
            </label>
            <div className="col-span-2 overflow-hidden rounded-xl border border-slate-200">
            <div className="bg-slate-900 px-3 py-2 text-white"><p className="text-xs font-semibold">{fTx.type} vehicle pricing</p><p className="mt-0.5 text-[10px] text-slate-300">Only vehicles marked {fTx.type} in Vehicle Master are available.</p></div>
            {availableVehicles.length === 0 ? <p className="p-3 text-[11px] text-slate-500">No active {fTx.type} vehicles found in Vehicle Master.</p> : <table className="w-full text-left text-[11px]"><thead className="bg-slate-100 text-slate-500"><tr><th className="px-3 py-2 font-semibold">Vehicle</th><th className="px-3 py-2 font-semibold">Sightseeing Capacity</th><th className="px-3 py-2 font-semibold">Vehicle Cost (THB)</th></tr></thead><tbody className="divide-y divide-slate-200">{availableVehicles.map((vehicle) => <tr key={vehicle.id}><td className="px-3 py-2 font-medium text-slate-700">{vehicle.name}</td><td className="px-3 py-2 text-slate-600">{vehicle.sightseeingCapacity || 0} Pax</td><td className="px-3 py-1.5"><FI type="number" min="0" value={transferVehicleCost(vehicle)} onChange={(event) => setTransferVehicleCost(vehicle, event.target.value)} placeholder="Enter cost" /></td></tr>)}</tbody></table>}
            </div>
          </>}
          <label>
            <FL>Route / Area</FL>
            <FI
              value={fTx.route || ""}
              onChange={(e) => setFTx((s) => ({ ...s, route: e.target.value }))}
              placeholder="e.g. Pattaya City"
            />
          </label>
          <label>
            <FL>Status</FL>
            <FS
              value={fTx.status}
              options={["Active", "Inactive"]}
              onChange={(v) => setFTx((s) => ({ ...s, status: v }))}
            >
              {fTx.status}
            </FS>
          </label>
          <label>
            <FL>Adult Price (THB)</FL>
            <FI
              type="number"
              value={fTx.adultP || ""}
              onChange={(e) =>
                setFTx((s) => ({ ...s, adultP: e.target.value }))
              }
              placeholder="0"
            />
          </label>
          <label>
            <FL>Child Price (THB)</FL>
            <FI
              type="number"
              value={fTx.childP || ""}
              onChange={(e) =>
                setFTx((s) => ({ ...s, childP: e.target.value }))
              }
              placeholder="0"
            />
          </label>
          <label className="col-span-2">
            <FL>Details</FL>
            <FI
              value={fTx.details || ""}
              onChange={(e) =>
                setFTx((s) => ({ ...s, details: e.target.value }))
              }
              placeholder="e.g. Hotel - Venue - Hotel"
            />
          </label>
        </div>
      </ModalBox>

      <ModalBox
        open={mAddon}
        onClose={() => setMAddon(false)}
        title={editAddon ? "Edit Add-on" : "Add Add-on"}
        footer={
          <>
            <MBtn v="secondary" onClick={() => setMAddon(false)}>
              Cancel
            </MBtn>
            <MBtn onClick={saveAddon}>
              <Save className="h-3 w-3" /> Save
            </MBtn>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <label>
            <FL>Name *</FL>
            <FI
              value={fAddon.name || ""}
              onChange={(e) =>
                setFAddon((s) => ({ ...s, name: e.target.value }))
              }
              placeholder="e.g. Photo Package"
            />
          </label>
          <label>
            <FL>Type</FL>
            <FI
              value={fAddon.type || "Add-on"}
              onChange={(e) =>
                setFAddon((s) => ({ ...s, type: e.target.value }))
              }
            />
          </label>
          <label>
            <FL>Adult Price (THB)</FL>
            <FI
              type="number"
              value={fAddon.adultP || ""}
              onChange={(e) =>
                setFAddon((s) => ({ ...s, adultP: e.target.value }))
              }
              placeholder="0"
            />
          </label>
          <label>
            <FL>Child Price (THB)</FL>
            <FI
              type="number"
              value={fAddon.childP || ""}
              onChange={(e) =>
                setFAddon((s) => ({ ...s, childP: e.target.value }))
              }
              placeholder="0"
            />
          </label>
          <label>
            <FL>Status</FL>
            <FS
              value={fAddon.status}
              options={["Active", "Inactive"]}
              onChange={(v) => setFAddon((s) => ({ ...s, status: v }))}
            >
              {fAddon.status}
            </FS>
          </label>
        </div>
      </ModalBox>

      <ModalBox
        open={mSupp}
        onClose={() => setMSupp(false)}
        title="Add Supplement"
        footer={
          <>
            <MBtn v="secondary" onClick={() => setMSupp(false)}>
              Cancel
            </MBtn>
            <MBtn
              onClick={async () => {
                if (!fSupp.label) return show("Label required", "error");
                const next = [...supps, { ...fSupp, id: nid(), amount: Number(fSupp.amount) }];
                setSupps(next);
                if (await persist(selSS, { supps: next })) {
                  setMSupp(false);
                  show("Added!");
                }
              }}
            >
              <Save className="h-3 w-3" /> Add
            </MBtn>
          </>
        }
      >
        <div className="grid gap-3">
          <label>
            <FL>Label *</FL>
            <FI
              value={fSupp.label}
              onChange={(e) =>
                setFSupp((s) => ({ ...s, label: e.target.value }))
              }
              placeholder="e.g. Weekend Supplement"
            />
          </label>
          <label>
            <FL>Amount (THB)</FL>
            <FI
              type="number"
              value={fSupp.amount}
              onChange={(e) =>
                setFSupp((s) => ({ ...s, amount: e.target.value }))
              }
              placeholder="0"
            />
          </label>
        </div>
      </ModalBox>

      <ModalBox
        open={mPolicy}
        onClose={() => setMPolicy(false)}
        title="Add Policy"
        footer={
          <>
            <MBtn v="secondary" onClick={() => setMPolicy(false)}>
              Cancel
            </MBtn>
            <MBtn
              onClick={async () => {
                if (!fPolicy.text) return show("Text required", "error");
                const next = [...policies, { ...fPolicy, id: nid() }];
                setPolicies(next);
                if (await persist(selSS, { policies: next })) {
                  setMPolicy(false);
                  show("Added!");
                }
              }}
            >
              <Save className="h-3 w-3" /> Add
            </MBtn>
          </>
        }
      >
        <label>
          <FL>Policy Text *</FL>
          <FTA
            rows={3}
            value={fPolicy.text}
            onChange={(e) =>
              setFPolicy((s) => ({ ...s, text: e.target.value }))
            }
            placeholder="Enter policy text..."
          />
        </label>
      </ModalBox>

      <ModalBox
        open={mTiming}
        onClose={() => setMTiming(false)}
        title="Add Show Timing"
        footer={
          <>
            <MBtn v="secondary" onClick={() => setMTiming(false)}>
              Cancel
            </MBtn>
            <MBtn
              onClick={async () => {
                const nextTimings = [...customTimings, newTiming];
                const nextDays = [...timingDays, newTimingDays];
                const nextOpenings = [...timingOpenings, newOpeningTime];
                const nextClosings = [...timingClosings, newClosingTime];
                setCustomTimings(nextTimings);
                setTimingDays(nextDays);
                setTimingOpenings(nextOpenings);
                setTimingClosings(nextClosings);
                setActiveTimes((a) => [...a, true]);
                setNewTiming("");
                setNewOpeningTime("");
                setNewClosingTime("");
                if (await persist(selSS, { timings: nextTimings.map((time, index) => ({ time, days: nextDays[index] || WEEK_DAYS, openingTime: nextOpenings[index] || '', closingTime: nextClosings[index] || '' })) })) {
                  setMTiming(false);
                  show("Added!");
                }
              }}
            >
              <Save className="h-3 w-3" /> Add
            </MBtn>
          </>
        }
      >
        <div className="grid grid-cols-3 gap-3">
          <label><FL>Show Time</FL><FI type="time" value={newTiming} onChange={(e) => setNewTiming(e.target.value)} /></label>
          <label><FL>Opening Time</FL><FI type="time" value={newOpeningTime} onChange={(e) => setNewOpeningTime(e.target.value)} /></label>
          <label><FL>Closing Time</FL><FI type="time" value={newClosingTime} onChange={(e) => setNewClosingTime(e.target.value)} /></label>
        </div>
        <div className="mt-3">
          <FL>Operating days *</FL>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setNewTimingDays((days) => days.length === WEEK_DAYS.length ? [] : WEEK_DAYS)} className={`rounded-md border px-2 py-1 text-[10px] font-medium ${newTimingDays.length === WEEK_DAYS.length ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>All</button>
            {WEEK_DAYS.map((day) => {
              const selected = newTimingDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setNewTimingDays((days) => selected ? days.filter((value) => value !== day) : [...days, day])}
                  className={`rounded-md border px-2 py-1 text-[10px] font-medium ${selected ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                >
                  {day.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      </ModalBox>

      <ModalBox open={!!viewSupplier} onClose={() => setViewSupplier(null)} title={`Supplier Details${viewSupplier?.name ? ` — ${viewSupplier.name}` : ""}`} size="lg" footer={<MBtn v="secondary" onClick={() => setViewSupplier(null)}><X className="h-3 w-3" /> Close</MBtn>}>
        <div className="space-y-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[["Supplier Name", viewSupplier?.name], ["Supplier Type", Array.isArray(viewSupplier?.type) ? viewSupplier.type.join(", ") : viewSupplier?.type], ["Contact Person", viewSupplier?.contactPerson], ["Phone", viewSupplier?.phone], ["Email", viewSupplier?.email], ["Country", viewSupplier?.country || "Thailand"], ["Currency", viewSupplier?.currency || "THB"]].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-[12px] font-medium text-slate-700 break-words">{value || "Not provided"}</p></div>)}</div><div className="rounded-xl border border-slate-200 bg-slate-100 p-3"><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Supplier bank details</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{SUPPLIER_BANK_FIELDS.map(([key, label]) => <div key={key} className="rounded-lg border border-slate-200 bg-white px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-[12px] font-medium text-slate-700 break-words">{viewSupplier?.bankDetails?.[key] || "Not provided"}</p></div>)}</div></div></div>
      </ModalBox>

      <ModalBox
        open={mVoucher}
        onClose={() => setMVoucher(false)}
        title="Confirmation Voucher Preview"
        size="lg"
        footer={
          <>
            <MBtn v="secondary" onClick={() => setMVoucher(false)}>
              <X className="h-3 w-3" /> Close
            </MBtn>
            <MBtn v="secondary" onClick={() => show("Printing...")}>
              <Printer className="h-3 w-3" /> Print
            </MBtn>
            <MBtn onClick={() => show("Downloaded!")}>
              <Download className="h-3 w-3" /> Download PDF
            </MBtn>
          </>
        }
      >
        <div className="rounded-xl overflow-hidden border border-slate-200">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#0d3f6e] to-[#1a5fa8]">
            <div>
              <div className="text-sm font-bold text-white">
                TripNest
              </div>
              <div className="text-[10px] text-blue-200">
                Your trusted travel partner
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-white uppercase tracking-wider">
                Confirmation Voucher
              </div>
              <div className="text-[10px] text-blue-200 font-mono">
                VOC-{qDate?.replace(/-/g, "")?.slice(2)}-01
              </div>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <h2 className="text-sm font-bold text-slate-800">{selSS?.name}</h2>
            <div className="grid grid-cols-[76px_1fr] gap-3">
              <div className="grid h-20 place-items-center rounded-xl bg-sky-50 text-5xl">
                {selSS?.img || "🐬"}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {[
                  ["Option", selVar?.name],
                  ["Date", qDate],
                  ["Show Time", qTime],
                  [
                    "Pax",
                    qPax.adult +
                    " Adults, " +
                    qPax.child +
                    " Children, " +
                    qPax.infant +
                    " Infants",
                  ],
                  [
                    "Transfer",
                    qTxItem
                      ? qTxItem.type + " (" + qTxItem.route + ")"
                      : "No Transfer",
                  ],
                  [
                    "Add-ons",
                    qAddonList.map((a) => a.name).join(", ") || "None",
                  ],
                  ["Destination", selSS?.dest],
                  [
                    "Booking Ref",
                    "TA-" + qDate?.replace(/-/g, "")?.slice(2) + "-01",
                  ],
                ].map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt className="text-slate-400 font-medium">{k}</dt>
                    <dd className="text-slate-800 font-semibold">{v}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>
            <div className="rounded-lg bg-blue-50 px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700">
                Total Amount Paid
              </span>
              <span className="text-base font-bold text-blue-800">
                THB {grandTotal.toLocaleString()}
              </span>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
              <strong>Important Remarks:</strong>
              <ul className="mt-1 space-y-0.5 list-disc list-inside text-amber-700">
                {policies.slice(0, 4).map((p) => (
                  <li key={p.id}>{p.text}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </ModalBox>
    </div>
  );
}
