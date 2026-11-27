import { useSyncExternalStore } from "react";
import { LuHeart } from "react-icons/lu";

// Saved trips ("pkg:3", "dest:phuket") – kept in this browser's localStorage.
const KEY = "tripnest_wishlist";
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
let items = read();
const subs = new Set();
const emit = () => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {} subs.forEach((f) => f()); };

export const toggleWish = (id) => { items = items.includes(id) ? items.filter((x) => x !== id) : [...items, id]; emit(); };

export function useWishlist() {
  const list = useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => items);
  return { items: list, count: list.length, has: (id) => list.includes(id), toggle: toggleWish };
}

/** Heart toggle for cards. Safe to place inside <Link> – it stops the click from navigating. */
export function HeartButton({ id, className = "", size = 16 }) {
  const { has, toggle } = useWishlist();
  const on = has(id);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Remove from saved trips" : "Save this trip"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(id); }}
      className={`grid h-8 w-8 place-items-center rounded-full bg-white/90 text-navy shadow transition hover:scale-110 ${on ? "!text-rose-500" : ""} ${className}`}
    >
      <LuHeart size={size} fill={on ? "currentColor" : "none"} />
    </button>
  );
}
