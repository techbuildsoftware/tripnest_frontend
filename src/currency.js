import { useSyncExternalStore } from "react";

// Display-only currency switcher. Base prices are in THB.
// ⚠ Rates are INDICATIVE placeholders – update them (or wire a rates API later). Final prices are confirmed in the quote.
export const CURRENCIES = {
  THB: { sym: "฿", rate: 1, label: "THB ฿", locale: "en-US" },
  INR: { sym: "₹", rate: 2.65, label: "INR ₹", locale: "en-IN" },
  USD: { sym: "$", rate: 0.031, label: "USD $", locale: "en-US" },
};

const KEY = "tripnest_currency";
let cur = (() => { try { return localStorage.getItem(KEY); } catch { return null; } })();
if (!CURRENCIES[cur]) cur = "THB";
const subs = new Set();

export const getCurrency = () => cur;
export function setCurrency(c) {
  if (!CURRENCIES[c] || c === cur) return;
  cur = c;
  try { localStorage.setItem(KEY, c); } catch {}
  subs.forEach((f) => f());
}
/** Call once near the app root so the whole tree re-renders when the currency changes. */
export const useCurrency = () => useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, getCurrency);

/** money(8500) → "฿8,500"  (or "≈₹22,530" / "≈$264" when another currency is selected) */
export function money(n) {
  const c = CURRENCIES[cur];
  let v = Math.round(n * c.rate);
  if (cur !== "THB" && v >= 1000) v = Math.round(v / 10) * 10;
  return (cur === "THB" ? "" : "≈") + c.sym + v.toLocaleString(c.locale);
}

/** Converts every "฿1,234" inside a text string (used for budget ranges etc.). */
export function convertText(str) {
  if (cur === "THB" || typeof str !== "string") return str;
  return str.replace(/฿\s?([\d,]+)/g, (_, d) => money(Number(d.replace(/,/g, ""))));
}
