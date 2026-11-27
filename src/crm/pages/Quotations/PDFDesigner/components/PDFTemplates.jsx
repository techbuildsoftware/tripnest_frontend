import React from 'react';
import { formatDate } from '../../../../lib/date';
import {
  PDFHeader, PDFFooter, SectionHeader,
  QuotationSummary, HotelTable, ItineraryTable,
  InclusionsExclusions, PricingTable,
  PaymentCancellation, ImportantNotes,
  OptionalAddons, ItineraryDay, ResponsiveCardRows, ServiceDescription,
  pdfCardContentPadding, pdfCardImageHeight, pdfCoverImageHeight,
} from './PDFPrimitives';
import { THEMES, resolveCoverImage } from '../data/pdfConfig';
import { quotationPassengerPrices, quotationPricePerPerson, quotationTotals } from '../data/quotationPdf';
export { LuxuryTravelQuotationTemplate } from './LuxuryTravelTemplate';
export { ThaiExperienceTemplate } from './ThaiExperienceTemplate';
export { PortraitCreativeTemplate } from './PortraitCreativeTemplate';

const printableAssetUrl = (source) => typeof window === 'undefined' || /^https?:/i.test(source)
  ? source
  : new URL(source, window.location.origin).href;

// ─── Resolve theme with custom accent ──────────────────────────────────────────
const getTheme = (config) => {
  const baseTheme = THEMES[config.theme] || THEMES['corporate-blue'];
  const theme = { ...baseTheme };
  if (config.accentColor && config.accentColor !== baseTheme.accent) {
    theme.accent = config.accentColor;
    theme.sectionBg = config.accentColor;
    theme.priceColor = config.accentColor;
    theme.coverGradient = `linear-gradient(135deg, ${config.accentColor} 0%, ${baseTheme.secondary} 100%)`;
  }
  return theme;
};

function DocumentBrandMark({ quotation, size = 28, radius = 6, background = '#102A43' }) {
  if (!quotation?.logo) return null;
  return <img src={printableAssetUrl(quotation.logo)} alt="Company logo" style={{ height: size, maxWidth: size * 3, borderRadius: radius, objectFit: 'contain', background }} />;
}

const documentBrandName = (quotation) => quotation?.companyDetails?.name || quotation?.agent?.name || 'TripNest';

