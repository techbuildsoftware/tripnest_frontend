import { LuHeart, LuArrowRight, LuMapPin } from "react-icons/lu";
import { Link } from "../router.jsx";
import { DESTINATIONS, PACKAGES } from "../data.js";
import { useWishlist, HeartButton } from "../wishlist.jsx";
import { useQuote } from "../quote.jsx";
import { useSeo } from "../seo.js";
import Photo from "../components/Photo.jsx";
import { PackageCard } from "./Home.jsx";

export default function Wishlist() {
  const { items } = useWishlist();
  const { openQuote } = useQuote();
  useSeo({ title: "Saved trips | TripNest", description: "Your saved destinations and packages.", noindex: true });

  const pkgs = PACKAGES.filter((p) => items.includes(`pkg:${p.id}`));
  const dests = DESTINATIONS.filter((d) => items.includes(`dest:${d.id}`));
  const empty = !pkgs.length && !dests.length;
  const summary = [...dests.map((d) => d.name), ...pkgs.map((p) => p.title)].join("; ");

  return (
    <>
      <section className="bg-navy px-4 pb-8 pt-28 text-white sm:px-6 lg:pt-32">
        <div className="wrap !px-0">
          <h1 className="flex items-center gap-2 text-3xl font-extrabold sm:text-4xl"><LuHeart className="text-rose-400" fill="currentColor" /> Saved trips</h1>
          <p className="mt-1 text-sm text-white/70">Tap the heart on any destination or package to save it here. Saved on this device.</p>
        </div>
      </section>

      <div className="wrap space-y-8 py-8">
        {empty ? (
          <div className="card grid place-items-center p-10 text-center">
            <div>
              <LuHeart size={40} className="mx-auto text-navy/25" />
              <p className="mt-3 font-extrabold">Nothing saved yet</p>
              <p className="mt-1 text-sm text-navy/60">Explore destinations and packages and tap the heart to keep your favourites.</p>
              <div className="mt-4 flex justify-center gap-2"><Link to="/destinations" className="btn btn-primary">Browse destinations</Link><Link to="/" className="btn btn-ghost">Home</Link></div>
            </div>
          </div>
        ) : (
          <>
            <button onClick={() => openQuote({ service: `Saved trips: ${summary}` })} className="btn btn-sun">Get a quote for my saved trips <LuArrowRight size={14} /></button>
            {dests.length > 0 && (
              <section>
                <h2 className="text-lg font-extrabold">Destinations</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {dests.map((d) => (
                    <Link key={d.id} to={`/destinations/${d.id}`} className="group relative isolate block aspect-[4/3] overflow-hidden rounded-2xl">
                      <Photo src={d.img} alt={d.name} className="absolute inset-0" imgClassName="transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-transparent to-transparent" />
                      <HeartButton id={`dest:${d.id}`} className="absolute right-2 top-2" />
                      <div className="absolute bottom-2 left-3 text-white"><p className="font-extrabold">{d.name}</p><p className="flex items-center gap-1 text-[11px] text-white/80"><LuMapPin size={11} />{d.sea}</p></div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {pkgs.length > 0 && (
              <section>
                <h2 className="text-lg font-extrabold">Packages</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">{pkgs.map((p) => <PackageCard key={p.id} p={p} />)}</div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
