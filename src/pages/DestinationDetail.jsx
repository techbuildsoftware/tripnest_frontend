import { useEffect, useState } from "react";
import {
  LuArrowRight, LuStar, LuMapPin, LuClock, LuSun, LuCalendar, LuPlane, LuWallet, LuSparkles, LuUtensils, LuBedDouble, LuLightbulb,
  LuChevronDown, LuNavigation, LuCheck, LuCamera, LuChevronRight, LuShare2,
} from "react-icons/lu";
import { Link } from "../router.jsx";
import { Reveal } from "../hooks.jsx";
import { DESTINATIONS, PACKAGES, SERVICES, baht } from "../data.js";
import { DETAILS, MONTHS } from "../destinationData.js";
import { useQuote } from "../quote.jsx";
import Photo from "../components/Photo.jsx";
import { PackageCard, CTA } from "./Home.jsx";
import { useSeo, SITE } from "../seo.js";
import { convertText } from "../currency.js";
import { HeartButton } from "../wishlist.jsx";
import { waLink } from "../leads.jsx";
import { track } from "../analytics.jsx";

const SECTIONS = [
  ["overview", "Overview"], ["attractions", "Top attractions"], ["nearby", "Nearby places"], ["todo", "Things to do"],
  ["itinerary", "Itinerary"], ["season", "Best time"], ["food", "Food & stay"], ["tips", "Tips"], ["gallery", "Gallery"], ["faq", "FAQ"],
];

// Smooth-scroll to a section, leaving room for the fixed header + sticky tab bar.
function goTo(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const offset = window.innerWidth >= 1024 ? 140 : 112;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
}

function Head({ id, eyebrow, title, sub }) {
  return (
    <div id={id} className="scroll-mt-32 lg:scroll-mt-36">
      <span className="text-[11px] font-bold uppercase tracking-widest text-teal">{eyebrow}</span>
      <h2 className="mt-0.5 text-xl font-extrabold leading-tight sm:text-2xl">{title}</h2>
      {sub && <p className="mt-1 max-w-2xl text-sm text-navy/60">{sub}</p>}
    </div>
  );
}

