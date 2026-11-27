/**
 * Modern Journey Voucher  Premium Travel Editorial Template
 * Navy + Royal Blue + Warm Gold. A4 portrait. Print/PDF optimised.
 */
import React from 'react';
import LogoImg from '../../assets/logo-white.png';
import LogoColor from '../../assets/logo-color.png';
import { formatDate } from '../../lib/date';
import { hotelRoomAllocationText } from '../../lib/roomAllocation';
import { composeVoucherTermsHtml, hasVoucherTerms } from '../../lib/voucherTerms';
import { sortVoucherFlights, sortVoucherRows, voucherVehicleLabel } from '../../lib/voucherPresentation';

/* -- Helpers ---------------------------------------------------------------- */
const iso = (v) => String(v || '').slice(0, 10);
const cell = (v) => v || '\u2014';
const fmt = (dateStr) => formatDate(dateStr) || '\u2014';
const fmtShort = (dateStr) => formatDate(dateStr) || '\u2014';
const fmtWithDay = (dateStr) => formatDate(dateStr) || '\u2014';
const nightsBetween = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return '\u2014';
  const start = new Date(`${iso(checkIn)}T00:00:00Z`);
  const end = new Date(`${iso(checkOut)}T00:00:00Z`);
  if (isNaN(start) || isNaN(end) || end < start) return '\u2014';
  return Math.round((end - start) / 86400000);
};
const ageFromDOB = (dob) => {
  if (!dob) return '\u2014';
  const birth = new Date(`${iso(dob)}T00:00:00`);
  if (isNaN(birth)) return '\u2014';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  age -= Number(today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()));
  return age >= 0 ? age : '\u2014';
};
const transferRoute = (s) => {
  const from = s.pickupFrom || s.pickupPoint || s.origin || s.fromSector || '';
  const to = s.dropAt || s.dropPoint || s.dropOff || s.dropTo || s.destination || s.toSector || '';
  return [from, to].filter(Boolean);
};
const transferTiming = (s) => {
  const dep = s.fromTime || s.pickupTime || s.time || s.departure || '';
  const arr = s.arrivalTime || s.dropUpTime || s.dropTime || s.arrival || '';
  return [dep, arr].filter(Boolean).join(' \u2013 ') || '\u2014';
};
const vehicleLabel = (s) => voucherVehicleLabel(s);
const attachmentUrl = (v) => {
  if (!v) return '';
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v)) return v.map(attachmentUrl).find(Boolean) || '';
  if (typeof v === 'object') return attachmentUrl(v.url || v.secureUrl || v.secure_url || v.imageUrl || v.src || v.path);
  return '';
};

/* -- Dummy preview data ----------------------------------------------------- */
export const MODERN_JOURNEY_DUMMY = {
  id: 'QID000715',
  voucherNo: 'VHR000323',
  guestName: 'Mr Prashant Sharma',
  guestEmail: 'prashant@sharma.com',
  guestPhone: '+91 7014561774',
  adults: 6, children: 2, infants: 0,
  destination: 'Krabi \u2022 Phuket \u2022 Bangkok',
  arrivalDate: '2026-10-16',
  departureDate: '2026-10-23',
  flights: [
    { id: 'f1', date: '2026-10-16', airline: 'IndiGo', flightNo: '6E-1069', fromSector: 'New Delhi', toSector: 'Krabi', departure: '06:50', arrival: '12:50', pnr: 'PBGYXW' },
    { id: 'f2', date: '2026-10-21', airline: 'Bangkok Airways', flightNo: 'PG-276', fromSector: 'Phuket', toSector: 'Bangkok', departure: '12:55', arrival: '14:30', pnr: 'D99BIO' },
  ],
  guests: [
    { id: 'g1', name: 'Mr Prashant Sharma', passport: 'Z1234567', nationality: 'Indian', dob: '1985-03-15', gender: 'Male', isLeader: true },
    { id: 'g2', name: 'Mrs Priya Sharma', passport: 'Z1234568', nationality: 'Indian', dob: '1988-07-20', gender: 'Female' },
  ],
  hotels: [
    { id: 'h1', name: 'Holiday Aonang Beach Resort Krabi', city: 'Krabi', checkIn: '2026-10-16', checkOut: '2026-10-18', roomType: 'Deluxe Room', mealPlan: 'MAP (Breakfast + Dinner)', rooms: 3, confirmationNo: 'HKRB-2026-441' },
    { id: 'h2', name: 'Thavorn Beach Village Resort & Spa', city: 'Phuket', checkIn: '2026-10-18', checkOut: '2026-10-21', roomType: 'Garden View Room', mealPlan: 'RB', rooms: 3, confirmationNo: 'TPKT-2026-889' },
  ],
  tours: [
    { id: 't1', date: '2026-10-17', name: '4 Islands Tour by Speed Boat', type: 'SIC', fromTime: '08:00', pickupFrom: 'Hotel Lobby', remarks: 'Life jackets provided' },
    { id: 't2', date: '2026-10-19', name: 'Phuket Old Town Walking Tour', type: 'Private', fromTime: '18:00', pickupFrom: 'Hotel Lobby', remarks: 'Comfortable walking shoes recommended' },
  ],
  transfers: [
    { id: 'tr1', date: '2026-10-16', pickupFrom: 'Krabi Airport', dropAt: 'Holiday Aonang Beach Resort Krabi', basis: 'Private Transfer', vehicleName: 'Van', flightNo: '6E-1069', fromTime: '13:30', arrivalTime: '14:00', remarks: 'Pickup from Airport Gate No. 3' },
    { id: 'tr2', date: '2026-10-18', pickupFrom: 'Holiday Aonang Beach Resort Krabi', dropAt: 'Thavorn Beach Village Resort & Spa', basis: 'Private Transfer', vehicleName: 'Van', fromTime: '08:00', arrivalTime: '15:00', remarks: 'Enroute Emerald Pool & Hot Spring' },
  ],
  itinerary: [
    { id: 'day1', day: 1, date: '2026-10-16', title: 'Krabi Arrival', destination: 'Krabi',
      description: 'Welcome to Krabi! Upon arrival at Krabi Airport, your private vehicle will be waiting to transfer you to your beachfront resort.',
      services: [{ id: 's1', type: 'Transfer', name: 'Airport to Holiday Aonang Beach Resort', vehicleName: 'Van', fromTime: '13:30', arrivalTime: '14:00', basis: 'Private', pickupFrom: 'Krabi Airport', dropAt: 'Holiday Aonang Beach Resort' }] },
    { id: 'day2', day: 2, date: '2026-10-17', title: '4 Islands Adventure', destination: 'Krabi',
      description: 'Spend the day exploring the stunning 4 Islands by speed boat. Snorkel in crystal-clear waters and relax on pristine beaches.',
      services: [{ id: 's2', type: 'Sightseeing', name: '4 Islands Tour by Speed Boat', fromTime: '08:00', duration: '6 Hours', pickupFrom: 'Hotel Lobby', remarks: 'Life jackets provided. Lunch included.' }] },
  ],
  importantNotes: [
    { title: 'Thailand Digital Arrival Card', text: 'Complete your TDAC within 3 days before arrival at tdac.immigration.go.th' },
    { title: 'Passport Validity', text: 'Minimum 6 months validity required from date of entry.' },
    { title: 'Hotel Security Deposit', text: 'THB 500-2,000 per room collected at check-in. Fully refundable at checkout.' },
    { title: 'Pickup Timing', text: 'Be ready 10 minutes before scheduled pickup. Times may change due to traffic or weather.' },
    { title: 'Temple Dress Code', text: 'Cover shoulders and knees when visiting temples. Sarongs available at temple entrances.' },
    { title: 'National Park Fees', text: 'All National Park Entry Fees are INCLUDED unless otherwise specified.' },
  ],
};

