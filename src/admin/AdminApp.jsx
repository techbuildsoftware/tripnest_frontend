import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { LuLayoutDashboard, LuCalendarCheck, LuCreditCard, LuTag, LuNewspaper, LuInbox, LuUsers, LuSettings, LuBell, LuLogOut, LuMenu, LuX, LuExternalLink, LuMail, LuLock, LuEye, LuEyeOff, LuShieldCheck, LuKey, LuChevronsLeft, LuChevronsRight } from "react-icons/lu";
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
  const submit = (e) => { e.preventDefault(); if (!adminLogin(f.email, f.password)) setErr("Incorrect email or password"); };
  const inp = "w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-3 text-[13px] text-navy outline-none transition placeholder:text-slate-400 focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10";
  return (
    <div className="relative isolate grid min-h-screen place-items-center overflow-hidden bg-[#0b1736] px-4 py-8">
      <span aria-hidden className="absolute inset-0 -z-10 opacity-[.07]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <span aria-hidden className="absolute -left-40 -top-40 -z-10 h-[480px] w-[480px] rounded-full bg-teal/30 blur-[110px]" />
      <span aria-hidden className="absolute -bottom-48 -right-32 -z-10 h-[460px] w-[460px] rounded-full bg-sun/15 blur-[110px]" />

      <div className="grid w-full max-w-[800px] animate-[pop_.4s_ease] overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/40 ring-1 ring-white/10 md:grid-cols-[.95fr_1.05fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-navy via-[#173066] to-teal p-7 text-white md:flex">
          <span aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/10" /><span aria-hidden className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full border border-white/10" />
          <div className="relative w-fit"><Logo plate className="h-9" /></div>
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-sun">Control panel</p>
            <h2 className="mt-2 text-2xl font-extrabold leading-tight">Run TripNest from one place.</h2>
            <ul className="mt-5 space-y-2.5 text-[13px] font-medium text-white/85">
              {[[LuCalendarCheck, "Bookings & customers"], [LuCreditCard, "Payments, refunds & fees"], [LuTag, "Prices, offers & coupons"]].map(([I, t]) => <li key={t} className="flex items-center gap-2.5"><span className="grid h-7 w-7 place-items-center rounded-lg bg-white/12"><I size={14} /></span>{t}</li>)}
            </ul>
          </div>
          <p className="relative flex items-center gap-1.5 text-[11px] text-white/60"><LuShieldCheck size={13} />Authorised staff only</p>
        </aside>

        <form onSubmit={submit} className="p-7 sm:p-8">
          <Logo className="mb-5 h-9 md:hidden" />
          <h1 className="text-xl font-extrabold text-navy">Welcome back</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">Sign in to your admin account.</p>
          <div className="mt-5 space-y-3">
            <label className="relative block"><span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Email</span><LuMail className="pointer-events-none absolute bottom-[11px] left-3 text-slate-400" size={15} /><input type="email" required autoComplete="username" placeholder="admin@tripnest.com" value={f.email} onChange={(e) => { setErr(""); setF({ ...f, email: e.target.value }); }} className={inp} /></label>
            <label className="relative block"><span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Password</span><LuLock className="pointer-events-none absolute bottom-[11px] left-3 text-slate-400" size={15} /><input type={show ? "text" : "password"} required autoComplete="current-password" placeholder="••••••••" value={f.password} onChange={(e) => { setErr(""); setF({ ...f, password: e.target.value }); }} className={`${inp} !pr-10`} />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute bottom-[5px] right-1.5 grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:text-teal">{show ? <LuEyeOff size={15} /> : <LuEye size={15} />}</button></label>
            {err && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{err}</p>}
            <button className="w-full rounded-lg bg-navy py-2.5 text-[13px] font-extrabold text-white shadow-lg shadow-navy/20 transition hover:bg-teal">Sign in</button>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-[11.5px] text-slate-500">
            <span className="min-w-0"><span className="flex items-center gap-1 font-bold text-navy"><LuKey size={12} className="text-teal" />Demo account</span><span className="block truncate select-all">{DEMO_ADMIN.email} · {DEMO_ADMIN.password}</span></span>
            <button type="button" onClick={() => { setErr(""); setF({ email: DEMO_ADMIN.email, password: DEMO_ADMIN.password }); }} className="shrink-0 rounded-md bg-white px-2.5 py-1.5 font-bold text-teal ring-1 ring-teal/30 transition hover:bg-teal hover:text-white">Autofill</button>
          </div>
          <p className="mt-4 text-center text-xs text-slate-400"><Link to="/" className="font-semibold hover:text-teal">← Back to website</Link></p>
        </form>
      </div>
    </div>
  );
}

const GROUPS = [["Overview", ["/admin"]], ["Sales", ["/admin/bookings", "/admin/payments", "/admin/customers", "/admin/leads"]], ["Catalog", ["/admin/pricing", "/admin/posts"]], ["System", ["/admin/settings"]]];

