export const DEFAULT_VOUCHER_NOTES = `Complete Thailand Digital Arrival Card (TDAC) within 3 days before arrival. Visa-free entry applies to many nationalities (as per stay rules).
Hotel Security Deposit: THB 500–2,000 per room at check-in (refundable at checkout). Card deposits may require a return/onward ticket.
Passport validity: Minimum 6 months from date of entry. Immigration may ask for proof of funds (THB 20,000 per person / THB 50,000 per family).
All National Park Entry Fees are INCLUDED in the package (wherever applicable).
Temple entry tickets are NOT included in the package. Guests are required to pay directly at each temple. Entry fees may range between THB 50–200 per person (depending on temple); major temples (for example, Grand Palace and Wat Phra Kaew) are THB 500 per person.
Tiger Park tickets are OPTIONAL (not included in the package unless mentioned).
Child policy: Child sharing bed with parents; extra bed not included unless specified.
Pick-up timings may change due to traffic or weather; guests must be ready 10 minutes before the scheduled time.`;

const LEGACY_DEFAULT_VOUCHER_NOTES = 'Please be ready at the confirmed pickup point 10 minutes before the stated time. Operational times may change due to weather or traffic.';

export const DEFAULT_VOUCHER_SETTINGS = {
  templateName: 'Combined Voucher',
  companyName: 'BUILDSOFTWARE',
  tagline: 'Your Thailand travel partner',
  primaryColor: '#154aa0',
  secondaryColor: '#172554',
  accentColor: '#facc15',
  welcomeTitle: 'Welcome to Thailand',
  preparedForLabel: 'Prepared for',
  importantNotes: DEFAULT_VOUCHER_NOTES,
  emergencyText: 'For assistance, contact your assigned travel consultant.',
  showPassport: false,
  showDOB: false,
  showHotelImages: true,
  showActivityImages: true,
  // Saved per template and consumed by both Download PDF and Print PDF.
  // These are intentionally conservative defaults so existing vouchers keep
  // their current visual density until a user changes the Print Layout tab.
  pdfSideMarginMm: 4.2,
  pdfTopMarginMm: 2,
  pdfContentScalePercent: 100,
  pdfFooterGapPercent: 10,
  pdfPageFillPercent: 90,
  pdfKeepSectionsTogether: true,
  pdfCardPaddingPercent: 100,
  pdfCardSpacingPercent: 100,
  sectionOrder: ['cover', 'flights', 'hotels', 'transfers', 'activities', 'notes', 'itinerary'],
  sections: {
    cover: true,
    flights: true,
    hotels: true,
    transfers: true,
    activities: true,
    notes: true,
    itinerary: true,
  },
};

export function mergeVoucherSettings(settings = {}) {
  // Upgrade templates which still contain the previous system default, while
  // preserving any notes a user has deliberately customised.
  const importantNotes = settings.importantNotes === LEGACY_DEFAULT_VOUCHER_NOTES
    ? DEFAULT_VOUCHER_NOTES
    : settings.importantNotes;
  return {
    ...DEFAULT_VOUCHER_SETTINGS,
    ...settings,
    ...(importantNotes ? { importantNotes } : {}),
    sections: { ...DEFAULT_VOUCHER_SETTINGS.sections, ...(settings.sections || {}) },
  };
}

export function readLocalVoucherSettings() {
  try {
    return mergeVoucherSettings(JSON.parse(localStorage.getItem('buildsoftware_voucher_settings') || '{}'));
  } catch {
    return { ...DEFAULT_VOUCHER_SETTINGS, sections: { ...DEFAULT_VOUCHER_SETTINGS.sections } };
  }
}

export function writeLocalVoucherSettings(settings) {
  localStorage.setItem('buildsoftware_voucher_settings', JSON.stringify(mergeVoucherSettings(settings)));
}
