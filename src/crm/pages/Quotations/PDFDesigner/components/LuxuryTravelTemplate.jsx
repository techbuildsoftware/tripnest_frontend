/**
 * LUXURY TRAVEL QUOTATION TEMPLATE
 * Navy #102A43 · Teal #168F89 · Gold #D5AA3A
 */
import React from 'react';
import { formatDate } from '../../../../lib/date';
import { resolveCoverImage } from '../data/pdfConfig';
import { quotationPassengerPrices, quotationPricePerPerson, quotationTotals } from '../data/quotationPdf';
import Logo from '../../../../assets/logo-color.png';
import { ResponsiveCardRows, ServiceDescription, pdfCardContentPadding, pdfCardImageHeight, pdfCoverImageHeight } from './PDFPrimitives';

const printableAssetUrl = (source) => typeof window === 'undefined' || /^https?:/i.test(source)
  ? source
  : new URL(source, window.location.origin).href;

const documentBrandName = (quotation) => quotation?.companyDetails?.name || quotation?.agent?.name || 'TripNest';
function DocumentBrandMark({ quotation, size = 30 }) {
  return quotation?.logo ? <img src={printableAssetUrl(quotation.logo)} alt="Company logo" style={{ height: size, maxWidth: size * 3, objectFit: 'contain', borderRadius: 6 }} /> : null;
}

const LT = {
  navy:      '#102A43',
  darkNavy:  '#0B253B',
  teal:      '#168F89',
  lightTeal: '#E8F6F4',
  gold:      '#D5AA3A',
  lightGold: '#F7EED8',
  darkText:  '#17324D',
  secondary: '#6B7785',
  border:    '#E2E8EC',
  bg:        '#FFFFFF',
  softBg:    '#F7FAFA',
};

const BADGE_STYLES = {
  Transfer:    { bg: '#E8F6F4', text: '#168F89' },
  Hotel:       { bg: '#EFF6FF', text: '#1D4ED8' },
  Activity:    { bg: '#F3E8FF', text: '#7C3AED' },
  Sightseeing: { bg: '#F3E8FF', text: '#7C3AED' },
  Leisure:     { bg: '#E8F6F4', text: '#168F89' },
  'City Tour': { bg: '#E8F6F4', text: '#168F89' },
  Departure:   { bg: '#F0FDF4', text: '#15803D' },
  Arrival:     { bg: '#eff6ff', text: '#D97706' },
  Meal:        { bg: '#eff6ff', text: '#D97706' },
  Restaurant:  { bg: '#eff6ff', text: '#D97706' },
};

const FALLBACK = {
  Hotel:       'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=70',
  Transfer:    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&q=70',
  Sightseeing: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&q=70',
  Activity:    'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&q=70',
  destination: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=70',
  Departure:   'https://images.unsplash.com/photo-1551362787-37f35a1e3671?w=400&q=70',
  cover:       'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&q=80',
};

function fmt(val, sym) { return `${sym || '\u0E3F'}${Number(val || 0).toLocaleString()}`; }

function ServiceBadge({ type }) {
  const style = BADGE_STYLES[type] || { bg: '#F1F5F9', text: '#64748B' };
  return (
    <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 20, fontSize: 6, fontWeight: 800, background: style.bg, color: style.text, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
      {type}
    </span>
  );
}

