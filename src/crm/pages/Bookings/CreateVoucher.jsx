import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Car, CheckCircle, ChevronRight, Download, Eye, EyeOff, FileText, Globe, GripVertical, Hotel, Plane, Plus, Save, Settings, Sparkles, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../lib/api';
import { mergeVoucherSettings } from '../../lib/voucherSettings';
import { formatDate } from '../../lib/date';
import useOperationsMaster from '../../hooks/useOperationsMaster';
import useSalesMaster from '../../hooks/useSalesMaster';
import SearchableSelect from '../../components/ui/SearchableSelect';
import DateInput from '../../components/ui/DateInput';
import { activeMealPlanNames, currentMealPlanName } from '../../lib/mealPlans';
import { keepSourceVehicleSelection, sortVoucherFlights, sortVoucherRows, voucherVehicleLabel } from '../../lib/voucherPresentation';

const STEPS = [['Flights', Plane], ['Guests', Users], ['Hotels', Hotel], ['Transfers', Car], ['Activities', Calendar], ['Itinerary', FileText], ['Settings', Settings], ['Review', Eye]];
const VOUCHER_TYPES = {
  combined: { label: 'Combined voucher', steps: STEPS },
  hotel: { label: 'Hotel voucher', steps: [['Guests', Users], ['Hotels', Hotel], ['Settings', Settings], ['Review', Eye]] },
  sightseeing: { label: 'Sightseeing voucher', steps: [['Guests', Users], ['Activities', Calendar], ['Settings', Settings], ['Review', Eye]] },
  transfer: { label: 'Transfer voucher', steps: [['Guests', Users], ['Transfers', Car], ['Settings', Settings], ['Review', Eye]] },
  other: { label: 'Other service voucher', steps: [['Guests', Users], ['Activities', Calendar], ['Settings', Settings], ['Review', Eye]] },
};
const VOUCHER_TERM_TYPES = [
  { key: 'general', section: 'Voucher Important Notes', label: 'Voucher general terms & conditions', templateId: 'termsTemplateId', templateName: 'termsTemplateName', html: 'termsHtml', voucherTypes: ['combined', 'hotel', 'sightseeing', 'transfer', 'other'] },
  { key: 'hotel', section: 'Voucher Hotel Terms & Conditions', label: 'Hotel terms & conditions', templateId: 'hotelTermsTemplateId', templateName: 'hotelTermsTemplateName', html: 'hotelTermsHtml', voucherTypes: ['combined', 'hotel'] },
  { key: 'sightseeing', section: 'Voucher Sightseeing Terms & Conditions', label: 'Sightseeing terms & conditions', templateId: 'sightseeingTermsTemplateId', templateName: 'sightseeingTermsTemplateName', html: 'sightseeingTermsHtml', voucherTypes: ['combined', 'sightseeing'] },
  { key: 'transfer', section: 'Voucher Transfer Terms & Conditions', label: 'Transfer terms & conditions', templateId: 'transferTermsTemplateId', templateName: 'transferTermsTemplateName', html: 'transferTermsHtml', voucherTypes: ['combined', 'transfer'] },
];
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const day = (value) => String(value || '').slice(0, 10);
const noData = (text) => <div className="border border-dashed border-slate-200 rounded-xl py-8 text-center text-xs text-slate-400">{text}</div>;
const leaderFirst = (guests = []) => [...guests].sort((left, right) => Number(Boolean(right.isLeader)) - Number(Boolean(left.isLeader)));
const nightsBetween = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return '';
  const start = new Date(`${day(checkIn)}T00:00:00Z`);
  const end = new Date(`${day(checkOut)}T00:00:00Z`);
  return Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end < start ? '' : Math.round((end - start) / 86400000);
};
const ageFromDOB = (dob) => {
  if (!dob) return '—';
  const birth = new Date(`${day(dob)}T00:00:00`);
  if (Number.isNaN(birth.valueOf())) return '—';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  age -= Number(beforeBirthday);
  return age >= 0 ? age : '—';
};
const normalizeVoucherDate = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const display = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  const parts = iso ? [iso[1], iso[2], iso[3]] : display ? [display[3], display[2], display[1]] : null;
  if (!parts) return '';
  const [year, month, date] = parts;
  const candidate = new Date(`${year}-${month}-${date}T00:00:00Z`);
  return !Number.isNaN(candidate.valueOf())
    && candidate.getUTCFullYear() === Number(year)
    && candidate.getUTCMonth() + 1 === Number(month)
    && candidate.getUTCDate() === Number(date)
    ? `${year}-${month}-${date}`
    : '';
};
const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const locationKey = (value) => String(value || '').trim().toLowerCase();
const locationValues = (value) => {
  if (Array.isArray(value)) return value.flatMap(locationValues);
  if (value && typeof value === 'object') return [value.name, value.city, value.destination, value.locationText, value.location, value.area].flatMap(locationValues);
  return String(value || '').split(/[,+/|→]/).map((item) => item.trim()).filter(Boolean);
};
const masterLocationValues = (item = {}) => [item.city, item.destination, item.itineraryDestination, item.locationText, item.location, item.area].flatMap(locationValues);
const isInSelectedLocations = (item, selectedLocations) => {
  if (!selectedLocations.size) return true;
  return masterLocationValues(item).some((value) => selectedLocations.has(locationKey(value)));
};
const placeOption = (item, category) => ({
  value: item.name || item.label || item.id,
  label: [item.name || item.label || item.id, category, masterLocationValues(item)[0]].filter(Boolean).join(' · '),
});
const isTransferService = (service = {}) => ['transfer', 'transfers'].includes(String(service.type || service.serviceType || service.category || '').trim().toLowerCase());
const voucherActivityType = (value) => String(value || '').trim() === 'Standard Activity' ? 'Ticket Only' : String(value || '').trim();
const hotelNameForTransfer = (service = {}, hotels = []) => {
  const serviceDate = day(service.date || service.serviceDate);
  const name = service.name || service.variantName || '';
  const targetCity = hotels.map((hotel) => hotel?.itineraryDestination || hotel?.city || hotel?.destination || '').find((city) => city && new RegExp(`\\b${escapeRegex(city)}\\s+Hotel\\b`, 'i').test(name));
  const candidates = hotels.filter((hotel) => !targetCity || String(hotel?.itineraryDestination || hotel?.city || hotel?.destination || '').trim().toLowerCase() === String(targetCity).trim().toLowerCase());
  const matchingHotel = candidates.find((hotel) => day(hotel.checkIn) === serviceDate)
    || candidates.find((hotel) => serviceDate && day(hotel.checkIn) <= serviceDate && serviceDate < day(hotel.checkOut))
    || candidates.find((hotel) => day(hotel.checkOut) === serviceDate)
    || candidates[0]
    || hotels[0];
  return matchingHotel?.name || matchingHotel?.hotel || matchingHotel?.hotelName || matchingHotel?.selectedHotelName || '';
};
const transferNameWithHotel = (service, hotels = []) => {
  const name = service.name || service.variantName || 'Transfer';
  const city = hotels.map((hotel) => hotel?.itineraryDestination || hotel?.city || hotel?.destination || '').find((value) => value && new RegExp(`\\b${escapeRegex(value)}\\s+Hotel\\b`, 'i').test(name));
  const hotelName = hotelNameForTransfer(service, hotels);
  return hotelName && city ? name.replace(new RegExp(`\\b${escapeRegex(city)}\\s+Hotel\\b`, 'ig'), hotelName) : name;
};
const vehicleName = (service, vehicles = []) => {
  const selectedFleet = voucherVehicleLabel(service);
  if (selectedFleet) return selectedFleet;
  const selected = service.vehicleName || service.vehicle?.name || service.transportVehicleName || service.transferVehicleName || '';
  const vehicleId = typeof service.vehicle === 'object' ? service.vehicle.id || service.vehicle._id : service.vehicle || service.vehicleId || service.transportVehicle || service.transferVehicle;
  return selected || vehicles.find((vehicle) => String(vehicle.id || vehicle._id) === String(vehicleId))?.name || vehicleId || '—';
};
const transferVehicleQuantity = (service = {}) => Math.max(1, Number(service.quantity ?? service.vehicleQuantity ?? 1) || 1);
const transferVoucherDate = (service = {}, booking = {}) => {
  const originalDate = service.date || service.serviceDate || '';
  if (service.type !== 'Transfer') return originalDate;
  const routeText = [service.name, service.variantName, service.pickupFrom, service.pickupPoint, service.origin, service.fromSector, service.dropAt, service.dropPoint, service.dropOff, service.dropTo, service.destination, service.toSector].filter(Boolean).join(' ').toLowerCase();
  const fromAirport = /^(.*?)(airport|dmk|suvarnabhumi|phuket airport|krabi airport|samui airport)/.test(String(service.pickupFrom || service.pickupPoint || service.origin || service.fromSector || service.name || '').toLowerCase()) || /airport\s*(to|→)/.test(routeText);
  const toAirport = /(airport|dmk|suvarnabhumi|phuket airport|krabi airport|samui airport)\s*$/.test(String(service.dropAt || service.dropPoint || service.dropOff || service.dropTo || service.destination || service.toSector || service.name || '').toLowerCase()) || /(to|→)\s*airport/.test(routeText);
  if (fromAirport && !toAirport && booking.arrivalDate) return booking.arrivalDate;
  if (toAirport && !fromAirport && booking.departureDate) return booking.departureDate;
  return originalDate;
};
// A blank remark entered in the voucher is intentional. Only use older note
// fields if this voucher row never had its own remarks value; otherwise a
// deleted note is recreated when the wizard is opened again.
const voucherRemarks = (service = {}) => (
  Object.prototype.hasOwnProperty.call(service, 'remarks')
    ? service.remarks
    : service.notes || service.plannerNote || ''
);
const normalizeVoucherService = (service = {}, { preserveVoucherRemarks = false, booking = {} } = {}) => {
  // New voucher transfers are aligned to the booking arrival/departure only
  // when their route makes that intent unambiguous. Saved voucher rows are
  // deliberately left untouched so a consultant's manual schedule wins.
  const date = preserveVoucherRemarks ? service.date || service.serviceDate || '' : transferVoucherDate(service, booking);
  return {
  ...service,
  // Sightseeing without a transport option is a ticket-only activity. A
  // selected option always wins over an older generic Private/SIC value.
  basis: service.type === 'Sightseeing'
    ? (voucherActivityType(service.transferOptionType) || (service.transferOptionId ? voucherActivityType(service.basis) : 'Ticket Only'))
    : service.basis,
  date,
  serviceDate: service.type === 'Transfer' && !preserveVoucherRemarks ? date : service.serviceDate,
  pickupFrom: service.pickupFrom || service.pickupPoint || service.origin || service.fromSector || '',
  fromTime: service.fromTime || service.pickupTime || service.time || service.departure || '',
  toTime: service.toTime || service.serviceStartTime || '',
  dropAt: service.dropAt || service.dropPoint || service.dropOff || service.dropTo || service.destination || service.toSector || '',
  dropUpTime: service.dropUpTime || service.dropTime || service.arrival || '',
  // A new voucher starts with a blank note field. Existing saved voucher rows
  // keep only the note entered in the voucher form itself.
  remarks: preserveVoucherRemarks ? voucherRemarks(service) : '',
  flightNo: service.flightNo || service.airlineFlight || service.airline || '',
  arrivalDate: service.arrivalDate || date || service.serviceDate || '',
  arrivalTime: service.arrivalTime || service.arrival || '',
  transferKind: service.transferKind || service.transfer || (service.type === 'Transfer' ? 'Inter Hotel' : ''),
};
};

