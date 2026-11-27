import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Eye, Copy, Download, Send, BookOpen,
  Plus, ChevronDown, Hotel, Car, Compass, Utensils,
  FileText, DollarSign, Settings, List, RefreshCw,
  X, CheckSquare, CheckCircle2, XCircle, Info, Palette, Mail, MessageCircle, History, Loader2, Sparkles, RotateCcw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api';
import useOperationsMaster from '../../hooks/useOperationsMaster';
import Modal from '../../components/ui/Modal';
import WhatsAppSendDialog from '../../components/WhatsAppSendDialog';
import ItineraryBuilder from './ItineraryBuilder';
// AI itinerary is intentionally paused in the frontend for now. Keep this
// component isolated so it can be restored later by uncommenting this import
// and the guarded panel below.
// import ItineraryAiAssistant from './ItineraryAiAssistant';
import PricingPanel from './PricingPanel';
import QuotationPreview from './QuotationPreview';
import { formatDate, formatDateTime, todayIsoInTimeZone } from '../../lib/date';
import RichTextEditor from '../../components/ui/RichTextEditor';
import DateInput from '../../components/ui/DateInput';
import { hotelAllocationRateCost } from '../../lib/hotelRoomPricing';

const TABS = [
  { id: 'itinerary', label: 'Day-wise Itinerary', short: 'Itinerary', icon: List },
  { id: 'pricing', label: 'Pricing', icon: DollarSign },
  { id: 'terms', label: 'Terms & Inclusions', short: 'Terms', icon: FileText },
  { id: 'availability', label: 'Hotel Availability', short: 'Hotels', icon: Hotel },
  { id: 'preview', label: 'Preview', icon: Eye },
];

const STATUS_FLOW = ['Draft', 'Sent', 'Follow-up', 'Revised', 'Accepted', 'Confirmed', 'Cancelled'];
const DEFAULT_CLIENT_PDF_SETTINGS = {
  showPrice: true,
  showClientItinerary: true,
  showClientHotels: true,
  showClientSightseeing: true,
  showClientMasterDescriptions: true,
};

const roundMoney = (value) => Math.round(Number(value || 0));
const copyQuotation = (value) => JSON.parse(JSON.stringify(value || {}));
const quotationRevisionSnapshot = (source, pricing) => {
  const snapshot = copyQuotation({ ...source, pricing });
  ['id', 'queryId', 'bookingId', 'versions', 'emailLogs', 'createdAt', 'updatedAt', 'status', 'acceptedVersion', 'acceptedAt', 'acceptedBy', 'hasUnrevisedChanges', 'pendingRevisionSavedAt', 'restoredFromVersion', 'restoredAt', 'restoredBy'].forEach((key) => delete snapshot[key]);
  return snapshot;
};
const durationFromTravelDates = (travelDate, endDate) => {
  if (!travelDate || !endDate) return '';
  const start = new Date(`${String(travelDate).slice(0, 10)}T00:00:00.000Z`);
  const end = new Date(`${String(endDate).slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end < start) return '';
  const nights = Math.round((end - start) / (24 * 60 * 60 * 1000));
  return `${nights} ${nights === 1 ? 'Night' : 'Nights'} / ${nights + 1} ${nights + 1 === 1 ? 'Day' : 'Days'}`;
};
const serviceTotalCost = (service = {}) => {
  if (Number.isFinite(Number(service.totalSupplierCost))) return Number(service.totalSupplierCost);
  if (service.type === 'Transfer') return Number(service.supplierCost || 0) * Math.max(1, Number(service.quantity || 1));
  return Number(service.supplierCost || 0);
};

// The global percentage is an explicit quotation-wide override. Keep the
// individual price fields in sync as well as the totals, so the itinerary,
// client preview, saved quotation, and pricing tab always agree.
const applyPercentageMarkup = (service, markup) => {
  const percentage = Number.isFinite(Number(markup)) ? Number(markup) : 0;
  const multiplier = 1 + percentage / 100;
  if (service.type === 'Hotel' && Array.isArray(service.nightlyRateBreakdown) && service.nightlyRateBreakdown.length) {
    const nightlyRateBreakdown = service.nightlyRateBreakdown.map((night) => ({
      ...night,
      sellingPrice: roundMoney(Number(night.supplierCost || 0) * multiplier),
    }));
    const totalSupplierCost = roundMoney(nightlyRateBreakdown.reduce((total, night) => total + Number(night.supplierCost || 0), 0));
    const totalSellingPrice = roundMoney(nightlyRateBreakdown.reduce((total, night) => total + Number(night.sellingPrice || 0), 0));
    const nights = Math.max(1, nightlyRateBreakdown.length);
    return {
      ...service,
      markup: percentage,
      nightlyRateBreakdown,
      supplierCost: roundMoney(totalSupplierCost / nights),
      sellingPrice: roundMoney(totalSellingPrice / nights),
      totalSupplierCost,
      totalSellingPrice,
    };
  }
  const totalSupplierCost = serviceTotalCost(service);
  const totalSellingPrice = roundMoney(totalSupplierCost * multiplier);
  const updated = { ...service, markup: percentage, totalSupplierCost, totalSellingPrice };

  if (service.type === 'Hotel' || service.type === 'Transfer' || service.type === 'Guide') {
    return { ...updated, sellingPrice: roundMoney(Number(service.supplierCost || 0) * multiplier) };
  }
  if (service.type === 'Sightseeing') {
    return {
      ...updated,
      adultSellingRate: roundMoney(Number(service.adultSupplierRate || 0) * multiplier),
      childSellingRate: roundMoney(Number(service.childSupplierRate || 0) * multiplier),
      transferSellingPrice: roundMoney(Number(service.transferSupplierCost || 0) * multiplier),
    };
  }
  if (service.type === 'Meal') {
    return {
      ...updated,
      adultSellingRate: roundMoney(Number(service.adultRate || 0) * multiplier),
      childSellingRate: roundMoney(Number(service.childRate || 0) * multiplier),
      transportSelling: roundMoney(Number(service.transportCost || 0) * multiplier),
    };
  }
  return { ...updated, sellingPrice: totalSellingPrice };
};

const allocatedHotelRoomCount = (allocation = {}) => Number(allocation.sgl || 0) + Number(allocation.dbl || 0);
const hotelNightSurchargeCost = (night = {}, allocation = {}, fallbackRooms = 1) => {
  const roomCount = Math.max(1, allocatedHotelRoomCount(allocation) || Number(fallbackRooms || 1));
  const surchargeLines = Array.isArray(night.surchargeLines) ? night.surchargeLines : [];
  if (!surchargeLines.length) return Number(night.surchargeCost || 0);
  return roundMoney(surchargeLines.reduce((total, line) => {
    // Legacy rows stored only `amount`; treat that source amount as a
    // per-room charge too, so opening and recalculating an old quotation
    // repairs the same undercharge.
    const unitAmount = Number(line.unitAmount ?? line.amount ?? 0);
    return total + (unitAmount * roomCount);
  }, 0));
};

const emptyQuotation = {
  id: null,
  version: 1,
  queryId: '',
  clientType: '',
  agentId: '',
  agentName: '',
  b2cId: '',
  b2cName: '',
  recipientEmail: '',
  guestName: '',
  guests: [],
  travelDate: '',
  endDate: '',
  adults: '',
  children: '',
  infants: '',
  childAges: [],
  childHeights: [],
  infantAges: [],
  rooms: '',
  roomAllocation: { sgl: 0, dbl: 0, adultExtraBed: 0, cwb: 0, cnb: 0, inf: 0 },
  market: '',
  currency: '',
  salesPerson: '',
  validUntil: '',
  quotationDate: '',
  status: 'Draft',
  destination: '',
  versions: [],
  days: [],
  pricing: {
    hotelCost: 0, hotelSelling: 0,
    transferCost: 0, transferSelling: 0,
    sightseeingCost: 0, sightseeingSelling: 0,
    yachtCost: 0, yachtSelling: 0,
    mealCost: 0, mealSelling: 0,
    guideCost: 0, guideSelling: 0,
    otherCost: 0, otherSelling: 0,
    totalCost: 0, totalSelling: 0,
    markup: 0, margin: 0, sellingPP: 0,
    globalMarkupType: 'percentage',
    globalMarkupValue: 0,
  },
  inclusions: [],
  exclusions: [],
  terms: [],
  termsTemplateId: '',
  termsTemplateName: '',
  termsHtml: '',
};
const validUntilFromQuotationDate = (quotationDate, validDays) => {
  const base = String(quotationDate || '').slice(0, 10);
  const days = Number(validDays);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base) || !Number.isFinite(days)) return '';
  const date = new Date(`${base}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + Math.max(0, Math.trunc(days)));
  return date.toISOString().slice(0, 10);
};

