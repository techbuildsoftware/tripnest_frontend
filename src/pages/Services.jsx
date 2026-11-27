import { useState } from "react";
import { LuArrowRight, LuBadgePercent, LuClock } from "react-icons/lu";
import { Reveal } from "../hooks.jsx";
import { SERVICES, baht } from "../data.js";
import { IMG } from "../images.js";
import { useQuote } from "../quote.jsx";
import Photo from "../components/Photo.jsx";
import SectionTitle from "../components/SectionTitle.jsx";
import { CTA } from "./Home.jsx";
import { useSeo } from "../seo.js";

const CATS = ["All", "Sky", "Sea", "Wildlife", "Travel"];

export default function Services() {
  useSeo({ title: "Thailand tours, activities & services | TripNest", description: "Yacht parties, skydiving, flights, island hopping, hotels and more across Thailand — transparent from-prices and a free quote in one working day." });
  const [cat, setCat] = useState("All");
  const { openQuote } = useQuote();
  const list = SERVICES.filter((s) => cat === "All" || s.cat === cat);
  return (
    <>
      <section className="relative isolate overflow-hidden px-4 pb-8 pt-28 text-center text-white sm:px-6 lg:pt-32">
        <Photo src={IMG.bond} alt="" className="absolute inset-0 -z-20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy/80 via-navy/60 to-navy/85" />
        <SectionTitle light eyebrow="Services" title="Experiences you'll never forget" sub="Pick a category or browse everything. Businesses get net rates with a partner account." />
        <Reveal className="relative mt-5 flex flex-wrap justify-center gap-1.5">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${cat === c ? "border-white bg-white text-navy shadow-lg" : "border-white/40 text-white hover:bg-white/15"}`}>{c}</button>
          ))}
        </Reveal>
      </section>

      <section className="wrap py-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {list.map((s, i) => (
            <article key={s.id} className="card card-hover group flex flex-col overflow-hidden" style={{ animation: `fadein .4s ease ${i * 40}ms both` }}>
              <div className="relative">
                <Photo src={s.img} alt={s.title} className="aspect-[16/10]" imgClassName="transition-transform duration-700 group-hover:scale-110" />
                <span className="absolute left-2 top-2 rounded-md bg-navy/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur">{s.cat}</span>
                <span className="absolute bottom-0 right-3 grid h-9 w-9 translate-y-1/2 place-items-center rounded-xl bg-teal text-white shadow-md shadow-teal/40"><s.icon size={17} /></span>
              </div>
              <div className="flex flex-1 flex-col p-3 pt-4">
                <h3 className="text-sm font-extrabold sm:text-base">{s.title}</h3>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-navy/55"><LuClock size={11} className="text-teal" />{s.dur}</p>
                <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-navy/65">{s.desc}</p>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div><p className="text-[10px] font-bold uppercase tracking-widest text-navy/45">From</p><p className="text-lg font-extrabold leading-none text-teal">{baht(s.from)}</p></div>
                  <button onClick={() => openQuote({ service: s.title })} className="btn btn-navy !px-3.5 !py-1.5 !text-xs">Book <LuArrowRight size={13} /></button>
                </div>
                <p className="mt-3 flex items-center gap-1.5 border-t border-navy/10 pt-2.5 text-[11px] font-semibold text-navy/60"><LuBadgePercent className="text-sun" size={14} /> Partners save up to 25%</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <CTA />
    </>
  );
}
