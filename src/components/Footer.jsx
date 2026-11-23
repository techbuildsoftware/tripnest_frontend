import { FaFacebookF, FaInstagram, FaXTwitter, FaLinkedinIn, FaYoutube, FaWhatsapp } from "react-icons/fa6";
import { LuPhone, LuMail, LuMapPin, LuArrowRight } from "react-icons/lu";
import { Link } from "../router.jsx";
import { CONTACT, SERVICES, NAV } from "../data.js";
import Logo from "./Logo.jsx";

const SOCIALS = [
  { name: "Facebook", icon: FaFacebookF, href: "https://facebook.com" },
  { name: "Instagram", icon: FaInstagram, href: "https://instagram.com" },
  { name: "X", icon: FaXTwitter, href: "https://x.com" },
  { name: "LinkedIn", icon: FaLinkedinIn, href: "https://linkedin.com" },
  { name: "YouTube", icon: FaYoutube, href: "https://youtube.com" },
  { name: "WhatsApp", icon: FaWhatsapp, href: `https://wa.me/${CONTACT.tel.replace("+", "")}` },
];

export default function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden bg-navy text-white">
      {/* animated wave edge */}
      <div className="absolute inset-x-0 top-0 -translate-y-[1px] overflow-hidden leading-[0]" aria-hidden>
        <svg className="animate-wave h-12 w-[200%] text-white" viewBox="0 0 2400 60" preserveAspectRatio="none">
          <path fill="currentColor" d="M0 0h2400v20c-100 30-200 30-300 0s-200-30-300 0-200 30-300 0-200-30-300 0-200 30-300 0-200-30-300 0-200 30-300 0-200-30-300 0V0z" />
        </svg>
      </div>
      <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-teal/25 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 pb-8 pt-24 sm:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.3fr]">
          <div>
            <Logo plate className="h-12" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">
              One platform for flights, stays and unforgettable adventures. We serve individual travellers and travel businesses across Thailand and beyond.
            </p>
            <ul className="mt-6 flex flex-wrap gap-3">
              {SOCIALS.map((s) => (
                <li key={s.name}>
                  <a href={s.href} target="_blank" rel="noreferrer" aria-label={s.name}
                    className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white/90 transition-all duration-300 hover:-translate-y-1.5 hover:border-teal hover:bg-teal hover:text-white hover:shadow-lg hover:shadow-teal/40">
                    <s.icon size={17} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-teal">Company</h4>
            <ul className="mt-5 space-y-3 text-sm text-white/75">
              {NAV.map((n) => <li key={n.to}><Link to={n.to} className="transition hover:translate-x-1 hover:text-white inline-block">{n.label}</Link></li>)}
              <li><Link to="/login" className="inline-block transition hover:translate-x-1 hover:text-white">Log in</Link></li>
              <li><Link to="/signup" className="inline-block transition hover:translate-x-1 hover:text-white">Sign up</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-teal">Services</h4>
            <ul className="mt-5 space-y-3 text-sm text-white/75">
              {SERVICES.slice(0, 6).map((s) => <li key={s.id}><Link to="/services" className="inline-block transition hover:translate-x-1 hover:text-white">{s.title}</Link></li>)}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-teal">Get in touch</h4>
            <ul className="mt-5 space-y-4 text-sm text-white/80">
              <li><a href={`tel:${CONTACT.tel}`} className="flex items-center gap-3 transition hover:text-white"><LuPhone className="shrink-0 text-teal" size={18} />{CONTACT.phone}</a></li>
              <li><a href={`mailto:${CONTACT.email}`} className="flex items-center gap-3 break-all transition hover:text-white"><LuMail className="shrink-0 text-teal" size={18} />{CONTACT.email}</a></li>
              <li className="flex items-center gap-3"><LuMapPin className="shrink-0 text-teal" size={18} />Thailand</li>
            </ul>
            <form onSubmit={(e) => { e.preventDefault(); e.currentTarget.reset(); }} className="mt-6 flex overflow-hidden rounded-full border border-white/20 bg-white/5 focus-within:border-teal">
              <input type="email" required placeholder="Newsletter email" aria-label="Newsletter email" className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-white/40" />
              <button className="m-1 grid h-10 w-10 place-items-center rounded-full bg-teal transition hover:scale-105" aria-label="Subscribe"><LuArrowRight /></button>
            </form>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/60 sm:flex-row">
          <p className="text-center sm:text-left">© {new Date().getFullYear()} TripNest Travel Tech Company Limited. All rights reserved.<br className="hidden sm:block" /> <span className="text-white/40">Photos: Wikimedia Commons contributors (CC licences) and TripNest.</span></p>
          <p className="flex gap-5"><Link to="/" className="hover:text-white">Privacy</Link><Link to="/" className="hover:text-white">Terms</Link><Link to="/" className="hover:text-white">Cookies</Link></p>
        </div>
      </div>
    </footer>
  );
}