function quotationServices(quotation = {}) {
  return (quotation.days || []).flatMap((entry) => (entry.services || []).map((service, index) => ({
    ...service,
    id: service.id || `quotation-service-${entry.day || 0}-${index}`,
    serviceDate: entry.date || service.serviceDate || service.date || '',
    itineraryDestination: entry.destination || service.itineraryDestination || service.destination || '',
  })));
}
const itineraryText = (value) => String(value || '').trim();
const itineraryRowHasContent = (row = {}) => Boolean(
  itineraryText(row.title || row.name || row.dayTitle)
  || itineraryText(row.description || row.details || row.notes)
);
const itinerarySourceRows = (booking = {}, quotation = {}, bookingServices = []) => {
  const quotationDays = Array.isArray(quotation?.days) ? quotation.days : [];
  const bookingDays = Array.isArray(booking?.itinerary) ? booking.itinerary : [];
  const suppliedDays = quotationDays.length ? quotationDays : bookingDays.filter(itineraryRowHasContent);
  if (suppliedDays.length) return suppliedDays.map((entry, index) => ({
    id: entry.id || `source-day-${entry.day || index + 1}`,
    day: entry.day || index + 1,
    date: entry.date || '',
    title: entry.title || entry.name || entry.dayTitle || `Day ${entry.day || index + 1}`,
    description: entry.description || entry.details || entry.notes || '',
  }));

  const servicesByDate = bookingServices.reduce((all, service) => {
    const date = day(service.serviceDate || service.date) || booking.arrivalDate || '';
    if (date) (all[date] ||= []).push(service.name || service.variantName || service.type || 'Service');
    return all;
  }, {});
  return Object.entries(servicesByDate).sort(([left], [right]) => left.localeCompare(right)).map(([date, titles], index) => ({
    id: `source-day-${index + 1}`,
    day: index + 1,
    date,
    title: titles.join(' • ') || `Day ${index + 1}`,
    description: '',
  }));
};
const mergeVoucherItinerary = (sourceRows = [], savedRows = []) => {
  const usedSaved = new Set();
  const findSaved = (source, index) => {
    const matchIndex = savedRows.findIndex((saved, savedIndex) => !usedSaved.has(savedIndex) && (
      day(saved.date) && day(saved.date) === day(source.date)
      || (!day(saved.date) && Number(saved.day) === Number(source.day || index + 1))
    ));
    if (matchIndex >= 0) usedSaved.add(matchIndex);
    return matchIndex >= 0 ? savedRows[matchIndex] : {};
  };
  return sortVoucherRows([
    ...sourceRows.map((source, index) => {
      const saved = findSaved(source, index);
      return {
        ...source,
        ...saved,
        id: saved.id || source.id || makeId('day'),
        day: saved.day || source.day || index + 1,
        date: saved.date || source.date || '',
        title: itineraryText(saved.title) || source.title || `Day ${source.day || index + 1}`,
        description: itineraryText(saved.description) || source.description || '',
      };
    }),
    // Keep a consultant-added extra day only when it contains actual content.
    ...savedRows.filter((saved, index) => !usedSaved.has(index) && itineraryRowHasContent(saved)),
  ]);
};

// Some older bookings contain an empty `vouchers.combined` shell alongside
// the real, saved combined voucher in the legacy `voucher` field. Prefer a
// source that actually has entered voucher content, so that shell can never
// hide the data the user already saved.
const hasVoucherContent = (voucher = {}) => (
  ['flights', 'guests', 'hotels', 'services', 'itinerary'].some((key) => Array.isArray(voucher[key]) && voucher[key].length)
  || Boolean(voucher.termsHtml || voucher.termsTemplateId || voucher.termsTemplateName)
);
const savedVoucher = (...candidates) => candidates.find((candidate) => candidate && hasVoucherContent(candidate))
  || candidates.find((candidate) => candidate && typeof candidate === 'object')
  || {};
const flightSourceSignature = (flights = []) => (flights || []).map((flight) => [
  flight.id || '', day(flight.date || flight.serviceDate), flight.airlineFlight || flight.airline || flight.flightNo || '',
  flight.fromSector || flight.origin || '', flight.toSector || flight.destination || '', flight.departure || '', flight.arrival || '',
].join('~')).join('|');
const serviceSourceSignature = (services = []) => (services || []).map((service) => [
  service.id || '', service.type || service.serviceType || '', day(service.serviceDate || service.date),
  service.name || service.variantName || service.serviceName || '',
  service.pickupFrom || service.pickupPoint || service.origin || service.fromSector || '',
  service.dropAt || service.dropPoint || service.dropOff || service.dropTo || service.destination || service.toSector || '',
].join('~')).join('|');
const voucherSourceSignature = (booking = {}, voucherType = 'combined') => JSON.stringify({
  type: voucherType,
  current: booking.vouchers?.[voucherType] || null,
  combined: savedVoucher(booking.vouchers?.combined, booking.voucher),
  legacyCombined: booking.voucher || null,
  bookingFlights: flightSourceSignature(booking.flights),
  bookingServices: serviceSourceSignature(booking.services),
});

