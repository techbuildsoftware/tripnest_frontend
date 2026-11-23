import { useState } from "react";
import { LuArrowRight, LuCheck, LuCode, LuLayers, LuBadgePercent, LuChartColumn, LuHandshake, LuWallet, LuPlugZap, LuHeadset } from "react-icons/lu";
import { Link } from "../router.jsx";
import { Reveal, Counter } from "../hooks.jsx";
import SectionTitle from "../components/SectionTitle.jsx";
import Photo from "../components/Photo.jsx";
import { IMG } from "../images.js";
import { useQuote } from "../quote.jsx";

const FEATURES = [
  { icon: LuBadgePercent, t: "Net wholesale rates", d: "Unlock partner-only pricing on every service and set your own margin." },
  { icon: LuLayers, t: "White-label booking", d: "Launch a branded booking page on your domain in a day." },
  { icon: LuCode, t: "Developer API", d: "Search, book and manage inventory directly from your own systems." },
  { icon: LuChartColumn, t: "Live partner dashboard", d: "Track bookings, revenue and commissions with real-time reports." },
  { icon: LuWallet, t: "Flexible payouts", d: "Weekly commission payouts and monthly invoicing for corporate accounts." },
  { icon: LuHeadset, t: "Dedicated manager", d: "A named contact who knows your business and answers fast." },
];
const PLANS = [
  { n: "Starter", p: "Free", s: "For freelancers & small agents", f: ["Partner net rates", "Booking dashboard", "Email support", "10% commission"], hl: false },
  { n: "Growth", p: "฿4,900", s: "per month · for growing agencies", f: ["Everything in Starter", "White-label booking page", "Bulk & group booking", "15% commission", "Priority support"], hl: true },
  { n: "Enterprise", p: "Custom", s: "For hotels, OTAs & corporates", f: ["Everything in Growth", "Full API access", "Custom invoicing & SLA", "Account manager", "Up to 25% commission"], hl: false },
];

export default function Business() {
  const [sent, setSent] = useState(false);
  return (
    <>
      <section className="relative isolate overflow-hidden pb-24 pt-40 text-white">
        <Photo src={IMG.pattaya} alt="" className="absolute inset-0 -z-20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy via-navy/90 to-navy/70" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.2fr_.8fr]">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest"><LuHandshake /> TripNest for Business · B2B</span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">Grow your travel business with <span className="text-teal">better rates</span> and smarter tools.</h1>
            <p className="mt-6 max-w-xl text-lg text-white/75">Travel agencies, hotels, tour desks and corporate travel managers use TripNest to sell more, with less work.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="btn btn-primary">Become a partner <LuArrowRight /></Link>
              <a href="#partner-form" className="btn border border-white/30 text-white hover:bg-white/10">Request a demo</a>
            </div>
          </Reveal>
          <Reveal variant="reveal-right" className="grid grid-cols-2 gap-4">
            {[[400, "+", "Active partners"], [25, "%", "Max commission"], [12, "k", "Monthly bookings"], [99, "%", "Uptime"]].map(([n, s, l], i) => (
              <div key={l} className={`rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur ${i % 2 ? "translate-y-6" : ""}`}>
                <p className="text-4xl font-extrabold"><Counter to={n} suffix={s} /></p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/60">{l}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <SectionTitle eyebrow="Partner tools" title="Everything a modern travel business needs" />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.t} delay={(i % 3) * 100} className="card card-hover group p-8">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal/10 text-teal transition-all duration-500 group-hover:rotate-6 group-hover:bg-teal group-hover:text-white"><f.icon size={26} /></span>
              <h3 className="mt-5 text-xl font-extrabold">{f.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy/65">{f.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-teal/[.06] py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <SectionTitle eyebrow="Partner plans" title="Simple plans that scale with you" sub="No setup fees. Upgrade or cancel any time." />
          <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
            {PLANS.map((p, i) => (
              <Reveal key={p.n} delay={i * 110} className={`relative flex flex-col rounded-[2rem] p-8 transition-transform duration-500 hover:-translate-y-2 ${p.hl ? "bg-navy text-white shadow-2xl shadow-navy/30 lg:-translate-y-4 lg:hover:-translate-y-6" : "border border-navy/10 bg-white"}`}>
                {p.hl && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-teal px-4 py-1 text-xs font-extrabold uppercase tracking-widest text-white">Most popular</span>}
                <h3 className="text-lg font-extrabold">{p.n}</h3>
                <p className="mt-3 text-4xl font-extrabold">{p.p}</p>
                <p className={`mt-1 text-sm ${p.hl ? "text-white/65" : "text-navy/60"}`}>{p.s}</p>
                <ul className="mt-6 flex-1 space-y-3">
                  {p.f.map((x) => <li key={x} className="flex items-center gap-3 text-sm font-semibold"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal text-white"><LuCheck size={12} /></span>{x}</li>)}
                </ul>
                <Link to="/signup" className={`btn mt-8 ${p.hl ? "btn-light" : "btn-navy"}`}>Get started</Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="partner-form" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal variant="reveal-left">
            <SectionTitle center={false} eyebrow="Partner enquiry" title="Let's talk about your business" sub="Tell us a little about your company and a TripNest partner manager will reach out within one working day." />
            <ul className="mt-8 space-y-4">
              {[[LuPlugZap, "Fast onboarding in 24–48 hours"], [LuHandshake, "No lock-in contracts"], [LuHeadset, "Dedicated manager from day one"]].map(([I, t]) => (
                <li key={t} className="flex items-center gap-4 font-semibold"><span className="grid h-11 w-11 place-items-center rounded-xl bg-navy text-white"><I size={20} /></span>{t}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal variant="reveal-right">
            {sent ? (
              <div className="card p-10 text-center">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-teal text-white"><LuCheck size={30} /></span>
                <h3 className="mt-5 text-2xl font-extrabold">Thank you!</h3>
                <p className="mt-2 text-navy/65">We'll be in touch within one working day.</p>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="card grid gap-4 p-6 shadow-2xl shadow-navy/10 sm:grid-cols-2 sm:p-8">
                <input required className="input" placeholder="Full name" aria-label="Full name" />
                <input required className="input" placeholder="Company name" aria-label="Company" />
                <input required type="email" className="input" placeholder="Work email" aria-label="Work email" />
                <input className="input" placeholder="Phone / WhatsApp" aria-label="Phone" />
                <select className="input sm:col-span-2" aria-label="Business type" defaultValue="">
                  <option value="" disabled>Business type</option>
                  <option>Travel agency</option><option>Hotel / resort</option><option>Corporate travel</option><option>Tour operator</option><option>Other</option>
                </select>
                <textarea rows="4" className="input sm:col-span-2" placeholder="How can we help?" aria-label="Message" />
                <button className="btn btn-primary sm:col-span-2">Send enquiry <LuArrowRight /></button>
              </form>
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}
