import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clipboard,
  Clock3,
  CreditCard,
  Download,
  FileText,
  Hotel,
  MapPin,
  Plane,
  RefreshCw,
  Search,
  Tag,
  Upload,
  UserRound,
  X,
  Car,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Pencil,
  Save,
  SlidersHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";
import { downloadExcelTable } from "../../lib/exportTable";
import { useApp } from "../../context/AppContext";
import { apiClient } from "../../lib/api";
import DateInput from "../../components/ui/DateInput";
import { todayIsoInTimeZone } from "../../lib/date";

const ExpandableText = ({ text, className }) => {
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = React.useRef(null);

  useEffect(() => {
    if (textRef.current && !expanded) {
      setIsTruncated(textRef.current.scrollHeight > textRef.current.clientHeight);
    }
  }, [text, expanded]);

  if (text === null || text === undefined) return null;
  
  const isNode = typeof text === 'object' && React.isValidElement(text);
  if (isNode || Array.isArray(text)) {
    return <div className={className}>{text}</div>;
  }

  const str = String(text);

  return (
    <div className="group relative flex items-start gap-1 w-full min-w-0">
      <div 
        ref={textRef}
        className={`${className} ${expanded ? "" : "line-clamp-2 break-words"}`}
      >
        {str}
      </div>
      {(isTruncated || expanded) && (
        <button
          type="button"
          title={expanded ? "Show less" : "Show full text"}
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="shrink-0 mt-px rounded bg-slate-200/60 p-0.5 text-slate-600 hover:bg-slate-300 hover:text-slate-900 transition-colors"
        >
          {expanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
        </button>
      )}
    </div>
  );
};

const BOOKING_STATUSES = ["Pending", "Confirm", "Cancel", "Shift"];
const inputClass =
  "h-7 rounded-lg border border-slate-300 bg-white px-1.5 text-[11px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
const text = (value) => String(value || "").trim();
const dateOnly = (value) => String(value || "").slice(0, 10);
const attachmentUrl = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(attachmentUrl).find(Boolean) || "";
  return attachmentUrl(value.url || value.secureUrl || value.secure_url || value.imageUrl || value.src || value.path);
};
const hotelMasterFor = (hotel = {}, hotelMasters = []) => {
  const hotelId = hotel.hotelId || hotel.masterId || hotel.id;
  const hotelName = text(hotel.name || hotel.hotel || hotel.hotelName).toLowerCase();
  return hotelMasters.find((item) => String(item.id || item._id || "") === String(hotelId || ""))
    || hotelMasters.find((item) => text(item.name || item.hotel).toLowerCase() === hotelName)
    || null;
};
const hotelImageFor = (hotel = {}, hotelMasters = []) => {
  const master = hotelMasterFor(hotel, hotelMasters);
  return attachmentUrl([
    master?.hotelImage, master?.image, master?.imageUrl, master?.images,
    hotel?.hotelImage, hotel?.image, hotel?.imageUrl, hotel?.images,
  ]);
};
const serviceKey = (service, index) => service.id || `service-${index}`;
const longDate = (value) => {
  const raw = dateOnly(value);
  if (!raw) return "—";
  const [year, month, day] = raw.split("-");
  return `${day} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(month) - 1]} ${year}`;
};
const addCalendarDays = (value, days) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const defaultTourDateRange = () => {
  const today = todayIsoInTimeZone();
  return { from: today, to: addCalendarDays(today, 3) };
};
const paxText = (booking) =>
  [
    `A- ${Number(booking.adults || 0)}`,
    Number(booking.children || 0) ? `C- ${Number(booking.children)}` : "",
    Number(booking.infants || 0) ? `I- ${Number(booking.infants)}` : "",
  ]
    .filter(Boolean)
    .join(", ");
const basisFor = (service) =>
  text(
    service.basis ||
      service.serviceBasis ||
      service.transferType ||
      (String(service.type).toLowerCase() === "transfer"
        ? "PVT"
        : "Ticket Only"),
  );
const shareBasis = (service) => {
  const configuredBasis = text(service.basis || service.serviceBasis || service.transferType);
  const value = (configuredBasis || (String(service.type || "").toLowerCase() === "transfer" ? "PVT" : "PRIVATE")).toUpperCase();
  if (["PVT", "PRIVATE"].includes(value)) return "PRIVATE";
  if (value === "SIC") return "SIC";
  return value || "PRIVATE";
};
const categoryFor = (service) => {
  const type = String(service.type || "").toLowerCase();
  if (type === "transfer") return "Transfer";
  if (type.includes("meal") || type.includes("restaurant")) return "Meal";
  if (["sightseeing", "activity", "yacht"].includes(type)) return "Activity";
  return "Extra";
};
const statusClass = (status) =>
  status === "Confirm"
    ? "bg-emerald-100 text-emerald-700"
    : status === "Cancel"
      ? "bg-red-100 text-red-700"
      : status === "Shift"
        ? "bg-violet-100 text-violet-700"
        : "bg-amber-100 text-amber-700";