// ─── A4 Page wrapper ──────────────────────────────────────────────────────────
function A4Page({ children, theme, config, pageNum, totalPages, quotation, isFirst = false }) {
  const coverImg = resolveCoverImage(config);

  return (
    <div
      className="a4-page"
      style={{
        width: 595,
        background: config.pageBackground === 'light-pattern'
          ? `repeating-linear-gradient(45deg, #F8FAFC, #F8FAFC 10px, #FFFFFF 10px, #FFFFFF 20px)`
          : config.pageBackground === 'custom'
            ? (config.customPageBackground || '#FFFFFF')
            : '#FFFFFF',
        padding: '24px 28px',
        position: 'relative',
        fontSize: 9,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#1E293B',
        boxSizing: 'border-box',
        borderBottom: pageNum < totalPages ? '1px dashed #E2E8F0' : 'none',
        marginBottom: pageNum < totalPages ? 20 : 0,
        overflow: 'hidden',
      }}
    >
      {/* Destination Watermark */}
      {config.pageBackground === 'destination-watermark' && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${coverImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.05,
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        {/* The document identity belongs on the first page only. Individual
            templates render their initial header explicitly, so later pages
            retain their full content area instead of repeating the branding. */}
        <div style={{ flex: 1 }}>{children}</div>
        <PDFFooter quotation={quotation} theme={theme} pageNum={pageNum} totalPages={totalPages} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TEMPLATE 1: CLASSIC PROFESSIONAL
// ════════════════════════════════════════════════════════════════════
export function ClassicTemplate({ quotation, config }) {
  const theme = getTheme(config);
  const totalPages = 2 + (quotation.optionalAddons?.length ? 1 : 0);

  return (
    <div>
      {/* Page 1 */}
      <A4Page theme={theme} config={config} pageNum={1} totalPages={totalPages} quotation={quotation} isFirst>
        <PDFHeader quotation={quotation} theme={theme} config={config} />

        {/* QUOTATION title */}
        <div style={{ textAlign: 'center', margin: '10px 0 8px', padding: '6px', background: theme.accent + '15', borderRadius: 4 }}>
          <div style={{ fontWeight: 900, fontSize: 14, color: theme.accent, letterSpacing: '0.08em' }}>QUOTATION</div>
          <div style={{ fontSize: 8, color: '#64748B', marginTop: 1 }}>
            No: {quotation.quotationNo} &nbsp;·&nbsp; Date: {formatDate(quotation.quotationDate, '')}
          </div>
        </div>

        <QuotationSummary quotation={quotation} theme={theme} config={config} />
        <HotelTable hotels={quotation.hotels} theme={theme} config={config} />
        <ItineraryTable itinerary={quotation.itinerary} theme={theme} config={config} />
      </A4Page>

      {/* Page 2 */}
      <A4Page theme={theme} config={config} pageNum={2} totalPages={totalPages} quotation={quotation}>
        <InclusionsExclusions inclusions={quotation.inclusions} exclusions={quotation.exclusions} theme={theme} config={config} />
        <PricingTable quotation={quotation} theme={theme} config={config} />
        <PaymentCancellation quotation={quotation} theme={theme} config={config} />
        <ImportantNotes notes={quotation.importantNotes} html={quotation.termsHtml} theme={theme} config={config} />
        {quotation.optionalAddons?.length > 0 && (
          <OptionalAddons addons={quotation.optionalAddons} theme={theme} config={config} />
        )}

        {/* Footer signature */}
        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 8, color: '#94A3B8', borderTop: `1px solid ${theme.borderColor}`, paddingTop: 6 }}>
          Thank you for choosing {quotation?.companyDetails?.name || 'TripNest'}. We look forward to serving you.
        </div>
      </A4Page>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TEMPLATE 2: PREMIUM VISUAL
// ════════════════════════════════════════════════════════════════════
export function PremiumTemplate({ quotation, config }) {
  const theme = getTheme(config);
  const coverImg = resolveCoverImage(config);
  const heroHeight = pdfCoverImageHeight(config, 360, { min: 150, max: 420 });
  const compactHero = heroHeight <= 240;
  const heroPadding = compactHero ? '10px 16px 0' : '18px 24px 0';
  const heroTitleOffset = compactHero ? 14 : 50;
  const totalPages = 3;
  const { totalSelling: totalSell } = quotationTotals(quotation);
  const perPerson = quotationPricePerPerson(quotation);
  const passengerPrices = quotationPassengerPrices(quotation);
  const perPersonLabel = passengerPrices.hasDifferentChildPrice
    ? `${quotation.currency === 'INR' ? '₹' : 'THB'} ${passengerPrices.adult.toLocaleString()} per adult · ${quotation.currency === 'INR' ? '₹' : 'THB'} ${passengerPrices.child.toLocaleString()} per child`
    : `${quotation.currency === 'INR' ? '₹' : 'THB'} ${perPerson.toLocaleString()} per person`;

  const highlights = quotation.highlights || [];

  return (
    <div>
      {/* Page 1 — Hero Cover */}
      <div
        className="a4-page"
        style={{
          width: 595, minHeight: 842,
          position: 'relative', overflow: 'hidden',
          fontFamily: 'Inter, system-ui, sans-serif',
          boxSizing: 'border-box',
          marginBottom: 20,
          background: config.pageBackground === 'light-pattern'
            ? `repeating-linear-gradient(45deg, #F8FAFC, #F8FAFC 10px, #FFFFFF 10px, #FFFFFF 20px)`
            : config.pageBackground === 'custom'
              ? (config.customPageBackground || '#FFFFFF')
              : '#FFFFFF',
        }}
      >
        {/* Destination Watermark */}
        {config.pageBackground === 'destination-watermark' && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${coverImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.05,
            pointerEvents: 'none',
            zIndex: 0,
          }} />
        )}
        {/* Hero image.  It has its own bounded container so lowering the cover
            height cannot leave white space behind text or clip the tag labels. */}
        <div style={{ position: 'relative', height: heroHeight, overflow: 'hidden' }}>
        {config.coverBackground === 'destination-image' ? (
          <img src={coverImg} alt="Cover" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: heroHeight, objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: heroHeight, background: theme.coverGradient }} />
        )}
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: heroHeight, background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.6) 100%)' }} />

        {/* Branding on hero */}
        <div style={{ position: 'relative', zIndex: 2, padding: heroPadding }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {config.logo !== 'none' && <DocumentBrandMark quotation={quotation} background="rgba(255,255,255,0.9)" />}
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 10 }}>{documentBrandName(quotation)}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 7 }}>{quotation?.companyDetails?.tagline || ''}</div>
              </div>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 7, textAlign: 'right' }}>Your Trusted Thai DMC Partner</div>
          </div>

          {/* Hero text */}
          <div style={{ marginTop: heroTitleOffset, textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: compactHero ? 7 : 9, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: compactHero ? 2 : 4 }}>
              AMAZING THAILAND
            </div>
            <div style={{ color: '#F59E0B', fontWeight: 900, fontSize: compactHero ? 22 : 32, lineHeight: 1.1, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              THAILAND
            </div>
            <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: compactHero ? 10 : 15, fontStyle: 'italic', marginTop: 2 }}>
              {quotation.packageType}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: compactHero ? 8 : 10, marginTop: compactHero ? 3 : 6, letterSpacing: '0.05em' }}>
              {quotation.duration}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: compactHero ? 6.5 : 8.5, marginTop: 3, letterSpacing: '0.08em' }}>
              {quotation.destination.split('–').map(d => d.trim()).join(' | ')}
            </div>
          </div>

          {/* Tag pills on hero */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: compactHero ? 4 : 6, marginTop: compactHero ? 6 : 14 }}>
            {['🏖 BEACHES', '🏝 ISLANDS', '🛍 SHOPPING', '🕌 CULTURE'].map(tag => (
              <div key={tag} style={{ background: 'rgba(15,23,42,0.56)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: compactHero ? 6.5 : 7.5, fontWeight: 700, padding: compactHero ? '2px 5px' : '3px 8px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.48)', whiteSpace: 'nowrap' }}>{tag}</div>
            ))}
          </div>
        </div>
        </div>

        {/* Trip summary bar */}
        <div style={{ 
          position: 'relative', 
          zIndex: 2, 
          background: 'rgba(255,255,255,0.98)', 
          margin: '12px 12px 0', 
          padding: '10px 16px',
          borderRadius: 8,
          boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
          border: '1px solid rgba(255,255,255,0.4)'
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: theme.accent, marginBottom: 6, textAlign: 'center' }}>Your Holiday at a Glance</div>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {[
              { icon: '📅', label: 'Travel Date', value: `${formatDate(quotation.travelStartDate, '')} – ${formatDate(quotation.travelEndDate, '')}` },
              { icon: '👨‍👩‍👧‍👦', label: 'Guests', value: quotation.totalPax },
              { icon: '🌙', label: 'Duration', value: quotation.duration },
              { icon: '🎯', label: 'Package Type', value: quotation.packageType },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 14 }}>{item.icon}</div>
                <div style={{ fontSize: 7, color: '#64748B', marginTop: 2 }}>{item.label}</div>
                <div style={{ fontSize: 8, fontWeight: 700, color: '#1E293B', marginTop: 1 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Destination cards */}
        <div style={{ padding: '0 24px', marginTop: 24 }}>
          <ResponsiveCardRows
            items={quotation.hotels}
            maxColumns={3}
            config={config}
            renderCard={(hotel, i) => (
              <div key={i} style={{ 
                border: `1px solid #1E293B`, 
                borderRadius: 6, 
                overflow: 'hidden',
                background: '#FFFFFF',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
              }}>
                {config.showHotelImages && hotel.image && (
                  <img src={hotel.image} alt={hotel.city} style={{ width: '100%', height: pdfCardImageHeight(config, 140), objectFit: 'cover', display: 'block' }} />
                )}
                <div style={{ height: 4, background: '#111827' }} /> {/* Black divider */}
                <div style={{ background: theme.accent, padding: pdfCardContentPadding(config, 8), textAlign: 'center' }}>
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: 10, letterSpacing: '0.05em' }}>{hotel.city.toUpperCase()}</div>
                  <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 7.5, fontWeight: 500, marginTop: 1 }}>{hotel.nights} Nights</div>
                </div>
                <div style={{ padding: pdfCardContentPadding(config, 10), background: '#FFFFFF' }}>
                  <div style={{ fontWeight: 800, fontSize: 9.5, color: '#1E293B', marginBottom: 4 }}>{hotel.name}</div>
                  <div style={{ fontSize: 8, color: '#475569', marginBottom: 2 }}>{hotel.roomType}</div>
                  <div style={{ fontSize: 8, color: '#475569' }}>{hotel.mealPlan}</div>
                  <div style={{ fontSize: 7.5, color: '#475569', marginTop: 3 }}>Rooms: {hotel.roomAllocation || '—'}</div>
                </div>
              </div>
            )}
          />
        </div>

        {/* Package highlights */}
        {highlights.length > 0 && <div style={{ padding: '10px 24px 0' }}>
          <div style={{ fontWeight: 700, fontSize: 9, color: theme.accent, marginBottom: 6 }}>PACKAGE HIGHLIGHTS</div>
          <ResponsiveCardRows
            items={highlights}
            maxColumns={4}
            gap={5}
            config={config}
            renderCard={(h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F8FAFC', padding: pdfCardContentPadding(config, 8), borderRadius: 5, border: `1px solid ${theme.borderColor}` }}>
                <span style={{ fontSize: 8, fontWeight: 600, color: '#374151' }}>{h.title}</span>
              </div>
            )}
          />
        </div>}

        {/* Price CTA */}
        {(!config?.clientPreview || config?.showClientPrice !== false) && <div style={{ margin: '10px 24px 0', background: `linear-gradient(90deg, ${theme.accent} 0%, ${theme.secondary} 100%)`, borderRadius: 8, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 8, fontWeight: 600 }}>TOTAL PACKAGE PRICE</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 7.5 }}>{quotation.totalPax} · All taxes included</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#FFFFFF', fontWeight: 900, fontSize: 20 }}>
              {quotation.currency === 'INR' ? '₹' : 'THB'} {Number(totalSell).toLocaleString()}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.78)', fontSize: 7, fontWeight: 700, marginTop: 2 }}>
              {perPersonLabel}
            </div>
          </div>
        </div>}

        {/* Footer */}
        <div style={{ margin: '10px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 7.5, color: '#64748B', borderTop: `1px solid #E2E8F0`, paddingTop: 6 }}>
          <div>{quotation?.companyDetails?.name || ''} · {quotation?.companyDetails?.address || ''}</div>
          <div>{quotation?.companyDetails?.phone || ''} · {quotation?.companyDetails?.email || ''}</div>
        </div>
      </div>

      {/* Page 2 — Detailed info */}
      <A4Page theme={theme} config={config} pageNum={2} totalPages={totalPages} quotation={quotation}>
        <QuotationSummary quotation={quotation} theme={theme} config={config} />
        <HotelTable hotels={quotation.hotels} theme={theme} config={config} />
        <ItineraryTable itinerary={quotation.itinerary} theme={theme} config={config} fullWidthDescriptions />
        <InclusionsExclusions inclusions={quotation.inclusions} exclusions={quotation.exclusions} theme={theme} config={config} />
      </A4Page>

      {/* Page 3 — Pricing, Terms */}
      <A4Page theme={theme} config={config} pageNum={3} totalPages={totalPages} quotation={quotation}>
        <PricingTable quotation={quotation} theme={theme} config={config} />
        {quotation.optionalAddons?.length > 0 && <OptionalAddons addons={quotation.optionalAddons} theme={theme} config={config} />}
        <PaymentCancellation quotation={quotation} theme={theme} config={config} />
        <ImportantNotes notes={quotation.importantNotes} html={quotation.termsHtml} theme={theme} config={config} />
      </A4Page>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TEMPLATE 3: DETAILED DAY-WISE ITINERARY
// ════════════════════════════════════════════════════════════════════

export function DetailedTemplate({ quotation, config }) {
  const theme = getTheme(config);

  return (
    <div>
      {/* Single Continuous Page */}
      <A4Page theme={theme} config={config} pageNum={1} totalPages={1} quotation={quotation} isFirst>
        <PDFHeader quotation={quotation} theme={theme} config={config} />

        {/* Package headline */}
        <div style={{ background: theme.accent, borderRadius: 6, padding: '10px 14px', marginBottom: 10, color: '#fff' }}>
          <div style={{ fontWeight: 900, fontSize: 13 }}>{quotation.packageType || 'Thailand Holiday'}</div>
          <div style={{ fontSize: 9, opacity: 0.85, marginTop: 2 }}>{quotation.destination} ({quotation.duration})</div>
        </div>

        <QuotationSummary quotation={quotation} theme={theme} config={config} />
        <HotelTable hotels={quotation.hotels} theme={theme} config={config} />
        <ItineraryTable itinerary={quotation.itinerary} theme={theme} config={config} fullWidthDescriptions />

        {/* Detailed Itinerary */}
        {quotation.itinerary?.length > 0 && <div style={{ marginTop: 14 }}>
          <SectionHeader title="Detailed Itinerary" theme={theme} config={config} icon="🗓" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quotation.itinerary.map((day, i) => (
              <div key={i} data-pdf-itinerary-day="true" data-pdf-keep-together="true" style={{ breakInside: 'avoid', pageBreakInside: 'avoid', marginBottom: 6 }}>
                <ItineraryDay day={day} theme={theme} config={config} showImages={config.showActivityImages} />
              </div>
            ))}
          </div>
        </div>}

        <InclusionsExclusions inclusions={quotation.inclusions} exclusions={quotation.exclusions} theme={theme} config={config} />
        <ImportantNotes notes={quotation.importantNotes} html={quotation.termsHtml} theme={theme} config={config} />
        <PricingTable quotation={quotation} theme={theme} config={config} />
        <PaymentCancellation quotation={quotation} theme={theme} config={config} />
      </A4Page>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TEMPLATE 4: COMPACT RATE QUOTATION
// ════════════════════════════════════════════════════════════════════
export function CompactTemplate({ quotation, config }) {
  const theme = getTheme(config);
  const totalPages = 2;

  const services = [
    { icon: '✈', label: 'Airport Transfers', included: quotation.transfers?.length > 0 },
    { icon: '🏖', label: 'Sightseeing', included: quotation.sightseeing?.length > 0 },
    { icon: '🏨', label: 'Hotels', included: quotation.hotels?.length > 0 },
    { icon: '🍳', label: 'Daily Breakfast', included: quotation.hotels?.some(h => h.mealPlan === 'Breakfast') },
    { icon: '📊', label: 'All Taxes', included: true },
  ].filter(s => s.included);

  return (
    <div>
      {/* Page 1 */}
      <A4Page theme={theme} config={config} pageNum={1} totalPages={totalPages} quotation={quotation} isFirst>
        <PDFHeader quotation={quotation} theme={theme} config={config} />

        {/* Compact header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 8 }}>
          <div style={{ background: theme.accent + '10', borderRadius: 5, padding: '6px 10px', borderLeft: `3px solid ${theme.accent}` }}>
            <div style={{ fontWeight: 900, fontSize: 11, color: theme.accent }}>QUOTATION</div>
            <div style={{ fontSize: 7.5, color: '#64748B' }}>No: {quotation.quotationNo} &nbsp;·&nbsp; Date: {formatDate(quotation.quotationDate, '')}</div>
          </div>
          {/* destination mini-map */}
          <div style={{ background: theme.accent, borderRadius: 5, padding: '6px 10px', textAlign: 'center', color: '#fff' }}>
            <div style={{ fontWeight: 900, fontSize: 10 }}>THAILAND</div>
            <div style={{ fontSize: 7, opacity: 0.85 }}>{quotation.destination}</div>
            <div style={{ fontSize: 7, opacity: 0.85 }}>{quotation.duration}</div>
          </div>
        </div>

        {/* Package Summary compact */}
        <SectionHeader title="Package Summary" theme={theme} config={config} icon="📋" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginBottom: 8, fontSize: 8.5 }}>
          {[
            ['Destination', quotation.destination],
            ['Travel Dates', `${formatDate(quotation.travelStartDate, '')} – ${formatDate(quotation.travelEndDate, '')}`],
            ['Guests', quotation.totalPax],
            ['Package Type', quotation.packageType],
            ['Duration', quotation.duration],
            ['Agent', quotation.agent.name],
          ].map(([k, v], i) => (
            <div key={i} style={{ display: 'flex', gap: 4, padding: '2px 0', borderBottom: `1px solid ${theme.borderColor}` }}>
              <span style={{ fontWeight: 700, color: '#374151', minWidth: 70 }}>{k}:</span>
              <span style={{ color: '#1E293B' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Hotels compact */}
        <HotelTable hotels={quotation.hotels} theme={theme} config={config} />

        {/* Services included */}
        <SectionHeader title="Services Included" theme={theme} config={config} icon="✅" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {services.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 4, padding: '3px 8px' }}>
              <span style={{ fontSize: 11 }}>{s.icon}</span>
              <span style={{ fontSize: 8, fontWeight: 600, color: '#15803D' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <PricingTable quotation={quotation} theme={theme} config={config} />
        <ItineraryTable itinerary={quotation.itinerary} theme={theme} config={config} />
      </A4Page>

      {/* Page 2 — Terms */}
      <A4Page theme={theme} config={config} pageNum={2} totalPages={totalPages} quotation={quotation}>
        <InclusionsExclusions inclusions={quotation.inclusions} exclusions={quotation.exclusions} theme={theme} config={config} />
        {quotation.optionalAddons?.length > 0 && <OptionalAddons addons={quotation.optionalAddons} theme={theme} config={config} />}
        <PaymentCancellation quotation={quotation} theme={theme} config={config} />
        <ImportantNotes notes={quotation.importantNotes} html={quotation.termsHtml} theme={theme} config={config} />
      </A4Page>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TEMPLATE 5: BUILDSOFTWARE PREMIUM (reference-matched design)
// Navy #102A43 · Teal #008F87 · Gold #C9A13B
// ════════════════════════════════════════════════════════════════════
const TA = {
  navy:      '#102A43',
  darkNavy:  '#0F2942',
  teal:      '#008F87',
  lightTeal: '#E7F5F3',
  gold:      '#C9A13B',
  lightGold: '#F5EBD0',
  darkText:  '#16324F',
  secondary: '#687684',
  border:    '#E5E7EB',
  bg:        '#FFFFFF',
  mutedBg:   '#F7FAFA',
};

// Service badge colors
const SERVICE_BADGE = {
  Hotel:        { bg: TA.lightTeal, text: TA.teal },
  Transfer:     { bg: '#E0F0FF',    text: '#0b6f6b' },
  Sightseeing:  { bg: '#F3E8FF',    text: '#7c3aed' },
  Activity:     { bg: '#FFF3E0',    text: '#d97706' },
  Meal:         { bg: '#F0FDF4',    text: '#15803d' },
  Restaurant:   { bg: '#F0FDF4',    text: '#15803d' },
  Miscellaneous:{ bg: '#F1F5F9',    text: '#64748b' },
};

function TAPDFHeader({ quotation, compact }) {
  const q = quotation;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: compact ? 8 : 10, paddingBottom: compact ? 6 : 8, borderBottom: `1.5px solid ${TA.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <DocumentBrandMark quotation={quotation} size={compact ? 24 : 28} radius="50%" />
        <div>
          <div style={{ fontWeight: 900, fontSize: compact ? 9 : 11, color: TA.navy, letterSpacing: '0.03em' }}>{documentBrandName(q)}</div>
          <div style={{ fontSize: 6, color: TA.secondary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Travel Quotation</div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 7, color: TA.secondary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quotation</div>
        <div style={{ fontSize: compact ? 9 : 11, fontWeight: 800, color: TA.navy }}>{q.quotationNo || 'QT-2026-000'}</div>
        {!compact && (
          <>
            <div style={{ fontSize: 6, color: TA.secondary, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Valid Until</div>
            <div style={{ fontSize: 8, fontWeight: 700, color: TA.darkText }}>{formatDate(q.validUntil || q.quotationDate, '–')}</div>
          </>
        )}
        {compact && (
          <div style={{ fontSize: 7, color: TA.secondary }}>
            {q.destination || '–'} | {formatDate(q.travelStartDate, '–')} – {formatDate(q.travelEndDate, '–')}
          </div>
        )}
      </div>
    </div>
  );
}

function TAPDFFooter({ quotation, pageNum, totalPages }) {
  return null;
}

function TAInfoCard({ icon, label, value }) {
  return (
    <div style={{
      flex: 1, padding: '8px 10px',
      border: `1px solid ${TA.border}`,
      borderRadius: 10,
      background: 'white',
      boxShadow: '0 1px 4px rgba(16,42,67,0.06)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: TA.lightTeal, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 9 }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 6, fontWeight: 700, color: TA.secondary, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
        <div style={{ fontSize: 9, fontWeight: 700, color: TA.darkText, marginTop: 1 }}>{value || '–'}</div>
      </div>
    </div>
  );
}

function TAPriceCard({ label, value, bg, currency, subLabel = '' }) {
  return (
    <div style={{ flex: 1, borderRadius: 10, background: bg, padding: '10px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.8)' }}>{label}</div>
      {bg === TA.navy && <div style={{ width: 24, height: 2, background: TA.gold, borderRadius: 1, marginBottom: 2 }} />}
      <div style={{ fontSize: 16, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
        {currency || '฿'}{typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {subLabel && <div style={{ fontSize: 6.5, fontWeight: 700, color: 'rgba(255,255,255,0.78)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{subLabel}</div>}
    </div>
  );
}

function TAServiceBadge({ type }) {
  const style = SERVICE_BADGE[type] || SERVICE_BADGE.Miscellaneous;
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 6px',
      borderRadius: 8,
      fontSize: 6,
      fontWeight: 700,
      background: style.bg,
      color: style.text,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      flexShrink: 0,
    }}>
      {type}
    </span>
  );
}

function TAServiceRow({ service, showPrice = true }) {
  const img = service.image || null;
  // Saved quotation PDFs are client-facing documents. Never fall back to an
  // internal net cost when a customer price has not been set.
  const sell = Number(service.sellingPrice || service.selling || service.totalSellingPrice || 0);

  return (
    <div data-pdf-itinerary-service="true" style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 8px',
      background: TA.mutedBg,
      borderRadius: 8,
      marginBottom: 5,
      border: `1px solid ${TA.border}`,
    }}>
      {img && <img src={img} alt="" style={{ width: 30, height: 30, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <TAServiceBadge type={service.type || 'Miscellaneous'} />
          <span style={{ fontSize: 8, fontWeight: 700, color: TA.darkText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{service.label || service.name || 'Service'}</span>
        </div>
        {service.detail && <div style={{ fontSize: 7, color: TA.secondary, lineHeight: 1.35 }}>{service.detail}</div>}
        <ServiceDescription service={service} color={TA.secondary} fontSize={7} showPrice={showPrice} />
      </div>
      {showPrice && sell > 0 && (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 6, color: TA.secondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</div>
          <div style={{ fontSize: 9, fontWeight: 800, color: TA.navy }}>฿{sell.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}

function TADayCard({ day, isLast, showPrice = true }) {
  const img = day.image || day.services?.find((service) => service.image)?.image || null;

  const isOpen = !day.services || day.services.length === 0;
  const isTravel = day.services && day.services.length === 1 && day.services[0]?.type === 'Transfer' && (day.title || '').includes('→');

  return (
    <div style={{
      display: 'flex',
      borderRadius: 12,
      border: `1px solid ${TA.border}`,
      overflow: 'hidden',
      marginBottom: 8,
      boxShadow: '0 1px 6px rgba(16,42,67,0.06)',
      background: 'white',
    }}>
      {/* Left: Day block */}
      <div style={{
        width: 52, flexShrink: 0,
        background: TA.navy,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '8px 4px',
        gap: 2,
      }}>
        <div style={{ fontSize: 6, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>DAY</div>
        <div style={{ fontSize: 16, fontWeight: 900, color: 'white', lineHeight: 1 }}>
          {String(day.day || '01').padStart(2, '0')}
        </div>
        <div style={{ width: 20, height: 1.5, background: TA.gold, borderRadius: 1, margin: '2px 0' }} />
        <div style={{ fontSize: 7, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{formatDate(day.date, '')}</div>
      </div>

      {/* Center: Content */}
      <div style={{ flex: 1, padding: '10px 10px', minWidth: 0 }}>
        <div style={{ fontSize: 7, fontWeight: 700, color: TA.teal, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
          {day.destination || ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: TA.navy, lineHeight: 1.2 }}>{day.title || `Day ${day.day}`}</div>
          {isOpen && (
            <span style={{ fontSize: 6, fontWeight: 700, color: TA.gold, border: `1px solid ${TA.gold}`, borderRadius: 8, padding: '1px 6px', flexShrink: 0 }}>OPEN DAY</span>
          )}
        </div>
        {day.description && (
          <div style={{ fontSize: 7.5, color: TA.secondary, marginBottom: 6, lineHeight: 1.5 }}>{day.description}</div>
        )}
        {(day.services || []).map((svc, si) => (
          <TAServiceRow key={si} service={svc} showPrice={showPrice} />
        ))}
      </div>

      {/* Right: Image */}
      {img && <div style={{ width: 90, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        <img
          src={img}
          alt={day.destination || ''}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      </div>}
    </div>
  );
}

function TATravelDayBanner({ from, to, date }) {
  return (
    <div style={{
      borderRadius: 12, overflow: 'hidden',
      background: `linear-gradient(135deg, ${TA.darkNavy} 0%, #1a3a5c 100%)`,
      padding: '14px 20px',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
      gap: 16,
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1598935888338-f90d8bacd9c5?w=400&q=40)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15 }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ fontSize: 6, fontWeight: 700, color: TA.gold, textTransform: 'uppercase', letterSpacing: '0.15em' }}>TRAVEL DAY</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'white' }}>{from}</div>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: TA.teal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: 12 }}>→</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'white' }}>{to}</div>
        </div>
        {date && (
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.3)', padding: '2px 10px', borderRadius: 20 }}>
            {formatDate(date)} | {from} → {to}
          </div>
        )}
      </div>
    </div>
  );
}

