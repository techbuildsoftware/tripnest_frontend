import { useState } from "react";
import { LuArrowRight, LuSearch, LuStar, LuShieldCheck, LuHeadset, LuBadgePercent, LuUsers, LuBriefcase, LuCheck, LuQuote, LuSparkles, LuCalendarCheck, LuTicket, LuMapPin, LuChevronLeft, LuChevronRight, LuClock } from "react-icons/lu";
import { Link } from "../router.jsx";
import { Reveal, Counter } from "../hooks.jsx";
import { SERVICES, CATEGORIES, PACKAGES, DESTINATIONS, baht } from "../data.js";
import { IMG } from "../images.js";
import { useQuote } from "../quote.jsx";
import Photo from "../components/Photo.jsx";
import SectionTitle from "../components/SectionTitle.jsx";

const AUDIENCE = {
  b2c: {
    label: "Travellers", icon: LuUsers,
    title: <>Your nest for every <span className="text-teal">adventure.</span></>,
    sub: "Flights, hotels, yacht parties, skydiving, jet ski and island tours — booked in minutes. Honest prices, verified partners and a real person on the other end of the line.",
    cta: ["Explore experiences", "/services"], cta2: ["Create free account", "/signup"],
  },
  b2b: {
    label: "Businesses", icon: LuBriefcase,
    title: <>The travel engine behind <span className="text-teal">your business.</span></>,
    sub: "Agencies, hotels and corporates get net wholesale rates, bulk booking tools, white-label pages and a live partner dashboard — all in one platform.",
    cta: ["Explore partner tools", "/business"], cta2: ["Become a partner", "/signup"],
  },
};