// The booking is the source of truth for a voucher's service list. A saved
// voucher can retain presentation/operational edits for a matching booking
// service, but it must never resurrect an old service that is no longer on
// the booking. Otherwise stale flight-generated transfers are shown beside
// the real booked transfer rows.
const voucherText = (value) => String(value || '').trim().toLowerCase();
const voucherServiceKey = (service = {}) => [
  service.type || '', day(service.serviceDate || service.date),
  service.name || service.variantName || service.serviceName || '',
  service.pickupFrom || service.pickupPoint || service.origin || service.fromSector || '',
  service.dropAt || service.dropPoint || service.destination || service.toSector || '',
].map(voucherText).join('|');
const voucherExactId = (row = {}) => voucherText(row.id);
const voucherDetailScore = (row = {}) => Object.values(row).reduce((score, value) => (
  score + (Array.isArray(value) ? value.length : Number(Boolean(value)))
), 0);
const mergeVoucherServices = (sourceServices = [], savedServices = []) => {
  const usedSaved = new Set();
  const findSaved = (service) => {
    const exactId = voucherExactId(service);
    const key = voucherServiceKey(service);
    const semanticMatches = savedServices
      .map((saved, index) => ({ saved, index }))
      .filter(({ saved, index }) => !usedSaved.has(index) && key.replaceAll('|', '') && voucherServiceKey(saved) === key)
      .sort((left, right) => voucherDetailScore(right.saved) - voucherDetailScore(left.saved));
    const index = semanticMatches[0]?.index ?? (exactId
      ? savedServices.findIndex((saved, savedIndex) => !usedSaved.has(savedIndex) && voucherExactId(saved) === exactId)
      : -1);
    if (index >= 0) usedSaved.add(index);
    return index >= 0 ? savedServices[index] : null;
  };
  return sourceServices.map((service) => keepSourceVehicleSelection(service, { ...service, ...(findSaved(service) || {}) }));
};
// Booking and quotation flights are often separate records for the same
// journey. Their database IDs may differ (and older voucher rows use flt-*),
// so a row position or database ID cannot be used to decide uniqueness.
// Use the operational flight details instead; that makes every reload and
// save idempotent and also repairs vouchers that already contain duplicates.
const voucherFlightNumber = (flight = {}) => {
  const raw = String(flight.airlineFlight || flight.airline || flight.flightNo || '').trim().toUpperCase();
  return (raw.match(/\b[A-Z]{1,3}\s*[- ]?\s*\d{1,4}\b/g)?.at(-1) || raw).replace(/[^A-Z0-9]/g, '').toLowerCase();
};
const voucherFlightRouteTimeKey = (flight = {}) => [
  normalizeVoucherDate(flight.date || flight.serviceDate) || day(flight.date || flight.serviceDate),
  flight.fromSector || flight.origin || flight.fromAirportId || '',
  flight.toSector || flight.destination || flight.toAirportId || '',
  flight.departure || flight.fromTime || '',
  flight.arrival || flight.arrivalTime || '',
].map((part) => String(part).trim().toLowerCase()).join('|');
const voucherFlightsMatch = (left = {}, right = {}) => {
  const leftDate = normalizeVoucherDate(left.date || left.serviceDate) || day(left.date || left.serviceDate);
  const rightDate = normalizeVoucherDate(right.date || right.serviceDate) || day(right.date || right.serviceDate);
  if (!leftDate || leftDate !== rightDate) return false;
  const leftNumber = voucherFlightNumber(left);
  const rightNumber = voucherFlightNumber(right);
  // If both records know the flight number, it is the safest identity. If
  // one import omitted it, use the fully matching route and times instead.
  if (leftNumber && rightNumber) return leftNumber === rightNumber;
  const leftRouteTime = voucherFlightRouteTimeKey(left);
  const rightRouteTime = voucherFlightRouteTimeKey(right);
  return leftRouteTime.replaceAll('|', '') !== '' && leftRouteTime === rightRouteTime;
};
const hasVoucherFlightValue = (value) => value !== '' && value !== null && value !== undefined;
const mergeVoucherFlightRows = (left = {}, right = {}) => {
  const primary = voucherDetailScore(right) > voucherDetailScore(left) ? right : left;
  const fallback = primary === left ? right : left;
  return Object.entries(fallback).reduce((merged, [key, value]) => (
    hasVoucherFlightValue(merged[key]) || !hasVoucherFlightValue(value) ? merged : { ...merged, [key]: value }
  ), { ...primary });
};
const dedupeVoucherFlights = (flights = []) => {
  return (Array.isArray(flights) ? flights : []).reduce((unique, flight) => {
    const existingIndex = unique.findIndex((existing) => voucherFlightsMatch(existing, flight));
    if (existingIndex < 0) return [...unique, flight];
    const next = [...unique];
    next[existingIndex] = mergeVoucherFlightRows(next[existingIndex], flight);
    return next;
  }, []);
};
const normalizeVoucherFlight = (flight = {}) => ({
  ...flight,
  date: flight.date || flight.serviceDate || '',
  airlineFlight: flight.airlineFlight || flight.airline || flight.flightNo || '',
  fromSector: flight.fromSector || flight.origin || '',
  toSector: flight.toSector || flight.destination || '',
  departure: flight.departure || flight.fromTime || '',
  arrival: flight.arrival || flight.arrivalTime || '',
  price: flight.price ?? flight.totalSellingPrice ?? '',
});
const mergeVoucherFlights = (sourceFlights = [], savedFlights = []) => {
  const uniqueSourceFlights = dedupeVoucherFlights(sourceFlights);
  const uniqueSavedFlights = dedupeVoucherFlights(savedFlights);
  const usedSaved = new Set();
  return sortVoucherFlights(dedupeVoucherFlights([
    ...uniqueSourceFlights.map((flight) => {
      const savedIndex = uniqueSavedFlights.findIndex((saved, index) => !usedSaved.has(index) && voucherFlightsMatch(flight, saved));
      if (savedIndex >= 0) usedSaved.add(savedIndex);
      return mergeVoucherFlightRows(normalizeVoucherFlight(flight), savedIndex >= 0 ? uniqueSavedFlights[savedIndex] : {});
    }),
    ...uniqueSavedFlights.filter((_, index) => !usedSaved.has(index)),
  ]));
};
const voucherHotelKey = (hotel = {}) => [
  hotel.name || hotel.hotel || hotel.hotelName || hotel.selectedHotelName || '',
  day(hotel.checkIn || hotel.checkin), day(hotel.checkOut || hotel.checkout),
  hotel.roomType || hotel.roomTypeName || '', hotel.mealPlan || hotel.meal || '',
].map(voucherText).join('|');
// Voucher rows retain editable presentation fields, while the booking is the
// source of truth for supplier confirmations recorded in Payments. This lets
// a newly saved confirmation appear in every existing voucher automatically.
const mergeVoucherHotels = (sourceHotels = [], savedHotels = []) => {
  const usedSaved = new Set();
  const findSaved = (hotel) => {
    const exactId = voucherExactId(hotel);
    const key = voucherHotelKey(hotel);
    const semanticMatches = savedHotels
      .map((saved, index) => ({ saved, index }))
      .filter(({ saved, index }) => !usedSaved.has(index) && key.replaceAll('|', '') && voucherHotelKey(saved) === key)
      .sort((left, right) => voucherDetailScore(right.saved) - voucherDetailScore(left.saved));
    const index = semanticMatches[0]?.index ?? (exactId
      ? savedHotels.findIndex((saved, savedIndex) => !usedSaved.has(savedIndex) && voucherExactId(saved) === exactId)
      : -1);
    if (index >= 0) usedSaved.add(index);
    return index >= 0 ? savedHotels[index] : null;
  };
  // Hotels are booking-controlled records: unlike editable voucher fields,
  // a saved voucher must never revive a hotel that Operations removed from
  // the booking. Keep matching saved presentation/confirmation details only.
  return sourceHotels.map((hotel) => {
      const saved = findSaved(hotel) || {};
      const bookingConfirmation = hotel.confirmationNo || hotel.confirmationNumber || hotel.confirmation || '';
      return { ...hotel, ...saved, confirmationNo: bookingConfirmation || saved.confirmationNo || saved.confirmationNumber || saved.confirmation || '' };
    });
};

function makeVoucher(booking, template, quotation, voucherType = 'combined') {
  const combinedVoucher = savedVoucher(booking.vouchers?.combined, booking.voucher);
  const existing = voucherType === 'combined'
    ? combinedVoucher
    : (booking.vouchers?.[voucherType] || {});
  // A completed combined voucher is the booking's shared travel brief. New
  // individual vouchers inherit those entered details first, then keep their
  // own saved values whenever they have already been edited separately.
  const combinedSource = voucherType === 'combined' ? {} : combinedVoucher;
  // An empty term field is a deliberate "No terms" selection.  Do not use
  // `||` here: that would revive a previous combined-voucher template after
  // Operations has explicitly removed it from this voucher type.
  const inheritedVoucherField = (field) => (
    Object.prototype.hasOwnProperty.call(existing, field)
      ? existing[field] || ''
      : combinedSource[field] || ''
  );
  const bookingServices = Array.isArray(booking.services) && booking.services.length ? booking.services : quotationServices(quotation);
  const bookingHotels = Array.isArray(booking.hotels) && booking.hotels.length ? booking.hotels : bookingServices.filter((item) => item.type === 'Hotel');
  const existingFlights = Array.isArray(existing.flights) && existing.flights.length ? existing.flights : (Array.isArray(combinedSource.flights) && combinedSource.flights.length ? combinedSource.flights : null);
  const existingGuests = Array.isArray(existing.guests) && existing.guests.length ? existing.guests : (Array.isArray(combinedSource.guests) && combinedSource.guests.length ? combinedSource.guests : null);
  const existingHotels = Array.isArray(existing.hotels) && existing.hotels.length ? existing.hotels : (Array.isArray(combinedSource.hotels) && combinedSource.hotels.length ? combinedSource.hotels : null);
  const existingServices = Array.isArray(existing.services) && existing.services.length ? existing.services : (Array.isArray(combinedSource.services) && combinedSource.services.length ? combinedSource.services : null);
  const voucherTemplate = mergeVoucherSettings(existing.template || combinedSource.template || template);
  const bookingFlights = Array.isArray(booking.flights) ? booking.flights : [];
  const quotationFlights = [
    ...(Array.isArray(quotation?.flights) ? quotation.flights : []),
    ...quotationServices(quotation).filter((service) => String(service.type || '').toLowerCase() === 'flight'),
  ];
  const fallbackFlights = [
    booking.arrivalFlight && { id: makeId('flt'), date: booking.arrivalDate, airlineFlight: booking.arrivalFlight, fromSector: '', toSector: '', arrival: booking.arrivalTime || '', price: '' },
    booking.departureFlight && { id: makeId('flt'), date: booking.departureDate, airlineFlight: booking.departureFlight, fromSector: '', toSector: '', departure: booking.departureTime || '', price: '' },
  ].filter(Boolean);
  // Flights added to a quotation after an earlier voucher save must be added
  // to that voucher too, just like services. Keep saved voucher edits for
  // matching flights, append new source flights, and retain legacy fallbacks.
  const sourceFlights = mergeVoucherFlights([...bookingFlights, ...quotationFlights], []);
  const flights = mergeVoucherFlights(sourceFlights.length ? sourceFlights : fallbackFlights, existingFlights || []);
  const sourceGuests = Array.isArray(booking.guests) && booking.guests.length ? booking.guests : quotation?.guests;
  // Booking/quotation guests are protected. Only a row explicitly created in
  // this voucher editor may be removed from the voucher.
  const guests = leaderFirst((existingGuests || sourceGuests || [{ id: makeId('gst'), name: booking.guestName || quotation?.guestName || '', phone: booking.guestPhone || quotation?.guestPhone || '', email: booking.guestEmail || quotation?.guestEmail || '', type: 'Adult', isLeader: false }]).map((guest) => ({ ...guest, addedInVoucher: Boolean(guest.addedInVoucher) })));
  const hasSavedSightseeingSelection = (existingServices || []).some((service) => service.type === 'Sightseeing' && Object.prototype.hasOwnProperty.call(service, 'selectedForVoucher'));
  const services = sortVoucherRows(mergeVoucherServices(bookingServices.filter((item) => item.type !== 'Hotel'), existingServices || []))
    .map((service) => {
      const normalized = normalizeVoucherService(service, { preserveVoucherRemarks: Boolean(existingServices), booking });
      // A sightseeing voucher starts empty by design. The consultant must
      // explicitly tick the activities that belong to this particular voucher.
      return voucherType === 'sightseeing' && normalized.type === 'Sightseeing'
        ? { ...normalized, selectedForVoucher: hasSavedSightseeingSelection ? Boolean(normalized.selectedForVoucher) : false }
        : normalized;
    });
  const sourceItinerary = itinerarySourceRows(booking, quotation, bookingServices);
  return {
    flights, guests,
    hotels: sortVoucherRows(mergeVoucherHotels(bookingHotels, existingHotels || [])).map((hotel) => ({
      ...hotel,
      category: hotel.category || hotel.hotelCategory || '',
      specialRequest: hotel.specialRequest || hotel.specialRequests || hotel.remarks || '',
      confirmationNo: hotel.confirmationNo || hotel.confirmationNumber || hotel.confirmation || '',
    })),
    services,
    itinerary: mergeVoucherItinerary(sourceItinerary, Array.isArray(existing.itinerary) ? existing.itinerary : []),
    template: voucherTemplate,
    voucherType,
    termsTemplateId: inheritedVoucherField('termsTemplateId'),
    termsTemplateName: inheritedVoucherField('termsTemplateName'),
    termsHtml: inheritedVoucherField('termsHtml'),
    hotelTermsTemplateId: inheritedVoucherField('hotelTermsTemplateId'),
    hotelTermsTemplateName: inheritedVoucherField('hotelTermsTemplateName'),
    hotelTermsHtml: inheritedVoucherField('hotelTermsHtml'),
    sightseeingTermsTemplateId: inheritedVoucherField('sightseeingTermsTemplateId'),
    sightseeingTermsTemplateName: inheritedVoucherField('sightseeingTermsTemplateName'),
    sightseeingTermsHtml: inheritedVoucherField('sightseeingTermsHtml'),
    transferTermsTemplateId: inheritedVoucherField('transferTermsTemplateId'),
    transferTermsTemplateName: inheritedVoucherField('transferTermsTemplateName'),
    transferTermsHtml: inheritedVoucherField('transferTermsHtml'),
    settings: { showPassport: voucherTemplate.showPassport, showDOB: voucherTemplate.showDOB, companySeal: true, emergency: true, mealPreference: '', voucherFor: 'Agent', showDayWiseItinerary: true, ...(combinedSource.settings || {}), ...(existing.settings || {}) },
  };
}

