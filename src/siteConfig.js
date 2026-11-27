// ─────────────────────────────────────────────────────────────────────────────
// One place for business facts that must be filled in / confirmed before launch.
// ─────────────────────────────────────────────────────────────────────────────

export const COMPANY = {
  legalName: "TripNest Travel Tech Company Limited",
  address: "Thailand",              // TODO: full registered address
  registrationNo: "",               // TODO: company registration number – shown on About + footer when filled
  tourLicenceNo: "",                // TODO: Thai tourism business licence number, if applicable – shown when filled
};

// Legal pages (Privacy / Terms / Cookies) are TEMPLATES. They show a "Draft" notice until you
// have had them reviewed by a qualified lawyer – then set this to true.
export const LEGAL_REVIEWED = false;
export const LEGAL_UPDATED = "27 November 2026";

// Shown on the Home page and emitted as FAQ structured data for Google. Edit to match your real policies.
export const FAQS = [
  ["How do I book with TripNest?", "Send a quote request (or message us on WhatsApp) with your dates, destination and group size. We reply with options and prices, and confirm your booking once you approve."],
  ["How do I pay?", "After you approve a quote we share the payment options and instructions for your booking. Ask our team about accepted payment methods when you enquire."],
  ["Can I cancel or change a booking?", "Cancellation and change rules depend on the hotel, airline or activity provider. We show the terms with every quote, before you confirm."],
  ["Are prices in Thai Baht?", "Yes — base prices are in THB. The currency selector shows an approximate conversion for convenience; the final price is confirmed in your quote."],
  ["Are the adventure activities safe?", "Our partners provide safety briefings and equipment. Tell us about age, health or weight restrictions and we'll check them for you before you book."],
  ["Do you work with travel agencies and businesses?", "Yes. Agencies, hotels and corporate travel managers can apply for a partner account with net rates and bulk booking — see the For Business page."],
];
