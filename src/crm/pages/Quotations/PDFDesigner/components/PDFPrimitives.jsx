import React from 'react';
import { formatDate } from '../../../../lib/date';
import { quotationPassengerPrices, quotationPricePerPerson } from '../data/quotationPdf';

// A print popup is an about:blank document, so Vite's relative asset URL must
// be made absolute for the same BuildSoftware logo to load there as well.
const printableAssetUrl = (source) => typeof window === 'undefined' || /^https?:/i.test(source)
  ? source
  : new URL(source, window.location.origin).href;

// ─── Shared PDF primitives ────────────────────────────────────────────────────
// All components accept `theme` (from THEMES map) and `config` (pdfDesignConfig).

const fmt = (n, currency = 'INR') =>
  `${currency === 'INR' ? '₹' : 'THB'} ${Number(n || 0).toLocaleString()}`;

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');
const richHtml = (value) => {
  const source = String(value || '').trim();
  if (!source) return '';
  return /<\/?[a-z][^>]*>/i.test(source) ? source : escapeHtml(source).replace(/\r?\n/g, '<br />');
};
const richTextStyle = `.pdf-rich-text p{margin:0 0 3px}.pdf-rich-text ul,.pdf-rich-text ol{display:block;margin:3px 0 3px 16px;padding:0}.pdf-rich-text ul{list-style:disc outside}.pdf-rich-text ol{list-style:decimal outside}.pdf-rich-text li{display:list-item;margin:1px 0}.pdf-rich-text strong,.pdf-rich-text b{font-weight:700}.pdf-rich-text h1,.pdf-rich-text h2,.pdf-rich-text h3{font-size:inherit;line-height:inherit;margin:4px 0 2px;font-weight:700}`;
const RichText = ({ html, style }) => {
  const markup = richHtml(html);
  if (!markup) return null;
  return <><style>{richTextStyle}</style><div className="pdf-rich-text" style={style} dangerouslySetInnerHTML={{ __html: markup }} /></>;
};

// Master descriptions are authored in rich text. Preserve the stored HTML in
// the print document and provide the required list/paragraph CSS locally,
// because the print popup does not inherit the editor stylesheet.
export function ServiceDescription({ service, color = '#64748B', fontSize = 6.8, marginTop = 3, showPrice = false }) {
  const inclusions = Array.isArray(service?.inclusions) ? service.inclusions.filter(Boolean) : [];
  const masterDescription = service?.hideMasterDescription ? '' : service?.masterDescription || service?.description || service?.details;
  if (!inclusions.length && !(showPrice && service?.clientRateSummary) && !masterDescription) return null;
  return <>
    {inclusions.length > 0 && (
      <div style={{ marginTop, color, fontSize, lineHeight: 1.35, fontWeight: 600 }}>
        Includes: {inclusions.join(', ')}
      </div>
    )}
    {showPrice && service?.clientRateSummary && (
      <div style={{ marginTop: inclusions.length ? 1 : marginTop, color, fontSize, lineHeight: 1.35, fontWeight: 600 }}>
        {service.clientRateSummary}
      </div>
    )}
    <RichText html={masterDescription} style={{ marginTop: (inclusions.length || (showPrice && service?.clientRateSummary)) ? 1 : marginTop, color, fontSize, lineHeight: 1.35 }} />
  </>;
}

export function imageGridLayout(imageLayout, itemCount, index) {
  // A lone image should never occupy one third/half of the page just because
  // the saved template normally uses multiple columns.
  const columns = itemCount <= 1 ? 1
    : imageLayout === 'full-width' ? 1
    : imageLayout === 'grid' ? 4
      // A three-card collection is more balanced as one complete row than
      // 2 + 1. Four and five cards retain the selected two-column layout.
      : imageLayout === 'two-column' && itemCount === 3 ? 3
        : imageLayout === 'two-column' ? 2
          : 3;
  const isFinalOddCard = columns === 2 && itemCount > 1 && itemCount % 2 === 1 && index === itemCount - 1;
  return {
    columns,
    itemStyle: isFinalOddCard
      ? { gridColumn: '1 / -1', width: 'calc(50% - 4px)', justifySelf: 'center' }
      : {},
  };
}