/* -- Design tokens ---------------------------------------------------------- */
const defaultCfg = {
  primaryColor: '#173B8F', secondaryColor: '#0F2348', accentColor: '#F4B942',
  backgroundColor: '#F6F8FC', cardColor: '#FFFFFF', borderColor: '#DCE3EE',
  textColor: '#162033', mutedColor: '#64748B',
  companyName: 'BUILDSOFTWARE', tagline: 'Your Thailand Travel Partner',
  welcomeHeading: 'Travel Confirmation', preparedForLabel: 'Prepared for',
};

const FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800;900&display=swap');
  .mjv-root { font-family: 'Manrope', 'Inter', system-ui, sans-serif; color: #162033; line-height: 1.45; }
  .mjv-root * { box-sizing: border-box; }
  @media print {
    .mjv-page { width: 210mm !important; min-height: 0 !important; height: auto !important; page-break-after: auto !important; break-after: auto !important; overflow: visible !important; }
    .mjv-page > div { flex: none !important; overflow: visible !important; }
    .mjv-no-break { page-break-inside: avoid !important; break-inside: avoid !important; }
  }
`;

const tdStyle = { padding: '6px 8px', fontSize: 8.5, color: '#162033', verticalAlign: 'top' };

/* -- Primitives -------------------------------------------------------------- */
function SectionLabel({ number, label, cfg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 9, fontWeight: 800, color: cfg.accentColor, letterSpacing: 1, minWidth: 18 }}>{String(number).padStart(2, '0')}</span>
      <span style={{ fontSize: 10, fontWeight: 800, color: cfg.primaryColor, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${cfg.primaryColor}30, transparent)` }} />
    </div>
  );
}

