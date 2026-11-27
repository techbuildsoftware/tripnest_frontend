import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatDate } from '../../lib/date';
import { Plane, CheckCircle, Download, Star, XCircle, Link2 } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { createPdfBlobFromElement, downloadPdfFromElement, pdfLayoutOptionsFromConfig, printPdfDocument } from '../../lib/directPdfDownload';
import { quotationPdfFilename } from '../../lib/documentFilename';
import { hotelAllocationChargeLines } from '../../lib/hotelRoomPricing';
import { DEFAULT_PDF_CONFIG } from './PDFDesigner/data/pdfConfig';
import { applyClientPdfVisibility, quotationForPdf, quotationPassengerPrices, richTextLines, roomAllocationText } from './PDFDesigner/data/quotationPdf';
import PdfLayoutFrame from './PDFDesigner/components/PdfLayoutFrame';
import {
  ClassicTemplate,
  PremiumTemplate,
  DetailedTemplate,
  CompactTemplate,
  TripNestPremiumTemplate,
  LuxuryBoutiqueTemplate,
  LuxuryTravelQuotationTemplate,
  ThaiExperienceTemplate,
  PortraitCreativeTemplate,
} from './PDFDesigner/components/PDFTemplates';

const fmt = (n) => `฿${Number(n || 0).toLocaleString()}`;
const fmtRoomRate = (n) => `฿${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const internalHotelBreakdown = (quotation = {}, hotels = []) => {
  const seen = new Set();
  const summary = new Map();
  (quotation.days || []).forEach((day) => (day.services || []).forEach((service, serviceIndex) => {
    if (service.type !== 'Hotel') return;
    const stayKey = String(service.id || `${day.date || day.day}-${service.name || 'hotel'}-${serviceIndex}`);
    if (seen.has(stayKey)) return;
    seen.add(stayKey);

    const allocation = service.roomAllocation || quotation.roomAllocation || {};
    const rate = service.rateBreakdown || {};
    const nights = Math.max(1, Number(service.nights || 1));
    const markupMultiplier = 1 + Number(service.markup || 0) / 100;
    const hotelGroupLimit = hotels.find((hotel) => hotel.id === service.hotelId)?.groupRoomLimit ?? service.hotelGroupLimit;
    const allocationEntries = hotelAllocationChargeLines(rate, allocation, hotelGroupLimit, quotation.childAges)
      .filter((entry) => entry.quantity > 0)
      .map((entry) => ({ allocationKey: entry.key, label: entry.label, rateKey: entry.rateKey, travellersPerUnit: entry.travellersPerUnit, quantity: entry.quantity }));
    const totalAllocatedRooms = allocationEntries.reduce((total, entry) => total + entry.quantity, 0);
    // A zero value in a saved rate breakdown is a real zero-priced category
    // (for example CNB/infant), not a missing snapshot. Only use the legacy
    // proportional fallback when no allocated category has a saved rate.
    const hasRateSnapshot = allocationEntries.some((entry) => Number(rate[entry.rateKey] || 0) > 0);
    const rateCostPerNight = allocationEntries.reduce(
      (total, entry) => total + Number(rate[entry.rateKey] || 0) * entry.quantity,
      0,
    );
    const rateServiceCost = rateCostPerNight * nights;
    const savedServiceCost = Number(service.totalSupplierCost ?? service.supplierCost ?? rateServiceCost);
    const savedServiceSelling = Number(service.totalSellingPrice ?? service.sellingPrice ?? (rateServiceCost * markupMultiplier));
    // Service totals are the quotation's source of truth. Scaling the saved
    // room-rate split keeps this internal view reconciled even for older
    // quotations whose stored service total was rounded differently.
    const costScale = hasRateSnapshot && rateServiceCost > 0 ? savedServiceCost / rateServiceCost : 1;
    const rateSelling = rateServiceCost * markupMultiplier;
    const sellingScale = hasRateSnapshot && rateSelling > 0 ? savedServiceSelling / rateSelling : 1;

    allocationEntries.forEach((entry) => {
      const costPerNight = Number(rate[entry.rateKey] || 0);
      const totalCost = hasRateSnapshot
        ? costPerNight * entry.quantity * nights * costScale
        : savedServiceCost * (entry.quantity / Math.max(1, totalAllocatedRooms));
      const totalSelling = hasRateSnapshot
        ? costPerNight * entry.quantity * nights * markupMultiplier * sellingScale
        : savedServiceSelling * (entry.quantity / Math.max(1, totalAllocatedRooms));
      const current = summary.get(entry.allocationKey) || {
        key: entry.allocationKey,
        label: entry.label,
        quantity: 0,
        travellers: 0,
        hotelNights: 0,
        totalCost: 0,
        totalSelling: 0,
      };
      // The quotation allocation is repeated on every hotel stay. Keep the
      // room count once and show actual accommodation nights, rather than a
      // multiplied room-night count (3 rooms x 7 nights = 21 room-nights).
      current.quantity = Math.max(current.quantity, entry.quantity);
      current.travellers = Math.max(current.travellers, entry.quantity * entry.travellersPerUnit);
      current.hotelNights += nights;
      current.totalCost += totalCost;
      current.totalSelling += totalSelling;
      summary.set(entry.allocationKey, current);
    });
  }));

  const rows = [...summary.values()];
  return {
    rows,
    totalCost: rows.reduce((total, row) => total + row.totalCost, 0),
    totalSelling: rows.reduce((total, row) => total + row.totalSelling, 0),
  };
};
export function renderPdfTemplate(quotation, config, clientPreview = false, clientPriceVisible = true) {
  const clientConfig = {
    ...config,
    clientPreview,
    // The preview switch is intentionally local to the quotation builder.
    // It affects only client documents generated in the current session.
    showClientPrice: clientPriceVisible,
  };
  const props = {
    quotation: clientPreview ? applyClientPdfVisibility(quotation, clientConfig) : quotation,
    config: clientConfig,
  };
  switch (config.template) {
    case 'classic': return <ClassicTemplate {...props} />;
    case 'detailed': return <DetailedTemplate {...props} />;
    case 'compact': return <CompactTemplate {...props} />;
    case 'buildsoftware-premium': return <TripNestPremiumTemplate {...props} />;
    case 'luxury-boutique': return <LuxuryBoutiqueTemplate {...props} />;
    case 'luxury-travel': return <LuxuryTravelQuotationTemplate {...props} />;
    case 'thai-experience': return <ThaiExperienceTemplate {...props} />;
    case 'portrait-creative': return <PortraitCreativeTemplate {...props} />;
    default: return <PremiumTemplate {...props} />;
  }
}

async function createClientPdfAttachment(element, quotation, layoutConfig, { includeBlob = false } = {}) {
  const blob = await createPdfBlobFromElement(element, undefined, pdfLayoutOptionsFromConfig(layoutConfig));
  if (blob.size > 10 * 1024 * 1024) throw new Error('The quotation PDF is too large to send by WhatsApp. Reduce the document size and try again.');
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not prepare the quotation PDF attachment.'));
    reader.readAsDataURL(blob);
  });
  const base64 = String(dataUrl || '').split(',')[1] || '';
  if (!base64) throw new Error('Could not prepare the quotation PDF attachment.');
  return { filename: `${quotationPdfFilename(quotation)}.pdf`, base64, ...(includeBlob ? { blob } : {}) };
}

export default function QuotationPreview({ quotation, viewMode, clientPriceVisible = true, clientPdfSettings = {}, pdfSettingsOpen = false, downloadRequest = 0, emailPdfRequest = 0, whatsappPdfRequest = 0, emailTemplateId = 'standard', whatsappTemplateId = '', onEmailPdfReady, onWhatsAppPdfReady, onShareTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [activeTemplateId, setActiveTemplateId] = useState('');
  const [masters, setMasters] = useState({ hotels: [], sightseeing: [], restaurants: [], transfers: [], ferryClasses: [], vehicles: [], yachts: [], suppliers: [], agents: [], b2c: [] });
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const printRef = useRef(null);
  const standardPrintRef = useRef(null);
  const handledDownloadRequest = useRef(0);
  const handledEmailPdfRequest = useRef(0);
  const handledWhatsappPdfRequest = useRef(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [templateResponse, hotels, sightseeing, restaurants, transfers, ferryClasses, vehicles, yachts, suppliers, agents, b2c] = await Promise.all([
          apiClient.get('/pdf-templates?documentType=quotation'),
          apiClient.get('/hotels?limit=100&summary=false'),
          apiClient.get('/sightseeing-module'),
          apiClient.get('/activity-masters/restaurants'),
          apiClient.get('/operations-masters/transfers'),
          apiClient.get('/operations-masters/ferry-classes'),
          apiClient.get('/operations-masters/vehicles'),
          apiClient.get('/yachts'),
          apiClient.get('/suppliers?limit=100&summary=false'),
          apiClient.get('/agents?limit=100&summary=false'),
          apiClient.get('/b2c?limit=100&summary=false'),
        ]);
        if (!active) return;
        const savedTemplates = (templateResponse.data || []).filter((template) => template.isEnabled !== false);
        setTemplates(savedTemplates);
        if (savedTemplates.length) {
          setActiveTemplateId((previous) => previous || savedTemplates.find((template) => template.isDefault)?.id || savedTemplates[0].id);
        }
        setMasters({
          hotels: hotels.data || [], sightseeing: sightseeing.data || [], restaurants: restaurants.data || [],
          transfers: transfers.data || [], ferryClasses: ferryClasses.data || [], vehicles: vehicles.data || [], yachts: yachts.data || [], suppliers: suppliers.data || [],
          agents: agents.data || [], b2c: b2c.data || [],
        });
      } catch {
        if (active) setTemplates([]);
      } finally {
        if (active) setLoadingTemplate(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const configuredQuotation = useMemo(
    () => quotationForPdf(quotation || {}, masters),
    [quotation, masters],
  );
  // The traditional quotation is downloadable as a PDF too. Feed it the same
  // enriched service data as every designer template so master timings and
  // selected vehicle information never disappear in that format.
  const standardQuotation = useMemo(() => ({
    ...(quotation || {}),
    days: configuredQuotation.itinerary,
  }), [quotation, configuredQuotation.itinerary]);
  const activeTemplate = templates.find((template) => template.id === activeTemplateId) || templates.find((template) => template.isDefault) || templates[0] || null;
  const defaultTemplate = templates.find((template) => template.isDefault) || templates[0] || null;
  const emailTemplate = emailTemplateId === 'standard'
    ? null
    : templates.find((template) => template.id === emailTemplateId) || defaultTemplate;
  const whatsappTemplate = templates.find((template) => template.id === whatsappTemplateId) || defaultTemplate;
  const activeConfig = useMemo(
    () => ({ ...DEFAULT_PDF_CONFIG, ...(activeTemplate?.config || {}) }),
    [activeTemplate],
  );
  // A quotation may override only its own client document. Template settings
  // remain the defaults for every other quotation using that same template.
  const quotationClientConfig = useMemo(
    () => ({ ...activeConfig, ...clientPdfSettings }),
    [activeConfig, clientPdfSettings],
  );
  const clientStandardQuotation = useMemo(
    () => applyClientPdfVisibility(standardQuotation, quotationClientConfig),
    [standardQuotation, quotationClientConfig],
  );

  const downloadPdf = useCallback(async (element, title, layoutConfig) => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      await downloadPdfFromElement(element, title, undefined, pdfLayoutOptionsFromConfig(layoutConfig));
    } catch (error) {
      window.alert(error.message || 'Unable to download the quotation PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  }, [downloadingPdf]);

  const printPdf = useCallback(async (element, title, layoutConfig) => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      await printPdfDocument(element, title, undefined, pdfLayoutOptionsFromConfig(layoutConfig));
    } catch (error) {
      window.alert(error.message || 'Unable to open the quotation print dialog.');
    } finally {
      setDownloadingPdf(false);
    }
  }, [downloadingPdf]);

  const downloadActiveTemplate = useCallback(() => {
    downloadPdf(printRef.current, quotationPdfFilename(quotation), quotationClientConfig);
  }, [downloadPdf, quotation, quotationClientConfig]);

  const printActiveTemplate = useCallback(() => {
    printPdf(printRef.current, quotationPdfFilename(quotation), quotationClientConfig);
  }, [printPdf, quotation, quotationClientConfig]);

  // A quotation that leaves the CRM must always use the client-safe view,
  // irrespective of which on-screen mode the staff member is currently using.
  const downloadStandardQuotation = useCallback(() => {
    downloadPdf(standardPrintRef.current, quotationPdfFilename(quotation), quotationClientConfig);
  }, [downloadPdf, quotation, quotationClientConfig]);

  const printStandardQuotation = useCallback(() => {
    printPdf(standardPrintRef.current, quotationPdfFilename(quotation), quotationClientConfig);
  }, [printPdf, quotation, quotationClientConfig]);

  // The top-level PDF action always uses the designated default saved template
  // (the document chosen in PDF settings), never the quotation builder UI.
  useEffect(() => {
    if (!downloadRequest || downloadRequest === handledDownloadRequest.current || loadingTemplate || !defaultTemplate) return;
    if (activeTemplate?.id !== defaultTemplate.id) {
      setActiveTemplateId(defaultTemplate.id);
      return;
    }
    handledDownloadRequest.current = downloadRequest;
    const timer = window.setTimeout(downloadActiveTemplate, 0);
    return () => window.clearTimeout(timer);
  }, [activeTemplate?.id, defaultTemplate, downloadActiveTemplate, downloadRequest, loadingTemplate]);

  // Email receives the client-safe template selected in the composer, never
  // the internal quotation view currently open on the consultant's screen.
  useEffect(() => {
    if (!emailPdfRequest || emailPdfRequest === handledEmailPdfRequest.current || loadingTemplate || !onEmailPdfReady) return;
    if (emailTemplate && activeTemplate?.id !== emailTemplate.id) {
      setActiveTemplateId(emailTemplate.id);
      return;
    }
    handledEmailPdfRequest.current = emailPdfRequest;
    let active = true;
    const createAttachment = async () => {
      try {
        const attachment = await createClientPdfAttachment(
          emailTemplate ? printRef.current : standardPrintRef.current,
          quotation,
          quotationClientConfig,
        );
        if (!active) return;
        onEmailPdfReady(attachment);
      } catch (error) {
        if (active) onEmailPdfReady({ error: error.message || 'Could not prepare the quotation PDF attachment.' });
      }
    };
    const timer = window.setTimeout(createAttachment, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [activeTemplate?.id, emailPdfRequest, emailTemplate, loadingTemplate, onEmailPdfReady, quotation, quotationClientConfig]);

  // WhatsApp uses the client-safe template selected in its composer. Falling
  // back to the saved default keeps existing quotations compatible.
  useEffect(() => {
    if (!whatsappPdfRequest || whatsappPdfRequest === handledWhatsappPdfRequest.current || loadingTemplate || !whatsappTemplate || !onWhatsAppPdfReady) return;
    if (activeTemplate?.id !== whatsappTemplate.id) {
      setActiveTemplateId(whatsappTemplate.id);
      return;
    }
    handledWhatsappPdfRequest.current = whatsappPdfRequest;
    let active = true;
    const createAttachment = async () => {
      try {
        const attachment = await createClientPdfAttachment(printRef.current, quotation, quotationClientConfig, { includeBlob: true });
        if (active) onWhatsAppPdfReady(attachment);
      } catch (error) {
        if (active) onWhatsAppPdfReady({ error: error.message || 'Could not prepare the quotation PDF attachment.' });
      }
    };
    const timer = window.setTimeout(createAttachment, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [activeTemplate?.id, loadingTemplate, onWhatsAppPdfReady, quotation, quotationClientConfig, whatsappPdfRequest, whatsappTemplate]);

  if (loadingTemplate) {
    return <div className="p-6 text-center text-sm text-slate-500">Loading saved PDF template…</div>;
  }

  if (activeTemplate) {
    return (
      <div className="flex flex-col lg:flex-row h-full min-h-0 bg-slate-100 overflow-y-auto lg:overflow-hidden">
        {/* During layout editing, reserve room for the docked settings panel and
            keep one full document in view rather than hiding it behind the panel. */}
        {!pdfSettingsOpen && <section className="flex-none lg:flex-1 min-w-0 overflow-x-auto lg:overflow-auto border-t lg:border-t-0 lg:border-r border-slate-200 p-2 sm:p-3 order-3 lg:order-none">
          <div className="mb-2 flex items-center justify-between gap-3 no-print">
            <div className="text-xs font-bold text-slate-800">Standard Quotation</div>
            <div className="flex items-center gap-1.5"><button onClick={downloadStandardQuotation} className="btn-secondary text-[10px] h-7 px-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"><Download className="w-3 h-3" /> Download PDF</button><button onClick={printStandardQuotation} className="btn-secondary text-[10px] h-7 px-2.5"><Download className="w-3 h-3" /> Print</button></div>
          </div>
          <PdfLayoutFrame fitWidth config={viewMode === 'client' ? quotationClientConfig : activeConfig}>
            <StandardQuotationPreview quotation={viewMode === 'client' ? clientStandardQuotation : standardQuotation} viewMode={viewMode} clientPriceVisible={clientPriceVisible} hotelMasters={masters.hotels} />
          </PdfLayoutFrame>
        </section>}
        <section className="flex-none lg:flex-1 min-w-0 overflow-x-auto lg:overflow-auto p-2 sm:p-3 order-2 lg:order-none">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 no-print">
            <div>
              <div className="text-xs font-bold text-slate-800">{activeTemplate.name}</div>
              <div className="text-[10px] text-slate-500">Saved PDF quotation</div>
            </div>
            <div className="flex items-center gap-1.5"><button onClick={() => onShareTemplate?.(activeTemplate.id)} disabled={!onShareTemplate} className="btn-secondary text-[10px] h-7 px-2.5 text-cyan-700 border-cyan-200 hover:bg-cyan-50 disabled:opacity-40"><Link2 className="w-3 h-3" /> Share</button><button onClick={downloadActiveTemplate} className="btn-primary text-[10px] h-7 px-2.5"><Download className="w-3 h-3" /> Download PDF</button><button onClick={printActiveTemplate} className="btn-secondary text-[10px] h-7 px-2.5"><Download className="w-3 h-3" /> Print</button></div>
          </div>
          <PdfLayoutFrame fitWidth config={viewMode === 'client' ? quotationClientConfig : activeConfig}>
            {renderPdfTemplate(configuredQuotation, viewMode === 'client' ? quotationClientConfig : activeConfig, viewMode === 'client', clientPriceVisible)}
          </PdfLayoutFrame>
        </section>
        {!pdfSettingsOpen && <aside className="w-full lg:w-64 lg:shrink-0 bg-white border-b lg:border-b-0 lg:border-l border-slate-200 flex flex-col no-print order-1 lg:order-none">
          <div className="px-3 py-2 border-b border-slate-200 text-xs font-bold text-slate-800">Saved Templates ({templates.length})</div>
          <div className="flex lg:block gap-2 lg:gap-0 lg:flex-1 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto p-2 lg:space-y-2">
            {templates.map((template) => {
              const selected = template.id === activeTemplate.id;
              const templateConfig = { ...DEFAULT_PDF_CONFIG, ...(template.config || {}) };
              return (
                <div key={template.id} className={`w-40 shrink-0 lg:w-auto rounded-md border p-2 ${selected ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white'}`}>
                  <button onClick={() => setActiveTemplateId(template.id)} className="w-full text-left">
                    <div className="h-8 lg:h-11 rounded overflow-hidden mb-1.5 lg:mb-2" style={{ background: `linear-gradient(135deg, ${templateConfig.accentColor || '#0B5EA8'} 0%, ${templateConfig.secondaryColor || '#F59E0B'} 100%)` }}>
                      <div className="h-2 bg-white/80 m-2 rounded w-2/3" />
                      <div className="h-1.5 bg-white/60 mx-2 rounded w-1/2" />
                    </div>
                    <div className="text-[11px] font-bold text-slate-800 truncate">{template.name}</div>
                    <div className="mt-1 flex items-center gap-1 text-[9px] font-semibold text-slate-500">{template.isDefault ? 'DEFAULT' : 'SAVED'} {template.isFavorite && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}</div>
                  </button>
                  <div className="mt-2 hidden lg:grid grid-cols-2 gap-1"><button onClick={downloadActiveTemplate} disabled={!selected} className="btn-secondary h-7 justify-center text-[10px] disabled:opacity-40"><Download className="w-3 h-3" /> Download</button><button onClick={printActiveTemplate} disabled={!selected} className="btn-secondary h-7 justify-center text-[10px] disabled:opacity-40"><Download className="w-3 h-3" /> Print</button></div>
                </div>
              );
            })}
          </div>
        </aside>}
        <div ref={printRef} aria-hidden="true" style={{ position: 'fixed', left: '-9999px', width: 595, pointerEvents: 'none' }}>
          {renderPdfTemplate(configuredQuotation, quotationClientConfig, true, clientPriceVisible)}
        </div>
        <div ref={standardPrintRef} aria-hidden="true" style={{ position: 'fixed', left: '-9999px', top: 0, width: '210mm', pointerEvents: 'none' }}>
          <StandardQuotationPreview quotation={clientStandardQuotation} viewMode="client" clientPriceVisible={clientPriceVisible} hotelMasters={masters.hotels} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-slate-100 p-3">
      <div className="mx-auto mb-2 flex max-w-4xl items-center justify-between gap-3 no-print">
        <div className="text-xs font-bold text-slate-800">Standard Quotation</div>
        <div className="flex items-center gap-1.5"><button onClick={downloadStandardQuotation} className="btn-secondary text-[10px] h-7 px-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"><Download className="w-3 h-3" /> Download PDF</button><button onClick={printStandardQuotation} className="btn-secondary text-[10px] h-7 px-2.5"><Download className="w-3 h-3" /> Print</button></div>
      </div>
      <PdfLayoutFrame fitWidth config={viewMode === 'client' ? quotationClientConfig : activeConfig}>
        <StandardQuotationPreview quotation={viewMode === 'client' ? clientStandardQuotation : standardQuotation} viewMode={viewMode} clientPriceVisible={clientPriceVisible} hotelMasters={masters.hotels} />
      </PdfLayoutFrame>
      <div ref={standardPrintRef} aria-hidden="true" style={{ position: 'fixed', left: '-9999px', top: 0, width: '210mm', pointerEvents: 'none' }}>
        <StandardQuotationPreview quotation={clientStandardQuotation} viewMode="client" clientPriceVisible={clientPriceVisible} hotelMasters={masters.hotels} />
      </div>
    </div>
  );
}