const clampNumber = (value, fallback, minimum, maximum) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
};

// Card controls are deliberately defined in this shared primitive instead of
// in a single template.  Any existing or future template that uses
// ResponsiveCardRows receives the same columns and spacing automatically.
export function pdfCardControls(config, defaults = {}) {
  const requestedImageHeight = Number(config?.highlightImageHeight);
  return {
    columns: clampNumber(config?.highlightCardsPerRow, defaults.columns ?? 3, 1, 4),
    gap: clampNumber(config?.highlightCardGap, defaults.gap ?? 8, 2, 16),
    padding: clampNumber(config?.highlightCardContentPadding, defaults.padding ?? 8, 4, 16),
    imageHeight: Number.isFinite(requestedImageHeight) && requestedImageHeight > 0
      ? clampNumber(requestedImageHeight, defaults.imageHeight ?? 80, 40, 240)
      : null,
    imageScale: clampNumber(config?.highlightCardImageScalePercent, 100, 70, 140) / 100,
  };
}

export function pdfCardImageHeight(config, fallback, bounds = {}) {
  const controls = pdfCardControls(config, { imageHeight: fallback });
  const baseHeight = controls.imageHeight ?? fallback;
  return clampNumber(
    baseHeight * controls.imageScale,
    fallback,
    bounds.min ?? 32,
    bounds.max ?? 300,
  );
}

export function pdfCardContentPadding(config, fallback = 8) {
  return pdfCardControls(config, { padding: fallback }).padding;
}

// The former "Luxury cover" setting is now a shared PDF cover setting.  A
// template can opt in by using this helper with its own native cover height.
export function pdfCoverImageHeight(config, fallback, bounds = {}) {
  return clampNumber(
    config?.luxuryHeroImageHeight,
    fallback,
    bounds.min ?? 130,
    bounds.max ?? 420,
  );
}

