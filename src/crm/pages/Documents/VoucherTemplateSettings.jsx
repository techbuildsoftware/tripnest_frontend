import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Check, ChevronLeft, ChevronRight, Eye, Minus, Plus as PlusIcon,
  Save, Star, Trash2, ZoomIn, ZoomOut, Maximize2, FileText, Layout, Palette, Settings2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api';
import { mergeVoucherSettings } from '../../lib/voucherSettings';
import { hotelRoomAllocationText } from '../../lib/roomAllocation';
import { pdfLayoutOptionsFromConfig, printPdfDocument } from '../../lib/directPdfDownload';
import ModernJourneyVoucher, { ModernJourneyThumbnail, MODERN_JOURNEY_DUMMY } from './ModernJourneyVoucher';
import TravelItineraryVoucher from './TravelItineraryVoucher';
import ConfirmationItineraryVoucher, { CONFIRMATION_ITINERARY_DEFAULTS } from './ConfirmationItineraryVoucher';
import LogoImg from '../../assets/logo-white.png';
import LogoColor from '../../assets/logo-color.png';

/* ── Section metadata ─────────────────────────────────────────────────────── */
const CLASSIC_SECTIONS = [
  { key: 'cover',      label: 'Guest Details',    icon: '👤' },
  { key: 'flights',    label: 'Flights Details',       icon: '✈️' },
  { key: 'hotels',     label: 'Hotel Details',          icon: '🏨' },
  { key: 'transfers',  label: 'Transfer Details',       icon: '🚗' },
  { key: 'activities', label: 'Sight Seeing Details',    icon: '🎭' },
  { key: 'notes',      label: 'Important Notes',        icon: '📝' },
  { key: 'itinerary',  label: 'Day Wise Iternry',     icon: '📅' },
];
const MJ_SECTIONS = [
  { key: 'cover',         label: 'Cover & Flights',        icon: '✈️' },
  { key: 'services',      label: 'Hotels & Services',      icon: '🏨' },
  { key: 'notes',         label: 'Guests & Notes',         icon: '👤' },
  { key: 'itineraryCover',label: 'Itinerary Cover',        icon: '🗺️' },
  { key: 'itineraryDays', label: 'Day-wise Itinerary',     icon: '📅' },
];
const SECTION_TOGGLE_FIELDS = [
  ['cover', 'Guest Details'], ['flights', 'Flights Details'], ['hotels', 'Hotel Details'],
  ['transfers', 'Transfer Details'], ['activities', 'Sight Seeing Details'], ['notes', 'Important Notes'], ['itinerary', 'Day Wise Iternry'],
];
const VOUCHER_LAYOUT_PREVIEW_CSS = `
  .voucher-page .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: calc(1rem * var(--voucher-card-spacing-scale)) !important; }
  .voucher-page .itinerary-day > .flex, .voucher-page .itinerary-day article { padding: calc(.75rem * var(--voucher-card-padding-scale)) !important; }
  .civ-timeline-wrapper { padding-top: calc(5mm * var(--voucher-card-spacing-scale)) !important; padding-bottom: calc(5mm * var(--voucher-card-spacing-scale)) !important; }
  .civ-timeline-item { margin-bottom: calc(6mm * var(--voucher-card-spacing-scale)) !important; }
  .civ-day-service { padding: calc(5px * var(--voucher-card-padding-scale)) calc(6px * var(--voucher-card-padding-scale)) !important; }
  .tiv-body { padding: calc(16px * var(--voucher-card-padding-scale)) !important; }
  .tiv-card { padding: calc(12px * var(--voucher-card-padding-scale)) !important; }
  .tiv-row { padding-top: calc(12px * var(--voucher-card-spacing-scale)) !important; padding-bottom: calc(12px * var(--voucher-card-spacing-scale)) !important; }
  .tiv-service { margin-top: calc(7px * var(--voucher-card-spacing-scale)) !important; padding: calc(8px * var(--voucher-card-padding-scale)) calc(10px * var(--voucher-card-padding-scale)) !important; }
`;
const MJ_SECTION_TOGGLE_FIELDS = [
  ['cover', 'Booking Summary'], ['flights', 'Flight Details'], ['guestDetails', 'Traveller Details'],
  ['hotels', 'Hotel Stays'], ['tours', 'Tours & Experiences'], ['transfers', 'Transfers'],
  ['importantNotes', 'Important Notes'], ['itinerary', 'Day-wise Itinerary'],
];

const SIMPLE_VOUCHER_CONFIG = {
  ...mergeVoucherSettings(),
  templateName: 'Simple Voucher Template', companyName: 'BUILDSOFTWARE',
  tagline: 'Your Thailand travel partner', welcomeTitle: 'Travel Voucher',
  primaryColor: '#0f3c77', secondaryColor: '#08264c', accentColor: '#e5a11a',
  showHotelImages: false, showActivityImages: false, theme: 'simple'
};
const LUXURY_VOUCHER_CONFIG = {
  ...mergeVoucherSettings(),
  templateName: 'Luxury Voucher', companyName: 'BUILDSOFTWARE',
  tagline: 'Your Thailand travel partner', welcomeTitle: 'Travel Voucher',
  primaryColor: '#1a1a1a', secondaryColor: '#000000', accentColor: '#d4af37',
  showHotelImages: false, showActivityImages: false, theme: 'luxury'
};
const VIBRANT_VOUCHER_CONFIG = {
  ...mergeVoucherSettings(),
  templateName: 'Vibrant Voucher', companyName: 'BUILDSOFTWARE',
  tagline: 'Your Thailand travel partner', welcomeTitle: 'Travel Voucher',
  primaryColor: '#ec4899', secondaryColor: '#8b5cf6', accentColor: '#2b7de9',
  showHotelImages: false, showActivityImages: false, theme: 'vibrant'
};
const emptyTemplate = () => ({ id: '', name: 'Simple Voucher Template', description: 'Clean, compact travel voucher', isDefault: false, config: { ...SIMPLE_VOUCHER_CONFIG } });
const emptyLuxuryTemplate = () => ({ id: '', name: 'Luxury Voucher Template', description: 'Premium gold and dark theme', isDefault: false, config: { ...LUXURY_VOUCHER_CONFIG } });
const emptyVibrantTemplate = () => ({ id: '', name: 'Vibrant Voucher Template', description: 'Colorful modern gradients', isDefault: false, config: { ...VIBRANT_VOUCHER_CONFIG } });
const MJ_DEFAULT_CONFIG = {
  primaryColor: '#173B8F', secondaryColor: '#0F2348', accentColor: '#F4B942',
  backgroundColor: '#F6F8FC', companyName: 'BUILDSOFTWARE',
  tagline: 'Your Thailand Travel Partner', welcomeTitle: 'Travel Confirmation',
  preparedForLabel: 'Prepared for', showPassport: false, showDOB: false,
  pdfSideMarginMm: 4.2, pdfTopMarginMm: 2, pdfContentScalePercent: 100, pdfFooterGapPercent: 10, pdfPageFillPercent: 90,
  pdfKeepSectionsTogether: true, pdfCardPaddingPercent: 100, pdfCardSpacingPercent: 100,
  sectionOrder: ['cover', 'flights', 'guestDetails', 'hotels', 'tours', 'transfers', 'importantNotes', 'itinerary'],
  sections: { cover: true, flights: true, guestDetails: true, hotels: true, tours: true, transfers: true, importantNotes: true, itinerary: true },
};
const emptyModernTemplate = () => ({
  id: '', name: 'Modern Journey Voucher', description: 'Premium travel editorial template',
  isDefault: false, config: { ...MJ_DEFAULT_CONFIG }, _templateType: 'modern-journey',
});
const TI_DEFAULT_CONFIG = { ...MJ_DEFAULT_CONFIG, welcomeTitle: 'Travel Itinerary' };
const emptyTravelItineraryTemplate = () => ({
  id: '', name: 'Travel Itinerary Voucher', description: 'Editorial itinerary and trip-summary template',
  isDefault: false, config: { ...TI_DEFAULT_CONFIG }, _templateType: 'travel-itinerary',
});
const emptyConfirmationItineraryTemplate = () => ({
  id: '', name: 'Confirmation Itinerary Voucher', description: 'Confirmation details and day-wise itinerary layout',
  isDefault: false, config: { ...CONFIRMATION_ITINERARY_DEFAULTS }, _templateType: 'confirmation-itinerary',
});
const editorialType = (template) => template?._templateType || template?.config?._templateType || '';
const editorialConfig = (type, config) => ({ ...(type === 'confirmation-itinerary' ? CONFIRMATION_ITINERARY_DEFAULTS : type === 'travel-itinerary' ? TI_DEFAULT_CONFIG : MJ_DEFAULT_CONFIG), ...(config || {}) });

