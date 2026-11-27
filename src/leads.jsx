import { LuCheck, LuMail } from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa6";
import { CONTACT } from "./data.js";
import { track } from "./analytics.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// Lead handling without a backend.
//  • If VITE_FORM_ENDPOINT is set (Formspree, Getform, Basin, a Google Apps Script URL …)
//    every form is POSTed there as JSON  →  you receive it by email / sheet.
//  • If not, nothing is silently lost: the visitor gets a pre-filled WhatsApp / email
//    message to send to you in one tap.
// ─────────────────────────────────────────────────────────────────────────────
const ENDPOINT = import.meta.env.VITE_FORM_ENDPOINT;
export const HAS_ENDPOINT = Boolean(ENDPOINT);

/** Read every filled field of a <form> into { "Label": "value" } (labels come from name / aria-label / <label>). */
export function collect(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.tagName || el.tagName === "BUTTON" || el.tagName === "FIELDSET" || el.type === "submit") continue;
    const v = (el.value || "").trim();
    if (!v) continue;
    const lab = el.closest("label");
    const key = el.name || el.getAttribute("aria-label") || lab?.querySelector("span")?.textContent || lab?.childNodes?.[0]?.textContent || el.placeholder || el.type;
    out[String(key).trim()] = v;
  }
  return out;
}

const wa = CONTACT.tel.replace("+", "");
export const waLink = (text = "Hi TripNest, I'd like to plan a trip.") => `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
export const mailLink = (subject, text) => `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;

const leadText = (kind, f) =>
  `New ${kind} request – TripNest website\n\n` + Object.entries(f).map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\nPage: ${window.location.href}`;

export async function submitLead(kind, fields) {
  const text = leadText(kind, fields);
  let via = "manual";
  if (ENDPOINT) {
    try {
      const r = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ kind, ...fields, page: window.location.href, submitted_at: new Date().toISOString() }),
      });
      if (r.ok) via = "endpoint";
    } catch { /* fall back to WhatsApp / email */ }
  }
  try { // keep a copy for the admin panel (same browser only until a real backend exists)
    const box = JSON.parse(localStorage.getItem("tripnest_lead_inbox") || "[]");
    box.push({ kind, ...fields, text, at: new Date().toISOString() });
    localStorage.setItem("tripnest_lead_inbox", JSON.stringify(box.slice(-50)));
  } catch { /* ignore */ }
  track("generate_lead", { lead_type: kind, delivery: via });
  return { via, text, kind };
}

/** onSubmit helper:  <form onSubmit={(e) => handleLead(e, "Quote", setSent)}>  → setSent(result) */
export async function handleLead(e, kind, setResult, extra = {}) {
  e.preventDefault();
  const fields = { ...collect(e.currentTarget), ...extra };
  setResult(await submitLead(kind, fields));
}

export function LeadSuccess({ result, onClose, className = "" }) {
  const ok = result.via === "endpoint";
  return (
    <div className={`grid place-items-center p-8 text-center ${className}`}>
      <div>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal text-white"><LuCheck size={26} /></span>
        <h3 className="mt-4 text-xl font-extrabold">{ok ? "Thank you! Your request is in." : "One last step"}</h3>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-navy/65">
          {ok ? "We'll reply within one working day. For a faster answer you can also message us on WhatsApp." : "Tap below to send your request to our team on WhatsApp — it's already filled in for you. Prefer email? Use the second button."}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <a href={waLink(result.text)} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_click", { source: "lead" })} className={`btn ${ok ? "btn-ghost" : "btn-primary"}`}><FaWhatsapp size={16} /> Send on WhatsApp</a>
          {!ok && <a href={mailLink(`TripNest ${result.kind} request`, result.text)} className="btn btn-ghost"><LuMail size={15} /> Email instead</a>}
          {onClose && <button onClick={onClose} className="btn btn-navy">Close</button>}
        </div>
      </div>
    </div>
  );
}