// Keep card collections balanced on printed A4 pages. A row is deliberately
// rendered as its own grid, so a final row with one, two, or three cards uses
// 100%, 50/50%, or 33/33/33% of the available page width instead of leaving a
// narrow card at the left. Every quotation template can share this primitive.
export function ResponsiveCardRows({ items = [], maxColumns = 3, gap = 8, style, config, renderCard }) {
  if (!items.length || typeof renderCard !== 'function') return null;

  const controls = pdfCardControls(config, { columns: maxColumns, gap });
  const columns = controls.columns;
  const cardGap = controls.gap;

  const rows = [];
  for (let start = 0; start < items.length; start += columns) {
    rows.push(items.slice(start, start + columns));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: cardGap, ...style }}>
      {rows.map((row, rowIndex) => (
        <div
          key={`card-row-${rowIndex}`}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`,
            gap: cardGap,
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
          }}
        >
          {row.map((item, index) => renderCard(item, rowIndex * columns + index, {
            rowLength: row.length,
            rowIndex,
            isFinalRow: rowIndex === rows.length - 1,
            cardControls: controls,
          }))}
        </div>
      ))}
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────
export function PDFHeader({ quotation, theme, config }) {
  const logoMode = config?.logo || 'buildsoftware';
  const pos = config?.logoPosition || 'left';

  return (
    <div style={{
      display: 'flex',
      flexDirection: pos === 'center' ? 'column' : pos === 'right' ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: pos === 'center' ? 'center' : 'flex-start',
      borderBottom: `2px solid ${theme.accent}`,
      paddingBottom: 8,
      marginBottom: 10,
      gap: 12,
    }}>
      {logoMode !== 'none' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: pos === 'center' ? 'center' : 'auto' }}>
          {quotation?.logo && <img src={printableAssetUrl(quotation.logo)} alt="Company logo" style={{ height: 36, maxWidth: 96, objectFit: 'contain' }} />}
          <div>
            <div style={{ fontWeight: 800, fontSize: 12, color: theme.accent }}>
              {quotation?.companyDetails?.name || quotation?.agent?.name || 'BuildSoftware'}
            </div>
            <div style={{ fontSize: 8, color: '#64748B' }}>
              {quotation?.companyDetails?.tagline || ''}
            </div>
          </div>
        </div>
      )}
      <div style={{ textAlign: pos === 'center' ? 'center' : pos === 'right' ? 'left' : 'right', fontSize: 8, color: '#64748B', lineHeight: 1.5 }}>
        <div>{quotation?.companyDetails?.address || ''}</div>
        <div>{quotation?.companyDetails?.phone || ''} · {quotation?.companyDetails?.email || ''}</div>
        <div style={{ color: theme.accent, fontWeight: 600 }}>{quotation?.companyDetails?.website || ''}</div>
      </div>
    </div>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
export function PDFFooter({ quotation, theme, pageNum, totalPages }) {
  // The PDF renderer repaginates long, authored preview sheets. Suppressing
  // the sheet-local footer prevents a page number from being carried into the
  // top of the following downloaded or printed page.
  return null;
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, theme, config, icon }) {
  const style = config?.sectionStyle || 'standard';
  return (
    <div data-pdf-section-heading="true" style={{
      background: style === 'luxury' ? `linear-gradient(90deg, ${theme.accent} 0%, ${theme.secondary} 100%)` : theme.sectionBg,
      color: theme.sectionText,
      padding: style === 'compact' ? '4px 10px' : '5px 10px',
      borderRadius: style === 'modern' ? 0 : 4,
      marginBottom: 8,
      marginTop: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      borderLeft: style === 'modern' ? `3px solid ${theme.accent}` : 'none',
    }}>
      {icon && <span style={{ fontSize: 10 }}>{icon}</span>}
      <span style={{ fontWeight: 700, fontSize: 9, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{title}</span>
    </div>
  );
}

// ─── Quotation Summary ────────────────────────────────────────────────────────
export function QuotationSummary({ quotation, theme, config }) {
  const rows = [
    ['Quotation No.', quotation.quotationNo, 'Date', formatDate(quotation.quotationDate, '')],
    ['Agent Name', quotation.agent.name, 'Guest Name', quotation.guest.name],
    ['Travel Date', `${formatDate(quotation.travelStartDate, '')} – ${formatDate(quotation.travelEndDate, '')}`, 'No. of Pax', quotation.totalPax],
    ['Destination', quotation.destination, 'Package Type', quotation.packageType],
    ['Duration', quotation.duration, '', ''],
  ];
  return (
    <div>
      <SectionHeader title="Quotation Summary" theme={theme} config={config} icon="📋" />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8.5 }}>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#F8FAFC' : '#FFFFFF' }}>
              {[0, 2].map(idx => (
                <React.Fragment key={idx}>
                  <td style={{ padding: '3px 8px', fontWeight: 700, color: '#374151', width: '18%', whiteSpace: 'nowrap', borderBottom: `1px solid ${theme.borderColor}` }}>{row[idx]}</td>
                  <td style={{ padding: '3px 8px', color: '#1E293B', width: '32%', borderBottom: `1px solid ${theme.borderColor}` }}>{row[idx + 1]}</td>
                </React.Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Hotel Table ──────────────────────────────────────────────────────────────
export function HotelTable({ hotels, theme, config }) {
  if (!hotels?.length) return null;
  return (
    <div>
      <SectionHeader title="Hotel Details" theme={theme} config={config} icon="🏨" />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8.5 }}>
        <thead>
          <tr style={{ background: '#F1F5F9' }}>
            {['City', 'Hotel Name', 'Room Category', 'Room Allocation', 'Nights', 'Meal Plan'].map(h => (
              <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `2px solid ${theme.accent}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hotels.map((hotel, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
              <td style={{ padding: '4px 8px', fontWeight: 600, color: theme.accent, borderBottom: `1px solid ${theme.borderColor}` }}>{hotel.city}</td>
              <td style={{ padding: '4px 8px', fontWeight: 700, color: '#1E293B', borderBottom: `1px solid ${theme.borderColor}` }}>{hotel.name}</td>
              <td style={{ padding: '4px 8px', color: '#374151', borderBottom: `1px solid ${theme.borderColor}` }}>{hotel.roomType}</td>
              <td style={{ padding: '4px 8px', color: '#374151', borderBottom: `1px solid ${theme.borderColor}` }}>{hotel.roomAllocation || '—'}</td>
              <td style={{ padding: '4px 8px', color: '#374151', borderBottom: `1px solid ${theme.borderColor}` }}>{hotel.nights} Nights</td>
              <td style={{ padding: '4px 8px', color: '#374151', borderBottom: `1px solid ${theme.borderColor}` }}>{hotel.mealPlan}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Hotel Cards ─────────────────────────────────────────────────────────────
export function HotelCards({ hotels, theme, config }) {
  if (!hotels?.length) return null;
  return (
    <div>
      <SectionHeader title="Hotel Details" theme={theme} config={config} icon="🏨" />
      <ResponsiveCardRows
        items={hotels}
        maxColumns={3}
        config={config}
        renderCard={(hotel, i) => (
          <div key={i} style={{ border: `1px solid ${theme.borderColor}`, borderRadius: 6, overflow: 'hidden' }}>
            {config?.showHotelImages && hotel.image && (
              <img src={hotel.image} alt={hotel.name} style={{ width: '100%', height: pdfCardImageHeight(config, 70), objectFit: 'cover', display: 'block' }} />
            )}
            <div style={{ padding: pdfCardContentPadding(config, 7), background: '#FAFAFA' }}>
              <div style={{ fontWeight: 800, fontSize: 8, color: theme.accent, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{hotel.city} · {hotel.nights} Nights</div>
              <div style={{ fontWeight: 700, fontSize: 9, color: '#1E293B', marginTop: 2 }}>{hotel.name}</div>
              <div style={{ fontSize: 8, color: '#64748B', marginTop: 1 }}>{hotel.roomType} · {hotel.mealPlan}</div>
              <div style={{ fontSize: 7.5, color: '#475569', marginTop: 2 }}>Rooms: {hotel.roomAllocation || '—'}</div>
            </div>
          </div>
        )}
      />
    </div>
  );
}

export function ItineraryDay({ day, theme, config, showImages }) {
  const showPrice = !config?.clientPreview;
  return (
    <div data-pdf-itinerary-day="true" data-pdf-keep-together="true" style={{ display: 'flex', gap: 10, marginBottom: 10, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <div style={{
        minWidth: 42, textAlign: 'center',
        background: theme.accent, color: '#fff',
        borderRadius: 6, padding: '6px 4px', alignSelf: 'flex-start',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', opacity: 0.9 }}>Day</div>
        <div style={{ fontSize: 14, fontWeight: 900, lineHeight: 1, margin: '2px 0' }}>{String(day.day).padStart(2, '0')}</div>
        <div style={{ fontSize: 6.5, opacity: 0.9 }}>{formatDate(day.date, '')}</div>
      </div>
      <div style={{ flex: 1, border: `1px solid ${theme.borderColor}`, borderRadius: 6, overflow: 'hidden', background: '#fff' }}>
        {showImages && day.image && (
          <div style={{ position: 'relative', width: '100%', height: 110 }}>
            <img src={day.image} alt={day.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(to top, rgba(15,23,42,0.8) 0%, rgba(15,23,42,0) 100%)',
              padding: '24px 10px 8px 10px',
            }}>
              <div style={{ fontWeight: 800, fontSize: 11, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{day.title}</div>
            </div>
          </div>
        )}
        <div style={{ padding: '8px 10px' }}>
          {!(showImages && day.image) && (
            <div style={{ fontWeight: 800, fontSize: 9, color: theme.accent, marginBottom: 3 }}>{day.title}</div>
          )}
          {day.description && <div style={{ fontSize: 8, color: '#374151', lineHeight: 1.5, marginBottom: 5 }}>{day.description}</div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {day.hotel && <span style={{ fontSize: 7.5, color: '#64748B' }}>🏨 {day.hotel}</span>}
            {day.meal && <span style={{ fontSize: 7.5, color: '#64748B' }}>🍽 {day.meal}</span>}
            {day.transport && <span style={{ fontSize: 7.5, color: '#64748B' }}>🚌 {day.transport}</span>}
            {day.tourType && (
              <span style={{ fontSize: 7, fontWeight: 700, background: theme.accent + '20', color: theme.accent, padding: '1px 5px', borderRadius: 10 }}>
                {day.tourType}
              </span>
            )}
          </div>
          {day.inclusions?.length > 0 && (
            <div style={{ marginTop: 4, fontSize: 7.5, color: '#059669' }}>
              ✓ {day.inclusions.join(' · ')}
            </div>
          )}
          {day.notes && (
            <div style={{ marginTop: 3, fontSize: 7.5, color: '#F59E0B', fontStyle: 'italic' }}>⚠ {day.notes}</div>
          )}
          {day.services?.length > 0 && (
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: showImages ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 6 }}>
              {day.services.map((service, index) => (
                <div key={`${service.type}-${service.label}-${index}`} data-pdf-itinerary-service="true" style={{ display: 'flex', gap: 6, padding: 5, borderRadius: 4, background: '#F8FAFC', border: `1px solid ${theme.borderColor}` }}>
                  {showImages && service.image && <img src={service.image} alt={service.label} style={{ width: 38, height: 32, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 7.5, fontWeight: 800, color: theme.accent }}>{service.type || 'Service'}</div>
                    <div style={{ fontSize: 7.5, fontWeight: 600, color: '#1E293B', lineHeight: 1.25 }}>{service.label}</div>
                    {service.detail && <div style={{ fontSize: 6.8, color: '#64748B', marginTop: 1, lineHeight: 1.2 }}>{service.detail}</div>}
                    <ServiceDescription service={service} showPrice={showPrice} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Itinerary Overview Table ─────────────────────────────────────────────────
export function ItineraryTable({ itinerary, theme, config, fullWidthDescriptions = false }) {
  if (!itinerary?.length) return null;
  const showPrice = !config?.clientPreview;
  const columns = fullWidthDescriptions
    ? ['Day', 'Date', 'Full itinerary']
    : ['Day', 'Date', 'Full itinerary', 'Hotel', 'Meal'];
  return (
    <div>
      <SectionHeader title="Itinerary Overview" theme={theme} config={config} icon="🗓" />
      <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 8 }}>
        <colgroup>
          <col style={{ width: '8%' }} />
          {/* DD-MM-YYYY needs a dedicated fixed slice; otherwise its last
              digits can run into the itinerary title in the full-width PDF. */}
          <col style={{ width: fullWidthDescriptions ? '16%' : '12%' }} />
          <col style={{ width: fullWidthDescriptions ? '76%' : '62%' }} />
          {!fullWidthDescriptions && <col style={{ width: '14%' }} />}
          {!fullWidthDescriptions && <col style={{ width: '4%' }} />}
        </colgroup>
        <thead>
          <tr style={{ background: '#F1F5F9' }}>
            {columns.map(h => (
              <th key={h} style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 8, textTransform: 'uppercase', borderBottom: `2px solid ${theme.accent}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {itinerary.map((day, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
              <td style={{ padding: '6px 6px', fontWeight: 700, color: theme.accent, borderBottom: `1px solid ${theme.borderColor}`, verticalAlign: 'top' }}>
                {String(day.day).padStart(2, '0')}
              </td>
              <td style={{ padding: '6px 6px', color: '#374151', borderBottom: `1px solid ${theme.borderColor}`, whiteSpace: 'nowrap', verticalAlign: 'top' }}>{formatDate(day.date, '')}</td>
              <td style={{ padding: '6px 6px', color: '#1E293B', fontWeight: 600, borderBottom: `1px solid ${theme.borderColor}`, verticalAlign: 'top' }}>
                <div>{day.title}</div>
                {day.description && <div style={{ marginTop: 1, fontSize: 7, fontWeight: 400, color: '#64748B', lineHeight: 1.25 }}>{day.description}</div>}
                {day.services?.length > 0 && (
                  <div style={{ marginTop: 5, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 5, paddingBottom: 2, width: '100%' }}>
                    {day.services.map((service, serviceIndex) => {
                      const isHotel = service.type.toLowerCase().includes('hotel');
                      const isTransfer = service.type.toLowerCase().includes('transfer');
                      const isActivity = !isHotel && !isTransfer;
                      const showImage = (isHotel && config?.showHotelImages) || 
                                        (isTransfer && config?.showTransferImages) || 
                                        (isActivity && config?.showActivityImages);
                      
                      return (
                        <div key={`${service.type}-${service.label}-${serviceIndex}`} style={{ 
                          display: 'flex', alignItems: 'flex-start', gap: 5, minWidth: 0, width: '100%', boxSizing: 'border-box',
                          padding: '3px 8px 3px 3px', 
                          borderRadius: 6, 
                          background: '#FFFFFF', 
                          border: `1.5px solid ${theme.borderColor}`, 
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}>
                          {showImage && service.image && (
                            <img src={service.image} alt="" style={{ width: 28, height: 22, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
                            <span style={{ fontSize: 5.5, color: theme.accent, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800, lineHeight: 1 }}>{service.type}</span>
                            <span style={{ color: '#0F172A', fontSize: 7.5, fontWeight: 700, lineHeight: 1.1 }}>{service.label}</span>
                            <ServiceDescription service={service} fontSize={6.5} marginTop={1} showPrice={showPrice} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </td>
              {!fullWidthDescriptions && <td style={{ padding: '6px 6px', color: '#374151', borderBottom: `1px solid ${theme.borderColor}`, verticalAlign: 'top' }}>{day.hotel || '—'}</td>}
              {!fullWidthDescriptions && <td style={{ padding: '6px 6px', color: '#374151', borderBottom: `1px solid ${theme.borderColor}`, verticalAlign: 'top' }}>{day.meal ? day.meal.charAt(0) : '—'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Inclusions / Exclusions ──────────────────────────────────────────────────
export function InclusionsExclusions({ inclusions, exclusions, theme, config }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
      <div>
        <SectionHeader title="Package Inclusions" theme={theme} config={config} icon="✅" />
        <ul style={{ margin: 0, paddingLeft: 12, fontSize: 8.5, color: '#1E293B', lineHeight: 1.6 }}>
          {inclusions.map((item, i) => (
            <li key={i} style={{ color: '#059669' }}>
              <span style={{ color: '#1E293B' }}>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <SectionHeader title="Package Exclusions" theme={theme} config={config} icon="❌" />
        <ul style={{ margin: 0, paddingLeft: 12, fontSize: 8.5, color: '#1E293B', lineHeight: 1.6 }}>
          {exclusions.map((item, i) => (
            <li key={i} style={{ color: '#EF4444' }}>
              <span style={{ color: '#1E293B' }}>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Pricing Table ────────────────────────────────────────────────────────────
export function PricingTable({ quotation, theme, config }) {
  const { pricing, totalPrice, currency } = quotation;
  if (!pricing?.length) return null;
  if (config?.clientPreview && config?.showClientPrice === false) return null;
  if (config?.clientPreview) {
    const quoteTotal = Number(quotation.totalSelling || totalPrice || pricing.reduce((sum, row) => sum + Number(row.total || 0), 0));
    const perPerson = quotationPricePerPerson({ ...quotation, totalSelling: quoteTotal });
    const passengerPrices = quotationPassengerPrices({ ...quotation, totalSelling: quoteTotal });
    const perPersonLabel = passengerPrices.hasDifferentChildPrice
      ? `${fmt(passengerPrices.adult, currency)} per adult · ${fmt(passengerPrices.child, currency)} per child`
      : `${fmt(perPerson, currency)} per person`;
    return (
      <div>
        <SectionHeader title="Quotation Total" theme={theme} config={config} icon="💰" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 10px', background: `${theme.accent}10`, border: `1px solid ${theme.accent}35`, borderRadius: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: theme.accent, textTransform: 'uppercase' }}>Total Quotation Amount</span>
          <div style={{ textAlign: 'right' }}>
            <strong style={{ display: 'block', fontSize: 13, color: theme.priceColor }}>{fmt(quoteTotal, currency)}</strong>
            <span style={{ display: 'block', marginTop: 2, fontSize: 7.5, fontWeight: 700, color: theme.textColor || '#64748B' }}>{perPersonLabel}</span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <SectionHeader title="Package Price" theme={theme} config={config} icon="💰" />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8.5 }}>
        <thead>
          <tr style={{ background: '#F1F5F9' }}>
            {['Pax Category', 'Package Price', 'Total'].map(h => (
              <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 8, textTransform: 'uppercase', borderBottom: `2px solid ${theme.accent}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pricing.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
              <td style={{ padding: '4px 8px', color: '#374151', borderBottom: `1px solid ${theme.borderColor}` }}>{row.category}</td>
              <td style={{ padding: '4px 8px', color: '#1E293B', fontWeight: 600, borderBottom: `1px solid ${theme.borderColor}` }}>{fmt(row.netRate, row.currency || currency)}</td>
              <td style={{ padding: '4px 8px', color: '#1E293B', fontWeight: 700, borderBottom: `1px solid ${theme.borderColor}` }}>{fmt(row.total, row.currency || currency)}</td>
            </tr>
          ))}
          <tr style={{ background: theme.accent + '10' }}>
            <td colSpan={2} style={{ padding: '5px 8px', fontWeight: 800, color: theme.accent, fontSize: 9.5 }}>Total Package Price</td>
            <td style={{ padding: '5px 8px', fontWeight: 900, color: theme.priceColor, fontSize: 11 }}>{fmt(totalPrice, currency)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Payment Terms + Cancellation Policy ─────────────────────────────────────
export function PaymentCancellation({ quotation, theme, config }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
      <div>
        <SectionHeader title="Payment Terms" theme={theme} config={config} icon="💳" />
        <ul style={{ margin: 0, paddingLeft: 12, fontSize: 8.5, lineHeight: 1.6, color: '#1E293B' }}>
          {quotation.paymentTerms.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </div>
      <div>
        <SectionHeader title="Cancellation Policy" theme={theme} config={config} icon="⚠️" />
        <ul style={{ margin: 0, paddingLeft: 12, fontSize: 8.5, lineHeight: 1.6, color: '#1E293B' }}>
          {quotation.cancellationPolicy.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </div>
    </div>
  );
}

// ─── Important Notes ──────────────────────────────────────────────────────────
export function ImportantNotes({ notes, html, theme, config }) {
  if (!html && !notes?.length) return null;
  return (
    <div>
      <SectionHeader title="Important Notes" theme={theme} config={config} icon="📌" />
      {html ? <RichText html={html} style={{ fontSize: 8.5, lineHeight: 1.6, color: '#374151' }} /> : (
        <ul style={{ margin: 0, paddingLeft: 12, fontSize: 8.5, lineHeight: 1.6, color: '#374151' }}>
          {notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}

// ─── Optional Add-ons ─────────────────────────────────────────────────────────
export function OptionalAddons({ addons, theme, config }) {
  if (!addons?.length) return null;
  return (
    <div>
      <SectionHeader title="Optional Add-ons (On Request)" theme={theme} config={config} icon="🌟" />
      <ResponsiveCardRows
        items={addons}
        maxColumns={3}
        config={config}
        renderCard={(addon, i) => (
          <div key={i} style={{ 
            border: `1px solid #1E293B`, 
            borderRadius: 6, 
            overflow: 'hidden',
            background: '#FFFFFF',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
          }}>
            {addon.image && <img src={addon.image} alt={addon.name} style={{ width: '100%', height: pdfCardImageHeight(config, 110), objectFit: 'cover', display: 'block' }} />}
            <div style={{ height: 3, background: '#111827' }} /> {/* Black divider */}
            <div style={{ padding: pdfCardContentPadding(config, 8) }}>
              <div style={{ fontWeight: 800, fontSize: 8.5, color: '#1E293B', marginBottom: 2 }}>{addon.name}</div>
              {!config?.clientPreview && <div style={{ fontWeight: 900, fontSize: 9.5, color: theme.priceColor }}>
                {fmt(addon.price, addon.currency)}
              </div>}
            </div>
          </div>
        )}
      />
    </div>
  );
}

export { fmt };
