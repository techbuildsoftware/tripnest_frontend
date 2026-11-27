import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import LogoImg from '../../../assets/logo-color.png';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Star, Eye, Download, ZoomIn, ZoomOut,
  Maximize2, Printer, ChevronLeft, ChevronRight, ChevronDown,
  ChevronUp, Check, Upload, Palette, Image, Layout, Type,
  Settings, FileText, X,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { DEFAULT_PDF_CONFIG, THEMES, COVER_IMAGES } from './data/pdfConfig';
import { quotationForPdf } from './data/quotationPdf';
import { apiClient } from '../../../lib/api';
import { downloadPdfFromElement, pdfLayoutOptionsFromConfig, printPdfDocument } from '../../../lib/directPdfDownload';
import { quotationPdfFilename } from '../../../lib/documentFilename';
import PdfLayoutFrame from './components/PdfLayoutFrame';
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
} from './components/PDFTemplates';
import toast from 'react-hot-toast';

// ─── Template metadata ────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    fullName: 'Classic Professional',
    desc: 'Clean corporate format for travel agents (B2B)',
    thumb: 'classic',
  },
  {
    id: 'premium',
    name: 'Premium',
    fullName: 'Premium Visual',
    desc: 'Destination-focused for end customers',
    thumb: 'premium',
  },
  {
    id: 'detailed',
    name: 'Detailed',
    fullName: 'Detailed Itinerary',
    desc: 'Comprehensive day-wise travel itinerary',
    thumb: 'detailed',
  },
  {
    id: 'compact',
    name: 'Compact',
    fullName: 'Compact Rate Quotation',
    desc: 'Short, price-focused B2B quotation',
    thumb: 'compact',
  },
  {
    id: 'buildsoftware-premium',
    name: 'TripNest',
    fullName: 'Premium Thailand Travel',
    desc: 'Luxury CRM template: hero cover, day cards, teal/navy/gold',
    thumb: 'buildsoftware-premium',
  },
  {
    id: 'luxury-boutique',
    name: 'Luxury Boutique',
    fullName: 'Luxury Boutique Travel',
    desc: 'Dark luxury theme with gold accents for premium packages',
    thumb: 'luxury-boutique',
  },
  {
    id: 'luxury-travel',
    name: 'Luxury Travel',
    fullName: 'Luxury Travel Quotation',
    desc: 'Premium travel proposal: hero cover, day cards, city banners, navy/teal/gold',
    thumb: 'luxury-travel',
  },
  {
    id: 'thai-experience',
    name: 'Thai Experience',
    fullName: 'Thai Experience',
    desc: 'Tropical Thailand template: sightseeing, activities, yacht/ferry with rich imagery',
    thumb: 'thai-experience',
  },
  {
    id: 'portrait-creative',
    name: 'Portrait Creative',
    fullName: 'Portrait Creative',
    desc: 'Illustrated teal portrait proposal: sky cover, diamond trip stats, hotel/flight/transfer tables, photo day cards',
    thumb: 'portrait-creative',
  },
];

const SECTION_STYLES = ['standard', 'cards', 'modern', 'luxury'];
const IMAGE_LAYOUTS = ['full-width', 'two-column', 'three-column', 'grid', 'hero-cards'];
const ACCENT_PRESETS = ['#0B5EA8', '#F59E0B', '#059669', '#EF4444', '#0e8a85', '#8B5CF6', '#64748B'];
const FONT_STYLES = ['inter', 'georgia', 'roboto'];