/* ═════════════════════════════════════════════════════════════════════════════ */
export default function VoucherTemplateSettings() {
  const navigate = useNavigate();
  const [mobilePane, setMobilePane]         = useState('templates');
  const [templates, setTemplates]           = useState([]);
  const [selectedId, setSelectedId]         = useState('');
  const [draft, setDraft]                   = useState(emptyTemplate);
  const [bookings, setBookings]             = useState([]);
  const [destinationMasters, setDestinationMasters] = useState([]);
  const [previewBookingId, setPreviewBookingId] = useState('');
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [previewPage, setPreviewPage]       = useState(1);
  const [zoom, setZoom]                     = useState(1.02);
  const [activeTab, setActiveTab]           = useState('branding'); // branding | colors | sections | privacy | print
  const [draggedSection, setDraggedSection] = useState('');
  const printRef = useRef(null);

  /* ── Data fetch ─────────────────────────────────────────────────────── */
  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.get('/pdf-templates?documentType=voucher&sortBy=updatedAt&sortDir=desc&limit=100&summary=false'),
      apiClient.get('/bookings?limit=25&summary=false&sortBy=updatedAt&sortDir=desc'),
      apiClient.get('/operations-masters/destinations'),
    ]).then(([tRes, bRes, dRes]) => {
      if (!active) return;
      const saved = tRes.data || [];
      const liveBookings = bRes.data || [];
      const defaultTemplate = saved.find((template) => template.isDefault) || saved[0];
      setTemplates(saved); setBookings(liveBookings); setDestinationMasters(dRes.data || []);
      const sel = defaultTemplate;
      if (sel) {
        const type = editorialType(sel);
        setSelectedId(sel.id);
        setDraft({ ...sel, config: type ? editorialConfig(type, sel.config) : mergeVoucherSettings(sel.config), _templateType: type || undefined });
      }
      setPreviewBookingId(liveBookings[0]?.id || '');
    }).catch((err) => toast.error(err.message || 'Unable to load voucher templates.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  /* ── Derived state ────────────────────────────────────────────────────── */
  const selectedBooking = useMemo(() => bookings.find((b) => b.id === previewBookingId), [bookings, previewBookingId]);
  const isModernJourney = draft._templateType === 'modern-journey';
  const isEditorialTemplate = Boolean(draft._templateType);
  const isTravelItinerary = draft._templateType === 'travel-itinerary';
  const isConfirmationItinerary = draft._templateType === 'confirmation-itinerary';
  const settings = isEditorialTemplate ? editorialConfig(draft._templateType, draft.config) : mergeVoucherSettings(draft.config);

  /* Visible pages for the current template */
  const mjBookingData = selectedBooking || MODERN_JOURNEY_DUMMY;
  const pageList = useMemo(() => {
    if (isEditorialTemplate) {
      const sec = settings.sections || {};
      if (isConfirmationItinerary) {
        const confirmationPages = [
          { key: 'cover', label: 'Guest Details', icon: '👤' }, { key: 'flights', label: 'Flights Details', icon: '✈️' },
          { key: 'hotels', label: 'Hotel Details', icon: '🏨' }, { key: 'transfers', label: 'Transfer Details', icon: '🚗' },
          { key: 'tours', label: 'Sight Seeing Details', icon: '🎭' }, { key: 'importantNotes', label: 'Important Notes', icon: '📝' },
          { key: 'itinerary', label: 'Day Wise Itinerary', icon: '📅' },
        ].filter(({ key }) => sec[key] !== false);
        const savedOrder = Array.isArray(settings.sectionOrder) ? settings.sectionOrder : [];
        const orderedPages = [...savedOrder.map((key) => confirmationPages.find((page) => page.key === key)).filter(Boolean), ...confirmationPages.filter((page) => !savedOrder.includes(page.key))];
        return orderedPages.length ? orderedPages : [{ key: 'cover', label: 'Guest Details', icon: '👤' }];
      }
      const p = [];
      if (sec.cover !== false) p.push({ key: 'cover', label: 'Cover & Flights', icon: '✈️' });
      if (sec.hotels !== false || sec.tours !== false || sec.transfers !== false) p.push({ key: 'services', label: 'Hotels & Services', icon: '🏨' });
      if (sec.guestDetails !== false || sec.importantNotes !== false) p.push({ key: 'notes', label: 'Guests & Notes', icon: '👤' });
      const itLen = (mjBookingData.itinerary || []).length;
      if (sec.itinerary !== false && itLen > 0) {
        p.push({ key: 'itineraryCover', label: 'Itinerary Cover', icon: '🗺️' });
        p.push({ key: 'itineraryDays', label: 'Day-wise Itinerary', icon: '📅' });
      }
      return p.length ? p : [{ key: 'cover', label: 'Cover & Flights', icon: '✈️' }];
    }
    // Classic — only show enabled sections
    const sec = settings.sections || {};
    const availablePages = CLASSIC_SECTIONS.filter((section) => sec[section.key] !== false && (section.key !== 'itinerary' || sec.itinerary !== false));
    const savedOrder = Array.isArray(settings.sectionOrder) ? settings.sectionOrder : [];
    return [...savedOrder.map((key) => availablePages.find((page) => page.key === key)).filter(Boolean), ...availablePages.filter((page) => !savedOrder.includes(page.key))];
  }, [isEditorialTemplate, isConfirmationItinerary, settings.sections, mjBookingData]);

  const totalPages = pageList.length;
  const safePage = Math.min(Math.max(previewPage, 1), totalPages);
  const sectionToggleFields = isEditorialTemplate
    ? (isConfirmationItinerary
      ? [['cover', 'Guest Details'], ['flights', 'Flights Details'], ['hotels', 'Hotel Details'], ['transfers', 'Transfer Details'], ['tours', 'Sight Seeing Details'], ['importantNotes', 'Important Notes'], ['itinerary', 'Day Wise Itinerary']]
      : MJ_SECTION_TOGGLE_FIELDS)
    : SECTION_TOGGLE_FIELDS;
  const savedSectionOrder = Array.isArray(settings.sectionOrder) ? settings.sectionOrder : [];
  const orderedSectionToggleFields = [
    ...savedSectionOrder.map((key) => sectionToggleFields.find(([field]) => field === key)).filter(Boolean),
    ...sectionToggleFields.filter(([key]) => !savedSectionOrder.includes(key)),
  ];

  /* ── Change handlers ─────────────────────────────────────────────────── */
  const change = useCallback((key, value) => {
    if (isEditorialTemplate) setDraft((c) => ({ ...c, config: { ...editorialConfig(c._templateType, c.config), [key]: value } }));
    else setDraft((c) => ({ ...c, config: { ...mergeVoucherSettings(c.config), [key]: value } }));
  }, [isEditorialTemplate]);

  const toggleSection = useCallback((key) => {
    setDraft((c) => {
      const config = isEditorialTemplate ? editorialConfig(c._templateType, c.config) : mergeVoucherSettings(c.config);
      return { ...c, config: { ...config, sections: { ...config.sections, [key]: !config.sections?.[key] } } };
    });
  }, [isEditorialTemplate]);

  const reorderSections = useCallback((fromKey, toKey) => {
    if (!fromKey || fromKey === toKey) return;
    setDraft((current) => {
      const config = isEditorialTemplate ? editorialConfig(current._templateType, current.config) : mergeVoucherSettings(current.config);
      const supportedKeys = (isEditorialTemplate ? MJ_SECTION_TOGGLE_FIELDS : SECTION_TOGGLE_FIELDS).map(([key]) => key);
      const currentOrder = Array.isArray(config.sectionOrder) ? config.sectionOrder.filter((key) => supportedKeys.includes(key)) : [];
      const ordered = [...currentOrder, ...supportedKeys.filter((key) => !currentOrder.includes(key))];
      const from = ordered.indexOf(fromKey);
      const to = ordered.indexOf(toKey);
      if (from < 0 || to < 0) return current;
      ordered.splice(to, 0, ordered.splice(from, 1)[0]);
      return { ...current, config: { ...config, sectionOrder: ordered } };
    });
  }, [isEditorialTemplate]);

  const choose = (tpl) => {
    const type = editorialType(tpl);
    setSelectedId(tpl.id);
    setDraft({ ...tpl, config: type ? editorialConfig(type, tpl.config) : mergeVoucherSettings(tpl.config), _templateType: type || undefined });
    setPreviewPage(1);
  };

  const newClassicTemplate = () => { setSelectedId(''); setDraft(emptyTemplate()); setPreviewPage(1); };
  const newLuxuryTemplate = () => { setSelectedId(''); setDraft(emptyLuxuryTemplate()); setPreviewPage(1); };
  const newVibrantTemplate = () => { setSelectedId(''); setDraft(emptyVibrantTemplate()); setPreviewPage(1); };
  const newConfirmationItineraryTemplate = () => { setSelectedId(''); setDraft(emptyConfirmationItineraryTemplate()); setPreviewPage(1); };

  const save = async (makeDefault = draft.isDefault) => {
    const name = String(draft.name || '').trim();
    if (!name) return toast.error('Enter a template name.');
    setSaving(true);
    try {
      const config = isEditorialTemplate
        ? { ...editorialConfig(draft._templateType, draft.config), _templateType: draft._templateType }
        : mergeVoucherSettings(draft.config);
      const payload = { name, description: String(draft.description || '').trim(), documentType: 'voucher', config, isDefault: Boolean(makeDefault), isFavorite: Boolean(draft.isFavorite) };
      const res = draft.id ? await apiClient.put(`/pdf-templates/${draft.id}`, payload) : await apiClient.post('/pdf-templates', payload);
      const saved = { ...res.data, _templateType: editorialType(res.data) || undefined };
      setTemplates((cur) => [saved, ...cur.filter((t) => t.id !== saved.id).map((t) => saved.isDefault ? { ...t, isDefault: false } : t)]);
      setSelectedId(saved.id); setDraft(saved);
      toast.success(saved.isDefault ? 'Template saved as default.' : 'Template saved.');
    } catch (err) { toast.error(err.message || 'Unable to save template.'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!draft.id) return newClassicTemplate();
    if (!window.confirm(`Delete "${draft.name}"?`)) return;
    setSaving(true);
    try {
      await apiClient.delete(`/pdf-templates/${draft.id}`);
      const remaining = templates.filter((t) => t.id !== draft.id);
      setTemplates(remaining);
      const next = remaining.find((t) => t.isDefault) || remaining[0];
      if (next) choose(next); else newClassicTemplate();
      toast.success('Template deleted.');
    } catch (err) { toast.error(err.message || 'Unable to delete template.'); }
    finally { setSaving(false); }
  };

  const printVoucher = async () => {
    const el = printRef.current;
    if (!el) return;
    try {
      await printPdfDocument(el, draft.name || 'Voucher', undefined, pdfLayoutOptionsFromConfig(settings));
    } catch (error) {
      toast.error(error.message || 'Unable to open the voucher print dialog.');
    }
  };

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header style={{ minHeight: 52, flexWrap: 'wrap', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', flexShrink: 0, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', zIndex: 10 }}>
        <button onClick={() => navigate('/app/documents')} style={topBtn('#475569')}><ArrowLeft size={14} /> Back</button>
        <div style={{ width: 1, height: 22, background: '#e2e8f0' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Voucher Templates</div>
          <div className="hidden sm:block" style={{ fontSize: 11, color: '#64748b' }}>Design, configure and preview voucher templates</div>
        </div>
        <div style={{ width: 1, height: 22, background: '#e2e8f0' }} />
        <button onClick={printVoucher} style={topBtn('#059669')}><Eye size={14} /> <span className="hidden sm:inline">Print / Save PDF</span></button>
        <button onClick={() => save()} disabled={saving || loading} style={{ ...topBtn('#1d62c9'), opacity: saving ? 0.6 : 1 }}><Save size={14} /> <span className="hidden sm:inline">{saving ? 'Saving…' : 'Save'}</span></button>
      </header>

      {/* ── Mobile pane switcher ─────────────────────────────────────────── */}
      <div className="lg:hidden grid grid-cols-3 gap-1 p-1.5 bg-white border-b border-slate-200 shrink-0">
        {[
          { id: 'templates', label: 'Templates' },
          { id: 'settings', label: 'Settings' },
          { id: 'preview', label: 'Preview' },
        ].map((t) => (
          <button key={t.id} type="button" onClick={() => setMobilePane(t.id)} className={`h-8 rounded-lg text-xs font-bold border-0 cursor-pointer ${mobilePane === t.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{t.label}</button>
        ))}
      </div>

      {/* ── Body: LEFT | CENTER | RIGHT ──────────────────────────────────── */}
      <div className="flex-col lg:flex-row" style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>

        {/* ── LEFT sidebar: template list + pages ────────────────────────── */}
        <aside className={`${mobilePane === 'templates' ? 'flex' : 'hidden'} lg:flex flex-1 min-h-0 lg:flex-none lg:w-[20%] lg:min-w-[200px]`} style={{ flexShrink: 0, background: 'white', borderRight: '1px solid #e2e8f0', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Template list header */}
          <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #f1f5f9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Templates</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>{templates.length}</span>
          </div>

          {/* Template cards */}
          <div style={{ overflowY: 'auto', padding: '8px 8px 4px' }}>
            {templates.map((tpl) => {
              const type = editorialType(tpl); const isMod = type === 'modern-journey'; const isTravel = type === 'travel-itinerary'; const isConfirmation = type === 'confirmation-itinerary';
              const isSel = selectedId === tpl.id;
              return (
                <button key={tpl.id} onClick={() => choose(tpl)} style={{ width: '100%', textAlign: 'left', background: isSel ? 'linear-gradient(135deg, #eff6ff, #dbeafe)' : 'white', border: `1.5px solid ${isSel ? '#2b7de9' : '#e2e8f0'}`, borderRadius: 10, padding: '8px 9px', cursor: 'pointer', transition: 'all 0.15s', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Mini colour swatch */}
                  <div style={{ width: 32, height: 32, borderRadius: 7, flexShrink: 0, background: type ? `linear-gradient(135deg, ${tpl.config?.secondaryColor || '#0F2348'}, ${tpl.config?.primaryColor || '#173B8F'})` : `linear-gradient(135deg, ${tpl.config?.secondaryColor || '#172554'}, ${tpl.config?.primaryColor || '#154aa0'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                    {type ? <span style={{ color: tpl.config?.accentColor || '#F4B942' }}>{isConfirmation ? '✓' : isTravel ? '✧' : '✦'}</span> : <span style={{ color: 'rgba(255,255,255,0.7)' }}>⬜</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.name}</div>
                    <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                      {tpl.isDefault && <span style={{ fontSize: 8, fontWeight: 700, color: '#059669', background: '#d1fae5', borderRadius: 3, padding: '1px 4px' }}>DEFAULT</span>}
                      {isMod && <span style={{ fontSize: 8, fontWeight: 700, color: '#173B8F', background: '#dbeafe', borderRadius: 3, padding: '1px 4px' }}>MODERN</span>}
                      {isTravel && <span style={{ fontSize: 8, fontWeight: 700, color: '#6d28d9', background: '#ede9fe', borderRadius: 3, padding: '1px 4px' }}>ITINERARY</span>}
                      {isConfirmation && <span style={{ fontSize: 8, fontWeight: 700, color: '#154aa0', background: '#dbeafe', borderRadius: 3, padding: '1px 4px' }}>CONFIRMATION</span>}
                    </div>
                  </div>
                  {tpl.isFavorite && <Star size={11} className="fill-amber-400 text-amber-400" />}
                </button>
              );
            })}
            {!templates.length && <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: 11, color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: 8 }}>No saved templates yet.</div>}
          </div>

          {/* New Template Buttons in Sidebar */}
          <div style={{ padding: '12px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Create New Template</span>
            <button onClick={newClassicTemplate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#475569', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }} onMouseOver={(e) => e.currentTarget.style.borderColor = '#94a3b8'} onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}>
              <FileText size={14} color="#475569" /> Simple Theme
            </button>
            <button onClick={newLuxuryTemplate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#475569', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }} onMouseOver={(e) => e.currentTarget.style.borderColor = '#d4af37'} onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}>
              <Star size={14} color="#d4af37" /> Luxury Theme
            </button>
            <button onClick={newVibrantTemplate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#475569', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }} onMouseOver={(e) => e.currentTarget.style.borderColor = '#ec4899'} onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}>
              <Palette size={14} color="#ec4899" /> Vibrant Theme
            </button>
            <button onClick={newConfirmationItineraryTemplate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: 'white', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#154aa0', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <Layout size={14} color="#1d62c9" /> Confirmation Itinerary
            </button>
          </div>


        </aside>

        {/* ── CENTER: Settings editor ─────────────────────────────────────── */}
        <div className={`${mobilePane === 'settings' ? 'flex' : 'hidden'} lg:flex flex-1 min-h-0 lg:flex-none lg:w-[28%]`} style={{ flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid #e2e8f0' }}>

          {/* Template info bar */}
          <div style={{ padding: '10px 14px', background: 'white', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${settings.secondaryColor || '#0F2348'}, ${settings.primaryColor || '#173B8F'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                {isEditorialTemplate ? <span style={{ color: settings.accentColor || '#F4B942' }}>{isConfirmationItinerary ? '✓' : isTravelItinerary ? '✧' : '✦'}</span> : <span style={{ color: 'rgba(255,255,255,0.7)' }}>⬜</span>}
              </div>
              <input value={draft.name || ''} onChange={(e) => setDraft((c) => ({ ...c, name: e.target.value }))} placeholder="Template name…" style={{ flex: 1, height: 30, border: '1px solid #e2e8f0', borderRadius: 7, padding: '0 8px', fontSize: 12, fontWeight: 700, color: '#0f172a', outline: 'none', background: '#fafafa' }} />
            </div>
            <select value={previewBookingId} onChange={(e) => setPreviewBookingId(e.target.value)} style={{ width: '100%', height: 28, border: '1px solid #e2e8f0', borderRadius: 6, padding: '0 8px', fontSize: 11, color: '#64748b', background: 'white', outline: 'none' }}>
              <option value="">No booking selected (uses demo data)</option>
              {bookings.map((b) => <option key={b.id} value={b.id}>{b.id} · {b.guestName || 'Guest'} · {b.destination || ''}</option>)}
            </select>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #e2e8f0', flexShrink: 0, padding: '0 10px', overflowX: 'auto' }}>
            {[
              { id: 'branding', label: 'Branding',  Icon: FileText  },
              { id: 'colors',   label: 'Colours',   Icon: Palette   },
              { id: 'sections', label: 'Sections',  Icon: Layout    },
              { id: 'privacy',  label: 'Privacy',   Icon: Settings2 },
               { id: 'print',    label: 'Print layout', Icon: Settings2 },
            ].map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 10px', fontSize: 10.5, fontWeight: activeTab === id ? 700 : 600, color: activeTab === id ? '#1d62c9' : '#64748b', border: 'none', background: 'none', cursor: 'pointer', borderBottom: `2px solid ${activeTab === id ? '#1d62c9' : 'transparent'}`, transition: 'all 0.15s' }}>
                <Icon size={12} />{label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
            {activeTab === 'branding' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="Company name"    value={settings.companyName}   onChange={(v) => change('companyName', v)} />
                <Field label="Tagline"         value={settings.tagline}       onChange={(v) => change('tagline', v)} />
                <Field label="Welcome heading" value={settings.welcomeTitle || settings.welcomeHeading || ''} onChange={(v) => change('welcomeTitle', v)} />
                <Field label="Prepared-for label" value={settings.preparedForLabel} onChange={(v) => change('preparedForLabel', v)} />
              </div>
            )}
            {activeTab === 'colors' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <ColorField label={isEditorialTemplate ? 'Primary — Navy'     : 'Header colour'}    value={settings.primaryColor}   onChange={(v) => change('primaryColor', v)} />
                <ColorField label={isEditorialTemplate ? 'Secondary — Dark Navy' : 'Header gradient'} value={settings.secondaryColor} onChange={(v) => change('secondaryColor', v)} />
                <ColorField label={isEditorialTemplate ? 'Accent — Gold'      : 'Accent colour'}    value={settings.accentColor}    onChange={(v) => change('accentColor', v)} />
                {isEditorialTemplate && <ColorField label="Background" value={settings.backgroundColor || '#F6F8FC'} onChange={(v) => change('backgroundColor', v)} />}
                {/* Live colour preview swatch */}
                <div style={{ height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${settings.secondaryColor || '#0F2348'}, ${settings.primaryColor || '#173B8F'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '0.08em' }}>Brand Colour Preview</span>
                  <div style={{ position: 'absolute', right: 12, width: 12, height: 12, borderRadius: '50%', background: settings.accentColor || '#F4B942', boxShadow: '0 0 6px rgba(244,185,66,0.6)' }} />
                </div>
              </div>
            )}
            {activeTab === 'sections' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                 <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Drag sections to choose their PDF order. Toggle any section off when it is not needed.</div>
                 {orderedSectionToggleFields.map(([key, label]) => (
                   <div key={key} draggable onDragStart={() => setDraggedSection(key)} onDragOver={(event) => event.preventDefault()} onDrop={() => { reorderSections(draggedSection, key); setDraggedSection(''); }} onDragEnd={() => setDraggedSection('')} style={{ opacity: draggedSection === key ? 0.5 : 1, cursor: 'grab' }}>
                     <Toggle label={`⠿  ${label}`} checked={settings.sections?.[key] !== false} onChange={() => toggleSection(key)} />
                   </div>
                ))}
              </div>
            )}
            {activeTab === 'privacy' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Toggle label="Show passport numbers" checked={Boolean(settings.showPassport)} onChange={() => change('showPassport', !settings.showPassport)} />
                <Toggle label="Show dates of birth"   checked={Boolean(settings.showDOB)}      onChange={() => change('showDOB', !settings.showDOB)} />
                {!isEditorialTemplate && (
                  <>
                    <Toggle label="Show hotel images"    checked={Boolean(settings.showHotelImages)}    onChange={() => change('showHotelImages', !settings.showHotelImages)} />
                    <Toggle label="Show activity images" checked={Boolean(settings.showActivityImages)} onChange={() => change('showActivityImages', !settings.showActivityImages)} />
                    <TextArea label="Important notes"         value={settings.importantNotes || ''} onChange={(v) => change('importantNotes', v)} />
                    <TextArea label="Emergency contact message" value={settings.emergencyText || ''} onChange={(v) => change('emergencyText', v)} />
                  </>
                )}
              </div>
            )}
             {activeTab === 'print' && (
               <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                 <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.45 }}>These controls are saved on this template and apply to both Download PDF and Print / Save PDF.</div>
                 <RangeField label="Side margin" value={settings.pdfSideMarginMm} min={0} max={20} step={0.5} suffix=" mm" onChange={(value) => change('pdfSideMarginMm', value)} />
                 <RangeField label="Top margin" value={settings.pdfTopMarginMm} min={0} max={20} step={0.5} suffix=" mm" onChange={(value) => change('pdfTopMarginMm', value)} />
                 <RangeField label="Content scale" value={settings.pdfContentScalePercent} min={75} max={100} step={1} suffix="%" onChange={(value) => change('pdfContentScalePercent', value)} />
                 <RangeField label="Card padding" value={settings.pdfCardPaddingPercent} min={75} max={125} step={1} suffix="%" onChange={(value) => change('pdfCardPaddingPercent', value)} />
                 <RangeField label="Card spacing" value={settings.pdfCardSpacingPercent} min={70} max={140} step={1} suffix="%" onChange={(value) => change('pdfCardSpacingPercent', value)} />
                 <RangeField label="Maximum footer gap" value={settings.pdfFooterGapPercent} min={0} max={30} step={1} suffix="%" onChange={(value) => change('pdfFooterGapPercent', value)} />
                 <RangeField label="Page fill target" value={settings.pdfPageFillPercent} min={60} max={100 - Number(settings.pdfFooterGapPercent || 10)} step={1} suffix="%" onChange={(value) => change('pdfPageFillPercent', value)} />
                 <Toggle label="Keep complete cards together" checked={settings.pdfKeepSectionsTogether !== false} onChange={() => change('pdfKeepSectionsTogether', settings.pdfKeepSectionsTogether === false)} />
                 <div style={{ fontSize: 9.5, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '8px 9px', lineHeight: 1.4 }}>Tip: reduce Content scale or Card padding/spacing for more content per page. Keep cards together prevents a service card from splitting across two pages.</div>
               </div>
             )}
          </div>

          {/* Bottom action row */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid #e2e8f0', background: 'white', display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => save(true)} disabled={saving} style={{ flex: 1, height: 32, borderRadius: 8, border: '1.5px solid #1d62c9', background: 'white', color: '#1d62c9', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Check size={13} /> Set Default</button>
            <button onClick={() => save()}     disabled={saving} style={{ flex: 1, height: 32, borderRadius: 8, border: 'none', background: '#1d62c9', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Save size={13} /> {saving ? 'Saving…' : 'Save'}</button>
            <button onClick={remove} disabled={saving} title="Delete this voucher template" style={{ height: 32, borderRadius: 8, border: '1px solid #fecaca', background: 'white', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '0 9px', flexShrink: 0 }}><Trash2 size={13} /> Delete</button>
          </div>
        </div>

        {/* ── RIGHT: Live preview ─────────────────────────────────────────── */}
        <aside className={`${mobilePane === 'preview' ? 'flex' : 'hidden'} lg:flex min-h-0 min-w-0`} style={{ flex: 1, background: '#dde3ec', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Preview toolbar */}
          <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '7px 10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <Eye size={14} style={{ color: '#1d62c9' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', flex: 1 }}>Live Voucher Preview</span>
            <span style={{ fontSize: 10, color: '#64748b', marginRight: 4 }}>Page {safePage} / {totalPages}</span>
            <button onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.1).toFixed(2)))} style={zBtnSt}><ZoomOut size={12} /></button>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#475569', minWidth: 34, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(1.5,  +(z + 0.1).toFixed(2)))} style={zBtnSt}><ZoomIn  size={12} /></button>
            <button onClick={() => setZoom(0.52)} style={zBtnSt}><Maximize2 size={12} /></button>
          </div>

          {/* Page tab strip */}
          <div style={{ background: '#1e293b', padding: '6px 10px', display: 'flex', gap: 4, overflowX: 'auto', flexShrink: 0, alignItems: 'center' }}>
            {pageList.map((page, idx) => {
              const isActive = safePage === idx + 1;
              return (
                <button key={page.key} onClick={() => {
                  setPreviewPage(idx + 1);
                  document.getElementById(`preview-page-${page.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: isActive ? '#1d62c9' : '#334155', border: `1px solid ${isActive ? '#60a5fa' : '#475569'}`, color: 'white', fontSize: 9.5, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                  <span>{idx + 1}</span>
                  <span style={{ opacity: 0.85 }}>{page.label}</span>
                </button>
              );
            })}
          </div>

          {/* Preview canvas */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: 10, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            {loading
              ? <div style={{ color: '#64748b', fontSize: 12, alignSelf: 'center' }}>Loading…</div>
              : <div id="voucher-preview-canvas" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column', gap: 20, padding: `${Number(settings.pdfTopMarginMm || 0) * 3.78}px ${Number(settings.pdfSideMarginMm || 0) * 3.78}px`, '--voucher-card-padding-scale': Number(settings.pdfCardPaddingPercent || 100) / 100, '--voucher-card-spacing-scale': Number(settings.pdfCardSpacingPercent || 100) / 100 }}>
                  <style>{VOUCHER_LAYOUT_PREVIEW_CSS}</style>
                  {pageList.map((page) => (
                    <div id={`preview-page-${page.key}`} key={page.key} style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zoom: Number(settings.pdfContentScalePercent || 100) / 100 }}>
                      {isConfirmationItinerary ? <ConfirmationSinglePage settings={settings} booking={selectedBooking || MODERN_JOURNEY_DUMMY} destinations={destinationMasters} pageKey={page.key} /> : <ClassicSinglePage settings={settings} booking={selectedBooking} pageKey={page.key} />}
                    </div>
                  ))}
                </div>
            }
          </div>
        </aside>
      </div>

      {/* Hidden print mount */}
      <div ref={printRef} style={{ position: 'fixed', left: '-9999px', width: '210mm', pointerEvents: 'none' }} aria-hidden="true">
        {isConfirmationItinerary ? <ConfirmationItineraryVoucher settings={settings} booking={selectedBooking || MODERN_JOURNEY_DUMMY} destinations={destinationMasters} /> : isTravelItinerary ? <TravelItineraryVoucher settings={settings} booking={selectedBooking || MODERN_JOURNEY_DUMMY} /> : isModernJourney && <ModernJourneyVoucher settings={settings} booking={selectedBooking || MODERN_JOURNEY_DUMMY} />}
      </div>
    </div>
  );
}

/* ── Modern Journey single-page preview ───────────────────────────────────── */
/**
 * ModernJourneyVoucher renders ALL pages. To show just one page we render the
 * full component (which uses CSS pagination / break-after) and then use CSS to
 * hide all .mjv-page divs except the Nth one.  We wrap it in a clip container.
 */
function MJSinglePage({ settings, booking, pageKey }) {
  /* Map pageKey → 0-based index inside the rendered output */
  const pageIndexMap = useMemo(() => {
    const sec = settings.sections || {};
    const keys = [];
    if (sec.cover !== false) keys.push('cover');
    if (sec.hotels !== false || sec.tours !== false || sec.transfers !== false) keys.push('services');
    if (sec.guestDetails !== false || sec.importantNotes !== false) keys.push('notes');
    const itLen = (booking.itinerary || []).length;
    if (sec.itinerary !== false && itLen > 0) { keys.push('itineraryCover'); keys.push('itineraryDays'); }
    return keys;
  }, [settings.sections, booking.itinerary]);

  const pageIndex = pageIndexMap.indexOf(pageKey);
  const show = pageIndex >= 0 ? pageIndex : 0;

  /* Unique clip-id to scope the CSS */
  const clipId = 'mjv-clip-' + show;

  return (
    <div>
      <style>{`
        #${clipId} > .mjv-root > .mjv-page { display: none !important; }
        #${clipId} > .mjv-root > .mjv-page:nth-child(${show + 1}) { display: flex !important; }
      `}</style>
      <div id={clipId} style={{ width: '210mm', overflow: 'hidden', borderRadius: 6, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <ModernJourneyVoucher settings={settings} booking={booking} />
      </div>
    </div>
  );
}

function ConfirmationSinglePage({ settings, booking, destinations, pageKey }) {
  return (
    <div style={{ width: '210mm', overflow: 'hidden', borderRadius: 6, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
      <ConfirmationItineraryVoucher settings={settings} booking={booking} destinations={destinations} sectionKey={pageKey} />
    </div>
  );
}

/* ── Classic single-page preview ─────────────────────────────────────────── */
const CLASSIC_PAGE_NAMES = {
  cover:      'Guest Details',
  flights:    'Flights Details',
  hotels:     'Hotel Details',
  transfers:  'Transfer Details',
  activities: 'Sight Seeing Details',
  notes:      'Important Notes',
  itinerary:  'Day Wise Iternry',
};
function ClassicSinglePage({ settings, booking, pageKey }) {
  if (!booking) {
    return (
      <div style={{ width: '210mm', minHeight: 250, background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: 28 }}>📄</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>No booking selected</div>
        <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', maxWidth: 200 }}>Choose a booking from the "Booking used in preview" dropdown to see live data.</div>
      </div>
    );
  }
  const voucher = booking.voucher || {};
  const bookingServices = booking.services || [];
  const services = Array.isArray(voucher.services) && voucher.services.length ? voucher.services : bookingServices.filter((s) => s.type !== 'Hotel');
  const hotels = Array.isArray(voucher.hotels) && voucher.hotels.length ? voucher.hotels : booking.hotels || bookingServices.filter((s) => s.type === 'Hotel');
  const activities = services.filter((s) => ['Sightseeing', 'Meal', 'Restaurant', 'Yacht', 'Ferry', 'Guide', 'Other'].includes(s.type));
  const transfers  = services.filter((s) => s.type === 'Transfer');

  const pageName = CLASSIC_PAGE_NAMES[pageKey] || pageKey;

  /* Header shared across all pages */
  const Header = () => {
    const theme = settings.theme || 'simple';
    if (theme === 'luxury') {
      return (
        <div style={{ padding: '10px 14px', color: 'white', background: '#0a0a0a', borderBottom: '2px solid #d4af37', display: 'flex', alignItems: 'center', gap: 10, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', background: 'radial-gradient(circle at top right, rgba(212,175,55,0.15), transparent 60%)' }} />
          <img src={LogoImg} alt="Logo" style={{ height: 30, width: 64, objectFit: 'contain', objectPosition: 'left center', position: 'relative', zIndex: 1 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div style={{ flex: 1, position: 'relative', zIndex: 1, borderLeft: '1px solid rgba(212,175,55,0.3)', paddingLeft: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#d4af37', textTransform: 'uppercase', fontFamily: 'serif' }}>{settings.companyName}</div>
            <div style={{ fontSize: 7, color: '#94a3b8', textTransform: 'uppercase' }}>{settings.tagline}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 8, position: 'relative', zIndex: 1 }}>
            <div style={{ fontWeight: 700, color: '#d4af37', fontFamily: 'serif', fontSize: 10 }}>{booking.id}</div>
            <div style={{ color: '#94a3b8', marginTop: 1, textTransform: 'uppercase' }}>{pageName}</div>
          </div>
        </div>
      );
    }
    if (theme === 'vibrant') {
      return (
        <div style={{ padding: '10px 14px', color: 'white', background: `linear-gradient(135deg, ${settings.secondaryColor || '#ec4899'}, ${settings.primaryColor || '#8b5cf6'})`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'white', padding: 4, borderRadius: 8 }}><img src={LogoColor} alt="Logo" style={{ height: 26, width: 56, objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 900 }}>{settings.companyName}</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.9)' }}>{settings.tagline}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 8, background: 'rgba(0,0,0,0.1)', padding: '4px 8px', borderRadius: 8 }}>
            <div style={{ fontWeight: 900, fontSize: 10 }}>{booking.id}</div>
            <div style={{ color: 'rgba(255,255,255,0.9)', marginTop: 1, textTransform: 'uppercase', fontWeight: 700 }}>{pageName}</div>
          </div>
        </div>
      );
    }
    return (
      <div style={{ padding: '10px 14px', color: 'white', background: `linear-gradient(135deg, ${settings.secondaryColor || '#172554'}, ${settings.primaryColor || '#154aa0'})`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={LogoImg} alt="Logo" style={{ height: 30, width: 64, objectFit: 'contain', objectPosition: 'left center' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800 }}>{settings.companyName}</div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)' }}>{settings.tagline}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 8 }}>
          <div style={{ fontWeight: 700, color: settings.accentColor || '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Confirmation Voucher</div>
          <div style={{ fontWeight: 700, marginTop: 1 }}>{booking.id}</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>{pageName}</div>
        </div>
      </div>
    );
  };

  /* Section body */
  const renderBody = () => {
    switch (pageKey) {
      case 'cover': return (
        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>{settings.welcomeTitle || 'Welcome to Thailand'}</div>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 12 }}>{settings.preparedForLabel}: <strong style={{ color: '#0f172a' }}>{booking.guestName}</strong></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[['Arrival', booking.arrivalDate || '—'], ['Departure', booking.departureDate || '—'], ['Destination', booking.destination || '—'], ['Guests', `${(booking.adults||0)+(booking.children||0)} Guests`]].map(([l,v]) => (
              <div key={l} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{v}</div>
              </div>
            ))}
          </div>
          {(booking.guests || voucher.guests || []).length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Guest List</div>
              {(booking.guests || voucher.guests || []).slice(0, 6).map((g, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: 10 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800 }}>{i+1}</span>
                  <span style={{ fontWeight: 600 }}>{g.name}</span>
                  <span style={{ color: '#94a3b8' }}>{g.gender}</span>
                  <span style={{ color: '#94a3b8', marginLeft: 'auto' }}>{g.nationality}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
      case 'flights': return (
        <div style={{ padding: '12px 14px' }}>
          <SectionTitle>Flight Details</SectionTitle>
          {(booking.flights || voucher.flights || []).length ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9.5 }}>
              <thead><tr style={{ background: '#f8fafc' }}>{['Date','Airline','Flight','Route','Dep','Arr','PNR'].map(h => <th key={h} style={{ padding: '5px 6px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 8, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
              <tbody>{(booking.flights || voucher.flights || []).map((f, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdSt}>{f.date}</td>
                  <td style={tdSt}>{f.airline}</td>
                  <td style={{ ...tdSt, fontWeight: 700 }}>{f.flightNo}</td>
                  <td style={tdSt}>{f.fromSector} → {f.toSector}</td>
                  <td style={{ ...tdSt, color: '#1d62c9', fontWeight: 700 }}>{f.departure}</td>
                  <td style={{ ...tdSt, color: '#dc2626', fontWeight: 700 }}>{f.arrival}</td>
                  <td style={{ ...tdSt, fontFamily: 'monospace', fontSize: 8 }}>{f.pnr || '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <EmptyBlock>No flight details added.</EmptyBlock>}
        </div>
      );
      case 'hotels': return (
        <div style={{ padding: '12px 14px' }}>
          <SectionTitle>Hotel Details</SectionTitle>
          {hotels.length ? hotels.map((h, i) => (
            <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', marginBottom: 8, borderLeft: `3px solid ${settings.primaryColor || '#154aa0'}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{h.name || h.hotel}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, fontSize: 9.5 }}>
                {[['Check-in', h.checkIn],['Check-out', h.checkOut],['Room', h.roomType],['Room allocation', hotelRoomAllocationText(h, booking)],['Meal', h.mealPlan],['Conf. #', h.confirmationNo || '—'],['City', h.city || h.itineraryDestination]].map(([l,v]) => (
                  <div key={l}><span style={{ color: '#94a3b8', fontWeight: 600 }}>{l}: </span><span style={{ fontWeight: 600, color: '#0f172a' }}>{v || '—'}</span></div>
                ))}
              </div>
            </div>
          )) : <EmptyBlock>No hotel details added.</EmptyBlock>}
        </div>
      );
      case 'transfers': return (
        <div style={{ padding: '12px 14px' }}>
          <SectionTitle>Transfer Details</SectionTitle>
          {transfers.length ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9.5 }}>
              <thead><tr style={{ background: '#f8fafc' }}>{['Date','Route','Type','Time','Vehicle','Remarks'].map(h => <th key={h} style={{ padding: '5px 6px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 8, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
              <tbody>{transfers.map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdSt}>{t.date || t.serviceDate}</td>
                  <td style={tdSt}>{[t.pickupFrom||t.origin, t.dropAt||t.destination].filter(Boolean).join(' → ') || '—'}</td>
                  <td style={tdSt}>{t.basis || t.type}</td>
                  <td style={tdSt}>{[t.fromTime||t.pickupTime, t.arrivalTime].filter(Boolean).join(' – ') || '—'}</td>
                  <td style={tdSt}>{t.vehicleName || '—'}</td>
                  <td style={{ ...tdSt, color: '#64748b' }}>{t.remarks || '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <EmptyBlock>No transfer details added.</EmptyBlock>}
        </div>
      );
      case 'activities': return (
        <div style={{ padding: '12px 14px' }}>
          <SectionTitle>Sightseeing & Activities</SectionTitle>
          {activities.length ? activities.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${settings.primaryColor||'#154aa0'}, ${settings.accentColor||'#fbbf24'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🎭</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{a.name || a.variantName}</div>
                <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 2 }}>{a.date || a.serviceDate} · {a.fromTime || '—'} · {a.type || a.basis}</div>
                {a.pickupFrom && <div style={{ fontSize: 9, color: '#94a3b8' }}>Pickup: {a.pickupFrom}</div>}
              </div>
            </div>
          )) : <EmptyBlock>No sightseeing or activities added.</EmptyBlock>}
        </div>
      );
      case 'notes': return (
        <div style={{ padding: '12px 14px' }}>
          <SectionTitle>Important Notes</SectionTitle>
          <div style={{ background: '#fef3c7', borderRadius: 8, padding: '10px 12px', fontSize: 10, lineHeight: 1.5, color: '#92400e', whiteSpace: 'pre-line' }}>
            {settings.importantNotes || 'No important notes configured.'}
          </div>
        </div>
      );
      case 'itinerary': {
        const itinerary = booking.itinerary || voucher.itinerary || [];
        return (
          <div style={{ padding: '12px 14px' }}>
            <SectionTitle>Day Wise Itinerary</SectionTitle>
            {itinerary.length ? itinerary.map((day, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div style={{ background: `linear-gradient(135deg, ${settings.secondaryColor||'#172554'}, ${settings.primaryColor||'#154aa0'})`, color: '#fff', borderRadius: 6, padding: '3px 8px', fontSize: 9, fontWeight: 800 }}>DAY {day.day || i+1}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#0f172a' }}>{day.title || day.destination}</span>
                  {day.date && <span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 'auto' }}>{day.date}</span>}
                </div>
                {day.description && <div style={{ fontSize: 9.5, color: '#64748b', lineHeight: 1.5, marginBottom: 5 }}>{day.description}</div>}
              </div>
            )) : <EmptyBlock>No itinerary added.</EmptyBlock>}
          </div>
        );
      }
      default: return <EmptyBlock>Page not available.</EmptyBlock>;
    }
  };

  return (
    <div style={{ width: '210mm', background: 'white', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
      <Header />
      {renderBody()}
    </div>
  );
}

/* ── Small helpers ─────────────────────────────────────────────────────────── */
function SectionTitle({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 10, paddingBottom: 6, borderBottom: '2px solid #f1f5f9' }}>{children}</div>;
}
function EmptyBlock({ children }) {
  return <div style={{ padding: '20px', textAlign: 'center', fontSize: 11, color: '#94a3b8', background: '#f8fafc', borderRadius: 8, border: '1px dashed #e2e8f0' }}>{children}</div>;
}

function InfoRow({ label, value }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 6, padding: '6px 10px' }}>
      <div style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

/* ── Form components ─────────────────────────────────────────────────────── */
function Field({ label, value, onChange }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>{label}</span>
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} style={inputSt} />
    </label>
  );
}
function TextArea({ label, value, onChange }) {
  const ref = React.useRef(null);
  React.useLayoutEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>{label}</span>
      <textarea ref={ref} rows={3} value={value || ''} onChange={(e) => onChange(e.target.value)} style={{ ...inputSt, height: 'auto', resize: 'vertical', overflow: 'hidden' }} />
    </label>
  );
}
function ColorField({ label, value, onChange }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, border: '1px solid #d1d5db', borderRadius: 8, padding: '0 10px', background: 'white' }}>
        <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} style={{ width: 22, height: 22, border: 'none', padding: 0, borderRadius: 4, cursor: 'pointer', background: 'transparent', flexShrink: 0 }} />
        <input value={value || ''} onChange={(e) => onChange(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 11, fontFamily: 'monospace', color: '#0f172a' }} />
        <div style={{ width: 16, height: 16, borderRadius: 4, background: value || '#000', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
      </div>
    </label>
  );
}
function Toggle({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', cursor: 'pointer', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', background: checked ? '#f0f9ff' : 'white', transition: 'background 0.15s' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{label}</span>
      <div style={{ position: 'relative', width: 34, height: 19, borderRadius: 10, background: checked ? '#1d62c9' : '#d1d5db', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 2.5, left: checked ? 15 : 2.5, width: 14, height: 14, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
        <input type="checkbox" checked={!!checked} onChange={onChange} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', margin: 0 }} />
      </div>
    </label>
  );
}
function RangeField({ label, value, min, max, step = 1, suffix = '', onChange }) {
  const numericValue = Math.min(max, Math.max(min, Number(value ?? min)));
  return (
    <label style={{ display: 'block' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
        <span style={{ fontSize: 10.5, fontWeight: 650, color: '#374151' }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#1d62c9' }}>{numericValue}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={numericValue} onChange={(event) => onChange(Number(event.target.value))} style={{ width: '100%', accentColor: '#1d62c9', cursor: 'pointer' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 1, fontSize: 8.5, color: '#94a3b8' }}><span>{min}{suffix}</span><span>{max}{suffix}</span></div>
    </label>
  );
}

/* ── Style tokens ─────────────────────────────────────────────────────────── */
const inputSt  = { width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 7, padding: '0 8px', fontSize: 11, outline: 'none', color: '#0f172a', background: 'white', fontFamily: 'inherit' };
const topBtn   = (bg) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', borderRadius: 8, border: 'none', background: bg, color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer' });
const zBtnSt   = { width: 26, height: 26, borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const navBtnSt = { display: 'inline-flex', alignItems: 'center', gap: 4, height: 30, padding: '0 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#475569' };
const tdSt     = { padding: '5px 6px', fontSize: 9.5, color: '#374151', verticalAlign: 'top', borderBottom: '1px solid #f1f5f9' };