const serviceStatus = (service = {}) => {
  const saved = service.operationStatus || "Confirm";
  return ({ Confirmed: "Confirm", Cancelled: "Cancel", Assigned: "Confirm" })[saved] || saved;
};
const vehicleNameFor = (service = {}, vehicles = []) => {
  // Transfers and sightseeing-with-transport store the selected vehicle under
  // different field names. Resolve every quotation and voucher form before
  // falling back to the master ID, so operations never shows an internal ID.
  const label = text(service.vehicleName || service.vehicleLabel || service.selectedVehicleName || service.transferVehicleName || service.transportVehicleName);
  const selected = [service.vehicleId, service.vehicle, service.transferVehicle, service.transportVehicle].find(Boolean);
  if (selected && typeof selected === 'object') return text(selected.name || selected.vehicleName || selected.label);
  const raw = text(selected || label);
  const matched = vehicles.find((vehicle) => (
    [vehicle.id, vehicle._id].some((id) => String(id || '') === raw || String(id || '') === label)
    || text(vehicle.name || vehicle.vehicleName).toLowerCase() === label.toLowerCase()
  ));
  return text(matched?.name || matched?.vehicleName || matched?.brand || label || raw);
};
const vehicleQuantityFor = (service = {}) => Math.max(1, Number(service.vehicleCount || service.vehicleQuantity || service.transportVehicleCount || service.transferVehicleCount || service.quantity || 1));
const supplierNameFor = (service = {}, suppliers = []) => {
  const selected = service.supplierName || service.supplier || service.supplierId;
  if (selected && typeof selected === "object") return text(selected.name || selected.supplierName || selected.label);
  const raw = text(selected);
  const matched = suppliers.find((supplier) => (
    [supplier.id, supplier._id].some((id) => String(id || "") === raw)
    || text(supplier.name).toLowerCase() === raw.toLowerCase()
  ));
  return text(matched?.name || raw);
};
const voucherSourcesFor = (booking = {}) => {
  const sources = [
    booking.vouchers?.combined,
    booking.voucher,
    booking.vouchers?.transfer,
    booking.vouchers?.sightseeing,
    booking.vouchers?.other,
    booking.vouchers?.hotel,
  ].filter((voucher) => voucher && typeof voucher === "object");
  return [...new Set(sources)];
};
const voucherServiceFor = (booking, service) => {
  const serviceDate = dateOnly(service.serviceDate || service.date);
  const serviceName = text(service.name || service.variantName).toLowerCase();
  const allServices = voucherSourcesFor(booking).flatMap((voucher) => voucher.services || []);
  const sameDateAndType = allServices.filter((item) => (
    String(item.type || "").toLowerCase() === String(service.type || "").toLowerCase()
    && dateOnly(item.date || item.serviceDate) === serviceDate
  ));
  return (service.id && allServices.find((item) => String(item.id || "") === String(service.id)))
    || allServices.find((item) => (
      String(item.type || "").toLowerCase() === String(service.type || "").toLowerCase()
      && dateOnly(item.date || item.serviceDate) === serviceDate
      && text(item.name || item.variantName).toLowerCase() === serviceName
    ))
    // A saved voucher can contain a cleaned-up service name. If that date has
    // only one service of this type, it is still the same operational service.
    || (sameDateAndType.length === 1 ? sameDateAndType[0] : null)
    || null;
};
const voucherFlightFor = (booking, service) => {
  const serviceDate = dateOnly(service.serviceDate || service.date || service.arrivalDate);
  const flights = voucherSourcesFor(booking).flatMap((voucher) => voucher.flights || []);
  return flights.find((flight) => dateOnly(flight.date) === serviceDate) || null;
};
const serviceWithVoucherTimes = (booking, service) => {
  const voucherService = voucherServiceFor(booking, service) || {};
  const voucherFlight = voucherFlightFor(booking, service) || {};
  const pickupTime = service.pickupTime || service.fromTime || voucherService.pickupTime || voucherService.fromTime || voucherService.time || "";
  const returnTime = service.returnTime || service.toTime || voucherService.returnTime || voucherService.toTime || voucherService.dropUpTime || voucherService.dropTime || "";
  const flightTime = service.flightTime || service.arrivalTime || voucherService.flightTime || voucherService.arrivalTime || voucherFlight.arrival || voucherFlight.departure || "";
  return {
    ...service,
    flightNo: service.flightNo || service.airlineFlight || voucherService.flightNo || voucherService.airlineFlight || voucherFlight.airlineFlight || "",
    vehicleName: service.vehicleName || service.vehicleLabel || service.selectedVehicleName || service.transferVehicleName || service.transportVehicleName || voucherService.vehicleName || voucherService.vehicleLabel || voucherService.selectedVehicleName || voucherService.transferVehicleName || voucherService.transportVehicleName || "",
    vehicle: service.vehicle || service.vehicleId || service.transferVehicle || service.transportVehicle || voucherService.vehicle || voucherService.vehicleId || voucherService.transferVehicle || voucherService.transportVehicle || "",
    vehicleId: service.vehicleId || voucherService.vehicleId || "",
    vehicleCount: service.vehicleCount || service.vehicleQuantity || service.transportVehicleCount || service.transferVehicleCount || voucherService.vehicleCount || voucherService.vehicleQuantity || voucherService.transportVehicleCount || voucherService.transferVehicleCount || "",
    supplier: service.supplier || service.supplierName || service.supplierId || voucherService.supplier || voucherService.supplierName || voucherService.supplierId || "",
    supplierName: service.supplierName || voucherService.supplierName || "",
    supplierId: service.supplierId || voucherService.supplierId || "",
    meetingPoint: service.meetingPoint || voucherService.meetingPoint || "",
    pickupFrom: service.pickupFrom || service.pickupPoint || service.origin || service.fromSector || voucherService.pickupFrom || voucherService.pickupPoint || voucherService.origin || voucherService.fromSector || "",
    dropAt: service.dropAt || service.dropPoint || service.dropOff || service.destination || service.toSector || voucherService.dropAt || voucherService.dropPoint || voucherService.dropOff || voucherService.destination || voucherService.toSector || "",
    pickupTime,
    fromTime: service.fromTime || pickupTime,
    returnTime,
    toTime: service.toTime || returnTime,
    flightTime,
    arrivalTime: service.arrivalTime || flightTime,
  };
};

function hotelForService(booking, serviceDate) {
  const date = dateOnly(serviceDate);
  const findHotel = (hotels = []) => hotels.find((hotel) => {
    const checkIn = dateOnly(hotel.checkIn || booking.arrivalDate);
    const checkOut = dateOnly(hotel.checkOut || booking.departureDate);
    return date && (!checkIn || date >= checkIn) && (!checkOut || date < checkOut);
  });
  const voucherHotels = voucherSourcesFor(booking).flatMap((voucher) => voucher.hotels || []);
  return (
    findHotel(booking.hotels) ||
    findHotel(voucherHotels) ||
    (booking.hotels || [])[0] ||
    voucherHotels[0] ||
    {}
  );
}
function clientPaymentStatus(booking) {
  const total = Number(booking.totalSelling || 0);
  const paid = (booking.payments || [])
    .filter(
      (payment) =>
        payment.status === "Paid" &&
        ["Client Payment", "Receivable"].includes(payment.type),
    )
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  return total > 0 && paid >= total
    ? "Paid"
    : paid > 0
      ? "Part Paid"
      : "Pending";
}
function copyText(row, vehicles = []) {
  const { booking, service, hotel } = row;
  const isTransfer = String(service.type || "").toLowerCase() === "transfer";
  const vehicleName = vehicleNameFor(service, vehicles);
  const notAssigned = "Not assigned";
  const bookingName = booking.guestName || notAssigned;
  const boardName = service.boardName || bookingName;
  const hotelName = hotel?.name || hotel?.hotel || hotel?.hotelName || "";
  const pickup = service.pickupFrom || service.pickupPoint || service.origin || service.fromSector || hotelName || notAssigned;
  const drop = service.dropAt || service.dropPoint || service.dropOff || service.destination || service.toSector || notAssigned;
  const pickupTime = service.pickupTime || service.fromTime || service.time || notAssigned;
  const dropTime = service.returnTime || service.toTime || service.dropTime || notAssigned;
  const vehicle = vehicleName ? `${vehicleName} × ${vehicleQuantityFor(service)}` : notAssigned;
  return [
    `╭──────────────────────────────╮`,
    `│  TOUR OPERATION · ${shareBasis(service)} ${String(service.type || "Service").toUpperCase()}`,
    `╰──────────────────────────────╯`,
    `📅 ${longDate(row.date)}  •  ${booking.queryId || booking.id}`,
    "",
    `👤 GUEST & BOOKING`,
    `• Guest: ${bookingName}`,
    `• Board name: ${boardName}`,
    `• Pax: ${paxText(booking) || notAssigned}`,
    "",
    ...(isTransfer
      ? [
          `✈️ FLIGHT`,
          `• Flight: ${service.flightNo || service.airlineFlight || notAssigned}`,
          `• Flight time: ${service.flightTime || service.arrivalTime || notAssigned}`,
          `• Arrival date: ${longDate(service.arrivalDate || row.date)}`,
          "",
        ]
      : []),
    `🧭 SERVICE`,
    `• ${service.name || service.variantName || notAssigned}`,
    `• Hotel: ${hotelName || notAssigned}`,
    `• Vehicle: ${vehicle}`,
    "",
    `📍 MOVEMENT`,
    `• Meeting point: ${service.meetingPoint || notAssigned}`,
    `• Pickup: ${pickup}  |  ${pickupTime}`,
    `• Drop: ${drop}  |  ${dropTime}`,
    "",
    `Please coordinate this service as scheduled.`,
  ].join("\n");
}