export default function QuotationBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { quotations, queries, addQuotation, updateQuotation, convertQuotationToBooking, acceptQuotationRevision, restoreQuotationRevision, agents, hotels, fetchRecord } = useApp();
  const { user } = useAuth();
  const agentPortal = user?.role === 'Agent';
  const availableAgents = useMemo(() => agentPortal ? agents.filter((agent) => String(agent.id) === String(user?.agentId || '')) : agents, [agentPortal, agents, user?.agentId]);
  const visibleTabs = agentPortal ? TABS.filter((tab) => ['itinerary', 'terms', 'preview'].includes(tab.id)) : TABS;
  const destinations = useOperationsMaster('destinations');

  const existing = id ? quotations.find(q => q.id === id) : null;
  const sourceQuery = queries.find((query) => query.id === searchParams.get('query'));

  useEffect(() => {
    if (id && id !== 'new') fetchRecord('quotations', id).catch((error) => toast.error(error.message));
  }, [id, fetchRecord]);

  useEffect(() => {
    const queryId = searchParams.get('query');
    if (queryId) fetchRecord('queries', queryId).catch((error) => toast.error(error.message));
  }, [searchParams, fetchRecord]);
  const [quotationDefaultMarkup, setQuotationDefaultMarkup] = useState(0);
  const [quotationDefaultValidDays, setQuotationDefaultValidDays] = useState(7);
  const [quotationDefaultsLoaded, setQuotationDefaultsLoaded] = useState(false);
  const quotationFromQuery = (query) => ({
    ...emptyQuotation,
    queryId: query.id,
    queryServiceType: query.serviceType || 'Complete Package',
    clientType: query.clientType || '',
    agentId: query.agentId || '',
    agentName: query.agentName || '',
    b2cId: query.clientType === 'B2C' ? query.agentId || '' : '',
    b2cName: query.clientType === 'B2C' ? query.agentName || '' : '',
    recipientEmail: query.contactEmail || '',
    guestName: query.guests?.[0]?.name || query.guestName || query.contactPerson || '',
    guests: query.guests?.length
      ? query.guests
      : (query.guestName ? [{ id: 'guest-1', name: query.guestName, phone: '' }] : []),
    travelDate: query.travelSegments?.[0]?.fromDate || query.travelDate || '',
    endDate: query.travelSegments?.at(-1)?.toDate || query.endDate || '',
    duration: durationFromTravelDates(query.travelSegments?.[0]?.fromDate || query.travelDate, query.travelSegments?.at(-1)?.toDate || query.endDate),
    adults: query.adults ?? '',
    children: query.children ?? '',
    infants: query.infants ?? '',
    childAges: query.childAges || [],
    childHeights: query.childHeights || [],
    infantAges: query.infantAges || [],
    rooms: query.rooms ?? '',
    roomAllocation: Object.values(query.roomAllocation || {}).some((value) => Number(value || 0) > 0)
      ? { ...emptyQuotation.roomAllocation, ...query.roomAllocation }
      : { ...emptyQuotation.roomAllocation, dbl: Number(query.rooms || 0) },
    market: query.market || '',
    currency: query.currency || '',
    salesPerson: query.salesPerson || query.assignedTo || '',
    quotationDate: query.quotationDate || todayIsoInTimeZone(),
    validUntil: query.validUntil || validUntilFromQuotationDate(query.quotationDate || todayIsoInTimeZone(), quotationDefaultValidDays),
    destination: query.destination || '',
    allowedServiceTypes: undefined,
    pricing: { ...emptyQuotation.pricing, globalMarkupValue: quotationDefaultMarkup },
  });
  const [quotation, setQuotation] = useState(existing || (sourceQuery ? quotationFromQuery(sourceQuery) : emptyQuotation));
  const [activeTab, setActiveTab] = useState('itinerary');
  // Open quotations in the client-safe view by default. Staff can switch to
  // Internal whenever they need to edit services, costs, or margins.
  const [viewMode, setViewMode] = useState('client'); // internal | client
  useEffect(() => {
    if (agentPortal) setViewMode('client');
  }, [agentPortal]);
  const [pdfSettingsOpen, setPdfSettingsOpen] = useState(false);
  // These are intentionally browser-session settings. They control the client
  // output only and must never make the quotation dirty or be saved remotely.
  const [clientPdfSettings, setClientPdfSettings] = useState(DEFAULT_CLIENT_PDF_SETTINGS);
  const [showVersions, setShowVersions] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false); // phones: quotation details are collapsed by default
  const [isDirty, setIsDirty] = useState(false);
  // A quotation is saved automatically after editing pauses briefly.  The
  // version counter is deliberately separate from `isDirty`: subsequent
  // edits while already dirty must restart the debounce and must never be
  // overwritten by an older save response.
  const [editVersion, setEditVersion] = useState(0);
  const [autoSaveState, setAutoSaveState] = useState('saved');
  const [autoSaveTick, setAutoSaveTick] = useState(0);
  const latestEditVersionRef = useRef(0);
  const dirtyRef = useRef(false);
  const autoSaveTimerRef = useRef(null);
  const autoSavePromiseRef = useRef(null);
  const failedAutoSaveVersionRef = useRef(null);
  const [planningItinerary, setPlanningItinerary] = useState(false);
  const [aiItineraryIssues, setAiItineraryIssues] = useState({});
  const [setupComplete, setSetupComplete] = useState(Boolean(existing));
  const [pdfDownloadRequest, setPdfDownloadRequest] = useState(0);
  const [agentShareLink, setAgentShareLink] = useState('');
  const [creatingAgentShareLink, setCreatingAgentShareLink] = useState(false);
  const [b2cClients, setB2cClients] = useState([]);
  const [sendPickerOpen, setSendPickerOpen] = useState(false);
  const [whatsappComposerOpen, setWhatsappComposerOpen] = useState(false);
  const [whatsappPdfRequest, setWhatsappPdfRequest] = useState(0);
  const [whatsappAttachment, setWhatsappAttachment] = useState(null);
  const [preparingWhatsappPdf, setPreparingWhatsappPdf] = useState(false);
  const [whatsappTemplates, setWhatsappTemplates] = useState([]);
  const [whatsappTemplateId, setWhatsappTemplateId] = useState('');
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [emailLogsOpen, setEmailLogsOpen] = useState(false);
  const [quotationEmailLogs, setQuotationEmailLogs] = useState([]);
  const [emailPdfRequest, setEmailPdfRequest] = useState(0);
  const [emailAttachment, setEmailAttachment] = useState(null);
  const [preparingEmailPdf, setPreparingEmailPdf] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [emailTemplateId, setEmailTemplateId] = useState('standard');
  const [historyPreview, setHistoryPreview] = useState(null);
  const [liveQuotationBeforePreview, setLiveQuotationBeforePreview] = useState(null);

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  const markQuotationDirty = useCallback(() => {
    const nextVersion = latestEditVersionRef.current + 1;
    latestEditVersionRef.current = nextVersion;
    failedAutoSaveVersionRef.current = null;
    dirtyRef.current = true;
    setEditVersion(nextVersion);
    setIsDirty(true);
    setAutoSaveState('pending');
  }, []);

  useEffect(() => {
    let active = true;
    apiClient.get('/b2c?limit=100&summary=false').then((response) => {
      if (active) setB2cClients(response.data || []);
    }).catch(() => { if (active) setB2cClients([]); });
    return () => { active = false; };
  }, []);

  const loadQuotationEmailLogs = async () => {
    if (!quotation.id) { setQuotationEmailLogs([]); return; }
    try { setQuotationEmailLogs((await apiClient.get(`/quotation-emails/${encodeURIComponent(quotation.id)}`)).data || []); }
    catch { setQuotationEmailLogs([]); }
  };

  useEffect(() => { loadQuotationEmailLogs(); }, [quotation.id]);

  useEffect(() => {
    let active = true;
    apiClient.get('/settings').then((response) => {
      const savedMarkup = Number(response.data?.quotation?.defaultMarkup);
      const savedValidDays = Number(response.data?.quotation?.defaultValidDays);
      if (active && Number.isFinite(savedMarkup)) setQuotationDefaultMarkup(savedMarkup);
      if (active && Number.isFinite(savedValidDays) && savedValidDays >= 0) setQuotationDefaultValidDays(savedValidDays);
    }).catch(() => {}).finally(() => {
      if (active) setQuotationDefaultsLoaded(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (existing) {
      // Older quotations did not store a quotation date/validity. Keep their
      // original issue date when it exists and backfill the visible validity
      // from the configured number of days instead of leaving the header blank.
      const quotationDate = existing.quotationDate || String(existing.createdAt || '').slice(0, 10) || todayIsoInTimeZone();
      setQuotation({
        ...existing,
        quotationDate,
        validUntil: existing.validUntil || validUntilFromQuotationDate(quotationDate, quotationDefaultValidDays),
      });
      setSetupComplete(true);
      dirtyRef.current = false;
      failedAutoSaveVersionRef.current = null;
      setIsDirty(false);
      setAutoSaveState('saved');
      setHistoryPreview(null);
      setLiveQuotationBeforePreview(null);
      return;
    }
    if (sourceQuery?.id) {
      if (setupComplete) return;
      setQuotation(quotationFromQuery(sourceQuery));
      setSetupComplete(false);
      dirtyRef.current = false;
      failedAutoSaveVersionRef.current = null;
      setIsDirty(false);
      setAutoSaveState('saved');
      return;
    }
    if (!id || id === 'new') {
      const quotationDate = todayIsoInTimeZone();
      setQuotation({ ...emptyQuotation, quotationDate, validUntil: validUntilFromQuotationDate(quotationDate, quotationDefaultValidDays), pricing: { ...emptyQuotation.pricing, globalMarkupValue: quotationDefaultMarkup } });
    }
  }, [id, existing?.id, sourceQuery?.id, quotationDefaultMarkup, quotationDefaultValidDays]);

  useEffect(() => {
    if (existing || !sourceQuery?.id || setupComplete || !quotationDefaultsLoaded) return;
    let active = true;
    const prepare = async () => {
      setPlanningItinerary(true);
      try {
        const response = await apiClient.post(`/quotations/from-query/${encodeURIComponent(sourceQuery.id)}/plan`, {
          roomAllocation: sourceQuery.roomAllocation || emptyQuotation.roomAllocation,
        });
        if (!active) return;
        // Planned services and itinerary-master services always begin at cost.
        // The saved default remains available in the Pricing tab, where the
        // consultant can intentionally apply a quotation-wide markup.
        setQuotation((current) => ({
          ...current,
          ...response.data,
          id: null,
          version: 1,
          status: 'Draft',
          versions: [],
          pricing: {
            ...emptyQuotation.pricing,
            ...(response.data?.pricing || {}),
            globalMarkupType: 'percentage',
            globalMarkupValue: quotationDefaultMarkup,
          },
          days: (response.data?.days || []).map((plannedDay) => ({
            ...plannedDay,
            services: (plannedDay.services || []).map((service) => applyPercentageMarkup(service, 0)),
          })),
        }));
        setSetupComplete(true);
        // A query-generated itinerary is a real new quotation draft.  Queue
        // its first persistence automatically, even before the user makes a
        // further manual edit.
        markQuotationDirty();
      } catch (error) {
        if (active) toast.error(error.message || 'Could not prepare the itinerary from this query.');
      } finally {
        if (active) setPlanningItinerary(false);
      }
    };
    prepare();
    return () => { active = false; };
  }, [existing, markQuotationDirty, quotationDefaultMarkup, quotationDefaultsLoaded, sourceQuery?.id, setupComplete]);

  const updateQuot = (updates) => {
    if (historyPreview) {
      toast.error('Restore this historical version or return to the current quotation before editing.');
      return;
    }
    setQuotation(prev => ({ ...prev, ...updates }));
    markQuotationDirty();
  };

  const updateDays = (days) => updateQuot({ days });
  const updateClientPdfSettings = (updates) => setClientPdfSettings((current) => ({ ...current, ...updates }));
  const applyAiItineraryPlan = (generatedByDate) => {
    // AI-generated rows are explicitly marked. Reapplying a plan replaces
    // those rows only; manually added services remain exactly as entered.
    const existingDays = quotation.days || [];
    const hasExistingDays = existingDays.length > 0;
    const destinationForDate = (date) => quotation.travelSegments?.find((segment) => date >= segment.fromDate && date <= segment.toDate)?.arrivalDestination || quotation.destination || '';
    const updatedByDate = new Map(existingDays.map((day) => [day.date, day]));
    Object.entries(generatedByDate).forEach(([date, generated]) => {
      const existingDay = updatedByDate.get(date);
      // Existing quotations keep their confirmed itinerary boundaries. A
      // generated date that does not belong to them is ignored, never added
      // as an additional day.
      if (hasExistingDays && !existingDay) return;
      const manualServices = (existingDay?.services || []).filter((service) => !service.sourceAiItinerary);
      updatedByDate.set(date, {
        ...(existingDay || {}),
        date,
        destination: existingDay?.destination || destinationForDate(date),
        title: generated.entry.title || existingDay?.title || '',
        description: generated.entry.description || existingDay?.description || '',
        services: [...manualServices, ...generated.services],
      });
    });
    const plannedDays = [...updatedByDate.values()]
      .sort((left, right) => String(left.date || '').localeCompare(String(right.date || '')))
      .map((day, index) => ({ ...day, day: index + 1 }));
    updateDays(plannedDays);
  };
  const requestConfiguredPdfDownload = () => {
    setViewMode('client');
    setActiveTab('preview');
    setPdfDownloadRequest((request) => request + 1);
  };
  const createAgentShareLink = async (templateId) => {
    if (historyPreview) return toast.error('Return to the current quotation before creating an agent link.');
    setCreatingAgentShareLink(true);
    try {
      const saved = isDirty || !quotation.id || autoSavePromiseRef.current ? await flushQuotationAutosave() : quotation;
      if (!saved?.id) throw new Error('Save the quotation before creating an agent link.');
      setQuotation(saved);
      const response = await apiClient.post(`/agent-quotation-share/${encodeURIComponent(saved.id)}/link`, { templateId });
      const publicCode = response.data.shortCode || response.data.token;
      const quotationNumber = String(saved.quotationNo || saved.quotationNumber || saved.id || 'quotation').trim();
      const link = `${window.location.origin}/crm/q/${encodeURIComponent(quotationNumber)}/${encodeURIComponent(publicCode)}`;
      setAgentShareLink(link);
    } catch (error) {
      toast.error(error.message || 'Unable to create the agent quotation link.');
    } finally {
      setCreatingAgentShareLink(false);
    }
  };
  const copyAgentShareLink = async () => {
    try {
      await navigator.clipboard.writeText(agentShareLink);
      toast.success('Agent quotation link copied.');
    } catch {
      toast.error('Copy the link manually from the field.');
    }
  };
  const updatePricing = (pricing) => {
    setQuotation((previous) => {
      const nextPricing = { ...previous.pricing, ...pricing };
      const isPercentage = (nextPricing.globalMarkupType || 'percentage') === 'percentage';
      // Fixed, per-person and per-booking markup belongs to the quotation as
      // a whole. Reset service prices to cost in those modes so a previous
      // percentage override cannot remain silently included in the total.
      const days = (previous.days || []).map((day) => ({
        ...day,
        services: (day.services || []).map((service) => applyPercentageMarkup(service, isPercentage ? nextPricing.globalMarkupValue : 0)),
      }));
      return { ...previous, pricing: nextPricing, days };
    });
    markQuotationDirty();
  };

  const updateRoomAllocation = (key, value) => {
    const roomAllocation = { ...(quotation.roomAllocation || emptyQuotation.roomAllocation), [key]: Math.max(0, Number(value || 0)) };
    const rooms = Number(roomAllocation.sgl || 0) + Number(roomAllocation.dbl || 0);
    const days = quotation.days.map((day) => ({ ...day, services: (day.services || []).map((service) => {
      if (service.type !== 'Hotel' || !service.rateBreakdown) return service;
      // This hotel has its own room count/allocation, for example six rooms
      // in one city while the quotation has nine rooms overall.
      if (service.roomAllocationOverride) return service;
      // A consultant can override either hotel price in the service modal.
      // Changing the quotation-level room allocation must not silently erase
      // either override; only contract-derived values are recalculated.
      const hotelGroupLimit = hotels.find((hotel) => hotel.id === service.hotelId)?.groupRoomLimit ?? service.hotelGroupLimit;
      if (Array.isArray(service.nightlyRateBreakdown) && service.nightlyRateBreakdown.length && !service.manualSupplierCost && !service.manualSellingPrice) {
        const nightlyRateBreakdown = service.nightlyRateBreakdown.map((night) => {
          // Hotel contract supplements are charged per room, so they must
          // follow a quotation-level room-allocation change as well.
          const surchargeCost = hotelNightSurchargeCost(night, roomAllocation, rooms);
          const supplierCost = roundMoney(
            hotelAllocationRateCost(night.rateBreakdown, roomAllocation, hotelGroupLimit, quotation.childAges)
            + surchargeCost,
          );
          return {
            ...night,
            surchargeCost,
            surchargeLines: (night.surchargeLines || []).map((line) => ({
              ...line,
              unitAmount: Number(line.unitAmount ?? line.amount ?? 0),
              quantity: Math.max(1, allocatedHotelRoomCount(roomAllocation) || rooms),
              amount: roundMoney(Number(line.unitAmount ?? line.amount ?? 0) * Math.max(1, allocatedHotelRoomCount(roomAllocation) || rooms)),
            })),
            supplierCost,
            sellingPrice: roundMoney(supplierCost * (1 + Number(service.markup || 0) / 100)),
          };
        });
        const totalSupplierCost = roundMoney(nightlyRateBreakdown.reduce((total, night) => total + Number(night.supplierCost || 0), 0));
        const totalSellingPrice = roundMoney(nightlyRateBreakdown.reduce((total, night) => total + Number(night.sellingPrice || 0), 0));
        const nights = Math.max(1, nightlyRateBreakdown.length);
        return {
          ...service,
          roomAllocation,
          rooms,
          nightlyRateBreakdown,
          supplierCost: roundMoney(totalSupplierCost / nights),
          sellingPrice: roundMoney(totalSellingPrice / nights),
          totalSupplierCost,
          totalSellingPrice,
        };
      }
      const supplierCost = service.manualSupplierCost
        ? Number(service.supplierCost || 0)
        : hotelAllocationRateCost(service.rateBreakdown, roomAllocation, hotelGroupLimit, quotation.childAges);
      const sellingPrice = service.manualSellingPrice
        ? Number(service.sellingPrice || 0)
        : Math.round(supplierCost * (1 + Number(service.markup || 0) / 100));
      const nights = Number(service.nights || 1);
      return { ...service, roomAllocation, rooms, supplierCost, sellingPrice, totalSupplierCost: supplierCost * nights, totalSellingPrice: sellingPrice * nights };
    }) }));
    updateQuot({ roomAllocation, rooms, days });
  };
  // Recalculate pricing from days
  const recalcPricing = useMemo(() => {
    let hotelCost = 0, hotelSelling = 0;
    let transferCost = 0, transferSelling = 0;
    let sightseeingCost = 0, sightseeingSelling = 0;
    let yachtCost = 0, yachtSelling = 0;
    let mealCost = 0, mealSelling = 0;
    let guideCost = 0, guideSelling = 0;
    let otherCost = 0, otherSelling = 0;

    quotation.days.forEach(day => {
      day.services?.forEach(svc => {
        if (svc.type === 'Hotel') {
          hotelCost += svc.totalSupplierCost || 0;
          hotelSelling += svc.totalSellingPrice || 0;
        } else if (svc.type === 'Transfer') {
          const quantity = Math.max(1, Number(svc.quantity || 1));
          transferCost += Number(svc.totalSupplierCost ?? (Number(svc.supplierCost || 0) * quantity));
          transferSelling += Number(svc.totalSellingPrice ?? (Number(svc.sellingPrice || 0) * quantity));
        } else if (svc.type === 'Sightseeing') {
          sightseeingCost += svc.totalSupplierCost || 0;
          sightseeingSelling += svc.totalSellingPrice || 0;
        } else if (svc.type === 'Yacht') {
          yachtCost += svc.supplierCost || 0;
          yachtSelling += svc.sellingPrice || 0;
        } else if (svc.type === 'Meal') {
          mealCost += svc.totalSupplierCost || 0;
          mealSelling += svc.totalSellingPrice || 0;
        } else if (svc.type === 'Guide') {
          const quantity = Math.max(1, Number(svc.quantity || 1));
          guideCost += Number(svc.totalSupplierCost ?? (Number(svc.supplierCost || 0) * quantity));
          guideSelling += Number(svc.totalSellingPrice ?? (Number(svc.sellingPrice || 0) * quantity));
        } else {
          otherCost += Number(svc.totalSupplierCost ?? Number(svc.supplierCost || 0));
          otherSelling += Number(svc.totalSellingPrice ?? Number(svc.sellingPrice || 0));
        }
      });
    });

    const totalCost = hotelCost + transferCost + sightseeingCost + yachtCost + mealCost + guideCost + otherCost;
    const serviceSelling = hotelSelling + transferSelling + sightseeingSelling + yachtSelling + mealSelling + guideSelling + otherSelling;
    const markupType = quotation.pricing?.globalMarkupType || 'percentage';
    const markupValue = Math.max(0, Number(quotation.pricing?.globalMarkupValue) || 0);
    const billableTravellers = Math.max(0, Number(quotation.adults || 0)) + Math.max(0, Number(quotation.children || 0));
    const globalMarkupAmount = markupType === 'fixed' || markupType === 'per_booking'
      ? markupValue
      : markupType === 'per_person'
        ? roundMoney(markupValue * billableTravellers)
        : 0;
    const totalSelling = serviceSelling + globalMarkupAmount;
    const markup = totalSelling - totalCost;
    const margin = totalSelling > 0 ? (markup / totalSelling * 100) : 0;
    const adults = quotation.adults || 1;
    const sellingPP = totalSelling / adults;

    return {
      ...quotation.pricing,
      hotelCost, hotelSelling,
      transferCost, transferSelling,
      sightseeingCost, sightseeingSelling,
      yachtCost, yachtSelling,
      mealCost, mealSelling,
      guideCost, guideSelling,
      otherCost, otherSelling,
      globalMarkupCost: 0,
      globalMarkupAmount,
      totalCost, totalSelling, markup,
      margin: parseFloat(margin.toFixed(2)),
      sellingPP: Math.round(sellingPP),
    };
  }, [quotation.days, quotation.adults, quotation.pricing]);

  const handleSave = useCallback(async (notify = true, expectedEditVersion = latestEditVersionRef.current) => {
    if (historyPreview) {
      if (notify) toast.error('Restore this historical version or return to the current quotation before saving.');
      return null;
    }
    // `clientView` was used by an earlier implementation. Omit it from every
    // save so client-PDF display choices cannot be written to the quotation.
    // Capture the exact edit generation being persisted.  If another edit
    // happens during the request, retaining the local draft is essential;
    // the newer generation will be saved immediately afterwards.
    const savedEditVersion = expectedEditVersion;
    const quotationDate = quotation.quotationDate || todayIsoInTimeZone();
    const quotationToPersist = {
      ...quotation,
      quotationDate,
      validUntil: quotation.validUntil || validUntilFromQuotationDate(quotationDate, quotationDefaultValidDays),
    };
    delete quotationToPersist.clientView;
    const isSavedChangeAwaitingRevision = quotation.id && isDirty && ['Accepted', 'Confirmed'].includes(quotation.status);
    const toSave = isSavedChangeAwaitingRevision ? {
      ...quotationToPersist,
      pricing: recalcPricing,
      hasUnrevisedChanges: true,
      pendingRevisionSavedAt: new Date().toISOString(),
    } : { ...quotationToPersist, pricing: recalcPricing };
    try {
      const isNewQuotation = !(existing || quotation.id);
      const saved = isNewQuotation ? await addQuotation(toSave) : await updateQuotation(quotation.id || id, toSave);
      const hasNewerChanges = latestEditVersionRef.current !== savedEditVersion;
      setQuotation((current) => {
        if (!hasNewerChanges) return saved;
        // A new quotation needs its generated id right away so its next
        // autosave updates the same record rather than creating a duplicate.
        return isNewQuotation && saved?.id ? { ...current, id: saved.id } : current;
      });
      if (!hasNewerChanges) {
        dirtyRef.current = false;
        setIsDirty(false);
        setAutoSaveState('saved');
      }
      // A saved quotation created from a query used to remain at
      // `/quotations/new?query=...`. Refreshing that URL correctly loaded the
      // query, but incorrectly rebuilt an empty draft. Move to the saved
      // record URL as soon as it is created so reloads always fetch the same
      // persisted quotation.
      if (isNewQuotation && saved?.id) navigate(`/quotations/${encodeURIComponent(saved.id)}`, { replace: true });
      if (notify) toast.success(isSavedChangeAwaitingRevision ? 'Changes saved. Create a revision before they can affect the booking.' : (existing || quotation.id ? 'Quotation saved!' : 'Quotation created!'));
      return saved;
    } catch (error) { if (notify) toast.error(error.message); return null; }
  }, [addQuotation, existing, historyPreview, id, isDirty, navigate, quotation, quotationDefaultValidDays, recalcPricing, updateQuotation]);

  useEffect(() => {
    if (!isDirty || historyPreview || planningItinerary || autoSaveState === 'saving') return undefined;
    if (autoSavePromiseRef.current) return undefined;
    if (failedAutoSaveVersionRef.current === editVersion) return undefined;

    const scheduledEditVersion = editVersion;
    autoSaveTimerRef.current = window.setTimeout(() => {
      if (!dirtyRef.current || latestEditVersionRef.current !== scheduledEditVersion || historyPreview || planningItinerary) return;
      setAutoSaveState('saving');
      const savePromise = handleSave(false, scheduledEditVersion);
      autoSavePromiseRef.current = savePromise;
      savePromise.then((saved) => {
        if (!saved && latestEditVersionRef.current === scheduledEditVersion) {
          failedAutoSaveVersionRef.current = scheduledEditVersion;
          setAutoSaveState('error');
        } else if (latestEditVersionRef.current !== scheduledEditVersion) {
          setAutoSaveState('pending');
        }
      }).finally(() => {
        if (autoSavePromiseRef.current === savePromise) {
          autoSavePromiseRef.current = null;
          // An edit can arrive while a save is in flight. Trigger the next
          // debounce only after this response has settled so requests remain
          // ordered and an older response cannot overwrite a newer draft.
          setAutoSaveTick((tick) => tick + 1);
        }
      });
    }, 700);

    return () => {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    };
  }, [autoSaveState, autoSaveTick, editVersion, handleSave, historyPreview, isDirty, planningItinerary]);

  // Actions such as emailing, accepting, booking and creating a revision must
  // always operate on the newest persisted draft.  Clearing the debounce and
  // flushing it here prevents a delayed autosave from racing a revision.
  const flushQuotationAutosave = async () => {
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    let completedAutoSave = null;
    if (autoSavePromiseRef.current) completedAutoSave = await autoSavePromiseRef.current;
    if (!dirtyRef.current) return completedAutoSave || quotation;
    setAutoSaveState('saving');
    const saved = await handleSave(false, latestEditVersionRef.current);
    if (!saved) setAutoSaveState('error');
    return saved;
  };

  const startQuotationEmail = async () => {
    if (historyPreview) {
      toast.error('Restore this historical version or return to the current quotation before sending it.');
      return;
    }
    setSendPickerOpen(false);
    const saved = isDirty || !quotation.id || autoSavePromiseRef.current ? await flushQuotationAutosave() : quotation;
    if (!saved?.id) return;
    let templates = [];
    try { templates = (await apiClient.get('/pdf-templates?documentType=quotation')).data || []; } catch { templates = []; }
    const selectedTemplateId = templates.find((template) => template.isDefault)?.id || templates[0]?.id || 'standard';
    setQuotation(saved);
    setEmailTemplates(templates);
    setEmailTemplateId(selectedTemplateId);
    setEmailAttachment(null);
    setPreparingEmailPdf(true);
    setEmailComposerOpen(true);
    setViewMode('client');
    setActiveTab('preview');
    setEmailPdfRequest((request) => request + 1);
  };

  const startQuotationWhatsApp = async () => {
    if (historyPreview) {
      toast.error('Restore this historical version or return to the current quotation before sending it.');
      return;
    }
    setSendPickerOpen(false);
    const saved = isDirty || !quotation.id || autoSavePromiseRef.current ? await flushQuotationAutosave() : quotation;
    if (!saved?.id) return;
    let templates = [];
    try { templates = (await apiClient.get('/pdf-templates?documentType=quotation')).data || []; } catch { templates = []; }
    const enabledTemplates = templates.filter((template) => template.isEnabled !== false);
    const selectedTemplateId = enabledTemplates.find((template) => template.isDefault)?.id || enabledTemplates[0]?.id || '';
    setQuotation(saved);
    setWhatsappTemplates(enabledTemplates);
    setWhatsappTemplateId(selectedTemplateId);
    setWhatsappAttachment(null);
    setPreparingWhatsappPdf(true);
    setWhatsappComposerOpen(true);
    setViewMode('client');
    setActiveTab('preview');
    setWhatsappPdfRequest((request) => request + 1);
  };

  const changeEmailTemplate = (templateId) => {
    setEmailTemplateId(templateId);
    setEmailAttachment(null);
    setPreparingEmailPdf(true);
    setEmailPdfRequest((request) => request + 1);
  };

  const changeWhatsappTemplate = (templateId) => {
    setWhatsappTemplateId(templateId);
    setWhatsappAttachment(null);
    setPreparingWhatsappPdf(true);
    setWhatsappPdfRequest((request) => request + 1);
  };

  const handleEmailPdfReady = useCallback((attachment) => {
    setPreparingEmailPdf(false);
    if (attachment?.error) {
      setEmailAttachment(null);
      toast.error(attachment.error);
      return;
    }
    setEmailAttachment(attachment);
  }, []);

  const handleWhatsappPdfReady = useCallback((attachment) => {
    setPreparingWhatsappPdf(false);
    if (attachment?.error) {
      setWhatsappAttachment(null);
      toast.error(attachment.error);
      return;
    }
    setWhatsappAttachment(attachment);
  }, []);

  const handleConvertToBooking = async () => {
    if (historyPreview) {
      toast.error('Restore this historical version or return to the current quotation before booking.');
      return;
    }
    if (quotation.hasUnrevisedChanges) {
      toast.error('Create and accept a revision before booking these saved changes.');
      return;
    }
    const savedQuotation = await flushQuotationAutosave();
    if (!savedQuotation) return;
    try {
      const booking = await convertQuotationToBooking(savedQuotation.id);
      toast.success(`Booking ${booking.id} created!`);
      navigate(`/bookings/${booking.id}`);
    } catch (error) { toast.error(error.message); }
  };

  const handleCreateRevision = async () => {
    if (historyPreview) {
      toast.error('Restore this historical version or return to the current quotation before creating a revision.');
      return;
    }
    const quotationToRevise = await flushQuotationAutosave();
    if (!quotationToRevise?.id) {
      toast.error('Save the quotation before creating a revision.');
      return;
    }
    const revisionPricing = quotationToRevise.pricing || recalcPricing;
    const newVersions = [...(quotationToRevise.versions || []), {
      version: quotationToRevise.version,
      createdAt: new Date().toISOString(),
      sellingPrice: revisionPricing.totalSelling,
      notes: `Version ${quotationToRevise.version}`,
      snapshot: quotationRevisionSnapshot(quotationToRevise, revisionPricing),
    }];
    const nextVersion = Math.max(Number(quotationToRevise.version || 1), ...newVersions.map((entry) => Number(entry.version || 0))) + 1;
    const revision = { ...quotationToRevise, pricing: revisionPricing, version: nextVersion, versions: newVersions, status: 'Revised', hasUnrevisedChanges: false, pendingRevisionSavedAt: null };
    try {
      const saved = await updateQuotation(quotationToRevise.id, revision);
      setQuotation(saved);
      dirtyRef.current = false;
      setIsDirty(false);
      setAutoSaveState('saved');
      toast.success(`Revision V${saved.version} saved. Accept it to update the booking.`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleAcceptRevision = async () => {
    if (historyPreview) {
      toast.error('Restore this historical version or return to the current quotation before accepting it.');
      return;
    }
    const saved = isDirty || autoSavePromiseRef.current ? await flushQuotationAutosave() : quotation;
    if (!saved?.id) return;
    try {
      const accepted = await acceptQuotationRevision(saved.id);
      setQuotation(accepted.quotation);
      dirtyRef.current = false;
      setIsDirty(false);
      setAutoSaveState('saved');
      toast.success(accepted.booking ? `Revision V${accepted.quotation.version} accepted and booking updated.` : 'Quotation accepted.');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const previewHistoricalVersion = (entry) => {
    if (dirtyRef.current || autoSavePromiseRef.current) {
      toast.error('Wait for automatic saving to finish before opening a historical version.');
      return;
    }
    if (!entry?.snapshot) {
      toast.error(`V${entry?.version} does not contain a restorable snapshot.`);
      return;
    }
    if (!liveQuotationBeforePreview) setLiveQuotationBeforePreview(copyQuotation(quotation));
    setQuotation((current) => ({
      ...current,
      ...copyQuotation(entry.snapshot),
      id: current.id,
      queryId: current.queryId,
      bookingId: current.bookingId,
      version: current.version,
      versions: current.versions,
      status: current.status,
    }));
    setHistoryPreview(entry);
    dirtyRef.current = false;
    setIsDirty(false);
    setAutoSaveState('saved');
    setActiveTab('itinerary');
  };

  const returnToCurrentQuotation = () => {
    if (liveQuotationBeforePreview) setQuotation(liveQuotationBeforePreview);
    setHistoryPreview(null);
    setLiveQuotationBeforePreview(null);
    dirtyRef.current = false;
    setIsDirty(false);
    setAutoSaveState('saved');
  };

  const restoreHistoricalVersion = async (entry) => {
    if (!entry?.snapshot) {
      toast.error(`V${entry?.version} does not contain a restorable snapshot.`);
      return;
    }
    const quotationToRestore = await flushQuotationAutosave();
    if (!quotationToRestore?.id) return;
    if (!window.confirm(`Restore V${entry.version}?${quotationToRestore.bookingId ? ' The linked booking will be updated to this quotation version.' : ''}`)) return;
    try {
      const restored = await restoreQuotationRevision(quotationToRestore.id, entry.version);
      setQuotation(restored.quotation);
      setHistoryPreview(null);
      setLiveQuotationBeforePreview(null);
      dirtyRef.current = false;
      setIsDirty(false);
      setAutoSaveState('saved');
      toast.success(restored.booking ? `V${entry.version} restored and booking ${restored.booking.id} updated.` : `V${entry.version} restored. Accept it when you are ready to book.`);
    } catch (error) { toast.error(error.message); }
  };

  const statusColors = {
    Draft: 'badge-gray', Sent: 'badge-blue', 'Follow-up': 'badge-yellow',
    Revised: 'badge-purple', Accepted: 'badge-green', Confirmed: 'badge-green', Cancelled: 'badge-red'
  };
  const linkedBooking = quotation.bookingId ? { id: quotation.bookingId } : null;
  const b2cMode = quotation.clientType === 'B2C' || sourceQuery?.clientType === 'B2C';
  const selectedB2cId = quotation.b2cId || (quotation.clientType === 'B2C' ? quotation.agentId : '');
  const selectedB2cClient = b2cClients.find((client) => client.id === selectedB2cId);
  const pendingHotelAvailability = (quotation.days || []).flatMap((day) => day.services || [])
    .some((service) => service.type === 'Hotel' && service.availabilityStatus !== 'Available');

  return (
    <div className="flex flex-col h-full print-area">
      <QuotationPdfSettingsModal
        isOpen={pdfSettingsOpen}
        settings={clientPdfSettings}
        onClose={() => setPdfSettingsOpen(false)}
        onPreviewChange={setClientPdfSettings}
        onApply={(settings) => {
          setClientPdfSettings(settings);
          setPdfSettingsOpen(false);
        }}
      />
      <Modal
        isOpen={Boolean(agentShareLink)}
        onClose={() => setAgentShareLink('')}
        title="Agent quotation link"
        size="md"
        footer={<><button onClick={() => setAgentShareLink('')} className="btn-secondary">Close</button><button onClick={copyAgentShareLink} className="btn-primary"><Copy className="h-4 w-4" /> Copy link</button></>}
      >
        <div className="space-y-3 text-sm text-slate-600">
          <p>Share this read-only link with the agent. They can change only their displayed logo and local markup before downloading their PDF. Your original quotation, pricing, logo and revisions cannot be changed.</p>
          <input readOnly value={agentShareLink} onFocus={(event) => event.currentTarget.select()} className="form-input font-mono text-xs" aria-label="Agent quotation link" />
          <a href={agentShareLink} target="_blank" rel="noreferrer" className="inline-flex text-xs font-bold text-blue-700 hover:underline">Open agent view</a>
        </div>
      </Modal>
      {sendPickerOpen && <QuotationSendPicker onClose={() => setSendPickerOpen(false)} onEmail={startQuotationEmail} onWhatsApp={startQuotationWhatsApp} />}
      {whatsappComposerOpen && <WhatsAppSendDialog
        title="Send quotation by WhatsApp"
        recipientName={b2cMode ? selectedB2cClient?.name || quotation.b2cName || quotation.guestName : agents.find((agent) => agent.id === quotation.agentId)?.name || quotation.agentName || quotation.guestName}
        recipientPhone={b2cMode
          ? selectedB2cClient?.phone || selectedB2cClient?.mobile || selectedB2cClient?.mobileNumber || quotation.guests?.[0]?.phone || sourceQuery?.mobileNumber || ''
          : agents.find((agent) => agent.id === quotation.agentId)?.phone || agents.find((agent) => agent.id === quotation.agentId)?.mobile || quotation.guests?.[0]?.phone || sourceQuery?.mobileNumber || ''}
        initialMessage={'Hello ' + (quotation.guestName || quotation.agentName || '') + ', your TripNest quotation ' + (quotation.id || '') + ' is ready. Please contact us if you need any changes.'}
        attachment={whatsappAttachment}
        preparingAttachment={preparingWhatsappPdf}
        requireAttachment
        pdfTemplates={whatsappTemplates}
        selectedPdfTemplateId={whatsappTemplateId}
        onPdfTemplateChange={changeWhatsappTemplate}
        onClose={() => { setWhatsappComposerOpen(false); setPreparingWhatsappPdf(false); }}
      />}
      {emailComposerOpen && <QuotationEmailComposer
        quotation={quotation}
        recipient={{
          type: b2cMode ? 'B2C' : 'Agent',
          id: b2cMode ? selectedB2cId : quotation.agentId,
          name: b2cMode ? selectedB2cClient?.name || quotation.b2cName || quotation.agentName : quotation.agentName,
          email: b2cMode ? selectedB2cClient?.email || quotation.recipientEmail : quotation.recipientEmail,
        }}
        attachment={emailAttachment}
        preparingAttachment={preparingEmailPdf}
        templates={emailTemplates}
        selectedTemplateId={emailTemplateId}
        onTemplateChange={changeEmailTemplate}
        onClose={() => setEmailComposerOpen(false)}
        onSent={(log) => { setQuotationEmailLogs((current) => [log, ...current.filter((item) => item.id !== log.id)]); setEmailComposerOpen(false); }}
        onAfterAttempt={loadQuotationEmailLogs}
      />}
      {emailLogsOpen && <QuotationEmailHistory logs={quotationEmailLogs} onClose={() => setEmailLogsOpen(false)} />}
      {historyPreview && <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900">Previewing historical V{historyPreview.version}. This is read-only until restored. <button type="button" onClick={returnToCurrentQuotation} className="ml-2 underline">Return to current V{liveQuotationBeforePreview?.version}</button></div>}
      {/* Header & Actions */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-2.5 sm:px-4 py-1.5 flex-shrink-0 flex items-center justify-between gap-x-3 gap-y-1.5 flex-wrap lg:flex-nowrap no-print lg:overflow-x-auto shadow-[0_2px_10px_rgb(0,0,0,0.02)] z-20">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 lg:shrink-0">
          <button onClick={() => navigate('/app/quotations')} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-[#0e8a85] hover:bg-blue-50 rounded-full transition-all border border-transparent hover:border-blue-100">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#10b981] to-[#047857] flex items-center justify-center text-white shadow-sm shadow-emerald-500/20 flex-shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="text-[13px] font-extrabold text-slate-900 leading-none">
                  QUOTATION
                </h1>
                <span className="px-1.5 py-0.5 rounded-sm bg-[#eff6ff] text-[#0e8a85] text-[9px] font-bold tracking-wider uppercase border border-blue-200 shadow-sm">{quotation.id || 'NEW'}</span>
                <span className="text-[10px] font-semibold text-slate-400">V{quotation.version}</span>
                <span className={`badge ${statusColors[quotation.status] || 'badge-gray'} ml-0.5 py-0.5 px-1.5 text-[9px] shadow-sm`}>{quotation.status}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {quotation.queryId && (
                  <button
                    onClick={() => navigate(`/queries/${quotation.queryId}`)}
                    className="text-[10px] text-[#0e8a85] hover:text-[#0b6f6b] hover:underline font-medium"
                    title="Open source query"
                  >
                    Source: {quotation.queryId}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap lg:flex-nowrap lg:shrink-0 w-full lg:w-auto">
          {/* View toggle */}
          {!agentPortal && <div className="flex items-center rounded-md border border-slate-200 p-0.5 bg-slate-50 shadow-sm">
            <button
              onClick={() => setViewMode('internal')}
              className={`px-2 py-1 text-[10px] font-bold rounded-[4px] transition-all ${viewMode === 'internal' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              Internal
            </button>
            <button
              onClick={() => setViewMode('client')}
              className={`px-2 py-1 text-[10px] font-bold rounded-[4px] transition-all ${viewMode === 'client' ? 'bg-[#0e8a85] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <span className="sm:hidden">Client</span><span className="hidden sm:inline">Client Preview</span>
            </button>
          </div>}

          {viewMode === 'client' && (
            <button
              type="button"
              onClick={() => updateClientPdfSettings({ showPrice: !clientPdfSettings.showPrice })}
              className={`px-2 py-1 text-[10px] font-bold rounded border shadow-sm transition-all ${clientPdfSettings.showPrice ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              title="Show or hide the package price in Client Preview, client PDFs, and client email attachments"
            >
              Price: {clientPdfSettings.showPrice ? 'On' : 'Off'}
            </button>
          )}

          <div className="hidden sm:block w-px h-5 bg-slate-200 mx-0.5" />

          <div
            role="status"
            aria-live="polite"
            title={autoSaveState === 'error' ? 'The latest edit could not be saved. Change a field again to retry automatically.' : autoSaveState === 'saving' ? 'Saving quotation changes automatically' : isDirty ? 'Changes are queued to save automatically' : 'All quotation changes are saved automatically'}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-bold shadow-sm ${autoSaveState === 'error' ? 'border-red-200 bg-red-50 text-red-700' : autoSaveState === 'saving' ? 'border-blue-200 bg-blue-50 text-blue-700' : isDirty ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
          >
            {autoSaveState === 'saving' ? <Loader2 className="w-3 h-3 animate-spin" /> : autoSaveState === 'error' ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
            {autoSaveState === 'saving' ? 'Saving…' : autoSaveState === 'error' ? 'Save failed' : isDirty ? 'Changes queued' : 'Saved'}
          </div>
          
          <button title={quotation.hasUnrevisedChanges ? 'Saved changes require a revision before they affect Booking' : 'Create and save a new quotation revision'} onClick={handleCreateRevision} className={`flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all ${quotation.hasUnrevisedChanges ? 'border-yellow-400 text-yellow-700 bg-yellow-50 hover:bg-yellow-100' : ''}`}>
            <RefreshCw className="w-3 h-3 text-slate-400" /> <span className="hidden sm:inline">{quotation.hasUnrevisedChanges ? 'Revision*' : 'Revision'}</span>{quotation.hasUnrevisedChanges && <span className="sm:hidden">*</span>}
          </button>

          {quotation.versions?.length > 0 && <button type="button" onClick={() => setShowVersions(true)} title="Preview or restore a previous quotation version" className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-300 rounded text-[10px] font-bold text-amber-800 hover:bg-amber-100 shadow-sm transition-all">
            <RotateCcw className="w-3 h-3" /> <span className="hidden sm:inline">Restore</span>
          </button>}

          <button onClick={() => setSendPickerOpen(true)} className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all">
            <Send className="w-3 h-3 text-slate-400" /> Send
          </button>
          
          {quotation.id && <button onClick={() => setEmailLogsOpen(true)} className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 shadow-sm transition-all">
            <History className="w-3 h-3" /> <span className="hidden sm:inline">Mail </span>({quotationEmailLogs.length})
          </button>}
          
          <button onClick={() => { setViewMode('client'); setActiveTab('preview'); setPdfSettingsOpen(true); }} title="Configure this quotation's client PDF" className="flex items-center gap-1 px-2 py-1 bg-purple-50 border border-purple-200 rounded text-[10px] font-bold text-purple-700 hover:bg-purple-100 shadow-sm transition-all">
            <Settings className="w-3 h-3" /> <span className="hidden sm:inline">PDF Settings</span>
          </button>
          {quotation.id && (
            <button onClick={() => navigate('/app/documents/pdf-template-settings')} title="Manage shared PDF templates" className="flex items-center gap-1 px-2 py-1 bg-violet-50 border border-violet-200 rounded text-[10px] font-bold text-violet-700 hover:bg-violet-100 shadow-sm transition-all">
              <Palette className="w-3 h-3" /> <span className="hidden sm:inline">Template</span>
            </button>
          )}
          
          <button onClick={requestConfiguredPdfDownload} className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-[10px] font-bold text-blue-700 hover:bg-blue-100 shadow-sm transition-all">
            <Download className="w-3 h-3" /> PDF
          </button>

          {(quotation.status === 'Accepted' || quotation.status === 'Confirmed') && (
            <button onClick={() => linkedBooking ? toast.error(`This quotation is already booked as ${linkedBooking.id}.`) : handleConvertToBooking()} className="ml-auto lg:ml-0 flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#10b981] to-[#059669] text-white rounded text-[10px] font-bold hover:from-[#059669] hover:to-[#047857] shadow-sm shadow-emerald-500/25 transition-all">
              <BookOpen className="w-3 h-3" /> {linkedBooking ? 'Already Booked' : 'Book'}
            </button>
          )}
          {quotation.status !== 'Accepted' && quotation.status !== 'Confirmed' && (
            <button
              onClick={handleAcceptRevision}
              disabled={pendingHotelAvailability}
              title={pendingHotelAvailability ? 'Mark Every Selected Hotel Stay Available In Hotel Availability Before Accepting.' : 'Accept Quotation'}
              className="ml-auto lg:ml-0 flex items-center gap-1.5 px-3 py-1 bg-[#1e293b] text-white rounded text-[10px] font-bold hover:bg-black shadow-sm shadow-slate-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BookOpen className="w-3 h-3" /> Accept
            </button>
          )}
        </div>
      </div>

      {/* Editable Quotation Info Bar */}
      {viewMode === 'internal' && (
        <div className="bg-white border-b border-slate-200 px-2.5 sm:px-4 py-1.5 flex-shrink-0 no-print max-h-[60vh] overflow-y-auto md:max-h-none md:overflow-visible">
          <button type="button" onClick={() => setInfoOpen((open) => !open)} className="md:hidden w-full flex items-center justify-between gap-2 text-left py-0.5" aria-expanded={infoOpen}>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-800 truncate">{quotation.guestName || 'Guest not set'} · {quotation.destination || 'Destination'}</div>
              <div className="text-[10px] font-medium text-slate-500 truncate">{formatDate(quotation.travelDate) || '—'} → {formatDate(quotation.endDate) || '—'} · {quotation.adults || 0}A {quotation.children || 0}C · {quotation.rooms || 0} rm</div>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-primary-600 shrink-0">{infoOpen ? 'Hide' : 'Edit details'}<ChevronDown className={`w-3.5 h-3.5 transition-transform ${infoOpen ? 'rotate-180' : ''}`} /></span>
          </button>
          <div className={`${infoOpen ? 'grid' : 'hidden'} grid-cols-6 gap-x-2 gap-y-1.5 mt-1.5 md:mt-0 md:flex md:items-end md:gap-2 md:flex-nowrap md:overflow-x-auto`}>

            {/* Agent */}
            <div className="col-span-3 md:col-span-1 md:shrink-0 md:w-[160px]">
              <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Agent</label>
              <select value={b2cMode ? quotation.salesAgentId || '' : quotation.agentId || ''} onChange={e => {
                const agent = availableAgents.find(a => a.id === e.target.value);
                updateQuot(b2cMode
                  ? { salesAgentId: e.target.value, salesAgentName: agent?.name || '' }
                  : { agentId: e.target.value, agentName: agent?.name || '', recipientEmail: agent?.email || '', clientType: 'Agent' });
              }} className="w-full text-[11px] h-7 md:h-6 px-1.5 rounded border border-slate-200 bg-white focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none transition-colors">
                <option value="">Select...</option>
                {availableAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            {b2cMode && <div className="col-span-3 md:col-span-1 md:shrink-0 md:w-[170px]">
              <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">B2C Client</label>
              <select value={selectedB2cId || ''} onChange={e => {
                const client = b2cClients.find((item) => item.id === e.target.value);
                updateQuot({ clientType: 'B2C', b2cId: e.target.value, b2cName: client?.name || '', agentId: e.target.value, agentName: client?.name || '', recipientEmail: client?.email || '' });
              }} className="w-full text-[11px] h-7 md:h-6 px-1.5 rounded border border-slate-200 bg-white focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none transition-colors">
                <option value="">Select B2C client...</option>
                {b2cClients.filter((client) => client.status !== 'Inactive').map((client) => <option key={client.id} value={client.id}>{client.name}{client.email ? ` · ${client.email}` : ''}</option>)}
              </select>
            </div>}

            {/* Guest */}
            <div className="col-span-3 md:col-span-1 md:shrink-0 md:w-[140px]">
              <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Guest</label>
              <input type="text" value={quotation.guestName || ''} onChange={e => {
                const name = e.target.value;
                const currentGuests = quotation.guests?.length ? quotation.guests : [{ id: 'guest-1', name: '', phone: '' }];
                updateQuot({ guestName: name, guests: currentGuests.map((guest, index) => index === 0 ? { ...guest, name } : guest) });
              }} className="w-full text-[11px] h-7 md:h-6 px-1.5 rounded border border-slate-200 bg-white focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none transition-colors" placeholder="Guest name" />
            </div>

            {/* Destination */}
            <div className={`${b2cMode ? 'col-span-3' : 'col-span-6'} md:col-span-1 md:shrink-0 md:w-[170px]`}>
              <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Destination</label>
              <input type="text" value={quotation.destination || ''} onChange={e => updateQuot({ destination: e.target.value })} className="w-full text-[11px] h-7 md:h-6 px-1.5 rounded border border-slate-200 bg-white focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none transition-colors" placeholder="Destination" />
            </div>

            {/* Travel */}
            <div className="col-span-2 md:col-span-1 md:shrink-0 md:w-[98px]">
              <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Travel</label>
              <DateInput compact value={quotation.travelDate || ''} onChange={(travelDate) => updateQuot({ travelDate, duration: durationFromTravelDates(travelDate, quotation.endDate) })} className="w-full text-[11px] h-7 md:h-6 px-1 rounded border border-slate-200 bg-white focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none transition-colors" ariaLabel="Travel date in DD-MM-YYYY format" />
            </div>

            {/* End */}
            <div className="col-span-2 md:col-span-1 md:shrink-0 md:w-[98px]">
              <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">End</label>
              <DateInput compact value={quotation.endDate || ''} min={quotation.travelDate || undefined} onChange={(endDate) => updateQuot({ endDate, duration: durationFromTravelDates(quotation.travelDate, endDate) })} className="w-full text-[11px] h-7 md:h-6 px-1 rounded border border-slate-200 bg-white focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none transition-colors" ariaLabel="End date in DD-MM-YYYY format" />
            </div>

            {/* Pax */}
            <div className="col-span-3 md:col-span-1 md:shrink-0 md:w-[72px]">
              <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Adults / Children</label>
              <div className="flex gap-0.5">
                <input type="number" value={quotation.adults ?? ''} onChange={e => updateQuot({ adults: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full text-[11px] h-7 md:h-6 px-0.5 rounded border border-slate-200 bg-white text-center focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none transition-colors" min="1" title="Adults" />
                <input type="number" value={quotation.children ?? ''} onChange={e => updateQuot({ children: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full text-[11px] h-7 md:h-6 px-0.5 rounded border border-slate-200 bg-white text-center focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none transition-colors" min="0" title="Children" />
              </div>
            </div>

            {/* Rooms */}
            <div className="col-span-3 md:col-span-1 md:shrink-0 md:w-[36px]">
              <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Rms</label>
              <input type="number" value={quotation.rooms ?? ''} onChange={e => updateQuot({ rooms: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full text-[11px] h-7 md:h-6 px-0.5 rounded border border-slate-200 bg-white text-center focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none transition-colors" min="1" />
            </div>

            {/* Valid Until */}
            <div className="col-span-2 md:col-span-1 md:shrink-0 md:w-[98px]">
              <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Valid Until</label>
              <DateInput compact value={quotation.validUntil || ''} onChange={(validUntil) => updateQuot({ validUntil })} className="w-full text-[11px] h-7 md:h-6 px-1 rounded border border-slate-200 bg-white focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none transition-colors" ariaLabel="Valid-until date in DD-MM-YYYY format" />
            </div>

            {/* Divider */}
            <div className="hidden md:block shrink-0 w-px h-8 bg-slate-200 mx-1 self-end mb-0.5" />

            {/* Room Allocation */}
            <div className="col-span-6 md:hidden text-[8px] font-bold text-slate-400 uppercase tracking-widest -mb-0.5 mt-0.5">Room allocation</div>
            {[['sgl', 'SGL'], ['dbl', 'DBL'], ['adultExtraBed', 'EXB'], ['cwb', 'CWB'], ['cnb', 'CNB'], ['inf', 'INF']].map(([key, label]) => (
              <div key={key} className="col-span-1 md:shrink-0 md:w-[40px]">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 text-center">{label}</label>
                <input type="number" min="0" value={quotation.roomAllocation?.[key] || ''} onChange={e => updateRoomAllocation(key, e.target.value)} className="w-full text-[11px] h-7 md:h-6 px-0.5 rounded border border-slate-200 bg-white text-center focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none transition-colors" title={label} />
              </div>
            ))}

            {/* Child age badges */}
            {quotation.children > 0 && (
              <div className="col-span-6 flex flex-wrap md:flex-nowrap items-end gap-1 pb-0.5 md:ml-1">
                {Array.from({ length: Math.max(0, Number(quotation.children || 0)) }, (_, index) => {
                  const age = quotation.childAges?.[index];
                  const hasAge = age !== '' && age !== null && age !== undefined && Number.isFinite(Number(age));
                  return (
                    <span key={`child-detail-${index}`} className="rounded bg-blue-50 border border-blue-100 px-1 py-0.5 text-[9px] font-semibold text-blue-600 whitespace-nowrap" title={hasAge ? `Child ${index + 1}: ${age} years` : `Child ${index + 1}: age not entered`}>
                      C{index + 1}:{hasAge ? `${age}y` : '—'}
                    </span>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Tabs */}
        <div className="flex items-center gap-0 overflow-x-auto border-b -mb-px pt-1 no-print [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setViewMode(agentPortal || tab.id === 'preview' ? 'client' : 'internal');
              }}
              className={activeTab === tab.id ? 'tab-active' : 'tab-inactive'}
            >
              <span className="flex items-center gap-1.5">
                <tab.icon className="w-3.5 h-3.5" />
                <span className="sm:hidden">{tab.short || tab.label}</span><span className="hidden sm:inline">{tab.label}</span>
              </span>
            </button>
          ))}

          {/* Version history */}
          {quotation.versions?.length > 0 && (
            <button
              onClick={() => setShowVersions(!showVersions)}
              title="Preview or restore an earlier saved quotation version"
              className="ml-auto shrink-0 whitespace-nowrap flex items-center gap-1 px-2 sm:px-3 py-2 text-xs font-semibold text-amber-700 hover:text-amber-900"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restore / V{quotation.version} history <ChevronDown className={`w-3 h-3 transition-transform ${showVersions ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

      {/* Version history panel */}
      {showVersions && quotation.versions?.length > 0 && (
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 shadow-inner">
          <div className="mb-3 flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <div><b>Restore previous quotation details</b><span className="ml-1">Preview a version first, then restore it when it is correct.</span></div>
            <span className="text-[10px] font-semibold">Your current V{quotation.version} is saved to history before a restore.</span>
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Version History</div>
          <div className="space-y-2 max-w-3xl">
            {quotation.versions.map(v => (
              <div key={v.version} className="flex items-center justify-between text-sm bg-white rounded-lg px-4 py-2.5 border border-slate-200 shadow-sm">
                <span className="font-bold text-slate-800">V{v.version}</span>
                <span className="text-slate-500 flex-1 px-4">{v.notes}</span>
                <span className="font-bold text-slate-900 mx-4">฿{v.sellingPrice?.toLocaleString()}</span>
                <span className="text-slate-400 text-xs">{formatDate(v.createdAt)}</span>
                <div className="ml-3 flex gap-2">
                  <button type="button" onClick={() => previewHistoricalVersion(v)} disabled={!v.snapshot} className="btn-secondary h-7 px-2 text-[10px] disabled:opacity-40">Preview</button>
                  <button type="button" onClick={() => restoreHistoricalVersion(v)} disabled={!v.snapshot} className="inline-flex h-7 items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 text-[10px] font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-40"><RotateCcw className="h-3 w-3" /> Restore V{v.version}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'itinerary' && (
          <>
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <ItineraryBuilder
                  days={quotation.days}
                  onChange={updateDays}
                  quotation={quotation}
                  allowedServiceTypes={quotation.allowedServiceTypes}
                  viewMode={agentPortal ? 'client' : viewMode}
                  agentPortal={agentPortal}
                  planning={planningItinerary}
                  onUpdateQuotation={updateQuot}
                  aiWarnings={aiItineraryIssues}
                />
              </div>
              {/* Phones/tablets: the side pricing panel is hidden below lg, so keep the package total in reach. */}
              <div className="lg:hidden flex-shrink-0 flex items-center justify-between gap-3 px-3 py-2 bg-slate-900 text-white no-print">
                <div className="min-w-0">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">Total selling</div>
                  <div className="text-sm font-extrabold leading-tight mt-0.5">฿{Number(recalcPricing?.totalSelling || 0).toLocaleString()}</div>
                </div>
                <div className="text-[10px] font-medium text-slate-300 text-right leading-tight">
                  ฿{Math.round(Number(recalcPricing?.sellingPP || (Number(recalcPricing?.totalSelling || 0) / (Number(quotation.adults) || 1)))).toLocaleString()}<br />per adult
                </div>
                {!agentPortal && <button type="button" onClick={() => setActiveTab('pricing')} className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-[11px] font-bold">Pricing</button>}
              </div>
            </div>
            {/* AI itinerary is paused in the frontend. Do not delete: restore
                this panel when the feature is ready for use. */}
            {/* <ItineraryAiAssistant quotation={quotation} sourceQuery={sourceQuery || queries.find((query) => query.id === quotation.queryId)} onApplyPlan={applyAiItineraryPlan} onIssues={setAiItineraryIssues} onUpdateQuotation={updateQuot} /> */}
            {!agentPortal && <PricingPanel pricing={recalcPricing} quotation={quotation} viewMode={viewMode} />}
          </>
        )}

        {activeTab === 'pricing' && (
          <div className="flex-1 overflow-y-auto">
            <PricingFullView 
              pricing={recalcPricing} 
              quotation={quotation} 
              onUpdate={updatePricing} 
              onGeneratePDF={requestConfiguredPdfDownload}
            />
          </div>
        )}

        {activeTab === 'terms' && (
          <div className="flex-1 overflow-y-auto p-2 sm:p-6">
            <TermsEditor quotation={quotation} onChange={updateQuot} />
          </div>
        )}

        {activeTab === 'availability' && (
          <div className="flex-1 overflow-y-auto p-2 sm:p-5">
            <HotelAvailabilityTab quotation={quotation} onSelectedHotelStatus={(serviceId, status, notes = '') => setQuotation((current) => ({ ...current, days: (current.days || []).map((day) => ({ ...day, services: (day.services || []).map((service) => String(service.id) === String(serviceId) ? { ...service, availabilityStatus: status, availabilityNotes: notes } : service) })) }))} />
          </div>
        )}

        {activeTab === 'preview' && (
          <div className={`flex-1 overflow-y-auto transition-[padding] duration-200 ${pdfSettingsOpen ? 'pr-[390px]' : ''}`}>
            <QuotationPreview quotation={{ ...quotation, pricing: recalcPricing }} viewMode={viewMode} clientPriceVisible={clientPdfSettings.showPrice} clientPdfSettings={clientPdfSettings} pdfSettingsOpen={pdfSettingsOpen} downloadRequest={pdfDownloadRequest} emailPdfRequest={emailPdfRequest} whatsappPdfRequest={whatsappPdfRequest} emailTemplateId={emailTemplateId} whatsappTemplateId={whatsappTemplateId} onEmailPdfReady={handleEmailPdfReady} onWhatsAppPdfReady={handleWhatsappPdfReady} onShareTemplate={creatingAgentShareLink ? undefined : createAgentShareLink} />
          </div>
        )}
      </div>

    </div>
  );
}

const DEFAULT_QUOTATION_EMAIL_BODY = '<p>Thank you for choosing TripNest.</p><p>Please find your personalized travel quotation attached. We have prepared the itinerary to make your Thailand journey smooth and memorable.</p><p>If you would like any changes, simply reply to this email and our team will be happy to assist.</p><p>Warm regards,<br>TripNest Team</p>';
const mailDateTime = (value) => formatDateTime(value);

function QuotationPdfSettingsModal({ isOpen, settings, onPreviewChange, onApply, onClose }) {
  const [draft, setDraft] = useState(settings);
  useEffect(() => {
    if (!isOpen) return;
    setDraft(settings);
  }, [isOpen]);

  const updateDraft = (updates) => setDraft((current) => {
    const next = { ...current, ...updates };
    onPreviewChange?.(next);
    return next;
  });
  const footerGap = Number(draft.pdfFooterGapPercent ?? 10);
  const pageFill = Number(draft.pdfPageFillPercent ?? 90);
  const sideMargin = Number(draft.pdfSideMarginMm ?? 0);
  const topMargin = Number(draft.pdfTopMarginMm ?? 2);
  const contentScale = Number(draft.pdfContentScalePercent ?? 100);
  const maxContentScale = Math.max(75, Math.floor((1 - ((sideMargin * 2) / 210)) * 100));
  const highlightImageHeight = Number(draft.highlightImageHeight ?? 0);
  const highlightCardImageScale = Number(draft.highlightCardImageScalePercent ?? 100);
  const highlightCardsPerRow = Number(draft.highlightCardsPerRow ?? 4);
  const highlightCardGap = Number(draft.highlightCardGap ?? 8);
  const highlightCardContentPadding = Number(draft.highlightCardContentPadding ?? 8);
  const luxuryHeroImageHeight = Number(draft.luxuryHeroImageHeight ?? 195);

  const options = [
    { key: 'showPrice', label: 'Package price', note: 'Show the client package selling price.' },
    { key: 'showClientItinerary', label: 'Day-wise itinerary', note: 'Show the complete day-by-day journey.' },
    { key: 'showClientHotels', label: 'Hotel details', note: 'Show hotel cards and hotel services.' },
    { key: 'showClientSightseeing', label: 'Sightseeing & activities', note: 'Show sightseeing and activity services.' },
    { key: 'showClientMasterDescriptions', label: 'Master descriptions', note: 'Show descriptions and bullet points from the master.' },
  ];

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[390px] flex-col border-l border-slate-200 bg-white shadow-2xl no-print">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div><h3 className="text-sm font-extrabold text-slate-800">PDF Settings</h3><p className="mt-0.5 text-[10px] text-emerald-700">Updates live in the visible preview</p></div>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-100" title="Close settings"><X className="h-4 w-4" /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <p className="mb-4 text-xs leading-relaxed text-slate-500">Change any option and watch the preview beside this panel. The same settings are used for PDF download, print, and email attachment.</p>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-3">
        {options.map((option) => {
          const enabled = draft[option.key] !== false;
          return (
            <label key={option.key} className="flex cursor-pointer items-center gap-3 py-3">
              <input type="checkbox" checked={enabled} onChange={() => updateDraft({ [option.key]: !enabled })} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-800">{option.label}</span><span className="mt-0.5 block text-[10px] text-slate-500">{option.note}</span></span>
            </label>
          );
        })}
      </div>
      <section className="mt-4 overflow-hidden rounded-xl border border-blue-200 bg-blue-50/40">
        <div className="border-b border-blue-100 bg-blue-50 px-3 py-2.5">
          <h4 className="text-xs font-extrabold text-blue-950">Print & download layout</h4>
          <p className="mt-0.5 text-[10px] leading-relaxed text-blue-700">Keep each section whole, use the available page height, and leave only the selected space above the footer.</p>
        </div>
        <div className="space-y-4 p-3">
          <div className="rounded-lg border border-blue-100 bg-white p-2.5">
            <div className="mb-2 flex items-center justify-between gap-3"><div><div className="text-xs font-bold text-slate-800">Page rulers</div><p className="text-[10px] text-slate-500">The blue guide shows the safe area used by every template when you download or print.</p></div><span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-extrabold text-blue-700">mm</span></div>
            <div className="relative h-16 overflow-hidden rounded border border-slate-300 bg-slate-50">
              <div className="absolute inset-x-0 top-0 flex h-4 items-end justify-between border-b border-slate-300 px-1 text-[8px] font-bold text-slate-400">{[0, 5, 10, 15, 20].map((value) => <span key={value} className="relative before:absolute before:-top-1 before:left-1/2 before:h-2 before:border-l before:border-slate-400">{value}</span>)}</div>
              <div className="absolute bottom-1 border-2 border-dashed border-blue-500/80 bg-blue-50/30" style={{ top: `${8 + (topMargin * 1.45)}px`, left: `${4 + (sideMargin * 1.7)}px`, right: `${4 + (sideMargin * 1.7)}px` }} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block"><div className="mb-1 flex justify-between gap-2 text-[10px]"><span className="font-bold text-slate-700">Left & right</span><span className="font-extrabold text-blue-700">{sideMargin} mm</span></div><input type="range" min="0" max="20" step="1" value={sideMargin} onChange={(event) => updateDraft({ pdfSideMarginMm: Number(event.target.value) })} className="h-1.5 w-full cursor-pointer accent-blue-600" /></label>
              <label className="block"><div className="mb-1 flex justify-between gap-2 text-[10px]"><span className="font-bold text-slate-700">Top</span><span className="font-extrabold text-blue-700">{topMargin} mm</span></div><input type="range" min="0" max="20" step="1" value={topMargin} onChange={(event) => updateDraft({ pdfTopMarginMm: Number(event.target.value) })} className="h-1.5 w-full cursor-pointer accent-blue-600" /></label>
            </div>
            <label className="mt-3 block"><div className="mb-1 flex justify-between gap-2 text-[10px]"><span className="font-bold text-slate-700">Overall content size</span><span className="font-extrabold text-blue-700">{Math.min(contentScale, maxContentScale)}%</span></div><input type="range" min="75" max={maxContentScale} step="1" value={Math.min(contentScale, maxContentScale)} onChange={(event) => updateDraft({ pdfContentScalePercent: Number(event.target.value) })} className="h-1.5 w-full cursor-pointer accent-blue-600" /><p className="mt-1 text-[9px] text-slate-500">Applies to every quotation template. Use a smaller value to fit more complete content on a page.</p></label>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-3"><div><div className="text-xs font-bold text-slate-800">Footer space</div><p className="text-[10px] text-slate-500">Maximum blank space at the bottom of each PDF page.</p></div><span className="rounded bg-white px-2 py-1 text-[10px] font-extrabold text-blue-700 shadow-sm">{footerGap}%</span></div>
            <div className="grid grid-cols-4 gap-2">{[5, 10, 15, 20].map((value) => <button key={value} type="button" onClick={() => updateDraft({ pdfFooterGapPercent: value, pdfPageFillPercent: Math.min(pageFill, 100 - value) })} className={`rounded-lg border px-2 py-1.5 text-[10px] font-bold transition ${footerGap === value ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}>{value}%</button>)}</div>
          </div>
          <label className="block">
            <div className="mb-2 flex items-center justify-between gap-3"><span><span className="block text-xs font-bold text-slate-800">Use page height</span><span className="block text-[10px] text-slate-500">Enlarge compact pages while retaining the footer space above.</span></span><span className="rounded bg-white px-2 py-1 text-[10px] font-extrabold text-blue-700 shadow-sm">{pageFill}%</span></div>
            <input type="range" min="65" max={Math.max(65, 100 - footerGap)} step="1" value={Math.min(pageFill, 100 - footerGap)} onChange={(event) => updateDraft({ pdfPageFillPercent: Number(event.target.value) })} className="h-1.5 w-full cursor-pointer accent-blue-600" />
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5">
            <input type="checkbox" checked={draft.pdfKeepSectionsTogether !== false} onChange={(event) => updateDraft({ pdfKeepSectionsTogether: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <span className="min-w-0"><span className="block text-xs font-bold text-slate-800">Keep service cards and itinerary sections together</span><span className="mt-0.5 block text-[10px] text-slate-500">Move a card or section to the next page instead of splitting it halfway.</span></span>
          </label>
        </div>
      </section>
      <section className="mt-4 overflow-hidden rounded-xl border border-violet-200 bg-violet-50/40">
        <div className="border-b border-violet-100 bg-violet-50 px-3 py-2.5"><h4 className="text-xs font-extrabold text-violet-950">Card controls — all PDF templates</h4><p className="mt-0.5 text-[10px] text-violet-700">Change the shared card and cover dimensions. Every current template updates immediately, and future templates inherit the same shared card layout.</p></div>
        <div className="grid gap-4 p-3 sm:grid-cols-2">
          <div><div className="mb-2 text-xs font-bold text-slate-800">Cards per row</div><div className="grid grid-cols-3 gap-1.5">{[2, 3, 4].map((value) => <button key={value} type="button" onClick={() => updateDraft({ highlightCardsPerRow: value })} className={`rounded-lg border px-2 py-1.5 text-[10px] font-bold ${highlightCardsPerRow === value ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300'}`}>{value}</button>)}</div></div>
          <div><div className="mb-2 text-xs font-bold text-slate-800">Card image height</div><div className="grid grid-cols-4 gap-1.5">{[{ label: 'Auto', value: 0 }, { label: '80', value: 80 }, { label: '100', value: 100 }, { label: '120', value: 120 }].map((option) => <button key={option.value} type="button" onClick={() => updateDraft({ highlightImageHeight: option.value })} className={`rounded-lg border px-1 py-1.5 text-[10px] font-bold ${highlightImageHeight === option.value ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300'}`}>{option.label}</button>)}</div></div>
          <div><div className="mb-2 text-xs font-bold text-slate-800">Card spacing</div><div className="grid grid-cols-3 gap-1.5">{[4, 8, 12].map((value) => <button key={value} type="button" onClick={() => updateDraft({ highlightCardGap: value })} className={`rounded-lg border px-2 py-1.5 text-[10px] font-bold ${highlightCardGap === value ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300'}`}>{value}px</button>)}</div></div>
          <div><div className="mb-2 text-xs font-bold text-slate-800">Card text padding</div><div className="grid grid-cols-3 gap-1.5">{[6, 8, 12].map((value) => <button key={value} type="button" onClick={() => updateDraft({ highlightCardContentPadding: value })} className={`rounded-lg border px-2 py-1.5 text-[10px] font-bold ${highlightCardContentPadding === value ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300'}`}>{value}px</button>)}</div></div>
          <div className="sm:col-span-2"><div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs font-bold text-slate-800">Cover image height</span><span className="text-[10px] font-extrabold text-violet-700">{luxuryHeroImageHeight}px</span></div><div className="grid grid-cols-3 gap-1.5">{[150, 195, 240].map((value) => <button key={value} type="button" onClick={() => updateDraft({ luxuryHeroImageHeight: value })} className={`rounded-lg border px-2 py-1.5 text-[10px] font-bold ${luxuryHeroImageHeight === value ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300'}`}>{value}px</button>)}</div></div>
          <label className="sm:col-span-2 block"><div className="mb-1 flex justify-between gap-2 text-[10px]"><span className="font-bold text-slate-700">Card image size</span><span className="font-extrabold text-violet-700">{highlightCardImageScale}%</span></div><input type="range" min="70" max="140" step="1" value={highlightCardImageScale} onChange={(event) => updateDraft({ highlightCardImageScalePercent: Number(event.target.value) })} className="h-1.5 w-full cursor-pointer accent-violet-600" /></label>
        </div>
      </section>
      </div>
      <footer className="shrink-0 border-t border-slate-200 bg-white p-3"><button type="button" onClick={() => { onApply(draft); onClose(); }} className="btn-primary w-full justify-center"><Eye className="h-4 w-4" /> Keep settings and close</button></footer>
    </aside>
  );
}

function QuotationSendPicker({ onClose, onEmail, onWhatsApp }) {
  return <div className="modal-overlay z-50" onMouseDown={onClose}>
    <div className="modal-content max-w-md w-full p-0 overflow-hidden" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-100 p-4"><div className="grid h-10 w-10 place-items-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700"><Send className="h-5 w-5" /></div><div className="flex-1"><h3 className="text-sm font-extrabold text-slate-800">Send quotation</h3><p className="text-[11px] text-slate-500">Choose how to send the client-safe quotation.</p></div><button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"><X className="h-4 w-4" /></button></div>
      <div className="grid gap-3 p-4 sm:grid-cols-2"><button onClick={onEmail} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-100"><Mail className="h-6 w-6 text-emerald-700" /><div className="mt-3 text-sm font-extrabold text-emerald-900">Email</div><p className="mt-1 text-[11px] leading-relaxed text-emerald-800">Customize the message and send the PDF attachment.</p></button><button onClick={onWhatsApp} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-100"><MessageCircle className="h-6 w-6 text-emerald-700" /><div className="mt-3 text-sm font-extrabold text-emerald-900">WhatsApp</div><p className="mt-1 text-[11px] leading-relaxed text-emerald-800">Send the client-safe quotation PDF from the selected connected number.</p></button></div>
    </div>
  </div>;
}

function QuotationEmailComposer({ quotation, recipient, attachment, preparingAttachment, templates, selectedTemplateId, onTemplateChange, onClose, onSent, onAfterAttempt }) {
  const [subject, setSubject] = useState(`Your TripNest travel quotation - ${quotation.id || ''}`.trim());
  const [bodyHtml, setBodyHtml] = useState(DEFAULT_QUOTATION_EMAIL_BODY);
  const [ccMails, setCcMails] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [draftInfo, setDraftInfo] = useState(null);
  const [improving, setImproving] = useState(false);
  const recipientReady = Boolean(recipient?.id && recipient?.email);
  useEffect(() => {
    let active = true;
    apiClient.get(`/quotation-emails/${encodeURIComponent(quotation.id)}/draft`).then((result) => {
      const draft = result.data;
      if (!active || !draft?.bodyHtml) return;
      setSubject(draft.subject || `Your TripNest travel quotation - ${quotation.id}`);
      setBodyHtml(draft.bodyHtml);
      setDraftInfo(draft);
    }).catch(() => {}).finally(() => { if (active) setLoadingDraft(false); });
    return () => { active = false; };
  }, [quotation.id]);
  const improveWithAi = async () => {
    setImproving(true);
    try {
      const result = await apiClient.post('/ai/improve-email', {
        subject, bodyHtml, audience: recipient?.type === 'B2C' ? 'traveler / direct client' : 'travel agent',
        context: { quotationId: quotation.id, recipientName: recipient?.name, guestName: quotation.guestName, destination: quotation.destination, travelDate: quotation.travelDate, endDate: quotation.endDate },
      });
      setSubject(result.data.subject); setBodyHtml(result.data.bodyHtml);
      toast.success('AI improved the email draft. Review it before sending.');
    } catch (error) { toast.error(error.message); }
    finally { setImproving(false); }
  };
  const send = async () => {
    setSending(true);
    try {
      const result = await apiClient.post(`/quotation-emails/${encodeURIComponent(quotation.id)}/send`, { recipientType: recipient.type, recipientId: recipient.id, subject, bodyHtml, cc: ccMails, pdf: attachment });
      onSent(result.data);
      toast.success(`Quotation email sent to ${result.data.recipientEmail}.`);
    } catch (error) { toast.error(error.message); }
    finally { setSending(false); onAfterAttempt?.(); }
  };
  return <div className="modal-overlay z-50" onMouseDown={onClose}>
    <div className="modal-content max-w-3xl w-full p-0 overflow-hidden" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-100 p-4"><div className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700"><Mail className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h3 className="text-sm font-extrabold text-slate-800">Email quotation</h3><p className="truncate text-[11px] text-slate-500">{quotation.id} · Client-safe PDF attachment</p></div><button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"><X className="h-4 w-4" /></button></div>
      <div className="max-h-[72vh] space-y-4 overflow-y-auto p-4"><div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2"><div><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Recipient</div><div className="mt-1 text-sm font-bold text-slate-800">{recipient?.name || `Select ${recipient?.type === 'B2C' ? 'a B2C client' : 'an agent'}`}</div><div className="mt-0.5 text-[10px] font-semibold text-blue-700">{recipient?.type || 'Client'}</div></div><div><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Email address</div><div className={`mt-1 break-all text-sm font-bold ${recipient?.email ? 'text-slate-800' : 'text-amber-700'}`}>{recipient?.email || 'No email saved on the selected client'}</div></div></div>
        {!recipientReady && <p className="rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-800">Select the B2C client or agent and add a valid email address in its master record before sending.</p>}
        <label><span className="form-label">PDF template</span><select value={selectedTemplateId} onChange={(event) => onTemplateChange(event.target.value)} className="form-input"><option value="standard">Standard quotation</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}{template.isDefault ? ' (Default)' : ''}</option>)}</select><span className="mt-1 block text-[10px] text-slate-500">Choose the client-safe PDF layout to attach with this email.</span></label>
        <label><span className="form-label">Email subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} className="form-input" maxLength="240" /></label>
        <label><span className="form-label">Additional CC emails</span><input value={ccMails} onChange={(event) => setCcMails(event.target.value)} className="form-input" placeholder="accounts@agent.com, manager@agent.com" /><span className="mt-1 block text-[10px] text-slate-500">Other saved contacts for this agent are included in CC automatically. Add more addresses here, separated by commas.</span></label>
        <div><div className="mb-1 flex items-center justify-between gap-3"><span className="form-label mb-0">Message</span><div className="flex items-center gap-2"><span className="text-[10px] font-semibold text-slate-400">Editable text</span><button type="button" onClick={improveWithAi} disabled={improving || loadingDraft} className="inline-flex items-center gap-1 rounded border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-60"><Sparkles className={`h-3 w-3 ${improving ? 'animate-pulse' : ''}`} /> {improving ? 'Improving…' : 'Improve with AI'}</button></div></div>{loadingDraft ? <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">Loading the last sent email…</div> : <RichTextEditor value={bodyHtml} onChange={setBodyHtml} placeholder="Write a message to the client…" />}{draftInfo && <p className="mt-1 text-[10px] font-semibold text-emerald-700">Using the last successfully sent message · {mailDateTime(draftInfo.updatedAt)}</p>}</div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3"><div className="flex items-center gap-2 text-xs font-extrabold text-blue-800">{preparingAttachment ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}{preparingAttachment ? 'Preparing client-safe PDF attachment…' : attachment?.filename || 'PDF attachment pending'}</div><p className="mt-1 text-[11px] text-blue-700">The quotation ID, itinerary summary, travel dates, guests and package selling price are added automatically. Internal supplier costs and profit are never included.</p></div>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 bg-white p-3"><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={send} disabled={sending || preparingAttachment || !attachment?.base64 || !recipientReady} className="btn-primary disabled:opacity-60"><Mail className="h-4 w-4" /> {sending ? 'Sending...' : 'Send email with PDF'}</button></div>
    </div>
  </div>;
}


const DEFAULT_HOTEL_AVAILABILITY_BODY =
  '<p>Dear Sir/Madam,</p>' +
  '<p>Greetings from TripNest Co. Ltd.!</p>' +
  '<p>Kindly check availability for the room(s) and stay dates listed below. If available, please place a provisional hold for 24 hours and share the hold confirmation or reference.</p>' +
  '<p>If the requested stay is unavailable, please advise us immediately.</p>' +
  '<p>We look forward to your confirmation at your earliest convenience.</p>';

const quotationReference = (quotation = {}) => String(
  quotation.quotationNo || quotation.quotationNumber || quotation.id || '',
).trim();
const hotelAvailabilitySubject = (quotation = {}) => [
  String(quotation.guestName || quotation.guests?.[0]?.name || 'Guest')
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, ''),
  quotationReference(quotation),
].filter(Boolean).join('_');
const hotelAvailabilityEmailSubject = (quotation = {}) =>
  `Hotel Availability & 24-Hour Hold Request – ${hotelAvailabilitySubject(quotation)}`.trim();

function HotelAvailabilityTab({ quotation, onSelectedHotelStatus }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [subject, setSubject] = useState(hotelAvailabilityEmailSubject(quotation));
  const [bodyHtml, setBodyHtml] = useState(DEFAULT_HOTEL_AVAILABILITY_BODY);
  const [ccMails, setCcMails] = useState('');
  const [sending, setSending] = useState(false);
  const [improving, setImproving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRecipient, setPreviewRecipient] = useState(null);
  const load = async () => {
    if (!quotation?.id) { setData(null); return; }
    setLoading(true);
    try {
      const result = await apiClient.get(`/quotation-hotel-availability/${encodeURIComponent(quotation.id)}`);
      setData(result.data || null);
      setSelected((current) => current.filter((key) => (result.data?.rows || []).some((row) => row.key === key)));
    } catch (error) { toast.error(error.message || 'Could not load hotel availability.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [quotation?.id]);
  useEffect(() => {
    setSubject(hotelAvailabilityEmailSubject(quotation));
  }, [quotation?.id, quotation?.quotationNo, quotation?.quotationNumber, quotation?.guestName, quotation?.guests?.[0]?.name]);
  useEffect(() => {
    if (!composerOpen || !quotation?.id) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const result = await apiClient.post(`/quotation-hotel-availability/${encodeURIComponent(quotation.id)}/preview`, { bodyHtml, keys: selected });
        if (!cancelled) { setPreviewHtml(result.data?.html || ''); setPreviewRecipient(result.data || null); }
      } catch (error) {
        if (!cancelled) toast.error(error.message || 'Could not generate the email preview.');
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [bodyHtml, composerOpen, quotation?.id, selected]);
  const rows = data?.rows || [];
  const selectedStays = rows.filter((row) => row.selected);
  const canAccept = selectedStays.length > 0 && selectedStays.every((row) => row.status === 'Available');
  const recipientRows = (row) => rows.filter((item) => item.emailGroupKey === row.emailGroupKey);
  const selectedRecipientCount = new Set(rows.filter((row) => selected.includes(row.key)).map((row) => row.emailGroupKey)).size;
  const toggleRecipient = (row, checked) => {
    const keys = recipientRows(row).map((item) => item.key);
    setSelected((current) => checked ? [...new Set([...current, ...keys])] : current.filter((key) => !keys.includes(key)));
  };
  const updateStatus = async (row, status) => {
    if (status === 'Requested') {
      toast.error('Use Email Selected to request availability. This keeps the mail log accurate.');
      return;
    }
    try {
      const result = await apiClient.patch(`/quotation-hotel-availability/${encodeURIComponent(quotation.id)}/${encodeURIComponent(row.key)}`, { status, notes: row.notes || '' });
      setData(result.data || null);
      if (row.selected) onSelectedHotelStatus(row.serviceId, status, row.notes || '');
      toast.success(`${row.hotelName} marked ${status}.`);
    } catch (error) { toast.error(error.message); }
  };
  const improveWithAi = async () => {
    setImproving(true);
    try {
      const result = await apiClient.post('/ai/improve-email', { subject, bodyHtml, audience: 'hotel supplier', context: { quotationId: quotation.id, guestName: quotation.guestName, destination: quotation.destination, travelDate: quotation.travelDate, endDate: quotation.endDate } });
      setSubject(result.data.subject); setBodyHtml(result.data.bodyHtml); toast.success('AI improved the availability email.');
    } catch (error) { toast.error(error.message); } finally { setImproving(false); }
  };
  const send = async () => {
    setSending(true);
    try {
      const result = await apiClient.post(`/quotation-hotel-availability/${encodeURIComponent(quotation.id)}/send`, { keys: selected, subject, bodyHtml, cc: ccMails });
      setData(result.data || null);
      (result.data?.rows || []).filter((row) => row.selected && selected.includes(row.key)).forEach((row) => onSelectedHotelStatus(row.serviceId, row.status, row.notes || ''));
      setComposerOpen(false); setSelected([]); toast.success('Hotel availability emails have been processed.');
    } catch (error) { toast.error(error.message); } finally { setSending(false); }
  };
  if (!quotation?.id) return <div className="mx-auto max-w-3xl rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Save the quotation first, then send hotel availability requests.</div>;
  if (loading && !data) return <div className="py-12 text-center text-sm text-slate-500">Loading hotel availability…</div>;
  return <div className="mx-auto max-w-7xl space-y-3 sm:space-y-4">
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3"><div><h2 className="text-base font-extrabold text-slate-800 sm:text-lg">Hotel Supplier Availability</h2><p className="mt-1 text-[11px] leading-snug text-slate-500 sm:text-xs">Suppliers Are Identified By Their Unique Email Address And Active Hotel Master Rate Contracts. Selecting An Email Selects Every Hotel That Supplier Handles In That Destination, Then Sends One Combined Rate And Availability Request. Every Selected Hotel Stay Must Be Marked Available Before Quotation Acceptance.</p></div><div className="grid grid-cols-2 gap-2 sm:flex"><button onClick={() => setLogsOpen(true)} className="btn-secondary h-8 justify-center text-xs"><History className="h-3.5 w-3.5" /> Mail Logs ({data?.logs?.length || 0})</button><button onClick={() => setComposerOpen(true)} disabled={!selected.length} className="btn-primary h-8 justify-center text-xs disabled:opacity-50"><Mail className="h-3.5 w-3.5" /> Email Selected ({selectedRecipientCount})<span className="hidden sm:inline">&nbsp;Supplier{selectedRecipientCount === 1 ? '' : 's'}</span></button></div></div>
    <div className={`rounded-xl border px-3 py-2 text-[11px] font-semibold sm:p-3 sm:text-xs ${canAccept ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{canAccept ? 'All Selected Hotel Stays Are Available. This Quotation Can Now Be Accepted.' : `${selectedStays.filter((row) => row.status !== 'Available').length} Selected Hotel Stay(s) Still Require Availability Confirmation.`}</div>
    {selected.length > 0 && <label className="block rounded-xl border border-slate-200 bg-slate-50 p-3"><span className="form-label">Additional CC emails</span><input value={ccMails} onChange={(event) => setCcMails(event.target.value)} className="form-input" placeholder="reservations@hotel.com, manager@hotel.com" /><span className="mt-1 block text-[10px] text-slate-500">Other saved supplier or hotel contacts are CC’ed automatically. Add more addresses here, separated by commas.</span></label>}
    {!rows.length ? <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">No hotel stays are included in this quotation.</div> : <><div className="space-y-2 md:hidden">{rows.map((row) => { const sameRecipient = recipientRows(row); const recipientSelected = sameRecipient.every((item) => selected.includes(item.key)); return <div key={`m-${row.key}`} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm"><div className="flex items-start gap-2"><input type="checkbox" className="mt-1 shrink-0" checked={recipientSelected} disabled={!row.recipientEmail} onChange={(event) => toggleRecipient(row, event.target.checked)} title="Select this supplier email and every hotel it handles in this destination" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0 text-[13px] font-bold leading-tight text-slate-800">{row.hotelName}</div><span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${row.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : row.status === 'Unavailable' ? 'bg-red-100 text-red-700' : row.status === 'Requested' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{row.status}</span></div><div className="mt-0.5 text-[10px] text-slate-500">{[row.roomType, row.mealPlan, row.rooms ? `${row.rooms} room(s)` : ''].filter(Boolean).join(' · ')}</div></div></div><div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]"><div className="rounded-lg bg-slate-50 px-2 py-1"><div className="text-[9px] font-bold uppercase text-slate-400">Destination</div><div className="font-semibold text-slate-700">{row.destination || '—'}</div></div><div className="rounded-lg bg-slate-50 px-2 py-1"><div className="text-[9px] font-bold uppercase text-slate-400">Dates</div><div className="font-semibold text-slate-700">{formatDate(row.checkIn)} → {formatDate(row.checkOut)}</div></div></div><div className="mt-1.5 rounded-lg bg-slate-50 px-2 py-1 text-[11px]"><div className="text-[9px] font-bold uppercase text-slate-400">Supplier</div><div className="truncate font-semibold text-slate-700">{row.supplierName || row.hotelName}</div><div className={row.recipientEmail ? 'truncate text-[10px] text-slate-500' : 'text-[10px] text-red-600'}>{row.recipientEmail || 'No supplier email'}</div>{row.recipientEmail && <div className="text-[9px] font-semibold text-blue-700">Handles {row.supplierHotelCount} hotel{row.supplierHotelCount === 1 ? '' : 's'} in {row.destination || 'this destination'}</div>}</div><div className="mt-2 flex items-center justify-between gap-2"><div className="text-[9px] text-slate-400">{row.lastSentAt ? `Sent ${mailDateTime(row.lastSentAt)}` : 'Not requested yet'}</div><select value={row.status} onChange={(event) => updateStatus(row, event.target.value)} className="h-7 rounded border border-slate-200 bg-white px-2 text-[10px]"><option>Pending</option><option>Requested</option><option>Available</option><option>Unavailable</option></select></div></div>; })}</div><div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block"><table className="w-full text-xs"><thead className="bg-slate-800 text-white"><tr><th className="w-10 p-3"></th><th className="p-3 text-left">Hotel / stay</th><th className="p-3 text-left">Destination & dates</th><th className="p-3 text-left">Supplier email</th><th className="p-3 text-left">Status</th><th className="p-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => { const sameRecipient = recipientRows(row); const recipientSelected = sameRecipient.every((item) => selected.includes(item.key)); return <tr key={row.key} className="bg-blue-50/30"><td className="p-3 text-center"><input type="checkbox" checked={recipientSelected} disabled={!row.recipientEmail} onChange={(event) => toggleRecipient(row, event.target.checked)} title="Select this supplier email and every hotel it handles in this destination" /></td><td className="p-3"><div className="font-bold text-slate-800">{row.hotelName}</div><div className="mt-1 inline-block rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">SELECTED IN QUOTATION</div><div className="mt-1 text-[10px] text-slate-500">{[row.roomType, row.mealPlan, row.rooms ? `${row.rooms} room(s)` : ''].filter(Boolean).join(' · ')}</div></td><td className="p-3 text-slate-600"><div>{row.destination || '—'}</div><div className="mt-1 text-[10px]">{formatDate(row.checkIn)} to {formatDate(row.checkOut)}</div></td><td className="p-3"><div className="font-semibold text-slate-700">{row.supplierName || row.hotelName}</div><div className={row.recipientEmail ? 'mt-1 text-[10px] text-slate-500' : 'mt-1 text-[10px] text-red-600'}>{row.recipientEmail || 'No supplier email'}</div>{row.recipientEmail && <div className="mt-1 text-[9px] font-semibold text-blue-700">Handles {row.supplierHotelCount} hotel{row.supplierHotelCount === 1 ? '' : 's'} in {row.destination || 'this destination'}</div>}</td><td className="p-3"><span className={`rounded px-2 py-1 text-[10px] font-bold ${row.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : row.status === 'Unavailable' ? 'bg-red-100 text-red-700' : row.status === 'Requested' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{row.status}</span>{row.lastSentAt && <div className="mt-1 text-[9px] text-slate-400">Sent {mailDateTime(row.lastSentAt)}</div>}</td><td className="p-3 text-right"><select value={row.status} onChange={(event) => updateStatus(row, event.target.value)} className="h-7 rounded border border-slate-200 bg-white px-2 text-[10px]"><option>Pending</option><option>Requested</option><option>Available</option><option>Unavailable</option></select></td></tr>; })}</tbody></table></div></>}
    {composerOpen && <div className="modal-overlay z-50 !p-2 sm:!p-4" onMouseDown={() => setComposerOpen(false)}><div className="modal-content flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-5xl flex-col overflow-hidden p-0 sm:w-full" onMouseDown={(event) => event.stopPropagation()}><div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-100 p-3 sm:gap-3 sm:p-4"><div className="hidden h-10 w-10 place-items-center sm:grid rounded-xl bg-emerald-50 text-emerald-700"><Hotel className="h-5 w-5" /></div><div className="flex-1"><h3 className="text-sm font-extrabold text-slate-800">Request Hotel Availability</h3><p className="text-[11px] text-slate-500">{selectedRecipientCount} Unique Hotel Supplier{selectedRecipientCount === 1 ? '' : 's'} Will Receive This Request.</p></div><button onClick={() => setComposerOpen(false)} className="p-1 text-slate-400"><X className="h-4 w-4" /></button></div><div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-4"><div className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-[11px] text-blue-800 sm:p-3 sm:text-xs">The enquiry details, every hotel stay and night, sightseeing and transfer requirements are generated from this quotation when sent. Only the message below can be edited.</div><label><span className="form-label">Email Subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} className="form-input" /></label><div><div className="mb-1 flex items-center justify-between"><span className="form-label mb-0">Message</span><button type="button" onClick={improveWithAi} disabled={improving} className="inline-flex items-center gap-1 rounded border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700"><Sparkles className="h-3 w-3" /> {improving ? 'Improving…' : 'Improve with AI'}</button></div><RichTextEditor value={bodyHtml} onChange={setBodyHtml} /></div><div><div className="mb-1 flex items-center justify-between"><span className="form-label mb-0">Email Preview</span><span className="text-[10px] font-semibold text-slate-400">{previewRecipient?.recipientCount > 1 ? `Previewing ${previewRecipient.supplierEmail || 'the first supplier'} · each supplier receives only its own hotels` : previewRecipient?.supplierEmail ? `To: ${previewRecipient.supplierEmail}` : 'Automatic quotation details'}</span></div><div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">{previewLoading && !previewHtml ? <div className="grid h-28 place-items-center text-xs text-slate-500">Generating Email Preview…</div> : <iframe title="Hotel Availability Email Preview" sandbox="" srcDoc={previewHtml} className="h-[360px] w-full border-0 bg-white sm:h-[520px]" />}</div></div></div><div className="grid shrink-0 grid-cols-[auto_1fr] gap-2 border-t border-slate-200 bg-white p-2.5 sm:flex sm:justify-end sm:p-3"><button onClick={() => setComposerOpen(false)} className="btn-secondary justify-center">Cancel</button><button onClick={send} disabled={sending} className="btn-primary justify-center"><Mail className="h-4 w-4" /> {sending ? 'Sending…' : 'Send Availability Emails'}</button></div></div></div>}
    {logsOpen && <HotelAvailabilityLogModal logs={data?.logs || []} onClose={() => setLogsOpen(false)} />}
  </div>;
}

function HotelAvailabilityLogModal({ logs, onClose }) {
  const [selectedLog, setSelectedLog] = useState(logs[0] || null);
  const sentCount = logs.filter((log) => log.status === 'Sent').length;
  return <div className="drawer-overlay z-50" onMouseDown={onClose}><aside className="drawer-content flex h-full w-full max-w-[760px] flex-col sm:w-[40vw]" style={{ animation: 'slideInRight 180ms ease-out' }} onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center justify-between bg-[#173b70] px-4 py-3 text-white"><div className="flex items-center gap-2"><Mail className="h-4 w-4" /><div><h3 className="text-sm font-extrabold uppercase">Hotel availability mail logs</h3><p className="mt-0.5 text-[10px] font-semibold text-blue-100">{sentCount} sent · {logs.length} logged</p></div></div><button onClick={onClose} className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button></div><div className="min-h-0 flex-1 overflow-hidden bg-slate-50 p-3"><div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="max-h-[34%] overflow-y-auto border-b border-slate-200 bg-slate-50 p-2"><div className="flex gap-2 overflow-x-auto pb-1">{logs.map((log) => <button key={log.id} onClick={() => setSelectedLog(log)} className={`min-w-[220px] flex-1 border-l-4 px-3 py-2.5 text-left transition ${selectedLog?.id === log.id ? 'border-blue-600 bg-blue-50' : log.status === 'Sent' ? 'border-emerald-500 bg-white hover:bg-slate-100' : 'border-red-500 bg-red-50 hover:bg-red-100'}`}><div className="flex justify-between gap-2"><b className="text-[10px]">{log.status}</b><span className="whitespace-nowrap text-[9px] text-slate-400">{mailDateTime(log.sentAt)}</span></div><div className="mt-1 truncate text-[11px] font-bold">{log.hotelName}</div><div className="truncate text-[10px] text-slate-500">{log.supplierEmail}</div></button>)}</div>{!logs.length && <p className="p-5 text-center text-xs text-slate-400">No hotel availability emails have been sent yet.</p>}</div><section className="flex min-h-0 flex-1 flex-col">{selectedLog ? <><div className="border-b border-slate-200 bg-slate-50 p-4"><div className="text-xs font-bold">{selectedLog.subject}</div><div className="mt-1 text-[10px] text-slate-500">To: {selectedLog.supplierEmail}</div>{selectedLog.error && <div className="mt-2 text-xs text-red-600">{selectedLog.error}</div>}</div><iframe title={selectedLog.id} sandbox="" srcDoc={selectedLog.renderedHtml || ''} className="min-h-0 flex-1 w-full border-0" /></> : <div className="grid h-full place-items-center text-sm text-slate-400">Select a mail to preview it.</div>}</section></div></div></aside></div>;
}

function QuotationEmailHistory({ logs, onClose }) {
  const [selectedLog, setSelectedLog] = useState(logs[0] || null);
  const sentCount = logs.filter((log) => log.status === 'Sent').length;
  
  return (
    <div className="modal-overlay z-50 backdrop-blur-sm bg-slate-900/60 flex p-4" onMouseDown={onClose}>
      <div 
        className="modal-content max-w-5xl w-full mx-auto my-auto p-0 overflow-hidden shadow-2xl rounded-2xl bg-white border border-slate-200/50 flex flex-col" 
        style={{ height: '85vh' }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <Mail className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-[13px] font-extrabold uppercase tracking-wide">Quotation Mail Logs</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Client Quotation Email History</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-slate-300 hover:text-white transition-colors border border-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Body Container */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          
          {/* Sidebar - Email List */}
          <aside className="w-full md:w-[320px] flex flex-col border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50 shrink-0">
            <div className="p-4 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">Recipients</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold shadow-sm">
                  {sentCount} / {logs.length} Sent
                </span>
              </div>
            </div>
            
            <div className="p-3 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
              {!logs.length && (
                <div className="py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-5 h-5 text-slate-300" />
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500">No emails logged yet.</p>
                </div>
              )}
              {logs.map((log) => {
                const isSelected = selectedLog?.id === log.id;
                const isSent = log.status === 'Sent';
                return (
                  <button 
                    key={log.id} 
                    onClick={() => setSelectedLog(log)} 
                    className={`w-full p-3.5 rounded-xl text-left transition-all duration-200 border ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-500' 
                        : isSent 
                          ? 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm' 
                          : 'bg-red-50 border-red-200 hover:border-red-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider shadow-sm ${isSent ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {log.status}
                      </span>
                      <span className={`text-[9px] font-bold ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                        {mailDateTime(log.sentAt)}
                      </span>
                    </div>
                    <div className={`text-[12px] font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                      {log.recipientName}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5 mb-2 flex items-center gap-1 font-medium">
                      <Mail className="w-3 h-3" /> {log.recipientEmail}
                    </div>
                    <div className={`text-[10px] font-semibold truncate ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                      Subject: {log.subject}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
          
          {/* Main - Email Preview */}
          <section className="bg-white flex flex-col flex-1 min-w-0">
            {selectedLog ? (
              <>
                <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 shrink-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="text-[15px] font-extrabold text-slate-900 mb-2 truncate" title={selectedLog.subject}>{selectedLog.subject}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium truncate">
                        <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> To: {selectedLog.recipientEmail}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                        <span className="shrink-0">{mailDateTime(selectedLog.sentAt)}</span>
                      </div>
                    </div>
                    {selectedLog.attachmentName && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm shrink-0">
                        <FileText className="w-4 h-4 text-rose-500" />
                        <span className="text-[10px] font-bold text-slate-700 max-w-[150px] truncate" title={selectedLog.attachmentName}>{selectedLog.attachmentName}</span>
                      </div>
                    )}
                  </div>
                  {selectedLog.error && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2 shadow-sm">
                      <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-red-800">Email sending failed</div>
                        <div className="text-[11px] text-red-600 mt-0.5 font-medium">{selectedLog.error}</div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 bg-[#f8fafc] p-6 overflow-hidden flex flex-col">
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 z-10" />
                    <iframe 
                      title={`Quotation email ${selectedLog.id}`} 
                      sandbox="" 
                      srcDoc={selectedLog.renderedHtml || ''} 
                      className="w-full flex-1 border-0 custom-scrollbar" 
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <div className="w-20 h-20 rounded-[20px] bg-slate-50 border border-slate-100 flex items-center justify-center mb-5 shadow-sm">
                  <Mail className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-[15px] font-extrabold text-slate-800">Select an email to preview</p>
                <p className="text-[11px] text-slate-500 mt-1.5 font-medium">View the exact email content and PDF attachment</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function RoomAllocationInputs({ value = {}, onChange, compact = false }) {
  const fields = [
    ['sgl', 'SGL Room'], ['dbl', 'DBL Room'], ['adultExtraBed', 'Adult Extra Bed'],
    ['cwb', 'CWB Room'], ['cnb', 'CNB Room'], ['inf', 'INF Room'],
  ];
  return <div className={`grid grid-cols-2 ${compact ? 'md:grid-cols-6' : 'md:grid-cols-3'} gap-2`}>
    {fields.map(([key, label]) => <label key={key}>
      <span className="form-label mb-0.5 text-[9px] uppercase tracking-wider text-slate-500">{label}</span>
      <input type="number" min="0" value={value?.[key] || ''} onChange={(event) => onChange(key, event.target.value)} className="form-input h-8 text-xs" />
    </label>)}
  </div>;
}

function PricingFullView({ pricing, quotation, onUpdate, onGeneratePDF }) {
  const items = [
    { label: 'Hotels', costKey: 'hotelCost', sellKey: 'hotelSelling' },
    { label: 'Transfers', costKey: 'transferCost', sellKey: 'transferSelling' },
    { label: 'Sightseeing', costKey: 'sightseeingCost', sellKey: 'sightseeingSelling' },
    { label: 'Yachts', costKey: 'yachtCost', sellKey: 'yachtSelling' },
    { label: 'Meals', costKey: 'mealCost', sellKey: 'mealSelling' },
    { label: 'Guides', costKey: 'guideCost', sellKey: 'guideSelling' },
    { label: 'Other Services', costKey: 'otherCost', sellKey: 'otherSelling' },
    ...(pricing.globalMarkupAmount ? [{ label: 'Quotation markup', costKey: 'globalMarkupCost', sellKey: 'globalMarkupAmount' }] : []),
  ];

  const fmt = (n) => `฿${(n || 0).toLocaleString()}`;
  const profit = (pricing.totalSelling || 0) - (pricing.totalCost || 0);
  const margin = pricing.totalSelling > 0 ? ((profit / pricing.totalSelling) * 100).toFixed(2) : 0;
  const quotationMarkup = profit;

  return (
    <div className="p-2 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-6">
        <div className="p-2 bg-primary-50 rounded-lg">
          <DollarSign className="w-5 h-5 text-primary-600" />
        </div>
        <h2 className="text-base sm:text-xl font-bold text-slate-900">Pricing & Profit Analysis</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        {/* Cost table */}
        <div className="lg:col-span-6">
          <div className="card overflow-hidden shadow-sm h-full">
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800">Cost Breakdown</h3>
              <div className="badge badge-blue text-[9px] py-0.5">Margin: {margin}%</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2 sm:px-3 text-left font-bold text-slate-500 uppercase tracking-wider text-[9px]">Category</th>
                    <th className="py-2 px-2 sm:px-3 text-right font-bold text-slate-500 uppercase tracking-wider text-[9px]">Cost</th>
                    <th className="hidden sm:table-cell py-2 px-3 text-right font-bold text-slate-500 uppercase tracking-wider text-[9px]">Markup</th>
                    <th className="py-2 px-2 sm:px-3 text-right font-bold text-slate-500 uppercase tracking-wider text-[9px]">Selling</th>
                    <th className="py-2 px-2 sm:px-3 text-right font-bold text-slate-500 uppercase tracking-wider text-[9px]">Profit</th>
                    <th className="hidden sm:table-cell py-2 px-3 text-right font-bold text-slate-500 uppercase tracking-wider text-[9px]">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(item => {
                    const cost = pricing[item.costKey] || 0;
                    const sell = pricing[item.sellKey] || 0;
                    const itemProfit = sell - cost;
                    const m = sell > 0 ? ((itemProfit / sell) * 100).toFixed(1) : 0;
                    return (
                      <tr key={item.label} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2 px-2 sm:px-3 font-semibold text-slate-700">{item.label}</td>
                        <td className="py-2 px-2 sm:px-3 text-right text-slate-500">{fmt(cost)}</td>
                        <td className="hidden sm:table-cell py-2 px-3 text-right text-blue-600 font-semibold">{fmt(itemProfit)}</td>
                        <td className="py-2 px-2 sm:px-3 text-right font-bold text-slate-900">{fmt(sell)}</td>
                        <td className="py-2 px-2 sm:px-3 text-right text-green-600 font-semibold">{fmt(itemProfit)}</td>
                        <td className="hidden sm:table-cell py-2 px-3 text-right text-slate-500 text-[10px]">{m}%</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td className="py-2 px-2 sm:px-3 font-black text-slate-900 uppercase text-[10px] tracking-wider">Total</td>
                    <td className="py-2 px-2 sm:px-3 text-right font-bold text-slate-900">{fmt(pricing.totalCost)}</td>
                    <td className="hidden sm:table-cell py-2 px-3 text-right font-bold text-blue-700">{fmt(quotationMarkup)}</td>
                    <td className="py-2 px-2 sm:px-3 text-right font-black text-primary-700 text-xs sm:text-sm">{fmt(pricing.totalSelling)}</td>
                    <td className="py-2 px-2 sm:px-3 text-right font-bold text-green-600">{fmt(profit)}</td>
                    <td className="hidden sm:table-cell py-2 px-3 text-right font-bold text-slate-700">{margin}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Markup settings */}
        <div className="lg:col-span-3">
          <div className="card shadow-sm border-t-[3px] border-t-primary-500 overflow-hidden h-full">
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-800">Markup Settings</h3>
            </div>
            <div className="p-3 flex flex-col gap-3">
              <div>
                <label className="form-label text-[9px] uppercase tracking-wider text-slate-500 mb-1">Global Mode</label>
                <select
                  value={pricing.globalMarkupType || 'percentage'}
                  onChange={e => onUpdate({ ...pricing, globalMarkupType: e.target.value })}
                  className="w-full text-xs h-7 px-2 rounded border border-slate-200 bg-slate-50 hover:border-primary-300 focus:bg-white transition-colors"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (฿)</option>
                  <option value="per_person">Per Person</option>
                  <option value="per_booking">Per Booking</option>
                </select>
              </div>
              <div>
                <label className="form-label text-[9px] uppercase tracking-wider text-slate-500 mb-1">{pricing.globalMarkupType === 'percentage' ? 'Value' : pricing.globalMarkupType === 'per_person' ? 'Markup / traveller' : pricing.globalMarkupType === 'per_booking' ? 'Markup / booking' : 'Markup amount'}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={pricing.globalMarkupValue ?? 0}
                    onChange={e => onUpdate({ ...pricing, globalMarkupValue: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full text-sm font-bold text-primary-700 h-7 pl-2 pr-7 rounded border border-slate-200 bg-slate-50 hover:border-primary-300 focus:bg-white transition-colors"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    {pricing.globalMarkupType === 'percentage' ? '%' : '฿'}
                  </div>
                </div>
              </div>
              
              {onGeneratePDF && (
                <button 
                  onClick={onGeneratePDF} 
                  className="mt-2 w-full btn-primary h-8 text-xs flex justify-center items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" /> Generate PDF
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Summary */}
        <div className="lg:col-span-3">
          <div className="card shadow-sm overflow-hidden h-full">
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-800">Quick Summary</h3>
            </div>
            <div className="p-3 space-y-0.5 divide-y divide-slate-100">
              {[
                { label: 'Total Cost', value: fmt(pricing.totalCost), bold: false },
                { label: 'Total Selling', value: fmt(pricing.totalSelling), bold: true },
                { label: 'Quotation Markup', value: fmt(quotationMarkup), color: 'text-blue-600', bold: true },
                { label: 'Gross Profit', value: fmt(profit), color: 'text-green-600', bold: true },
                { label: 'Margin', value: `${margin}%`, color: 'text-green-600', bold: false },
                { label: 'Selling/Pax', value: fmt(pricing.totalSelling / (quotation.adults || 1)), bold: false },
              ].map(row => (
                <div key={row.label} className={`flex items-center justify-between py-1.5`}>
                  <span className="text-xs text-slate-500">{row.label}</span>
                  <span className={`text-xs ${row.bold ? 'font-bold text-slate-900 text-sm' : 'font-semibold'} ${row.color || ''}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TermsEditor({ quotation, onChange }) {
  const defaultInclusions = quotation.inclusions?.length ? quotation.inclusions : [
    'Accommodation as per itinerary with daily breakfast',
    'Airport transfers as mentioned',
    'All tours as per itinerary',
  ];
  const defaultExclusions = quotation.exclusions?.length ? quotation.exclusions : [
    'International flights',
    'Visa charges',
    'Personal expenses',
    'Travel insurance',
    'Tips and gratuities',
  ];
  const [inclusions, setInclusions] = useState(defaultInclusions);
  const [exclusions, setExclusions] = useState(defaultExclusions);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [termsTemplateId, setTermsTemplateId] = useState(quotation.termsTemplateId || '');
  const [termsHtml, setTermsHtml] = useState(quotation.termsHtml || '');

  useEffect(() => {
    let active = true;
    apiClient.get('/terms-conditions').then((response) => {
      if (!active) return;
      const available = (response.data || []).filter((item) => item.status === 'Active' && item.section === 'Quotation Terms & Conditions' && (!item.documentTypes?.length || item.documentTypes.includes('Quotation')));
      setTemplates(available);
      if (!termsHtml && !termsTemplateId) {
        const current = available.find((item) => item.isDefault);
        if (current) { setTermsTemplateId(current.id); setTermsHtml(current.content || ''); }
      }
    }).catch((error) => toast.error(error.message)).finally(() => active && setTemplatesLoading(false));
    return () => { active = false; };
  }, []);

  const addItem = (list, setList) => setList([...list, '']);
  const updateItem = (list, setList, i, val) => setList(list.map((item, idx) => idx === i ? val : item));
  const removeItem = (list, setList, i) => setList(list.filter((_, idx) => idx !== i));

  const handleSave = () => {
    const selected = templates.find((item) => item.id === termsTemplateId);
    onChange({ inclusions, exclusions, termsTemplateId, termsTemplateName: selected?.name || quotation.termsTemplateName || 'Custom terms', termsHtml });
    toast.success('Terms saved!');
  };

  const chooseTemplate = (id) => {
    setTermsTemplateId(id);
    const selected = templates.find((item) => item.id === id);
    if (selected) setTermsHtml(selected.content || '');
  };

  const Section = ({ title, list, setList, colorClass, icon: Icon }) => (
    <div className={`card flex flex-col h-full overflow-hidden shadow-sm border-t-[3px] ${colorClass}`}>
      <div className="bg-slate-50 border-b border-slate-100 px-3 py-2 flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5" />} {title}
        </h3>
        <button onClick={() => addItem(list, setList)} className="btn-secondary bg-white text-[10px] py-1 px-2 h-auto shadow-sm hover:shadow">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
      <div className="p-2 sm:p-3 space-y-0.5 flex-1 bg-white">
        {list.map((item, i) => (
          <div key={i} className="flex items-start gap-2 group relative rounded p-1 sm:p-1.5 hover:bg-slate-50 transition-colors">
            <div className="mt-2 w-1 h-1 rounded-full bg-slate-300 group-hover:bg-primary-500 transition-colors flex-shrink-0" />
            <input
              type="text"
              value={item}
              onChange={e => updateItem(list, setList, i, e.target.value)}
              className="w-full text-xs py-1 bg-transparent border-transparent border-b hover:border-slate-300 focus:border-primary-500 focus:bg-white transition-colors outline-none"
              placeholder="Item description..."
            />
            <button onClick={() => removeItem(list, setList, i)} className="p-1 sm:p-1.5 text-slate-400 sm:text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors sm:opacity-0 sm:group-hover:opacity-100 sm:absolute sm:right-2 sm:top-2 shrink-0">
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        ))}
        {list.length === 0 && <div className="text-sm text-slate-400 text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">No items added yet. Click "Add Item" to start.</div>}
      </div>
    </div>
  );

  return (
    <div className="p-1 sm:p-6 max-w-6xl mx-auto space-y-3 sm:space-y-6">
      <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-50 rounded-lg">
            <CheckSquare className="w-4 h-4 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Terms & Conditions</h2>
        </div>
        <button onClick={handleSave} className="btn-primary text-xs py-1.5 px-3 h-auto shadow-sm hover:shadow">
          <Save className="w-3.5 h-3.5" /> Save Terms
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-stretch">
        <Section title="Inclusions" list={inclusions} setList={setInclusions} colorClass="border-t-emerald-500" icon={CheckCircle2} />
        <Section title="Exclusions" list={exclusions} setList={setExclusions} colorClass="border-t-rose-500" icon={XCircle} />
      </div>
      <section className="card overflow-hidden shadow-sm border-t-[3px] border-t-indigo-500"><div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Info className="w-4 h-4" /> Terms & Conditions</h3><p className="text-[10px] text-slate-500 mt-0.5">Select a master template, then review or customise this quotation snapshot.</p></div><a href="/masters/terms-conditions" className="text-xs font-semibold text-indigo-600 hover:underline">Manage terms master</a></div><div className="p-3 sm:p-4 space-y-3"><label className="block"><span className="form-label">Current terms template</span><select value={termsTemplateId} disabled={templatesLoading} onChange={(event) => chooseTemplate(event.target.value)} className="form-select"><option value="">Custom terms (not linked to a master)</option>{templates.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isDefault ? ' · Default' : ''}</option>)}</select></label>{!templatesLoading && templates.length === 0 && <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-700">No active quotation terms template exists yet. Create one in the Terms & Conditions Master.</div>}<div><span className="form-label">Current terms content</span><RichTextEditor value={termsHtml} onChange={(value) => { setTermsHtml(value); setTermsTemplateId(''); }} placeholder="Add terms for this quotation…" /></div></div></section>
    </div>
  );
}
