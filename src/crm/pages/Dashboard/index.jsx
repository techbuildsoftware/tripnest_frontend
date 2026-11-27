import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area, Bar, CartesianGrid, Cell, ComposedChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  ArrowDownRight, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, FilePlus2, MessageSquarePlus,
  PlaneLanding, PlaneTakeoff, BedDouble, LogOut as CheckOutIcon, Users, FileText,
  CheckCircle2, XCircle, Plane, Trophy, MapPin, ArrowRight, Receipt, BarChart3, Briefcase,
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { todayIsoInTimeZone } from '../../lib/date';
import heroImg from '../../assets/thailand_phiphi.jpg';
import phuketImg from '../../assets/thailand_phuket.jpg';
import krabiImg from '../../assets/thailand_krabi.jpg';
import bangkokImg from '../../assets/thailand_bangkok.jpg';
import chiangmaiImg from '../../assets/thailand_chiangmai.jpg';
import samuiImg from '../../assets/thailand_kohsamui.jpg';

/* ───────────────────────── helpers ───────────────────────── */
const NAVY = '#13234f';
const TEAL = '#0e8a85';
const baht = (n) => {
  const v = Number(n || 0);
  if (v >= 10000000) return `฿${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `฿${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `฿${(v / 1000).toFixed(1)}K`;
  return `฿${v.toLocaleString()}`;
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthTitle = (ym) => { const [y, m] = ym.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
const destImage = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('phuket')) return phuketImg;
  if (n.includes('krabi')) return krabiImg;
  if (n.includes('bangkok') || n.includes('pattaya')) return bangkokImg;
  if (n.includes('chiang')) return chiangmaiImg;
  if (n.includes('samui')) return samuiImg;
  if (n.includes('phi')) return heroImg;
  return null;
};
const pctDelta = (cur, prev) => {
  if (!prev) return cur > 0 ? { v: 100, up: true } : null;
  const d = Math.round(((cur - prev) / prev) * 100);
  return { v: Math.abs(d), up: d >= 0 };
};
const EV_COLOR = { arrival: '#0ea5e9', departure: '#7c3aed', checkin: '#10b981', checkout: '#f59e0b' };
const EV_META = {
  arrival: { icon: PlaneLanding, label: 'Arrival', tone: 'bg-sky-100 text-sky-600' },
  departure: { icon: PlaneTakeoff, label: 'Departure', tone: 'bg-violet-100 text-violet-600' },
  checkin: { icon: BedDouble, label: 'Check-in', tone: 'bg-emerald-100 text-emerald-600' },
  checkout: { icon: CheckOutIcon, label: 'Check-out', tone: 'bg-amber-100 text-amber-600' },
};

function useCount(target, ms = 800) {
  const [v, setV] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const to = Number(target) || 0;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, ms]);
  return v;
}
const Count = ({ value, money = false }) => { const v = useCount(value); return <>{money ? baht(v) : v.toLocaleString()}</>; };