function Hero() {
  const [mode, setMode] = useState("b2c");
  const { openQuote } = useQuote();
  const [q, setQ] = useState({ service: "", date: "", guests: "2" });
  const a = AUDIENCE[mode];
  return (
    <>
    <section className="relative isolate overflow-hidden pt-20">
      <Photo src={IMG.hero} alt="Traveller looking over a tropical island bay in Thailand" className="absolute inset-0 -z-20" imgClassName="scale-105" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy/90 via-navy/65 to-navy/20" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-navy/60 to-transparent" />

      <div className="mx-auto max-w-7xl px-5 pb-24 pt-14 text-white sm:px-8 lg:pb-32 lg:pt-24">
        <div className="max-w-2xl">
          <div className="inline-flex rounded-full bg-white/10 p-1 backdrop-blur-md ring-1 ring-white/25" role="tablist" aria-label="Who are you?">
            {Object.entries(AUDIENCE).map(([k, v]) => (
              <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 ${mode === k ? "bg-white text-navy shadow-md" : "text-white/85 hover:text-white"}`}>
                <v.icon size={16} /> {v.label}
              </button>
            ))}
          </div>

          <div key={mode} className="animate-[fadein_.6s_ease]">
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">{a.title}</h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">{a.sub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={a.cta[1]} className="btn btn-primary">{a.cta[0]} <LuArrowRight /></Link>
              <Link to={a.cta2[1]} className="btn border border-white/40 text-white backdrop-blur hover:bg-white hover:text-navy">{a.cta2[0]}</Link>
            </div>
          </div>
        </div>
      </div>
    </section>

      {/* floating search card */}
      <div className="relative z-10 mx-auto -mt-10 max-w-5xl px-5 sm:px-8">
        <form onSubmit={(e) => { e.preventDefault(); openQuote({ type: mode === "b2b" ? "business" : "traveller", service: q.service }); }}
          className="grid gap-3 rounded-3xl border border-navy/10 bg-white p-3 shadow-2xl shadow-navy/20 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_.6fr_auto]">
          <select value={q.service} onChange={(e) => setQ({ ...q, service: e.target.value })} className="input !border-0 !bg-navy/[.04]" aria-label="Experience">
            <option value="">{mode === "b2b" ? "What do you need?" : "Choose experience…"}</option>
            {SERVICES.map((s) => <option key={s.id}>{s.title}</option>)}
          </select>
          <input type="date" value={q.date} onChange={(e) => setQ({ ...q, date: e.target.value })} className="input !border-0 !bg-navy/[.04]" aria-label="Date" />
          <input type="number" min="1" max="500" value={q.guests} onChange={(e) => setQ({ ...q, guests: e.target.value })} className="input !border-0 !bg-navy/[.04]" aria-label="Guests" />
          <button className="btn btn-navy !rounded-2xl sm:col-span-2 lg:col-span-1"><LuSearch /> {mode === "b2b" ? "Request rates" : "Get quote"}</button>
        </form>
      </div>
    </>
  );
}

function Trust() {
  const stats = [[25000, "+", "Happy travellers"], [400, "+", "Business partners"], [60, "+", "Experiences"], [98, "%", "Satisfaction"]];
  return (
    <section className="mx-auto max-w-7xl px-5 pb-6 pt-20 sm:px-8">
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {stats.map(([n, s, l], i) => (
          <Reveal key={l} delay={i * 80} className="text-center">
            <p className="text-4xl font-extrabold text-navy sm:text-5xl"><Counter to={n} suffix={s} /></p>
            <div className="mx-auto mt-2 h-1 w-8 rounded bg-teal" />
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-navy/60">{l}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Categories() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <div className="flex items-end justify-between gap-4">
        <SectionTitle center={false} eyebrow="Pick your style" title="Experiences for every kind of traveller" sub="Choose a category and we'll shortlist what fits your budget — for individuals, families and groups." />
        <Link to="/services" className="hidden shrink-0 items-center gap-2 text-sm font-extrabold uppercase tracking-widest text-teal hover:gap-3 sm:flex">All services <LuArrowRight /></Link>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {CATEGORIES.map((c, i) => {
          const from = Math.min(...SERVICES.filter((s) => s.cat === c.id).map((s) => s.from));
          return (
            <Reveal key={c.id} delay={i * 90} variant="reveal-zoom">
              <Link to="/services" className="group relative block aspect-[4/5] overflow-hidden rounded-3xl sm:aspect-[3/4]">
                <Photo src={c.img} alt={c.title} className="absolute inset-0" imgClassName="transition-transform duration-[1200ms] group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
                  <h3 className="text-lg font-extrabold sm:text-xl">{c.title}</h3>
                  <p className="mt-1 hidden text-sm text-white/80 sm:block">{c.sub}</p>
                  <p className="mt-2 text-sm font-extrabold text-white">from {baht(from)}</p>
                </div>
                <span className="absolute right-4 top-4 grid h-10 w-10 translate-y-2 place-items-center rounded-full bg-white text-navy opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:bg-teal group-hover:text-white group-hover:opacity-100"><LuArrowRight /></span>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

const TAGS = ["All", "Beach", "Classic Circuit", "Family", "Group", "Honeymoon", "Island Hopping"];

export function PackageCard({ p }) {
  const { openQuote } = useQuote();
  return (
    <article className="card card-hover group flex h-full flex-col overflow-hidden">
      <div className="relative">
        <Photo src={p.img} alt={p.title} className="aspect-[16/10]" imgClassName="transition-transform duration-[1200ms] group-hover:scale-110" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {p.tags.map((t) => <span key={t} className="rounded-md bg-teal px-2.5 py-1 text-[11px] font-extrabold uppercase text-white">{t}</span>)}
        </div>
        <span className="absolute right-3 top-3 rounded-md bg-navy/90 px-2.5 py-1 text-[11px] font-bold text-white">{p.off}% off</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-extrabold leading-snug">{p.title}</h3>
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-navy/60"><LuMapPin className="shrink-0 text-teal" size={14} />{p.route.join(" → ")}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.incl.map((i) => <span key={i} className="rounded-md bg-navy/[.06] px-2.5 py-1 text-[11px] font-bold text-navy/70">{i}</span>)}
        </div>
        <div className="mt-auto flex items-end justify-between border-t border-navy/10 pt-4 mt-5">
          <div>
            <p className="text-xs text-navy/45 line-through">{baht(p.was)}</p>
            <p className="text-2xl font-extrabold">{baht(p.price)}<span className="ml-1 text-[11px] font-semibold text-navy/50">/ person</span></p>
          </div>
          <span className="flex items-center gap-1.5 rounded-md bg-teal px-2.5 py-1.5 text-xs font-extrabold text-white">{p.rating} <LuStar size={12} fill="currentColor" /> <span className="font-semibold text-white/75">{p.reviews}</span></span>
        </div>
        <button onClick={() => openQuote({ service: p.title })} className="btn btn-navy mt-4 w-full !py-2.5">Get quote <LuArrowRight /></button>
      </div>
    </article>
  );
}

function Packages() {
  const [tag, setTag] = useState("All");
  const list = PACKAGES.filter((p) => tag === "All" || p.tags.includes(tag));
  return (
    <section className="bg-teal/[.06] py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionTitle center={false} eyebrow="Best sellers" title="Thailand's best-selling packages" sub="Every itinerary is a starting point — swap a city, upgrade the resort, add a dive at no extra planning cost." />
        <div className="mt-8 flex flex-wrap gap-2">
          {TAGS.map((t) => (
            <button key={t} onClick={() => setTag(t)} className={`rounded-full border px-5 py-2 text-sm font-bold transition-all ${tag === t ? "border-navy bg-navy text-white shadow-lg shadow-navy/20" : "border-navy/15 bg-white hover:border-teal hover:text-teal"}`}>{t}</button>
          ))}
        </div>
        <div key={tag} className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((p, i) => <div key={p.id} style={{ animation: `fadein .5s ease ${i * 70}ms both` }}><PackageCard p={p} /></div>)}
        </div>
        {list.length === 0 && <p className="mt-10 text-center text-navy/60">No packages in this category yet — ask us for a custom quote.</p>}
      </div>
    </section>
  );
}

export function DestinationExplorer({ compact = false }) {
  const [id, setId] = useState("phuket");
  const { openQuote } = useQuote();
  const d = DESTINATIONS.find((x) => x.id === id);
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-3 [scrollbar-width:thin]">
        {DESTINATIONS.map((x) => (
          <button key={x.id} onClick={() => setId(x.id)} className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-bold transition-all ${id === x.id ? "border-teal bg-teal text-white shadow-lg shadow-teal/30" : "border-navy/15 bg-white hover:border-teal hover:text-teal"}`}>{x.name}</button>
        ))}
      </div>
      <div key={d.id} className="mt-4 grid gap-6 overflow-hidden rounded-[2rem] border border-navy/10 bg-white shadow-xl shadow-navy/5 animate-[fadein_.5s_ease] lg:grid-cols-[1.15fr_1fr]">
        <div className="relative min-h-[260px] lg:min-h-[460px]">
          <Photo src={d.img} alt={d.name} className="absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/10 to-transparent" />
          <div className="absolute bottom-5 left-6 text-white"><p className="text-3xl font-extrabold">{d.name}</p><p className="mt-1 flex items-center gap-2 text-sm text-white/85"><LuMapPin size={15} />{d.sea}</p></div>
        </div>
        <div className="flex flex-col p-6 sm:p-8">
          <p className="leading-relaxed text-navy/75">{d.blurb}</p>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-widest text-navy/45">Don't miss</p>
          <div className="mt-3 flex flex-wrap gap-2">{d.miss.map((m) => <span key={m} className="rounded-full border border-navy/10 bg-teal/[.07] px-3.5 py-1.5 text-sm font-semibold">{m}</span>)}</div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {d.stats.map(([l, n]) => <div key={l} className="rounded-xl border border-navy/10 py-3 text-center"><p className="text-xl font-extrabold text-teal">{n}</p><p className="text-[10px] font-bold uppercase tracking-widest text-navy/50">{l}</p></div>)}
          </div>
          <div className="mt-auto flex flex-wrap gap-3 pt-7">
            <Link to="/services" className="btn btn-primary">View packages <LuArrowRight /></Link>
            <button onClick={() => openQuote({ service: `Trip to ${d.name}` })} className="btn btn-ghost">Ask about this destination</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Explore() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <SectionTitle center={false} eyebrow="Destinations" title="Explore Thailand" sub="Tap any destination to see what's there and what's included." />
      <div className="mt-10"><DestinationExplorer /></div>
    </section>
  );
}

