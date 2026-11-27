import { Reveal } from "../hooks.jsx";

/** Compact section heading. `eyebrow` is a small teal label above the title. */
export default function SectionTitle({ eyebrow, title, sub, center = true, light = false }) {
  return (
    <Reveal className={`${center ? "mx-auto text-center" : ""} max-w-2xl`}>
      {eyebrow && (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${light ? "bg-white/15 text-white" : "bg-teal/10 text-teal"}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-sun" /> {eyebrow}
        </span>
      )}
      <h2 className={`mt-2 text-xl font-extrabold leading-tight sm:text-2xl lg:text-3xl ${light ? "text-white" : "text-navy"}`}>{title}</h2>
      {sub && <p className={`mt-1.5 text-sm leading-relaxed sm:text-[15px] ${light ? "text-white/80" : "text-navy/60"}`}>{sub}</p>}
    </Reveal>
  );
}
