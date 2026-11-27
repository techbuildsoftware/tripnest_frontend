import { useState } from "react";
import {
  LuArrowRight, LuSearch, LuStar, LuShieldCheck, LuHeadset, LuBadgePercent, LuUsers, LuBriefcase, LuQuote, LuSparkles,
  LuMapPin, LuChevronLeft, LuChevronRight, LuClock, LuPlane, LuHotel, LuPackage, LuTicket, LuArrowLeftRight, LuFlame, LuRefreshCw, LuChevronDown,
} from "react-icons/lu";
import { Link } from "../router.jsx";
import { Reveal, Counter } from "../hooks.jsx";
import { SERVICES, PACKAGES, DESTINATIONS, CONTACT, baht } from "../data.js";
import { FAQS, COMPANY } from "../siteConfig.js";
import { useSeo, SITE } from "../seo.js";
import { convertText } from "../currency.js";
import { HeartButton } from "../wishlist.jsx";
import { IMG } from "../images.js";
import { useQuote } from "../quote.jsx";
import Photo from "../components/Photo.jsx";
import SectionTitle from "../components/SectionTitle.jsx";

/* ───────────────────────── Hero + tabbed booking widget (Yatra / Trip.com style) ───────────────────────── */

const CITIES = DESTINATIONS.map((d) => d.name);
const ACTIVITIES = SERVICES.filter((s) => s.id !== "flights" && s.id !== "hotel").map((s) => s.title);

const TABS = [
  { id: "flights", label: "Flights", icon: LuPlane, cta: "Search flights",
    fields: [
      { k: "from", label: "From", type: "text", ph: "Bangkok (BKK)", def: "Bangkok" },
      { k: "to", label: "To", type: "text", ph: "Phuket (HKT)", def: "Phuket" },
      { k: "date", label: "Departure", type: "date" },
      { k: "pax", label: "Travellers", type: "select", opts: ["1 Traveller", "2 Travellers", "3 Travellers", "4+ Travellers"], def: "2 Travellers" },
    ] },
  { id: "hotels", label: "Hotels", icon: LuHotel, cta: "Search hotels",
    fields: [
      { k: "city", label: "City / Area", type: "select", opts: CITIES, def: "Phuket" },
      { k: "in", label: "Check-in", type: "date" },
      { k: "out", label: "Check-out", type: "date" },
      { k: "pax", label: "Guests", type: "select", opts: ["1 Guest", "2 Guests", "3 Guests", "4+ Guests"], def: "2 Guests" },
    ] },
  { id: "activities", label: "Activities", icon: LuTicket, cta: "Find activities",
    fields: [
      { k: "act", label: "Experience", type: "select", opts: ACTIVITIES, def: ACTIVITIES[0] },
      { k: "city", label: "Destination", type: "select", opts: CITIES, def: "Phuket" },
      { k: "date", label: "Date", type: "date" },
      { k: "pax", label: "Guests", type: "select", opts: ["1 Guest", "2 Guests", "3 Guests", "4+ Guests"], def: "2 Guests" },
    ] },
  { id: "packages", label: "Packages", icon: LuPackage, cta: "Find packages",
    fields: [
      { k: "city", label: "Destination", type: "select", opts: CITIES, def: "Phuket" },
      { k: "dur", label: "Duration", type: "select", opts: ["3–4 nights", "5–6 nights", "7–9 nights", "10+ nights"], def: "5–6 nights" },
      { k: "date", label: "Travel month", type: "month" },
      { k: "pax", label: "Travellers", type: "select", opts: ["1 Traveller", "2 Travellers", "3 Travellers", "4+ Travellers"], def: "2 Travellers" },
    ] },
];

const initial = (t) => Object.fromEntries(t.fields.map((f) => [f.k, f.def ?? ""]));

