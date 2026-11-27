import "./siteOverrides.js";
import { Suspense, lazy } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { LuPhone, LuMessageSquareText } from "react-icons/lu";
import { AuthProvider } from "./auth.jsx";
import { QuoteProvider, useQuote } from "./quote.jsx";
import { CONTACT } from "./data.js";
import { useRoute, Link } from "./router.jsx";
import { useCurrency } from "./currency.js";
import { useSeo } from "./seo.js";
import { ConsentBanner, track } from "./analytics.jsx";
import { waLink } from "./leads.jsx";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";

// Every page except Home loads on demand → smaller first download, faster first visit.
const AdminApp = lazy(() => import("./admin/AdminApp.jsx"));
const Destinations = lazy(() => import("./pages/Destinations.jsx"));
const DestinationDetail = lazy(() => import("./pages/DestinationDetail.jsx"));
const Services = lazy(() => import("./pages/Services.jsx"));
const Business = lazy(() => import("./pages/Business.jsx"));
const Contact = lazy(() => import("./pages/Contact.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const Wishlist = lazy(() => import("./pages/Wishlist.jsx"));
const Login = lazy(() => import("./pages/Auth.jsx").then((m) => ({ default: m.Login })));
const Signup = lazy(() => import("./pages/Auth.jsx").then((m) => ({ default: m.Signup })));
const Privacy = lazy(() => import("./pages/Legal.jsx").then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import("./pages/Legal.jsx").then((m) => ({ default: m.Terms })));
const Cookies = lazy(() => import("./pages/Legal.jsx").then((m) => ({ default: m.Cookies })));

// Account pages shouldn't appear in Google.
const noindex = (Page, title) => function NoIndex() { useSeo({ title, noindex: true }); return <Page />; };
const LoginPage = noindex(Login, "Log in | TripNest");
const SignupPage = noindex(Signup, "Sign up | TripNest");

const ROUTES = {
  "/": Home, "/destinations": Destinations, "/services": Services, "/business": Business, "/contact": Contact, "/about": About,
  "/wishlist": Wishlist, "/login": LoginPage, "/signup": SignupPage, "/privacy": Privacy, "/terms": Terms, "/cookies": Cookies,
};

function NotFound() {
  useSeo({ title: "Page not found | TripNest", noindex: true });
  return (
    <section className="grid min-h-[70vh] place-items-center px-5 pt-24 text-center">
      <div>
        <p className="text-8xl font-extrabold text-teal">404</p>
        <h1 className="mt-4 text-3xl font-extrabold">This destination doesn't exist</h1>
        <Link to="/" className="btn btn-primary mt-8">Back home</Link>
      </div>
    </section>
  );
}

const Loading = () => <div className="grid min-h-[60vh] place-items-center"><span className="h-9 w-9 animate-spin rounded-full border-4 border-teal/20 border-t-teal" /></div>;

/** Mobile-only action bar: Call · WhatsApp · Quote – the three things that turn a visitor into a lead. */
function MobileBar() {
  const { openQuote } = useQuote();
  const cls = "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-bold";
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex border-t border-navy/10 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgba(19,35,79,.08)] backdrop-blur lg:hidden">
      <a href={`tel:${CONTACT.tel}`} onClick={() => track("call_click")} className={`${cls} text-navy`}><LuPhone size={18} className="text-teal" />Call</a>
      <a href={waLink()} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_click", { source: "mobile_bar" })} className={`${cls} text-navy`}><FaWhatsapp size={18} className="text-[#25D366]" />WhatsApp</a>
      <button onClick={() => openQuote()} className={`${cls} bg-sun text-navy`}><LuMessageSquareText size={18} />Get quote</button>
    </div>
  );
}

export default function App() {
  const path = useRoute();
  useCurrency(); // re-render the whole tree when the visitor switches currency
  if (path === "/admin" || path.startsWith("/admin/")) return <Suspense fallback={<Loading />}><AdminApp path={path} /></Suspense>;
  const detail = path.match(/^\/destinations\/([\w-]+)$/);
  const Page = ROUTES[path] || NotFound;
  return (
    <AuthProvider>
      <QuoteProvider>
        <a href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }} className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold">Skip to content</a>
        <Navbar path={path} />
        <main id="main" tabIndex={-1} key={path} className="animate-[fadein_.5s_ease] overflow-x-clip outline-none">
          <Suspense fallback={<Loading />}>{detail ? <DestinationDetail id={detail[1]} /> : <Page />}</Suspense>
        </main>
        <Footer />
        <a href={waLink()} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_click", { source: "float" })} aria-label="Chat on WhatsApp" className="fixed bottom-5 right-5 z-40 hidden h-14 w-14 place-items-center rounded-full bg-teal text-white shadow-xl shadow-teal/40 transition hover:-translate-y-1 hover:bg-navy lg:grid">
          <span className="animate-pulse-ring absolute inset-0 rounded-full bg-teal" />
          <FaWhatsapp size={28} className="relative" />
        </a>
        <MobileBar />
        <div className="h-14 lg:hidden" aria-hidden />
        <ConsentBanner path={path} />
      </QuoteProvider>
    </AuthProvider>
  );
}
