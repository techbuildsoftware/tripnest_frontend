import { useEffect } from "react";

// Per-page <title>, description, canonical, Open Graph / Twitter tags and JSON-LD structured data.
// Set VITE_SITE_URL in .env (e.g. https://www.tripnest.com) so canonical + og:image are absolute.
const SITE = (import.meta.env.VITE_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
const DEFAULT_TITLE = "TripNest – Thailand tours, flights, hotels & travel packages";
const DEFAULT_DESC = "Flights, hotels, yacht parties, island tours and packages across Thailand — one platform for travellers and travel businesses.";

function meta(attr, key, val) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute("content", val);
}

export function useSeo({ title, description, image, jsonLd, noindex = false } = {}) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : "";
  useEffect(() => {
    const t = title || DEFAULT_TITLE;
    const d = description || DEFAULT_DESC;
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    const url = SITE + path;
    const img = image ? (image.startsWith("http") ? image : SITE + image) : `${SITE}/og-image.png`;

    document.title = t;
    meta("name", "description", d);
    meta("name", "robots", noindex ? "noindex,nofollow" : "index,follow");
    meta("property", "og:title", t);
    meta("property", "og:description", d);
    meta("property", "og:url", url);
    meta("property", "og:image", img);
    meta("name", "twitter:title", t);
    meta("name", "twitter:description", d);
    meta("name", "twitter:image", img);

    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = url;

    let s = document.getElementById("ld-json");
    if (ld) {
      if (!s) { s = document.createElement("script"); s.type = "application/ld+json"; s.id = "ld-json"; document.head.appendChild(s); }
      s.textContent = ld;
    } else if (s) s.remove();
  }, [title, description, image, noindex, ld]);
}

export { SITE };
