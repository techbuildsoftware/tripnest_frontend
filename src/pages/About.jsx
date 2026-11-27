import { LuArrowRight, LuUsers, LuBriefcase, LuTicket, LuSearch, LuMessageCircle, LuCalendarCheck, LuHeartHandshake, LuShieldCheck, LuHeadset, LuMapPinned, LuMail, LuPhone } from "react-icons/lu";
import { Link } from "../router.jsx";
import { Reveal } from "../hooks.jsx";
import { CONTACT } from "../data.js";
import { COMPANY } from "../siteConfig.js";
import { IMG } from "../images.js";
import { useSeo } from "../seo.js";
import { useQuote } from "../quote.jsx";
import Photo from "../components/Photo.jsx";
import SectionTitle from "../components/SectionTitle.jsx";

export default function About() {
  const { openQuote } = useQuote();
  useSeo({ title: "About TripNest – Thailand travel, simplified", description: "TripNest is a Thailand-focused travel tech company helping travellers book flights, stays and adventures — and giving travel businesses the tools to sell more." });

  const what = [
    [LuUsers, "For travellers", "Flights, hotels, island tours and adventure activities — planned and booked in one conversation, with a real person to help."],
    [LuBriefcase, "For businesses", "Agencies, hotels and corporate travel teams get partner rates, bulk booking and one place to manage requests."],
    [LuTicket, "Experiences", "Yacht parties, skydiving, jet ski, snorkelling and more — curated with trusted local partners."],
  ];
  const steps = [
    [LuSearch, "Tell us what you want", "Pick a destination or activity and send a quick request."],
    [LuMessageCircle, "Get options & prices", "We reply with clear choices, inclusions and cancellation terms."],
    [LuCalendarCheck, "Confirm & travel", "Approve your plan, receive your vouchers, and enjoy the trip."],
  ];
  const promise = [
    [LuShieldCheck, "Clear pricing", "What's included is spelled out before you confirm."],
    [LuHeadset, "Real people", "Message or call us any time — no bots in the way."],
    [LuMapPinned, "Local know-how", "Suggestions based on season, weather and what suits your group."],
    [LuHeartHandshake, "Flexible planning", "Swap a city, upgrade a hotel or add an activity."],
  ];
  const rows = [["Company", COMPANY.legalName], ["Based in", COMPANY.address], COMPANY.registrationNo && ["Registration no.", COMPANY.registrationNo], COMPANY.tourLicenceNo && ["Tourism licence", COMPANY.tourLicenceNo]].filter(Boolean);

  return (
    <>
      <section className="relative isolate overflow-hidden px-4 pb-10 pt-28 text-center text-white sm:px-6 lg:pt-32">
        <Photo src={IMG.hero} alt="" priority sizes="100vw" className="absolute inset-0 -z-20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy/80 via-navy/60 to-navy/85" />
        <SectionTitle light eyebrow="About us" title="Thailand travel, simplified" sub="TripNest is a travel-tech company that makes it easy to discover, plan and book Thailand — for travellers and for the businesses that serve them." />
      </section>

      <div className="wrap space-y-10 py-8 sm:py-10">
        <section className="grid gap-3 md:grid-cols-3">
          {what.map(([I, t, d], i) => (
            <Reveal key={t} delay={i * 70} className="card card-hover p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal/10 text-teal"><I size={20} /></span>
              <h3 className="mt-3 text-base font-extrabold">{t}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-navy/70">{d}</p>
            </Reveal>
          ))}
        </section>

        <section>
          <SectionTitle center={false} eyebrow="How it works" title="Three simple steps" />
          <div className="relative mt-5 grid gap-3 md:grid-cols-3">
            {steps.map(([I, t, d], i) => (
              <Reveal key={t} delay={i * 80} className="card relative p-4">
                <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-navy text-[11px] font-extrabold text-white">{i + 1}</span>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy text-white"><I size={20} /></span>
                <h3 className="mt-3 text-base font-extrabold">{t}</h3>
                <p className="mt-1 text-[13px] text-navy/70">{d}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle center={false} eyebrow="Our promise" title="What you can expect" />
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {promise.map(([I, t, d]) => (
              <div key={t} className="card p-4"><I className="text-teal" size={22} /><h3 className="mt-2 text-sm font-extrabold">{t}</h3><p className="mt-1 text-[12px] leading-snug text-navy/65">{d}</p></div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="text-lg font-extrabold">Company details</h2>
            <dl className="mt-2 divide-y divide-navy/10 text-sm">
              {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-navy/60">{k}</dt><dd className="text-right font-bold">{v}</dd></div>)}
            </dl>
          </div>
          <div className="card p-5">
            <h2 className="text-lg font-extrabold">Talk to us</h2>
            <ul className="mt-3 space-y-2 text-sm font-semibold">
              <li><a href={`tel:${CONTACT.tel}`} className="flex items-center gap-2 hover:text-teal"><LuPhone className="text-teal" size={16} />{CONTACT.phone}</a></li>
              <li><a href={`mailto:${CONTACT.email}`} className="flex items-center gap-2 break-all hover:text-teal"><LuMail className="text-teal" size={16} />{CONTACT.email}</a></li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => openQuote()} className="btn btn-primary">Get a free quote <LuArrowRight size={14} /></button>
              <Link to="/business" className="btn btn-ghost">Partner with us</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
