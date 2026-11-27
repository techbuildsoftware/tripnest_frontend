/**
 * PORTRAIT CREATIVE QUOTATION TEMPLATE
 * Teal · Sky blue · Sunshine gold — an illustrated, travel-magazine style
 * portrait quotation: full-bleed cover, diamond trip stats, hotel / flight /
 * transfer tables and offset-photo day cards on a doodle background.
 *
 * Uses the same `quotation` + `config` props as every other PDF template and
 * never reads supplier cost, so it is safe for client PDFs.
 */
import React from 'react';
import { formatDate } from '../../../../lib/date';
import { resolveCoverImage } from '../data/pdfConfig';
import { quotationPassengerPrices, quotationPricePerPerson, quotationTotals } from '../data/quotationPdf';
import CoverArt from '../../../../assets/PortrateCreative.png';
import FooterArt from '../../../../assets/PortrateFooter.png';

const P = {
  teal:   '#0E9B97',
  deep:   '#087A7A',
  ink:    '#0B3B45',
  soft:   '#E8F7F6',
  mint:   '#CDEEEB',
  sun:    '#F6B73C',
  sky:    '#BFE3FA',
  skySoft:'#EAF6FD',
  text:   '#1F3A44',
  muted:  '#66818A',
  line:   '#D3E8E6',
  white:  '#FFFFFF',
};

const FALLBACK = {
  cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80',
  destination: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&q=70',
  Hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=70',
  Transfer: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=500&q=70',
  Sightseeing: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=500&q=70',
  Activity: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=500&q=70',
};

const printableAssetUrl = (source) => typeof window === 'undefined' || /^https?:/i.test(source) || /^data:/i.test(source)
  ? source
  : new URL(source, window.location.origin).href;

const fmt = (val, sym) => `${sym || '฿'}${Number(val || 0).toLocaleString()}`;

const MEAL_LABELS = {
  RO: 'Room Only', EP: 'Room Only', BB: 'Breakfast', RB: 'Breakfast', CP: 'Breakfast',
  HB: 'Half Board', MAP: 'Half Board', FB: 'Full Board', AP: 'Full Board', AI: 'All Inclusive',
};
// Compact "02 Nov 2026" date for narrow table cells; falls back to the raw text.
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  let y; let m; let d;
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) { [, y, m, d] = match; } else {
    match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (match) { [, d, m, y] = match; }
  }
  if (!y || Number(m) < 1 || Number(m) > 12) return text;
  return `${String(Number(d)).padStart(2, '0')} ${SHORT_MONTHS[Number(m) - 1]} ${y}`;
};
const mealLabel = (code) => MEAL_LABELS[String(code || '').trim().toUpperCase()] || String(code || '').trim();