// ─── Mini template thumbnail ──────────────────────────────────────────────────
function TemplateThumbnail({ id, selected, onClick }) {
  const colors = {
    classic: { bg: '#F0F4FF', accent: '#0B5EA8', line1: '#93C5FD', line2: '#BFDBFE' },
    premium: { bg: '#1E3A5F', accent: '#F59E0B', line1: '#60A5FA', line2: '#93C5FD' },
    detailed: { bg: '#F0FDF4', accent: '#059669', line1: '#6EE7B7', line2: '#A7F3D0' },
    compact: { bg: '#eff6ff', accent: '#0e8a85', line1: '#bfdbfe', line2: '#FEF3C7' },
    'buildsoftware-premium': { bg: '#E7F5F3', accent: '#102A43', line1: '#008F87', line2: '#C9A13B' },
    'luxury-boutique': { bg: '#1a1a2e', accent: '#B8860B', line1: '#D4A017', line2: '#F5EBD0' },
    'luxury-travel':   { bg: '#F7EED8', accent: '#102A43', line1: '#168F89', line2: '#D5AA3A' },
    'thai-experience': { bg: '#0A2240', accent: '#FF6B4A', line1: '#74d0cb', line2: '#E0F7FA' },
    'portrait-creative': { bg: '#EAF6FD', accent: '#0E9B97', line1: '#0E9B97', line2: '#F6B73C' },
  };
  const c = colors[id] || colors.classic;

  return (
    <div
      onClick={onClick}
      style={{
        width: '100%',
        height: 68,
        borderRadius: 5,
        border: selected ? `2px solid #0B5EA8` : '2px solid #E2E8F0',
        background: c.bg,
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        transition: 'border-color 0.15s',
      }}
    >
      {/* Simulated page content */}
      <div style={{ padding: '5px 5px 4px' }}>
        {/* header bar */}
        <div style={{ height: 7, background: c.accent, borderRadius: 2, marginBottom: 3 }} />
        {id === 'premium' && (
          <div style={{ height: 22, background: `linear-gradient(135deg, ${c.accent}cc, #1e3a8a)`, borderRadius: 2, marginBottom: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#F59E0B', fontSize: 6, fontWeight: 900 }}>THAILAND</span>
          </div>
        )}
        {[...Array(id === 'premium' ? 2 : 4)].map((_, i) => (
          <div key={i} style={{ height: id === 'detailed' ? 7 : 5, background: i % 2 === 0 ? c.line1 : c.line2, borderRadius: 1.5, marginBottom: 2, width: i % 3 === 2 ? '70%' : '100%' }} />
        ))}
        {id === 'detailed' && (
          <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
            {[1, 2].map(n => (
              <div key={n} style={{ flex: 1, height: 10, background: '#059669', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: 5, fontWeight: 700 }}>Day {n}</span>
              </div>
            ))}
          </div>
        )}
        {id === 'compact' && (
          <div style={{ height: 8, background: c.accent, borderRadius: 2, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4 }}>
            <span style={{ color: '#fff', fontSize: 5, fontWeight: 700 }}>₹1,94,000</span>
          </div>
        )}
      </div>
      {selected && (
        <div style={{ position: 'absolute', top: 3, right: 3, background: '#0B5EA8', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check style={{ width: 8, height: 8, color: '#fff' }} />
        </div>
      )}
    </div>
  );
}

// ─── Theme thumbnail ──────────────────────────────────────────────────────────
function ThemeThumbnail({ themeKey, selected, onClick }) {
  const theme = THEMES[themeKey];
  return (
    <div
      onClick={onClick}
      style={{
        width: '100%',
        height: 54,
        borderRadius: 5,
        border: selected ? `2px solid #0B5EA8` : '2px solid #E2E8F0',
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        transition: 'border-color 0.15s',
      }}
    >
      {/* Simulated cover */}
      <div style={{ height: 22, background: theme.coverGradient || theme.accent }} />
      <div style={{ height: 4, background: theme.accent, opacity: 0.7 }} />
      <div style={{ padding: '3px 5px' }}>
        <div style={{ height: 4, background: theme.accent, borderRadius: 1, marginBottom: 2, width: '70%' }} />
        <div style={{ height: 3, background: theme.borderColor, borderRadius: 1 }} />
      </div>
      {selected && (
        <div style={{ position: 'absolute', top: 3, right: 3, background: '#0B5EA8', borderRadius: '50%', width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check style={{ width: 7, height: 7, color: '#fff' }} />
        </div>
      )}
    </div>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────
function Collapsible({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid #E2E8F0' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 12px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        {Icon && <Icon style={{ width: 12, height: 12, color: '#0B5EA8', flexShrink: 0 }} />}
        <span style={{ flex: 1, fontSize: 10.5, fontWeight: 700, color: '#374151' }}>{title}</span>
        {open
          ? <ChevronUp style={{ width: 11, height: 11, color: '#94A3B8' }} />
          : <ChevronDown style={{ width: 11, height: 11, color: '#94A3B8' }} />}
      </button>
      {open && <div style={{ padding: '0 10px 10px' }}>{children}</div>}
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ fontSize: 9.5, color: '#374151' }}>{label}</span>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 30, height: 16, borderRadius: 8, cursor: 'pointer',
          background: value ? '#0B5EA8' : '#CBD5E1', position: 'relative',
          transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          width: 12, height: 12, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 2, left: value ? 16 : 2, transition: 'left 0.2s',
        }} />
      </div>
    </div>
  );
}

// ─── Save Template Modal ──────────────────────────────────────────────────────
function SaveTemplateModal({ config, onSave, onClose, defaultRequested = false }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isDefault, setIsDefault] = useState(defaultRequested);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 20, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#1E293B' }}>Save as Template</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X style={{ width: 16, height: 16, color: '#64748B' }} />
          </button>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Template Name *</label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. TripNest Premium Blue"
            style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 6, padding: '7px 10px', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Description</label>
          <textarea
            value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Short description..."
            rows={2}
            style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 6, padding: '7px 10px', fontSize: 12, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <input type="checkbox" id="setDefault" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
          <label htmlFor="setDefault" style={{ fontSize: 10, color: '#374151', cursor: 'pointer' }}>Set as default template</label>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '8px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#374151' }}>Cancel</button>
          <button
            onClick={() => { if (!name.trim()) { toast.error('Template name is required'); return; } onSave({ name: name.trim(), description: desc.trim(), isDefault }); }}
            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: '#0B5EA8', color: '#fff' }}
          >Save Template</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main PDF Designer ────────────────────────────────────────────────────────
