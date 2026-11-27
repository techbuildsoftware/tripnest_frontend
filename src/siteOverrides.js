// Applies prices/status edited in the admin panel to the public site's data (runs once, before the first render).
import { PACKAGES, SERVICES } from "./data.js";

try {
  const o = JSON.parse(localStorage.getItem("tripnest_admin_overrides") || "null");
  if (o) {
    for (let i = PACKAGES.length - 1; i >= 0; i--) {
      const p = PACKAGES[i], x = o.packages?.[p.id];
      if (!x) continue;
      if (x.status === "inactive") { PACKAGES.splice(i, 1); continue; }
      Object.assign(p, { price: x.price, was: x.was, off: x.off });
    }
    for (let i = SERVICES.length - 1; i >= 0; i--) {
      const s = SERVICES[i], x = o.services?.[s.id];
      if (!x) continue;
      if (x.status === "inactive") { SERVICES.splice(i, 1); continue; }
      s.from = x.from;
    }
  }
} catch { /* ignore corrupt data */ }
