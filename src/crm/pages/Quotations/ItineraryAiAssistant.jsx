import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Sparkles, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { formatDate } from '../../lib/date';
import { usesGitHotelRate } from '../../lib/hotelRateTier';
import { preferredHotelRateForDate } from '../../lib/hotelRateSelection';
import { selectedVehicleCombination } from '../../lib/vehicleCombination';

const normalize = (value) => String(value || '').trim().toLocaleLowerCase();
const same = (left, right) => normalize(left) === normalize(right);
const inRange = (rate, date, market = '') => {
  if (!rate || rate.status !== 'Active') return false;
  if (market && rate.market && !same(market, rate.market)) return false;
  if (Array.isArray(rate.validityPeriods)) return rate.validityPeriods.some((period) => period.fromDate <= date && period.toDate >= date && !(rate.soldOutDates || []).includes(date));
  return (!rate.fromDate || rate.fromDate <= date) && (!rate.toDate || rate.toDate >= date);
};
const serviceId = () => `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const variantImage = (variant = {}) => (variant.images || []).find((image) => image?.url) || variant.image || null;
const pax = (quotation, key) => Number(quotation?.[key] || 0);
// Use adults only for vehicle capacity. Children and infants remain included
// in their own ticket/SIC amounts, not in the fleet calculation.
const partySize = (quotation) => Math.max(1, pax(quotation, 'adults'));
const nextDate = (date) => {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + 1);
  return value.toISOString().slice(0, 10);
};
const weekday = (date) => new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
const datesBetween = (fromDate, toDate) => {
  if (!fromDate || !toDate || fromDate > toDate) return [];
  const dates = [];
  for (let date = fromDate; date <= toDate; date = nextDate(date)) dates.push(date);
  return dates;
};
const isoFromParts = (month, day, year) => {
  const now = new Date();
  const monthIndex = ({ january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11 })[String(month).toLowerCase().replace('.', '')];
  let resolvedYear = Number(year || now.getFullYear());
  if (monthIndex < 0) return '';
  let parsed = new Date(Date.UTC(resolvedYear, monthIndex, Number(day)));
  if (parsed.getUTCMonth() !== monthIndex || parsed.getUTCDate() !== Number(day)) return '';
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  if (!year && parsed.valueOf() < today) {
    resolvedYear += 1;
    parsed = new Date(Date.UTC(resolvedYear, monthIndex, Number(day)));
  }
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
};
const inferPromptDates = (value) => {
  const text = String(value || '');
  const isoDates = [...text.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)].map((match) => `${match[1]}-${match[2]}-${match[3]}`);
  if (isoDates.length >= 2) return { travelDate: isoDates[0], endDate: isoDates[1] };
  const monthName = 'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec';
  const namedRange = new RegExp(`\\b(${monthName})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|to|until)\\s*(?:(${monthName})\\.?\\s+)?(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(20\\d{2}))?`, 'i').exec(text);
  if (namedRange) {
    const travelDate = isoFromParts(namedRange[1], namedRange[2], namedRange[5]);
    const endDate = isoFromParts(namedRange[3] || namedRange[1], namedRange[4], namedRange[5]);
    if (travelDate && endDate) return { travelDate, endDate };
  }
  const reverseNamedRange = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|to|until)\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthName})\\.?(?:,?\\s*(20\\d{2}))?`, 'i').exec(text);
  if (reverseNamedRange) {
    const travelDate = isoFromParts(reverseNamedRange[3], reverseNamedRange[1], reverseNamedRange[4]);
    const endDate = isoFromParts(reverseNamedRange[3], reverseNamedRange[2], reverseNamedRange[4]);
    if (travelDate && endDate) return { travelDate, endDate };
  }
  const named = new RegExp(`\\b(${monthName})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(20\\d{2}))?`, 'gi');
  const values = [...text.matchAll(named)].map((match) => isoFromParts(match[1], match[2], match[3])).filter(Boolean);
  const numeric = [...text.matchAll(/\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/g)].map((match) => `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`);
  const dates = [...values, ...numeric];
  return { travelDate: dates[0] || '', endDate: dates[1] || '' };
};

