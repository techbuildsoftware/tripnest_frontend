/**
 * THAI EXPERIENCE QUOTATION TEMPLATE
 * 🌴 Magazine-quality Thailand travel quotation
 * Deep Ocean Navy  #0A2240
 * Warm Coral       #FF6B4A
 * Sunset Gold      #74d0cb
 * Light Aqua       #E0F7FA
 */
import React from 'react';
import { formatDate } from '../../../../lib/date';
import { quotationPassengerPrices, quotationPricePerPerson, quotationTotals } from '../data/quotationPdf';
import Logo from '../../../../assets/logo-white.png';
import { ResponsiveCardRows, ServiceDescription, pdfCardContentPadding, pdfCardImageHeight, pdfCoverImageHeight } from './PDFPrimitives';

// ─── Brand palette ────────────────────────────────────────────────────────────
const C = {
  navy:      '#0A2240',
  navyLight: '#163459',
  coral:     '#FF6B4A',
  coralSoft: '#FFF0ED',
  gold:      '#74d0cb',
  goldSoft:  '#FFF8EE',
  aqua:      '#E0F7FA',
  aquaDark:  '#00ACC1',
  white:     '#FFFFFF',
  offWhite:  '#F9FAFB',
  border:    '#E2EDF5',
  muted:     '#6B80A0',
  text:      '#0A2240',
};

// ─── Service type badge colours ────────────────────────────────────────────────
const BADGE = {
  Hotel:        { bg: '#E0F7FA', text: '#00838F' },
  Sightseeing:  { bg: '#F3E8FF', text: '#7C3AED' },
  Activity:     { bg: '#FFF3E0', text: '#E65100' },
  Yacht:        { bg: '#FFF0ED', text: '#C62828' },
  Ferry:        { bg: '#E8F5E9', text: '#2E7D32' },
  Transfer:     { bg: '#E3F2FD', text: '#1565C0' },
  Meal:         { bg: '#F1F8E9', text: '#558B2F' },
  Restaurant:   { bg: '#F1F8E9', text: '#558B2F' },
  Departure:    { bg: '#F3E5F5', text: '#6A1B9A' },
  Arrival:      { bg: '#FCE4EC', text: '#AD1457' },
  Miscellaneous:{ bg: '#ECEFF1', text: '#546E7A' },
};

// ─── Fallback images ───────────────────────────────────────────────────────────
const FB = {
  cover:      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  sightseeing:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=70',
  yacht:      'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=400&q=70',
  activity:   'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&q=70',
  hotel:      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=70',
  destination:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=70',
};

function safeUrl(src) {
  if (!src) return null;
  if (typeof window === 'undefined' || /^https?:/i.test(src)) return src;
  try { return new URL(src, window.location.origin).href; } catch { return src; }
}

function brandName(q) {
  return q?.companyDetails?.name || q?.agent?.name || 'TripNest';
}

// ─── Reusable tiny atoms ───────────────────────────────────────────────────────
function GoldBar({ width = 40, height = 2, style = {} }) {
  return <div style={{ width, height, borderRadius: 2, background: `linear-gradient(90deg, ${C.coral}, ${C.gold})`, ...style }} />;
}