export default function DestinationDetail({ id }) {
  const d = DESTINATIONS.find((x) => x.id === id);
  const x = DETAILS[id];
  const { openQuote } = useQuote();
  const [day, setDay] = useState(0);
  const [active, setActive] = useState("overview");
  const [copied, setCopied] = useState(false);
  useSeo(d && x ? {
    title: `${d.name}, Thailand – things to do, nearby places & travel tips | TripNest`,
    description: `${x.tagline}. Best time: ${x.facts.best}. Attractions, nearby places, itineraries, stays and packages for ${d.name}.`,
    image: x.hero,
    jsonLd: [
      { "@context": "https://schema.org", "@type": "TouristDestination", name: d.name, description: x.tagline, url: `${SITE}/destinations/${id}`, image: x.hero },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Destinations", item: `${SITE}/destinations` },
        { "@type": "ListItem", position: 3, name: d.name, item: `${SITE}/destinations/${id}` },
      ] },
    ],
  } : { title: "Destination not found | TripNest", noindex: true });
  const share = async () => {
    const url = window.location.href;
    track("share", { item: id });
    try {
      if (navigator.share) { await navigator.share({ title: `${d.name} – TripNest`, text: x.tagline, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { window.open(waLink(`Check out ${d.name} on TripNest: ${url}`), "_blank"); }
  };

  // highlight the section that is currently in view
  useEffect(() => {
    if (!d || !x) return;
    const els = SECTIONS.map(([s]) => document.getElementById(s)).filter(Boolean);
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-140px 0px -65% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [id, d, x]);

  if (!d || !x) {
    return (
      <section className="grid min-h-[60vh] place-items-center px-5 pt-24 text-center">
        <div>
          <p className="text-6xl font-extrabold text-teal">404</p>
          <p className="mt-2 font-bold">We couldn't find that destination.</p>
          <Link to="/destinations" className="btn btn-primary mt-5">All destinations</Link>
        </div>
      </section>
    );
  }

  const pkgs = PACKAGES.filter((p) => p.dest === id);
  const pk = (pkgs.length ? pkgs : PACKAGES).slice(0, 4);
  const services = x.todo.map((sid) => SERVICES.find((s) => s.id === sid)).filter(Boolean);
  const others = DESTINATIONS.filter((o) => o.id !== id);
  const facts = [
    [LuSun, "Best time", x.facts.best], [LuClock, "Ideal stay", x.facts.stay], [LuPlane, "Getting there", x.facts.reach],
    [LuWallet, "Budget (indicative)", convertText(x.facts.budget)], [LuSparkles, "Vibe", x.facts.vibe],
  ];
  const seasonTone = ["bg-navy/10 text-navy/50", "bg-teal/40 text-navy", "bg-teal text-white"];
  const seasonLabel = ["Wet / hot", "Good", "Best"];

  return (
    <>
      {/* ───────── Hero ───────── */}
      <section className="relative isolate overflow-hidden pt-14 text-white lg:pt-[86px]">
        <Photo src={x.hero} alt={d.name} priority sizes="100vw" className="absolute inset-0 -z-20" imgClassName="scale-105" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy/70 via-navy/40 to-navy/85" />
        <div className="wrap grid items-end gap-5 pb-6 pt-8 sm:pt-10 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <nav className="flex items-center gap-1 text-[12px] font-semibold text-white/75" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-white">Home</Link><LuChevronRight size={12} />
              <Link to="/destinations" className="hover:text-white">Destinations</Link><LuChevronRight size={12} />
              <span className="text-white">{d.name}</span>
            </nav>
            <h1 className="mt-3 text-4xl font-extrabold leading-none tracking-tight drop-shadow-lg sm:text-6xl">{d.name}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-white/90"><LuMapPin size={14} className="text-sun" />{d.sea}</p>
            <p className="mt-3 max-w-xl text-base text-white/90 sm:text-lg">{x.tagline}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => openQuote({ service: `Trip to ${d.name}` })} className="btn btn-sun">Plan my trip <LuArrowRight size={14} /></button>
              <button type="button" onClick={() => goTo("packages")} className="btn border border-white/50 text-white hover:bg-white hover:text-navy">View packages</button>
              <button type="button" onClick={share} className="btn border border-white/50 text-white hover:bg-white hover:text-navy"><LuShare2 size={14} />{copied ? "Link copied!" : "Share"}</button>
              <HeartButton id={`dest:${id}`} className="!h-10 !w-10" size={18} />
            </div>
          </div>
          <div className="hidden grid-cols-3 gap-2 lg:grid">
            <Photo src={x.gallery[1]} alt="" className="col-span-3 aspect-[21/9] rounded-2xl ring-2 ring-white/30" />
            <Photo src={x.gallery[2]} alt="" className="aspect-[4/3] rounded-2xl ring-2 ring-white/30" />
            <Photo src={x.gallery[3]} alt="" className="aspect-[4/3] rounded-2xl ring-2 ring-white/30" />
            <Photo src={x.gallery[4]} alt="" className="aspect-[4/3] rounded-2xl ring-2 ring-white/30" />
          </div>
        </div>
        <div className="wrap pb-5">
          <ul className="grid grid-cols-4 gap-2">
            {d.stats.map(([l, n]) => (
              <li key={l} className="rounded-xl bg-white/15 py-2 text-center ring-1 ring-white/20 backdrop-blur"><p className="text-lg font-extrabold sm:text-xl">{n}</p><p className="text-[10px] font-bold uppercase tracking-wider text-white/75">{l}</p></li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────── Sticky section nav ───────── */}
      <div className="sticky top-14 z-30 border-b border-navy/10 bg-white/95 backdrop-blur lg:top-[86px]">
        <nav className="wrap no-scrollbar flex gap-1 overflow-x-auto py-1.5" aria-label="Sections">
          {SECTIONS.map(([s, l]) => (
            <button key={s} type="button" onClick={() => { setActive(s); goTo(s); }} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition ${active === s ? "bg-navy text-white" : "text-navy/70 hover:bg-navy/5 hover:text-navy"}`}>{l}</button>
          ))}
        </nav>
      </div>

      <div className="wrap space-y-10 py-8 sm:space-y-12 sm:py-10">
        {/* Quick facts */}
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
          {facts.map(([I, l, v]) => (
            <div key={l} className="card flex items-start gap-2.5 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal/10 text-teal"><I size={18} /></span>
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-widest text-navy/45">{l}</p><p className="mt-0.5 text-[13px] font-bold leading-snug">{v}</p></div>
            </div>
          ))}
        </div>

        {/* Overview */}
        <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Head id="overview" eyebrow="Overview" title={`Why visit ${d.name}`} />
            <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-navy/75">{x.overview.map((p) => <p key={p}>{p}</p>)}</div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {x.why.map((w) => <li key={w} className="flex items-center gap-2 rounded-xl bg-teal/[.07] px-3 py-2 text-[13px] font-bold"><LuCheck className="shrink-0 text-teal" size={16} />{w}</li>)}
            </ul>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-navy/45">Don't miss</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{d.miss.map((m) => <span key={m} className="rounded-full border border-navy/10 bg-white px-3 py-1 text-xs font-semibold">{m}</span>)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Photo src={x.gallery[0]} alt={d.name} className="col-span-2 aspect-[16/10] rounded-2xl" />
            <Photo src={x.gallery[1]} alt="" className="aspect-[4/3] rounded-2xl" />
            <Photo src={x.gallery[2]} alt="" className="aspect-[4/3] rounded-2xl" />
          </div>
        </section>

        {/* Attractions */}
        <section>
          <Head id="attractions" eyebrow="Top attractions" title={`Best things to see in ${d.name}`} sub="Photos are representative of the area." />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {x.attractions.map((a, i) => (
              <Reveal key={a.n} delay={(i % 3) * 70}>
                <article className="card card-hover group flex h-full flex-col overflow-hidden">
                  <div className="relative">
                    <Photo src={a.img} alt={a.n} className="aspect-[16/10]" imgClassName="transition-transform duration-700 group-hover:scale-110" />
                    <span className="absolute left-2 top-2 rounded-md bg-navy/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur">{a.t}</span>
                    <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-bold text-navy"><LuClock size={11} className="text-teal" />{a.time}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-3.5">
                    <h3 className="text-[15px] font-extrabold leading-snug">{a.n}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-navy/70">{a.d}</p>
                    <p className="mt-auto flex items-start gap-1.5 pt-3 text-[12px] font-semibold text-teal"><LuLightbulb size={14} className="mt-px shrink-0 text-sun" />{a.tip}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Nearby */}
        <section>
          <Head id="nearby" eyebrow="Nearby places" title="Explore around" sub="Easy day trips and add-on stops from here." />
          <div className="no-scrollbar -mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {x.nearby.map((n) => (
              <article key={n.n} className="card card-hover group w-[75%] shrink-0 snap-start overflow-hidden sm:w-auto">
                <Photo src={n.img} alt={n.n} className="aspect-[4/3]" imgClassName="transition-transform duration-700 group-hover:scale-110" />
                <div className="p-3">
                  <h3 className="text-sm font-extrabold">{n.n}</h3>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-teal"><LuNavigation size={11} />{n.dist}</p>
                  <p className="mt-1.5 text-[12px] leading-snug text-navy/65">{n.d}</p>
                  <span className="mt-2 inline-block rounded bg-navy/[.06] px-2 py-0.5 text-[10px] font-bold text-navy/70">{n.best}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Things to do */}
        <section>
          <Head id="todo" eyebrow="Things to do" title="Add experiences to your trip" sub="Book on their own or build them into a package." />
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
            {services.map((s) => (
              <article key={s.id} className="card card-hover flex items-center gap-3 p-2.5">
                <Photo src={s.img} alt={s.title} className="h-16 w-16 shrink-0 rounded-xl sm:h-20 sm:w-20" />
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-1.5 text-sm font-extrabold"><s.icon size={14} className="text-teal" />{s.title}</h3>
                  <p className="text-[11px] font-semibold text-navy/55">{s.dur}</p>
                  <p className="mt-0.5 text-sm font-extrabold text-teal">{baht(s.from)}<span className="ml-1 text-[10px] font-semibold text-navy/45">from</span></p>
                </div>
                <button onClick={() => openQuote({ service: `${s.title} in ${d.name}` })} className="btn btn-navy !px-3 !py-1.5 !text-xs">Book</button>
              </article>
            ))}
          </div>
        </section>

        {/* Itinerary */}
        <section>
          <Head id="itinerary" eyebrow="Itinerary" title={`A ${x.itinerary.length}-day plan for ${d.name}`} sub="Mix and match — we'll adapt it to your dates and budget." />
          <div className="card mt-4 overflow-hidden">
            <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-navy/10 bg-navy/[.03] p-2">
              {x.itinerary.map((it, i) => (
                <button key={it.t} onClick={() => setDay(i)} className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-bold transition ${day === i ? "bg-navy text-white shadow" : "text-navy/70 hover:bg-white"}`}>Day {i + 1}</button>
              ))}
            </div>
            <div key={day} className="animate-[fadein_.35s_ease] p-4 sm:p-5">
              <h3 className="text-lg font-extrabold">Day {day + 1}: {x.itinerary[day].t}</h3>
              <ol className="relative mt-4 space-y-4 border-l-2 border-dashed border-teal/40 pl-5">
                {x.itinerary[day].s.map(([t, txt]) => (
                  <li key={t} className="relative">
                    <span className="absolute -left-[27px] top-0.5 grid h-4 w-4 place-items-center rounded-full bg-teal ring-4 ring-white"><span className="h-1.5 w-1.5 rounded-full bg-white" /></span>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-teal">{t}</p>
                    <p className="mt-0.5 text-sm font-semibold text-navy/80">{txt}</p>
                  </li>
                ))}
              </ol>
              <button onClick={() => openQuote({ service: `${x.itinerary.length}-day trip to ${d.name}` })} className="btn btn-primary mt-5">Get this itinerary quoted <LuArrowRight size={14} /></button>
            </div>
          </div>
        </section>

        {/* Season */}
        <section>
          <Head id="season" eyebrow="Best time to visit" title={`When to go to ${d.name}`} sub={`Best season: ${x.facts.best}.`} />
          <div className="card mt-4 p-4">
            <div className="grid grid-cols-12 gap-1.5 sm:gap-2">
              {x.season.map((v, i) => (
                <div key={i} className="text-center">
                  <div className={`grid h-12 place-items-center rounded-lg text-xs font-extrabold sm:h-14 ${seasonTone[v]}`}>{MONTHS[i]}</div>
                </div>
              ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-navy/65">
              {[2, 1, 0].map((v) => <li key={v} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${seasonTone[v].split(" ")[0]}`} />{seasonLabel[v]}</li>)}
            </ul>
          </div>
        </section>

        {/* Food & Stay */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div>
            <Head id="food" eyebrow="Food & stay" title="What to eat" />
            <ul className="mt-4 space-y-2">
              {x.food.map(([f, t]) => (
                <li key={f} className="card flex items-start gap-3 p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sun/20 text-[#b45309]"><LuUtensils size={17} /></span>
                  <div><p className="text-sm font-extrabold">{f}</p><p className="text-[12px] text-navy/65">{t}</p></div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="hidden lg:block"><span className="text-[11px] font-bold uppercase tracking-widest text-teal">&nbsp;</span><h2 className="mt-0.5 text-xl font-extrabold leading-tight sm:text-2xl">Where to stay</h2></div>
            <h2 className="text-xl font-extrabold lg:hidden">Where to stay</h2>
            <ul className="mt-4 space-y-2">
              {x.stay.map((s) => (
                <li key={s.area} className="card flex items-start gap-3 p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal/10 text-teal"><LuBedDouble size={17} /></span>
                  <div className="flex-1"><p className="text-sm font-extrabold">{s.area}</p><p className="text-[12px] text-navy/65">Best for {s.for}</p></div>
                  <p className="shrink-0 text-right text-[12px] font-extrabold text-teal">{convertText(s.price)}<span className="block text-[10px] font-semibold text-navy/45">per night</span></p>
                </li>
              ))}
            </ul>
            <button onClick={() => openQuote({ service: `Hotel in ${d.name}` })} className="btn btn-navy mt-3 w-full">Find hotels in {d.name} <LuArrowRight size={14} /></button>
          </div>
        </section>

        {/* Tips */}
        <section>
          <Head id="tips" eyebrow="Travel tips" title="Good to know before you go" />
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {x.tips.map((t, i) => (
              <div key={t} className="card flex items-start gap-3 p-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-extrabold text-white">{i + 1}</span>
                <p className="text-[13px] font-semibold leading-snug text-navy/80">{t}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Gallery */}
        <section>
          <Head id="gallery" eyebrow="Gallery" title={`${d.name} in pictures`} />
          <div className="mt-4 grid auto-rows-[110px] grid-cols-2 gap-2.5 sm:auto-rows-[140px] md:grid-cols-4">
            {x.gallery.map((g, i) => (
              <Photo key={g + i} src={g} alt={`${d.name} photo ${i + 1}`} className={`rounded-2xl ${i === 0 ? "col-span-2 row-span-2" : ""} ${i === 3 ? "md:col-span-2" : ""}`} imgClassName="transition-transform duration-700 hover:scale-110" />
            ))}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-navy/45"><LuCamera size={12} />Photos: Wikimedia Commons contributors (CC licences) and TripNest.</p>
        </section>

        {/* Packages */}
        <section>
          <Head id="packages" eyebrow="Packages" title={pkgs.length ? `Packages for ${d.name}` : "Popular packages you may like"} sub="Ready-made trips you can customise." />
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {pk.map((p) => <PackageCard key={p.id} p={p} />)}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <Head id="faq" eyebrow="FAQ" title="Questions travellers ask" />
          <div className="mt-4 space-y-2">
            {x.faqs.map(([q, a]) => (
              <details key={q} className="card group p-0 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-extrabold">{q}<LuChevronDown className="shrink-0 text-teal transition group-open:rotate-180" size={18} /></summary>
                <p className="px-4 pb-4 text-[13px] leading-relaxed text-navy/70">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Other destinations */}
        <section>
          <Head eyebrow="Keep exploring" title="More places in Thailand" />
          <div className="no-scrollbar -mx-4 mt-4 flex gap-2.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {others.map((o) => (
              <Link key={o.id} to={`/destinations/${o.id}`} className="group relative isolate h-28 w-40 shrink-0 overflow-hidden rounded-2xl">
                <Photo src={o.img} alt={o.name} className="absolute inset-0" imgClassName="transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/10 to-transparent" />
                <p className="absolute bottom-2 left-3 text-sm font-extrabold text-white">{o.name}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <CTA />
    </>
  );
}