// This component is intentionally self-contained. Removing this one import
// from QuotationBuilder removes the optional AI feature without touching the
// established manual quotation and query-to-quotation flow.
export default function ItineraryAiAssistant({ quotation, sourceQuery, onApplyPlan, onIssues, onUpdateQuotation }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [improving, setImproving] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);
  const [promptDates, setPromptDates] = useState({ travelDate: '', endDate: '' });
  const [plan, setPlan] = useState([]);
  const [masterSummary, setMasterSummary] = useState(null);
  const [catalog, setCatalog] = useState({ hotels: [], hotelRates: [], transfers: [], transferRates: [], sightseeing: [] });

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.get('/hotels'), apiClient.get('/hotel-rates'), apiClient.get('/operations-masters/transfers'), apiClient.get('/transfer-rates'), apiClient.get('/sightseeing-module'),
    ]).then(([hotels, hotelRates, transfers, transferRates, sightseeing]) => {
      if (!active) return;
      setCatalog({
        hotels: (hotels.data || []).filter((item) => item.status === 'Active'),
        hotelRates: (hotelRates.data || []).filter((item) => item.status === 'Active'),
        transfers: (transfers.data || []).filter((item) => item.status === 'Active'),
        transferRates: (transferRates.data || []).filter((item) => item.status === 'Active'),
        sightseeing: (sightseeing.data || []).filter((item) => item.status === 'Active'),
      });
    }).catch(() => {
      if (active) toast.error('Could not load the live masters for AI itinerary matching.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const bookingContext = (dates = promptDates) => ({
    arrivalDate: quotation?.travelDate || dates.travelDate, departureDate: quotation?.endDate || dates.endDate,
    destination: quotation?.destination || quotation?.travelSegments?.map((item) => item.arrivalDestination).filter(Boolean).join(', '),
    adults: quotation?.adults, children: quotation?.children, market: quotation?.market || '',
    requestContext: {
      query: sourceQuery ? {
        title: sourceQuery.queryTitle || '', notes: sourceQuery.notes || sourceQuery.otherInformation || '', hotelCategory: sourceQuery.hotelCategory || '', mealPlan: sourceQuery.mealPlan || '', budget: sourceQuery.budget || '',
        destinations: sourceQuery.travelSegments?.map((item) => item.arrivalDestination?.name || item.arrivalDestination).filter(Boolean) || [],
      } : null,
      quotation: {
        title: quotation?.title || '', destination: quotation?.destination || '',
        travelSegments: quotation?.travelSegments?.map((item) => ({ from: item.fromDate, to: item.toDate, destination: item.arrivalDestination?.name || item.arrivalDestination })) || [],
        existingDays: quotation?.days?.map((day) => ({ date: day.date, title: day.title, description: day.description, services: (day.services || []).map((service) => ({ type: service.type, name: service.name })) })) || [],
      },
    },
  });

  const generate = async () => {
    if (!prompt.trim()) return toast.error('Write what the guest wants before generating an itinerary.');
    const inferred = inferPromptDates(prompt);
    const dates = {
      travelDate: quotation?.travelDate || inferred.travelDate || promptDates.travelDate,
      endDate: quotation?.endDate || inferred.endDate || promptDates.endDate,
    };
    if (!dates.travelDate || !dates.endDate || dates.endDate < dates.travelDate) return toast.error('Add valid arrival and departure dates to the quotation or write both dates in the AI request.');
    if (!quotation?.travelDate || !quotation?.endDate) {
      setPromptDates(dates);
      const nights = Math.max(0, Math.round((new Date(`${dates.endDate}T00:00:00Z`) - new Date(`${dates.travelDate}T00:00:00Z`)) / 86400000));
      onUpdateQuotation?.({ travelDate: dates.travelDate, endDate: dates.endDate, duration: `${nights} ${nights === 1 ? 'Night' : 'Nights'} / ${nights + 1} ${nights + 1 === 1 ? 'Day' : 'Days'}` });
      toast.success(`Using dates from your request: ${formatDate(dates.travelDate)} to ${formatDate(dates.endDate)}.`);
    }
    setGenerating(true);
    try {
      const response = await apiClient.post('/ai/itinerary', {
        prompt,
        booking: bookingContext(dates),
      });
      const responseDays = response.data?.days || [];
      // For an existing quotation the current day/date structure is the
      // source of truth. AI can improve its content, never create an extra
      // day outside that confirmed structure.
      const currentDays = quotation?.days || [];
      const days = currentDays.length
        ? responseDays.slice(0, currentDays.length).map((entry, index) => ({ ...entry, date: currentDays.find((day) => day.date === entry.date)?.date || currentDays[index].date }))
        : responseDays.filter((entry) => datesBetween(dates.travelDate, dates.endDate).includes(entry.date));
      if (!days.length) return toast.error('The AI did not return a usable itinerary.');
      setPlan(days);
      toast.success('AI itinerary created. Review it, then apply it.');
    } catch (error) { toast.error(error.message || 'Could not generate the itinerary.'); }
    finally { setGenerating(false); }
  };

  const improvePrompt = async () => {
    if (!prompt.trim()) return toast.error('Write what the guest wants before improving the request.');
    const inferred = inferPromptDates(prompt);
    const dates = {
      travelDate: quotation?.travelDate || inferred.travelDate || promptDates.travelDate,
      endDate: quotation?.endDate || inferred.endDate || promptDates.endDate,
    };
    setImproving(true);
    try {
      const response = await apiClient.post('/ai/improve-itinerary-prompt', { prompt, booking: bookingContext(dates) });
      setPrompt(response.data?.prompt || prompt);
      setMasterSummary(response.data?.masterSummary || null);
      toast.success('Your request was improved using the matching live data. Click Generate when you are ready.');
    } catch (error) { toast.error(error.message || 'Could not improve the request.'); }
    finally { setImproving(false); }
  };

  const apply = () => {
    if (!plan.length) return;
    const manualContentExists = (quotation?.days || []).some((day) => (
      (day.services || []).some((service) => !service.sourceAiItinerary)
      || Boolean(day.title || day.description)
    ));
    if (manualContentExists) { setConfirmApply(true); return; }
    applyPlan();
  };

  const applyPlan = () => {
    const market = quotation?.market || '';
    const issues = {};
    const generatedByDate = {};
    plan.forEach((entry) => {
      const services = [];
      const entryIssues = [...new Set(entry.validationIssues || [])];
      const existingDay = (quotation?.days || []).find((day) => day.date === entry.date);
      // A manual service is authoritative. The AI only fills a missing
      // service type; it never adds a duplicate hotel/transfer/activity over
      // a consultant's existing selection.
      const hasManualService = (type) => (existingDay?.services || []).some((service) => service.type === type && !service.sourceAiItinerary);
      const hotel = catalog.hotels.find((item) => same(item.name, entry.hotel));
      if (entry.hotel && !hasManualService('Hotel')) {
        const rate = preferredHotelRateForDate(
          catalog.hotelRates.filter((item) => item.hotelId === hotel?.id && inRange(item, entry.date, market)),
          hotel,
          entry.date,
        );
        const roomRate = rate?.roomRates?.[0];
        if (!hotel || !rate || !roomRate) entryIssues.push('Hotel');
        else {
          const rooms = Number(quotation?.rooms || 1);
          const usesGitRate = usesGitHotelRate(rooms, hotel.groupRoomLimit);
          const perNight = pax(quotation, 'adults') <= rooms
            ? Number(usesGitRate ? roomRate.gitSingle : roomRate.fitSingle)
            : Number(usesGitRate ? roomRate.gitDouble : roomRate.fitDouble);
          services.push({ id: serviceId(), sourceAiItinerary: true, type: 'Hotel', hotelId: hotel.id, hotelGroupLimit: hotel.groupRoomLimit ?? '0', rateContractId: rate.id, name: hotel.name, destination: hotel.destination || '', itineraryDestination: hotel.destination || '', supplier: rate.supplier || '', roomType: roomRate.roomType, mealPlan: roomRate.mealPlan || '', rooms, adults: quotation?.adults || '', children: quotation?.children || '', checkIn: entry.date, checkOut: nextDate(entry.date), nights: 1, supplierCost: perNight, sellingPrice: perNight, totalSupplierCost: perNight * rooms, totalSellingPrice: perNight * rooms, markup: 0, currency: rate.currency || 'THB', serviceDate: entry.date });
        }
      }
      const transfer = catalog.transfers.find((item) => same(item.name, entry.transfer));
      if (entry.transfer && !hasManualService('Transfer')) {
        const rates = catalog.transferRates.filter((item) => item.transferId === transfer?.id && inRange(item, entry.date, market));
        const rate = rates.find((item) => item.serviceType === 'PVT') || rates[0];
        const combination = selectedVehicleCombination(rate?.vehicleCosts, partySize(quotation));
        if (!transfer || !rate || (rate.vehicleCosts?.length && !combination)) entryIssues.push('Transfer');
        else {
          const [origin = '', destination = transfer.destination || ''] = String(transfer.name || '').split(/\s+(?:to|→)\s+/i, 2);
          const passengerCost = rate.serviceType === 'SIC' ? Number(rate.adultCost || 0) * pax(quotation, 'adults') + Number(rate.childCost || 0) * pax(quotation, 'children') : 0;
          const cost = passengerCost + Number(combination?.totalCost || 0);
          services.push({ id: serviceId(), sourceAiItinerary: true, type: 'Transfer', masterId: transfer.id, rateContractId: rate.id, name: transfer.name, origin, destination, itineraryDestination: transfer.destination || '', supplier: rate.supplier || '', basis: rate.serviceType === 'SIC' ? 'Sic' : 'Private', serviceType: rate.serviceType, vehicle: combination?.key || '', vehicleId: combination?.key || '', vehicleName: combination?.label || '', vehicleSelectionKey: combination?.key || '', vehicleSelections: combination?.entries || [], vehicleTotalCapacity: combination?.totalCapacity || 0, vehicleAutoSelectedForPax: partySize(quotation), vehicleManualSelection: false, adults: quotation?.adults || '', children: quotation?.children || '', infants: quotation?.infants || '', quantity: 1, supplierCost: cost, sellingPrice: cost, totalSupplierCost: cost, totalSellingPrice: cost, adultTransferCost: Number(rate.adultCost || 0), childTransferCost: Number(rate.childCost || 0), markup: 0, currency: rate.currency || 'THB', serviceDate: entry.date });
        }
      }
      const sightseeing = catalog.sightseeing.find((item) => same(item.name, entry.sightseeing));
      if (entry.sightseeing && !hasManualService('Sightseeing')) {
        const timing = (sightseeing?.showTimings || []).find((item) => !item.days?.length || item.days.includes(weekday(entry.date)));
        const needsTiming = (sightseeing?.showTimings || []).some((item) => item.time || item.openingTime || item.closingTime || item.days?.length);
        const match = (sightseeing?.variants || []).filter((variant) => variant.status === 'Active').flatMap((variant) => (variant.rates || []).filter((rate) => inRange({ ...rate, status: rate.status || 'Active' }, entry.date, market)).map((rate, index) => ({ variant, rate, index })))[0];
        if (!sightseeing || !match || (needsTiming && !timing)) entryIssues.push('Sightseeing');
        else {
          const { variant, rate, index } = match;
          const supplierCost = Number(rate.adultCost || 0) * pax(quotation, 'adults') + Number(rate.childCost || 0) * pax(quotation, 'children');
          const selectedVariantImage = variantImage(variant);
          services.push({ id: serviceId(), sourceAiItinerary: true, type: 'Sightseeing', masterId: sightseeing.id, variantId: variant.id, variantRateKey: rate.id || `${rate.fromDate}-${rate.toDate}-${index}`, name: `${sightseeing.name} · ${variant.name}`, destination: sightseeing.destination || '', itineraryDestination: sightseeing.destination || '', supplier: sightseeing.suppliers?.[0]?.name || sightseeing.supplier?.name || '', basis: 'Private', inclusions: [], adults: quotation?.adults || '', children: quotation?.children || '', infants: quotation?.infants || '', adultSupplierRate: Number(rate.adultCost || 0), childSupplierRate: Number(rate.childCost || 0), adultSellingRate: Number(rate.adultCost || 0), childSellingRate: Number(rate.childCost || 0), totalSupplierCost: supplierCost, totalSellingPrice: supplierCost, markup: 0, currency: 'THB', time: timing?.time || '', fromTime: variant.defaultFromTime || '', toTime: variant.defaultToTime || '', dropUpTime: variant.defaultDropTime || '', image: selectedVariantImage, imageUrl: selectedVariantImage?.url || '', variantImage: selectedVariantImage, serviceDate: entry.date });
        }
      }
      generatedByDate[entry.date] = { entry, services };
      if (entryIssues.length) issues[entry.date] = [...new Set(entryIssues)];
    });
    onIssues(issues);
    onApplyPlan(generatedByDate);
    toast.success(Object.keys(issues).length ? 'AI plan applied. Red buttons need manual attention.' : 'AI plan and valid live prices applied.');
  };

  return (
    <aside className="w-[340px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-3">
      <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-blue-50 p-3 shadow-sm">
        <div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-600 text-white"><Sparkles className="h-4 w-4" /></span><div><h3 className="text-sm font-bold text-slate-900">AI Itinerary</h3><p className="text-[10px] text-slate-600">Uses only your live masters and valid rates.</p></div></div>
        <textarea value={prompt} onChange={(event) => { setPrompt(event.target.value); setMasterSummary(null); }} rows={7} className="form-input mt-3 min-h-28 w-full resize-y text-xs" placeholder="Example: Phuket, 08-10 October. Family trip with airport transfers and a beach hotel." />
        <div className="mt-2 flex gap-2"><button type="button" disabled={loading || generating || improving} onClick={generate} className="btn-primary h-8 flex-1 px-2 text-xs disabled:opacity-50">{generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Generate</button><button type="button" disabled={loading || generating || improving} onClick={improvePrompt} className="btn-secondary h-8 px-2 text-xs disabled:opacity-50">{improving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Improve</button></div>
        {masterSummary && <div className="mt-3 rounded-lg border border-sky-200 bg-white p-2 text-[10px]"><p className="font-bold text-slate-700">Live options considered</p><p className="mt-0.5 text-slate-500">{masterSummary.hotels} hotels · {masterSummary.transfers} transfers · {masterSummary.sightseeing} sightseeing options matched your dates and destinations. The best-fitting valid options will appear in the generated plan.</p></div>}
        <p className="mt-2 text-[10px] leading-4 text-slate-500">Manual services are never removed. If a selected hotel, transfer, or sightseeing item has no active valid rate, its existing manual button is marked red.</p>
      </div>
      {plan.length > 0 && <div className="mt-3 space-y-2"><div className="flex items-center justify-between"><span className="text-[11px] font-bold text-slate-700">AI plan preview</span><button type="button" onClick={apply} className="inline-flex h-7 items-center gap-1 rounded bg-emerald-600 px-2 text-[10px] font-bold text-white hover:bg-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Apply plan</button></div>{plan.map((entry, index) => <div key={`${entry.date}-${index}`} className="rounded-lg border border-slate-200 bg-white p-2 text-[10px]"><div className="font-bold text-slate-800">{entry.date ? formatDate(entry.date) : `Day ${index + 1}`} · {entry.title}</div><p className="mt-0.5 text-slate-500">{entry.description}</p><div className="mt-1 flex flex-wrap gap-1">{[['Hotel', entry.hotel], ['Transfer', entry.transfer], ['Sightseeing', entry.sightseeing]].filter(([, value]) => value).map(([label, value]) => <span key={label} className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700">{label}: {value}</span>)}{(entry.validationIssues || []).map((issue) => <span key={issue} className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">{issue}: no valid database option</span>)}</div></div>)}</div>}
      <ConfirmDialog isOpen={confirmApply} onClose={() => setConfirmApply(false)} onConfirm={applyPlan} title="Apply AI plan?" message="This quotation already has manually added services. Applying the AI plan keeps those manual services, but it will update the day titles and descriptions and replace any earlier AI-generated services." confirmLabel="Apply AI plan" confirmClass="btn-primary" />
    </aside>
  );
}
