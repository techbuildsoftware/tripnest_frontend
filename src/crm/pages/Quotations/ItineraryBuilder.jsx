import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Minus,
  GripVertical,
  Hotel,
  Car,
  Compass,
  Utensils,
  Trash2,
  Edit,
  Copy,
  ChevronDown,
  ChevronRight,
  MapPin,
  Anchor,
  User,
  Globe,
  Plane,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import ServiceForm from './ServiceForm';
import { formatDate } from '../../lib/date';
import { apiClient } from '../../lib/api';
import { selectedVehicleCombination } from '../../lib/vehicleCombination';

const SERVICE_TYPES = [
  { type: 'Flight', icon: Plane, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
  { type: 'Hotel', icon: Hotel, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  { type: 'Transfer', icon: Car, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  { type: 'Sightseeing', icon: Compass, iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
  { type: 'Meal', icon: Utensils, iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
  { type: 'Yacht', icon: Anchor, iconBg: 'bg-sky-100', iconColor: 'text-sky-600' },
  { type: 'Ferry', icon: Anchor, iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600' },
  { type: 'Guide', icon: User, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  { type: 'Other', icon: Globe, iconBg: 'bg-slate-100', iconColor: 'text-slate-600' },
];

const serviceIcon = (type) =>
  SERVICE_TYPES.find((t) => t.type === type) ||
  SERVICE_TYPES.find((entry) => entry.type === 'Other');
const variantImage = (variant = {}) => (variant.images || []).find((image) => image?.url) || variant.image || null;

const SECTION_THEMES = [
  {
    name: 'blue',
    cardBorder: 'border-blue-200',
    cardBg: 'bg-gradient-to-b from-blue-50/30 via-white to-blue-50/15',
    headerBg: 'bg-gradient-to-r from-blue-100/70 via-blue-50/40 to-white',
    pinColor: 'text-blue-600 fill-blue-600',
    badgeBg: 'bg-blue-100 text-blue-700 border border-blue-200/60',
    planeColor: 'text-blue-300',
    dayButtonBg: 'bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200/60',
    daysContainerBg: 'bg-blue-50/25',
    timelineLine: 'bg-blue-300',
    timelineDot: 'bg-blue-600 ring-4 ring-blue-100',
    dayBadge: 'bg-blue-600 text-white shadow-2xs',
    collapsedDayBg: 'bg-white hover:bg-blue-50/40 border-blue-200/80 hover:border-blue-300 shadow-2xs hover:shadow-xs',
    expandedDayBg: 'bg-white border-blue-300 border-l-4 border-l-blue-600 ring-2 ring-blue-500/40 shadow-md',
    expandedHeaderBg: 'bg-gradient-to-r from-blue-100/90 via-blue-50/50 to-white border-b border-blue-200',
    activeBadgeBg: 'bg-blue-600 text-white',
    serviceBadge: 'bg-blue-50 text-blue-700 border border-blue-200/60 hover:bg-blue-100',
  },
  {
    name: 'emerald',
    cardBorder: 'border-emerald-200',
    cardBg: 'bg-gradient-to-b from-emerald-50/30 via-white to-emerald-50/15',
    headerBg: 'bg-gradient-to-r from-emerald-100/70 via-emerald-50/40 to-white',
    pinColor: 'text-emerald-600 fill-emerald-600',
    badgeBg: 'bg-emerald-100 text-emerald-800 border border-emerald-200/60',
    planeColor: 'text-emerald-300',
    dayButtonBg: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-200/60',
    daysContainerBg: 'bg-emerald-50/25',
    timelineLine: 'bg-emerald-300',
    timelineDot: 'bg-emerald-600 ring-4 ring-emerald-100',
    dayBadge: 'bg-emerald-600 text-white shadow-2xs',
    collapsedDayBg: 'bg-white hover:bg-emerald-50/40 border-emerald-200/80 hover:border-emerald-300 shadow-2xs hover:shadow-xs',
    expandedDayBg: 'bg-white border-emerald-300 border-l-4 border-l-emerald-600 ring-2 ring-emerald-500/40 shadow-md',
    expandedHeaderBg: 'bg-gradient-to-r from-emerald-100/90 via-emerald-50/50 to-white border-b border-emerald-200',
    activeBadgeBg: 'bg-emerald-600 text-white',
    serviceBadge: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100',
  },
  {
    name: 'violet',
    cardBorder: 'border-violet-200',
    cardBg: 'bg-gradient-to-b from-violet-50/30 via-white to-violet-50/15',
    headerBg: 'bg-gradient-to-r from-violet-100/70 via-violet-50/40 to-white',
    pinColor: 'text-violet-600 fill-violet-600',
    badgeBg: 'bg-violet-100 text-violet-800 border border-violet-200/60',
    planeColor: 'text-violet-300',
    dayButtonBg: 'bg-violet-100 hover:bg-violet-200 text-violet-800 border border-violet-200/60',
    daysContainerBg: 'bg-violet-50/25',
    timelineLine: 'bg-violet-300',
    timelineDot: 'bg-violet-600 ring-4 ring-violet-100',
    dayBadge: 'bg-violet-600 text-white shadow-2xs',
    collapsedDayBg: 'bg-white hover:bg-violet-50/40 border-violet-200/80 hover:border-violet-300 shadow-2xs hover:shadow-xs',
    expandedDayBg: 'bg-white border-violet-300 border-l-4 border-l-violet-600 ring-2 ring-violet-500/40 shadow-md',
    expandedHeaderBg: 'bg-gradient-to-r from-violet-100/90 via-violet-50/50 to-white border-b border-violet-200',
    activeBadgeBg: 'bg-violet-600 text-white',
    serviceBadge: 'bg-violet-50 text-violet-700 border border-violet-200/60 hover:bg-violet-100',
  },
  {
    name: 'amber',
    cardBorder: 'border-amber-200',
    cardBg: 'bg-gradient-to-b from-amber-50/30 via-white to-amber-50/15',
    headerBg: 'bg-gradient-to-r from-amber-100/70 via-amber-50/40 to-white',
    pinColor: 'text-amber-600 fill-amber-600',
    badgeBg: 'bg-amber-100 text-amber-800 border border-amber-200/60',
    planeColor: 'text-amber-300',
    dayButtonBg: 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200/60',
    daysContainerBg: 'bg-amber-50/25',
    timelineLine: 'bg-amber-300',
    timelineDot: 'bg-amber-600 ring-4 ring-amber-100',
    dayBadge: 'bg-amber-600 text-white shadow-2xs',
    collapsedDayBg: 'bg-white hover:bg-amber-50/40 border-amber-200/80 hover:border-amber-300 shadow-2xs hover:shadow-xs',
    expandedDayBg: 'bg-white border-amber-300 border-l-4 border-l-amber-600 ring-2 ring-amber-500/40 shadow-md',
    expandedHeaderBg: 'bg-gradient-to-r from-amber-100/90 via-amber-50/50 to-white border-b border-amber-200',
    activeBadgeBg: 'bg-amber-600 text-white',
    serviceBadge: 'bg-amber-50 text-amber-700 border border-amber-200/60 hover:bg-amber-100',
  },
];

const DESTINATION_IMAGES = {
  phuket: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=300&q=80',
  kohsamui: 'https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=300&q=80',
  'koh samui': 'https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=300&q=80',
  samui: 'https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=300&q=80',
  krabi: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=300&q=80',
  bangkok: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=300&q=80',
  pattaya: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=300&q=80',
  chiangmai: 'https://images.unsplash.com/photo-1598971861713-54ad16a7e72e?w=300&q=80',
  'chiang mai': 'https://images.unsplash.com/photo-1598971861713-54ad16a7e72e?w=300&q=80',
  phiphi: 'https://images.unsplash.com/photo-1540479859555-17af45c78602?w=300&q=80',
  'phi phi': 'https://images.unsplash.com/photo-1540479859555-17af45c78602?w=300&q=80',
  ayutthaya: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=300&q=80',
  bali: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=300&q=80',
  singapore: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=300&q=80',
  default: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=300&q=80',
};

const getDestinationImage = (arrival, departure, label = '') => {
  const arrivalLower = String(arrival || '').toLowerCase();
  for (const [key, url] of Object.entries(DESTINATION_IMAGES)) {
    if (key !== 'default' && arrivalLower.includes(key)) return url;
  }
  const departureLower = String(departure || '').toLowerCase();
  for (const [key, url] of Object.entries(DESTINATION_IMAGES)) {
    if (key !== 'default' && departureLower.includes(key)) return url;
  }
  const labelLower = String(label || '').toLowerCase();
  for (const [key, url] of Object.entries(DESTINATION_IMAGES)) {
    if (key !== 'default' && labelLower.includes(key)) return url;
  }
  return DESTINATION_IMAGES.default;
};

const formatSegmentDate = (value) => {
  if (!value) return '';
  const formatted = formatDate(value);
  if (!formatted || formatted === '—') return value;
  const match = formatted.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return formatted;
  const calendarDate = new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00Z`);
  if (Number.isNaN(calendarDate.getTime())) return formatted;
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(calendarDate);
  return `${formatted} (${weekday})`;
};

const formatDayDate = (value) => {
  if (!value) return '';
  const formatted = formatDate(value);
  if (!formatted || formatted === '—') return value;
  const match = formatted.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return formatted;
  const calendarDate = new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00Z`);
  if (Number.isNaN(calendarDate.getTime())) return formatted;
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(calendarDate);
  return `${formatted} - ${weekday}`;
};

const fmt = (n) => (n ? `฿${Number(n).toLocaleString()}` : '฿0');
const shiftDate = (date, amount) => {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + amount);
  return value.toISOString().slice(0, 10);
};
const hotelNights = (checkIn, checkOut) =>
  Math.max(1, Math.round((new Date(`${checkOut}T00:00:00`) - new Date(`${checkIn}T00:00:00`)) / 86400000));
const hasRoomAllocation = (allocation = {}) =>
  ['sgl', 'dbl', 'adultExtraBed', 'cwb', 'cnb', 'inf'].some((field) => Number(allocation[field] || 0) > 0);
const withHotelStayTotals = (service, checkIn, checkOut) => {
  const nights = hotelNights(checkIn, checkOut);
  // Allocation-based hotel prices already include every selected room and bed
  // in the nightly rate. Older flat-price rows still use their room count.
  const nightlyMultiplier = hasRoomAllocation(service.roomAllocation)
    ? 1
    : Math.max(1, Number(service.rooms || 1));
  return {
    ...service,
    checkIn,
    checkOut,
    nights,
    totalSupplierCost: Number(service.supplierCost || 0) * nightlyMultiplier * nights,
    totalSellingPrice: Number(service.sellingPrice || 0) * nightlyMultiplier * nights,
  };
};
const normalize = (value) => String(value || '').trim().toLocaleLowerCase();
const sameValue = (left, right) => normalize(left) === normalize(right);
const dateIsInRange = (record, date, market = '') => {
  if (!record || record.status === 'Inactive') return false;
  if (date && record.fromDate && record.fromDate > date) return false;
  if (date && record.toDate && record.toDate < date) return false;
  return !market || !record.market || sameValue(record.market, market);
};
const weekdayForDate = (date) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
const transferRoute = (transfer = {}) => {
  const route = String(transfer.route || transfer.name || '').trim();
  const [origin = '', destination = ''] = route.split(/\s+(?:to|→)\s+/i, 2).map((value) => value.trim());
  return { origin, destination: destination || transfer.destination || '' };
};
// Vehicle selection intentionally excludes children and infants. Their
// passenger charges are calculated independently from vehicle capacity.
const partySize = (quotation = {}) => Math.max(1, Number(quotation.adults || 0));
const newServiceId = () => `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const dayKey = (day = {}) => String(day.id || day.date || day.day || '');

// Service IDs are used for editing, deleting and drag targets. Older
// quotations can contain duplicated IDs after a card was copied, which makes
// React and the editor treat two different cards as the same service.
const ensureDistinctServiceIds = (days = []) => {
  const usedIds = new Set();
  let changed = false;
  const normalizedDays = days.map((day) => ({
    ...day,
    services: (day.services || []).map((service) => {
      const currentId = String(service?.id || '').trim();
      if (currentId && !usedIds.has(currentId)) {
        usedIds.add(currentId);
        return service;
      }
      let uniqueId = newServiceId();
      while (usedIds.has(uniqueId)) uniqueId = newServiceId();
      usedIds.add(uniqueId);
      changed = true;
      return { ...service, id: uniqueId };
    }),
  }));
  return { changed, days: normalizedDays };
};

// Native HTML drag is inconsistent inside the editable itinerary cards. This
// pointer implementation works for mouse and touch, and gives a clear target
// indicator before the service order is committed.
function useServicePointerOrder(groupId, onReorder) {
  const [dragState, setDragState] = useState({ sourceId: '', overId: '' });
  const cleanupRef = useRef(() => {});

  useEffect(() => () => cleanupRef.current(), []);

  const begin = (serviceId) => (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const sourceId = String(serviceId);
    const originalUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    setDragState({ sourceId, overId: sourceId });

    const targetAtPointer = (pointerEvent) => {
      const target = document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)?.closest?.('[data-quotation-service-id]');
      return target?.getAttribute('data-quotation-sort-group') === String(groupId) ? target : null;
    };
    const move = (pointerEvent) => {
      const target = targetAtPointer(pointerEvent);
      const overId = target?.getAttribute('data-quotation-service-id') || sourceId;
      setDragState((current) => current.overId === overId ? current : { sourceId, overId });
    };
    const finish = (pointerEvent) => {
      const targetId = targetAtPointer(pointerEvent)?.getAttribute('data-quotation-service-id');
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', cancel);
      document.body.style.userSelect = originalUserSelect;
      cleanupRef.current = () => {};
      setDragState({ sourceId: '', overId: '' });
      if (targetId && targetId !== sourceId) onReorder(sourceId, targetId);
    };
    const cancel = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', cancel);
      document.body.style.userSelect = originalUserSelect;
      cleanupRef.current = () => {};
      setDragState({ sourceId: '', overId: '' });
    };
    cleanupRef.current = cancel;
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', cancel);
  };

  return {
    handleProps: (serviceId) => ({ onPointerDown: begin(serviceId) }),
    cardProps: (serviceId) => ({
      'data-quotation-service-id': String(serviceId),
      'data-quotation-sort-group': String(groupId),
    }),
    cardClass: (serviceId) => dragState.sourceId === String(serviceId)
      ? 'scale-[0.99] opacity-45 shadow-sm'
      : dragState.overId === String(serviceId) && dragState.sourceId
        ? 'ring-2 ring-blue-400 bg-blue-50/80'
        : '',
  };
}

function ServiceCard({ service, onEdit, onDelete, onDuplicate, viewMode, canDuplicate = true, draggable = false, dragProps, cardProps, dragClass = '' }) {
  const { icon: Icon, iconBg, iconColor } = serviceIcon(service.type);

  return (
    <div {...cardProps} className={`bg-white border border-slate-200/90 rounded-lg p-2 sm:p-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2.5 group hover:border-slate-300 hover:shadow-2xs transition-all duration-150 ${dragClass}`}>
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
        {/* Grip handle */}
        {draggable && <button type="button" {...dragProps} title="Drag to change service sequence" aria-label="Drag to change service sequence" className="cursor-grab touch-none rounded p-1 text-slate-300 transition-colors hover:bg-blue-50 hover:text-blue-600 active:cursor-grabbing shrink-0">
          <GripVertical className="w-3.5 h-3.5" />
        </button>}

        {/* Icon */}
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg || 'bg-slate-100'} ${iconColor || 'text-slate-600'}`}>
          <Icon className="w-4 h-4" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-slate-900 line-clamp-2 sm:line-clamp-none sm:truncate">
            {service.name}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-2 sm:line-clamp-none sm:truncate">
            {service.type === 'Hotel' && `${service.roomType} • ${service.nights}N • ${service.mealPlan}`}
            {service.type === 'Flight' &&
              `${service.airlineFlight || service.airline || service.flightNo || 'Flight'} • ${service.fromSector || service.origin || '—'} → ${service.toSector || service.destination || '—'}${service.departure || service.arrival ? ` • ${service.departure || '—'} – ${service.arrival || '—'}` : ''}`}
            {service.type === 'Transfer' && `${service.origin} → ${service.destination} • ${service.vehicleName || service.vehicle || service.basis}`}
            {service.type === 'Sightseeing' && `${service.adults}A ${service.children || 0}C • ${service.basis}${service.transferVehicleName ? ` • ${service.transferVehicleName}` : ''}${service.time ? ` • Show ${service.time}` : ''}`}
            {service.type === 'Meal' && `${service.adults}A • ${service.mealType || 'Meal'}`}
            {service.type === 'Yacht' && `${service.duration || 'Charter'} • ${service.totalPax || 0} Pax • ${service.startingPier || 'Pier to be confirmed'}`}
            {service.type === 'Ferry' && `${service.origin} → ${service.destination}`}
            {service.type === 'Guide' && `${service.adults}A`}
            {service.type === 'Other' && service.description}
          </div>
          {viewMode === 'internal' && service.supplier && (
            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
              Supplier: {service.supplier}
            </div>
          )}
          {service.plannerNote && (
            <div className="text-[10px] text-amber-600 font-medium mt-0.5">
              {service.plannerNote}
            </div>
          )}
          {service.linkedStay && (
            <div className="text-[10px] text-blue-600 font-medium mt-0.5">
              Linked stay continuing from Day {service.linkedFromDay}
            </div>
          )}
        </div>
      </div>

      {/* Price & Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 border-t border-slate-100 pt-1.5 sm:border-0 sm:pt-0">
        {viewMode === 'internal' && (
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0 text-left sm:block sm:text-right">
            {service.linkedStay ? (
              <div className="text-[10px] text-blue-600 font-medium">Included in Day {service.linkedFromDay}</div>
            ) : (
              <>
                <div className="text-[10px] text-slate-500 font-medium">
                  Cost: {fmt(service.totalSupplierCost ?? service.supplierCost)}
                </div>
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  Sell: {fmt(service.totalSellingPrice ?? service.sellingPrice)}
                </div>
                {service.markup !== undefined && service.markup !== null && (
                  <div className="text-[10px] font-bold text-emerald-600">+{service.markup}%</div>
                )}
              </>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1 sm:border-l sm:border-slate-200/80 sm:pl-2 ml-auto">
          {canDuplicate && (
            <button
              type="button"
              onClick={() => onDuplicate(service)}
              className="p-1.5 sm:p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
              title="Duplicate"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(service)}
            className="p-1.5 sm:p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(service.id)}
            className="p-1.5 sm:p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DayCard({
  day,
  days,
  onUpdateDay,
  onSaveService,
  onDeleteService,
  onReorderService,
  onDeleteDay,
  viewMode,
  quotation,
  allowedServiceTypes,
  theme,
  isExpanded,
  onToggle,
  itineraryMasters,
  onApplyItineraryMaster,
  masterWarnings,
  aiWarnings,
  agentPortal = false,
}) {
  const [editingService, setEditingService] = useState(null);
  const [showAddService, setShowAddService] = useState(false);
  const [addServiceType, setAddServiceType] = useState(null);
  const serviceDrag = useServicePointerOrder(day.id || day.date || day.day, onReorderService);

  const addService = (service) => {
    const newService = { ...service, id: `s_${Date.now()}_${Math.random().toString(36).substr(2, 6)}` };
    onSaveService(day, null, newService);
    setShowAddService(false);
    setAddServiceType(null);
  };

  const updateService = (updated) => {
    onSaveService(day, editingService, updated);
    setEditingService(null);
  };

  const duplicateService = (service) => {
    const dup = { ...service, id: `s_${Date.now()}` };
    onSaveService(day, null, dup);
  };

  const isCoveredByHotel = days.some((itineraryDay) =>
    (itineraryDay.services || []).some((service) => {
      if (service.type !== 'Hotel' || !service.checkIn || !service.checkOut) return false;
      return day.date >= service.checkIn && day.date < service.checkOut;
    })
  );
  const itinerarySegment = Number.isInteger(day.segmentIndex) ? quotation.travelSegments?.[day.segmentIndex] : null;
  const linkedHotelServices = days.flatMap((itineraryDay) =>
    (itineraryDay.services || [])
      .filter(
        (service) =>
          service.type === 'Hotel' &&
          itineraryDay.day !== day.day &&
          service.checkIn &&
          service.checkOut &&
          day.date >= service.checkIn &&
          day.date < service.checkOut
      )
      .map((service) => ({ ...service, linkedStay: true, linkedFromDay: itineraryDay.day }))
  );
  const visibleServices = [...(day.services || []), ...linkedHotelServices];
  const serviceSummary = [
    ...new Set(
      visibleServices
        .map((service) => service.name || service.variantName || service.type)
        .filter(Boolean)
    ),
  ];
  // A day belongs to one destination. Do not let a Phuket day accidentally
  // receive a Pattaya or Bangkok master just because it is active.
  const matchingItineraryMasters = itineraryMasters.filter(
    (master) => !day.destination || sameValue(master.destination, day.destination)
  );
  const masterLabel = (master) =>
    [master.name, master.destination, master.arrivalDeparture !== 'NA' ? master.arrivalDeparture : '']
      .filter(Boolean)
      .join(' · ');

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        isExpanded
          ? theme?.expandedDayBg || 'bg-white border-blue-400 border-l-4 border-l-blue-600 ring-2 ring-blue-500/40 shadow-md'
          : theme?.collapsedDayBg || 'bg-white hover:bg-blue-50/40 border-slate-200/90 hover:border-blue-300 shadow-2xs hover:shadow-xs'
      }`}
    >
      {/* Day header */}
      <div
        className={`flex items-center justify-between gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-2 cursor-pointer select-none transition-colors ${
          isExpanded
            ? theme?.expandedHeaderBg || 'bg-gradient-to-r from-blue-100/90 via-blue-50/50 to-white border-b border-blue-200'
            : ''
        }`}
        onClick={onToggle}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
          {/* Day pill badge */}
          <div
            className={`${
              theme?.dayBadge || 'bg-blue-600 text-white'
            } px-2 sm:px-2.5 py-0.5 rounded-md text-[11px] font-bold shrink-0 shadow-2xs`}
          >
            Day {day.day}
          </div>

          {/* Title and Date */}
          <div className="min-w-0">
            <div className="text-xs sm:text-[13px] font-bold text-slate-800 truncate">
              {day.title || `Day ${day.day}`}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5 min-w-0">
              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{formatDayDate(day.date)}</span>
            </div>
          </div>

          {/* Highlight badge when open */}
          {isExpanded && (
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs shrink-0 ${
                theme?.activeBadgeBg || 'bg-blue-600 text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Active Day
            </span>
          )}

          {/* Collapsed services summary chips */}
          {!isExpanded && serviceSummary.length > 0 && (
            <div className="hidden sm:flex flex-wrap items-center gap-1.5 ml-2">
              {serviceSummary.slice(0, 4).map((name) => (
                <span
                  key={name}
                  title={name}
                  className="max-w-[200px] truncate rounded border border-slate-200/90 bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 shadow-2xs"
                >
                  {name}
                </span>
              ))}
              {serviceSummary.length > 4 && (
                <span className="rounded border border-slate-200/90 bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 shadow-2xs">
                  +{serviceSummary.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right side: services count badge */}
        <div className="flex shrink-0 items-center gap-2">
          <div
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 ${
              theme?.serviceBadge || 'bg-blue-50 text-blue-600'
            } transition-colors`}
          >
            <span>{visibleServices.length}<span className="hidden sm:inline"> services</span></span>
            <ChevronRight
              className={`w-3.5 h-3.5 text-current transition-transform duration-200 ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          </div>
        </div>
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div className="p-2 sm:p-3.5 space-y-2 sm:space-y-2.5 bg-slate-50/40">
          {/* Apply Itinerary Master */}
          <div className="rounded-lg border border-blue-200/80 bg-blue-50/70 p-2 sm:p-2.5 shadow-2xs">
            <label className="mb-1 block text-xs font-bold text-slate-800">
              Apply Itinerary Master
            </label>
            <div className="relative">
              <select
                value=""
                onChange={(event) => event.target.value && onApplyItineraryMaster(day, event.target.value)}
                disabled={!matchingItineraryMasters.length}
                className="w-full h-7.5 px-2.5 pr-8 rounded-md border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 cursor-pointer appearance-none shadow-2xs"
              >
                <option value="">
                  {matchingItineraryMasters.length
                    ? 'Select itinerary master'
                    : day.destination
                      ? `No active itinerary masters for ${day.destination}`
                      : 'No active itinerary masters available'}
                </option>
                {matchingItineraryMasters.length > 0 && (
                  <optgroup label={day.destination ? `${day.destination} itinerary masters` : 'Available itinerary masters'}>
                    {matchingItineraryMasters.map((master) => (
                      <option key={master.id} value={master.id}>
                        {masterLabel(master)}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="hidden sm:block mt-1 text-[10px] text-blue-600 font-medium">
              Only the selected master is applied. Your manually added services are never replaced.
            </p>
          </div>

          {/* Title & Description inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="text"
              value={day.title || ''}
              onChange={(e) => onUpdateDay({ ...day, title: e.target.value })}
              placeholder="Day title (e.g., Phuket Arrival)"
              className="w-full h-7.5 px-2.5 rounded-md border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
            />
            <input
              type="text"
              value={day.description || ''}
              onChange={(e) => onUpdateDay({ ...day, description: e.target.value })}
              placeholder="Day description..."
              className="w-full h-7.5 px-2.5 rounded-md border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
            />
          </div>

          {/* Services list */}
          <div className="space-y-1.5">
            {visibleServices.map((service) => (
              <ServiceCard
                key={`${service.id}-${service.linkedStay ? day.day : 'source'}`}
                service={service}
                onEdit={setEditingService}
                onDelete={() => onDeleteService(day, service)}
                onDuplicate={duplicateService}
                viewMode={viewMode}
                canDuplicate={!service.linkedStay}
                draggable={!service.linkedStay}
                dragProps={!service.linkedStay ? serviceDrag.handleProps(service.id) : undefined}
                cardProps={!service.linkedStay ? serviceDrag.cardProps(service.id) : undefined}
                dragClass={!service.linkedStay ? serviceDrag.cardClass(service.id) : ''}
              />
            ))}
            {visibleServices.length === 0 && (
              <div className="py-3 text-center border-2 border-dashed border-slate-200 rounded-lg bg-white">
                <div className="text-slate-400 text-xs font-medium">No services added</div>
              </div>
            )}
            {day.requiresAccommodation && !isCoveredByHotel && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-1.5 text-xs">
                <span className="text-amber-900 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Accommodation is still required for {day.destination || 'Phuket'}.
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-amber-100/90 text-amber-900 font-semibold text-xs whitespace-nowrap self-start sm:self-auto shadow-2xs">
                  Add one hotel stay for all covered nights.
                </span>
              </div>
            )}
          </div>

          {/* Action buttons row */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-200/80">
            {SERVICE_TYPES.filter(({ type }) => allowedServiceTypes.includes(type)).map(({ type, icon: Icon }) => {
              const needsAttention = masterWarnings?.includes(type) || aiWarnings?.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setAddServiceType(type);
                    setShowAddService(true);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border border-dashed transition-all shadow-2xs ${
                    needsAttention
                      ? 'border-red-400 text-red-700 bg-red-50 hover:bg-red-100 hover:border-red-500'
                      : 'border-blue-300 text-blue-700 bg-white hover:bg-blue-50/80 hover:border-blue-400'
                  }`}
                  title={
                    needsAttention
                      ? `The AI or selected itinerary master needs a valid ${type.toLowerCase()} setup. Complete it here manually.`
                      : undefined
                  }
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span>+ {type}</span>
                  {needsAttention && (
                    <span
                      aria-label={`${type} needs attention`}
                      className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-[9px] leading-none text-white font-bold"
                    >
                      !
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onDeleteDay(day.day)}
              className="ml-auto flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-3 h-3 shrink-0" />
              <span>Delete Day</span>
            </button>
          </div>
        </div>
      )}

      {/* Service form modal */}
      <Modal
        isOpen={showAddService}
        onClose={() => {
          setShowAddService(false);
          setAddServiceType(null);
        }}
        title={`Add ${addServiceType} Service`}
        icon={addServiceType ? serviceIcon(addServiceType) : undefined}
        size={addServiceType === 'Hotel' ? 'xl' : 'lg'}
      >
        {addServiceType && (
          <ServiceForm
            type={addServiceType}
            quotation={quotation}
            day={day}
            segment={itinerarySegment}
            hidePricing={agentPortal}
            onSave={addService}
            onCancel={() => {
              setShowAddService(false);
              setAddServiceType(null);
            }}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!editingService}
        onClose={() => setEditingService(null)}
        title={`Edit ${editingService?.type} Service`}
        icon={editingService ? serviceIcon(editingService.type) : undefined}
        size={editingService?.type === 'Hotel' ? 'xl' : 'lg'}
      >
        {editingService && (
          <ServiceForm
            type={editingService.type}
            initialData={editingService}
            quotation={quotation}
            day={day}
            segment={itinerarySegment}
            hidePricing={agentPortal}
            onSave={updateService}
            onCancel={() => setEditingService(null)}
          />
        )}
      </Modal>
    </div>
  );
}

export default function ItineraryBuilder({
  days,
  onChange,
  quotation,
  allowedServiceTypes,
  viewMode,
  planning = false,
  onUpdateQuotation,
  aiWarnings = {},
  agentPortal = false,
}) {
  const quotationIdentity = quotation?.id || `draft-${quotation?.queryId || quotation?.travelDate || 'new'}`;
  const expandedDayStorageKey = useMemo(
    () => `buildsoftware:quotation:${quotationIdentity}:expanded-itinerary-day`,
    [quotationIdentity]
  );
  const previousStorageKey = useRef(expandedDayStorageKey);
  const [expandedDay, setExpandedDay] = useState(null);
  const [itineraryMasterData, setItineraryMasterData] = useState({
    masters: [],
    transfers: [],
    transferRates: [],
    sightseeing: [],
  });
  const [masterWarnings, setMasterWarnings] = useState({});
  const [lastServiceMove, setLastServiceMove] = useState(null);
  const availableServiceTypes =
    Array.isArray(allowedServiceTypes) && allowedServiceTypes.length
      ? allowedServiceTypes
      : SERVICE_TYPES.map(({ type }) => type);

  useEffect(() => {
    const normalized = ensureDistinctServiceIds(days);
    if (normalized.changed) onChange(normalized.days);
  }, [days, onChange]);

  useEffect(() => {
    const keyChanged = previousStorageKey.current !== expandedDayStorageKey;
    previousStorageKey.current = expandedDayStorageKey;
    let savedDay = null;
    try {
      const stored = Number(window.localStorage.getItem(expandedDayStorageKey));
      savedDay = Number.isInteger(stored) && stored > 0 ? stored : null;
    } catch {
      // In-memory state continues if storage is unavailable
    }
    setExpandedDay((currentDay) => {
      if (!keyChanged && days.some((day) => day.day === currentDay)) return currentDay;
      if (days.some((day) => day.day === savedDay)) return savedDay;
      return days[0]?.day || null;
    });
  }, [days, expandedDayStorageKey]);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.get('/system-masters/itinerary'),
      apiClient.get('/operations-masters/transfers'),
      apiClient.get('/transfer-rates'),
      apiClient.get('/sightseeing-module'),
    ])
      .then(([masters, transfers, transferRates, sightseeing]) => {
        if (!active) return;
        setItineraryMasterData({
          masters: (masters.data || []).filter((item) => item.status === 'Active'),
          transfers: (transfers.data || []).filter((item) => item.status === 'Active'),
          transferRates: (transferRates.data || []).filter((item) => item.status !== 'Inactive'),
          sightseeing: (sightseeing.data || []).filter((item) => item.status === 'Active'),
        });
      })
      .catch(() => {
        if (active) setItineraryMasterData({ masters: [], transfers: [], transferRates: [], sightseeing: [] });
      });
    return () => {
      active = false;
    };
  }, []);

  const selectExpandedDay = (dayNumber) => {
    setExpandedDay(dayNumber);
    try {
      if (dayNumber) window.localStorage.setItem(expandedDayStorageKey, String(dayNumber));
      else window.localStorage.removeItem(expandedDayStorageKey);
    } catch {
      // In-memory state continues if storage is unavailable
    }
  };

  const addDay = () => {
    const nextDay = days.length + 1;
    const lastDate = days.length > 0 ? days[days.length - 1].date : quotation.travelDate || '2026-11-22';
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const dateStr = nextDate.toISOString().split('T')[0];
    onChange([...days, { day: nextDay, date: dateStr, title: '', description: '', services: [] }]);
    selectExpandedDay(nextDay);
  };

  const updateDay = (updatedDay) => onChange(days.map((d) => (d.day === updatedDay.day ? updatedDay : d)));

  const applyItineraryMaster = (day, masterId) => {
    const master = itineraryMasterData.masters.find((item) => item.id === masterId);
    if (!master) return;

    const warnings = [];
    const generated = [];
    const market = quotation?.market || '';
    const transfer = master.transfer && itineraryMasterData.transfers.find((item) => sameValue(item.name, master.transfer));
    if (master.transfer) {
      const rates = itineraryMasterData.transferRates.filter(
        (rate) => rate.transferId === transfer?.id && dateIsInRange(rate, day.date, market)
      );
      // New itinerary masters explicitly retain SIC vs Private. Legacy
      // masters have no saved basis, so preserve their former PVT-first
      // behavior instead of changing existing quotations.
      const selectedTransferServiceType = String(master.transferServiceType || '').trim().toUpperCase();
      const rate = selectedTransferServiceType
        ? rates.find((item) => item.serviceType === selectedTransferServiceType)
        : rates.find((item) => item.serviceType === 'PVT') || rates.find((item) => item.serviceType === 'SIC') || rates[0];
      if (!transfer || !rate) {
        warnings.push('Transfer');
      } else {
        const combination = selectedVehicleCombination(rate.vehicleCosts, partySize(quotation));
        const passengerCost =
          rate.serviceType === 'SIC'
            ? Number(rate.adultCost || 0) * Number(quotation?.adults || 0) + Number(rate.childCost || 0) * Number(quotation?.children || 0)
            : 0;
        const supplierCost = passengerCost + Number(combination?.totalCost || 0);
        const { origin, destination } = transferRoute(transfer);
        generated.push({
          id: newServiceId(),
          type: 'Transfer',
          sourceItineraryMasterId: master.id,
          masterId: transfer.id,
          rateContractId: rate.id,
          serviceType: rate.serviceType || 'PVT',
          name: transfer.name,
          origin,
          destination,
          itineraryDestination: day.destination || transfer.destination || master.destination || '',
          basis: rate.serviceType === 'SIC' ? 'Sic' : 'Private',
          quantity: 1,
          vehicle: combination?.key || '',
          vehicleId: combination?.key || '',
          vehicleName: combination?.label || '',
          vehicleSelectionKey: combination?.key || '',
          vehicleSelections: combination?.entries || [],
          vehicleTotalCapacity: combination?.totalCapacity || 0,
          vehicleAutoSelectedForPax: partySize(quotation),
          vehicleManualSelection: false,
          supplier: rate.supplier || '',
          adultTransferCost: Number(rate.adultCost || 0),
          childTransferCost: Number(rate.childCost || 0),
          supplierCost,
          sellingPrice: supplierCost,
          totalSupplierCost: supplierCost,
          totalSellingPrice: supplierCost,
          adults: quotation?.adults || '',
          children: quotation?.children || '',
          infants: quotation?.infants || '',
          markup: 0,
          currency: rate.currency || 'THB',
          description: transfer.description || master.description || '',
          serviceDate: day.date,
        });
      }
    }

    // New masters keep one entry per sightseeing/variant. The legacy single
    // fields remain as a fallback so existing itinerary masters still apply.
    const sightseeingSelections = master.sightseeingSelections?.length
      ? master.sightseeingSelections
      : master.sightseeing ? [{
        sightseeing: master.sightseeing,
        sightseeingVariantId: master.sightseeingVariantId,
        sightseeingVariantName: master.sightseeingVariantName,
      }] : [];
    sightseeingSelections.forEach((selection, selectionIndex) => {
      const sightseeing = itineraryMasterData.sightseeing.find((item) => sameValue(item.name, selection.sightseeing));
      const dayName = weekdayForDate(day.date);
      const showTimings = sightseeing?.showTimings || [];
      const hasTimingSchedule = showTimings.some((item) => item?.time || item?.openingTime || item?.closingTime || item?.days?.length);
      const availableTiming = showTimings.find((item) => !item?.days?.length || item.days.includes(dayName));
      const masterVariantId = String(selection.sightseeingVariantId || '').trim();
      const masterVariantName = String(selection.sightseeingVariantName || '').trim().toLocaleLowerCase();
      const selectedVariant = (sightseeing?.variants || []).find((variant) => (
        variant.status === 'Active'
        && ((masterVariantId && String(variant.id) === masterVariantId)
          || (!masterVariantId && masterVariantName && String(variant.name || '').trim().toLocaleLowerCase() === masterVariantName))
      ));
      const candidates = (selectedVariant ? [selectedVariant] : [])
        .flatMap((variant) =>
          (variant.rates || [])
            .filter((rate) => dateIsInRange({ ...rate, status: rate.status || 'Active' }, day.date, market))
            .map((rate, index) => ({ variant, rate, index }))
        );
      const candidate = candidates[0];
      if (!sightseeing || !selectedVariant || !candidate || (hasTimingSchedule && !availableTiming)) {
        warnings.push(`Sightseeing variant${sightseeingSelections.length > 1 ? ` ${selectionIndex + 1}` : ''}`);
      } else {
        const { variant, rate, index } = candidate;
        const selectedVariantImage = variantImage(variant);
        // Keep the ticket/transfer choice made in the itinerary master. The
        // same fields are used by ServiceForm, so opening the generated row
        // later shows and recalculates the exact option rather than silently
        // reverting to a generic activity.
        const selectedTransfer = (sightseeing.transfers || []).find((transfer) => (
          transfer.status === 'Active'
          && String(transfer.id) === String(selection.transferOptionId || '')
          && (!transfer.variantId || String(transfer.variantId) === String(variant.id))
        ));
        const transferIsTicketOnly = selectedTransfer?.type === 'Ticket Only';
        const transferCombination = selectedTransfer && !transferIsTicketOnly
          ? selectedVehicleCombination(selectedTransfer.vehicleCosts, partySize(quotation))
          : null;
        const transferPassengerCost = selectedTransfer && !transferIsTicketOnly
          ? Number(selectedTransfer.adultPrice || 0) * Number(quotation?.adults || 0)
            + Number(selectedTransfer.childPrice || 0) * Number(quotation?.children || 0)
          : 0;
        const transferVehicleCost = Number(transferCombination?.totalCost || 0);
        // An itinerary master always starts with the selected variant's
        // ticket price. Choosing SIC or Private adds that transfer charge on
        // top; Ticket Only therefore remains just the ticket amount.
        const adultCost = Number(rate.adultCost || 0);
        const childCost = Number(rate.childCost || 0);
        const ticketSupplierCost = adultCost * Number(quotation?.adults || 0)
          + childCost * Number(quotation?.children || 0);
        const transferSupplierCost = transferPassengerCost + transferVehicleCost;
        const totalSupplierCost = ticketSupplierCost + transferSupplierCost;
        const totalSellingPrice = totalSupplierCost;
        const basis = !selectedTransfer || transferIsTicketOnly
          ? 'Ticket Only'
          : selectedTransfer.type === 'SIC' ? 'Sic' : 'Private';
        generated.push({
          id: newServiceId(),
          type: 'Sightseeing',
          sourceItineraryMasterId: master.id,
          sourceItineraryMasterSelectionIndex: selectionIndex,
          masterId: sightseeing.id,
          variantId: variant.id,
          variantRateKey: rate.id || `${rate.fromDate}-${rate.toDate}-${index}`,
          name: `${sightseeing.name} · ${variant.name}`,
          destination: sightseeing.destination || day.destination || master.destination || '',
          itineraryDestination: day.destination || sightseeing.destination || master.destination || '',
          supplier: sightseeing.suppliers?.[0]?.name || sightseeing.supplier?.name || '',
          basis,
          transferOptionId: selectedTransfer?.id || '',
          // A master can explicitly choose Ticket Only without referencing a
          // transfer-option record. Preserve that choice when this itinerary
          // creates the quotation service.
          transferOptionType: selectedTransfer?.type || selection.transferOptionType || 'Ticket Only',
          transferVehicle: transferIsTicketOnly ? '' : transferCombination?.key || '',
          transferVehicleName: transferIsTicketOnly ? '' : transferCombination?.label || '',
          transferVehicleSelectionKey: transferIsTicketOnly ? '' : transferCombination?.key || '',
          transferVehicleSelections: transferIsTicketOnly ? [] : transferCombination?.entries || [],
          transferVehicleTotalCapacity: transferIsTicketOnly ? 0 : transferCombination?.totalCapacity || 0,
          transferVehicleAutoSelectedForPax: partySize(quotation),
          transferVehicleManualSelection: false,
          transferVehicleSupplierId: transferIsTicketOnly ? '' : selectedTransfer?.vehicleSupplierId || '',
          transferVehicleSupplier: transferIsTicketOnly ? '' : selectedTransfer?.vehicleSupplierName || '',
          // This marker is intentionally scoped to services created from an
          // itinerary master. Manual quotation-builder services retain their
          // existing transfer-only calculation.
          itineraryMasterTicketPlusTransfer: true,
          transferSupplierCost,
          transferSellingPrice: transferSupplierCost,
          sightseeingTicketSupplierCost: ticketSupplierCost,
          sightseeingTransferVehicleCost: transferVehicleCost,
          sightseeingTicketSellingPrice: ticketSupplierCost,
          sightseeingTransferVehicleSellingPrice: transferVehicleCost,
          inclusions: [],
          adults: quotation?.adults || '',
          children: quotation?.children || '',
          infants: quotation?.infants || '',
          markup: 0,
          adultSupplierRate: adultCost,
          childSupplierRate: childCost,
          adultSellingRate: adultCost,
          childSellingRate: childCost,
          totalSupplierCost,
          totalSellingPrice,
          currency: 'THB',
          time: availableTiming?.time || '',
          fromTime: variant.defaultFromTime || '',
          toTime: variant.defaultToTime || '',
          dropUpTime: variant.defaultDropTime || '',
          masterDescription: variant.description || sightseeing.details || master.description || '',
          description: variant.description || sightseeing.details || master.description || '',
          image: selectedVariantImage,
          imageUrl: selectedVariantImage?.url || '',
          variantImage: selectedVariantImage,
          serviceDate: day.date,
        });
      }
    });

    setMasterWarnings((current) => ({ ...current, [day.day]: warnings }));
    const retained = (day.services || []).filter((service) => !service.sourceItineraryMasterId);
    onChange(
      days.map((entry) =>
        entry.day !== day.day
          ? entry
          : {
              ...entry,
              title: entry.title || master.name,
              description: entry.description || master.description || '',
              services: [...retained, ...generated],
            }
      )
    );
    if (warnings.length)
      toast.error(
        `${master.name} needs a valid ${warnings.join(' and ')} setup. The red ${
          warnings.length === 1 ? 'button' : 'buttons'
        } show where to complete it manually.`
      );
    else toast.success(`${master.name} applied to Day ${day.day}.`);
  };

  const saveService = (sourceDay, previousService, service) => {
    const { _linkedStay, _linkedFromDay, linkedStay: _linkedStayLegacy, linkedFromDay: _linkedFromDayLegacy, splitStayFromDate, ...cleanService } = service;
    if (service.type !== 'Hotel') {
      onChange(
        days.map((itineraryDay) =>
          itineraryDay.day !== sourceDay.day
            ? itineraryDay
            : {
                ...itineraryDay,
                services: previousService
                  ? (itineraryDay.services || []).map((entry) => (entry.id === previousService.id ? cleanService : entry))
                  : cleanService.type === 'Flight'
                  ? (() => {
                      const services = [...(itineraryDay.services || [])];
                      const hotelIndex = services.findIndex((entry) => entry.type === 'Hotel');
                      services.splice(hotelIndex < 0 ? services.length : hotelIndex, 0, cleanService);
                      return services;
                    })()
                  : [...(itineraryDay.services || []), cleanService],
              }
        )
      );
      return;
    }

    const splitDate = String(splitStayFromDate || '').slice(0, 10);
    const originalService = previousService && days
      .flatMap((itineraryDay) => itineraryDay.services || [])
      .find((entry) => entry.id === previousService.id);
    const canSplitStay = originalService
      && splitDate
      && splitDate > originalService.checkIn
      && splitDate < originalService.checkOut;

    if (canSplitStay) {
      const firstStay = withHotelStayTotals(originalService, originalService.checkIn, splitDate);
      const continuation = withHotelStayTotals({
        ...cleanService,
        id: newServiceId(),
        roomAllocationOverride: true,
        serviceDate: splitDate,
      }, splitDate, cleanService.checkOut || originalService.checkOut);
      const continuationDay = days.find((itineraryDay) => itineraryDay.date === splitDate);
      if (!continuationDay) return;
      onChange(days.map((itineraryDay) => {
        const services = (itineraryDay.services || []).map((entry) => (
          entry.id === originalService.id ? firstStay : entry
        ));
        return itineraryDay.day === continuationDay.day
          ? { ...itineraryDay, services: [...services, continuation] }
          : { ...itineraryDay, services };
      }));
      return;
    }

    const withoutPrevious = days.map((itineraryDay) => ({
      ...itineraryDay,
      services: (itineraryDay.services || []).filter((entry) => entry.id !== (previousService?.id || cleanService.id)),
    }));
    const targetDay =
      withoutPrevious.find((itineraryDay) => itineraryDay.date === cleanService.checkIn) ||
      withoutPrevious.find((itineraryDay) => itineraryDay.day === sourceDay.day);
    if (!targetDay) return;
    onChange(
      withoutPrevious.map((itineraryDay) =>
        itineraryDay.day === targetDay.day
          ? {
              ...itineraryDay,
              services: [...itineraryDay.services, cleanService],
            }
          : itineraryDay
      )
    );
  };

  const deleteService = (sourceDay, service) => {
    if (service.type === 'Hotel') {
      onChange(
        days.map((itineraryDay) => ({
          ...itineraryDay,
          services: (itineraryDay.services || []).filter((entry) => entry.id !== service.id),
        }))
      );
      return;
    }
    onChange(
      days.map((itineraryDay) =>
        itineraryDay.day === sourceDay.day
          ? {
              ...itineraryDay,
              services: (itineraryDay.services || []).filter((entry) => entry.id !== service.id),
            }
          : itineraryDay
      )
    );
  };

  const reorderService = (sourceDay, sourceId, targetId) => {
    const services = [...(sourceDay.services || [])];
    const sourceIndex = services.findIndex((service) => String(service.id) === String(sourceId));
    const targetIndex = services.findIndex((service) => String(service.id) === String(targetId));
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    const [moved] = services.splice(sourceIndex, 1);
    services.splice(targetIndex, 0, moved);
    const orderedServices = services.map((service, index) => ({ ...service, quotationOrder: index + 1 }));
    setLastServiceMove({ dayKey: dayKey(sourceDay), services: sourceDay.services || [] });
    onChange(days.map((itineraryDay) => itineraryDay.day === sourceDay.day ? { ...itineraryDay, services: orderedServices } : itineraryDay));
  };

  const undoLastServiceMove = () => {
    if (!lastServiceMove) return;
    onChange(days.map((day) => dayKey(day) === lastServiceMove.dayKey ? { ...day, services: lastServiceMove.services } : day));
    setLastServiceMove(null);
  };

  const deleteDay = (dayNum) => {
    const filtered = days.filter((d) => d.day !== dayNum).map((d, i) => ({ ...d, day: i + 1 }));
    onChange(filtered);
  };

  const adjustSegmentDays = (segmentIndex, amount) => {
    const segment = quotation.travelSegments?.[segmentIndex];
    const segmentDays = days.filter((day) => day.segmentIndex === segmentIndex);
    if (!segment || !segmentDays.length || (amount < 0 && segmentDays.length <= 1)) return;

    const lastDay = segmentDays.at(-1);
    const newSegmentEnd = shiftDate(segment.toDate, amount);
    const nextSegments = quotation.travelSegments.map((entry, index) => {
      if (index < segmentIndex) return entry;
      if (index === segmentIndex) return { ...entry, toDate: newSegmentEnd };
      return { ...entry, fromDate: shiftDate(entry.fromDate, amount), toDate: shiftDate(entry.toDate, amount) };
    });
    const nextDays = [];
    days.forEach((entry) => {
      if (entry.segmentIndex === segmentIndex && amount < 0 && entry.day === lastDay.day) return;
      const shouldShift =
        entry.segmentIndex > segmentIndex || (!Number.isInteger(entry.segmentIndex) && entry.date > lastDay.date);
      let updated = shouldShift ? { ...entry, date: shiftDate(entry.date, amount) } : { ...entry };
      if (amount < 0 && updated.segmentIndex === segmentIndex) {
        updated.services = (updated.services || []).map((service) => {
          if (service.type !== 'Hotel' || !service.checkOut || service.checkOut <= newSegmentEnd) return service;
          const nights = hotelNights(service.checkIn, newSegmentEnd);
          const supplierCost = Number(service.supplierCost || 0);
          const sellingPrice = Number(service.sellingPrice || 0);
          return {
            ...service,
            checkOut: newSegmentEnd,
            nights,
            totalSupplierCost: supplierCost * Number(service.rooms || 1) * nights,
            totalSellingPrice: sellingPrice * Number(service.rooms || 1) * nights,
          };
        });
      }
      nextDays.push(updated);
      if (amount > 0 && entry.day === lastDay.day) {
        nextDays.push({
          ...lastDay,
          date: shiftDate(lastDay.date, 1),
          title: `${lastDay.destination || segment.arrivalDestination} · Day ${segmentDays.length + 1}`,
          description: `Plan accommodation and services in ${lastDay.destination || segment.arrivalDestination}.`,
          services: [],
        });
      }
    });
    const numberedDays = nextDays.map((entry, index) => ({ ...entry, day: index + 1 }));
    const finalSegmentIndex = nextSegments.length - 1;
    const finalSegmentDays = numberedDays.filter((entry) => entry.segmentIndex === finalSegmentIndex);
    const finalSegment = nextSegments[finalSegmentIndex];
    const departureDayNumber = finalSegmentDays.at(-1)?.day;
    const destination = finalSegment?.arrivalDestination;
    const nextItinerary = numberedDays.map((entry) => {
      const isDepartureDay = entry.day === departureDayNumber && finalSegmentDays.length > 1;
      if (!isDepartureDay) return { ...entry, isDepartureDay: false };
      const generatedTitle = `${destination} · Day ${finalSegmentDays.length}`;
      const shouldUseGeneratedCopy = entry.isDepartureDay || !entry.title || entry.title === generatedTitle;
      return {
        ...entry,
        isDepartureDay: true,
        requiresAccommodation: false,
        title: shouldUseGeneratedCopy ? `${destination} Departure` : entry.title,
        description: shouldUseGeneratedCopy
          ? `Departure from ${destination}. Plan checkout, transfer, sightseeing or other services before departure.`
          : entry.description,
      };
    });
    const totalStart = new Date(`${nextSegments[0]?.fromDate || ''}T00:00:00.000Z`);
    const totalEnd = new Date(`${nextSegments.at(-1)?.toDate || ''}T00:00:00.000Z`);
    const totalNights =
      Number.isNaN(totalStart.valueOf()) || Number.isNaN(totalEnd.valueOf())
        ? 0
        : Math.max(0, Math.round((totalEnd - totalStart) / (24 * 60 * 60 * 1000)));
    onChange(nextItinerary);
    onUpdateQuotation?.({
      travelSegments: nextSegments,
      endDate: shiftDate(quotation.endDate || segment.toDate, amount),
      duration: `${totalNights} ${totalNights === 1 ? 'Night' : 'Nights'} / ${totalNights + 1} ${
        totalNights + 1 === 1 ? 'Day' : 'Days'
      }`,
    });
  };

  const finalSegmentIndex = Math.max(0, (quotation.travelSegments?.length || 1) - 1);
  const finalSegment = quotation.travelSegments?.[finalSegmentIndex];
  const displayDays = days.map((day) => {
    const isLegacyDepartureDay =
      !Number.isInteger(day.segmentIndex) && finalSegment?.toDate && day.date === finalSegment.toDate;
    if (!isLegacyDepartureDay) return day;
    const titleIsGeneric = !day.title || /^Day\s+\d+$/i.test(day.title.trim());
    return {
      ...day,
      segmentIndex: finalSegmentIndex,
      destination: day.destination || finalSegment.arrivalDestination,
      isDepartureDay: true,
      requiresAccommodation: false,
      title: titleIsGeneric ? `${finalSegment.arrivalDestination} Departure` : day.title,
      description:
        day.description ||
        `Departure from ${finalSegment.arrivalDestination}. Plan checkout, transfer, sightseeing or other services before departure.`,
    };
  });
  const dayGroups = displayDays.reduce((groups, day) => {
    const segmentIndex = Number.isInteger(day.segmentIndex) ? day.segmentIndex : null;
    const key = segmentIndex === null ? 'additional' : `segment-${segmentIndex}`;
    let group = groups.find((entry) => entry.key === key);
    if (!group) {
      const segment = segmentIndex === null ? null : quotation.travelSegments?.[segmentIndex];
      group = { key, segmentIndex, segment, days: [] };
      groups.push(group);
    }
    group.days.push(day);
    return groups;
  }, []);

  return (
    <div className="w-full p-2 sm:p-4 space-y-2.5 sm:space-y-3">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 pb-0.5">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">Day-wise Itinerary</h2>
        <div className="flex items-center gap-2">
          {lastServiceMove && <button type="button" onClick={undoLastServiceMove} className="border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs px-3 py-1 rounded-lg transition-colors shadow-2xs">Undo last move</button>}
          <button
            type="button"
            onClick={addDay}
            className="border border-blue-400/90 bg-white hover:bg-blue-50/80 text-blue-600 font-semibold text-xs px-3 py-1 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Day</span>
          </button>
        </div>
      </div>

      {planning && (
        <div className="text-xs text-blue-700 bg-blue-50/90 border border-blue-200 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>Preparing destination days and airport arrival from your live query…</span>
        </div>
      )}

      {days.length === 0 ? (
        <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2.5">
            <MapPin className="w-5 h-5" />
          </div>
          <p className="text-slate-800 font-bold text-sm">No days added yet</p>
          <p className="text-slate-400 text-xs mt-0.5 mb-3">Start building the itinerary by adding days</p>
          <button
            type="button"
            onClick={addDay}
            className="border border-blue-400/90 bg-white hover:bg-blue-50 text-blue-600 font-semibold text-xs px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add First Day
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {dayGroups.map((group, groupIndex) => {
            const departure = group.segment?.departureDestination;
            const arrival = group.segment?.arrivalDestination || group.days[0]?.destination;
            const label =
              departure && arrival
                ? `${departure} → ${arrival}`
                : group.key === 'additional'
                ? 'Additional itinerary days'
                : arrival || 'Itinerary';
            const theme = SECTION_THEMES[groupIndex % SECTION_THEMES.length];
            const groupStart = group.segment?.fromDate ? new Date(`${group.segment.fromDate}T00:00:00.000Z`) : null;
            const groupEnd = group.segment?.toDate ? new Date(`${group.segment.toDate}T00:00:00.000Z`) : null;
            const groupNights =
              groupStart && groupEnd && !Number.isNaN(groupStart.valueOf()) && !Number.isNaN(groupEnd.valueOf())
                ? Math.max(0, Math.round((groupEnd - groupStart) / (24 * 60 * 60 * 1000)))
                : null;
            const groupDuration =
              groupNights === null
                ? `${group.days.length} ${group.days.length === 1 ? 'Day' : 'Days'}`
                : `${groupNights} ${groupNights === 1 ? 'Night' : 'Nights'} / ${group.days.length} ${
                    group.days.length === 1 ? 'Day' : 'Days'
                  }`;
            const thumbnailUrl = getDestinationImage(arrival, departure, label);

            return (
              <section
                key={group.key}
                className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} shadow-2xs overflow-hidden`}
              >
                {/* Destination Header */}
                <div
                  className={`px-2.5 py-2 sm:px-3.5 sm:py-2.5 ${theme.headerBg} flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-100/90`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    {/* Destination Thumbnail */}
                    <img
                      src={thumbnailUrl}
                      alt={label}
                      className="w-12 h-9 sm:w-20 sm:h-12 rounded-lg object-cover shadow-2xs border border-white/80 shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <MapPin className={`w-4 h-4 shrink-0 ${theme.pinColor}`} />
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                          {label}
                        </h3>
                      </div>
                      {group.segment?.fromDate && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>
                            {formatSegmentDate(group.segment.fromDate)} to {formatSegmentDate(group.segment.toDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto sm:shrink-0 justify-between sm:justify-end">
                    {/* Duration badge */}
                    <div className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${theme.badgeBg} shadow-2xs`}>
                      {groupDuration}
                    </div>

                    {/* Faint plane watermark */}
                    <Plane className={`w-4 h-4 ${theme.planeColor} rotate-45 hidden md:block`} />

                    {/* - Day / + Day buttons */}
                    {group.segmentIndex !== null && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => adjustSegmentDays(group.segmentIndex, -1)}
                          disabled={group.days.length <= 1}
                          title="Remove one stay day"
                          className={`flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${theme.dayButtonBg} transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          <Minus className="w-3 h-3" /> Day
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustSegmentDays(group.segmentIndex, 1)}
                          title="Add one stay day and shift later destinations"
                          className={`flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${theme.dayButtonBg} transition-all`}
                        >
                          <Plus className="w-3 h-3" /> Day
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Days list with continuous timeline and light background */}
                <div className={`p-1.5 sm:p-3.5 ${theme.daysContainerBg} space-y-1.5 sm:space-y-2`}>
                  {group.days.map((day, idx) => (
                    <div key={day.day} className="flex items-start gap-1.5 sm:gap-2.5">
                      {/* Timeline column */}
                      <div className="flex flex-col items-center shrink-0 self-stretch pt-2.5">
                        {/* Connecting line from above */}
                        <div className={`w-0.5 h-2.5 ${theme.timelineLine}`} />
                        {/* Node / dot on timeline */}
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${theme.timelineDot} border-2 border-white shrink-0 z-10 shadow-2xs`}
                        />
                        {/* Line downwards connecting to next day */}
                        {idx < group.days.length - 1 ? (
                          <div className={`w-0.5 flex-1 ${theme.timelineLine}`} />
                        ) : (
                          <div className="w-0.5 h-1.5 opacity-0" />
                        )}
                      </div>

                      {/* Day Card */}
                      <div className="flex-1 min-w-0">
                        <DayCard
                          day={day}
                          days={days}
                          onUpdateDay={updateDay}
                          onSaveService={saveService}
                          onDeleteService={deleteService}
                          onReorderService={(sourceId, targetId) => reorderService(day, sourceId, targetId)}
                          onDeleteDay={deleteDay}
                          viewMode={viewMode}
                          quotation={quotation}
                          allowedServiceTypes={availableServiceTypes}
                          theme={theme}
                          itineraryMasters={itineraryMasterData.masters}
                          onApplyItineraryMaster={applyItineraryMaster}
                          masterWarnings={masterWarnings[day.day] || []}
                          aiWarnings={aiWarnings[day.date] || []}
                          agentPortal={agentPortal}
                          isExpanded={expandedDay === day.day}
                          onToggle={() => selectExpandedDay(expandedDay === day.day ? null : day.day)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {/* Add Day bottom button */}
          <button
            type="button"
            onClick={addDay}
            className="w-full py-2 border-2 border-dashed border-blue-300 hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50/80 rounded-xl text-blue-600 hover:text-blue-700 transition-colors text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Day {days.length + 1}</span>
          </button>
        </div>
      )}
    </div>
  );
}
