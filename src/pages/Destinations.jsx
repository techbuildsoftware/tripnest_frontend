import { Reveal } from "../hooks.jsx";
import { DESTINATIONS, PACKAGES } from "../data.js";
import { IMG } from "../images.js";
import Photo from "../components/Photo.jsx";
import SectionTitle from "../components/SectionTitle.jsx";
import { DestinationExplorer, PackageCard, CTA } from "./Home.jsx";

export default function Destinations() {
  return (
    <>
      <section className="relative isolate overflow-hidden px-5 pb-20 pt-40 text-center text-white sm:px-8">
        <Photo src={IMG.north} alt="" className="absolute inset-0 -z-20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy/80 via-navy/60 to-navy/80" />
        <SectionTitle light eyebrow="Destinations" title="Where do you want to go?" sub="Nine hand-picked places across Thailand — beaches, islands, temples and mountains." />
      </section>
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8"><DestinationExplorer /></section>
      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-8">
        <SectionTitle center={false} eyebrow="Plan it" title="Packages to get you started" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PACKAGES.slice(0, 4).map((p, i) => <Reveal key={p.id} delay={i * 80}><PackageCard p={p} /></Reveal>)}
        </div>
      </section>
      <div className="mt-20"><CTA /></div>
    </>
  );
}
