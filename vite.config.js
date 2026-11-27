import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

// Serve the CRM (a second HTML entry) for every /crm/* URL so deep links and refresh work.
const crmFallback = () => {
  const mw = (req, _res, next) => {
    const url = req.url || "";
    if (/^\/crm(\/|\?|$)/.test(url) && !/\.[a-z0-9]+(\?|$)/i.test(url.split("?")[0])) req.url = "/crm.html";
    next();
  };
  return {
    name: "crm-fallback",
    configureServer(s) { s.middlewares.use(mw); },
    configurePreviewServer(s) { s.middlewares.use(mw); },
  };
};

export default defineConfig({
  plugins: [react(), tailwindcss(), crmFallback()],
  build: {
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, "index.html"), crm: resolve(import.meta.dirname, "crm.html") },
    },
  },
});
