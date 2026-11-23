# TripNest – React + Tailwind website (B2C + B2B)

Run: `npm install && npm run dev` · Build: `npm run build`

- Stack: React 19, Vite, Tailwind CSS v4, react-icons. Tiny built-in History API router (clean URLs like `/destinations`). Production hosts must serve `index.html` for every path — `public/_redirects` (Netlify/Cloudflare) and `vercel.json` are included.
- Colours: `navy` (#13234f) + `teal` (#0e8a85) – edit in `src/index.css` (`@theme`).
- Logo: `src/Assets/Logo` (navbar, login/signup, footer). Favicon + social image: `public/favicon.png`, `public/og-image.png`.
- **Open Graph:** set `VITE_SITE_URL` in `.env` to your live domain (e.g. `https://www.tripnest.com`) before building.
- Photos: `src/images.js`. Beach/Chiang Mai = your photos; the rest are Wikimedia Commons (credit required, see footer) – replace with your own for commercial use.
- Placeholder content to replace: stats, testimonials, prices (฿), packages, partner plans.
- Auth is a front-end demo (localStorage) – wire `src/auth.jsx` to your API.
