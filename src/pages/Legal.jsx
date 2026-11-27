import { LuInfo } from "react-icons/lu";
import { Link } from "../router.jsx";
import { CONTACT } from "../data.js";
import { COMPANY, LEGAL_REVIEWED, LEGAL_UPDATED } from "../siteConfig.js";
import { useSeo } from "../seo.js";

// ⚠ TEMPLATES. These texts are a sensible starting point, not legal advice. Have a qualified lawyer
// review them for Thai law (including the PDPA) and your real business model, then set LEGAL_REVIEWED = true in siteConfig.js.

function LegalPage({ title, description, sections }) {
  useSeo({ title: `${title} | TripNest`, description });
  return (
    <>
      <section className="bg-navy px-4 pb-8 pt-28 text-white sm:px-6 lg:pt-32">
        <div className="wrap !px-0">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
          <p className="mt-1 text-sm text-white/70">Last updated: {LEGAL_UPDATED}</p>
        </div>
      </section>
      <div className="wrap max-w-3xl py-8">
        {!LEGAL_REVIEWED && (
          <p className="mb-5 flex items-start gap-2 rounded-xl border border-sun/50 bg-sun/15 p-3 text-[13px] font-semibold text-navy"><LuInfo className="mt-0.5 shrink-0 text-[#b45309]" size={16} />Draft – this document is awaiting legal review and may change.</p>
        )}
        <article className="space-y-6">
          {sections.map(([h, body]) => (
            <section key={h}>
              <h2 className="text-lg font-extrabold">{h}</h2>
              <div className="mt-1.5 space-y-2 text-[14px] leading-relaxed text-navy/75">{body.map((p, i) => <p key={i}>{p}</p>)}</div>
            </section>
          ))}
        </article>
        <p className="mt-8 border-t border-navy/10 pt-4 text-[13px] text-navy/60">Questions? Email <a className="font-bold text-teal" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> or visit our <Link to="/contact" className="font-bold text-teal">contact page</Link>.</p>
      </div>
    </>
  );
}

export function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="How TripNest collects, uses and protects your personal data."
      sections={[
        ["Who we are", [`${COMPANY.legalName} ("TripNest", "we") operates this website and the travel services offered on it. We act as the controller of the personal data described below.`]],
        ["What we collect", ["Details you give us in forms or messages: name, email, phone/WhatsApp, company name, travel dates, group size and the content of your message.", "Account details if you create an account (name, email, account type).", "If you accept analytics cookies: pages visited, device and browser type, approximate location and how you reached the site."]],
        ["How we use it", ["To reply to your enquiry, prepare quotes, make and manage bookings with hotels, airlines and activity providers, and give support.", "To send offers or newsletters, only where you have asked for them or where the law allows; you can opt out at any time.", "To improve the website, measure marketing and keep it secure."]],
        ["Who we share it with", ["Suppliers needed to deliver your trip (e.g. hotels, tour and activity operators, transport providers), payment providers, and service providers such as email, hosting and analytics. We do not sell your personal data."]],
        ["Retention", ["We keep personal data only as long as needed for the purposes above and to meet legal, accounting and tax obligations."]],
        ["Your rights", ["Under the Thai Personal Data Protection Act (PDPA) and other laws that may apply to you, you may request access to, correction or deletion of your data, object to or restrict processing, withdraw consent and request portability. Contact us to exercise these rights."]],
        ["Security & transfers", ["We use reasonable technical and organisational measures to protect your data. Some providers may process data outside Thailand; where that happens we take steps to keep it protected."]],
        ["Changes", ["We may update this policy. The date at the top shows when it was last changed."]],
      ]}
    />
  );
}

export function Terms() {
  return (
    <LegalPage
      title="Terms & Conditions"
      description="The terms that apply when you use the TripNest website and book travel services through us."
      sections={[
        ["About these terms", [`These terms apply to your use of this website and to services arranged by ${COMPANY.legalName}. By using the site or requesting a booking you agree to them.`]],
        ["Our role", ["We arrange travel services (flights, accommodation, tours and activities) supplied by third-party providers. Unless we say otherwise, the contract for each service is between you and the provider, and the provider's own terms also apply."]],
        ["Quotes, prices & payment", ["Prices are shown in Thai Baht (THB). Other currencies are shown for convenience only and are approximate. A quote is not a confirmed booking: your booking is confirmed only when we confirm it in writing and any required payment is received. Prices and availability can change until confirmation."]],
        ["Changes & cancellations", ["Change and cancellation rules depend on the provider and the product. We show the applicable terms in your quote. Fees may apply and some bookings are non-refundable."]],
        ["Your responsibilities", ["Provide accurate information, hold valid travel documents and visas, arrange suitable travel insurance, and follow instructions from providers and local laws. Tell us about any health condition, age or weight limit that may affect an activity."]],
        ["Adventure & water activities", ["Activities such as skydiving, jet skiing, paragliding, ziplining and boat trips carry inherent risks. You must follow safety briefings and instructions. Providers may refuse participation if it is unsafe."]],
        ["Liability", ["To the extent permitted by law, we are not liable for acts or omissions of independent providers, or for events outside our reasonable control (weather, strikes, government action, etc.). Nothing here limits liability that cannot be limited by law."]],
        ["Website use & content", ["Content on this site is owned by us or our licensors, or used under open licences with credit. Do not copy, scrape or misuse it. Information is provided in good faith but may change without notice."]],
        ["Governing law", ["These terms are governed by the laws of Thailand, subject to any mandatory consumer rights in your country of residence."]],
      ]}
    />
  );
}

export function Cookies() {
  return (
    <LegalPage
      title="Cookie Policy"
      description="What cookies and similar technologies the TripNest website uses and how to control them."
      sections={[
        ["What are cookies", ["Cookies and similar technologies (such as your browser's local storage) are small files that help a website work, remember your choices and understand how it is used."]],
        ["What we use", ["Essential storage — keeps the site working and remembers your preferences: your signed-in state, currency choice, saved trips and your cookie choice.", "Analytics (only if you accept) — helps us understand which pages are useful, using tools such as Google Analytics.", "Marketing (only if you accept) — measures the effectiveness of advertising, using tools such as the Meta Pixel."]],
        ["Your choices", ["You can accept all cookies or choose essential only in the cookie banner. You can also delete cookies and site data in your browser settings at any time; the banner will then ask again."]],
        ["Third parties", ["Analytics and advertising providers may set their own cookies and have their own privacy policies."]],
      ]}
    />
  );
}
