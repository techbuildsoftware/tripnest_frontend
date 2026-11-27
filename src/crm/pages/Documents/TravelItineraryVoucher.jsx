/**
 * Travel Itinerary Voucher — a data-driven editorial voucher inspired by the
 * supplied trip itinerary.  This renderer deliberately receives no fixture
 * data: the template editor supplies its own preview booking while live
 * vouchers receive the saved booking/voucher snapshot.
 */
import React from 'react';
import LogoImg from '../../assets/logo-white.png';
import { formatDate } from '../../lib/date';
import { hotelRoomAllocationText } from '../../lib/roomAllocation';
import { composeVoucherTermsHtml } from '../../lib/voucherTerms';
import { sortVoucherFlights, sortVoucherRows, voucherVehicleLabel } from '../../lib/voucherPresentation';

const iso = (value) => String(value || '').slice(0, 10);
const value = (item) => item || '—';
const date = (item) => formatDate(item);
const attachment = (item) => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (Array.isArray(item)) return item.map(attachment).find(Boolean) || '';
  return attachment(item.url || item.imageUrl || item.secureUrl || item.src || item.path);
};
const nights = (from, to) => {
  const start = new Date(`${iso(from)}T00:00:00Z`); const end = new Date(`${iso(to)}T00:00:00Z`);
  return Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end < start ? 0 : Math.round((end - start) / 86400000);
};
const serviceDate = (item) => iso(item.serviceDate || item.date || item.checkIn || item.checkInDate);
const route = (item) => [item.pickupFrom || item.pickupPoint || item.origin || item.fromSector, item.dropAt || item.dropPoint || item.dropOff || item.destination || item.toSector].filter(Boolean).join(' → ');
const serviceName = (item) => item.name || item.variantName || item.hotel || item.type || 'Service';

const DEFAULTS = {
  primaryColor: '#123B8A', secondaryColor: '#0B1E4A', accentColor: '#EF9B21', backgroundColor: '#F5F8FE',
  companyName: 'BUILDSOFTWARE', tagline: 'Your travel partner', welcomeTitle: 'Travel Itinerary', preparedForLabel: 'Prepared for',
  sections: { cover: true, flights: true, guestDetails: true, hotels: true, tours: true, transfers: true, importantNotes: true, itinerary: true },
};

const STYLE = `
  .tiv-root{font-family:Inter,Arial,sans-serif;color:#15223f;background:#eef3fb;width:210mm}.tiv-root *{box-sizing:border-box}.tiv-page{width:210mm;min-height:297mm;background:#fff;position:relative;display:flex;flex-direction:column;page-break-after:always;break-after:page}.tiv-head{padding:12px 16px;background:linear-gradient(120deg,var(--tiv-secondary),var(--tiv-primary));color:#fff;display:flex;justify-content:space-between;align-items:center}.tiv-body{padding:16px;background:var(--tiv-bg);flex:1}.tiv-kicker{color:var(--tiv-accent);font-size:9px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase}.tiv-title{font-size:29px;line-height:1.1;margin:7px 0;color:var(--tiv-primary)}.tiv-card{background:#fff;border:1px solid #dbe4f4;border-radius:12px;padding:12px}.tiv-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.tiv-metrics{display:grid;grid-template-columns:repeat(4,1fr);border-top:2px solid var(--tiv-accent);margin-top:14px}.tiv-metric{padding:10px;border-right:1px solid #dbe4f4;background:#fff}.tiv-label{font-size:8px;font-weight:800;letter-spacing:1px;color:#71809a;text-transform:uppercase}.tiv-value{font-size:12px;font-weight:800;margin-top:3px;color:#15223f}.tiv-section{font-size:18px;color:var(--tiv-primary);margin:0 0 12px}.tiv-pill{display:inline-block;background:#fff4df;color:#a55b00;border-radius:20px;padding:4px 10px;font-size:9px;font-weight:800}.tiv-row{display:grid;grid-template-columns:38px 1fr;gap:10px;padding:12px 0;border-bottom:1px solid #e5ebf5}.tiv-day{height:34px;width:34px;border-radius:50%;background:var(--tiv-primary);color:#fff;display:grid;place-items:center;font-size:10px;font-weight:900}.tiv-service{margin:7px 0 0;padding:8px 10px;border-radius:8px;background:#f5f8fe;border-left:3px solid var(--tiv-accent);font-size:10px}.tiv-table{width:100%;border-collapse:collapse;background:#fff;font-size:9px}.tiv-table th{background:#e9eef8;text-align:left;color:#41506c;padding:8px}.tiv-table td{padding:8px;border-top:1px solid #e5ebf5;vertical-align:top}.tiv-notes{font-size:10px;line-height:1.5}.tiv-notes ul,.tiv-notes ol{margin:6px 0 6px 18px}.tiv-foot{padding:8px 16px;background:var(--tiv-secondary);color:#dce6ff;font-size:8px;display:flex;justify-content:space-between}.tiv-photo{width:100%;height:120px;object-fit:cover;border-radius:9px}@media print{.tiv-root{width:210mm!important;background:#fff!important}.tiv-page{min-height:0!important;height:auto!important;page-break-after:auto!important;break-after:auto!important;overflow:visible!important}.tiv-no-break{page-break-inside:avoid!important;break-inside:avoid!important}}
`;