function SectionTitle({ emoji, text, color = C.navy, size = 9.5 }) {
  return (
    <div data-pdf-section-heading="true" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
      <span style={{ fontSize: 12 }}>{emoji}</span>
      <span style={{ fontWeight: 900, fontSize: size, color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{text}</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.coral}60, transparent)`, marginLeft: 4 }} />
    </div>
  );
}

function TypeBadge({ type }) {
  const s = BADGE[type] || BADGE.Miscellaneous;
  return (
    <span style={{
      display: 'inline-block', padding: '1px 7px', borderRadius: 20,
      fontSize: 6, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase',
      background: s.bg, color: s.text, whiteSpace: 'nowrap', flexShrink: 0,
    }}>{type}</span>
  );
}

// ─── Page footer ──────────────────────────────────────────────────────────────
function PageFooter({ quotation, pageNum, totalPages }) {
  return null;
}

// ─── A4 page wrapper ───────────────────────────────────────────────────────────
function A4({ children, footer, style = {} }) {
  return (
    <div className="a4-page" style={{
      // PDF pages are created by the shared canvas paginator. Keeping an
      // authored A4 minimum height here can reserve a mostly empty sheet in
      // the live preview before the next content section.
      width: 595, minHeight: 0, height: 'auto', background: C.white, padding: '16px 20px',
      boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 9, display: 'block', overflow: 'hidden',
      color: C.navy, marginBottom: 20, borderBottom: '1px dashed #D4E2EF',
      ...style,
    }}>
      <div>{children}</div>
      {footer}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 1 — COVER
// ══════════════════════════════════════════════════════════════════════════════
function CoverPage({ quotation, totalPages, showPrice = true, config }) {
  const { totalSelling } = quotationTotals(quotation);
  const perPerson = quotationPricePerPerson(quotation);
  const passengerPrices = quotationPassengerPrices(quotation);
  const currency = quotation.currency || 'THB';
  const sym = currency === 'THB' ? '฿' : currency;
  const perPersonLabel = passengerPrices.hasDifferentChildPrice
    ? `${sym} ${passengerPrices.adult.toLocaleString()} per adult · ${sym} ${passengerPrices.child.toLocaleString()} per child`
    : `${sym} ${perPerson.toLocaleString()} per person`;
  const coverSrc = quotation.coverImage || FB.cover;
  // The cover is intentionally kept as one printable block. Cap its hero
  // image so the details beneath it can always fit on the same A4 sheet,
  // even when a saved template previously requested a tall cover image.
  const coverHeight = pdfCoverImageHeight(config, 220, { min: 140, max: 240 });
  const logoSrc = quotation?.logo ? safeUrl(quotation.logo) : Logo;

  const adults   = quotation.adults   || 0;
  const children = quotation.children || 0;
  const rooms    = quotation.rooms    || quotation.hotels?.reduce((s, h) => s + (h.rooms || 1), 0) || 1;

  return (
    <div className="a4-page" data-pdf-keep-together="true" style={{
      // The exporter determines physical A4 slices. Do not reserve an entire
      // empty sheet after a short cover when this component is displayed in a
      // client preview that does not apply the PDF flow stylesheet.
      width: 595, minHeight: 0, height: 'auto', boxSizing: 'border-box',
      fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9,
      display: 'block', overflow: 'hidden',
      color: C.navy, marginBottom: 20, position: 'relative',
    }}>
      {/* ── Hero image ──────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', height: coverHeight, overflow: 'hidden', flexShrink: 0 }}>
        <img
          src={coverSrc} alt="Thailand"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.src = FB.cover; }}
        />
        {/* Dark gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(10,34,64,0.3) 0%, rgba(10,34,64,0.72) 70%, rgba(10,34,64,0.9) 100%)',
        }} />

        {/* Top branding bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {logoSrc && <img src={logoSrc} alt="logo" style={{ height: 24, objectFit: 'contain', borderRadius: 4, background: 'rgba(255,255,255,0.15)', padding: '2px 4px' }} onError={e => { e.target.style.display = 'none'; }} />}
            <div>
              <div style={{ color: C.white, fontWeight: 800, fontSize: 9.5 }}>{brandName(quotation)}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 6.5 }}>{quotation?.companyDetails?.tagline || 'Your Trusted Thai DMC Partner'}</div>
            </div>
          </div>
          {/* Quotation badge */}
          <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '5px 10px', textAlign: 'right', backdropFilter: 'blur(4px)' }}>
            <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Quotation</div>
            <div style={{ fontSize: 10, fontWeight: 900, color: C.gold }}>{quotation.quotationNo}</div>
            <div style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.7)' }}>{formatDate(quotation.quotationDate, '')}</div>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ position: 'absolute', bottom: 18, left: 18, right: 18 }}>
          <div style={{ fontSize: 7, fontWeight: 700, color: C.gold, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>
            🌴 AMAZING THAILAND EXPERIENCE
          </div>
          <div style={{ fontWeight: 900, fontSize: 28, lineHeight: 1.1, color: C.white, textShadow: '0 2px 8px rgba(0,0,0,0.5)', marginBottom: 4 }}>
            {quotation.destination || 'THAILAND'}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontStyle: 'italic' }}>
            {quotation.packageType || 'Exclusive Holiday Package'}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['🏖️ BEACHES', '🏝️ ISLANDS', '⛵ YACHT TOURS', '🌊 WATER SPORTS', '🎭 CULTURE'].map(tag => (
              <div key={tag} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '2px 8px', fontSize: 7, fontWeight: 600, color: C.white }}>
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body area ──────────────────────────────────────────────────── */}
      <div style={{ padding: '10px 18px', display: 'flex', flexDirection: 'column', gap: 7 }}>

        {/* ── Trip Stats Row ──────────────────────────────────────────── */}
        <div data-pdf-keep-together="true" style={{ display: 'flex', gap: 8 }}>
          {[
            { icon: '🌙', label: 'Duration', value: quotation.duration || '—' },
            { icon: '👥', label: 'Adults',   value: adults },
            { icon: '🧒', label: 'Children', value: children },
            { icon: '🏨', label: 'Rooms',    value: rooms },
            { icon: '📅', label: 'Travel',   value: formatDate(quotation.travelStartDate, '') || '—' },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, background: C.aqua, borderRadius: 8, padding: '6px 4px',
              textAlign: 'center', border: `1px solid ${C.aquaDark}30`,
            }}>
              <div style={{ fontSize: 12 }}>{s.icon}</div>
              <div style={{ fontWeight: 900, fontSize: 9, color: C.navy, marginTop: 1 }}>{s.value}</div>
              <div style={{ fontSize: 6.5, color: C.muted, marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Guest & Agent Info ──────────────────────────────────────── */}
        <div data-pdf-keep-together="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {/* Guest card */}
          <div style={{ background: C.offWhite, borderRadius: 8, padding: '7px 10px', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 6.5, color: C.coral, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              👤 Prepared For
            </div>
            <GoldBar width={28} height={2} style={{ marginBottom: 6 }} />
            <div style={{ fontWeight: 800, fontSize: 11, color: C.navy }}>{quotation.guest?.name || '—'}</div>
            {quotation.guest?.email && <div style={{ fontSize: 7, color: C.muted, marginTop: 3 }}>✉ {quotation.guest.email}</div>}
            {quotation.guest?.phone && <div style={{ fontSize: 7, color: C.muted, marginTop: 2 }}>📞 {quotation.guest.phone}</div>}
          </div>
          {/* Agent card */}
          <div style={{ background: C.navyLight, borderRadius: 8, padding: '7px 10px' }}>
            <div style={{ fontSize: 6.5, color: C.gold, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              🏢 Your Travel Expert
            </div>
            <GoldBar width={28} height={2} style={{ marginBottom: 6 }} />
            <div style={{ fontWeight: 800, fontSize: 10, color: C.white }}>{quotation.agent?.name || brandName(quotation)}</div>
            {quotation.agent?.email && <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>✉ {quotation.agent.email}</div>}
            {quotation.agent?.phone && <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>📞 {quotation.agent.phone}</div>}
          </div>
        </div>

        {/* ── Hotel thumb row ─────────────────────────────────────────── */}
        {(quotation.hotels || []).length > 0 && (
          <div data-pdf-keep-together="true">
            <div style={{ fontSize: 7, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
              🏨 ACCOMMODATION OVERVIEW
            </div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'hidden' }}>
              {(quotation.hotels || []).slice(0, 4).map((h, i) => (
                <div key={i} style={{ flex: 1, borderRadius: 7, overflow: 'hidden', border: `1px solid ${C.border}`, background: C.white, minWidth: 0 }}>
                  <div style={{ height: 42, overflow: 'hidden', position: 'relative' }}>
                    <img src={h.image || FB.hotel} alt={h.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={e => { e.target.src = FB.hotel; }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 20, background: 'linear-gradient(transparent, rgba(10,34,64,0.7))' }} />
                    <div style={{ position: 'absolute', bottom: 3, left: 4, fontSize: 7, fontWeight: 800, color: C.white }}>{h.city}</div>
                  </div>
                  <div style={{ padding: '4px 6px' }}>
                    <div style={{ fontSize: 6.5, fontWeight: 700, color: C.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</div>
                    <div style={{ fontSize: 6, color: C.muted }}>{h.nights}N · {h.mealPlan}</div>
                    <div style={{ fontSize: 5.5, color: C.muted, marginTop: 1 }}>{h.roomAllocation || 'Room allocation on request'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Total price banner ──────────────────────────────────────── */}
        {showPrice && <div data-pdf-keep-together="true" style={{
          background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyLight} 100%)`,
          borderRadius: 10, padding: '9px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,179,71,0.08)' }} />
          <div style={{ position: 'absolute', right: 10, bottom: -30, width: 80, height: 80, borderRadius: '50%', background: 'rgba(59,130,246,0.06)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
              💰 TOTAL PACKAGE INVESTMENT
            </div>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
              {adults} Adult{adults !== 1 ? 's' : ''}{children > 0 ? ` · ${children} Child${children !== 1 ? 'ren' : ''}` : ''} · All taxes included
            </div>
          </div>
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'right' }}>
            <div style={{ fontSize: 19, fontWeight: 900, color: C.gold, lineHeight: 1 }}>
              {sym} {Number(totalSelling || quotation.totalSelling || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 6.5, fontWeight: 700, color: 'rgba(255,255,255,0.78)', marginTop: 3 }}>{perPersonLabel}</div>
          </div>
        </div>}
      </div>

      <PageFooter quotation={quotation} pageNum={1} totalPages={totalPages} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 2 — JOURNEY HIGHLIGHTS