function ServiceRow({ service, sym, C, showPrice = true }) {
  const teal = C?.accent || LT.teal;
  // This template is sent to the guest, so only a customer-facing price may
  // be rendered; contract cost and supplier information remain internal.
  const sell = Number(service.sellingPrice || service.selling || service.totalSellingPrice || 0);
  return (
    <div data-pdf-itinerary-service="true" style={{ display: 'flex', gap: 8, padding: '7px 10px', borderRadius: 8, background: LT.softBg, marginBottom: 5, border: `1px solid ${LT.border}` }}>
      <div style={{ paddingTop: 1, flexShrink: 0 }}><ServiceBadge type={service.type} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 8.5, color: C?.navy || LT.darkText, marginBottom: 2 }}>{service.label || service.name || service.type}</div>
        {service.detail && <div style={{ fontSize: 7, color: LT.secondary, lineHeight: 1.4 }}>{service.detail}</div>}
        <ServiceDescription service={service} color={LT.secondary} fontSize={7} showPrice={showPrice} />
      </div>
      {showPrice && sell > 0 && (
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 6, color: LT.secondary, textTransform: 'uppercase', fontWeight: 700 }}>Price</div>
            <div style={{ fontSize: 8, fontWeight: 800, color: teal }}>{fmt(sell, sym)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function OpenDayContent({ day, C }) {
  const accent = C?.accent || LT.teal;
  const lightBg = C?.lightAccent ? `${C.lightAccent}` : LT.lightTeal;
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <div style={{ flex: 1, border: `1.5px dashed ${LT.border}`, borderRadius: 8, padding: '8px 10px', background: '#FAFBFC' }}>
        <div style={{ fontSize: 7.5, color: LT.secondary, lineHeight: 1.6 }}>{day.description || 'Free day at leisure.'}</div>
        <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, background: lightBg, padding: '3px 8px', borderRadius: 6 }}>
          <span style={{ fontSize: 6.5, fontWeight: 800, color: accent }}>Hotel Included</span>
        </div>
      </div>
      <div style={{ width: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
        <img src={day.image || FALLBACK.destination} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.src = FALLBACK.destination; }} />
      </div>
    </div>
  );
}

