import { useState } from "react";
import { LuArrowRight, LuBadgePercent, LuClock } from "react-icons/lu";
import { Reveal } from "../hooks.jsx";
import { SERVICES, baht } from "../data.js";
import { IMG } from "../images.js";
import { useQuote } from "../quote.jsx";
import Photo from "../components/Photo.jsx";
import SectionTitle from "../components/SectionTitle.jsx";
import { CTA } from "./Home.jsx";

const CATS = ["All", "Sky", "Sea", "Wildlife", "Travel"];

export default function Services() {
  const [cat, setCat] = useState("All");
  const { openQuote } = useQuote();
  const list = SERVICES.filter((s) => cat === "All" || s.cat === cat);
  return (
    <>
      <section className="relative isolate overflow-hidden px-5 pb-16 pt-40 text-center text-white sm:px-8">
        <Photo src={IMG.bond} alt="" className="absolute inset-0 -z-20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy/80 via-navy/60 to-navy/85" />
        <SectionTitle light eyebrow="Services" title="Experiences you'll never forget" sub="Pick a category or browse everything. Businesses get net rates with a partner account." />
        <Reveal className="relative mt-10 flex flex-wrap justify-center gap-2">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-5 py-2.5 text-sm font-bold transition-all duration-300 ${cat === c ? "border-white bg-white text-navy shadow-lg" : "border-white/40 text-white hover:bg-white/15"}`}>{c}</button>
          ))}
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s, i) => (
            <article key={s.id} className="card card-hover group flex flex-col overflow-hidden" style={{ animation: `fadein .5s ease ${i * 60}ms both` }}>
              <div className="relative">
                <Photo src={s.img} alt={s.title} className="aspect-[16/10]" imgClassName="transition-transform duration-[1200ms] group-hover:scale-110" />
                <span className="absolute left-4 top-4 rounded-full bg-navy/85 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white backdrop-blur">{s.cat}</span>
                <span className="absolute bottom-0 right-4 grid h-12 w-12 translate-y-1/2 place-items-center rounded-2xl bg-teal text-white shadow-lg shadow-teal/40"><s.icon size={22} /></span>
              </div>
              <div className="flex flex-1 flex-col p-6 pt-7">
                <h3 className="text-xl font-extrabold">{s.title}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-navy/55"><LuClock size={13} className="text-teal" />{s.dur}</p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-navy/65">{s.desc}</p>
                <div className="mt-5 flex items-end justify-between">
                  <div><p className="text-[11px] font-bold uppercase tracking-widest text-navy/50">From</p><p className="text-2xl font-extrabold text-teal">{baht(s.from)}</p></div>
                  <button onClick={() => openQuote({ service: s.title })} className="btn btn-navy !px-5 !py-2.5">Get quote <LuArrowRight /></button>
                </div>
                <p className="mt-4 flex items-center gap-2 border-t border-navy/10 pt-4 text-xs font-semibold text-navy/60"><LuBadgePercent className="text-teal" size={16} /> Partners save up to 25% with net rates</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <CTA />
    </>
  );
}