export default function CreateVoucher() {
  const { id } = useParams(); const navigate = useNavigate(); const [searchParams] = useSearchParams();
  const { bookings, quotations, hotels: masterHotels, updateBooking, fetchRecord } = useApp();
  const airportMasters = useOperationsMaster('airports');
  const vehicleMasters = useOperationsMaster('vehicles');
  const mealPlanMasters = useSalesMaster('meal-plans');
  useEffect(() => { fetchRecord('bookings', id).catch(() => {}); }, [id, fetchRecord]);
  const booking = bookings.find((item) => item.id === id);
  useEffect(() => { if (booking?.quotationId) fetchRecord('quotations', booking.quotationId).catch(() => {}); }, [booking?.quotationId, fetchRecord]);
  const linkedQuotation = quotations.find((item) => item.id === booking?.quotationId);
  const [sightseeingMasters, setSightseeingMasters] = useState([]);
  const selectedLocations = useMemo(() => new Set([
    ...locationValues(booking?.destination),
    ...locationValues(booking?.destinations),
    ...locationValues(linkedQuotation?.destination),
    ...(linkedQuotation?.days || []).flatMap((entry) => locationValues(entry.destination)),
  ].map(locationKey).filter(Boolean)), [booking?.destination, booking?.destinations, linkedQuotation]);
  const placeOptions = useMemo(() => {
    const scopedHotels = masterHotels.filter((hotel) => isInSelectedLocations(hotel, selectedLocations)).map((hotel) => placeOption(hotel, 'Hotel'));
    const scopedAirports = airportMasters.filter((airport) => isInSelectedLocations(airport, selectedLocations)).map((airport) => placeOption(airport, 'Airport'));
    const scopedSightseeing = sightseeingMasters
      .filter((activity) => activity.status !== 'Inactive' && isInSelectedLocations(activity, selectedLocations))
      .map((activity) => placeOption(activity, 'Sightseeing'));
    return [...new Map([...scopedHotels, ...scopedAirports, ...scopedSightseeing]
      .filter((option) => option.value)
      .map((option) => [String(option.value).toLowerCase(), option])).values()];
  }, [airportMasters, masterHotels, selectedLocations, sightseeingMasters]);
  const [active, setActive] = useState(1); const [voucher, setVoucher] = useState(null); const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState(mergeVoucherSettings());
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [termsTemplates, setTermsTemplates] = useState([]);
  const [selectedTermTemplateIds, setSelectedTermTemplateIds] = useState({});
  const [voucherType, setVoucherType] = useState(() => VOUCHER_TYPES[searchParams.get('type')] ? searchParams.get('type') : 'combined');
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingItinerary, setGeneratingItinerary] = useState(false);
  const initializedSourceSignature = useRef('');
  useEffect(() => {
    let activeRequest = true;
    apiClient.get('/sightseeing-module').then((response) => {
      if (activeRequest) setSightseeingMasters(response.data || []);
    }).catch(() => {
      if (activeRequest) setSightseeingMasters([]);
    });
    return () => { activeRequest = false; };
  }, []);
  useEffect(() => {
    if (!sightseeingMasters.length) return;
    const transferTypes = new Map();
    const activityTypes = new Map();
    const timingDefaults = new Map();
    sightseeingMasters.forEach((master) => {
      activityTypes.set(String(master.id), voucherActivityType(master.activityType));
      (master.variants || []).forEach((variant) => {
        timingDefaults.set(`${master.id}:${variant.id}`, {
          fromTime: variant.defaultFromTime || '',
          toTime: variant.defaultToTime || '',
          dropUpTime: variant.defaultDropTime || '',
        });
      });
      (master.transfers || []).forEach((option) => transferTypes.set(String(option.id), option.type || ''));
    });
    setVoucher((current) => {
      if (!current) return current;
      let changed = false;
      const services = current.services.map((service) => {
        if (service.type !== 'Sightseeing') return service;
        const resolvedType = voucherActivityType(transferTypes.get(String(service.transferOptionId || '')))
          || activityTypes.get(String(service.masterId || ''))
          || (!service.transferOptionId ? 'Ticket Only' : '');
        const defaults = timingDefaults.get(`${service.masterId || ''}:${service.variantId || ''}`) || {};
        const timingUpdate = {
          fromTime: service.fromTime || defaults.fromTime || '',
          toTime: service.toTime || defaults.toTime || '',
          dropUpTime: service.dropUpTime || defaults.dropUpTime || '',
        };
        const typeNeedsUpdate = resolvedType && (service.basis !== resolvedType || service.transferOptionType !== resolvedType);
        const timingNeedsUpdate = timingUpdate.fromTime !== (service.fromTime || '')
          || timingUpdate.toTime !== (service.toTime || '')
          || timingUpdate.dropUpTime !== (service.dropUpTime || '');
        if (!typeNeedsUpdate && !timingNeedsUpdate) return service;
        changed = true;
        return { ...service, ...(typeNeedsUpdate ? { basis: resolvedType, transferOptionType: resolvedType } : {}), ...(timingNeedsUpdate ? timingUpdate : {}) };
      });
      return changed ? { ...current, services } : current;
    });
  }, [sightseeingMasters]);
  useEffect(() => {
    const mealPlans = activeMealPlanNames(mealPlanMasters);
    if (!mealPlans.length) return;
    setVoucher((current) => {
      if (!current?.hotels?.length) return current;
      let changed = false;
      const hotels = current.hotels.map((hotel) => {
        const mealPlan = currentMealPlanName(hotel.mealPlan, mealPlans);
        if (!mealPlan || mealPlan === hotel.mealPlan) return hotel;
        changed = true;
        return { ...hotel, mealPlan };
      });
      return changed ? { ...current, hotels } : current;
    });
  }, [mealPlanMasters, voucher?.hotels]);
  useEffect(() => {
    let activeRequest = true;
    apiClient.get('/pdf-templates?documentType=voucher&sortBy=updatedAt&sortDir=desc&limit=100&summary=false').then((response) => {
      if (!activeRequest) return;
      const savedTemplates = response.data || [];
      const savedTemplateId = booking?.vouchers?.[voucherType]?.template?.templateId || (voucherType === 'combined' ? booking?.voucher?.template?.templateId : '');
      const selected = savedTemplates.find((item) => item.id === savedTemplateId) || savedTemplates.find((item) => item.isDefault) || savedTemplates[0];
      setTemplates(savedTemplates);
      if (selected) { setSelectedTemplateId(selected.id); setTemplate(mergeVoucherSettings(selected.config)); }
    }).catch((error) => toast.error(error.message || 'Unable to load voucher templates.'))
      .finally(() => { if (activeRequest) setTemplatesLoaded(true); });
    return () => { activeRequest = false; };
  }, [booking?.voucher?.template?.templateId, booking?.vouchers, voucherType]);
  useEffect(() => {
    let activeRequest = true;
    apiClient.get('/terms-conditions').then((response) => {
      if (!activeRequest) return;
      const available = (response.data || []).filter((item) => item.status === 'Active' && VOUCHER_TERM_TYPES.some((type) => type.section === item.section) && (!item.documentTypes?.length || item.documentTypes.includes('Voucher')));
      setTermsTemplates(available);
      const savedVoucher = booking?.vouchers?.[voucherType] || (voucherType === 'combined' ? booking?.voucher : {}) || {};
      setSelectedTermTemplateIds(Object.fromEntries(VOUCHER_TERM_TYPES.map((type) => {
        const choices = available.filter((item) => item.section === type.section);
        // Once a term field has been saved, including a deliberately blank
        // one, it is the source of truth. Defaults are only for legacy/new
        // vouchers that have never stored a choice for this term type.
        const hasSavedChoice = Object.prototype.hasOwnProperty.call(savedVoucher, type.templateId)
          || Object.prototype.hasOwnProperty.call(savedVoucher, type.html);
        const selected = hasSavedChoice
          ? choices.find((item) => item.id === savedVoucher[type.templateId])
          : choices.find((item) => item.isDefault) || choices[0];
        return [type.key, selected?.id || ''];
      })));
    }).catch((error) => toast.error(error.message || 'Unable to load voucher terms.'));
    return () => { activeRequest = false; };
  }, [booking?.voucher?.termsTemplateId, booking?.vouchers, voucherType]);
  // Initialise the editable voucher once per booking. Changing a template
  // must not discard flight/guest edits already made in this wizard.
  useEffect(() => {
    if (!booking || !templatesLoaded) return;
    // Include the saved voucher itself, not only the booking row counts. This
    // makes an individual voucher refresh from the latest combined voucher
    // after it was saved, including when a booking is reloaded in place.
    const quotationFlightSignature = flightSourceSignature([
      ...(Array.isArray(linkedQuotation?.flights) ? linkedQuotation.flights : []),
      ...quotationServices(linkedQuotation).filter((service) => String(service.type || '').toLowerCase() === 'flight'),
    ]);
    const signature = [booking.id, booking.quotationId, booking.services?.length || 0, booking.hotels?.length || 0, booking.guests?.length || 0, linkedQuotation?.days?.length || 0, quotationFlightSignature, voucherSourceSignature(booking, voucherType)].join(':');
    if (initializedSourceSignature.current === signature) return;
    initializedSourceSignature.current = signature;
    setVoucher(makeVoucher(booking, template, linkedQuotation, voucherType));
  }, [booking, linkedQuotation, template, templatesLoaded, voucherType]);
  if (!booking || !voucher) return <div className="p-10 text-center text-slate-500">Booking not found.</div>;
  const mutate = (section, id, key, value) => setVoucher((v) => ({ ...v, [section]: v[section].map((row) => row.id === id ? { ...row, [key]: value } : row) }));
  const remove = (section, id) => setVoucher((v) => ({ ...v, [section]: v[section].filter((row) => row.id !== id) }));
  const reorderRows = (rows, sourceId, targetId) => {
    const sourceIndex = rows.findIndex((row) => String(row.id) === String(sourceId));
    const targetIndex = rows.findIndex((row) => String(row.id) === String(targetId));
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return rows;
    const next = [...rows];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    return next;
  };
  const withVoucherOrder = (rows) => rows.map((row, index) => ({ ...row, voucherOrder: index + 1 }));
  const reorderSection = (section, sourceId, targetId) => setVoucher((current) => ({
    ...current,
    [section]: withVoucherOrder(reorderRows(current[section] || [], sourceId, targetId)),
  }));
  const reorderServices = (sourceId, targetId) => setVoucher((current) => ({
    ...current,
    services: withVoucherOrder(reorderRows(current.services || [], sourceId, targetId)),
  }));
  const reorderItinerary = (sourceId, targetId) => setVoucher((current) => ({
    ...current,
    itinerary: withVoucherOrder(reorderRows(current.itinerary || [], sourceId, targetId))
      .map((row, index) => ({ ...row, day: index + 1 })),
  }));
  // This removes a passenger only from this voucher. The original booking
  // guest list remains unchanged, and the next passenger becomes leader if
  // the current leader is removed.
  const removeVoucherGuest = (guestId) => {
    if (voucher.guests.length <= 1) {
      toast.error('A voucher must include at least one guest.');
      return;
    }
    setVoucher((current) => {
      const removed = current.guests.find((guest) => guest.id === guestId);
      const guests = current.guests.filter((guest) => guest.id !== guestId);
      if (removed?.isLeader && guests.length) guests[0] = { ...guests[0], isLeader: true };
      return { ...current, guests: leaderFirst(guests) };
    });
  };
  const persist = async (preview = false) => {
    if (voucherType === 'sightseeing' && !voucher.services.some((service) => service.type === 'Sightseeing' && service.selectedForVoucher && !service.hiddenInVoucher)) {
      toast.error('Select at least one sightseeing activity for this voucher.');
      return;
    }
    setSaving(true);
    try {
      const selectedTemplate = templates.find((item) => item.id === selectedTemplateId);
      const voucherTerms = VOUCHER_TERM_TYPES.reduce((all, type) => {
        const selectedId = selectedTermTemplateIds[type.key];
        const selected = termsTemplates.find((item) => item.id === selectedId && item.section === type.section);
        all[type.templateId] = selected ? selected.id : (selectedId === '' ? '' : voucher[type.templateId] || '');
        all[type.templateName] = selected ? selected.name : (selectedId === '' ? '' : voucher[type.templateName] || '');
        all[type.html] = selected ? selected.content : (selectedId === '' ? '' : voucher[type.html] || '');
        return all;
      }, {});
      const next = {
        ...voucher,
        flights: sortVoucherFlights(dedupeVoucherFlights(voucher.flights)),
        voucherType,
        template: { ...mergeVoucherSettings(voucher.template || template), templateId: selectedTemplate?.id || '', templateName: selectedTemplate?.name || voucher.template?.templateName || template.templateName },
        ...voucherTerms,
        generatedAt: new Date().toISOString(),
      };
      const vouchers = { ...(booking.vouchers || {}), [voucherType]: next };
      // Confirmation entered on a voucher is operational booking data too.
      // Mirror it to the source line so payments and every later voucher use it.
      const syncConfirmation = (item, rows) => {
        const row = (rows || []).find((candidate) => String(candidate.id || '') === String(item.id || ''));
        return row?.confirmationNo ? { ...item, confirmationNo: row.confirmationNo } : item;
      };
      await updateBooking(id, {
        ...booking,
        flights: next.flights,
        guests: next.guests,
        hotels: (booking.hotels || []).map((hotel) => syncConfirmation(hotel, next.hotels)),
        services: (booking.services || []).map((service) => syncConfirmation(service, next.services)),
        vouchers,
        voucher: voucherType === 'combined' ? next : booking.voucher,
        activityLog: [{ date: new Date().toISOString(), action: `${VOUCHER_TYPES[voucherType].label} details saved`, user: 'Admin' }, ...(booking.activityLog || [])],
      });
      toast.success(`${VOUCHER_TYPES[voucherType].label} details saved.`); if (preview) navigate(`/bookings/${id}/voucher?type=${voucherType}`);
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  };
  const chooseVoucherType = (nextType) => {
    setVoucherType(nextType);
    setActive(1);
    initializedSourceSignature.current = '';
  };
  const chooseTemplate = (templateId) => {
    const selected = templates.find((item) => item.id === templateId);
    if (!selected) return;
    setSelectedTemplateId(templateId);
    setTemplate(mergeVoucherSettings(selected.config));
  };
  const generateAiItinerary = async () => {
    if (!aiPrompt.trim()) return toast.error('Describe the itinerary you want to generate.');
    setGeneratingItinerary(true);
    try {
      const response = await apiClient.post('/ai/itinerary', {
        prompt: aiPrompt,
        booking: {
          arrivalDate: booking.arrivalDate,
          departureDate: booking.departureDate,
          destination: booking.destination || booking.destinations,
          adults: booking.adults,
          children: booking.children,
        },
      });
      const days = (response.data?.days || []).map((entry, index) => ({ id: makeId('day'), day: index + 1, date: entry.date || '', title: entry.title || `Day ${index + 1}`, description: entry.description || '' }));
      if (!days.length) return toast.error('The selected AI did not return itinerary days.');
      setVoucher((current) => ({ ...current, itinerary: days }));
      toast.success(`Generated ${days.length} itinerary days with ${response.data.provider === 'gemini' ? 'Gemini' : 'OpenAI'}.`);
    } catch (error) { toast.error(error.message); }
    finally { setGeneratingItinerary(false); }
  };
  const transfers = voucher.services.filter(isTransferService);
  const activities = voucher.services.filter((s) => {
    const isActivity = ['Sightseeing', 'Restaurant', 'Meal', 'Yacht', 'Ferry', 'Guide', 'Other'].includes(s.type);
    return isActivity && (voucherType === 'sightseeing' ? s.type === 'Sightseeing' : voucherType === 'other' ? s.type !== 'Sightseeing' : true);
  });
  const airportOptions = airportMasters.map((airport) => ({ value: airport.id, label: `${airport.iataCode ? `${airport.iataCode} · ` : ''}${airport.name}${airport.city ? ` · ${airport.city}` : ''}` }));
  const chooseAirport = (rowId, field, airportId) => {
    const airport = airportMasters.find((item) => item.id === airportId);
    const label = airport ? `${airport.iataCode ? `${airport.iataCode} · ` : ''}${airport.name}${airport.city ? ` · ${airport.city}` : ''}` : '';
    mutate('flights', rowId, field === 'from' ? 'fromAirportId' : 'toAirportId', airportId);
    mutate('flights', rowId, field === 'from' ? 'fromSector' : 'toSector', label);
  };
  const steps = VOUCHER_TYPES[voucherType].steps;
  const activeLabel = steps[active - 1]?.[0];
  return <div className="flex flex-col h-full overflow-hidden">
    <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex-shrink-0"><div className="flex items-center justify-between flex-wrap gap-2"><div className="flex items-center gap-2"><button onClick={() => navigate(`/bookings/${id}`)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button><div><div className="flex gap-2 items-center"><Globe className="w-4 h-4 text-blue-600" /><h1 className="text-base font-bold text-slate-900">Create {VOUCHER_TYPES[voucherType].label}</h1></div><div className="text-[11px] text-slate-400 mt-0.5">Bookings <ChevronRight className="inline w-3 h-3" /> <span className="text-blue-600">{booking.id}</span> <ChevronRight className="inline w-3 h-3" /> Create Voucher</div></div></div><div className="flex items-center gap-2"><select value={voucherType} onChange={(event) => chooseVoucherType(event.target.value)} className="form-select h-8 max-w-44 text-xs" aria-label="Voucher type">{Object.entries(VOUCHER_TYPES).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select><select value={selectedTemplateId} onChange={(event) => chooseTemplate(event.target.value)} className="form-select h-8 max-w-56 text-xs" aria-label="Voucher template"><option value="">Choose template</option>{templates.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isDefault ? ' (Default)' : ''}</option>)}</select><button disabled={saving} onClick={() => persist()} className="btn-secondary h-8 px-3 text-xs whitespace-nowrap"><Save className="w-3.5 h-3.5" /> Save</button><button disabled={saving} onClick={() => persist(true)} className="btn-primary h-8 px-3 text-xs whitespace-nowrap"><Eye className="w-3.5 h-3.5" /> View Voucher</button></div></div><div className="flex items-center mt-3 overflow-x-auto">{steps.map(([label, Icon], index) => <React.Fragment key={label}><button onClick={() => setActive(index + 1)} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${active === index + 1 ? 'text-blue-700 bg-blue-50 border border-blue-200' : index < active ? 'text-green-700' : 'text-slate-400'}`}><span className={`w-5 h-5 rounded-full flex items-center justify-center ${active === index + 1 ? 'bg-blue-600 text-white' : index < active ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{index < active ? <CheckCircle className="w-3 h-3" /> : <Icon className="w-3 h-3" />}</span>{label}</button>{index < steps.length - 1 && <div className="flex-1 min-w-3 h-px bg-slate-200 mx-1" />}</React.Fragment>)}</div></header>
    <main className="flex-1 overflow-y-auto p-4 bg-slate-50/50"><div className="card p-4 w-full max-w-[1800px] mx-auto"><div className="flex justify-between gap-3 mb-4"><div><h2 className="text-sm font-extrabold text-slate-800">{activeLabel}</h2><p className="text-[11px] text-slate-400">Saved information is attached only to booking {booking.id}.</p></div><span className="text-[10px] bg-blue-50 text-blue-600 rounded px-2 py-1 h-fit">{booking.guestName}</span></div>
      {['Flights', 'Hotels', 'Transfers', 'Activities'].includes(activeLabel) && <p className="-mt-1 mb-3 text-[11px] text-slate-500">Drag the <b>six-dot handle</b> to set the voucher/PDF sequence. Use the <b>PDF</b> control to hide a row; it remains editable here and is saved when you select <b>Save</b> or <b>View Voucher</b>.</p>}
      {activeLabel === 'Flights' && <FlightTable rows={voucher.flights} airportOptions={airportOptions} chooseAirport={chooseAirport} mutate={(...args) => mutate('flights', ...args)} reorder={(sourceId, targetId) => reorderSection('flights', sourceId, targetId)} remove={(row) => remove('flights', row)} add={() => setVoucher((v) => ({ ...v, flights: [...v.flights, { id: makeId('flt'), date: booking.arrivalDate || '', airlineFlight: '', fromAirportId: '', toAirportId: '', fromSector: '', toSector: '', departure: '', arrival: '', price: '' }] }))} />}
      {activeLabel === 'Guests' && <GuestTable rows={voucher.guests} mutate={(...args) => mutate('guests', ...args)} setLeader={(guestId) => setVoucher((current) => ({ ...current, guests: leaderFirst(current.guests.map((guest) => ({ ...guest, isLeader: guest.id === guestId }))) }))} remove={removeVoucherGuest} add={() => setVoucher((v) => ({ ...v, guests: [...v.guests, { id: makeId('gst'), name: '', type: 'Adult', gender: '', passport: '', dob: '', nationality: '', isLeader: false, addedInVoucher: true }] }))} />}
      {activeLabel === 'Hotels' && <HotelTable rows={voucher.hotels} masters={masterHotels} mealPlanMasters={mealPlanMasters} mutate={(...args) => mutate('hotels', ...args)} reorder={(sourceId, targetId) => reorderSection('hotels', sourceId, targetId)} />}
      {activeLabel === 'Transfers' && <TransferTable rows={transfers} hotels={voucher.hotels} vehicles={vehicleMasters} placeOptions={placeOptions} mutate={(...args) => mutate('services', ...args)} reorder={reorderServices} empty="No transfers are attached to this booking." />}
      {activeLabel === 'Activities' && <ActivityTable rows={activities} placeOptions={placeOptions} mutate={(...args) => mutate('services', ...args)} reorder={reorderServices} selectable={voucherType === 'sightseeing'} empty={voucherType === 'other' ? 'No meal, yacht, ferry, guide, restaurant, or other service is attached to this booking.' : 'No sightseeing service is attached to this booking.'} />}
      {activeLabel === 'Itinerary' && <Itinerary rows={voucher.itinerary} mutate={(...args) => mutate('itinerary', ...args)} reorder={reorderItinerary} remove={(row) => remove('itinerary', row)} add={() => setVoucher((v) => ({ ...v, itinerary: [...v.itinerary, { id: makeId('day'), day: v.itinerary.length + 1, date: '', title: '' }] }))} aiPrompt={aiPrompt} setAiPrompt={setAiPrompt} generateAiItinerary={generateAiItinerary} generatingItinerary={generatingItinerary} />}
      {activeLabel === 'Settings' && <SettingsPanel
        settings={voucher.settings}
        change={(key, value) => setVoucher((current) => ({ ...current, settings: { ...current.settings, [key]: value } }))}
        termsTemplates={termsTemplates}
        selectedTermTemplateIds={selectedTermTemplateIds}
        voucherType={voucherType}
        selectTerms={(termKey, templateId) => setSelectedTermTemplateIds((current) => ({ ...current, [termKey]: templateId }))}
      />}
      {activeLabel === 'Review' && <Review booking={booking} voucher={voucher} preview={() => persist(true)} />}
    </div><div className="w-full max-w-[1800px] mx-auto mt-4 flex justify-between"><button onClick={() => setActive(Math.max(1, active - 1))} disabled={active === 1} className="btn-secondary h-8 px-4 text-xs disabled:opacity-40">Previous</button><span className="text-xs text-slate-400">Step {active} of {steps.length}</span>{active < steps.length ? <button onClick={() => setActive(active + 1)} className="btn-primary h-8 px-4 text-xs">Next <ChevronRight className="inline w-3.5 h-3.5" /></button> : <button onClick={() => persist(true)} className="bg-green-600 text-white h-8 px-4 rounded-lg text-xs"><Download className="inline w-3.5 h-3.5 mr-1" />Generate voucher</button>}</div></main>
  </div>;
}