export default function PDFDesigner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { quotations, fetchRecord } = useApp();

  useEffect(() => { fetchRecord('quotations', id).catch(() => {}); }, [id, fetchRecord]);

  const sourceQuotation = quotations.find((item) => item.id === id);

  // Only the design config can change
  const [config, setConfig] = useState({ ...DEFAULT_PDF_CONFIG });
  const [zoom, setZoom] = useState(0.72);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [masters, setMasters] = useState({ hotels: [], sightseeing: [], restaurants: [], transfers: [], vehicles: [], yachts: [], suppliers: [] });
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [coverUploading, setCoverUploading] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState('');
  const [defaultRequested, setDefaultRequested] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef(null);
  const previewRef = useRef(null);
  const coverInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.get('/pdf-templates?documentType=quotation'),
      apiClient.get('/hotels?limit=100&summary=false'),
      apiClient.get('/sightseeing-module'),
      apiClient.get('/activity-masters/restaurants'),
      apiClient.get('/operations-masters/transfers'),
      apiClient.get('/operations-masters/vehicles'),
      apiClient.get('/yachts'),
      apiClient.get('/suppliers?limit=100&summary=false'),
    ]).then(([templates, hotels, sightseeing, restaurants, transfers, vehicles, yachts, suppliers]) => {
      if (!active) return;
      setSavedTemplates(templates.data || []);
      setMasters({
        hotels: hotels.data || [], sightseeing: sightseeing.data || [], restaurants: restaurants.data || [],
        transfers: transfers.data || [], vehicles: vehicles.data || [], yachts: yachts.data || [], suppliers: suppliers.data || [],
      });
    }).catch((error) => {
      if (active) toast.error(error.message || 'Unable to load PDF design data.');
    }).finally(() => { if (active) setTemplatesLoading(false); });
    return () => { active = false; };
  }, []);

  const quotationData = useMemo(() => quotationForPdf(sourceQuotation || {}, masters), [sourceQuotation, masters]);

  const updateConfig = useCallback((updates) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSaveTemplate = async ({ name, description, isDefault }) => {
    try {
      const response = await apiClient.post('/pdf-templates', {
        documentType: 'quotation',
        name, description, isDefault, isFavorite: false, config,
      });
      const saved = response.data;
      setSavedTemplates((previous) => [
        saved,
        ...previous.map((template) => isDefault ? { ...template, isDefault: false } : template),
      ]);
      setActiveTemplateId(saved.id);
      toast.success(isDefault ? `"${name}" saved as the shared default!` : `Template "${name}" saved!`);
      setShowSaveModal(false);
      setDefaultRequested(false);
    } catch (error) {
      toast.error(error.message || 'Unable to save template.');
    }
  };

  const applyTemplate = (template) => {
    setConfig({ ...DEFAULT_PDF_CONFIG, ...(template.config || {}) });
    setActiveTemplateId(template.id);
    toast.success(`Applied "${template.name}".`);
  };

  const updateTemplate = async (template, patch) => {
    try {
      const response = await apiClient.put(`/pdf-templates/${template.id}`, { ...template, ...patch, documentType: 'quotation', config: template.config || config });
      const updated = response.data;
      setSavedTemplates((previous) => previous.map((item) => {
        if (item.id === updated.id) return updated;
        return updated.isDefault ? { ...item, isDefault: false } : item;
      }));
      return updated;
    } catch (error) {
      toast.error(error.message || 'Unable to update template.');
      return null;
    }
  };

  const handleDownloadPDF = async () => {
    if (isGenerating) return;
    const printNode = printRef.current;
    if (!printNode) { toast.error('Nothing to print'); return; }
    setIsGenerating(true);
    try {
      await downloadPdfFromElement(printNode, quotationPdfFilename(sourceQuotation), undefined, pdfLayoutOptionsFromConfig(config));
      toast.success('Quotation PDF downloaded.');
    } catch (error) {
      toast.error(error.message || 'Unable to download the quotation PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintPDF = async () => {
    if (isGenerating) return;
    const printNode = printRef.current;
    if (!printNode) { toast.error('Nothing to print'); return; }
    setIsGenerating(true);
    try {
      await printPdfDocument(printNode, quotationPdfFilename(sourceQuotation), undefined, pdfLayoutOptionsFromConfig(config));
      toast.success('Chrome print dialog opened.');
    } catch (error) {
      toast.error(error.message || 'Unable to open the quotation print dialog.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewPDF = () => {
    setShowPreview(true);
  };

  const handleSetDefault = async () => {
    const selected = savedTemplates.find((template) => template.id === activeTemplateId);
    if (!selected) {
      setDefaultRequested(true);
      setShowSaveModal(true);
      return;
    }
    const updated = await updateTemplate(selected, { isDefault: true, config });
    if (updated) toast.success(`"${updated.name}" is now the shared default template.`);
  };

  const handleCoverUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Choose an image file for the cover.'); return; }
    try {
      setCoverUploading(true);
      const formData = new FormData();
      formData.append('activityImages', file);
      const response = await apiClient.upload('/uploads?folder=pdf-templates', formData);
      const uploaded = (response.data || []).find((entry) => entry.field === 'activityImages');
      if (!uploaded?.url) throw new Error('The uploaded cover image was not returned.');
      updateConfig({ coverImage: 'custom-upload', coverImageUrl: uploaded.url, coverImageLabel: uploaded.name || 'Uploaded cover' });
      toast.success('Cover image uploaded and applied.');
    } catch (error) {
      toast.error(error.message || 'Unable to upload cover image.');
    } finally { setCoverUploading(false); }
  };

  const coverOptions = useMemo(() => {
    const staticOptions = Object.entries(COVER_IMAGES).map(([key, image]) => ({ key, ...image }));
    return config.coverImageUrl ? [...staticOptions, { key: 'custom-upload', label: config.coverImageLabel || 'Uploaded cover', url: config.coverImageUrl, thumb: config.coverImageUrl }] : staticOptions;
  }, [config.coverImageLabel, config.coverImageUrl]);

  // Render the correct template
  const renderTemplate = () => {
    const props = { quotation: quotationData, config };
    switch (config.template) {
      case 'classic': return <ClassicTemplate {...props} />;
      case 'premium': return <PremiumTemplate {...props} />;
      case 'detailed': return <DetailedTemplate {...props} />;
      case 'compact': return <CompactTemplate {...props} />;
      case 'buildsoftware-premium': return <TripNestPremiumTemplate {...props} />;
      case 'luxury-boutique': return <LuxuryBoutiqueTemplate {...props} />;
      case 'luxury-travel': return <LuxuryTravelQuotationTemplate {...props} />;
      case 'thai-experience': return <ThaiExperienceTemplate {...props} />;
      case 'portrait-creative': return <PortraitCreativeTemplate {...props} />;
      default: return <PremiumTemplate {...props} />;
    }
  };

  const activeTheme = THEMES[config.theme] || THEMES['corporate-blue'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F1F5F9', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>

      {/* ═══ STICKY HEADER ═══════════════════════════════════════════════════ */}
      <div style={{
        height: 44, background: '#fff', borderBottom: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', flexShrink: 0, zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {/* Left: breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748B', padding: 4 }}>
            <ArrowLeft style={{ width: 15, height: 15 }} />
          </button>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <img src={LogoImg} alt="TripNest" style={{ height: 26, objectFit: 'contain' }} />
            <span style={{ fontWeight: 800, fontSize: 12, color: '#0B5EA8' }}>TripNest</span>
          </div>
          <span style={{ color: '#CBD5E1', fontSize: 12 }}>›</span>
          <span style={{ fontSize: 11, color: '#64748B', cursor: 'pointer', hover: { color: '#374151' } }} onClick={() => navigate('/app/quotations')}>Quotations</span>
          <span style={{ color: '#CBD5E1', fontSize: 12 }}>›</span>
          <span style={{ fontSize: 11, color: '#64748B' }}>{quotationData.quotationNo}</span>
          <span style={{ color: '#CBD5E1', fontSize: 12 }}>›</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#0B5EA8' }}>PDF Design</span>
        </div>

        {/* Right: action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => { setDefaultRequested(false); setShowSaveModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', border: '1px solid #CBD5E1', borderRadius: 6, background: '#fff', fontSize: 10.5, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
          >
            <Save style={{ width: 12, height: 12 }} /> Save as Template
          </button>
          <button
            onClick={handleSetDefault}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', border: '1px solid #CBD5E1', borderRadius: 6, background: '#fff', fontSize: 10.5, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
          >
            <Star style={{ width: 12, height: 12 }} /> Set as Default
          </button>
          <button
            onClick={handlePreviewPDF}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', border: '1px solid #CBD5E1', borderRadius: 6, background: '#fff', fontSize: 10.5, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
          >
            <Eye style={{ width: 12, height: 12 }} /> Preview PDF
          </button>
          <button
            onClick={handleDownloadPDF}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', border: 'none', borderRadius: 6, background: '#0B5EA8', fontSize: 10.5, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 6px rgba(11,94,168,0.3)' }}
          >
            <Download style={{ width: 12, height: 12 }} /> {isGenerating ? 'Preparing PDF...' : 'Download PDF'}
          </button>
          <button
            onClick={handlePrintPDF}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', border: '1px solid #0B5EA8', borderRadius: 6, background: '#fff', fontSize: 10.5, fontWeight: 700, color: '#0B5EA8', cursor: 'pointer' }}
          >
            <Printer style={{ width: 12, height: 12 }} /> Print PDF
          </button>
        </div>
      </div>

      {/* ═══ 3-COLUMN BODY ═══════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── LEFT PANEL: Design Controls ──────────────────────────────────── */}
        <div style={{
          width: 240, flexShrink: 0, background: '#fff',
          borderRight: '1px solid #E2E8F0', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '9px 12px 7px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Settings style={{ width: 12, height: 12, color: '#0B5EA8' }} /> PDF Design Options
            </span>
          </div>

          {/* 1. PDF Format */}
          <Collapsible title="1. Select PDF Format" icon={Layout} defaultOpen={true}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {TEMPLATES.map(t => (
                <div key={t.id} style={{ cursor: 'pointer' }} onClick={() => updateConfig({ template: t.id })}>
                  <TemplateThumbnail id={t.id} selected={config.template === t.id} onClick={() => updateConfig({ template: t.id })} />
                  <div style={{ textAlign: 'center', marginTop: 3 }}>
                    <div style={{ fontSize: 9, fontWeight: config.template === t.id ? 700 : 600, color: config.template === t.id ? '#0B5EA8' : '#374151' }}>{t.fullName || t.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </Collapsible>

          {/* 2. Theme */}
          <Collapsible title="2. Theme / Style" icon={Palette} defaultOpen={true}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
              {Object.entries(THEMES).map(([key, theme]) => (
                <div key={key} onClick={() => updateConfig({ theme: key, accentColor: theme.accent })}>
                  <ThemeThumbnail themeKey={key} selected={config.theme === key} onClick={() => updateConfig({ theme: key, accentColor: theme.accent })} />
                  <div style={{ textAlign: 'center', marginTop: 2, fontSize: 7.5, fontWeight: 600, color: config.theme === key ? '#0B5EA8' : '#64748B' }}>
                    {theme.name.split(' ')[0]}
                  </div>
                </div>
              ))}
            </div>
          </Collapsible>

          {/* 3. Cover Background */}
          <Collapsible title="3. Cover Background" icon={Image}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {['solid', 'gradient', 'destination-image', 'custom'].map(bg => (
                <div
                  key={bg}
                  onClick={() => updateConfig({ coverBackground: bg })}
                  style={{
                    padding: '6px 8px', borderRadius: 5, border: `1.5px solid ${config.coverBackground === bg ? '#0B5EA8' : '#E2E8F0'}`,
                    cursor: 'pointer', background: config.coverBackground === bg ? '#EFF6FF' : '#F8FAFC',
                    fontSize: 8.5, fontWeight: 600, color: config.coverBackground === bg ? '#0B5EA8' : '#374151',
                    textAlign: 'center', textTransform: 'capitalize',
                  }}
                >
                  {bg.replace('-', ' ')}
                </div>
              ))}
            </div>
          </Collapsible>

          {/* 4. Cover Image */}
          <Collapsible title="4. Cover Image" icon={Image}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {coverOptions.map((img) => (
                <div
                  key={img.key}
                  onClick={() => updateConfig({ coverImage: img.key, ...(img.key === 'custom-upload' ? { coverImageUrl: img.url, coverImageLabel: img.label } : {}) })}
                  style={{ borderRadius: 5, overflow: 'hidden', border: `2px solid ${config.coverImage === img.key ? '#0B5EA8' : '#E2E8F0'}`, cursor: 'pointer', position: 'relative' }}
                >
                  <img src={img.thumb} alt={img.label} style={{ width: '100%', height: 36, objectFit: 'cover', display: 'block' }} />
                  {config.coverImage === img.key && (
                    <div style={{ position: 'absolute', top: 2, right: 2, background: '#0B5EA8', borderRadius: '50%', width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check style={{ width: 7, height: 7, color: '#fff' }} />
                    </div>
                  )}
                  <div style={{ fontSize: 7.5, fontWeight: 600, textAlign: 'center', padding: '2px', color: '#374151', background: '#F8FAFC' }}>{img.label}</div>
                </div>
              ))}
            </div>
          </Collapsible>

          {/* 5. Page Background */}
          <Collapsible title="5. Page Background" icon={Layout}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {['white', 'light-pattern', 'destination-watermark', 'custom'].map(bg => (
                <div
                  key={bg}
                  onClick={() => updateConfig({ pageBackground: bg })}
                  style={{
                    padding: '5px', borderRadius: 5, border: `1.5px solid ${config.pageBackground === bg ? '#0B5EA8' : '#E2E8F0'}`,
                    cursor: 'pointer', background: config.pageBackground === bg ? '#EFF6FF' : '#fff',
                    fontSize: 8, fontWeight: 600, color: config.pageBackground === bg ? '#0B5EA8' : '#64748B',
                    textAlign: 'center', textTransform: 'capitalize',
                  }}
                >
                  {bg.replace('-', ' ')}
                </div>
              ))}
            </div>
            {config.pageBackground === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '6px', background: '#F8FAFC', borderRadius: 4 }}>
                <span style={{ fontSize: 9, color: '#64748B' }}>Custom Color:</span>
                <input
                  type="color"
                  value={config.customPageBackground || '#F0FDF4'}
                  onChange={e => updateConfig({ customPageBackground: e.target.value })}
                  style={{ width: 28, height: 22, border: '1px solid #CBD5E1', borderRadius: 4, cursor: 'pointer', padding: 1 }}
                />
                <span style={{ fontSize: 8.5, color: '#374151', fontFamily: 'monospace' }}>{config.customPageBackground || '#F0FDF4'}</span>
              </div>
            )}
          </Collapsible>

          {/* 6. Section Style */}
          <Collapsible title="6. Section Style" icon={FileText}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {SECTION_STYLES.map(s => (
                <div
                  key={s}
                  onClick={() => updateConfig({ sectionStyle: s })}
                  style={{
                    padding: '6px', borderRadius: 5, border: `1.5px solid ${config.sectionStyle === s ? '#0B5EA8' : '#E2E8F0'}`,
                    cursor: 'pointer', background: config.sectionStyle === s ? '#EFF6FF' : '#F8FAFC',
                    fontSize: 9, fontWeight: 600, color: config.sectionStyle === s ? '#0B5EA8' : '#374151',
                    textAlign: 'center', textTransform: 'capitalize',
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
          </Collapsible>

          {/* 7. Accent Color */}
          <Collapsible title="7. Accent Color" icon={Palette}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
              {ACCENT_PRESETS.map(color => (
                <div
                  key={color}
                  onClick={() => updateConfig({ accentColor: color })}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', background: color, cursor: 'pointer',
                    border: config.accentColor === color ? '2px solid #0F172A' : '2px solid transparent',
                    outline: config.accentColor === color ? '1px solid #fff' : 'none',
                    outlineOffset: -4,
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 9, color: '#64748B' }}>Custom:</span>
              <input
                type="color"
                value={config.accentColor}
                onChange={e => updateConfig({ accentColor: e.target.value })}
                style={{ width: 28, height: 22, border: '1px solid #CBD5E1', borderRadius: 4, cursor: 'pointer', padding: 1 }}
              />
              <span style={{ fontSize: 8.5, color: '#374151', fontFamily: 'monospace' }}>{config.accentColor}</span>
            </div>
          </Collapsible>

          {/* 8. Image Settings */}
          <Collapsible title="8. Image Settings" icon={Image}>
            <Toggle value={config.showHotelImages} onChange={v => updateConfig({ showHotelImages: v })} label="Hotel Images" />
            <Toggle value={config.showActivityImages} onChange={v => updateConfig({ showActivityImages: v })} label="Sightseeing Images" />
            <Toggle value={config.showTransferImages} onChange={v => updateConfig({ showTransferImages: v })} label="Transfer Images" />
            <div style={{ marginTop: 6 }}>
              <label style={{ fontSize: 9, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Image Source</label>
              {['auto', 'static', 'uploaded'].map(s => (
                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: '#374151', cursor: 'pointer', marginBottom: 3 }}>
                  <input type="radio" name="imgSrc" value={s} checked={config.imageSource === s} onChange={() => updateConfig({ imageSource: s })} />
                  {s.charAt(0).toUpperCase() + s.slice(1)}{s === 'auto' ? ' (from master data)' : ''}
                </label>
              ))}
            </div>
          </Collapsible>

          {/* 9. Logo */}
          <Collapsible title="9. Logo" icon={Type}>
            <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
              {['buildsoftware', 'custom', 'none'].map(l => (
                <div
                  key={l}
                  onClick={() => updateConfig({ logo: l })}
                  style={{
                    flex: 1, padding: '5px 4px', borderRadius: 5, border: `1.5px solid ${config.logo === l ? '#0B5EA8' : '#E2E8F0'}`,
                    cursor: 'pointer', background: config.logo === l ? '#EFF6FF' : '#F8FAFC',
                    fontSize: 8, fontWeight: 600, color: config.logo === l ? '#0B5EA8' : '#64748B',
                    textAlign: 'center', textTransform: 'capitalize', whiteSpace: 'nowrap',
                  }}
                >
                  {l === 'buildsoftware' ? 'TripNest' : l.charAt(0).toUpperCase() + l.slice(1)}
                </div>
              ))}
            </div>
            <div>
              <label style={{ fontSize: 9, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Position</label>
              <div style={{ display: 'flex', gap: 5 }}>
                {['left', 'center', 'right'].map(p => (
                  <button
                    key={p}
                    onClick={() => updateConfig({ logoPosition: p })}
                    style={{
                      flex: 1, padding: '4px', border: `1.5px solid ${config.logoPosition === p ? '#0B5EA8' : '#E2E8F0'}`,
                      borderRadius: 4, fontSize: 8, fontWeight: 600,
                      color: config.logoPosition === p ? '#0B5EA8' : '#64748B',
                      background: config.logoPosition === p ? '#EFF6FF' : '#fff',
                      cursor: 'pointer', textTransform: 'capitalize',
                    }}
                  >{p}</button>
                ))}
              </div>
            </div>
          </Collapsible>

          {/* 10. Image Layout */}
          <Collapsible title="10. Image Layout" icon={Layout}>
            {IMAGE_LAYOUTS.map(l => (
              <div
                key={l}
                onClick={() => updateConfig({ imageLayout: l })}
                style={{
                  padding: '5px 8px', marginBottom: 4, borderRadius: 5,
                  border: `1.5px solid ${config.imageLayout === l ? '#0B5EA8' : '#E2E8F0'}`,
                  cursor: 'pointer', background: config.imageLayout === l ? '#EFF6FF' : '#F8FAFC',
                  fontSize: 9, fontWeight: 600, color: config.imageLayout === l ? '#0B5EA8' : '#374151',
                  textTransform: 'capitalize',
                }}
              >
                {l.replace('-', ' ')}
              </div>
            ))}
          </Collapsible>

          <div style={{ height: 20 }} />
        </div>

        {/* ── CENTER PANEL: Live Template Options ───────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: '#F1F5F9', padding: '12px 14px' }}>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Live Template Preview Options</span>
          </div>

          {/* A. PDF Formats */}
          <div style={{ background: '#fff', borderRadius: 8, padding: '12px', marginBottom: 10, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', marginBottom: 8 }}>A. PDF Formats (Layout)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {TEMPLATES.map(t => (
                <div key={t.id} style={{ cursor: 'pointer' }} onClick={() => updateConfig({ template: t.id })}>
                  <div style={{
                    border: config.template === t.id ? '2px solid #0B5EA8' : '2px solid #E2E8F0',
                    borderRadius: 8, overflow: 'hidden', background: '#FAFAFA',
                    transition: 'border-color 0.15s',
                  }}>
                    <TemplateThumbnail id={t.id} selected={config.template === t.id} onClick={() => {}} />
                    <div style={{ padding: '6px 8px', background: config.template === t.id ? '#EFF6FF' : '#FAFAFA' }}>
                      <div style={{ fontWeight: 700, fontSize: 9, color: config.template === t.id ? '#0B5EA8' : '#374151' }}>{t.fullName}</div>
                      <div style={{ fontSize: 7.5, color: '#64748B', marginTop: 2, lineHeight: 1.3 }}>{t.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* B. Themes */}
          <div style={{ background: '#fff', borderRadius: 8, padding: '12px', marginBottom: 10, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', marginBottom: 8 }}>B. Themes (Same format, different look)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {Object.entries(THEMES).map(([key, theme]) => (
                <div key={key} onClick={() => updateConfig({ theme: key, accentColor: theme.accent })} style={{ cursor: 'pointer' }}>
                  <div style={{ border: config.theme === key ? '2px solid #0B5EA8' : '2px solid #E2E8F0', borderRadius: 7, overflow: 'hidden' }}>
                    <ThemeThumbnail themeKey={key} selected={config.theme === key} onClick={() => {}} />
                    <div style={{ padding: '4px 6px', background: config.theme === key ? '#EFF6FF' : '#FAFAFA', textAlign: 'center' }}>
                      <span style={{ fontSize: 8.5, fontWeight: 600, color: config.theme === key ? '#0B5EA8' : '#374151' }}>{theme.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* C. Cover Image Gallery */}
          <div style={{ background: '#fff', borderRadius: 8, padding: '12px', marginBottom: 10, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', marginBottom: 8 }}>C. Cover Image Gallery (for selected theme)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {coverOptions.map((img) => (
                <div key={img.key} onClick={() => updateConfig({ coverImage: img.key, ...(img.key === 'custom-upload' ? { coverImageUrl: img.url, coverImageLabel: img.label } : {}) })} style={{ cursor: 'pointer' }}>
                  <div style={{ border: config.coverImage === img.key ? '2px solid #0B5EA8' : '2px solid #E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
                    <img src={img.thumb} alt={img.label} style={{ width: '100%', height: 50, objectFit: 'cover', display: 'block' }} />
                    <div style={{ padding: '4px 6px', background: config.coverImage === img.key ? '#EFF6FF' : '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 8.5, fontWeight: 600, color: config.coverImage === img.key ? '#0B5EA8' : '#374151' }}>{img.label}</span>
                      {config.coverImage === img.key && <Check style={{ width: 9, height: 9, color: '#0B5EA8' }} />}
                    </div>
                  </div>
                </div>
              ))}
              {/* Upload slot */}
              <button type="button" onClick={() => coverInputRef.current?.click()} disabled={coverUploading} style={{ border: '2px dashed #CBD5E1', borderRadius: 6, height: 78, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: coverUploading ? 'wait' : 'pointer', background: '#F8FAFC', color: 'inherit' }}>
                <Upload style={{ width: 14, height: 14, color: '#94A3B8' }} />
                <span style={{ fontSize: 7.5, color: '#94A3B8', marginTop: 4, fontWeight: 600 }}>{coverUploading ? 'Uploading…' : 'Upload Your Image'}</span>
              </button>
              <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} style={{ display: 'none' }} />
            </div>
          </div>

          {/* D. Layout Options */}
          <div style={{ background: '#fff', borderRadius: 8, padding: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', marginBottom: 8 }}>D. Section & Image Layout</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 8.5, fontWeight: 600, color: '#64748B', marginBottom: 5 }}>Section Style</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                  {SECTION_STYLES.map(s => (
                    <div
                      key={s}
                      onClick={() => updateConfig({ sectionStyle: s })}
                      style={{
                        padding: '6px', borderRadius: 5, border: `1.5px solid ${config.sectionStyle === s ? '#0B5EA8' : '#E2E8F0'}`,
                        cursor: 'pointer', background: config.sectionStyle === s ? '#EFF6FF' : '#F8FAFC',
                        fontSize: 9, fontWeight: 600, color: config.sectionStyle === s ? '#0B5EA8' : '#374151',
                        textAlign: 'center', textTransform: 'capitalize',
                      }}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 8.5, fontWeight: 600, color: '#64748B', marginBottom: 5 }}>Image Layout</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {IMAGE_LAYOUTS.map(l => (
                    <div
                      key={l}
                      onClick={() => updateConfig({ imageLayout: l })}
                      style={{
                        padding: '5px 8px', borderRadius: 5, border: `1.5px solid ${config.imageLayout === l ? '#0B5EA8' : '#E2E8F0'}`,
                        cursor: 'pointer', background: config.imageLayout === l ? '#EFF6FF' : '#F8FAFC',
                        fontSize: 8.5, fontWeight: 600, color: config.imageLayout === l ? '#0B5EA8' : '#374151',
                        textTransform: 'capitalize',
                      }}
                    >
                      {l.replace('-', ' ')}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: PDF Preview ─────────────────────────────────────── */}
        <div style={{
          width: 580, flexShrink: 0,
          background: '#374151', borderLeft: '1px solid #1F2937',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Preview toolbar */}
          <div style={{
            height: 38, background: '#1F2937', borderBottom: '1px solid #374151',
            display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6, flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#E2E8F0', flex: 1 }}>PDF Preview</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} style={{ background: '#374151', border: 'none', borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#CBD5E1' }}>
                <ZoomOut style={{ width: 11, height: 11 }} />
              </button>
              <span style={{ fontSize: 9, color: '#9CA3AF', minWidth: 32, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} style={{ background: '#374151', border: 'none', borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#CBD5E1' }}>
                <ZoomIn style={{ width: 11, height: 11 }} />
              </button>
            </div>

            <div style={{ width: 1, height: 16, background: '#4B5563' }} />

            <button onClick={handleDownloadPDF} title="Download PDF" style={{ background: '#374151', border: 'none', borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#CBD5E1' }}>
              <Download style={{ width: 11, height: 11 }} />
            </button>
            <button onClick={handlePrintPDF} title="Print PDF" style={{ background: '#374151', border: 'none', borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#CBD5E1' }}>
              <Printer style={{ width: 11, height: 11 }} />
            </button>
          </div>

          {/* Preview area */}
          <div
            ref={previewRef}
            style={{
              flex: 1, overflowY: 'auto', padding: '16px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 0,
            }}
          >
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                width: 595,
                boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
              }}
              className="pdf-preview-content"
              id="pdf-screen-preview"
            >
              <PdfLayoutFrame config={config} style={{ boxShadow: 'none' }}>{renderTemplate()}</PdfLayoutFrame>
            </div>
          </div>
        </div>

      </div>

      {/* Save Template Modal */}
      {showSaveModal && (
        <SaveTemplateModal
          config={config}
          onSave={handleSaveTemplate}
          defaultRequested={defaultRequested}
          onClose={() => { setShowSaveModal(false); setDefaultRequested(false); }}
        />
      )}

      {/* ══ Fullscreen Preview Modal ══ */}
      {showPreview && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Modal header */}
          <div style={{ height: 44, background: '#1F2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
            <span style={{ color: '#E2E8F0', fontWeight: 700, fontSize: 12 }}>PDF Preview — {quotationData.quotationNo}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleDownloadPDF}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', border: 'none', borderRadius: 6, background: '#0B5EA8', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
              >
                <Download style={{ width: 13, height: 13 }} /> Download PDF
              </button>
              <button
                onClick={handlePrintPDF}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', border: '1px solid #94A3B8', borderRadius: 6, background: '#fff', fontSize: 11, fontWeight: 700, color: '#334155', cursor: 'pointer' }}
              >
                <Printer style={{ width: 13, height: 13 }} /> Print PDF
              </button>
              <button
                onClick={() => setShowPreview(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid #4B5563', borderRadius: 6, background: 'transparent', fontSize: 11, fontWeight: 600, color: '#D1D5DB', cursor: 'pointer' }}
              >
                <X style={{ width: 13, height: 13 }} /> Close
              </button>
            </div>
          </div>
          {/* Modal scroll area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <PdfLayoutFrame config={config} style={{ boxShadow: '0 12px 60px rgba(0,0,0,0.5)' }}>{renderTemplate()}</PdfLayoutFrame>
          </div>
        </div>
      )}

      {/* ══ Hidden print node — off-screen so content + images actually render ══ */}
      <div
        ref={printRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: '-9999px',
          width: 595,
          pointerEvents: 'none',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {renderTemplate()}
      </div>
    </div>
  );
}