export function StandardQuotationPreview({ quotation, viewMode, clientPriceVisible = true, branding = null, hotelMasters = [] }) {
  const isClient = viewMode === 'client';
  const showClientPrice = clientPriceVisible;
  const passengerPrices = quotationPassengerPrices(quotation);
  const perPersonLabel = passengerPrices.hasDifferentChildPrice
    ? `${fmt(passengerPrices.adult)} Per Adult · ${fmt(passengerPrices.child)} Per Child`
    : `${fmt(passengerPrices.adult)} Per Person`;
  const brandName = branding?.name || 'TripNest';
  const brandLogo = branding?.logo || quotation?.logo || '';
  const brandEmail = branding?.email || 'admin@tripnest.com';
  const brandPhone = branding?.phone || '+66 76 345 678';
  const hotelBreakdown = useMemo(() => internalHotelBreakdown(quotation, hotelMasters), [quotation, hotelMasters]);
  const guests = quotation.guests?.length
    ? quotation.guests
    : (quotation.guestName ? [{ id: 'guest-1', name: quotation.guestName, phone: '' }] : []);

  return (
    <div className="standard-quotation-document max-w-4xl mx-auto p-3 bg-white text-black font-sans border border-slate-200 shadow-sm print:border-none print:shadow-none">
      {/* Header */}
      <div className="border-b-2 border-black pb-2 mb-2 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 border-2 border-black flex items-center justify-center overflow-hidden">
              {brandLogo ? <img src={brandLogo} alt={`${brandName} logo`} className="h-full w-full object-contain" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <Plane className="w-5 h-5 text-black" />}
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wider text-black m-0 leading-none">{brandName}</h1>
              <div className="text-xs font-bold uppercase tracking-widest text-black mt-0.5">Travel Quotation</div>
            </div>
          </div>
          <div className="text-[10px] font-medium text-black mt-2 uppercase tracking-wider">
            {brandEmail && <div>{brandEmail}</div>}
            {brandPhone && <div>{brandPhone}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold uppercase tracking-widest text-black mb-0.5">Quotation ID</div>
          <div className="text-xl font-black tracking-wider text-black">{quotation.id || 'DRAFT'}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-black mt-1 border border-black inline-block px-1.5 py-0.5">
            Valid Until: {formatDate(quotation.validUntil)}
          </div>
        </div>
      </div>

      {/* Trip Info Table */}
      <div className="mb-2 border-2 border-black">
        <div className="bg-gray-200 border-b border-black text-black px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
          Quotation Details
        </div>
        <table className="w-full text-[11px]">
          <tbody>
            <tr className="border-b border-black">
              <td className="p-1.5 border-r border-black font-bold uppercase tracking-wider w-1/4">Prepared For</td>
              <td className="p-1.5 w-3/4">
                {guests.length ? (
                  <div className="space-y-0.5">
                    {guests.map((guest, index) => (
                      <div key={guest.id || `${guest.name}-${index}`} className={index === 0 ? 'font-bold text-sm' : 'font-medium text-xs'}>
                        {guest.name || 'Valued Guest'}{guest.phone ? <span className="font-normal text-gray-600"> · {guest.phone}</span> : null}
                      </div>
                    ))}
                  </div>
                ) : <span className="font-bold text-sm">Valued Guest</span>}
                {quotation.agentName && <span className="text-gray-600 block text-[9px] mt-0.5 uppercase">Agent: {quotation.agentName}</span>}
              </td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1.5 border-r border-black font-bold uppercase tracking-wider">Destination</td>
              <td className="p-1.5 font-medium">{quotation.destination || '—'}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1.5 border-r border-black font-bold uppercase tracking-wider">Travel Dates</td>
              <td className="p-1.5 font-medium">{formatDate(quotation.travelDate)} TO {formatDate(quotation.endDate)}</td>
            </tr>
            <tr>
              <td className="p-1.5 border-r border-black font-bold uppercase tracking-wider">Pax & Rooms</td>
              <td className="p-1.5 font-medium">{quotation.adults || 0} Adults, {quotation.children || 0} Children / {quotation.rooms || 1} Rooms</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pricing Table */}
      {(!isClient || showClientPrice) && <div className="mb-2 border-2 border-black">
        <div className="bg-gray-200 border-b border-black text-black px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
          Package Investment
        </div>
        <table className="w-full text-xs">
          {isClient ? (
            <tbody>
              <tr>
                <td className="p-2 text-center">
                  <div className="text-[9px] font-bold uppercase tracking-widest mb-0.5">Total Package Price</div>
                  <div className="text-2xl font-black">{fmt(quotation.pricing?.totalSelling)}</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest mt-0.5 text-gray-600">{perPersonLabel}</div>
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              <tr>
                <td className="p-2 border-r border-black text-center w-1/3">
                  <div className="text-[9px] font-bold uppercase tracking-widest mb-0.5">Total Cost</div>
                  <div className="text-sm font-bold">{fmt(quotation.pricing?.totalCost)}</div>
                </td>
                <td className="p-2 border-r border-black text-center w-1/3">
                  <div className="text-[9px] font-bold uppercase tracking-widest mb-0.5">Total Selling</div>
                  <div className="text-lg font-black">{fmt(quotation.pricing?.totalSelling)}</div>
                </td>
                <td className="p-2 text-center w-1/3">
                  <div className="text-[9px] font-bold uppercase tracking-widest mb-0.5">Gross Profit</div>
                  <div className="text-sm font-bold">{fmt((quotation.pricing?.totalSelling || 0) - (quotation.pricing?.totalCost || 0))}</div>
                </td>
              </tr>
            </tbody>
          )}
        </table>
        {/* Internal-only room allocation detail stays inside the existing
            Package Investment box so the quotation section layout remains
            exactly the same for staff and clients. */}
        {!isClient && hotelBreakdown.rows.length > 0 && <div className="border-t-2 border-black">
          <div className="bg-gray-100 border-b border-black px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-black">
            Hotel Room Breakdown
          </div>
          <table className="w-full text-[10px]">
            <thead className="bg-gray-50 border-b border-black uppercase tracking-wider text-[9px]">
              <tr>
                <th className="p-1 text-left border-r border-black">Room Allocation</th>
                <th className="p-1 text-right border-r border-black">Hotel Nights</th>
                <th className="p-1 text-right border-r border-black">Total Cost</th>
                <th className="p-1 text-right border-r border-black">Cost / Person</th>
                <th className="p-1 text-right">Total Selling</th>
              </tr>
            </thead>
            <tbody>
              {hotelBreakdown.rows.map((row) => (
                <tr key={row.key} className="border-t border-black">
                  <td className="p-1 border-r border-black font-medium">{row.quantity} {row.label}{row.quantity === 1 ? '' : 's'}</td>
                  <td className="p-1 border-r border-black text-right">{row.hotelNights}</td>
                  <td className="p-1 border-r border-black text-right">{fmtRoomRate(row.totalCost)}</td>
                  <td className="p-1 border-r border-black text-right">{fmtRoomRate(row.totalCost / Math.max(1, row.travellers))}</td>
                  <td className="p-1 text-right font-bold">{fmtRoomRate(row.totalSelling)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-black bg-gray-100 font-bold">
                <td colSpan={2} className="p-1 text-right uppercase tracking-wider text-[9px]">Total Hotel Accommodation</td>
                <td className="p-1 text-right">{fmtRoomRate(hotelBreakdown.totalCost)}</td>
                <td className="p-1 border-r border-black text-right">—</td>
                <td className="p-1 text-right">{fmtRoomRate(hotelBreakdown.totalSelling)}</td>
              </tr>
            </tbody>
          </table>
        </div>}
      </div>}

      {/* Itinerary */}
      {quotation.days?.length > 0 && (
        <div className="mb-2 border-2 border-black">
          <div className="bg-gray-200 border-b border-black text-black px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
            Day-wise Itinerary
          </div>
          <div className="divide-y divide-black">
            {quotation.days.map((day) => (
              <div key={day.day} className="flex">
                <div className="w-[60px] p-1.5 border-r border-black flex flex-col items-center justify-center shrink-0">
                  <div className="text-[9px] font-bold uppercase tracking-widest">Day</div>
                  <div className="text-xl font-black leading-none">{day.day}</div>
                  <div className="text-[9px] font-bold mt-0.5 text-center leading-tight">{formatDate(day.date)}</div>
                </div>
                <div className="p-1.5 flex-1">
                  <div className="font-bold text-xs mb-0.5 uppercase">{day.title || `Day ${day.day}`}</div>
                  {day.description && <p className="text-[11px] text-gray-800 mb-1 leading-snug">{day.description}</p>}
                  
                  {day.services?.length > 0 && (
                    <table className="w-full text-[10px] border border-black">
                      <thead className="bg-gray-100 border-b border-black">
                        <tr>
                          <th className="p-1 text-center font-bold uppercase tracking-wider w-[60px] border-r border-black">Type</th>
                          <th className="p-1 text-left font-bold uppercase tracking-wider">Details</th>
                          {!isClient && <th className="p-1 text-right font-bold uppercase tracking-wider border-l border-black w-20">Price</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black">
                        {day.services.map(svc => (
                          <tr key={svc.id}>
                            <td className="p-1 text-center font-bold uppercase tracking-wider border-r border-black">{svc.type}</td>
                            <td className="p-1">
                              <div className="font-bold">{svc.name}</div>
                              {svc.type === 'Hotel' && (
                                <div className="mt-0.5 text-gray-700">{svc.roomType} • {svc.nights}N • {svc.mealPlan} • {roomAllocationText(svc.roomAllocation, svc.rooms || quotation.rooms)}</div>
                              )}
                              {svc.type === 'Transfer' && (
                                <div className="mt-0.5 text-gray-700">{[`${svc.origin || ''}${svc.origin && svc.destination ? ' to ' : ''}${svc.destination || ''}`, svc.basisLabel || svc.basis, svc.vehicleName || svc.vehicleLabel || svc.vehicle].filter(Boolean).join(' • ')}</div>
                              )}
                              {svc.type === 'Sightseeing' && (
                                <>
                                  {svc.time && <div className="mt-0.5 text-gray-700">Show timing: {svc.time}</div>}
                                  {(() => {
                                    const basis = svc.basisLabel || svc.basis || '';
                                    const vehicle = basis === 'Ticket Only' ? '' : svc.transferVehicleName || svc.vehicleName || svc.vehicleLabel || svc.vehicle || '';
                                    const details = [basis, vehicle ? `Vehicle: ${vehicle}` : ''].filter(Boolean).join(' • ');
                                    return details ? <div className="mt-0.5 text-gray-700">{details}</div> : null;
                                  })()}
                                  {svc.inclusions?.length > 0 && <div className="mt-0.5 text-gray-700">Includes: {svc.inclusions.join(', ')}</div>}
                                  {!isClient && svc.clientRateSummary && <div className="mt-0.5 text-gray-700">{svc.clientRateSummary}</div>}
                                  {!svc.hideMasterDescription && richTextLines(svc.masterDescription || svc.description).map((line, index) => <div key={`${index}-${line}`} className="mt-0.5 text-gray-700">{line}</div>)}
                                </>
                              )}
                              {svc.type === 'Yacht' && (
                                <div className="mt-0.5 text-gray-700">{svc.duration || 'Charter'} • {svc.totalPax || 0} guests{svc.startingPier ? ` • Boarding: ${svc.startingPier}` : ''}</div>
                              )}
                              {!isClient && (svc.yachtSupplier || svc.supplier) && (
                                <div className="text-[9px] font-bold uppercase tracking-wider mt-0.5 text-gray-500">Supplier: {svc.yachtSupplier || svc.supplier}</div>
                              )}
                            </td>
                            {!isClient && (
                              <td className="p-1 text-right border-l border-black">
                                <div className="text-gray-500">Cost: ฿{Number(svc.totalSupplierCost ?? svc.supplierCost ?? 0).toLocaleString()}</div>
                                <div className="font-bold">Sell: ฿{Number(svc.totalSellingPrice ?? svc.sellingPrice ?? 0).toLocaleString()}</div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inclusions & Exclusions */}
      {(quotation.inclusions?.length > 0 || quotation.exclusions?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 mb-2 border-2 border-black">
          {quotation.inclusions?.length > 0 && (
            <div className="border-b md:border-b-0 md:border-r border-black">
              <div className="bg-gray-100 border-b border-black px-2 py-1 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Included
              </div>
              <ul className="p-2 space-y-0.5">
                {quotation.inclusions.map((inc, i) => (
                  <li key={i} className="text-[11px] flex items-start gap-1">
                    <span className="font-bold">•</span> {inc}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {quotation.exclusions?.length > 0 && (
            <div>
              <div className="bg-gray-100 border-b border-black px-2 py-1 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Excluded
              </div>
              <ul className="p-2 space-y-0.5">
                {quotation.exclusions.map((exc, i) => (
                  <li key={i} className="text-[11px] flex items-start gap-1">
                    <span className="font-bold">•</span> {exc}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Terms */}
      {(quotation.termsHtml || quotation.terms?.length > 0) && (
        <div className="mb-2 border-2 border-black">
          <div className="bg-gray-100 border-b border-black px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
            Terms & Conditions{quotation.termsTemplateName ? ` · ${quotation.termsTemplateName}` : ''}
          </div>
          {quotation.termsHtml ? <div className="rich-text-content p-2 text-[11px]" dangerouslySetInnerHTML={{ __html: quotation.termsHtml }} /> : <ul className="p-2 space-y-0.5">
            {quotation.terms.map((t, i) => (
              <li key={i} className="text-[11px] flex items-start gap-1">
                <span className="font-bold">-</span> {t}
              </li>
            ))}
          </ul>}
        </div>
      )}

      {/* Footer */}
      <div className="pt-2 border-t-2 border-black flex items-center justify-between">
        {/* <div className="text-[10px] font-bold uppercase tracking-widest">Generated by {brandName}</div> */}
        <div className="text-[10px] font-bold uppercase tracking-widest">{formatDate(new Date())}</div>
      </div>
    </div>
  );
}
