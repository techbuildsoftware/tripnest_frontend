// ─── PDF Design Configuration ────────────────────────────────────────────────
// This is the ONLY thing that changes between design sessions.
// quotationData is NEVER modified here.

export const DEFAULT_PDF_CONFIG = {
  template: 'premium',   // classic | premium | detailed | compact
  theme: 'corporate-blue', // corporate-blue | luxury-gold | tropical | modern-dark | minimal | sunset-orange | nature-green | custom

  accentColor: '#0B5EA8',
  secondaryColor: '#F59E0B',
  sectionHeaderBg: '#0B5EA8',
  sectionHeaderText: '#FFFFFF',

  coverBackground: 'destination-image', // solid | gradient | destination-image | custom
  coverImage: 'phuket',
  pageBackground: 'white', // white | light-pattern | destination-watermark | custom

  sectionStyle: 'cards', // standard | cards | modern | luxury
  imageLayout: 'three-column', // full-width | two-column | three-column | grid | hero-cards

  showHotelImages: true,
  showActivityImages: true,
  showTransferImages: false,
  imageSource: 'auto', // auto | static | uploaded

  // These controls apply to the client-facing copy of a quotation only.
  // Keep them opt-out so every existing saved design retains its current PDF.
  showClientItinerary: true,
  showClientHotels: true,
  showClientSightseeing: true,
  showClientMasterDescriptions: true,

  // Legacy "buildsoftware" saved values now mean the quotation recipient
  // (Agent / B2C); this keeps existing templates correctly branded.
  logo: 'buildsoftware', // agent-or-b2c | none
  logoPosition: 'left', // left | center | right

  fontStyle: 'inter', // inter | georgia | roboto
  spacingStyle: 'compact', // compact | comfortable | spacious

  // Shared export controls. These are saved with the template and are used by
  // the live preview, Download PDF, and Print PDF.
  pdfSideMarginMm: 0,
  pdfTopMarginMm: 2,
  pdfContentScalePercent: 100,
  pdfFooterGapPercent: 10,
  pdfPageFillPercent: 90,
  pdfKeepSectionsTogether: true,
  highlightCardsPerRow: 4,
  highlightImageHeight: 0, // 0 keeps the responsive default per row
  highlightCardImageScalePercent: 100,
  highlightCardGap: 8,
  highlightCardContentPadding: 8,
  luxuryHeroImageHeight: 195,
};

export const THEMES = {
  'corporate-blue': {
    name: 'Corporate Blue',
    accent: '#0B5EA8',
    secondary: '#F59E0B',
    sectionBg: '#0B5EA8',
    sectionText: '#FFFFFF',
    coverGradient: 'linear-gradient(135deg, #0B5EA8 0%, #1e3a8a 100%)',
    priceColor: '#0B5EA8',
    borderColor: '#CBD5E1',
  },
  'luxury-gold': {
    name: 'Luxury Gold',
    accent: '#B8860B',
    secondary: '#1a1a2e',
    sectionBg: '#1a1a2e',
    sectionText: '#F59E0B',
    coverGradient: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d5e 100%)',
    priceColor: '#B8860B',
    borderColor: '#D4A017',
  },
  'tropical': {
    name: 'Tropical',
    accent: '#059669',
    secondary: '#0891B2',
    sectionBg: '#059669',
    sectionText: '#FFFFFF',
    coverGradient: 'linear-gradient(135deg, #059669 0%, #0891B2 100%)',
    priceColor: '#059669',
    borderColor: '#6EE7B7',
  },
  'modern-dark': {
    name: 'Modern Dark',
    accent: '#6366F1',
    secondary: '#EC4899',
    sectionBg: '#1E293B',
    sectionText: '#FFFFFF',
    coverGradient: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
    priceColor: '#6366F1',
    borderColor: '#334155',
  },
  'minimal': {
    name: 'Minimal',
    accent: '#374151',
    secondary: '#6B7280',
    sectionBg: '#F9FAFB',
    sectionText: '#111827',
    coverGradient: 'linear-gradient(135deg, #F9FAFB 0%, #E5E7EB 100%)',
    priceColor: '#374151',
    borderColor: '#E5E7EB',
  },
  'sunset-orange': {
    name: 'Sunset Orange',
    accent: '#0e8a85',
    secondary: '#DC2626',
    sectionBg: '#0e8a85',
    sectionText: '#FFFFFF',
    coverGradient: 'linear-gradient(135deg, #0e8a85 0%, #DC2626 100%)',
    priceColor: '#0e8a85',
    borderColor: '#bfdbfe',
  },
  'nature-green': {
    name: 'Nature Green',
    accent: '#15803D',
    secondary: '#854D0E',
    sectionBg: '#15803D',
    sectionText: '#FFFFFF',
    coverGradient: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
    priceColor: '#15803D',
    borderColor: '#BBF7D0',
  },
  'custom': {
    name: 'Custom',
    accent: '#0B5EA8',
    secondary: '#F59E0B',
    sectionBg: '#0B5EA8',
    sectionText: '#FFFFFF',
    coverGradient: 'linear-gradient(135deg, #0B5EA8 0%, #1e3a8a 100%)',
    priceColor: '#0B5EA8',
    borderColor: '#CBD5E1',
  },
};

export const COVER_IMAGES = {
  phuket: {
    label: 'Phuket',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    thumb: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=80',
  },
  krabi: {
    label: 'Krabi',
    url: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=800&q=80',
    thumb: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=200&q=80',
  },
  pattaya: {
    label: 'Pattaya',
    url: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&q=80',
    thumb: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=200&q=80',
  },
  bangkok: {
    label: 'Bangkok',
    url: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=800&q=80',
    thumb: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=200&q=80',
  },
  kohsamui: {
    label: 'Koh Samui',
    url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
    thumb: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=200&q=80',
  },
  phiphi: {
    label: 'Phi Phi Island',
    url: 'https://images.unsplash.com/photo-1540479859555-17af45c78602?w=800&q=80',
    thumb: 'https://images.unsplash.com/photo-1540479859555-17af45c78602?w=200&q=80',
  },
  ayutthaya: {
    label: 'Ayutthaya',
    url: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80',
    thumb: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=200&q=80',
  },
};

export function resolveCoverImage(config = {}) {
  return config.coverImageUrl || COVER_IMAGES[config.coverImage]?.url || COVER_IMAGES.phuket.url;
}

// Image resolver: priority-based lookup
export function resolveImage(type, item = {}) {
  // 1. item-supplied URL
  if (item.image) return item.image;
  // 2. uploaded images (future integration point)
  // 3. master-data images (future integration point)
  // 4. static demo images by type/name
  const fallbacks = {
    destination: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
    hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
    activity: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80',
    sightseeing: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80',
    transfer: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&q=80',
    cover: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    logo: null,
  };
  return fallbacks[type] || fallbacks.destination;
}
