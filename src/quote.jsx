import { createContext, useContext, useEffect, useState } from "react";
import { LuX, LuArrowRight, LuCheck, LuUsers, LuBriefcase } from "react-icons/lu";
import { IMG } from "./images.js";
import Photo from "./components/Photo.jsx";

const Ctx = createContext(null);
export const useQuote = () => useContext(Ctx);

export function QuoteProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState({});
  const openQuote = (p = {}) => { setPreset(p); setOpen(true); };
  return (
    <Ctx.Provider value={{ openQuote }}>
      {children}
      {open && <QuoteModal preset={preset} onClose={() => setOpen(false)} />}
    </Ctx.Provider>
  );
}

function QuoteModal({ preset, onClose }) {
  const [type, setType] = useState(preset.type || "traveller");
  const [sent, setSent] = useState(false);
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-navy/70 p-4 backdrop-blur-sm animate-[fadein_.25s_ease]" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label="Get free quote">
      <div className="relative my-auto max-h-[96vh] w-full overflow-y-auto max-w-xl animate-[pop_.35s_cubic-bezier(.2,.8,.2,1)] overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button onClick={onClose} aria-label="Close" className="absolute right-2.5 top-2.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-white text-navy shadow-lg transition hover:bg-teal hover:text-white"><LuX size={16} /></button>
        <div className="relative h-20 sm:h-24">
          <Photo src={IMG.hero} alt="" className="absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/80 to-navy/10" />
          <p className="absolute bottom-3 left-5 text-xl font-extrabold text-white sm:text-2xl">Special Offers</p>
        </div>

        {sent ? (
          <div className="grid place-items-center p-12 text-center">
            <div>
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-teal text-white"><LuCheck size={30} /></span>
              <h3 className="mt-5 text-2xl font-extrabold">Thank you!</h3>
              <p className="mt-2 text-navy/65">Your request is in. We'll reply with your quote within one working day.</p>
              <button onClick={onClose} className="btn btn-navy mt-6">Close</button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="grid gap-2.5 p-4 sm:grid-cols-3 sm:p-5">
            <div className="flex items-center justify-between gap-3 sm:col-span-3">
              <h3 className="text-lg font-extrabold">Get Free Quotes</h3>
              <div className="inline-flex rounded-full bg-navy/[.06] p-1 text-xs font-bold">
                {[["traveller", "Traveller", LuUsers], ["business", "Business", LuBriefcase]].map(([k, l, I]) => (
                  <button type="button" key={k} onClick={() => setType(k)} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${type === k ? "bg-navy text-white" : "text-navy/70"}`}><I size={14} />{l}</button>
                ))}
              </div>
            </div>
            <input required className="input !py-2 !text-[13px]" placeholder="Your name" aria-label="Your name" />
            <input required type="email" className="input !py-2 !text-[13px]" placeholder="you@example.com" aria-label="Email" />
            <input className="input !py-2 !text-[13px]" type="tel" placeholder="+66 61 376 7464" aria-label="Phone" />
            {type === "business" && <input required className="input !py-2 !text-[13px] sm:col-span-3" placeholder="Company name" aria-label="Company" />}
            <label className="text-[10px] font-bold uppercase tracking-widest text-navy/55">{type === "business" ? "Start date" : "Travel date"}<input type="date" className="input !py-2 !text-[13px] mt-1 normal-case tracking-normal" /></label>
            <label className="text-[10px] font-bold uppercase tracking-widest text-navy/55">Trip duration
              <select defaultValue={preset.service ? "Day trip" : ""} className="input !py-2 !text-[13px] mt-1 normal-case tracking-normal"><option value="" disabled>Choose…</option><option>Day trip</option><option>3–4 nights</option><option>5–7 nights</option><option>8+ nights</option></select>
            </label>
            <label className="text-[10px] font-bold uppercase tracking-widest text-navy/55">{type === "business" ? "Group size" : "Guests"}
              <select defaultValue="" className="input !py-2 !text-[13px] mt-1 normal-case tracking-normal"><option value="" disabled>Choose…</option><option>1–2</option><option>3–5</option><option>6–10</option><option>11–25</option><option>25+</option></select>
            </label>
            <textarea rows="2" defaultValue={preset.service ? `Interested in: ${preset.service}` : ""} className="input !py-2 !text-[13px] sm:col-span-3" placeholder={type === "business" ? "Tell us about your business and what you need (net rates, bulk booking, API…)" : "Message"} aria-label="Message" />
            <button className="btn btn-primary mx-auto w-full !py-2.5 sm:col-span-3 sm:w-56">Submit <LuArrowRight /></button>
          </form>
        )}
      </div>
    </div>
  );
}
