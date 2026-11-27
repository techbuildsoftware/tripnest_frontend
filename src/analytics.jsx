import { useEffect, useState } from "react";
import { Link } from "./router.jsx";

// Analytics are OFF until you set the ids in .env AND the visitor accepts cookies.
//   VITE_GA_ID=G-XXXXXXXXXX          (Google Analytics 4)
//   VITE_META_PIXEL_ID=1234567890    (Meta / Facebook Pixel)
const GA = import.meta.env.VITE_GA_ID;
const PIXEL = import.meta.env.VITE_META_PIXEL_ID;
const KEY = "tripnest_consent";
export const ANALYTICS_ENABLED = Boolean(GA || PIXEL);

let loaded = false;
function load() {
  if (loaded || !ANALYTICS_ENABLED) return;
  loaded = true;
  if (GA) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA, { send_page_view: false });
  }
  if (PIXEL) {
    /* eslint-disable */
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", PIXEL);
    /* eslint-enable */
  }
}

export function trackPage(path) {
  if (!loaded) return;
  window.gtag?.("event", "page_view", { page_path: path, page_location: window.location.href });
  window.fbq?.("track", "PageView");
}

/** track("generate_lead", { lead_type: "Quote" }) – no-op unless analytics are enabled & consented. */
export function track(name, params = {}) {
  if (!loaded) return;
  window.gtag?.("event", name, params);
  if (name === "generate_lead") window.fbq?.("track", "Lead");
  if (name === "whatsapp_click") window.fbq?.("track", "Contact");
}

const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

export function ConsentBanner({ path }) {
  const [choice, setChoice] = useState(read);
  useEffect(() => { if (choice === "all") { load(); trackPage(window.location.pathname); } }, [choice]);
  useEffect(() => { if (choice === "all") trackPage(path); }, [path]); // eslint-disable-line
  if (!ANALYTICS_ENABLED || choice) return null;
  const pick = (v) => { try { localStorage.setItem(KEY, v); } catch {} setChoice(v); };
  return (
    <div role="dialog" aria-label="Cookie preferences" className="fixed inset-x-3 bottom-16 z-[60] mx-auto max-w-3xl rounded-2xl border border-navy/10 bg-white p-4 shadow-2xl shadow-navy/25 lg:bottom-4">
      <p className="text-[13px] leading-relaxed text-navy/80">We use cookies to understand how the site is used and to improve our offers. Essential cookies are always on. <Link to="/cookies" className="font-bold text-teal underline">Cookie policy</Link></p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button onClick={() => pick("essential")} className="btn btn-ghost !py-2">Essential only</button>
        <button onClick={() => pick("all")} className="btn btn-primary !py-2">Accept all</button>
      </div>
    </div>
  );
}
