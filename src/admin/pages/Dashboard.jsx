import { useMemo, useState } from "react";
import { LuWallet, LuCalendarCheck, LuClock, LuInbox, LuReceipt, LuPlus, LuTag, LuNewspaper, LuActivity, LuArrowRight } from "react-icons/lu";
import { Link } from "../../router.jsx";
import { useAdmin, useSession, thb, dShort, METHODS } from "../store.js";
import { Card, Stat, Badge, AreaChart, Donut, HBars, Chips, DataTable, Avatar } from "../ui.jsx";

const DAY = 86400000;
const ago = (s) => { const m = Math.max(1, Math.round((Date.now() - new Date(s)) / 60000)); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };

const greet = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

export default function Dashboard() {
  const session = useSession();
  const first = (session?.name || "Admin").split(" ")[0];
  const { bookings, payments, leads, packages, activity } = useAdmin();
  const [range, setRange] = useState("30 days");
  const n = parseInt(range);

  const m = useMemo(() => {
    const now = Date.now(), t0 = now - n * DAY, t1 = now - 2 * n * DAY;
    const paid = payments.filter((p) => p.status === "Paid");
    const sum = (a, from, to) => a.filter((p) => { const t = +new Date(p.date); return t >= from && t < to; }).reduce((s, p) => s + p.amount, 0);
    const rev = sum(paid, t0, now + 1), revPrev = sum(paid, t1, t0);
    const inP = (a, k, from, to) => a.filter((x) => { const t = +new Date(x[k]); return t >= from && t < to; });
    const bk = inP(bookings, "created", t0, now + 1), bkPrev = inP(bookings, "created", t1, t0);
    const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : a ? 100 : 0);
    const series = Array.from({ length: n }, (_, i) => {
      const start = new Date(now - (n - 1 - i) * DAY); start.setHours(0, 0, 0, 0);
      const v = paid.filter((p) => +new Date(p.date) >= +start && +new Date(p.date) < +start + DAY).reduce((s, p) => s + p.amount, 0);
      return { label: dShort(start), value: v };
    });
    const status = ["Confirmed", "Completed", "Pending", "Cancelled"].map((s, i) => ({ label: s, value: bookings.filter((b) => b.status === s).length, color: ["#0ea5e9", "#10b981", "#f59e0b", "#f43f5e"][i] }));
    const byItem = {}; bookings.filter((b) => b.status !== "Cancelled").forEach((b) => (byItem[b.item] = (byItem[b.item] || 0) + b.amount));
    const top = Object.entries(byItem).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }));
    const byM = {}; paid.forEach((p) => (byM[p.method] = (byM[p.method] || 0) + p.amount));
    const methods = Object.entries(byM).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }));
    const pending = payments.filter((p) => p.status === "Pending");
    return {
      rev, revDelta: pct(rev, revPrev), bk: bk.length, bkDelta: pct(bk.length, bkPrev.length), series, status, top, methods,
      pendingAmt: pending.reduce((s, p) => s + p.amount, 0), pendingN: pending.length, aov: bk.length ? Math.round(bk.reduce((s, b) => s + b.amount, 0) / bk.length) : 0,
      newLeads: leads.filter((l) => l.status === "New").length,
    };
  }, [bookings, payments, leads, n]);

  const cols = [
    { key: "ref", label: "Ref", render: (b) => <span className="font-extrabold text-navy">{b.ref}</span> },
    { key: "customer", label: "Customer", render: (b) => <span className="flex items-center gap-2"><Avatar name={b.customer} size={22} /><span className="truncate font-semibold">{b.customer}</span></span> },
    { key: "item", label: "Trip", render: (b) => <span className="block max-w-[190px] truncate text-slate-500">{b.item}</span> },
    { key: "amount", label: "Amount", align: "right", render: (b) => <span className="font-extrabold">{thb(b.amount)}</span> },
    { key: "status", label: "Status", render: (b) => <Badge>{b.status}</Badge> },
  ];

  return (
    <div className="space-y-2.5">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-navy via-[#173066] to-teal px-4 py-3.5 text-white sm:px-5">
        <span aria-hidden className="absolute -right-10 -top-14 h-40 w-40 rounded-full border border-white/10" /><span aria-hidden className="absolute right-24 -bottom-16 h-36 w-36 rounded-full bg-white/5" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-[17px] font-extrabold leading-tight tracking-tight">{greet()}, {first} 👋</h1><p className="mt-0.5 text-xs text-white/70">{m.pendingN} payments and {m.newLeads} new leads need your attention today.</p></div>
          <div className="flex flex-wrap items-center gap-2">
            {[[LuPlus, "New booking", "/admin/bookings"], [LuTag, "Edit prices", "/admin/pricing"], [LuNewspaper, "New post", "/admin/posts"]].map(([I, l, to]) => (
              <Link key={l} to={to} className="flex items-center gap-1.5 rounded-lg bg-white/12 px-2.5 py-1.5 text-[11.5px] font-semibold backdrop-blur transition hover:bg-white hover:text-navy"><I size={13} />{l}</Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-5">
        <Stat icon={LuWallet} label="Revenue" value={thb(m.rev)} delta={m.revDelta} />
        <Stat icon={LuCalendarCheck} label="Bookings" value={m.bk} delta={m.bkDelta} tone="sky" />
        <Stat icon={LuReceipt} label="Avg. order" value={thb(m.aov)} tone="violet" sub="per booking" />
        <Stat icon={LuClock} label="Pending payments" value={thb(m.pendingAmt)} tone="sun" sub={`${m.pendingN} awaiting`} />
        <Stat icon={LuInbox} label="New leads" value={m.newLeads} tone="rose" sub="need a reply" />
      </div>

      <div className="grid gap-2.5 lg:grid-cols-[1.7fr_1fr]">
        <Card title="Revenue" sub={`Paid payments · last ${range}`} action={<div className="flex items-center gap-3"><span className="text-[13px] font-extrabold text-teal">{thb(m.rev)}</span><Chips options={["7 days", "30 days", "90 days"]} value={range} onChange={setRange} /></div>}>
          <AreaChart data={m.series} fmt={thb} height={190} />
        </Card>
        <Card title="Bookings by status" sub="All time">
          <Donut parts={m.status} center={<div><p className="text-xl font-extrabold leading-none text-navy">{bookings.length}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">total</p></div>} />
        </Card>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-3">
        <Card title="Top trips by sales"><HBars rows={m.top} fmt={thb} /></Card>
        <Card title="Payment methods" sub="Collected amount"><HBars rows={m.methods} fmt={thb} /></Card>
        <Card title="Recent activity" action={<LuActivity size={15} className="text-slate-400" />} pad={false}>
          <ul className="max-h-[200px] divide-y divide-slate-100 overflow-y-auto">
            {activity.slice(0, 8).map((a) => <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-2 text-xs"><span className="font-semibold text-slate-600">{a.text}</span><span className="shrink-0 text-[10.5px] text-slate-400">{ago(a.at)}</span></li>)}
          </ul>
        </Card>
      </div>

      <Card title="Latest bookings" pad={false} action={<Link to="/admin/bookings" className="flex items-center gap-1 text-xs font-bold text-teal hover:gap-1.5">View all <LuArrowRight size={13} /></Link>}>
        <DataTable columns={cols} rows={bookings.slice(0, 6)} size={6} />
      </Card>
    </div>
  );
}
