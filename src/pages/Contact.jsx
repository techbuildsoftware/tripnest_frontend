import { useState } from "react";
import { LuPhone, LuMail, LuMapPin, LuSend, LuCheck, LuClock, LuUser, LuBriefcase } from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa6";
import { Link } from "../router.jsx";
import { Reveal } from "../hooks.jsx";
import { CONTACT } from "../data.js";
import SectionTitle from "../components/SectionTitle.jsx";
import Photo from "../components/Photo.jsx";
import { IMG } from "../images.js";

const Wrap = ({ href, ...p }) => (href.startsWith("/") ? <Link to={href} {...p} /> : <a href={href} {...p} />);

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [who, setWho] = useState("traveller");
  const cards = [
    { icon: LuPhone, t: "Call us", v: CONTACT.phone, href: `tel:${CONTACT.tel}` },
    { icon: FaWhatsapp, t: "WhatsApp", v: "Chat instantly", href: `https://wa.me/${CONTACT.tel.replace("+", "")}` },
    { icon: LuMail, t: "Email", v: CONTACT.email, href: `mailto:${CONTACT.email}` },
    { icon: LuClock, t: "Support hours", v: "24 / 7, all year", href: "/contact" },
  ];
  return (
    <>
      <section className="relative isolate overflow-hidden px-5 pb-14 pt-40 text-center text-white sm:px-8">
        <Photo src={IMG.hero} alt="" className="absolute inset-0 -z-20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy/80 via-navy/65 to-navy/80" />
        <SectionTitle light eyebrow="Contact" title="We'd love to plan your trip" sub="Questions about a booking, a partnership or a custom package? Reach out any time." />
      </section>
      <section className="mx-auto grid max-w-6xl items-stretch gap-6 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1fr_1.15fr]">
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {cards.map((c, i) => (
              <Reveal key={c.t} delay={i * 60} variant="reveal-left" className={i > 1 ? "sm:col-span-2" : ""}>
                <Wrap href={c.href} className="card card-hover group flex h-full items-center gap-3 p-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy text-white transition-colors duration-300 group-hover:bg-teal"><c.icon size={20} /></span>
                  <span className="min-w-0"><span className="block text-[11px] font-bold uppercase tracking-widest text-teal">{c.t}</span><span className="block break-words text-sm font-extrabold leading-snug">{c.v}</span></span>
                </Wrap>
              </Reveal>
            ))}
          </div>
          <Reveal variant="reveal-left" className="flex-1">
            <div className="card h-full p-5">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-teal"><LuClock size={14} /> At a glance</p>
              <dl className="mt-2 divide-y divide-navy/10 text-sm">
                {[["Support", "24 / 7"], ["First reply", "Within 4 working hrs"], ["Full itinerary", "Within 24 working hrs"], ["Planning fee", "None"], ["Partner onboarding", "24–48 hours"]].map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-navy/60">{k}</dt><dd className="text-right font-bold">{v}</dd></div>)}
              </dl>
              <p className="mt-2 flex items-center gap-2 border-t border-navy/10 pt-3 text-xs font-semibold text-navy/60"><LuMapPin className="text-teal" size={14} /> Serving travellers &amp; partners across Thailand</p>
            </div>
          </Reveal>
        </div>
        <Reveal variant="reveal-right" className="h-full">
          {sent ? (
            <div className="card grid h-full place-items-center p-10 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal text-white"><LuCheck size={26} /></span><h3 className="mt-4 text-xl font-extrabold">Message sent!</h3><p className="mt-1.5 text-sm text-navy/65">Thanks for reaching out — we'll reply shortly.</p></div></div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="card h-full overflow-hidden shadow-xl shadow-navy/10">
              <div className="flex items-center gap-3 bg-navy px-6 py-4 text-white">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal"><LuSend size={18} /></span>
                <div><h2 className="text-base font-extrabold leading-tight">Send us a message</h2><p className="text-xs text-white/70">We reply within 4 working hours</p></div>
              </div>
              <div className="grid gap-3.5 p-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-bold text-navy/70">I am a</span>
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-navy/5 p-1">
                    {[["traveller", "Traveller", LuUser], ["business", "Business", LuBriefcase]].map(([k, l, I]) => (
                      <button key={k} type="button" onClick={() => setWho(k)} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-all ${who === k ? "bg-white text-navy shadow-sm" : "text-navy/55 hover:text-navy"}`}><I size={15} className={who === k ? "text-teal" : ""} />{l}</button>
                    ))}
                  </div>
                </div>
                <label className="block"><span className="mb-1.5 block text-xs font-bold text-navy/70">Name</span><input required className="input !py-2.5 text-sm" placeholder="Your full name" /></label>
                <label className="block"><span className="mb-1.5 block text-xs font-bold text-navy/70">Email</span><input required type="email" className="input !py-2.5 text-sm" placeholder="you@example.com" /></label>
                <label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-navy/70">Subject</span><input className="input !py-2.5 text-sm" placeholder={who === "business" ? "Partnership, group booking, API…" : "Trip dates, destination, budget…"} /></label>
                <label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-navy/70">Message</span><textarea required rows="4" className="input !py-2.5 text-sm" placeholder="Tell us a little about what you need" /></label>
                <button className="btn btn-primary sm:col-span-2"><LuSend /> Send message</button>
                <p className="text-center text-[11px] text-navy/50 sm:col-span-2">No spam. We only use your details to reply to you.</p>
              </div>
            </form>
          )}
        </Reveal>
      </section>
    </>
  );
}
