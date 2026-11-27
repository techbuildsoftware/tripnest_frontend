import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, ArrowLeft, Users, UserCog,
  Plane, MapPin, CheckCircle2, Wallet, Send, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo-color.png';
import phiphi from '../../assets/thailand_phiphi.jpg';
import phuket from '../../assets/thailand_phuket.jpg';
import krabi from '../../assets/thailand_krabi.jpg';
import bangkok from '../../assets/thailand_bangkok.jpg';
import chiangmai from '../../assets/thailand_chiangmai.jpg';
import kohsamui from '../../assets/thailand_kohsamui.jpg';

// Remote photos are Wikimedia Commons files (same ones the TripNest site uses).
// They are preloaded; any that fail to load are simply skipped.
const commons = (file, w = 1800) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, '_'))}?width=${w}`;

const ALL_SLIDES = [
  { img: phiphi, name: 'Phi Phi Islands', tag: 'Island hopping & snorkelling', kind: 'Beach' },
  { img: commons('Pattaya, Thailand Skyline.jpg'), name: 'Pattaya', tag: 'Bay skyline, beaches & nightlife', kind: 'City' },
  { img: commons('Wat arun at night in Bangkok, Thailand.jpg'), name: 'Wat Arun, Bangkok', tag: 'Temple of Dawn on the river', kind: 'Culture' },
  { img: commons('The Sancturay of Truth, Pattaya, Thailand.JPG'), name: 'Sanctuary of Truth', tag: 'Hand-carved Thai wooden temple, Pattaya', kind: 'Culture' },
  { img: phuket, name: 'Phuket', tag: 'Beaches, yachts & sunsets', kind: 'Beach' },
  { img: commons('Wat Phra That Doi Suthep - Chiang Mai.jpg'), name: 'Doi Suthep, Chiang Mai', tag: 'Golden mountain temple', kind: 'Culture' },
  { img: commons('Grand Palace Bangkok, Thailand.jpg'), name: 'Grand Palace, Bangkok', tag: 'Royal architecture & Emerald Buddha', kind: 'Culture' },
  { img: krabi, name: 'Krabi', tag: 'Cliffs, lagoons & long-tails', kind: 'Beach' },
  { img: commons('Damnoen Saduak Floating Market (7974794375).jpg'), name: 'Floating Market', tag: 'Canal vendors & Thai street food', kind: 'Culture' },
  { img: commons('Wat Plai Laem.jpg'), name: 'Wat Plai Laem, Koh Samui', tag: 'Lakeside temple of Guanyin', kind: 'Culture' },
  { img: commons('The Big Buddha, Phuket.jpg'), name: 'Big Buddha, Phuket', tag: 'Hilltop landmark with island views', kind: 'Culture' },
  { img: bangkok, name: 'Bangkok', tag: 'Temples, food & city lights', kind: 'City' },
];
const REMOTE = ALL_SLIDES.filter((x) => x.img.startsWith('http'));

const FEED = [
  { icon: CheckCircle2, tone: 'from-emerald-400 to-teal-500', title: 'Booking confirmed', sub: 'Phuket · 5N/6D · 4 pax' },
  { icon: Send, tone: 'from-sky-400 to-cyan-500', title: 'Quotation sent', sub: 'Bangkok + Pattaya · ฿86,400' },
  { icon: Wallet, tone: 'from-amber-400 to-orange-500', title: 'Payment received', sub: 'Krabi group · ฿1,24,000' },
];

function useCountUp(target, ms = 1600) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf; const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function Stat({ value, suffix, label }) {
  const n = useCountUp(value);
  return (
    <div>
      <div className="text-[28px] font-extrabold leading-none text-white">{n.toLocaleString()}{suffix}</div>
      <div className="mt-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/60">{label}</div>
    </div>
  );
}

const DESIGN_W = 1500;
const DESIGN_H = 820;

// Keeps the login page looking identical at any browser zoom / window size:
// the page is laid out on a fixed design canvas and scaled to fit the viewport.
function useStage() {
  const read = () => ({ w: window.innerWidth, h: window.innerHeight, mobile: window.screen.width < 768 });
  const [d, setD] = useState(read);
  useEffect(() => {
    const on = () => setD(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const scale = Math.min(d.w / DESIGN_W, d.h / DESIGN_H);
  return { scale, w: d.w / scale, h: d.h / scale, mobile: d.mobile };
}

export default function Login() {
  const stage = useStage();
  const { login, user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState('staff');
  const [loaded, setLoaded] = useState(() => new Set());
  const [idx, setIdx] = useState(0);
  const [prev, setPrev] = useState(-1);

  // preload remote photos, keep only the ones that actually load
  useEffect(() => {
    let dead = false;
    REMOTE.forEach((r) => {
      const im = new Image();
      im.onload = () => { if (!dead) setLoaded((p) => new Set(p).add(r.img)); };
      im.src = r.img;
    });
    return () => { dead = true; };
  }, []);
  const slides = ALL_SLIDES.filter((x) => !x.img.startsWith('http') || loaded.has(x.img));
  const slide = idx % slides.length;
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => { setPrev(i % slides.length); return i + 1; }), 5800);
    return () => clearInterval(id);
  }, [slides.length]);

  // Demo build: credentials are fixed.
  const DEMO_CREDENTIALS = {
    staff: { identifier: 'admin@tripnest.com', password: 'Admin@123' },
    agent: { identifier: 'AGENT-AGT-2026-001', password: 'Agent@123' },
  };
  const { identifier, password } = DEMO_CREDENTIALS[role];

  if (!loading && isAuthenticated) return <Navigate to={user?.role === 'Agent' ? '/app/queries' : '/app/dashboard'} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const loggedInUser = await login(identifier, password);
      toast.success('Welcome back!');
      const savedPath = sessionStorage.getItem('buildsoftware_post_login_path');
      sessionStorage.removeItem('buildsoftware_post_login_path');
      navigate(
        savedPath && savedPath.startsWith('/')
          ? savedPath
          : (location.state?.from?.pathname || (loggedInUser?.role === 'Agent' ? '/app/queries' : '/app/dashboard')),
        { replace: true },
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const cur = slides[slide];
  const fieldCls = 'w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-[16px] font-medium text-[#13234f] shadow-sm focus:border-[#0e8a85] focus:outline-none focus:ring-4 focus:ring-[#0e8a85]/15';

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#f4f7fb]">
    <main
      className="tn-login relative flex bg-[#f4f7fb]"
      style={stage.mobile
        ? { width: '100%', minHeight: '100dvh' }
        : { width: stage.w, height: stage.h, transform: `scale(${stage.scale})`, transformOrigin: 'top left' }}
    >
      <style>{`
        @keyframes tn-kenburns { from { transform: scale(1.02) translate(0,0) } to { transform: scale(1.14) translate(-1.5%, -1%) } }
        @keyframes tn-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        @keyframes tn-rise { from { opacity: 0; transform: translateY(26px) } to { opacity: 1; transform: none } }
        @keyframes tn-word { from { opacity: 0; transform: translateY(14px); filter: blur(4px) } to { opacity: 1; transform: none; filter: none } }
        @keyframes tn-fly { 0% { transform: translate(42%, 20px) rotate(-8deg); opacity: 0 } 10% { opacity: 1 } 90% { opacity: 1 } 100% { transform: translate(88%, -50px) rotate(-8deg); opacity: 0 } }
        @keyframes tn-pulse { 0% { transform: scale(.7); opacity: .7 } 100% { transform: scale(2.4); opacity: 0 } }
        @keyframes tn-drift { 0%,100% { transform: translate(0,0) } 50% { transform: translate(30px,-24px) } }
        @keyframes tn-bar { from { width: 0 } to { width: 100% } }
        @keyframes tn-in-right { from { opacity: 0; transform: translateX(24px) } to { opacity: 1; transform: none } }
        @keyframes tn-kenburns2 { from { transform: scale(1.14) translate(1.5%, 1%) } to { transform: scale(1.02) translate(0,0) } }
        @keyframes tn-slide-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes tn-slide-out { from { opacity: 1 } to { opacity: 0; visibility: hidden } }
        .tn-kb { animation: tn-kenburns 8s ease-out forwards; }
        .tn-kb2 { animation: tn-kenburns2 8s ease-out forwards; }
        .tn-feed { opacity: 0; animation: tn-rise .8s cubic-bezier(.2,.7,.2,1) forwards; }
        .tn-feed > div { animation: tn-float 6s ease-in-out infinite; }
        .tn-word { animation: tn-word .7s cubic-bezier(.2,.7,.2,1) both; }
        .tn-card { animation: tn-in-right .7s cubic-bezier(.2,.7,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .tn-login * { animation: none !important; } .tn-feed { opacity: 1 !important; } }
      `}</style>

      {/* ───────── Left: animated scene ───────── */}
      <section className={`relative h-full shrink-0 overflow-hidden bg-[#13234f] text-white ${stage.mobile ? 'hidden' : 'block'}`} style={{ width: '56%' }}>
        {slides.map((sl, i) => (i === slide || i === prev) && (
          <div key={sl.img} className="absolute inset-0" style={{ animation: i === slide ? 'tn-slide-in 1.4s ease both' : 'tn-slide-out 1.4s ease both' }}>
            <img src={sl.img} alt="" className={`absolute inset-0 h-full w-full object-cover ${i % 2 ? 'tn-kb2' : 'tn-kb'}`} />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-br from-[#13234f]/80 via-[#13234f]/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1633]/80 via-transparent to-[#0b1633]/25" />
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#0e8a85]/40 blur-[90px]" style={{ animation: 'tn-drift 12s ease-in-out infinite' }} />
        <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-[#f59e0b]/20 blur-[110px]" style={{ animation: 'tn-drift 15s ease-in-out infinite reverse' }} />

        {/* flying plane with dashed trail */}
        <div className="pointer-events-none absolute left-0 top-[17%] w-full" style={{ animation: 'tn-fly 14s linear infinite' }}>
          <div className="flex items-center">
            <span className="mr-3 h-0 w-40" style={{ borderTop: '2px dashed rgba(255,255,255,.55)' }} />
            <Plane className="h-9 w-9 rotate-45 text-white drop-shadow-[0_6px_14px_rgba(0,0,0,.45)]" strokeWidth={1.6} />
          </div>
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between px-14 py-9">
          {/* top bar */}
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white px-3 py-2 shadow-xl shadow-black/25">
              <img src={logo} alt="TripNest" className="h-12 w-auto object-contain" />
            </div>
            <div className="h-9 w-px bg-white/25" />
            <div className="leading-tight">
              <div className="text-2xl font-extrabold tracking-tight">CRM</div>
              <div className="text-[13px] font-semibold text-white/70">Travel &amp; Hotel Management</div>
            </div>
          </div>

          {/* headline */}
          <div className="max-w-[560px]">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[13px] font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> One workspace for every Thailand trip
            </div>
            <h1 className="text-[48px] font-extrabold leading-[1.08] tracking-tight">
              Plan, sell &amp; run<br />
              <span className="bg-gradient-to-r from-[#74d0cb] via-white to-[#fbbf24] bg-clip-text text-transparent">Thailand</span> trips<br />effortlessly.
            </h1>
            <p className="mt-4 max-w-[520px] text-[16px] leading-relaxed text-white/75">
              Queries, quotations, bookings, vouchers and accounts — all in one place, built for Thailand operations.
            </p>

            {/* live activity feed */}
            <div className="mt-6 grid max-w-[540px] gap-3">
              {FEED.map((f, i) => (
                <div key={f.title} className="tn-feed" style={{ animationDelay: `${0.4 + i * 0.35}s`, marginLeft: i === 1 ? 28 : 0 }}>
                  <div
                    className="flex items-center gap-3.5 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl"
                    style={{ animationDelay: `${i * 0.8}s` }}
                  >
                    <span className={`relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${f.tone} shadow-lg`}>
                      <f.icon className="relative z-10 h-5 w-5 text-white" />
                      <span className="absolute inset-0 rounded-xl bg-white/40" style={{ animation: 'tn-pulse 2.6s ease-out infinite', animationDelay: `${i * 0.7}s` }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-bold">{f.title}</div>
                      <div className="truncate text-[13px] text-white/65">{f.sub}</div>
                    </div>
                    <span className="text-[11px] font-semibold text-white/50">just now</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* bottom: stats + destination caption */}
          <div className="flex items-end justify-between gap-6">
            <div className="flex gap-8">
              <Stat value={2400} suffix="+" label="Bookings" />
              <Stat value={350} suffix="+" label="Partner agents" />
              <Stat value={24} suffix="/7" label="Local support" />
            </div>
            <div className="text-right">
              <div key={cur.name} className="tn-word">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-4 py-2 text-[13px] font-semibold backdrop-blur-md">
                  <MapPin className="h-3.5 w-3.5 text-[#74d0cb]" /> {cur.name}
                  <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-[#74d0cb]">{cur.kind}</span>
                </div>
                <div className="mt-2 text-[13px] text-white/65">{cur.tag}</div>
              </div>
              <div className="mt-3 flex justify-end gap-1.5">
                {slides.map((sl, i) => (
                  <button
                    key={sl.img}
                    type="button"
                    aria-label={sl.name}
                    onClick={() => { setPrev(slide); setIdx(i); }}
                    className="relative h-1.5 overflow-hidden rounded-full bg-white/25 transition-all duration-500"
                    style={{ width: i === slide ? 30 : 8 }}
                  >
                    {i === slide && <span key={idx} className="absolute inset-y-0 left-0 bg-white" style={{ animation: 'tn-bar 5.8s linear forwards' }} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Right: form ───────── */}
      <section className="relative flex flex-1 items-center justify-center overflow-hidden px-10 py-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#0e8a85]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-[#13234f]/10 blur-3xl" />

        <button
          type="button"
          onClick={() => window.location.assign('/')}
          className="absolute right-8 top-7 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-[14px] font-semibold text-[#13234f] shadow-sm transition hover:border-[#0e8a85] hover:text-[#0e8a85] "
        >
          <ArrowLeft className="h-4 w-4" /> Back to Website
        </button>

        <div className="tn-card relative w-full max-w-[470px]">
          {stage.mobile && <div className="mb-5 flex justify-center">
            <img src={logo} alt="TripNest" className="h-16 w-auto object-contain" />
          </div>}

          <div className="rounded-[28px] border border-slate-200/80 bg-white p-9 shadow-[0_30px_80px_-30px_rgba(19,35,79,.35)]">
            <div className="mb-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0e8a85]/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-[#0e8a85]">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure sign in
              </span>
              <h2 className="mt-3 text-[32px] font-extrabold leading-tight tracking-tight text-[#13234f]">Welcome back</h2>
              <p className="mt-1.5 text-[15.5px] font-medium text-slate-500">Sign in to your TripNest CRM workspace.</p>
            </div>

            {/* role switch */}
            <div className="relative mb-5 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
              <span
                className="absolute rounded-xl shadow-md transition-transform duration-300"
                style={{ top: 4, bottom: 4, left: 4, width: 'calc(50% - 4px)', background: 'linear-gradient(90deg,#13234f,#0e8a85)', transform: role === 'staff' ? 'translateX(0)' : 'translateX(100%)' }}
              />
              {[
                { id: 'staff', label: 'Admin Login', icon: UserCog },
                { id: 'agent', label: 'Agent Login', icon: Users },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setRole(t.id)}
                  className={`relative z-10 flex items-center justify-center gap-2 rounded-xl py-2.5 text-[15px] font-bold transition-colors ${role === t.id ? 'text-white' : 'text-slate-500 hover:text-[#13234f]'}`}
                >
                  <t.icon className="h-4 w-4" /> {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-2 block text-[14px] font-bold text-[#13234f]">{role === 'staff' ? 'Email address' : 'Agent ID'}</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                  <input readOnly value={identifier} className={fieldCls} />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-[14px] font-bold text-[#13234f]">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                  <input readOnly type={showPassword ? 'text' : 'password'} value={password} className={fieldCls} />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0e8a85]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[#0e8a85]/20 bg-[#0e8a85]/5 px-4 py-3 text-[13.5px] font-medium leading-relaxed text-[#13234f]">
                <b className="text-[#0e8a85]">Demo mode</b> — credentials are pre-filled. All data is sample data stored in your browser.
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#13234f] via-[#0e6f78] to-[#0e8a85] py-4 text-[16px] font-bold text-white shadow-[0_16px_30px_-12px_rgba(14,138,133,.7)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_34px_-12px_rgba(14,138,133,.85)] disabled:opacity-70"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative">{submitting ? 'Signing in…' : 'Sign in'}</span>
                {!submitting && <ArrowRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1" />}
              </button>
            </form>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[13px] font-medium text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-[#0e8a85]" /> Demo workspace · no server, no real data
            </p>
          </div>
        </div>
      </section>
    </main>
    </div>
  );
}
