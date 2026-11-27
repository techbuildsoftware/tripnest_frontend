import React, { useEffect, useMemo, useRef, useState } from 'react';
import LogoImg from '../../assets/logo-white.png';
import LogoColor from '../../assets/logo-color.png';
import VoucherBg from '../../assets/Voucher.png';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Car, Check, CheckCircle, ChevronLeft, ChevronRight, Download, Eye, FileText, Globe, Hotel, Mail, MessageSquare, Phone, Plane, Printer, Save, Users, PlaneLanding, PlaneTakeoff, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../lib/api';
import WhatsAppSendDialog from '../../components/WhatsAppSendDialog';
import { voucherPdfFilename } from '../../lib/documentFilename';
import { downloadPdfFromElement, pdfLayoutOptionsFromConfig, printPdfDocument } from '../../lib/directPdfDownload';
import { mergeVoucherSettings } from '../../lib/voucherSettings';
import { formatDate } from '../../lib/date';
import { hotelRoomAllocationText } from '../../lib/roomAllocation';
import { hasVoucherTermText, hasVoucherTerms as hasSelectedVoucherTerms } from '../../lib/voucherTerms';
import ModernJourneyVoucher from '../Documents/ModernJourneyVoucher';
import TravelItineraryVoucher from '../Documents/TravelItineraryVoucher';
import ConfirmationItineraryVoucher from '../Documents/ConfirmationItineraryVoucher';
import { keepSourceVehicleSelection, sortVoucherFlights, sortVoucherRows, voucherVehicleLabel } from '../../lib/voucherPresentation';

const VOUCHER_SECTIONS = [
  ['cover', 'Guest Details'], ['flights', 'Flights Details'], ['hotels', 'Hotel Details'],
  ['transfers', 'Transfer Details'], ['activities', 'Sight Seeing Details'], ['notes', 'Important Notes'], ['itinerary', 'Day Wise Iternry'],
];
const SERVICE_VOUCHER_SECTIONS = {
  combined: ['cover', 'flights', 'hotels', 'transfers', 'activities', 'notes', 'itinerary'],
  hotel: ['cover', 'hotels', 'notes'],
  sightseeing: ['cover', 'activities', 'notes'],
  transfer: ['cover', 'transfers', 'notes'],
  other: ['cover', 'activities', 'notes'],
};
const CONFIRMATION_SECTION_TO_VOUCHER_SECTION = {
  cover: 'cover', flights: 'flights', hotels: 'hotels', transfers: 'transfers',
  tours: 'activities', importantNotes: 'notes', itinerary: 'itinerary',
};
const SERVICE_VOUCHER_LABELS = { combined: 'Combined Voucher', hotel: 'Hotel Voucher', sightseeing: 'Sightseeing Voucher', transfer: 'Transfer Voucher', other: 'Other Service Voucher' };
const TITLE_SECTIONS = { 'Guest Details': 'cover', 'Flights Details': 'flights', 'Hotel Details': 'hotels', 'Transfer Details': 'transfers', 'Sight Seeing Details': 'activities', 'Important Notes': 'notes', 'Day Wise Iternry': 'itinerary' };
const VoucherConfigContext = React.createContext({ template: mergeVoucherSettings(), sectionOrder: VOUCHER_SECTIONS.map(([key]) => key) });
const voucherPreviewCanvasStyle = (layout = {}) => ({
  '--voucher-card-padding-scale': Number(layout.pdfCardPaddingPercent || 100) / 100,
  '--voucher-card-spacing-scale': Number(layout.pdfCardSpacingPercent || 100) / 100,
  zoom: Number(layout.pdfContentScalePercent || 100) / 100,
  padding: `${Number(layout.pdfTopMarginMm || 0) * 3.78}px ${Number(layout.pdfSideMarginMm || 0) * 3.78}px`,
});
const VOUCHER_LAYOUT_LIVE_CSS = `
  .voucher-page .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: calc(1rem * var(--voucher-card-spacing-scale)) !important; }
  .voucher-page .itinerary-day > .flex, .voucher-page .itinerary-day article { padding: calc(.75rem * var(--voucher-card-padding-scale)) !important; }
  .civ-timeline-wrapper { padding-top: calc(5mm * var(--voucher-card-spacing-scale)) !important; padding-bottom: calc(5mm * var(--voucher-card-spacing-scale)) !important; }
  .civ-timeline-item { margin-bottom: calc(6mm * var(--voucher-card-spacing-scale)) !important; }
  .civ-day-service { padding: calc(5px * var(--voucher-card-padding-scale)) calc(6px * var(--voucher-card-padding-scale)) !important; }
  .tiv-body { padding: calc(16px * var(--voucher-card-padding-scale)) !important; }
  .tiv-card { padding: calc(12px * var(--voucher-card-padding-scale)) !important; }
  .tiv-row { padding-top: calc(12px * var(--voucher-card-spacing-scale)) !important; padding-bottom: calc(12px * var(--voucher-card-spacing-scale)) !important; }
  .tiv-service { margin-top: calc(7px * var(--voucher-card-spacing-scale)) !important; padding: calc(8px * var(--voucher-card-padding-scale)) calc(10px * var(--voucher-card-padding-scale)) !important; }
`;

