import React from 'react';
import LogoImg from '../../assets/logo-color.png';
import VoucherPremiumImg from '../../assets/Voucherpremium.png';
import TravelImg from '../../assets/Travel.png';
import TourDetailsImg from '../../assets/TourDetails.png';
import FlightImg from '../../assets/Flight.png';
import FooterImg from '../../assets/Footer.png';
import { formatDate } from '../../lib/date';
import { hotelRoomAllocationText } from '../../lib/roomAllocation';
import { composeVoucherTermsHtml } from '../../lib/voucherTerms';
import { sortVoucherRows, voucherVehicleLabel } from '../../lib/voucherPresentation';
import { MapPin, Users, Mail, Phone, Calendar, Hotel, Bus, Map, Utensils, Info, Globe, Plane, CheckCircle, FileText, Clock, Car } from 'lucide-react';

const iso = (value) => String(value || '').slice(0, 10);
const text = (value) => value || '-';
const date = (value) => formatDate(value);
const attachment = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(attachment).find(Boolean) || '';
  return attachment(value.url || value.secureUrl || value.secure_url || value.imageUrl || value.src || value.path);
};
const imageFor = (item) => attachment([item?.imageUrl, item?.image, item?.images, item?.hotelImage, item?.photo, item?.thumbnail]);
const destinationNames = (value) => (Array.isArray(value) ? value.flatMap(destinationNames) : String(value || '').split(/\s*(?:\+|\||,|→)\s*/)).map((item) => String(item || '').trim()).filter(Boolean);
const destinationKey = (value) => String(value || '').trim().toLocaleLowerCase();
const destinationImageFor = (destinations, booking, days, hotels) => {
  const firstDay = days[0] || {};
  const firstHotel = hotels[0] || {};
  const candidates = [
    firstDay.destination, firstDay.arrivalDestination, firstDay.itineraryDestination,
    firstHotel.itineraryDestination, firstHotel.city, firstHotel.destination,
    booking?.destinations, booking?.destination,
  ].flatMap(destinationNames);
  const destination = candidates.map((name) => destinations.find((item) => destinationKey(item?.name) === destinationKey(name))).find(Boolean);
  return attachment(destination?.image);
};
const serviceDate = (item) => iso(item?.serviceDate || item?.date || item?.checkIn || item?.checkInDate);
const serviceName = (item) => item?.name || item?.variantName || item?.hotel || item?.type || 'Service';
const route = (item) => [item?.pickupFrom || item?.pickupPoint || item?.origin || item?.fromSector, item?.dropAt || item?.dropPoint || item?.dropOff || item?.dropTo || item?.destination || item?.toSector].filter(Boolean).join(' -> ');
const serviceTime = (item) => [item?.fromTime || item?.pickupTime || item?.time || item?.departure, item?.toTime || item?.arrivalTime || item?.dropUpTime || item?.dropTime || item?.arrival].filter(Boolean).join(' - ');
const vehicle = (item) => voucherVehicleLabel(item);
const nights = (from, to) => {
  const start = new Date(`${iso(from)}T00:00:00Z`); const end = new Date(`${iso(to)}T00:00:00Z`);
  return Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end < start ? 0 : Math.round((end - start) / 86400000);
};
const age = (dob) => {
  if (!dob) return '-';
  const birth = new Date(`${iso(dob)}T00:00:00Z`); const today = new Date();
  if (Number.isNaN(birth.valueOf())) return '-';
  return Math.max(0, today.getUTCFullYear() - birth.getUTCFullYear() - Number(today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())));
};

export const CONFIRMATION_ITINERARY_DEFAULTS = {
  primaryColor: '#0b5fa5', secondaryColor: '#e65100', accentColor: '#d32f2f', backgroundColor: '#ffffff',
  companyName: 'BUILDSOFTWARE', tagline: 'YOUR JOURNEY OUR PASSION', welcomeTitle: 'Confirmation', preparedForLabel: 'Guest',
  showPassport: true, showDOB: true,
  pdfSideMarginMm: 4.2, pdfTopMarginMm: 2, pdfContentScalePercent: 100, pdfFooterGapPercent: 10, pdfPageFillPercent: 90,
  pdfKeepSectionsTogether: true, pdfCardPaddingPercent: 100, pdfCardSpacingPercent: 100,
  sectionOrder: ['cover', 'flights', 'hotels', 'transfers', 'tours', 'importantNotes', 'itinerary'],
  sections: { cover: true, flights: true, guestDetails: true, hotels: true, tours: true, transfers: true, importantNotes: true, itinerary: true },
};