const Card = ({ className = '', children, delay = 0 }) => (
  <section
    className={`dz-rise flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(19,35,79,.04),0_10px_26px_-18px_rgba(19,35,79,.22)] ${className}`}
    style={{ animationDelay: `${delay}ms` }}
  >
    {children}
  </section>
);
const CardHead = ({ title, sub, right }) => (
  <header className="flex shrink-0 items-center justify-between gap-2 px-4 pt-3">
    <div className="min-w-0">
      <h3 className="truncate text-[13.5px] font-extrabold tracking-tight text-[#13234f]">{title}</h3>
      {sub && <p className="truncate text-[11px] font-medium text-slate-400">{sub}</p>}
    </div>
    {right}
  </header>
);
const Empty = ({ text }) => (
  <div className="grid flex-1 place-items-center px-4 py-6 text-center text-[12px] font-medium text-slate-400">{text}</div>
);
const SeeAll = ({ onClick, label = 'View all' }) => (
  <button type="button" onClick={onClick} className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-bold text-[#0e8a85] hover:underline">
    {label} <ArrowRight className="h-3 w-3" />
  </button>
);

/* ───────────────────────── KPI tile (compact) ───────────────────────── */
function Kpi({ icon: Icon, label, value, delta, tone, onClick, delay }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className="dz-rise group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-left shadow-[0_6px_18px_-14px_rgba(19,35,79,.4)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-14px_rgba(19,35,79,.45)]"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white shadow-sm" style={{ background: tone }}>
        <Icon className="h-[17px] w-[17px]" strokeWidth={2.3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[20px] font-extrabold leading-none tracking-tight text-[#13234f]"><Count value={value} /></span>
        <span className="mt-1 block truncate text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</span>
      </span>
      {delta && (
        <span className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${delta.up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
          {delta.up ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}{delta.v}%
        </span>
      )}
    </button>
  );
}

/* ───────────────────────── Page ───────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = todayIsoInTimeZone();
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [metric, setMetric] = useState('revenue');
  const [board, setBoard] = useState('agents');
  const [day, setDay] = useState(today);

  useEffect(() => {
    let live = true;
    setError('');
    apiClient.get(`/dashboard?month=${encodeURIComponent(month)}`)
      .then((r) => { if (live) setData(r.data); })
      .catch((e) => { if (live) setError(e.message || 'Unable to load dashboard data.'); });
    return () => { live = false; };
  }, [month]);

  useEffect(() => { setDay(month === today.slice(0, 7) ? today : `${month}-01`); }, [month, today]);

  const d = data || {};
  const s = d.summary || {};
  const monthly = useMemo(() => (d.monthly || []).map((m) => ({ ...m, queries: +m.queries || 0, bookings: +m.bookings || 0, revenue: +m.revenue || 0 })), [d.monthly]);
  const mi = Number(month.slice(5, 7)) - 1;
  const cur = monthly[mi] || {};
  const prev = mi > 0 ? (monthly[mi - 1] || {}) : null;
  const events = d.calendar?.events || [];
  const years = useMemo(() => [...new Set([...(d.availableYears || []).map(String), month.slice(0, 4), today.slice(0, 4)])].sort().reverse(), [d.availableYears, month, today]);

  const shift = (n) => { const [y, m] = month.split('-').map(Number); setMonth(new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7)); };

  /* calendar model */
  const year = Number(month.slice(0, 4));
  const daysInMonth = new Date(year, mi + 1, 0).getDate();
  const firstDow = (new Date(year, mi, 1).getDay() + 6) % 7; // Monday first
  const cells = useMemo(() => {
    const arr = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (arr.length % 7) arr.push(null);
    return arr;
  }, [firstDow, daysInMonth]);
  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach((e) => { (map[e.date] = map[e.date] || []).push(e); });
    return map;
  }, [events]);
  const dayEvents = eventsByDay[day] || [];
  const dayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(`${day}T00:00:00`));

  const arrivalsToday = events.filter((e) => e.date === today && e.type === 'arrival').length;
  const departuresToday = events.filter((e) => e.date === today && e.type === 'departure').length;

  const stateCounts = s.bookingStatusCounts || {};
  const donut = [
    { name: 'Confirmed', value: stateCounts.Confirmed || 0, color: '#0e8a85' },
    { name: 'Upcoming', value: stateCounts.Upcoming || 0, color: '#0ea5e9' },
    { name: 'Traveling', value: stateCounts.Traveling || 0, color: '#7c3aed' },
    { name: 'Completed', value: stateCounts.Completed || 0, color: '#f59e0b' },
    { name: 'Cancelled', value: stateCounts.Cancelled || 0, color: '#f43f5e' },
  ];
  const donutTotal = donut.reduce((a, b) => a + b.value, 0);

  const enquiries = +s.totalQueries || 0;
  const quotes = +s.quotations || 0;
  const confirmed = +s.confirmedBookings || 0;
  const funnel = [
    { label: 'Enquiries', value: enquiries, color: NAVY },
    { label: 'Quotations sent', value: quotes, color: '#0f6f86' },
    { label: 'Confirmed bookings', value: confirmed, color: TEAL },
  ];
  const conv = enquiries ? Math.round((confirmed / enquiries) * 100) : 0;

  const mix = d.revenueBreakdown || [];
  const mixTotal = mix.reduce((a, b) => a + (+b.value || 0), 0);
  const sources = d.leadSources || [];
  const srcTotal = sources.reduce((a, b) => a + (+b.value || 0), 0);

  const boards = {
    agents: { label: 'Agents', rows: d.topAgents || [] },
    hotels: { label: 'Hotels', rows: d.topHotels || [] },
    suppliers: { label: 'Suppliers', rows: d.topSuppliers || [] },
    sightseeing: { label: 'Sightseeing', rows: d.topSightseeing || [] },
    b2c: { label: 'B2C', rows: d.topB2C || [] },
  };
  const boardRows = boards[board].rows.slice(0, 5);
  const boardMax = Math.max(1, ...boardRows.map((r) => +r.revenue || 0));

  const metricCfg = {
    revenue: { label: 'Revenue', key: 'revenue', color: TEAL, fmt: baht },
    bookings: { label: 'Bookings', key: 'bookings', color: '#7c3aed', fmt: (v) => v },
    queries: { label: 'Enquiries', key: 'queries', color: '#0ea5e9', fmt: (v) => v },
  }[metric];

  const first = String(user?.name || 'there').split(' ')[0];
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Bangkok' }).format(new Date()));
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const fullDate = new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());

  const loading = !data && !error;
  const perTraveller = (+s.revenue || 0) / Math.max(1, +s.totalPax || 0);
  const avgBooking = (+s.revenue || 0) / Math.max(1, +s.totalBookings || 0);

  return (
    <div className="dz min-h-full w-full max-w-full overflow-x-clip bg-[#f4f7fb] pb-5">
      <style>{`
        @keyframes dz-rise { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }
        @keyframes dz-grow { from { width: 0 } }
        @keyframes dz-fly { 0% { transform: translateX(-6%); opacity: 0 } 10% { opacity: .8 } 90% { opacity: .8 } 100% { transform: translateX(104%); opacity: 0 } }
        @keyframes dz-kb { from { transform: scale(1.02) } to { transform: scale(1.1) } }
        .dz-rise { opacity: 0; animation: dz-rise .5s cubic-bezier(.2,.7,.2,1) forwards }
        .dz-bar { animation: dz-grow .9s cubic-bezier(.2,.7,.2,1) both }
        .dz-scroll::-webkit-scrollbar { height: 5px; width: 5px } .dz-scroll::-webkit-scrollbar-thumb { background: #d3dce8; border-radius: 6px }
        @media (prefers-reduced-motion: reduce) { .dz *, .dz { animation: none !important } .dz-rise { opacity: 1 } }
      `}</style>

      {/* ═════════ SLIM HERO ═════════ */}
      <div className="relative overflow-hidden bg-[#13234f] text-white">
        <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" style={{ animation: 'dz-kb 20s ease-in-out infinite alternate' }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#13234f] via-[#13234f]/90 to-[#0e8a85]/70" />
        <div className="pointer-events-none absolute left-0 top-1.5 w-full" style={{ animation: 'dz-fly 18s linear infinite' }}>
          <Plane className="h-4 w-4 rotate-45 text-white/60" strokeWidth={1.6} />
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 px-5 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-[18px] font-extrabold leading-tight tracking-tight">{greet}, {first} 👋</h1>
            <p className="truncate text-[12px] font-medium text-white/70">
              {fullDate} · {arrivalsToday + departuresToday > 0
                ? <><b className="text-white">{arrivalsToday}</b> arrival{arrivalsToday === 1 ? '' : 's'} · <b className="text-white">{departuresToday}</b> departure{departuresToday === 1 ? '' : 's'} today</>
                : 'no arrivals or departures today'}
            </p>
          </div>

          <div className="hidden items-center gap-1.5 lg:flex">
            {[
              { l: 'Enquiry', i: MessageSquarePlus, p: '/app/queries/new', primary: true },
              { l: 'Quotation', i: FilePlus2, p: '/app/quotations/new' },
              { l: 'Bookings', i: CalendarDays, p: '/app/bookings' },
              { l: 'Payments', i: Receipt, p: '/app/accounts/invoices-payments' },
              { l: 'Reports', i: BarChart3, p: '/app/reports' },
            ].map((a) => (
              <button
                key={a.l}
                type="button"
                onClick={() => navigate(a.p)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-bold transition hover:-translate-y-0.5 ${a.primary ? 'bg-white text-[#13234f] shadow-md shadow-black/20' : 'border border-white/20 bg-white/10 text-white hover:bg-white/20'}`}
              >
                <a.i className="h-3.5 w-3.5" /> {a.l}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-white/20 bg-white/10 p-0.5">
              <button type="button" onClick={() => shift(-1)} className="grid h-7 w-7 place-items-center rounded-md hover:bg-white/15" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-[78px] text-center text-[12.5px] font-bold">{monthTitle(month)}</span>
              <button type="button" onClick={() => shift(1)} className="grid h-7 w-7 place-items-center rounded-md hover:bg-white/15" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <select
              value={month.slice(0, 4)}
              onChange={(e) => setMonth(`${e.target.value}-${month.slice(5, 7)}`)}
              className="h-8 rounded-lg border border-white/20 bg-white/10 px-2 text-[12.5px] font-bold text-white outline-none"
            >
              {years.map((y) => <option key={y} value={y} className="text-slate-800">{y}</option>)}
            </select>
            <div className="border-l border-white/20 pl-3 text-right">
              <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/60">Revenue</div>
              <div className="text-[22px] font-extrabold leading-none tracking-tight"><Count value={s.revenue} money /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-5 pt-3">
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700">{error}</div>}

        {/* ═════════ KPI STRIP ═════════ */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <Kpi delay={0} icon={Users} label="Enquiries" value={enquiries} tone="linear-gradient(135deg,#13234f,#2a4a9b)" delta={prev ? pctDelta(cur.queries || 0, prev.queries || 0) : null} onClick={() => navigate('/app/queries')} />
          <Kpi delay={40} icon={FileText} label="Quotations" value={quotes} tone="linear-gradient(135deg,#7c3aed,#a855f7)" onClick={() => navigate('/app/quotations')} />
          <Kpi delay={80} icon={CheckCircle2} label="Confirmed" value={confirmed} tone="linear-gradient(135deg,#0e8a85,#22c3a6)" delta={prev ? pctDelta(cur.bookings || 0, prev.bookings || 0) : null} onClick={() => navigate('/app/bookings?status=Confirmed')} />
          <Kpi delay={120} icon={XCircle} label="Lost" value={+s.lostQueries || 0} tone="linear-gradient(135deg,#e11d48,#fb7185)" onClick={() => navigate('/app/queries?status=Lost')} />
          <Kpi delay={160} icon={Briefcase} label="Bookings" value={+s.totalBookings || 0} tone="linear-gradient(135deg,#f59e0b,#fbbf24)" onClick={() => navigate('/app/bookings')} />
          <Kpi delay={200} icon={Users} label="Travellers" value={+s.totalPax || 0} tone="linear-gradient(135deg,#0284c7,#38bdf8)" onClick={() => navigate('/app/bookings')} />
        </div>

        {/* ═════════ ROW 1 · TREND · CALENDAR · DAY AGENDA ═════════ */}
        <div className="grid gap-3 xl:grid-cols-12">
          <Card delay={60} className="xl:col-span-5 xl:h-[292px]">
            <CardHead
              title="Performance trend"
              sub={`Monthly · ${month.slice(0, 4)}`}
              right={(
                <div className="flex rounded-lg bg-slate-100 p-0.5">
                  {[['revenue', 'Revenue'], ['bookings', 'Bookings'], ['queries', 'Enquiries']].map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setMetric(k)} className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${metric === k ? 'bg-white text-[#13234f] shadow-sm' : 'text-slate-500 hover:text-[#13234f]'}`}>{l}</button>
                  ))}
                </div>
              )}
            />
            <div className="h-[230px] px-2 pb-2 pt-1 xl:h-auto xl:min-h-0 xl:flex-1">
              {loading ? <div className="crm-shimmer m-2 h-[90%] rounded-xl" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthly} margin={{ top: 10, right: 10, left: -14, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dzArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={metricCfg.color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={metricCfg.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#e6ecf3" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                    <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => (metric === 'revenue' ? baht(v).replace('฿', '') : v)} />
                    <Tooltip
                      cursor={{ stroke: metricCfg.color, strokeOpacity: 0.25 }}
                      contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 10px 24px -12px rgba(19,35,79,.35)', fontSize: 12 }}
                      formatter={(v) => [metricCfg.fmt(v), metricCfg.label]}
                    />
                    <Bar dataKey={metricCfg.key} barSize={12} radius={[5, 5, 0, 0]} fill={metricCfg.color} fillOpacity={0.2} animationDuration={800} />
                    <Area type="monotone" dataKey={metricCfg.key} stroke={metricCfg.color} strokeWidth={2.5} fill="url(#dzArea)" dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5 }} animationDuration={1000} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* month calendar */}
          <Card delay={100} className="xl:col-span-4 xl:h-[292px]">
            <CardHead
              title={monthTitle(month)}
              sub={`${events.length} movement${events.length === 1 ? '' : 's'} this month`}
              right={(
                <div className="flex items-center gap-2">
                  <div className="hidden items-center gap-2 2xl:flex">
                    {Object.entries(EV_META).map(([k, m]) => (
                      <span key={k} className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400"><i className="h-1.5 w-1.5 rounded-full" style={{ background: EV_COLOR[k] }} />{m.label}</span>
                    ))}
                  </div>
                  <button type="button" onClick={() => { setMonth(today.slice(0, 7)); setDay(today); }} className="rounded-md bg-[#0e8a85]/10 px-2 py-1 text-[10.5px] font-extrabold text-[#0e8a85] hover:bg-[#0e8a85]/20">Today</button>
                </div>
              )}
            />
            <div className="mt-2 grid shrink-0 grid-cols-7 gap-1 px-3">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w, i) => (
                <div key={w} className={`text-center text-[9.5px] font-bold uppercase tracking-wider ${i > 4 ? 'text-rose-400' : 'text-slate-400'}`}>{w}</div>
              ))}
            </div>
            <div className="mt-1 grid min-h-[230px] flex-1 grid-cols-7 gap-1 px-3 pb-3" style={{ gridTemplateRows: `repeat(${cells.length / 7}, minmax(0, 1fr))` }}>
              {cells.map((n, i) => {
                if (!n) return <div key={`b${i}`} className="rounded-lg bg-slate-50/50" />;
                const iso = `${month}-${String(n).padStart(2, '0')}`;
                const evs = eventsByDay[iso] || [];
                const counts = {};
                evs.forEach((e) => { counts[e.type] = (counts[e.type] || 0) + 1; });
                const sel = iso === day;
                const isToday = iso === today;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setDay(iso)}
                    style={!sel && evs.length ? { background: `rgba(14,138,133,${Math.min(0.05 + evs.length * 0.04, 0.2)})` } : undefined}
                    className={`relative flex min-w-0 flex-col justify-between rounded-lg border px-1.5 py-1 text-left transition ${sel ? 'border-transparent bg-gradient-to-br from-[#13234f] to-[#0e8a85] text-white shadow-md shadow-[#0e8a85]/30' : 'border-slate-100 bg-white text-slate-600 hover:border-[#0e8a85]/50'} ${isToday ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
                  >
                    <span className="flex items-center justify-between">
                      <span className={`text-[12px] font-extrabold leading-none ${sel ? 'text-white' : (i % 7 > 4 ? 'text-rose-500' : 'text-[#13234f]')}`}>{n}</span>
                      {evs.length > 0 && <span className={`rounded px-1 text-[9px] font-extrabold leading-[14px] ${sel ? 'bg-white/20 text-white' : 'bg-white text-[#0e8a85] ring-1 ring-[#0e8a85]/20'}`}>{evs.length}</span>}
                    </span>
                    <span className="flex flex-wrap gap-x-1.5 gap-y-0">
                      {Object.entries(counts).map(([t, c]) => (
                        <span key={t} className="inline-flex items-center gap-[2px] text-[9px] font-bold">
                          <i className="h-1.5 w-1.5 rounded-full" style={{ background: sel ? '#fff' : EV_COLOR[t] }} />{c}
                        </span>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* selected day agenda */}
          <Card delay={140} className="xl:col-span-3 xl:h-[292px]">
            <CardHead title={dayLabel} sub={`${dayEvents.length} item${dayEvents.length === 1 ? '' : 's'} scheduled`} right={<SeeAll onClick={() => navigate('/app/bookings')} label="Bookings" />} />
            <div className="dz-scroll mt-2 max-h-[260px] flex-1 space-y-1.5 overflow-y-auto px-3 pb-3 xl:max-h-none xl:min-h-0">
              {dayEvents.length ? dayEvents.map((e) => {
                const m = EV_META[e.type] || EV_META.arrival;
                return (
                  <button key={e.id} type="button" onClick={() => e.bookingId && navigate(`/app/bookings/${e.bookingId}`)} className="group flex w-full items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-left transition hover:border-[#0e8a85]/30 hover:bg-white hover:shadow-sm">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${m.tone}`}><m.icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-bold text-[#13234f]">{e.title}</span>
                      <span className="block truncate text-[11px] text-slate-400">{m.label}{e.detail ? ` · ${e.detail}` : e.client ? ` · ${e.client}` : ''}{e.pax ? ` · ${e.pax} pax` : ''}</span>
                    </span>
                    {e.time && <span className="shrink-0 text-[11px] font-bold text-slate-500">{e.time}</span>}
                  </button>
                );
              }) : (
                <div className="grid h-full min-h-[120px] place-items-center text-center">
                  <div>
                    <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-400"><CalendarDays className="h-5 w-5" /></span>
                    <p className="mt-2 text-[12px] font-medium text-slate-400">Nothing scheduled for this day.</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ═════════ ROW 2 · FUNNEL · STATUS · LEADERBOARD · ENQUIRIES ═════════ */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
          <Card delay={80} className="xl:col-span-3 xl:h-[236px]">
            <CardHead title="Sales funnel" sub="Enquiry to booking" right={<span className="rounded-full bg-[#0e8a85]/10 px-2.5 py-0.5 text-[11px] font-extrabold text-[#0e8a85]">{conv}% win</span>} />
            <div className="flex flex-1 flex-col justify-between px-4 pb-3 pt-2">
              <div className="space-y-2">
                {funnel.map((f, i) => {
                  const w = enquiries ? Math.max(6, Math.round((f.value / enquiries) * 100)) : 6;
                  return (
                    <div key={f.label}>
                      <div className="mb-0.5 flex items-baseline justify-between text-[11.5px]">
                        <span className="font-semibold text-slate-500">{f.label}</span>
                        <b className="text-[#13234f]">{f.value}</b>
                      </div>
                      <div className="h-[18px] overflow-hidden rounded-md bg-slate-100">
                        <div className="dz-bar flex h-full items-center justify-end rounded-md pr-1.5 text-[9.5px] font-bold text-white" style={{ width: `${w}%`, background: `linear-gradient(90deg, ${f.color}, ${f.color}cc)`, animationDelay: `${i * 120}ms` }}>
                          {enquiries ? `${Math.round((f.value / enquiries) * 100)}%` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 px-2.5 py-1.5">
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Avg. booking</div>
                  <div className="text-[15px] font-extrabold text-[#13234f]">{baht(avgBooking)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 px-2.5 py-1.5">
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Per traveller</div>
                  <div className="text-[15px] font-extrabold text-[#13234f]">{baht(perTraveller)}</div>
                </div>
              </div>
            </div>
          </Card>

          <Card delay={120} className="xl:col-span-3 xl:h-[236px]">
            <CardHead title="Booking status" sub="All bookings" />
            <div className="flex flex-1 items-center gap-3 px-4 pb-3">
              <div className="relative h-[118px] w-[118px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutTotal ? donut : [{ name: 'None', value: 1, color: '#e2e8f0' }]} dataKey="value" innerRadius={38} outerRadius={54} paddingAngle={donutTotal ? 3 : 0} cornerRadius={5} stroke="none" startAngle={90} endAngle={-270} animationDuration={800}>
                      {(donutTotal ? donut : [{ color: '#e2e8f0' }]).map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div><div className="text-[20px] font-extrabold leading-none text-[#13234f]">{donutTotal}</div><div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">Total</div></div>
                </div>
              </div>
              <ul className="min-w-0 flex-1 space-y-1.5">
                {donut.map((x) => (
                  <li key={x.name} className="flex items-center gap-2 text-[12px]">
                    <span className="h-2 w-2 rounded-full" style={{ background: x.color }} />
                    <span className="flex-1 truncate font-semibold text-slate-500">{x.name}</span>
                    <b className="text-[#13234f]">{x.value}</b>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card delay={160} className="xl:col-span-3 xl:h-[236px]">
            <CardHead title="Leaderboard" sub="By revenue" right={<Trophy className="h-4 w-4 text-amber-400" />} />
            <div className="dz-scroll mt-2 flex shrink-0 gap-1 overflow-x-auto px-4">
              {Object.entries(boards).map(([k, b]) => (
                <button key={k} type="button" onClick={() => setBoard(k)} className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold transition ${board === k ? 'bg-[#13234f] text-white' : 'bg-slate-100 text-slate-500 hover:text-[#13234f]'}`}>{b.label}</button>
              ))}
            </div>
            <ol key={board} className="flex-1 space-y-1.5 overflow-hidden px-4 pb-3 pt-2.5">
              {boardRows.length ? boardRows.map((r, i) => (
                <li key={r.name} className="flex items-center gap-2">
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10px] font-extrabold ${i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2"><span className="truncate text-[12px] font-bold text-[#13234f]">{r.name}</span><b className="text-[11.5px] text-[#13234f]">{baht(r.revenue)}</b></div>
                    <div className="mt-0.5 h-1 rounded-full bg-slate-100"><div className="dz-bar h-full rounded-full" style={{ width: `${((+r.revenue || 0) / boardMax) * 100}%`, background: `linear-gradient(90deg, ${NAVY}, ${TEAL})`, animationDelay: `${i * 80}ms` }} /></div>
                  </div>
                </li>
              )) : <Empty text="No data for this period." />}
            </ol>
          </Card>

          <Card delay={200} className="xl:col-span-3 xl:h-[236px]">
            <CardHead title="Latest enquiries" sub="Newest first" right={<SeeAll onClick={() => navigate('/app/queries')} />} />
            <ul className="mt-1 flex-1 overflow-hidden px-2 pb-2">
              {(d.recentEnquiries || []).length ? d.recentEnquiries.slice(0, 5).map((q, i) => {
                const st = { New: 'bg-emerald-50 text-emerald-600', Working: 'bg-sky-50 text-sky-600', Quoted: 'bg-violet-50 text-violet-600', Confirmed: 'bg-emerald-50 text-emerald-600', Lost: 'bg-rose-50 text-rose-600' }[q.status] || 'bg-slate-100 text-slate-500';
                return (
                  <li key={q.id || i}>
                    <button type="button" onClick={() => navigate('/app/queries')} className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-50">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10.5px] font-extrabold text-white" style={{ background: q.color || TEAL }}>{q.initials}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold text-[#13234f]">{q.name}</span>
                        <span className="block truncate text-[10.5px] text-slate-400">{q.detail}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${st}`}>{q.status}</span>
                    </button>
                  </li>
                );
              }) : <Empty text="No enquiries yet." />}
            </ul>
          </Card>
        </div>

        {/* ═════════ ROW 3 · MIX · SOURCES · DESTINATIONS ═════════ */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
          <Card delay={60} className="xl:col-span-3">
            <CardHead title="Revenue mix" sub="What customers buy" />
            <div className="px-4 pb-3 pt-2.5">
              {mixTotal ? (
                <>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                    {mix.map((m, i) => <div key={m.name} className="dz-bar h-full" style={{ width: `${((+m.value || 0) / mixTotal) * 100}%`, background: m.color, animationDelay: `${i * 100}ms` }} title={m.name} />)}
                  </div>
                  <ul className="mt-2.5 space-y-1.5">
                    {mix.map((m) => (
                      <li key={m.name} className="flex items-center gap-2 text-[12px]">
                        <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                        <span className="flex-1 truncate font-semibold text-slate-500">{m.name}</span>
                        <span className="text-slate-400">{Math.round(((+m.value || 0) / mixTotal) * 100)}%</span>
                        <b className="w-[56px] text-right text-[#13234f]">{baht(m.value)}</b>
                      </li>
                    ))}
                  </ul>
                </>
              ) : <Empty text="No revenue yet." />}
            </div>
          </Card>

          <Card delay={100} className="xl:col-span-3">
            <CardHead title="Lead sources" sub="Where enquiries come from" />
            <div className="space-y-2 px-4 pb-3 pt-2.5">
              {srcTotal ? sources.slice(0, 5).map((x, i) => {
                const p = Math.round(((+x.value || 0) / srcTotal) * 100);
                return (
                  <div key={x.name}>
                    <div className="mb-0.5 flex justify-between text-[11.5px]"><span className="font-semibold text-slate-500">{x.name}</span><b className="text-[#13234f]">{x.value} <span className="font-medium text-slate-400">· {p}%</span></b></div>
                    <div className="h-1.5 rounded-full bg-slate-100"><div className="dz-bar h-full rounded-full" style={{ width: `${p}%`, background: x.color, animationDelay: `${i * 80}ms` }} /></div>
                  </div>
                );
              }) : <Empty text="No enquiries yet." />}
            </div>
          </Card>

          <Card delay={140} className="md:col-span-2 xl:col-span-6">
            <CardHead title="Popular destinations" sub="Share of bookings" right={<MapPin className="h-4 w-4 text-[#0e8a85]" />} />
            <div className="grid grid-cols-3 gap-2 px-4 pb-3 pt-2.5 sm:grid-cols-6">
              {(d.topDestinations || []).length ? d.topDestinations.slice(0, 6).map((t) => {
                const img = destImage(t.name);
                return (
                  <div key={t.name} className="group relative h-[84px] overflow-hidden rounded-xl" style={{ background: `linear-gradient(135deg, ${NAVY}, ${t.color || TEAL})` }}>
                    {img && <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b1633]/90 via-[#0b1633]/20 to-transparent" />
                    <span className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-px text-[10px] font-extrabold text-[#13234f]">{t.pct}%</span>
                    <div className="absolute bottom-1.5 left-2 right-2 text-white">
                      <div className="truncate text-[11.5px] font-extrabold">{t.name}</div>
                      <div className="text-[9.5px] font-medium text-white/75">{t.bookings} booking{t.bookings === 1 ? '' : 's'}</div>
                    </div>
                  </div>
                );
              }) : <div className="col-span-full"><Empty text="No destination data yet." /></div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