function Header({ cfg, booking, page, total }) {
  return <div className="tiv-head"><div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><img src={cfg.logo || LogoImg} alt="Logo" style={{ height: 34, width: 74, objectFit: 'contain', objectPosition: 'left', background: 'transparent' }} /><div><div style={{ fontWeight: 900, fontSize: 12 }}>{cfg.companyName}</div><div style={{ fontSize: 8, opacity: .75 }}>{cfg.tagline}</div></div></div><div style={{ textAlign: 'right' }}><div className="tiv-kicker" style={{ color: cfg.accentColor }}>Confirmation voucher</div><div style={{ fontWeight: 800, fontSize: 11 }}>{booking.id || booking.bookingCode || '—'}</div><div style={{ fontSize: 8, opacity: .75 }}>Page {page} of {total}</div></div></div>;
}
function Footer({ cfg }) { return <div className="tiv-foot"><span>{cfg.companyName}</span><span>{cfg.tagline}</span></div>; }
const nodeText = (node) => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!React.isValidElement(node)) return '';
  return React.Children.toArray(node.props.children).map(nodeText).join(' ');
};
const omitEmptyTravelBlocks = (node) => {
  if (!React.isValidElement(node)) return node;
  const children = React.Children.map(node.props.children, omitEmptyTravelBlocks);
  const copy = React.cloneElement(node, undefined, children);
  const text = nodeText(copy);
  const isEmptyDataCard = String(copy.props.className || '').split(' ').includes('tiv-card')
    && /No dated itinerary items have been saved|No hotel stay saved|No flight or transfer saved/.test(text);
  return isEmptyDataCard ? null : copy;
};
function Page({ cfg, booking, page, total, children }) {
  const content = React.Children.map(children, omitEmptyTravelBlocks);
  const hasContent = React.Children.toArray(content).some((child) => React.isValidElement(child) && child.type !== 'h2');
  if (!hasContent) return null;
  return <section className="tiv-page"><Header cfg={cfg} booking={booking} page={Math.min(page, total)} total={total} /><main className="tiv-body">{content}</main><Footer cfg={cfg} /></section>;
}

