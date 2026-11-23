import { AuthProvider } from "./auth.jsx";
import { QuoteProvider } from "./quote.jsx";
import Destinations from "./pages/Destinations.jsx";
import { FaWhatsapp } from "react-icons/fa6";
import { CONTACT } from "./data.js";
import { useRoute } from "./router.jsx";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import Services from "./pages/Services.jsx";
import Business from "./pages/Business.jsx";
import Contact from "./pages/Contact.jsx";
import { Login, Signup } from "./pages/Auth.jsx";
import { Link } from "./router.jsx";

const ROUTES = { "/": Home, "/destinations": Destinations, "/services": Services, "/business": Business, "/contact": Contact, "/login": Login, "/signup": Signup };

function NotFound() {
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

export default function App() {
  const path = useRoute();
  const Page = ROUTES[path] || NotFound;
  return (
    <AuthProvider>
      <QuoteProvider>
        <Navbar path={path} />
        <main key={path} className="animate-[fadein_.5s_ease] overflow-x-clip">
          <Page />
        </main>
        <Footer />
        <a href={`https://wa.me/${CONTACT.tel.replace("+", "")}`} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp" className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-teal text-white shadow-xl shadow-teal/40 transition hover:-translate-y-1 hover:bg-navy">
          <span className="animate-pulse-ring absolute inset-0 rounded-full bg-teal" />
          <FaWhatsapp size={28} className="relative" />
        </a>
      </QuoteProvider>
    </AuthProvider>
  );
}
