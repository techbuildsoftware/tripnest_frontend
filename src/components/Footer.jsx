import { useState } from "react";
import { FaFacebookF, FaInstagram, FaXTwitter, FaLinkedinIn, FaYoutube, FaWhatsapp } from "react-icons/fa6";
import { LuPhone, LuMail, LuMapPin, LuArrowRight, LuShieldCheck } from "react-icons/lu";
import { Link } from "../router.jsx";
import { CONTACT, SERVICES, NAV, DESTINATIONS } from "../data.js";
import { COMPANY } from "../siteConfig.js";
import { HAS_ENDPOINT, submitLead, waLink } from "../leads.jsx";
import Logo from "./Logo.jsx";

const SOCIALS = [
  { name: "Facebook", icon: FaFacebookF, href: "https://facebook.com" },
  { name: "Instagram", icon: FaInstagram, href: "https://instagram.com" },
  { name: "X", icon: FaXTwitter, href: "https://x.com" },
  { name: "LinkedIn", icon: FaLinkedinIn, href: "https://linkedin.com" },
  { name: "YouTube", icon: FaYoutube, href: "https://youtube.com" },
  { name: "WhatsApp", icon: FaWhatsapp, href: waLink() },
];
const PAY = ["Visa", "Mastercard", "PromptPay", "UnionPay", "JCB", "Apple Pay"];
const lk = "inline-block transition hover:translate-x-0.5 hover:text-white";

export default function Footer() {
  const [news, setNews] = useState("");
  const subscribe = async (e) => {
    e.preventDefault();
    const email = e.currentTarget.elements.email.value;
    e.currentTarget.reset();
    await submitLead("Newsletter", { email });
    setNews("Thanks – you're subscribed!");
  };
  return (
    <footer className="relative bg-navy text-white">
      <div className="wrap pb-5 pt-9">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1.4fr_.8fr_.9fr_.9fr_1.2fr]">
          <div>
            <Logo plate className="h-14" />
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-white/65">
              Flights, stays and adventures across Thailand — one platform for travellers and travel businesses.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {SOCIALS.map((s) => (
                <li key={s.name}>
                  <a href={s.href} target="_blank" rel="noreferrer" aria-label={s.name}
                    className="grid h-8 w-8 place-items-center rounded-full border border-white/20 text-white/90 transition hover:-translate-y-1 hover:border-teal hover:bg-teal">
                    <s.icon size={13} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-sun">Company</h4>
            <ul className="mt-3 space-y-1.5 text-[13px] text-white/70">
              {NAV.map((n) => <li key={n.to}><Link to={n.to} className={lk}>{n.label}</Link></li>)}
              <li><Link to="/login" className={lk}>Log in</Link></li>
              <li><Link to="/signup" className={lk}>Sign up</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-sun">Destinations</h4>
            <ul className="mt-3 space-y-1.5 text-[13px] text-white/70">
              {DESTINATIONS.slice(0, 6).map((d) => <li key={d.id}><Link to={`/destinations/${d.id}`} className={lk}>{d.name}</Link></li>)}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-sun">Popular services</h4>
            <ul className="mt-3 space-y-1.5 text-[13px] text-white/70">
              {SERVICES.slice(0, 6).map((s) => <li key={s.id}><Link to="/services" className={lk}>{s.title}</Link></li>)}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-sun">Get in touch</h4>
            <ul className="mt-3 space-y-2 text-[13px] text-white/75">
              <li><a href={`tel:${CONTACT.tel}`} className="flex items-center gap-2 hover:text-white"><LuPhone className="shrink-0 text-teal" size={14} />{CONTACT.phone}</a></li>
              <li><a href={`mailto:${CONTACT.email}`} className="flex items-center gap-2 break-all hover:text-white"><LuMail className="shrink-0 text-teal" size={14} />{CONTACT.email}</a></li>
              <li className="flex items-center gap-2"><LuMapPin className="shrink-0 text-teal" size={14} />{COMPANY.address}</li>
            </ul>
            {HAS_ENDPOINT ? (
              news ? <p className="mt-3 text-[13px] font-semibold text-sun">{news}</p> : (
                <form onSubmit={subscribe} className="mt-3 flex overflow-hidden rounded-full border border-white/20 bg-white/5 focus-within:border-teal">
                  <input name="email" type="email" required placeholder="Get deals by email" aria-label="Newsletter email" className="min-w-0 flex-1 bg-transparent px-3.5 py-2 text-[13px] text-white outline-none placeholder:text-white/40" />
                  <button className="m-0.5 grid h-8 w-8 place-items-center rounded-full bg-sun text-navy transition hover:scale-105" aria-label="Subscribe"><LuArrowRight size={15} /></button>
                </form>
              )
            ) : (
              <a href={waLink("Hi TripNest, please send me your latest Thailand deals.")} target="_blank" rel="noreferrer" className="btn btn-sun mt-3 !py-2 text-[13px]"><FaWhatsapp /> Get deals on WhatsApp</a>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-4">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/50"><LuShieldCheck size={14} className="text-teal" /> Secure payments</span>
          {PAY.map((p) => <span key={p} className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/80">{p}</span>)}
        </div>

        <div className="mt-4 flex flex-col items-center justify-between gap-2 text-[11px] text-white/50 sm:flex-row">
          <p className="text-center sm:text-left">© {new Date().getFullYear()} {COMPANY.legalName}. All rights reserved.{COMPANY.registrationNo && ` Reg. no. ${COMPANY.registrationNo}.`}{COMPANY.tourLicenceNo && ` Tourism licence ${COMPANY.tourLicenceNo}.`} <span className="text-white/35">Photos: Wikimedia Commons contributors (CC licences) and TripNest.</span></p>
          <p className="flex gap-4"><Link to="/privacy" className="hover:text-white">Privacy</Link><Link to="/terms" className="hover:text-white">Terms</Link><Link to="/cookies" className="hover:text-white">Cookies</Link></p>
        </div>
      </div>
    </footer>
  );
}
