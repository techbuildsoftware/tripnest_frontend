import { useEffect, useMemo, useState, useId } from "react";
import { LuX, LuChevronLeft, LuChevronRight, LuSearch, LuTrendingUp, LuTrendingDown, LuInbox } from "react-icons/lu";

/* ───────── tones / badges ───────── */
const TONES = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", amber: "bg-amber-50 text-amber-700 ring-amber-600/20", red: "bg-rose-50 text-rose-700 ring-rose-600/15",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/15", teal: "bg-teal/10 text-teal ring-teal/20", slate: "bg-slate-100 text-slate-600 ring-slate-500/15", violet: "bg-violet-50 text-violet-700 ring-violet-600/15",
};
export const STATUS_TONE = {
  Confirmed: "blue", Completed: "green", Pending: "amber", Cancelled: "red", Paid: "green", Failed: "red", Refunded: "violet",
  New: "blue", Contacted: "amber", Won: "green", Lost: "slate", Published: "green", Draft: "slate", active: "green", inactive: "slate",
  Blog: "violet", Offer: "amber", Announcement: "blue", Traveller: "teal", Business: "violet",
};
export const Badge = ({ children, tone }) => (
  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10.5px] font-bold ring-1 ring-inset ${TONES[tone || STATUS_TONE[children] || "slate"]}`}>{children}</span>
);

/* ───────── buttons / fields ───────── */
const BTN = {
  primary: "bg-teal text-white hover:bg-navy shadow-sm shadow-teal/20", navy: "bg-navy text-white hover:bg-teal", ghost: "border border-slate-200 bg-white text-navy hover:border-teal hover:text-teal",
  danger: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50", sun: "bg-sun text-navy hover:brightness-105", soft: "bg-slate-100 text-navy hover:bg-slate-200",
};
export const Btn = ({ v = "ghost", sm, className = "", ...p }) => (
  <button type="button" {...p} className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-bold transition disabled:opacity-50 ${sm ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-2 text-xs"} ${BTN[v]} ${className}`} />
);
export const IconBtn = ({ className = "", ...p }) => <button type="button" {...p} className={`grid h-7 w-7 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-teal ${className}`} />;

const inp = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy outline-none transition placeholder:text-slate-400 focus:border-teal focus:ring-4 focus:ring-teal/10";
export const Field = ({ label, hint, className = "", children }) => (
  <label className={`block ${className}`}><span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>{children}{hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}</label>
);
export const Input = (p) => <input {...p} className={`${inp} ${p.className || ""}`} />;
export const Textarea = (p) => <textarea rows={4} {...p} className={`${inp} ${p.className || ""}`} />;
export const Select = ({ children, ...p }) => <select {...p} className={`${inp} cursor-pointer ${p.className || ""}`}>{children}</select>;
export function Toggle({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? "bg-teal" : "bg-slate-300"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}
export function SearchBox({ value, onChange, placeholder = "Search…", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <LuSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={`${inp} !py-1.5 !pl-8 !text-xs`} />
    </div>
  );
}
export function Chips({ options, value, onChange, counts }) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${value === o ? "bg-navy text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-teal hover:ring-teal/40"}`}>
          {o}{counts && <span className={`rounded-full px-1.5 text-[10px] ${value === o ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{counts[o] ?? 0}</span>}
        </button>
      ))}
    </div>
  );
}

/* ───────── layout blocks ───────── */
export const Card = ({ title, sub, action, children, className = "", pad = true }) => (
  <section className={`rounded-xl border border-slate-300/70 bg-white shadow-[0_1px_2px_rgba(19,35,79,.03)] ${className}`}>
    {(title || action) && (
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2">
        <div className="min-w-0"><h3 className="truncate text-[12.5px] font-bold text-navy">{title}</h3>{sub && <p className="truncate text-[11px] text-slate-400">{sub}</p>}</div>
        {action}
      </header>
    )}
    <div className={pad ? "p-4" : ""}>{children}</div>
  </section>
);
export const PageHead = ({ title, sub, children }) => (
  <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
    <div><h1 className="text-[17px] font-extrabold leading-tight tracking-tight text-navy">{title}</h1>{sub && <p className="text-xs text-slate-500">{sub}</p>}</div>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
);
export function Stat({ icon: I, label, value, delta, tone = "teal", sub }) {
  const tones = { teal: "bg-teal/10 text-teal", navy: "bg-navy/10 text-navy", sun: "bg-amber-100 text-amber-600", violet: "bg-violet-100 text-violet-600", rose: "bg-rose-100 text-rose-600", sky: "bg-sky-100 text-sky-600" };
  const up = delta >= 0;
  return (
    <div className="rounded-xl border border-slate-300/70 bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(19,35,79,.03)] transition hover:border-teal/30">
      <div className="flex items-center gap-2">
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${tones[tone]}`}><I size={13} /></span>
        <p className="truncate text-[11px] font-semibold text-slate-500">{label}</p>
        {delta !== undefined && <span className={`ml-auto flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${up ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>{up ? <LuTrendingUp size={10} /> : <LuTrendingDown size={10} />}{Math.abs(delta)}%</span>}
      </div>
      <p className="mt-2 truncate text-[21px] font-extrabold leading-none tracking-tight text-navy">{value}</p>
      <p className="mt-1 truncate text-[10.5px] text-slate-400">{sub || (delta !== undefined ? "vs previous period" : "")}</p>
    </div>
  );
}