const STYLE = `
  .civ-root { width: 210mm; font-family: Arial, Helvetica, sans-serif; color: #333; background: #fff; margin: 0 auto; box-sizing: border-box; }
  .civ-root * { box-sizing: border-box; }
  .civ-page { width: 210mm; min-height: auto; background: #fff; position: relative; overflow: hidden; display: flex; flex-direction: column; }
  
  /* PAGE 1 HERO */
  .civ-hero { position: relative; height: 50mm; background: var(--hero-bg) center 20%/cover no-repeat; color: #fff; border-bottom: 2px solid #0b5fa5; }
  .civ-hero-fade { position: absolute; bottom: 0; left: 0; right: 0; height: 20mm; background: linear-gradient(to top, rgba(255,255,255,1), transparent); }
  .civ-hero-content { position: relative; z-index: 2; padding: 5mm 6mm; display: flex; justify-content: space-between; align-items: flex-start; }
  .civ-logo-container { width: 45mm; text-align: center; padding: 10px; border: none; box-shadow: none; }
  .civ-logo-container img { max-width: 100%; max-height: 26mm; object-fit: contain; filter: drop-shadow(0px 2px 4px rgba(255,255,255,0.6)); }
  
  .civ-title-box { text-align: center; color: #062d70; flex: 1; margin-top: -2mm; }
  .civ-title-box h1 { font-family: 'Brush Script MT', cursive; color: #e65100; font-size: 26px; margin: 0; line-height: 0.8; font-weight: normal; }
  .civ-title-box h2 { font-size: 38px; font-weight: 900; margin: 0; letter-spacing: 0px; color: #0b5fa5; text-transform: uppercase; line-height: 1; text-shadow: 1px 1px 2px rgba(255,255,255,0.8); }
  .civ-title-box h3 { font-size: 10px; font-weight: 800; color: #0b5fa5; letter-spacing: 2px; text-transform: uppercase; margin: 2px 0 4px; text-shadow: 1px 1px 1px rgba(255,255,255,0.8); }
  .civ-pill { background: #d32f2f; color: #fff; padding: 3px 12px; border-radius: 12px; font-size: 9px; font-weight: 900; display: inline-block; }
  
  .civ-hero-icons { display: flex; gap: 8px; margin-top: 2mm; }
  .civ-hero-icon { text-align: center; font-size: 6px; font-weight: 800; color: #0b5fa5; display: flex; flex-direction: column; align-items: center; }
  .civ-hero-icon-circle { width: 18px; height: 18px; background: #0b5fa5; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 2px; }
  .civ-hero-icon-circle svg { width: 10px; height: 10px; }

  /* INFO BOXES */
  .civ-new-info-row { display: flex; justify-content: space-between; padding: 0 6mm; margin-top: 3mm; position: relative; z-index: 10; gap: 8px; }
  .civ-new-info-card { background: #fff; border-radius: 8px; padding: 6px; flex: 1; border: 1px solid #e0e0e0; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
  .civ-info-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px dashed #e0e0e0; }
  .civ-card-title-wrap { display: flex; align-items: center; gap: 6px; }
  .civ-icon-blue { background: #0b5fa5; color: #fff; width: 22px; height: 22px; border-radius: 50%; display: flex; justify-content: center; align-items: center; }
  .civ-icon-orange { background: #ff9800; color: #fff; width: 22px; height: 22px; border-radius: 50%; display: flex; justify-content: center; align-items: center; }
  .civ-card-title { font-size: 11px; font-weight: 900; color: #0b5fa5; line-height: 1.1; }
  .civ-card-subtitle { font-size: 7px; color: #888; }
  .civ-confirmed-badge { background: #e8f5e9; color: #2e7d32; font-size: 8px; font-weight: 800; padding: 3px 8px; border-radius: 12px; display: flex; align-items: center; gap: 3px; border: 1px solid #c8e6c9; }
  .civ-flight-graphic { display: flex; align-items: center; gap: 2px; }
  .civ-flight-graphic svg { color: #0b5fa5; width: 14px; height: 14px; transform: rotate(45deg); }
  .civ-flight-line { border-top: 1.5px dashed #ccc; width: 40px; margin-right: -4px; border-radius: 50%; height: 10px; border-bottom: none; border-left: none; border-right: none; transform: rotate(-10deg); }
  
  .civ-info-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 8px; }
  .civ-info-item { min-width: 0; display: flex; align-items: center; gap: 5px; font-size: 7.5px; }
  .civ-info-icon { width: 14px; height: 14px; border-radius: 50%; display: flex; justify-content: center; align-items: center; flex-shrink: 0; }
  .civ-info-label { color: #888; width: 20mm; flex: 0 0 20mm; font-weight: 600; }
  .civ-info-val { min-width: 0; font-weight: 800; color: #0b5fa5; line-height: 1.3; overflow-wrap: break-word; }
  .civ-info-item-pax { grid-column: 1 / -1; align-items: flex-start; }
  .civ-pax-value { display: flex; flex-direction: column; gap: 1px; }
  .civ-pax-total { color: #0b5fa5; font-size: 8px; white-space: nowrap; }
  .civ-pax-breakdown { color: #475569; font-size: 7px; font-weight: 700; white-space: nowrap; }
  
  .civ-trip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
  .civ-trip-box { display: flex; align-items: center; gap: 6px; padding: 5px 6px; border-radius: 6px; border: 1px solid transparent; font-size: 7px; }
  .civ-trip-icon { width: 16px; height: 16px; display: flex; justify-content: center; align-items: center; background: #fff; border-radius: 4px; }
  .civ-trip-label { font-weight: 600; margin-bottom: 1px; }
  .civ-trip-val { font-weight: 800; font-size: 8px; color: #0b5fa5; }

  /* HEADERS WITH GRADIENTS & IMAGES */
  /* Match the guest-details container exactly: full page width with the same
     6 mm left/right gutters for every service section. */
  .civ-section-wrapper { width: 100%; align-self: stretch; padding: 0 6mm; margin-top: 2mm; }
  .civ-section-header { display: flex; justify-content: space-between; align-items: center; height: 12mm; padding-left: 4mm; border-radius: 6px 6px 0 0; overflow: hidden; position: relative; }
  .civ-section-title { font-size: 10px; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 6px; z-index: 2; position: relative; text-transform: uppercase; letter-spacing: 0.5px; }
  .civ-section-title svg { width: 14px; height: 14px; }
  .civ-section-img { height: 100%; object-fit: contain; position: absolute; right: 0; top: 0; z-index: 1; }
  
  .civ-header-hotel { background: linear-gradient(to right, #b8860b, #d4af37, #f3e5ab); }
  .civ-header-transfer { background: linear-gradient(to right, #c62828, #e53935, #ffcdd2); }
  .civ-header-tour { background: linear-gradient(to right, #2e7d32, #43a047, #c8e6c9); }
  .civ-header-flight { background: linear-gradient(to right, #1565c0, #1e88e5, #bbdefb); }

  /* NEW HOTEL CARD */
  .civ-hotel-card { display: flex; align-items: stretch; background: #fff; border: 1px solid #e0e0e0; border-top: none; padding: 6px; gap: 10px; margin-bottom: 2mm; border-radius: 0 0 6px 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .civ-hotel-card-img { width: 45mm; height: 26mm; object-fit: cover; border-radius: 4px; border: 1px solid #e0e0e0; flex-shrink: 0; }
  .civ-hotel-details { flex: 1; min-width: 0; display: grid; grid-template-columns: 1.1fr 1.2fr .95fr 1.25fr .8fr; gap: 0; align-items: stretch; }
  .civ-hotel-block { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; font-size: 9px; padding: 4px 6px; border-left: 1px dashed #e0e0e0; min-height: 24mm; }
  .civ-hotel-block:first-child { border-left: none; padding-left: 0; }
  .civ-hotel-head { display: flex; align-items: center; gap: 4px; font-weight: 900; color: #333; font-size: 8px; line-height: 1.15; text-transform: uppercase; margin-bottom: 2px; }
  .civ-hotel-head svg { width: 12px; height: 12px; color: #d4af37; }
  .civ-hotel-val, .civ-hotel-val-dark { max-width: 100%; overflow-wrap: break-word; word-break: normal; font-weight: 700; line-height: 1.35; }
  .civ-hotel-val { color: #0b5fa5; }
  .civ-hotel-val-dark { color: #333; }
  .civ-hotel-stay-dates { display: flex; flex-direction: column; gap: 1px; font-weight: 700; color: #333; line-height: 1.35; }
  .civ-hotel-stay-dates span { white-space: nowrap; }
  .civ-hotel-confirmation { white-space: nowrap; font-family: monospace; }

  /* TABLES */
  .civ-table-wrapper { width: 100%; align-self: stretch; padding: 0 6mm; margin-top: 1mm; }
  .civ-th-bar { padding: 3px 6px; color: #fff; font-size: 9px; font-weight: 800; border-radius: 4px 4px 0 0; display: flex; align-items: center; gap: 5px; text-transform: uppercase; }
  .civ-th-bar svg { width: 12px; height: 12px; }
  .civ-th-blue { background: #0b5fa5; }
  .civ-table { width: 100%; border-collapse: collapse; font-size: 7px; border: 1px solid #ccc; border-top: none; border-radius: 0 0 4px 4px; overflow: hidden; }
  .civ-table th { background: #e3f2fd; color: #0b5fa5; font-weight: 800; padding: 3px 4px; text-align: center; border-right: 1px solid #ccc; border-bottom: 1px solid #ccc; }
  .civ-table th.th-orange { background: #fff3e0; color: #e65100; }
  .civ-table th.th-green { background: #e8f5e9; color: #1b5e20; }
  .civ-table th.th-red { background: #ffebee; color: #d32f2f; }
  .civ-table td { padding: 3px 4px; text-align: center; border-right: 1px solid #ccc; border-bottom: 1px solid #ccc; color: #333; font-weight: 500; }
  .civ-table tr:last-child td { border-bottom: none; }
  .civ-table td:last-child, .civ-table th:last-child { border-right: none; }
  .civ-table-img { width: 25mm; height: 15mm; object-fit: cover; border-radius: 3px; border: 1px solid #ccc; }

  /* FOOTERS */
  .civ-footer-1 { margin-top: 5mm; padding: 4px 6mm; background: #fff; border-top: 2px solid #0b5fa5; display: flex; justify-content: space-between; align-items: center; font-size: 7.5px; font-weight: 700; color: #0b5fa5; }
  .civ-footer-item { display: flex; align-items: center; gap: 4px; }
  .civ-footer-item svg { width: 10px; height: 10px; color: #d32f2f; }
  
  /* ITINERARY HERO (reuses Voucherpremium.png) */
  .civ-itinerary-hero { position: relative; height: 45mm; background: var(--hero-bg) center 20%/cover no-repeat; border-bottom: 3px solid #0b5fa5; margin-bottom: 3mm; overflow: hidden; }
  .civ-itinerary-hero-overlay { position: absolute; inset: 0; background: linear-gradient(to right, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 30%, rgba(0,20,50,0) 50%, rgba(0,20,50,0.7) 100%); display: flex; align-items: center; justify-content: space-between; padding: 0 8mm; }
  .civ-p2-title { font-family: 'Brush Script MT', cursive; font-size: 42px; color: #fff; margin: 0; line-height: 1; text-shadow: 2px 2px 6px rgba(0,0,0,0.6); }
  .civ-p2-sub { font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #fff; margin-top: 4px; text-shadow: 1px 1px 4px rgba(0,0,0,0.6); }
  .civ-p2-ref { background: #d32f2f; padding: 2px 10px; border-radius: 12px; font-size: 8px; font-weight: 900; margin-top: 6px; display: inline-block; border: 1px solid #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }

  /* TIMELINE */
  .civ-timeline-wrapper { padding: 5mm 8mm; position: relative; flex: 1; }
  .civ-timeline-header-wrap { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5mm; }
  .civ-timeline-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 900; color: #0b5fa5; text-transform: uppercase; }
  .civ-timeline-title svg { color: #e65100; }
  .civ-timeline-badge { display: flex; align-items: center; gap: 8px; background: #fff3e0; padding: 4px 12px; border-radius: 12px; font-size: 8px; font-weight: 800; color: #0b5fa5; border: 1px solid #ffe0b2; }
  
  .civ-timeline-line { position: absolute; left: 14.5mm; top: 18mm; bottom: 5mm; width: 2px; background-image: linear-gradient(to bottom, #90caf9 50%, rgba(255,255,255,0) 0%); background-position: left; background-size: 2px 8px; background-repeat: repeat-y; transform: translateX(-50%); z-index: 1; }
  .civ-timeline-item { display: flex; gap: 10px; margin-bottom: 6mm; position: relative; page-break-inside: auto; break-inside: auto; z-index: 2; align-items: stretch; }
  .civ-day-circle { width: 14mm; height: 14mm; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 7px; line-height: 1.1; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.15); border: 2px solid #fff; z-index: 3; align-self: center; }
  .civ-c-0 { background: linear-gradient(135deg, #f57c00, #ffb74d); }
  .civ-c-1 { background: linear-gradient(135deg, #1976d2, #64b5f6); }
  .civ-c-2 { background: linear-gradient(135deg, #f57c00, #ffb74d); }
  .civ-c-3 { background: linear-gradient(135deg, #1976d2, #64b5f6); }
  .civ-c-4 { background: linear-gradient(135deg, #7b1fa2, #ba68c8); }
  .civ-c-5 { background: linear-gradient(135deg, #388e3c, #81c784); }
  .civ-c-6 { background: linear-gradient(135deg, #d32f2f, #e57373); }

  .civ-itinerary-card { flex: 1; display: flex; background: #fff; border-radius: 8px; padding: 4px; border: 1px solid #e0e0e0; box-shadow: 0 2px 8px rgba(0,0,0,0.06); align-items: stretch; gap: 8px; }
  .civ-day-img { width: 38mm; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
  .civ-day-details { width: 45mm; padding: 4px 2px; flex-shrink: 0; display: flex; flex-direction: column; justify-content: center; }
  .civ-day-title { font-size: 11px; font-weight: 900; color: #062d70; margin-bottom: 6px; line-height: 1.2; }
  .civ-day-meta { font-size: 7.5px; display: flex; flex-direction: column; gap: 4px; }
  .civ-day-meta-row { display: flex; align-items: center; gap: 6px; }
  .civ-meta-icon { width: 14px; height: 14px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .civ-day-meta-row b { color: #333; font-weight: 800; width: 18mm; flex-shrink: 0; }
  .civ-day-meta-row span { color: #555; font-weight: 600; }
  
  .civ-day-desc-box { flex: 1; border-radius: 6px; padding: 6px 8px; position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; }
  .civ-day-desc-box::before { content: ''; position: absolute; inset: 0; background: linear-gradient(to right, rgba(255,255,255,1) 40%, rgba(255,255,255,0.7) 70%, rgba(255,255,255,0) 100%), var(--desc-bg) right center/cover no-repeat; opacity: 0.8; z-index: 0; }
  .civ-desc-content { position: relative; z-index: 1; }
  .civ-desc-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .civ-desc-icon { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; }
  .civ-desc-header b { font-size: 8.5px; font-weight: 800; color: #d32f2f; }
  .civ-rich-text { color: #444; font-size: 7.5px; font-weight: 500; line-height: 1.4; }
  .civ-rich-text p { margin: 0 0 2px; }
  .civ-rich-text ul, .civ-rich-text ol { display: block; margin: 2px 0 2px 12px; padding: 0; }
  .civ-rich-text ul { list-style: disc outside; }
  .civ-rich-text ol { list-style: decimal outside; }
  .civ-rich-text li { display: list-item; margin: 1px 0; }
  .civ-rich-text strong, .civ-rich-text b { font-weight: 800; }
  .civ-rich-text h1, .civ-rich-text h2, .civ-rich-text h3 { color: inherit; font-size: inherit; font-weight: 800; line-height: inherit; margin: 3px 0 1px; }
  .civ-day-service-list { flex: 1; min-width: 0; padding: 4px 2px; }
  .civ-day-service { padding: 5px 6px; border-top: 1px solid #e5edf6; page-break-inside: avoid; break-inside: avoid; }
  .civ-day-service:first-of-type { border-top: none; }
  .civ-day-service-head { display: flex; align-items: center; gap: 5px; color: #062d70; font-size: 9px; font-weight: 900; line-height: 1.25; }
  .civ-day-service-type { flex: 0 0 auto; border-radius: 10px; padding: 1px 5px; background: #e3f2fd; color: #1565c0; font-size: 6.5px; font-weight: 800; }
  .civ-day-service-meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2px 6px; margin: 4px 0; font-size: 7px; line-height: 1.3; }
  .civ-day-service-meta b { color: #64748b; font-weight: 800; }
  .civ-day-service-meta span { color: #334155; font-weight: 600; overflow-wrap: anywhere; }
  .civ-day-service-description { border-radius: 4px; border: 1px solid #bfdbfe; background: #eff6ff; padding: 4px 6px; color: #334155; font-size: 7px; line-height: 1.4; }
  .civ-day-service-description .civ-rich-text { font-size: inherit; color: inherit; line-height: inherit; }
  .civ-day-service-remarks { margin-top: 3px; color: #64748b; font-size: 7px; line-height: 1.35; }

  /* NOTES & FOOTER 2 */
  .civ-notes-section { padding: 0 8mm 2mm; margin-top: auto; }
  .civ-notes-header { display: flex; align-items: center; gap: 5px; color: #0b5fa5; font-size: 10px; font-weight: 900; margin-bottom: 3px; }
  .civ-notes-box { font-size: 7.2px; color: #333; font-weight: 600; line-height: 1.35; background: #e3f2fd; padding: 5px 8px; border-radius: 6px; border: 1px solid #bbdefb; }
  .civ-notes-box .civ-rich-text { font-size: inherit; color: inherit; font-weight: inherit; line-height: inherit; }
  .civ-notes-box .civ-rich-text p, .civ-notes-box .civ-rich-text h1, .civ-notes-box .civ-rich-text h2, .civ-notes-box .civ-rich-text h3 { break-inside: avoid; }
  .civ-notes-box .civ-rich-text ul, .civ-notes-box .civ-rich-text ol { margin: 0 0 2px 10px; padding: 0; }
  .civ-notes-box .civ-rich-text li { margin-bottom: 2px; break-inside: avoid; }
  .civ-footer-2 { background: #fff; text-align: center; color: #d32f2f; font-weight: 900; font-size: 9px; padding: 4mm 0; border-top: 1.5px dashed #ccc; letter-spacing: 1px; }

  @media print {
    .civ-root { width: 210mm !important; }
    .civ-page { min-height: 297mm !important; page-break-after: always !important; break-after: page !important; }
  }
`;