function Activities() {
  const [ref, setRef] = useState(null);
  const scroll = (d) => ref && ref.scrollBy({ left: d * 340, behavior: "smooth" });
  return (
    <section className="bg-navy/[.04] py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex items-end justify-between gap-4">
          <SectionTitle center={false} eyebrow="Our services" title="Popular activities & services" sub="From the sky to the sea — bookable on their own or inside a package." />
          <div className="hidden gap-2 sm:flex">
            <button onClick={() => scroll(-1)} aria-label="Previous" className="grid h-11 w-11 place-items-center rounded-full border border-navy/15 bg-white transition hover:bg-navy hover:text-white"><LuChevronLeft /></button>
            <button onClick={() => scroll(1)} aria-label="Next" className="grid h-11 w-11 place-items-center rounded-full border border-navy/15 bg-white transition hover:bg-navy hover:text-white"><LuChevronRight /></button>
          </div>
        </div>
        <div ref={setRef} className="-mx-5 mt-10 flex snap-x gap-5 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8 [scrollbar-width:thin]">
          {SERVICES.map((s) => (
            <Link key={s.id} to="/services" className="card card-hover group w-[270px] shrink-0 snap-start overflow-hidden sm:w-[310px]">
              <div className="relative">
                <Photo src={s.img} alt={s.title} className="aspect-[4/3]" imgClassName="transition-transform duration-[1200ms] group-hover:scale-110" />
                <span className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-xl bg-navy text-white"><s.icon size={20} /></span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-extrabold">{s.title}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-navy/55"><LuClock size={13} className="text-teal" />{s.dur}</p>
                <div className="mt-4 flex items-end justify-between"><p className="text-xl font-extrabold text-teal">{baht(s.from)}<span className="ml-1 text-[11px] font-semibold text-navy/50">from</span></p><LuArrowRight className="text-navy/40 transition group-hover:translate-x-1 group-hover:text-teal" /></div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function BusinessBand() {
  const pts = [["Net wholesale rates", LuBadgePercent], ["Bulk & group booking", LuUsers], ["White-label & API", LuSparkles], ["Dedicated manager", LuHeadset]];
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <Reveal variant="reveal-zoom" className="relative isolate overflow-hidden rounded-[2.5rem] text-white">
        <Photo src={IMG.pattaya} alt="" className="absolute inset-0 -z-20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy via-navy/90 to-navy/60" />
        <div className="grid items-center gap-10 p-8 sm:p-14 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest"><LuBriefcase /> For travel businesses · B2B</span>
            <h2 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">Sell more Thailand. Work less.</h2>
            <p className="mt-4 max-w-lg text-white/80">Agencies, hotels, OTAs and corporate travel managers use TripNest for net rates, instant confirmations and one dashboard for every booking.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/business" className="btn btn-primary">Partner programme <LuArrowRight /></Link>
              <Link to="/signup" className="btn border border-white/40 text-white hover:bg-white hover:text-navy">Create partner account</Link>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {pts.map(([t, I]) => <li key={t} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm font-bold backdrop-blur"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal"><I size={20} /></span>{t}</li>)}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}

function How() {
  const steps = [
    { icon: LuSearch, t: "Discover", d: "Browse experiences, compare prices and pick your date." },
    { icon: LuTicket, t: "Book", d: "Secure checkout with instant e-voucher and confirmation." },
    { icon: LuCalendarCheck, t: "Enjoy", d: "Show up and have fun — we handle pickups and support." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
      <SectionTitle eyebrow="How it works" title="Booking in three easy steps" />
      <div className="relative mt-14 grid gap-10 md:grid-cols-3">
        <div className="absolute left-[16%] right-[16%] top-10 hidden border-t-2 border-dashed border-teal/40 md:block" />
        {steps.map((s, i) => (
          <Reveal key={s.t} delay={i * 120} className="relative text-center">
            <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-navy text-white shadow-xl shadow-navy/25 transition-transform duration-500 hover:scale-110 hover:bg-teal">
              <s.icon size={30} />
              <span className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full bg-teal text-xs font-extrabold ring-4 ring-white">{i + 1}</span>
            </div>
            <h3 className="mt-6 text-xl font-extrabold">{s.t}</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-navy/65">{s.d}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const t = [
    { n: "Anna K.", r: "Traveller · Germany", q: "Booked skydiving, jet ski and a yacht party in one go. Zero stress and the team was brilliant." },
    { n: "Rahul M.", r: "Owner · Horizon Travels", q: "Net rates and the partner dashboard doubled our activity bookings in a single season." },
    { n: "Sophie L.", r: "Traveller · France", q: "The Coral Island trip was the highlight of our holiday. Booking took two minutes." },
  ];
  return (
    <section className="bg-teal/[.06] py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionTitle eyebrow="Testimonials" title="Trusted by travellers and partners" />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {t.map((x, i) => (
            <Reveal key={x.n} delay={i * 110} className="card card-hover relative p-8">
              <LuQuote className="absolute right-6 top-6 text-teal/25" size={44} />
              <div className="flex text-teal">{[...Array(5)].map((_, k) => <LuStar key={k} size={16} fill="currentColor" />)}</div>
              <p className="mt-4 leading-relaxed text-navy/80">“{x.q}”</p>
              <div className="mt-6 flex items-center gap-3">
                <span className={`grid h-11 w-11 place-items-center rounded-full font-bold text-white ${i % 2 ? "bg-teal" : "bg-navy"}`}>{x.n[0]}</span>
                <div><p className="text-sm font-extrabold">{x.n}</p><p className="text-xs text-navy/60">{x.r}</p></div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CTA() {
  const { openQuote } = useQuote();
  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8">
      <Reveal variant="reveal-zoom" className="relative isolate overflow-hidden rounded-[2.5rem] p-10 text-center text-white sm:p-16">
        <Photo src={IMG.maya} alt="" className="absolute inset-0 -z-20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-navy/95 via-navy/85 to-teal/70" />
        <h2 className="mx-auto max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">Ready to build your next adventure?</h2>
        <p className="mx-auto mt-4 max-w-xl text-white/85">Get a free quote in under a day — as a traveller or as a business partner.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={() => openQuote()} className="btn btn-light">Get free quote <LuArrowRight /></button>
          <Link to="/signup" className="btn border border-white/40 text-white hover:bg-white/10">Create account</Link>
        </div>
      </Reveal>
    </section>
  );
}

export default function Home() {
  return (<><Hero /><Trust /><Categories /><Packages /><Explore /><Activities /><BusinessBand /><How /><Testimonials /><div className="pt-20"><CTA /></div></>);
}