function DayCard({ day, sym, showPrice = true }) {
  const hasServices = day.services?.length > 0;
  const inclCount = day.services?.length || 0;
  const dayImg = day.image || (hasServices ? (day.services[0]?.image || FALLBACK[day.services[0]?.type] || FALLBACK.destination) : FALLBACK.destination);
  const dest = day.destination || '';

  return (
    <div data-pdf-itinerary-day="true" style={{ display: 'flex', border: `1px solid ${LT.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 10, background: '#fff', boxShadow: '0 2px 8px rgba(16,42,67,0.06)', pageBreakInside: 'auto', breakInside: 'auto' }}>
      {/* Left panel */}
      <div style={{ width: 64, background: LT.softBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', flexShrink: 0, borderRight: `1px solid ${LT.border}` }}>
        <div style={{ fontSize: 7, fontWeight: 800, color: LT.teal, textTransform: 'uppercase', letterSpacing: '0.06em' }}>DAY</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: LT.navy, lineHeight: 1 }}>{String(day.day || 1).padStart(2, '0')}</div>
        <div style={{ fontSize: 8, fontWeight: 700, color: LT.secondary, marginTop: 2 }}>{formatDate(day.date, '')}</div>
        <div style={{ fontSize: 6.5, fontWeight: 700, color: LT.teal, textTransform: 'uppercase', textAlign: 'center', marginTop: 4, letterSpacing: '0.04em', lineHeight: 1.3 }}>
          {dest}
        </div>
      </div>
      {/* Centre */}
      <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontWeight: 900, fontSize: 10, color: LT.navy, flex: 1, minWidth: 0, paddingRight: 8 }}>{day.title || `Day ${day.day}`}</div>
          {inclCount > 0 && (
            <span style={{ background: LT.lightTeal, color: LT.teal, fontSize: 6, fontWeight: 800, padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
              {inclCount} {inclCount === 1 ? 'INCLUSION' : 'INCLUSIONS'}
            </span>
          )}
        </div>
        {hasServices
          ? day.services.map((svc, i) => <ServiceRow key={i} service={svc} sym={sym} showPrice={showPrice} />)
          : <OpenDayContent day={day} />}
      </div>
      {/* Right image */}
      <div style={{ width: 90, flexShrink: 0, overflow: 'hidden' }}>
        <img src={dayImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.src = FALLBACK.destination; }} />
      </div>
    </div>
  );
}

function CityTransferBanner({ from, to, description, date }) {
  return (
    <div data-pdf-keep-together="true" style={{ borderRadius: 10, background: LT.navy, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: 'white' }}>{from} <span style={{ color: LT.gold }}>\u2192</span> {to}</div>
      <div style={{ textAlign: 'center', flex: 1, padding: '0 12px' }}>
        <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.8)' }}>{description}</div>
      </div>
      {date && (
        <div style={{ border: `1px solid ${LT.gold}`, borderRadius: 6, padding: '3px 10px', flexShrink: 0 }}>
          <div style={{ fontSize: 7, fontWeight: 800, color: LT.gold }}>{formatDate(date, '')}</div>
        </div>
      )}
    </div>
  );
}

function QuotationHeader({ quotation }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: `1.5px solid ${LT.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src={printableAssetUrl(Logo)} alt="Logo" style={{ height: 36, objectFit: 'contain' }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, color: LT.navy }}>{quotation.companyDetails?.name?.replace(' Co., Ltd.', '') || 'BUILDSOFTWARE'}</div>
          <div style={{ fontSize: 6.5, color: LT.teal, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Luxury Travel Quotation</div>
        </div>
      </div>
      <div style={{ textAlign: 'right', padding: '5px 10px', border: `1px solid ${LT.lightGold}`, borderRadius: 8, background: LT.lightGold }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: LT.navy }}>{quotation.quotationNo || 'QT-2026-000'}</div>
        <div style={{ fontSize: 6.5, color: LT.secondary, marginTop: 1 }}>VALID UNTIL: {formatDate(quotation.validUntil, '\u2013')}</div>
      </div>
    </div>
  );
}

function QuotationHeaderCompact({ quotation }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${LT.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <img src={printableAssetUrl(Logo)} alt="Logo" style={{ height: 26, objectFit: 'contain' }} />
        <div style={{ fontSize: 9, fontWeight: 900, color: LT.navy }}>{quotation.companyDetails?.name?.replace(' Co., Ltd.', '') || 'BUILDSOFTWARE'}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: LT.navy }}>{quotation.quotationNo || 'QT-2026-000'}</div>
        <div style={{ fontSize: 6.5, color: LT.secondary }}>{quotation.destination || ''} | {formatDate(quotation.travelStartDate, '')} \u2013 {formatDate(quotation.travelEndDate, '')}</div>
      </div>
    </div>
  );
}

function QuotationFooter({ quotation, pageNum, totalPages, C }) {
  // See the shared export rule: template-local page counters cannot remain
  // reliable after the renderer repaginates a long quotation.
  return null;
}

// ─── Theme resolver ────────────────────────────────────────────────────────────
// Maps config.theme + config.accentColor into a usable palette C
const THEME_MAP = {
  'corporate-blue': { navy: '#102A43', accent: '#0B5EA8', gold: '#D5AA3A', lightAccent: '#EFF6FF', darkCard: '#0B5EA8' },
  'luxury-gold':    { navy: '#1a1a2e', accent: '#B8860B', gold: '#D4A017', lightAccent: '#F7EED8', darkCard: '#1a1a2e' },
  'tropical':       { navy: '#065F46', accent: '#059669', gold: '#F59E0B', lightAccent: '#ECFDF5', darkCard: '#059669' },
  'modern-dark':    { navy: '#1E293B', accent: '#6366F1', gold: '#EC4899', lightAccent: '#EDE9FE', darkCard: '#1E293B' },
  'minimal':        { navy: '#374151', accent: '#374151', gold: '#6B7280', lightAccent: '#F9FAFB', darkCard: '#374151' },
  'sunset-orange':  { navy: '#7C2D12', accent: '#0e8a85', gold: '#F59E0B', lightAccent: '#eff6ff', darkCard: '#0e8a85' },
  'nature-green':   { navy: '#14532D', accent: '#15803D', gold: '#854D0E', lightAccent: '#F0FDF4', darkCard: '#15803D' },
  'custom':         { navy: '#102A43', accent: '#0B5EA8', gold: '#D5AA3A', lightAccent: '#EFF6FF', darkCard: '#0B5EA8' },
};

function resolveColors(config) {
  const base = THEME_MAP[config?.theme] || THEME_MAP['corporate-blue'];
  const accent = config?.accentColor || base.accent;
  return {
    navy:        base.navy,
    accent,
    gold:        base.gold,
    lightAccent: base.lightAccent,
    darkCard:    accent,
    teal:        LT.teal,
    lightTeal:   LT.lightTeal,
    lightGold:   LT.lightGold,
    secondary:   LT.secondary,
    border:      LT.border,
    softBg:      LT.softBg,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function LuxuryTravelQuotationTemplate({ quotation, config }) {
  // ── Dynamic palette from config ───────────────────────────────────────────
  const C = resolveColors(config);

  // ── Currency / pricing ────────────────────────────────────────────────────
  const sym = quotation.currency === 'THB' ? '฿' : (quotation.currency || '฿');
  const { totalSelling: totalSell } = quotationTotals(quotation);
  const perPerson = quotationPricePerPerson(quotation);
  const passengerPrices = quotationPassengerPrices(quotation);
  const perPersonLabel = passengerPrices.hasDifferentChildPrice
    ? `${fmt(passengerPrices.adult, sym)} per adult · ${fmt(passengerPrices.child, sym)} per child`
    : `${fmt(perPerson, sym)} per person`;

  // ── Font (Typography setting) ─────────────────────────────────────────────
  const fontFamily = config?.fontStyle === 'georgia' ? 'Georgia, serif'
    : config?.fontStyle === 'roboto' ? 'Roboto, sans-serif'
    : 'Inter, Manrope, system-ui, sans-serif';

  // ── Cover image & background (Cover Image + Cover Background settings) ────
  const coverImgUrl = resolveCoverImage(config) || FALLBACK.cover;
  const coverBg = config?.coverBackground || 'destination-image';
  const heroStyle = coverBg === 'gradient'
    ? { background: `linear-gradient(135deg, ${C.navy} 0%, ${C.accent} 100%)` }
    : coverBg === 'solid'
      ? { background: C.accent }
      : null; // will use <img> for destination-image

  // ── Content visibility (Content Settings) ────────────────────────────────
  const showHotelImg    = config?.showHotelImages    !== false;
  const showActivityImg = config?.showActivityImages !== false;
  const showTransferImg = config?.showTransferImages  === true;
  const showClientPrice = !config?.clientPreview || config?.showClientPrice !== false;
  // Client/agent PDFs intentionally show only the package total. Per-service
  // or passenger-type prices remain available in the internal quotation view.
  const showServicePrices = !config?.clientPreview;
  const showItinerary = config?.showClientItinerary !== false;

  // ── Filter service images by visibility settings ──────────────────────────
  const filteredSvcImage = (svc) => {
    const type = svc?.type || '';
    if (type === 'Hotel'    && !showHotelImg)    return null;
    if ((type === 'Sightseeing' || type === 'Activity') && !showActivityImg) return null;
    if (type === 'Transfer' && !showTransferImg) return null;
    return svc?.image || FALLBACK[type] || FALLBACK.destination;
  };

  // ── Highlights ────────────────────────────────────────────────────────────
  const highlights = quotation.highlights || [];

  // ── Pagination ────────────────────────────────────────────────────────────
  const itinerary = showItinerary ? (quotation.itinerary || []) : [];
  const PAGE_DAYS = 4;
  const itineraryPages = [];
  for (let i = 0; i < itinerary.length; i += PAGE_DAYS) {
    itineraryPages.push(itinerary.slice(i, i + PAGE_DAYS));
  }
  if (showItinerary && itineraryPages.length === 0) itineraryPages.push([]);
  const totalPages = 1 + itineraryPages.length;

  const basePageStyle = {
    width: 595, minHeight: 842,
    background: '#FFFFFF',
    padding: '14px 18px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    fontSize: 9,
    color: LT.darkText,
    fontFamily,
    overflow: 'hidden',
  };

  return (
    <div style={{ fontFamily }}>

      {/* ══ PAGE 1 — COVER ══════════════════════════════════════════════════ */}
      <div className="a4-page" style={{ ...basePageStyle, borderBottom: '1px dashed #E2E8F0', marginBottom: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: `1.5px solid ${LT.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DocumentBrandMark quotation={quotation} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: C.navy }}>{documentBrandName(quotation)}</div>
              <div style={{ fontSize: 6.5, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Luxury Travel Quotation</div>
            </div>
          </div>
          <div style={{ textAlign: 'right', padding: '5px 10px', border: `1px solid ${C.lightAccent}`, borderRadius: 8, background: C.lightAccent }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: C.navy }}>{quotation.quotationNo || 'QT-2026-000'}</div>
            <div style={{ fontSize: 6.5, color: LT.secondary, marginTop: 1 }}>VALID UNTIL: {formatDate(quotation.validUntil, '–')}</div>
          </div>
        </div>

        {/* Hero */}
        <div style={{ borderRadius: 14, overflow: 'hidden', height: pdfCoverImageHeight(config, 195, { min: 130, max: 260 }), position: 'relative', marginBottom: 10, flexShrink: 0, ...(heroStyle || {}) }}>
          {!heroStyle && (
            <img src={coverImgUrl} alt="Destination"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={e => { e.target.style.background = C.navy; e.target.style.display = 'none'; }} />
          )}
          {/* Gradient overlay always on top */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,22,40,0.08) 30%, rgba(10,22,40,0.75) 100%)' }} />
          {/* Badge */}
          <div style={{ position: 'absolute', top: 10, left: 12 }}>
            <span style={{ border: '1px solid rgba(255,255,255,0.6)', borderRadius: 20, padding: '3px 10px', fontSize: 6.5, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(255,255,255,0.12)' }}>
              Tailored Experience Proposal
            </span>
          </div>
          {/* Bottom text */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'white', letterSpacing: '-0.5px', textTransform: 'uppercase', lineHeight: 1.1, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                {(quotation.destination || 'Thailand').toUpperCase()}
              </div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
                {formatDate(quotation.travelStartDate, '–')} – {formatDate(quotation.travelEndDate, '–')}
                <span style={{ margin: '0 8px', color: C.gold }}>•</span>
                {quotation.packageType || 'Thailand Leisure & Culture'}
              </div>
            </div>
            <div style={{ background: C.gold, borderRadius: 8, padding: '6px 12px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: C.navy, whiteSpace: 'nowrap' }}>{quotation.duration || '7 Days / 6 Nights'}</div>
            </div>
          </div>
        </div>

        {/* Trip summary bar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', border: `1px solid ${LT.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
          {[
            { label: 'Prepared For',  icon: '👤', primary: quotation.guest?.name || 'Guest',                                                secondary: 'Valued Traveler' },
            { label: 'Booking Agent', icon: '💼', primary: quotation.agent?.name || 'Direct',                                               secondary: 'Authorized Partner' },
            { label: 'Pax & Rooms',   icon: '👥', primary: `${quotation.adults || 0} Adults • ${quotation.children || 0} Children`,         secondary: `${quotation.rooms || 1} Double/Twin Room` },
            { label: 'Duration',      icon: '📅', primary: quotation.duration || '–',                                                        secondary: quotation.destination || '–' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '10px 12px', borderRight: i < 3 ? `1px solid ${LT.border}` : 'none', background: i % 2 === 0 ? '#fff' : LT.softBg }}>
              <div style={{ fontSize: 6, fontWeight: 800, color: LT.secondary, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{item.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 12 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: C.navy }}>{item.primary}</div>
                  <div style={{ fontSize: 7, color: LT.secondary, marginTop: 1 }}>{item.secondary}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Client PDF: show the guest's package price only. */}
        {showClientPrice && <div style={{ background: C.navy, borderRadius: 12, padding: '12px 16px', marginBottom: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 6.5, fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Your Package Price</div>
          <div style={{ width: 24, height: 2, background: C.gold, borderRadius: 1, margin: '5px auto' }} />
          <div style={{ fontSize: 24, fontWeight: 900, color: 'white' }}>{fmt(totalSell, sym)}</div>
          <div style={{ fontSize: 7.5, fontWeight: 700, color: C.gold, marginTop: 3 }}>{perPersonLabel}</div>
          {/* <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>All taxes, breakfast & private transfers included</div> */}
        </div>}

        {/* Only services actually included in this quotation are shown. */}
        {highlights.length > 0 && <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 3, height: 16, background: C.accent, borderRadius: 2 }} />
              <div style={{ fontSize: 10, fontWeight: 900, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Curated Journey Highlights</div>
            </div>
            <div style={{ fontSize: 7, color: LT.secondary }}>{highlights.length} included service{highlights.length === 1 ? '' : 's'}</div>
          </div>
          <ResponsiveCardRows
            items={highlights}
            maxColumns={4}
            gap={8}
            config={config}
            style={{ flex: 1 }}
            renderCard={(h, i, rowLayout) => {
              const image = filteredSvcImage(h);
              // Preserve the requested full-width/50-50 card layout without
              // allowing a final two-card row to create oversized images that
              // waste an A4 page's remaining height.
              const responsiveImageHeight = rowLayout?.rowLength === 1 ? 190
                  : rowLayout?.rowLength === 2 ? 124
                    : 104;
              const imageHeight = pdfCardImageHeight(config, responsiveImageHeight);
              return (
              <div key={i} style={{ border: `1px solid ${LT.border}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 6px rgba(16,42,67,0.06)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', height: imageHeight, flex: `0 0 ${imageHeight}px` }}>
                  {image && <img src={image} alt={h.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { e.target.style.display = 'none'; }} />}
                  <div style={{ position: 'absolute', top: 6, left: 6 }}>
                    <span style={{ background: C.navy, color: 'white', fontSize: 5.5, fontWeight: 800, padding: '2px 6px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {h.category}
                    </span>
                  </div>
                </div>
                <div style={{ padding: pdfCardContentPadding(config, 8), background: '#fff' }}>
                  <div style={{ fontSize: 9, fontWeight: 900, color: C.navy, marginBottom: 3 }}>{h.title}</div>
                <div style={{ fontSize: 7, color: LT.secondary, lineHeight: 1.4 }}>{h.description}</div>
                </div>
              </div>
              );
            }}
          />
        </div>}

        <div style={{ marginTop: 10 }}>
          <QuotationFooter quotation={quotation} pageNum={1} totalPages={totalPages} C={C} />
        </div>
      </div>

      {/* ══ ITINERARY PAGES ════════════════════════════════════════════════ */}
      {showItinerary && itineraryPages.map((pageDays, pageIdx) => {
        const isLast    = pageIdx === itineraryPages.length - 1;
        let prevDest    = pageIdx > 0 ? (itineraryPages[pageIdx - 1].slice(-1)[0]?.destination || '') : (itinerary[0]?.destination || '');
        const firstDest = pageDays[0]?.destination || '';
        const subtitle  = pageIdx === 0
          ? `Part 1: ${firstDest || 'Pattaya'} Beach Resort`
          : `Part ${pageIdx + 1}: ${firstDest} City Stay`;

        return (
          <div key={pageIdx} className="a4-page" style={{ ...basePageStyle, borderBottom: !isLast ? '1px dashed #E2E8F0' : 'none', marginBottom: !isLast ? 20 : 0 }}>

            {/* The journey heading is intentionally displayed once. Continuation
                pages start with their next day card to use the full page area. */}
            {pageIdx === 0 && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: C.navy, letterSpacing: '-0.5px' }}>YOUR THAILAND JOURNEY</div>
                <div style={{ width: 36, height: 3, background: C.gold, borderRadius: 2, margin: '4px 0 6px' }} />
                <div style={{ fontSize: 8, color: LT.secondary }}>Detailed Day-by-Day Experience & Inclusions • {subtitle}</div>
              </div>
              <div style={{ background: `${C.accent}15`, border: `1px solid ${C.accent}30`, borderRadius: 8, padding: '4px 10px', textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 6, color: C.accent, fontWeight: 700, textTransform: 'uppercase' }}>Quotation</div>
                <div style={{ fontSize: 9, fontWeight: 900, color: C.navy }}>{quotation.quotationNo || 'QT-2026-000'}</div>
              </div>
            </div>}

            <div style={{ flex: 1 }}>
              {pageDays.map((day, di) => {
                const currDest  = day.destination || '';
                const isTransfer = currDest.includes('→') || (day.title || '').includes('→');
                const destChanged = prevDest && currDest !== prevDest && isTransfer;
                prevDest = currDest;

                // ── City transfer banner ─────────────────────────────────
                if (isTransfer && destChanged) {
                  const parts = currDest.split('→');
                  return (
                    <div key={di} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      {/* Dynamic banner uses C.navy + C.gold */}
                      <div style={{ borderRadius: 10, background: C.navy, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: 'white' }}>{(parts[0] || '').trim()} <span style={{ color: C.gold }}>→</span> {(parts[1] || '').trim()}</div>
                        <div style={{ textAlign: 'center', flex: 1, padding: '0 12px' }}>
                          <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.8)' }}>Private inter-city scenic highway transfer</div>
                        </div>
                        <div style={{ border: `1px solid ${C.gold}`, borderRadius: 6, padding: '3px 10px', flexShrink: 0 }}>
                          <div style={{ fontSize: 7, fontWeight: 800, color: C.gold }}>{formatDate(day.date, '')} • HOTEL SHIFT</div>
                        </div>
                      </div>

                      {/* Day card */}
                      <DayCardWithConfig day={day} sym={sym} C={C}
                        showHotelImg={showHotelImg} showActivityImg={showActivityImg} showTransferImg={showTransferImg} showPrice={showServicePrices} />
                    </div>
                  );
                }

                return (
                  <DayCardWithConfig key={di} day={day} sym={sym} C={C}
                    showHotelImg={showHotelImg} showActivityImg={showActivityImg} showTransferImg={showTransferImg} showPrice={showServicePrices} />
                );
              })}
            </div>

            {/* Final package summary on last page */}
            {isLast && (
              <div style={{ display: 'flex', borderRadius: 14, overflow: 'hidden', border: `1px solid ${LT.border}`, marginTop: 10, flexShrink: 0, minHeight: 120, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                {/* Left: photo with overlay */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden', ...(!heroStyle ? {} : heroStyle) }}>
                  {!heroStyle && (
                    <img src={coverImgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={e => { e.target.style.background = C.navy; }} />
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${C.navy}CC 0%, ${C.navy}60 100%)` }} />
                  <div style={{ position: 'absolute', bottom: 14, left: 14 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>Sawadee Krub!</div>
                    <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>{quotation.destination || 'Pattaya + Bangkok'}</div>
                    <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>• {formatDate(quotation.travelStartDate, '')} – {formatDate(quotation.travelEndDate, '')}</div>
                  </div>
                </div>
                {/* Right: totals */}
                {showClientPrice && <div style={{ width: 200, flexShrink: 0, background: '#fff', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: 6.5, fontWeight: 800, color: LT.secondary, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Final Package Total</div>
                  <div style={{ fontSize: 7, color: LT.secondary, marginTop: 2 }}>{quotation.adults || 0} Adults • All Taxes Included</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: C.navy, letterSpacing: '-1px', margin: '6px 0 10px' }}>{fmt(totalSell, sym)}</div>
                  <div style={{ fontSize: 7.5, fontWeight: 800, color: C.accent, marginTop: -6, marginBottom: 8 }}>{perPersonLabel}</div>
                  <div style={{ fontSize: 7.5, color: LT.secondary, marginBottom: 3 }}>✉ {quotation.companyDetails?.email || 'admin@tripnest.com'}</div>
                  <div style={{ fontSize: 7.5, color: LT.secondary, marginBottom: 10 }}>📞 {quotation.companyDetails?.phone || '+66 76 345 678'}</div>
                  <div style={{ borderTop: `1px solid ${LT.border}`, paddingTop: 8 }}>
                    <div style={{ fontSize: 7, color: LT.secondary, fontStyle: 'italic' }}>Thank you for choosing {documentBrandName(quotation)}.</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                      <span style={{ fontSize: 10 }}>✅</span>
                      <span style={{ fontSize: 7, fontWeight: 700, color: C.accent }}>Official Quotation</span>
                    </div>
                  </div>
                </div>}
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              <QuotationFooter quotation={quotation} pageNum={pageIdx + 2} totalPages={totalPages} C={C} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Config-aware DayCard ─────────────────────────────────────────────────────
function DayCardWithConfig({ day, sym, C, showHotelImg, showActivityImg, showTransferImg, showPrice = true, continuation = false }) {
  const hasServices = day.services?.length > 0;
  const inclCount = day.services?.length || 0;

  // Keep the visual Day card intact, but cap its first printed section at two
  // services. Any remaining services are rendered as one matching Day
  // continuation, which can move alone to the next A4 page.
  if (!continuation && day.services?.length > 2) {
    return (
      <>
        <DayCardWithConfig day={{ ...day, services: day.services.slice(0, 2) }} sym={sym} C={C} showHotelImg={showHotelImg} showActivityImg={showActivityImg} showTransferImg={showTransferImg} showPrice={showPrice} />
        <DayCardWithConfig day={{ ...day, services: day.services.slice(2) }} sym={sym} C={C} showHotelImg={showHotelImg} showActivityImg={showActivityImg} showTransferImg={showTransferImg} showPrice={showPrice} continuation />
      </>
    );
  }

  // Resolve right-side image with visibility settings
  let dayImg = day.image;
  if (!dayImg && hasServices) {
    for (const svc of day.services) {
      const type = svc?.type || '';
      if (type === 'Hotel'       && !showHotelImg)    continue;
      if ((type === 'Sightseeing' || type === 'Activity') && !showActivityImg) continue;
      if (type === 'Transfer'    && !showTransferImg) continue;
      dayImg = svc.image || FALLBACK[type] || FALLBACK.destination;
      if (dayImg) break;
    }
  }
  if (!dayImg) dayImg = FALLBACK.destination;
  const dest = day.destination || '';

  return (
    <div data-pdf-keep-together="true" style={{ display: 'flex', border: `1px solid ${LT.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 10, background: '#fff', boxShadow: '0 2px 8px rgba(16,42,67,0.06)', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      {/* Left panel — uses C.navy, C.accent */}
      <div style={{ width: 64, background: LT.softBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', flexShrink: 0, borderRight: `1px solid ${LT.border}` }}>
        <div style={{ fontSize: 7, fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>DAY</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.navy, lineHeight: 1 }}>{String(day.day || 1).padStart(2, '0')}</div>
        <div style={{ fontSize: 8, fontWeight: 700, color: LT.secondary, marginTop: 2 }}>{formatDate(day.date, '')}</div>
        <div style={{ fontSize: 6.5, fontWeight: 700, color: C.accent, textTransform: 'uppercase', textAlign: 'center', marginTop: 4, letterSpacing: '0.04em', lineHeight: 1.3 }}>{dest}</div>
      </div>
      {/* Centre */}
      <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontWeight: 900, fontSize: 10, color: C.navy, flex: 1, minWidth: 0, paddingRight: 8 }}>
            {day.title || `Day ${day.day}`}
            {continuation && <div style={{ fontSize: 6.5, color: LT.secondary, marginTop: 1 }}>Continued services</div>}
          </div>
          {inclCount > 0 && (
            <span style={{ background: `${C.accent}15`, color: C.accent, fontSize: 6, fontWeight: 800, padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
              {inclCount} {inclCount === 1 ? 'INCLUSION' : 'INCLUSIONS'}
            </span>
          )}
        </div>
        {hasServices
          ? day.services.map((svc, i) => <ServiceRow key={svc.id || i} service={svc} sym={sym} C={C} showPrice={showPrice} />)
          : <OpenDayContent day={day} C={C} />}
      </div>
      {/* Right image */}
      <div style={{ width: 90, flexShrink: 0, overflow: 'hidden' }}>
        <img src={dayImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.src = FALLBACK.destination; }} />
      </div>
    </div>
  );
}

