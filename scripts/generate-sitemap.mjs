// Runs automatically before `npm run build` (see "prebuild"). Writes public/sitemap.xml and public/robots.txt
// using VITE_SITE_URL (env var or .env file). Destination pages are read from src/destinationData.js.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

let site = process.env.VITE_SITE_URL;
if (!site && existsSync(".env")) {
  const m = readFileSync(".env", "utf8").match(/^\s*VITE_SITE_URL\s*=\s*(.+)\s*$/m);
  if (m) site = m[1].trim().replace(/^["']|["']$/g, "");
}
site = (site || "https://www.tripnest.com").replace(/\/+$/, "");
if (!process.env.VITE_SITE_URL && site === "https://www.tripnest.com") console.warn("⚠ VITE_SITE_URL not set – sitemap uses placeholder https://www.tripnest.com");

const src = readFileSync("src/destinationData.js", "utf8");
const ids = [...src.matchAll(/^ {2}([a-z][a-z0-9]*)\s*:\s*\{/gm)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i);
const pages = ["", "/destinations", "/services", "/business", "/about", "/contact", "/privacy", "/terms", "/cookies", ...ids.map((i) => `/destinations/${i}`)];
const today = new Date().toISOString().slice(0, 10);
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${site}${p || "/"}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`;
writeFileSync("public/sitemap.xml", xml);
writeFileSync("public/robots.txt", `User-agent: *\nAllow: /\nDisallow: /login\nDisallow: /signup\nDisallow: /admin\n\nSitemap: ${site}/sitemap.xml\n`);
console.log(`sitemap.xml: ${pages.length} URLs for ${site}`);
