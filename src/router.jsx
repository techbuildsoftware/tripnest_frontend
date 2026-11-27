import { useEffect, useRef, useState } from "react";

// Tiny dependency-free History API router → clean URLs like /destinations.
// Static hosts need a "serve index.html for every path" rule (see public/_redirects, vercel.json).
const getPath = () => {
  // Upgrade legacy "/#/destinations" links to clean paths.
  const h = window.location.hash;
  if (h.startsWith("#/")) window.history.replaceState(null, "", h.slice(1));
  return window.location.pathname.replace(/\/+$/, "") || "/";
};

export function useRoute() {
  const [path, setPath] = useState(getPath);
  const last = useRef(path);
  useEffect(() => {
    const onChange = () => {
      const next = getPath();
      setPath(next);
      // Scroll to top only on a real page change – not when an in-page #anchor is clicked.
      if (next !== last.current) window.scrollTo({ top: 0, behavior: "instant" });
      last.current = next;
    };
    window.addEventListener("popstate", onChange);
    window.addEventListener("app:navigate", onChange);
    return () => {
      window.removeEventListener("popstate", onChange);
      window.removeEventListener("app:navigate", onChange);
    };
  }, []);
  return path;
}

export const navigate = (to) => {
  if (to !== window.location.pathname) window.history.pushState(null, "", to);
  window.dispatchEvent(new Event("app:navigate"));
};

export function Link({ to, children, onClick, ...props }) {
  const handle = (e) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || props.target === "_blank") return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={handle} {...props}>{children}</a>;
}
