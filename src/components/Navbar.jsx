import { useEffect, useState } from "react";
import { LuMenu, LuX, LuLogOut, LuArrowRight, LuPhone, LuMail, LuCompass, LuMapPinned, LuTicket, LuBriefcase, LuMessageCircle, LuHeadset, LuInfo, LuHeart } from "react-icons/lu";
import { Link } from "../router.jsx";
import { NAV, CONTACT } from "../data.js";
import { useAuth } from "../auth.jsx";
import { useQuote } from "../quote.jsx";
import { useWishlist } from "../wishlist.jsx";
import CurrencySelect from "./CurrencySelect.jsx";
import Logo from "./Logo.jsx";

const ICONS = { "/": LuCompass, "/destinations": LuMapPinned, "/services": LuTicket, "/business": LuBriefcase, "/about": LuInfo, "/contact": LuMessageCircle };

export default function Navbar({ path }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const { openQuote } = useQuote();
  const { count } = useWishlist();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 bg-white transition-shadow duration-300 ${scrolled || open ? "shadow-md shadow-navy/10" : "border-b border-navy/10"}`}>
      {/* utility strip (Trip.com style) */}
      <div className="hidden bg-navy text-[11px] text-white/80 lg:block">
        <div className="wrap flex h-7 items-center justify-between">
          <p className="flex items-center gap-4">
            <a href={`tel:${CONTACT.tel}`} className="flex items-center gap-1.5 hover:text-white"><LuPhone size={12} />{CONTACT.phone}</a>
            <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-1.5 hover:text-white"><LuMail size={12} />{CONTACT.email}</a>
          </p>
          <p className="flex items-center gap-4">
            <span>Secure payments · 24/7 support</span>
            <CurrencySelect className="bg-white/10 px-1.5 py-0.5 text-white" />
            <span className="font-semibold text-white">EN</span>
            <Link to="/contact" className="flex items-center gap-1 hover:text-white"><LuHeadset size={12} />Help</Link>
          </p>
        </div>
      </div>

      <nav className="wrap flex h-14 items-center justify-between gap-3" aria-label="Main">
        <Link to="/" aria-label="TripNest home" className="shrink-0"><Logo className="h-11 sm:h-[46px]" /></Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => {
            const active = path === n.to || (n.to !== "/" && path.startsWith(n.to + "/"));
            const I = ICONS[n.to];
            return (
              <li key={n.to}>
                <Link to={n.to} className={`group relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-bold transition-colors ${active ? "bg-teal/10 text-teal" : "text-navy hover:bg-navy/5 hover:text-teal"}`}>
                  {I && <I size={15} />}{n.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/wishlist" aria-label={`Saved trips (${count})`} className="relative grid h-9 w-9 place-items-center rounded-full text-navy transition hover:bg-navy/5 hover:text-rose-500"><LuHeart size={18} />{count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{count}</span>}</Link>
          {user ? (
            <>
              <span className="flex items-center gap-2 text-[13px] font-semibold">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-navy text-xs font-bold uppercase text-white">{user.name[0]}</span>
                <span className="max-w-[90px] truncate capitalize">{user.name}</span>
              </span>
              <button onClick={logout} className="btn btn-ghost !px-3.5 !py-1.5"><LuLogOut /> Logout</button>
            </>
          ) : (
            <Link to="/login" className="btn btn-ghost !px-4 !py-1.5">Log in</Link>
          )}
          <button onClick={() => openQuote()} className="btn btn-sun !px-4 !py-1.5">Get quote</button>
        </div>

        <button className="grid h-10 w-10 place-items-center rounded-full text-navy transition hover:bg-navy/5 lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
          {open ? <LuX size={22} /> : <LuMenu size={22} />}
        </button>
      </nav>

      {/* mobile drawer */}
      <div className={`overflow-hidden transition-all duration-300 lg:hidden ${open ? "h-[calc(100vh-56px)]" : "h-0"}`}>
        <div className="flex flex-col gap-1 overflow-y-auto px-4 pb-10 pt-2">
          {NAV.map((n) => {
            const I = ICONS[n.to];
            return (
              <Link key={n.to} to={n.to} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-bold ${path === n.to || (n.to !== "/" && path.startsWith(n.to + "/")) ? "bg-teal/10 text-teal" : "text-navy hover:bg-navy/5"}`}>
                {I && <I size={18} />}{n.label}
              </Link>
            );
          })}
          <div className="mt-2 flex items-center justify-between gap-3 px-4 text-sm font-bold text-navy">
            <Link to="/wishlist" className="flex items-center gap-2"><LuHeart size={18} className="text-rose-500" />Saved trips{count > 0 && ` (${count})`}</Link>
            <CurrencySelect className="border border-navy/15 bg-white px-2 py-1.5" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => { setOpen(false); openQuote(); }} className="btn btn-sun col-span-2">Get free quote <LuArrowRight /></button>
            {user ? (
              <button onClick={logout} className="btn btn-ghost col-span-2"><LuLogOut /> Logout ({user.name})</button>
            ) : (
              <>
                <Link to="/login" className="btn btn-navy">Log in</Link>
                <Link to="/signup" className="btn btn-ghost">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