export default function TravelItineraryVoucher({ settings, booking: rawBooking, voucher: voucherOverride, brand }) {
  const cfg = { ...DEFAULTS, ...(settings || {}), logo: brand?.logo || settings?.logo, companyName: brand?.name || settings?.companyName || DEFAULTS.companyName };
  const booking = rawBooking || {};
  const voucher = voucherOverride || booking.voucher || {};
  const services = sortVoucherRows(Array.isArray(voucher.services) && voucher.services.length ? voucher.services : (booking.services || []));
  const hotels = sortVoucherRows(Array.isArray(voucher.hotels) && voucher.hotels.length ? voucher.hotels : (booking.hotels || services.filter((item) => item.type === 'Hotel')));
  const flights = sortVoucherFlights(Array.isArray(voucher.flights) && voucher.flights.length ? voucher.flights : (booking.flights || []));
  const guests = Array.isArray(voucher.guests) && voucher.guests.length ? voucher.guests : (booking.guests || []);
  const travelDays = sortVoucherRows(Array.isArray(voucher.itinerary) && voucher.itinerary.length ? voucher.itinerary : (booking.itinerary || []));
  const voucherTermsHtml = composeVoucherTermsHtml(voucher);
  const grouped = travelDays.length ? travelDays.map((item, index) => ({ ...item, day: item.day || index + 1, services: item.services || services.filter((entry) => serviceDate(entry) === iso(item.date)) })) : [...new Set([...services, ...hotels].map(serviceDate).filter(Boolean))].sort().map((day, index) => ({ day: index + 1, date: day, title: '', services: [...services, ...hotels].filter((item) => serviceDate(item) === day) }));
  const destination = booking.destination || (booking.destinations || []).join(' • ') || hotels[0]?.city || 'Your destination';
  const guestName = guests.find((item) => item.isLeader)?.name || guests[0]?.name || booking.guestName || 'Guest';
  const totalDays = nights(booking.arrivalDate, booking.departureDate) + 1;
  const travelTransfers = services.filter((item) => item.type === 'Transfer');
  const hasTravelDetails = hotels.length > 0 || flights.length > 0 || travelTransfers.length > 0 || Boolean(voucherTermsHtml);
  const total = 1 + (grouped.length > 0 ? 1 : 0) + (hasTravelDetails ? 1 : 0);
  return <div className="tiv-root" style={{ '--tiv-primary': cfg.primaryColor, '--tiv-secondary': cfg.secondaryColor, '--tiv-accent': cfg.accentColor, '--tiv-bg': cfg.backgroundColor }}><style>{STYLE}</style>
    <Page cfg={cfg} booking={booking} page={1} total={total}><div className="tiv-card tiv-no-break" style={{ background: `linear-gradient(135deg, ${cfg.primaryColor}12, #fff)` }}><div className="tiv-kicker">{cfg.welcomeTitle}</div><h1 className="tiv-title">{destination}</h1><div style={{ fontSize: 14, fontWeight: 800 }}>{booking.packageName || booking.name || 'Your carefully planned journey'}</div><p style={{ fontSize: 10, color: '#62708b', lineHeight: 1.5, margin: '8px 0' }}>{booking.description || booking.notes || 'Travel details, stays and experiences selected for this booking.'}</p><span className="tiv-pill">{totalDays > 0 ? `${totalDays} Days · ${Math.max(0, totalDays - 1)} Nights` : 'Travel itinerary'}</span><div style={{ marginTop: 14, fontSize: 11 }}>{cfg.preparedForLabel}: <b>{guestName}</b></div></div><div className="tiv-metrics tiv-no-break"><Metric label="Travel dates" value={booking.arrivalDate ? `${date(booking.arrivalDate)} – ${date(booking.departureDate)}` : '—'} /><Metric label="Travellers" value={`${guests.length || (booking.adults || 0) + (booking.children || 0)} Guests`} /><Metric label="Stays" value={`${hotels.length} Hotel${hotels.length === 1 ? '' : 's'}`} /><Metric label="Experiences" value={`${services.filter((item) => item.type !== 'Transfer' && item.type !== 'Hotel').length} Included`} /></div><div className="tiv-grid" style={{ marginTop: 16 }}><div className="tiv-card"><div className="tiv-label">Trip contents</div><div style={{ marginTop: 9, fontSize: 10, lineHeight: 2 }}>✦ Flights & transfers<br />✦ Hotel stays<br />✦ Sightseeing & experiences<br />✦ Day-wise itinerary</div></div><div className="tiv-card"><div className="tiv-label">Booking contact</div><div style={{ marginTop: 9, fontSize: 11, fontWeight: 800 }}>{brand?.name || booking.agentName || cfg.companyName}</div><div style={{ marginTop: 5, fontSize: 10, color: '#62708b' }}>{booking.guestPhone || guests[0]?.phone || '—'}<br />{booking.guestEmail || guests[0]?.email || '—'}</div></div></div></Page>
    <Page cfg={cfg} booking={booking} page={2} total={total}><h2 className="tiv-section">Your itinerary</h2>{grouped.length ? grouped.map((day, index) => <div className="tiv-row tiv-no-break" key={day.id || day.date || index}><div className="tiv-day">D{day.day || index + 1}</div><div><div className="tiv-kicker">{date(day.date)} {day.destination ? `· ${day.destination}` : ''}</div><div style={{ fontSize: 14, fontWeight: 900, marginTop: 2 }}>{day.title || (index === 0 ? `${destination} arrival` : `${destination} · Day ${index + 1}`)}</div>{day.description && <div style={{ marginTop: 4, fontSize: 10, color: '#62708b' }}>{day.description}</div>}{(day.services || []).map((item, serviceIndex) => <div className="tiv-service" key={item.id || serviceIndex} style={{ display: 'flex', gap: 8 }}><>{attachment([item.image, item.imageUrl, item.images]) && <img src={attachment([item.image, item.imageUrl, item.images])} alt="" style={{ width: 48, height: 36, borderRadius: 5, objectFit: 'cover' }} />}</><div><b>{serviceName(item)}</b><span style={{ color: '#62708b' }}> · {value(item.type || (item.checkIn ? 'Hotel' : 'Service'))}</span><div style={{ marginTop: 3, color: '#62708b' }}>{route(item) || (item.checkIn ? `${date(item.checkIn)} – ${date(item.checkOut)}` : '')}</div>{item.type === 'Sightseeing' && (item.masterDescription || item.description || item.details) && <div style={{ marginTop: 4, color: '#62708b', lineHeight: 1.45 }} dangerouslySetInnerHTML={{ __html: item.masterDescription || item.description || item.details }} />}</div></div>)}</div></div>) : <div className="tiv-card" style={{ fontSize: 11, color: '#62708b' }}>No dated itinerary items have been saved for this booking.</div>}</Page>
    <Page cfg={cfg} booking={booking} page={3} total={total}><h2 className="tiv-section">Travel details</h2><div className="tiv-card tiv-no-break"><div className="tiv-label" style={{ marginBottom: 8 }}>Hotel stays</div><table className="tiv-table"><thead><tr><th>Hotel</th><th>City</th><th>Check in</th><th>Check out</th><th>Room</th><th>Room allocation</th></tr></thead><tbody>{hotels.length ? hotels.map((item, index) => <tr key={item.id || index}><td><b>{serviceName(item)}</b></td><td>{value(item.city || item.itineraryDestination)}</td><td>{date(item.checkIn)}</td><td>{date(item.checkOut)}</td><td>{value(item.roomType)}</td><td>{hotelRoomAllocationText(item, booking)}</td></tr>) : <tr><td colSpan="6">No hotel stay saved.</td></tr>}</tbody></table></div><div className="tiv-card tiv-no-break" style={{ marginTop: 12 }}><div className="tiv-label" style={{ marginBottom: 8 }}>Flights & transfers</div><table className="tiv-table"><thead><tr><th>Date</th><th>Service</th><th>Route</th><th>Time</th><th>Vehicle</th></tr></thead><tbody>{[...flights, ...services.filter((item) => item.type === 'Transfer')].length ? [...flights, ...services.filter((item) => item.type === 'Transfer')].map((item, index) => <tr key={item.id || index}><td>{date(item.date || item.serviceDate)}</td><td><b>{serviceName(item)}</b></td><td>{route(item)}</td><td>{value(item.departure || item.fromTime || item.pickupTime)}</td><td>{value(voucherVehicleLabel(item))}</td></tr>) : <tr><td colSpan="5">No flight or transfer saved.</td></tr>}</tbody></table></div>{voucherTermsHtml && <div className="tiv-card tiv-no-break" style={{ marginTop: 12 }}><div className="tiv-label">Terms &amp; conditions</div><div className="rich-text-content tiv-notes" dangerouslySetInnerHTML={{ __html: voucherTermsHtml }} /></div>}</Page>
  </div>;
}