function SearchWidget() {
  const { openQuote } = useQuote();
  const [tab, setTab] = useState("flights");
  const t = TABS.find((x) => x.id === tab);
  const [vals, setVals] = useState(() => Object.fromEntries(TABS.map((x) => [x.id, initial(x)])));
  const v = vals[tab];
  const set = (k, val) => setVals({ ...vals, [tab]: { ...v, [k]: val } });
  const submit = (e) => {
    e.preventDefault();
    const summary = t.fields.map((f) => v[f.k]).filter(Boolean).join(" · ");
    openQuote({ type: "traveller", service: `${t.label}: ${summary}` });
  };
  const swap = () => setVals({ ...vals, flights: { ...v, from: v.to, to: v.from } });
  const cell = "block rounded-xl border border-navy/12 bg-white px-3 py-1.5 transition focus-within:border-teal focus-within:ring-4 focus-within:ring-teal/15 hover:border-teal/50";

  return (
    <div className="rounded-2xl bg-white p-2 text-left text-navy shadow-2xl shadow-navy/30 ring-1 ring-navy/5">
      <div className="flex gap-1 overflow-x-auto px-1 pt-1 no-scrollbar" role="tablist" aria-label="What are you booking?">
        {TABS.map((x) => (
          <button key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold transition-all ${tab === x.id ? "bg-navy text-white shadow-md shadow-navy/25" : "text-navy/70 hover:bg-navy/5 hover:text-navy"}`}>
            <x.icon size={15} /> {x.label}
          </button>
        ))}
        <Link to="/business" className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold text-teal hover:bg-teal/10 sm:flex"><LuBriefcase size={15} /> For Business</Link>
      </div>

      <form key={tab} onSubmit={submit} className="mt-2 grid animate-[fadein_.35s_ease] gap-2 p-1 sm:grid-cols-2 lg:grid-cols-[repeat(4,1fr)_auto]">
        {t.fields.map((f, i) => (
          <label key={f.k} className={`${cell} relative`}>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-navy/45">{f.label}</span>
            {f.type === "select" ? (
              <select value={v[f.k]} onChange={(e) => set(f.k, e.target.value)} className="w-full bg-transparent py-0.5 text-sm font-bold outline-none">
                {f.opts.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input type={f.type} value={v[f.k]} placeholder={f.ph} onChange={(e) => set(f.k, e.target.value)} className="w-full bg-transparent py-0.5 text-sm font-bold outline-none placeholder:font-medium placeholder:text-navy/35" />
            )}
            {tab === "flights" && i === 0 && (
              <button type="button" onClick={swap} aria-label="Swap" className="absolute -right-3.5 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-navy/15 bg-white text-teal shadow transition hover:rotate-180 hover:bg-teal hover:text-white lg:grid"><LuArrowLeftRight size={13} /></button>
            )}
          </label>
        ))}
        <button className="btn btn-sun !rounded-xl !px-7 text-sm sm:col-span-2 lg:col-span-1"><LuSearch size={16} /> {t.cta}</button>
      </form>

    </div>
  );
}

function Hero() {
  return (
    <>
      <section className="relative isolate overflow-hidden pt-14 lg:pt-[86px]">
        <Photo src={IMG.hero} alt="Traveller looking over a tropical island bay in Thailand" className="absolute inset-0 -z-20" imgClassName="scale-105" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy/55 via-navy/20 to-navy/70" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-navy/60 to-transparent" />

        <div className="wrap flex min-h-[300px] flex-col items-center justify-center pb-24 pt-10 text-center text-white sm:min-h-[360px] sm:pb-28">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest ring-1 ring-white/25 backdrop-blur"><LuSparkles size={12} className="text-sun" /> Thailand, simplified</span>
          <h1 className="mt-3 text-4xl font-extrabold leading-none tracking-tight drop-shadow-lg sm:text-6xl">Discover <span className="text-sun">Thailand</span></h1>
          <p className="mt-3 text-sm font-semibold tracking-wide text-white/90 drop-shadow sm:text-lg">Flights · Hotels · Tours · Packages</p>
        </div>
      </section>

      <div className="wrap relative z-10 -mt-20 sm:-mt-24">
        <SearchWidget />
        <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[12px] font-semibold text-navy/70">
          {[[LuShieldCheck, "Secure payments"], [LuHeadset, "24/7 support"], [LuBadgePercent, "Best price"], [LuRefreshCw, "Free changes"]].map(([I, l]) => (
            <li key={l} className="flex items-center gap-1.5"><I size={14} className="text-teal" />{l}</li>
          ))}
        </ul>
      </div>
    </>
  );
}

/* ───────────────────────── Offers strip ───────────────────────── */

const OFFERS = [
  { t: "Flat 10% off hotels", s: "Island resorts & villas", code: "NEST10", img: IMG.hotel, tone: "from-navy/95 to-navy/40" },
  { t: "Yacht party deal", s: "Sunset cruise from ฿8,500", code: "SUNSET", img: IMG.yacht, tone: "from-teal/95 to-teal/40" },
  { t: "Flights from ฿1,990", s: "Domestic & international", code: "FLYNEST", img: IMG.flights, tone: "from-[#7c3aed]/90 to-[#7c3aed]/30" },
  { t: "Adventure bundle −15%", s: "Jet ski + parasailing", code: "THRILL15", img: IMG.jetski, tone: "from-[#d97706]/95 to-[#d97706]/35" },
];

function Offers() {
  const { openQuote } = useQuote();
  return (
    <section className="wrap sec !pb-4 pt-6">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="flex items-center gap-2 text-lg font-extrabold sm:text-xl"><LuFlame className="text-sun" /> Today's top offers</h2>
        <button onClick={() => openQuote()} className="flex items-center gap-1 text-xs font-extrabold uppercase tracking-widest text-teal hover:gap-2">All offers <LuArrowRight size={14} /></button>
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {OFFERS.map((o, i) => (
          <Reveal key={o.code} delay={i * 70} className="w-[78%] shrink-0 snap-start sm:w-auto">
            <button onClick={() => openQuote({ service: `Offer ${o.code}: ${o.t}` })} className="group relative block h-28 w-full overflow-hidden rounded-2xl text-left text-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <Photo src={o.img} alt="" className="absolute inset-0" imgClassName="transition-transform duration-700 group-hover:scale-110" />
              <div className={`absolute inset-0 bg-gradient-to-r ${o.tone}`} />
              <div className="relative flex h-full flex-col justify-between p-3.5">
                <div><p className="text-[15px] font-extrabold leading-tight">{convertText(o.t)}</p><p className="mt-0.5 text-xs text-white/85">{convertText(o.s)}</p></div>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-md border border-dashed border-white/70 bg-white/15 px-2 py-0.5 text-[11px] font-extrabold tracking-wider backdrop-blur">CODE · {o.code}</span>
              </div>
            </button>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── Quick services grid ───────────────────────── */

function QuickServices() {
  return (
    <section className="wrap sec !py-4">
      <div className="card p-3 sm:p-4">
        <div className="grid grid-cols-5 gap-1 sm:gap-2 lg:grid-cols-10">
          {SERVICES.map((s) => (
            <Link key={s.id} to="/services" className="group flex flex-col items-center gap-1.5 rounded-xl p-2 text-center transition hover:bg-teal/[.07]">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-navy/[.06] text-navy transition group-hover:scale-110 group-hover:bg-teal group-hover:text-white sm:h-12 sm:w-12"><s.icon size={21} /></span>
              <span className="text-[11px] font-bold leading-tight sm:text-xs">{s.title}</span>
              <span className="hidden text-[10px] font-semibold text-teal sm:block">{baht(s.from)}+</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Packages ───────────────────────── */

const TAGS = ["All", "Beach", "Classic Circuit", "Family", "Group", "Honeymoon", "Island Hopping"];

export function PackageCard({ p }) {
  const { openQuote } = useQuote();
  return (
    <article className="card card-hover group flex h-full flex-col overflow-hidden">
      <div className="relative">
        <Photo src={p.img} alt={p.title} className="aspect-[16/9]" imgClassName="transition-transform duration-700 group-hover:scale-110" />
        <span className="absolute left-2 top-2 rounded-md bg-sun px-2 py-0.5 text-[10px] font-extrabold uppercase text-navy">{p.off}% off</span>
        <HeartButton id={`pkg:${p.id}`} className="absolute right-2 top-2 !h-7 !w-7" size={14} />
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-navy/85 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">{p.rating} <LuStar size={11} fill="currentColor" className="text-sun" /> <span className="font-medium text-white/70">({p.reviews})</span></span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-extrabold leading-snug">{p.title}</h3>
        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-navy/55"><LuMapPin className="shrink-0 text-teal" size={12} /><span className="truncate">{p.route.join(" → ")}</span></p>
        <div className="mt-2 flex flex-wrap gap-1">
          {p.incl.map((i) => <span key={i} className="rounded bg-navy/[.06] px-1.5 py-0.5 text-[10px] font-bold text-navy/70">{i}</span>)}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <p className="text-[11px] text-navy/40 line-through">{baht(p.was)}</p>
            <p className="text-lg font-extrabold leading-none text-teal">{baht(p.price)}<span className="ml-1 text-[10px] font-semibold text-navy/50">/ person</span></p>
          </div>
          <button onClick={() => openQuote({ service: p.title })} className="btn btn-navy !px-3.5 !py-1.5 !text-xs">Book <LuArrowRight size={13} /></button>
        </div>
      </div>
    </article>
  );
}

function Packages() {
  const [tag, setTag] = useState("All");
  const list = PACKAGES.filter((p) => tag === "All" || p.tags.includes(tag));
  return (
    <section className="wrap sec">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle center={false} eyebrow="Best sellers" title="Top holiday packages" sub="Every itinerary is a starting point — swap a city or upgrade the resort." />
        <Link to="/destinations" className="hidden items-center gap-1 text-xs font-extrabold uppercase tracking-widest text-teal hover:gap-2 sm:flex">View all <LuArrowRight size={14} /></Link>
      </div>
      <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
        {TAGS.map((t) => (
          <button key={t} onClick={() => setTag(t)} className={`shrink-0 rounded-full border px-3.5 py-1 text-xs font-bold transition-all ${tag === t ? "border-navy bg-navy text-white" : "border-navy/15 bg-white hover:border-teal hover:text-teal"}`}>{t}</button>
        ))}
      </div>
      <div key={tag} className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {list.map((p, i) => <div key={p.id} style={{ animation: `fadein .4s ease ${i * 50}ms both` }}><PackageCard p={p} /></div>)}
      </div>
      {list.length === 0 && <p className="mt-8 text-center text-sm text-navy/60">No packages in this category yet — ask us for a custom quote.</p>}
    </section>
  );
}

/* ───────────────────────── Destinations: compact mosaic ───────────────────────── */

function DestinationMosaic() {
  return (
    <section className="wrap sec !pt-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle center={false} eyebrow="Destinations" title="Explore Thailand" sub="Beaches, islands, temples and mountains — tap a place to see what's there." />
        <Link to="/destinations" className="hidden items-center gap-1 text-xs font-extrabold uppercase tracking-widest text-teal hover:gap-2 sm:flex">All destinations <LuArrowRight size={14} /></Link>
      </div>
      <div className="mt-4 grid auto-rows-[110px] grid-cols-2 gap-2.5 sm:auto-rows-[130px] lg:grid-cols-4">
        {DESTINATIONS.map((d, i) => (
          <Link key={d.id} to={`/destinations/${d.id}`} className={`group relative isolate overflow-hidden rounded-2xl ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
            <Photo src={d.img} alt={d.name} className="absolute inset-0" imgClassName="transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3 text-white">
              <div><p className={`font-extrabold leading-tight ${i === 0 ? "text-2xl" : "text-sm sm:text-base"}`}>{d.name}</p><p className="text-[11px] text-white/80">{d.stats[1][1]} packages · {d.sea}</p></div>
              <span className="hidden h-7 w-7 shrink-0 place-items-center rounded-full bg-white/90 text-navy transition group-hover:bg-sun sm:grid"><LuArrowRight size={14} /></span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── Activities carousel ───────────────────────── */

function Activities() {
  const [ref, setRef] = useState(null);
  const scroll = (d) => ref && ref.scrollBy({ left: d * 480, behavior: "smooth" });
  return (
    <section className="wrap sec !pt-2">
      <div className="flex items-end justify-between gap-3">
        <SectionTitle center={false} eyebrow="Things to do" title="Popular activities" sub="From the sky to the sea — book on their own or inside a package." />
        <div className="hidden gap-1.5 sm:flex">
          <button onClick={() => scroll(-1)} aria-label="Previous" className="grid h-9 w-9 place-items-center rounded-full border border-navy/15 bg-white transition hover:bg-navy hover:text-white"><LuChevronLeft /></button>
          <button onClick={() => scroll(1)} aria-label="Next" className="grid h-9 w-9 place-items-center rounded-full border border-navy/15 bg-white transition hover:bg-navy hover:text-white"><LuChevronRight /></button>
        </div>
      </div>
      <div ref={setRef} className="no-scrollbar -mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {SERVICES.map((s) => (
          <Link key={s.id} to="/services" className="card card-hover group w-[170px] shrink-0 snap-start overflow-hidden sm:w-[200px]">
            <div className="relative">
              <Photo src={s.img} alt={s.title} className="aspect-[4/3]" imgClassName="transition-transform duration-700 group-hover:scale-110" />
              <span className="absolute left-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-navy/90 text-white"><s.icon size={16} /></span>
            </div>
            <div className="p-3">
              <h3 className="text-sm font-extrabold">{s.title}</h3>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-navy/55"><LuClock size={11} className="text-teal" />{s.dur}</p>
              <p className="mt-2 text-sm font-extrabold text-teal">{baht(s.from)}<span className="ml-1 text-[10px] font-semibold text-navy/45">from</span></p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── Trust + stats ───────────────────────── */

function Trust() {
  const stats = [[25000, "+", "Happy travellers"], [400, "+", "Business partners"], [60, "+", "Experiences"], [98, "%", "Satisfaction"]];
  const why = [[LuBadgePercent, "Best price guarantee", "Found it cheaper? We'll match it."], [LuShieldCheck, "Secure payments", "Encrypted checkout, trusted gateways."], [LuHeadset, "24/7 human support", "Reach us within 30 seconds."], [LuRefreshCw, "Flexible cancellation", "Free changes on many bookings."]];
  return (
    <section className="wrap sec !pt-2">
      <div className="card overflow-hidden">
        <div className="grid grid-cols-2 divide-navy/10 sm:grid-cols-4 sm:divide-x">
          {why.map(([I, t, d]) => (
            <div key={t} className="flex items-start gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal/10 text-teal"><I size={20} /></span>
              <div><p className="text-[13px] font-extrabold leading-tight">{t}</p><p className="mt-0.5 text-[11px] leading-snug text-navy/55">{d}</p></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-y-3 bg-navy py-4 text-center text-white sm:grid-cols-4">
          {stats.map(([n, s, l]) => (
            <div key={l}><p className="text-2xl font-extrabold"><Counter to={n} suffix={s} /></p><p className="text-[10px] font-bold uppercase tracking-widest text-white/60">{l}</p></div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── B2B band ───────────────────────── */

function BusinessBand() {
  const pts = [["Net wholesale rates", LuBadgePercent], ["Bulk & group booking", LuUsers], ["White-label & API", LuSparkles], ["Dedicated manager", LuHeadset]];
  return (
    <section className="wrap sec !pt-2">
      <Reveal variant="reveal-zoom" className="relative isolate overflow-hidden rounded-2xl text-white">
        <Photo src={IMG.pattaya} alt="" className="absolute inset-0 -z-20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy via-navy/90 to-navy/60" />
        <div className="grid items-center gap-5 p-5 sm:p-7 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest"><LuBriefcase size={12} /> For travel businesses · B2B</span>
            <h2 className="mt-2 text-xl font-extrabold leading-tight sm:text-3xl">Sell more Thailand. Work less.</h2>
            <p className="mt-1.5 max-w-lg text-sm text-white/80">Agencies, hotels and corporate travel managers use TripNest for net rates, instant confirmations and one dashboard for every booking.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/business" className="btn btn-sun">Partner programme <LuArrowRight size={14} /></Link>
              <Link to="/signup" className="btn border border-white/40 text-white hover:bg-white hover:text-navy">Create partner account</Link>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {pts.map(([t, I]) => <li key={t} className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 p-3 text-xs font-bold backdrop-blur"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal"><I size={16} /></span>{t}</li>)}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}

/* ───────────────────────── Testimonials ───────────────────────── */

function Testimonials() {
  const t = [
    { n: "Anna K.", r: "Traveller · Germany", q: "Booked skydiving, jet ski and a yacht party in one go. Zero stress and the team was brilliant." },
    { n: "Rahul M.", r: "Owner · Horizon Travels", q: "Net rates and the partner dashboard doubled our activity bookings in a single season." },
    { n: "Sophie L.", r: "Traveller · France", q: "The Coral Island trip was the highlight of our holiday. Booking took two minutes." },
  ];
  return (
    <section className="wrap sec !pt-2">
      <SectionTitle eyebrow="Reviews" title="Trusted by travellers and partners" />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {t.map((x, i) => (
          <Reveal key={x.n} delay={i * 80} className="card card-hover relative p-4">
            <LuQuote className="absolute right-4 top-4 text-teal/20" size={30} />
            <div className="flex text-sun">{[...Array(5)].map((_, k) => <LuStar key={k} size={13} fill="currentColor" />)}</div>
            <p className="mt-2 text-[13px] leading-relaxed text-navy/80">“{x.q}”</p>
            <div className="mt-3 flex items-center gap-2.5">
              <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white ${i % 2 ? "bg-teal" : "bg-navy"}`}>{x.n[0]}</span>
              <div><p className="text-xs font-extrabold">{x.n}</p><p className="text-[11px] text-navy/55">{x.r}</p></div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── CTA ───────────────────────── */

export function CTA() {
  const { openQuote } = useQuote();
  return (
    <section className="wrap pb-10 sm:pb-12">
      <Reveal variant="reveal-zoom" className="relative isolate overflow-hidden rounded-2xl p-6 text-center text-white sm:p-9">
        <Photo src={IMG.maya} alt="" className="absolute inset-0 -z-20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-navy/95 via-navy/85 to-teal/70" />
        <h2 className="mx-auto max-w-2xl text-xl font-extrabold leading-tight sm:text-3xl">Ready to build your next adventure?</h2>
        <p className="mx-auto mt-1.5 max-w-xl text-sm text-white/85">Get a free quote in under a day — as a traveller or as a business partner.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button onClick={() => openQuote()} className="btn btn-sun">Get free quote <LuArrowRight size={14} /></button>
          <Link to="/signup" className="btn border border-white/40 text-white hover:bg-white/10">Create account</Link>
        </div>
      </Reveal>
    </section>
  );
}

function Faq() {
  return (
    <section className="wrap sec">
      <SectionTitle eyebrow="FAQ" title="Questions travellers ask us" />
      <div className="mx-auto mt-4 max-w-3xl space-y-2">
        {FAQS.map(([q, a]) => (
          <details key={q} className="card group px-4 py-3 open:shadow-md">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold [&::-webkit-details-marker]:hidden">{q}<LuChevronDown className="shrink-0 text-teal transition group-open:rotate-180" size={18} /></summary>
            <p className="mt-2 text-[13px] leading-relaxed text-navy/70">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  useSeo({
    title: "TripNest – Thailand flights, hotels, tours & activities",
    description: "Book Thailand with TripNest: island tours, yacht parties, adventures, packages and stays across Phuket, Krabi, Bangkok, Pattaya and more. Free quote in one working day.",
    jsonLd: [
      { "@context": "https://schema.org", "@type": "TravelAgency", name: "TripNest", legalName: COMPANY.legalName, url: SITE, telephone: CONTACT.tel, email: CONTACT.email, areaServed: "Thailand" },
      { "@context": "https://schema.org", "@type": "WebSite", name: "TripNest", url: SITE },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
    ],
  });
  return (<><Hero /><Offers /><QuickServices /><Packages /><DestinationMosaic /><Activities /><Trust /><BusinessBand /><Testimonials /><Faq /><CTA /></>);
}