// ══════════════════════════════════════════════════════════════════════════════
function HighlightsPage({ quotation, pageNum, totalPages, config }) {
  const sightseeing = (quotation.sightseeing || []).filter(s => s && s.name);
  const activities  = (quotation.itinerary || [])
    .flatMap(d => (d.services || []).filter(s => s.type === 'Activity'));
  const yachts      = (quotation.itinerary || [])
    .flatMap(d => (d.services || []).filter(s => s.type === 'Yacht' || s.type === 'Ferry'));

  const hasHighlights = quotation.highlights?.length > 0;
  const hasSightseeing = sightseeing.length > 0;
  const hasActivities  = activities.length > 0;
  const hasYachts      = yachts.length > 0;

  return (
    <A4 footer={<PageFooter quotation={quotation} pageNum={pageNum} totalPages={totalPages} />}>
      {/* Section header */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 6.5, color: C.coral, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 3 }}>
          YOUR THAILAND EXPERIENCE
        </div>
        <div style={{ fontWeight: 900, fontSize: 16, color: C.navy, lineHeight: 1.1, marginBottom: 4 }}>
          🌟 Journey Highlights
        </div>
        <GoldBar width={60} height={3} />
      </div>

      {/* Custom Highlights */}
      {hasHighlights && (
        <div style={{ marginBottom: 10 }}>
          <SectionTitle emoji="✨" text="Package Highlights" />
          <ResponsiveCardRows
            items={quotation.highlights || []}
            maxColumns={4}
            gap={6}
            config={config}
            renderCard={(h, i) => (
              <div key={i} style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}`, background: C.white }}>
                {h.image && (
                  <div style={{ height: pdfCardImageHeight(config, 60), overflow: 'hidden' }}>
                    <img src={h.image} alt={h.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                  </div>
                )}
                <div style={{ padding: pdfCardContentPadding(config, 8) }}>
                  {h.category && <div style={{ fontSize: 6, color: C.coral, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{h.category}</div>}
                  <div style={{ fontWeight: 800, fontSize: 8, color: C.navy }}>{h.title}</div>
                  {h.description && <div style={{ fontSize: 7, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{h.description.slice(0, 80)}</div>}
                </div>
              </div>
            )}
          />
        </div>
      )}

      {/* Sightseeing */}
      {hasSightseeing && (
        <div style={{ marginBottom: 10 }}>
          <SectionTitle emoji="🎭" text="Sightseeing Experiences" color={C.navy} />
          <ResponsiveCardRows
            items={sightseeing.slice(0, 6)}
            maxColumns={3}
            gap={6}
            config={config}
            renderCard={(s, i) => (
              <div key={i} style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}`, background: C.white, boxShadow: '0 2px 6px rgba(10,34,64,0.06)' }}>
                <div style={{ height: pdfCardImageHeight(config, 65), overflow: 'hidden', position: 'relative', background: C.aqua }}>
                  <img
                    src={s.image || FB.sightseeing} alt={s.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { e.target.src = FB.sightseeing; }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 50%, rgba(10,34,64,0.55))' }} />
                  {s.type && (
                    <div style={{ position: 'absolute', top: 4, left: 4 }}>
                      <span style={{ background: 'rgba(10,34,64,0.7)', color: C.gold, fontSize: 5.5, fontWeight: 700, padding: '1px 5px', borderRadius: 8, textTransform: 'uppercase' }}>
                        {s.type}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ padding: pdfCardContentPadding(config, 7) }}>
                  <div style={{ fontWeight: 800, fontSize: 8, color: C.navy, lineHeight: 1.2 }}>{s.name}</div>
                  {s.destination && <div style={{ fontSize: 6.5, color: C.aquaDark, fontWeight: 600, marginTop: 1 }}>📍 {s.destination}</div>}
                  {s.time && <div style={{ fontSize: 6, color: C.muted, marginTop: 1 }}>🕐 {s.time}</div>}
                  {s.description && (
                    <div style={{ fontSize: 6.5, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{s.description.slice(0, 70)}{s.description.length > 70 ? '…' : ''}</div>
                  )}
                </div>
              </div>
            )}
          />
        </div>
      )}

      {/* Activities */}
      {hasActivities && (
        <div style={{ marginBottom: 10 }}>
          <SectionTitle emoji="🏄" text="Activities & Adventures" color={C.navy} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {activities.slice(0, 4).map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.goldSoft, borderRadius: 8, padding: '6px 10px', border: `1px solid ${C.gold}40` }}>
                {a.image && (
                  <img src={a.image} alt={a.name} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                    onError={e => { e.target.src = FB.activity; }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 8.5, color: C.navy }}>{a.label || a.name}</div>
                  {(a.detail || a.description) && <div style={{ fontSize: 7, color: C.muted, marginTop: 1 }}>{(a.detail || a.description || '').slice(0, 80)}</div>}
                </div>
                <span style={{ fontSize: 16 }}>🌴</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Yacht / Ferry */}
      {hasYachts && (
        <div style={{ marginBottom: 6 }}>
          <SectionTitle emoji="⛵" text="Yacht & Ferry Experiences" color={C.coral} />
          <ResponsiveCardRows
            items={yachts.slice(0, 3)}
            maxColumns={3}
            gap={6}
            config={config}
            renderCard={(y, i) => (
              <div key={i} style={{
                borderRadius: 8, overflow: 'hidden',
                border: `1.5px solid ${C.coral}40`, background: C.coralSoft,
                boxShadow: '0 2px 8px rgba(59,130,246,0.10)',
              }}>
                <div style={{ height: pdfCardImageHeight(config, 70), overflow: 'hidden', position: 'relative' }}>
                  <img src={y.image || FB.yacht} alt={y.name || 'Yacht'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.src = FB.yacht; }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, rgba(200,62,42,0.55))' }} />
                  <div style={{ position: 'absolute', top: 4, right: 4 }}>
                    <TypeBadge type={y.type || 'Yacht'} />
                  </div>
                </div>
                <div style={{ padding: pdfCardContentPadding(config, 8) }}>
                  <div style={{ fontWeight: 800, fontSize: 8.5, color: C.navy }}>{y.label || y.name || 'Yacht Experience'}</div>
                  {(y.detail || y.description) && (
                    <div style={{ fontSize: 7, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{(y.detail || y.description).slice(0, 70)}</div>
                  )}
                </div>
              </div>
            )}
          />
        </div>
      )}
    </A4>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 3+ — DAY-BY-DAY ITINERARY (max 4 days per page)
// ══════════════════════════════════════════════════════════════════════════════
function DayServiceRow({ service, showPrice = true }) {
  const sell = Number(service.sellingPrice || service.selling || service.totalSellingPrice || 0);
  return (
    <div data-pdf-itinerary-service="true" style={{
      display: 'flex', alignItems: 'flex-start', gap: 6,
      padding: '5px 8px', background: C.offWhite, borderRadius: 6,
      marginBottom: 4, border: `1px solid ${C.border}`,
    }}>
      {service.image && (
        <img src={service.image} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
          onError={e => { e.target.style.display = 'none'; }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, flexWrap: 'wrap' }}>
          <TypeBadge type={service.type || 'Miscellaneous'} />
          <span style={{ fontWeight: 700, fontSize: 8, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {service.label || service.name || 'Service'}
          </span>
        </div>
        {service.detail && <div style={{ fontSize: 6.5, color: C.muted, lineHeight: 1.4 }}>{service.detail}</div>}
        <ServiceDescription service={service} color={C.muted} fontSize={6.5} showPrice={showPrice} />
      </div>
      {showPrice && sell > 0 && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 6, color: C.muted, textTransform: 'uppercase' }}>Price</div>
          <div style={{ fontSize: 8, fontWeight: 800, color: C.navy }}>฿{sell.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}

function DayCard({ day, showPrice = true }) {
  const img = day.image || day.services?.find(s => s.image)?.image;
  const mealIcons = { 'Breakfast': '🍳', 'Half Board': '🍳🍽️', 'Full Board': '🍳🍽️🌙', 'All Inclusive': '🌟' };
  const mealIcon = mealIcons[day.meal] || '';

  return (
    <div data-pdf-itinerary-day="true" data-pdf-keep-together="true" style={{
      display: 'flex', borderRadius: 10, border: `1px solid ${C.border}`,
      overflow: 'hidden', marginBottom: 7, boxShadow: '0 2px 8px rgba(10,34,64,0.07)',
      background: C.white, breakInside: 'avoid', pageBreakInside: 'avoid',
    }}>
      {/* Day number sidebar */}
      <div style={{
        width: 50, flexShrink: 0, background: `linear-gradient(180deg, ${C.navy} 0%, ${C.navyLight} 100%)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '8px 4px', gap: 3,
      }}>
        <div style={{ fontSize: 5.5, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>DAY</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.white, lineHeight: 1 }}>{String(day.day || 1).padStart(2, '0')}</div>
        <div style={{ width: 22, height: 2, borderRadius: 1, background: `linear-gradient(90deg, ${C.coral}, ${C.gold})` }} />
        {day.date && <div style={{ fontSize: 6, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 1.3 }}>{formatDate(day.date, '')}</div>}
        {mealIcon && <div style={{ fontSize: 9, marginTop: 2 }}>{mealIcon}</div>}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '8px 10px', minWidth: 0 }}>
        {day.destination && (
          <div style={{ fontSize: 6.5, fontWeight: 700, color: C.aquaDark, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
            📍 {day.destination}
          </div>
        )}
        <div style={{ fontWeight: 900, fontSize: 10, color: C.navy, lineHeight: 1.2, marginBottom: 4 }}>
          {day.title || `Day ${day.day}`}
        </div>
        {day.description && (
          <div style={{ fontSize: 7, color: C.muted, lineHeight: 1.5, marginBottom: 5, borderLeft: `2px solid ${C.aqua}`, paddingLeft: 6 }}>
            {day.description.slice(0, 130)}{day.description.length > 130 ? '…' : ''}
          </div>
        )}
        {(day.services || []).map((svc, si) => (
          <DayServiceRow key={si} service={svc} showPrice={showPrice} />
        ))}
        {(!day.services || day.services.length === 0) && (
          <div style={{ fontSize: 7, color: C.gold, fontWeight: 600, fontStyle: 'italic' }}>🌟 Open Day — Explore at leisure</div>
        )}
        {day.hotel && (
          <div style={{ marginTop: 4, fontSize: 7, color: C.muted, display: 'flex', alignItems: 'center', gap: 3 }}>
            <span>🏨</span>
            <span style={{ fontWeight: 600 }}>Hotel:</span> {day.hotel}
          </div>
        )}
      </div>

      {/* Thumbnail image */}
      {img && (
        <div style={{ width: 85, flexShrink: 0, overflow: 'hidden' }}>
          <img src={img} alt={day.destination || ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        </div>
      )}
    </div>
  );
}

function ItineraryPages({ quotation, startPage, totalPages, showPrice = true }) {
  const itinerary = quotation.itinerary || [];
  if (!itinerary.length) return null;

  const DAYS_PER_PAGE = 4;
  const chunks = [];
  for (let i = 0; i < itinerary.length; i += DAYS_PER_PAGE) {
    chunks.push(itinerary.slice(i, i + DAYS_PER_PAGE));
  }

  return (
    <>
      {chunks.map((chunk, pi) => (
        <A4 key={pi} footer={<PageFooter quotation={quotation} pageNum={startPage + pi} totalPages={totalPages} />}>
          {/* Page header */}
          <div data-pdf-keep-together="true" style={{ marginBottom: 10 }}>
            {pi === 0 && (
              <>
                <div style={{ fontSize: 6.5, color: C.coral, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 3 }}>
                  YOUR JOURNEY
                </div>
                <div style={{ fontWeight: 900, fontSize: 14, color: C.navy, lineHeight: 1.1, marginBottom: 4 }}>
                  🗓️ Day-by-Day Itinerary
                </div>
                <GoldBar width={50} height={3} style={{ marginBottom: 6 }} />
              </>
            )}
            {pi > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 10 }}>🗓️</span>
                <span style={{ fontWeight: 800, fontSize: 10, color: C.navy }}>Itinerary — Continued</span>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.coral}50, transparent)` }} />
              </div>
            )}
          </div>

          {chunk.map((day, di) => (
            <DayCard key={di} day={day} showPrice={showPrice} />
          ))}
        </A4>
      ))}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LAST PAGE — PACKAGE SUMMARY
// ══════════════════════════════════════════════════════════════════════════════
function richTextLines(value) {
  return String(value || '')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/(p|div|li|h2|h3|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>\n?/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .split(/\n+/).map(l => l.trim()).filter(Boolean);
}

function SummaryPage({ quotation, pageNum, totalPages, showPrice = true }) {
  const { totalSelling } = quotationTotals(quotation);
  const perPerson = quotationPricePerPerson(quotation);
  const passengerPrices = quotationPassengerPrices(quotation);
  const currency = quotation.currency || 'THB';
  const sym = currency === 'THB' ? '฿' : currency;
  const perPersonLabel = passengerPrices.hasDifferentChildPrice
    ? `${sym} ${passengerPrices.adult.toLocaleString()} per adult · ${sym} ${passengerPrices.child.toLocaleString()} per child`
    : `${sym} ${perPerson.toLocaleString()} per person`;

  const inclusions  = richTextLines(quotation.inclusions);
  const exclusions  = richTextLines(quotation.exclusions);
  const payTerms    = richTextLines(quotation.paymentTerms);
  const cancelPol   = richTextLines(quotation.cancellationPolicy);
  const notes       = richTextLines(quotation.importantNotes);
  const termsHtml   = quotation.termsHtml || '';

  return (
    <A4 footer={<PageFooter quotation={quotation} pageNum={pageNum} totalPages={totalPages} />}>
      {/* Page title */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 6.5, color: C.coral, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 3 }}>
          PACKAGE DETAILS
        </div>
        <div style={{ fontWeight: 900, fontSize: 14, color: C.navy, lineHeight: 1.1, marginBottom: 4 }}>
          📋 Package Summary
        </div>
        <GoldBar width={50} height={3} />
      </div>

      {/* Inclusions & Exclusions */}
      {(inclusions.length > 0 || exclusions.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          {/* Inclusions */}
          {inclusions.length > 0 && (
            <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '8px 10px', border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: 7.5, fontWeight: 800, color: '#15803D', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>✅</span> INCLUSIONS
              </div>
              {inclusions.map((line, i) => (
                <div key={i} style={{ fontSize: 7, color: '#166534', marginBottom: 3, display: 'flex', alignItems: 'flex-start', gap: 4, lineHeight: 1.4 }}>
                  <span style={{ color: '#22C55E', flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span>{line.replace(/^[•–-]\s*/, '')}</span>
                </div>
              ))}
            </div>
          )}
          {/* Exclusions */}
          {exclusions.length > 0 && (
            <div style={{ background: '#FFF5F5', borderRadius: 8, padding: '8px 10px', border: '1px solid #FECACA' }}>
              <div style={{ fontSize: 7.5, fontWeight: 800, color: '#DC2626', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>❌</span> EXCLUSIONS
              </div>
              {exclusions.map((line, i) => (
                <div key={i} style={{ fontSize: 7, color: '#991B1B', marginBottom: 3, display: 'flex', alignItems: 'flex-start', gap: 4, lineHeight: 1.4 }}>
                  <span style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }}>✗</span>
                  <span>{line.replace(/^[•–-]\s*/, '')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hotel Summary Table */}
      {(quotation.hotels || []).length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <SectionTitle emoji="🏨" text="Hotel Summary" />
          <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.25fr 1.25fr .7fr .9fr .95fr', background: C.navy, padding: '6px 10px' }}>
              {['Hotel', 'Room Type', 'Room Allocation', 'Nights', 'Meal Plan', 'Check-In'].map(h => (
                <div key={h} style={{ fontSize: 6.5, fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>
            {(quotation.hotels || []).map((h, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.25fr 1.25fr .7fr .9fr .95fr', padding: '6px 10px', background: i % 2 === 0 ? C.white : C.offWhite, borderTop: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 8, color: C.navy }}>{h.name}</div>
                  <div style={{ fontSize: 6.5, color: C.aquaDark }}>{h.city} {h.category ? `· ${h.category}` : ''}</div>
                </div>
                <div style={{ fontSize: 7.5, color: C.text, display: 'flex', alignItems: 'center' }}>{h.roomType || '—'}</div>
                <div style={{ fontSize: 6.5, color: C.text, display: 'flex', alignItems: 'center' }}>{h.roomAllocation || '—'}</div>
                <div style={{ fontSize: 8, fontWeight: 700, color: C.navy, display: 'flex', alignItems: 'center' }}>{h.nights}N</div>
                <div style={{ fontSize: 7, color: C.muted, display: 'flex', alignItems: 'center' }}>{h.mealPlan || '—'}</div>
                <div style={{ fontSize: 7, color: C.muted, display: 'flex', alignItems: 'center' }}>{formatDate(h.checkIn, '') || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing table */}
      {showPrice && (quotation.pricing || []).length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <SectionTitle emoji="💰" text="Pricing Breakdown" />
          <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', background: C.navy, padding: '6px 10px' }}>
              {['Category', 'Pax', 'Rate', 'Total'].map(h => (
                <div key={h} style={{ fontSize: 6.5, fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>
            {(quotation.pricing || []).map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '5px 10px', background: i % 2 === 0 ? C.white : C.offWhite, borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 8, fontWeight: 600, color: C.navy }}>{row.category}</div>
                <div style={{ fontSize: 8, color: C.muted, display: 'flex', alignItems: 'center' }}>—</div>
                <div style={{ fontSize: 8, color: C.muted, display: 'flex', alignItems: 'center' }}>{sym} {Number(row.netRate || 0).toLocaleString()}</div>
                <div style={{ fontSize: 8, fontWeight: 700, color: C.navy, display: 'flex', alignItems: 'center' }}>{sym} {Number(row.total || 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total price box */}
      {showPrice && <div style={{
        background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`,
        borderRadius: 10, padding: '10px 16px', marginBottom: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>TOTAL PACKAGE PRICE</div>
          <div style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>All taxes & service charges included</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.gold }}>
            {sym} {Number(totalSelling || quotation.totalSelling || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: 6.5, fontWeight: 700, color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>{perPersonLabel}</div>
        </div>
      </div>}

      {/* Payment Terms & Cancellation */}
      {(payTerms.length > 0 || cancelPol.length > 0) && (
        <div data-pdf-keep-together="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          {payTerms.length > 0 && (
            <div style={{ background: C.aqua, borderRadius: 8, padding: '8px 10px', border: `1px solid ${C.aquaDark}30` }}>
              <div style={{ fontSize: 7.5, fontWeight: 800, color: C.aquaDark, marginBottom: 4 }}>💳 Payment Terms</div>
              {payTerms.map((line, i) => (
                <div key={i} style={{ fontSize: 6.5, color: C.navy, marginBottom: 2, lineHeight: 1.4 }}>• {line.replace(/^[•–-]\s*/, '')}</div>
              ))}
            </div>
          )}
          {cancelPol.length > 0 && (
            <div style={{ background: C.goldSoft, borderRadius: 8, padding: '8px 10px', border: `1px solid ${C.gold}40` }}>
              <div style={{ fontSize: 7.5, fontWeight: 800, color: '#D97706', marginBottom: 4 }}>⚠️ Cancellation Policy</div>
              {cancelPol.map((line, i) => (
                <div key={i} style={{ fontSize: 6.5, color: C.navy, marginBottom: 2, lineHeight: 1.4 }}>• {line.replace(/^[•–-]\s*/, '')}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Important Notes */}
      {(termsHtml || notes.length > 0) && (
        <div data-pdf-keep-together="true" style={{ background: '#FFFBEB', borderRadius: 8, padding: '8px 10px', border: '1px solid #FDE68A', marginBottom: 8 }}>
          <div style={{ fontSize: 7.5, fontWeight: 800, color: '#92400E', marginBottom: 4 }}>📌 Important Notes</div>
          {termsHtml ? <div className="rich-text-content" style={{ fontSize: 6.5, color: '#093f3e', lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: termsHtml }} /> : notes.slice(0, 5).map((line, i) => (
            <div key={i} style={{ fontSize: 6.5, color: '#093f3e', marginBottom: 2, lineHeight: 1.4 }}>• {line.replace(/^[•–-]\s*/, '')}</div>
          ))}
        </div>
      )}

      {/* Contact & Thank you */}
      <div data-pdf-keep-together="true" style={{
        marginTop: 'auto', background: `linear-gradient(135deg, ${C.navy}08, ${C.aqua}50)`,
        borderRadius: 10, padding: '10px 14px', border: `1px solid ${C.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 9, color: C.navy }}>{brandName(quotation)}</div>
          {quotation.companyDetails?.address && <div style={{ fontSize: 6.5, color: C.muted, marginTop: 2 }}>📍 {quotation.companyDetails.address}</div>}
          {quotation.companyDetails?.phone   && <div style={{ fontSize: 6.5, color: C.muted, marginTop: 1 }}>📞 {quotation.companyDetails.phone}</div>}
          {quotation.companyDetails?.email   && <div style={{ fontSize: 6.5, color: C.muted, marginTop: 1 }}>✉ {quotation.companyDetails.email}</div>}
          {quotation.companyDetails?.website && <div style={{ fontSize: 6.5, color: C.aquaDark, marginTop: 1 }}>🌐 {quotation.companyDetails.website}</div>}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20 }}>🌴</div>
          <div style={{ fontWeight: 900, fontSize: 8.5, color: C.navy, marginTop: 3 }}>Thank You!</div>
          <div style={{ fontSize: 7, color: C.muted, marginTop: 1 }}>We look forward to crafting</div>
          <div style={{ fontSize: 7, color: C.muted }}>your perfect Thailand escape.</div>
          <GoldBar width={50} height={2} style={{ margin: '5px auto 0' }} />
        </div>
      </div>
    </A4>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export function ThaiExperienceTemplate({ quotation, config }) {
  if (!quotation) return null;

  const itinerary   = quotation.itinerary   || [];
  const showClientPrice = !config?.clientPreview || config?.showClientPrice !== false;
  // Keep customer PDFs to the final package amount, not a rate breakdown.
  const showServicePrices = !config?.clientPreview;
  const sightseeing = quotation.sightseeing  || [];
  const highlights  = quotation.highlights   || [];
  const activities  = itinerary.flatMap(d => (d.services || []).filter(s => s.type === 'Activity'));
  const yachts      = itinerary.flatMap(d => (d.services || []).filter(s => s.type === 'Yacht' || s.type === 'Ferry'));

  const hasHighlightsPage = highlights.length > 0 || sightseeing.length > 0 || activities.length > 0 || yachts.length > 0;
  const DAYS_PER_PAGE = 4;
  const itineraryPageCount = itinerary.length > 0 ? Math.ceil(itinerary.length / DAYS_PER_PAGE) : 0;

  // Page numbering:
  // 1 = Cover
  // 2 = Highlights (if any data)
  // 3..3+itineraryPageCount-1 = Itinerary pages
  // Last = Summary
  let totalPages = 1; // cover
  if (hasHighlightsPage) totalPages += 1;
  totalPages += itineraryPageCount;
  totalPages += 1; // summary

  let currentPage = 1;
  const coverPage = currentPage++;
  const highlightsPageNum = hasHighlightsPage ? currentPage++ : null;
  const itineraryStartPage = currentPage;
  currentPage += itineraryPageCount;
  const summaryPageNum = currentPage;

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Cover */}
      <CoverPage quotation={quotation} totalPages={totalPages} showPrice={showClientPrice} config={config} />

      {/* Journey Highlights */}
      {hasHighlightsPage && (
        <HighlightsPage quotation={quotation} pageNum={highlightsPageNum} totalPages={totalPages} config={config} />
      )}

      {/* Day-by-Day Itinerary */}
      {itinerary.length > 0 && (
        <ItineraryPages
          quotation={quotation}
          startPage={itineraryStartPage}
          totalPages={totalPages}
          showPrice={showServicePrices}
        />
      )}

      {/* Package Summary */}
      <SummaryPage quotation={quotation} pageNum={summaryPageNum} totalPages={totalPages} showPrice={showClientPrice} />
    </div>
  );
}