export default function ConfirmationItineraryVoucher({ settings, booking: rawBooking, voucher: voucherOverride, brand, data: liveData, destinations: destinationMasters = [], sectionKey = '' }) {
  const cfg = { ...CONFIRMATION_ITINERARY_DEFAULTS, ...(settings || {}), logo: brand?.logo || settings?.logo, companyName: brand?.name || settings?.companyName || CONFIRMATION_ITINERARY_DEFAULTS.companyName };
  const booking = rawBooking || {}; const voucher = voucherOverride || booking.voucher || {}; const data = liveData || {};
  // Agent vouchers must carry the selected agent's contact information. Do not
  // show TripNest's contact details as if they belong to that agent.
  const isAgentVoucher = voucher?.settings?.voucherFor === 'Agent' && Boolean(brand?.isAgent);
  const footerContacts = isAgentVoucher
    ? [[Phone, brand?.phone], [Mail, brand?.email], [Globe, brand?.website]].filter(([, value]) => value)
    : [[Phone, '+66 84 340 4016'], [Mail, 'info@tripnest.com'], [Globe, 'www.tripnest.com']];
  
  const sourceServices = sortVoucherRows(Array.isArray(voucher.services) && voucher.services.length ? voucher.services : (booking.services || []));
  const hotels = sortVoucherRows(Array.isArray(data.hotels) && data.hotels.length ? data.hotels : (Array.isArray(voucher.hotels) && voucher.hotels.length ? voucher.hotels : (booking.hotels || sourceServices.filter((item) => item.type === 'Hotel'))));
  const flights = Array.isArray(data.flights) && data.flights.length ? data.flights : (Array.isArray(voucher.flights) && voucher.flights.length ? voucher.flights : (booking.flights || []));
  const guests = Array.isArray(data.guests) && data.guests.length ? data.guests : (Array.isArray(voucher.guests) && voucher.guests.length ? voucher.guests : (booking.guests || []));
  const transfers = Array.isArray(data.transfers) && data.transfers.length ? data.transfers : sourceServices.filter((item) => item.type === 'Transfer');
  const tours = Array.isArray(data.activities) && data.activities.length ? data.activities : sourceServices.filter((item) => !['Hotel', 'Transfer'].includes(item.type));
  const services = [...transfers, ...tours];
  const savedDays = sortVoucherRows(Array.isArray(data.itinerary) && data.itinerary.length ? data.itinerary : (Array.isArray(voucher.itinerary) && voucher.itinerary.length ? voucher.itinerary : (booking.itinerary || [])));
  const dates = [...new Set([...services, ...hotels].map(serviceDate).filter(Boolean))].sort();
  const days = savedDays.length ? savedDays.map((item, index) => ({ ...item, day: item.day || index + 1, services: item.services?.length ? item.services : [...services, ...hotels].filter((service) => serviceDate(service) === iso(item.date)) })) : dates.map((item, index) => ({ day: index + 1, date: item, services: [...services, ...hotels].filter((service) => serviceDate(service) === item) }));
  
  const leader = guests.find((item) => item.isLeader) || guests[0] || {};
  const adultPax = Number(booking.adults) || guests.filter((item) => item.type !== 'Child' && item.type !== 'Infant').length || 0;
  const childPax = Number(booking.children) || guests.filter((item) => item.type === 'Child').length || 0;
  const infantPax = Number(booking.infants) || guests.filter((item) => item.type === 'Infant').length || 0;
  const totalPax = adultPax + childPax + infantPax;
  const destinationLabel = booking.destination || (booking.destinations || []).join(' | ') || 'THAILAND';
  const destinationFooterImage = destinationImageFor(destinationMasters, booking, days, hotels) || FooterImg;
  const durationText = booking.arrivalDate && booking.departureDate ? `${nights(booking.arrivalDate, booking.departureDate) + 1} DAYS & ${nights(booking.arrivalDate, booking.departureDate)} NIGHTS` : 'TRAVEL ITINERARY';
  const voucherTermsHtml = composeVoucherTermsHtml(voucher);

  // A client voucher must never create a blank section just to show an empty
  // state.  The preview navigation and the printable document use these same
  // data checks.
  const showAll = !sectionKey;
  const showCover = showAll || sectionKey === 'cover';
  const showFlights = (showAll || sectionKey === 'flights') && flights.length > 0;
  const showHotels = (showAll || sectionKey === 'hotels') && hotels.length > 0;
  const showTransfers = (showAll || sectionKey === 'transfers') && transfers.length > 0;
  const showTours = (showAll || sectionKey === 'tours') && tours.length > 0;
  const showNotes = (showAll || sectionKey === 'importantNotes') && Boolean(voucherTermsHtml);
  const showItinerary = (showAll || sectionKey === 'itinerary') && days.length > 0;
  const showDetailsPage = showCover || showFlights || showHotels || showTours || showTransfers;
  const showItineraryPage = showNotes || showItinerary;

  return (
    <div className="civ-root" data-voucher-document="true">
      <style>{STYLE}</style>

      <section className="civ-page">
        {showDetailsPage && (<>
        {showCover && (<>
        <div className="civ-hero" style={{ '--hero-bg': `url(${VoucherPremiumImg})` }}>
          <div className="civ-hero-fade"></div>
          <div className="civ-hero-content">
            <div className="civ-logo-container">
              <img src={cfg.logo || LogoImg} alt="Logo" />
            </div>
            
            <div className="civ-title-box">
              <h1>Confirmation</h1>
              <h2>VOUCHER</h2>
              <h3>{destinationLabel}</h3>
              <div className="civ-pill">{durationText}</div>
            </div>

            <div className="civ-hero-icons">
              <div className="civ-hero-icon"><div className="civ-hero-icon-circle"><Hotel /></div>HOTEL</div>
              <div className="civ-hero-icon"><div className="civ-hero-icon-circle"><Bus /></div>TRANSFER</div>
              <div className="civ-hero-icon"><div className="civ-hero-icon-circle"><Map /></div>TOUR</div>
              <div className="civ-hero-icon"><div className="civ-hero-icon-circle"><Utensils /></div>MEALS</div>
            </div>
          </div>
        </div>

        <div className="civ-new-info-row">
          <div className="civ-new-info-card">
            <div className="civ-info-card-header">
              <div className="civ-card-title-wrap">
                <div className="civ-icon-blue"><FileText size={12}/></div>
                <div>
                  <div className="civ-card-title">Booking Information</div>
                  <div className="civ-card-subtitle">Your booking details are confirmed</div>
                </div>
              </div>
              <div className="civ-confirmed-badge"><CheckCircle size={8}/> Confirmed</div>
            </div>
            <div className="civ-info-grid-2">
              <div className="civ-info-item">
                <div className="civ-info-icon" style={{background:'#ffebee', color:'#d32f2f'}}><MapPin size={8}/></div>
                <div className="civ-info-label">Booking Code</div>
                <div className="civ-info-val text-slate-800">{text(booking.id)}</div>
              </div>
              <div className="civ-info-item">
                <div className="civ-info-icon" style={{background:'#ffebee', color:'#d32f2f'}}><Users size={8}/></div>
                <div className="civ-info-label">Guest Name</div>
                <div className="civ-info-val text-slate-800">{text(leader.name || booking.guestName)}</div>
              </div>
              <div className="civ-info-item">
                <div className="civ-info-icon" style={{background:'#f3e5f5', color:'#7b1fa2'}}><Mail size={8}/></div>
                <div className="civ-info-label">Guest Email</div>
                <div className="civ-info-val">{text(leader.email || booking.guestEmail)}</div>
              </div>
              <div className="civ-info-item">
                <div className="civ-info-icon" style={{background:'#e8f5e9', color:'#1b5e20'}}><Phone size={8}/></div>
                <div className="civ-info-label">Guest Contact No</div>
                <div className="civ-info-val text-slate-800">{text(leader.phone || booking.guestPhone)}</div>
              </div>
              <div className="civ-info-item">
                <div className="civ-info-icon" style={{background:'#fce4ec', color:'#c2185b'}}><MapPin size={8}/></div>
                <div className="civ-info-label">Voucher No.</div>
                <div className="civ-info-val">{text(booking.voucherNo || voucher.voucherNo)}</div>
              </div>
              <div className="civ-info-item civ-info-item-pax">
                <div className="civ-info-icon" style={{background:'#fff3e0', color:'#e65100'}}><Users size={8}/></div>
                <div className="civ-info-label">Total Pax</div>
                <div className="civ-info-val civ-pax-value"><span className="civ-pax-total">{totalPax} Guests</span><span className="civ-pax-breakdown">{adultPax} Adult · {childPax} Child · {infantPax} Infant</span></div>
              </div>
            </div>
          </div>
          
          <div className="civ-new-info-card">
            <div className="civ-info-card-header">
              <div className="civ-card-title-wrap">
                <div className="civ-icon-orange"><Calendar size={12}/></div>
                <div>
                  <div className="civ-card-title">Trip Details</div>
                  <div className="civ-card-subtitle">Check your travel plan information</div>
                </div>
              </div>
              <div className="civ-flight-graphic">
                 <div className="civ-flight-line"></div>
                 <Plane size={12} className="text-blue-600" />
              </div>
            </div>
            <div className="civ-trip-grid">
               <div className="civ-trip-box" style={{background:'#e8f5e9', borderColor:'#c8e6c9'}}>
                  <div className="civ-trip-icon"><Calendar size={10} color="#1b5e20"/></div>
                  <div>
                    <div className="civ-trip-label" style={{color:'#1b5e20'}}>Start Date</div>
                    <div className="civ-trip-val text-slate-800">{date(booking.arrivalDate)}</div>
                  </div>
               </div>
               <div className="civ-trip-box" style={{background:'#ffebee', borderColor:'#ffcdd2'}}>
                  <div className="civ-trip-icon"><Calendar size={10} color="#d32f2f"/></div>
                  <div>
                    <div className="civ-trip-label" style={{color:'#d32f2f'}}>End Date</div>
                    <div className="civ-trip-val text-slate-800">{date(booking.departureDate)}</div>
                  </div>
               </div>
               <div className="civ-trip-box" style={{background:'#e3f2fd', borderColor:'#bbdefb'}}>
                  <div className="civ-trip-icon"><MapPin size={10} color="#0b5fa5"/></div>
                  <div>
                    <div className="civ-trip-label" style={{color:'#0b5fa5'}}>Destinations</div>
                    <div className="civ-trip-val text-slate-800">{destinationLabel}</div>
                  </div>
               </div>
               <div className="civ-trip-box" style={{background:'#f3e5f5', borderColor:'#e1bee7'}}>
                  <div className="civ-trip-icon"><Calendar size={10} color="#7b1fa2"/></div>
                  <div>
                    <div className="civ-trip-label" style={{color:'#7b1fa2'}}>Duration</div>
                    <div className="civ-trip-val text-slate-800">{durationText}</div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {guests.length > 0 && (
        <div className="civ-table-wrapper">
          <div className="civ-th-bar civ-th-blue"><Users /> GUEST DETAILS</div>
          <table className="civ-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Guest Name</th>
                <th>Passport No.</th>
                <th>Nationality</th>
                <th>D.O.B (Age)</th>
                <th>Gender</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((item, index) => (
                <tr key={item.id || index}>
                  <td>{index + 1}</td>
                  <td>{text(item.name)}</td>
                  <td>{text(item.passport)}</td>
                  <td>{text(item.nationality)}</td>
                  <td>{item.dob ? `${date(item.dob)} (${age(item.dob)})` : '-'}</td>
                  <td>{text(item.gender)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        </>)}

        {showFlights && flights.length > 0 && (
        <div className="civ-section-wrapper">
          <div className="civ-section-header civ-header-flight">
             <div className="civ-section-title"><Plane /> FLIGHT DETAILS</div>
             <img src={FlightImg} className="civ-section-img" />
          </div>
          <table className="civ-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Airline / Flight No.</th>
                <th>From Sector</th>
                <th>To Sector</th>
                <th>Departure</th>
                <th>Arrival</th>
              </tr>
            </thead>
            <tbody>
              {flights.map((item, index) => (
                <tr key={item.id || index}>
                  <td>{date(item.date)}</td>
                  <td>{text(item.airlineFlight || [item.airline, item.flightNo].filter(Boolean).join(' '))}</td>
                  <td>{text(item.fromSector || item.sector)}</td>
                  <td>{text(item.toSector)}</td>
                  <td>{text(item.departure)}</td>
                  <td>{text(item.arrival)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {showHotels && hotels.length > 0 && (
        <div className="civ-section-wrapper">
          <div className="civ-section-header civ-header-hotel">
             <div className="civ-section-title"><Hotel /> HOTEL DETAILS</div>
          </div>
          {hotels.map((item, index) => {
             const hotelImg = imageFor(item) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400';
             return (
               <div key={item.id || index} className="civ-hotel-card">
                 <img src={hotelImg} className="civ-hotel-card-img" />
                 <div className="civ-hotel-details">
                    <div className="civ-hotel-block">
                       <div className="civ-hotel-head"><Calendar/> STAY DATES</div>
                       <div className="civ-hotel-stay-dates"><span>{date(item.checkIn)}</span><span>to {date(item.checkOut)}</span></div>
                       <div className="civ-hotel-val-dark" style={{marginTop:'2px'}}><b>{nights(item.checkIn, item.checkOut)} Nights</b></div>
                    </div>
                    <div className="civ-hotel-block">
                       <div className="civ-hotel-head"><Hotel/> HOTEL</div>
                       <div className="civ-hotel-val">{serviceName(item)}</div>
                    </div>
                    <div className="civ-hotel-block">
                       <div className="civ-hotel-head"><MapPin/> DESTINATION</div>
                       <div className="civ-hotel-val-dark">{text(item.city || item.itineraryDestination)}</div>
                    </div>
                    <div className="civ-hotel-block">
                       <div className="civ-hotel-head"><Hotel/> ROOM TYPE</div>
                       <div className="civ-hotel-val">{text(item.roomType)}</div>
                       <div className="civ-hotel-head" style={{marginTop:'5px'}}><Users/> ROOM ALLOCATION</div>
                       <div className="civ-hotel-val-dark" style={{fontSize: '8px'}}>{hotelRoomAllocationText(item, booking)}</div>
                       <div className="civ-hotel-head" style={{marginTop:'5px'}}><Utensils/> MEALS</div>
                       <div className="civ-hotel-val-dark">{text(item.mealPlan)}</div>
                    </div>
                    <div className="civ-hotel-block">
                       <div className="civ-hotel-head"><FileText/> CONF. NO.</div>
                       <div className="civ-hotel-val-dark civ-hotel-confirmation">{text(item.confirmationNo || item.confirmationNumber || item.confirmation)}</div>
                    </div>
                 </div>
               </div>
             );
          })}
        </div>
        )}

        {showTours && tours.length > 0 && (
        <div className="civ-section-wrapper">
          <div className="civ-section-header civ-header-tour">
             <div className="civ-section-title"><Map /> TOUR DETAILS</div>
             <img src={TourDetailsImg} className="civ-section-img" />
          </div>
          <table className="civ-table">
            <thead>
              <tr>
                <th className="th-green">Date</th>
                <th className="th-green">Tour</th>
                <th className="th-green">Transfer</th>
                <th className="th-green">From Time</th>
                <th className="th-green">Pickup From</th>
                <th className="th-green">Drop Point</th>
                <th className="th-green">Drop Time</th>
                <th className="th-green">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {tours.map((item, index) => (
                <tr key={item.id || index}>
                  <td>{date(item.date || item.serviceDate)}</td>
                  <td>{serviceName(item)}</td>
                  <td>{text(item.basis || item.type)}</td>
                  <td>{text(item.fromTime || item.pickupTime || item.time)}</td>
                  <td>{text(item.pickupFrom || item.pickupPoint || item.origin)}</td>
                  <td>{text(item.dropAt || item.dropPoint || item.destination)}</td>
                  <td>{text(item.dropUpTime || item.dropTime || item.toTime || item.arrival)}</td>
                  <td>{text(item.remarks || item.notes || item.plannerNote)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {showTransfers && transfers.length > 0 && (
        <div className="civ-section-wrapper">
          <div className="civ-section-header civ-header-transfer">
             <div className="civ-section-title"><Bus /> TRANSFER DETAILS</div>
             <img src={TravelImg} className="civ-section-img" />
          </div>
          <table className="civ-table">
            <thead>
              <tr>
                <th className="th-red">Date</th>
                <th className="th-red">Route</th>
                <th className="th-red">Transfer</th>
                <th className="th-red">Flight</th>
                <th className="th-red">Time (Dep-Arr)</th>
                <th className="th-red">Vehicle</th>
                <th className="th-red">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((item, index) => (
                <tr key={item.id || index}>
                  <td>{date(item.date || item.serviceDate)}</td>
                  <td>{text(route(item))}</td>
                  <td>{text(item.basis || item.transferType)}</td>
                  <td>{text(item.flightNo || item.airlineFlight)}</td>
                  <td>{text(serviceTime(item))}</td>
                  <td>{text(vehicle(item))}</td>
                  <td>{text(item.remarks || item.notes || item.plannerNote)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        </>)}

        {showItinerary && (<>
        <div className="civ-itinerary-hero" style={{ '--hero-bg': `url(${VoucherPremiumImg})` }}>
          <div className="civ-itinerary-hero-overlay">
            <div className="civ-logo-container" style={{ width: '40mm' }}>
              <img src={cfg.logo || LogoImg} alt="Logo" />
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <h1 className="civ-p2-title">My Travel Itinerary</h1>
              <div className="civ-p2-sub">{destinationLabel}</div>
              <div className="civ-p2-ref">REFERENCE NO. {booking.id || booking.voucherNo || 'QID000000'}</div>
            </div>
            <div style={{ width: '40mm' }} />
          </div>
        </div>

        <div className="civ-timeline-wrapper">
          <div className="civ-timeline-header-wrap">
             <div className="civ-timeline-title"><Calendar size={20} /> DAY WISE ITINERARY - TOUR</div>
             <div className="civ-timeline-badge">
                <MapPin size={12} color="#e65100" />
                {destinationLabel}
                <div style={{color: '#888', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px'}}>
                   {durationText}
                   <div style={{borderBottom: '1px dashed #ccc', width: '20px', marginLeft: '4px'}}></div>
                   <Plane size={10} color="#1976d2" />
                </div>
             </div>
          </div>
          <div className="civ-timeline-line"></div>
          
            {days.map((day, index) => {
              const items = day.services || [];
             // Prefer the selected sightseeing image over a transfer or a
             // stale day thumbnail when a day contains both service types.
             const hero = items.find((item) => item?.type === 'Sightseeing' && attachment(item.image || item.imageUrl || item.images))
               || items.find((item) => attachment(item.image || item.imageUrl || item.images))
               || {};
            const dayImg = attachment(hero.image || hero.imageUrl || hero.images) || 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80&w=400';
            
            return (
              <div className="civ-timeline-item" key={day.id || day.date || index} data-pdf-keep-together={items.length <= 1 ? 'true' : undefined}>
                <div className={`civ-day-circle civ-c-${index % 7}`}>
                  DAY<br/><span style={{fontSize:'12px'}}>{day.day || index + 1}</span>
                  <span style={{fontSize:'5px', fontWeight: '500', marginTop: '2px', opacity: 0.9}}>{date(day.date).replace(/^\d{2}-\d{2}-/, '')}</span>
                </div>
                
                <div className="civ-itinerary-card">
                  <img className="civ-day-img" src={dayImg} alt="" />
                  
                   <div className="civ-day-service-list">
                     <div className="civ-day-title">{day.title || (index === 0 ? `${booking.destination || 'Thailand'} Arrival` : 'Daily itinerary')}</div>
                     {day.description && <div className="civ-day-service-remarks">{day.description}</div>}
                     {items.length ? items.map((item, serviceIndex) => {
                       const remarks = item.remarks || item.notes || item.plannerNote || '';
                       const descriptionHtml = item.masterDescription || item.description || item.details || remarks || (serviceIndex === 0 ? day.description : '') || `Scheduled travel service for Day ${day.day || index + 1}.`;
                       const transferOption = item.basis || item.transferKind || item.transferOption || item.transferType || '';
                       const details = [
                         ['Date', date(serviceDate(item) || day.date)],
                         ['Time', serviceTime(item)],
                         ['Duration', item.duration],
                         ['Transfer', transferOption],
                         ['Vehicle', vehicle(item)],
                         ['Pickup from', item.pickupFrom || item.pickupPoint || item.origin || item.fromSector],
                         ['Drop point', item.dropAt || item.dropPoint || item.dropOff || item.dropTo || item.destination || item.toSector],
                       ].filter(([, value]) => value && value !== '-');
                       return <div className="civ-day-service" key={item.id || `${item.type || 'service'}-${serviceIndex}`}>
                         <div className="civ-day-service-head"><span>{serviceName(item)}</span><span className="civ-day-service-type">{item.type || 'Service'}</span></div>
                         {details.length > 0 && <div className="civ-day-service-meta">{details.map(([label, value]) => <div key={label}><b>{label}:</b> <span>{value}</span></div>)}</div>}
                         <div className="civ-day-service-description"><b>Description</b><div className="civ-rich-text" dangerouslySetInnerHTML={{ __html: descriptionHtml }} /></div>
                         {remarks && <div className="civ-day-service-remarks"><b>Remarks:</b> {remarks}</div>}
                         {/* Terms stay in their dedicated voucher section and are intentionally excluded from the itinerary. */}
                       </div>;
                     }) : <div className="civ-day-service-description">{day.description || `No scheduled service for Day ${day.day || index + 1}.`}</div>}
                   </div>
                </div>
              </div>
            );
          })}
        </div>
        </>)}

        {showNotes && (<div className="civ-notes-section">
          <div className="civ-notes-header"><Info width={14} height={14} /> IMPORTANT NOTES :</div>
          <div className="civ-notes-box">
            <div className="civ-rich-text" dangerouslySetInnerHTML={{ __html: voucherTermsHtml }} />
          </div>
        </div>)}

        {showItinerary && (
          <div className="civ-completion-footer" data-pdf-keep-together="true" style={{ marginTop: 'auto' }}>
            <div className="civ-footer-1">
              <div className="civ-footer-item"><b>{cfg.companyName}</b></div>
              {footerContacts.map(([Icon, value], index) => <div key={`${value}-${index}`} className="civ-footer-item"><Icon /> {value}</div>)}
            </div>

            <div className="civ-footer-2">
              *** WISH YOU ALL THE BEST &amp; HAPPY JOURNEY ***
            </div>
            
            <img src={destinationFooterImage} alt="Destination" style={{ width: '100%', display: 'block', borderTop: '2px solid #0b5fa5' }} />
          </div>
        )}
      </section>
    </div>
  );
}
