import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, Check,
  Star, Copy, MoreHorizontal, ZoomIn, ZoomOut,
  ChevronDown, ChevronUp, Layout, Palette, Image as ImageIcon,
  Type, Settings, FileText, Eye, Download, X
} from 'lucide-react';
import toast from 'react-hot-toast';
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
} from '../Quotations/PDFDesigner/components/PDFTemplates';
import { DEFAULT_PDF_CONFIG, THEMES, COVER_IMAGES } from '../Quotations/PDFDesigner/data/pdfConfig';
import { applyClientPdfVisibility } from '../Quotations/PDFDesigner/data/quotationPdf';
import { apiClient } from '../../lib/api';
import { pdfLayoutOptionsFromConfig, printPdfDocument } from '../../lib/directPdfDownload';

/* ─── Dummy quotation data for preview ────────────────────────────────────── */
const DUMMY_QUOTATION = {
  quotationNo: 'QT-2026-906',
  quotationDate: '03-10-2026',
  status: 'Draft',
  agent: { name: 'Surya Kiran DMC', email: 'surya@dmc.com', phone: '' },
  guest: { name: 'Mr Ronik', email: '', phone: '' },
  companyDetails: {
    name: 'TripNest Co., Ltd.',
    tagline: 'Travel · Explore · Discover',
    phone: '+66 76 345 678',
    email: 'admin@tripnest.com',
    address: 'Phuket, Thailand',
    website: 'www.tripnest.com'
  },
  travelStartDate: '02 Nov 2026',
  travelEndDate:   '08 Nov 2026',
  duration:        '7 Days / 6 Nights',
  adults: 2, children: 0, rooms: 1,
  destination: 'Pattaya + Bangkok',
  packageType: 'Travel Package',
  currency: 'THB',
  totalPrice: 24920,
  totalPax: '2 Adults + 0 Children',
  inclusions: [
    'Hotel accommodation as per itinerary',
    'Daily breakfast at hotel',
    'All airport/hotel transfers',
    'Alcazar Cabaret Show – Deluxe Seat',
    'English-speaking guide',
  ],
  exclusions: [
    'International airfare', 'Travel insurance', 'Personal expenses', 'Camera fees at monuments',
  ],
  hotels: [
    { city: 'Pattaya', name: 'The Beverly Hotel Pattaya', category: '4 Star', roomType: 'Classic Superior', nights: 4, mealPlan: 'RB', checkIn: '02 Nov 2026', checkOut: '06 Nov 2026', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&q=60' },
    { city: 'Bangkok',  name: 'Ecotel Bangkok', category: '4 Star', roomType: 'Superior Room', nights: 2, mealPlan: 'RB', checkIn: '06 Nov 2026', checkOut: '08 Nov 2026', image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=200&q=60' },
  ],
  itinerary: [
    {
      day: 1, date: '02 Nov', destination: 'Pattaya',
      title: 'Pattaya Arrival',
      description: 'Arrive in Pattaya and plan airport/transfer, hotel and activities.',
      image: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=150&q=60',
      services: [
        { type: 'Hotel', label: 'The Beverly Hotel Pattaya', name: 'The Beverly Hotel Pattaya', detail: 'Classic Superior | 4N | RB', supplier: 'The Beverly Hotel Pattaya', cost: 16000, sellingPrice: 16000, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=60&q=60' },
        { type: 'Transfer', label: 'Bangkok Airport To Pattaya Hotel', name: 'Bangkok Airport To Pattaya Hotel', detail: 'Bangkok Airport To Pattaya | VEH-2026-004', supplier: 'Phuket Tours Co.', cost: 900, sellingPrice: 900, image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=60&q=60' },
      ],
    },
    {
      day: 2, date: '03 Nov', destination: 'Pattaya',
      title: 'Pattaya – Day 2',
      description: 'Alcazar Cabaret Show in Pattaya.',
      image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=150&q=60',
      services: [
        { type: 'Sightseeing', label: 'Alcazar Cabaret Show – Deluxe Seat', name: 'Alcazar Cabaret Show', detail: 'Alcazar Cabaret Show | Deluxe Seat', supplier: 'Alcazar Cabaret Show', cost: 600, sellingPrice: 600, image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=60&q=60' },
      ],
    },
    {
      day: 3, date: '04 Nov', destination: 'Pattaya',
      title: 'Pattaya – Day 3',
      description: 'Plan accommodation and services in Pattaya.',
      image: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=150&q=60',
      services: [],
    },
    {
      day: 4, date: '05 Nov', destination: 'Pattaya',
      title: 'Pattaya – Day 4',
      description: 'Plan accommodation and services in Pattaya.',
      image: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=150&q=60',
      services: [],
    },
    {
      day: 5, date: '06 Nov', destination: 'Pattaya → Bangkok',
      title: 'Pattaya → Bangkok',
      description: 'Transfer from Pattaya to Bangkok, followed by your Bangkok hotel stay.',
      image: 'https://images.unsplash.com/photo-1598935888338-f90d8bacd9c5?w=150&q=60',
      services: [
        { type: 'Transfer', label: 'Pattaya Hotel To Bangkok Hotel', name: 'Pattaya Hotel To Bangkok Hotel', detail: 'Pattaya To Bangkok | VEH-2026-004', supplier: 'Thai Smiles Trip Co Ltd', cost: 1200, sellingPrice: 1200, image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=60&q=60' },
        { type: 'Hotel', label: 'Ecotel', name: 'Ecotel Bangkok', detail: 'Superior Room | 2N | RB', supplier: 'Ecotel', cost: 5520, sellingPrice: 5520, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=60&q=60' },
      ],
    },
    {
      day: 6, date: '07 Nov', destination: 'Bangkok',
      title: 'Bangkok – Day 2',
      description: 'Open day for Bangkok exploration.',
      image: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=150&q=60',
      services: [],
    },
    {
      day: 7, date: '08 Nov', destination: 'Bangkok',
      title: 'Departure Day',
      description: 'Transfer from your Bangkok hotel to Bangkok Airport.',
      image: 'https://images.unsplash.com/photo-1551362787-37f35a1e3671?w=150&q=60',
      services: [
        { type: 'Transfer', label: 'Bangkok Hotel To Bangkok Airport', name: 'Bangkok Hotel To Bangkok Airport', detail: 'Bangkok Hotel To Bangkok | VEH-2026-004', supplier: 'Thai Smiles Trip Co Ltd', cost: 600, sellingPrice: 600, image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=60&q=60' },
      ],
    },
  ],
  sightseeing: [{ name: 'Alcazar Cabaret Show', type: 'Deluxe Seat', destination: 'Pattaya', description: 'Deluxe-seat show in Pattaya.', image: null }],
  transfers: [],
  pricing: [{ category: 'Package total', netRate: 24920, total: 24920, currency: 'THB' }],
  optionalAddons: [],
  paymentTerms: ['50% advance at the time of booking', '50% before departure'],
  cancellationPolicy: ['30+ days: Full refund', '15–29 days: 50% refund', 'Less than 15 days: No refund'],
  importantNotes: ['All rates are in THB', 'Prices are subject to change during peak season'],
  companyDetails: { name: 'TripNest Co., Ltd.', address: 'Phuket, Thailand', phone: '+66 76 345 678', email: 'admin@tripnest.com', website: 'www.tripnest.com', tagline: 'Travel · Explore · Discover' },
  logo: null,
};

/* ─── Built-in format choices. Saved templates themselves are loaded from the
 * shared PDF-template API below, so this list is never used as quotation data. */
const FORMAT_PRESETS = [
  { id: 'classic', name: 'Classic Professional', style: 'Corporate Clean', status: 'Active', isDefault: false, primaryColor: '#0B5EA8', secondaryColor: '#F59E0B', font: 'Inter', description: 'Clean corporate format for travel agents (B2B). Header + summary + hotel table + itinerary.', updatedAt: '28 Sep 2026' },
  { id: 'premium', name: 'Premium Visual', style: 'Modern Travel', status: 'Active', isDefault: false, primaryColor: '#1E3A5F', secondaryColor: '#F59E0B', font: 'Manrope', description: 'Destination-focused visual template for B2C clients. Large cover image with itinerary.', updatedAt: '29 Sep 2026' },
  { id: 'detailed', name: 'Detailed Itinerary', style: 'Day-by-Day', status: 'Active', isDefault: false, primaryColor: '#059669', secondaryColor: '#0891B2', font: 'Inter', description: 'Comprehensive day-wise itinerary with all services, transfers, hotels and notes.', updatedAt: '27 Sep 2026' },
  { id: 'compact', name: 'Compact Rate Quotation', style: 'Price Focused', status: 'Active', isDefault: false, primaryColor: '#0e8a85', secondaryColor: '#DC2626', font: 'Roboto', description: 'Short, price-focused B2B quotation with hotel table and basic summary.', updatedAt: '26 Sep 2026' },
  { id: 'buildsoftware-premium', name: 'Premium Thailand Travel', style: 'Modern Travel', status: 'Active', isDefault: true, primaryColor: '#102A43', secondaryColor: '#C9A13B', font: 'Manrope', description: 'Luxury TripNest CRM template with hero cover, day-by-day itinerary cards, teal/navy/gold system.', updatedAt: '01 Oct 2026' },
  { id: 'luxury-boutique', name: 'Luxury Boutique Travel', style: 'Premium Dark', status: 'Active', isDefault: false, primaryColor: '#1a1a2e', secondaryColor: '#B8860B', font: 'Poppins', description: 'Dark luxury theme with gold accents. Ideal for honeymoon and boutique packages.', updatedAt: '30 Sep 2026' },
  { id: 'luxury-travel', name: 'Luxury Travel Quotation', style: 'Premium Luxury', status: 'Active', isDefault: false, primaryColor: '#102A43', secondaryColor: '#D5AA3A', font: 'Inter', description: 'Premium travel proposal: large hero, trip summary, pricing, day cards with city banners, final package total. Navy/Teal/Gold palette.', updatedAt: '02 Oct 2026' },
  { id: 'thai-experience', name: 'Thai Experience', style: 'Tropical Editorial', status: 'Active', isDefault: false, primaryColor: '#0A2240', secondaryColor: '#FF6B4A', font: 'Manrope', description: 'Magazine-style Thailand itinerary with tropical navy, coral and sunset-gold accents for activities, islands and yacht journeys.', updatedAt: '03 Oct 2026' },
  { id: 'portrait-creative', name: 'Portrait Creative', style: 'Creative Travel', status: 'Active', isDefault: false, primaryColor: '#0E9B97', secondaryColor: '#F6B73C', font: 'Inter', description: 'Illustrated teal portrait proposal: sky-blue cover with quotation badge, diamond trip stats, hotel / flight / transfer tables and offset-photo day cards on a travel-doodle background.', updatedAt: '21 Oct 2026' },
];

const THEME_KEYS = Object.keys(THEMES);
const COVER_KEYS = Object.keys(COVER_IMAGES);
const FLOW_LAYOUT_CSS = `.pdf-flow-preview .a4-page{width:595px!important;min-height:0!important;height:auto!important;margin:0!important;page-break-after:auto!important;break-after:auto!important;overflow:visible!important}`;

function toDisplayTemplate(template) {
  const preset = FORMAT_PRESETS.find((item) => item.id === template.config?.template);
  const theme = THEMES[template.config?.theme] || THEMES['corporate-blue'] || {};
  return {
    ...template,
    style: preset?.style || 'Custom Design',
    status: template.isEnabled === false ? 'Disabled' : 'Enabled',
    primaryColor: template.config?.accentColor || theme.accent || '#0B5EA8',
    secondaryColor: template.config?.secondaryColor || theme.secondary || '#F59E0B',
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function PDFTemplateSettings() {
  const navigate = useNavigate();
  const [mobilePane, setMobilePane] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [config, setConfig] = useState({ ...DEFAULT_PDF_CONFIG });
  const [zoom, setZoom] = useState(0.62);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', description: '' });
  const [saved, setSaved] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(null);
  const [activeSection, setActiveSection] = useState('format');
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const updateConfig = useCallback((updates) => setConfig(prev => ({ ...prev, ...updates })), []);

  const selectedTpl = templates.find(t => t.id === selectedId);
  const displayTemplates = templates.map(toDisplayTemplate);

  useEffect(() => {
    let current = true;
    apiClient.get('/pdf-templates?documentType=quotation')
      .then((response) => {
        if (!current) return;
        const savedTemplates = response.data || [];
        setTemplates(savedTemplates);
        const selected = savedTemplates.find((template) => template.isDefault) || savedTemplates[0];
        if (selected) {
          setSelectedId(selected.id);
          setConfig({ ...DEFAULT_PDF_CONFIG, ...(selected.config || {}) });
        }
      })
      .catch((error) => {
        if (current) toast.error(error.message || 'Unable to load saved PDF templates');
      })
      .finally(() => { if (current) setLoadingTemplates(false); });
    return () => { current = false; };
  }, []);

  const handleSelectTemplate = (tpl) => {
    setSelectedId(tpl.id);
    setConfig({ ...DEFAULT_PDF_CONFIG, ...(tpl.config || {}) });
    setShowMenu(null);
  };

  const saveTemplate = async (template, overrides = {}) => {
    const templateConfig = overrides.config || (template.id === selectedId ? config : template.config);
    const response = await apiClient.put(`/pdf-templates/${template.id}`, {
      name: overrides.name ?? template.name,
      description: overrides.description ?? template.description ?? '',
      config: { ...DEFAULT_PDF_CONFIG, ...(templateConfig || {}) },
      documentType: 'quotation',
      isDefault: overrides.isDefault ?? Boolean(template.isDefault),
      isFavorite: overrides.isFavorite ?? Boolean(template.isFavorite),
      isEnabled: overrides.isEnabled ?? template.isEnabled !== false,
    });
    return response.data;
  };

  const replaceTemplate = (updatedTemplate) => {
    setTemplates((previous) => previous.map((template) => (
      template.id === updatedTemplate.id
        ? updatedTemplate
        : updatedTemplate.isDefault ? { ...template, isDefault: false } : template
    )));
  };

  const handleSetDefault = async (id) => {
    const template = templates.find((item) => item.id === id);
    if (!template || template.isDefault) { setShowMenu(null); return; }
    setSaving(true);
    try {
      const updated = await saveTemplate(template, { isDefault: true, isEnabled: true });
      replaceTemplate(updated);
      toast.success('This design is now used for quotation PDFs');
    } catch (error) {
      toast.error(error.message || 'Unable to set the quotation template');
    } finally {
      setSaving(false);
      setShowMenu(null);
    }
  };

  const handleEnabledChange = async (id, isEnabled) => {
    const template = templates.find((item) => item.id === id);
    if (!template || template.isEnabled === isEnabled) { setShowMenu(null); return; }
    setSaving(true);
    try {
      const updated = await saveTemplate(template, { isEnabled });
      replaceTemplate(updated);
      toast.success(isEnabled ? 'Template enabled for quotation preview' : 'Template disabled for quotation preview');
    } catch (error) {
      toast.error(error.message || 'Unable to update template visibility');
    } finally {
      setSaving(false);
      setShowMenu(null);
    }
  };

  const handleDelete = async (id) => {
    const template = templates.find((item) => item.id === id);
    if (!template) return;
    setSaving(true);
    try {
      const remaining = templates.filter((item) => item.id !== id);
      if (template.isDefault && remaining.length) {
        const replacement = await saveTemplate(remaining[0], { isDefault: true });
        replaceTemplate(replacement);
      }
      await apiClient.delete(`/pdf-templates/${id}`);
      setTemplates((previous) => previous.filter((item) => item.id !== id));
      if (selectedId === id) {
        const next = remaining.find((item) => item.id !== id);
        setSelectedId(next?.id || '');
        setConfig({ ...DEFAULT_PDF_CONFIG, ...(next?.config || {}) });
      }
      toast.success('Template removed');
    } catch (error) {
      toast.error(error.message || 'Unable to remove template');
    } finally {
      setSaving(false);
      setShowDeleteConfirm(null);
    }
  };

  const handleSave = async () => {
    if (!selectedTpl) {
      setShowNewTemplate(true);
      return;
    }
    setSaving(true);
    try {
      const updated = await saveTemplate(selectedTpl, { config });
      replaceTemplate(updated);
      setConfig({ ...DEFAULT_PDF_CONFIG, ...(updated.config || {}) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success('PDF settings saved');
    } catch (error) {
      toast.error(error.message || 'Unable to save PDF settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    const name = newTemplate.name.trim();
    if (!name) { toast.error('Enter a template name'); return; }
    setSaving(true);
    try {
      const response = await apiClient.post('/pdf-templates', {
        name,
        description: newTemplate.description.trim(),
        config: { ...DEFAULT_PDF_CONFIG, ...config },
        isDefault: templates.length === 0,
        isFavorite: false,
        isEnabled: true,
      });
      const created = response.data;
      setTemplates((previous) => [...previous, created]);
      setSelectedId(created.id);
      setConfig({ ...DEFAULT_PDF_CONFIG, ...(created.config || {}) });
      setNewTemplate({ name: '', description: '' });
      setShowNewTemplate(false);
      toast.success(created.isDefault ? 'Template created and selected for quotations' : 'Template created');
    } catch (error) {
      toast.error(error.message || 'Unable to create template');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (id) => {
    const source = templates.find((template) => template.id === id);
    if (!source) return;
    setSaving(true);
    try {
      const response = await apiClient.post('/pdf-templates', {
        name: `${source.name} Copy`,
        description: source.description || '',
        config: { ...DEFAULT_PDF_CONFIG, ...(source.config || {}) },
        isDefault: false,
        isFavorite: Boolean(source.isFavorite),
        isEnabled: source.isEnabled !== false,
      });
      const copied = response.data;
      setTemplates((previous) => [...previous, copied]);
      setSelectedId(copied.id);
      setConfig({ ...DEFAULT_PDF_CONFIG, ...(copied.config || {}) });
      toast.success('Template duplicated');
    } catch (error) {
      toast.error(error.message || 'Unable to duplicate template');
    } finally {
      setSaving(false);
      setShowMenu(null);
    }
  };

  const handleUseForQuotations = async () => {
    if (!selectedTpl) { setShowNewTemplate(true); return; }
    setSaving(true);
    try {
      const updated = await saveTemplate(selectedTpl, { config, isDefault: true, isEnabled: true });
      replaceTemplate(updated);
      setConfig({ ...DEFAULT_PDF_CONFIG, ...(updated.config || {}) });
      toast.success('Selected design will now be used for all quotation PDFs');
    } catch (error) {
      toast.error(error.message || 'Unable to apply this quotation design');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    const el = document.getElementById('pdf-preview-render');
    if (!el) { toast.error('Nothing to print'); return; }
    try {
      await printPdfDocument(el, selectedTpl?.name || 'Quotation', undefined, pdfLayoutOptionsFromConfig(config));
      toast.success('Chrome print dialog opened.');
    } catch (error) {
      toast.error(error.message || 'Unable to open the quotation print dialog.');
    }
  };

  /* ── Render the live template ──────────────────────────────────────────── */
  const renderTemplate = () => {
    // Template settings configure the client copy, so the live sample mirrors
    // exactly what Download PDF, Print, and email delivery will contain.
    const clientConfig = { ...config, clientPreview: true };
    const props = { quotation: applyClientPdfVisibility(DUMMY_QUOTATION, clientConfig), config: clientConfig };
    switch (config.template) {
      case 'classic':               return <ClassicTemplate {...props} />;
      case 'premium':               return <PremiumTemplate {...props} />;
      case 'detailed':              return <DetailedTemplate {...props} />;
      case 'compact':               return <CompactTemplate {...props} />;
      case 'buildsoftware-premium':  return <TripNestPremiumTemplate {...props} />;
      case 'luxury-boutique':       return <LuxuryBoutiqueTemplate {...props} />;
      case 'luxury-travel':         return <LuxuryTravelQuotationTemplate {...props} />;
      case 'thai-experience':      return <ThaiExperienceTemplate {...props} />;
      case 'portrait-creative':    return <PortraitCreativeTemplate {...props} />;
      default:                      return <PremiumTemplate {...props} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>

      {/* ── Top Bar ───────────────────────────────────────────────────────── */}
      <div style={{ minHeight: 48, flexWrap: 'wrap', gap: 6, background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', flexShrink: 0, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate('/app/documents')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>PDF Template Settings</div>
            <div className="hidden sm:block" style={{ fontSize: 11, color: '#64748b' }}>Manage templates · Preview quotation design · Configure settings</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selectedTpl && (
            <>
              <button
                onClick={handleGeneratePDF}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#374151', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                <Download size={13} /> <span className="hidden sm:inline">Generate PDF</span>
              </button>
              <button
                onClick={handleUseForQuotations}
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #14a09a, #0e8a85)', color: 'white', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, fontSize: 12, fontWeight: 700, boxShadow: '0 3px 10px rgba(14,160,154,0.3)' }}
              >
                <FileText size={13} /> <span className="hidden sm:inline">Use for Quotations</span>
              </button>
            </>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: saved ? '#10b981' : 'linear-gradient(135deg, #0B5EA8, #0b6f6b)', color: 'white', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, fontSize: 12, fontWeight: 700, boxShadow: '0 3px 10px rgba(11,94,168,0.3)' }}
          >
            {saved ? <><Check size={13} /> Saved!</> : <><Save size={13} /> <span className="hidden sm:inline">{saving ? 'Saving…' : 'Save Settings'}</span></>}
          </button>
        </div>
      </div>

      
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
      {/* ── 3-Column Body ─────────────────────────────────────────────────── */}
      <div className="flex-col lg:flex-row" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── COL 1: Template List (30%) ───────────────────────────────── */}
        <div className={`${mobilePane === 'templates' ? 'flex' : 'hidden'} lg:flex flex-1 min-h-0 lg:flex-none lg:w-[30%]`} style={{ flexShrink: 0, background: 'white', borderRight: '1px solid #e2e8f0', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>PDF Templates</span>
            <button onClick={() => setShowNewTemplate(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, background: 'linear-gradient(135deg,#14a09a,#0e8a85)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
              <Plus size={11} /> New
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignContent: 'start' }}>
            {loadingTemplates && <div style={{ gridColumn: '1 / -1', padding: '16px 6px', fontSize: 11, color: '#64748b', textAlign: 'center' }}>Loading saved templates…</div>}
            {!loadingTemplates && !displayTemplates.length && <div style={{ gridColumn: '1 / -1', padding: '16px 6px', fontSize: 11, color: '#64748b', textAlign: 'center' }}>No saved templates yet. Create one to use it in quotations.</div>}
            {displayTemplates.map(tpl => (
              <TemplateCard
                key={tpl.id}
                tpl={tpl}
                isSelected={selectedId === tpl.id}
                showMenu={showMenu === tpl.id}
                menuRef={menuRef}
                onSelect={() => handleSelectTemplate(tpl)}
                onToggleMenu={(e) => { e.stopPropagation(); setShowMenu(showMenu === tpl.id ? null : tpl.id); }}
                onSetDefault={() => handleSetDefault(tpl.id)}
                onToggleEnabled={() => handleEnabledChange(tpl.id, tpl.isEnabled === false)}
                onDuplicate={() => handleDuplicate(tpl.id)}
                onDelete={() => { setShowDeleteConfirm(tpl.id); setShowMenu(null); }}
              />
            ))}
          </div>
        </div>

        {/* ── COL 2: Settings Panel (30%) ─────────────────────────────── */}
        <div className={`${mobilePane === 'settings' ? 'flex' : 'hidden'} lg:flex flex-1 min-h-0 lg:flex-none lg:w-[30%]`} style={{ flexShrink: 0, background: 'white', borderRight: '1px solid #e2e8f0', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Settings size={12} color="#0B5EA8" /> Design Options
            </span>
            {selectedTpl && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{selectedTpl.name}</div>}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* Client PDF content */}
            <SettingsSection title="Client PDF Content" icon={Eye} isOpen={activeSection === 'clientContent'} onToggle={() => setActiveSection(activeSection === 'clientContent' ? null : 'clientContent')}>
              <div style={{ fontSize: 9, lineHeight: 1.4, color: '#64748b', marginBottom: 7 }}>
                Choose what clients receive in this template. Internal quotation data remains unchanged.
              </div>
              {[
                { key: 'showClientItinerary', label: 'Day-wise itinerary' },
                { key: 'showClientHotels', label: 'Hotel details' },
                { key: 'showClientSightseeing', label: 'Sightseeing & activities' },
                { key: 'showClientMasterDescriptions', label: 'Master descriptions' },
              ].map((item) => {
                const enabled = config[item.key] !== false;
                return (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                    <span style={{ fontSize: 10, color: '#374151' }}>{item.label}</span>
                    <button type="button" onClick={() => updateConfig({ [item.key]: !enabled })} aria-pressed={enabled} style={{ width: 32, height: 18, padding: 0, border: 'none', borderRadius: 9, background: enabled ? '#0B5EA8' : '#cbd5e1', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: enabled ? 16 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </button>
                  </div>
                );
              })}
            </SettingsSection>

            {/* 1. Template Format */}
            <SettingsSection title="1. Select PDF Format" icon={Layout} isOpen={activeSection === 'format'} onToggle={() => setActiveSection(activeSection === 'format' ? null : 'format')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                {FORMAT_PRESETS.map(t => (
                  <div key={t.id} style={{ cursor: 'pointer', minWidth: 0 }} onClick={() => updateConfig({ template: t.id })}>
                    <MiniTemplateThumbnail id={t.id} selected={config.template === t.id} primaryColor={t.primaryColor} />
                    <div style={{ textAlign: 'center', marginTop: 4, fontSize: 9, fontWeight: 600, color: config.template === t.id ? '#0B5EA8' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                  </div>
                ))}
              </div>
            </SettingsSection>

            {/* 2. Theme */}
            <SettingsSection title="2. Theme / Style" icon={Palette} isOpen={activeSection === 'theme'} onToggle={() => setActiveSection(activeSection === 'theme' ? null : 'theme')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                {THEME_KEYS.map(themeKey => {
                  const theme = THEMES[themeKey];
                  return (
                    <div key={themeKey} onClick={() => updateConfig({ theme: themeKey })} style={{ cursor: 'pointer' }}>
                      <div style={{ height: 36, borderRadius: 5, border: config.theme === themeKey ? '2px solid #0B5EA8' : '1.5px solid #e2e8f0', overflow: 'hidden', position: 'relative' }}>
                        <div style={{ height: 16, background: theme.coverGradient || theme.accent }} />
                        <div style={{ height: 3, background: theme.accent }} />
                        <div style={{ padding: '2px 4px' }}>
                          <div style={{ height: 3, background: theme.borderColor, borderRadius: 1 }} />
                        </div>
                        {config.theme === themeKey && <div style={{ position: 'absolute', top: 2, right: 2, width: 10, height: 10, background: '#0B5EA8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={6} color="white" /></div>}
                      </div>
                      <div style={{ textAlign: 'center', fontSize: 8, color: config.theme === themeKey ? '#0B5EA8' : '#64748b', marginTop: 2, fontWeight: 600 }}>{theme.name}</div>
                    </div>
                  );
                })}
              </div>
            </SettingsSection>

            {/* 3. Cover Background */}
            <SettingsSection title="3. Cover Background" icon={ImageIcon} isOpen={activeSection === 'coverBg'} onToggle={() => setActiveSection(activeSection === 'coverBg' ? null : 'coverBg')}>
              {['destination-image', 'gradient', 'solid'].map(bg => (
                <button key={bg} onClick={() => updateConfig({ coverBackground: bg })}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px', marginBottom: 4, border: `1.5px solid ${config.coverBackground === bg ? '#0B5EA8' : '#e2e8f0'}`, borderRadius: 7, background: config.coverBackground === bg ? '#eff6ff' : 'white', cursor: 'pointer' }}>
                  <div style={{ width: 24, height: 18, borderRadius: 4, background: bg === 'destination-image' ? 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=60&q=40) center/cover' : bg === 'gradient' ? 'linear-gradient(135deg, #0B5EA8, #1e3a8a)' : '#0B5EA8', border: '1px solid #e2e8f0' }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: config.coverBackground === bg ? '#0B5EA8' : '#374151' }}>{bg === 'destination-image' ? 'Destination Image' : bg === 'gradient' ? 'Gradient' : 'Solid Color'}</span>
                  {config.coverBackground === bg && <Check size={11} color="#0B5EA8" style={{ marginLeft: 'auto' }} />}
                </button>
              ))}
            </SettingsSection>

            {/* 4. Cover Image */}
            <SettingsSection title="4. Cover Image" icon={ImageIcon} isOpen={activeSection === 'coverImg'} onToggle={() => setActiveSection(activeSection === 'coverImg' ? null : 'coverImg')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                {COVER_KEYS.map(key => {
                  const img = COVER_IMAGES[key];
                  return (
                    <div key={key} onClick={() => updateConfig({ coverImage: key })} style={{ cursor: 'pointer' }}>
                      <div style={{ height: 44, borderRadius: 5, overflow: 'hidden', border: config.coverImage === key ? '2px solid #0B5EA8' : '1.5px solid #e2e8f0', position: 'relative' }}>
                        <img src={img.thumb} alt={img.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        {config.coverImage === key && <div style={{ position: 'absolute', top: 2, right: 2, width: 12, height: 12, background: '#0B5EA8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={7} color="white" /></div>}
                      </div>
                      <div style={{ textAlign: 'center', fontSize: 8, color: config.coverImage === key ? '#0B5EA8' : '#64748b', marginTop: 2, fontWeight: 600 }}>{img.label}</div>
                    </div>
                  );
                })}
              </div>
            </SettingsSection>

            {/* 5. Typography */}
            <SettingsSection title="5. Typography" icon={Type} isOpen={activeSection === 'typography'} onToggle={() => setActiveSection(activeSection === 'typography' ? null : 'typography')}>
              {['inter', 'georgia', 'roboto', 'manrope', 'poppins'].map(font => (
                <button key={font} onClick={() => updateConfig({ fontStyle: font })}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px', marginBottom: 4, border: `1.5px solid ${config.fontStyle === font ? '#0B5EA8' : '#e2e8f0'}`, borderRadius: 7, background: config.fontStyle === font ? '#eff6ff' : 'white', cursor: 'pointer' }}>
                  <span style={{ fontSize: 11, fontFamily: { inter: 'Inter,sans-serif', georgia: 'Georgia,serif', roboto: 'Roboto,sans-serif', manrope: 'Manrope,sans-serif', poppins: 'Poppins,sans-serif' }[font], fontWeight: 700, color: config.fontStyle === font ? '#0B5EA8' : '#374151', flex: 1, textAlign: 'left' }}>Aa – {font.charAt(0).toUpperCase() + font.slice(1)}</span>
                  {config.fontStyle === font && <Check size={11} color="#0B5EA8" />}
                </button>
              ))}
            </SettingsSection>

            {/* 6. Page Background */}
            <SettingsSection title="6. Page Background" icon={FileText} isOpen={activeSection === 'pageBg'} onToggle={() => setActiveSection(activeSection === 'pageBg' ? null : 'pageBg')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 8 }}>
                {[
                  { id: 'white',                 label: 'White',               bg: '#FFFFFF' },
                  { id: 'light-pattern',          label: 'Light Pattern',       bg: 'repeating-linear-gradient(45deg,#F8FAFC,#F8FAFC 4px,#FFFFFF 4px,#FFFFFF 8px)' },
                  { id: 'destination-watermark',  label: 'Destination Watermark', bg: 'linear-gradient(135deg,#f0f4f8,#e8edf2)' },
                  { id: 'custom',                 label: 'Custom',              bg: config.customPageBackground || '#F8F0DF' },
                ].map(opt => (
                  <button key={opt.id} onClick={() => updateConfig({ pageBackground: opt.id })}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px', border: `1.5px solid ${config.pageBackground === opt.id ? '#0B5EA8' : '#e2e8f0'}`, borderRadius: 7, background: config.pageBackground === opt.id ? '#eff6ff' : 'white', cursor: 'pointer', position: 'relative' }}>
                    <div style={{ width: '100%', height: 22, borderRadius: 4, background: opt.bg, border: '1px solid #f0f0f0' }} />
                    <span style={{ fontSize: 8, fontWeight: 600, color: config.pageBackground === opt.id ? '#0B5EA8' : '#374151', textAlign: 'center', lineHeight: 1.2 }}>{opt.label}</span>
                    {config.pageBackground === opt.id && <div style={{ position: 'absolute', top: 3, right: 3, width: 10, height: 10, background: '#0B5EA8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={6} color="white" /></div>}
                  </button>
                ))}
              </div>
              {config.pageBackground === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#f8fafc', borderRadius: 7, border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: 9, fontWeight: 600, color: '#374151', minWidth: 40 }}>Custom Color</label>
                  <input type="color" value={config.customPageBackground || '#F8F0DF'}
                    onChange={e => updateConfig({ customPageBackground: e.target.value })}
                    style={{ width: 28, height: 22, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
                  <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'monospace' }}>{(config.customPageBackground || '#F8F0DF').toUpperCase()}</span>
                </div>
              )}
            </SettingsSection>

            {/* 7. Section Style */}
            <SettingsSection title="7. Section Style" icon={Settings} isOpen={activeSection === 'sectionStyle'} onToggle={() => setActiveSection(activeSection === 'sectionStyle' ? null : 'sectionStyle')}>
              {[
                { id: 'standard', label: 'Standard',  preview: { bg: '#f8fafc', border: '1px solid #e2e8f0', text: '#374151' } },
                { id: 'cards',    label: 'Cards',      preview: { bg: 'white',   border: '1px solid #cbd5e1', text: '#1e293b', shadow: '0 2px 6px rgba(0,0,0,0.08)' } },
                { id: 'modern',   label: 'Modern',     preview: { bg: 'linear-gradient(135deg,#f0f7ff,#e8f4fd)', border: '1px solid #bfdbfe', text: '#0a5856' } },
                { id: 'luxury',   label: 'Luxury',     preview: { bg: 'linear-gradient(135deg,#1a1a2e,#16213e)', border: '1px solid #B8860B', text: '#F5EBD0' } },
              ].map(opt => (
                <button key={opt.id} onClick={() => updateConfig({ sectionStyle: opt.id })}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', marginBottom: 4, border: `1.5px solid ${config.sectionStyle === opt.id ? '#0B5EA8' : '#e2e8f0'}`, borderRadius: 7, background: config.sectionStyle === opt.id ? '#eff6ff' : 'white', cursor: 'pointer' }}>
                  <div style={{ width: 40, height: 18, borderRadius: 4, background: opt.preview.bg, border: opt.preview.border, boxShadow: opt.preview.shadow || 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 7, fontWeight: 700, color: opt.preview.text }}>Aa</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: config.sectionStyle === opt.id ? '#0B5EA8' : '#374151', flex: 1 }}>{opt.label}</span>
                  {config.sectionStyle === opt.id && <Check size={11} color="#0B5EA8" />}
                </button>
              ))}
            </SettingsSection>

            {/* 8. Accent Color */}
            <SettingsSection title="8. Accent Color" icon={Palette} isOpen={activeSection === 'accent'} onToggle={() => setActiveSection(activeSection === 'accent' ? null : 'accent')}>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                {['#0B5EA8','#102A43','#168F89','#D5AA3A','#F59E0B','#059669','#EF4444','#0e8a85','#8B5CF6','#EC4899','#64748B','#1a1a2e'].map(c => (
                  <div key={c} onClick={() => updateConfig({ accentColor: c })}
                    style={{ width: 22, height: 22, borderRadius: 5, background: c, cursor: 'pointer', border: config.accentColor === c ? '2.5px solid #0f172a' : '2px solid transparent', boxShadow: config.accentColor === c ? '0 0 0 1.5px white inset' : 'none', transition: 'transform 0.15s', transform: config.accentColor === c ? 'scale(1.15)' : 'scale(1)' }} />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#f8fafc', borderRadius: 7, border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: 9, fontWeight: 600, color: '#374151', minWidth: 40 }}>Custom:</label>
                <input type="color" value={config.accentColor || '#0B5EA8'}
                  onChange={e => updateConfig({ accentColor: e.target.value })}
                  style={{ width: 28, height: 22, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
                <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'monospace' }}>{(config.accentColor || '#0B5EA8').toUpperCase()}</span>
              </div>
            </SettingsSection>

            {/* 9. Image Settings */}
            <SettingsSection title="9. Image Settings" icon={ImageIcon} isOpen={activeSection === 'images'} onToggle={() => setActiveSection(activeSection === 'images' ? null : 'images')}>
              {[
                { key: 'showHotelImages',    label: 'Hotel Images' },
                { key: 'showActivityImages', label: 'Sightseeing Images' },
                { key: 'showTransferImages', label: 'Transfer Images' },
              ].map(item => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ fontSize: 10, color: '#374151' }}>{item.label}</span>
                  <div onClick={() => updateConfig({ [item.key]: !config[item.key] })}
                    style={{ width: 32, height: 18, borderRadius: 9, background: config[item.key] ? '#0B5EA8' : '#cbd5e1', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: config[item.key] ? 16 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Image Source</div>
                {[
                  { id: 'auto',     label: 'Auto (from master data)' },
                  { id: 'static',   label: 'Static' },
                  { id: 'uploaded', label: 'Uploaded' },
                ].map(src => (
                  <label key={src.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}>
                    <input type="radio" name="imageSource" checked={(config.imageSource || 'auto') === src.id}
                      onChange={() => updateConfig({ imageSource: src.id })}
                      style={{ accentColor: '#0B5EA8' }} />
                    <span style={{ fontSize: 10, color: '#374151' }}>{src.label}</span>
                  </label>
                ))}
              </div>
            </SettingsSection>

            {/* 10. Logo */}
            <SettingsSection title="10. Logo" icon={FileText} isOpen={activeSection === 'logo'} onToggle={() => setActiveSection(activeSection === 'logo' ? null : 'logo')}>
              <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
                {[
                  { id: 'buildsoftware', label: 'Agent / B2C' },
                  { id: 'none',         label: 'None' },
                ].map(opt => (
                  <button key={opt.id} onClick={() => updateConfig({ logo: opt.id })}
                    style={{ flex: 1, padding: '6px 4px', border: `1.5px solid ${config.logo === opt.id ? '#0B5EA8' : '#e2e8f0'}`, borderRadius: 7, background: config.logo === opt.id ? '#eff6ff' : 'white', cursor: 'pointer', fontSize: 9, fontWeight: 600, color: config.logo === opt.id ? '#0B5EA8' : '#374151' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Position</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {['Left', 'Center', 'Right'].map(pos => (
                  <button key={pos} onClick={() => updateConfig({ logoPosition: pos.toLowerCase() })}
                    style={{ flex: 1, padding: '6px 4px', border: `1.5px solid ${(config.logoPosition || 'left') === pos.toLowerCase() ? '#0B5EA8' : '#e2e8f0'}`, borderRadius: 7, background: (config.logoPosition || 'left') === pos.toLowerCase() ? '#eff6ff' : 'white', cursor: 'pointer', fontSize: 9, fontWeight: 600, color: (config.logoPosition || 'left') === pos.toLowerCase() ? '#0B5EA8' : '#374151' }}>
                    {pos}
                  </button>
                ))}
              </div>
            </SettingsSection>

            {/* 11. Image Layout */}
            <SettingsSection title="11. Image Layout" icon={Layout} isOpen={activeSection === 'imgLayout'} onToggle={() => setActiveSection(activeSection === 'imgLayout' ? null : 'imgLayout')}>
              {[
                { id: 'full-width',   label: 'Full Width',    icon: '▬' },
                { id: 'two-column',   label: 'Two Column',    icon: '⧈' },
                { id: 'three-column', label: 'Three Column',  icon: '⊞' },
                { id: 'grid',         label: 'Grid',          icon: '⊟' },
                { id: 'hero-cards',   label: 'Hero Cards',    icon: '▣' },
              ].map(opt => (
                <button key={opt.id} onClick={() => updateConfig({ imageLayout: opt.id })}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', marginBottom: 4, border: `1.5px solid ${config.imageLayout === opt.id ? '#0B5EA8' : '#e2e8f0'}`, borderRadius: 7, background: config.imageLayout === opt.id ? '#eff6ff' : 'white', cursor: 'pointer' }}>
                  <span style={{ fontSize: 14, lineHeight: 1 }}>{opt.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: config.imageLayout === opt.id ? '#0B5EA8' : '#374151', flex: 1 }}>{opt.label}</span>
                  {config.imageLayout === opt.id && <Check size={11} color="#0B5EA8" />}
                </button>
              ))}
            </SettingsSection>

            {/* 12. Export Layout */}
            <SettingsSection title="12. Print & Download Layout" icon={Layout} isOpen={activeSection === 'pdfLayout'} onToggle={() => setActiveSection(activeSection === 'pdfLayout' ? null : 'pdfLayout')}>
              <div style={{ fontSize: 9, lineHeight: 1.4, color: '#64748b', marginBottom: 8 }}>
                Saved settings used by the live preview, Download PDF, and Print PDF.
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Maximum footer gap</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 10 }}>
                {[5, 10, 15, 20].map((gap) => (
                  <button key={gap} onClick={() => updateConfig({ pdfFooterGapPercent: gap, pdfPageFillPercent: Math.min(Number(config.pdfPageFillPercent || 90), 100 - gap) })}
                    style={{ padding: '5px 2px', border: `1.5px solid ${Number(config.pdfFooterGapPercent || 10) === gap ? '#0B5EA8' : '#e2e8f0'}`, borderRadius: 6, background: Number(config.pdfFooterGapPercent || 10) === gap ? '#eff6ff' : 'white', cursor: 'pointer', fontSize: 9, fontWeight: 700, color: Number(config.pdfFooterGapPercent || 10) === gap ? '#0B5EA8' : '#475569' }}>
                    {gap}%
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#374151' }}>Page fill</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#0B5EA8' }}>{Math.min(Number(config.pdfPageFillPercent || 90), 100 - Number(config.pdfFooterGapPercent || 10))}%</span>
              </div>
              <input type="range" min="65" max={100 - Number(config.pdfFooterGapPercent || 10)} step="1"
                value={Math.min(Number(config.pdfPageFillPercent || 90), 100 - Number(config.pdfFooterGapPercent || 10))}
                onChange={(event) => updateConfig({ pdfPageFillPercent: Number(event.target.value) })}
                style={{ width: '100%', accentColor: '#0B5EA8', marginBottom: 9 }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #f1f5f9', marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: '#374151' }}>Keep cards and photos together</span>
                <div onClick={() => updateConfig({ pdfKeepSectionsTogether: config.pdfKeepSectionsTogether === false })}
                  style={{ width: 32, height: 18, borderRadius: 9, background: config.pdfKeepSectionsTogether === false ? '#cbd5e1' : '#0B5EA8', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: config.pdfKeepSectionsTogether === false ? 2 : 16, transition: 'left 0.2s' }} />
                </div>
              </div>
              {config.template === 'luxury-travel' && <>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Journey highlight cards per row</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 9 }}>
                  {[2, 3, 4].map((count) => (
                    <button key={count} onClick={() => updateConfig({ highlightCardsPerRow: count })}
                      style={{ padding: '5px 2px', border: `1.5px solid ${Number(config.highlightCardsPerRow || 4) === count ? '#0B5EA8' : '#e2e8f0'}`, borderRadius: 6, background: Number(config.highlightCardsPerRow || 4) === count ? '#eff6ff' : 'white', cursor: 'pointer', fontSize: 9, fontWeight: 700, color: Number(config.highlightCardsPerRow || 4) === count ? '#0B5EA8' : '#475569' }}>
                      {count} cards
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#374151' }}>Highlight image height</span>
                  <button onClick={() => updateConfig({ highlightImageHeight: 0 })} style={{ border: 'none', background: 'transparent', color: '#0B5EA8', cursor: 'pointer', fontSize: 8, fontWeight: 700 }}>Auto</button>
                </div>
                <input type="range" min="80" max="190" step="2" value={Number(config.highlightImageHeight) || 124}
                  onChange={(event) => updateConfig({ highlightImageHeight: Number(event.target.value) })}
                  style={{ width: '100%', accentColor: '#0B5EA8' }} />
                <div style={{ fontSize: 8.5, color: '#64748b', marginTop: 2 }}>{Number(config.highlightImageHeight) > 0 ? `${config.highlightImageHeight}px` : 'Auto height by card row'}</div>
              </>}
            </SettingsSection>

          </div>
        </div>

        {/* ── COL 3: Live PDF Preview (40%) ────────────────────────────────────── */}
        <div className={`${mobilePane === 'preview' ? 'flex' : 'hidden'} lg:flex flex-1 min-h-0 lg:flex-none lg:w-[40%]`} style={{ flexShrink: 0, flexDirection: 'column', minWidth: 0, overflow: 'hidden', background: '#e8ecf0' }}>
          {/* Preview header */}
          <div style={{ height: 40, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Eye size={13} color="#fff" />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>Live Preview</span>
              {selectedTpl && <span className="hidden sm:inline" style={{ fontSize: 10, color: '#fff', background: '#334155', padding: '2px 8px', borderRadius: 10 }}>{selectedTpl.name}</span>}
              <span className="hidden sm:inline" style={{ fontSize: 9, color: '#fff' }}>· Sample Data</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: '#334155', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ZoomOut size={12} /></button>
              <span style={{ fontSize: 10, color: '#fff', minWidth: 36, textAlign: 'center', fontWeight: 'bold' }}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: '#334155', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ZoomIn size={12} /></button>
              <div style={{ width: 1, height: 16, background: '#475569', margin: '0 4px' }} />
              <button onClick={handleGeneratePDF} title="Download PDF" style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: '#334155', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Download size={12} /></button>
            </div>
          </div>

          {/* Scrollable preview area */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '12px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', flexShrink: 0, width: 595 }}>
              <div id="pdf-preview-render" className="pdf-flow-preview">
                <style>{FLOW_LAYOUT_CSS}</style>
                {renderTemplate()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Delete Confirm Modal ───────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 20, width: 'min(340px, calc(100vw - 24px))', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Delete Template?</div>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteConfirm(null)} style={{ flex: 1, padding: 9, borderRadius: 9, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} style={{ flex: 1, padding: 9, borderRadius: 9, border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Template Modal ───────────────────────────────────────── */}
      {showNewTemplate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 20, width: 'min(400px, calc(100vw - 24px))', maxHeight: 'calc(100dvh - 24px)', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.22)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Create PDF Template</div>
              <button onClick={() => setShowNewTemplate(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px' }}>The current design settings will be saved as a new reusable quotation template.</p>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Template name</label>
            <input autoFocus value={newTemplate.name} onChange={(event) => setNewTemplate((previous) => ({ ...previous, name: event.target.value }))} placeholder="e.g. Thailand Premium 2026" style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none', fontSize: 12, marginBottom: 12 }} />
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Description <span style={{ color: '#94a3b8', fontWeight: 500 }}>(optional)</span></label>
            <textarea value={newTemplate.description} onChange={(event) => setNewTemplate((previous) => ({ ...previous, description: event.target.value }))} placeholder="When this template should be used" rows={3} style={{ resize: 'vertical', width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none', fontSize: 12, marginBottom: 18 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNewTemplate(false)} disabled={saving} style={{ flex: 1, padding: 9, borderRadius: 9, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={handleCreate} disabled={saving} style={{ flex: 1, padding: 9, borderRadius: 9, border: 'none', background: '#0e8a85', color: 'white', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, fontSize: 13, fontWeight: 700 }}>{saving ? 'Creating…' : 'Create Template'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Template Card (left list) ─────────────────────────────────────────── */
function TemplateCard({ tpl, isSelected, showMenu, menuRef, onSelect, onToggleMenu, onSetDefault, onToggleEnabled, onDuplicate, onDelete }) {
  return (
    <div
      onClick={onSelect}
      style={{
        borderRadius: 12,
        cursor: 'pointer',
        border: `1.5px solid ${isSelected ? '#14a09a' : '#d1d5db'}`,
        background: isSelected ? '#eff6ff' : 'white',
        transition: 'all 0.15s',
        position: 'relative',
        // The action menu extends below the card. Keep the thumbnail clipped
        // normally, but let an open menu sit above adjacent template cards.
        overflow: showMenu ? 'visible' : 'hidden',
        zIndex: showMenu ? 50 : 1,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isSelected ? '0 4px 14px rgba(14,160,154,0.15)' : '0 2px 6px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#93c5fd'; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = '#d1d5db'; }}
    >
      {/* Top Banner (Real Preview) */}
      <div style={{ position: 'relative', padding: '12px 12px 0 12px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ pointerEvents: 'none' }}>
          <MiniTemplateThumbnail id={tpl.config?.template || 'classic'} primaryColor={tpl.primaryColor} selected={false} />
        </div>
        
        {/* Menu button floating on the banner */}
        <div ref={showMenu ? menuRef : null} style={{ position: 'absolute', top: 16, right: 16, zIndex: 100 }}>
          <button onClick={onToggleMenu} style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <MoreHorizontal size={14} color="#475569" />
          </button>
          {showMenu && (
            <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, width: 140, zIndex: 101, background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '4px 0' }} onClick={e => e.stopPropagation()}>
              {[
                { label: tpl.isDefault ? 'Is Default ✓' : 'Set as Default', icon: Star, action: onSetDefault },
                { label: tpl.isEnabled === false ? 'Enable in Preview' : 'Disable in Preview', icon: Eye, action: onToggleEnabled },
                { label: 'Duplicate', icon: Copy, action: onDuplicate },
                { label: 'Delete', icon: Trash2, action: onDelete, danger: true },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.label} onClick={item.action} style={{ width: '100%', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7, border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, color: item.danger ? '#ef4444' : '#374151', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = item.danger ? '#fef2f2' : '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Icon size={12} /> {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a', marginBottom: 2, lineHeight: 1.2 }}>{tpl.name}</div>
        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 10 }}>{tpl.style}</div>
        
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: tpl.isEnabled === false ? '#f1f5f9' : '#dcfce7', color: tpl.isEnabled === false ? '#64748b' : '#15803d' }}>{tpl.status}</span>
          {tpl.isDefault && <span style={{ fontSize: 8, fontWeight: 700, color: '#14a09a', background: '#dbeafe', padding: '2px 6px', borderRadius: 6 }}>DEFAULT</span>}
        </div>
      </div>
    </div>
  );
}

/* ─── Collapsible settings section ─────────────────────────────────────────── */
function SettingsSection({ title, icon: Icon, children, isOpen, onToggle }) {
  return (
    <div style={{ borderBottom: '1px solid #f1f5f9' }}>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        {Icon && <Icon size={11} color="#0B5EA8" style={{ flexShrink: 0 }} />}
        <span style={{ flex: 1, fontSize: 10.5, fontWeight: 700, color: '#374151' }}>{title}</span>
        {isOpen ? <ChevronUp size={10} color="#94a3b8" /> : <ChevronDown size={10} color="#94a3b8" />}
      </button>
      {isOpen && <div style={{ padding: '0 10px 10px' }}>{children}</div>}
    </div>
  );
}

/* ─── Mini template thumbnail ────────────────────────────────────────────── */
function MiniTemplateThumbnail({ id, selected, primaryColor }) {
  const isTA = id === 'buildsoftware-premium';
  const isLX = id === 'luxury-boutique';
  const isThaiExperience = id === 'thai-experience';
  const isPortraitCreative = id === 'portrait-creative';
  if (isPortraitCreative) {
    // Mini preview of the teal portrait layout: sky cover, badge, diamond stats, teal rule.
    return (
      <div style={{ height: 52, borderRadius: 5, border: selected ? '2px solid #0B5EA8' : '2px solid #e2e8f0', background: '#fff', overflow: 'hidden', position: 'relative', cursor: 'pointer', transition: 'border-color 0.15s' }}>
        <div style={{ height: 24, background: 'linear-gradient(180deg, #BFE3FA, #6FC3C0)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 3, left: '50%', transform: 'translateX(-50%)', width: '60%', height: 3, background: '#0B3B45', borderRadius: 2 }} />
          <div style={{ position: 'absolute', right: 4, bottom: -4, width: 14, height: 7, background: '#fff', border: '1px solid #0E9B97', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end', padding: '5px 5px 0' }}>
          {[0, 1, 2].map((n) => <div key={n} style={{ width: 6, height: 6, background: '#0E9B97', transform: 'rotate(45deg)', borderRadius: 1 }} />)}
        </div>
        <div style={{ position: 'absolute', left: 5, bottom: 12, width: '38%', height: 3, background: '#0E9B97', borderRadius: 1 }} />
        <div style={{ position: 'absolute', left: 5, right: 5, bottom: 4, height: 4, background: '#0E9B97', borderRadius: 1, opacity: 0.85 }} />
        {selected && <div style={{ position: 'absolute', top: 2, right: 2, width: 12, height: 12, background: '#0B5EA8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={7} color="white" /></div>}
      </div>
    );
  }
  const bgColor = isThaiExperience ? '#0A2240' : isLX ? '#1a1a2e' : isTA ? '#E7F5F3' : '#f8fafc';
  const accentColor = primaryColor;
  return (
    <div style={{ height: 52, borderRadius: 5, border: selected ? '2px solid #0B5EA8' : '2px solid #e2e8f0', background: bgColor, overflow: 'hidden', position: 'relative', cursor: 'pointer', transition: 'border-color 0.15s' }}>
      <div style={{ padding: '4px 4px 3px' }}>
        <div style={{ height: 6, background: accentColor, borderRadius: 2, marginBottom: 2 }} />
        {(id === 'premium' || isTA || isThaiExperience) && (
          <div style={{ height: 16, background: isThaiExperience ? 'linear-gradient(135deg, #FF6B4A, #74d0cb)' : `linear-gradient(135deg, ${accentColor}cc, #1e3a8a)`, borderRadius: 2, marginBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: isThaiExperience ? '#0A2240' : '#F59E0B', fontSize: 5, fontWeight: 900 }}>THAILAND</span>
          </div>
        )}
        {[...Array(id === 'premium' || isTA || isThaiExperience ? 2 : 3)].map((_, i) => (
          <div key={i} style={{ height: 4, background: i % 2 === 0 ? accentColor + '66' : (isThaiExperience ? '#E0F7FA88' : '#e2e8f0'), borderRadius: 1, marginBottom: 1.5, width: i === 2 ? '70%' : '100%' }} />
        ))}
      </div>
      {selected && <div style={{ position: 'absolute', top: 2, right: 2, width: 12, height: 12, background: '#0B5EA8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={7} color="white" /></div>}
    </div>
  );
}