const iso = (value) => String(value || '').slice(0, 10);
const voucherFlightDate = (value) => {
  const raw = String(value || '').trim();
  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const displayDate = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return isoDate ? `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`
    : displayDate ? `${displayDate[3]}-${displayDate[2]}-${displayDate[1]}`
      : iso(raw);
};
const displayDate = (value) => formatDate(value);
const cell = (value) => value || '—';
const voucherRemarks = (service = {}) => (
  Object.prototype.hasOwnProperty.call(service, 'remarks')
    ? service.remarks
    : service.notes || service.plannerNote || ''
);
const nightsBetween = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return '—';
  const start = new Date(`${iso(checkIn)}T00:00:00Z`);
  const end = new Date(`${iso(checkOut)}T00:00:00Z`);
  return Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end < start ? '—' : Math.round((end - start) / 86400000);
};
const ageFromDOB = (dob) => {
  if (!dob) return '—';
  const birth = new Date(`${iso(dob)}T00:00:00`);
  if (Number.isNaN(birth.valueOf())) return '—';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  age -= Number(today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()));
  return age >= 0 ? age : '—';
};
const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isTransferService = (service = {}) => ['transfer', 'transfers'].includes(String(service.type || service.serviceType || service.category || '').trim().toLowerCase());
const voucherActivityType = (value) => String(value || '').trim() === 'Standard Activity' ? 'Ticket Only' : String(value || '').trim();
const hotelNameForTransfer = (service = {}, hotels = []) => {
  const serviceDate = iso(service.date || service.serviceDate);
  const name = service.name || service.variantName || '';
  const targetCity = hotels.map((hotel) => hotel?.itineraryDestination || hotel?.city || hotel?.destination || '').find((city) => city && new RegExp(`\\b${escapeRegex(city)}\\s+Hotel\\b`, 'i').test(name));
  const candidates = hotels.filter((hotel) => !targetCity || String(hotel?.itineraryDestination || hotel?.city || hotel?.destination || '').trim().toLowerCase() === String(targetCity).trim().toLowerCase());
  const matchingHotel = candidates.find((hotel) => iso(hotel.checkIn) === serviceDate)
    || candidates.find((hotel) => serviceDate && iso(hotel.checkIn) <= serviceDate && serviceDate < iso(hotel.checkOut))
    || candidates.find((hotel) => iso(hotel.checkOut) === serviceDate)
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
  return selected || vehicles.find((vehicle) => String(vehicle.id || vehicle._id) === String(vehicleId))?.name || vehicleId || '';
};
const transferRoute = (service) => {
  const from = service.pickupFrom || service.pickupPoint || service.origin || service.fromSector || '';
  const to = service.dropAt || service.dropPoint || service.dropOff || service.dropTo || service.destination || service.toSector || '';
  return [from, to].filter(Boolean).join(' → ') || '—';
};
const transferTiming = (service) => {
  const departure = service.fromTime || service.pickupTime || service.time || service.departure || '';
  const arrival = service.arrivalTime || service.dropUpTime || service.dropTime || service.arrival || '';
  return [departure, arrival].filter(Boolean).join(' - ') || '—';
};
const vehicleForService = (service, vehicles = []) => {
  const vehicleId = typeof service.vehicle === 'object'
    ? service.vehicle.id || service.vehicle._id
    : service.vehicle || service.vehicleId || service.transportVehicle || service.transferVehicle;
  const selectedName = normalized(service.vehicleName || service.vehicle?.name || service.transportVehicleName || service.transferVehicleName);
  return vehicles.find((vehicle) => String(vehicle.id || vehicle._id) === String(vehicleId))
    || vehicles.find((vehicle) => selectedName && normalized(vehicle.name) === selectedName)
    || (typeof service.vehicle === 'object' ? service.vehicle : null);
};
const normalized = (value) => String(value || '').trim().toLocaleLowerCase();
const attachmentUrl = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(attachmentUrl).find(Boolean) || '';
  if (typeof value === 'object') return attachmentUrl(value.url || value.secureUrl || value.secure_url || value.imageUrl || value.src || value.path);
  return '';
};
const clientLogo = (client) => attachmentUrl([client?.companyLogo, client?.logo, client?.image, client?.imageUrl, client?.images]);
const voucherRichTextStyle = `.voucher-rich-text{font-size:10px;line-height:1.6}.voucher-rich-text p{margin:.25rem 0}.voucher-rich-text ul{list-style:disc outside;margin:.35rem 0 .35rem 1.25rem}.voucher-rich-text ol{list-style:decimal outside;margin:.35rem 0 .35rem 1.25rem}.voucher-rich-text li{display:list-item;margin:.15rem 0}.voucher-rich-text strong{font-weight:700}.voucher-rich-text h1,.voucher-rich-text h2,.voucher-rich-text h3{font-size:inherit;margin:.35rem 0;font-weight:700}`;
const VoucherRichText = ({ html, className = '', style }) => html ? <><style>{voucherRichTextStyle}</style><div className={`voucher-rich-text ${className}`} style={style} dangerouslySetInnerHTML={{ __html: html }} /></> : null;
const selectedVariantImage = (variant = {}) => attachmentUrl([variant?.image, variant?.images]);
const leaderFirst = (guests = []) => [...guests].sort((left, right) => Number(Boolean(right.isLeader)) - Number(Boolean(left.isLeader)));
const voucherGuestName = (guest = {}, booking = {}) => (
  String(guest.name || guest.fullName || guest.guestName || (guest.isLeader ? booking.guestName : '') || '').trim() || '—'
);
const masterForService = (service, masters) => {
  const source = service.type === 'Sightseeing' ? masters.sightseeing
      : service.type === 'Transfer' ? masters.transfers
      : service.type === 'Ferry' ? masters.ferryClasses
      : service.type === 'Yacht' ? masters.yachts
        : ['Meal', 'Restaurant'].includes(service.type) ? masters.restaurants : [];
  const serviceName = normalized(service.name || service.variantName);
  return source.find((item) => String(item.id) === String(service.masterId || service.yachtId || service.transferId || service.restaurantId || ''))
    || source.find((item) => normalized(item.name) === serviceName || serviceName.startsWith(normalized(item.name)))
    || null;
};
const enrichService = (service, masters) => {
  const master = masterForService(service, masters);
  const selectedVariant = (master?.variants || []).find((variant) => String(variant?.id) === String(service.variantId));
  const selectedSightseeingTransfer = (master?.transfers || []).find((option) => String(option.id) === String(service.transferOptionId));
  const selectedVariantImageUrl = selectedVariantImage(selectedVariant);
  // Voucher descriptions are customer-facing master content. A selected
  // variant is the most precise source, followed by its service master; keep
  // an existing booking snapshot only as a legacy fallback.
  const masterDescription = selectedVariant?.description || selectedVariant?.details
    || master?.details || master?.description || master?.usefulInformation || '';
  const isSightseeing = service.type === 'Sightseeing';
  const selectedVehicle = service.type === 'Transfer' ? vehicleForService(service, masters.vehicles) : null;
  const vehicleImage = attachmentUrl([selectedVehicle?.image, selectedVehicle?.imageUrl, selectedVehicle?.images]);
  return {
    ...service,
    masterDescription: masterDescription || service.masterDescription || service.description || service.details || '',
    description: masterDescription || service.masterDescription || service.description || service.details || '',
    termsHtml: service.termsHtml || master?.termsHtml || master?.policies?.terms || '',
    duration: service.duration || master?.duration || '',
    timing: service.timing || master?.timing || '',
    fromTime: service.fromTime || selectedVariant?.defaultFromTime || '',
    toTime: service.toTime || selectedVariant?.defaultToTime || '',
    dropUpTime: service.dropUpTime || selectedVariant?.defaultDropTime || '',
    basis: isSightseeing ? voucherActivityType(selectedSightseeingTransfer?.type) || voucherActivityType(service.transferOptionType) || voucherActivityType(master?.activityType) || (!service.transferOptionId ? 'Ticket Only' : voucherActivityType(service.basis)) : service.basis,
    transferOptionType: isSightseeing ? voucherActivityType(selectedSightseeingTransfer?.type) || voucherActivityType(service.transferOptionType) || '' : service.transferOptionType,
    // A selected sightseeing variant is the actual booked product. Its image
    // must win over both a general sightseeing image and an older snapshot.
    image: vehicleImage || selectedVariantImageUrl || service.variantImage || master?.image || service.image,
    imageUrl: attachmentUrl(isSightseeing
      ? [selectedVariantImageUrl, service.variantImage, service.image, service.imageUrl, service.images, master?.image, master?.images]
      : [vehicleImage, service.image, service.imageUrl, service.images, master?.image, master?.images]),
  };
};
const hotelForBooking = (hotel, hotelMasters) => {
  const hotelName = normalized(hotel.name || hotel.hotel);
  const master = hotelMasters.find((item) => String(item.id || item._id) === String(hotel.hotelId || hotel.masterId || ''))
    || hotelMasters.find((item) => normalized(item.name) === hotelName)
    || null;
  return {
    ...hotel,
    imageUrl: attachmentUrl([master?.hotelImage, master?.image, master?.images, hotel.hotelImage, hotel.image, hotel.imageUrl, hotel.images]),
  };
};
// Voucher templates render route fields directly. Resolve only placeholders of
// the form "<destination> Hotel" against the booked hotel for that date; do
// not replace a consultant-entered pickup/drop location.
const resolveHotelRouteEndpoint = (endpoint, service = {}, hotels = []) => {
  const original = String(endpoint || '').trim();
  if (!original) return endpoint;
  const city = hotels.map((hotel) => hotel?.itineraryDestination || hotel?.city || hotel?.destination || '')
    .find((value) => value && new RegExp(`\\b${escapeRegex(value)}\\s+Hotel\\b`, 'i').test(original));
  if (!city) return endpoint;
  const serviceDate = iso(service.serviceDate || service.date);
  const candidates = hotels.filter((hotel) => String(hotel?.itineraryDestination || hotel?.city || hotel?.destination || '').trim().toLowerCase() === String(city).trim().toLowerCase());
  const hotel = candidates.find((item) => iso(item.checkIn) === serviceDate)
    || candidates.find((item) => serviceDate && iso(item.checkIn) <= serviceDate && serviceDate < iso(item.checkOut))
    || candidates.find((item) => iso(item.checkOut) === serviceDate)
    || candidates[0];
  const hotelName = hotel?.name || hotel?.hotel || hotel?.hotelName || hotel?.selectedHotelName || '';
  return hotelName ? original.replace(new RegExp(`\\b${escapeRegex(city)}\\s+Hotel\\b`, 'ig'), hotelName) : endpoint;
};
const resolveTransferHotelEndpoints = (service, hotels) => !isTransferService(service) ? service : {
  ...service,
  pickupFrom: resolveHotelRouteEndpoint(service.pickupFrom || service.pickupPoint || service.origin || service.fromSector, service, hotels),
  dropAt: resolveHotelRouteEndpoint(service.dropAt || service.dropPoint || service.dropOff || service.dropTo || service.destination || service.toSector, service, hotels),
};
const quotationServices = (quotation = {}) => (quotation.days || []).flatMap((entry) => (entry.services || []).map((service, index) => ({
  ...service,
  id: service.id || `quotation-service-${entry.day || 0}-${index}`,
  serviceDate: entry.date || service.serviceDate || service.date || '',
  itineraryDestination: entry.destination || service.itineraryDestination || service.destination || '',
})));
const voucherText = (value) => String(value || '').trim().toLowerCase();
const isVisibleInVoucher = (row = {}) => !Boolean(row.hiddenInVoucher);
const voucherServiceKey = (service = {}) => [
  service.type || '', iso(service.serviceDate || service.date),
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
  const sourceKeys = new Set(sourceServices.map(voucherServiceKey));
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
  return [
    ...sourceServices.map((service) => keepSourceVehicleSelection(service, { ...service, ...(findSaved(service) || {}) })),
    // Do not carry forward an older duplicate snapshot of a current booking
    // service. This also repairs vouchers saved before the identity merge.
    ...savedServices.filter((service, index) => !usedSaved.has(index) && !sourceKeys.has(voucherServiceKey(service))),
  ];
};
// The same flight can arrive from the booking, the linked quotation, and an
// older saved voucher under different IDs. Its real identity is the date,
// route, flight number, and times — never the row index.
const voucherFlightNumber = (flight = {}) => {
  const raw = String(flight.airlineFlight || flight.airline || flight.flightNo || '').trim().toUpperCase();
  return (raw.match(/\b[A-Z]{1,3}\s*[- ]?\s*\d{1,4}\b/g)?.at(-1) || raw).replace(/[^A-Z0-9]/g, '').toLowerCase();
};
const voucherFlightRouteTimeKey = (flight = {}) => [
  voucherFlightDate(flight.date || flight.serviceDate),
  flight.fromSector || flight.origin || flight.fromAirportId || '',
  flight.toSector || flight.destination || flight.toAirportId || '',
  flight.departure || flight.fromTime || '',
  flight.arrival || flight.arrivalTime || '',
].map((part) => String(part).trim().toLowerCase()).join('|');
const voucherFlightsMatch = (left = {}, right = {}) => {
  const leftDate = voucherFlightDate(left.date || left.serviceDate);
  const rightDate = voucherFlightDate(right.date || right.serviceDate);
  if (!leftDate || leftDate !== rightDate) return false;
  const leftNumber = voucherFlightNumber(left);
  const rightNumber = voucherFlightNumber(right);
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
  iso(hotel.checkIn || hotel.checkin), iso(hotel.checkOut || hotel.checkout),
  hotel.roomType || hotel.roomTypeName || '', hotel.mealPlan || hotel.meal || '',
].map(voucherText).join('|');
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
  // The booking is authoritative for hotel rows. A prior voucher snapshot
  // may enrich a matching hotel, but cannot reintroduce a removed hotel.
  return sourceHotels.map((hotel) => {
      const saved = findSaved(hotel) || {};
      const bookingConfirmation = hotel.confirmationNo || hotel.confirmationNumber || hotel.confirmation || '';
      return { ...hotel, ...saved, confirmationNo: bookingConfirmation || saved.confirmationNo || saved.confirmationNumber || saved.confirmation || '' };
    });
};
const dataRows = (booking, masters, quotation, hotelMasters, voucherOverride = null, voucherType = 'combined') => {
  const voucher = voucherOverride || booking.voucher || {};
  const sourceServices = Array.isArray(booking.services) && booking.services.length ? booking.services : quotationServices(quotation);
  const bookingHotels = booking.hotels?.length ? booking.hotels : sourceServices.filter((item) => item.type === 'Hotel');
  const sourceHotels = sortVoucherRows(mergeVoucherHotels(bookingHotels, Array.isArray(voucher.hotels) ? voucher.hotels : []));
  const voucherHotels = sourceHotels.map((hotel) => hotelForBooking(hotel, hotelMasters));
  const services = sortVoucherRows(mergeVoucherServices(
    sourceServices.filter((item) => item.type !== 'Hotel'),
    Array.isArray(voucher.services) ? voucher.services : [],
  )).map((service) => enrichService(service, masters))
    .map((service) => resolveTransferHotelEndpoints(service, voucherHotels));
  const visibleHotels = voucherHotels.filter(isVisibleInVoucher);
  const visibleServices = services.filter(isVisibleInVoucher);
  // New bookings retain an itinerary snapshot. For older bookings, read the linked
  // quotation so the day explanation remains visible without needing a re-booking.
  const savedDays = Array.isArray(voucher.itinerary) && voucher.itinerary.length ? voucher.itinerary : (booking.itinerary || []);
  const quotationDays = Array.isArray(quotation?.days) ? quotation.days : [];
  const quotationDayByDate = new Map(quotationDays.map((item, index) => [iso(item.date), { ...item, day: item.day || index + 1 }]));
  const daySeed = (savedDays.length ? savedDays : quotationDays).map((item, index) => {
    const quotationDay = quotationDayByDate.get(iso(item.date));
    return {
      ...quotationDay,
      ...item,
      day: item.day || quotationDay?.day || index + 1,
      title: item.title || quotationDay?.title || '',
      description: item.description || quotationDay?.description || '',
    };
  });
  const byDate = new Map(daySeed.map((item, index) => [iso(item.date), { ...item, day: item.day || index + 1, services: [] }]));
  visibleServices.forEach((service) => {
    const date = iso(service.serviceDate || service.date) || iso(booking.arrivalDate);
    if (!date) return;
    if (!byDate.has(date)) byDate.set(date, { id: `day-${byDate.size + 1}`, day: byDate.size + 1, date, title: '', description: '', services: [] });
    byDate.get(date).services.push(service);
  });
  const itineraryRows = [...byDate.values()];
  const itinerary = (itineraryRows.some((item) => Number.isFinite(Number(item.voucherOrder))) ? sortVoucherRows(itineraryRows) : itineraryRows.sort((left, right) => String(left.date).localeCompare(String(right.date)))).map((item, index) => ({
    ...item,
    day: index + 1,
    title: item.title || item.services.map((service) => service.name || service.variantName || service.type).join(' • '),
  }));
  const activityServices = visibleServices.filter((item) => ['Sightseeing', 'Restaurant', 'Meal', 'Yacht', 'Ferry', 'Guide', 'Other'].includes(item.type));
  const quotationFlights = [
    ...(Array.isArray(quotation?.flights) ? quotation.flights : []),
    ...quotationServices(quotation).filter((service) => String(service.type || '').toLowerCase() === 'flight'),
  ];
  const sourceFlights = mergeVoucherFlights([...(Array.isArray(booking.flights) ? booking.flights : []), ...quotationFlights], []);
  return {
    flights: mergeVoucherFlights(sourceFlights, Array.isArray(voucher.flights) ? voucher.flights : []).filter(isVisibleInVoucher),
    guests: leaderFirst(Array.isArray(voucher.guests) && voucher.guests.length ? voucher.guests : (booking.guests?.length ? booking.guests : quotation?.guests || [])),
    hotels: visibleHotels,
    transfers: visibleServices.filter(isTransferService), activities: voucherType === 'sightseeing' ? activityServices.filter((item) => item.type === 'Sightseeing' && item.selectedForVoucher === true) : voucherType === 'other' ? activityServices.filter((item) => item.type !== 'Sightseeing') : activityServices,
    itinerary, settings: voucher.settings || {},
  };
};
function Empty({ text }) { return <div className="py-8 text-center text-xs text-slate-400">{text}</div>; }
function Header({ booking, page, title, totalSections = 7 }) { return <div className="bg-gradient-to-r from-[#172554] to-[#0b6f6b] px-5 py-4 text-white flex justify-between"><div><div className="flex items-center gap-2 font-black"><Globe className="w-5 h-5 text-yellow-300" /> BUILDSOFTWARE</div><div className="text-[10px] text-blue-100 mt-1">Your Thailand travel partner</div></div><div className="text-right"><div className="text-[10px] text-blue-100">Combined Voucher · {title}</div><div className="font-bold text-sm">{booking.id}</div><div className="text-[10px] text-blue-100">Section {page} of {totalSections}</div></div></div>; }
function DynamicHeader({ booking, title }) {
  const { template, sectionOrder, brand } = React.useContext(VoucherConfigContext);
  const page = sectionOrder.indexOf(TITLE_SECTIONS[title]) + 1;
  const theme = template?.theme || 'simple';
  
  if (theme === 'luxury') {
    return (
      <div style={{ background: '#0a0a0a', borderBottom: '2px solid #d4af37', breakAfter: 'avoid', pageBreakAfter: 'avoid' }} className="voucher-navbar px-6 py-4 text-white flex justify-between items-center relative overflow-hidden">
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', background: 'radial-gradient(circle at top right, rgba(212,175,55,0.15), transparent 60%)' }} />
        <div className="flex items-center gap-4 relative z-10">
          <img src={brand.logo || LogoImg} alt="logo" style={{ height: 46, width: 100, objectFit: 'contain', objectPosition: 'left center', background: 'transparent' }} onError={(e) => { e.currentTarget.onerror = () => { e.currentTarget.style.display = 'none'; }; e.currentTarget.src = LogoImg; }} />
          <div className="border-l border-yellow-600/30 pl-4">
            <div className="font-serif text-lg tracking-widest text-yellow-500 uppercase">{brand.name || template.companyName}</div>
            <div className="text-[10px] text-slate-400 tracking-wider uppercase mt-1">{template.tagline}</div>
          </div>
        </div>
        <div className="text-right relative z-10">
          <div className="font-serif font-bold text-base text-yellow-500">{booking.id}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Section {page} of {sectionOrder.length}</div>
        </div>
      </div>
    );
  }
  
  if (theme === 'vibrant') {
    return (
      <div style={{ background: `linear-gradient(135deg, ${template.secondaryColor || '#ec4899'}, ${template.primaryColor || '#8b5cf6'})`, breakAfter: 'avoid', pageBreakAfter: 'avoid' }} className="voucher-navbar px-6 py-5 text-white flex justify-between items-center relative overflow-hidden rounded-b-[2rem]">
        <div style={{ position: 'absolute', top: -50, right: -20, width: 150, height: 150, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(10px)' }} />
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-white p-2 rounded-2xl shadow-lg"><img src={brand.logo || LogoColor} alt="logo" style={{ height: 40, width: 80, objectFit: 'contain', background: 'transparent' }} onError={(e) => { e.currentTarget.onerror = () => { e.currentTarget.style.display = 'none'; }; e.currentTarget.src = LogoImg; }} /></div>
          <div>
            <div className="font-black text-lg tracking-tight shadow-sm">{brand.name || template.companyName}</div>
            <div className="text-[10px] text-fuchsia-100 font-medium">{template.tagline}</div>
          </div>
        </div>
        <div className="text-right relative z-10 bg-black/10 px-4 py-2 rounded-xl backdrop-blur-sm">
          <div className="font-black text-sm">{booking.id}</div>
          <div className="text-[9px] text-fuchsia-100 font-bold uppercase mt-0.5">Section {page} of {sectionOrder.length}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: `linear-gradient(90deg, ${template.secondaryColor}, ${template.primaryColor})`, breakAfter: 'avoid', pageBreakAfter: 'avoid' }} className="voucher-navbar px-5 py-3 text-white flex justify-between items-center">
      <div className="flex items-center gap-3">
        <img src={brand.logo || LogoImg} alt={`${brand.name || template.companyName} logo`} style={{ height: 52, width: 110, objectFit: 'contain', objectPosition: 'left center', background: 'transparent' }} onError={(e) => { e.currentTarget.onerror = () => { e.currentTarget.style.display = 'none'; }; e.currentTarget.src = LogoImg; }} />
        <div>
          <div className="font-black text-sm tracking-wide">{brand.name || template.companyName}</div>
          <div className="text-[10px] text-blue-100">{template.tagline}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-bold text-sm">{booking.id}</div>
        <div className="text-[10px] text-blue-100">Section {page} of {sectionOrder.length}</div>
      </div>
    </div>
  );
}
// The cover is the document's only branded navbar. Other sections flow below
// it so the preview and printed PDF use the page space instead of repeating a
// header on every section.
function Page({ children, watermarkImage = '' }) {
  const { template } = React.useContext(VoucherConfigContext);
  const theme = template?.theme || 'simple';
  const pageBg = theme === 'luxury' ? 'bg-[#111] border-yellow-600/30 shadow-[0_0_15px_rgba(212,175,55,0.1)]' : (theme === 'vibrant' ? 'bg-white border-fuchsia-200 shadow-xl shadow-fuchsia-100/50' : 'bg-white border-slate-200 shadow-sm');
  const textColor = theme === 'luxury' ? 'text-slate-200' : 'text-slate-800';
  return <div className={`voucher-page relative ${pageBg} rounded-xl border overflow-hidden ${textColor}`}>
    {watermarkImage && <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-center bg-no-repeat" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,.90), rgba(255,255,255,.90)), url(${watermarkImage})`, backgroundSize: 'contain', opacity: theme === 'luxury' ? 0.14 : 0.18 }} />}
    <div className="relative p-5">{children}</div>
  </div>;
}
function Table({ headers, children }) { 
  const { template } = React.useContext(VoucherConfigContext);
  const theme = template?.theme || 'simple';
  const theadBg = theme === 'luxury' ? 'bg-[#1a1a1a] border-b border-yellow-600/30' : (theme === 'vibrant' ? 'bg-gradient-to-r from-fuchsia-50 to-blue-50 border-b border-fuchsia-100' : 'bg-slate-50 border-b border-slate-200');
  const thText = theme === 'luxury' ? 'text-yellow-500' : (theme === 'vibrant' ? 'text-fuchsia-700' : 'text-slate-500');
  const wrapperBorder = theme === 'luxury' ? 'border-yellow-600/20' : (theme === 'vibrant' ? 'border-fuchsia-100' : 'border-slate-200');
  const divide = theme === 'luxury' ? 'divide-yellow-600/10' : (theme === 'vibrant' ? 'divide-fuchsia-50' : 'divide-slate-100');
  
  return <div className={`overflow-x-auto border ${wrapperBorder} rounded-lg`}><table className="w-full text-left border-collapse"><thead className={theadBg}><tr>{headers.map((header) => <th key={header} className={`px-2 py-2 text-[10px] uppercase font-bold whitespace-nowrap ${thText}`}>{header}</th>)}</tr></thead><tbody className={`divide-y ${divide}`}>{children}</tbody></table></div>; 
}

export default function VoucherPreview() {
  const navigate = useNavigate(); const { id } = useParams(); const [searchParams] = useSearchParams(); const { bookings, quotations, hotels, fetchRecord } = useApp();
  useEffect(() => { fetchRecord('bookings', id).catch(() => {}); }, [id, fetchRecord]);
  const booking = bookings.find((item) => item.id === id); const [page, setPage] = useState(1); const [downloadingPdf, setDownloadingPdf] = useState(false); const [whatsappOpen, setWhatsappOpen] = useState(false);
  const requestedVoucherType = searchParams.get('type') || 'combined';
  const voucherType = Object.prototype.hasOwnProperty.call(SERVICE_VOUCHER_SECTIONS, requestedVoucherType) ? requestedVoucherType : 'combined';
  const voucher = useMemo(() => {
    if (!booking) return null;
    return booking.vouchers?.[voucherType] || (voucherType === 'combined' ? booking.voucher || {} : {});
  }, [booking, voucherType]);
  const [template, setTemplate] = useState(mergeVoucherSettings());
  const [templates, setTemplates] = useState([]);
  const [activeTemplateId, setActiveTemplateId] = useState('');
  const [layoutOverrides, setLayoutOverrides] = useState({});
  const [savingLayout, setSavingLayout] = useState(false);
  const [masters, setMasters] = useState({ destinations: [], sightseeing: [], transfers: [], ferryClasses: [], restaurants: [], yachts: [], vehicles: [], agents: [], b2c: [] });
  const printRef = useRef(null);
  useEffect(() => {
    if (!booking?.quotationId) return;
    fetchRecord('quotations', booking.quotationId).catch(() => {});
  }, [booking?.quotationId, fetchRecord]);
  useEffect(() => {
    let activeRequest = true;
    apiClient.get('/pdf-templates?documentType=voucher&sortBy=updatedAt&sortDir=desc&limit=100&summary=false').then((response) => {
      if (!activeRequest) return;
      const savedTemplates = response.data || [];
      const savedTemplateId = voucher?.template?.templateId;
      const selected = savedTemplates.find((item) => item.id === savedTemplateId) || savedTemplates.find((item) => item.isDefault) || savedTemplates[0];
      setTemplates(savedTemplates);
      if (selected) {
        setActiveTemplateId(selected.id);
        // Editorial layouts have their own configuration schema.
        const isEditorial = ['modern-journey', 'travel-itinerary', 'confirmation-itinerary'].includes(selected.config?._templateType);
        setTemplate(isEditorial ? mergeVoucherSettings() : mergeVoucherSettings(selected.config));
      }
    }).catch((error) => toast.error(error.message || 'Unable to load voucher templates.'));
    return () => { activeRequest = false; };
  }, [voucher?.template?.templateId]);
  useEffect(() => { setLayoutOverrides({}); }, [activeTemplateId]);
  useEffect(() => {
    let activeRequest = true;
    Promise.all([
      apiClient.get('/operations-masters/destinations'), apiClient.get('/sightseeing-module'), apiClient.get('/operations-masters/transfers'),
      apiClient.get('/operations-masters/ferry-classes'), apiClient.get('/activity-masters/restaurants'), apiClient.get('/yachts'), apiClient.get('/operations-masters/vehicles'),
      apiClient.get('/agents?limit=100&summary=false'), apiClient.get('/b2c?limit=100&summary=false'),
    ]).then(([destinations, sightseeing, transfers, ferryClasses, restaurants, yachts, vehicles, agents, b2c]) => {
      if (activeRequest) setMasters({ destinations: destinations.data || [], sightseeing: sightseeing.data || [], transfers: transfers.data || [], ferryClasses: ferryClasses.data || [], restaurants: restaurants.data || [], yachts: yachts.data || [], vehicles: vehicles.data || [], agents: agents.data || [], b2c: b2c.data || [] });
    }).catch(() => {});
    return () => { activeRequest = false; };
  }, []);
  const linkedQuotation = quotations.find((item) => item.id === booking?.quotationId);
  const rows = useMemo(() => booking ? dataRows(booking, masters, linkedQuotation, hotels, voucher, voucherType) : null, [booking, masters, linkedQuotation, hotels, voucher, voucherType]);
  if (!booking || !rows) return <div className="p-10 text-center text-slate-500">Booking not found.</div>;
  const enrichedServices = [...rows.activities, ...rows.transfers];
  const enrichedServicesById = new Map(enrichedServices.flatMap((service) => [
    [String(service.id || ''), service],
    [String(service._id || ''), service],
  ]).filter(([key]) => key));
  const fallbackVoucherServices = voucherType === 'sightseeing'
    ? rows.activities
    : voucherType === 'transfer'
      ? rows.transfers
      : voucherType === 'other'
        ? rows.activities
        : enrichedServices;
  // Older vouchers can have no saved service rows.  Pass the already enriched
  // rows in that case so editorial templates never fall back to a booking's
  // stale general sightseeing image.
  const visibleRenderServices = ((voucher.services || []).length
    ? voucher.services.map((service) => enrichedServicesById.get(String(service.id || service._id || '')) || service)
    : fallbackVoucherServices).filter(isVisibleInVoucher);
  const renderVoucher = {
    ...voucher,
    // Payment confirmations live on the booking line. Use the merged hotel
    // rows for every template so an older voucher snapshot cannot hide one.
    flights: rows.flights,
    guests: rows.guests,
    hotels: rows.hotels,
    services: visibleRenderServices,
    itinerary: rows.itinerary,
  };
  const selectedTemplate = templates.find((item) => item.id === activeTemplateId);
  const baseTemplate = mergeVoucherSettings(selectedTemplate
    ? { ...selectedTemplate.config, templateName: selectedTemplate.name, templateId: selectedTemplate.id }
    : voucher.template || template);
  const activeTemplate = mergeVoucherSettings({ ...baseTemplate, ...layoutOverrides });
  const changeLayout = (key, value) => setLayoutOverrides((current) => ({ ...current, [key]: value }));
  const saveLayout = async () => {
    if (!selectedTemplate?.id) return toast.error('Select a saved voucher template before saving its layout.');
    setSavingLayout(true);
    try {
      const payload = {
        name: selectedTemplate.name,
        description: selectedTemplate.description || '',
        documentType: 'voucher',
        config: { ...selectedTemplate.config, ...layoutOverrides },
        isDefault: Boolean(selectedTemplate.isDefault),
        isFavorite: Boolean(selectedTemplate.isFavorite),
      };
      const response = await apiClient.put(`/pdf-templates/${selectedTemplate.id}`, payload);
      setTemplates((current) => current.map((item) => item.id === selectedTemplate.id ? response.data : item));
      setLayoutOverrides({});
      toast.success('Voucher print layout saved.');
    } catch (error) {
      toast.error(error.message || 'Unable to save the voucher print layout.');
    } finally {
      setSavingLayout(false);
    }
  };
  const settings = { ...activeTemplate, ...rows.settings };
  const clientRecords = booking.clientType === 'B2C' ? masters.b2c : booking.clientType === 'Agent' ? masters.agents : [...masters.agents, ...masters.b2c];
  const client = clientRecords.find((item) => String(item.id || item._id) === String(booking.agentId || '')) || clientRecords.find((item) => normalized(item.name || item.companyName) === normalized(booking.agentName));
  const brand = {
    name: client?.companyName || client?.name || booking.agentName || activeTemplate.companyName,
    logo: clientLogo(client),
    phone: client?.phone || client?.mobile || client?.mobileNumber || client?.contactNumber || '',
    email: client?.email || client?.contactEmail || '',
    website: client?.website || client?.webSite || '',
    isAgent: booking.clientType === 'Agent',
  };
  const guest = rows.guests[0] || { name: booking.guestName, phone: booking.guestPhone, email: booking.guestEmail };
  // Older booking snapshots may not retain the guest contact fields. Use the
  // linked quotation and then the selected client as safe fallbacks, but keep
  // the contact row visible even if a record still needs to be completed.
  const contactPhone = guest.phone || booking.guestPhone || linkedQuotation?.guestPhone || client?.phone || client?.mobile || '—';
  const contactEmail = guest.email || booking.guestEmail || linkedQuotation?.guestEmail || client?.email || '—';
  const voucherFooterContact = brand.isAgent
    ? [brand.phone, brand.email, brand.website].filter(Boolean).join(' · ')
    : activeTemplate.emergencyText;
  const hasHotelSpecialRequest = rows.hotels.some((hotel) => String(hotel.specialRequest || hotel.specialRequests || '').trim());
  const sightseeingWatermarkImage = voucherType === 'sightseeing' ? attachmentUrl(rows.activities.map((item) => item.imageUrl || item.image || item.images)) : '';
  const whatsapp = () => setWhatsappOpen(true);
  const email = () => { if (!guest.email) return toast.error('Add a guest email before sharing.'); window.location.href = `mailto:${encodeURIComponent(guest.email)}?subject=${encodeURIComponent(`TripNest voucher - ${booking.id}`)}&body=${encodeURIComponent(`Your booking voucher ${booking.id} is ready.`)}`; };
  const selectTemplate = (templateId) => {
    const selected = templates.find((item) => item.id === templateId);
    if (!selected) return;
    setActiveTemplateId(templateId);
    setTemplate(mergeVoucherSettings(selected.config));
  };
  const coverInfoCards = [
    { icon: <PlaneLanding className="w-5 h-5 text-white" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }} />, label: 'ARRIVAL', value: displayDate(booking.arrivalDate), color: '#14a09a', shadow: '#0e8a85', bg: '#eff6ff' },
    { icon: <PlaneTakeoff className="w-5 h-5 text-white" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }} />, label: 'DEPARTURE', value: displayDate(booking.departureDate), color: '#ef4444', shadow: '#dc2626', bg: '#fef2f2' },
    { icon: <MapPin className="w-5 h-5 text-white" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }} />, label: 'DESTINATION', value: cell(booking.destination || booking.destinations?.join(', ')), color: '#10b981', shadow: '#059669', bg: '#f0fdf4' },
    { icon: <Users className="w-5 h-5 text-white" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }} />, label: 'GUESTS', value: `${booking.adults || 0} Adult · ${booking.children || 0} Child`, color: '#f59e0b', shadow: '#d97706', bg: '#fffbeb' },
  ];
  const isLuxury = activeTemplate?.theme === 'luxury';
  const isVibrant = activeTemplate?.theme === 'vibrant';
  // Client vouchers should contain only information that was actually saved
  // for this booking.  Keeping this map next to the page definitions also
  // makes every non-editorial template follow the same rule.
  const hasTextContent = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim().length > 0;
  const hasVoucherTerms = hasSelectedVoucherTerms(voucher);
  const sectionHasData = {
    cover: true,
    flights: rows.flights.length > 0,
    hotels: rows.hotels.length > 0,
    transfers: rows.transfers.length > 0,
    activities: rows.activities.length > 0,
    notes: hasTextContent(voucher.termsHtml || activeTemplate.importantNotes),
    itinerary: rows.itinerary.length > 0,
  };
  const pages = [
    <div key="cover" className="voucher-page rounded-xl overflow-hidden" style={isLuxury ? { background: '#111', border: '1px solid rgba(212,175,55,0.3)', boxShadow: '0 0 30px rgba(212,175,55,0.08)' } : isVibrant ? { background: '#fff', border: '1px solid #e879f9', boxShadow: '0 4px 24px rgba(236,72,153,0.1)' } : { background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <DynamicHeader booking={booking} title="Guest Details" />
      {/* Hero Section */}
      <div className="relative overflow-hidden flex flex-col items-center justify-center py-10 px-6 text-center" style={{ minHeight: 250 }}>
        {/* Background Image */}
        <img src={VoucherBg} alt="Background" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
        {/* Overlay */}
        <div style={{ position: 'absolute', inset: 0, background: isLuxury ? 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 60%, rgba(10,10,10,0.95) 100%)' : 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 60%, rgba(255,255,255,1) 100%)', zIndex: 1 }} />
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center w-full">
          <div className="mb-4 relative" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', width: 100, height: 100, background: isLuxury ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,1)', borderRadius: '50%', filter: 'blur(20px)', zIndex: 0 }}></div>
            <div style={{ position: 'relative', zIndex: 1, width: 72, height: 72, borderRadius: '50%', border: isLuxury ? '3px solid #d4af37' : '4px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isLuxury ? 'rgba(212,175,55,0.15)' : '#ffffff', boxShadow: isLuxury ? '0 0 20px rgba(212,175,55,0.3)' : '0 4px 12px rgba(0,0,0,0.05)' }}>
              <Check className="w-10 h-10" style={{ color: isLuxury ? '#d4af37' : '#16a34a', strokeWidth: 3 }} />
            </div>
          </div>
          <h1 className="font-bold" style={{ fontSize: 32, fontFamily: 'Georgia, "Times New Roman", serif', color: isLuxury ? '#f0e6c0' : '#0f172a', letterSpacing: '-0.5px' }}>
            Welcome to <span style={{ color: isLuxury ? '#d4af37' : '#0b6f6b' }}>{booking.destination || booking.destinations?.[0] || 'Thailand'}</span>
          </h1>
          <div className="flex items-center gap-2 my-2">
            <div style={{ width: 40, height: 1, background: 'rgba(212,170,58,0.5)' }} />
            <span style={{ color: '#d4aa3a', fontSize: 14 }}>❋</span>
            <div style={{ width: 40, height: 1, background: 'rgba(212,170,58,0.5)' }} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 500, color: isLuxury ? '#a89060' : '#64748b' }}>{activeTemplate.preparedForLabel} <b style={{ color: isLuxury ? '#f0e6c0' : '#0f172a' }}>{guest.name || booking.guestName}</b></p>
          <div style={{ marginTop: 4, fontSize: 10, fontWeight: 500, color: isLuxury ? '#7a6040' : '#475569', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 12px' }}>
            <span>Phone: <b style={{ color: isLuxury ? '#d4af37' : '#0f172a' }}>{contactPhone}</b></span>
            <span>Email: <b style={{ color: isLuxury ? '#d4af37' : '#0f172a' }}>{contactEmail}</b></span>
          </div>
        </div>
      </div>
      {/* Info Cards */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-5">
          {coverInfoCards.map((card) => (
            <div key={card.label} className="flex items-center gap-3 rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] cursor-default"
              style={isLuxury
                ? { background: '#1a1a1a', border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }
                : { backgroundColor: card.bg, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: isLuxury ? 'linear-gradient(135deg, #b8962e, #d4af37)' : `linear-gradient(135deg, ${card.color}, ${card.shadow})`,
                boxShadow: isLuxury ? '0 4px 12px rgba(212,175,55,0.2)' : `0 4px 0 ${card.shadow}, 0 8px 16px rgba(0,0,0,0.1)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'translateY(-2px)'
              }}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <div style={{ fontSize: 10, fontWeight: 800, color: isLuxury ? '#7a6040' : '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{card.label}</div>
                <div style={{ fontSize: 15, fontWeight: 900, color: isLuxury ? '#f0e6c0' : '#0f172a', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.value}</div>
              </div>
            </div>
          ))}
        </div>
        {/* Guest List */}
        <div style={{ borderRadius: 12, overflow: 'hidden', border: isLuxury ? '1px solid rgba(212,175,55,0.25)' : '1px solid #e2e8f0' }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ background: isLuxury ? 'linear-gradient(90deg, #0a0a0a, #1a1a1a)' : 'linear-gradient(90deg, #1e3a8a, #0b6f6b)', borderBottom: isLuxury ? '1px solid rgba(212,175,55,0.3)' : 'none' }}>
            <Users className="w-4 h-4" style={{ color: isLuxury ? '#d4af37' : '#fff' }} />
            <span style={{ fontWeight: 900, color: isLuxury ? '#d4af37' : '#fff', fontSize: 13, fontFamily: isLuxury ? 'Georgia, serif' : 'inherit', letterSpacing: isLuxury ? '0.05em' : 'normal' }}>Guest List</span>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ background: isLuxury ? '#161616' : '#f8fafc', borderBottom: isLuxury ? '1px solid rgba(212,175,55,0.15)' : 'none' }}>
                {['#','Guest','Gender','Passport no.','Date of birth','Age','Nationality'].map((h) => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: isLuxury ? '#b8962e' : '#64748b' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.guests.length ? rows.guests.map((item, index) => (
                <tr key={item.id || index} style={{ background: isLuxury ? (index % 2 === 0 ? '#1a1a1a' : '#151515') : (index % 2 === 0 ? '#fff' : '#f8fafc'), borderBottom: isLuxury ? '1px solid rgba(212,175,55,0.07)' : '1px solid #f1f5f9' }}>
                  <Td>{index + 1}</Td>
                  <Td><div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, minWidth: 0 }}><span style={{ fontWeight: 600, color: isLuxury ? '#f0e6c0' : '#1e293b', overflowWrap: 'anywhere' }}>{voucherGuestName(item, booking)}</span>{item.isLeader && <span style={{ flex: '0 0 auto', borderRadius: 20, padding: '1px 8px', fontSize: 9, fontWeight: 700, background: isLuxury ? 'rgba(212,175,55,0.2)' : '#fef3c7', color: isLuxury ? '#d4af37' : '#92400e', border: isLuxury ? '1px solid rgba(212,175,55,0.3)' : 'none' }}>👑 Leader</span>}</div></Td>
                  <Td>{cell(item.gender)}</Td>
                  <Td>{settings.showPassport ? cell(item.passport) : 'Hidden'}</Td>
                  <Td>{settings.showDOB ? displayDate(item.dob) : 'Hidden'}</Td>
                  <Td>{ageFromDOB(item.dob)}</Td>
                  <Td>{cell(item.nationality)}</Td>
                </tr>
              )) : <tr><td colSpan="7"><Empty text="No guest details have been added." /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    sectionHasData.flights && <Page booking={booking} page={2} title="Flights Details"><Title icon={Plane} text="Flights Details" /><Table headers={['Date','Airline / Flight No.','From Sector','To Sector','Departure','Arrival','Price']}>{rows.flights.map((item, index) => <tr key={item.id || index}><Td>{displayDate(item.date)}</Td><Td>{cell(item.airlineFlight || [item.airline, item.flightNo].filter(Boolean).join(' '))}</Td><Td>{cell(item.fromSector || item.sector)}</Td><Td>{cell(item.toSector)}</Td><Td>{cell(item.departure)}</Td><Td>{cell(item.arrival)}</Td><Td>{item.price === undefined || item.price === '' ? '—' : cell(item.price)}</Td></tr>)}</Table></Page>,
    sectionHasData.hotels && <Page booking={booking} page={3} title="Hotel Details"><Title icon={Hotel} text="Hotel Details" /><Table headers={['Hotel','Destination','Check in','Check out','Nights','Room type','Room allocation','Meal', ...(hasHotelSpecialRequest ? ['Special request'] : []), 'Confirmation no.']}>{rows.hotels.map((item, index) => <tr key={item.id || index}><Td>{cell(item.name || item.hotel)}</Td><Td>{cell(item.itineraryDestination || item.city)}</Td><Td>{displayDate(item.checkIn)}</Td><Td>{displayDate(item.checkOut)}</Td><Td>{nightsBetween(item.checkIn, item.checkOut)}</Td><Td>{cell(item.roomType)}</Td><Td>{hotelRoomAllocationText(item, booking)}</Td><Td>{cell(item.mealPlan)}</Td>{hasHotelSpecialRequest && <Td>{cell(item.specialRequest || item.specialRequests)}</Td>}<Td>{cell(item.confirmationNo || item.confirmationNumber || item.confirmation)}</Td></tr>)}</Table><SectionTerms title="Hotel terms & conditions" type="hotel" /></Page>,
    sectionHasData.transfers && <Page><Title icon={Car} text="Transfer Details" /><Table headers={['Date','Route','Transfer','Flight','Time (Dep-Arr)','Vehicle','Remarks']}>{rows.transfers.map((item, index) => <tr key={item.id || index}><Td>{displayDate(item.date || item.serviceDate)}</Td><Td>{transferRoute(item)}</Td><Td>{cell(item.basis || item.transferType || item.transferKind || item.type)}</Td><Td>{cell(item.flightNo || item.airlineFlight || item.airline)}</Td><Td>{transferTiming(item)}</Td><Td>{cell(vehicleName(item, masters.vehicles))}</Td><Td>{cell(voucherRemarks(item))}</Td></tr>)}</Table><SectionTerms title="Transfer terms & conditions" type="transfer" /></Page>,
    sectionHasData.activities && <Page booking={booking} page={5} title="Sight Seeing Details" watermarkImage={sightseeingWatermarkImage}><Title icon={Calendar} text={voucherType === 'other' ? 'Other Service Details' : 'Sight Seeing Details'} /><Table headers={['Activity name','Type','Date','Pickup from','From time','To time','Drop at','Drop time','Remarks']}>{rows.activities.map((item, index) => <tr key={item.id || index}><Td>{cell(item.name || item.variantName)}</Td><Td>{cell(item.basis || item.type)}</Td><Td>{displayDate(item.date || item.serviceDate)}</Td><Td>{cell(item.pickupFrom || item.pickupPoint || item.origin || item.fromSector)}</Td><Td>{cell(item.fromTime || item.pickupTime || item.time || item.departure)}</Td><Td>{cell(item.toTime || item.serviceStartTime)}</Td><Td>{cell(item.dropAt || item.dropPoint || item.dropOff || item.dropTo || item.destination || item.toSector)}</Td><Td>{cell(item.dropUpTime || item.dropTime || item.arrival)}</Td><Td>{cell(voucherRemarks(item))}</Td></tr>)}</Table><ActivityGallery items={rows.activities} /><SectionTerms title="Sightseeing terms & conditions" type="sightseeing" /></Page>,
    sectionHasData.notes && <Page booking={booking} page={6} title="Important Notes"><Title icon={FileText} text="Important Notes" /><Notes /></Page>,
    sectionHasData.itinerary && <Page booking={booking} page={7} title="Day Wise Iternry"><Title icon={Calendar} text="Day Wise Iternry" /><div className="space-y-4">{rows.itinerary.map((item, index) => <ItineraryDay key={item.id || index} item={item} index={index} hotels={rows.hotels} vehicles={masters.vehicles} />)}</div><div style={{ marginTop: 16, borderRadius: 8, padding: 12, fontSize: 12, ...(isLuxury ? { background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: '#a89060' } : { background: '#172554', color: '#bfdbfe' }) }}><b style={{ color: isLuxury ? '#d4af37' : '#fff' }}>{brand.isAgent ? brand.name : activeTemplate.companyName}</b>{voucherFooterContact && <><br />{voucherFooterContact}</>}</div></Page>,
  ];
  const allowedSections = SERVICE_VOUCHER_SECTIONS[voucherType];
  const availableSectionKeys = VOUCHER_SECTIONS.filter(([key]) => allowedSections.includes(key) && sectionHasData[key] && activeTemplate.sections[key] && (key !== 'itinerary' || settings.showDayWiseItinerary !== false)).map(([key]) => key);
  const savedSectionOrder = Array.isArray(activeTemplate.sectionOrder) ? activeTemplate.sectionOrder : [];
  const sectionOrder = [...savedSectionOrder.filter((key) => availableSectionKeys.includes(key)), ...availableSectionKeys.filter((key) => !savedSectionOrder.includes(key))];
  const pageBySection = Object.fromEntries(VOUCHER_SECTIONS.map(([key], index) => [key, pages[index]]));
  const visiblePages = sectionOrder.map((key) => pageBySection[key]).filter(Boolean);
  const safePage = Math.min(page, Math.max(visiblePages.length, 1));
  const prepareVoucherPrintSource = (source) => {
    // The confirmation template is rendered section by section for preview
    // navigation. Keep its combined print and direct-download layout flowing.
    if (!source.querySelector('.civ-root')) return;
    const flowStyle = document.createElement('style');
    flowStyle.textContent = `
      .civ-page { min-height: 0 !important; height: auto !important; overflow: visible !important; page-break-after: auto !important; break-after: auto !important; }
      .civ-footer, .civ-footer-1, .civ-footer-2 { position: static !important; margin-top: 0 !important; }
    `;
    source.prepend(flowStyle);
    const confirmationRoots = [...source.querySelectorAll('.civ-root')];
    confirmationRoots.slice(0, -1).forEach((root) => {
      root.querySelectorAll('.civ-footer, .civ-footer-1, .civ-footer-2').forEach((footer) => { footer.style.display = 'none'; });
    });
  };
  const downloadPdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      await downloadPdfFromElement(
        printRef.current,
        voucherPdfFilename(booking, { ...voucher, voucherType }),
        prepareVoucherPrintSource,
        { ...pdfLayoutOptionsFromConfig(activeTemplate), backgroundColor: activeTemplate?.theme === 'luxury' ? '#111111' : '#ffffff' },
      );
      toast.success('Voucher PDF downloaded.');
    } catch (error) {
      toast.error(error.message || 'Unable to download the voucher PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };
  const printPdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      await printPdfDocument(
        printRef.current,
        voucherPdfFilename(booking, { ...voucher, voucherType }),
        prepareVoucherPrintSource,
        { ...pdfLayoutOptionsFromConfig(activeTemplate), backgroundColor: activeTemplate?.theme === 'luxury' ? '#111111' : '#ffffff' },
      );
      toast.success('Chrome print dialog opened.');
    } catch (error) {
      toast.error(error.message || 'Unable to open the voucher print dialog.');
    } finally {
      setDownloadingPdf(false);
    }
  };
  // A template is a document design, not a combined-voucher-only setting.  The
  // selected editorial design must therefore also render hotel and every other
  // individual voucher scope.
  const editorialTemplateType = selectedTemplate?.config?._templateType || '';
  const isEditorialTemplate = ['modern-journey', 'travel-itinerary', 'confirmation-itinerary'].includes(editorialTemplateType);
  const editorialSettings = isEditorialTemplate ? { ...selectedTemplate.config, ...layoutOverrides } : null;
  const EditorialVoucher = editorialTemplateType === 'confirmation-itinerary' ? ConfirmationItineraryVoucher : editorialTemplateType === 'travel-itinerary' ? TravelItineraryVoucher : ModernJourneyVoucher;
  const confirmationSectionDefinitions = [
    ['cover', 'Guest Details'], ['flights', 'Flights Details'], ['hotels', 'Hotel Details'],
    ['transfers', 'Transfer Details'], ['tours', 'Sight Seeing Details'], ['importantNotes', 'Important Notes'], ['itinerary', 'Day Wise Itinerary'],
  ];
  const confirmationSectionHasData = {
    cover: true,
    flights: rows.flights.length > 0,
    hotels: rows.hotels.length > 0,
    transfers: rows.transfers.length > 0,
    tours: rows.activities.length > 0,
    importantNotes: hasVoucherTerms,
    itinerary: rows.itinerary.length > 0,
  };
  const availableConfirmationSections = editorialTemplateType === 'confirmation-itinerary'
    ? confirmationSectionDefinitions.filter(([key]) => (
      allowedSections.includes(CONFIRMATION_SECTION_TO_VOUCHER_SECTION[key])
      && confirmationSectionHasData[key]
      && editorialSettings?.sections?.[key] !== false
    ))
    : [];
  const confirmationSavedOrder = Array.isArray(editorialSettings?.sectionOrder) ? editorialSettings.sectionOrder : [];
  const confirmationSections = [
    ...confirmationSavedOrder.map((key) => availableConfirmationSections.find(([sectionKey]) => sectionKey === key)).filter(Boolean),
    ...availableConfirmationSections.filter(([key]) => !confirmationSavedOrder.includes(key)),
  ];
  const safeConfirmationPage = Math.min(Math.max(page, 1), Math.max(confirmationSections.length, 1));
  const activeConfirmationSection = confirmationSections[safeConfirmationPage - 1]?.[0] || 'cover';

  // For Modern Journey: show the full-document renderer in a scrollable canvas, each page visible
  if (isEditorialTemplate) {
    return (
      <div className="flex h-full overflow-hidden">
        {whatsappOpen && <WhatsAppSendDialog title="Send voucher by WhatsApp" recipientName={guest.name || booking.guestName} recipientPhone={guest.phone || booking.guestPhone || linkedQuotation?.guests?.[0]?.phone || ''} initialMessage={'Hello ' + (guest.name || booking.guestName || '') + ', your TripNest voucher for booking ' + booking.id + ' is ready.'} onClose={() => setWhatsappOpen(false)} />}
        <style>{VOUCHER_LAYOUT_LIVE_CSS}</style>
        <aside className="w-80 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col print:hidden">
          <div className="p-4 border-b">
            <button onClick={() => navigate(`/bookings/${id}`)} className="text-xs text-slate-500 hover:text-slate-700 flex gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back to booking</button>
            <h1 className="text-sm font-bold text-slate-900 mt-3">{selectedTemplate?.name || 'Voucher'}</h1>
            <p className="text-[10px] text-blue-600">{booking.id}</p>
            <div className="mt-3 rounded-lg bg-slate-50 px-2 py-1.5 text-[10px] font-semibold text-slate-600">{selectedTemplate?.name || 'Default voucher template'}</div>
            <select value={activeTemplateId} onChange={(event) => selectTemplate(event.target.value)} className="form-select mt-2 h-8 w-full text-xs" aria-label="Voucher template">{templates.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isDefault ? ' (Default)' : ''}</option>)}</select>
            <div className="mt-3 px-2 py-1.5 rounded-lg text-[10px] font-semibold" style={{ background: editorialTemplateType === 'confirmation-itinerary' ? '#eff6ff' : '#eff6ff', color: editorialTemplateType === 'confirmation-itinerary' ? '#0b6f6b' : '#173B8F' }}>{editorialTemplateType === 'confirmation-itinerary' ? 'Confirmation Itinerary Voucher' : editorialTemplateType === 'travel-itinerary' ? 'Travel Itinerary Voucher' : 'Modern Journey Voucher'}</div>
          </div>
          {editorialTemplateType === 'confirmation-itinerary' && <nav className="flex-1 overflow-y-auto p-2 border-b border-slate-100">
            <div className="px-2 pt-1 pb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Voucher sections</div>
            {confirmationSections.map(([key, label], index) => <button key={key} onClick={() => setPage(index + 1)} className={`mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition ${safeConfirmationPage === index + 1 ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' : 'text-slate-600 hover:bg-slate-50'}`}><span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${safeConfirmationPage === index + 1 ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{index + 1}</span>{label}</button>)}
          </nav>}
          <VoucherPrintLayoutControls layout={activeTemplate} onChange={changeLayout} onSave={saveLayout} saving={savingLayout} />
          <div className="p-3 border-t space-y-2">
            <div className="grid grid-cols-2 gap-2"><button onClick={downloadPdf} disabled={downloadingPdf} className="btn-primary h-8 text-xs disabled:opacity-60"><Download className="w-3.5 h-3.5" /> {downloadingPdf ? 'Preparing...' : 'Download PDF'}</button><button onClick={printPdf} disabled={downloadingPdf} className="btn-secondary h-8 text-xs disabled:opacity-60"><Printer className="w-3.5 h-3.5" /> Print PDF</button></div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={whatsapp} className="btn-secondary h-8 text-xs"><MessageSquare className="w-3.5 h-3.5" /> WhatsApp</button>
              <button onClick={email} className="btn-secondary h-8 text-xs"><Mail className="w-3.5 h-3.5" /> Email</button>
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-auto p-6 bg-slate-100">
          <div className="mx-auto" style={{ width: 'fit-content', ...voucherPreviewCanvasStyle(activeTemplate) }}>
            {editorialTemplateType === 'confirmation-itinerary'
              ? <ConfirmationItineraryVoucher settings={editorialSettings} booking={booking} voucher={renderVoucher} brand={brand} data={rows} destinations={masters.destinations} sectionKey={activeConfirmationSection} />
              : <EditorialVoucher settings={editorialSettings} booking={booking} voucher={renderVoucher} brand={brand} />}
          </div>
        </main>
        <div ref={printRef} aria-hidden="true" style={{ position: 'fixed', left: '-9999px', width: '210mm', pointerEvents: 'none' }}>
          {editorialTemplateType === 'confirmation-itinerary'
            ? confirmationSections.map(([key]) => <ConfirmationItineraryVoucher key={key} settings={editorialSettings} booking={booking} voucher={renderVoucher} brand={brand} data={rows} destinations={masters.destinations} sectionKey={key} />)
            : <EditorialVoucher settings={editorialSettings} booking={booking} voucher={renderVoucher} brand={brand} />}
        </div>
      </div>
    );
  }

  return (
    <VoucherConfigContext.Provider value={{ template: activeTemplate, sectionOrder, brand, termsHtml: voucher.termsHtml, voucherType, serviceTerms: { hotel: voucher.hotelTermsHtml, sightseeing: voucher.sightseeingTermsHtml, transfer: voucher.transferTermsHtml } }}>
      {whatsappOpen && <WhatsAppSendDialog title="Send voucher by WhatsApp" recipientName={guest.name || booking.guestName} recipientPhone={guest.phone || booking.guestPhone || linkedQuotation?.guests?.[0]?.phone || ''} initialMessage={'Hello ' + (guest.name || booking.guestName || '') + ', your TripNest voucher for booking ' + booking.id + ' is ready.'} onClose={() => setWhatsappOpen(false)} />}
      <div className="flex h-full overflow-hidden">
        <style>{VOUCHER_LAYOUT_LIVE_CSS}</style>
        <aside className="w-80 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col print:hidden">
          <div className="p-4 border-b">
            <button onClick={() => navigate(`/bookings/${id}`)} className="text-xs text-slate-500 hover:text-slate-700 flex gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back to booking</button>
            <h1 className="text-sm font-bold text-slate-900 mt-3">{SERVICE_VOUCHER_LABELS[voucherType]}</h1>
            <p className="text-[10px] text-blue-600">{booking.id}</p>
            <select value={activeTemplateId} onChange={(event) => selectTemplate(event.target.value)} className="form-select mt-3 h-8 w-full text-xs" aria-label="Voucher template">
              {templates.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isDefault ? ' (Default)' : ''}</option>)}
            </select>
          </div>
          <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
            {sectionOrder.map((key, index) => {
              const label = VOUCHER_SECTIONS.find(([sectionKey]) => sectionKey === key)?.[1] || key;
              return <button key={key} onClick={() => setPage(index + 1)} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${safePage === index + 1 ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                  {index + 1}. {label}
                </button>
            })}
          </nav>
          <VoucherPrintLayoutControls layout={activeTemplate} onChange={changeLayout} onSave={saveLayout} saving={savingLayout} />
          <div className="p-3 border-t space-y-2">
            <div className="grid grid-cols-2 gap-2"><button onClick={downloadPdf} disabled={downloadingPdf} className="btn-primary h-8 text-xs disabled:opacity-60"><Download className="w-3.5 h-3.5" /> {downloadingPdf ? 'Preparing...' : 'Download PDF'}</button><button onClick={printPdf} disabled={downloadingPdf} className="btn-secondary h-8 text-xs disabled:opacity-60"><Printer className="w-3.5 h-3.5" /> Print PDF</button></div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={whatsapp} className="btn-secondary h-8 text-xs"><MessageSquare className="w-3.5 h-3.5" /> WhatsApp</button>
              <button onClick={email} className="btn-secondary h-8 text-xs"><Mail className="w-3.5 h-3.5" /> Email</button>
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-auto p-6 bg-slate-100">
          <div className="max-w-3xl mx-auto" style={voucherPreviewCanvasStyle(activeTemplate)}>
            {visiblePages[safePage - 1] || <Empty text="Enable at least one voucher section in Voucher Settings." />}
            <div className="mt-4 flex justify-between print:hidden">
              <button onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1} className="btn-secondary h-8 text-xs disabled:opacity-40"><ChevronLeft className="w-3.5 h-3.5" /> Previous</button>
              <span className="text-xs text-slate-500">Section {safePage} of {visiblePages.length}</span>
              <button onClick={() => setPage(Math.min(visiblePages.length, safePage + 1))} disabled={safePage === visiblePages.length} className="btn-secondary h-8 text-xs disabled:opacity-40">Next <ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </main>
        <div ref={printRef} aria-hidden="true" style={{ position: 'fixed', left: '-9999px', width: '210mm', pointerEvents: 'none' }}>
          {visiblePages.map((documentPage, index) => <div key={sectionOrder[index] || index} className="voucher-section">{documentPage}</div>)}
        </div>
      </div>
    </VoucherConfigContext.Provider>
  );
}
function VoucherPrintLayoutControls({ layout, onChange, onSave, saving }) {
  const footerGap = Number(layout.pdfFooterGapPercent || 10);
  return <details className="border-t border-slate-100 bg-slate-50 px-3 py-2">
    <summary className="cursor-pointer text-xs font-bold text-slate-700">Print layout</summary>
    <div className="mt-3 space-y-3">
      <p className="text-[10px] leading-relaxed text-slate-500">Changes update this voucher immediately. Save to reuse them on this template.</p>
      <VoucherLayoutRange label="Side margin" value={layout.pdfSideMarginMm} min={0} max={20} step={0.5} suffix=" mm" onChange={(value) => onChange('pdfSideMarginMm', value)} />
      <VoucherLayoutRange label="Top margin" value={layout.pdfTopMarginMm} min={0} max={20} step={0.5} suffix=" mm" onChange={(value) => onChange('pdfTopMarginMm', value)} />
      <VoucherLayoutRange label="Content scale" value={layout.pdfContentScalePercent} min={75} max={100} suffix="%" onChange={(value) => onChange('pdfContentScalePercent', value)} />
      <VoucherLayoutRange label="Card padding" value={layout.pdfCardPaddingPercent} min={75} max={125} suffix="%" onChange={(value) => onChange('pdfCardPaddingPercent', value)} />
      <VoucherLayoutRange label="Card spacing" value={layout.pdfCardSpacingPercent} min={70} max={140} suffix="%" onChange={(value) => onChange('pdfCardSpacingPercent', value)} />
      <VoucherLayoutRange label="Footer gap" value={footerGap} min={0} max={30} suffix="%" onChange={(value) => onChange('pdfFooterGapPercent', value)} />
      <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-700">
        Keep complete cards together
        <input type="checkbox" checked={layout.pdfKeepSectionsTogether !== false} onChange={(event) => onChange('pdfKeepSectionsTogether', event.target.checked)} className="h-4 w-4 accent-blue-600" />
      </label>
      <button type="button" onClick={onSave} disabled={saving} className="btn-primary h-8 w-full text-xs disabled:opacity-60"><Save className="h-3.5 w-3.5" /> {saving ? 'Saving layout…' : 'Save layout to template'}</button>
    </div>
  </details>;
}
function VoucherLayoutRange({ label, value, min, max, step = 1, suffix = '', onChange }) {
  const numeric = Math.max(min, Math.min(max, Number(value ?? min)));
  return <label className="block"><span className="mb-1 flex justify-between text-[10px] font-semibold text-slate-600"><span>{label}</span><span className="text-blue-700">{numeric}{suffix}</span></span><input type="range" min={min} max={max} step={step} value={numeric} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-blue-600" /></label>;
}
function Td({ children }) {
  const { template } = React.useContext(VoucherConfigContext);
  const textColor = template?.theme === 'luxury' ? 'text-slate-300' : 'text-slate-700';
  return <td className={`px-2 py-2 text-[11px] ${textColor}`}>{children}</td>; 
}
function Info({ label, value }) {
  const { template } = React.useContext(VoucherConfigContext);
  const theme = template?.theme || 'simple';
  if (theme === 'luxury') {
    return <div style={{ background: '#1e1e1e', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8 }} className="p-3"><div style={{ fontSize: 9, fontWeight: 800, color: '#b8962e', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div><div style={{ fontSize: 12, fontWeight: 700, color: '#f0e6c0', marginTop: 2 }}>{value}</div></div>;
  }
  if (theme === 'vibrant') {
    return <div className="bg-fuchsia-50 rounded-lg p-3 border border-fuchsia-100"><div className="text-[9px] uppercase font-bold text-fuchsia-400">{label}</div><div className="text-xs font-bold text-slate-800 mt-1">{value}</div></div>;
  }
  return <div className="bg-slate-50 rounded-lg p-3"><div className="text-[9px] uppercase font-bold text-slate-400">{label}</div><div className="text-xs font-bold text-slate-800 mt-1">{value}</div></div>;
}
function Title({ icon: Icon, text }) { 
  const { template } = React.useContext(VoucherConfigContext);
  const theme = template?.theme || 'simple';
  
  if (theme === 'luxury') {
    return (
      <div className="flex items-center gap-3 mb-4 mt-8 first:mt-0" style={{ breakBefore: 'auto', pageBreakBefore: 'auto' }}>
        <span className="w-8 h-8 rounded border border-yellow-600/50 bg-[#222] grid place-items-center shadow-[0_0_10px_rgba(212,175,55,0.15)]"><Icon className="w-4 h-4 text-yellow-500" /></span>
        <h2 className="text-base font-serif font-bold text-yellow-500 uppercase tracking-widest">{text}</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-yellow-600/30 to-transparent ml-4" />
      </div>
    );
  }
  
  if (theme === 'vibrant') {
    return (
      <div className="flex items-center gap-3 mb-4 mt-8 first:mt-0" style={{ breakBefore: 'auto', pageBreakBefore: 'auto' }}>
        <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-fuchsia-400 to-blue-500 grid place-items-center shadow-md shadow-fuchsia-200"><Icon className="w-4 h-4 text-white" /></span>
        <h2 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-blue-600 tracking-tight">{text}</h2>
      </div>
    );
  }

  // simple
  return <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0" style={{ breakBefore: 'auto', pageBreakBefore: 'auto' }}><span className="w-7 h-7 rounded-full bg-blue-600 grid place-items-center"><Icon className="w-4 h-4 text-white" /></span><h2 className="text-sm font-black text-slate-800">{text}</h2></div>; 
}
function Photo({ src, title, fallback: Icon }) { const imageUrl = attachmentUrl(src); return <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-slate-100 relative">{imageUrl ? <img src={imageUrl} alt={title} className="w-full h-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <Icon className="w-8 h-8 text-slate-300 absolute inset-0 m-auto" />}<div className="absolute inset-x-0 bottom-0 px-2 py-1 bg-black/55 text-white text-[9px] font-bold truncate">{title}</div></div>; }
function ActivityGallery({ items }) {
  if (!items.length) return null;
  const total = items.length;
  const spanFor = (index) => {
    if (total === 1) return 'col-span-6';
    if (total === 2) return 'col-span-3';
    const remaining = total - index;
    if (total % 3 === 1 && remaining === 1) return 'col-span-6';
    if (total % 3 === 2 && remaining <= 2) return 'col-span-3';
    return 'col-span-2';
  };
  return <div className="mt-4 grid grid-cols-6 gap-2">{items.map((item, index) => <div key={item.id || index} className={spanFor(index)}><Photo src={item.image?.url || item.imageUrl} title={item.name || item.variantName} fallback={Calendar} /></div>)}</div>;
}
function ItineraryDay({ item, index, hotels, vehicles }) {
  const { template } = React.useContext(VoucherConfigContext);
  const theme = template?.theme || 'simple';
  const dayNumber = item.day || index + 1;
  const dayDate = displayDate(item.date);

  if (theme === 'luxury') {
    return (
      <section className="overflow-hidden rounded-xl itinerary-day" style={{ breakInside: 'avoid', pageBreakInside: 'avoid', border: '1px solid rgba(212,175,55,0.25)', background: '#1a1a1a' }}>
        <div className="flex gap-3 px-3 py-3" style={{ borderBottom: '1px solid rgba(212,175,55,0.2)', background: '#111' }}>
          <span className="h-9 w-9 flex-shrink-0 grid place-items-center text-xs font-bold font-serif" style={{ borderRadius: '50%', background: 'linear-gradient(135deg, #b8962e, #d4af37)', color: '#0a0a0a', flexShrink: 0 }}>D{dayNumber}</span>
          <div className="min-w-0">
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#d4af37' }}>{dayDate || `Day ${dayNumber}`}{item.destination ? ` · ${item.destination}` : ''}</div>
            <h3 style={{ marginTop: 2, fontSize: 13, fontWeight: 700, color: '#f0e6c0', fontFamily: 'Georgia, serif' }}>{item.title || `Day ${dayNumber} itinerary`}</h3>
            {item.description && <p style={{ marginTop: 4, fontSize: 11, lineHeight: 1.6, color: '#a89060', whiteSpace: 'pre-line' }}>{item.description}</p>}
          </div>
        </div>
        {item.services?.length
          ? <div style={{ borderTop: 'none' }}>{item.services.map((service, serviceIndex) => <ItineraryService key={service.id || `${service.type}-${serviceIndex}`} service={service} hotels={hotels} vehicles={vehicles} />)}</div>
          : <div style={{ padding: '12px 16px', fontSize: 11, color: '#7a6040' }}>No booked service is scheduled on this day.</div>}
      </section>
    );
  }

  if (theme === 'vibrant') {
    return (
      <section className="overflow-hidden rounded-xl itinerary-day" style={{ breakInside: 'avoid', pageBreakInside: 'avoid', border: '1px solid #e879f9', background: '#fdf4ff' }}>
        <div className="flex gap-3 border-b border-fuchsia-100 px-3 py-3" style={{ background: 'linear-gradient(135deg, #fdf4ff, #eff6ff)' }}>
          <span className="h-9 w-9 flex-shrink-0 rounded-full text-white grid place-items-center text-xs font-bold" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>D{dayNumber}</span>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-600">{dayDate || `Day ${dayNumber}`}{item.destination ? ` · ${item.destination}` : ''}</div>
            <h3 className="mt-0.5 text-sm font-black text-slate-800">{item.title || `Day ${dayNumber} itinerary`}</h3>
            {item.description && <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-slate-600">{item.description}</p>}
          </div>
        </div>
        {item.services?.length ? <div className="divide-y divide-fuchsia-50">{item.services.map((service, serviceIndex) => <ItineraryService key={service.id || `${service.type}-${serviceIndex}`} service={service} hotels={hotels} vehicles={vehicles} />)}</div> : <div className="px-4 py-3 text-[11px] text-fuchsia-300">No booked service is scheduled on this day.</div>}
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white itinerary-day" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <div className="flex gap-3 border-b border-slate-100 bg-slate-50 px-3 py-3">
        <span className="h-9 w-9 flex-shrink-0 rounded-full bg-blue-600 text-white grid place-items-center text-xs font-bold">D{dayNumber}</span>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-blue-600">{dayDate || `Day ${dayNumber}`}{item.destination ? ` · ${item.destination}` : ''}</div>
          <h3 className="mt-0.5 text-sm font-black text-slate-800">{item.title || `Day ${dayNumber} itinerary`}</h3>
          {item.description && <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-slate-600">{item.description}</p>}
        </div>
      </div>
      {item.services?.length ? <div className="divide-y divide-slate-100">{item.services.map((service, serviceIndex) => <ItineraryService key={service.id || `${service.type}-${serviceIndex}`} service={service} hotels={hotels} vehicles={vehicles} />)}</div> : <div className="px-4 py-3 text-[11px] text-slate-400">No booked service is scheduled on this day.</div>}
    </section>
  );
}
function ItineraryService({ service, hotels, vehicles }) {
  const { template } = React.useContext(VoucherConfigContext);
  const theme = template?.theme || 'simple';
  const serviceName = service.type === 'Transfer' ? transferNameWithHotel(service, hotels) : service.name || service.variantName || service.type;
  const serviceDate = displayDate(service.serviceDate || service.date);
  const timing = service.timing || [service.fromTime || service.pickupTime || service.time || service.departure, service.toTime || service.dropUpTime || service.dropTime || service.arrival].filter(Boolean).join(' – ');
  const pickup = service.pickupFrom || service.pickupPoint || service.origin || service.fromSector;
  const drop = service.dropAt || service.dropPoint || service.dropOff || service.dropTo || service.destination || service.toSector;
  const transfer = service.transferKind || service.transferOption || service.transferType || service.basis;
  const vehicle = vehicleName(service, vehicles);
  const details = [
    ['Date', serviceDate], ['Time', timing], ['Duration', service.duration], ['Transfer', transfer], ['Vehicle', vehicle],
    ['Pickup from', pickup], ['Drop point', drop],
  ].filter(([, value]) => value);
  const image = attachmentUrl([service.image, service.imageUrl, service.images]);

  if (theme === 'luxury') {
    return (
      <article data-pdf-keep-together="true" className="flex gap-3 p-3" style={{ borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg grid place-items-center" style={{ background: '#252525', border: '1px solid rgba(212,175,55,0.2)' }}>
          {image ? <img src={image} alt={serviceName} className="h-full w-full object-cover" /> : <Calendar className="h-5 w-5" style={{ color: '#d4af37' }} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 style={{ fontSize: 12, fontWeight: 700, color: '#f0e6c0' }}>{serviceName}</h4>
            <span style={{ borderRadius: 20, background: 'rgba(212,175,55,0.15)', padding: '1px 8px', fontSize: 9, fontWeight: 700, color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>{service.type}</span>
          </div>
          {details.length > 0 && (
            <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3" style={{ fontSize: 10 }}>
              {details.map(([label, value]) => (
                <div key={label}><span style={{ fontWeight: 600, color: '#7a6040' }}>{label}: </span><span style={{ color: '#c8a84e' }}>{value}</span></div>
              ))}
            </div>
          )}
          {service.description && (
            <div style={{ marginTop: 8, borderRadius: 6, border: '1px solid rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.07)', padding: '8px 10px', fontSize: 10, lineHeight: 1.6, color: '#c8a84e' }}>
              <span style={{ fontWeight: 700, color: '#d4af37' }}>Description</span><VoucherRichText html={service.description} style={{ color: '#a89060' }} />
            </div>
          )}
          {/* Service terms deliberately belong only in their dedicated voucher section, never inside a day itinerary. */}
          {voucherRemarks(service) && <div style={{ marginTop: 6, fontSize: 10, lineHeight: 1.6, color: '#7a6040' }}><span style={{ fontWeight: 700, color: '#a89060' }}>Remarks: </span>{voucherRemarks(service)}</div>}
        </div>
      </article>
    );
  }

  if (theme === 'vibrant') {
    return (
      <article data-pdf-keep-together="true" className="flex gap-3 p-3 border-b border-fuchsia-50">
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-fuchsia-50 grid place-items-center">{image ? <img src={image} alt={serviceName} className="h-full w-full object-cover" /> : <Calendar className="h-5 w-5 text-fuchsia-400" />}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5"><h4 className="text-xs font-bold text-slate-800">{serviceName}</h4><span className="rounded-full bg-fuchsia-50 px-2 py-0.5 text-[9px] font-bold text-fuchsia-700 border border-fuchsia-200">{service.type}</span></div>
          {details.length > 0 && <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-600 sm:grid-cols-3">{details.map(([label, value]) => <div key={label}><span className="font-semibold text-fuchsia-400">{label}: </span>{value}</div>)}</div>}
          {service.description && <div className="mt-2 rounded-md border border-fuchsia-100 bg-fuchsia-50 px-2.5 py-2 text-[10px] leading-relaxed text-slate-700"><span className="font-bold text-fuchsia-700">Description</span><VoucherRichText html={service.description} /></div>}
          {/* Service terms deliberately belong only in their dedicated voucher section, never inside a day itinerary. */}
          {voucherRemarks(service) && <div className="mt-1.5 text-[10px] leading-relaxed text-slate-500"><span className="font-bold">Remarks: </span>{voucherRemarks(service)}</div>}
        </div>
      </article>
    );
  }

  return (
    <article data-pdf-keep-together="true" className="flex gap-3 p-3">
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-blue-50 grid place-items-center">{image ? <img src={image} alt={serviceName} className="h-full w-full object-cover" /> : <Calendar className="h-5 w-5 text-blue-500" />}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5"><h4 className="text-xs font-bold text-slate-800">{serviceName}</h4><span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700">{service.type}</span></div>
        {details.length > 0 && <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-600 sm:grid-cols-3">{details.map(([label, value]) => <div key={label}><span className="font-semibold text-slate-400">{label}: </span>{value}</div>)}</div>}
        {service.description && <div className="mt-2 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-2 text-[10px] leading-relaxed text-slate-700"><span className="font-bold text-blue-700">Description</span><VoucherRichText html={service.description} /></div>}
        {/* Service terms deliberately belong only in their dedicated voucher section, never inside a day itinerary. */}
        {voucherRemarks(service) && <div className="mt-1.5 text-[10px] leading-relaxed text-slate-500"><span className="font-bold">Remarks: </span>{voucherRemarks(service)}</div>}
      </div>
    </article>
  );
}
function SectionTerms({ title, type }) {
  const { template, serviceTerms = {}, voucherType } = React.useContext(VoucherConfigContext);
  const html = serviceTerms[type];
  if (!hasVoucherTermText(html)) return null;
  const theme = template?.theme || 'simple';
  const tone = theme === 'luxury'
    ? { background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.25)', color: '#a89060', heading: '#d4af37' }
    : theme === 'vibrant'
      ? { background: '#fdf4ff', border: '1px solid #f5d0fe', color: '#701a75', heading: '#a21caf' }
      : { background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', heading: '#0b6f6b' };
  const showPaidWatermark = voucherType === 'sightseeing' && type === 'sightseeing';
  return <div data-pdf-keep-together="true" className="relative overflow-hidden" style={{ marginTop: 12, borderRadius: 8, padding: 12, fontSize: 10, lineHeight: 1.6, background: tone.background, border: tone.border, color: tone.color }}>
    {showPaidWatermark && <div aria-hidden="true" className="pointer-events-none absolute right-4 top-4 -rotate-12 rounded border-[4px] px-3 py-1.5 text-3xl font-black tracking-[0.24em]" style={{ color: 'rgba(22, 163, 74, .34)', borderColor: 'rgba(22, 163, 74, .34)' }}>PAID</div>}
    <b style={{ color: tone.heading, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{title}</b>
    <VoucherRichText html={html} className="mt-1" style={{ color: tone.color }} />
  </div>;
}

function Notes() {
  const { template, termsHtml } = React.useContext(VoucherConfigContext);
  const theme = template?.theme || 'simple';
  const richTermsStyle = `.voucher-rich-terms{font-size:10px;line-height:1.5}.voucher-rich-terms p{margin:.25rem 0}.voucher-rich-terms ul{list-style:disc outside;margin:.35rem 0 .35rem 1.25rem}.voucher-rich-terms ol{list-style:decimal outside;margin:.35rem 0 .35rem 1.25rem}.voucher-rich-terms li{display:list-item;margin:.15rem 0}.voucher-rich-terms strong{font-weight:700}`;
  if (theme === 'luxury') {
    return (
      <div style={{ marginTop: 16, background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8, padding: 12, fontSize: 10, lineHeight: 1.6, color: '#a89060' }}>
        <style>{richTermsStyle}</style>
        <b style={{ color: '#d4af37', fontWeight: 800, letterSpacing: '0.05em' }}>IMPORTANT NOTES</b>
        {termsHtml ? <div className="rich-text-content voucher-rich-terms mt-1" style={{ color: '#a89060' }} dangerouslySetInnerHTML={{ __html: termsHtml }} /> : <p style={{ marginTop: 4, whiteSpace: 'pre-line', color: '#a89060' }}>{template.importantNotes}</p>}
      </div>
    );
  }
  if (theme === 'vibrant') {
    return (
      <div style={{ marginTop: 16 }} className="bg-fuchsia-50 border border-fuchsia-200 rounded-lg p-3 text-[10px] leading-relaxed text-fuchsia-900">
        <style>{richTermsStyle}</style>
        <b>IMPORTANT NOTES</b>
        {termsHtml ? <div className="rich-text-content voucher-rich-terms mt-1" dangerouslySetInnerHTML={{ __html: termsHtml }} /> : <p className="mt-1 whitespace-pre-line">{template.importantNotes}</p>}
      </div>
    );
  }
  return (
    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-[10px] leading-relaxed text-amber-800">
      <style>{richTermsStyle}</style>
      <b>IMPORTANT NOTES</b>
      {termsHtml ? <div className="rich-text-content voucher-rich-terms mt-1" dangerouslySetInnerHTML={{ __html: termsHtml }} /> : <p className="mt-1 whitespace-pre-line">{template.importantNotes}</p>}
    </div>
  );
}