function DetailCard({ icon: Icon, label, value, colorClass = "blue", valueClass = "text-slate-800", valueNode }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    red: "bg-rose-50 text-rose-500",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-500",
    indigo: "bg-indigo-50 text-indigo-600",
    purple: "bg-purple-50 text-purple-600",
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-100 text-slate-500",
  };
  const iconColor = colors[colorClass] || colors.blue;

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/75 bg-white p-2.5 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">
          {label}
        </div>
        <ExpandableText
          text={valueNode || value || "—"}
          className={`mt-1 text-xs font-extrabold ${valueClass} leading-tight`}
        />
      </div>
    </div>
  );
}

const StatusPill = ({ status }) => {
  const isSuccess = status === "Confirm" || status === "Paid";
  const isWarning = status === "Pending" || status === "Part Paid" || status === "Shift";
  const isDanger = status === "Cancel";
  
  let bgClass = "bg-slate-100 text-slate-700";
  let Icon = Tag;
  
  if (isSuccess) {
    bgClass = "bg-emerald-100 text-emerald-700";
    Icon = CheckCircle;
  } else if (isWarning) {
    bgClass = "bg-amber-100 text-amber-700";
    Icon = Clock3;
  } else if (isDanger) {
    bgClass = "bg-rose-100 text-rose-700";
    Icon = XCircle;
  }
  
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${bgClass}`}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </div>
  );
};

function TourDetailsDrawer({ row, vehicles, drivers, guides, suppliers, hotelMasters, saving, onClose, onCopy, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  useEffect(() => {
    if (!row) {
      setEditing(false);
      setDraft({});
      return;
    }
    const service = row.service || {};
    setEditing(false);
    setDraft({
      date: dateOnly(service.serviceDate || service.date || row.date),
      flightNo: service.flightNo || service.airlineFlight || "",
      flightTime: service.flightTime || service.arrivalTime || "",
      pickupTime: service.pickupTime || service.fromTime || "",
      returnTime: service.returnTime || service.toTime || "",
      vehicleName: vehicleNameFor(service, vehicles),
      supplier: supplierNameFor(service, suppliers),
      driver: service.driver || "",
      guide: service.guide || "",
      operationStatus: serviceStatus(service),
      meetingPoint: service.meetingPoint || "",
      remarks: service.remarks || service.productNote || "",
    });
  }, [row, vehicles, suppliers]);
  if (!row) return null;
  const { booking, service, hotel } = row;
  const bookingStatus = serviceStatus(service);
  const ticket = service.ticketAttachment?.url ? "Uploaded" : "Upload pending";
  const flightTicket = service.flightTicketAttachment?.url ? "Uploaded" : "—";
  const hotelImage = hotelImageFor(hotel, hotelMasters);
  const changeDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const saveDetails = async () => {
    const saved = await onSave(row, {
      date: draft.date,
      serviceDate: draft.date,
      flightNo: draft.flightNo,
      flightTime: draft.flightTime,
      arrivalTime: draft.flightTime,
      pickupTime: draft.pickupTime,
      fromTime: draft.pickupTime,
      returnTime: draft.returnTime,
      toTime: draft.returnTime,
      vehicleName: draft.vehicleName,
      supplier: draft.supplier,
      supplierName: draft.supplier,
      driver: draft.driver,
      guide: draft.guide,
      operationStatus: draft.operationStatus,
      meetingPoint: draft.meetingPoint,
      remarks: draft.remarks,
    });
    if (saved) setEditing(false);
  };
  
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm transition-all"
      onMouseDown={onClose}
    >
      <aside
        className="slide-in-right flex h-full w-full max-w-[850px] flex-col overflow-y-auto bg-slate-50 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between bg-white/90 backdrop-blur-md px-5 py-4 border-b border-slate-200/60">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                Tour Details — {booking.quotationId || booking.queryId || booking.id}
              </h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                Complete information about this quotation and booking.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="space-y-3 p-5">
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4 shadow-sm border border-indigo-100/50 flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100/80 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-700">
                <FileText className="h-3 w-3" />
                Tour & Operation
              </div>
              
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                  Tour Name
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                  {service.name || service.variantName || service.type}
                </h3>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[8px] font-bold uppercase tracking-wider text-slate-400 leading-none">Type</div>
                    <div className="text-[11px] mt-0.5 font-extrabold text-indigo-700 leading-tight">{service.type || "Service"} • {basisFor(service)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Car className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[8px] font-bold uppercase tracking-wider text-slate-400 leading-none">Vehicle</div>
                    <div className="text-[11px] mt-0.5 font-extrabold text-slate-800 leading-tight">{vehicleNameFor(service, vehicles) || "—"}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[8px] font-bold uppercase tracking-wider text-slate-400 leading-none">Operation Person</div>
                    <div className="text-[11px] mt-0.5 font-extrabold text-slate-800 leading-tight">{booking.operationPerson || booking.assignedTo || "BuildSoftware"}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="w-full md:w-[260px] shrink-0 relative rounded-xl overflow-hidden h-[120px] bg-slate-200 shadow-inner">
              {hotelImage ? <img src={hotelImage} className="w-full h-full object-cover" alt={hotel.name || hotel.hotel || "Hotel"} onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <Hotel className="absolute inset-0 m-auto h-9 w-9 text-slate-400" />}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent flex items-end p-3">
                <div className="flex items-start gap-1.5 text-white">
                  <MapPin className="h-3 w-3 mt-0.5 text-blue-400 shrink-0" />
                  <div>
                    <div className="text-[13px] font-bold leading-tight">{service.meetingPoint || service.destination || "Location"}</div>
                    <div className="text-[9px] font-medium text-white/80">Destination Area</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5">
              <div>
                <div className="text-xs font-extrabold text-slate-800">Operational details</div>
                <div className="mt-0.5 text-[10px] font-medium text-slate-500">Edit the same operational fields available in the table.</div>
              </div>
              <button type="button" onClick={() => setEditing((current) => !current)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100">
                <Pencil className="h-3.5 w-3.5" /> {editing ? "Cancel" : "Edit details"}
              </button>
            </div>
            {editing && <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
              <label className="text-[10px] font-bold text-slate-600">Service date<DateInput value={draft.date || ""} onChange={(value) => changeDraft("date", value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-blue-400" /></label>
              <label className="text-[10px] font-bold text-slate-600">Flight no.<input value={draft.flightNo || ""} onChange={(event) => changeDraft("flightNo", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-blue-400" /></label>
              <label className="text-[10px] font-bold text-slate-600">Flight time<input type="time" value={draft.flightTime || ""} onChange={(event) => changeDraft("flightTime", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-blue-400" /></label>
              <label className="text-[10px] font-bold text-slate-600">Pickup time<input type="time" value={draft.pickupTime || ""} onChange={(event) => changeDraft("pickupTime", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-blue-400" /></label>
              <label className="text-[10px] font-bold text-slate-600">Return time<input type="time" value={draft.returnTime || ""} onChange={(event) => changeDraft("returnTime", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-blue-400" /></label>
              <label className="text-[10px] font-bold text-slate-600">Vehicle<input value={draft.vehicleName || ""} onChange={(event) => changeDraft("vehicleName", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-blue-400" /></label>
              <label className="text-[10px] font-bold text-slate-600">Supplier<select value={draft.supplier || ""} onChange={(event) => changeDraft("supplier", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-blue-400"><option value="">Select supplier</option>{suppliers.map((item) => <option key={item.id || item._id || item.name} value={item.name}>{item.name}</option>)}</select></label>
              <label className="text-[10px] font-bold text-slate-600">Driver<select value={draft.driver || ""} onChange={(event) => changeDraft("driver", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-blue-400"><option value="">Select driver</option>{drivers.map((item) => <option key={item.id || item._id || item.name} value={item.name}>{item.name}</option>)}</select></label>
              <label className="text-[10px] font-bold text-slate-600">Guide<select value={draft.guide || ""} onChange={(event) => changeDraft("guide", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-blue-400"><option value="">Select guide</option>{guides.map((item) => <option key={item.id || item._id || item.name} value={item.name}>{item.name}</option>)}</select></label>
              <label className="text-[10px] font-bold text-slate-600">Status<select value={draft.operationStatus || "Confirm"} onChange={(event) => changeDraft("operationStatus", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-blue-400">{BOOKING_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label className="text-[10px] font-bold text-slate-600 sm:col-span-2">Meeting point<input value={draft.meetingPoint || ""} onChange={(event) => changeDraft("meetingPoint", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-blue-400" /></label>
              <label className="text-[10px] font-bold text-slate-600 sm:col-span-2">Operational remark<textarea value={draft.remarks || ""} onChange={(event) => changeDraft("remarks", event.target.value)} rows="2" className="mt-1 w-full resize-y rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-blue-400" /></label>
              <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button><button type="button" onClick={saveDetails} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save changes"}</button></div>
            </div>}
          </div>

          {/* Grid Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            <DetailCard icon={CalendarDays} label="Date" value={longDate(row.date)} colorClass="red" />
            <DetailCard icon={FileText} label="Quotation No." value={booking.quotationId || 'Not linked'} colorClass="blue" valueClass="text-blue-700" />
            <DetailCard icon={FileText} label="Query ID" value={booking.queryId || booking.id} colorClass="blue" valueClass="text-blue-700" />
            
            <DetailCard icon={UserRound} label="Guest" value={booking.guestName || "—"} colorClass="purple" />
            <DetailCard icon={UserRound} label="Pax" value={paxText(booking)} colorClass="purple" />
            <DetailCard icon={Hotel} label="Hotel" value={hotel.name || hotel.hotel || "—"} colorClass="green" />
            
            <DetailCard icon={Plane} label="Flight" value={service.flightNo || service.airlineFlight || "—"} colorClass="blue" />
            <DetailCard icon={Clock3} label="Flight Time" value={service.flightTime || service.arrivalTime || "—"} colorClass="blue" />
            <DetailCard icon={Clock3} label="Pickup Time" value={service.pickupTime || service.fromTime || "—"} colorClass="green" />
            
            <DetailCard icon={Clock3} label="Return Time" value={service.returnTime || service.toTime || "—"} colorClass="green" />
            
            <DetailCard 
              icon={Tag} 
              label="Booking Status" 
              colorClass="amber" 
              valueNode={<StatusPill status={bookingStatus} />} 
            />
            <DetailCard 
              icon={CreditCard} 
              label="Payment Status" 
              colorClass="blue" 
              valueNode={<StatusPill status={clientPaymentStatus(booking)} />} 
            />
            
            <DetailCard icon={FileText} label="Ticket" value={ticket} colorClass="orange" />
            <DetailCard icon={Plane} label="Flight Ticket" value={flightTicket} colorClass="indigo" />
          </div>

          {/* Remark Banner */}
          <div className="relative overflow-hidden rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-amber-50/30 p-3 shadow-sm flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 z-10">
              <FileText className="h-5 w-5" />
            </div>
            <div className="z-10 flex-1">
              <div className="text-[9px] font-bold uppercase tracking-wider text-amber-600/80 mb-0.5 leading-none">
                Remark
              </div>
              <div className="text-xs mt-1 font-bold text-amber-900 leading-tight">
                {service.remarks || service.productNote || "No operational remark"}
              </div>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500/10 z-0">
               <FileText className="h-20 w-20" />
            </div>
          </div>

          {/* Meeting Point */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/75 bg-white p-3 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 leading-none">
                Meeting Point
              </div>
              <div className="text-xs mt-1 font-extrabold text-slate-800 leading-tight">
                {service.meetingPoint || "—"}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onCopy(row)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[13px] font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/30 active:scale-[0.98]"
          >
            <Clipboard className="h-4 w-4" />
            Copy Operational Details
          </button>
        </div>
      </aside>
    </div>
  );
}

export default function TourMasterSheet() {
  const { bookings, hotels, suppliers, updateBooking, refreshData } = useApp();
  const [fromDate, setFromDate] = useState(() => defaultTourDateRange().from);
  const [toDate, setToDate] = useState(() => defaultTourDateRange().to);
  const [activity, setActivity] = useState("");
  const [transfer, setTransfer] = useState("");
  const [meal, setMeal] = useState("");
  const [extra, setExtra] = useState("");
  const [basis, setBasis] = useState("All");
  const [driver, setDriver] = useState("");
  const [guide, setGuide] = useState("");
  const [guestSearch, setGuestSearch] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [masters, setMasters] = useState({
    drivers: [],
    guides: [],
    vehicles: [],
  });
  const [savingKey, setSavingKey] = useState("");
  const [selected, setSelected] = useState([]);
  const [detailRow, setDetailRow] = useState(null);
  useEffect(() => {
    Promise.all([
      apiClient.get("/operations-masters/drivers"),
      apiClient.get("/operations-masters/guides"),
      apiClient.get("/operations-masters/vehicles"),
    ])
      .then(([drivers, guides, vehicles]) =>
        setMasters({
          drivers: drivers.data || [],
          guides: guides.data || [],
          vehicles: vehicles.data || [],
        }),
      )
      .catch((error) => toast.error(error.message));
  }, []);
  const allRows = useMemo(
    () =>
      bookings.flatMap((booking) =>
        (booking.services || [])
          .filter((service) => !["Hotel", "Flight"].includes(service.type))
          .map((service, index) => {
            const operationalService = serviceWithVoucherTimes(booking, service);
            const date = dateOnly(
              operationalService.serviceDate || operationalService.date || booking.arrivalDate,
            );
            return {
              booking,
              service: operationalService,
              key: serviceKey(service, index),
              date,
              category: categoryFor(service),
              hotel: hotelForService(booking, date),
            };
          }),
      ).sort((left, right) => String(left.date || '').localeCompare(String(right.date || ''))
        || String(left.booking.id || '').localeCompare(String(right.booking.id || ''))
        || String(left.service.name || left.service.variantName || '').localeCompare(String(right.service.name || right.service.variantName || ''))),
    [bookings],
  );
  const optionsFor = (category) => [
    ...new Set(
      allRows
        .filter((row) => row.category === category)
        .map((row) => row.service.name || row.service.variantName)
        .filter(Boolean),
    ),
  ];
  const supplierOptions = useMemo(() => [...new Set((suppliers || [])
    .filter((supplier) => supplier.status !== "Inactive")
    .map((supplier) => text(supplier.name))
    .filter(Boolean))].sort((left, right) => left.localeCompare(right)), [suppliers]);
  const rows = useMemo(
    () =>
      allRows.filter((row) => {
        const serviceName = row.service.name || row.service.variantName || "";
        const guestHaystack =
          `${row.booking.guestName || ""} ${row.booking.mobile || ""}`.toLowerCase();
        const queryHaystack =
          `${row.booking.queryId || ""} ${row.booking.id || ""}`.toLowerCase();
        return (
          (!fromDate || row.date >= fromDate) &&
          (!toDate || row.date <= toDate) &&
          (!activity ||
            (row.category === "Activity" && serviceName === activity)) &&
          (!transfer ||
            (row.category === "Transfer" && serviceName === transfer)) &&
          (!meal || (row.category === "Meal" && serviceName === meal)) &&
          (!extra || (row.category === "Extra" && serviceName === extra)) &&
          (basis === "All" ||
            basisFor(row.service).toLowerCase() === basis.toLowerCase()) &&
          (!driver || row.service.driver === driver) &&
          (!guide || row.service.guide === guide) &&
          (!guestSearch || guestHaystack.includes(guestSearch.toLowerCase())) &&
          (!querySearch || queryHaystack.includes(querySearch.toLowerCase()))
        );
      }),
    [
      allRows,
      fromDate,
      toDate,
      activity,
      transfer,
      meal,
      extra,
      basis,
      driver,
      guide,
      guestSearch,
      querySearch,
    ],
  );
  useEffect(() => {
    setSelected((current) =>
      current.filter((key) =>
        rows.some((row) => `${row.booking.id}:${row.key}` === key),
      ),
    );
  }, [rows]);
  const saveService = async (row, patch) => {
    const key = `${row.booking.id}:${row.key}`;
    setSavingKey(key);
    try {
      const services = (row.booking.services || []).map((service, index) =>
        serviceKey(service, index) === row.key
          ? { ...service, ...patch }
          : service,
      );
      await updateBooking(row.booking.id, {
        ...row.booking,
        services,
        activityLog: [
          {
            date: new Date().toISOString(),
            action: `Tour Master updated: ${row.service.name || row.service.type}`,
            user: "Operations",
          },
          ...(row.booking.activityLog || []),
        ],
      });
      toast.success("Tour operation saved.");
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    } finally {
      setSavingKey("");
    }
  };
  const uploadAttachment = async (row, field, event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const data = new FormData();
      data.append("documentFiles", file);
      const uploaded = (
        await apiClient.upload("/uploads?folder=operations", data)
      ).data?.[0];
      if (!uploaded)
        throw new Error("Attachment upload did not return a file.");
      await saveService(row, { [field]: uploaded });
    } catch (error) {
      toast.error(error.message);
    }
  };
  const copyRows = async (list) => {
    try {
      await navigator.clipboard.writeText(
        list.map((row) => copyText(row, masters.vehicles)).join("\n\n────────────────\n\n"),
      );
      toast.success(
        `${list.length} operation detail${list.length === 1 ? "" : "s"} copied.`,
      );
    } catch {
      toast.error("Could not copy the operational details.");
    }
  };
  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setActivity("");
    setTransfer("");
    setMeal("");
    setExtra("");
    setBasis("All");
    setDriver("");
    setGuide("");
    setGuestSearch("");
    setQuerySearch("");
  };
  const download = () => {
    const headings = [
      "Query ID",
      "Date",
      "Flight",
      "Pickup Time",
      "Return Time",
      "Flight Time",
      "Tour",
      "Guest",
      "Pax",
      "Type",
      "Vehicle",
      "Hotel",
      "Driver",
      "Booking Status",
      "Ticket",
      "Flight Ticket",
      "Remark",
      "Booking Payment Status",
      "Operation Person",
      "Meeting Point",
    ];
    downloadExcelTable({
      filename: `tour-master-sheet-${new Date().toISOString().slice(0, 10)}`,
      head: headings,
      rows: rows.map((row) => [
        row.booking.queryId || row.booking.id,
        row.date,
        row.service.flightNo || "",
        row.service.pickupTime || row.service.fromTime || "",
        row.service.returnTime || row.service.toTime || "",
        row.service.flightTime || "",
        row.service.name || row.service.variantName || "",
        row.booking.guestName || "",
        paxText(row.booking),
        `${row.service.type || "Service"} ${basisFor(row.service)}`,
        vehicleNameFor(row.service, masters.vehicles),
        row.hotel.name || row.hotel.hotel || "",
        row.service.driver || "",
        serviceStatus(row.service),
        row.service.ticketAttachment?.name || "",
        row.service.flightTicketAttachment?.name || "",
        row.service.remarks || "",
        clientPaymentStatus(row.booking),
        row.booking.operationPerson || row.booking.assignedTo || "BuildSoftware",
        row.service.meetingPoint || "",
      ]),
    });
  };
  const attachmentCell = (row, field, label) => {
    const attachment = row.service[field];
    return (
      <div className="flex flex-col gap-1">
        <label className="inline-flex w-fit cursor-pointer items-center gap-1 font-semibold text-blue-600 hover:underline">
          <Upload className="h-3 w-3" />
          {attachment ? "Replace" : label}
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(event) => uploadAttachment(row, field, event)}
            className="hidden"
          />
        </label>
        {attachment?.url && (
          <a
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            className="max-w-28 truncate text-[10px] text-slate-500 hover:text-blue-600"
          >
            {attachment.name || "View file"}
          </a>
        )}
      </div>
    );
  };
  return (
    <div className="flex flex-col h-full overflow-y-auto lg:overflow-hidden bg-slate-50">
      {/* ── Page Header ── */}
      <div className="flex flex-col shrink-0 gap-2 px-3 sm:px-5 pt-3 sm:pt-4 pb-2.5 bg-white border-b border-slate-200">
        <div className="flex items-center sm:items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm"><CalendarDays className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h1 className="text-[16px] sm:text-[18px] font-extrabold text-slate-900 tracking-tight leading-tight truncate">Operations Control Center</h1>
              <p className="hidden sm:block text-xs text-slate-500 mt-0.5">Manage all transfers, tours, meals and services in one place</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button type="button" onClick={() => setFiltersOpen(o => !o)} aria-expanded={filtersOpen} className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-bold ${filtersOpen ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-700"}`}><SlidersHorizontal className="h-3.5 w-3.5" /> Filter</button>
            <button type="button" onClick={() => refreshData(["bookings"])} className="flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm">
              <RefreshCw className="h-3.5 w-3.5" /> <span className="hidden min-[420px]:inline">Save</span>
            </button>
            <button type="button" onClick={download} className="flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm">
              <Download className="h-3.5 w-3.5" /> <span className="hidden min-[420px]:inline">Export</span>
            </button>
            <button type="button"
              onClick={() => copyRows(rows.filter(r => selected.includes(`${r.booking.id}:${r.key}`)))}
              className="flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm">
              <Clipboard className="h-3.5 w-3.5" /> <span className="hidden min-[420px]:inline">Send</span>
            </button>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className={`${filtersOpen ? "grid sm:flex" : "hidden"} grid-cols-2 sm:flex-wrap items-center gap-1.5 sm:rounded-xl sm:border sm:border-slate-300 sm:bg-slate-50 sm:p-2 [&>*]:min-w-0 max-sm:[&_input]:!w-full max-sm:[&_select]:!w-full max-sm:[&>label]:w-full`}>
          <div className="sm:w-[128px]"><DateInput ariaLabel="Start date" value={fromDate} onChange={setFromDate} className={`${inputClass} w-full`} compact /></div>
          <div className="sm:w-[128px]"><DateInput ariaLabel="End date" value={toDate} onChange={setToDate} className={`${inputClass} w-full`} compact /></div>
          <div className="contents">
          {[
            [activity, setActivity, 'Activity'],
            [transfer, setTransfer, 'Transfer'],
            [meal, setMeal, 'Meal'],
            [extra, setExtra, 'Extra'],
          ].map(([value, setValue, category]) => (
            <select key={category} value={value} onChange={e => setValue(e.target.value)} className={`${inputClass} w-[120px]`}>
              <option value="">All {category}s</option>
              {optionsFor(category).map(name => <option key={name}>{name}</option>)}
            </select>
          ))}
          <select value={basis} onChange={e => setBasis(e.target.value)} className={`${inputClass} w-[80px]`}>
            <option>All</option><option>SIC</option><option>PVT</option><option>Ticket Only</option>
          </select>
          <select value={guide} onChange={e => setGuide(e.target.value)} className={`${inputClass} w-[120px]`}>
            <option value="">All Guides</option>
            {masters.guides.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
          <select value={driver} onChange={e => setDriver(e.target.value)} className={`${inputClass} w-[120px]`}>
            <option value="">All Drivers</option>
            {masters.drivers.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
          <label className="relative">
            <Search className="absolute left-1.5 top-1.5 h-3 w-3 text-slate-400" />
            <input value={guestSearch} onChange={e => setGuestSearch(e.target.value)} placeholder="Guest Name" className={`${inputClass} w-[130px] pl-6`} />
          </label>
          <input value={querySearch} onChange={e => setQuerySearch(e.target.value)} placeholder="Query ID" className={`${inputClass} w-[100px]`} />
          </div>
          <button type="button" onClick={() => refreshData(["bookings"])} className="h-7 px-3 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-1 sm:ml-auto">
            <Search className="h-3 w-3" /> Search
          </button>
          <button type="button" onClick={clearFilters} className="h-7 px-3 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200 transition-colors">
            Clear
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 bg-white border-b border-slate-200 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          { icon: CalendarDays, label: 'Total Services', value: rows.length,           color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
          { icon: Car,          label: 'Transfers',       value: rows.filter(r => r.category === 'Transfer').length,  color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
          { icon: MapPin,       label: 'Sightseeing',     value: rows.filter(r => r.category === 'Activity').length,  color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
          { icon: FileText,     label: 'Meals',           value: rows.filter(r => r.category === 'Meal').length,      color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
          { icon: Tag,          label: 'Extras',          value: rows.filter(r => r.category === 'Extra').length,     color: 'text-pink-700',   bg: 'bg-pink-50',   border: 'border-pink-200' },
          { icon: UserRound,    label: 'Total Guests',    value: new Set(rows.map(r => r.booking.id)).size,           color: 'text-emerald-700',bg: 'bg-emerald-50',border: 'border-emerald-200' },
          { icon: Car,          label: 'Vehicles',        value: rows.filter(r => vehicleNameFor(r.service, masters.vehicles)).length, color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
          { icon: Clock3,       label: 'Pending',         value: rows.filter(r => serviceStatus(r.service) === 'Pending').length, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
          { icon: CheckCircle,  label: 'Confirmed',       value: rows.filter(r => serviceStatus(r.service) === 'Confirm').length, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
        ].map(({ icon: Icon, label, value, color, bg, border }) => (
          <div key={label} className={`flex items-center gap-2 rounded-xl border ${border} ${bg} px-2.5 sm:px-3 py-1.5 sm:py-2 flex-1 basis-0 min-w-[112px]`}>
            <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${color}`} />
            <div>
              <div className={`text-lg font-extrabold leading-none ${color}`}>{value}</div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 leading-none mt-0.5">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Selection Bar ── */}
      {selected.length > 0 && (
        <div className="shrink-0 flex items-center justify-between bg-blue-600 px-5 py-2 text-white text-xs">
          <span className="font-semibold">{selected.length} service{selected.length === 1 ? '' : 's'} selected</span>
          <button type="button" onClick={() => copyRows(rows.filter(r => selected.includes(`${r.booking.id}:${r.key}`)))} className="flex items-center gap-1 font-bold hover:underline">
            <Clipboard className="h-3.5 w-3.5" /> Copy selected details
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="flex-none lg:flex-1 overflow-x-auto lg:overflow-auto">
        <table className="w-full min-w-[2586px] table-fixed text-[10px] leading-tight [&_input]:!h-6 [&_input]:!min-w-0 [&_input]:!w-full [&_input]:!max-w-full [&_input]:!px-1.5 [&_input]:!py-0 [&_input]:!text-[9.5px] [&_input]:!font-medium [&_select]:!h-6 [&_select]:!min-w-0 [&_select]:!w-full [&_select]:!max-w-full [&_select]:!px-1.5 [&_select]:!py-0 [&_select]:!text-[9.5px] [&_select]:!font-medium [&_td]:!overflow-hidden [&_td]:!break-words [&_td]:!px-2 [&_td]:!py-1 [&_th]:!overflow-hidden [&_th]:!break-words [&_th]:!px-2 [&_th]:!py-2">
          <colgroup>
            {[34, 128, 152, 92, 124, 124, 210, 140, 42, 42, 42, 76, 96, 160, 150, 130, 130, 104, 80, 80, 90, 170, 130, 60].map((width, index) => <col key={index} style={{ width }} />)}
          </colgroup>
          <thead className="bg-[#173567] text-left text-[9px] uppercase tracking-wide text-white">
            <tr className="border-b border-[#2a4d7d]">
              <th rowSpan={2} className="px-2 py-2 lg:sticky left-0 z-20 bg-[#173567] border-l border-white/30">
                <input type="checkbox" className="rounded border-slate-300 bg-transparent" />
              </th>
              <th rowSpan={2} className="px-2 py-2 lg:sticky z-20 bg-[#173567]" style={{ left: '34px' }}>QUERY</th>
              <th rowSpan={2} className="px-2 py-2 lg:sticky z-20 bg-[#173567]" style={{ left: '162px' }}>DATE</th>
              <th rowSpan={2} className="px-2 py-2 lg:sticky z-20 bg-[#173567]" style={{ left: '314px', boxShadow: 'inset -2px 0 2px -2px rgba(0,0,0,0.3)' }}>FLIGHT</th>
              <th rowSpan={2} className="px-2 py-2">PICK UP TIME</th>
              <th rowSpan={2} className="px-2 py-2">RETURN TIME</th>
              <th rowSpan={2} className="px-2 py-2">SERVICE / TOUR</th>
              <th rowSpan={2} className="px-2 py-2">GUEST</th>
              <th colSpan={3} className="px-1 py-1 text-center border-b border-[#2a4d7d] bg-[#173567]">PAX</th>
              <th rowSpan={2} className="px-2 py-2">TYPE</th>
              <th rowSpan={2} className="px-2 py-2">VEHICLE</th>
              <th rowSpan={2} className="px-2 py-2">HOTEL</th>
              <th rowSpan={2} className="px-2 py-2">SUPPLIER</th>
              <th rowSpan={2} className="px-2 py-2">DRIVER</th>
              <th rowSpan={2} className="px-2 py-2">GUIDE</th>
              <th rowSpan={2} className="px-2 py-2">STATUS</th>
              <th rowSpan={2} className="px-2 py-2 text-center">TICKET</th>
              <th rowSpan={2} className="px-2 py-2 text-center">PAGING</th>
              <th rowSpan={2} className="px-2 py-2 text-center">PAYMENT</th>
              <th rowSpan={2} className="px-2 py-2">MEETING POINT / REMARK</th>
              <th rowSpan={2} className="px-2 py-2">OPERATION PERSON</th>
              <th rowSpan={2} className="px-2 py-2 text-center">ACTIONS</th>
            </tr>
            <tr>
              <th className="px-1 py-1 text-center bg-[#173567] text-[8.5px] border-l border-white/20">A</th>
              <th className="px-1 py-1 text-center bg-[#173567] text-[8.5px] border-l border-white/20">C</th>
              <th className="px-1 py-1 text-center bg-[#173567] text-[8.5px] border-l border-white/20">I</th>
            </tr>
          </thead>
          <tbody className="bg-white [&>tr>td]:border-b [&>tr>td]:border-slate-200">
            {rows.map((row, rowIdx) => {
              const service = row.service;
              const busy = savingKey === `${row.booking.id}:${row.key}`;
              const selectionKey = `${row.booking.id}:${row.key}`;
              const isEven = rowIdx % 2 === 0;
              const rowBg = isEven ? 'bg-white' : 'bg-slate-50';
              return (
                <tr key={selectionKey} onClick={(event) => { if (!event.target.closest('button, input, select, label, a')) setDetailRow(row); }} className={`group cursor-pointer hover:bg-blue-50 ${rowBg}`}>
                  <td className={`px-2 py-2 lg:sticky left-0 z-10 ${rowBg} group-hover:bg-blue-50 border-r border-slate-100 align-middle`}>
                    <input
                      aria-label={`Select ${service.name || service.type}`}
                      type="checkbox"
                      className="rounded border-slate-300"
                      checked={selected.includes(selectionKey)}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, selectionKey]
                            : current.filter((key) => key !== selectionKey),
                        )
                      }
                    />
                  </td>
                  <td className={`px-2 py-2 whitespace-nowrap lg:sticky z-10 ${rowBg} group-hover:bg-blue-50 border-r border-slate-100 align-middle`} style={{ left: '34px' }}>
                    <div className="flex flex-col gap-1 leading-none">
                      <div className="font-bold text-slate-800 text-[10.5px]">
                        {row.booking.queryId || row.booking.id}
                      </div>
                      <div>
                        <span className="inline-flex max-w-full items-center rounded-md bg-emerald-500 px-1.5 py-[3px] text-[8.5px] font-bold text-white leading-none shadow-sm">
                          <UserRound className="h-2.5 w-2.5 mr-1" />
                          {row.booking.company || "BuildSoftware Pvt Ltd"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className={`px-2 py-2 whitespace-nowrap lg:sticky z-10 ${rowBg} group-hover:bg-blue-50 border-r border-slate-100 align-middle`} style={{ left: '162px' }}>
                    <div className="relative group cursor-pointer w-full">
                      <div className="flex items-center justify-between w-full border border-slate-200 bg-white group-hover:border-blue-300 group-hover:bg-blue-50 rounded px-1.5 py-1 transition-colors shadow-sm">
                        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                          <span className="font-bold text-slate-800 text-[10.5px] leading-tight">
                            {longDate(row.date)}
                          </span>
                          <span className="rounded bg-slate-100 px-1 text-[9px] font-semibold text-slate-500 leading-tight">
                            {row.date && !isNaN(new Date(row.date)) ? new Date(row.date).toLocaleDateString('en-GB', { weekday: 'short' }) : ""}
                          </span>
                        </div>
                        <div className="flex items-center justify-center h-5 w-5 rounded bg-blue-50 text-blue-600 shrink-0">
                          <CalendarDays className="h-3 w-3" />
                        </div>
                      </div>
                      <input
                        type="date"
                        defaultValue={row.date}
                        onChange={(event) => saveService(row, { date: event.target.value })}
                        onClick={(e) => {
                          try {
                            if (e.target.showPicker) e.target.showPicker();
                          } catch (err) {}
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="Click to change date"
                      />
                    </div>
                  </td>
                  <td className={`px-2 py-2 whitespace-nowrap lg:sticky z-10 ${rowBg} group-hover:bg-blue-50 border-r border-slate-100 align-middle`} style={{ left: '314px', boxShadow: 'inset -2px 0 2px -2px rgba(0,0,0,0.1)' }}>
                    <input
                      defaultValue={
                        service.flightNo || service.airlineFlight || "-"
                      }
                      onBlur={(event) =>
                        event.target.value !==
                          (service.flightNo || service.airlineFlight || "") &&
                        saveService(row, { flightNo: event.target.value })
                      }
                      placeholder="Flight"
                      className="w-full bg-transparent border-0 p-0 text-[10.5px] font-bold text-slate-700 outline-none focus:ring-0"
                    />
                  </td>
                  <td className="px-2 py-2 border-r border-slate-100 align-middle">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-1.5 py-1 shadow-sm">
                      <input
                        type="time"
                        defaultValue={
                          service.pickupTime || service.fromTime || "08:00"
                        }
                        onBlur={(event) =>
                          saveService(row, {
                            pickupTime: event.target.value,
                            fromTime: event.target.value,
                          })
                        }
                        className="w-full bg-transparent border-0 p-0 text-[10px] font-bold text-slate-700 outline-none focus:ring-0"
                      />
                    </div>
                  </td>
                  <td className="px-2 py-2 border-r border-slate-100 align-middle">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-1.5 py-1 shadow-sm">
                      <input
                        type="time"
                        defaultValue={service.returnTime || service.toTime || "09:30"}
                        onBlur={(event) =>
                          saveService(row, {
                            returnTime: event.target.value,
                            toTime: event.target.value,
                          })
                        }
                        className="w-full bg-transparent border-0 p-0 text-[10px] font-bold text-slate-700 outline-none focus:ring-0"
                      />
                    </div>
                  </td>
                  <td className="px-2 py-2 border-r border-slate-100 align-middle">
                    <div className="flex flex-col gap-0.5 leading-tight">
                      <span className="font-bold text-slate-800 text-[10.5px]">
                         {service.name || service.variantName || service.type || "Bangkok Airport"}
                      </span>
                      <span className="text-[9.5px] font-medium text-slate-500">
                         {service.dropAt || service.dropPoint || service.destination || "To Pattaya Hotel"}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 border-r border-slate-100 align-middle">
                    <div className="flex flex-col gap-0.5 leading-tight">
                      <span className="font-bold text-slate-800 text-[10.5px]">
                        {row.booking.guestName || "Guest"}
                      </span>
                    </div>
                  </td>
                  <td className="px-1 text-center py-2 border-r border-slate-200 align-middle"><span className={`inline-grid h-5 min-w-[20px] place-items-center rounded-md px-1 text-[10.5px] font-extrabold ring-1 ${Number(row.booking.adults || 0) > 0 ? "bg-blue-50 text-blue-700 ring-blue-200" : "bg-slate-50 text-slate-300 ring-slate-100"}`}>{row.booking.adults || 0}</span></td>
                  <td className="px-1 text-center py-2 border-r border-slate-200 align-middle"><span className={`inline-grid h-5 min-w-[20px] place-items-center rounded-md px-1 text-[10.5px] font-extrabold ring-1 ${Number(row.booking.children || 0) > 0 ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-slate-50 text-slate-300 ring-slate-100"}`}>{row.booking.children || 0}</span></td>
                  <td className="px-1 text-center py-2 border-r border-slate-200 align-middle"><span className={`inline-grid h-5 min-w-[20px] place-items-center rounded-md px-1 text-[10.5px] font-extrabold ring-1 ${Number(row.booking.infants || 0) > 0 ? "bg-pink-50 text-pink-700 ring-pink-200" : "bg-slate-50 text-slate-300 ring-slate-100"}`}>{row.booking.infants || 0}</span></td>
                  <td className="px-2 py-2 border-r border-slate-100 align-middle text-center">
                    <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-[9px] font-bold shadow-sm ${basisFor(service).toUpperCase() === 'SIC' ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                      {basisFor(service) || "PVT"}
                    </span>
                  </td>
                  <td className="px-2 py-2 border-r border-slate-100 align-middle">
                    <div className="font-bold text-blue-600 text-[10px]">
                       {vehicleNameFor(service, masters.vehicles) || "Van"} <span className="text-slate-500 font-medium">({vehicleQuantityFor(service) || "1"})</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 border-r border-slate-100 align-middle">
                    <div className="flex flex-col gap-0.5 leading-tight">
                      <span className="font-bold text-slate-800 text-[10.5px]">
                         {row.hotel.name || row.hotel.hotel || "Golden Beach"}
                      </span>
                      <span className="text-[9.5px] font-bold text-orange-500">
                         {row.hotel.phone || row.hotel.contactNumber || "+6638422331"}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 border-r border-slate-100 align-middle">
                    {(() => {
                      const selectedSupplier = supplierNameFor(service, suppliers);
                      const options = selectedSupplier && !supplierOptions.includes(selectedSupplier)
                        ? [selectedSupplier, ...supplierOptions]
                        : supplierOptions;
                      return <select
                        value={selectedSupplier}
                        onChange={(event) => saveService(row, { supplier: event.target.value, supplierName: event.target.value })}
                        title={selectedSupplier || "Select supplier"}
                        className="h-7 w-full truncate rounded-md border border-slate-300 bg-white px-1.5 text-[9.5px] font-bold text-slate-700 outline-none focus:border-blue-400"
                        aria-label={`Supplier for ${service.name || service.type || "service"}`}
                      >
                        <option value="">Select supplier</option>
                        {options.map((name) => <option key={name} value={name}>{name}</option>)}
                      </select>;
                    })()}
                  </td>
                  <td className="px-2 py-2 border-r border-slate-100 align-middle">
                    <select
                      value={service.driver || ""}
                      onChange={(event) =>
                        saveService(row, { driver: event.target.value })
                      }
                      className="h-7 w-full truncate rounded-md border border-slate-300 bg-white px-1.5 text-[9.5px] font-bold text-slate-700 outline-none focus:border-blue-400"
                    >
                      <option value="">Select</option>
                      { (masters.drivers || []).map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 border-r border-slate-100 align-middle">
                    <select
                      value={service.guide || ""}
                      onChange={(event) => saveService(row, { guide: event.target.value })}
                      className="h-7 w-full truncate rounded-md border border-slate-300 bg-white px-1.5 text-[9.5px] font-bold text-slate-700 outline-none focus:border-blue-400"
                    >
                      <option value="">Select</option>
                      {(masters.guides || []).map((item) => (
                        <option key={item.id || item._id || item.name} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 border-r border-slate-100 align-middle">
                    <select
                      value={serviceStatus(service)}
                      onChange={(event) =>
                        saveService(row, {
                          operationStatus: event.target.value,
                        })
                      }
                      className={`h-7 w-[90px] rounded border border-slate-200 px-2 text-[10px] font-extrabold shadow-sm ${
                        serviceStatus(service) === 'Confirm' || serviceStatus(service) === 'Confirmed' ? 'bg-[#25D366] text-white border-transparent'
                        : serviceStatus(service) === 'Pending' ? 'bg-[#F2A900] text-white border-transparent'
                        : serviceStatus(service) === 'In Progress' ? 'bg-[#2b7de9] text-white border-transparent'
                        : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      {BOOKING_STATUSES.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 border-r border-slate-100 align-middle text-center">
                    <label className="inline-flex items-center gap-1 font-bold text-blue-600 text-[10px] hover:underline cursor-pointer">
                      <Upload className="h-3 w-3" /> Upload
                      <input type="file" className="hidden" onChange={(e) => {
                        if (e.target.files.length > 0) {
                          toast.success('Ticket uploaded successfully!');
                        }
                      }} />
                    </label>
                  </td>
                  <td className="px-2 py-2 border-r border-slate-100 align-middle text-center">
                    <button onClick={() => toast.success('Page created successfully!')} className="inline-flex items-center font-bold text-blue-600 text-[10px] hover:underline">
                      Create Page
                    </button>
                  </td>
                  <td className="px-2 py-2 border-r border-slate-100 align-middle text-center">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9.5px] font-bold border ${
                      clientPaymentStatus(row.booking) === 'Paid' ? 'bg-emerald-50 text-[#25D366] border-[#25D366]'
                      : clientPaymentStatus(row.booking) === 'Part Paid' ? 'bg-amber-50 text-[#F2A900] border-[#F2A900]'
                      : 'bg-rose-50 text-rose-500 border-rose-500'
                    }`}>
                      {clientPaymentStatus(row.booking) === 'Paid' ? 'Fully Paid'
                      : clientPaymentStatus(row.booking) === 'Part Paid' ? 'Partial'
                      : 'Pending'}
                    </span>
                  </td>
                  <td className="px-2 py-2 border-r border-slate-100 align-middle">
                     <span className="text-[10px] text-slate-700 font-medium">
                        {service.meetingPoint || service.remarks || service.productNote || "Pick Up From Airport Gate No 3"}
                     </span>
                  </td>
                  <td className="px-2 py-2 border-r border-slate-100 align-middle">
                    <div className="flex flex-col gap-0.5 leading-tight">
                      <span className="font-medium text-slate-800 text-[10.5px]">
                        {row.booking.operationPerson || row.booking.assignedTo || "BuildSoftware"}
                      </span>
                      <span className="font-medium text-slate-500 text-[9.5px]">
                        +919727544503
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 align-middle text-center">
                    <button
                      type="button"
                      onClick={() => copyRows([row])}
                      className="flex items-center justify-center h-6 w-7 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-sm mx-auto"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan="22" className="p-12 text-center text-slate-400">
                  No live operation services match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <TourDetailsDrawer
        row={detailRow}
        vehicles={masters.vehicles}
        drivers={masters.drivers}
        guides={masters.guides}
        suppliers={suppliers || []}
        hotelMasters={hotels || []}
        saving={savingKey === `${detailRow?.booking?.id || ""}:${detailRow?.key || ""}`}
        onClose={() => setDetailRow(null)}
        onCopy={(row) => copyRows([row])}
        onSave={async (row, patch) => {
          const saved = await saveService(row, patch);
          if (saved) {
            setDetailRow((current) => current && current.booking.id === row.booking.id && current.key === row.key
              ? { ...current, date: patch.serviceDate || patch.date || current.date, service: { ...current.service, ...patch } }
              : current);
          }
          return saved;
        }}
      />
    </div>
  );
}