// Doodle travel pattern used as a very light page background.
const DOODLE = (() => {
  const c = P.teal;
  // 300px tile of travel doodles (plane, balloon, suitcase, compass, sailboat,
  // lifebuoy, camera, ticket, mountains, sun, hearts) joined by dashed trails.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300' fill='none' stroke='${c}' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' opacity='0.16'>`
    // plane
    + `<path d='M20 46 l38 -11 l-10 -17 l8 -3 l20 17 l28 -9 c6 -2 11 4 4 8 l-28 11 l-8 22 l-8 2 l3 -21 l-27 8 z'/>`
    + `<path d='M2 70 C30 80 50 62 72 74' stroke-dasharray='3 5'/>`
    // hot-air balloon
    + `<ellipse cx='222' cy='44' rx='20' ry='24'/><path d='M202 50 q20 16 40 0 M222 20 v48 M210 68 l4 12 h16 l4 -12 z'/>`
    // suitcase
    + `<rect x='30' y='128' width='52' height='38' rx='6'/><path d='M46 128 v-8 h20 v8 M30 142 h52 M50 166 v6 M62 166 v6'/>`
    // compass
    + `<circle cx='150' cy='150' r='24'/><circle cx='150' cy='150' r='3'/><path d='M150 124 v-6 M150 182 v6 M124 150 h-6 M182 150 h6 M142 158 l22 -16 l-8 24 z'/>`
    // sailboat
    + `<path d='M236 160 v-44 l30 40 z M236 160 h-20 M218 168 h58 l-8 14 h-42 z'/><path d='M210 190 q9 6 18 0 t18 0 t18 0' stroke-dasharray='2 4'/>`
    // lifebuoy
    + `<circle cx='60' cy='232' r='22'/><circle cx='60' cy='232' r='9'/><path d='M44 216 l10 10 M76 216 l-10 10 M44 248 l10 -10 M76 248 l-10 -10'/>`
    // camera
    + `<rect x='118' y='214' width='50' height='34' rx='6'/><circle cx='143' cy='231' r='10'/><path d='M130 214 l4 -8 h18 l4 8'/>`
    // ticket
    + `<path d='M208 224 h56 a4 4 0 0 0 0 10 a4 4 0 0 0 0 10 h-56 a4 4 0 0 1 0 -10 a4 4 0 0 1 0 -10 z M232 224 v20' stroke-dasharray='0'/>`
    // mountains + sun
    + `<path d='M6 296 l30 -42 l16 20 l14 -14 l30 36 z'/><circle cx='262' cy='282' r='10'/><path d='M262 262 v-4 M262 306 v-4 M242 282 h-4 M286 282 h-4 M248 268 l-3 -3 M276 296 l3 3 M276 268 l3 -3 M248 296 l-3 3'/>`
    // hearts & stars
    + `<path d='M104 90 c-6 -8 -16 0 -8 8 l8 8 l8 -8 c8 -8 -2 -16 -8 -8 z'/><path d='M284 110 l3 7 l8 1 l-6 5 l2 8 l-7 -4 l-7 4 l2 -8 l-6 -5 l8 -1 z'/>`
    + `<path d='M110 272 C150 258 180 290 214 270' stroke-dasharray='3 5'/><path d='M90 120 C110 140 120 100 140 112' stroke-dasharray='3 5'/>`
    + `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

/* ─── Inline icons (no icon-font dependency, so PDF export stays crisp) ───── */
const Svg = ({ size = 12, color = 'currentColor', sw = 2, children, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>{children}</svg>
);
const IPin = (p) => <Svg {...p} fill={p.color || 'currentColor'} sw={0}><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></Svg>;
const IBed = (p) => <Svg {...p}><path d="M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" /><circle cx="7" cy="11" r="1.6" /></Svg>;
const IFork = (p) => <Svg {...p}><path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2.2 1.4-3 4-3 7 0 1.6 1 2.6 3 3" /></Svg>;
const ICal = (p) => <Svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></Svg>;
const IHour = (p) => <Svg {...p}><path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9" /></Svg>;
const IUsers = (p) => <Svg {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M16.5 14.6c2.6.1 4.5 1.9 4.5 4.4" /></Svg>;
const IUser = (p) => <Svg {...p} fill={p.color || 'currentColor'} sw={0}><circle cx="12" cy="8" r="4.2" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" /></Svg>;
const IMail = (p) => <Svg {...p} fill={p.color || 'currentColor'} sw={0}><path d="M3 5h18a1 1 0 0 1 1 1v.4l-10 6.6L2 6.4V6a1 1 0 0 1 1-1zm-1 3.8l10 6.6 10-6.6V18a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" /></Svg>;
const IPhone = (p) => <Svg {...p} fill={p.color || 'currentColor'} sw={0}><path d="M6.6 3h3l1.4 4.2-2 1.4a11 11 0 0 0 5.4 5.4l1.4-2L20 13.4v3A3.6 3.6 0 0 1 16.4 20 14.4 14.4 0 0 1 3 6.6 3.6 3.6 0 0 1 6.6 3z" /></Svg>;
const IBuilding = (p) => <Svg {...p}><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" /></Svg>;
const IPlane = (p) => <Svg {...p}><path d="M2 14l9-2 3-8 2 .5-1.6 8 6.6-1.8c1.7-.4 2.4 1.6.8 2.3L14 16l-1.5 5-2-.4.6-4.4L2 16z" /></Svg>;
const ICar = (p) => <Svg {...p}><path d="M3 15v-3l2-5a2 2 0 0 1 1.9-1.3h10.2A2 2 0 0 1 19 7l2 5v3M3 15h18M3 15v3h3v-2M21 15v3h-3v-2" /><circle cx="7.5" cy="14" r=".6" /><circle cx="16.5" cy="14" r=".6" /><path d="M5 12h14" /></Svg>;
const ICheck = (p) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
const ICross = (p) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
const IGlobe = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></Svg>;

/* ─── Building blocks ─────────────────────────────────────────────────────── */
function Diamond({ icon, value, label }) {
  return (
    <div style={{ textAlign: 'center', width: 96 }}>
      <div style={{ width: 46, height: 46, margin: '0 auto 8px', transform: 'rotate(45deg)', borderRadius: 9, background: `linear-gradient(135deg, ${P.teal}, ${P.deep})`, boxShadow: `0 4px 10px ${P.teal}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${P.white}`, outline: `1.5px solid ${P.teal}` }}>
        <div style={{ transform: 'rotate(-45deg)' }}>{icon}</div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, color: P.ink, whiteSpace: 'nowrap' }}>{value}</div>
      <div style={{ fontSize: 6, fontWeight: 700, color: P.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function SectionTitle({ children, sub, right }) {
  return (
    <div data-pdf-section-heading="true" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', margin: '0 0 10px' }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 900, color: P.deep, letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.1 }}>{children}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <div style={{ width: 34, height: 3, borderRadius: 2, background: P.teal }} />
          <div style={{ width: 8, height: 3, borderRadius: 2, background: P.sun }} />
        </div>
        {sub && <div style={{ fontSize: 7.5, color: P.muted, marginTop: 4 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function RunningHeader({ quotation, brand }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 26px', background: `linear-gradient(90deg, ${P.skySoft}, ${P.white})`, borderBottom: `2px solid ${P.teal}`, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {quotation?.logo
          ? <img src={printableAssetUrl(quotation.logo)} alt="" style={{ height: 18, maxWidth: 56, objectFit: 'contain' }} />
          : <div style={{ width: 18, height: 18, borderRadius: 5, background: P.teal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IGlobe size={11} color="#fff" /></div>}
        <div style={{ fontSize: 9, fontWeight: 900, color: P.ink }}>{brand}</div>
      </div>
      <div style={{ fontSize: 7.5, fontWeight: 700, color: P.deep }}>
        {quotation?.destination || 'Travel Quotation'} <span style={{ color: P.sun }}>●</span> {quotation?.quotationNo || 'QT-2026-000'}
      </div>
    </div>
  );
}

function DataTable({ columns, rows }) {
  // Columns flagged `nowrap` (dates, meals, pax) shrink to their content and
  // never split mid-word; the remaining text columns share the free space and
  // wrap on word boundaries only.
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 6.5, tableLayout: 'fixed' }}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', fontSize: 5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: P.teal, padding: '4px 4px', borderBottom: `1.5px solid ${P.teal}`, whiteSpace: 'nowrap', width: c.w }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} data-pdf-keep-together="true" style={{ background: i % 2 ? P.soft : 'transparent' }}>
            {columns.map((c) => (
              <td key={c.key} style={{ padding: '5px 4px', color: P.text, verticalAlign: 'middle', lineHeight: 1.3, fontWeight: c.bold ? 700 : 400, whiteSpace: c.nowrap ? 'nowrap' : 'normal', overflowWrap: c.nowrap ? 'normal' : 'anywhere', wordBreak: 'normal', fontSize: c.nowrap ? 6 : 6.5, letterSpacing: c.nowrap ? '-0.01em' : undefined }}>{row[c.key] || '–'}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IconPanel({ icon, children }) {
  return (
    <div style={{ position: 'relative', margin: '0 0 14px 34px' }} data-pdf-keep-together="true">
      <div style={{ position: 'absolute', left: -34, top: '50%', transform: 'translateY(-50%)', width: 68, height: 68, borderRadius: '50%', background: `linear-gradient(135deg, ${P.teal}, ${P.deep})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${P.teal}55`, border: `3px solid ${P.white}`, zIndex: 2 }}>
        {icon}
      </div>
      <div style={{ border: `1.5px solid ${P.teal}`, borderRadius: 10, boxSizing: 'border-box', minWidth: 0, overflow: 'hidden', padding: '8px 10px 8px 44px', background: P.white }}>
        {children}
      </div>
    </div>
  );
}

function DayCard({ day, showImages, hotelMeals, imageFor }) {
  const services = day.services || [];
  const hotelSvc = services.find((s) => s.type === 'Hotel');
  const mealSvcs = services.filter((s) => s.type === 'Meal' || s.type === 'Restaurant').map((s) => s.label || s.name);
  const hotelMeal = hotelSvc ? hotelMeals[hotelSvc.name] || hotelMeals[hotelSvc.label] : '';
  const meal = mealSvcs.length ? mealSvcs.join(', ') : hotelMeal;
  const img = showImages ? imageFor(day) : null;
  const highlights = services.filter((s) => s.type !== 'Hotel' && (s.label || s.name));
  const destination = (day.destination || '').trim();

  return (
    <div data-pdf-itinerary-day="true" data-pdf-keep-together="true" style={{ margin: '0 0 14px', borderTop: `1.5px solid ${P.teal}`, borderBottom: `1.5px solid ${P.teal}`, background: 'rgba(255,255,255,0.92)', padding: '12px 0 12px', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {img && (
          <div style={{ position: 'relative', width: 156, height: 98, flexShrink: 0, marginLeft: 2 }}>
            <div style={{ position: 'absolute', right: -6, bottom: -6, width: '100%', height: '100%', background: P.teal, borderRadius: 4 }} />
            <img src={img} alt="" style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 4, border: `2px solid ${P.white}` }}
              onError={(e) => { e.target.src = FALLBACK.destination; }} />
            <div style={{ position: 'absolute', left: 6, top: 6, background: P.sun, color: P.ink, fontSize: 7, fontWeight: 900, padding: '2px 7px', borderRadius: 10, letterSpacing: '0.06em' }}>
              DAY {String(day.day || 1).padStart(2, '0')}
            </div>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {destination && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 8.5, color: P.text }}><IPin size={11} color={P.teal} /><span style={{ fontWeight: 700 }}>{destination}</span></div>}
          {hotelSvc && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 8.5, color: P.text }}><IBed size={11} color={P.teal} /><span>{hotelSvc.label || hotelSvc.name}</span></div>}
          {meal && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 8.5, color: P.text }}><IFork size={11} color={P.teal} /><span>{mealLabel(meal)}</span></div>}
          {day.date && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 7.5, color: P.muted }}><ICal size={11} color={P.teal} /><span>{formatDate(day.date, '')}</span></div>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '14px 0 6px' }}>
        <IPin size={13} color={P.teal} />
        <div style={{ fontSize: 10, fontWeight: 900, color: P.ink }}>Day {day.day} : {day.title || destination || `Day ${day.day}`}</div>
      </div>
      {day.description && <div style={{ fontSize: 7.6, lineHeight: 1.6, color: P.text, textAlign: 'justify' }}>{day.description}</div>}
      {highlights.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {highlights.map((s, i) => (
            <span key={i} data-pdf-itinerary-service="true" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: P.soft, color: P.deep, border: `1px solid ${P.mint}`, borderRadius: 20, padding: '2px 8px', fontSize: 6.8, fontWeight: 700 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: P.sun }} />{s.label || s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function BulletList({ items, positive }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {items.map((t, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 7.6, lineHeight: 1.45, color: P.text }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: positive ? P.teal : '#E4636B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 0.5 }}>
            {positive ? <ICheck size={8} color="#fff" sw={3} /> : <ICross size={7} color="#fff" sw={3} />}
          </div>
          <span>{typeof t === 'string' ? t : t?.text || t?.title || ''}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main export ─────────────────────────────────────────────────────────── */
export function PortraitCreativeTemplate({ quotation, config }) {
  const sym = quotation.currency === 'THB' ? '฿' : (quotation.currency || '฿');
  const { totalSelling } = quotationTotals(quotation);
  const perPerson = quotationPricePerPerson(quotation);
  const passengerPrices = quotationPassengerPrices(quotation);
  const perPersonLabel = passengerPrices.hasDifferentChildPrice
    ? `${fmt(passengerPrices.adult, sym)} per adult · ${fmt(passengerPrices.child, sym)} per child`
    : `${fmt(perPerson, sym)} per person`;

  const fontFamily = config?.fontStyle === 'georgia' ? 'Georgia, serif'
    : config?.fontStyle === 'roboto' ? 'Roboto, sans-serif'
      : 'Inter, Manrope, system-ui, sans-serif';

  // Teal is this template's identity; only a deliberately custom theme overrides it.
  const teal = config?.theme === 'custom' && config?.accentColor ? config.accentColor : P.teal;
  const T = { ...P, teal };

  const brand = quotation?.companyDetails?.name || quotation?.agent?.name || 'Travel Quotation';
  // The bundled illustrated cover is this template's signature look. It is only
  // replaced when the user uploads their own cover image in Cover Image settings.
  const useCustomCover = config?.coverImage === 'custom-upload' && !!config?.coverImageUrl;
  const coverImg = useCustomCover ? resolveCoverImage(config) : printableAssetUrl(CoverArt);
  const coverBg = config?.coverBackground || 'destination-image';
  const heroFlat = coverBg === 'gradient' ? { background: `linear-gradient(160deg, ${P.sky}, ${T.teal})` }
    : coverBg === 'solid' ? { background: T.teal } : null;

  const showHotelImg = config?.showHotelImages !== false;
  const showActivityImg = config?.showActivityImages !== false;
  const showTransferImg = config?.showTransferImages === true;
  const showClientPrice = !config?.clientPreview || config?.showClientPrice !== false;
  const showItinerary = config?.showClientItinerary !== false;
  const showHotels = config?.showClientHotels !== false;

  const hotels = quotation.hotels || [];
  const flights = quotation.flights || [];
  const transfers = quotation.transfers || [];
  const itinerary = showItinerary ? (quotation.itinerary || []) : [];
  const inclusions = quotation.inclusions || [];
  const exclusions = quotation.exclusions || [];
  const notes = (quotation.importantNotes || []).slice(0, 8);
  const payment = quotation.paymentTerms || [];
  const cancellation = quotation.cancellationPolicy || [];

  const hotelMeals = {};
  hotels.forEach((h) => { if (h.name && h.mealPlan) hotelMeals[h.name] = h.mealPlan; });

  // Day photo: honour the Hotel / Activity / Transfer image toggles like the other templates.
  const imageFor = (day) => {
    if (day.image) return day.image;
    for (const svc of day.services || []) {
      const type = svc?.type || '';
      if (type === 'Hotel' && !showHotelImg) continue;
      if ((type === 'Sightseeing' || type === 'Activity') && !showActivityImg) continue;
      if (type === 'Transfer' && !showTransferImg) continue;
      if (svc.image) return svc.image;
    }
    return FALLBACK.destination;
  };

  const PAGE_DAYS = 3;
  const dayPages = [];
  for (let i = 0; i < itinerary.length; i += PAGE_DAYS) dayPages.push(itinerary.slice(i, i + PAGE_DAYS));

  const page = {
    width: 595, minHeight: 842, boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
    background: `${P.white} ${DOODLE}`, backgroundSize: '300px 300px',
    fontFamily, fontSize: 9, color: P.text, overflow: 'hidden', position: 'relative',
  };
  const body = { padding: '18px 26px 22px', flex: 1, display: 'flex', flexDirection: 'column' };
  const separator = { borderBottom: '1px dashed #E2E8F0', marginBottom: 20 };

  const hotelRows = hotels.map((h) => ({
    city: h.city || '', name: h.name, room: h.roomType || h.category || '',
    meal: mealLabel(h.mealPlan), checkIn: shortDate(formatDate(h.checkIn, '')), checkOut: shortDate(formatDate(h.checkOut, '')),
  }));
  const guestCount = (Number(quotation.adults || 0) + Number(quotation.children || 0)) || '–';
  const hasLogistics = flights.length > 0 || transfers.length > 0;

  return (
    <div style={{ fontFamily }}>

      {/* ══ PAGE 1 — COVER ══════════════════════════════════════════════════ */}
      <div className="a4-page" style={{ ...page, ...separator }}>
        <div style={{ position: 'relative', height: 548, flexShrink: 0, overflow: 'hidden', background: heroFlat ? heroFlat.background : '#9ED2F2' }}>
          {!heroFlat && <img src={coverImg} alt="Destination" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center bottom', display: 'block' }} onError={(e) => { e.target.style.display = 'none'; }} />}
          {/* soft fade into the white page under the globe's shadow */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 46, background: 'linear-gradient(0deg, #FFFFFF 0%, rgba(255,255,255,0) 100%)' }} />

          {/* sky-blue title band, like the reference */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, padding: '12px 24px 18px', textAlign: 'center', background: `linear-gradient(180deg, ${P.sky} 0%, ${P.sky}F0 62%, ${P.sky}00 100%)` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {quotation?.logo
                  ? <img src={printableAssetUrl(quotation.logo)} alt="" style={{ height: 20, maxWidth: 64, objectFit: 'contain' }} />
                  : <div style={{ width: 20, height: 20, borderRadius: 6, background: T.teal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IGlobe size={12} color="#fff" /></div>}
                <div style={{ fontSize: 8.5, fontWeight: 900, color: P.ink }}>{brand}</div>
              </div>
              <div style={{ fontSize: 6.3, fontWeight: 800, color: P.ink, letterSpacing: '0.16em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.7)', padding: '3px 9px', borderRadius: 20 }}>Travel Quotation</div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: P.ink, letterSpacing: '-0.3px', lineHeight: 1.15 }}>
              {quotation.destination || 'Your Dream Holiday'}{quotation.packageType ? ` ${quotation.packageType}` : ''}
            </div>
          </div>

          {/* quotation number badge, bottom-right of the artwork */}
          <div style={{ position: 'absolute', right: 24, bottom: 14, zIndex: 3, background: P.white, border: `1.5px solid ${T.teal}`, borderRadius: 9, padding: '5px 14px', boxShadow: `0 4px 12px ${T.teal}33`, textAlign: 'center' }}>
            <div style={{ fontSize: 5.5, fontWeight: 800, color: P.muted, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Quotation No.</div>
            <div style={{ fontSize: 10.5, fontWeight: 900, color: P.ink, marginTop: 1 }}>{quotation.quotationNo || 'QT-2026-000'}</div>
          </div>
        </div>

        <div style={{ ...body, paddingTop: 4, paddingBottom: 14 }}>
          {/* Prepared for + diamond stats */}
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: T.teal, letterSpacing: '0.03em' }}>PREPARED FOR</div>
              <div style={{ height: 2, background: `linear-gradient(90deg, ${T.teal}, ${T.teal}00)`, margin: '4px 0 10px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  { icon: <IUser size={11} color={T.teal} />, text: quotation.guest?.name || 'Valued Guest', strong: true },
                  quotation.guest?.email && { icon: <IMail size={11} color={T.teal} />, text: quotation.guest.email },
                  quotation.guest?.phone && { icon: <IPhone size={11} color={T.teal} />, text: quotation.guest.phone },
                  quotation.agent?.name && { icon: <IBuilding size={11} color={T.teal} />, text: `Booked via ${quotation.agent.name}` },
                ].filter(Boolean).map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: r.strong ? 10.5 : 8.5, fontWeight: r.strong ? 800 : 500, color: P.ink }}>
                    {r.icon}<span>{r.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, paddingTop: 2 }}>
              <Diamond icon={<ICal size={18} color="#fff" />} value={formatDate(quotation.quotationDate, '') || formatDate(quotation.travelStartDate, '–')} label="Quotation Date" />
              <Diamond icon={<IHour size={18} color="#fff" />} value={(quotation.duration || '–').split(' ').slice(0, 3).join(' ')} label="Duration" />
              <Diamond icon={<IUsers size={18} color="#fff" />} value={guestCount} label="Total Guests" />
            </div>
          </div>

          {/* Trip facts strip */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', marginTop: 12, border: `1.5px solid ${P.line}`, borderRadius: 12, overflow: 'hidden', background: P.white }}>
            {[
              { label: 'Destination', value: quotation.destination || '–' },
              { label: 'Travellers', value: `${quotation.adults || 0} Adults • ${quotation.children || 0} Children` },
              { label: 'Rooms', value: `${quotation.rooms || 1} Room${Number(quotation.rooms || 1) === 1 ? '' : 's'}` },
            ].map((f, i) => (
              <div key={f.label} style={{ padding: '6px 12px', borderRight: i < 2 ? `1px solid ${P.line}` : 'none', background: i % 2 ? P.soft : P.white }}>
                <div style={{ fontSize: 5.8, fontWeight: 800, color: P.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{f.label}</div>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: P.ink, marginTop: 3 }}>{f.value}</div>
              </div>
            ))}
          </div>

          {showClientPrice && (
            <div style={{ marginTop: 10, borderRadius: 14, overflow: 'hidden', background: `linear-gradient(120deg, ${P.deep} 0%, ${T.teal} 100%)`, padding: '9px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
              <div style={{ position: 'absolute', right: -24, top: -34, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 6.5, fontWeight: 800, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Your Package Price</div>
                <div style={{ width: 26, height: 2.5, background: P.sun, borderRadius: 2, margin: '5px 0' }} />
                <div style={{ fontSize: 8, fontWeight: 700, color: P.sun }}>{perPersonLabel}</div>
              </div>
              <div style={{ position: 'relative', fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>{fmt(totalSelling, sym)}</div>
            </div>
          )}

        </div>
      </div>

      {/* ══ PAGE 2 — STAY · FLIGHTS · TRANSFERS ═════════════════════════════ */}
      {((showHotels && hotelRows.length > 0) || hasLogistics) && (
        <div className="a4-page" style={{ ...page, ...separator }}>
          <RunningHeader quotation={quotation} brand={brand} />
          <div style={body}>
            {showHotels && hotelRows.length > 0 && (
              <>
                <SectionTitle sub="Handpicked stays for your journey" right={<div style={{ fontSize: 7, fontWeight: 800, color: T.teal }}>{hotelRows.length} {hotelRows.length === 1 ? 'HOTEL' : 'HOTELS'}</div>}>Where You&rsquo;ll Stay</SectionTitle>
                <IconPanel icon={<IBuilding size={32} color="#fff" sw={1.6} />}>
                  <DataTable
                    columns={[
                      { key: 'city', label: 'City', w: '12%', nowrap: true },
                      { key: 'name', label: 'Hotel Name', w: '24%', bold: true },
                      { key: 'room', label: 'Room Category', w: '16%' },
                      { key: 'meal', label: 'Meals', w: '12%', nowrap: true },
                      { key: 'checkIn', label: 'Check-In', w: '18%', nowrap: true },
                      { key: 'checkOut', label: 'Check-Out', w: '18%', nowrap: true },
                    ]}
                    rows={hotelRows}
                  />
                </IconPanel>
              </>
            )}

            {hasLogistics && (
              <div style={{ margin: '4px -26px 0', background: `linear-gradient(160deg, ${T.teal} 0%, ${P.deep} 100%)`, padding: '20px 26px 22px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: -40, bottom: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
                {flights.length > 0 && (
                  <div data-pdf-keep-together="true" style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: transfers.length ? 18 : 0, position: 'relative' }}>
                    <div style={{ width: 62, flexShrink: 0, textAlign: 'center' }}>
                      <IPlane size={54} color="#fff" sw={1.2} />
                      <div style={{ fontSize: 6.5, fontWeight: 800, color: '#fff', letterSpacing: '0.2em', marginTop: 4 }}>FLIGHTS</div>
                    </div>
                    <div style={{ flex: 1, background: '#fff', borderRadius: 10, padding: '6px 8px' }}>
                      <DataTable
                        columns={[
                          { key: 'from', label: 'From', w: '24%' }, { key: 'to', label: 'To', w: '24%' },
                          { key: 'airline', label: 'Airline', w: '20%', bold: true }, { key: 'dep', label: 'Departure', w: '16%' }, { key: 'arr', label: 'Arrival', w: '16%' },
                        ]}
                        rows={flights.map((f) => ({ from: f.fromSector, to: f.toSector, airline: f.airlineFlight, dep: f.departure ? formatDate(f.departure, f.departure) : '', arr: f.arrival ? formatDate(f.arrival, f.arrival) : '' }))}
                      />
                    </div>
                  </div>
                )}
                {transfers.length > 0 && (
                  <div data-pdf-keep-together="true" style={{ display: 'flex', gap: 14, alignItems: 'center', position: 'relative' }}>
                    <div style={{ width: 62, flexShrink: 0, textAlign: 'center' }}>
                      <ICar size={54} color="#fff" sw={1.2} />
                      <div style={{ fontSize: 6.5, fontWeight: 800, color: '#fff', letterSpacing: '0.2em', marginTop: 4 }}>TRANSFERS</div>
                    </div>
                    <div style={{ flex: 1, background: '#fff', borderRadius: 10, padding: '6px 8px' }}>
                      <DataTable
                        columns={[
                          { key: 'vehicle', label: 'Vehicle', w: '24%', bold: true }, { key: 'from', label: 'Pickup', w: '29%' },
                          { key: 'to', label: 'Drop', w: '29%' }, { key: 'pax', label: 'Pax', w: '18%', nowrap: true },
                        ]}
                        rows={transfers.map((t) => ({ vehicle: t.vehicle || t.type, from: t.from, to: t.to, pax: t.pax ? `${t.pax} Pax` : '' }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ ITINERARY PAGES ═════════════════════════════════════════════════ */}
      {dayPages.map((days, pi) => (
        <div key={pi} className="a4-page" style={{ ...page, ...separator }}>
          <RunningHeader quotation={quotation} brand={brand} />
          <div style={body}>
            {pi === 0 && (
              <SectionTitle sub="Day-by-day experience & inclusions" right={<div style={{ border: `1px solid ${T.teal}55`, background: P.soft, borderRadius: 8, padding: '3px 10px', fontSize: 8, fontWeight: 900, color: P.ink }}>{itinerary.length} Days</div>}>Your Itinerary</SectionTitle>
            )}
            {days.map((day, di) => (
              <DayCard key={di} day={day} showImages hotelMeals={hotelMeals} imageFor={imageFor} />
            ))}
          </div>
        </div>
      ))}

      {/* ══ FINAL PAGE — INCLUSIONS · TERMS · THANK YOU ═════════════════════ */}
      <div className="a4-page" style={{ ...page, minHeight: 842 }}>
        <RunningHeader quotation={quotation} brand={brand} />
        <div style={body}>
          {(inclusions.length > 0 || exclusions.length > 0) && (
            <>
              <SectionTitle sub="What is and isn't part of your package">Inclusions &amp; Exclusions</SectionTitle>
              <div data-pdf-keep-together="true" style={{ display: 'grid', gridTemplateColumns: exclusions.length && inclusions.length ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 16 }}>
                {inclusions.length > 0 && (
                  <div style={{ border: `1.5px solid ${T.teal}`, borderRadius: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.94)' }}>
                    <div style={{ fontSize: 8, fontWeight: 900, color: T.teal, letterSpacing: '0.14em', marginBottom: 8 }}>INCLUDED</div>
                    <BulletList items={inclusions} positive />
                  </div>
                )}
                {exclusions.length > 0 && (
                  <div style={{ border: '1.5px solid #F1C7CA', borderRadius: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.94)' }}>
                    <div style={{ fontSize: 8, fontWeight: 900, color: '#D6535C', letterSpacing: '0.14em', marginBottom: 8 }}>NOT INCLUDED</div>
                    <BulletList items={exclusions} />
                  </div>
                )}
              </div>
            </>
          )}

          {(payment.length > 0 || cancellation.length > 0) && (
            <div data-pdf-keep-together="true" style={{ display: 'grid', gridTemplateColumns: payment.length && cancellation.length ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 16 }}>
              {payment.length > 0 && (
                <div style={{ background: P.soft, borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ fontSize: 8, fontWeight: 900, color: P.deep, letterSpacing: '0.14em', marginBottom: 6 }}>PAYMENT TERMS</div>
                  {payment.map((t, i) => <div key={i} style={{ fontSize: 7.4, lineHeight: 1.5, color: P.text }}>• {typeof t === 'string' ? t : t?.text || ''}</div>)}
                </div>
              )}
              {cancellation.length > 0 && (
                <div style={{ background: P.skySoft, borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ fontSize: 8, fontWeight: 900, color: P.deep, letterSpacing: '0.14em', marginBottom: 6 }}>CANCELLATION POLICY</div>
                  {cancellation.map((t, i) => <div key={i} style={{ fontSize: 7.4, lineHeight: 1.5, color: P.text }}>• {typeof t === 'string' ? t : t?.text || ''}</div>)}
                </div>
              )}
            </div>
          )}

          {notes.length > 0 && (
            <div data-pdf-keep-together="true" style={{ borderLeft: `3px solid ${P.sun}`, background: '#FFFBF0', borderRadius: '0 10px 10px 0', padding: '9px 12px', marginBottom: 16 }}>
              <div style={{ fontSize: 8, fontWeight: 900, color: '#9A6B00', letterSpacing: '0.14em', marginBottom: 5 }}>IMPORTANT NOTES</div>
              {notes.map((t, i) => <div key={i} style={{ fontSize: 7.2, lineHeight: 1.5, color: P.text }}>• {t}</div>)}
            </div>
          )}

          {/* Thank-you + contact block */}
          <div data-pdf-keep-together="true" style={{ marginTop: 'auto', textAlign: 'center', paddingTop: 6 }}>
            {showClientPrice && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, background: `linear-gradient(120deg, ${P.deep} 0%, ${T.teal} 100%)`, color: '#fff', borderRadius: 40, padding: '8px 22px', marginBottom: 12 }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 5.8, fontWeight: 800, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.75)' }}>FINAL PACKAGE TOTAL</div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: P.sun, marginTop: 1 }}>{perPersonLabel}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{fmt(totalSelling, sym)}</div>
              </div>
            )}
            <div style={{ fontSize: 18, fontWeight: 900, color: P.deep, letterSpacing: '-0.2px' }}>Thank You!</div>
            <div style={{ width: 30, height: 2.5, background: P.sun, borderRadius: 2, margin: '4px auto 6px' }} />
            <div style={{ fontSize: 8.5, fontWeight: 800, color: P.ink, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{brand}</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 8, color: P.text }}>
              {quotation.companyDetails?.address && <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><IPin size={11} color={T.teal} />{quotation.companyDetails.address}</div>}
              {quotation.companyDetails?.phone && <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><IPhone size={11} color={T.teal} />{quotation.companyDetails.phone}</div>}
              {quotation.companyDetails?.email && <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><IMail size={11} color={T.teal} />{quotation.companyDetails.email}</div>}
              {quotation.companyDetails?.website && <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><IGlobe size={11} color={T.teal} />{quotation.companyDetails.website}</div>}
            </div>
          </div>
        </div>
        {/* Skyline artwork anchored to the very bottom of the last page */}
        <img src={printableAssetUrl(FooterArt)} alt="" style={{ display: 'block', width: '100%', height: 'auto', flexShrink: 0, marginTop: 6 }} />
      </div>
    </div>
  );
}
