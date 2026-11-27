import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { LuLayoutDashboard, LuCalendarCheck, LuCreditCard, LuTag, LuNewspaper, LuInbox, LuUsers, LuSettings, LuBell, LuLogOut, LuMenu, LuX, LuExternalLink, LuMail, LuLock, LuEye, LuEyeOff, LuShieldCheck, LuKey } from "react-icons/lu";
import { Link, navigate } from "../router.jsx";
import { useSeo } from "../seo.js";
import Logo from "../components/Logo.jsx";
import { useAdmin, useSession, adminLogin, adminLogout, DEMO_ADMIN } from "./store.js";
import { Overlays, Avatar, Btn } from "./ui.jsx";

const PAGES = {
  "/admin": ["Dashboard", LuLayoutDashboard, lazy(() => import("./pages/Dashboard.jsx"))],
  "/admin/bookings": ["Bookings", LuCalendarCheck, lazy(() => import("./pages/Bookings.jsx"))],
  "/admin/payments": ["Payments", LuCreditCard, lazy(() => import("./pages/Payments.jsx"))],
  "/admin/pricing": ["Pricing & offers", LuTag, lazy(() => import("./pages/Pricing.jsx"))],
  "/admin/posts": ["Posts", LuNewspaper, lazy(() => import("./pages/Posts.jsx"))],
  "/admin/leads": ["Leads", LuInbox, lazy(() => import("./pages/Leads.jsx"))],
  "/admin/customers": ["Customers", LuUsers, lazy(() => import("./pages/Customers.jsx"))],
  "/admin/settings": ["Settings", LuSettings, lazy(() => import("./pages/Settings.jsx"))],
};