export function TripNestPremiumTemplate({ quotation, config }) {
  const { totalSelling: totalSell } = quotationTotals(quotation);
  const perPerson = quotationPricePerPerson(quotation);
  const passengerPrices = quotationPassengerPrices(quotation);
  const currency = quotation.currency || 'THB';
  const sym = currency === 'THB' ? '฿' : currency;
  const perPersonLabel = passengerPrices.hasDifferentChildPrice
    ? `${sym}${passengerPrices.adult.toLocaleString()} per adult · ${sym}${passengerPrices.child.toLocaleString()} per child`
    : `${sym}${perPerson.toLocaleString()} per person`;
  const showClientPrice = !config?.clientPreview || config?.showClientPrice !== false;
  // Client PDFs show only the total package amount; service rates are internal.
  const showServicePrices = !config?.clientPreview;
  const showItinerary = config?.showClientItinerary !== false;

  // ── Dynamic palette from config ──────────────────────────────────────────
  const theme = getTheme(config);
  // Override TA palette with config-driven colors so every setting is live
  const dynNavy  = config?.accentColor && config.accentColor !== theme.accent ? TA.navy  : (theme.secondary || TA.navy);
  const dynTeal  = config?.accentColor || TA.teal;
  const dynGold  = theme.priceColor || TA.gold;
  const C = {
    navy:    theme.secondary || TA.navy,
    teal:    config.accentColor || TA.teal,
    gold:    theme.priceColor || TA.gold,
    text:    TA.darkText,
    muted:   TA.secondary,
    border:  TA.border,
    softBg:  TA.mutedBg,
    lightTeal: TA.lightTeal,
  };

  // ── Font ─────────────────────────────────────────────────────────────────
  const FONT_MAP = { inter: 'Inter,system-ui,sans-serif', georgia: 'Georgia,serif', roboto: 'Roboto,sans-serif', manrope: 'Manrope,Inter,system-ui,sans-serif', poppins: 'Poppins,sans-serif' };
  const fontStyle = FONT_MAP[config?.fontStyle] || 'Manrope,Inter,system-ui,sans-serif';

  // ── Cover ────────────────────────────────────────────────────────────────
  const coverImg = resolveCoverImage(config) || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=70';
  const coverBg  = config?.coverBackground || 'destination-image';
  const heroHeight = pdfCoverImageHeight(config, 200, { min: 150, max: 360 });
  const heroInlineStyle = coverBg === 'gradient'
    ? { background: `linear-gradient(135deg, ${C.navy} 0%, ${C.teal} 100%)` }
    : coverBg === 'solid'
      ? { background: C.teal }
      : null;

  // ── Page background ────────────────────────────────────────────────────
  const pageBgStyle = config?.pageBackground === 'light-pattern'
    ? { background: 'repeating-linear-gradient(45deg,#F8FAFC,#F8FAFC 10px,#FFFFFF 10px,#FFFFFF 20px)' }
    : config?.pageBackground === 'custom'
      ? { background: config?.customPageBackground || '#FFFFFF' }
      : { background: '#FFFFFF' };

  // ── Logo positioning ────────────────────────────────────────────────────
  const logoPos = config?.logoPosition || 'left';

  // ── Image layout cols ────────────────────────────────────────────────────
  const imgCols = config?.imageLayout === 'two-column' ? 2 : config?.imageLayout === 'full-width' ? 1 : config?.imageLayout === 'grid' ? 4 : 3;

  // ── Section style ────────────────────────────────────────────────────────
  const sStyle = config?.sectionStyle || 'standard';
  const getSectionBg = () => {
    if (sStyle === 'cards')   return { background: 'white', border: `1px solid #e2e8f0`, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '8px 10px', marginBottom: 8 };
    if (sStyle === 'modern')  return { background: 'linear-gradient(135deg,#f0f7ff,#e8f4fd)', border: `1px solid ${C.teal}30`, borderRadius: 8, padding: '8px 10px', marginBottom: 8 };
    if (sStyle === 'luxury')  return { background: `linear-gradient(135deg,${C.navy}15,${C.gold}10)`, border: `1px solid ${C.gold}40`, borderRadius: 8, padding: '8px 10px', marginBottom: 8 };
    return {};
  };

  const highlights = quotation.highlights || [];

  const itinerary = quotation.itinerary || [];

  return (
    <div style={{ fontFamily: fontStyle }}>
      {/* ── PAGE 1: Cover + Summary ─────────────────────────────────── */}
      <div className="a4-page" style={{ width: 595, minHeight: 842, ...pageBgStyle, padding: '14px 16px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontSize: 9, color: C.text, borderBottom: '1px dashed #E2E8F0', marginBottom: 20, overflow: 'hidden', fontFamily: fontStyle }}>

        {/* Dynamic header — logo position */}
        <div style={{ display: 'flex', justifyContent: logoPos === 'center' ? 'center' : logoPos === 'right' ? 'flex-end' : 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: `1.5px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {config?.logo !== 'none' && <DocumentBrandMark quotation={quotation} size={28} radius="50%" />}
            <div>
              <div style={{ fontWeight: 900, fontSize: 11, color: C.navy }}>{documentBrandName(quotation)}</div>
              <div style={{ fontSize: 6, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Travel Quotation</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quotation</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.navy }}>{quotation.quotationNo || 'QT-2026-000'}</div>
            <div style={{ fontSize: 6, color: C.muted, marginTop: 2, textTransform: 'uppercase' }}>Valid Until</div>
            <div style={{ fontSize: 8, fontWeight: 700, color: C.text }}>{formatDate(quotation.validUntil || quotation.quotationDate, '–')}</div>
          </div>
        </div>

        {/* Hero */}
        <div style={{ borderRadius: 14, overflow: 'hidden', height: heroHeight, flex: `0 0 ${heroHeight}px`, position: 'relative', marginBottom: 12, ...(heroInlineStyle || {}) }}>
          {!heroInlineStyle && <img src={coverImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.background = C.navy; }} />}
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(10,22,40,0.2) 0%, rgba(10,22,40,0.75) 100%)` }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px' }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: C.gold, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
              YOUR {(quotation.destination || 'THAILAND').toUpperCase()} ESCAPE
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'white', letterSpacing: '-0.5px', textTransform: 'uppercase', lineHeight: 1.1 }}>
              {(quotation.destination || 'THAILAND').toUpperCase()}
            </div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
              {quotation.duration || '–'} | {formatDate(quotation.travelStartDate, '–')} – {formatDate(quotation.travelEndDate, '–')}
            </div>
          </div>
        </div>

        {/* Trip Info Cards */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <TAInfoCard icon="👤" label="Prepared For" value={quotation.guest?.name || 'Guest'} />
          <TAInfoCard icon="💼" label="Agent" value={quotation.agent?.name || 'Direct'} />
          <TAInfoCard icon="📍" label="Destination" value={quotation.destination || '–'} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <TAInfoCard icon="📅" label="Travel Dates" value={`${formatDate(quotation.travelStartDate, '–')} – ${formatDate(quotation.travelEndDate, '–')}`} />
          <TAInfoCard icon="👥" label="Pax & Rooms" value={`${quotation.adults || 0} Adults | ${quotation.children || 0} Children | ${quotation.rooms || 1} Room`} />
        </div>

        {/* Package Investment */}
        {showClientPrice && <div style={{ marginBottom: 12, ...getSectionBg() }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Package Investment</div>
            <div style={{ fontSize: 7, color: C.muted }}>Total package price for {quotation.adults || 0} adults</div>
          </div>
          <div style={{ display: 'flex' }}>
            <TAPriceCard label="Total Package Price" value={totalSell} bg={TA.navy} currency={sym} subLabel={perPersonLabel} />
          </div>
        </div>}

        {/* Travel Highlights */}
        {highlights.length > 0 && <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: TA.navy, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Travel Highlights</div>
          <ResponsiveCardRows
            items={highlights}
            maxColumns={4}
            config={config}
            renderCard={(h, i) => (
              <div key={i} style={{ border: `1px solid ${TA.border}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(16,42,67,0.06)' }}>
                {h.image && <img src={h.image} alt={h.title} style={{ width: '100%', height: pdfCardImageHeight(config, 75), objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />}
                <div style={{ padding: pdfCardContentPadding(config, 10), background: 'white' }}>
                  <div style={{ fontSize: 7, fontWeight: 800, color: TA.teal, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{h.category}</div>
                  <div style={{ fontSize: 9, fontWeight: 900, color: TA.navy }}>{h.title}</div>
                  {h.description && <div style={{ fontSize: 7.5, color: TA.secondary, lineHeight: 1.4, marginTop: 4 }}>{h.description}</div>}
                </div>
              </div>
            )}
          />
        </div>}

        <TAPDFFooter quotation={quotation} pageNum={1} totalPages={showItinerary ? 2 : 1} />
      </div>

      {/* ── ITINERARY SECTION ─────────────────────────────────────────── */}
      {showItinerary && <div className="a4-page" style={{ width: 595, minHeight: 842, background: 'white', padding: '14px 16px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontSize: 9, color: TA.darkText, marginBottom: 20 }}>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: TA.navy, letterSpacing: '-0.5px' }}>YOUR THAILAND JOURNEY</div>
          <div style={{ width: 40, height: 3, background: theme.accent !== TA.navy ? theme.accent : TA.gold, borderRadius: 2, margin: '5px 0' }} />
          <div style={{ fontSize: 9, color: TA.secondary }}>A day-by-day overview of your {quotation.destination || 'Thailand'} experience</div>
        </div>

          <div style={{ flex: 1 }}>
            {itinerary.map((day, di) => {
              const title = day.title || '';
              const isTravel = title.includes('→');
              if (isTravel) {
                const parts = title.split('→');
                return (
                  <div data-pdf-itinerary-day="true" data-pdf-keep-together="true" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }} key={di}>
                    <TATravelDayBanner
                      from={(parts[0] || '').trim()}
                      to={(parts[1] || '').trim()}
                      date={day.date}
                    />
                  </div>
                );
              }
              return (
                <div data-pdf-itinerary-day="true" data-pdf-keep-together="true" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }} key={di}>
                  <TADayCard day={day} isLast={di === itinerary.length - 1} showPrice={showServicePrices} />
                </div>
              );
            })}
          </div>

          {/* Final Banner */}
          <div style={{
            pageBreakInside: 'avoid',
            borderRadius: 12, overflow: 'hidden',
            background: `linear-gradient(135deg, ${TA.darkNavy} 0%, #1a3a5c 100%)`,
            padding: '14px 16px',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 8,
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1598935888338-f90d8bacd9c5?w=400&q=30)', backgroundSize: 'cover', opacity: 0.2 }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 7, color: theme.accent !== TA.navy ? theme.accent : TA.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Your Thailand Journey</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'white', letterSpacing: '-0.3px' }}>{quotation.destination || 'THAILAND'}</div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>{formatDate(quotation.travelStartDate, '')} – {formatDate(quotation.travelEndDate, '')}</div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 7, color: theme.accent !== TA.navy ? theme.accent : TA.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Contact</div>
                {quotation.companyDetails?.email && <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.8)' }}>✉ {quotation.companyDetails.email}</div>}
                {quotation.companyDetails?.phone && <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.8)' }}>📞 {quotation.companyDetails.phone}</div>}
                <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontStyle: 'italic' }}>Thank you for choosing {documentBrandName(quotation)}.</div>
              </div>
            </div>
            {showClientPrice && <div style={{ position: 'relative', zIndex: 1, background: 'white', borderRadius: 12, padding: '12px 16px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: TA.secondary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Selling</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: TA.navy, marginTop: 4 }}>{sym}{totalSell.toLocaleString()}</div>
              <div style={{ fontSize: 7, fontWeight: 700, color: TA.secondary, marginTop: 2 }}>{perPersonLabel}</div>
            </div>}
          </div>

          <TAPDFFooter quotation={quotation} pageNum={2} totalPages={2} />
        </div>
      }
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TEMPLATE 6: LUXURY BOUTIQUE TRAVEL
// Dark #1a1a2e · Gold #B8860B · Cream #FDF8EF
// ════════════════════════════════════════════════════════════════════
const LX = {
  dark: '#1a1a2e',
  midDark: '#16213e',
  gold: '#B8860B',
  lightGold: '#F5EBD0',
  cream: '#FDF8EF',
  text: '#2D2D2D',
  muted: '#6B6B6B',
  border: '#E8DEC8',
  accent: '#D4A017',
};

export function LuxuryBoutiqueTemplate({ quotation, config }) {
  const { totalSelling: totalSell } = quotationTotals(quotation);
  const perPerson = quotationPricePerPerson(quotation);
  const passengerPrices = quotationPassengerPrices(quotation);
  const sym = quotation.currency === 'THB' ? '฿' : (quotation.currency || '$');
  const perPersonLabel = passengerPrices.hasDifferentChildPrice
    ? `${sym}${passengerPrices.adult.toLocaleString()} per adult · ${sym}${passengerPrices.child.toLocaleString()} per child`
    : `${sym}${perPerson.toLocaleString()} per person`;
  const showClientPrice = !config?.clientPreview || config?.showClientPrice !== false;
  // Use configured cover image or fall back to default
  const coverImg = resolveCoverImage(config) || 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=70';
  // Dynamic font from config
  const FONT_MAP = { inter: 'Inter,system-ui,sans-serif', georgia: 'Georgia,serif', roboto: 'Roboto,sans-serif', manrope: 'Manrope,sans-serif', poppins: 'Poppins,sans-serif' };
  const boutiqueFontStyle = FONT_MAP[config?.fontStyle] || 'Inter,system-ui,sans-serif';
  // Dynamic accent from config — override LX.gold
  const boutiqueAccent = config?.accentColor || LX.accent;
  // Cover background
  const boutiqueCoverBg = config?.coverBackground === 'gradient'
    ? { background: `linear-gradient(135deg, ${LX.dark} 0%, ${boutiqueAccent} 100%)` }
    : config?.coverBackground === 'solid'
      ? { background: boutiqueAccent }
      : null;
  const heroHeight = pdfCoverImageHeight(config, 280, { min: 150, max: 420 });
  const itinerary = quotation.itinerary || [];
  const totalPages = Math.max(2, 1 + Math.ceil(itinerary.length / 3));

  return (
    <div style={{ fontFamily: 'Poppins, Manrope, sans-serif' }}>
      {/* Page 1 */}
      <div className="a4-page" style={{ width: 595, background: LX.cream, padding: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontSize: 9, color: LX.text, overflow: 'hidden', marginBottom: 20 }}>
        {/* Full-page cover */}
        <div style={{ position: 'relative', height: heroHeight, overflow: 'hidden', flexShrink: 0 }}>
          <img src={coverImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(26,26,46,0.4) 0%, rgba(26,26,46,0.85) 100%)' }} />
          {/* Header overlay */}
          <div style={{ position: 'absolute', top: 14, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DocumentBrandMark quotation={quotation} size={26} radius="50%" background="transparent" />
              <div>
                <div style={{ color: 'white', fontWeight: 800, fontSize: 9 }}>{documentBrandName(quotation)}</div>
                <div style={{ color: LX.gold, fontSize: 6, letterSpacing: '0.15em' }}>LUXURY TRAVEL</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Quotation</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'white' }}>{quotation.quotationNo || 'QT-2026-000'}</div>
            </div>
          </div>
          {/* Cover text */}
          <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 7, color: LX.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Private Collection</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.15 }}>
              {(quotation.destination || 'LUXURY THAILAND').toUpperCase()}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>
              {quotation.duration || '–'} · {formatDate(quotation.travelStartDate, '–')} – {formatDate(quotation.travelEndDate, '–')}
            </div>
          </div>
        </div>

        {/* Content section */}
        <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
          {/* Gold divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${LX.gold})` }} />
            <span style={{ fontSize: 8, color: LX.gold, fontWeight: 700, letterSpacing: '0.15em' }}>✦ GUEST DETAILS ✦</span>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${LX.gold})` }} />
          </div>

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Guest', value: quotation.guest?.name || '–' },
              { label: 'Travel Agent', value: quotation.agent?.name || 'Direct' },
              { label: 'Destination', value: quotation.destination || '–' },
              { label: 'Travel Dates', value: `${formatDate(quotation.travelStartDate, '–')} – ${formatDate(quotation.travelEndDate, '–')}` },
              { label: 'Pax', value: `${quotation.adults || 0} Adults, ${quotation.children || 0} Children` },
              { label: 'Package', value: quotation.packageType || 'Luxury Package' },
            ].map(item => (
              <div key={item.label} style={{ background: 'white', border: `1px solid ${LX.border}`, borderRadius: 8, padding: '8px 10px', boxShadow: '0 1px 4px rgba(26,26,46,0.06)' }}>
                <div style={{ fontSize: 6, fontWeight: 700, color: LX.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: LX.dark }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Investment */}
          {showClientPrice && <><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${LX.gold})` }} />
            <span style={{ fontSize: 8, color: LX.gold, fontWeight: 700, letterSpacing: '0.15em' }}>✦ INVESTMENT ✦</span>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${LX.gold})` }} />
          </div>

          <div style={{ background: LX.dark, borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 7, color: LX.gold, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Package Investment</div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Total for {quotation.adults || 0} Adults</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Total Selling</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'white' }}>{sym}{totalSell.toLocaleString()}</div>
              <div style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.72)', marginTop: 3 }}>{perPersonLabel}</div>
            </div>
          </div></>}

          {/* Inclusions preview */}
          {quotation.inclusions && quotation.inclusions.length > 0 && (
            <div>
              <div style={{ fontSize: 8, fontWeight: 800, color: LX.dark, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>What's Included</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {quotation.inclusions.slice(0, 8).map((inc, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'white', border: `1px solid ${LX.border}`, borderRadius: 6, padding: '3px 8px' }}>
                    <span style={{ color: LX.gold, fontSize: 8 }}>✓</span>
                    <span style={{ fontSize: 7, color: LX.text }}>{inc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Itinerary */}
          {itinerary.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: LX.dark, letterSpacing: '-0.3px', marginBottom: 4 }}>Your Curated Itinerary</div>
              <div style={{ width: 30, height: 2, background: LX.gold, borderRadius: 1, marginBottom: 10 }} />

              <div style={{ flex: 1 }}>
                {itinerary.map((day, i) => (
                  <div key={i} data-pdf-itinerary-day="true" data-pdf-keep-together="true" style={{ display: 'flex', gap: 10, marginBottom: 10, background: 'white', borderRadius: 10, border: `1px solid ${LX.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(26,26,46,0.06)', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <div style={{ width: 40, background: LX.dark, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 0', flexShrink: 0 }}>
                  <div style={{ fontSize: 5, color: LX.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>DAY</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: 'white' }}>{String(day.day || i + 1).padStart(2, '0')}</div>
                  <div style={{ width: 14, height: 1.5, background: LX.gold, margin: '2px 0' }} />
                  <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.6)' }}>{formatDate(day.date, '')}</div>
                </div>
                <div style={{ flex: 1, padding: '8px 10px' }}>
                  <div style={{ fontSize: 7, color: LX.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{day.destination || ''}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: LX.dark, marginBottom: 3 }}>{day.title || `Day ${i + 1}`}</div>
                  {day.description && <div style={{ fontSize: 7.5, color: LX.muted, lineHeight: 1.5, marginBottom: 5 }}>{day.description}</div>}
                  {(day.services || []).map((svc, si) => (
                    <div key={si} data-pdf-itinerary-service="true" style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '4px 6px', background: LX.cream, borderRadius: 6, marginBottom: 3, border: `1px solid ${LX.border}` }}>
                      <TAServiceBadge type={svc.type || 'Miscellaneous'} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 7.5, fontWeight: 600, color: LX.dark }}>{svc.label || svc.name || 'Service'}</div>
                        {svc.detail && <div style={{ fontSize: 6.5, color: LX.muted, lineHeight: 1.3, marginTop: 1 }}>{svc.detail}</div>}
                        <ServiceDescription service={svc} color={LX.muted} fontSize={6.5} marginTop={2} showPrice={!config?.clientPreview} />
                      </div>
                      {!config?.clientPreview && Number(svc.sellingPrice || svc.selling || svc.totalSellingPrice || 0) > 0 && (
                        <span style={{ fontSize: 8, fontWeight: 700, color: LX.dark }}>{sym}{Number(svc.sellingPrice || svc.selling || svc.totalSellingPrice || 0).toLocaleString()}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
            </div>
          )}

          <div style={{ borderTop: `1px solid ${LX.border}`, paddingTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
            <div style={{ fontSize: 6, color: LX.muted }}>{documentBrandName(quotation)} {quotation.companyDetails?.email ? `· ${quotation.companyDetails.email}` : ''}</div>
            <div style={{ fontSize: 7, fontWeight: 700, color: LX.gold }}>{quotation.quotationNo}</div>
            <div style={{ fontSize: 6, color: LX.muted }}>End of Proposal</div>
          </div>
        </div>
      </div>
    </div>
  );
}

