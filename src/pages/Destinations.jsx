import { useMemo, useState } from "react";
import { LuArrowRight, LuMapPin, LuSun, LuSearch, LuX } from "react-icons/lu";
import { Reveal } from "../hooks.jsx";
import { DESTINATIONS, PACKAGES } from "../data.js";
import { DETAILS } from "../destinationData.js";
import { IMG } from "../images.js";
import { useSeo } from "../seo.js";
import { HeartButton } from "../wishlist.jsx";
import Photo from "../components/Photo.jsx";
import SectionTitle from "../components/SectionTitle.jsx";
import { Link } from "../router.jsx";
import { PackageCard, CTA } from "./Home.jsx";

const THEMES = {
  phuket: ["Beach", "Island", "Nightlife", "Family"], krabi: ["Beach", "Island", "Adventure", "Nature"], phiphi: ["Island", "Snorkelling", "Nature"],
  phangnga: ["Island", "Nature", "Adventure"], bangkok: ["City", "Culture", "Food", "Family"], pattaya: ["Beach", "Nightlife", "Family", "Adventure"],
  samui: ["Beach", "Island", "Luxury", "Family"], kohtao: ["Island", "Snorkelling", "Adventure"], chiangmai: ["Culture", "Nature", "City", "Adventure"],
};
const FILTERS = ["All", "Beach", "Island", "City", "Culture", "Nature", "Adventure", "Family", "Nightlife"];

export default function Destinations() {
  useSeo({
    title: "Thailand destinations – Phuket, Krabi, Bangkok, Chiang Mai & more | TripNest",
    description: "Explore Phuket, Krabi, Phi Phi, Phang Nga Bay, Bangkok, Pattaya, Koh Samui, Koh Tao and Chiang Mai — attractions, nearby places, itineraries, best time to visit and tips.",
    jsonLd: {
      "@context": "https://schema.org", "@type": "ItemList", name: "Thailand destinations",
      itemListElement: DESTINATIONS.map((d, i) => ({ "@type": "ListItem", position: i + 1, name: d.name, url: `${window.location.origin}/destinations/${d.id}` })),
    },
  });
  const [q, setQ] = useState("");
  const [f, setF] = useState("All");

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return DESTINATIONS.filter((d) => {
      const x = DETAILS[d.id];
      const th = THEMES[d.id] || [];
      if (f !== "All" && !th.includes(f)) return false;
      if (!s) return true;
      return [d.name, d.sea, x?.tagline, ...d.miss, ...th].join(" ").toLowerCase().includes(s);
    });
  }, [q, f]);

  return (
    <>
      <section className="relative isolate overflow-hidden px-4 pb-8 pt-28 text-center text-white sm:px-6 lg:pt-32">
        <Photo src={IMG.north} alt="" priority sizes="100vw" className="absolute inset-0 -z-20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy/80 via-navy/60 to-navy/80" />
        <SectionTitle light eyebrow="Destinations" title="Where do you want to go?" sub="Nine hand-picked places across Thailand — tap one for photos, nearby places, itineraries and tips." />
        <div className="relative mx-auto mt-5 max-w-md">
          <LuSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy/45" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a place, beach, temple…" aria-label="Search destinations" className="w-full rounded-full border-0 bg-white py-3 pl-11 pr-10 text-sm font-semibold text-navy shadow-lg outline-none placeholder:font-medium placeholder:text-navy/40 focus:ring-4 focus:ring-teal/30" />
          {q && <button onClick={() => setQ("")} aria-label="Clear search" className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-navy/50 hover:bg-navy/10"><LuX size={14} /></button>}
        </div>
      </section>

      <section className="wrap py-6">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((x) => (
            <button key={x} onClick={() => setF(x)} className={`shrink-0 rounded-full border px-3.5 py-1 text-xs font-bold transition ${f === x ? "border-navy bg-navy text-white" : "border-navy/15 bg-white hover:border-teal hover:text-teal"}`}>{x}</button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((d, i) => {
            const x = DETAILS[d.id];
            return (
              <Reveal key={d.id} delay={(i % 3) * 70}>
                <Link to={`/destinations/${d.id}`} className="card card-hover group flex h-full flex-col overflow-hidden">
                  <div className="relative">
                    <Photo src={d.img} alt={d.name} className="aspect-[16/10]" imgClassName="transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent" />
                    <div className="absolute bottom-2.5 left-3 text-white"><p className="text-xl font-extrabold leading-tight">{d.name}</p><p className="flex items-center gap-1 text-[11px] text-white/85"><LuMapPin size={11} />{d.sea}</p></div>
                    <span className="absolute left-2 top-2 rounded-md bg-sun px-2 py-0.5 text-[10px] font-extrabold text-navy">{d.stats[1][1]} packages</span>
                    <HeartButton id={`dest:${d.id}`} className="absolute right-2 top-2" />
                  </div>
                  <div className="flex flex-1 flex-col p-3.5">
                    <p className="line-clamp-2 text-[13px] leading-relaxed text-navy/70">{x?.tagline ?? d.blurb}</p>
                    <div className="mt-2 flex flex-wrap gap-1">{(THEMES[d.id] || []).slice(0, 3).map((m) => <span key={m} className="rounded bg-navy/[.06] px-2 py-0.5 text-[10px] font-bold text-navy/70">{m}</span>)}</div>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      {x && <span className="flex items-center gap-1 text-[11px] font-semibold text-navy/55"><LuSun size={12} className="text-sun" />Best: {x.facts.best}</span>}
                      <span className="flex items-center gap-1 text-xs font-extrabold text-teal transition group-hover:gap-2">Explore <LuArrowRight size={14} /></span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
        {list.length === 0 && (
          <div className="card mt-4 p-8 text-center"><p className="font-extrabold">No places match "{q}"{f !== "All" ? ` in ${f}` : ""}</p><button onClick={() => { setQ(""); setF("All"); }} className="btn btn-ghost mt-3">Clear filters</button></div>
        )}
      </section>

      <section className="wrap pb-8">
        <SectionTitle center={false} eyebrow="Plan it" title="Packages to get you started" />
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PACKAGES.slice(0, 4).map((p, i) => <Reveal key={p.id} delay={i * 60}><PackageCard p={p} /></Reveal>)}
        </div>
      </section>
      <CTA />
    </>
  );
}