function AdminLogin() {
  const [f, setF] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const submit = (e) => { e.preventDefault(); if (!adminLogin(f.email, f.password)) setErr("Wrong email or password"); };
  return (
    <div className="relative isolate grid min-h-screen place-items-center overflow-hidden bg-navy px-4">
      <span aria-hidden className="absolute -left-32 -top-32 -z-10 h-[420px] w-[420px] rounded-full bg-teal/40 blur-3xl" />
      <span aria-hidden className="absolute -bottom-40 -right-24 -z-10 h-[460px] w-[460px] rounded-full bg-sun/25 blur-3xl" />
      <div className="w-full max-w-sm animate-[pop_.4s_ease]">
        <div className="mb-5 flex justify-center"><Logo plate className="h-12" /></div>
        <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-2xl shadow-black/30">
          <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-navy text-white"><LuShieldCheck size={16} /></span><div><h1 className="text-lg font-extrabold leading-tight text-navy">Admin sign in</h1><p className="text-xs text-slate-500">TripNest control panel</p></div></div>
          <div className="mt-5 space-y-3">
            <label className="relative block"><LuMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="email" required autoComplete="username" placeholder="Admin email" value={f.email} onChange={(e) => { setErr(""); setF({ ...f, email: e.target.value }); }} className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-navy outline-none focus:border-teal focus:ring-4 focus:ring-teal/10" /></label>
            <label className="relative block"><LuLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type={show ? "text" : "password"} required autoComplete="current-password" placeholder="Password" value={f.password} onChange={(e) => { setErr(""); setF({ ...f, password: e.target.value }); }} className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-10 text-sm text-navy outline-none focus:border-teal focus:ring-4 focus:ring-teal/10" />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:text-teal">{show ? <LuEyeOff size={16} /> : <LuEye size={16} />}</button></label>
            {err && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">{err}</p>}
            <button className="w-full rounded-lg bg-teal py-2.5 text-sm font-extrabold text-white shadow-lg shadow-teal/30 transition hover:bg-navy">Sign in</button>
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-teal/40 bg-teal/5 p-3 text-xs">
            <p className="flex items-center gap-1.5 font-extrabold text-teal"><LuKey size={13} />Demo credentials</p>
            <p className="mt-1.5 text-slate-600">Email: <b className="select-all text-navy">{DEMO_ADMIN.email}</b></p>
            <p className="text-slate-600">Password: <b className="select-all text-navy">{DEMO_ADMIN.password}</b></p>
            <button type="button" onClick={() => { setErr(""); setF({ email: DEMO_ADMIN.email, password: DEMO_ADMIN.password }); }} className="mt-2 font-extrabold text-teal hover:underline">Fill demo login →</button>
          </div>
        </form>
        <p className="mt-4 text-center text-xs text-white/60"><Link to="/" className="hover:text-white">← Back to website</Link></p>
      </div>
    </div>
  );
}

function Shell({ path, session }) {
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const { payments, leads } = useAdmin();
  const entry = PAGES[path];
  const items = useMemo(() => [
    ...payments.filter((p) => p.status === "Pending").slice(0, 3).map((p) => ({ t: `Pending payment ${p.id}`, s: `${p.customer} · ฿${p.amount.toLocaleString("en-US")}`, to: "/admin/payments" })),
    ...leads.filter((l) => l.status === "New").slice(0, 4).map((l) => ({ t: `New lead: ${l.name}`, s: l.source, to: "/admin/leads" })),
  ], [payments, leads]);
  const badge = { "/admin/payments": payments.filter((p) => p.status === "Pending").length, "/admin/leads": leads.filter((l) => l.status === "New").length };
  useEffect(() => { setOpen(false); setBell(false); }, [path]);

  const nav = (
    <nav className="flex flex-col gap-0.5 px-3 py-3" aria-label="Admin">
      {Object.entries(PAGES).map(([to, [label, I]]) => {
        const on = path === to;
        return (
          <Link key={to} to={to} className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-bold transition ${on ? "bg-white/12 text-white shadow-inner" : "text-white/65 hover:bg-white/8 hover:text-white"}`}>
            <I size={16} className={on ? "text-sun" : ""} />{label}
            {badge[to] > 0 && <span className="ml-auto rounded-full bg-sun px-1.5 text-[10px] font-extrabold text-navy">{badge[to]}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="fixed inset-0 flex bg-[#f1f5f9] text-navy">
      <aside className="hidden w-[218px] shrink-0 flex-col bg-gradient-to-b from-navy to-[#0d1a3d] lg:flex">
        <div className="flex h-14 items-center border-b border-white/10 px-4"><Logo plate className="h-8" /></div>
        <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>
        <div className="m-3 rounded-xl bg-white/8 p-3 text-xs text-white/70"><p className="font-extrabold text-white">Demo mode</p><p className="mt-0.5 leading-snug">Data is stored in this browser only.</p></div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="absolute inset-0 bg-navy/50" />
          <aside className="relative flex h-full w-64 animate-[slidein_.25s_ease] flex-col bg-navy">
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-4"><Logo plate className="h-8" /><button onClick={() => setOpen(false)} aria-label="Close menu" className="text-white/70"><LuX size={20} /></button></div>
            <div className="overflow-y-auto">{nav}</div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 sm:px-5">
          <div className="flex items-center gap-2">
            <button onClick={() => setOpen(true)} aria-label="Open menu" className="grid h-9 w-9 place-items-center rounded-lg text-navy hover:bg-slate-100 lg:hidden"><LuMenu size={20} /></button>
            <h2 className="text-sm font-extrabold">{entry ? entry[0] : "Admin"}</h2>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link to="/" target="_blank" className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-teal sm:flex"><LuExternalLink size={14} />View site</Link>
            <div className="relative">
              <button onClick={() => setBell(!bell)} aria-label="Notifications" className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"><LuBell size={18} />{items.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />}</button>
              {bell && (
                <div className="absolute right-0 top-11 w-72 animate-[pop_.2s_ease] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                  <p className="border-b border-slate-100 px-3 py-2 text-xs font-extrabold">Needs attention</p>
                  {items.length ? items.map((n, i) => <Link key={i} to={n.to} className="block border-b border-slate-50 px-3 py-2 hover:bg-slate-50"><p className="text-xs font-bold">{n.t}</p><p className="text-[11px] text-slate-400">{n.s}</p></Link>) : <p className="px-3 py-5 text-center text-xs text-slate-400">All caught up 🎉</p>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:pl-3">
              <Avatar name={session.name} size={30} />
              <div className="hidden leading-tight sm:block"><p className="text-xs font-extrabold">{session.name}</p><p className="text-[10px] font-semibold text-teal">{session.role}</p></div>
              <button onClick={() => { adminLogout(); }} aria-label="Sign out" title="Sign out" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"><LuLogOut size={16} /></button>
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5" onClick={() => bell && setBell(false)}>
          <Suspense fallback={<div className="grid h-60 place-items-center"><span className="h-8 w-8 animate-spin rounded-full border-4 border-teal/20 border-t-teal" /></div>}>
            {entry ? (() => { const Page = entry[2]; return <Page key={path} />; })() : <div className="py-20 text-center"><p className="text-4xl font-extrabold text-teal">404</p><p className="mt-1 text-sm text-slate-500">That admin page doesn't exist.</p><Btn v="primary" className="mt-4" onClick={() => navigate("/admin")}>Back to dashboard</Btn></div>}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function AdminApp({ path }) {
  useSeo({ title: "Admin | TripNest", noindex: true });
  const session = useSession();
  return (
    <>
      <style>{`@keyframes slidein{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}`}</style>
      {session ? <Shell path={path} session={session} /> : <AdminLogin />}
      <Overlays />
    </>
  );
}
