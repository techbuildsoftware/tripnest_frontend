# TripNest – React + Tailwind website (B2C + B2B)   

Run: `npm install && npm run dev` · Build: `npm run build`

- Stack: React 19, Vite, Tailwind CSS v4, react-icons. Tiny built-in History API router (clean URLs like `/destinations`). Production hosts must serve `index.html` for every path — `public/_redirects` (Netlify/Cloudflare) and `vercel.json` are included.
- Colours: `navy` (#13234f) + `teal` (#0e8a85) – edit in `src/index.css` (`@theme`).
- Logo: `src/Assets/Logo` (navbar, login/signup, footer). Favicon + social image: `public/favicon.png`, `public/og-image.png`.
- **Open Graph:** set `VITE_SITE_URL` in `.env` to your live domain (e.g. `https://www.tripnest.com`) before building.
- Photos: `src/images.js`. Beach/Chiang Mai = your photos; the rest are Wikimedia Commons (credit required, see footer) – replace with your own for commercial use.
- Placeholder content to replace: stats, testimonials, prices (฿), packages, partner plans.
- Auth is a front-end demo (localStorage) – wire `src/auth.jsx` to your API.

## Launch checklist (no backend needed)
1. Copy `.env.example` → `.env`; set `VITE_SITE_URL`, `VITE_FORM_ENDPOINT` (leads), `VITE_GA_ID` / `VITE_META_PIXEL_ID` (optional). `npm run build` also regenerates `public/sitemap.xml` + `robots.txt`.
2. Fill `src/siteConfig.js` (company address, registration + tourism licence numbers, FAQs). Have a lawyer review the Privacy / Terms / Cookies templates, then set `LEGAL_REVIEWED = true`.
3. Replace placeholder prices, ratings, review counts, stats, testimonials and offers with real data; confirm the payment-method chips in the footer; update currency rates in `src/currency.js` (indicative only).
4. Submit the sitemap in Google Search Console; create a Google Business Profile; connect social accounts.
5. Auth is still a front-end demo (localStorage) and the site is a client-rendered SPA – add a real backend and, for better SEO, pre-rendering (e.g. Next.js / vite-plugin-ssg) later.
## CRM (TripNest demo) – `/crm`
The full B2B travel CRM lives in `src/crm` (separate entry `crm.html`, own Tailwind config, router basename `/crm`). **No backend**: an in-browser mock server (`src/crm/lib/demo`) stores everything in IndexedDB, seeded with dummy data.
- Open `http://localhost:5173/crm/login` (after `npm install && npm run dev`). Old `/admin` redirects here.
- Staff login: `admin@tripnest.com` / `Admin@123` · Agent login: `AGENT-AGT-2026-001` / `Agent@123` (pre-filled on the login page).
- Reset data: Settings → Reset demo data, or run `__resetDemoData()` in the browser console.