/* ───────── modal / drawer ───────── */
export function Modal({ title, sub, onClose, children, footer, wide, side }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k); document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div className={`fixed inset-0 z-[90] flex bg-navy/50 backdrop-blur-[2px] ${side ? "justify-end" : "items-center justify-center p-3"}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={title}>
      <div className={`flex max-h-full w-full flex-col bg-white shadow-2xl ${side ? "h-full max-w-md animate-[slidein_.25s_ease]" : `${wide ? "max-w-2xl" : "max-w-md"} animate-[pop_.25s_ease] rounded-2xl`}`}>
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div><h2 className="text-sm font-extrabold text-navy">{title}</h2>{sub && <p className="text-xs text-slate-500">{sub}</p>}</div>
          <IconBtn onClick={onClose} aria-label="Close"><LuX size={16} /></IconBtn>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

/* ───────── confirm + toast (imperative) ───────── */
const bus = new EventTarget();
export const ask = (message, okLabel = "Delete") => new Promise((res) => bus.dispatchEvent(new CustomEvent("ask", { detail: { message, okLabel, res } })));
export const toast = (message, tone = "ok") => bus.dispatchEvent(new CustomEvent("toast", { detail: { message, tone, id: Math.random() } }));
export function Overlays() {
  const [q, setQ] = useState(null);
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const a = (e) => setQ(e.detail);
    const t = (e) => { setToasts((x) => [...x, e.detail]); setTimeout(() => setToasts((x) => x.filter((y) => y.id !== e.detail.id)), 2600); };
    bus.addEventListener("ask", a); bus.addEventListener("toast", t);
    return () => { bus.removeEventListener("ask", a); bus.removeEventListener("toast", t); };
  }, []);
  const done = (v) => { q.res(v); setQ(null); };
  return (
    <>
      {q && (
        <Modal title="Are you sure?" onClose={() => done(false)} footer={<><Btn onClick={() => done(false)}>Cancel</Btn><Btn v="danger" className="!bg-rose-600 !text-white hover:!bg-rose-700" onClick={() => done(true)}>{q.okLabel}</Btn></>}>
          <p className="text-sm text-slate-600">{q.message}</p>
        </Modal>
      )}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[110] flex flex-col gap-2">
        {toasts.map((t) => <div key={t.id} className={`animate-[pop_.25s_ease] rounded-lg px-3.5 py-2 text-xs font-bold text-white shadow-xl ${t.tone === "err" ? "bg-rose-600" : "bg-navy"}`}>{t.message}</div>)}
      </div>
    </>
  );
}

/* ───────── data table ───────── */
export function usePaged(rows, size = 10) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(page, pages - 1);
  useEffect(() => { if (page > pages - 1) setPage(0); }, [rows.length]); // eslint-disable-line
  return { page: p, pages, setPage, slice: useMemo(() => rows.slice(p * size, p * size + size), [rows, p, size]), total: rows.length, size };
}
export function Pager({ pg }) {
  if (pg.total <= pg.size) return <p className="px-4 py-2 text-[11px] text-slate-400">{pg.total} record{pg.total === 1 ? "" : "s"}</p>;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
      <span>{pg.page * pg.size + 1}–{Math.min(pg.total, (pg.page + 1) * pg.size)} of {pg.total}</span>
      <div className="flex items-center gap-1">
        <IconBtn disabled={pg.page === 0} onClick={() => pg.setPage(pg.page - 1)} aria-label="Previous page"><LuChevronLeft size={15} /></IconBtn>
        <span className="px-1 font-bold text-navy">{pg.page + 1} / {pg.pages}</span>
        <IconBtn disabled={pg.page >= pg.pages - 1} onClick={() => pg.setPage(pg.page + 1)} aria-label="Next page"><LuChevronRight size={15} /></IconBtn>
      </div>
    </div>
  );
}
/** columns: [{ key, label, render?(row), align?, w?, cls? }] */
export function DataTable({ columns, rows, onRow, empty = "Nothing here yet", size = 10 }) {
  const pg = usePaged(rows, size);
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-[12px]">
          <thead>
            <tr className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {columns.map((c) => <th key={c.key} style={{ width: c.w }} className={`whitespace-nowrap px-3 py-[7px] first:pl-4 last:pr-4 ${c.align === "right" ? "text-right" : ""}`}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pg.slice.map((r, i) => (
              <tr key={r.id || r.ref || r.code || i} onClick={onRow ? () => onRow(r) : undefined} className={`transition hover:bg-teal/[.04] ${onRow ? "cursor-pointer" : ""}`}>
                {columns.map((c) => <td key={c.key} className={`px-3 py-[7px] first:pl-4 last:pr-4 ${c.align === "right" ? "text-right" : ""} ${c.cls || ""}`}>{c.render ? c.render(r) : r[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="grid place-items-center gap-1 py-10 text-slate-400"><LuInbox size={26} /><p className="text-xs font-semibold">{empty}</p></div>}
      </div>
      <Pager pg={pg} />
    </div>
  );
}

/* ───────── charts (pure SVG) ───────── */
export function Spark({ data, color = "#0e8a85" }) {
  const id = useId();
  if (!data?.length) return null;
  const max = Math.max(...data), min = Math.min(...data), w = 100, h = 32;
  const pts = data.map((v, i) => [(i / (data.length - 1 || 1)) * w, h - 3 - ((v - min) / (max - min || 1)) * (h - 8)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full">
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".25" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} /><path d={d} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
export function AreaChart({ data, height = 210, fmt = (v) => v }) {
  const id = useId();
  const [hover, setHover] = useState(null);
  const W = 600, H = height, P = { l: 44, r: 10, t: 12, b: 22 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = Math.ceil(max / 4 / 10 ** Math.floor(Math.log10(max / 4 || 1))) * 10 ** Math.floor(Math.log10(max / 4 || 1)) * 4 || 1;
  const x = (i) => P.l + (i / (data.length - 1 || 1)) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - v / nice) * (H - P.t - P.b);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const ticks = [0, 1, 2, 3, 4].map((i) => (nice / 4) * i);
  const step = Math.ceil(data.length / 7);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; setHover(Math.max(0, Math.min(data.length - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (data.length - 1))))); }}>
        <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#0e8a85" stopOpacity=".28" /><stop offset="1" stopColor="#0e8a85" stopOpacity="0" /></linearGradient></defs>
        {ticks.map((t) => <g key={t}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray="3 3" /><text x={P.l - 6} y={y(t) + 3} textAnchor="end" fontSize="9.5" fill="#94a3b8">{t >= 1000 ? `${Math.round(t / 1000)}k` : t}</text></g>)}
        {data.map((d, i) => i % step === 0 && <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9.5" fill="#94a3b8">{d.label}</text>)}
        <path d={`${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke="#0e8a85" strokeWidth="2.2" strokeLinejoin="round" />
        {hover !== null && <g><line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="#13234f" strokeOpacity=".2" /><circle cx={x(hover)} cy={y(data[hover].value)} r="4" fill="#fff" stroke="#0e8a85" strokeWidth="2.2" /></g>}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-1 rounded-md bg-navy px-2 py-1 text-[11px] font-bold text-white shadow-lg" style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > data.length * 0.7 ? "-105%" : "8px"})` }}>
          {data[hover].label}: {fmt(data[hover].value)}
        </div>
      )}
    </div>
  );
}
export function Donut({ parts, size = 120, center }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  let acc = 0; const r = 42, c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="-rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="14" />
          {parts.map((p) => { const len = (p.value / total) * c; const el = <circle key={p.label} cx="50" cy="50" r={r} fill="none" stroke={p.color} strokeWidth="14" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} />; acc += len; return el; })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">{center}</div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: p.color }} /><span className="truncate font-semibold text-slate-600">{p.label}</span></span>
            <span className="font-extrabold text-navy">{p.value}<span className="ml-1 font-semibold text-slate-400">{Math.round((p.value / total) * 100)}%</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
export function HBars({ rows, fmt = (v) => v }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between gap-2 text-xs"><span className="truncate font-semibold text-slate-600">{r.label}</span><span className="font-extrabold text-navy">{fmt(r.value)}</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-teal to-sky-500" style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

/* ───────── misc ───────── */
export function exportCsv(name, rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
}
export const Avatar = ({ name, size = 28 }) => {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return <span className="grid shrink-0 place-items-center rounded-full font-extrabold text-white" style={{ width: size, height: size, fontSize: size * 0.4, background: `hsl(${hue} 55% 42%)` }}>{name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>;
};
export const Progress = ({ value, max }) => {
  const p = Math.min(100, Math.round((value / (max || 1)) * 100));
  return <div className="flex items-center gap-1.5"><div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${p >= 100 ? "bg-emerald-500" : p > 0 ? "bg-amber-400" : "bg-slate-200"}`} style={{ width: `${p}%` }} /></div><span className="text-[10.5px] font-bold text-slate-500">{p}%</span></div>;
};