function Delete({ run }) { return <button type="button" onClick={run} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>; }
function VoucherDateInput({ value, onChange, className = '' }) {
  const [draft, setDraft] = useState(value ? formatDate(value, '') : '');
  useEffect(() => setDraft(value ? formatDate(value, '') : ''), [value]);
  const currentYear = new Date().getFullYear();
  const selectedYear = normalizeVoucherDate(value).slice(0, 4);
  const commit = (raw) => {
    const normalized = normalizeVoucherDate(raw);
    if (!raw.trim()) onChange({ target: { value: '' } });
    else if (normalized) onChange({ target: { value: normalized } });
    else setDraft(value ? formatDate(value, '') : '');
  };
  const chooseYear = (year) => {
    if (!year) return;
    const current = normalizeVoucherDate(value) || normalizeVoucherDate(draft);
    const base = current ? new Date(`${current}T00:00:00Z`) : new Date(Date.UTC(currentYear, 0, 1));
    base.setUTCFullYear(Number(year));
    const next = base.toISOString().slice(0, 10);
    setDraft(formatDate(next, ''));
    onChange({ target: { value: next } });
  };
  return <div className={`flex min-w-[208px] gap-1 ${className}`} title="Enter DD-MM-YYYY, choose a year, or choose from calendar">
    <label className="relative block min-w-0 flex-1">
      <input value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={(event) => commit(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.currentTarget.blur(); } }} placeholder="DD-MM-YYYY" inputMode="numeric" maxLength={10} className="form-input h-8 w-full pr-8 text-xs uppercase" aria-label="Date of birth in DD-MM-YYYY" />
      <Calendar className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-slate-400" />
      <input type="date" value={normalizeVoucherDate(value)} onChange={(event) => { setDraft(event.target.value ? formatDate(event.target.value, '') : ''); onChange(event); }} className="absolute inset-y-0 right-0 h-full w-8 cursor-pointer opacity-0" aria-label="Choose date from calendar" />
    </label>
    <select value={selectedYear} onChange={(event) => chooseYear(event.target.value)} className="form-select h-8 w-[76px] px-1 text-xs" aria-label="Choose year">
      <option value="">Year</option>{Array.from({ length: 121 }, (_, index) => currentYear - index).map((year) => <option key={year} value={year}>{year}</option>)}
    </select>
  </div>;
}
function PdfVisibilityToggle({ hidden, onChange, label }) {
  return <button type="button" onClick={() => onChange(!hidden)} aria-pressed={!hidden} title={hidden ? `Show ${label} in the voucher PDF` : `Hide ${label} from the voucher PDF`} className={`inline-flex min-w-[86px] items-center justify-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold transition ${hidden ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
    {hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}{hidden ? 'Show in PDF' : 'Hide from PDF'}
  </button>;
}
function useVoucherRowDrag(reorder) {
  const [dragState, setDragState] = useState({ sourceId: '', overId: '' });
  const cleanupRef = useRef(() => {});

  useEffect(() => () => cleanupRef.current(), []);

  const start = (rowId) => (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const sourceId = String(rowId);
    const originalUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    setDragState({ sourceId, overId: sourceId });

    const move = (pointerEvent) => {
      const target = document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)?.closest?.('[data-voucher-row-id]');
      const overId = target?.getAttribute('data-voucher-row-id') || sourceId;
      setDragState((current) => current.overId === overId ? current : { sourceId, overId });
    };
    const finish = (pointerEvent) => {
      const target = document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)?.closest?.('[data-voucher-row-id]');
      const targetId = target?.getAttribute('data-voucher-row-id');
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', cancel);
      document.body.style.userSelect = originalUserSelect;
      cleanupRef.current = () => {};
      setDragState({ sourceId: '', overId: '' });
      if (targetId && targetId !== sourceId) reorder(sourceId, targetId);
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
    handleProps: (rowId) => ({ onPointerDown: start(rowId) }),
    rowProps: (rowId) => ({ 'data-voucher-row-id': String(rowId) }),
    rowClass: (rowId) => dragState.sourceId === String(rowId)
      ? 'scale-[0.99] opacity-45 shadow-sm transition-all duration-150'
      : dragState.overId === String(rowId) && dragState.sourceId
        ? 'ring-2 ring-inset ring-blue-400 bg-blue-50/70 transition-all duration-150'
        : 'transition-all duration-150',
  };
}
function DragHandle({ label = 'row', dragProps }) {
  return <button
    type="button"
    {...dragProps}
    title={`Drag to change ${label} sequence`}
    aria-label={`Drag to change ${label} sequence`}
    className="cursor-grab touch-none rounded p-1 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 active:cursor-grabbing"
  ><GripVertical className="h-4 w-4" /></button>;
}
function FlightTable({ rows, airportOptions, chooseAirport, mutate, reorder, remove, add }) {
  const visibleRows = dedupeVoucherFlights(sortVoucherFlights(rows));
  const rowDrag = useVoucherRowDrag(reorder);
  return <>
    <button onClick={add} className="btn-primary h-7 text-xs px-2 mb-2 float-right"><Plus className="w-3 h-3" /> Add flight</button>
    <div className="clear-both overflow-auto">{visibleRows.length ? <table className="w-full min-w-[1070px]">
      <thead><tr>{['Order', 'Date', 'Airline / Flight No.', 'From Sector', 'To Sector', 'Departure', 'Arrival', 'Price', 'PDF', ''].map((header) => <th key={header} className="table-header">{header}</th>)}</tr></thead>
      <tbody>{visibleRows.map((row) => <tr key={row.id} {...rowDrag.rowProps(row.id)} className={`table-row ${rowDrag.rowClass(row.id)} ${row.hiddenInVoucher ? 'bg-amber-50/70 opacity-75' : ''}`}>
        <td className="table-cell w-10 text-center"><DragHandle label="flight" dragProps={rowDrag.handleProps(row.id)} /></td>
        <td className="table-cell"><DateInput value={row.date || ''} onChange={(value) => mutate(row.id, 'date', value)} className="form-input h-8 text-xs w-full" compact /></td>
        <td className="table-cell"><input value={row.airlineFlight || ''} onChange={(event) => mutate(row.id, 'airlineFlight', event.target.value)} className="form-input h-8 text-xs w-full" /></td>
        <td className="table-cell min-w-44"><SearchableSelect value={row.fromAirportId || row.fromSector || ''} onChange={(value) => chooseAirport(row.id, 'from', value)} options={airportOptions} placeholder="Select airport" /></td>
        <td className="table-cell min-w-44"><SearchableSelect value={row.toAirportId || row.toSector || ''} onChange={(value) => chooseAirport(row.id, 'to', value)} options={airportOptions} placeholder="Select airport" /></td>
        <td className="table-cell"><input type="time" value={row.departure || ''} onChange={(event) => mutate(row.id, 'departure', event.target.value)} className="form-input h-8 text-xs w-full" /></td>
        <td className="table-cell"><input type="time" value={row.arrival || ''} onChange={(event) => mutate(row.id, 'arrival', event.target.value)} className="form-input h-8 text-xs w-full" /></td>
        <td className="table-cell"><input type="number" min="0" value={row.price ?? ''} onChange={(event) => mutate(row.id, 'price', event.target.value)} className="form-input h-8 text-xs w-full" /></td>
        <td className="table-cell"><PdfVisibilityToggle hidden={Boolean(row.hiddenInVoucher)} onChange={(value) => mutate(row.id, 'hiddenInVoucher', value)} label="flight" /></td>
        <td className="table-cell"><Delete run={() => remove(row.id)} /></td>
      </tr>)}</tbody>
    </table> : noData('Flight details from the quotation will appear here automatically.')}</div>
  </>;
}
function GuestTable({ rows, mutate, setLeader, remove, add }) {
  return <>
    <button onClick={add} className="btn-primary h-7 text-xs px-2 mb-2 float-right"><Plus className="w-3 h-3" /> Add guest</button>
    <div className="clear-both max-h-[calc(100vh-360px)] overflow-auto rounded-lg border border-slate-200 bg-white" aria-label="Scrollable guest list">
      <table className="w-full min-w-[820px]">
        <thead className="sticky top-0 z-10"><tr>{['Leader', 'Name', 'Type', 'Gender', 'Passport', 'Date of birth', 'Age', 'Nationality', ''].map((header) => <th key={header} className="table-header">{header}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id} className={`table-row ${row.isLeader ? 'bg-amber-50/60' : ''}`}>
          <td className="table-cell"><label className="inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-[10px] font-semibold text-amber-700"><input type="radio" name="voucher-guest-leader" checked={Boolean(row.isLeader)} onChange={() => setLeader(row.id)} className="accent-amber-500" /> Leader</label></td>
          <td className="table-cell"><input value={row.name || ''} onChange={(event) => mutate(row.id, 'name', event.target.value)} className="form-input h-8 text-xs w-full" /></td>
          <td className="table-cell min-w-[128px]"><SearchableSelect value={row.type || 'Adult'} onChange={(value) => mutate(row.id, 'type', value)} options={['Adult', 'Child', 'Infant']} placeholder="Select type" /></td>
          <td className="table-cell min-w-[120px]"><SearchableSelect value={row.gender || ''} onChange={(value) => mutate(row.id, 'gender', value)} options={['Male', 'Female', 'Other']} placeholder="Gender" isCreatable /></td>
          <td className="table-cell"><input value={row.passport || ''} onChange={(event) => mutate(row.id, 'passport', event.target.value)} className="form-input h-8 text-xs w-full" /></td>
          <td className="table-cell min-w-36"><VoucherDateInput value={row.dob || ''} onChange={(event) => mutate(row.id, 'dob', event.target.value)} /></td>
          <td className="table-cell text-center text-xs font-semibold text-slate-700">{ageFromDOB(row.dob)}</td>
          <td className="table-cell"><input value={row.nationality || ''} onChange={(event) => mutate(row.id, 'nationality', event.target.value)} className="form-input h-8 text-xs w-full" /></td>
          <td className="table-cell"><Delete run={() => remove(row.id)} /></td>
        </tr>)}</tbody>
      </table>
      {!rows.length && noData('Guest details from the quotation will appear here automatically.')}
    </div>
  </>;
}
function HotelTable({ rows, masters, mealPlanMasters, mutate, reorder }) { const mealPlans = activeMealPlanNames(mealPlanMasters); const rowDrag = useVoucherRowDrag(reorder); return rows.length ? <div className="overflow-auto"><table className="w-full min-w-[1450px]"><thead><tr>{['Order', 'Hotel','Destination','Check in','Check out','Nights','Room type','Meal','Special request','Confirmation no.','PDF'].map((h) => <th key={h} className="table-header">{h}</th>)}</tr></thead><tbody>{sortVoucherRows(rows).map((row) => { const selectedHotel = masters.find((item) => item.id === row.hotelId || item.name === row.name || item.name === row.hotel); const roomTypes = [...new Set([...(selectedHotel?.roomTypes || []), ...(selectedHotel?.rooms || []).map((room) => typeof room === 'string' ? room : room?.type || room?.name)].filter(Boolean))]; const mealPlan = currentMealPlanName(row.mealPlan, mealPlans); return <tr key={row.id} {...rowDrag.rowProps(row.id)} className={`table-row ${rowDrag.rowClass(row.id)} ${row.hiddenInVoucher ? 'bg-amber-50/70 opacity-75' : ''}`}><td className="table-cell w-10 text-center"><DragHandle label="hotel" dragProps={rowDrag.handleProps(row.id)} /></td><td className="table-cell min-w-52"><SearchableSelect value={row.hotelId || row.name || row.hotel || ''} onChange={(value) => { const master = masters.find((item) => item.id === value); if (!master) return; mutate(row.id, 'hotelId', master.id); mutate(row.id, 'name', master.name); mutate(row.id, 'hotel', master.name); if (master.city) mutate(row.id, 'itineraryDestination', master.city); if (master.image || master.imageUrl) mutate(row.id, 'image', master.image || { url: master.imageUrl }); }} options={masters.map((master) => ({ value: master.id, label: `${master.name}${master.city ? ` · ${master.city}` : ''}` }))} placeholder="Select hotel" /></td><td className="table-cell"><input value={row.itineraryDestination || row.city || ''} onChange={(e) => mutate(row.id, 'itineraryDestination', e.target.value)} className="form-input h-8 text-xs w-full" /></td><td className="table-cell"><DateInput value={row.checkIn || ''} onChange={(value) => mutate(row.id, 'checkIn', value)} className="form-input h-8 text-xs w-full" compact /></td><td className="table-cell"><DateInput value={row.checkOut || ''} onChange={(value) => mutate(row.id, 'checkOut', value)} className="form-input h-8 text-xs w-full" compact /></td><td className="table-cell text-center text-xs font-semibold">{nightsBetween(row.checkIn, row.checkOut) || '—'}</td><td className="table-cell min-w-40"><SearchableSelect value={row.roomType || ''} onChange={(value) => mutate(row.id, 'roomType', value)} options={roomTypes} placeholder="Select room type" /></td><td className="table-cell min-w-40"><SearchableSelect value={mealPlan} onChange={(value) => mutate(row.id, 'mealPlan', value)} options={mealPlans} placeholder="Select meal plan" /></td><td className="table-cell"><input value={row.specialRequest || ''} onChange={(e) => mutate(row.id, 'specialRequest', e.target.value)} className="form-input h-8 text-xs w-full" placeholder="Optional" /></td><td className="table-cell"><input value={row.confirmationNo || ''} onChange={(e) => mutate(row.id, 'confirmationNo', e.target.value)} className="form-input h-8 text-xs w-full" placeholder="Confirmation" /></td><td className="table-cell"><PdfVisibilityToggle hidden={Boolean(row.hiddenInVoucher)} onChange={(value) => mutate(row.id, 'hiddenInVoucher', value)} label="hotel" /></td></tr>; })}</tbody></table></div> : noData('Hotel details from the booking or quotation will appear here automatically.'); }
function PlaceInput({ value, change, options, placeholder }) { return <SearchableSelect value={value || ''} onChange={change} options={options} placeholder={placeholder} isCreatable />; }
function ActivityTable({ rows, placeOptions, mutate, reorder, selectable = false, empty }) {
  const rowDrag = useVoucherRowDrag(reorder);
  return rows.length ? <div className="overflow-auto"><table className="w-full min-w-[1510px]">
    <thead><tr>{['Order', ...(selectable ? ['Include'] : []), 'Activity name', 'Type', 'Date', 'Pickup from', 'From time', 'To time', 'Drop at', 'Drop time', 'Remarks', 'PDF'].map((header) => <th key={header} className="table-header">{header}</th>)}</tr></thead>
    <tbody>{rows.map((row) => <tr key={row.id} {...rowDrag.rowProps(row.id)} className={`table-row ${rowDrag.rowClass(row.id)} ${selectable && row.selectedForVoucher ? 'bg-blue-50/60' : ''} ${row.hiddenInVoucher ? 'bg-amber-50/70 opacity-75' : ''}`}>
      <td className="table-cell w-10 text-center"><DragHandle label="activity" dragProps={rowDrag.handleProps(row.id)} /></td>
      {selectable && <td className="table-cell text-center"><input type="checkbox" checked={Boolean(row.selectedForVoucher)} onChange={(event) => mutate(row.id, 'selectedForVoucher', event.target.checked)} aria-label={`Include ${row.name || row.variantName || 'activity'} in sightseeing voucher`} /></td>}
      <td className="table-cell min-w-52 font-semibold text-slate-700">{row.name || row.variantName || 'Service'}</td><td className="table-cell">{row.transferOptionType || row.basis || row.type}</td>
      <td className="table-cell"><DateInput value={row.date || row.serviceDate || ''} onChange={(value) => mutate(row.id, 'date', value)} className="form-input h-8 text-xs w-full" compact /></td>
      <td className="table-cell min-w-44"><PlaceInput value={row.pickupFrom} change={(value) => mutate(row.id, 'pickupFrom', value)} options={placeOptions} placeholder="Pickup point" /></td>
      <td className="table-cell"><input type="time" value={row.fromTime || ''} onChange={(event) => mutate(row.id, 'fromTime', event.target.value)} className="form-input h-8 text-xs w-full" /></td><td className="table-cell"><input type="time" value={row.toTime || ''} onChange={(event) => mutate(row.id, 'toTime', event.target.value)} className="form-input h-8 text-xs w-full" /></td>
      <td className="table-cell min-w-44"><PlaceInput value={row.dropAt} change={(value) => mutate(row.id, 'dropAt', value)} options={placeOptions} placeholder="Drop point" /></td><td className="table-cell"><input type="time" value={row.dropUpTime || ''} onChange={(event) => mutate(row.id, 'dropUpTime', event.target.value)} className="form-input h-8 text-xs w-full" /></td>
      <td className="table-cell min-w-48"><input value={row.remarks || ''} onChange={(event) => mutate(row.id, 'remarks', event.target.value)} className="form-input h-8 text-xs w-full" placeholder="Pickup / service notes" /></td><td className="table-cell"><PdfVisibilityToggle hidden={Boolean(row.hiddenInVoucher)} onChange={(value) => mutate(row.id, 'hiddenInVoucher', value)} label="activity" /></td>
    </tr>)}</tbody>
  </table></div> : noData(empty);
}
function TransferTable({ rows, hotels, vehicles, placeOptions, mutate, reorder, empty }) {
  const rowDrag = useVoucherRowDrag(reorder);
  if (!rows.length) return noData(empty);
  return <div className="overflow-auto"><table className="w-full min-w-[2000px]">
    <thead><tr>{['Order', 'Transfer name', 'Type', 'Vehicle', 'Qty', 'Date', 'Pickup from', 'Flight no.', 'Departure time', 'Arrival date', 'Arrival time', 'Transfer', 'Drop at', 'Remarks', 'PDF'].map((header) => <th key={header} className="table-header">{header}</th>)}</tr></thead>
    <tbody>{rows.map((row) => <tr key={row.id} {...rowDrag.rowProps(row.id)} className={`table-row ${rowDrag.rowClass(row.id)} ${row.hiddenInVoucher ? 'bg-amber-50/70 opacity-75' : ''}`}>
      <td className="table-cell w-10 text-center"><DragHandle label="transfer" dragProps={rowDrag.handleProps(row.id)} /></td>
      <td className="table-cell min-w-52 font-semibold text-slate-700">{transferNameWithHotel(row, hotels)}</td>
      <td className="table-cell">{row.basis || row.transferType || row.type}</td>
      <td className="table-cell min-w-28 font-semibold text-slate-700">{vehicleName(row, vehicles)}</td>
      <td className="table-cell min-w-[72px]"><input type="number" min="1" value={transferVehicleQuantity(row)} onChange={(event) => mutate(row.id, 'quantity', Math.max(1, Number(event.target.value || 1)))} className="form-input h-8 w-full text-xs" aria-label="Vehicle quantity" /></td>
      <td className="table-cell min-w-[150px]"><DateInput value={row.date || row.serviceDate || ''} onChange={(value) => mutate(row.id, 'date', value)} className="form-input h-8 text-xs w-full" compact ariaLabel="Transfer date in DD-MM-YYYY format" /></td>
      <td className="table-cell min-w-44"><PlaceInput value={row.pickupFrom} change={(value) => mutate(row.id, 'pickupFrom', value)} options={placeOptions} placeholder="Transfer pickup" /></td>
      <td className="table-cell"><input value={row.flightNo || ''} onChange={(event) => mutate(row.id, 'flightNo', event.target.value)} className="form-input h-8 text-xs w-full" /></td>
      <td className="table-cell"><input type="time" value={row.fromTime || ''} onChange={(event) => mutate(row.id, 'fromTime', event.target.value)} className="form-input h-8 text-xs w-full" /></td>
      <td className="table-cell min-w-[150px]"><DateInput value={row.arrivalDate || ''} onChange={(value) => mutate(row.id, 'arrivalDate', value)} className="form-input h-8 text-xs w-full" compact ariaLabel="Transfer arrival date in DD-MM-YYYY format" /></td>
      <td className="table-cell"><input type="time" value={row.arrivalTime || ''} onChange={(event) => mutate(row.id, 'arrivalTime', event.target.value)} className="form-input h-8 text-xs w-full" /></td>
      <td className="table-cell min-w-36"><SearchableSelect value={row.transferKind || ''} onChange={(value) => mutate(row.id, 'transferKind', value)} options={['Arrival', 'Departure', 'Inter Hotel', 'Inter City', 'Sightseeing']} placeholder="Transfer type" isCreatable /></td>
      <td className="table-cell min-w-44"><PlaceInput value={row.dropAt} change={(value) => mutate(row.id, 'dropAt', value)} options={placeOptions} placeholder="Transfer drop" /></td>
      <td className="table-cell min-w-48"><input value={row.remarks || ''} onChange={(event) => mutate(row.id, 'remarks', event.target.value)} className="form-input h-8 text-xs w-full" placeholder="Pickup / driver notes" /></td>
      <td className="table-cell"><PdfVisibilityToggle hidden={Boolean(row.hiddenInVoucher)} onChange={(value) => mutate(row.id, 'hiddenInVoucher', value)} label="transfer" /></td>
    </tr>)}</tbody>
  </table></div>;
}
function Itinerary({ rows, mutate, reorder, remove, add, aiPrompt, setAiPrompt, generateAiItinerary, generatingItinerary }) {
  const rowDrag = useVoucherRowDrag(reorder);
  return <>
    <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-3"><div className="mb-2 flex items-center gap-2 text-xs font-bold text-violet-900"><Sparkles className="h-4 w-4" /> Generate itinerary with your configured AI</div><textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} rows="3" className="form-input w-full text-xs" placeholder="Example: Plan a family-friendly 5-day Phuket and Krabi trip with relaxed mornings, island time, vegetarian meals and short travel days." /><div className="mt-2 flex items-center justify-between gap-3"><p className="text-[10px] text-violet-700">The generated days replace the current day titles. Configure OpenAI or Gemini in Settings → AI Itinerary.</p><button type="button" onClick={generateAiItinerary} disabled={generatingItinerary} className="btn-primary h-8 shrink-0 px-3 text-xs disabled:opacity-60"><Sparkles className="h-3.5 w-3.5" /> {generatingItinerary ? 'Generating...' : 'Generate'}</button></div></div>
    <button onClick={add} className="btn-primary h-7 text-xs px-2 mb-3 float-right"><Plus className="w-3 h-3" /> Add day</button>
    <div className="clear-both space-y-2">{sortVoucherRows(rows).map((row) => <div key={row.id} {...rowDrag.rowProps(row.id)} className={`flex w-full min-w-0 gap-2 rounded-md p-1 hover:bg-slate-50 ${rowDrag.rowClass(row.id)}`}>
      <DragHandle label="itinerary day" dragProps={rowDrag.handleProps(row.id)} /><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">{row.day}</span><div className="w-36 shrink-0"><DateInput value={row.date || ''} onChange={(value) => mutate(row.id, 'date', value)} className="form-input h-8 w-full text-xs" compact /></div><input value={row.title || ''} onChange={(event) => mutate(row.id, 'title', event.target.value)} placeholder="Day plan" className="form-input h-8 min-w-0 flex-1 text-xs" aria-label={`Day ${row.day} itinerary title`} /><Delete run={() => remove(row.id)} />
    </div>)}{!rows.length && noData('No itinerary items have been generated from the booking services.')}</div>
  </>;
}
function SettingsPanel({ settings, change, termsTemplates, selectedTermTemplateIds, voucherType, selectTerms }) {
  const availableTerms = VOUCHER_TERM_TYPES.filter((type) => type.voucherTypes.includes(voucherType));
  return <div className="space-y-4">
    <div className="grid gap-3 md:grid-cols-3">
      <label className="text-xs font-semibold text-slate-700">Meal preference<select value={settings.mealPreference || ''} onChange={(event) => change('mealPreference', event.target.value)} className="form-select mt-1 h-9 w-full text-xs"><option value="">No preference</option>{['No Meals', 'Breakfast', 'Lunch', 'Dinner', 'Vegetarian', 'Jain', 'Halal'].map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-700">Voucher details<select value={settings.voucherFor || 'Agent'} onChange={(event) => change('voucherFor', event.target.value)} className="form-select mt-1 h-9 w-full text-xs">{['Agent', 'B2C', 'Guest'].map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-700">Show day wise itinerary<select value={String(settings.showDayWiseItinerary !== false)} onChange={(event) => change('showDayWiseItinerary', event.target.value === 'true')} className="form-select mt-1 h-9 w-full text-xs"><option value="true">Yes</option><option value="false">No</option></select></label>
    </div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <div className="mb-2 text-xs font-bold text-amber-900">Voucher terms &amp; conditions</div>
      <div className="grid gap-3 lg:grid-cols-2">
        {availableTerms.map((type) => {
          const templates = termsTemplates.filter((item) => item.section === type.section);
          return <label key={type.key} className="text-xs font-semibold text-amber-900">{type.label}<select value={selectedTermTemplateIds[type.key] || ''} onChange={(event) => selectTerms(type.key, event.target.value)} className="form-select mt-1 h-9 w-full bg-white text-xs"><option value="">No {type.label.toLowerCase()}</option>{templates.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isDefault ? ' (Default)' : ''}</option>)}</select></label>;
        })}
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-amber-800">Each selected rich-text template is saved on this voucher and printed in its matching hotel, sightseeing, or transfer section with its original bullets, numbering, bold text, and highlights.</p>
    </div>
    <div className="space-y-3">{[['showPassport','Show passport numbers'],['showDOB','Show dates of birth'],['companySeal','Show company seal'],['emergency','Show 24/7 emergency details']].map(([key,label]) => <label key={key} className="border border-slate-200 rounded-xl px-3 py-3 flex justify-between text-sm font-semibold text-slate-700"><span>{label}</span><input type="checkbox" checked={!!settings[key]} onChange={(e) => change(key, e.target.checked)} /></label>)}</div>
  </div>;
}
function Review({ booking, voucher, preview }) { const stats = [['Flights',voucher.flights.length],['Guests',voucher.guests.length],['Hotels',voucher.hotels.length],['Transfers',voucher.services.filter((s) => s.type === 'Transfer').length],['Activities',voucher.services.filter((s) => s.type !== 'Transfer').length],['Days',voucher.itinerary.length]]; return <div className="text-center py-5"><CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" /><h3 className="text-base font-extrabold text-slate-800">Voucher ready for {booking.guestName}</h3><div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-5">{stats.map(([label,count]) => <div key={label} className="bg-slate-50 border border-slate-200 rounded-lg p-3"><div className="text-lg font-extrabold text-blue-700">{count}</div><div className="text-[10px] uppercase font-bold text-slate-400">{label}</div></div>)}</div><button onClick={preview} className="btn-primary mt-5 h-9 px-5 text-xs"><Eye className="w-3.5 h-3.5" /> Save and preview</button></div>; }
