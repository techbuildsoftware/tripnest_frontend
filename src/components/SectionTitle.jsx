import { Reveal } from "../hooks.jsx";
export default function SectionTitle({ eyebrow, title, sub, center = true, light = false }) {
  return (
    <Reveal className={`${center ? "mx-auto text-center" : ""} max-w-2xl`}>
      <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest ${light ? "bg-white/10 text-white" : "bg-teal/10 text-teal"}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-teal" /> {eyebrow}
      </span>
      <h2 className={`mt-4 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-[2.75rem] ${light ? "text-white" : "text-navy"}`}>{title}</h2>
      {sub && <p className={`mt-4 text-base leading-relaxed sm:text-lg ${light ? "text-white/75" : "text-navy/65"}`}>{sub}</p>}
    </Reveal>
  );
}