function InfoChip({ label, value, cfg }) {
  return (
    <div style={{ background: cfg.backgroundColor, border: `1px solid ${cfg.borderColor}`, borderRadius: 8, padding: '7px 10px' }}>
      <div style={{ fontSize: 8, fontWeight: 700, color: cfg.mutedColor, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 800, color: cfg.textColor, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

function PageHeader({ cfg, booking, pageNum, totalPages }) {
  return (
    <div style={{ background: `linear-gradient(135deg, ${cfg.secondaryColor} 0%, ${cfg.primaryColor} 100%)`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={cfg.logo || LogoImg} alt={cfg.companyName} style={{ height: 36, width: 80, objectFit: 'contain', objectPosition: 'left center' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '0.05em' }}>{cfg.companyName}</div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>{cfg.tagline}</div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: cfg.accentColor, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Confirmation Voucher</div>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#fff', marginTop: 1 }}>{booking.id || booking.voucherNo}</div>
        {totalPages > 1 && <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>Page {pageNum} of {totalPages}</div>}
      </div>
    </div>
  );
}

function PageFooter({ cfg, pageNum, totalPages }) {
  return (
    <div style={{ background: cfg.secondaryColor, padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{cfg.companyName}</div>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>{cfg.tagline}</div>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Page {pageNum} of {totalPages}</div>
    </div>
  );
}

function A4Page({ cfg, booking, pageNum, totalPages, children }) {
  return (
    <div className="mjv-page" style={{ width: '210mm', minHeight: '297mm', background: cfg.cardColor, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', pageBreakAfter: 'always', breakAfter: 'page' }}>
      <PageHeader cfg={cfg} booking={booking} pageNum={pageNum} totalPages={totalPages} />
      <div style={{ flex: 1, padding: '14px 16px', background: cfg.backgroundColor, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'hidden' }}>
        {children}
      </div>
      <PageFooter cfg={cfg} pageNum={pageNum} totalPages={totalPages} />
    </div>
  );
}

/* -- Page 1 components ------------------------------------------------------- */
function BookingSummaryStrip({ booking, cfg }) {
  const n = nightsBetween(booking.arrivalDate, booking.departureDate);
  const duration = n !== '\u2014' ? `${Number(n) + 1} Days \u2022 ${n} Nights` : '';
  const items = [
    { label: 'BOOKING CODE', value: cell(booking.id || booking.bookingCode) },
    { label: 'TRAVEL DATES', value: booking.arrivalDate ? `${fmtWithDay(booking.arrivalDate)} \u2013 ${fmtWithDay(booking.departureDate)}` : '\u2014' },
    { label: 'TRAVELLERS', value: `${(booking.adults || 0) + (booking.children || 0) + (booking.infants || 0)} Guests` },
    { label: 'DESTINATIONS', value: cell(booking.destination) },
    { label: 'VOUCHER NO.', value: cell(booking.voucherNo || booking.voucher?.voucherNo) },
  ];
  return (
    <div className="mjv-no-break" style={{ background: cfg.cardColor, border: `1px solid ${cfg.borderColor}`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', background: `linear-gradient(135deg, ${cfg.secondaryColor}15, ${cfg.primaryColor}10)`, borderBottom: `2px solid ${cfg.accentColor}` }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: cfg.accentColor, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 4 }}>{cfg.welcomeHeading}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: cfg.primaryColor, lineHeight: 1.2 }}>Welcome to Thailand</div>
        <div style={{ fontSize: 10, color: cfg.mutedColor, marginTop: 4 }}>
          {cfg.preparedForLabel}: <strong style={{ color: cfg.textColor }}>{booking.guestName}</strong>
          {booking.destination && <> &nbsp;&middot;&nbsp; <strong style={{ color: cfg.primaryColor }}>{booking.destination}</strong></>}
        </div>
        {duration && (
          <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6, background: cfg.accentColor + '22', borderRadius: 20, padding: '2px 10px' }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: cfg.accentColor }}>{'\u2708'}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: cfg.textColor }}>{duration}</span>
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 0 }}>
        {items.map((item, i) => (
          <div key={item.label} style={{ padding: '8px 10px', borderRight: i < items.length - 1 ? `1px solid ${cfg.borderColor}` : 'none', background: i % 2 === 0 ? cfg.cardColor : cfg.backgroundColor }}>
            <div style={{ fontSize: 7.5, fontWeight: 700, color: cfg.mutedColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{item.label}</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: cfg.textColor, wordBreak: 'break-word' }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GuestOverviewCard({ booking, cfg }) {
  return (
    <div className="mjv-no-break" style={{ background: cfg.cardColor, border: `1px solid ${cfg.borderColor}`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: `${cfg.primaryColor}12`, borderBottom: `1px solid ${cfg.borderColor}` }}>
        <span style={{ fontSize: 14 }}>&#128100;</span>
        <span style={{ fontSize: 9, fontWeight: 800, color: cfg.primaryColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Guest Information</span>
      </div>
      <div style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <InfoChip label="Guest Name" value={cell(booking.guestName)} cfg={cfg} />
        <InfoChip label="Total Pax" value={`${(booking.adults || 0) + (booking.children || 0) + (booking.infants || 0)} Guests`} cfg={cfg} />
        <InfoChip label="Email" value={cell(booking.guestEmail)} cfg={cfg} />
        <InfoChip label="Adults" value={`${cell(booking.adults)} ${(booking.adults || 0) > 1 ? 'Adults' : 'Adult'}`} cfg={cfg} />
        <InfoChip label="Contact" value={cell(booking.guestPhone)} cfg={cfg} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <InfoChip label="Children" value={String(booking.children || 0)} cfg={cfg} />
          <InfoChip label="Infants" value={String(booking.infants || 0)} cfg={cfg} />
        </div>
      </div>
    </div>
  );
}

function FlightSection({ flights, cfg }) {
  if (!flights || !flights.length) return null;
  return (
    <div className="mjv-no-break">
      <SectionLabel number={2} label="Flight Details" cfg={cfg} />
      <div style={{ background: cfg.cardColor, border: `1px solid ${cfg.borderColor}`, borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: `linear-gradient(135deg, ${cfg.secondaryColor}, ${cfg.primaryColor})` }}>
              {['Date', 'Airline', 'Flight', 'Route', 'Dep', 'Arr', 'PNR'].map((h) => (
                <th key={h} style={{ padding: '7px 8px', textAlign: 'left', fontSize: 8, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {flights.map((f, i) => (
              <tr key={f.id || i} style={{ background: i % 2 === 0 ? cfg.cardColor : cfg.backgroundColor, borderBottom: `1px solid ${cfg.borderColor}` }}>
                <td style={tdStyle}><div style={{ fontSize: 8, fontWeight: 700 }}>{fmtShort(f.date)}</div></td>
                <td style={tdStyle}><div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ fontSize: 11 }}>&#9992;</span><span style={{ fontSize: 9, fontWeight: 700, color: cfg.primaryColor }}>{cell(f.airline)}</span></div></td>
                <td style={{ ...tdStyle, fontWeight: 800, color: cfg.textColor, fontSize: 9 }}>{cell(f.flightNo)}</td>
                <td style={tdStyle}><span style={{ fontSize: 8.5, fontWeight: 600 }}>{cell(f.fromSector)}</span><span style={{ color: cfg.accentColor, fontWeight: 800, margin: '0 3px' }}>&#8594;</span><span style={{ fontSize: 8.5, fontWeight: 600 }}>{cell(f.toSector)}</span></td>
                <td style={{ ...tdStyle, fontWeight: 700, color: cfg.primaryColor }}>{cell(f.departure)}</td>
                <td style={{ ...tdStyle, fontWeight: 700, color: '#dc2626' }}>{cell(f.arrival)}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: 1, background: `${cfg.accentColor}18`, borderRadius: 4 }}>{cell(f.pnr || f.bookingRef)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -- Page 2 components ------------------------------------------------------- */
function HotelCards({ hotels, cfg }) {
  if (!hotels || !hotels.length) return null;
  return (
    <div>
      <SectionLabel number={3} label="Hotel Stays" cfg={cfg} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {hotels.map((h, i) => {
          const nights = nightsBetween(h.checkIn, h.checkOut);
          return (
            <div key={h.id || i} className="mjv-no-break" style={{ background: cfg.cardColor, border: `1px solid ${cfg.borderColor}`, borderRadius: 10, overflow: 'hidden', borderLeft: `3px solid ${cfg.primaryColor}` }}>
              <div style={{ padding: '8px 10px', borderBottom: `1px solid ${cfg.borderColor}`, background: `${cfg.primaryColor}08` }}>
                <div style={{ fontSize: 7.5, fontWeight: 700, color: cfg.accentColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>&#127960; {cell(h.city || h.itineraryDestination)}</div>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: cfg.primaryColor, lineHeight: 1.3 }}>{cell(h.name || h.hotel)}</div>
              </div>
              <div style={{ padding: '8px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                <div><div style={{ fontSize: 7, fontWeight: 700, color: cfg.mutedColor, textTransform: 'uppercase', marginBottom: 1 }}>Check-in</div><div style={{ fontSize: 9, fontWeight: 700 }}>{fmt(h.checkIn)}</div></div>
                <div><div style={{ fontSize: 7, fontWeight: 700, color: cfg.mutedColor, textTransform: 'uppercase', marginBottom: 1 }}>Check-out</div><div style={{ fontSize: 9, fontWeight: 700 }}>{fmt(h.checkOut)}</div></div>
                <div><div style={{ fontSize: 7, fontWeight: 700, color: cfg.mutedColor, textTransform: 'uppercase', marginBottom: 1 }}>Room</div><div style={{ fontSize: 8.5 }}>{cell(h.roomType)}</div></div>
                <div><div style={{ fontSize: 7, fontWeight: 700, color: cfg.mutedColor, textTransform: 'uppercase', marginBottom: 1 }}>Meal Plan</div><div style={{ fontSize: 8.5 }}>{cell(h.mealPlan)}</div></div>
                <div style={{ gridColumn: '1 / -1' }}><div style={{ fontSize: 7, fontWeight: 700, color: cfg.mutedColor, textTransform: 'uppercase', marginBottom: 1 }}>Room Allocation</div><div style={{ fontSize: 8.5 }}>{cell(h.roomAllocationLabel)}</div></div>
                <div><div style={{ fontSize: 7, fontWeight: 700, color: cfg.mutedColor, textTransform: 'uppercase', marginBottom: 1 }}>Nights</div><div style={{ fontSize: 9, fontWeight: 700, color: cfg.primaryColor }}>{nights} {nights === 1 ? 'Night' : 'Nights'}</div></div>
                <div><div style={{ fontSize: 7, fontWeight: 700, color: cfg.mutedColor, textTransform: 'uppercase', marginBottom: 1 }}>Conf. No.</div><div style={{ fontSize: 8, fontFamily: 'monospace', fontWeight: 600 }}>{cell(h.confirmationNo || h.confirmationNumber)}</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TourGrid({ tours, cfg }) {
  if (!tours || !tours.length) return null;
  return (
    <div>
      <SectionLabel number={4} label="Tours & Experiences" cfg={cfg} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {tours.map((t, i) => (
          <div key={t.id || i} className="mjv-no-break" style={{ background: cfg.cardColor, border: `1px solid ${cfg.borderColor}`, borderRadius: 10, padding: '10px 12px', borderTop: `2px solid ${cfg.accentColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: cfg.textColor, flex: 1, marginRight: 6 }}>{cell(t.name || t.variantName)}</div>
              <span style={{ fontSize: 7.5, fontWeight: 700, color: cfg.accentColor, background: `${cfg.accentColor}20`, borderRadius: 20, padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0 }}>{cell(t.type || t.basis)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              <div><span style={{ fontSize: 7.5, color: cfg.mutedColor, fontWeight: 600 }}>Date: </span><span style={{ fontSize: 8, fontWeight: 700 }}>{fmtWithDay(t.date || t.serviceDate)}</span></div>
              <div><span style={{ fontSize: 7.5, color: cfg.mutedColor, fontWeight: 600 }}>Time: </span><span style={{ fontSize: 8, fontWeight: 700 }}>{cell(t.fromTime || t.pickupTime || t.time)}</span></div>
              {t.pickupFrom && <div style={{ gridColumn: 'span 2' }}><span style={{ fontSize: 7.5, color: cfg.mutedColor, fontWeight: 600 }}>Pickup: </span><span style={{ fontSize: 8 }}>{t.pickupFrom}</span></div>}
              {t.remarks && <div style={{ gridColumn: 'span 2' }}><span style={{ fontSize: 7.5, color: cfg.mutedColor, fontWeight: 600 }}>Note: </span><span style={{ fontSize: 8, color: cfg.mutedColor }}>{t.remarks}</span></div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransferTimeline({ transfers, cfg }) {
  if (!transfers || !transfers.length) return null;
  return (
    <div>
      <SectionLabel number={5} label="Transfers" cfg={cfg} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {transfers.map((t, i) => {
          const route = transferRoute(t);
          return (
            <div key={t.id || i} className="mjv-no-break" style={{ background: cfg.cardColor, border: `1px solid ${cfg.borderColor}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: `${cfg.primaryColor}0C`, borderBottom: `1px solid ${cfg.borderColor}` }}>
                <span style={{ fontSize: 8, fontWeight: 800, color: cfg.accentColor, background: `${cfg.accentColor}25`, borderRadius: 6, padding: '2px 6px' }}>{fmtWithDay(t.date || t.serviceDate)}</span>
                <span style={{ fontSize: 8.5, fontWeight: 700, color: cfg.primaryColor }}>{cell(t.basis || t.transferType || t.type)}</span>
                {vehicleLabel(t) && <span style={{ fontSize: 8, color: cfg.mutedColor }}>&middot; {vehicleLabel(t)}</span>}
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 8, fontWeight: 700, color: cfg.primaryColor }}>{transferTiming(t)}</span>
              </div>
              <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700 }}>{route[0] || '\u2014'}</div>
                  <div style={{ fontSize: 8, color: cfg.mutedColor, margin: '3px 0' }}>&#8595; transfer</div>
                  <div style={{ fontSize: 9.5, fontWeight: 700 }}>{route[1] || '\u2014'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {t.flightNo && <div style={{ fontSize: 7.5, color: cfg.mutedColor }}>Flight: <b>{t.flightNo}</b></div>}
                  {(t.remarks || t.notes) && <div style={{ fontSize: 7.5, color: cfg.mutedColor, maxWidth: 160, textAlign: 'right' }}>{t.remarks || t.notes}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -- Page 3 components ------------------------------------------------------- */
function GuestDetailTable({ guests, cfg, showPassport, showDOB }) {
  if (!guests || !guests.length) return null;
  const cols = ['#', 'Name', 'Gender', 'Nationality', ...(showPassport ? ['Passport'] : []), ...(showDOB ? ['DOB', 'Age'] : [])];
  return (
    <div className="mjv-no-break">
      <SectionLabel number={6} label="Traveller Details" cfg={cfg} />
      <div style={{ background: cfg.cardColor, border: `1px solid ${cfg.borderColor}`, borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: `linear-gradient(135deg, ${cfg.secondaryColor}, ${cfg.primaryColor})` }}>
              {cols.map((h) => <th key={h} style={{ padding: '7px 8px', textAlign: 'left', fontSize: 7.5, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {guests.map((g, i) => (
              <tr key={g.id || i} style={{ background: i % 2 === 0 ? cfg.cardColor : cfg.backgroundColor, borderBottom: `1px solid ${cfg.borderColor}` }}>
                <td style={{ ...tdStyle, fontWeight: 700, color: cfg.primaryColor }}>{i + 1}</td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{cell(g.name)}{g.isLeader && <span style={{ marginLeft: 4, fontSize: 7, fontWeight: 700, color: cfg.accentColor, background: `${cfg.accentColor}20`, borderRadius: 10, padding: '1px 5px' }}>LEAD</span>}</td>
                <td style={tdStyle}>{cell(g.gender)}</td>
                <td style={tdStyle}>{cell(g.nationality)}</td>
                {showPassport && <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 8 }}>{cell(g.passport)}</td>}
                {showDOB && <><td style={tdStyle}>{fmt(g.dob)}</td><td style={tdStyle}>{ageFromDOB(g.dob)}</td></>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImportantNotesSection({ notes, html, cfg }) {
  if (html) return <div><SectionLabel number={7} label="Travel Information" cfg={cfg} /><style>{`.mjv-rich-terms{font-size:9px;line-height:1.55;color:${cfg.mutedColor}}.mjv-rich-terms p{margin:5px 0}.mjv-rich-terms ul{list-style:disc outside;margin:6px 0 6px 18px}.mjv-rich-terms ol{list-style:decimal outside;margin:6px 0 6px 18px}.mjv-rich-terms li{display:list-item;margin:3px 0}.mjv-rich-terms strong{color:${cfg.textColor};font-weight:800}`}</style><div className="rich-text-content mjv-rich-terms mjv-no-break" style={{ background: cfg.cardColor, border: `1px solid ${cfg.borderColor}`, borderRadius: 10, padding: '10px 12px' }} dangerouslySetInnerHTML={{ __html: html }} /></div>;
  const list = Array.isArray(notes) ? notes : [];
  if (!list.length) return null;
  const cats = [
    { label: 'Before You Travel', items: list.slice(0, 3) },
    { label: 'Hotel & Stay Notes', items: list.slice(3, 5) },
    { label: 'Important Guidelines', items: list.slice(5, 8) },
  ];
  return (
    <div>
      <SectionLabel number={7} label="Travel Information" cfg={cfg} />
      {cats.map((cat) => (
        <div key={cat.label} className="mjv-no-break" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: cfg.primaryColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{cat.label}</div>
          <div style={{ display: 'grid', gridTemplateColumns: cat.items.length === 1 ? '1fr' : 'repeat(2,1fr)', gap: 6 }}>
            {cat.items.map((note, ni) => (
              <div key={ni} style={{ background: cfg.cardColor, border: `1px solid ${cfg.borderColor}`, borderRadius: 8, padding: '8px 10px', borderLeft: `3px solid ${cfg.accentColor}` }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: cfg.textColor, marginBottom: 3 }}>{note.title}</div>
                <div style={{ fontSize: 8, color: cfg.mutedColor, lineHeight: 1.5 }}>{note.text}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* -- Itinerary Cover Page ---------------------------------------------------- */
function ItineraryCoverPage({ booking, cfg, pageNum, totalPages }) {
  const n = nightsBetween(booking.arrivalDate, booking.departureDate);
  const duration = n !== '\u2014' ? `${Number(n) + 1} Days \u2022 ${n} Nights` : '';
  return (
    <div className="mjv-page" style={{ width: '210mm', minHeight: '297mm', background: cfg.cardColor, display: 'flex', flexDirection: 'column', overflow: 'hidden', pageBreakAfter: 'always', breakAfter: 'page' }}>
      <PageHeader cfg={cfg} booking={booking} pageNum={pageNum} totalPages={totalPages} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 30px', background: `linear-gradient(160deg, ${cfg.secondaryColor}08 0%, ${cfg.backgroundColor} 60%, ${cfg.primaryColor}06 100%)`, position: 'relative', overflow: 'hidden' }}>
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.04 }} viewBox="0 0 600 800" preserveAspectRatio="none">
          <path d="M 100 0 Q 300 200 500 100 T 600 400 Q 400 600 200 500 T 0 800" stroke={cfg.primaryColor} strokeWidth="3" fill="none" strokeDasharray="8 4" />
        </svg>
        <img src={cfg.logo || LogoColor} alt={cfg.companyName} style={{ height: 60, marginBottom: 24, objectFit: 'contain', opacity: 0.85 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        <div style={{ fontSize: 8, fontWeight: 700, color: cfg.accentColor, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 10 }}>YOUR THAILAND JOURNEY</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: cfg.primaryColor, textAlign: 'center', lineHeight: 1.15, marginBottom: 8 }}>{booking.destination || 'Krabi \u2022 Phuket \u2022 Bangkok'}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
          <div style={{ width: 50, height: 2, background: cfg.accentColor, borderRadius: 2 }} />
          <span style={{ fontSize: 14, color: cfg.accentColor }}>&#10022;</span>
          <div style={{ width: 50, height: 2, background: cfg.accentColor, borderRadius: 2 }} />
        </div>
        {duration && <div style={{ fontSize: 13, fontWeight: 700, color: cfg.secondaryColor, marginBottom: 14 }}>{duration}</div>}
        {booking.arrivalDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: cfg.mutedColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Arrival</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: cfg.primaryColor }}>{fmt(booking.arrivalDate)}</div>
            </div>
            <div style={{ fontSize: 18, color: cfg.accentColor, fontWeight: 900 }}>&#8594;</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: cfg.mutedColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Departure</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: cfg.primaryColor }}>{fmt(booking.departureDate)}</div>
            </div>
          </div>
        )}
        <div style={{ background: cfg.cardColor, border: `1px solid ${cfg.borderColor}`, borderRadius: 12, padding: '14px 24px', textAlign: 'center', marginBottom: 16, minWidth: 240 }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: cfg.mutedColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Prepared for</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: cfg.primaryColor }}>{cell(booking.guestName)}</div>
          <div style={{ marginTop: 6, borderTop: `1px solid ${cfg.borderColor}`, paddingTop: 6, fontSize: 8, color: cfg.mutedColor }}>
            Reference: <strong style={{ fontFamily: 'monospace', color: cfg.textColor }}>{booking.id || booking.voucherNo}</strong>
          </div>
        </div>
        <div style={{ fontSize: 8, color: cfg.mutedColor, textAlign: 'center' }}>Crafted with care by {cfg.companyName}</div>
      </div>
      <PageFooter cfg={cfg} pageNum={pageNum} totalPages={totalPages} />
    </div>
  );
}

/* -- Day-wise itinerary ------------------------------------------------------ */
function ServiceCard({ service, cfg }) {
  const name = service.name || service.variantName || service.type || 'Service';
  const timing = [service.fromTime || service.pickupTime || service.time || service.departure, service.toTime || service.arrivalTime || service.dropTime || service.arrival].filter(Boolean).join(' \u2013 ');
  const pickup = service.pickupFrom || service.pickupPoint || service.origin || service.fromSector;
  const drop = service.dropAt || service.dropPoint || service.destination || service.toSector;
  const vehicle = vehicleLabel(service);
  const transfer = service.basis || service.transferType || service.transferKind;
  const imageUrl = attachmentUrl([service.image, service.imageUrl, service.images]);
  const typeColors = {
    Transfer: { border: '#173B8F', badge: '#173B8F' },
    Sightseeing: { border: '#F4B942', badge: '#d97706' },
    Hotel: { border: '#10b981', badge: '#10b981' },
    Meal: { border: '#f59e0b', badge: '#f59e0b' },
    Restaurant: { border: '#f59e0b', badge: '#f59e0b' },
  };
  const colors = typeColors[service.type] || { border: cfg.borderColor, badge: cfg.mutedColor };
  return (
    <div style={{ background: cfg.cardColor, border: `1px solid ${colors.border}30`, borderLeft: `3px solid ${colors.border}`, borderRadius: '0 8px 8px 0', padding: '7px 10px', display: 'flex', gap: 8 }}>
      {imageUrl && <img src={imageUrl} alt={name} style={{ width: 48, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: cfg.textColor, lineHeight: 1.3 }}>{name}</div>
          <span style={{ fontSize: 7, fontWeight: 700, color: '#fff', background: colors.badge, borderRadius: 4, padding: '2px 5px', whiteSpace: 'nowrap', flexShrink: 0 }}>{service.type}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
          {timing && <span style={{ fontSize: 7.5, color: cfg.mutedColor }}>&#128336; {timing}</span>}
          {service.duration && <span style={{ fontSize: 7.5, color: cfg.mutedColor }}>&#9203; {service.duration}</span>}
          {transfer && <span style={{ fontSize: 7.5, color: cfg.mutedColor }}>&#128652; {transfer}</span>}
          {vehicle && <span style={{ fontSize: 7.5, color: cfg.mutedColor }}>&#128663; {vehicle}</span>}
          {pickup && <span style={{ fontSize: 7.5, color: cfg.mutedColor }}>From: {pickup}</span>}
          {drop && <span style={{ fontSize: 7.5, color: cfg.mutedColor }}>To: {drop}</span>}
        </div>
        {service.description && <div style={{ marginTop: 3, fontSize: 7.5, color: cfg.mutedColor, lineHeight: 1.45, borderTop: `1px solid ${cfg.borderColor}`, paddingTop: 3 }} dangerouslySetInnerHTML={{ __html: service.description }} />}
        {/* Terms stay in their dedicated voucher section and are intentionally excluded from the itinerary. */}
        {(service.remarks || service.notes) && <div style={{ marginTop: 2, fontSize: 7.5, color: cfg.accentColor, fontWeight: 600 }}>Note: {service.remarks || service.notes}</div>}
      </div>
    </div>
  );
}

function DayBlock({ item, index, cfg }) {
  const dayNum = item.day || index + 1;
  const dayDate = item.date ? fmtWithDay(item.date) : `Day ${dayNum}`;
  return (
    <div className="mjv-no-break" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ background: `linear-gradient(135deg, ${cfg.secondaryColor}, ${cfg.primaryColor})`, color: '#fff', borderRadius: 8, padding: '5px 10px', fontSize: 9, fontWeight: 900, letterSpacing: '0.05em', flexShrink: 0 }}>
          DAY {String(dayNum).padStart(2, '0')}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: cfg.accentColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{dayDate}</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: cfg.textColor }}>{item.title || `Day ${dayNum}`}</div>
        </div>
        {item.destination && <span style={{ fontSize: 7.5, fontWeight: 700, color: cfg.primaryColor, background: `${cfg.primaryColor}14`, borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>&#128205; {item.destination}</span>}
      </div>
      <div style={{ display: 'flex', gap: 0 }}>
        <div style={{ width: 24, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 2, flex: 1, background: `linear-gradient(to bottom, ${cfg.accentColor}, ${cfg.primaryColor}40)`, borderRadius: 2, minHeight: 20 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {item.description && <div style={{ fontSize: 8.5, color: cfg.mutedColor, marginBottom: 6, lineHeight: 1.55, paddingLeft: 4 }}>{item.description}</div>}
          {item.services && item.services.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {item.services.map((s, si) => <ServiceCard key={s.id || si} service={s} cfg={cfg} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -- Main Renderer ----------------------------------------------------------- */
export default function ModernJourneyVoucher({ settings = {}, booking: rawBooking, voucher: voucherOverride, brand = {} }) {
  const sourceBooking = rawBooking || MODERN_JOURNEY_DUMMY;
  const voucher = voucherOverride || sourceBooking.voucher || {};
  const sourceGuests = Array.isArray(voucher.guests) && voucher.guests.length ? voucher.guests : sourceBooking.guests || [];
  const sourceFlights = Array.isArray(voucher.flights) && voucher.flights.length ? voucher.flights : sourceBooking.flights || [];
  const sourceHotels = Array.isArray(voucher.hotels) && voucher.hotels.length ? voucher.hotels : sourceBooking.hotels || [];
  const sourceServices = Array.isArray(voucher.services) && voucher.services.length ? voucher.services : sourceBooking.services || [];
  const booking = {
    ...sourceBooking,
    guestName: sourceBooking.guestName || sourceGuests.find((guest) => guest.isLeader)?.name || sourceGuests[0]?.name || '',
    guestEmail: sourceBooking.guestEmail || sourceGuests.find((guest) => guest.isLeader)?.email || sourceGuests[0]?.email || '',
    guestPhone: sourceBooking.guestPhone || sourceGuests.find((guest) => guest.isLeader)?.phone || sourceGuests[0]?.phone || '',
    adults: sourceBooking.adults ?? sourceGuests.filter((guest) => (guest.type || 'Adult') === 'Adult').length,
    children: sourceBooking.children ?? sourceGuests.filter((guest) => guest.type === 'Child').length,
    infants: sourceBooking.infants ?? sourceGuests.filter((guest) => guest.type === 'Infant').length,
  };
  const cfg = {
    ...defaultCfg,
    primaryColor: settings.primaryColor || defaultCfg.primaryColor,
    secondaryColor: settings.secondaryColor || defaultCfg.secondaryColor,
    accentColor: settings.accentColor || defaultCfg.accentColor,
    backgroundColor: settings.backgroundColor || defaultCfg.backgroundColor,
    companyName: brand.name || settings.companyName || defaultCfg.companyName,
    logo: brand.logo || LogoImg,
    tagline: settings.tagline || defaultCfg.tagline,
    welcomeHeading: settings.welcomeTitle || settings.welcomeHeading || defaultCfg.welcomeHeading,
    preparedForLabel: settings.preparedForLabel || defaultCfg.preparedForLabel,
  };
  const sec = {
    cover: settings.sections?.cover !== false,
    flights: settings.sections?.flights !== false,
    guestDetails: settings.sections?.guestDetails !== false || settings.sections?.guests !== false,
    hotels: settings.sections?.hotels !== false,
    tours: settings.sections?.tours !== false || settings.sections?.activities !== false,
    transfers: settings.sections?.transfers !== false,
    importantNotes: settings.sections?.importantNotes !== false,
    itinerary: settings.sections?.itinerary !== false,
  };
  const showPassport = Boolean(settings.showPassport);
  const showDOB = Boolean(settings.showDOB);

  const flights = sortVoucherFlights(sourceFlights.map((flight) => ({ ...flight, airline: flight.airline || flight.airlineName || flight.carrier || '', flightNo: flight.flightNo || flight.airlineFlight || flight.flight || '', date: flight.date || flight.flightDate || '' })));
  const guests = sourceGuests;
  const hotels = sortVoucherRows(sourceHotels).map((hotel) => ({ ...hotel, roomAllocationLabel: hotelRoomAllocationText(hotel, sourceBooking) }));
  const allServices = sortVoucherRows(sourceServices);
  const tours = allServices.filter((service) => ['Sightseeing', 'Restaurant', 'Meal', 'Yacht', 'Ferry', 'Guide', 'Other'].includes(service.type));
  const transfers = allServices.filter((service) => service.type === 'Transfer');
  const itinerary = sortVoucherRows((Array.isArray(voucher.itinerary) && voucher.itinerary.length ? voucher.itinerary : sourceBooking.itinerary) || []);
  const parsedNotes = (() => {
    const raw = sourceBooking.importantNotes || settings.importantNotes || voucher.importantNotes;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.trim()) return raw.split('\n').filter(Boolean).map((t) => ({ title: '', text: t }));
    return [];
  })();
  const voucherTermsHtml = composeVoucherTermsHtml(voucher);

  const pages = [];
  if (sec.cover) pages.push('cover');
  const hasImportantNotes = parsedNotes.length > 0 || hasVoucherTerms(voucher);
  if ((sec.hotels && hotels.length > 0) || (sec.tours && tours.length > 0) || (sec.transfers && transfers.length > 0)) pages.push('services');
  if ((sec.guestDetails && guests.length > 0) || (sec.importantNotes && hasImportantNotes)) pages.push('notes');
  if (sec.itinerary && itinerary.length > 0) { pages.push('itinerary-cover'); pages.push('itinerary-days'); }
  const totalPages = pages.length;

  const renderPage = (pageKey, pageNum) => {
    switch (pageKey) {
      case 'cover':
        return (
          <A4Page key="cover" cfg={cfg} booking={booking} pageNum={pageNum} totalPages={totalPages}>
            <BookingSummaryStrip booking={booking} cfg={cfg} />
            <GuestOverviewCard booking={booking} cfg={cfg} />
            {sec.flights && flights.length > 0 && <FlightSection flights={flights} cfg={cfg} />}
          </A4Page>
        );
      case 'services':
        return (
          <A4Page key="services" cfg={cfg} booking={booking} pageNum={pageNum} totalPages={totalPages}>
            {sec.hotels && hotels.length > 0 && <HotelCards hotels={hotels} cfg={cfg} />}
            {sec.tours && tours.length > 0 && <TourGrid tours={tours} cfg={cfg} />}
            {sec.transfers && transfers.length > 0 && <TransferTimeline transfers={transfers} cfg={cfg} />}
          </A4Page>
        );
      case 'notes':
        return (
          <A4Page key="notes" cfg={cfg} booking={booking} pageNum={pageNum} totalPages={totalPages}>
            {sec.guestDetails && guests.length > 0 && <GuestDetailTable guests={guests} cfg={cfg} showPassport={showPassport} showDOB={showDOB} />}
            {sec.importantNotes && hasImportantNotes && <ImportantNotesSection notes={parsedNotes} html={voucherTermsHtml} cfg={cfg} />}
          </A4Page>
        );
      case 'itinerary-cover':
        return <ItineraryCoverPage key="itinerary-cover" cfg={cfg} booking={booking} pageNum={pageNum} totalPages={totalPages} />;
      case 'itinerary-days':
        return (
          <A4Page key="itinerary-days" cfg={cfg} booking={booking} pageNum={pageNum} totalPages={totalPages}>
            <SectionLabel number={8} label="Day-wise Itinerary" cfg={cfg} />
            {itinerary.map((item, i) => <DayBlock key={item.id || i} item={item} index={i} cfg={cfg} />)}
          </A4Page>
        );
      default: return null;
    }
  };

  return (
    <div className="mjv-root" style={{ fontFamily: "'Manrope', 'Inter', system-ui, sans-serif" }}>
      <style>{FONT_STYLE}</style>
      {pages.map((pageKey, index) => renderPage(pageKey, index + 1))}
    </div>
  );
}

/* -- Thumbnail --------------------------------------------------------------- */
export function ModernJourneyThumbnail({ settings = {} }) {
  const cfg = {
    primaryColor: settings.primaryColor || '#173B8F',
    secondaryColor: settings.secondaryColor || '#0F2348',
    accentColor: settings.accentColor || '#F4B942',
    backgroundColor: settings.backgroundColor || '#F6F8FC',
    borderColor: '#DCE3EE',
  };
  return (
    <div style={{ width: '100%', height: 80, borderRadius: 6, overflow: 'hidden', border: `1px solid ${cfg.primaryColor}33` }}>
      <div style={{ height: 16, background: `linear-gradient(135deg, ${cfg.secondaryColor}, ${cfg.primaryColor})`, display: 'flex', alignItems: 'center', padding: '0 6px', gap: 4 }}>
        <div style={{ width: 18, height: 8, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
        <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.6)', borderRadius: 1 }} />
        <div style={{ fontSize: 5, fontWeight: 800, color: cfg.accentColor }}>VOUCHER</div>
      </div>
      <div style={{ background: cfg.backgroundColor, padding: '4px 5px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
          {['CODE', 'DATES', 'PAX'].map((l) => (
            <div key={l} style={{ background: '#fff', borderRadius: 3, padding: '2px 3px', border: `1px solid ${cfg.primaryColor}20` }}>
              <div style={{ height: 2, width: '50%', background: cfg.accentColor, borderRadius: 1, marginBottom: 2 }} />
              <div style={{ height: 4, background: `${cfg.primaryColor}40`, borderRadius: 1 }} />
            </div>
          ))}
        </div>
        <div style={{ background: '#fff', borderRadius: 4, padding: '3px 4px', border: `1px solid ${cfg.borderColor}`, borderLeft: `2px solid ${cfg.primaryColor}` }}>
          <div style={{ height: 3, width: '40%', background: `${cfg.primaryColor}60`, borderRadius: 1, marginBottom: 2 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {[1, 2, 3, 4].map((n) => <div key={n} style={{ height: 2.5, background: `${cfg.primaryColor}25`, borderRadius: 1 }} />)}
          </div>
        </div>
        <div style={{ background: `linear-gradient(135deg, ${cfg.secondaryColor}CC, ${cfg.primaryColor}CC)`, borderRadius: 3, padding: '2px 4px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ flex: 1, height: 2.5, background: 'rgba(255,255,255,0.4)', borderRadius: 1 }} />
          <div style={{ width: 18, height: 2.5, background: cfg.accentColor, borderRadius: 1 }} />
        </div>
      </div>
    </div>
  );
}