function Shell({ path, session }) {
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const [mini, setMini] = useState(() => { try { return localStorage.getItem("tripnest_admin_mini") === "1"; } catch { return false; } });
  const toggleMini = () => setMini((m) => { try { localStorage.setItem("tripnest_admin_mini", m ? "0" : "1"); } catch {} return !m; });
  const { payments, leads } = useAdmin();
  const entry = PAGES[path];
  const items = useMemo(() => [
    ...payments.filter((p) => p.status === "Pending").slice(0, 3).map((p) => ({ t: `Pending payment ${p.id}`, s: `${p.customer} · ฿${p.amount.toLocaleString("en-US")}`, to: "/admin/payments" })),
    ...leads.filter((l) => l.status === "New").slice(0, 4).map((l) => ({ t: `New lead: ${l.name}`, s: l.source, to: "/admin/leads" })),
  ], [payments, leads]);
  const badge = { "/admin/payments": payments.filter((p) => p.status === "Pending").length, "/admin/leads": leads.filter((l) => l.status === "New").length };
  useEffect(() => { setOpen(false); setBell(false); }, [path]);

  const nav = (slim) => (
    <nav className="flex flex-col px-2 py-2" aria-label="Admin">
      {GROUPS.map(([g, routes]) => (
        <div key={g} className="mb-1">
          {slim ? <div className="mx-2 my-1.5 h-px bg-white/10 first:hidden" /> : <p className="px-2.5 pb-1 pt-2.5 text-[9.5px] font-bold uppercase tracking-[.14em] text-white/35">{g}</p>}
          {routes.map((to) => {
            const [label, I] = PAGES[to]; const on = path === to;
            return (
              <Link key={to} to={to} title={slim ? label : undefined} className={`relative mb-px flex items-center rounded-md text-[12.5px] font-semibold transition ${slim ? "justify-center py-2" : "gap-2.5 px-2.5 py-[7px]"} ${on ? "bg-white/[.11] text-white" : "text-white/60 hover:bg-white/[.06] hover:text-white"}`}>
                {on && <span className="absolute -left-2 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-sun" />}
                <I size={15} className={on ? "text-sun" : ""} />{!slim && label}
                {badge[to] > 0 && (slim ? <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-sun" /> : <span className="ml-auto rounded-full bg-sun/90 px-1.5 text-[9.5px] font-extrabold leading-4 text-navy">{badge[to]}</span>)}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="fixed inset-0 flex bg-[#f5f7fa] text-[13px] text-navy">
      <aside className={`hidden shrink-0 flex-col bg-[#0f1d45] transition-[width] duration-200 lg:flex ${mini ? "w-[52px]" : "w-[168px]"}`}>
        <div className={`flex h-12 items-center border-b border-white/[.07] ${mini ? "justify-center" : "px-3"}`}>
          {mini ? <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-teal to-sky-500 text-[11px] font-extrabold text-white">TN</span> : <Logo plate className="h-7" />}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{nav(mini)}</div>
        <button onClick={toggleMini} aria-label={mini ? "Expand sidebar" : "Collapse sidebar"} className="flex h-10 items-center justify-center gap-2 border-t border-white/[.07] text-[11px] font-semibold text-white/45 transition hover:text-white">
          {mini ? <LuChevronsRight size={15} /> : <><LuChevronsLeft size={15} />Collapse</>}
        </button>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="absolute inset-0 bg-navy/50" />
          <aside className="relative flex h-full w-56 animate-[slidein_.25s_ease] flex-col bg-[#0f1d45]">
            <div className="flex h-12 items-center justify-between border-b border-white/10 px-3"><Logo plate className="h-7" /><button onClick={() => setOpen(false)} aria-label="Close menu" className="text-white/70"><LuX size={18} /></button></div>
            <div className="overflow-y-auto">{nav(false)}</div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative z-30 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-3 sm:px-5">
          <div className="flex items-center gap-2">
            <button onClick={() => setOpen(true)} aria-label="Open menu" className="grid h-8 w-8 place-items-center rounded-md text-navy hover:bg-slate-100 lg:hidden"><LuMenu size={18} /></button>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">Admin <span>/</span> <span className="font-bold text-navy">{entry ? entry[0] : "Not found"}</span></p>
          </div>
          <div className="flex items-center gap-1">
            <span className="mr-2 hidden text-[11px] font-semibold text-slate-400 md:block">{new Date().toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</span>
            <Link to="/" target="_blank" className="hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-teal sm:flex"><LuExternalLink size={13} />View site</Link>
            <div className="relative">
              <button onClick={() => setBell(!bell)} aria-label="Notifications" className="relative grid h-8 w-8 place-items-center rounded-md text-slate-600 hover:bg-slate-100"><LuBell size={16} />{items.length > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" />}</button>
              {bell && (
                <div className="absolute right-0 top-10 w-72 animate-[pop_.2s_ease] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                  <p className="border-b border-slate-100 px-3 py-2 text-xs font-extrabold">Needs attention</p>
                  {items.length ? items.map((n, i) => <Link key={i} to={n.to} className="block border-b border-slate-50 px-3 py-2 hover:bg-slate-50"><p className="text-xs font-bold">{n.t}</p><p className="text-[11px] text-slate-400">{n.s}</p></Link>) : <p className="px-3 py-5 text-center text-xs text-slate-400">All caught up 🎉</p>}
                </div>
              )}
            </div>
            <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-3">
              <Avatar name={session.name} size={26} />
              <div className="hidden leading-tight sm:block"><p className="text-xs font-bold">{session.name}</p><p className="text-[10px] font-semibold text-teal">{session.role}</p></div>
              <button onClick={adminLogout} aria-label="Sign out" title="Sign out" className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"><LuLogOut size={15} /></button>
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4" onClick={() => bell && setBell(false)}>
          <div className="mx-auto max-w-[1500px]">
            <Suspense fallback={<div className="grid h-60 place-items-center"><span className="h-7 w-7 animate-spin rounded-full border-[3px] border-teal/20 border-t-teal" /></div>}>
              {entry ? (() => { const Page = entry[2]; return <Page key={path} />; })() : <div className="py-20 text-center"><p className="text-4xl font-extrabold text-teal">404</p><p className="mt-1 text-sm text-slate-500">That admin page doesn't exist.</p><Btn v="primary" className="mt-4" onClick={() => navigate("/admin")}>Back to dashboard</Btn></div>}
            </Suspense>
          </div>
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
